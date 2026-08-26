const { createClient } = require('@supabase/supabase-js');

/**
 * Netlify Serverless Function: Webhook do Mercado Pago
 * Arquivo: netlify/functions/mercadopago-webhook.js
 *
 * Fluxo 100% Automático:
 * 1. Recebe notificação de eventos (payment.created, payment.updated, etc.) do Mercado Pago.
 * 2. Consulta a API oficial do Mercado Pago (https://api.mercadopago.com/v1/payments/{id}) com MERCADOPAGO_ACCESS_TOKEN.
 * 3. Confirma se o status retornado é 'approved'.
 * 4. Extrai o external_reference (que contém o user_id do Supabase).
 * 5. Atualiza a tabela 'profiles' no Supabase via SUPABASE_SERVICE_ROLE_KEY:
 *    UPDATE profiles SET subscription_status = 'active', status = 'active' WHERE user_id = external_reference
 * 6. Registra logs detalhados (console.log) para rastreamento no Netlify e retorna HTTP 200.
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

  // Healthcheck do webhook via GET
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'online',
        message: 'Webhook Mercado Pago ativo e pronto para receber notificações automáticas.',
        timestamp: new Date().toISOString(),
      }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Método aceito para o webhook.' }),
    };
  }

  console.log('====================================================');
  console.log('[Mercado Pago Webhook] >>> Nova notificação recebida');

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

    console.log(`[Mercado Pago Webhook] [Passo 1/5] Evento recebido: action="${action}", type="${type}"`);

    // 1. Extração do ID do pagamento
    let paymentId =
      body.data?.id ||
      query['data.id'] ||
      query['data[id]'] ||
      body.id ||
      query.id ||
      (body.resource ? body.resource.split('/').pop() : null);

    console.log(`[Mercado Pago Webhook] [Passo 1/5] ID do pagamento identificado: ${paymentId}`);

    if (!paymentId) {
      console.warn('[Mercado Pago Webhook] Nenhum ID de pagamento encontrado no corpo ou query da requisição.');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ received: true, warning: 'Nenhum paymentId identificado.' }),
      };
    }

    // 2. Chaves de Configuração (Mercado Pago e Supabase)
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
      console.warn('[Mercado Pago Webhook] AVISO: Token configurado é do tipo TEST. Para notificações reais em produção use credenciais de Produção APP_USR-...');
    }

    const supabaseUrl = (
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      'https://gawgpxfpxzrdzuhwovvi.supabase.co'
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

    if (!mpToken) {
      console.error('[Mercado Pago Webhook] ERRO CRÍTICO: Variável MERCADOPAGO_ACCESS_TOKEN não configurada.');
    }

    if (!supabaseServiceKey) {
      console.error('[Mercado Pago Webhook] ERRO CRÍTICO: Variável SUPABASE_SERVICE_ROLE_KEY não configurada.');
    }

    // 3. Consulta à API do Mercado Pago para confirmar o status real
    let paymentStatus = 'unknown';
    let externalRef = null;
    let payerEmail = null;
    let paymentAmount = null;

    if (mpToken) {
      console.log(`[Mercado Pago Webhook] [Passo 2/5] Consultando API Mercado Pago: https://api.mercadopago.com/v1/payments/${paymentId}`);

      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          method: 'GET',
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
          paymentAmount = mpData.transaction_amount || null;

          console.log(`[Mercado Pago Webhook] [Passo 2/5] Resposta Mercado Pago: status="${paymentStatus}", external_reference="${externalRef}", email="${payerEmail}", valor=R$ ${paymentAmount}`);
        } else {
          const errText = await mpRes.text();
          console.error(`[Mercado Pago Webhook] Erro ao consultar pagamento no Mercado Pago (${mpRes.status}):`, errText);

          // Se for notificação de merchant_order ou preapproval, tenta consultar endpoints alternativos
          if (type === 'merchant_order' || query.topic === 'merchant_order') {
            try {
              const orderRes = await fetch(`https://api.mercadopago.com/merchant_orders/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${mpToken}` },
              });
              if (orderRes.ok) {
                const orderData = await orderRes.json();
                if (orderData.payments && orderData.payments.length > 0) {
                  const lastPayment = orderData.payments[orderData.payments.length - 1];
                  paymentStatus = lastPayment.status;
                }
                externalRef = orderData.external_reference || externalRef;
                console.log(`[Mercado Pago Webhook] Dados obtidos de merchant_order: status="${paymentStatus}", external_reference="${externalRef}"`);
              }
            } catch (orderErr) {
              console.warn('[Mercado Pago Webhook] Falha ao consultar merchant_orders:', orderErr);
            }
          }
        }
      } catch (fetchErr) {
        console.error('[Mercado Pago Webhook] Falha de conexão com a API do Mercado Pago:', fetchErr);
      }
    } else {
      console.warn('[Mercado Pago Webhook] Sem token do Mercado Pago; tentando usar status do body se presente.');
      if (body.data?.status || body.status) {
        paymentStatus = body.data?.status || body.status;
        externalRef = body.data?.external_reference || body.external_reference || null;
      }
    }

    console.log(`[Mercado Pago Webhook] [Passo 3/5] Status final verificado: "${paymentStatus}" | external_reference (user_id): "${externalRef}"`);

    let userUpdated = false;

    // 4. Se o pagamento estiver APROVADO ('approved'), executa o UPDATE no Supabase
    if (paymentStatus === 'approved') {
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false },
        });

        // Configura expiração de 35 dias (30 dias do mês + 5 dias de tolerância)
        const expiresDate = new Date();
        expiresDate.setDate(expiresDate.getDate() + 35);
        const expiresIso = expiresDate.toISOString();
        const nowIso = new Date().toISOString();

        const updatePayload = {
          subscription_status: 'active',
          status: 'active',
          subscription_plan: 'mensal',
          subscription_expires_at: expiresIso,
          updated_at: nowIso,
        };

        const targetUserId = externalRef ? String(externalRef).trim() : null;

        console.log(`[Mercado Pago Webhook] [Passo 4/5] Atualizando Supabase para user_id="${targetUserId}"...`);

        // 4.1: Executa UPDATE onde user_id = external_reference
        if (targetUserId) {
          const { data: updatedByUser, error: errUser } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('user_id', targetUserId)
            .select();

          if (!errUser && updatedByUser && updatedByUser.length > 0) {
            console.log(`[Mercado Pago Webhook] [Passo 5/5] SUCESSO: subscription_status='active' atualizado para user_id=${targetUserId}`);
            userUpdated = true;
          } else {
            if (errUser) {
              console.warn(`[Mercado Pago Webhook] Aviso ao atualizar por user_id: ${errUser.message}`);
            }

            // 4.2: Fallback por id = external_reference (caso a tabela utilize a coluna id como chave primária do usuário)
            const { data: updatedById, error: errId } = await supabase
              .from('profiles')
              .update(updatePayload)
              .eq('id', targetUserId)
              .select();

            if (!errId && updatedById && updatedById.length > 0) {
              console.log(`[Mercado Pago Webhook] [Passo 5/5] SUCESSO: subscription_status='active' atualizado para id=${targetUserId}`);
              userUpdated = true;
            } else if (errId) {
              console.warn(`[Mercado Pago Webhook] Aviso ao atualizar por id: ${errId.message}`);
            }

            // 4.3: Fallback resiliente com payload mínimo contendo apenas subscription_status
            if (!userUpdated) {
              const minPayload = {
                subscription_status: 'active',
                updated_at: nowIso,
              };

              const { data: minUser, error: errMin } = await supabase
                .from('profiles')
                .update(minPayload)
                .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`)
                .select();

              if (!errMin && minUser && minUser.length > 0) {
                console.log(`[Mercado Pago Webhook] [Passo 5/5] SUCESSO: subscription_status='active' (payload mínimo) atualizado para ${targetUserId}`);
                userUpdated = true;
              } else {
                // Fallback secundário com a coluna 'status'
                const { data: minStatusUser } = await supabase
                  .from('profiles')
                  .update({ status: 'active', updated_at: nowIso })
                  .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`)
                  .select();

                if (minStatusUser && minStatusUser.length > 0) {
                  console.log(`[Mercado Pago Webhook] [Passo 5/5] SUCESSO: status='active' atualizado para ${targetUserId}`);
                  userUpdated = true;
                }
              }
            }
          }
        }

        // 4.4: Fallback secundário por e-mail caso external_reference não tenha encontrado o registro
        if (!userUpdated && payerEmail) {
          const cleanEmail = payerEmail.trim().toLowerCase();
          console.log(`[Mercado Pago Webhook] Tentando localizar usuário pelo e-mail do pagador: ${cleanEmail}`);

          const { data: updatedByEmail, error: errEmail } = await supabase
            .from('profiles')
            .update(updatePayload)
            .ilike('email', cleanEmail)
            .select();

          if (!errEmail && updatedByEmail && updatedByEmail.length > 0) {
            console.log(`[Mercado Pago Webhook] [Passo 5/5] SUCESSO: subscription_status='active' atualizado via e-mail=${cleanEmail}`);
            userUpdated = true;
          } else {
            // Tentativa apenas com subscription_status por e-mail
            const { data: emailMinUser } = await supabase
              .from('profiles')
              .update({ subscription_status: 'active', updated_at: nowIso })
              .ilike('email', cleanEmail)
              .select();

            if (emailMinUser && emailMinUser.length > 0) {
              console.log(`[Mercado Pago Webhook] [Passo 5/5] SUCESSO: subscription_status='active' (mínimo por email) atualizado via e-mail=${cleanEmail}`);
              userUpdated = true;
            }
          }
        }

        // 4.5: Sincronização em tabelas auxiliares se existirem
        const extraTables = ['assinaturas', 'user_subscriptions', 'subscriptions'];
        for (const tableName of extraTables) {
          try {
            if (targetUserId) {
              await supabase
                .from(tableName)
                .upsert({
                  user_id: targetUserId,
                  subscription_status: 'active',
                  status: 'active',
                  plan: 'mensal',
                  payment_id: String(paymentId),
                  expires_at: expiresIso,
                  updated_at: nowIso,
                }, { onConflict: 'user_id' });
            }
          } catch (e) {
            // Ignora se tabela não existir
          }
        }

        if (!userUpdated) {
          console.warn(`[Mercado Pago Webhook] AVISO: Nenhum registro na tabela profiles foi afetado para user_id="${targetUserId}" e email="${payerEmail}".`);
        }
      } else {
        console.error('[Mercado Pago Webhook] Falha: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos.');
      }
    } else {
      console.log(`[Mercado Pago Webhook] Pagamento com status "${paymentStatus}". Nenhuma alteração de assinatura necessária no momento.`);
    }

    console.log(`[Mercado Pago Webhook] Processamento concluído. Retornando HTTP 200.`);
    console.log('====================================================');

    // 6. Retorna obrigatoriamente HTTP 200 para confirmar o recebimento ao Mercado Pago
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received: true,
        paymentId: String(paymentId),
        status: paymentStatus,
        userId: externalRef || null,
        userUpdated,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err) {
    console.error('[Mercado Pago Webhook] Erro crítico não capturado no webhook:', err);
    // Retorna HTTP 200 para evitar retentativas infinitas em caso de exceção de parsing
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received: true,
        error: err.message || 'Erro interno ao processar webhook.',
      }),
    };
  }
};

