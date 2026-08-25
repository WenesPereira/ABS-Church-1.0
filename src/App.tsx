import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveTab,
  FechamentoCulto,
  ConfigIgreja,
  User,
} from './types';

import {
  DEFAULT_CONFIG,
  fetchConfiguracaoIgreja,
  saveConfiguracaoIgreja,
  fetchFechamentos,
  saveFechamento,
  deleteFechamento,
  resetAllUserData,
  syncUserProfile,
  fetchUserProfile,
  updateUserSubscriptionStatus,
  isSubscriptionActive,
  isSuperAdmin,
  fetchGlobalAdminConfig,
  getLocalSupportConfig,
  GlobalAdminConfig,
} from './services/treasuryService';
import { supabase, isSupabaseConfigured } from './services/supabase';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AuthView } from './components/AuthView';
import { FechamentoAtualView } from './components/FechamentoAtualView';
import { LancamentosView } from './components/LancamentosView';
import { ContagemDinheiroView } from './components/ContagemDinheiroView';
import { RelatorioIAView } from './components/RelatorioIAView';
import { HistoricoView } from './components/HistoricoView';
import { ConfigView } from './components/ConfigView';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { SubscriptionGateView } from './components/SubscriptionGateView';
import { Crown, Sparkles, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { DEMO_USER, DEMO_CONFIG, DEMO_FECHAMENTOS } from './data/mockData';

function createEmptyFechamento(config: ConfigIgreja, user?: User | null): FechamentoCulto {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: `culto-${Date.now()}`,
    nomeIgreja: config.nomeIgreja || 'Minha Igreja',
    data: today,
    hora: '19:00',
    tipoCulto: 'Fechamento de Caixa',
    tesoureiro: user?.nome || config.tesoureiroPadrao || 'Tesoureiro Principal',
    segundaTestemunha: config.segundoTesoureiroPadrao || undefined,
    porcentagemMatriz: config.porcentagemMatriz ?? 20,
    aplicarRepasseMatriz: config.aplicarRepasseMatriz ?? true,
    tipoBaseRepasseMatriz: config.tipoBaseRepasseMatriz || 'todas',
    categoriasRepasseMatriz: config.categoriasRepasseMatriz || undefined,
    status: 'aberto',
    criadoEm: new Date().toISOString(),
    contagemDinheiro: {
      c200: 0, c100: 0, c50: 0, c20: 0, c10: 0, c5: 0, c2: 0,
      m100: 0, m050: 0, m025: 0, m010: 0, m005: 0,
    },
    lancamentos: [],
  };
}

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('fechamento');

  // Automatic scroll to top when changing active tab
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // Config State
  const [configIgreja, setConfigIgreja] = useState<ConfigIgreja>(DEFAULT_CONFIG);

  // History State
  const [historico, setHistorico] = useState<FechamentoCulto[]>([]);

  // Active Closing State
  const [fechamentoAtual, setFechamentoAtual] = useState<FechamentoCulto>(() =>
    createEmptyFechamento(DEFAULT_CONFIG, null)
  );

  // Modal Print State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Modal Subscription State
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isPaymentSuccessModalOpen, setIsPaymentSuccessModalOpen] = useState(false);

  // Supabase Cloud Sync State
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Global Support & Admin Config State (APK, WhatsApp, Email, Contatos)
  const [globalConfig, setGlobalConfig] = useState<GlobalAdminConfig>(() => getLocalSupportConfig());

  // Demo Mode Alert State
  const [demoAlertMessage, setDemoAlertMessage] = useState<string | null>(null);

  const showDemoAlert = useCallback((msg: string = 'Esta é uma conta de demonstração. Recursos de edição estão disponíveis apenas na versão completa.') => {
    setDemoAlertMessage(msg);
  }, []);

  /* =========================================================
     VERIFICAÇÃO DE RETORNO DO MERCADO PAGO NA URL
     ========================================================= */
  useEffect(() => {
    if (!currentUser?.id) return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const statusParam = (urlParams.get('status') || urlParams.get('collection_status') || '').toLowerCase();
      const preapprovalId = urlParams.get('preapproval_id') || urlParams.get('payment_id') || undefined;

      const isApproved = statusParam === 'approved' || statusParam === 'success' || !!preapprovalId;

      if (isApproved) {
        console.log('Retorno de pagamento Mercado Pago detectado:', { statusParam, preapprovalId });
        fetchUserProfile(currentUser.id).then((freshUser) => {
          if (freshUser) {
            setCurrentUser(freshUser);
            if (isSubscriptionActive(freshUser)) {
              setIsPaymentSuccessModalOpen(true);
            }
          }
        });

        // Limpa parâmetros da URL sem recarregar a página
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.error('Erro ao verificar parâmetros de retorno do pagamento:', e);
    }
  }, [currentUser?.id]);

  /* =========================================================
     FUNÇÃO DE CARREGAMENTO DIRETO DO SUPABASE
     ========================================================= */

  const loadUserDataFromSupabase = useCallback(async (userId: string, userObj?: User | null) => {
    try {
      let effectiveUserId = userId;

      // Se nenhum ID for passado diretamente, tenta recuperar o ID da sessão ativa
      if (!effectiveUserId) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            effectiveUserId = session.user.id;
          }
        } catch {
          // fallback silencioso
        }
      }

      if (!effectiveUserId) {
        console.warn('loadUserDataFromSupabase: ID de usuário não encontrado.');
        return;
      }

      // 1. Carrega configurações do usuário com filtro explícito
      const configRes = await fetchConfiguracaoIgreja(effectiveUserId);
      const userConfig = configRes.data || DEFAULT_CONFIG;
      if (userObj?.nomeIgreja && (!userConfig.nomeIgreja || userConfig.nomeIgreja === 'Minha Igreja')) {
        userConfig.nomeIgreja = userObj.nomeIgreja;
      }
      setConfigIgreja(userConfig);

      // 2. Carrega fechamentos do usuário com filtro explícito
      const fechamentosRes = await fetchFechamentos(effectiveUserId);
      if (fechamentosRes.data && fechamentosRes.data.length > 0) {
        setHistorico(fechamentosRes.data);
        setFechamentoAtual(fechamentosRes.data[0]);
      } else {
        setHistorico([]);
        const novoVazio = createEmptyFechamento(userConfig, userObj);
        setFechamentoAtual(novoVazio);
      }
    } catch (err) {
      console.error('Erro Supabase inesperado ao carregar dados do usuário:', err);
    }
  }, []);

  /* =========================================================
     SUPABASE AUTH SESSION INITIALIZATION & LISTENER
     ========================================================= */

  useEffect(() => {
    // Carrega configurações globais (WhatsApp, E-mail, APK, Contatos) do Supabase / cache local
    fetchGlobalAdminConfig()
      .then((data) => {
        if (data) {
          setGlobalConfig(data);
        }
      })
      .catch((err) => {
        console.warn('Aviso ao carregar configurações globais:', err);
      });

    // 1. Verifica se há sessão ativa de Modo Demonstração
    const isDemoSession = sessionStorage.getItem('tesouraria_demo_session') === 'true';
    if (isDemoSession) {
      setCurrentUser(DEMO_USER);
      setConfigIgreja(DEMO_CONFIG);
      setHistorico(DEMO_FECHAMENTOS);
      setFechamentoAtual(DEMO_FECHAMENTOS[0]);
      setIsAuthChecking(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setIsAuthChecking(false);
      return;
    }

    let isMounted = true;

    // Monitora sessão ativa do Supabase Auth
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (!isMounted) return;

      if (sessionError) {
        console.error('Erro Supabase ao recuperar sessão:', sessionError);
      }

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const meta = session.user.user_metadata || {};
        const email = session.user.email || '';
        const isSuper = isSuperAdmin(email);
        const u: User = {
          id: session.user.id,
          email,
          nome: profile?.nome || meta.nome || (isSuper ? 'Super Administrador' : 'Tesoureiro'),
          cargo: profile?.cargo || meta.cargo || (isSuper ? 'Administrador do Sistema' : 'Tesoureiro Principal'),
          nomeIgreja: profile?.nomeIgreja || meta.nome_igreja || 'Minha Igreja',
          subscriptionStatus: isSuper ? 'active' : (profile?.subscriptionStatus || 'inactive'),
          subscriptionPlan: isSuper ? 'pro_isento' : (profile?.subscriptionPlan || 'mensal'),
          subscriptionExpiresAt: isSuper ? 'Vitalício / Isento' : profile?.subscriptionExpiresAt,
          mpPreapprovalId: profile?.mpPreapprovalId,
          createdAt: session.user.created_at || new Date().toISOString(),
        };

        if (isMounted) {
          setCurrentUser(u);
          await loadUserDataFromSupabase(session.user.id, u);
        }
      } else {
        if (isMounted) {
          setCurrentUser(null);
          setHistorico([]);
          setFechamentoAtual(createEmptyFechamento(DEFAULT_CONFIG, null));
        }
      }

      if (isMounted) {
        setIsAuthChecking(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Se estiver em modo demo, ignora eventos automáticos do supabase
      if (sessionStorage.getItem('tesouraria_demo_session') === 'true') {
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const meta = session.user.user_metadata || {};
        const email = session.user.email || '';
        const isSuper = isSuperAdmin(email);
        const u: User = {
          id: session.user.id,
          email,
          nome: profile?.nome || meta.nome || (isSuper ? 'Super Administrador' : 'Tesoureiro'),
          cargo: profile?.cargo || meta.cargo || (isSuper ? 'Administrador do Sistema' : 'Tesoureiro Principal'),
          nomeIgreja: profile?.nomeIgreja || meta.nome_igreja || 'Minha Igreja',
          subscriptionStatus: isSuper ? 'active' : (profile?.subscriptionStatus || 'inactive'),
          subscriptionPlan: isSuper ? 'pro_isento' : (profile?.subscriptionPlan || 'mensal'),
          subscriptionExpiresAt: isSuper ? 'Vitalício / Isento' : profile?.subscriptionExpiresAt,
          mpPreapprovalId: profile?.mpPreapprovalId,
          createdAt: session.user.created_at || new Date().toISOString(),
        };

        setCurrentUser(u);
        await loadUserDataFromSupabase(session.user.id, u);
      } else if (event === 'SIGNED_OUT') {
        // RESET TOTAL NO LOGOUT
        setCurrentUser(null);
        setHistorico([]);
        setConfigIgreja(DEFAULT_CONFIG);
        setFechamentoAtual(createEmptyFechamento(DEFAULT_CONFIG, null));
        setActiveTab('fechamento');
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [loadUserDataFromSupabase]);

  /* =========================================================
     AUTH HANDLERS
     ========================================================= */

  const handleLoginSuccess = async (
    user: User,
    _isNewAccount?: boolean,
    churchName?: string
  ) => {
    // Caso especial: Modo Demonstração
    if (user.isDemo) {
      sessionStorage.setItem('tesouraria_demo_session', 'true');
      setCurrentUser(DEMO_USER);
      setConfigIgreja(DEMO_CONFIG);
      setHistorico(DEMO_FECHAMENTOS);
      setFechamentoAtual(DEMO_FECHAMENTOS[0]);
      setActiveTab('fechamento');
      setIsAuthChecking(false);
      return;
    }

    // Limpa sessão demo se estava aberta
    sessionStorage.removeItem('tesouraria_demo_session');

    // Limpa estado anterior antes de popular novo usuário
    setHistorico([]);

    // Sincroniza dados básicos de perfil no Supabase (NUNCA altera subscription_status)
    await syncUserProfile(user);

    // Consulta os dados de perfil e assinatura diretamente do Supabase
    const dbProfile = await fetchUserProfile(user.id);
    const resolvedUser: User = dbProfile
      ? {
          ...user,
          subscriptionStatus: dbProfile.subscriptionStatus || 'inactive',
          subscriptionPlan: dbProfile.subscriptionPlan || 'mensal',
          subscriptionExpiresAt: dbProfile.subscriptionExpiresAt,
          mpPreapprovalId: dbProfile.mpPreapprovalId,
        }
      : user;

    setCurrentUser(resolvedUser);

    if (churchName && churchName.trim()) {
      const updatedConfig: ConfigIgreja = {
        ...configIgreja,
        nomeIgreja: churchName.trim(),
      };
      setConfigIgreja(updatedConfig);
      if (user.id) {
        saveConfiguracaoIgreja(updatedConfig, user.id);
      }
    }

    // Carrega os dados reais do banco do Supabase para esta conta
    await loadUserDataFromSupabase(user.id, resolvedUser);
  };

  const handleLogout = async () => {
    // 1. Limpa sessão de demonstração
    sessionStorage.removeItem('tesouraria_demo_session');

    // 2. Limpa todos os estados locais do React imediatamente
    setCurrentUser(null);
    setHistorico([]);
    setConfigIgreja(DEFAULT_CONFIG);
    setFechamentoAtual(createEmptyFechamento(DEFAULT_CONFIG, null));
    setActiveTab('fechamento');

    // 3. Encerra a sessão no Supabase Auth
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Erro Supabase ao deslogar:', error);
        }
      } catch (err) {
        console.error('Erro Supabase inesperado ao sair:', err);
      }
    }
  };

  /* =========================================================
     GERENCIADORES DE DADOS SINCRONIZADOS COM O SUPABASE
     ========================================================= */

  const handleSetFechamentoAtual = (
    updater: FechamentoCulto | ((prev: FechamentoCulto) => FechamentoCulto)
  ) => {
    if (currentUser?.isDemo) {
      showDemoAlert('Esta é uma conta de demonstração. Recursos de edição estão disponíveis apenas na versão completa.');
      return;
    }

    setFechamentoAtual((prev) => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;

      // Atualiza o histórico em memória
      setHistorico((prevHistorico) => {
        const index = prevHistorico.findIndex((f) => f.id === updated.id);
        if (index >= 0) {
          const copy = [...prevHistorico];
          copy[index] = updated;
          return copy;
        }
        return [updated, ...prevHistorico];
      });

      // Salva no Supabase vinculado ao usuário logado
      if (currentUser?.id) {
        setSyncStatus('saving');
        saveFechamento(updated, currentUser.id)
          .then((success) => {
            if (success) {
              setSyncStatus('saved');
              setTimeout(() => setSyncStatus('idle'), 2500);
            } else {
              setSyncStatus('error');
            }
          })
          .catch((err) => {
            console.error('Erro ao sincronizar fechamento:', err);
            setSyncStatus('error');
          });
      }

      return updated;
    });
  };

  const handleSetConfigIgreja = (
    updater: ConfigIgreja | ((prev: ConfigIgreja) => ConfigIgreja)
  ) => {
    if (currentUser?.isDemo) {
      showDemoAlert('Esta é uma conta de demonstração. Recursos de edição estão disponíveis apenas na versão completa.');
      return;
    }

    setConfigIgreja((prev) => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (currentUser?.id) {
        setSyncStatus('saving');
        saveConfiguracaoIgreja(updated, currentUser.id)
          .then((success) => {
            if (success) {
              setSyncStatus('saved');
              setTimeout(() => setSyncStatus('idle'), 2500);
            } else {
              setSyncStatus('error');
            }
          })
          .catch((err) => {
            console.error('Erro ao sincronizar configurações:', err);
            setSyncStatus('error');
          });
      }
      return updated;
    });
  };

  const handleManualSave = async () => {
    if (currentUser?.isDemo) {
      showDemoAlert('Esta é uma conta de demonstração. Recursos de edição estão disponíveis apenas na versão completa.');
      return;
    }

    if (!currentUser?.id) return;
    setSyncStatus('saving');
    try {
      const ok1 = await saveFechamento(fechamentoAtual, currentUser.id);
      const ok2 = await saveConfiguracaoIgreja(configIgreja, currentUser.id);
      if (ok1 && ok2) {
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2500);
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('Erro no salvamento manual:', err);
      setSyncStatus('error');
    }
  };

  /* =========================================================
     AÇÕES DO FECHAMENTO
     ========================================================= */

  const handleNovoFechamento = async () => {
    if (currentUser?.isDemo) {
      showDemoAlert('Esta é uma conta de demonstração. Recursos de edição estão disponíveis apenas na versão completa.');
      return;
    }

    const novo = createEmptyFechamento(configIgreja, currentUser);
    setFechamentoAtual(novo);
    setHistorico((prev) => [novo, ...prev]);
    setActiveTab('fechamento');

    if (currentUser?.id) {
      setSyncStatus('saving');
      const ok = await saveFechamento(novo, currentUser.id);
      if (ok) {
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2500);
      } else {
        setSyncStatus('error');
      }
    }
  };

  const handleSelectFechamento = (fechamento: FechamentoCulto) => {
    setFechamentoAtual(fechamento);
    setActiveTab('fechamento');
  };

  const handleDeleteFechamentoItem = async (id: string) => {
    if (currentUser?.isDemo) {
      showDemoAlert('Esta é uma conta de demonstração. Recursos de edição estão disponíveis apenas na versão completa.');
      return;
    }

    setHistorico((prev) => prev.filter((f) => f.id !== id));
    if (currentUser?.id) {
      await deleteFechamento(id, currentUser.id);
    }

    if (fechamentoAtual.id === id) {
      const remaining = historico.filter((f) => f.id !== id);
      if (remaining.length > 0) {
        setFechamentoAtual(remaining[0]);
      } else {
        const novo = createEmptyFechamento(configIgreja, currentUser);
        setFechamentoAtual(novo);
      }
    }
  };

  const handleResetAllData = async (): Promise<boolean> => {
    if (currentUser?.isDemo) {
      showDemoAlert('Esta é uma conta de demonstração. Recursos de edição estão disponíveis apenas na versão completa.');
      return false;
    }

    if (!currentUser?.id) return false;
    setSyncStatus('saving');
    try {
      const ok = await resetAllUserData(currentUser.id);
      if (ok) {
        const emptyConfig = DEFAULT_CONFIG;
        setConfigIgreja(emptyConfig);
        setHistorico([]);
        const novoVazio = createEmptyFechamento(emptyConfig, currentUser);
        setFechamentoAtual(novoVazio);
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2500);
        return true;
      } else {
        setSyncStatus('error');
        return false;
      }
    } catch (err) {
      console.error('Erro ao resetar dados:', err);
      setSyncStatus('error');
      return false;
    }
  };

  /* Rolar suavemente para o topo ao alternar de aba */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  /* =========================================================
     RENDER
     ========================================================= */

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400">Verificando sessão segura...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthView
        onLoginSuccess={handleLoginSuccess}
        configIgreja={configIgreja}
        globalConfig={globalConfig}
      />
    );
  }

  // BLOQUEIO TOTAL PARA USUÁRIOS NÃO-PRO:
  // Se subscription_status !== 'active', exibe apenas a tela de assinatura e benefícios
  if (!isSubscriptionActive(currentUser)) {
    return (
      <SubscriptionGateView
        currentUser={currentUser}
        onLogout={handleLogout}
        onStatusUpdated={(updated) => {
          setCurrentUser(updated);
          if (isSubscriptionActive(updated)) {
            setIsPaymentSuccessModalOpen(true);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden">
      {/* BARRA OU BANNER DISCRETO DO MODO DEMONSTRAÇÃO */}
      {currentUser?.isDemo && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-3 sm:px-6 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-md sticky top-0 z-50 border-b border-amber-600">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[10px] uppercase font-extrabold tracking-wider shrink-0">
              Modo Demonstração
            </span>
            <span className="text-slate-950 font-semibold text-xs leading-none">
              Você está no Modo Demonstração (Apenas Leitura).
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-slate-900 text-[11px] font-medium">
              Recursos de edição desabilitados
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1 bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <span>Sair da Demo</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>
      )}

      {/* Header Fixo no topo */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fechamentoAtual={fechamentoAtual}
        configIgreja={configIgreja}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        syncStatus={syncStatus}
        onManualSave={handleManualSave}
        onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
      />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Sidebar Lateral */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          qtdLancamentos={fechamentoAtual.lancamentos.length}
          fechamentoAtual={fechamentoAtual}
          currentUser={currentUser}
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        />

        {/* Conteúdo Principal com espaço extra para Bottom Nav e Safe Area */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 min-w-0 transition-all duration-300 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'fechamento' && (
              <FechamentoAtualView
                fechamento={fechamentoAtual}
                setFechamento={handleSetFechamentoAtual}
                onGoToLancamentos={() => setActiveTab('lancamentos')}
                onGoToContagem={() => setActiveTab('contagem')}
                onGoToRelatorioIA={() => setActiveTab('relatorio_ia')}
                onOpenPrintModal={() => setIsPrintModalOpen(true)}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'lancamentos' && (
              <LancamentosView
                fechamento={fechamentoAtual}
                setFechamento={handleSetFechamentoAtual}
                onNavigate={setActiveTab}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'contagem' && (
              <ContagemDinheiroView
                fechamento={fechamentoAtual}
                setFechamento={handleSetFechamentoAtual}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'relatorio_ia' && (
              <RelatorioIAView
                fechamento={fechamentoAtual}
                setFechamento={handleSetFechamentoAtual}
                onNavigate={setActiveTab}
                onOpenPrintModal={() => setIsPrintModalOpen(true)}
                currentUser={currentUser}
                onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
                config={configIgreja}
              />
            )}

            {activeTab === 'historico' && (
              <HistoricoView
                historico={historico}
                onSelectFechamento={handleSelectFechamento}
                onOpenPrintModalFor={(f) => {
                  setFechamentoAtual(f);
                  setIsPrintModalOpen(true);
                }}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'config' && (
              <ConfigView
                config={configIgreja}
                setConfig={handleSetConfigIgreja}
                onNavigate={setActiveTab}
                currentUser={currentUser}
                onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
                onStatusUpdated={(updated) => setCurrentUser(updated)}
                onResetAllData={handleResetAllData}
                onGlobalConfigUpdated={(updatedGlobal) => setGlobalConfig(updatedGlobal)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Barra de Navegação Fixa Inferior Mobile */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        qtdLancamentos={fechamentoAtual.lancamentos.length}
      />

      {/* Modal de Impressão / Recibo */}
      {isPrintModalOpen && (
        <PrintReceiptModal
          fechamento={fechamentoAtual}
          config={configIgreja}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* Modal de Assinatura Mercado Pago */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        currentUser={currentUser}
        onStatusUpdated={(updated) => {
          setCurrentUser(updated);
          if (isSubscriptionActive(updated)) {
            setIsSubscriptionModalOpen(false);
            setIsPaymentSuccessModalOpen(true);
            setActiveTab('fechamento');
          }
        }}
      />

      {/* Modal de Confirmação de Assinatura Ativada / Retorno de Pagamento */}
      {isPaymentSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            <button
              onClick={() => setIsPaymentSuccessModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-amber-400">
                <Crown className="w-8 h-8 fill-current" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Assinatura Confirmada
              </span>
              <h3 className="text-xl font-bold text-slate-100">
                Bem-vindo ao Tesouraria Pro!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Seu plano mensal foi ativado com sucesso pelo Mercado Pago. Todos os recursos de Inteligência Artificial, fechamentos ilimitados e relatórios em PDF estão 100% liberados para a sua igreja.
              </p>
            </div>

            <button
              onClick={() => {
                setIsPaymentSuccessModalOpen(false);
                setActiveTab('fechamento');
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Acessar Recursos Pro Agora</span>
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICAÇÃO TOAST - BLOQUEIO DE ESCRITA NO MODO DEMONSTRAÇÃO */}
      {demoAlertMessage && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md bg-slate-900/95 border border-amber-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 text-xs sm:text-sm">
              <h4 className="font-bold text-amber-300 mb-0.5">Modo Demonstração</h4>
              <p className="text-slate-200 leading-snug">
                {demoAlertMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDemoAlertMessage(null)}
              className="p-1 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              title="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
