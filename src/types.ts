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
  logoUrl?: string;
}
