import { FechamentoCulto, ConfigIgreja, User, Contributor } from '../types';

export const DEMO_USER: User = {
  id: 'demo-user-session',
  email: 'demo@tesourariapro.com',
  nome: 'Lucas Silveira (Visitante)',
  cargo: 'Tesoureiro (Modo Demonstração)',
  nomeIgreja: 'Igreja Batista Esperança Central',
  createdAt: '2026-08-01T10:00:00Z',
  subscriptionStatus: 'active',
  subscriptionPlan: 'pro_demo',
  subscriptionExpiresAt: 'Acesso Demonstração',
  isDemo: true,
};

export const DEMO_CONTRIBUTORS: Contributor[] = [
  {
    id: 'contrib-1',
    userId: 'demo-user-session',
    name: 'Roberto da Silva',
    phone: '11988887777',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'contrib-2',
    userId: 'demo-user-session',
    name: 'Maria Helena Costa',
    phone: '11977776666',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'contrib-3',
    userId: 'demo-user-session',
    name: 'Paulo César Lima',
    phone: '11966665555',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'contrib-4',
    userId: 'demo-user-session',
    name: 'Família Mendes',
    phone: '11955554444',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'contrib-5',
    userId: 'demo-user-session',
    name: 'Diácono Anderson Souza',
    phone: '11944443333',
    createdAt: '2026-08-02T10:00:00Z',
  },
];

export const DEMO_CONFIG: ConfigIgreja = {
  nomeIgreja: 'Igreja Batista Esperança Central',
  cnpj: '12.345.678/0001-90',
  cidadeUF: 'São Paulo - SP',
  pastorPresidente: 'Pastor Carlos Eduardo Santos',
  pastorLocal: 'Pastor Marcos Oliveira',
  tesoureiroPadrao: 'Lucas Silveira (Visitante)',
  segundoTesoureiroPadrao: 'Obreiro Daniel Ferreira',
  porcentagemMatriz: 20,
  aplicarRepasseMatriz: true,
  tipoBaseRepasseMatriz: 'todas',
  categoriasRepasseMatriz: ['dizimo', 'oferta_culto', 'doacao'],
  porcentagemPrebenda: 10,
  aplicarPrebenda: true,
  whatsappSuporte: '5511999999999',
  emailSuporte: 'suporte@tesouraria.com',
  apkDownloadUrl: 'https://drive.google.com',
};

export const DEMO_FECHAMENTOS: FechamentoCulto[] = [
  {
    id: 'demo-fechamento-atual',
    nomeIgreja: 'Igreja Batista Esperança Central',
    data: '2026-08-17',
    hora: '19:00',
    tipoCulto: 'Culto de Celebração e Gratidão',
    pregador: 'Pr. Marcos Oliveira',
    passagemBiblica: '2 Coríntios 9:6-15',
    qtdMembros: 165,
    qtdVisitantes: 18,
    tesoureiro: 'Lucas Silveira (Visitante)',
    segundaTestemunha: 'Obreiro Daniel Ferreira',
    porcentagemMatriz: 20,
    aplicarRepasseMatriz: true,
    tipoBaseRepasseMatriz: 'todas',
    porcentagemPrebenda: 10,
    aplicarPrebenda: true,
    observacoes: 'Culto abençoado com boa arrecadação de dízimos e ofertas missionárias.',
    status: 'aberto',
    criadoEm: '2026-08-17T18:30:00Z',
    contagemDinheiro: {
      c200: 2,  // 400
      c100: 14, // 1400
      c50: 20,  // 1000
      c20: 25,  // 500
      c10: 30,  // 300
      c5: 20,   // 100
      c2: 15,   // 30
      m100: 20, // 20
      m050: 10, // 5
      m025: 8,  // 2
      m010: 10, // 1
      m005: 0,
    },
    lancamentos: [
      {
        id: 'demo-l1',
        tipo: 'entrada',
        categoria: 'dizimo',
        descricao: 'Dízimo Família Silva',
        valor: 950.0,
        formaPagamento: 'pix',
        nomePessoa: 'Roberto da Silva',
        contributorId: 'contrib-1',
        contributorName: 'Roberto da Silva',
        contributorPhone: '11988887777',
        receiptNumber: '000101',
        data: '2026-08-17',
      },
      {
        id: 'demo-l2',
        tipo: 'entrada',
        categoria: 'dizimo',
        descricao: 'Dízimo Irmã Maria Helena',
        valor: 420.0,
        formaPagamento: 'dinheiro',
        nomePessoa: 'Maria Helena Costa',
        contributorId: 'contrib-2',
        contributorName: 'Maria Helena Costa',
        contributorPhone: '11977776666',
        receiptNumber: '000102',
        data: '2026-08-17',
      },
      {
        id: 'demo-l3',
        tipo: 'entrada',
        categoria: 'dizimo',
        descricao: 'Dízimo Diácono Paulo César',
        valor: 1350.0,
        formaPagamento: 'transferencia',
        nomePessoa: 'Paulo César Lima',
        contributorId: 'contrib-3',
        contributorName: 'Paulo César Lima',
        contributorPhone: '11966665555',
        receiptNumber: '000103',
        data: '2026-08-17',
      },
      {
        id: 'demo-l4',
        tipo: 'entrada',
        categoria: 'oferta_culto',
        descricao: 'Oferta Geral das Salvas no Templo',
        valor: 1888.0,
        formaPagamento: 'dinheiro',
        data: '2026-08-17',
      },
      {
        id: 'demo-l5',
        tipo: 'entrada',
        categoria: 'oferta_missoes',
        descricao: 'Oferta Especial para o Campo Missionário',
        valor: 750.0,
        formaPagamento: 'pix',
        nomePessoa: 'Oferta Anônima de Missões',
        data: '2026-08-17',
      },
      {
        id: 'demo-l6',
        tipo: 'saida',
        categoria: 'alimentacao',
        descricao: 'Lanche e Café para Recepção e Visitantes',
        valor: 120.0,
        formaPagamento: 'dinheiro',
        nomePessoa: 'Irmã Claudete',
        data: '2026-08-17',
      },
      {
        id: 'demo-l7',
        tipo: 'saida',
        categoria: 'material_ebd',
        descricao: 'Revistas e Materiais da Escola Bíblica',
        valor: 240.0,
        formaPagamento: 'pix',
        data: '2026-08-17',
      },
      {
        id: 'demo-l8',
        tipo: 'saida',
        categoria: 'manutencao',
        descricao: 'Substituição de Cabos e Microfone Sem Fio',
        valor: 180.0,
        formaPagamento: 'dinheiro',
        nomePessoa: 'Eletro Som Tech',
        data: '2026-08-17',
      },
    ],
    relatorioIA: `**PARECER EXECUTIVO DE TESOURARIA - MODO DEMO**
--------------------------------------------------
**Igreja:** Igreja Batista Esperança Central
**Culto:** Culto de Celebração e Gratidão | **Data:** 17/08/2026

**1. RESUMO FINANCEIRO:**
- **Total de Entradas:** R$ 5.358,00
- **Total de Saídas / Despesas:** R$ 540,00
- **Saldo Líquido:** R$ 4.818,00
- **Repasse Matriz (20%):** R$ 1.071,60
- **Saldo Disponível em Caixa Local:** R$ 3.746,40

**2. DESTAQUES DE ARRECADAÇÃO:**
- As entradas por PIX representaram expressivos 31,7% do total, demonstrando boa adesão dos membros às transferências digitais instantâneas.
- A contagem de dinheiro físico em notas e moedas conferiu perfeitamente com os lançamentos manuais em espécie.

**3. RECOMENDAÇÕES DA IA:**
- Manter a reserva do repasse de missões (R$ 750,00) em conta segregada para envio pontual ao departamento de missões da sede.
- Os comprovantes das saídas com manutenção e EBD foram catalogados e conferidos.`,
  },
  {
    id: 'demo-fechamento-anterior',
    nomeIgreja: 'Igreja Batista Esperança Central',
    data: '2026-08-10',
    hora: '19:30',
    tipoCulto: 'Culto de Doutrina e Ensino',
    pregador: 'Pr. Carlos Eduardo Santos',
    passagemBiblica: 'Mateus 6:19-24',
    qtdMembros: 120,
    qtdVisitantes: 12,
    tesoureiro: 'Lucas Silveira (Visitante)',
    segundaTestemunha: 'Obreiro Daniel Ferreira',
    porcentagemMatriz: 20,
    observacoes: 'Fechamento concluído com sucesso e conferência aprovada.',
    status: 'fechado',
    criadoEm: '2026-08-10T19:00:00Z',
    fechadoEm: '2026-08-10T21:45:00Z',
    contagemDinheiro: {
      c200: 1,
      c100: 8,
      c50: 12,
      c20: 15,
      c10: 10,
      c5: 10,
      c2: 5,
      m100: 10,
      m050: 4,
      m025: 4,
      m010: 0,
      m005: 0,
    },
    lancamentos: [
      {
        id: 'demo-ant-1',
        tipo: 'entrada',
        categoria: 'dizimo',
        descricao: 'Dízimo Família Mendes',
        valor: 780.0,
        formaPagamento: 'pix',
        data: '2026-08-10',
      },
      {
        id: 'demo-ant-2',
        tipo: 'entrada',
        categoria: 'oferta_culto',
        descricao: 'Ofertas Gerais de Ensino',
        valor: 1288.0,
        formaPagamento: 'dinheiro',
        data: '2026-08-10',
      },
      {
        id: 'demo-ant-3',
        tipo: 'saida',
        categoria: 'luz',
        descricao: 'Conta de Energia Elétrica do Templo',
        valor: 380.0,
        formaPagamento: 'pix',
        data: '2026-08-10',
      },
    ],
  },
];

export const INITIAL_CONFIG = DEMO_CONFIG;
export const INITIAL_FECHAMENTOS = DEMO_FECHAMENTOS;
