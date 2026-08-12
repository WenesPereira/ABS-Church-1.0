import React, { useState, useEffect } from 'react';
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
import { INITIAL_CONFIG, INITIAL_FECHAMENTOS } from './data/mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('fechamento');

  // Persistence: Config
  const [configIgreja, setConfigIgreja] = useState<ConfigIgreja>(() => {
    const saved = localStorage.getItem('church_treasury_config');
    return saved ? JSON.parse(saved) : INITIAL_CONFIG;
  });

  // Persistence: Historico
  const [historico, setHistorico] = useState<FechamentoCulto[]>(() => {
    const saved = localStorage.getItem('church_treasury_historico');
    return saved ? JSON.parse(saved) : INITIAL_FECHAMENTOS;
  });

  // Active Cult Fechamento
  const [fechamentoAtual, setFechamentoAtual] = useState<FechamentoCulto>(() => {
    const saved = localStorage.getItem('church_treasury_active_culto');
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        dataInicio: parsed.dataInicio || monthStartStr,
        dataFim: parsed.dataFim || parsed.data || todayStr,
      };
    }

    const firstMock = INITIAL_FECHAMENTOS[0];
    if (firstMock) {
      return {
        ...firstMock,
        dataInicio: firstMock.dataInicio || '2026-08-01',
        dataFim: firstMock.dataFim || firstMock.data || todayStr,
      };
    }

    return {
      id: 'culto-' + Date.now(),
      nomeIgreja: configIgreja.nomeIgreja,
      data: todayStr,
      dataInicio: monthStartStr,
      dataFim: todayStr,
      hora: '19:00',
      tipoCulto: 'Fechamento de Caixa por Período',
      pastorPresidente: configIgreja.pastorPresidente || 'Pastor Presidente',
      tesoureiro: configIgreja.tesoureiroPadrao || 'Tesoureiro Responsável',
      pastorLocal: configIgreja.pastorLocal || 'Pastor Local',
      porcentagemMatriz: configIgreja.porcentagemMatriz || 20,
      status: 'aberto',
      criadoEm: new Date().toISOString(),
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

  // Print Modal state
  const [printableCulto, setPrintableCulto] = useState<FechamentoCulto | null>(null);

  // Sync LocalStorage
  useEffect(() => {
    localStorage.setItem('church_treasury_config', JSON.stringify(configIgreja));
  }, [configIgreja]);

  useEffect(() => {
    localStorage.setItem('church_treasury_historico', JSON.stringify(historico));
  }, [historico]);

  useEffect(() => {
    localStorage.setItem('church_treasury_active_culto', JSON.stringify(fechamentoAtual));

    // Update or sync with history list
    setHistorico((prev) => {
      const idx = prev.findIndex((f) => f.id === fechamentoAtual.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = fechamentoAtual;
        return updated;
      } else {
        return [fechamentoAtual, ...prev];
      }
    });
  }, [fechamentoAtual]);

  const handleNovoFechamento = () => {
    if (
      fechamentoAtual.status === 'aberto' &&
      fechamentoAtual.lancamentos.length > 0
    ) {
      if (
        !confirm(
          'O caixa atual ainda está em aberto. Deseja iniciar o fechamento de um novo culto?'
        )
      ) {
        return;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const newCulto: FechamentoCulto = {
      id: 'culto-' + Date.now(),
      nomeIgreja: configIgreja.nomeIgreja,
      data: todayStr,
      dataInicio: monthStartStr,
      dataFim: todayStr,
      hora: '19:00',
      tipoCulto: 'Fechamento de Caixa por Período',
      pastorPresidente: configIgreja.pastorPresidente || 'Pastor Presidente',
      tesoureiro: configIgreja.tesoureiroPadrao || 'Tesoureiro Responsável',
      pastorLocal: configIgreja.pastorLocal || 'Pastor Local',
      porcentagemMatriz: configIgreja.porcentagemMatriz || 20,
      aplicarRepasseMatriz: configIgreja.aplicarRepasseMatriz ?? true,
      tipoBaseRepasseMatriz: configIgreja.tipoBaseRepasseMatriz || 'todas',
      categoriasRepasseMatriz: configIgreja.categoriasRepasseMatriz,
      status: 'aberto',
      criadoEm: new Date().toISOString(),
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
  };

  const handleSelectFechamento = (f: FechamentoCulto) => {
    setFechamentoAtual(f);
    setActiveTab('fechamento');
  };

  const handleOpenPrintModalFor = (f: FechamentoCulto) => {
    setPrintableCulto(f);
  };

  return (
    <div
      id="treasury-content-viewport"
      style={{
        height: '100dvh',
        width: '100vw',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain',
        touchAction: 'pan-y',
        position: 'relative',
      }}
      className="flex flex-col bg-slate-950 font-sans text-slate-100"
    >
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fechamentoAtual={fechamentoAtual}
        configIgreja={configIgreja}
        onNovoFechamento={handleNovoFechamento}
        onOpenPrintModal={() => setPrintableCulto(fechamentoAtual)}
      />

      <div className="flex flex-col lg:flex-row flex-1 relative min-h-full">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          qtdLancamentos={fechamentoAtual.lancamentos.length}
        />

        <main className="flex-1 w-full bg-slate-950 min-h-full">
          {activeTab === 'fechamento' && (
            <FechamentoAtualView
              fechamento={fechamentoAtual}
              setFechamento={setFechamentoAtual}
              onGoToLancamentos={() => setActiveTab('lancamentos')}
              onGoToContagem={() => setActiveTab('contagem')}
              onGoToRelatorioIA={() => setActiveTab('relatorio_ia')}
              onOpenPrintModal={() => setPrintableCulto(fechamentoAtual)}
            />
          )}

          {activeTab === 'lancamentos' && (
            <LancamentosView
              fechamento={fechamentoAtual}
              setFechamento={setFechamentoAtual}
            />
          )}

          {activeTab === 'contagem' && (
            <ContagemDinheiroView
              fechamento={fechamentoAtual}
              setFechamento={setFechamentoAtual}
            />
          )}

          {activeTab === 'historico' && (
            <HistoricoView
              historico={historico}
              onSelectFechamento={handleSelectFechamento}
              onOpenPrintModalFor={handleOpenPrintModalFor}
            />
          )}

          {activeTab === 'relatorio_ia' && (
            <RelatorioIAView
              fechamento={fechamentoAtual}
              setFechamento={setFechamentoAtual}
            />
          )}

          {activeTab === 'config' && (
            <ConfigView config={configIgreja} setConfig={setConfigIgreja} />
          )}
        </main>
      </div>

      {printableCulto && (
        <PrintReceiptModal
          fechamento={printableCulto}
          config={configIgreja}
          onClose={() => setPrintableCulto(null)}
        />
      )}
    </div>
  );
}
