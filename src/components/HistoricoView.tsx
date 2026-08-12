import React, { useState } from 'react';
import {
  History,
  Calendar,
  Church,
  Search,
  Printer,
  Download,
  FileCheck,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { FechamentoCulto } from '../types';
import { formatCurrency, calcularResumoLancamentos } from '../utils/calculations';

interface HistoricoViewProps {
  historico: FechamentoCulto[];
  onSelectFechamento: (f: FechamentoCulto) => void;
  onOpenPrintModalFor: (f: FechamentoCulto) => void;
}

export const HistoricoView: React.FC<HistoricoViewProps> = ({
  historico,
  onSelectFechamento,
  onOpenPrintModalFor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistorico = historico.filter((f) => {
    const term = searchTerm.toLowerCase();
    return (
      f.tipoCulto.toLowerCase().includes(term) ||
      (f.pregador && f.pregador.toLowerCase().includes(term)) ||
      f.data.includes(term) ||
      f.tesoureiro.toLowerCase().includes(term)
    );
  });

  // Calculate Chart Data for last cults
  const chartData = historico.slice(0, 10).reverse().map((f) => {
    const resumo = calcularResumoLancamentos(
      f.lancamentos,
      f.porcentagemMatriz ?? 20,
      f.aplicarRepasseMatriz ?? true,
      f.tipoBaseRepasseMatriz || 'todas',
      f.categoriasRepasseMatriz
    );
    const dataFormatted = f.data ? new Date(f.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
    return {
      name: `Caixa ${dataFormatted}`,
      Dízimos: resumo.totalDizimos,
      Ofertas: resumo.totalOfertasCulto + resumo.totalOfertasMissoes,
      Despesas: resumo.totalSaidas,
      Saldo: resumo.saldoLiquido,
    };
  });

  return (
    <div id="historico-view-container" className="flex flex-col min-h-full bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Histórico de Fechamentos de Caixa</h2>
            <p className="text-xs text-slate-400">
              Arquivo de cultos anteriores, atas da tesouraria e comparativo de arrecadação.
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por data, tesoureiro, caixa..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Chart Section */}
      {chartData.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl max-w-6xl mx-auto w-full space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">Comparativo dos Últimos Cultos (Dízimos vs Ofertas vs Despesas)</h3>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                  formatter={(value: any) => [formatCurrency(Number(value)), '']}
                />
                <Bar dataKey="Dízimos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ofertas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Cults Archive List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl max-w-6xl mx-auto w-full space-y-4">
        <h3 className="text-sm font-bold text-slate-100">Cultos Arquivados na Tesouraria ({filteredHistorico.length})</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHistorico.map((culto) => {
            const resumo = calcularResumoLancamentos(
              culto.lancamentos,
              culto.porcentagemMatriz ?? 20,
              culto.aplicarRepasseMatriz ?? true,
              culto.tipoBaseRepasseMatriz || 'todas',
              culto.categoriasRepasseMatriz
            );
            return (
              <div
                key={culto.id}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">Fechamento de Caixa</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        culto.status === 'fechado'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {culto.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Período:{' '}
                      <strong className="text-slate-200">
                        {culto.dataInicio ? new Date(culto.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : new Date((culto.data || '') + 'T00:00:00').toLocaleDateString('pt-BR')}
                        {' a '}
                        {culto.dataFim ? new Date(culto.dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : new Date((culto.data || '') + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </strong>
                    </p>
                  </div>

                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md font-bold font-mono border border-purple-500/30">
                    Matriz ({resumo.porcentagemMatriz}%): {formatCurrency(resumo.valorMatriz)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800 text-center font-mono text-xs">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block font-semibold">Dízimos</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(resumo.totalDizimos)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block font-semibold">Ofertas</span>
                    <span className="font-bold text-blue-400">{formatCurrency(resumo.totalOfertasCulto + resumo.totalOfertasMissoes)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block font-semibold">Saldo Culto</span>
                    <span className="font-bold text-amber-300">{formatCurrency(resumo.saldoLiquido)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px]">Tesoureiro: <strong className="text-slate-300">{culto.tesoureiro}</strong></span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenPrintModalFor(culto)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                      title="Baixar PDF ou Imprimir comprovante deste culto"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                    </button>

                    <button
                      onClick={() => onSelectFechamento(culto)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Abrir Caixa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
