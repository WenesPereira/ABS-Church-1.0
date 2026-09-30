import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  MessageCircle,
  CreditCard,
  Ban,
  Calendar,
  PhoneCall,
  ExternalLink,
} from 'lucide-react';
import { User } from '../types';
import {
  fetchUserProfile,
  isSubscriptionActive,
  isSubscriptionExpired,
  isSuperAdmin,
  buildWhatsAppLink,
  getLocalSupportConfig,
  GlobalAdminConfig,
} from '../services/treasuryService';
import {
  subscribeToUserSubscriptionStatus,
  checkMercadoPagoPayment,
} from '../services/paymentService';
import { MercadoPagoCheckoutSection } from './MercadoPagoCheckoutSection';

interface SubscriptionGateViewProps {
  currentUser: User;
  onLogout: () => void;
  onStatusUpdated: (updatedUser: User) => void;
  globalConfig?: GlobalAdminConfig;
}

export const SubscriptionGateView: React.FC<SubscriptionGateViewProps> = ({
  currentUser,
  onLogout,
  onStatusUpdated,
  globalConfig,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  const pollingRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // Consulta telefone de suporte configurado
  const supportPhone =
    globalConfig?.whatsappSuporte ||
    getLocalSupportConfig()?.whatsappSuporte ||
    '5511999999999';

  const whatsappMessage = `Olá! Sou da igreja "${currentUser.nomeIgreja || 'Minha Igreja'}" (${currentUser.email}). Minha assinatura do Tesouraria Pro está com status de expirada e preciso de suporte com a renovação / liberação.`;
  const whatsappUrl = buildWhatsAppLink(supportPhone, whatsappMessage);

  // Formatação amigável da data de expiração
  const formatExpirationDate = (): string | null => {
    const rawExpires = currentUser?.subscriptionExpiresAt || (currentUser as any)?.subscription_expires_at;
    if (!rawExpires || typeof rawExpires !== 'string') return null;
    const clean = rawExpires.trim();
    if (clean.toLowerCase().includes('vitalício') || clean.toLowerCase().includes('isento') || clean.toLowerCase().includes('demonstração')) {
      return null;
    }

    try {
      const parsed = new Date(clean.includes('T') ? clean : `${clean}T23:59:59`);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
    } catch {
      // fallback
    }
    return clean;
  };

  const expirationDateStr = formatExpirationDate();

  // Consulta direta ao Supabase na tabela 'profiles' para verificar se a assinatura foi ativada
  const verifySupabaseProfile = useCallback(
    async (silent: boolean = false) => {
      if (!currentUser?.id) return false;
      if (!silent) setIsVerifying(true);

      try {
        if (!silent) {
          try {
            await checkMercadoPagoPayment('', currentUser.id);
          } catch (mpErr) {
            console.warn('[SubscriptionGateView] Aviso na verificação MP:', mpErr);
          }
        }

        const freshUser = await fetchUserProfile(currentUser.id);
        if (!isMountedRef.current) return false;

        if (freshUser && isSubscriptionActive(freshUser)) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          setFeedback({
            type: 'success',
            message: 'Assinatura confirmada com sucesso! Liberando acesso completo ao sistema...',
          });

          // Atualiza a sessão e libera o acesso ao dashboard
          onStatusUpdated(freshUser);
          return true;
        } else if (!silent) {
          setFeedback({
            type: 'info',
            message:
              'Ainda não identificamos a compensação da assinatura no sistema. Se você acabou de efetuar o pagamento via Pix ou Cartão pelo Mercado Pago, aguarde alguns instantes ou entre em contato com nosso suporte.',
          });
        }
      } catch (err) {
        console.error('[SubscriptionGateView] Erro ao consultar Supabase profiles:', err);
        if (!silent && isMountedRef.current) {
          setFeedback({
            type: 'error',
            message: 'Não foi possível consultar os dados da sua conta no momento. Tente novamente em instantes.',
          });
        }
      } finally {
        if (!silent && isMountedRef.current) {
          setIsVerifying(false);
        }
      }
      return false;
    },
    [currentUser?.id, onStatusUpdated]
  );

  // 1. Verificação ao carregar
  useEffect(() => {
    isMountedRef.current = true;

    // Se porventura já for super admin ou tiver assinatura ativa não expirada, libera
    if (isSuperAdmin(currentUser) || isSubscriptionActive(currentUser)) {
      onStatusUpdated({
        ...currentUser,
        subscriptionStatus: 'active',
        statusAssinatura: 'ativo',
        subscriptionPlan: isSuperAdmin(currentUser) ? 'pro_isento' : currentUser.subscriptionPlan,
      });
      return;
    }

    // 2. Escuta alterações em tempo real no Supabase
    const unsubscribe = subscribeToUserSubscriptionStatus(currentUser.id, (freshUser) => {
      if (isMountedRef.current && isSubscriptionActive(freshUser)) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setFeedback({
          type: 'success',
          message: 'Assinatura reativada com sucesso! Redirecionando para o sistema...',
        });
        setTimeout(() => {
          if (isMountedRef.current) {
            onStatusUpdated(freshUser);
          }
        }, 500);
      }
    });

    // 3. Polling em tempo real a cada 4 segundos
    pollingRef.current = setInterval(() => {
      verifySupabaseProfile(true);
    }, 4000);

    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      unsubscribe();
    };
  }, [currentUser, onStatusUpdated, verifySupabaseProfile]);

  const handleManualCheck = () => {
    verifySupabaseProfile(false);
  };

  const blockedFeatures = [
    {
      icon: <Receipt className="w-5 h-5 text-rose-400" />,
      title: 'Lançamentos de Dízimos & Ofertas',
      description: 'Registro de entradas, cadastro de dizimistas e controle por cultos.',
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-rose-400" />,
      title: 'Fechamento de Caixa & Ata',
      description: 'Cálculo de repasse à matriz, prebenda pastoral e fechamento contábil.',
    },
    {
      icon: <BrainCircuit className="w-5 h-5 text-rose-400" />,
      title: 'Relatórios Financeiros com IA',
      description: 'Análises detalhadas do culto geradas por Inteligência Artificial.',
    },
    {
      icon: <Printer className="w-5 h-5 text-rose-400" />,
      title: 'Emissão de Recibos e PDF',
      description: 'Geração e impressão de recibos térmicos (58mm/80mm) e relatórios oficiais.',
    },
    {
      icon: <Coins className="w-5 h-5 text-rose-400" />,
      title: 'Contagem de Dinheiro do Caixa',
      description: 'Calculadora rápida de cédulas e moedas com conferência da gaveta.',
    },
    {
      icon: <CloudCheck className="w-5 h-5 text-rose-400" />,
      title: 'Sincronização & Histórico Ilimitado',
      description: 'Seus dados anteriores continuam preservados e seguros na nuvem.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-6 lg:p-8 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Bar with User Info, Support & Logout */}
      <header className="max-w-5xl mx-auto w-full flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-amber-600 to-amber-400 p-0.5 shadow-md shadow-rose-500/10 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-100 truncate max-w-[200px] sm:max-w-xs">
                {currentUser.nomeIgreja || 'Tesouraria da Igreja'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                Expirada
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <UserIcon className="w-3 h-3 text-slate-500" />
              <span>{currentUser.nome}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 truncate max-w-[150px] sm:max-w-xs">{currentUser.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Suporte WhatsApp no Topo */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 shadow-sm transition-all cursor-pointer"
            title="Falar com suporte via WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Suporte WhatsApp</span>
            <span className="sm:hidden">Suporte</span>
          </a>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
            title="Sair da conta"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Expired Subscription Container */}
      <main className="max-w-4xl mx-auto w-full my-auto py-6 sm:py-10 space-y-6">
        {/* Banner de Aviso de Bloqueio por Assinatura Expirada */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-extrabold uppercase tracking-wider shadow-sm">
            <Ban className="w-4 h-4 text-rose-400" />
            Assinatura Expirada / Renovar Plano
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight max-w-2xl mx-auto leading-tight">
            Acesso Temporariamente Bloqueado
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Identificamos que o período da sua assinatura do <strong className="text-white">Tesouraria Pro</strong> expirou. O acesso às ferramentas de <strong>lançamentos de dízimos</strong>, <strong>fechamento de caixa</strong> e <strong>relatórios financeiros</strong> foi suspenso até a regularização do plano.
          </p>

          {/* Card Informativo de Status & Preservação de Dados */}
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-left space-y-2.5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-semibold text-slate-400">Status atual:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                  Assinatura Expirada
                </span>
              </div>

              {expirationDateStr && (
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Vencida em: <strong>{expirationDateStr}</strong></span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5 text-xs text-slate-400 pt-1 border-t border-slate-800/80">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Seus dados continuam seguros:</strong> Todo o histórico de cultos, relatórios e cadastros já feitos permanece intacto e preservado. A renovação reativa instantaneamente o sistema sem nenhuma perda.
              </span>
            </div>
          </div>
        </div>

        {/* Pricing & Checkout Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-500/40 p-5 sm:p-8 lg:p-10 shadow-2xl shadow-amber-500/10 space-y-6">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="space-y-1 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> Renovar Plano Mensal Pro
              </div>
              <div className="flex items-baseline justify-center md:justify-start gap-2">
                <span className="text-4xl sm:text-5xl font-black text-slate-100 tracking-tight">R$ 19,90</span>
                <span className="text-sm text-slate-400 font-medium">/ mês</span>
              </div>
              <p className="text-xs text-slate-400">
                Pagamento seguro via Mercado Pago • PIX Instantâneo ou Cartão de Crédito
              </p>
            </div>

            <div className="text-center md:text-right text-xs text-slate-400">
              <span className="text-emerald-400 font-bold block mb-0.5">Reativação Imediata</span>
              <span className="flex items-center justify-center md:justify-end gap-1.5 text-slate-400">
                <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" /> Verificação ativa a cada 4s
              </span>
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
              className={`p-4 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border transition-all ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                  : feedback.type === 'error'
                  ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                  : 'bg-blue-950/70 border-blue-500/50 text-blue-200'
              }`}
            >
              <div className="flex items-start gap-3">
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

              {feedback.type !== 'success' && (
                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={isVerifying}
                  className="shrink-0 flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span>{isVerifying ? 'Atualizando...' : 'Já realizei o pagamento'}</span>
                </button>
              )}
            </div>
          )}

          {/* Botão de Consulta Manual */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-400 text-center sm:text-left">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Vinculado à sua conta: <code className="text-slate-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded text-[11px]">{currentUser.id.substring(0, 13)}...</code></span>
            </div>

            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isVerifying}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-amber-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-slate-950' : 'text-slate-950'}`} />
              <span>{isVerifying ? 'Consultando confirmação...' : 'Já realizei o pagamento / Atualizar status'}</span>
            </button>
          </div>
        </div>

        {/* ÁREA EXCLUSIVA DE SUPORTE WHATSAPP */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 p-5 sm:p-7 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-start gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-lg shadow-emerald-500/10">
                <MessageCircle className="w-6 h-6 fill-emerald-400/20" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-100 flex items-center justify-center sm:justify-start gap-2">
                  <span>Dúvidas ou Precisa de Suporte para Ativação?</span>
                </h3>
                <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                  Fale diretamente com nossa equipe oficial via WhatsApp. Estamos prontos para auxiliar na renovação, confirmação de comprovante PIX ou esclarecer qualquer dúvida sobre sua igreja.
                </p>
              </div>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950" />
              <span>Falar com Suporte no WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-950 opacity-70" />
            </a>
          </div>
        </div>

        {/* Grade de Recursos Pausados (para informação do usuário) */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center sm:text-left flex items-center justify-center sm:justify-start gap-2">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            Funcionalidades pausadas até a renovação da assinatura:
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {blockedFeatures.map((feat, index) => (
              <div
                key={index}
                className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 opacity-80 hover:opacity-100 transition-opacity flex items-start gap-3"
              >
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                  {feat.icon}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-200">{feat.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
        <p>Tesouraria da Igreja Pro • Atendimento e renovação seguros via Mercado Pago.</p>
      </footer>
    </div>
  );
};
