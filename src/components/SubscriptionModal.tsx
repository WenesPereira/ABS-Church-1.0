import React, { useState } from 'react';
import {
  Crown,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Printer,
  BrainCircuit,
  Database,
  Building,
  RefreshCw,
  X,
  CreditCard,
  Lock,
  HeartHandshake,
  Check,
} from 'lucide-react';
import { User } from '../types';
import {
  isSubscriptionActive,
  fetchUserProfile,
  isSuperAdmin,
} from '../services/treasuryService';
import { MercadoPagoCheckoutSection } from './MercadoPagoCheckoutSection';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onStatusUpdated?: (updatedUser: User) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStatusUpdated,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const isSubscribed = isSubscriptionActive(currentUser);
  const isSuper = isSuperAdmin(currentUser);

  // Polling automático no Supabase a cada 3 segundos enquanto a modal estiver aberta
  React.useEffect(() => {
    if (!isOpen || !currentUser?.id || isSubscribed || isSuper) return;

    const timer = setInterval(async () => {
      try {
        const fresh = await fetchUserProfile(currentUser.id);
        if (fresh && isSubscriptionActive(fresh)) {
          setVerificationFeedback({
            type: 'success',
            message: 'Assinatura confirmada com sucesso! Acesso PRO liberado.',
          });
          if (onStatusUpdated) onStatusUpdated(fresh);
        }
      } catch (e) {
        console.error('Erro no polling do SubscriptionModal:', e);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [isOpen, currentUser?.id, isSubscribed, isSuper, onStatusUpdated]);

  const handleCheckStatus = async () => {
    if (!currentUser?.id) {
      setVerificationFeedback({
        type: 'error',
        message: 'Faça login para verificar o status da sua assinatura.',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationFeedback(null);

    try {
      const freshUser = await fetchUserProfile(currentUser.id);
      if (freshUser) {
        if (isSubscriptionActive(freshUser)) {
          setVerificationFeedback({
            type: 'success',
            message: 'Parabéns! Sua assinatura Tesouraria Pro está ativa com sucesso.',
          });
          if (onStatusUpdated) {
            onStatusUpdated(freshUser);
          }
        } else {
          setVerificationFeedback({
            type: 'info',
            message:
              'Ainda não identificamos a confirmação da assinatura no sistema. Se você acabou de pagar pelo Mercado Pago (Pix ou Cartão), pode levar alguns instantes para a compensação bancária.',
          });
        }
      } else {
        setVerificationFeedback({
          type: 'error',
          message: 'Não foi possível consultar os dados do perfil no Supabase.',
        });
      }
    } catch (err) {
      console.error('Erro ao verificar assinatura:', err);
      setVerificationFeedback({
        type: 'error',
        message: 'Ocorreu um erro ao consultar o status. Tente novamente.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const benefits = [
    {
      icon: <BrainCircuit className="w-5 h-5 text-amber-400" />,
      title: 'Relatórios Inteligentes com IA',
      description: 'Análise automática dos cultos, dízimos, ofertas e recomendações para a liderança.',
    },
    {
      icon: <Printer className="w-5 h-5 text-emerald-400" />,
      title: 'Impressão Térmica e PDF Oficial',
      description: 'Emissão de atas de fechamento e recibos timbrados com logomarca e assinaturas.',
    },
    {
      icon: <Database className="w-5 h-5 text-blue-400" />,
      title: 'Sincronização em Nuvem Segura',
      description: 'Acesso seguro de qualquer computador, tablet ou celular com isolamento e backup.',
    },
    {
      icon: <Building className="w-5 h-5 text-purple-400" />,
      title: 'Fechamentos e Cultos Ilimitados',
      description: 'Sem limite de lançamentos mensais, histórico completo e controle por congregação.',
    },
    {
      icon: <Zap className="w-5 h-5 text-amber-300" />,
      title: 'Cálculo de Repasse à Matriz',
      description: 'Apuração e conferência de porcentagem estatutária da sede com 1 clique.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-teal-400" />,
      title: 'Suporte Prioritário & Atualizações',
      description: 'Garantia de estabilidade, novas ferramentas e suporte dedicado para a equipe.',
    },
  ];

  return (
    <div
      id="subscription-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="subscription-modal-card"
        className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden my-6"
      >
        {/* Top Glow Accent Header */}
        <div className="relative bg-gradient-to-r from-amber-600/30 via-emerald-600/20 to-slate-900 p-6 sm:p-8 border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer border border-slate-700/50"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/20">
              <Crown className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isSuper
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {isSuper ? 'Super Admin Vitalício' : 'Plano Mensal Pro'}
                </span>
                {isSubscribed && (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Check className="w-3 h-3" /> {isSuper ? 'Isento / Acesso Total' : 'Assinatura Ativa'}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-1">
                Tesouraria da Igreja Pro
              </h2>
            </div>
          </div>

          <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
            Tenha em mãos a plataforma completa de tesouraria eclesiástica com Inteligência Artificial,
            relatórios fiscais, impressão térmica e sincronização em nuvem.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Price Highlight Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                <Sparkles className="w-4 h-4" /> {isSuper ? 'Acesso Global Super Admin' : 'Assinatura Mensal com Mercado Pago (PIX e Cartão)'}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-100">
                  {isSuper ? 'Isento' : 'R$ 19,90'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {isSuper ? '(Acesso Vitalício)' : '/ mês'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isSuper
                  ? 'Isenção automática permanente aplicada ao Super Admin'
                  : 'Cancele quando quiser • Ativação imediata via Pix ou Cartão'}
              </p>
            </div>

            {isSuper ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
                <Crown className="w-4 h-4 text-purple-400 fill-purple-400" />
                <span>Acesso Super Admin Liberado</span>
              </div>
            ) : isSubscribed ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Sua conta já possui acesso Pro ativo</span>
              </div>
            ) : null}
          </div>

          {/* Seletor e Checkout Mercado Pago (PIX / Cartão) */}
          {!isSuper && !isSubscribed && (
            <MercadoPagoCheckoutSection
              currentUser={currentUser}
              onStatusUpdated={onStatusUpdated}
              onSuccess={() => {
                setTimeout(() => onClose(), 1500);
              }}
            />
          )}

          {/* Feedback messages */}
          {verificationFeedback && (
            <div
              className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
                verificationFeedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : verificationFeedback.type === 'error'
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  : 'bg-blue-950/60 border-blue-500/40 text-blue-300'
              }`}
            >
              {verificationFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <ShieldCheck className="w-5 h-5 shrink-0" />
              )}
              <div className="flex-1 leading-relaxed">
                {verificationFeedback.message}
              </div>
            </div>
          )}

          {/* Benefits Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Vantagens inclusas no seu plano:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefits.map((b, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors flex items-start gap-3"
                >
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                    {b.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{b.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification & Guarantee Section */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-400">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Ambiente de pagamento 100% seguro pelo Mercado Pago</span>
            </div>

            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={isVerifying}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer disabled:opacity-50 shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-slate-950' : 'text-slate-950'}`} />
              <span>{isVerifying ? 'Consultando...' : 'Já realizei o pagamento / Atualizar status'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
