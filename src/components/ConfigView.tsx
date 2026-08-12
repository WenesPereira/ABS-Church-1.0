import React, { useState } from 'react';
import { Settings, Church, Check, User, ShieldCheck } from 'lucide-react';
import { ConfigIgreja } from '../types';

interface ConfigViewProps {
  config: ConfigIgreja;
  setConfig: React.Dispatch<React.SetStateAction<ConfigIgreja>>;
}

export const ConfigView: React.FC<ConfigViewProps> = ({ config, setConfig }) => {
  const [form, setForm] = useState<ConfigIgreja>(config);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div id="config-view-container" className="flex flex-col min-h-full bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Configurações Gerais da Igreja</h2>
            <p className="text-xs text-slate-400">
              Informações institucionais exibidas nas atas, comprovantes impressos e relatórios de tesouraria.
            </p>
          </div>
        </div>

        {saved && (
          <div className="bg-emerald-950/50 border border-emerald-500/50 p-4 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Configurações salvas com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Oficial da Igreja:</label>
              <input
                type="text"
                value={form.nomeIgreja}
                onChange={(e) => setForm({ ...form, nomeIgreja: e.target.value })}
                placeholder="Ex: Igreja Evangélica Assembleia de Deus"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">CNPJ da Igreja (Opcional):</label>
              <input
                type="text"
                value={form.cnpj || ''}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cidade e UF:</label>
              <input
                type="text"
                value={form.cidadeUF || ''}
                onChange={(e) => setForm({ ...form, cidadeUF: e.target.value })}
                placeholder="Ex: São Paulo - SP"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pastor Presidente:</label>
              <input
                type="text"
                value={form.pastorPresidente}
                onChange={(e) => setForm({ ...form, pastorPresidente: e.target.value })}
                placeholder="Ex: Pastor Carlos Silva"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pastor Local:</label>
              <input
                type="text"
                value={form.pastorLocal || ''}
                onChange={(e) => setForm({ ...form, pastorLocal: e.target.value })}
                placeholder="Ex: Pastor Roberto Santos"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tesoureiro Padrão:</label>
              <input
                type="text"
                value={form.tesoureiroPadrao}
                onChange={(e) => setForm({ ...form, tesoureiroPadrao: e.target.value })}
                placeholder="Ex: Diácono Marcos"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">2º Tesoureiro / Conferente:</label>
              <input
                type="text"
                value={form.segundoTesoureiroPadrao}
                onChange={(e) => setForm({ ...form, segundoTesoureiroPadrao: e.target.value })}
                placeholder="Ex: Obreiro João"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Porcentagem de Repasse para Matriz / Sede (%):</span>
                <span className="text-[10px] text-amber-400 font-bold">Calculado sobre Entradas</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.porcentagemMatriz ?? 20}
                  onChange={(e) => setForm({ ...form, porcentagemMatriz: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 20"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pr-8 text-xs font-bold font-mono text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>

            <div className="md:col-span-2 pt-2 border-t border-slate-800/80">
              <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer bg-slate-950 p-3 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={form.aplicarRepasseMatriz ?? true}
                  onChange={(e) => setForm({ ...form, aplicarRepasseMatriz: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="font-bold text-slate-100 block">Aplicar Repasse para a Matriz / Sede por Padrão</span>
                  <span className="text-[11px] text-slate-400 block">Habilita o desconto automático da porcentagem da matriz nos relatórios de fechamento.</span>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 py-3 rounded-2xl font-bold text-xs transition-all shadow-lg shadow-amber-600/20 cursor-pointer"
          >
            Salvar Dados da Igreja
          </button>
        </form>
      </div>
    </div>
  );
};
