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
  syncUserProfile,
  fetchUserProfile,
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

  // Supabase Cloud Sync State
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  /* =========================================================
     FUNÇÃO DE CARREGAMENTO DIRETO DO SUPABASE
     ========================================================= */

  const loadUserDataFromSupabase = useCallback(async (userId: string, userObj?: User | null) => {
    try {
      // Garante a sessão ativa do usuário antes de realizar consultas
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Erro Supabase ao validar sessão do usuário:', authError);
      }

      const effectiveUserId = authUser?.id || userId;
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
        const u: User = {
          id: session.user.id,
          email: session.user.email || '',
          nome: profile?.nome || meta.nome || 'Tesoureiro',
          cargo: profile?.cargo || meta.cargo || 'Tesoureiro Principal',
          nomeIgreja: profile?.nomeIgreja || meta.nome_igreja || 'Minha Igreja',
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

      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const meta = session.user.user_metadata || {};
        const u: User = {
          id: session.user.id,
          email: session.user.email || '',
          nome: profile?.nome || meta.nome || 'Tesoureiro',
          cargo: profile?.cargo || meta.cargo || 'Tesoureiro Principal',
          nomeIgreja: profile?.nomeIgreja || meta.nome_igreja || 'Minha Igreja',
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
    // Limpa estado anterior antes de popular novo usuário
    setHistorico([]);
    setCurrentUser(user);

    // Sincroniza o perfil do usuário no Supabase
    await syncUserProfile(user);

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
    await loadUserDataFromSupabase(user.id, user);
  };

  const handleLogout = async () => {
    // 1. Limpa todos os estados locais do React imediatamente
    setCurrentUser(null);
    setHistorico([]);
    setConfigIgreja(DEFAULT_CONFIG);
    setFechamentoAtual(createEmptyFechamento(DEFAULT_CONFIG, null));
    setActiveTab('fechamento');

    // 2. Encerra a sessão no Supabase Auth
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
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden">
      {/* Header Fixo no topo */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fechamentoAtual={fechamentoAtual}
        configIgreja={configIgreja}
        onNovoFechamento={handleNovoFechamento}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        syncStatus={syncStatus}
        onManualSave={handleManualSave}
      />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Sidebar Lateral */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          qtdLancamentos={fechamentoAtual.lancamentos.length}
          fechamentoAtual={fechamentoAtual}
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
              />
            )}

            {activeTab === 'lancamentos' && (
              <LancamentosView
                fechamento={fechamentoAtual}
                setFechamento={handleSetFechamentoAtual}
                onNavigate={setActiveTab}
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
    </div>
  );
}
