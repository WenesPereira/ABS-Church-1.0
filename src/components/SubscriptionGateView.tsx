import React, { useState, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  Lock,
  RefreshCw,
  LogOut,
  CheckCircle2,
  BrainCircuit,
  Printer,
  Coins,
  Receipt,
  CloudCheck,
  Building,
  ShieldCheck,
  AlertTriangle,
  User as UserIcon,
} from 'lucide-react';
import { User } from '../types';
import {
  fetchUserProfile,
  isSubscriptionActive,
  isSuperAdmin,
} from '../services/treasuryService';
import { MercadoPagoCheckoutSection } from './MercadoPagoCheckoutSection';

interface SubscriptionGateViewProps {
  currentUser: User;
  onLogout: () => void;
  onStatusUpdated: (updatedUser: User) => void;
}

export const SubscriptionGateView: React.FC<SubscriptionGateViewProps> = ({
  currentUser,
  onLogout,
  onStatusUpdated,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  // Se o usuário for o Super Admin ou possuir assinatura ativa, desbloqueia imediatamente
  useEffect(() => {
    if (isSuperAdmin(currentUser) || isSubscriptionActive(currentUser)) {
      onStatusUpdated({
        ...currentUser,
        subscriptionStatus: 'active',
        subscriptionPlan: isSuperAdmin(currentUser) ? 'pro_isento' : currentUser.subscriptionPlan,
      });
    }
  }, [currentUser, onStatusUpdated]);

  const handleCheckStatus = async () => {
    setIsVerifying(true);
    setFeedback(null);

    try {
      const freshUser = await fetchUserProfile(currentUser.id);
      if (freshUser) {
        if (isSubscriptionActive(freshUser)) {
          setFeedback({
            type: 'success',
            message: 'Assinatura PRO confirmada! Liberando acesso a todas as ferramentas...',
          });
          setTimeout(() => {
            onStatusUpdated(freshUser);
          }, 1000);
        } else {
          setFeedback({
            type: 'info',
            message:
              'Ainda não identificamos a confirmação da assinatura no sistema. Se você acabou de pagar via Pix ou Cartão pelo Mercado Pago, pode levar alguns instantes para a compensação.',
          });
        }
      } else {
        setFeedback({
          type: 'error',
          message: 'Não foi possível consultar as informações da sua conta no momento. Tente novamente em instantes.',
        });
      }
    } catch (err) {
      console.error('Erro ao verificar assinatura:', err);
      setFeedback({
        type: 'error',
        message: 'Não foi possível verificar a assinatura no momento. Tente novamente.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const proBenefits = [
    {
      icon: <BrainCircuit className="w-5 h-5 text-amber-400" />,
      title: 'Relatório Financeiro com IA',
      description: 'Análises detalhadas do culto geradas por Inteligência Artificial para a diretoria e pastores.',
    },
    {
      icon: <Printer className="w-5 h-5 text-amber-400" />,
      title: 'Recibos Térmicos (58mm/80mm) e PDF',
      description: 'Emissão profissional de comprovantes de fechamento com assinaturas do pastor e tesoureiro.',
    },
    {
      icon: <Coins className="w-5 h-5 text-amber-400" />,
      title: 'Contagem Inteligente de Caixa',
      description: 'Calculadora rápida de cédulas e moedas com conferência automática da gaveta.',
    },
    {
      icon: <Receipt className="w-5 h-5 text-amber-400" />,
      title: 'Gestão de Entradas, Dízimos e Saídas',
      description: 'Controle categorizado por membros, visitantes, PIX, dinheiro e repasse de matriz.',
    },
    {
      icon: <CloudCheck className="w-5 h-5 text-amber-400" />,
      title: 'Sincronização em Nuvem Segura',
      description: 'Armazenamento seguro e fechamentos históricos ilimitados salvos na nuvem.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
      title: 'Segurança e Auditoria Completa',
      description: 'Cálculo auditável do saldo final do culto e comprovantes para prestação de contas.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Bar with User Info & Logout */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-400">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
              <span>{currentUser.nomeIgreja || 'Tesouraria da Igreja'}</span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <UserIcon className="w-3 h-3 text-slate-500" />
              <span>{currentUser.nome}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{currentUser.email}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
          title="Sair da conta"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sair / Fazer Logout</span>
          <span className="sm:hidden">Sair</span>
        </button>
      </header>

      {/* Main Paywall Container */}
      <main className="max-w-4xl mx-auto w-full my-auto py-8 sm:py-12 space-y-8">
        {/* Paywall Header Notice */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            Acesso Restrito
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight max-w-2xl mx-auto leading-tight">
            Assine o Plano PRO para liberar todas as ferramentas do aplicativo
          </h2>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Seu cadastro está ativo, mas o acesso completo requer a assinatura mensal do <strong className="text-slate-200">Tesouraria Pro</strong>. Escolha pagar via <strong className="text-emerald-400">Pix Instantâneo</strong> ou <strong className="text-amber-400">Cartão de Crédito</strong>.
          </p>
        </div>

        {/* Pricing & Checkout Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-500/40 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-amber-500/10 space-y-6">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
            <div className="space-y-1 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> Plano Mensal Completo
              </div>
              <div className="flex items-baseline justify-center md:justify-start gap-2">
                <span className="text-4xl sm:text-5xl font-black text-slate-100 tracking-tight">R$ 19,90</span>
                <span className="text-sm text-slate-400 font-medium">/ mês</span>
              </div>
              <p className="text-xs text-slate-400">
                Pagamento seguro via Mercado Pago • PIX ou Cartão • Cancele quando quiser
              </p>
            </div>

            <div className="text-center md:text-right text-xs text-slate-400">
              <span className="text-emerald-400 font-bold block mb-0.5">Liberação Imediata</span>
              <span>Reconhecimento instantâneo da assinatura</span>
            </div>
          </div>

          {/* Seletor Dinâmico PIX & Cartão de Crédito Mercado Pago */}
          <MercadoPagoCheckoutSection
            currentUser={currentUser}
            onStatusUpdated={onStatusUpdated}
          />

          {/* Real-time Verification Feedback */}
          {feedback && (
            <div
              className={`mt-6 p-4 rounded-2xl text-xs flex items-start gap-3 border transition-all ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                  : feedback.type === 'error'
                  ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                  : 'bg-blue-950/70 border-blue-500/50 text-blue-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : feedback.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed font-medium">
                {feedback.message}
              </div>
            </div>
          )}

          {/* Secondary Action: Real-time status sync */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-400 text-center sm:text-left">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Liberação automática vinculada ao seu ID: <code className="text-slate-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded text-[11px]">{currentUser.id.substring(0, 13)}...</code></span>
            </div>

            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={isVerifying}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isVerifying ? 'Verificando assinatura...' : 'Já assinei / Verificar status'}</span>
            </button>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center sm:text-left flex items-center justify-center sm:justify-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Tudo o que está incluso no Tesouraria PRO:
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proBenefits.map((benefit, index) => (
              <div
                key={index}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-start gap-3.5"
              >
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                  {benefit.icon}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-200">{benefit.title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
        <p>Tesouraria da Igreja Pro • Sistema completo para gestão financeira e fechamento de culto.</p>
      </footer>
    </div>
  );
};
