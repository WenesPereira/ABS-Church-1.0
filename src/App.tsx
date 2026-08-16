import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  FechamentoCulto,
  ConfigIgreja,
  User,
} from './types';

import {
  INITIAL_CONFIG,
  INITIAL_FECHAMENTOS,
} from './data/mockData';

import {
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

function createNewFechamento(config: ConfigIgreja): FechamentoCulto {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: `culto-${Date.now()}`,
    nomeIgreja: config.nomeIgreja,
    data: today,
    hora: '19:00',
    tipoCulto: 'Fechamento de Caixa',
    tesoureiro: config.tesoureiroPadrao,
    segundaTestemunha: config.segundoTesoureiroPadrao,
    porcentagemMatriz: config.porcentagemMatriz ?? 20,
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
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('church_treasury_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('fechamento');

  // Automatic scroll to top when changing active tab
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // Config State
  const [configIgreja, setConfigIgreja] = useState<ConfigIgreja>(() => {
    try {
      const saved = localStorage.getItem('church_treasury_config');
      return saved ? JSON.parse(saved) : INITIAL_CONFIG;
    } catch {
      return INITIAL_CONFIG;
    }
  });

  // History State
  const [historico, setHistorico] = useState<FechamentoCulto[]>(() => {
    try {
      const saved = localStorage.getItem('church_treasury_historico');
      return saved ? JSON.parse(saved) : INITIAL_FECHAMENTOS;
    } catch {
      return INITIAL_FECHAMENTOS;
    }
  });

  // Active Closing State
  const [fechamentoAtual, setFechamentoAtual] = useState<FechamentoCulto>(() => {
    try {
      const saved = localStorage.getItem('church_treasury_active_culto');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_FECHAMENTOS[0] || createNewFechamento(configIgreja);
  });

  // Modal Print State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  /* =========================================================
     AUTH HANDLERS
     ========================================================= */

  const handleLoginSuccess = (
    user: User,
    _isNewAccount?: boolean,
    churchName?: string
  ) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('church_treasury_user', JSON.stringify(user));
    } catch (e) {
      console.error('Erro ao salvar sessão de usuário:', e);
    }

    // Sincroniza o perfil do usuário no Supabase
    syncUserProfile(user);

    if (churchName && churchName.trim()) {
      setConfigIgreja((prev) => ({
        ...prev,
        nomeIgreja: churchName.trim(),
      }));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('church_treasury_user');
    } catch (e) {
      console.error('Erro ao encerrar sessão:', e);
    }
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch((err) => console.warn('Erro ao sair do Supabase Auth:', err));
    }
  };

  /* =========================================================
     SUPABASE AUTH SESSION INITIALIZATION & LISTENER
     ========================================================= */

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Monitora sessão ativa do Supabase Auth
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const meta = session.user.user_metadata || {};
        const u: User = {
          id: session.user.id,
          email: session.user.email || '',
          nome: profile?.nome || meta.nome || 'Tesoureiro',
          cargo: profile?.cargo || meta.cargo || 'Tesoureiro Principal',
          nomeIgreja: profile?.nomeIgreja || meta.nome_igreja || configIgreja.nomeIgreja,
          createdAt: session.user.created_at || new Date().toISOString(),
        };
        setCurrentUser(u);
        localStorage.setItem('church_treasury_user', JSON.stringify(u));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const meta = session.user.user_metadata || {};
        const u: User = {
          id: session.user.id,
          email: session.user.email || '',
          nome: profile?.nome || meta.nome || 'Tesoureiro',
          cargo: profile?.cargo || meta.cargo || 'Tesoureiro Principal',
          nomeIgreja: profile?.nomeIgreja || meta.nome_igreja || configIgreja.nomeIgreja,
          createdAt: session.user.created_at || new Date().toISOString(),
        };
        setCurrentUser(u);
        localStorage.setItem('church_treasury_user', JSON.stringify(u));
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        localStorage.removeItem('church_treasury_user');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [isSupabaseConfigured]);

  /* =========================================================
     SINCRONIZAÇÃO INICIAL DE DADOS COM SUPABASE
     ========================================================= */

  useEffect(() => {
    let isMounted = true;

    async function loadSupabaseData() {
      const uid = currentUser?.id;
      const configRes = await fetchConfiguracaoIgreja(uid);
      if (isMounted && configRes.data) {
        setConfigIgreja(configRes.data);
      }

      const fechamentosRes = await fetchFechamentos(uid);
      if (isMounted && fechamentosRes.data && fechamentosRes.data.length > 0) {
        setHistorico(fechamentosRes.data);
        if (fechamentosRes.data[0]) {
          setFechamentoAtual(fechamentosRes.data[0]);
        }
      }
    }

    loadSupabaseData();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  /* =========================================================
     PERSISTÊNCIA DA CONFIGURAÇÃO
     ========================================================= */

  useEffect(() => {
    try {
      localStorage.setItem('church_treasury_config', JSON.stringify(configIgreja));
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
    }

    // Salva no Supabase vinculado ao usuário logado
    if (currentUser?.id) {
      saveConfiguracaoIgreja(configIgreja, currentUser.id);
    }
  }, [configIgreja, currentUser?.id]);

  /* =========================================================
     PERSISTÊNCIA DO HISTÓRICO
     ========================================================= */

  useEffect(() => {
    try {
      localStorage.setItem('church_treasury_historico', JSON.stringify(historico));
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  }, [historico]);

  /* =========================================================
     PERSISTÊNCIA E SINCRONIZAÇÃO DO FECHAMENTO ATUAL
     ========================================================= */

  useEffect(() => {
    try {
      localStorage.setItem('church_treasury_active_culto', JSON.stringify(fechamentoAtual));
    } catch (error) {
      console.error('Erro ao salvar fechamento atual:', error);
    }

    // Salva/Sincroniza fechamento no Supabase vinculado ao usuário logado
    if (currentUser?.id) {
      saveFechamento(fechamentoAtual, currentUser.id);
    }

    setHistorico((prev) => {
      const index = prev.findIndex((f) => f.id === fechamentoAtual.id);

      if (index >= 0) {
        const updated = [...prev];
        updated[index] = fechamentoAtual;
        return updated;
      }

      return [fechamentoAtual, ...prev];
    });
  }, [fechamentoAtual, currentUser?.id]);

  /* =========================================================
     AÇÕES DO FECHAMENTO
     ========================================================= */

  const handleNovoFechamento = () => {
    const novo = createNewFechamento(configIgreja);
    setFechamentoAtual(novo);
    setActiveTab('fechamento');
  };

  const handleSelectFechamento = (fechamento: FechamentoCulto) => {
    setFechamentoAtual(fechamento);
    setActiveTab('fechamento');
  };

  const handleDeleteFechamentoItem = async (id: string) => {
    setHistorico((prev) => prev.filter((f) => f.id !== id));
    deleteFechamento(id, currentUser?.id);

    if (fechamentoAtual.id === id) {
      const remaining = historico.filter((f) => f.id !== id);
      if (remaining.length > 0) {
        setFechamentoAtual(remaining[0]);
      } else {
        setFechamentoAtual(createNewFechamento(configIgreja));
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
                setFechamento={setFechamentoAtual}
                onGoToLancamentos={() => setActiveTab('lancamentos')}
                onGoToContagem={() => setActiveTab('contagem')}
                onGoToRelatorioIA={() => setActiveTab('relatorio_ia')}
                onOpenPrintModal={() => setIsPrintModalOpen(true)}
              />
            )}

            {activeTab === 'lancamentos' && (
              <LancamentosView
                fechamento={fechamentoAtual}
                setFechamento={setFechamentoAtual}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'contagem' && (
              <ContagemDinheiroView
                fechamento={fechamentoAtual}
                setFechamento={setFechamentoAtual}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'relatorio_ia' && (
              <RelatorioIAView
                fechamento={fechamentoAtual}
                setFechamento={setFechamentoAtual}
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
                setConfig={setConfigIgreja}
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
