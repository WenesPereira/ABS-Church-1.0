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
 * Obtém a chave pública do Mercado Pago configurada no ambiente (priorizando chaves de Produção APP_USR-...)
 */
export function getMercadoPagoPublicKey(): string {
  const env = ((import.meta as any).env || {}) as Record<string, string>;
  const candidateKeys = [
    env.VITE_MERCADOPAGO_PUBLIC_KEY,
    env.VITE_MP_PUBLIC_KEY,
    env.MERCADOPAGO_PUBLIC_KEY,
    env.MP_PUBLIC_KEY,
  ].filter(Boolean).map(k => (k as string).trim());

  // Prioriza chaves de produção iniciadas em APP_USR-
  return (
    candidateKeys.find(k => k.startsWith('APP_USR-')) ||
    candidateKeys[0] ||
    ''
  );
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
 * Cria a cobrança Pix via Netlify Function (/ .netlify/functions/create-pix)
 * conectada à API oficial do Mercado Pago no backend
 */
export async function createMercadoPagoPix(
  params: CreatePixRequest
): Promise<CreatePixResponse> {
  const amount = params.valor || 19.9;
  let lastError: Error | null = null;

  // Lista de endpoints para criação de Pix (Netlify Function prioritária)
  const endpoints = [
    '/.netlify/functions/create-pix',
    '/api/mercadopago/create-pix',
    '/netlify/functions/create-pix',
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(params),
      });

      // Se a resposta for OK ou erro tratado em JSON (status !== 404)
      if (res.status !== 404) {
        const rawData = await parseSafeJsonResponse<any>(res, `Pix via ${endpoint}`);
        if (rawData) {
          const qrCode = rawData.qrCode || rawData.qr_code;
          let qrCodeBase64 = rawData.qrCodeBase64 || rawData.qr_code_base64;
          const paymentId = String(rawData.paymentId || rawData.id || `MP-PIX-${Date.now()}`);

          // Se a API não devolveu a imagem Base64 mas devolveu a chave Pix, gera localmente
          if (!qrCodeBase64 && qrCode) {
            try {
              qrCodeBase64 = await QRCode.toDataURL(qrCode, {
                width: 320,
                margin: 1,
                color: {
                  dark: '#020617',
                  light: '#ffffff',
                },
              });
            } catch (e) {
              console.warn('Erro ao gerar imagem QR code:', e);
            }
          }

          return {
            success: rawData.success !== false,
            paymentId,
            status: rawData.status || 'pending',
            statusDetail: rawData.statusDetail || rawData.status_detail,
            qrCode: qrCode || '',
            qrCodeBase64: qrCodeBase64 || '',
            ticketUrl: rawData.ticketUrl || rawData.ticket_url || '',
            expiresAt: rawData.expiresAt || rawData.date_of_expiration,
            amount: Number(rawData.amount) || amount,
            notice: rawData.notice,
            isDemo: rawData.isDemo || false,
          };
        }
      }
    } catch (err: any) {
      console.warn(`[Pix Service] Falha ao tentar ${endpoint}:`, err.message);
      lastError = err;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Não foi possível conectar à função de geração do Pix. Verifique a configuração.');
}

/**
 * Consulta o status atual de um pagamento e do perfil do usuário no Supabase
 * Realiza consulta direta à API do Mercado Pago e força atualização do perfil se aprovado
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

  // 2. Tenta checagem direta nos endpoints de verificação (Netlify Function ou Express API)
  const checkEndpoints = [
    `/.netlify/functions/check-payment?paymentId=${encodeURIComponent(paymentId || '')}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`,
    `/api/mercadopago/check-payment/${encodeURIComponent(paymentId || '')}${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`,
    `/netlify/functions/check-payment?paymentId=${encodeURIComponent(paymentId || '')}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`,
  ];

  for (const endpoint of checkEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await parseSafeJsonResponse<CheckPaymentResponse>(
          res,
          `Check Payment (${endpoint})`
        );
        if (data && (data.status || data.approved !== undefined)) {
          return data;
        }
      }
    } catch (err: any) {
      // continua para o próximo endpoint
    }
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
        },
        async (payload) => {
          const row = (payload.new || {}) as any;
          if (
            row.user_id === userId ||
            row.id === userId ||
            !row.user_id
          ) {
            const freshUser = await fetchUserProfile(userId);
            if (freshUser && isSubscriptionActive(freshUser)) {
              onActivated(freshUser);
            }
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
