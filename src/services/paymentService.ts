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
 * Cria uma cobrança Pix via API do Mercado Pago no backend
 */
export async function createMercadoPagoPix(
  params: CreatePixRequest
): Promise<CreatePixResponse> {
  try {
    const res = await fetch('/api/mercadopago/create-pix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao gerar cobrança PIX');
    }
    return data;
  } catch (err: any) {
    console.error('Erro ao gerar Pix no frontend:', err);
    throw err;
  }
}

/**
 * Consulta o status atual de um pagamento Pix no Mercado Pago
 */
export async function checkMercadoPagoPayment(
  paymentId: string
): Promise<CheckPaymentResponse> {
  try {
    const res = await fetch(`/api/mercadopago/check-payment/${encodeURIComponent(paymentId)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao consultar pagamento');
    }
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
      },
      body: JSON.stringify({ paymentId, userId, email }),
    });
    return await res.json();
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
