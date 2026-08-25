const crypto = require('crypto');

exports.handler = async function (event, context) {
  // Configurar cabeçalhos CORS e JSON
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Tratar requisições OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'OK' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido. Use POST.' }),
    };
  }

  try {
    let payload = {};
    try {
      payload = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Corpo da requisição JSON inválido.' }),
      };
    }

    const { userId, user_id, id, email, nome, valor, cpf, docNumber, description } = payload;
    const finalUserId = String(userId || user_id || id || '').trim();
    const payerEmail = (email || 'cliente@tesourariapro.com.br').trim();
    const payerName = (nome || 'Membro da Igreja').trim();
    const amount = Number(valor) > 0 ? Number(valor) : 19.90;
    const cleanDoc = (docNumber || cpf || '').replace(/\D/g, '');

    // Prioriza credenciais de Produção do Mercado Pago (iniciadas em APP_USR-...)
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
      console.warn('[Netlify Function Pix] AVISO: Usando credencial TEST do Mercado Pago. Para pagamentos reais em produção configure APP_USR-...');
    }

    // Gerar idempotency key único por requisição
    const idempotencyKey = crypto.randomUUID
      ? crypto.randomUUID()
      : `pix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Se o token do Mercado Pago estiver configurado, chamamos a API oficial
    if (mpToken && mpToken.trim().length > 10) {
      const parts = payerName.split(' ');
      const firstName = parts[0] || 'Cliente';
      const lastName = parts.slice(1).join(' ') || 'Tesouraria';

      // URL oficial fixa e explícita do Webhook de notificação conforme requerido
      const notificationUrl = 'https://abschurch.com.br/.netlify/functions/mercadopago-webhook';

      const mpRequestBody = {
        transaction_amount: amount,
        description: description || 'Assinatura Mensal - Tesouraria Pro',
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
          identification: cleanDoc
            ? {
                type: cleanDoc.length > 11 ? 'CNPJ' : 'CPF',
                number: cleanDoc,
              }
            : undefined,
        },
        external_reference: finalUserId || `user-${Date.now()}`,
        notification_url: notificationUrl,
      };

      console.log(`[Netlify Function Pix] Criando Pix oficial com notification_url="${notificationUrl}" para user_id="${finalUserId}"...`);

      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpToken.trim()}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(mpRequestBody),
      });

      const mpData = await mpResponse.json();

      if (!mpResponse.ok) {
        console.error('[Netlify Function Pix] Erro retornado pelo Mercado Pago:', mpData);
        return {
          statusCode: mpResponse.status,
          headers,
          body: JSON.stringify({
            error: mpData.message || mpData.error || 'Erro ao processar cobrança Pix no Mercado Pago.',
            details: mpData,
          }),
        };
      }

      // Extração dos dados oficiais do Pix do Mercado Pago
      const pointOfInteraction = mpData.point_of_interaction || {};
      const transactionData = pointOfInteraction.transaction_data || {};
      const qrCode = transactionData.qr_code;
      const qrCodeBase64 = transactionData.qr_code_base64;
      const ticketUrl = transactionData.ticket_url || (mpData.transaction_details && mpData.transaction_details.external_resource_url);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          paymentId: String(mpData.id),
          status: mpData.status,
          statusDetail: mpData.status_detail,
          qrCode,
          qrCodeBase64,
          ticketUrl,
          expiresAt: mpData.date_of_expiration,
          amount: mpData.transaction_amount || amount,
          isOfficial: true,
        }),
      };
    }

    // Se ainda não houver MERCADOPAGO_ACCESS_TOKEN configurado, retorna aviso orientando configuração
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentId: `DEMO-PIX-${Date.now()}`,
        status: 'pending',
        statusDetail: 'pending_waiting_transfer',
        qrCode: '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540519.905802BR5913TESOURARIA PRO6009SAO PAULO62070503***6304ABCD',
        amount: amount,
        notice: 'Configure a variável MERCADOPAGO_ACCESS_TOKEN no painel para gerar Pix reais com sua conta.',
      }),
    };
  } catch (err) {
    console.error('[Netlify Function Pix] Exceção inesperada:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err.message || 'Erro interno no servidor ao criar cobrança Pix.',
      }),
    };
  }
};
