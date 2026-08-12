import React from 'react';
import { Coins, CheckCircle, AlertCircle, RefreshCw, DollarSign, Calculator } from 'lucide-react';
import { FechamentoCulto, ContagemDinheiro } from '../types';
import { formatCurrency, calcularTotalContagem, calcularResumoLancamentos } from '../utils/calculations';

interface ContagemDinheiroViewProps {
  fechamento: FechamentoCulto;
  setFechamento: React.Dispatch<React.SetStateAction<FechamentoCulto>>;
}

export const ContagemDinheiroView: React.FC<ContagemDinheiroViewProps> = ({ fechamento, setFechamento }) => {
  const c = fechamento.contagemDinheiro;
  const resumo = calcularResumoLancamentos(fechamento.lancamentos);
  const totalContagem = calcularTotalContagem(c);
  const totalLancadoDinheiro = resumo.totalDinheiro;
  const diferenca = totalContagem - totalLancadoDinheiro;

  const handleUpdate = (field: keyof ContagemDinheiro, val: number) => {
    const num = Math.max(0, val || 0);
    setFechamento((prev) => ({
      ...prev,
      contagemDinheiro: {
        ...prev.contagemDinheiro,
        [field]: num,
      },
    }));
  };

  const handleZerar = () => {
    if (confirm('Deseja realmente zerar a contagem de cédulas e moedas?')) {
      setFechamento((prev) => ({
        ...prev,
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
      }));
    }
  };

  const cedulasList: { key: keyof ContagemDinheiro; label: string; valor: number }[] = [
    { key: 'c200', label: 'R$ 200,00', valor: 200 },
    { key: 'c100', label: 'R$ 100,00', valor: 100 },
    { key: 'c50', label: 'R$ 50,00', valor: 50 },
    { key: 'c20', label: 'R$ 20,00', valor: 20 },
    { key: 'c10', label: 'R$ 10,00', valor: 10 },
    { key: 'c5', label: 'R$ 5,00', valor: 5 },
    { key: 'c2', label: 'R$ 2,00', valor: 2 },
  ];

  const moedasList: { key: keyof ContagemDinheiro; label: string; valor: number }[] = [
    { key: 'm100', label: 'R$ 1,00', valor: 1.0 },
    { key: 'm050', label: 'R$ 0,50', valor: 0.5 },
    { key: 'm025', label: 'R$ 0,25', valor: 0.25 },
    { key: 'm010', label: 'R$ 0,10', valor: 0.10 },
    { key: 'm005', label: 'R$ 0,05', valor: 0.05 },
  ];

  return (
    <div id="contagem-dinheiro-container" className="flex flex-col min-h-full bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Calculadora e Contagem de Espécie</h2>
            <p className="text-xs text-slate-400">
              Insira a quantidade de cédulas e moedas físicas contadas na mesa da tesouraria após o culto.
            </p>
          </div>
        </div>

        <button
          onClick={handleZerar}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>Zerar Contagem</span>
        </button>
      </div>

      {/* Comparison & Audit Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Lançado em Dinheiro</span>
          <h3 className="text-2xl font-black font-mono text-slate-200 mt-1">{formatCurrency(totalLancadoDinheiro)}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Soma dos lançamentos tipo 'Espécie'</p>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Total Físico Contado</span>
          <h3 className="text-2xl font-black font-mono text-amber-300 mt-1">{formatCurrency(totalContagem)}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Soma da calculadora de notas e moedas</p>
        </div>

        <div className={`p-4 rounded-2xl border text-center flex flex-col justify-center ${
          Math.abs(diferenca) < 0.01
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : diferenca > 0
            ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
            {Math.abs(diferenca) < 0.01 ? 'Status do Caixa Físico' : diferenca > 0 ? 'Sobra de Caixa' : 'Falta de Caixa'}
          </span>
          <h3 className="text-xl font-black font-mono mt-1">
            {Math.abs(diferenca) < 0.01 ? 'Exato (Sem Diferença)' : `${diferenca > 0 ? '+' : ''}${formatCurrency(diferenca)}`}
          </h3>
          <p className="text-[10px] opacity-80 mt-0.5">
            {Math.abs(diferenca) < 0.01
              ? 'Conferência 100% aprovada!'
              : diferenca > 0
              ? 'Verifique se faltou lançar algum envelope'
              : 'Verifique possíveis trocos ou erros de contagem'}
          </p>
        </div>
      </div>

      {/* Bill & Coin Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
        {/* Cédulas */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Coins className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">Contagem de Cédulas (Notas)</h3>
          </div>

          <div className="space-y-3">
            {cedulasList.map((item) => {
              const qty = c[item.key] || 0;
              const subtotal = qty * item.valor;
              return (
                <div key={item.key} className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
                  <div className="w-24 shrink-0">
                    <span className="font-bold text-xs text-amber-400">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdate(item.key, qty - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={qty || ''}
                      onChange={(e) => handleUpdate(item.key, parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-16 bg-slate-900 border border-slate-700 rounded-lg py-1 text-center font-mono font-bold text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate(item.key, qty + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-28 text-right font-mono font-bold text-xs text-emerald-400">
                    {formatCurrency(subtotal)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Moedas */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Coins className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-slate-100">Contagem de Moedas</h3>
          </div>

          <div className="space-y-3">
            {moedasList.map((item) => {
              const qty = c[item.key] || 0;
              const subtotal = qty * item.valor;
              return (
                <div key={item.key} className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
                  <div className="w-24 shrink-0">
                    <span className="font-bold text-xs text-blue-300">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdate(item.key, qty - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={qty || ''}
                      onChange={(e) => handleUpdate(item.key, parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-16 bg-slate-900 border border-slate-700 rounded-lg py-1 text-center font-mono font-bold text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate(item.key, qty + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-28 text-right font-mono font-bold text-xs text-emerald-400">
                    {formatCurrency(subtotal)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
