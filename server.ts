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
Analise os seguintes dados do fechamento de caixa do culto e elabore um **Relatório Oficial da Tesouraria da Igreja** bem formatado em Markdown, pronto para ser lido no culto administrativo ou apresentado ao Pastor Presidente e Conselho Fiscal.

DADOS DO CULTO E FECHAMENTO:
${JSON.stringify(fechamentoData, null, 2)}

INSTRUÇÕES DO RELATÓRIO:
1. **Cabeçalho Formal**: Nome da Igreja, Período do Fechamento de Caixa (Data Inicial até Data Final) e Tesoureiro Responsável.
2. **Resumo Financeiro Executivo**:
   - Total Arrecadado em Dízimos
   - **Relação de Dizimistas (Opcional/Discriminação)**: Se houver nomes de dizimistas informados nos lançamentos, inclua a lista com os nomes dos dizimistas, forma de pagamento e valor individual.
   - Total Arrecadado em Ofertas (Oferta Geral, Missões, Especial)
   - Distribuição por Forma de Pagamento (Espécie/Dinheiro, Pix, Cartão/Transferência)
   - **Discriminação Detalhada de Cada Saída/Despesa**: Liste obrigatoriamente cada saída realizada com sua categoria exata e descrição (ex: Conta de Água, Conta de Luz, Internet, Alimentação/Lanche, Aluguel do Templo, Manutenção, etc.) e o respectivo valor.
   - Total Geral de Saídas
   - Saldo Líquido do Caixa (Entradas - Saídas)
   - **Porcentagem e Repasse para a Matriz / Sede**: Se a opção aplicarRepasseMatriz for verdadeira (ou true), destaque a porcentagem configurada e o valor exato a ser enviado para a Matriz (Sede), e o Saldo Final Remanescente da Congregação Local. Se a opção aplicarRepasseMatriz for falsa, informe explicitamente que este fechamento é isento / não possui repasse para a Matriz e o saldo total pertence à congregação.
3. **Análise de Conferência do Caixa Físico (Espécie)**:
   - Compare o valor lançado em Dinheiro vs o Total Contado na Calculadora de Cédulas e Moedas.
   - Diga se o caixa fechou exato, com sobra ou com falta em dinheiro físico.
4. **Anotações de Transparência e Parecer da Tesouraria**: Mensagem e encerramento agradecendo a fidelidade dos dízimos e ofertas da igreja.
5. **Campo de Assinaturas Oficiais**: Inclua obrigatoriamente as linhas de assinatura para apenas: **Pastor Presidente**, **Tesoureiro** e **Pastor Local**.

Responda em Português do Brasil com excelente clareza, formatação impecável em Markdown (usando tabelas, tópicos e negritos).
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        systemInstruction: "Você é um auditor e assistente financeiro especializado em tesouraria de igrejas evangélicas e cristãs.",
        temperature: 0.3,
      },
    });

    return res.json({ report: response.text || "Relatório não gerado." });
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
