-- ==============================================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS SUPABASE - TESOURARIA DA IGREJA
-- ==============================================================================
-- Este script cria todas as tabelas necessárias, ativa o Row Level Security (RLS)
-- e configura as políticas de segurança onde cada usuário acessa apenas seus dados.
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Acesse o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral esquerdo, clique no ícone "SQL Editor" (ou Editor SQL)
-- 3. Clique em "+ New Query" (Nova Consulta)
-- 4. Cole todo o conteúdo deste arquivo e clique no botão "RUN" (Executar)
-- ==============================================================================

-- 1. Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TABELA 1: public.profiles (Perfis de Usuários / Tesoureiros)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    email TEXT NOT NULL,
    nome TEXT NOT NULL DEFAULT 'Tesoureiro',
    cargo TEXT DEFAULT 'Tesoureiro Principal',
    nome_igreja TEXT DEFAULT 'Igreja Evangélica',
    has_paid BOOLEAN DEFAULT false,
    status_assinatura TEXT DEFAULT 'pendente',
    subscription_status TEXT DEFAULT 'pendente',
    subscription_plan TEXT DEFAULT 'mensal',
    subscription_expires_at TIMESTAMPTZ,
    mp_preapproval_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garantir que as colunas existam em bancos já criados anteriormente
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_paid BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_assinatura TEXT DEFAULT 'pendente';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'pendente';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'mensal';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS) para profiles
DROP POLICY IF EXISTS "Usuários podem visualizar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem visualizar seu próprio perfil"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem criar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem criar seu próprio perfil"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = id)
    WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem excluir seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem excluir seu próprio perfil"
    ON public.profiles FOR DELETE
    USING (auth.uid() = user_id OR auth.uid() = id);


-- ==============================================================================
-- TABELA 2: public.configuracao_igreja (Configurações Gerais e Repasse Matriz)
-- ==============================================================================
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
    porcentagem_prebenda NUMERIC(5,2) DEFAULT 0.00,
    aplicar_prebenda BOOLEAN DEFAULT false,
    tipo_base_prebenda TEXT DEFAULT 'todas',
    categorias_prebenda JSONB DEFAULT '["dizimo", "oferta_culto", "oferta_missoes", "oferta_especial", "doacao", "outros"]'::jsonb,
    deduzir_matriz_base_prebenda BOOLEAN DEFAULT false,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garantir colunas novas em configuracao_igreja
ALTER TABLE public.configuracao_igreja ADD COLUMN IF NOT EXISTS tipo_base_prebenda TEXT DEFAULT 'todas';
ALTER TABLE public.configuracao_igreja ADD COLUMN IF NOT EXISTS categorias_prebenda JSONB DEFAULT '["dizimo", "oferta_culto", "oferta_missoes", "oferta_especial", "doacao", "outros"]'::jsonb;
ALTER TABLE public.configuracao_igreja ADD COLUMN IF NOT EXISTS deduzir_matriz_base_prebenda BOOLEAN DEFAULT false;
ALTER TABLE public.configuracao_igreja ADD COLUMN IF NOT EXISTS tipo_base_repasse_matriz TEXT DEFAULT 'todas';
ALTER TABLE public.configuracao_igreja ADD COLUMN IF NOT EXISTS categorias_repasse_matriz JSONB DEFAULT '["dizimo", "oferta_culto", "oferta_missoes", "oferta_especial", "doacao", "outros"]'::jsonb;
ALTER TABLE public.configuracao_igreja ADD COLUMN IF NOT EXISTS aplicar_prebenda BOOLEAN DEFAULT false;
ALTER TABLE public.configuracao_igreja ADD COLUMN IF NOT EXISTS porcentagem_prebenda NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE public.configuracao_igreja ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.configuracao_igreja ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS) para configuracao_igreja
DROP POLICY IF EXISTS "Usuários podem visualizar suas configurações" ON public.configuracao_igreja;
CREATE POLICY "Usuários podem visualizar suas configurações"
    ON public.configuracao_igreja FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem cadastrar suas configurações" ON public.configuracao_igreja;
CREATE POLICY "Usuários podem cadastrar suas configurações"
    ON public.configuracao_igreja FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar suas configurações" ON public.configuracao_igreja;
CREATE POLICY "Usuários podem atualizar suas configurações"
    ON public.configuracao_igreja FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem excluir suas configurações" ON public.configuracao_igreja;
CREATE POLICY "Usuários podem excluir suas configurações"
    ON public.configuracao_igreja FOR DELETE
    USING (auth.uid() = user_id);


-- ==============================================================================
-- TABELA 3: public.fechamentos_culto (Fechamentos de Caixa, Cultos e Períodos)
-- ==============================================================================
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
    pastor_name TEXT,
    segunda_testemunha TEXT,
    porcentagem_matriz NUMERIC(5,2) DEFAULT 20.00,
    aplicar_repasse_matriz BOOLEAN DEFAULT true,
    tipo_base_repasse_matriz TEXT DEFAULT 'todas',
    categorias_repasse_matriz JSONB DEFAULT '["dizimo", "oferta_culto", "oferta_missoes", "oferta_especial", "doacao", "outros"]'::jsonb,
    porcentagem_prebenda NUMERIC(5,2) DEFAULT 0.00,
    aplicar_prebenda BOOLEAN DEFAULT false,
    tipo_base_prebenda TEXT DEFAULT 'todas',
    categorias_prebenda JSONB DEFAULT '["dizimo", "oferta_culto", "oferta_missoes", "oferta_especial", "doacao", "outros"]'::jsonb,
    deduzir_matriz_base_prebenda BOOLEAN DEFAULT false,
    observacoes TEXT,
    contagem_dinheiro JSONB NOT NULL DEFAULT '{"c200":0,"c100":0,"c50":0,"c20":0,"c10":0,"c5":0,"c2":0,"m100":0,"m050":0,"m025":0,"m010":0,"m005":0}'::jsonb,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    fechado_em TIMESTAMPTZ,
    relatorio_ia TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garantir colunas novas em fechamentos_culto
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS tipo_base_prebenda TEXT DEFAULT 'todas';
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS categorias_prebenda JSONB DEFAULT '["dizimo", "oferta_culto", "oferta_missoes", "oferta_especial", "doacao", "outros"]'::jsonb;
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS deduzir_matriz_base_prebenda BOOLEAN DEFAULT false;
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS tipo_base_repasse_matriz TEXT DEFAULT 'todas';
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS categorias_repasse_matriz JSONB DEFAULT '["dizimo", "oferta_culto", "oferta_missoes", "oferta_especial", "doacao", "outros"]'::jsonb;
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS pastor_name TEXT;
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS pastor_local TEXT;
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS pastor_presidente TEXT;
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS segunda_testemunha TEXT;
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS aplicar_prebenda BOOLEAN DEFAULT false;
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS porcentagem_prebenda NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS aplicar_repasse_matriz BOOLEAN DEFAULT true;
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS porcentagem_matriz NUMERIC(5,2) DEFAULT 20.00;
ALTER TABLE public.fechamentos_culto ADD COLUMN IF NOT EXISTS relatorio_ia TEXT;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.fechamentos_culto ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS) para fechamentos_culto
DROP POLICY IF EXISTS "Usuários podem visualizar seus fechamentos" ON public.fechamentos_culto;
CREATE POLICY "Usuários podem visualizar seus fechamentos"
    ON public.fechamentos_culto FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem criar seus fechamentos" ON public.fechamentos_culto;
CREATE POLICY "Usuários podem criar seus fechamentos"
    ON public.fechamentos_culto FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar seus fechamentos" ON public.fechamentos_culto;
CREATE POLICY "Usuários podem atualizar seus fechamentos"
    ON public.fechamentos_culto FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem excluir seus fechamentos" ON public.fechamentos_culto;
CREATE POLICY "Usuários podem excluir seus fechamentos"
    ON public.fechamentos_culto FOR DELETE
    USING (auth.uid() = user_id);


-- ==============================================================================
-- TABELA 4: public.contributors (Dizimistas e Contribuintes da Igreja)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.contributors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.contributors ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS) para contributors
DROP POLICY IF EXISTS "Usuários podem visualizar seus contribuintes" ON public.contributors;
CREATE POLICY "Usuários podem visualizar seus contribuintes"
    ON public.contributors FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem criar seus contribuintes" ON public.contributors;
CREATE POLICY "Usuários podem criar seus contribuintes"
    ON public.contributors FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar seus contribuintes" ON public.contributors;
CREATE POLICY "Usuários podem atualizar seus contribuintes"
    ON public.contributors FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem excluir seus contribuintes" ON public.contributors;
CREATE POLICY "Usuários podem excluir seus contribuintes"
    ON public.contributors FOR DELETE
    USING (auth.uid() = user_id);


-- ==============================================================================
-- TABELA 5: public.lancamentos (Entradas de Dízimos/Ofertas e Saídas/Despesas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lancamentos (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    fechamento_id TEXT NOT NULL REFERENCES public.fechamentos_culto(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    categoria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    forma_pagamento TEXT NOT NULL DEFAULT 'dinheiro',
    nome_pessoa TEXT,
    contributor_id UUID REFERENCES public.contributors(id) ON DELETE SET NULL,
    contributor_name TEXT,
    contributor_phone TEXT,
    receipt_number TEXT,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS) para lancamentos
DROP POLICY IF EXISTS "Usuários podem visualizar seus lançamentos" ON public.lancamentos;
CREATE POLICY "Usuários podem visualizar seus lançamentos"
    ON public.lancamentos FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem criar seus lançamentos" ON public.lancamentos;
CREATE POLICY "Usuários podem criar seus lançamentos"
    ON public.lancamentos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar seus lançamentos" ON public.lancamentos;
CREATE POLICY "Usuários podem atualizar seus lançamentos"
    ON public.lancamentos FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem excluir seus lançamentos" ON public.lancamentos;
CREATE POLICY "Usuários podem excluir seus lançamentos"
    ON public.lancamentos FOR DELETE
    USING (auth.uid() = user_id);


-- ==============================================================================
-- ÍNDICES PARA ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_config_user_id ON public.configuracao_igreja(user_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_user_id ON public.fechamentos_culto(user_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_data ON public.fechamentos_culto(data);
CREATE INDEX IF NOT EXISTS idx_contributors_user_id ON public.contributors(user_id);
CREATE INDEX IF NOT EXISTS idx_contributors_name ON public.contributors(name);
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_id ON public.lancamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_fechamento_id ON public.lancamentos(fechamento_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON public.lancamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_receipt_number ON public.lancamentos(receipt_number);
CREATE INDEX IF NOT EXISTS idx_lancamentos_contributor_id ON public.lancamentos(contributor_id);


-- ==============================================================================
-- TRIGGER AUTOMÁTICO: Criação de Perfil e Configuração ao Cadastrar Novo Usuário
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Cria o perfil inicial do usuário
    INSERT INTO public.profiles (id, user_id, email, nome, cargo, nome_igreja)
    VALUES (
        NEW.id,
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome', 'Tesoureiro'),
        COALESCE(NEW.raw_user_meta_data->>'cargo', 'Tesoureiro Principal'),
        COALESCE(NEW.raw_user_meta_data->>'nome_igreja', 'Minha Igreja')
    )
    ON CONFLICT (id) DO NOTHING;

    -- Cria a configuração padrão para a igreja do novo usuário
    INSERT INTO public.configuracao_igreja (
        id,
        user_id,
        nome_igreja,
        pastor_presidente,
        tesoureiro_padrao,
        porcentagem_matriz,
        aplicar_repasse_matriz
    )
    VALUES (
        'config_' || NEW.id::text,
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome_igreja', 'Minha Igreja'),
        'Pastor Presidente',
        COALESCE(NEW.raw_user_meta_data->>'nome', 'Tesoureiro Principal'),
        20.00,
        true
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dispara o trigger toda vez que um usuário é criado no Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- MIGRAÇÕES PARA BANCOS SUPABASE JÁ EXISTENTES (EXECUTE SE JÁ TIVER TABELAS CRIADAS)
-- ==============================================================================
-- 1. Criação da tabela de dizimistas e contribuintes caso não exista
CREATE TABLE IF NOT EXISTS public.contributors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.contributors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar seus contribuintes" ON public.contributors;
CREATE POLICY "Usuários podem visualizar seus contribuintes"
    ON public.contributors FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem criar seus contribuintes" ON public.contributors;
CREATE POLICY "Usuários podem criar seus contribuintes"
    ON public.contributors FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar seus contribuintes" ON public.contributors;
CREATE POLICY "Usuários podem atualizar seus contribuintes"
    ON public.contributors FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem excluir seus contribuintes" ON public.contributors;
CREATE POLICY "Usuários podem excluir seus contribuintes"
    ON public.contributors FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Atualização das colunas na tabela de lançamentos
ALTER TABLE IF EXISTS public.lancamentos 
    ADD COLUMN IF NOT EXISTS contributor_id UUID,
    ADD COLUMN IF NOT EXISTS contributor_name TEXT,
    ADD COLUMN IF NOT EXISTS contributor_phone TEXT,
    ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- 3. Atualização das colunas de fechamentos e configurações
ALTER TABLE IF EXISTS public.fechamentos_culto 
    ADD COLUMN IF NOT EXISTS data_inicio DATE,
    ADD COLUMN IF NOT EXISTS data_fim DATE,
    ADD COLUMN IF NOT EXISTS pastor_name TEXT,
    ADD COLUMN IF NOT EXISTS porcentagem_matriz NUMERIC(5,2) DEFAULT 20.00,
    ADD COLUMN IF NOT EXISTS aplicar_repasse_matriz BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS tipo_base_repasse_matriz TEXT DEFAULT 'todas',
    ADD COLUMN IF NOT EXISTS categorias_repasse_matriz JSONB DEFAULT '["dizimo", "oferta_culto", "oferta_missoes", "oferta_especial", "doacao", "outros"]'::jsonb,
    ADD COLUMN IF NOT EXISTS porcentagem_prebenda NUMERIC(5,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS aplicar_prebenda BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS relatorio_ia TEXT;

ALTER TABLE IF EXISTS public.configuracao_igreja
    ADD COLUMN IF NOT EXISTS porcentagem_matriz NUMERIC(5,2) DEFAULT 20.00,
    ADD COLUMN IF NOT EXISTS aplicar_repasse_matriz BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS tipo_base_repasse_matriz TEXT DEFAULT 'todas',
    ADD COLUMN IF NOT EXISTS categorias_repasse_matriz JSONB DEFAULT '["dizimo", "oferta_culto", "oferta_missoes", "oferta_especial", "doacao", "outros"]'::jsonb,
    ADD COLUMN IF NOT EXISTS porcentagem_prebenda NUMERIC(5,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS aplicar_prebenda BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS logo_url TEXT;

