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

import {
  ActiveTab,
  FechamentoCulto,
  ConfigIgreja,
} from './types';

import {
  INITIAL_CONFIG,
  INITIAL_FECHAMENTOS,
} from './data/mockData';


export default function App() {

  // =========================================================
  // ABA ATIVA
  // =========================================================

  const [activeTab, setActiveTab] =
    useState<ActiveTab>('fechamento');


  // =========================================================
  // CONFIGURAÇÃO DA IGREJA
  // =========================================================

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


  // =========================================================
  // HISTÓRICO
  // =========================================================

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


  // =========================================================
  // FECHAMENTO ATUAL
  // =========================================================

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


      // =====================================================
      // MOCK INICIAL
      // =====================================================

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


      // =====================================================
      // NOVO FECHAMENTO
      // =====================================================

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

        lancamentos:
          [],

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


  // =========================================================
  // MODAL DE IMPRESSÃO
  // =========================================================

  const [printableCulto, setPrintableCulto] =
    useState<FechamentoCulto | null>(null);


  // =========================================================
  // SALVAR CONFIGURAÇÃO
  // =========================================================

  useEffect(() => {

    try {

      localStorage.setItem(
        'church_treasury_config',
        JSON.stringify(configIgreja)
      );

    } catch (error) {

      console.error(
        'Erro ao salvar configuração:',
        error
      );
    }

  }, [configIgreja]);


  // =========================================================
  // SALVAR HISTÓRICO
  // =========================================================

  useEffect(() => {

    try {

      localStorage.setItem(
        'church_treasury_historico',
        JSON.stringify(historico)
      );

    } catch (error) {

      console.error(
        'Erro ao salvar histórico:',
        error
      );
    }

  }, [historico]);


  // =========================================================
  // SALVAR FECHAMENTO ATUAL
  // =========================================================

  useEffect(() => {

    try {

      localStorage.setItem(
        'church_treasury_active_culto',
        JSON.stringify(fechamentoAtual)
      );

    } catch (error) {

      console.error(
        'Erro ao salvar fechamento atual:',
        error
      );
    }


    // Atualiza o fechamento no histórico

    setHistorico((prev) => {

      const index =
        prev.findIndex(
          (f) =>
            f.id ===
            fechamentoAtual.id
        );


      if (index >= 0) {

        const updated =
          [...prev];

        updated[index] =
          fechamentoAtual;

        return updated;
      }


      return [
        fechamentoAtual,
        ...prev,
      ];
    });

  }, [fechamentoAtual]);


  // =========================================================
  // NOVO FECHAMENTO
  // =========================================================

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

      lancamentos:
        [],

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


    setFechamentoAtual(
      newCulto
    );

    setActiveTab(
      'fechamento'
    );


    // Volta ao topo usando a rolagem
    // NORMAL do navegador.

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };


  // =========================================================
  // SELECIONAR FECHAMENTO
  // =========================================================

  const handleSelectFechamento = (
    fechamento: FechamentoCulto
  ) => {

    setFechamentoAtual(
      fechamento
    );

    setActiveTab(
      'fechamento'
    );


    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };


  // =========================================================
  // ABRIR IMPRESSÃO
  // =========================================================

  const handleOpenPrintModalFor = (
    fechamento: FechamentoCulto
  ) => {

    setPrintableCulto(
      fechamento
    );
  };


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div
      className="
        treasury-app
        min-h-screen
        w-full
        bg-slate-950
        font-sans
        text-slate-100
      "
    >

      {/* =====================================================
          CABEÇALHO
          ===================================================== */}

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

        onNovoFechamento={
          handleNovoFechamento
        }

        onOpenPrintModal={() =>
          setPrintableCulto(
            fechamentoAtual
          )
        }

      />


      {/* =====================================================
          ÁREA PRINCIPAL
          ===================================================== */}

      <div
        className="
          w-full
          flex
          flex-col
          lg:flex-row
          items-stretch
        "
      >

        {/* ===================================================
            SIDEBAR
            =================================================== */}

        <Sidebar

          activeTab={
            activeTab
          }

          setActiveTab={
            setActiveTab
          }

          qtdLancamentos={
            fechamentoAtual.lancamentos.length
          }

        />


        {/* ===================================================
            CONTEÚDO
            =================================================== */}

        <main
          className="
            w-full
            min-w-0
            flex-1
            bg-slate-950
          "
        >

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


      {/* =====================================================
          MODAL DE IMPRESSÃO
          ===================================================== */}

      {printableCulto && (

        <PrintReceiptModal

          fechamento={
            printableCulto
          }

          config={
            configIgreja
          }

          onClose={() =>
            setPrintableCulto(
              null
            )
          }

        />
      )}

    </div>
  );
}