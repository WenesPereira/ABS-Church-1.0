import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada. Defina no painel Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "Fechamento de Caixa de Igreja", timestamp: new Date().toISOString() });
});

// Endpoint de Auditoria e Relatório de Fechamento de Caixa da Igreja com IA Gemini
app.post("/api/gemini/church-report", async (req, res) => {
  try {
    const { fechamentoData } = req.body;

    if (!fechamentoData) {
      return res.status(400).json({ error: "Dados do fechamento de caixa são obrigatórios." });
    }

    const ai = getAIClient();

    const promptText = `
Você é um auditor fiscal de tesouraria de igrejas cristãs experiente, zeloso, ético e transparente.
Elabore um **Relatório Oficial da Tesouraria da Igreja** com padrão visual LIMPO, EXECUTIVO, DIRETO e SEM POLUIÇÃO visual.

DADOS BRUTOS DO FECHAMENTO:
${JSON.stringify(fechamentoData, null, 2)}

DIRETRIZES FUNDAMENTAIS DE FORMATAÇÃO E APRESENTAÇÃO (ESTRITAMENTE OBRIGATÓRIAS):
1. **NUNCA EXIBA NOMES DE VARIÁVEIS DE CÓDIGO OU BOOLEANOS BRUTOS**:
   - NUNCA escreva expressões como 'aplicarRepasseMatriz: true', 'aplicarPrebenda: false', 'fechamentoData', 'null' ou 'undefined'.
   - Escreva sempre em linguagem formal e natural:
     * Para repasse à sede: "Repasse à Matriz: Ativo (50%) - Valor: R$ X,XX" ou "Repasse à Matriz: Isento / Não Aplicável".
     * Para prebenda pastoral: "Prebenda Pastoral: Ativa (X%) - Valor: R$ Y,YY" ou "Prebenda Pastoral: Não Aplicada".

2. **NUNCA EXIBA FÓRMULAS MATEMÁTICAS EM CÓDIGO LATEX OU CONTAGEM UNITÁRIA DE NOTAS**:
   - NÃO utilize blocos LaTeX ($$...$$).
   - NUNCA detalhe nota por nota ou moeda por moeda de troco (ex: "10 x R$ 50 + 4 x R$ 20...").
   - Mostre apenas a síntese consolidada direta:
     "Total Físico Apurado: R$ 727,40 (Cédulas: R$ 724,00 | Moedas: R$ 3,40)".

3. **TABELAS DE RECEITAS E DESPESAS ENXUTAS (FILTRO > R$ 0,00)**:
   - Exiba nas tabelas EXCLUSIVAMENTE as categorias e itens que tiveram movimentação superior a R$ 0,00.
   - OCULTE E NUNCA exiba linhas com valor zerado (R$ 0,00).
   - Se houver nomes de dizimistas informados, relacione-os sucintamente com nome, forma e valor.
   - Liste as despesas com sua respectiva categoria e descrição somente se valor > 0.

4. **FORMAS DE PAGAMENTO AGRUPADAS**:
   - Agrupe as formas de pagamento em um resumo direto (ex: Dinheiro/Espécie: R$ X,XX | Pix: R$ Y,YY | Cartão/Transferência: R$ Z,ZZ) em vez de criar tópicos extensos.

ESTRUTURA DO RELATÓRIO (DIVIDIDO ESTRITAMENTE EM 4 BLOCOS OBJETIVOS):

### 1. Cabeçalho e Resumo Financeiro
- Título: Relatório Oficial de Fechamento de Caixa
- Igreja: ${fechamentoData.nomeIgreja || 'ABS CHURCH'}
- Período: ${fechamentoData.dataInicio || fechamentoData.data || 'Data Inicial'} a ${fechamentoData.dataFim || fechamentoData.data || 'Data Final'}
- Tabela enxuta de Entradas (apenas itens > R$ 0,00)
- Tabela enxuta de Saídas / Despesas (apenas itens > R$ 0,00)
- Resumo agrupado das Formas de Pagamento
- Totais Consolidados:
  * Total de Entradas
  * Total de Saídas
  * Repasse à Matriz (Percentual e Valor, ou "Isento")
  * Prebenda Pastoral (Percentual e Valor, ou "Não Aplicada")
  * **Saldo Final Disponível em Caixa Local**

### 2. Apuração do Caixa Físico
- Comparativo direto entre Lançado no Sistema x Contado na Tesouraria:
  * Total Lançado em Dinheiro (Espécie)
  * Total Físico Apurado na Contagem (Cédulas + Moedas consolidadas)
  * Resultado da Conferência: Conclusão direta (Caixa Exato / Sobra de R$ X,XX / Inconsistência de Falta de R$ X,XX).

### 3. Parecer Sintético e Recomendações
- Parecer conciso de auditoria avaliando a integridade dos lançamentos, regularidade das deduções e saúde financeira da igreja.
- Recomendações pontuais e diretas de governança.
- Conclusão com a expressão formal: "Expressamos nossa gratidão pela fidelidade dos membros e pelo zelo na administração dos recursos." (NUNCA utilize 'Exgressamos', 'Orientação Auditiva' ou 'inconsciência').

### 4. Assinaturas
- Linhas de assinatura para:
  * **Tesoureiro Responsável**
  * **Pastor Responsável**
(Sem repetição de cabeçalho ou dados redundantes).

Responda em Português do Brasil com excelente clareza, rigor gramatical e formatação limpa e executiva em Markdown.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        systemInstruction: "Você é um auditor e assistente financeiro especializado em tesouraria de igrejas evangélicas e cristãs. Use sempre os termos corretos em português: 'Expressamos', 'Orientação de Auditoria', 'inconsistência'.",
        temperature: 0.2,
      },
    });

    let reportText = response.text || "Relatório não gerado.";

    // Higienização e correções ortográficas obrigatórias
    reportText = reportText
      .replace(/Exgressamos/gi, "Expressamos")
      .replace(/Orientação Auditiva/gi, "Orientação de Auditoria")
      .replace(/Orientacao Auditiva/gi, "Orientação de Auditoria")
      .replace(/orientação auditiva/gi, "orientação de auditoria")
      .replace(/orientacao auditiva/gi, "orientação de auditoria")
      .replace(/inconsciência/gi, "inconsistência")
      .replace(/inconsciencia/gi, "inconsistência")
      .replace(/Inconsciência/gi, "Inconsistência")
      .replace(/Inconsciencia/gi, "Inconsistência")
      .replace(/aplicarRepasseMatriz:\s*true/gi, "Repasse à Matriz: Ativo")
      .replace(/aplicarRepasseMatriz:\s*false/gi, "Repasse à Matriz: Isento")
      .replace(/aplicarPrebenda:\s*true/gi, "Prebenda Pastoral: Ativa")
      .replace(/aplicarPrebenda:\s*false/gi, "Prebenda Pastoral: Não Aplicada");

    return res.json({ report: reportText });
  } catch (error: any) {
    console.error("Erro no relatório de caixa da igreja:", error);
    return res.status(500).json({ error: error.message || "Erro ao processar relatório da tesouraria." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor de Fechamento de Caixa da Igreja rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
