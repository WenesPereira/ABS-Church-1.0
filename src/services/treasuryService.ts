import { supabase, isSupabaseConfigured } from './supabase';
import {
  ConfigIgreja,
  FechamentoCulto,
  Lancamento,
  User,
  SupabaseConfiguracaoIgrejaRow,
  SupabaseFechamentoCultoRow,
  SupabaseLancamentoRow,
  SupabasePerfilUsuarioRow,
  CategoriaEntrada,
  CategoriaSaida,
} from '../types';

export const DEFAULT_CONFIG: ConfigIgreja = {
  nomeIgreja: 'Minha Igreja',
  pastorPresidente: 'Pastor Presidente',
  tesoureiroPadrao: 'Tesoureiro Principal',
  porcentagemMatriz: 20,
  aplicarRepasseMatriz: true,
  tipoBaseRepasseMatriz: 'todas',
  categoriasRepasseMatriz: ['dizimo', 'oferta_culto', 'oferta_missoes', 'oferta_especial', 'doacao', 'outros'],
};

/* =========================================================
   HELPER: Obter e Validar Sessão do Usuário Autenticado
   ========================================================= */

export async function getCurrentUserId(explicitUserId?: string): Promise<string | null> {
  if (explicitUserId) return explicitUserId;
  if (!isSupabaseConfigured) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Erro Supabase ao validar sessão do usuário:', error);
      return null;
    }
    return user?.id || null;
  } catch (err) {
    console.error('Erro Supabase inesperado ao obter sessão:', err);
    return null;
  }
}

/* =========================================================
   MAPPERS (Converter de snake_case do Supabase para camelCase do App)
   ========================================================= */

function mapRowToConfig(row: SupabaseConfiguracaoIgrejaRow): ConfigIgreja {
  return {
    nomeIgreja: row.nome_igreja,
    cnpj: row.cnpj || undefined,
    cidadeUF: row.cidade_uf || undefined,
    pastorPresidente: row.pastor_presidente,
    pastorLocal: row.pastor_local || undefined,
    tesoureiroPadrao: row.tesoureiro_padrao,
    segundoTesoureiroPadrao: row.segundo_tesoureiro_padrao || undefined,
    porcentagemMatriz: row.porcentagem_matriz != null ? Number(row.porcentagem_matriz) : 20,
    aplicarRepasseMatriz: row.aplicar_repasse_matriz ?? true,
    tipoBaseRepasseMatriz: (row.tipo_base_repasse_matriz as 'todas' | 'selecionadas') || 'todas',
    categoriasRepasseMatriz: (row.categorias_repasse_matriz as CategoriaEntrada[]) || undefined,
    logoUrl: row.logo_url || undefined,
  };
}

function mapConfigToRow(config: ConfigIgreja, userId: string): Partial<SupabaseConfiguracaoIgrejaRow> {
  return {
    id: `config_${userId}`,
    user_id: userId,
    nome_igreja: config.nomeIgreja || 'Tesouraria da Igreja',
    cnpj: config.cnpj || null,
    cidade_uf: config.cidadeUF || null,
    pastor_presidente: config.pastorPresidente || 'Pastor Presidente',
    pastor_local: config.pastorLocal || null,
    tesoureiro_padrao: config.tesoureiroPadrao || 'Tesoureiro Principal',
    segundo_tesoureiro_padrao: config.segundoTesoureiroPadrao || null,
    porcentagem_matriz: config.porcentagemMatriz != null ? Number(config.porcentagemMatriz) : 20,
    aplicar_repasse_matriz: config.aplicarRepasseMatriz ?? true,
    tipo_base_repasse_matriz: config.tipoBaseRepasseMatriz || 'todas',
    categorias_repasse_matriz: (config.categoriasRepasseMatriz as string[]) || null,
    logo_url: config.logoUrl || null,
  };
}

function mapRowToLancamento(row: SupabaseLancamentoRow): Lancamento {
  return {
    id: row.id,
    tipo: row.tipo,
    categoria: row.categoria as CategoriaEntrada | CategoriaSaida,
    descricao: row.descricao,
    valor: Number(row.valor),
    formaPagamento: row.forma_pagamento,
    nomePessoa: row.nome_pessoa || undefined,
    data: row.data,
  };
}

function mapRowToFechamento(
  row: SupabaseFechamentoCultoRow,
  lancamentosRows: SupabaseLancamentoRow[] = []
): FechamentoCulto {
  return {
    id: row.id,
    nomeIgreja: row.nome_igreja,
    data: row.data,
    dataInicio: row.data_inicio || undefined,
    dataFim: row.data_fim || undefined,
    hora: row.hora,
    tipoCulto: row.tipo_culto,
    pregador: row.pregador || undefined,
    passagemBiblica: row.passagem_biblica || undefined,
    qtdMembros: row.qtd_membros ?? undefined,
    qtdVisitantes: row.qtd_visitantes ?? undefined,
    pastorPresidente: row.pastor_presidente || undefined,
    tesoureiro: row.tesoureiro,
    pastorLocal: row.pastor_local || undefined,
    segundaTestemunha: row.segunda_testemunha || undefined,
    porcentagemMatriz: row.porcentagem_matriz != null ? Number(row.porcentagem_matriz) : 20,
    aplicarRepasseMatriz: row.aplicar_repasse_matriz ?? true,
    tipoBaseRepasseMatriz: (row.tipo_base_repasse_matriz as 'todas' | 'selecionadas') || 'todas',
    categoriasRepasseMatriz: (row.categorias_repasse_matriz as CategoriaEntrada[]) || undefined,
    observacoes: row.observacoes || undefined,
    contagemDinheiro: row.contagem_dinheiro || {
      c200: 0, c100: 0, c50: 0, c20: 0, c10: 0, c5: 0, c2: 0,
      m100: 0, m050: 0, m025: 0, m010: 0, m005: 0,
    },
    status: row.status,
    criadoEm: row.criado_em,
    fechadoEm: row.fechado_em || undefined,
    relatorioIA: row.relatorio_ia || undefined,
    lancamentos: lancamentosRows.map(mapRowToLancamento),
  };
}

/* =========================================================
   SERVIÇOS DE CONFIGURAÇÃO
   ========================================================= */

export async function fetchConfiguracaoIgreja(userId?: string): Promise<{ data: ConfigIgreja; isSupabase: boolean }> {
  if (!isSupabaseConfigured) {
    return { data: DEFAULT_CONFIG, isSupabase: false };
  }

  try {
    const uid = await getCurrentUserId(userId);
    if (!uid) {
      console.warn('fetchConfiguracaoIgreja: Usuário não autenticado no Supabase.');
      return { data: DEFAULT_CONFIG, isSupabase: true };
    }

    const { data, error } = await supabase
      .from('configuracao_igreja')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) {
      console.error('Erro Supabase ao buscar configuracao_igreja:', error);
      return { data: DEFAULT_CONFIG, isSupabase: false };
    }

    if (!data) {
      // Cria a configuração inicial para este usuário no Supabase
      await saveConfiguracaoIgreja(DEFAULT_CONFIG, uid);
      return { data: DEFAULT_CONFIG, isSupabase: true };
    }

    return { data: mapRowToConfig(data), isSupabase: true };
  } catch (err) {
    console.error('Erro Supabase inesperado ao buscar configurações:', err);
    return { data: DEFAULT_CONFIG, isSupabase: false };
  }
}

export async function saveConfiguracaoIgreja(config: ConfigIgreja, userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const uid = await getCurrentUserId(userId);
    if (!uid) {
      console.error('Erro Supabase: Tentativa de salvar configuracao_igreja sem usuário autenticado.');
      return false;
    }

    const row = mapConfigToRow(config, uid);
    const { data, error } = await supabase
      .from('configuracao_igreja')
      .upsert(row, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Erro Supabase ao salvar configuracao_igreja:', error);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error('Erro Supabase inesperado ao salvar configuracao_igreja:', err);
    return false;
  }
}

/* =========================================================
   SERVIÇOS DE FECHAMENTOS DE CULTO & LANÇAMENTOS
   ========================================================= */

export async function fetchFechamentos(userId?: string): Promise<{ data: FechamentoCulto[]; isSupabase: boolean }> {
  if (!isSupabaseConfigured) {
    return { data: [], isSupabase: false };
  }

  try {
    const uid = await getCurrentUserId(userId);
    if (!uid) {
      console.warn('fetchFechamentos: Usuário não autenticado no Supabase.');
      return { data: [], isSupabase: true };
    }

    // 1. Busca os fechamentos filtrando explicitamente pelo usuário logado
    const { data: fechamentosRows, error: fechamentosError } = await supabase
      .from('fechamentos_culto')
      .select('*')
      .eq('user_id', uid)
      .order('criado_em', { ascending: false });

    if (fechamentosError) {
      console.error('Erro Supabase ao buscar fechamentos_culto:', fechamentosError);
      return { data: [], isSupabase: false };
    }

    if (!fechamentosRows || fechamentosRows.length === 0) {
      return { data: [], isSupabase: true };
    }

    // 2. Busca os lançamentos filtrando explicitamente pelo usuário logado
    const { data: lancamentosRows, error: lancamentosError } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('user_id', uid);

    if (lancamentosError) {
      console.error('Erro Supabase ao buscar lancamentos:', lancamentosError);
    }

    const allLancamentos = lancamentosRows || [];

    const fechamentosCompleto: FechamentoCulto[] = fechamentosRows.map((fRow) => {
      const fLancamentos = allLancamentos.filter((l) => l.fechamento_id === fRow.id);
      return mapRowToFechamento(fRow, fLancamentos);
    });

    return { data: fechamentosCompleto, isSupabase: true };
  } catch (err) {
    console.error('Erro Supabase inesperado ao carregar fechamentos:', err);
    return { data: [], isSupabase: false };
  }
}

export async function saveFechamento(fechamento: FechamentoCulto, userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const uid = await getCurrentUserId(userId);
    if (!uid) {
      console.error('Erro Supabase: Tentativa de salvar fechamento sem usuário autenticado.');
      return false;
    }

    const fechamentoRow: Partial<SupabaseFechamentoCultoRow> = {
      id: fechamento.id,
      user_id: uid,
      nome_igreja: fechamento.nomeIgreja,
      data: fechamento.data,
      data_inicio: fechamento.dataInicio || null,
      data_fim: fechamento.dataFim || null,
      hora: fechamento.hora,
      tipo_culto: fechamento.tipoCulto,
      pregador: fechamento.pregador || null,
      passagem_biblica: fechamento.passagemBiblica || null,
      qtd_membros: fechamento.qtdMembros ?? null,
      qtd_visitantes: fechamento.qtdVisitantes ?? null,
      pastor_presidente: fechamento.pastorPresidente || null,
      tesoureiro: fechamento.tesoureiro,
      pastor_local: fechamento.pastorLocal || null,
      segunda_testemunha: fechamento.segundaTestemunha || null,
      porcentagem_matriz: fechamento.porcentagemMatriz != null ? Number(fechamento.porcentagemMatriz) : 20,
      aplicar_repasse_matriz: fechamento.aplicarRepasseMatriz ?? true,
      tipo_base_repasse_matriz: fechamento.tipoBaseRepasseMatriz || 'todas',
      categorias_repasse_matriz: (fechamento.categoriasRepasseMatriz as string[]) || null,
      observacoes: fechamento.observacoes || null,
      contagem_dinheiro: fechamento.contagemDinheiro,
      status: fechamento.status,
      criado_em: fechamento.criadoEm,
      fechado_em: fechamento.fechadoEm || null,
      relatorio_ia: fechamento.relatorioIA || null,
    };

    const { data: fData, error: fError } = await supabase
      .from('fechamentos_culto')
      .upsert(fechamentoRow, { onConflict: 'id' })
      .select();

    if (fError) {
      console.error('Erro Supabase ao salvar fechamentos_culto:', fError);
      return false;
    }

    // Salva os lançamentos vinculados explicitamente com user_id
    if (fechamento.lancamentos && fechamento.lancamentos.length > 0) {
      const lancamentoRows = fechamento.lancamentos.map((l) => ({
        id: l.id,
        user_id: uid,
        fechamento_id: fechamento.id,
        tipo: l.tipo,
        categoria: l.categoria,
        descricao: l.descricao,
        valor: Number(l.valor),
        forma_pagamento: l.formaPagamento,
        nome_pessoa: l.nomePessoa || null,
        data: l.data,
      }));

      const { data: lData, error: lError } = await supabase
        .from('lancamentos')
        .upsert(lancamentoRows, { onConflict: 'id' })
        .select();

      if (lError) {
        console.error('Erro Supabase ao salvar lancamentos:', lError);
      }
    }

    return true;
  } catch (err) {
    console.error('Erro Supabase inesperado ao salvar fechamento:', err);
    return false;
  }
}

export async function deleteFechamento(fechamentoId: string, userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const uid = await getCurrentUserId(userId);
    if (!uid) {
      console.error('Erro Supabase: Tentativa de excluir fechamento sem usuário autenticado.');
      return false;
    }

    // 1. Apaga os lançamentos vinculados ao usuário e ao fechamento
    const { error: lError } = await supabase
      .from('lancamentos')
      .delete()
      .eq('fechamento_id', fechamentoId)
      .eq('user_id', uid);

    if (lError) {
      console.error('Erro Supabase ao excluir lançamentos do fechamento:', lError);
    }

    // 2. Apaga o fechamento do usuário
    const { error: fError } = await supabase
      .from('fechamentos_culto')
      .delete()
      .eq('id', fechamentoId)
      .eq('user_id', uid);

    if (fError) {
      console.error('Erro Supabase ao excluir fechamentos_culto:', fError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Erro Supabase inesperado ao excluir fechamento:', err);
    return false;
  }
}

export async function deleteLancamento(lancamentoId: string, userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const uid = await getCurrentUserId(userId);
    if (!uid) {
      console.error('Erro Supabase: Tentativa de excluir lançamento sem usuário autenticado.');
      return false;
    }

    const { error } = await supabase
      .from('lancamentos')
      .delete()
      .eq('id', lancamentoId)
      .eq('user_id', uid);

    if (error) {
      console.error('Erro Supabase ao excluir lançamento:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Erro Supabase inesperado ao excluir lançamento:', err);
    return false;
  }
}

/* =========================================================
   SERVIÇOS DE USUÁRIOS & PERFIS
   ========================================================= */

export async function syncUserProfile(user: User): Promise<boolean> {
  if (!isSupabaseConfigured || !user.id) return false;

  try {
    const row: Partial<SupabasePerfilUsuarioRow> = {
      id: user.id,
      user_id: user.id,
      email: user.email,
      nome: user.nome,
      cargo: user.cargo || null,
      nome_igreja: user.nomeIgreja || null,
      created_at: user.createdAt || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(row, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Erro Supabase ao salvar perfil de usuário em profiles:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Erro Supabase inesperado ao sincronizar perfil do usuário:', err);
    return false;
  }
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erro Supabase ao buscar perfil em profiles:', error);
      return null;
    }

    if (data) {
      return {
        id: data.id,
        email: data.email,
        nome: data.nome,
        cargo: data.cargo || undefined,
        nomeIgreja: data.nome_igreja || undefined,
        createdAt: data.created_at || new Date().toISOString(),
      };
    }
    return null;
  } catch (err) {
    console.error('Erro Supabase inesperado ao carregar perfil do usuário:', err);
    return null;
  }
}

