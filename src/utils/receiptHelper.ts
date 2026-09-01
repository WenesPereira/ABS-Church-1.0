import { supabase } from '../services/supabase';

/**
 * Valida se uma string é um UUID válido (formato padrão 8-4-4-4-12 hex)
 */
export function isValidUUID(val: unknown): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
}

/**
 * Garante que o contributor_id seja um UUID válido ou estritamente null.
 * Nunca retorna string vazia "" ou undefined.
 */
export function sanitizeContributorId(val: unknown): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null;
  return isValidUUID(trimmed) ? trimmed : null;
}

/**
 * Estratégias de formatação do campo 'tipo' para compatibilidade com qualquer CHECK constraint do Supabase
 */
export interface TipoStrategy {
  name: string;
  resolve: (isSaida: boolean, categoria?: string) => string;
}

export const ALL_TIPO_STRATEGIES: TipoStrategy[] = [
  { name: 'lowercase', resolve: (isSaida) => (isSaida ? 'saida' : 'entrada') },
  { name: 'uppercase', resolve: (isSaida) => (isSaida ? 'SAIDA' : 'ENTRADA') },
  { name: 'accent_lower', resolve: (isSaida) => (isSaida ? 'saída' : 'entrada') },
  { name: 'accent_upper', resolve: (isSaida) => (isSaida ? 'SAÍDA' : 'ENTRADA') },
  { name: 'capitalized', resolve: (isSaida) => (isSaida ? 'Saida' : 'Entrada') },
  { name: 'capitalized_accent', resolve: (isSaida) => (isSaida ? 'Saída' : 'Entrada') },
  { name: 'receita_despesa_lower', resolve: (isSaida) => (isSaida ? 'despesa' : 'receita') },
  { name: 'receita_despesa_upper', resolve: (isSaida) => (isSaida ? 'DESPESA' : 'RECEITA') },
  { name: 'receita_despesa_cap', resolve: (isSaida) => (isSaida ? 'Despesa' : 'Receita') },
  { name: 'credito_debito_lower', resolve: (isSaida) => (isSaida ? 'debito' : 'credito') },
  { name: 'credito_debito_upper', resolve: (isSaida) => (isSaida ? 'DEBITO' : 'CREDITO') },
  { name: 'credito_debito_accent_lower', resolve: (isSaida) => (isSaida ? 'débito' : 'crédito') },
  { name: 'credito_debito_accent_upper', resolve: (isSaida) => (isSaida ? 'DÉBITO' : 'CRÉDITO') },
  { name: 'credito_debito_cap', resolve: (isSaida) => (isSaida ? 'Débito' : 'Crédito') },
  { name: 'credito_debito_cap_no_accent', resolve: (isSaida) => (isSaida ? 'Debito' : 'Credito') },
  { name: 'single_char_es', resolve: (isSaida) => (isSaida ? 'S' : 'E') },
  { name: 'single_char_es_lower', resolve: (isSaida) => (isSaida ? 's' : 'e') },
  { name: 'single_char_cd', resolve: (isSaida) => (isSaida ? 'D' : 'C') },
  { name: 'single_char_cd_lower', resolve: (isSaida) => (isSaida ? 'd' : 'c') },
  { name: 'single_char_rd', resolve: (isSaida) => (isSaida ? 'D' : 'R') },
  { name: 'in_out_upper', resolve: (isSaida) => (isSaida ? 'OUT' : 'IN') },
  { name: 'in_out_lower', resolve: (isSaida) => (isSaida ? 'out' : 'in') },
  { name: 'income_expense_upper', resolve: (isSaida) => (isSaida ? 'EXPENSE' : 'INCOME') },
  { name: 'income_expense_lower', resolve: (isSaida) => (isSaida ? 'expense' : 'income') },
  { name: 'income_expense_cap', resolve: (isSaida) => (isSaida ? 'Expense' : 'Income') },
  { name: 'category_as_type', resolve: (isSaida, cat) => cat || (isSaida ? 'outros' : 'oferta_culto') },
  { name: 'category_as_type_upper', resolve: (isSaida, cat) => (cat || (isSaida ? 'outros' : 'oferta_culto')).toUpperCase() },
  { name: 'dizimo_despesa', resolve: (isSaida) => (isSaida ? 'despesa' : 'dizimo') },
  { name: 'dizimo_despesa_accent', resolve: (isSaida) => (isSaida ? 'Despesa' : 'Dízimo') },
];

const TIPO_STRATEGY_STORAGE_KEY = 'eklesia_tipo_strategy_pref';

export function getCachedTipoStrategy(): string | null {
  try {
    return localStorage.getItem(TIPO_STRATEGY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setCachedTipoStrategy(name: string): void {
  try {
    localStorage.setItem(TIPO_STRATEGY_STORAGE_KEY, name);
  } catch {}
}

export function getOrderedTipoStrategies(): TipoStrategy[] {
  const cached = getCachedTipoStrategy();
  if (cached) {
    const found = ALL_TIPO_STRATEGIES.find((s) => s.name === cached);
    if (found) {
      return [found, ...ALL_TIPO_STRATEGIES.filter((s) => s.name !== cached)];
    }
  }
  return ALL_TIPO_STRATEGIES;
}

/**
 * Função universal de inserção resiliente na tabela 'lancamentos'
 * Trata automaticamente falhas de colunas inexistentes (PGRST204) e restrições de CHECK constraint (23514 / lancamentos_tipo_check)
 */
export async function insertLancamentoResilient(
  payloadBase: Record<string, any>,
  isSaida: boolean,
  categoria: string,
  onConflictUpsert = false
): Promise<{ success: boolean; data?: any; error?: any; strategyUsed?: string }> {
  const strategies = getOrderedTipoStrategies();
  let lastError: any = null;
  const optionalFieldsToStrip = ['contributor_id', 'contributor_name', 'contributor_phone', 'receipt_number', 'church_id'];

  for (const strategy of strategies) {
    const currentPayload: Record<string, any> = {
      ...payloadBase,
      tipo: strategy.resolve(isSaida, categoria),
    };

    // Garante que nenhum campo undefined seja enviado
    Object.keys(currentPayload).forEach((k) => {
      if (currentPayload[k] === undefined) {
        currentPayload[k] = null;
      }
    });

    let attemptError: any = null;
    let attemptData: any = null;

    // Retry loop para lidar com colunas ausentes no schema Supabase (PGRST204)
    for (let attempt = 0; attempt < 5; attempt++) {
      const query = onConflictUpsert
        ? supabase.from('lancamentos').upsert([currentPayload], { onConflict: 'id' }).select()
        : supabase.from('lancamentos').insert([currentPayload]).select();

      const res = await query;
      attemptData = res.data;
      attemptError = res.error;

      if (!attemptError) {
        setCachedTipoStrategy(strategy.name);
        return { success: true, data: attemptData, strategyUsed: strategy.name };
      }

      // Se for erro de coluna inexistente no schema
      if (
        attemptError.code === 'PGRST204' ||
        attemptError.message?.includes('Could not find the') ||
        attemptError.message?.includes('column')
      ) {
        let strippedAny = false;
        for (const col of optionalFieldsToStrip) {
          if (attemptError.message?.includes(col) && currentPayload[col] !== undefined) {
            delete currentPayload[col];
            strippedAny = true;
          }
        }
        if (!strippedAny) {
          delete currentPayload.contributor_id;
          delete currentPayload.contributor_name;
          delete currentPayload.contributor_phone;
          delete currentPayload.receipt_number;
        }
      } else {
        break;
      }
    }

    lastError = attemptError;

    // Verifica se o erro foi violação de check constraint (23514 / lancamentos_tipo_check)
    const isCheckConstraint =
      attemptError.code === '23514' ||
      attemptError.message?.includes('lancamentos_tipo_check') ||
      attemptError.message?.includes('check constraint') ||
      (typeof attemptError.details === 'string' && attemptError.details.includes('lancamentos_tipo_check'));

    if (!isCheckConstraint) {
      // Se for outro erro fatal (ex: permissão RLS), não adianta tentar outras formatações de tipo
      break;
    }
  }

  return { success: false, error: lastError };
}

/**
 * Utilitários para Numeração Sequencial de Recibos e Envio via WhatsApp
 * APP EKLESIA / Sistema de Tesouraria Eclesiástica
 */

/**
 * Formata um número ou string sequencial para 6 dígitos com padding (ex: 102 -> "000102")
 */
export function formatReceiptNumberDigits(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '000001';
  const clean = String(num).replace(/\D/g, '');
  const parsed = parseInt(clean, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return '000001';
  return parsed.toString().padStart(6, '0');
}

/**
 * Retorna o número de recibo com hashtag (ex: "#000102")
 */
export function formatReceiptDisplay(num: number | string | null | undefined): string {
  const digits = formatReceiptNumberDigits(num);
  return `#${digits}`;
}

export interface WhatsAppReceiptParams {
  receiptNumber: string | number;
  churchName?: string;
  contributorName?: string;
  tipo?: string;
  valor: number;
  dataHora?: string;
  pdfPublicUrl?: string;
}

export interface OfficialWhatsAppMessageParams {
  receiptNumber: string | number;
  churchName?: string;
  contributorName?: string;
  pdfPublicUrl?: string;
}

/**
 * Gera o texto exato oficial e limpo para o Recibo de Contribuição enviado via WhatsApp:
 * 
 * 🧾 *RECIBO OFICIAL DE CONTRIBUIÇÃO Nº [RECEIPT_NUMBER]*
 * 🏛️ *[NOME_DA_IGREJA]*
 * 
 * Olá, *[NOME_DO_CONTRIBUINTE]*! Sua contribuição foi registrada com sucesso.
 * 
 * 📌 *Segue em anexo a imagem oficial do seu comprovante.*
 * 
 * Agradecemos a sua fidelidade!
 */
export function buildOfficialWhatsAppReceiptMessage(params: OfficialWhatsAppMessageParams): string {
  const formattedNum = formatReceiptNumberDigits(params.receiptNumber);
  const church = (params.churchName || 'ABS CHURCH').trim();
  const contributor = (params.contributorName || 'Contribuinte').trim();

  return `🧾 *RECIBO OFICIAL DE CONTRIBUIÇÃO Nº ${formattedNum}*
🏛️ *${church}*

Olá, *${contributor}*! Sua contribuição foi registrada com sucesso.

📌 *Segue em anexo a imagem oficial do seu comprovante.*

Agradecemos a sua fidelidade!`;
}

/**
 * Gera o texto exato padronizado para o Recibo de Contribuição enviado via WhatsApp:
 * 
 * 🧾 RECIBO DE CONTRIBUIÇÃO Nº [RECEIPT_NUMBER]
 * 🏛️ [NOME_DA_IGREJA]
 * 
 * 👤 Contribuinte: [NOME_DO_CONTRIBUINTE]
 * 🏷️ Tipo: [DÍZIMO / OFERTA]
 * 💰 Valor: R$ [VALOR]
 * 📅 Data: [DATA_E_HORA]
 * 
 * Agradecemos a sua fidelidade e contribuição com a obra do Senhor!
 * 
 * "Cada um contribua segundo propôs no seu coração..." (2 Co 9:7)
 */
export function buildWhatsAppReceiptMessage(params: WhatsAppReceiptParams): string {
  const formattedNum = formatReceiptDisplay(params.receiptNumber);
  const church = params.churchName?.trim() || 'ABS CHURCH';
  const contributor = params.contributorName?.trim() || 'Contribuinte / Dizimista';
  
  // Mapeia o tipo para maiúsculas e formato amigável
  let tipoLabel = (params.tipo || 'DÍZIMO').toUpperCase();
  if (tipoLabel.includes('DIZIMO') || tipoLabel.includes('DÍZIMO')) {
    tipoLabel = 'DÍZIMO';
  } else if (tipoLabel.includes('OFERTA')) {
    tipoLabel = 'OFERTA';
  } else if (tipoLabel.includes('DOACAO') || tipoLabel.includes('DOAÇÃO')) {
    tipoLabel = 'DOAÇÃO';
  }

  const valorFormatado = (typeof params.valor === 'number' ? params.valor : Number(params.valor) || 0).toLocaleString(
    'pt-BR',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );

  let dataHoraStr = params.dataHora;
  if (!dataHoraStr) {
    const now = new Date();
    dataHoraStr = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (!dataHoraStr.includes(':')) {
    // Se for apenas data YYYY-MM-DD ou DD/MM/YYYY
    if (dataHoraStr.includes('-')) {
      const parts = dataHoraStr.split('-');
      if (parts.length === 3) {
        dataHoraStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
  }

  return `🧾 RECIBO DE CONTRIBUIÇÃO Nº ${formattedNum}
🏛️ ${church}

👤 Contribuinte: ${contributor}
🏷️ Tipo: ${tipoLabel}
💰 Valor: R$ ${valorFormatado}
📅 Data: ${dataHoraStr}

Agradecemos a sua fidelidade e contribuição com a obra do Senhor!

"Cada um contribua segundo propôs no seu coração..." (2 Co 9:7)`;
}

/**
 * Cria o link seguro de redirecionamento para o WhatsApp via wa.me / api.whatsapp.com
 * Garante que o parâmetro text seja limpo e comece direto no texto formatado sem URLs pré-anexadas.
 */
export function getWhatsAppShareUrl(phone: string | undefined, message: string): string {
  // Garante que o texto comece estritamente sem espaços em branco ou URLs indesejadas no topo
  const cleanMessage = (message || '').trim();
  const encoded = encodeURIComponent(cleanMessage);
  const cleanPhone = (phone || '').replace(/\D/g, '');
  
  if (cleanPhone) {
    // Se não tiver DDI 55, adiciona automaticamente se for número brasileiro (10 ou 11 dígitos)
    const finalPhone = cleanPhone.length >= 10 && cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    return `https://wa.me/${finalPhone}?text=${encoded}`;
  }

  return `https://wa.me/?text=${encoded}`;
}

/**
 * Formata input de telefone em tempo real enquanto o usuário digita
 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Formata data no formato brasileiro seguro DD/MM/AAAA sem sofrer distorção de fuso horário
 */
export function formatDateBR(rawDate?: string | null): string {
  if (!rawDate) return 'Hoje';
  const clean = String(rawDate).trim();
  if (!clean) return 'Hoje';

  // Se já for DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }

  // Se contiver YYYY-MM-DD (com ou sem timestamp T...)
  const datePart = clean.split('T')[0];
  if (datePart.includes('-')) {
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (year.length === 4 && month.length === 2 && day.length === 2) {
        return `${day}/${month}/${year}`;
      }
    }
  }

  // Fallback seguro via Date
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch {}

  return clean;
}

/**
 * Formata número de telefone brasileiro para exibição amigável: (11) 99999-9999
 */
export function formatPhoneDisplay(rawPhone?: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  
  // Remove 55 se vier com DDI
  const local = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;

  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  if (local.length >= 8) {
    return local;
  }
  return rawPhone;
}
