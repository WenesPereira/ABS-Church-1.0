import React, { useEffect, useState } from 'react';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FechamentoAtualView } from './components/FechamentoAtualView';
import { LancamentosView } from './components/LancamentosView';
import { ContagemDinheiroView } from './components/ContagemDinheiroView';
import { HistoricoView } from './components/HistoricoView';
import { RelatorioIAView } from './components/RelatorioIAView';
import { ConfigView } from './components/ConfigView';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { AuthView } from './components/AuthView';

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
  syncUserProfile,
} from './services/treasuryService';


export default function App() {

  /* =========================================================
     AUTENTICAÇÃO / SESSÃO DO USUÁRIO
     ========================================================= */

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('church_treasury_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Erro ao carregar sessão do usuário:', e);
      return null;
    }
  });

  const handleLoginSuccess = (user: User, isNewAccount?: boolean, churchName?: string) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('church_treasury_auth_user', JSON.stringify(user));
    } catch (e) {
      console.error('Erro ao salvar sessão de usuário:', e);
    }

    // Sincroniza o perfil do usuário no Supabase
    syncUserProfile(user);

    if (churchName && churchName.trim()) {
      setConfigIgreja((prev) => ({
        ...prev,
        nomeIgreja: churchName.trim(),
        tesoureiroPadrao: user.nome || prev.tesoureiroPadrao,
      }));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('church_treasury_auth_user');
    } catch (e) {
      console.error('Erro ao remover sessão de usuário:', e);
    }
  };

  const [activeTab, setActiveTab] =
    useState<ActiveTab>('fechamento');


  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */

  const [configIgreja, setConfigIgreja] =
    useState<ConfigIgreja>(() => {

      try {

        const saved =
          localStorage.getItem(
            'church_treasury_config'
          );

        return saved
          ? JSON.parse(saved)
          : INITIAL_CONFIG;

      } catch (error) {

        console.error(
          'Erro ao carregar configuração:',
          error
        );

        return INITIAL_CONFIG;
      }
    });


  /* =========================================================
     HISTÓRICO
     ========================================================= */

  const [historico, setHistorico] =
    useState<FechamentoCulto[]>(() => {

      try {

        const saved =
          localStorage.getItem(
            'church_treasury_historico'
          );

        return saved
          ? JSON.parse(saved)
          : INITIAL_FECHAMENTOS;

      } catch (error) {

        console.error(
          'Erro ao carregar histórico:',
          error
        );

        return INITIAL_FECHAMENTOS;
      }
    });


  /* =========================================================
     FECHAMENTO ATUAL
     ========================================================= */

  const [fechamentoAtual, setFechamentoAtual] =
    useState<FechamentoCulto>(() => {

      const todayStr =
        new Date()
          .toISOString()
          .split('T')[0];

      const monthStartStr =
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        )
          .toISOString()
          .split('T')[0];


      try {

        const saved =
          localStorage.getItem(
            'church_treasury_active_culto'
          );


        if (saved) {

          const parsed =
            JSON.parse(saved);

          return {
            ...parsed,

            dataInicio:
              parsed.dataInicio ||
              monthStartStr,

            dataFim:
              parsed.dataFim ||
              parsed.data ||
              todayStr,
          };
        }

      } catch (error) {

        console.error(
          'Erro ao carregar fechamento atual:',
          error
        );
      }


      /* =====================================================
         MOCK INICIAL
         ===================================================== */

      const firstMock =
        INITIAL_FECHAMENTOS[0];


      if (firstMock) {

        return {
          ...firstMock,

          dataInicio:
            firstMock.dataInicio ||
            '2026-08-01',

          dataFim:
            firstMock.dataFim ||
            firstMock.data ||
            todayStr,
        };
      }


      /* =====================================================
         NOVO FECHAMENTO
         ===================================================== */

      return {

        id:
          'culto-' +
          Date.now(),

        nomeIgreja:
          configIgreja.nomeIgreja,

        data:
          todayStr,

        dataInicio:
          monthStartStr,

        dataFim:
          todayStr,

        hora:
          '19:00',

        tipoCulto:
          'Fechamento de Caixa por Período',

        pastorPresidente:
          configIgreja.pastorPresidente ||
          'Pastor Presidente',

        tesoureiro:
          configIgreja.tesoureiroPadrao ||
          'Tesoureiro Responsável',

        pastorLocal:
          configIgreja.pastorLocal ||
          'Pastor Local',

        porcentagemMatriz:
          configIgreja.porcentagemMatriz ||
          20,

        aplicarRepasseMatriz:
          configIgreja.aplicarRepasseMatriz ??
          true,

        tipoBaseRepasseMatriz:
          configIgreja.tipoBaseRepasseMatriz ||
          'todas',

        categoriasRepasseMatriz:
          configIgreja.categoriasRepasseMatriz,

        status:
          'aberto',

        criadoEm:
          new Date().toISOString(),

        lancamentos: [],

        contagemDinheiro: {

          c200: 0,
          c100: 0,
          c50: 0,
          c20: 0,
          c10: 0,
          c5: 0,
          c2: 0,

          m100: 0,
          m050: 0,
          m025: 0,
          m010: 0,
          m005: 0,
        },
      };
    });


  /* =========================================================
     MODAL DE IMPRESSÃO
     ========================================================= */

  const [printableCulto, setPrintableCulto] =
    useState<FechamentoCulto | null>(null);


  /* =========================================================
     SINCRONIZAÇÃO INICIAL DE DADOS COM SUPABASE
     ========================================================= */

  useEffect(() => {
    let isMounted = true;

    async function loadSupabaseData() {
      // Carrega configuração
      const configRes = await fetchConfiguracaoIgreja();
      if (isMounted && configRes.data) {
        setConfigIgreja(configRes.data);
      }

      // Carrega histórico de fechamentos e lançamentos
      const fechamentosRes = await fetchFechamentos();
      if (isMounted && fechamentosRes.data && fechamentosRes.data.length > 0) {
        setHistorico(fechamentosRes.data);
      }
    }

    loadSupabaseData();

    return () => {
      isMounted = false;
    };
  }, []);

  /* =========================================================
     SALVAR CONFIGURAÇÃO
     ========================================================= */

  useEffect(() => {
    try {
      localStorage.setItem('church_treasury_config', JSON.stringify(configIgreja));
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
    }

    // Salva no Supabase
    saveConfiguracaoIgreja(configIgreja);
  }, [configIgreja]);


  /* =========================================================
     SALVAR HISTÓRICO
     ========================================================= */

  useEffect(() => {
    try {
      localStorage.setItem('church_treasury_historico', JSON.stringify(historico));
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  }, [historico]);


  /* =========================================================
     SALVAR FECHAMENTO ATUAL
     ========================================================= */

  useEffect(() => {
    try {
      localStorage.setItem('church_treasury_active_culto', JSON.stringify(fechamentoAtual));
    } catch (error) {
      console.error('Erro ao salvar fechamento atual:', error);
    }

    // Salva/Sincroniza fechamento no Supabase
    saveFechamento(fechamentoAtual, currentUser?.id);

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
     FUNÇÃO PARA VOLTAR AO TOPO
     ========================================================= */

  const voltarAoTopo = () => {

    /*
     * Agora quem rola é o documento.
     *
     * Não usamos mais:
     * #treasury-content-viewport.scrollTo()
     */

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };


  /* =========================================================
     NOVO FECHAMENTO
     ========================================================= */

  const handleNovoFechamento = () => {

    if (
      fechamentoAtual.status === 'aberto' &&
      fechamentoAtual.lancamentos.length > 0
    ) {

      const confirmar =
        window.confirm(
          'O caixa atual ainda está em aberto. Deseja iniciar o fechamento de um novo culto?'
        );

      if (!confirmar) {
        return;
      }
    }


    const todayStr =
      new Date()
        .toISOString()
        .split('T')[0];


    const monthStartStr =
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
        .toISOString()
        .split('T')[0];


    const newCulto: FechamentoCulto = {

      id:
        'culto-' +
        Date.now(),

      nomeIgreja:
        configIgreja.nomeIgreja,

      data:
        todayStr,

      dataInicio:
        monthStartStr,

      dataFim:
        todayStr,

      hora:
        '19:00',

      tipoCulto:
        'Fechamento de Caixa por Período',

      pastorPresidente:
        configIgreja.pastorPresidente ||
        'Pastor Presidente',

      tesoureiro:
        configIgreja.tesoureiroPadrao ||
        'Tesoureiro Responsável',

      pastorLocal:
        configIgreja.pastorLocal ||
        'Pastor Local',

      porcentagemMatriz:
        configIgreja.porcentagemMatriz ||
        20,

      aplicarRepasseMatriz:
        configIgreja.aplicarRepasseMatriz ??
        true,

      tipoBaseRepasseMatriz:
        configIgreja.tipoBaseRepasseMatriz ||
        'todas',

      categoriasRepasseMatriz:
        configIgreja.categoriasRepasseMatriz,

      status:
        'aberto',

      criadoEm:
        new Date().toISOString(),

      lancamentos: [],

      contagemDinheiro: {

        c200: 0,
        c100: 0,
        c50: 0,
        c20: 0,
        c10: 0,
        c5: 0,
        c2: 0,

        m100: 0,
        m050: 0,
        m025: 0,
        m010: 0,
        m005: 0,
      },
    };


    setFechamentoAtual(newCulto);

    setActiveTab('fechamento');

    voltarAoTopo();
  };


  /* =========================================================
     SELECIONAR HISTÓRICO
     ========================================================= */

  const handleSelectFechamento = (
    fechamento: FechamentoCulto
  ) => {

    setFechamentoAtual(
      fechamento
    );

    setActiveTab(
      'fechamento'
    );

    voltarAoTopo();
  };


  /* =========================================================
     ABRIR IMPRESSÃO
     ========================================================= */

  const handleOpenPrintModalFor = (
    fechamento: FechamentoCulto
  ) => {

    setPrintableCulto(
      fechamento
    );
  };


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

    <div className="treasury-app">

      {/* ===================================================
          HEADER
          =================================================== */}

      <div className="flex-none">

        <Header

          activeTab={
            activeTab
          }

          setActiveTab={
            setActiveTab
          }

          fechamentoAtual={
            fechamentoAtual
          }

          configIgreja={
            configIgreja
          }

          currentUser={
            currentUser
          }

          onLogout={
            handleLogout
          }

          onNovoFechamento={
            handleNovoFechamento
          }

          onOpenPrintModal={() =>
            setPrintableCulto(
              fechamentoAtual
            )
          }
        />

      </div>


      {/* ===================================================
          ÁREA PRINCIPAL
          =================================================== */}

      <div className="treasury-main">

        {/* =================================================
            SIDEBAR / MENU
            ================================================= */}

        <Sidebar

          activeTab={
            activeTab
          }

          setActiveTab={
            setActiveTab
          }

          qtdLancamentos={
            fechamentoAtual
              .lancamentos.length
          }
        />


        {/* =================================================
            CONTEÚDO
            ================================================= */}

        <main className="w-full min-w-0 bg-slate-950">

          {activeTab === 'fechamento' && (

            <FechamentoAtualView

              fechamento={
                fechamentoAtual
              }

              setFechamento={
                setFechamentoAtual
              }

              onGoToLancamentos={() =>
                setActiveTab(
                  'lancamentos'
                )
              }

              onGoToContagem={() =>
                setActiveTab(
                  'contagem'
                )
              }

              onGoToRelatorioIA={() =>
                setActiveTab(
                  'relatorio_ia'
                )
              }

              onOpenPrintModal={() =>
                setPrintableCulto(
                  fechamentoAtual
                )
              }
            />

          )}


          {activeTab === 'lancamentos' && (

            <LancamentosView

              fechamento={
                fechamentoAtual
              }

              setFechamento={
                setFechamentoAtual
              }

            />

          )}


          {activeTab === 'contagem' && (

            <ContagemDinheiroView

              fechamento={
                fechamentoAtual
              }

              setFechamento={
                setFechamentoAtual
              }

            />

          )}


          {activeTab === 'historico' && (

            <HistoricoView

              historico={
                historico
              }

              onSelectFechamento={
                handleSelectFechamento
              }

              onOpenPrintModalFor={
                handleOpenPrintModalFor
              }

            />

          )}


          {activeTab === 'relatorio_ia' && (

            <RelatorioIAView

              fechamento={
                fechamentoAtual
              }

              setFechamento={
                setFechamentoAtual
              }

            />

          )}


          {activeTab === 'config' && (

            <ConfigView

              config={
                configIgreja
              }

              setConfig={
                setConfigIgreja
              }

            />

          )}

        </main>

      </div>


      {/* ===================================================
          MODAL DE IMPRESSÃO
          =================================================== */}

      {printableCulto && (

        <PrintReceiptModal

          fechamento={
            printableCulto
          }

          config={
            configIgreja
          }

          onClose={() =>
            setPrintableCulto(null)
          }

        />

      )}

    </div>
  );
}