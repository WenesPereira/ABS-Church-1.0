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
import { INITIAL_CONFIG, INITIAL_FECHAMENTOS } from '../data/mockData';

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
    porcentagemMatriz: row.porcentagem_matriz ?? undefined,
    aplicarRepasseMatriz: row.aplicar_repasse_matriz ?? undefined,
    tipoBaseRepasseMatriz: (row.tipo_base_repasse_matriz as 'todas' | 'selecionadas') || undefined,
    categoriasRepasseMatriz: (row.categorias_repasse_matriz as CategoriaEntrada[]) || undefined,
    logoUrl: row.logo_url || undefined,
  };
}

function mapConfigToRow(config: ConfigIgreja): Partial<SupabaseConfiguracaoIgrejaRow> {
  return {
    id: 'default_config',
    nome_igreja: config.nomeIgreja,
    cnpj: config.cnpj || null,
    cidade_uf: config.cidadeUF || null,
    pastor_presidente: config.pastorPresidente,
    pastor_local: config.pastorLocal || null,
    tesoureiro_padrao: config.tesoureiroPadrao,
    segundo_tesoureiro_padrao: config.segundoTesoureiroPadrao || null,
    porcentagem_matriz: config.porcentagemMatriz ?? null,
    aplicar_repasse_matriz: config.aplicarRepasseMatriz ?? null,
    tipo_base_repasse_matriz: config.tipoBaseRepasseMatriz || null,
    categorias_repasse_matriz: config.categoriasRepasseMatriz || null,
    logo_url: config.logoUrl || null,
    updated_at: new Date().toISOString(),
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
    porcentagemMatriz: row.porcentagem_matriz ?? undefined,
    aplicarRepasseMatriz: row.aplicar_repasse_matriz ?? undefined,
    tipoBaseRepasseMatriz: (row.tipo_base_repasse_matriz as 'todas' | 'selecionadas') || undefined,
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

export async function fetchConfiguracaoIgreja(): Promise<{ data: ConfigIgreja; isSupabase: boolean }> {
  if (!isSupabaseConfigured) {
    const local = localStorage.getItem('church_treasury_config');
    const parsed = local ? JSON.parse(local) : INITIAL_CONFIG;
    return { data: parsed, isSupabase: false };
  }

  try {
    const { data, error } = await supabase
      .from('configuracao_igreja')
      .select('*')
      .eq('id', 'default_config')
      .maybeSingle();

    if (error) {
      console.warn('Erro ao carregar configurações do Supabase, utilizando dados locais:', error.message);
      const local = localStorage.getItem('church_treasury_config');
      return { data: local ? JSON.parse(local) : INITIAL_CONFIG, isSupabase: false };
    }

    if (!data) {
      // Se não existe no banco ainda, salva a configuração inicial
      await saveConfiguracaoIgreja(INITIAL_CONFIG);
      return { data: INITIAL_CONFIG, isSupabase: true };
    }

    return { data: mapRowToConfig(data), isSupabase: true };
  } catch (err) {
    console.error('Falha de conexão com Supabase para configurações:', err);
    const local = localStorage.getItem('church_treasury_config');
    return { data: local ? JSON.parse(local) : INITIAL_CONFIG, isSupabase: false };
  }
}

export async function saveConfiguracaoIgreja(config: ConfigIgreja): Promise<boolean> {
  // Sempre atualiza LocalStorage por garantia
  localStorage.setItem('church_treasury_config', JSON.stringify(config));

  if (!isSupabaseConfigured) return false;

  try {
    const row = mapConfigToRow(config);
    const { error } = await supabase
      .from('configuracao_igreja')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('Erro ao salvar configuração no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Erro de conexão ao salvar configuração no Supabase:', err);
    return false;
  }
}

/* =========================================================
   SERVIÇOS DE FECHAMENTOS DE CULTO & LANÇAMENTOS
   ========================================================= */

export async function fetchFechamentos(): Promise<{ data: FechamentoCulto[]; isSupabase: boolean }> {
  if (!isSupabaseConfigured) {
    const saved = localStorage.getItem('church_treasury_fechamentos');
    const parsed = saved ? JSON.parse(saved) : INITIAL_FECHAMENTOS;
    return { data: parsed, isSupabase: false };
  }

  try {
    const { data: fechamentosRows, error: fechamentosError } = await supabase
      .from('fechamentos_culto')
      .select('*')
      .order('criado_em', { ascending: false });

    if (fechamentosError) {
      console.warn('Erro ao buscar fechamentos no Supabase, usando backup local:', fechamentosError.message);
      const saved = localStorage.getItem('church_treasury_fechamentos');
      return { data: saved ? JSON.parse(saved) : INITIAL_FECHAMENTOS, isSupabase: false };
    }

    if (!fechamentosRows || fechamentosRows.length === 0) {
      const saved = localStorage.getItem('church_treasury_fechamentos');
      const fallback = saved ? JSON.parse(saved) : INITIAL_FECHAMENTOS;
      return { data: fallback, isSupabase: true };
    }

    // Busca todos os lançamentos
    const { data: lancamentosRows, error: lancamentosError } = await supabase
      .from('lancamentos')
      .select('*');

    if (lancamentosError) {
      console.warn('Erro ao buscar lançamentos no Supabase:', lancamentosError.message);
    }

    const allLancamentos = lancamentosRows || [];

    const fechamentosCompleto: FechamentoCulto[] = fechamentosRows.map((fRow) => {
      const fLancamentos = allLancamentos.filter((l) => l.fechamento_id === fRow.id);
      return mapRowToFechamento(fRow, fLancamentos);
    });

    return { data: fechamentosCompleto, isSupabase: true };
  } catch (err) {
    console.warn('Falha de conexão com Supabase ao carregar fechamentos:', err);
    const saved = localStorage.getItem('church_treasury_fechamentos');
    return { data: saved ? JSON.parse(saved) : INITIAL_FECHAMENTOS, isSupabase: false };
  }
}

export async function saveFechamento(fechamento: FechamentoCulto, userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const fechamentoRow: Partial<SupabaseFechamentoCultoRow> = {
      id: fechamento.id,
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
      porcentagem_matriz: fechamento.porcentagemMatriz ?? null,
      aplicar_repasse_matriz: fechamento.aplicarRepasseMatriz ?? null,
      tipo_base_repasse_matriz: fechamento.tipoBaseRepasseMatriz || null,
      categorias_repasse_matriz: fechamento.categoriasRepasseMatriz || null,
      observacoes: fechamento.observacoes || null,
      contagem_dinheiro: fechamento.contagemDinheiro,
      status: fechamento.status,
      criado_em: fechamento.criadoEm,
      fechado_em: fechamento.fechadoEm || null,
      relatorio_ia: fechamento.relatorioIA || null,
      user_id: userId || null,
    };

    const { error: fError } = await supabase
      .from('fechamentos_culto')
      .upsert(fechamentoRow, { onConflict: 'id' });

    if (fError) {
      console.warn('Erro ao salvar fechamento no Supabase:', fError.message);
      return false;
    }

    // Salva os lançamentos vinculados
    if (fechamento.lancamentos && fechamento.lancamentos.length > 0) {
      const lancamentoRows = fechamento.lancamentos.map((l) => ({
        id: l.id,
        fechamento_id: fechamento.id,
        tipo: l.tipo,
        categoria: l.categoria,
        descricao: l.descricao,
        valor: l.valor,
        forma_pagamento: l.formaPagamento,
        nome_pessoa: l.nomePessoa || null,
        data: l.data,
      }));

      const { error: lError } = await supabase
        .from('lancamentos')
        .upsert(lancamentoRows, { onConflict: 'id' });

      if (lError) {
        console.warn('Erro ao sincronizar lançamentos no Supabase:', lError.message);
      }
    }

    return true;
  } catch (err) {
    console.warn('Erro de conexão ao salvar fechamento no Supabase:', err);
    return false;
  }
}

export async function deleteFechamento(fechamentoId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    // Apaga os lançamentos primeiro caso não haja CASCADE configurado no banco
    await supabase.from('lancamentos').delete().eq('fechamento_id', fechamentoId);

    const { error } = await supabase
      .from('fechamentos_culto')
      .delete()
      .eq('id', fechamentoId);

    if (error) {
      console.warn('Erro ao excluir fechamento no Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Erro de conexão ao excluir fechamento no Supabase:', err);
    return false;
  }
}

export async function deleteLancamento(lancamentoId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase
      .from('lancamentos')
      .delete()
      .eq('id', lancamentoId);

    if (error) {
      console.warn('Erro ao excluir lançamento no Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Erro de conexão ao excluir lançamento no Supabase:', err);
    return false;
  }
}

/* =========================================================
   SERVIÇOS DE USUÁRIOS & PERFIS
   ========================================================= */

export async function syncUserProfile(user: User): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const row: SupabasePerfilUsuarioRow = {
      id: user.id,
      email: user.email,
      nome: user.nome,
      cargo: user.cargo || null,
      nome_igreja: user.nomeIgreja || null,
      created_at: user.createdAt || new Date().toISOString(),
    };

    const { error } = await supabase
      .from('perfis_usuarios')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('Erro ao salvar perfil de usuário no Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Erro ao sincronizar perfil do usuário com Supabase:', err);
    return false;
  }
}
