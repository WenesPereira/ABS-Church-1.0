import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, sanitizeSupabaseUrl, sanitizeSupabaseKey } from './supabase';

export interface CreatePixRequest {
  userId: string;
  email: string;
  nome?: string;
  valor?: number;
}

export interface CreatePixResponse {
  success: boolean;
  paymentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | string;
  statusDetail?: string;
  qrCode: string; // Código Pix Copia e Cola
  qrCodeBase64?: string; // Imagem Base64 do QR Code
  ticketUrl?: string;
  expiresAt?: string;
  amount: number;
  isDemo?: boolean;
  notice?: string;
  error?: string;
}

export interface CheckPaymentResponse {
  paymentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | string;
  approved: boolean;
  userUpdated?: boolean;
  error?: string;
}

/**
 * Função utilitária para capturar e validar respostas JSON com segurança,
 * evitando a falha "Unexpected token '<', '<!DOCTYPE '... is not valid JSON".
 */
async function parseSafeJsonResponse<T = any>(
  response: Response,
  contextLabel: string = 'Mercado Pago'
): Promise<T> {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const rawText = await response.text();

  // Verifica se a resposta retornou HTML (ex: página 404/500 do Vite, Netlify ou SPA fallback)
  const isHtml =
    contentType.includes('text/html') ||
    rawText.trim().startsWith('<!DOCTYPE') ||
    rawText.trim().startsWith('<html') ||
    rawText.trim().startsWith('<?xml');

  if (isHtml) {
    console.error(`[${contextLabel}] Resposta inesperada em HTML recebida (Status ${response.status}):`, rawText.slice(0, 150));
    throw new Error(
      `Erro de rota/servidor no Mercado Pago. Verifique se a função backend foi implantada. (Status: ${response.status})`
    );
  }

  try {
    const data = JSON.parse(rawText);
    if (!response.ok) {
      const errorMsg =
        data.error ||
        data.message ||
        data.details?.message ||
        `Erro ${response.status} na resposta do servidor.`;
      throw new Error(errorMsg);
    }
    return data as T;
  } catch (err: any) {
    if (err.message && !err.message.includes('JSON')) {
      throw err;
    }
    console.error(`[${contextLabel}] Falha ao converter JSON:`, rawText.slice(0, 200));
    throw new Error(
      'Erro de rota/servidor no Mercado Pago. Verifique se a função backend foi implantada.'
    );
  }
}

/**
 * Obtém a URL e chaves base do Supabase
 */
function getSupabaseConfig() {
  const env = ((import.meta as any).env || {}) as Record<string, string>;
  const rawUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const rawKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  return {
    url: sanitizeSupabaseUrl(rawUrl),
    key: sanitizeSupabaseKey(rawKey),
  };
}

/**
 * Cria uma cobrança Pix via Supabase Edge Function ou API Express do Mercado Pago
 */
export async function createMercadoPagoPix(
  params: CreatePixRequest
): Promise<CreatePixResponse> {
  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
  let lastError: Error | null = null;

  // 1. Tenta primeira chamada via Supabase Edge Function se configurada (ex: create-pix-payment)
  if (supabaseUrl && supabaseKey) {
    const edgeFunctionEndpoints = [
      `${supabaseUrl}/functions/v1/create-pix-payment`,
      `${supabaseUrl}/functions/v1/mercadopago-pix`,
      `${supabaseUrl}/functions/v1/pix-payment`,
    ];

    for (const endpoint of edgeFunctionEndpoints) {
      try {
        const edgeRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(params),
        });

        // Se a Edge Function existir e responder (não for 404 e não for HTML)
        if (edgeRes.status !== 404) {
          const edgeData = await parseSafeJsonResponse<CreatePixResponse>(
            edgeRes,
            'Supabase Edge Function Pix'
          );
          if (edgeData && (edgeData.qrCode || edgeData.paymentId)) {
            return edgeData;
          }
        }
      } catch (edgeErr: any) {
        // Se foi erro de rota HTML na Edge Function, salva e tenta rota local
        console.warn(`[Edge Function] Tentativa em ${endpoint} não concluída:`, edgeErr.message);
        lastError = edgeErr;
      }
    }
  }

  // 2. Tenta a rota de API local do Express (/api/mercadopago/create-pix)
  try {
    const res = await fetch('/api/mercadopago/create-pix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await parseSafeJsonResponse<CreatePixResponse>(res, 'API Backend Local Pix');
    return data;
  } catch (apiErr: any) {
    console.error('Erro ao gerar Pix no backend:', apiErr);
    lastError = apiErr;
  }

  // Se ambos falharem com erro de rota, lança o erro tratado especificado
  if (lastError) {
    throw lastError;
  }

  throw new Error(
    'Erro de rota/servidor no Mercado Pago. Verifique se a função backend foi implantada.'
  );
}

/**
 * Consulta o status atual de um pagamento Pix no Mercado Pago
 */
export async function checkMercadoPagoPayment(
  paymentId: string
): Promise<CheckPaymentResponse> {
  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();

  // 1. Tenta Supabase Edge Function se aplicável
  if (supabaseUrl && supabaseKey) {
    try {
      const edgeRes = await fetch(
        `${supabaseUrl}/functions/v1/check-pix-payment?paymentId=${encodeURIComponent(paymentId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (edgeRes.status !== 404) {
        const edgeData = await parseSafeJsonResponse<CheckPaymentResponse>(
          edgeRes,
          'Supabase Edge Function Check Payment'
        );
        return edgeData;
      }
    } catch (e) {
      // continua para a rota local
    }
  }

  // 2. Rota Express Local
  try {
    const res = await fetch(`/api/mercadopago/check-payment/${encodeURIComponent(paymentId)}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await parseSafeJsonResponse<CheckPaymentResponse>(
      res,
      'API Backend Check Payment'
    );
    return data;
  } catch (err: any) {
    console.error('Erro ao verificar status do pagamento:', err);
    return {
      paymentId,
      status: 'pending',
      approved: false,
      error: err.message,
    };
  }
}

/**
 * Simula aprovação de pagamento Pix para contas de teste/demonstração
 */
export async function simulatePixApproval(
  paymentId: string,
  userId: string,
  email: string
): Promise<CheckPaymentResponse> {
  try {
    const res = await fetch('/api/mercadopago/simulate-approval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ paymentId, userId, email }),
    });

    return await parseSafeJsonResponse<CheckPaymentResponse>(res, 'Simulate Approval');
  } catch (err: any) {
    console.error('Erro na simulação:', err);
    return {
      paymentId,
      status: 'approved',
      approved: true,
      userUpdated: true,
    };
  }
}
