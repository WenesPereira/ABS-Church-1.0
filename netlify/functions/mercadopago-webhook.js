const { createClient } = require('@supabase/supabase-js');

/**
 * Netlify Function: Webhook do Mercado Pago
 * Caminho: netlify/functions/mercadopago-webhook.js
 *
 * Recebe notificações via HTTP POST do webhook do Mercado Pago,
 * verifica o status do pagamento usando o MERCADOPAGO_ACCESS_TOKEN e,
 * quando aprovado ('approved'), ativa a assinatura do usuário no Supabase usando SUPABASE_SERVICE_ROLE_KEY.
 */
exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Tratar preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true }),
    };
  }

  // Healthcheck / status do webhook via GET
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'online',
        service: 'Mercado Pago Webhook - Netlify Function',
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
    
    // Obter o ID do pagamento de qualquer variação enviada pelo Mercado Pago
    let paymentId =
      body.data?.id ||
      body.id ||
      query.id ||
      query['data.id'] ||
      (body.resource ? body.resource.split('/').pop() : null);

    console.log(`[Webhook Mercado Pago] Notificação recebida: type=${type}, action=${action}, paymentId=${paymentId}`);

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

    // Se for uma notificação de merchant_order, podemos extrair os pagamentos vinculados
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
        console.warn('[Webhook Mercado Pago] Falha ao consultar merchant_order:', orderErr);
      }
    }

    // Consulta os detalhes oficiais do pagamento no Mercado Pago
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
          externalRef = mpData.external_reference;
          payerEmail = mpData.payer?.email;

          console.log(`[Webhook Mercado Pago] Detalhes do pagamento ${paymentId}: status=${paymentStatus}, external_reference=${externalRef}, payerEmail=${payerEmail}`);

          // Quando o pagamento estiver aprovado (approved), atualiza no Supabase
          if (paymentStatus === 'approved') {
            if (supabaseUrl && supabaseServiceKey) {
              const supabase = createClient(supabaseUrl, supabaseServiceKey, {
                auth: { persistSession: false },
              });

              // Define expiração para 35 dias (1 mês + tolerância)
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

              // 1. Atualizar registro pelo external_reference (ID do usuário)
              if (externalRef) {
                const { data: updatedById, error: errId } = await supabase
                  .from('profiles')
                  .update(updatePayload)
                  .or(`id.eq.${externalRef},user_id.eq.${externalRef}`)
                  .select();

                if (!errId && updatedById && updatedById.length > 0) {
                  console.log(`[Webhook Mercado Pago] Assinatura ativada no Supabase por userId: ${externalRef}`);
                  userUpdated = true;
                }
              }

              // 2. Atualizar pelo e-mail do pagador caso não localizado por ID
              if (!userUpdated && payerEmail) {
                const { data: updatedByEmail, error: errEmail } = await supabase
                  .from('profiles')
                  .update(updatePayload)
                  .ilike('email', payerEmail.trim())
                  .select();

                if (!errEmail && updatedByEmail && updatedByEmail.length > 0) {
                  console.log(`[Webhook Mercado Pago] Assinatura ativada no Supabase por e-mail: ${payerEmail}`);
                  userUpdated = true;
                }
              }

              // 3. Registrar na tabela complementar user_subscriptions (se existir)
              if (externalRef) {
                try {
                  await supabase
                    .from('user_subscriptions')
                    .upsert({
                      user_id: externalRef,
                      status: 'active',
                      plan: 'mensal',
                      payment_id: String(paymentId),
                      expires_at: expiresIso,
                      updated_at: nowIso,
                    }, { onConflict: 'user_id' });
                } catch (subErr) {
                  // Tabela opcional
                }
              }
            } else {
              console.warn('[Webhook Mercado Pago] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
            }
          }
        } else {
          const errText = await mpRes.text();
          console.error(`[Webhook Mercado Pago] Erro na API do Mercado Pago (HTTP ${mpRes.status}):`, errText);
        }
      } catch (mpFetchErr) {
        console.error('[Webhook Mercado Pago] Erro ao consultar pagamento:', mpFetchErr);
      }
    }

    // Mercado Pago exige resposta HTTP 200 OK para confirmar o recebimento do webhook
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
    console.error('[Webhook Mercado Pago] Erro fatal no processamento:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received: true,
        error: err.message,
      }),
    };
  }
};
