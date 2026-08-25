const { createClient } = require('@supabase/supabase-js');

/**
 * Netlify Serverless Function: Webhook do Mercado Pago
 * Caminho: netlify/functions/mercadopago-webhook.js
 *
 * Responsabilidade:
 * 1. Receber notificações HTTP POST de eventos do Mercado Pago.
 * 2. Consultar a API oficial do Mercado Pago utilizando MERCADOPAGO_ACCESS_TOKEN para verificar se o pagamento foi 'approved'.
 * 3. Obter o external_reference (ID do usuário) ou e-mail do pagador.
 * 4. Fazer UPDATE na tabela do Supabase utilizando SUPABASE_SERVICE_ROLE_KEY, alterando o status da assinatura para 'active' / 'ativo'.
 */
exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Tratar requisições OPTIONS (preflight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true }),
    };
  }

  // Healthcheck do endpoint via GET
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'online',
        message: 'Webhook Mercado Pago ativo e pronto para receber notificações.',
        timestamp: new Date().toISOString(),
      }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido. Utilize POST.' }),
    };
  }

  try {
    let body = {};
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      body = {};
    }

    const query = event.queryStringParameters || {};

    const action = body.action || query.action || '';
    const type = body.type || query.type || query.topic || '';

    // Extrai o ID do pagamento de qualquer variação do payload Mercado Pago
    let paymentId =
      body.data?.id ||
      body.id ||
      query.id ||
      query['data.id'] ||
      (body.resource ? body.resource.split('/').pop() : null);

    console.log(`[Mercado Pago Webhook] Notificação recebida: type=${type}, action=${action}, paymentId=${paymentId}`);

    const mpToken = (
      process.env.MERCADOPAGO_ACCESS_TOKEN ||
      process.env.MERCADO_PAGO_ACCESS_TOKEN ||
      process.env.MP_ACCESS_TOKEN ||
      ''
    ).trim();

    const supabaseUrl = (
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      'https://gawgpxfpxzrdzuhwovvi.supabase.co'
    ).trim();

    const supabaseServiceKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    let userUpdated = false;
    let paymentStatus = 'unknown';
    let externalRef = null;
    let payerEmail = null;

    // Se for notificação de merchant_order, extrai o pagamento vinculado
    if ((type === 'merchant_order' || query.topic === 'merchant_order') && paymentId && mpToken) {
      try {
        const orderRes = await fetch(`https://api.mercadopago.com/merchant_orders/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${mpToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          if (orderData.payments && orderData.payments.length > 0) {
            const lastPayment = orderData.payments[orderData.payments.length - 1];
            paymentId = String(lastPayment.id);
          }
        }
      } catch (orderErr) {
        console.warn('[Mercado Pago Webhook] Aviso ao consultar merchant_order:', orderErr);
      }
    }

    // Consulta os dados oficiais do pagamento no Mercado Pago
    if (paymentId && mpToken) {
      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${mpToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (mpRes.ok) {
          const mpData = await mpRes.json();
          paymentStatus = mpData.status;
          externalRef = mpData.external_reference || null;
          payerEmail = mpData.payer?.email || null;

          console.log(`[Mercado Pago Webhook] Pagamento ${paymentId}: status=${paymentStatus}, external_reference=${externalRef}, email=${payerEmail}`);

          // Quando o pagamento estiver aprovado (approved), atualiza a assinatura no Supabase
          if (paymentStatus === 'approved') {
            if (supabaseUrl && supabaseServiceKey) {
              const supabase = createClient(supabaseUrl, supabaseServiceKey, {
                auth: { persistSession: false },
              });

              // Define expiração padrão de 35 dias para o plano mensal (30 dias + margem de tolerância)
              const expiresDate = new Date();
              expiresDate.setDate(expiresDate.getDate() + 35);
              const expiresIso = expiresDate.toISOString();
              const nowIso = new Date().toISOString();

              const updatePayload = {
                subscription_status: 'active',
                subscription_plan: 'mensal',
                subscription_expires_at: expiresIso,
                updated_at: nowIso,
              };

              // 1. UPDATE por external_reference (ID do usuário) na tabela profiles
              if (externalRef) {
                const { data: updatedById, error: errId } = await supabase
                  .from('profiles')
                  .update(updatePayload)
                  .or(`id.eq.${externalRef},user_id.eq.${externalRef}`)
                  .select();

                if (!errId && updatedById && updatedById.length > 0) {
                  console.log(`[Mercado Pago Webhook] Sucesso: Assinatura ativada no Supabase (profiles) para userId: ${externalRef}`);
                  userUpdated = true;
                }
              }

              // 2. Se não localizou por ID, UPDATE por e-mail do pagador
              if (!userUpdated && payerEmail) {
                const cleanEmail = payerEmail.trim().toLowerCase();
                const { data: updatedByEmail, error: errEmail } = await supabase
                  .from('profiles')
                  .update(updatePayload)
                  .ilike('email', cleanEmail)
                  .select();

                if (!errEmail && updatedByEmail && updatedByEmail.length > 0) {
                  console.log(`[Mercado Pago Webhook] Sucesso: Assinatura ativada no Supabase (profiles) para o e-mail: ${cleanEmail}`);
                  userUpdated = true;
                }
              }

              // 3. Fallback / Sincronização em tabelas dedicadas de assinaturas (ex: 'assinaturas', 'user_subscriptions', 'subscriptions')
              const subscriptionTables = ['assinaturas', 'user_subscriptions', 'subscriptions'];
              for (const tableName of subscriptionTables) {
                try {
                  if (externalRef) {
                    await supabase
                      .from(tableName)
                      .upsert({
                        user_id: externalRef,
                        status: 'ativo',
                        subscription_status: 'active',
                        plan: 'mensal',
                        payment_id: String(paymentId),
                        expires_at: expiresIso,
                        updated_at: nowIso,
                      }, { onConflict: 'user_id' });
                  } else if (payerEmail) {
                    await supabase
                      .from(tableName)
                      .update({
                        status: 'ativo',
                        subscription_status: 'active',
                        plan: 'mensal',
                        payment_id: String(paymentId),
                        expires_at: expiresIso,
                        updated_at: nowIso,
                      })
                      .ilike('email', payerEmail.trim().toLowerCase());
                  }
                } catch (subErr) {
                  // Tabelas opcionais caso existam no schema
                }
              }
            } else {
              console.warn('[Mercado Pago Webhook] Aviso: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
            }
          }
        } else {
          const errText = await mpRes.text();
          console.error(`[Mercado Pago Webhook] Erro ao consultar pagamento na API Mercado Pago (${mpRes.status}):`, errText);
        }
      } catch (fetchErr) {
        console.error('[Mercado Pago Webhook] Falha de comunicação com a API do Mercado Pago:', fetchErr);
      }
    }

    // Mercado Pago exige retorno HTTP 200 OK
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received: true,
        paymentId: paymentId ? String(paymentId) : null,
        status: paymentStatus,
        userUpdated,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err) {
    console.error('[Mercado Pago Webhook] Erro inesperado no handler:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received: true,
        error: err.message || 'Erro ao processar webhook.',
      }),
    };
  }
};
