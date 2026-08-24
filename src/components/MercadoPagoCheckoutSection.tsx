import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Clock,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { User } from '../types';
import { getMercadoPagoSubscriptionUrl, fetchUserProfile, isSubscriptionActive } from '../services/treasuryService';
import {
  createMercadoPagoPix,
  checkMercadoPagoPayment,
  simulatePixApproval,
  CreatePixResponse,
} from '../services/paymentService';

interface MercadoPagoCheckoutSectionProps {
  currentUser: User | null;
  onStatusUpdated?: (updatedUser: User) => void;
  onSuccess?: () => void;
}

export const MercadoPagoCheckoutSection: React.FC<MercadoPagoCheckoutSectionProps> = ({
  currentUser,
  onStatusUpdated,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [pixData, setPixData] = useState<CreatePixResponse | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  const pollingTimerRef = useRef<any>(null);
  const checkoutUrl = getMercadoPagoSubscriptionUrl(currentUser?.id);

  // Geração do Pix ao escolher o método Pix ou ao carregar
  const handleGeneratePix = async () => {
    if (!currentUser) return;
    setIsLoadingPix(true);
    setPixError(null);
    setVerificationFeedback(null);

    try {
      const res = await createMercadoPagoPix({
        userId: currentUser.id,
        email: currentUser.email,
        nome: currentUser.nome,
        valor: 19.90,
      });

      setPixData(res);
    } catch (err: any) {
      console.error('Erro ao solicitar Pix:', err);
      setPixError(err.message || 'Não foi possível gerar a cobrança Pix no momento.');
    } finally {
      setIsLoadingPix(false);
    }
  };

  // Copia o código Pix Copia e Cola
  const handleCopyPix = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  // Verificação manual e atualização no Supabase
  const handleVerifyStatus = async (silent: boolean = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsVerifying(true);

    try {
      // 1. Se tiver um Pix ativo, consulta status direto no endpoint do Mercado Pago
      if (pixData?.paymentId) {
        const checkRes = await checkMercadoPagoPayment(pixData.paymentId);
        if (checkRes.approved) {
          const freshUser = await fetchUserProfile(currentUser.id);
          if (freshUser) {
            setVerificationFeedback({
              type: 'success',
              message: 'Pagamento PIX confirmado com sucesso! Sua assinatura PRO foi ativada.',
            });
            if (onStatusUpdated) onStatusUpdated(freshUser);
            if (onSuccess) onSuccess();
            return;
          }
        }
      }

      // 2. Consulta o perfil completo no Supabase
      const freshUser = await fetchUserProfile(currentUser.id);
      if (freshUser && isSubscriptionActive(freshUser)) {
        setVerificationFeedback({
          type: 'success',
          message: 'Assinatura confirmada com sucesso! Acesso PRO liberado.',
        });
        if (onStatusUpdated) onStatusUpdated(freshUser);
        if (onSuccess) onSuccess();
      } else if (!silent) {
        setVerificationFeedback({
          type: 'info',
          message: 'Ainda aguardando a compensação do pagamento pelo Mercado Pago. Se já efetuou o Pix ou cartão, aguarde alguns segundos.',
        });
      }
    } catch (err) {
      console.error('Erro ao verificar:', err);
      if (!silent) {
        setVerificationFeedback({
          type: 'error',
          message: 'Ocorreu um erro ao consultar o status. Tente novamente.',
        });
      }
    } finally {
      if (!silent) setIsVerifying(false);
    }
  };

  // Simular aprovação Pix (para testes e demonstração)
  const handleSimulatePixSuccess = async () => {
    if (!pixData?.paymentId || !currentUser) return;
    setIsVerifying(true);
    try {
      await simulatePixApproval(pixData.paymentId, currentUser.id, currentUser.email);
      const freshUser = await fetchUserProfile(currentUser.id);
      if (freshUser) {
        setVerificationFeedback({
          type: 'success',
          message: 'Pagamento simulado com sucesso! Assinatura ativada no banco de dados.',
        });
        if (onStatusUpdated) onStatusUpdated(freshUser);
        if (onSuccess) onSuccess();
      }
    } catch (e) {
      console.error('Erro na simulação:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  // Polling automático a cada 4 segundos quando o QR Code Pix estiver na tela
  useEffect(() => {
    if (paymentMethod === 'pix' && pixData?.paymentId && pixData.status === 'pending') {
      pollingTimerRef.current = setInterval(() => {
        handleVerifyStatus(true);
      }, 4000);
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [paymentMethod, pixData?.paymentId, pixData?.status]);

  // Se o método for Pix e ainda não tiver sido gerado, gera automaticamente
  useEffect(() => {
    if (paymentMethod === 'pix' && !pixData && !isLoadingPix && currentUser) {
      handleGeneratePix();
    }
  }, [paymentMethod, currentUser]);

  const handleOpenCardCheckout = () => {
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  };

  // Formata o Base64 da imagem do QR Code
  const getQrCodeImageSrc = (base64Str?: string) => {
    if (!base64Str) return '';
    if (base64Str.startsWith('data:image')) return base64Str;
    return `data:image/png;base64,${base64Str}`;
  };

  return (
    <div className="space-y-5">
      {/* Seletor de Método de Pagamento */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Escolha a forma de pagamento:
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Opção PIX */}
          <button
            type="button"
            onClick={() => setPaymentMethod('pix')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              paymentMethod === 'pix'
                ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${paymentMethod === 'pix' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-400'}`}>
                <QrCode className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-slate-100">PIX Instantâneo</span>
            </div>
            <span className="text-[11px] text-emerald-400/90 font-medium">
              Aprovação imediata (QR Code)
            </span>
          </button>

          {/* Opção Cartão de Crédito */}
          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              paymentMethod === 'card'
                ? 'bg-amber-950/50 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${paymentMethod === 'card' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-400'}`}>
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-slate-100">Cartão de Crédito</span>
            </div>
            <span className="text-[11px] text-amber-400/90 font-medium">
              Assinatura recorrente mensal
            </span>
          </button>
        </div>
      </div>

      {/* Conteúdo Dinâmico: PIX */}
      {paymentMethod === 'pix' && (
        <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                Pagamento via Pix (R$ 19,90)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" /> Válido por 24h
            </span>
          </div>

          {isLoadingPix ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
              <p className="text-xs font-medium text-slate-300">
                Gerando cobrança Pix no Mercado Pago...
              </p>
            </div>
          ) : pixError ? (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Não foi possível gerar o Pix</span>
              </div>
              <p>{pixError}</p>
              <button
                type="button"
                onClick={handleGeneratePix}
                className="mt-2 px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Tentar Novamente
              </button>
            </div>
          ) : pixData ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Imagem do QR Code Base64 */}
                <div className="relative p-2.5 rounded-2xl bg-white shadow-xl shadow-emerald-500/10 flex items-center justify-center shrink-0 border-2 border-emerald-500/40">
                  {pixData.qrCodeBase64 && pixData.qrCodeBase64.length > 50 ? (
                    <img
                      src={getQrCodeImageSrc(pixData.qrCodeBase64)}
                      alt="QR Code Pix Mercado Pago"
                      className="w-40 h-40 object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    // Fallback visual caso base64 seja demo ou simplificado
                    <div className="w-40 h-40 bg-slate-100 rounded-lg flex flex-col items-center justify-center p-3 text-center">
                      <QrCode className="w-16 h-16 text-slate-900 mb-1" />
                      <span className="text-[10px] font-bold text-slate-700 leading-tight">
                        Mercado Pago PIX
                      </span>
                    </div>
                  )}
                </div>

                {/* Instruções e Botão Copia e Cola */}
                <div className="space-y-3 flex-1 w-full text-center sm:text-left">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center justify-center sm:justify-start gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Pague pelo aplicativo do seu banco
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      1. Abra o app do seu banco e escolha <strong>Pix &gt; Pagar com QR Code</strong> ou <strong>Pix Copia e Cola</strong>.
                      <br />
                      2. Após pagar, o sistema detecta automaticamente a confirmação.
                    </p>
                  </div>

                  {/* Botão Copia e Cola */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${
                        pixCopied
                          ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 hover:scale-[1.01] active:scale-98'
                      }`}
                    >
                      {pixCopied ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Código Pix Copiado com Sucesso!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Código Pix Copia e Cola</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status de Polling em Tempo Real */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span>Aguardando confirmação bancária em tempo real...</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleVerifyStatus(false)}
                  disabled={isVerifying}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isVerifying ? 'Verificando...' : 'Verificar Agora'}
                </button>
              </div>

              {/* Modo de Demonstração / Fallback rápido */}
              {pixData.isDemo && (
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-300 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span>Modo de demonstração / testes ativo no aplicativo.</span>
                  <button
                    type="button"
                    onClick={handleSimulatePixSuccess}
                    disabled={isVerifying}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Simular Pagamento Aprovado
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Conteúdo Dinâmico: CARTÃO DE CRÉDITO */}
      {paymentMethod === 'card' && (
        <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                Assinatura no Cartão de Crédito
              </span>
            </div>
            <span className="text-xs font-bold text-amber-400">R$ 19,90 / mês</span>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Você será direcionado para o ambiente 100% seguro do <strong>Mercado Pago</strong> com renovação mensal automática.
              Aceita Visa, Mastercard, Elo, Hipercard e American Express.
            </p>

            <button
              type="button"
              onClick={handleOpenCardCheckout}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pagar no Cartão pelo Mercado Pago</span>
              <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px]">Já concluiu o pagamento na janela?</span>
            <button
              type="button"
              onClick={() => handleVerifyStatus(false)}
              disabled={isVerifying}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isVerifying ? 'Verificando...' : 'Verificar Status'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Feedback de Verificação */}
      {verificationFeedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
            verificationFeedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
              : verificationFeedback.type === 'error'
              ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
              : 'bg-blue-950/70 border-blue-500/50 text-blue-200'
          }`}
        >
          {verificationFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
          )}
          <div className="flex-1 leading-relaxed font-medium">
            {verificationFeedback.message}
          </div>
        </div>
      )}
    </div>
  );
};
