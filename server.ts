import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// Supabase Admin Client no Backend
const defaultSupabaseUrl = "https://ikizzszskfpafdppupgc.supabase.co";
const defaultSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlraXp6c3pza2ZwYWZkcHB1cGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMzM0NzksImV4cCI6MjEwMTcwOTQ3OX0.pPlhTo9toQzbrA8b_mGJdDJd10KBcSp4f8L8W3_oK10";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || defaultSupabaseUrl;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  defaultSupabaseAnonKey;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Cache em memória para pagamentos Pix simulados/locais caso token não esteja configurado
const localPaymentStore = new Map<string, any>();

/**
 * Atualiza o status de assinatura do usuário no Supabase para 'active'
 */
async function activateUserSubscription(
  userIdOrRef?: string,
  email?: string,
  paymentId?: string | number
): Promise<boolean> {
  try {
    const now = new Date();
    let baseDate = now;

    // Se tiver supabaseAdmin configurado, busca se a conta já possui uma data de expiração futura
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin.from("profiles").select("subscription_expires_at");
        if (userIdOrRef) {
          query = query.or(`id.eq.${userIdOrRef},user_id.eq.${userIdOrRef}`);
        } else if (email) {
          query = query.eq("email", email.trim().toLowerCase());
        }
        const { data: rows } = await query.limit(1);
        if (rows && rows[0]?.subscription_expires_at) {
          const currentExp = new Date(rows[0].subscription_expires_at);
          if (currentExp.getTime() > now.getTime()) {
            baseDate = currentExp;
          }
        }
      } catch (checkErr) {
        console.warn("[Mercado Pago] Aviso ao consultar expiração existente:", checkErr);
      }
    }

    const expiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    const baseUpdate: Record<string, any> = {
      has_paid: true,
      subscription_status: "active",
      status: "active",
      status_assinatura: "ativo",
      subscription_plan: "mensal",
      subscription_expires_at: expiresAt,
      updated_at: nowIso,
    };

    if (paymentId) {
      baseUpdate.mp_payment_id = String(paymentId);
    }

    let updated = false;

    // 1. Tenta atualizar pelo ID de usuário
    if (userIdOrRef) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update(baseUpdate)
        .or(`id.eq.${userIdOrRef},user_id.eq.${userIdOrRef}`)
        .select();

      if (!error && data && data.length > 0) {
        console.log(`[Mercado Pago] Assinatura ativada no Supabase para o usuário ID: ${userIdOrRef}`);
        return true;
      }
    }

    // 2. Se não encontrou por ID, tenta por e-mail
    if (email) {
      const { data: dataEmail, error: errEmail } = await supabaseAdmin
        .from("profiles")
        .update(baseUpdate)
        .eq("email", email.trim().toLowerCase())
        .select();

      if (!errEmail && dataEmail && dataEmail.length > 0) {
        console.log(`[Mercado Pago] Assinatura ativada no Supabase para o e-mail: ${email}`);
        return true;
      }
    }

    // Se a coluna mp_payment_id não existir na tabela profiles, tenta sem ela
    delete baseUpdate.mp_payment_id;

    if (userIdOrRef) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .update(baseUpdate)
        .or(`id.eq.${userIdOrRef},user_id.eq.${userIdOrRef}`)
        .select();

      if (data && data.length > 0) return true;
    }

    if (email) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .update(baseUpdate)
        .eq("email", email.trim().toLowerCase())
        .select();

      if (data && data.length > 0) return true;
    }

    console.warn(`[Mercado Pago] Perfil não encontrado no Supabase para userId=${userIdOrRef}, email=${email}`);
    return false;
  } catch (err) {
    console.error("[Mercado Pago] Erro ao ativar assinatura no Supabase:", err);
    return false;
  }
}

// Endpoint Administrativo para Alteração Manual de Status de Assinatura
app.post("/api/admin/set-user-status", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { identifier, status = "ativo", days = 35 } = req.body || {};

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return res.status(400).json({ error: "Identificador (e-mail ou ID do usuário) é obrigatório." });
    }

    const cleanIdentifier = identifier.trim();
    const isAtivo = status.toLowerCase() === "ativo" || status.toLowerCase() === "active";
    const statusAssinatura = isAtivo ? "ativo" : "pendente";
    const subStatus = isAtivo ? "active" : "inactive";

    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + (isAtivo ? Number(days) || 35 : 0));
    const expiresIso = isAtivo ? expiresDate.toISOString() : null;
    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      status_assinatura: statusAssinatura,
      subscription_status: subStatus,
      subscription_plan: isAtivo ? "mensal" : "gratuito",
      subscription_expires_at: expiresIso,
      updated_at: nowIso,
    };

    if (!supabaseAdmin) {
      return res.json({
        success: true,
        mock: true,
        message: `Status atualizado localmente para '${statusAssinatura}' (Chave Supabase Admin não configurada).`,
        status: statusAssinatura,
      });
    }

    let updatedRows: any[] = [];
    let updateError: any = null;

    // 1. Tenta atualizar por email
    if (cleanIdentifier.includes("@")) {
      const result = await supabaseAdmin
        .from("profiles")
        .update(updatePayload)
        .ilike("email", cleanIdentifier.toLowerCase())
        .select();

      if (!result.error && result.data && result.data.length > 0) {
        updatedRows = result.data;
      } else {
        updateError = result.error;
      }
    }

    // 2. Se não encontrou ou não é email, tenta por id / user_id
    if (updatedRows.length === 0) {
      const result = await supabaseAdmin
        .from("profiles")
        .update(updatePayload)
        .or(`id.eq.${cleanIdentifier},user_id.eq.${cleanIdentifier}`)
        .select();

      if (!result.error && result.data && result.data.length > 0) {
        updatedRows = result.data;
      } else if (!updateError) {
        updateError = result.error;
      }
    }

    // 3. Se deu erro de coluna adicional inexistente, tenta update mínimo apenas com status_assinatura
    if (updatedRows.length === 0) {
      const minPayload = {
        status_assinatura: statusAssinatura,
        updated_at: nowIso,
      };

      if (cleanIdentifier.includes("@")) {
        const resultMin = await supabaseAdmin
          .from("profiles")
          .update(minPayload)
          .ilike("email", cleanIdentifier.toLowerCase())
          .select();

        if (!resultMin.error && resultMin.data && resultMin.data.length > 0) {
          updatedRows = resultMin.data;
        }
      } else {
        const resultMin = await supabaseAdmin
          .from("profiles")
          .update(minPayload)
          .or(`id.eq.${cleanIdentifier},user_id.eq.${cleanIdentifier}`)
          .select();

        if (!resultMin.error && resultMin.data && resultMin.data.length > 0) {
          updatedRows = resultMin.data;
        }
      }
    }

    if (updatedRows.length > 0) {
      console.log(`[Admin] Status de assinatura do usuário ${cleanIdentifier} alterado manualmente para '${statusAssinatura}'.`);
      return res.json({
        success: true,
        message: `Status do usuário atualizado para '${statusAssinatura}' com sucesso no Supabase!`,
        user: updatedRows[0],
      });
    }

    return res.status(404).json({
      success: false,
      error: `Usuário '${cleanIdentifier}' não encontrado na tabela profiles do Supabase.`,
      details: updateError,
    });
  } catch (err: any) {
    console.error("[Admin] Erro ao alterar status manualmente:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Erro interno ao atualizar status do usuário.",
    });
  }
});

// Endpoint Administrativo para listar perfis cadastrados no Supabase
app.get("/api/admin/list-profiles", async (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    if (!supabaseAdmin) {
      return res.json({ profiles: [] });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id, email, nome, nome_igreja, cargo, status_assinatura, subscription_status, subscription_expires_at, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: error.message, profiles: [] });
    }

    return res.json({ profiles: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, profiles: [] });
  }
});

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

/* =========================================================
   ROTAS DE PAGAMENTO & ASSINATURA MERCADO PAGO (PIX & CARTÃO)
   ========================================================= */

const handleCreatePix = async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { userId, email, nome, valor, cpf, docNumber, description } = req.body || {};
    
    // Prioriza tokens de produção (APP_USR-...) se houver múltiplas variáveis
    const candidateTokens = [
      process.env.MERCADOPAGO_ACCESS_TOKEN,
      process.env.MERCADO_PAGO_ACCESS_TOKEN,
      process.env.MP_ACCESS_TOKEN,
    ].filter(Boolean).map(t => (t as string).trim());

    const mpToken =
      candidateTokens.find(t => t.startsWith("APP_USR-")) ||
      candidateTokens[0] ||
      "";

    if (mpToken.startsWith("TEST-")) {
      console.warn("[Mercado Pago Server] AVISO: Usando credencial TEST do Mercado Pago. Para pagamentos reais em produção configure APP_USR-...");
    }

    const amount = Number(valor) || 19.9;
    const cleanDoc = (docNumber || cpf || '').replace(/\D/g, '');

    const payerEmail = (email && email.includes("@")) ? email.trim() : "pastor@igreja.com";
    const fullName = (nome || "Pastor Responsavel").trim();
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "Pastor";
    const lastName = nameParts.slice(1).join(" ") || "Tesoureiro";

    const finalUserId = String(userId || req.body?.user_id || req.body?.id || '').trim();

    // Se o token do Mercado Pago estiver configurado, chama a API oficial
    if (mpToken && mpToken.trim().length > 10) {
      console.log(`[Mercado Pago] Gerando cobrança Pix real de R$ ${amount} para user_id=${finalUserId || 'anon'}...`);
      
      const payload: Record<string, any> = {
        transaction_amount: amount,
        description: description || "Assinatura Mensal - Tesouraria da Igreja Pro",
        payment_method_id: "pix",
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
          identification: cleanDoc
            ? {
                type: cleanDoc.length > 11 ? "CNPJ" : "CPF",
                number: cleanDoc,
              }
            : undefined,
        },
        external_reference: finalUserId || `user-${Date.now()}`,
        notification_url: "https://abschurch.com.br/.netlify/functions/mercadopago-webhook",
      };

      const idempotencyKey = `pix-${userId || Date.now()}-${Date.now()}`;

      const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpToken.trim()}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const mpData = await mpResponse.json();

      if (!mpResponse.ok) {
        console.error("[Mercado Pago] Erro retornado pela API:", mpData);
        return res.status(mpResponse.status).json({
          error: mpData.message || "Erro ao gerar Pix no Mercado Pago",
          details: mpData,
        });
      }

      const pointOfInteraction = mpData.point_of_interaction?.transaction_data;
      const paymentId = String(mpData.id);

      localPaymentStore.set(paymentId, {
        id: paymentId,
        status: mpData.status || "pending",
        userId: userId || payerEmail,
        email: payerEmail,
        amount,
        createdAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        paymentId,
        status: mpData.status || "pending",
        statusDetail: mpData.status_detail,
        qrCode: pointOfInteraction?.qr_code || "",
        qrCodeBase64: pointOfInteraction?.qr_code_base64 || "",
        ticketUrl: pointOfInteraction?.ticket_url || "",
        expiresAt: mpData.date_of_expiration,
        amount,
      });
    }

    // Se o token ainda não foi inserido nas variáveis de ambiente,
    // gera uma estrutura com QR Code Pix demonstrativo funcional para visualização e testes
    console.log("[Mercado Pago] Aviso: MERCADOPAGO_ACCESS_TOKEN não configurado no .env. Gerando Pix demonstrativo.");
    
    const mockPaymentId = `DEMO-PIX-${Date.now()}`;
    const mockPixCopiaECola = `00020126580014br.gov.bcb.pix0136tesourariapro-${Date.now()}@mercadopago.com520400005303986540519.905802BR5925Tesouraria da Igreja Pro6009Sao Paulo62070503***6304`;
    
    const mockQrCodeBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    localPaymentStore.set(mockPaymentId, {
      id: mockPaymentId,
      status: "pending",
      userId: userId || payerEmail,
      email: payerEmail,
      amount,
      isDemo: true,
      createdAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      paymentId: mockPaymentId,
      status: "pending",
      statusDetail: "pending_waiting_transfer",
      qrCode: mockPixCopiaECola,
      qrCodeBase64: mockQrCodeBase64,
      ticketUrl: "https://www.mercadopago.com.br",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      amount,
      isDemo: true,
      notice: "Para processar pagamentos reais na sua conta, informe MERCADOPAGO_ACCESS_TOKEN nas configurações do aplicativo.",
    });
  } catch (err: any) {
    console.error("[Mercado Pago] Erro inesperado ao criar Pix:", err);
    return res.status(500).json({ error: err.message || "Erro interno ao processar Pix." });
  }
};

/**
 * Criação de Cobrança Pix via API do Mercado Pago (/v1/payments) e Netlify Functions
 */
app.post("/.netlify/functions/create-pix", handleCreatePix);
app.post("/netlify/functions/create-pix", handleCreatePix);
app.post("/api/mercadopago/create-pix", handleCreatePix);
app.post("/api/create-pix-payment", handleCreatePix);

/**
 * Consulta de Status do Pagamento (Polling pelo Frontend)
 */
const handleCheckPayment = async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const paymentId = req.params.paymentId || (req.query.paymentId as string) || (req.query.id as string) || (req.body?.paymentId as string);
    const targetUserId = (req.query.userId as string) || (req.query.user_id as string) || (req.body?.userId as string);
    const targetEmail = (req.query.email as string) || (req.body?.email as string);

    const candidateTokens = [
      process.env.MERCADOPAGO_ACCESS_TOKEN,
      process.env.MERCADO_PAGO_ACCESS_TOKEN,
      process.env.MP_ACCESS_TOKEN,
    ].filter(Boolean).map(t => (t as string).trim());

    const mpToken =
      candidateTokens.find(t => t.startsWith("APP_USR-")) ||
      candidateTokens[0] ||
      "";

    if (!paymentId && !targetUserId && !targetEmail) {
      return res.status(400).json({ error: "ID do pagamento ou identificador de usuário obrigatório." });
    }

    let status = "pending";
    let externalRef = targetUserId || "";
    let payerEmail = targetEmail || "";

    // 1. Se houver token do Mercado Pago, consulta a API oficial
    if (mpToken && mpToken.trim().length > 10 && paymentId && !paymentId.startsWith("DEMO-PIX-")) {
      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${mpToken.trim()}`,
          },
        });

        if (mpRes.ok) {
          const mpData = await mpRes.json();
          status = mpData.status; // 'approved', 'pending', 'rejected', 'cancelled'
          externalRef = mpData.external_reference || externalRef;
          payerEmail = mpData.payer?.email || payerEmail;
        }
      } catch (e) {
        console.warn("[Mercado Pago] Erro ao consultar pagamento na API:", e);
      }
    } else if (paymentId) {
      // Verifica store em memória local
      const local = localPaymentStore.get(paymentId);
      if (local) {
        status = local.status;
        externalRef = local.userId || externalRef;
        payerEmail = local.email || payerEmail;
      }
    }

    const isApproved = status === "approved";
    let userUpdated = false;

    if (isApproved) {
      userUpdated = await activateUserSubscription(externalRef, payerEmail, paymentId);
    }

    return res.json({
      success: true,
      paymentId,
      status,
      approved: isApproved,
      userUpdated,
      userId: externalRef,
      email: payerEmail,
    });
  } catch (err: any) {
    console.error("[Mercado Pago] Erro ao checar status do pagamento:", err);
    return res.status(500).json({ error: err.message || "Erro ao checar pagamento." });
  }
};

app.get("/api/mercadopago/check-payment/:paymentId", handleCheckPayment);
app.get("/api/mercadopago/check-payment", handleCheckPayment);
app.post("/api/mercadopago/check-payment", handleCheckPayment);
app.get("/.netlify/functions/check-payment", handleCheckPayment);
app.post("/.netlify/functions/check-payment", handleCheckPayment);
app.get("/netlify/functions/check-payment", handleCheckPayment);
app.post("/netlify/functions/check-payment", handleCheckPayment);
app.get("/functions/v1/check-pix-payment", handleCheckPayment);

/**
 * Webhook Oficial do Mercado Pago (Notificações de Pagamentos e Assinaturas)
 */
const handleMercadoPagoWebhook = async (req: express.Request, res: express.Response) => {
  try {
    const candidateTokens = [
      process.env.MERCADOPAGO_ACCESS_TOKEN,
      process.env.MERCADO_PAGO_ACCESS_TOKEN,
      process.env.MP_ACCESS_TOKEN,
    ].filter(Boolean).map(t => (t as string).trim());

    const mpToken =
      candidateTokens.find(t => t.startsWith("APP_USR-")) ||
      candidateTokens[0] ||
      "";
    
    // Captura o ID do pagamento de diferentes formatos enviados pelo Mercado Pago
    const body = req.body || {};
    const query = req.query || {};

    const action = body.action || query.action || "";
    const type = body.type || query.type || query.topic || "";
    const paymentId =
      body.data?.id ||
      body.id ||
      query.id ||
      query["data.id"] ||
      (body.resource ? body.resource.split("/").pop() : null);

    console.log(`[Mercado Pago Webhook] Notificação recebida: type=${type}, action=${action}, paymentId=${paymentId}`);

    // Se tivermos um paymentId e o token do Mercado Pago, buscamos os dados na API
    if (paymentId && mpToken) {
      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${mpToken.trim()}`,
          },
        });

        if (mpRes.ok) {
          const mpData = await mpRes.json();
          const status = mpData.status;
          const externalRef = mpData.external_reference;
          const payerEmail = mpData.payer?.email;

          console.log(`[Mercado Pago Webhook] Pagamento ${paymentId}: status=${status}, ref=${externalRef}`);

          if (status === "approved") {
            await activateUserSubscription(externalRef, payerEmail, paymentId);
          }
        }
      } catch (mpErr) {
        console.error("[Mercado Pago Webhook] Erro ao validar pagamento com token:", mpErr);
      }
    }

    // Mercado Pago requer status 200 OK para confirmar o recebimento do webhook
    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("[Mercado Pago Webhook] Erro ao processar webhook:", err);
    return res.status(200).json({ received: true, error: err.message });
  }
};

app.post("/api/mercadopago/webhook", handleMercadoPagoWebhook);
app.post("/api/webhooks/mercadopago", handleMercadoPagoWebhook);
app.post("/.netlify/functions/mercadopago-webhook", handleMercadoPagoWebhook);
app.post("/netlify/functions/mercadopago-webhook", handleMercadoPagoWebhook);
app.get("/.netlify/functions/mercadopago-webhook", (_req, res) => {
  res.json({ status: "online", message: "Webhook Mercado Pago ativo." });
});

/**
 * Rota de simulação/teste para aprovar pagamento imediatamente
 */
app.post("/api/mercadopago/simulate-approval", async (req, res) => {
  try {
    const { paymentId, userId, email } = req.body;
    if (paymentId && localPaymentStore.has(paymentId)) {
      const stored = localPaymentStore.get(paymentId);
      stored.status = "approved";
      localPaymentStore.set(paymentId, stored);
    }
    const updated = await activateUserSubscription(userId, email, paymentId);
    return res.json({ success: true, approved: true, userUpdated: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

const FRIENDLY_HIGH_DEMAND_ERROR =
  "O servidor da Inteligência Artificial está temporariamente instável devido a alta demanda do Google. Por favor, aguarde alguns instantes e clique em 'Gerar Relatório Completo' novamente.";

function isTransientOrHighDemandError(err: any): boolean {
  if (!err) return false;
  const msg = (typeof err === "string" ? err : err.message || JSON.stringify(err)).toLowerCase();
  const status = err.status || err.statusCode || err.code;

  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("unavailable") ||
    msg.includes("high demand") ||
    msg.includes("overloaded") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("temporarily") ||
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout")
  );
}

/**
 * Executa chamada ao Gemini com re-tentativas automáticas (backoff exponencial)
 * e troca dinâmica de modelo caso o primário esteja indisponível ou sobrecarregado.
 */
async function generateGeminiReportWithRetry(
  ai: GoogleGenAI,
  promptText: string,
  systemInstruction: string
): Promise<string> {
  const models = [
    process.env.GEMINI_MODEL || "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash-8b",
  ].filter(Boolean);

  const uniqueModels = Array.from(new Set(models));
  let lastError: any = null;

  for (const model of uniqueModels) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini AI] Tentando modelo '${model}' (tentativa ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          model,
          contents: promptText,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });

        const text = response.text;
        if (text && text.trim().length > 0) {
          console.log(`[Gemini AI] Sucesso gerando relatório com modelo '${model}'!`);
          return text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini AI] Falha no modelo '${model}' tentativa ${attempt}:`, err?.message || err);

        // Se for erro transitório ou alta demanda e ainda houver tentativas para este modelo
        if (attempt < maxRetries && isTransientOrHighDemandError(err)) {
          const delayMs = attempt * 2000; // 2s, depois 4s
          console.log(`[Gemini AI] Aguardando ${delayMs}ms antes de retentar com '${model}'...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // Passa para o próximo modelo de fallback
          break;
        }
      }
    }
  }

  console.error("[Gemini AI] Todos os modelos e tentativas de retry esgotados. Último erro:", lastError);
  if (isTransientOrHighDemandError(lastError)) {
    throw new Error(FRIENDLY_HIGH_DEMAND_ERROR);
  }
  throw new Error(lastError?.message || FRIENDLY_HIGH_DEMAND_ERROR);
}

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

    const systemInstruction =
      "Você é um auditor e assistente financeiro especializado em tesouraria de igrejas evangélicas e cristãs. Use sempre os termos corretos em português: 'Expressamos', 'Orientação de Auditoria', 'inconsistência'.";

    const rawReportText = await generateGeminiReportWithRetry(ai, promptText, systemInstruction);

    let reportText = rawReportText || "Relatório não gerado.";

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
    const isTransient = isTransientOrHighDemandError(error);
    const userMessage = isTransient
      ? FRIENDLY_HIGH_DEMAND_ERROR
      : error.message || "Erro ao processar relatório da tesouraria.";

    return res.status(isTransient ? 503 : 500).json({ error: userMessage });
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
