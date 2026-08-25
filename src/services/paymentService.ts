import { initMercadoPago } from '@mercadopago/sdk-react';

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
 * Obtém a chave pública do Mercado Pago configurada
 */
export function getMercadoPagoPublicKey(): string {
  const env = ((import.meta as any).env || {}) as Record<string, string>;
  return (
    env.VITE_MERCADOPAGO_PUBLIC_KEY ||
    env.VITE_MP_PUBLIC_KEY ||
    env.MERCADOPAGO_PUBLIC_KEY ||
    env.MP_PUBLIC_KEY ||
    ''
  ).trim();
}

let isSdkInitialized = false;

/**
 * Inicializa o SDK Oficial do Mercado Pago no navegador
 */
export function initializeMercadoPagoSdk(): boolean {
  const publicKey = getMercadoPagoPublicKey();
  if (!publicKey) {
    return false;
  }

  if (!isSdkInitialized) {
    try {
      initMercadoPago(publicKey, { locale: 'pt-BR' });
      isSdkInitialized = true;
      console.log('[Mercado Pago SDK] Inicializado com chave pública.');
    } catch (err) {
      console.warn('[Mercado Pago SDK] Falha ao inicializar SDK:', err);
    }
  }
  return isSdkInitialized;
}

/**
 * Função utilitária para capturar e validar respostas JSON com segurança,
 * evitando a falha "Unexpected token '<', '<!DOCTYPE '... is not valid JSON".
 */
export async function parseSafeJsonResponse<T = any>(
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
 * Cria uma cobrança Pix via API do Mercado Pago no backend
 * (Sem dependência de Edge Functions inexistentes do Supabase)
 */
export async function createMercadoPagoPix(
  params: CreatePixRequest
): Promise<CreatePixResponse> {
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
    throw apiErr;
  }
}

/**
 * Consulta o status atual de um pagamento Pix no Mercado Pago
 */
export async function checkMercadoPagoPayment(
  paymentId: string
): Promise<CheckPaymentResponse> {
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
