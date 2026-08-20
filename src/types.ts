export type ActiveTab = 'fechamento' | 'lancamentos' | 'contagem' | 'historico' | 'relatorio_ia' | 'config';

export type TipoLancamento = 'entrada' | 'saida';

export type CategoriaEntrada = 
  | 'dizimo' 
  | 'oferta_culto' 
  | 'oferta_missoes' 
  | 'oferta_especial' 
  | 'doacao' 
  | 'outros';

export type CategoriaSaida = 
  | 'aluguel' 
  | 'agua' 
  | 'luz' 
  | 'internet' 
  | 'alimentacao' 
  | 'manutencao' 
  | 'acao_social' 
  | 'material_ebd' 
  | 'outros';

export type FormaPagamento = 
  | 'dinheiro' 
  | 'pix' 
  | 'cartao_debito' 
  | 'cartao_credito' 
  | 'transferencia';

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  categoria: CategoriaEntrada | CategoriaSaida;
  descricao: string;
  valor: number;
  formaPagamento: FormaPagamento;
  nomePessoa?: string; // Nome do dizimista ou credor
  data: string;
}

export interface ContagemDinheiro {
  c200: number; // notas R$200
  c100: number; // R$100
  c50: number;  // R$50
  c20: number;  // R$20
  c10: number;  // R$10
  c5: number;   // R$5
  c2: number;   // R$2
  m100: number; // R$1.00
  m050: number; // R$0.50
  m025: number; // R$0.25
  m010: number; // R$0.10
  m005: number; // R$0.05
}

export interface FechamentoCulto {
  id: string;
  nomeIgreja: string;
  data: string; // Data final/atual do fechamento
  dataInicio?: string; // Data inicial do período de fechamento (ex: 01/08/2026)
  dataFim?: string; // Data final do período de fechamento (ex: 11/08/2026)
  hora: string;
  tipoCulto: string; // Ex: Fechamento Semanal, Mensal, Por Período
  pregador?: string;
  passagemBiblica?: string;
  qtdMembros?: number;
  qtdVisitantes?: number;
  pastorPresidente?: string;
  tesoureiro: string;
  pastorLocal?: string;
  segundaTestemunha?: string;
  porcentagemMatriz?: number; // Porcentagem a ser enviada para a matriz / sede (ex: 20%)
  aplicarRepasseMatriz?: boolean; // Se deve ou não aplicar o repasse para a matriz
  tipoBaseRepasseMatriz?: 'todas' | 'selecionadas'; // Se o repasse é sobre todas as entradas ou apenas categorias selecionadas
  categoriasRepasseMatriz?: CategoriaEntrada[]; // Lista de categorias que entram na base do repasse (ex: ['dizimo', 'oferta_culto', 'doacao'])
  observacoes?: string;
  lancamentos: Lancamento[];
  contagemDinheiro: ContagemDinheiro;
  status: 'aberto' | 'fechado';
  criadoEm: string;
  fechadoEm?: string;
  relatorioIA?: string;
}

export interface ConfigIgreja {
  nomeIgreja: string;
  cnpj?: string;
  cidadeUF?: string;
  pastorPresidente: string;
  pastorLocal?: string;
  tesoureiroPadrao: string;
  segundoTesoureiroPadrao?: string;
  porcentagemMatriz?: number; // Porcentagem padrão de repasse para a matriz (ex: 20%)
  aplicarRepasseMatriz?: boolean; // Padrão se aplica ou não repasse para a matriz
  tipoBaseRepasseMatriz?: 'todas' | 'selecionadas';
  categoriasRepasseMatriz?: CategoriaEntrada[];
  logoUrl?: string;
  whatsappSuporte?: string; // Número de WhatsApp para atendimento e suporte
  emailSuporte?: string; // E-mail para atendimento e suporte
  apkDownloadUrl?: string; // Link direto para download do APK Android (ex: Drive, Mediafire, OneDrive)
}

export interface User {
  id: string;
  email: string;
  nome: string;
  cargo?: string;
  nomeIgreja?: string;
  createdAt: string;
  subscriptionStatus?: 'active' | 'inactive' | 'trialing' | 'cancelled' | string;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
  mpPreapprovalId?: string;
  isDemo?: boolean;
}

/* =========================================================
   SUPABASE DATABASE TYPES (Mapeamento de Tabelas do Banco)
   ========================================================= */

export interface SupabasePerfilUsuarioRow {
  id: string;
  user_id?: string | null;
  email: string;
  nome: string;
  cargo: string | null;
  nome_igreja: string | null;
  subscription_status?: string | null;
  subscription_plan?: string | null;
  subscription_expires_at?: string | null;
  mp_preapproval_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface SupabaseConfiguracaoIgrejaRow {
  id: string;
  user_id: string;
  nome_igreja: string;
  cnpj: string | null;
  cidade_uf: string | null;
  pastor_presidente: string;
  pastor_local: string | null;
  tesoureiro_padrao: string;
  segundo_tesoureiro_padrao: string | null;
  porcentagem_matriz: number | null;
  aplicar_repasse_matriz: boolean | null;
  tipo_base_repasse_matriz: string | null;
  categorias_repasse_matriz: string[] | null;
  logo_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseFechamentoCultoRow {
  id: string;
  user_id: string;
  nome_igreja: string;
  data: string;
  data_inicio: string | null;
  data_fim: string | null;
  hora: string;
  tipo_culto: string;
  pregador: string | null;
  passagem_biblica: string | null;
  qtd_membros: number | null;
  qtd_visitantes: number | null;
  pastor_presidente: string | null;
  tesoureiro: string;
  pastor_local: string | null;
  segunda_testemunha: string | null;
  porcentagem_matriz: number | null;
  aplicar_repasse_matriz: boolean | null;
  tipo_base_repasse_matriz: string | null;
  categorias_repasse_matriz: string[] | null;
  observacoes: string | null;
  contagem_dinheiro: ContagemDinheiro;
  status: 'aberto' | 'fechado';
  criado_em: string;
  fechado_em: string | null;
  relatorio_ia: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseLancamentoRow {
  id: string;
  user_id: string;
  fechamento_id: string;
  tipo: TipoLancamento;
  categoria: string;
  descricao: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  nome_pessoa: string | null;
  data: string;
  created_at?: string;
  updated_at?: string;
}

