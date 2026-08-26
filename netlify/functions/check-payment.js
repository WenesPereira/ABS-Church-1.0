const { createClient } = require('@supabase/supabase-js');

/**
 * Netlify Serverless Function: Consulta Direta de Pagamento no Mercado Pago
 * Arquivo: netlify/functions/check-payment.js
 *
 * Responsabilidades:
 * 1. Consultar a API oficial do Mercado Pago (/v1/payments/{paymentId}) diretamente usando MERCADOPAGO_ACCESS_TOKEN de Produção (APP_USR-...).
 * 2. Se o status for 'approved', forçar imediatamente o UPDATE na tabela 'profiles' do Supabase com a SUPABASE_SERVICE_ROLE_KEY:
 *    UPDATE profiles SET subscription_status = 'active', status_assinatura = 'ativo' WHERE user_id = external_reference
 * 3. Retornar resposta JSON com o status atualizado do pagamento e da conta do usuário.
 */
exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Trata requisições OPTIONS (Preflight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true }),
    };
  }

  try {
    const query = event.queryStringParameters || {};
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        body = {};
      }
    }

    const paymentId = String(
      query.paymentId ||
      query.payment_id ||
      query.id ||
      body.paymentId ||
      body.payment_id ||
      body.id ||
      ''
    ).trim();

    const targetUserId = String(
      query.userId ||
      query.user_id ||
      body.userId ||
      body.user_id ||
      ''
    ).trim();

    const targetEmail = String(
      query.email ||
      body.email ||
      ''
    ).trim().toLowerCase();

    // Prioriza tokens de produção (APP_USR-...) se houver múltiplas variáveis
    const candidateTokens = [
      process.env.MERCADOPAGO_ACCESS_TOKEN,
      process.env.MERCADO_PAGO_ACCESS_TOKEN,
      process.env.MP_ACCESS_TOKEN,
    ].filter(Boolean).map(t => t.trim());

    const mpToken =
      candidateTokens.find(t => t.startsWith('APP_USR-')) ||
      candidateTokens[0] ||
      '';

    if (mpToken.startsWith('TEST-')) {
      console.warn('[Check Payment] AVISO: Token do Mercado Pago está configurado como TEST. Para produção utilize APP_USR-...');
    }

    const supabaseUrl = (
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      ''
    ).trim();

    const supabaseServiceKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    let paymentStatus = 'pending';
    let externalRef = targetUserId || null;
    let payerEmail = targetEmail || null;
    let paymentAmount = null;

    // Se paymentId for fornecido e não for teste demo, consulta a API do Mercado Pago
    if (paymentId && mpToken && !paymentId.startsWith('DEMO-PIX-')) {
      try {
        console.log(`[Check Payment] Consultando API Mercado Pago para paymentId=${paymentId}...`);
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mpToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (mpRes.ok) {
          const mpData = await mpRes.json();
          paymentStatus = mpData.status; // 'approved', 'pending', 'rejected', 'cancelled'
          externalRef = mpData.external_reference || externalRef;
          payerEmail = mpData.payer?.email || payerEmail;
          paymentAmount = mpData.transaction_amount || null;

          console.log(`[Check Payment] Resposta MP: status="${paymentStatus}", external_reference="${externalRef}", email="${payerEmail}"`);
        } else {
          const errText = await mpRes.text();
          console.warn(`[Check Payment] Resposta da API MP não-200 (${mpRes.status}):`, errText);
        }
      } catch (mpErr) {
        console.error('[Check Payment] Erro ao conectar com API do Mercado Pago:', mpErr);
      }
    }

    const isApproved = paymentStatus === 'approved';
    let userUpdated = false;

    // Se o status for 'approved', força atualização no Supabase com Service Role Key
    if (isApproved && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const nowIso = new Date().toISOString();
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + 30);
      const expiresIso = expiresDate.toISOString();

      const updatePayload = {
        has_paid: true,
        subscription_status: 'active',
        status: 'active',
        status_assinatura: 'ativo',
        subscription_plan: 'mensal',
        subscription_expires_at: expiresIso,
        updated_at: nowIso,
      };

      const finalUserId = externalRef ? String(externalRef).trim() : (targetUserId || null);

      if (finalUserId) {
        // Tentativa 1: user_id = finalUserId
        const { data: updatedByUser, error: errUser } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('user_id', finalUserId)
          .select();

        if (!errUser && updatedByUser && updatedByUser.length > 0) {
          console.log(`[Check Payment] Sucesso: subscription_status='active' atualizado para user_id=${finalUserId}`);
          userUpdated = true;
        } else {
          // Tentativa 2: id = finalUserId
          const { data: updatedById, error: errId } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', finalUserId)
            .select();

          if (!errId && updatedById && updatedById.length > 0) {
            console.log(`[Check Payment] Sucesso: subscription_status='active' atualizado para id=${finalUserId}`);
            userUpdated = true;
          }
        }
      }

      // Tentativa 3: Se ainda não atualizou, tenta por email
      if (!userUpdated && payerEmail) {
        const { data: updatedByEmail } = await supabase
          .from('profiles')
          .update(updatePayload)
          .ilike('email', payerEmail.trim().toLowerCase())
          .select();

        if (updatedByEmail && updatedByEmail.length > 0) {
          console.log(`[Check Payment] Sucesso: subscription_status='active' atualizado via e-mail=${payerEmail}`);
          userUpdated = true;
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentId: paymentId || null,
        status: paymentStatus,
        approved: isApproved,
        userUpdated,
        userId: externalRef,
        email: payerEmail,
        amount: paymentAmount,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err) {
    console.error('[Check Payment] Erro inesperado:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: err.message || 'Erro ao consultar status do pagamento.',
      }),
    };
  }
};
