import { Lancamento, ContagemDinheiro, CategoriaEntrada } from '../types';

export const ALL_ENTRADA_CATEGORIES: CategoriaEntrada[] = [
  'dizimo',
  'oferta_culto',
  'oferta_missoes',
  'oferta_especial',
  'doacao',
  'outros',
];

export const CATEGORIA_ENTRADA_LABELS: Record<CategoriaEntrada, string> = {
  dizimo: 'Dízimos',
  oferta_culto: 'Ofertas de Culto',
  oferta_missoes: 'Ofertas de Missões',
  oferta_especial: 'Ofertas Especiais',
  doacao: 'Doações',
  outros: 'Outras Entradas',
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function calcularTotalContagem(c: ContagemDinheiro): number {
  const cedulas =
    (c.c200 || 0) * 200 +
    (c.c100 || 0) * 100 +
    (c.c50 || 0) * 50 +
    (c.c20 || 0) * 20 +
    (c.c10 || 0) * 10 +
    (c.c5 || 0) * 5 +
    (c.c2 || 0) * 2;

  const moedas =
    (c.m100 || 0) * 1.0 +
    (c.m050 || 0) * 0.5 +
    (c.m025 || 0) * 0.25 +
    (c.m010 || 0) * 0.1 +
    (c.m005 || 0) * 0.05;

  return cedulas + moedas;
}

export function calcularResumoLancamentos(
  lancamentos: Lancamento[], 
  porcentagemMatriz: number = 20,
  aplicarRepasse: boolean = true,
  tipoBaseRepasse: 'todas' | 'selecionadas' = 'todas',
  categoriasRepasse: CategoriaEntrada[] = ALL_ENTRADA_CATEGORIES,
  porcentagemPrebenda: number = 0,
  aplicarPrebenda: boolean = false,
  tipoBasePrebenda: 'todas' | 'selecionadas' = 'todas',
  categoriasPrebenda: CategoriaEntrada[] = ALL_ENTRADA_CATEGORIES,
  deduzirMatrizBasePrebenda: boolean = false
) {
  let totalEntradas = 0;
  let totalSaidas = 0;

  let totalDizimos = 0;
  let totalOfertasCulto = 0;
  let totalOfertasMissoes = 0;
  let totalOfertasEspeciais = 0;
  let totalDoacoes = 0;
  let totalOutrasEntradas = 0;

  let baseCalculoMatriz = 0;
  let baseEntradasPrebenda = 0;

  let totalDinheiro = 0;
  let totalPix = 0;
  let totalCartaoDebito = 0;
  let totalCartaoCredito = 0;
  let totalTransferencia = 0;

  const catsAtivasRepasse = (tipoBaseRepasse === 'todas' || !categoriasRepasse || categoriasRepasse.length === 0)
    ? ALL_ENTRADA_CATEGORIES
    : categoriasRepasse;

  const catsAtivasPrebenda = (tipoBasePrebenda === 'todas' || !categoriasPrebenda || categoriasPrebenda.length === 0)
    ? ALL_ENTRADA_CATEGORIES
    : categoriasPrebenda;

  lancamentos.forEach((l) => {
    const val = l.valor || 0;
    if (l.tipo === 'entrada') {
      totalEntradas += val;

      const cat = l.categoria as CategoriaEntrada;
      if (cat === 'dizimo') totalDizimos += val;
      else if (cat === 'oferta_culto') totalOfertasCulto += val;
      else if (cat === 'oferta_missoes') totalOfertasMissoes += val;
      else if (cat === 'oferta_especial') totalOfertasEspeciais += val;
      else if (cat === 'doacao') totalDoacoes += val;
      else totalOutrasEntradas += val;

      // Base do Repasse Matriz
      if (tipoBaseRepasse === 'todas' || catsAtivasRepasse.includes(cat)) {
        baseCalculoMatriz += val;
      }

      // Base de Entradas Selecionadas para a Prebenda Pastoral
      if (tipoBasePrebenda === 'todas' || catsAtivasPrebenda.includes(cat)) {
        baseEntradasPrebenda += val;
      }

      if (l.formaPagamento === 'dinheiro') totalDinheiro += val;
      else if (l.formaPagamento === 'pix') totalPix += val;
      else if (l.formaPagamento === 'cartao_debito') totalCartaoDebito += val;
      else if (l.formaPagamento === 'cartao_credito') totalCartaoCredito += val;
      else if (l.formaPagamento === 'transferencia') totalTransferencia += val;
    } else {
      totalSaidas += val;
      // Se a saída foi em dinheiro
      if (l.formaPagamento === 'dinheiro') {
        totalDinheiro -= val;
      }
    }
  });

  const saldoLiquido = totalEntradas - totalSaidas;
  
  // 1. Cálculo do Repasse da Matriz / Sede
  const repasseAtivo = aplicarRepasse !== false;
  const pctMatriz = repasseAtivo ? Math.max(0, porcentagemMatriz ?? 20) : 0;
  const valorMatriz = repasseAtivo ? (baseCalculoMatriz * pctMatriz) / 100 : 0;

  // 2. Cálculo da Base e Valor da Prebenda Pastoral
  const prebendaAtiva = aplicarPrebenda === true || (aplicarPrebenda !== false && (porcentagemPrebenda ?? 0) > 0);
  const pctPrebenda = prebendaAtiva ? Math.max(0, porcentagemPrebenda ?? 0) : 0;

  // Se deduzirMatrizBasePrebenda estiver ativo: Base = (Entradas Selecionadas - Valor da Matriz)
  const baseCalculoPrebenda = deduzirMatrizBasePrebenda
    ? Math.max(0, baseEntradasPrebenda - valorMatriz)
    : baseEntradasPrebenda;

  const valorPrebenda = prebendaAtiva ? (baseCalculoPrebenda * pctPrebenda) / 100 : 0;

  // Fórmula do Saldo Disponível em Caixa Local: [Saldo Disponível = Entradas - Saídas - Repasse Matriz - Prebenda Pastoral]
  const saldoDisponivel = totalEntradas - totalSaidas - valorMatriz - valorPrebenda;
  const saldoCongregacao = saldoDisponivel;

  return {
    totalEntradas,
    totalSaidas,
    saldoLiquido,
    aplicarRepasseMatriz: repasseAtivo,
    tipoBaseRepasse,
    categoriasRepasse: catsAtivasRepasse,
    baseCalculoMatriz,
    porcentagemMatriz: pctMatriz,
    valorMatriz,
    aplicarPrebenda: prebendaAtiva,
    tipoBasePrebenda,
    categoriasPrebenda: catsAtivasPrebenda,
    baseEntradasPrebenda,
    deduzirMatrizBasePrebenda,
    baseCalculoPrebenda,
    porcentagemPrebenda: pctPrebenda,
    valorPrebenda,
    saldoDisponivel,
    saldoCongregacao,
    totalDizimos,
    totalOfertasCulto,
    totalOfertasMissoes,
    totalOfertasEspeciais,
    totalDoacoes,
    totalOutrasEntradas,
    totalDinheiro,
    totalPix,
    totalCartaoDebito,
    totalCartaoCredito,
    totalTransferencia,
  };
}

export const CULTOS_LIST = [
  'Fechamento de Caixa'
];
