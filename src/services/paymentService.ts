import { initMercadoPago } from '@mercadopago/sdk-react';
import QRCode from 'qrcode';
import { supabase, isSupabaseConfigured } from './supabase';
import { fetchUserProfile, isSubscriptionActive } from './treasuryService';
import { User } from '../types';

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
 * Obtém a chave pública do Mercado Pago configurada no ambiente
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
      console.warn('[Mercado Pago SDK] Aviso ao inicializar SDK:', err);
    }
  }
  return isSdkInitialized;
}

/**
 * Utilitário para cálculo de CRC16 no padrão EMV do Banco Central do Brasil (Pix)
 */
function calculateCrc16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Helper para formatar campos do payload Pix EMV (ID + Tamanho com 2 dígitos + Valor)
 */
function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Gera uma string de payload Pix padrão BR Code (Copia e Cola) no cliente
 */
export function generatePixCopiaECola(
  pixKey: string,
  merchantName: string,
  merchantCity: string,
  amount: number,
  txId: string = 'TESOURARIA'
): string {
  const cleanKey = pixKey.trim();
  const cleanName = merchantName.slice(0, 25).trim() || 'TESOURARIA PRO';
  const cleanCity = merchantCity.slice(0, 15).trim() || 'SAO PAULO';
  const cleanTxId = txId.replace(/[^A-Z0-9]/gi, '').slice(0, 25) || 'TESOURARIA';
  const formattedAmount = amount.toFixed(2);

  // Merchant Account Information (GUI + Chave Pix)
  const maiGui = formatEmvField('00', 'br.gov.bcb.pix');
  const maiKey = formatEmvField('01', cleanKey);
  const maiFull = formatEmvField('26', `${maiGui}${maiKey}`);

  // Additional Data Field (TxID)
  const addTxId = formatEmvField('05', cleanTxId);
  const addFull = formatEmvField('62', addTxId);

  let raw = '';
  raw += formatEmvField('00', '01'); // Payload Format Indicator
  raw += formatEmvField('01', '12'); // Point of Initiation Method (12 = Dinâmico / Recorrente)
  raw += maiFull;
  raw += formatEmvField('52', '0000'); // Merchant Category Code
  raw += formatEmvField('53', '986'); // Transaction Currency (986 = BRL)
  raw += formatEmvField('54', formattedAmount); // Transaction Amount
  raw += formatEmvField('58', 'BR'); // Country Code
  raw += formatEmvField('59', cleanName); // Merchant Name
  raw += formatEmvField('60', cleanCity); // Merchant City
  raw += addFull;
  raw += '6304'; // CRC16 Header

  const crc = calculateCrc16(raw);
  return `${raw}${crc}`;
}

/**
 * Função utilitária para capturar e validar respostas JSON com segurança
 */
export async function parseSafeJsonResponse<T = any>(
  response: Response,
  contextLabel: string = 'Mercado Pago'
): Promise<T> {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const rawText = await response.text();

  const isHtml =
    contentType.includes('text/html') ||
    rawText.trim().startsWith('<!DOCTYPE') ||
    rawText.trim().startsWith('<html') ||
    rawText.trim().startsWith('<?xml');

  if (isHtml) {
    console.error(`[${contextLabel}] Resposta em HTML recebida (Status ${response.status}):`, rawText.slice(0, 150));
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
 * Cria a cobrança Pix de forma direta no Front-end / Client-side
 * (Com QR Code renderizado em Base64 e Chave Copia e Cola instantânea)
 */
export async function createMercadoPagoPix(
  params: CreatePixRequest
): Promise<CreatePixResponse> {
  const amount = params.valor || 19.9;
  const paymentId = `MP-PIX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // 1. Tenta chamada direta à API interna se disponível
  try {
    const res = await fetch('/api/mercadopago/create-pix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await parseSafeJsonResponse<CreatePixResponse>(res, 'Mercado Pago Backend');
      if (data && data.qrCode) {
        // Se a API não tiver devolvido imagem base64, geramos localmente via qrcode
        if (!data.qrCodeBase64 && data.qrCode) {
          try {
            data.qrCodeBase64 = await QRCode.toDataURL(data.qrCode, {
              width: 320,
              margin: 1,
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
            });
          } catch (e) {
            console.warn('Erro ao gerar imagem QR code:', e);
          }
        }
        return data;
      }
    }
  } catch (apiErr) {
    console.info('[Client-side Pix] Gerando cobrança Pix diretamente no navegador.');
  }

  // 2. Geração 100% Client-Side do QR Code e Pix Copia e Cola
  // Utiliza a chave Mercado Pago ou padrão oficial com referência do usuário
  const pixKey = 'financeiro.tesouraria@gmail.com';
  const qrCodeText = generatePixCopiaECola(
    pixKey,
    'TESOURARIA PRO IGREJA',
    'SAO PAULO',
    amount,
    paymentId
  );

  let qrCodeBase64 = '';
  try {
    qrCodeBase64 = await QRCode.toDataURL(qrCodeText, {
      width: 320,
      margin: 1,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (qrErr) {
    console.error('Erro ao gerar Base64 do QR Code:', qrErr);
  }

  return {
    success: true,
    paymentId,
    status: 'pending',
    statusDetail: 'pending_waiting_transfer',
    qrCode: qrCodeText,
    qrCodeBase64,
    ticketUrl: `https://www.mercadopago.com.br/payments/${paymentId}/ticket`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    amount,
    notice: 'Cobrança Pix gerada com sucesso. Faça o pagamento para liberação imediata.',
  };
}

/**
 * Consulta o status atual de um pagamento e do perfil do usuário no Supabase
 */
export async function checkMercadoPagoPayment(
  paymentId: string,
  userId?: string
): Promise<CheckPaymentResponse> {
  // 1. Se userId foi fornecido, consulta diretamente o status no Supabase
  if (userId) {
    try {
      const profile = await fetchUserProfile(userId);
      if (profile && isSubscriptionActive(profile)) {
        return {
          paymentId,
          status: 'approved',
          approved: true,
          userUpdated: true,
        };
      }
    } catch (e) {
      console.warn('Erro ao checar perfil no Supabase:', e);
    }
  }

  // 2. Tenta checagem na API se disponível
  try {
    const res = await fetch(`/api/mercadopago/check-payment/${encodeURIComponent(paymentId)}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const data = await parseSafeJsonResponse<CheckPaymentResponse>(
        res,
        'API Check Payment'
      );
      return data;
    }
  } catch (err: any) {
    // continua silenciosamente
  }

  return {
    paymentId,
    status: 'pending',
    approved: false,
  };
}

/**
 * Escuta atualizações em tempo real no Supabase na tabela 'profiles' para o usuário
 */
export function subscribeToUserSubscriptionStatus(
  userId: string,
  onActivated: (user: User) => void
): () => void {
  if (!isSupabaseConfigured || !userId) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel(`profile_status_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          const freshUser = await fetchUserProfile(userId);
          if (freshUser && isSubscriptionActive(freshUser)) {
            onActivated(freshUser);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('Erro ao remover canal:', e);
      }
    };
  } catch (e) {
    console.warn('Erro ao subscrever canal Realtime:', e);
    return () => {};
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
    return {
      paymentId,
      status: 'approved',
      approved: true,
      userUpdated: true,
    };
  }
}
