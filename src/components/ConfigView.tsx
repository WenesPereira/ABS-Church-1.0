import React, { useState } from 'react';
import { Settings, Church, Check, User, ShieldCheck, ArrowLeft, Database, Copy, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { ConfigIgreja, CategoriaEntrada, ActiveTab } from '../types';
import { ALL_ENTRADA_CATEGORIES, CATEGORIA_ENTRADA_LABELS } from '../utils/calculations';

interface ConfigViewProps {
  config: ConfigIgreja;
  setConfig: React.Dispatch<React.SetStateAction<ConfigIgreja>>;
  onNavigate?: (tab: ActiveTab) => void;
}

const SUPABASE_FULL_SQL = `-- ==============================================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS SUPABASE - TESOURARIA DA IGREJA
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABELA 1: public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    email TEXT NOT NULL,
    nome TEXT NOT NULL DEFAULT 'Tesoureiro',
    cargo TEXT DEFAULT 'Tesoureiro Principal',
    nome_igreja TEXT DEFAULT 'Igreja Evangélica',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem visualizar seu próprio perfil"
    ON public.profiles FOR SELECT USING (auth.uid() = user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem criar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem criar seu próprio perfil"
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
    ON public.profiles FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = id) WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem excluir seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem excluir seu próprio perfil"
    ON public.profiles FOR DELETE USING (auth.uid() = user_id OR auth.uid() = id);

-- TABELA 2: public.configuracao_igreja
CREATE TABLE IF NOT EXISTS public.configuracao_igreja (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    nome_igreja TEXT NOT NULL DEFAULT 'Tesouraria da Igreja',
    cnpj TEXT,
    cidade_uf TEXT,
    pastor_presidente TEXT NOT NULL DEFAULT 'Pastor Presidente',
    pastor_local TEXT,
    tesoureiro_padrao TEXT NOT NULL DEFAULT 'Tesoureiro Principal',
    segundo_tesoureiro_padrao TEXT,
    porcentagem_matriz NUMERIC(5,2) DEFAULT 20.00,
    aplicar_repasse_matriz BOOLEAN DEFAULT true,
    tipo_base_repasse_matriz TEXT DEFAULT 'todas',
    categorias_repasse_matriz JSONB DEFAULT '["dizimo", "oferta_culto", "oferta_missoes", "oferta_especial", "doacao", "outros"]'::jsonb,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.configuracao_igreja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar suas configurações" ON public.configuracao_igreja;
CREATE POLICY "Usuários podem visualizar suas configurações"
    ON public.configuracao_igreja FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem cadastrar suas configurações" ON public.configuracao_igreja;
CREATE POLICY "Usuários podem cadastrar suas configurações"
    ON public.configuracao_igreja FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar suas configurações" ON public.configuracao_igreja;
CREATE POLICY "Usuários podem atualizar suas configurações"
    ON public.configuracao_igreja FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem excluir suas configurações" ON public.configuracao_igreja;
CREATE POLICY "Usuários podem excluir suas configurações"
    ON public.configuracao_igreja FOR DELETE USING (auth.uid() = user_id);

-- TABELA 3: public.fechamentos_culto
CREATE TABLE IF NOT EXISTS public.fechamentos_culto (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    nome_igreja TEXT NOT NULL DEFAULT 'Tesouraria da Igreja',
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    data_inicio DATE,
    data_fim DATE,
    hora TEXT NOT NULL DEFAULT '19:00',
    tipo_culto TEXT NOT NULL DEFAULT 'Fechamento de Caixa',
    pregador TEXT,
    passagem_biblica TEXT,
    qtd_membros INTEGER DEFAULT 0,
    qtd_visitantes INTEGER DEFAULT 0,
    pastor_presidente TEXT,
    tesoureiro TEXT NOT NULL DEFAULT 'Tesoureiro Principal',
    pastor_local TEXT,
    segunda_testemunha TEXT,
    porcentagem_matriz NUMERIC(5,2) DEFAULT 20.00,
    aplicar_repasse_matriz BOOLEAN DEFAULT true,
    tipo_base_repasse_matriz TEXT DEFAULT 'todas',
    categorias_repasse_matriz JSONB DEFAULT '["dizimo", "oferta_culto", "oferta_missoes", "oferta_especial", "doacao", "outros"]'::jsonb,
    observacoes TEXT,
    contagem_dinheiro JSONB NOT NULL DEFAULT '{"c200":0,"c100":0,"c50":0,"c20":0,"c10":0,"c5":0,"c2":0,"m100":0,"m050":0,"m025":0,"m010":0,"m005":0}'::jsonb,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    fechado_em TIMESTAMPTZ,
    relatorio_ia TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.fechamentos_culto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar seus fechamentos" ON public.fechamentos_culto;
CREATE POLICY "Usuários podem visualizar seus fechamentos"
    ON public.fechamentos_culto FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem criar seus fechamentos" ON public.fechamentos_culto;
CREATE POLICY "Usuários podem criar seus fechamentos"
    ON public.fechamentos_culto FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar seus fechamentos" ON public.fechamentos_culto;
CREATE POLICY "Usuários podem atualizar seus fechamentos"
    ON public.fechamentos_culto FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem excluir seus fechamentos" ON public.fechamentos_culto;
CREATE POLICY "Usuários podem excluir seus fechamentos"
    ON public.fechamentos_culto FOR DELETE USING (auth.uid() = user_id);

-- TABELA 4: public.lancamentos
CREATE TABLE IF NOT EXISTS public.lancamentos (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    fechamento_id TEXT NOT NULL REFERENCES public.fechamentos_culto(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    categoria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    forma_pagamento TEXT NOT NULL DEFAULT 'dinheiro',
    nome_pessoa TEXT,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

-- Compatibilização de restrições para suportar maiúsculas/minúsculas
ALTER TABLE public.lancamentos DROP CONSTRAINT IF EXISTS lancamentos_tipo_check;
ALTER TABLE public.lancamentos ADD CONSTRAINT lancamentos_tipo_check 
    CHECK (LOWER(tipo) IN ('entrada', 'saida', 'saída', 'receita', 'despesa'));

ALTER TABLE public.fechamentos_culto DROP CONSTRAINT IF EXISTS fechamentos_culto_status_check;
ALTER TABLE public.fechamentos_culto ADD CONSTRAINT fechamentos_culto_status_check 
    CHECK (LOWER(status) IN ('aberto', 'fechado'));

DROP POLICY IF EXISTS "Usuários podem visualizar seus lançamentos" ON public.lancamentos;
CREATE POLICY "Usuários podem visualizar seus lançamentos"
    ON public.lancamentos FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem criar seus lançamentos" ON public.lancamentos;
CREATE POLICY "Usuários podem criar seus lançamentos"
    ON public.lancamentos FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar seus lançamentos" ON public.lancamentos;
CREATE POLICY "Usuários podem atualizar seus lançamentos"
    ON public.lancamentos FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem excluir seus lançamentos" ON public.lancamentos;
CREATE POLICY "Usuários podem excluir seus lançamentos"
    ON public.lancamentos FOR DELETE USING (auth.uid() = user_id);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_config_user_id ON public.configuracao_igreja(user_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_user_id ON public.fechamentos_culto(user_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_data ON public.fechamentos_culto(data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_id ON public.lancamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_fechamento_id ON public.lancamentos(fechamento_id);

-- TRIGGER DE NOVO USUÁRIO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, user_id, email, nome, cargo, nome_igreja)
    VALUES (
        NEW.id, NEW.id, NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome', 'Tesoureiro'),
        COALESCE(NEW.raw_user_meta_data->>'cargo', 'Tesoureiro Principal'),
        COALESCE(NEW.raw_user_meta_data->>'nome_igreja', 'Minha Igreja')
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.configuracao_igreja (
        id, user_id, nome_igreja, pastor_presidente, tesoureiro_padrao, porcentagem_matriz, aplicar_repasse_matriz
    ) VALUES (
        'config_' || NEW.id::text, NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome_igreja', 'Minha Igreja'),
        'Pastor Presidente',
        COALESCE(NEW.raw_user_meta_data->>'nome', 'Tesoureiro Principal'),
        20.00, true
    ) ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- PERMISSÕES OBRIGATÓRIAS (GRANT) PARA AS ROLES DO SUPABASE (authenticated / anon)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
`;

export const ConfigView: React.FC<ConfigViewProps> = ({ config, setConfig, onNavigate }) => {
  const [form, setForm] = useState<ConfigIgreja>(config);
  const [saved, setSaved] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlDetails, setShowSqlDetails] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_FULL_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleToggleCategoriaDefault = (cat: CategoriaEntrada) => {
    const current = form.categoriasRepasseMatriz || ALL_ENTRADA_CATEGORIES;
    let updated: CategoriaEntrada[];
    if (current.includes(cat)) {
      updated = current.filter((c) => c !== cat);
    } else {
      updated = [...current, cat];
    }
    const isAll = updated.length === ALL_ENTRADA_CATEGORIES.length;
    setForm({
      ...form,
      categoriasRepasseMatriz: updated,
      tipoBaseRepasseMatriz: isAll ? 'todas' : 'selecionadas',
    });
  };

  const handleSelectTodaEntradaDefault = () => {
    setForm({
      ...form,
      tipoBaseRepasseMatriz: 'todas',
      categoriasRepasseMatriz: ALL_ENTRADA_CATEGORIES,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div id="config-view-container" className="space-y-6 w-full max-w-4xl mx-auto pb-12">
      {/* Barra de Navegação Contextual */}
      {onNavigate && (
        <div className="flex items-center justify-between gap-3 w-full">
          <button
            type="button"
            onClick={() => onNavigate('fechamento')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Voltar ao Fechamento Atual</span>
          </button>
        </div>
      )}

      {/* CARD 1: CONFIGURAÇÕES DA IGREJA */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl w-full space-y-6">
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
                value={form.segundoTesoureiroPadrao || ''}
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

            <div className="md:col-span-2 pt-2 border-t border-slate-800/80 space-y-3">
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

              {(form.aplicarRepasseMatriz ?? true) && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      Categorias de Entrada Padrão para Cálculo do Repasse:
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectTodaEntradaDefault}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        (form.tipoBaseRepasseMatriz || 'todas') === 'todas'
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      ★ Selecionar Toda a Entrada
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {ALL_ENTRADA_CATEGORIES.map((cat) => {
                      const isSel = (form.tipoBaseRepasseMatriz || 'todas') === 'todas' || (form.categoriasRepasseMatriz || ALL_ENTRADA_CATEGORIES).includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleToggleCategoriaDefault(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-purple-950 text-purple-200 border-purple-500'
                              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                          }`}
                        >
                          {isSel ? '✓' : '○'} {CATEGORIA_ENTRADA_LABELS[cat]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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

      {/* CARD 2: BANCO DE DADOS SUPABASE (ESTRUTURA & SCRIPT SQL) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl w-full space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Estrutura do Banco de Dados Supabase</span>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  RLS Ativo
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Script SQL pronto para criar as tabelas com isolamento seguro por <code className="text-emerald-300">user_id</code>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopySql}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
            title="Copiar Script SQL completo para a área de transferência"
          >
            {copiedSql ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-950" />
                <span>Copiar SQL</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Tabela 1</span>
            <span className="font-bold text-slate-200 font-mono">public.profiles</span>
            <p className="text-[11px] text-slate-400 mt-1">Perfis de usuários, tesoureiros e permissões.</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Tabela 2</span>
            <span className="font-bold text-slate-200 font-mono">public.configuracao_igreja</span>
            <p className="text-[11px] text-slate-400 mt-1">Dados institucionais, pastores e % da matriz.</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Tabela 3</span>
            <span className="font-bold text-slate-200 font-mono">public.fechamentos_culto</span>
            <p className="text-[11px] text-slate-400 mt-1">Sessões de fechamento, atas e contagem física.</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Tabela 4</span>
            <span className="font-bold text-slate-200 font-mono">public.lancamentos</span>
            <p className="text-[11px] text-slate-400 mt-1">Dízimos, ofertas, doações e saídas/despesas.</p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowSqlDetails(!showSqlDetails)}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer transition-colors"
          >
            {showSqlDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{showSqlDetails ? 'Ocultar código SQL' : 'Visualizar código SQL completo'}</span>
          </button>

          {showSqlDetails && (
            <div className="mt-3 relative rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-80 overflow-y-auto">
              <pre className="whitespace-pre">{SUPABASE_FULL_SQL}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
