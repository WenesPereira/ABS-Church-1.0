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

/**
 * Retorna o rótulo formatado da base de cálculo do repasse da matriz.
 * Ex: 'Somente Dízimos', 'Toda a Entrada' ou 'Dízimos + Ofertas de Culto'
 */
export function formatBaseMatrizLabel(
  tipoBase: 'todas' | 'selecionadas' = 'todas',
  categorias: CategoriaEntrada[] = ALL_ENTRADA_CATEGORIES
): string {
  if (tipoBase === 'todas' || !categorias || categorias.length === 0 || categorias.length === ALL_ENTRADA_CATEGORIES.length) {
    return 'Toda a Entrada';
  }
  if (categorias.length === 1 && categorias[0] === 'dizimo') {
    return 'Somente Dízimos';
  }
  return categorias.map((cat) => CATEGORIA_ENTRADA_LABELS[cat] || cat).join(' + ');
}

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

  const totalEntradasSemRepasse = Math.max(0, totalEntradas - baseCalculoMatriz);
  const rotuloBaseMatriz = formatBaseMatrizLabel(tipoBaseRepasse, catsAtivasRepasse);

  return {
    totalEntradas,
    totalSaidas,
    saldoLiquido,
    aplicarRepasseMatriz: repasseAtivo,
    tipoBaseRepasse,
    categoriasRepasse: catsAtivasRepasse,
    baseCalculoMatriz,
    totalEntradasSemRepasse,
    rotuloBaseMatriz,
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

export const DEFAULT_RELATORIO_CATEGORIAS: CategoriaEntrada[] = ['dizimo'];

export function getCategoriasRelatorioAtivas(
  categoriasRelatorio?: CategoriaEntrada[],
  fallbackDefault: CategoriaEntrada[] = DEFAULT_RELATORIO_CATEGORIAS
): CategoriaEntrada[] {
  if (!categoriasRelatorio || !Array.isArray(categoriasRelatorio) || categoriasRelatorio.length === 0) {
    return fallbackDefault.includes('dizimo') ? fallbackDefault : ['dizimo', ...fallbackDefault];
  }
  // Dízimos é sempre obrigatório e fixo
  if (!categoriasRelatorio.includes('dizimo')) {
    return ['dizimo', ...categoriasRelatorio];
  }
  return categoriasRelatorio;
}

export function calcularResumoRelatorio(
  resumoGeral: ReturnType<typeof calcularResumoLancamentos>,
  categoriasRelatorioAtivas: CategoriaEntrada[]
) {
  const catsAtivas = getCategoriasRelatorioAtivas(categoriasRelatorioAtivas);

  const getValorCategoria = (cat: CategoriaEntrada) => {
    if (cat === 'dizimo') return resumoGeral.totalDizimos;
    if (cat === 'oferta_culto') return resumoGeral.totalOfertasCulto;
    if (cat === 'oferta_missoes') return resumoGeral.totalOfertasMissoes;
    if (cat === 'oferta_especial') return resumoGeral.totalOfertasEspeciais;
    if (cat === 'doacao') return resumoGeral.totalDoacoes;
    return resumoGeral.totalOutrasEntradas;
  };

  const totalEntradasRelatorio = catsAtivas.reduce(
    (acc, cat) => acc + (getValorCategoria(cat) || 0),
    0
  );

  const totalSaidasRelatorio = resumoGeral.totalSaidas;
  const saldoLiquidoRelatorio = totalEntradasRelatorio - totalSaidasRelatorio;

  // Repasse Matriz incidindo sobre as categorias ativas no relatório
  let baseMatrizRelatorio = 0;
  if (resumoGeral.aplicarRepasseMatriz) {
    catsAtivas.forEach((cat) => {
      if (resumoGeral.tipoBaseRepasse === 'todas' || resumoGeral.categoriasRepasse.includes(cat)) {
        baseMatrizRelatorio += getValorCategoria(cat);
      }
    });
  }
  const valorMatrizRelatorio = resumoGeral.aplicarRepasseMatriz
    ? (baseMatrizRelatorio * resumoGeral.porcentagemMatriz) / 100
    : 0;

  // Prebenda Pastoral incidindo sobre as categorias ativas no relatório
  let baseEntradasPrebendaRelatorio = 0;
  if (resumoGeral.aplicarPrebenda) {
    catsAtivas.forEach((cat) => {
      if (resumoGeral.tipoBasePrebenda === 'todas' || resumoGeral.categoriasPrebenda.includes(cat)) {
        baseEntradasPrebendaRelatorio += getValorCategoria(cat);
      }
    });
  }
  const basePrebendaRelatorio = resumoGeral.deduzirMatrizBasePrebenda
    ? Math.max(0, baseEntradasPrebendaRelatorio - valorMatrizRelatorio)
    : baseEntradasPrebendaRelatorio;

  const valorPrebendaRelatorio = resumoGeral.aplicarPrebenda
    ? (basePrebendaRelatorio * resumoGeral.porcentagemPrebenda) / 100
    : 0;

  const saldoDisponivelRelatorio =
    totalEntradasRelatorio - totalSaidasRelatorio - valorMatrizRelatorio - valorPrebendaRelatorio;

  return {
    categoriasAtivas: catsAtivas,
    totalEntradasRelatorio,
    totalSaidasRelatorio,
    saldoLiquidoRelatorio,
    baseMatrizRelatorio,
    valorMatrizRelatorio,
    basePrebendaRelatorio,
    valorPrebendaRelatorio,
    saldoDisponivelRelatorio,
  };
}
