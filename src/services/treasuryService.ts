import { supabase, isSupabaseConfigured } from './supabase';
import {
  ConfigIgreja,
  FechamentoCulto,
  Lancamento,
  TipoLancamento,
  User,
  SupabaseConfiguracaoIgrejaRow,
  SupabaseFechamentoCultoRow,
  SupabaseLancamentoRow,
  SupabasePerfilUsuarioRow,
  CategoriaEntrada,
  CategoriaSaida,
} from '../types';

export const LOCAL_SUPPORT_KEY = 'tesouraria_app_support_config';

/**
 * Super Admin Global do Sistema
 * Emails autorizados a acessar o Painel do Administrador
 */
export const SUPER_ADMIN_EMAILS = ['wenes13@hotmail.com', 'keylla.wenes@gmail.com'];
export const SUPER_ADMIN_EMAIL = 'wenes13@hotmail.com';

/**
 * Verifica se um usuário ou e-mail é o Super Admin global
 */
export function isSuperAdmin(target?: User | { email?: string } | string | null): boolean {
  if (!target) return false;
  const email = typeof target === 'string' ? target : target.email;
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean);
}

export interface ContatoRegistro {
  id: string;
  data: string;
  nome: string;
  igrejaOuCargo?: string;
  telefone?: string;
  assunto?: string;
  observacoes?: string;
  status: 'pendente' | 'em_atendimento' | 'resolvido';
}

export interface GlobalAdminConfig {
  whatsappSuporte: string;
  emailSuporte: string;
  apkDownloadUrl: string;
  contatosFeitos?: string;
  listaContatos?: ContatoRegistro[];
  updatedAt?: string;
}

export interface SaveGlobalConfigResult {
  success: boolean;
  savedToDb: boolean;
  error?: string;
}

/**
 * Detecta se a aplicação está rodando em ambiente nativo/APK Android (WebView / TWA / Cordova / Capacitor / Standalone app)
 * Retorna true se estiver rodando dentro do APK instalado, e false se for Web browser padrão.
 */
export function isAndroidApkEnvironment(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const win = window as any;

  // 1. Bridges nativas e wrappers (Capacitor, Cordova, WebView JS Bridges)
  if (
    win.Capacitor ||
    win.cordova ||
    win._cordovaNative ||
    win.AndroidBridge ||
    win.Android ||
    win.isNativeApp ||
    win.ReactNativeWebView
  ) {
    return true;
  }

  const ua = (navigator.userAgent || navigator.vendor || win.opera || '').toLowerCase();

  // 2. Assinaturas de WebView Android (; wv, Version/4.0 etc.)
  const isAndroid = ua.includes('android');
  const isWebView = isAndroid && (ua.includes('; wv') || ua.includes('version/4.0') || ua.includes('crosswalk'));
  if (isWebView) {
    return true;
  }

  // 3. Standalone mode no Android (APK instalado via TWA / WebApp container nativo)
  const isStandalone =
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as any).standalone === true;
  if (isAndroid && isStandalone) {
    return true;
  }

  // 4. Referrer originário de pacote Android nativo
  if (typeof document !== 'undefined' && document.referrer && document.referrer.startsWith('android-app://')) {
    return true;
  }

  return false;
}

export function getLocalSupportConfig(): GlobalAdminConfig {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(LOCAL_SUPPORT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        let listaContatos: ContatoRegistro[] = [];
        if (Array.isArray(parsed.listaContatos)) {
          listaContatos = parsed.listaContatos;
        } else if (typeof parsed.contatosFeitos === 'string' && parsed.contatosFeitos.startsWith('[')) {
          try {
            listaContatos = JSON.parse(parsed.contatosFeitos);
          } catch {}
        }

        return {
          whatsappSuporte: parsed.whatsappSuporte || '5511999999999',
          emailSuporte: parsed.emailSuporte || 'suporte@tesouraria.com',
          apkDownloadUrl: parsed.apkDownloadUrl || 'https://drive.google.com',
          contatosFeitos: typeof parsed.contatosFeitos === 'string' ? parsed.contatosFeitos : '',
          listaContatos,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.warn('Erro ao ler suporte local:', e);
  }
  return {
    whatsappSuporte: '5511999999999',
    emailSuporte: 'suporte@tesouraria.com',
    apkDownloadUrl: 'https://drive.google.com',
    contatosFeitos: '',
    listaContatos: [],
    updatedAt: new Date().toISOString(),
  };
}

export function saveLocalSupportConfig(
  whatsappOrConfig?: string | Partial<GlobalAdminConfig>,
  email?: string,
  apkUrl?: string,
  contatosFeitos?: string,
  listaContatos?: ContatoRegistro[]
): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = getLocalSupportConfig();
      let toSave: GlobalAdminConfig;

      if (typeof whatsappOrConfig === 'object' && whatsappOrConfig !== null) {
        toSave = {
          whatsappSuporte: whatsappOrConfig.whatsappSuporte || current.whatsappSuporte,
          emailSuporte: whatsappOrConfig.emailSuporte || current.emailSuporte,
          apkDownloadUrl: whatsappOrConfig.apkDownloadUrl || current.apkDownloadUrl,
          contatosFeitos: whatsappOrConfig.contatosFeitos !== undefined ? whatsappOrConfig.contatosFeitos : current.contatosFeitos,
          listaContatos: whatsappOrConfig.listaContatos !== undefined ? whatsappOrConfig.listaContatos : current.listaContatos,
          updatedAt: new Date().toISOString(),
        };
      } else {
        const waStr = typeof whatsappOrConfig === 'string' ? whatsappOrConfig : '';
        toSave = {
          whatsappSuporte: waStr !== '' ? waStr : current.whatsappSuporte,
          emailSuporte: (email !== undefined && email !== '') ? email : current.emailSuporte,
          apkDownloadUrl: (apkUrl !== undefined && apkUrl !== '') ? apkUrl : current.apkDownloadUrl,
          contatosFeitos: contatosFeitos !== undefined ? contatosFeitos : current.contatosFeitos,
          listaContatos: listaContatos !== undefined ? listaContatos : current.listaContatos,
          updatedAt: new Date().toISOString(),
        };
      }

      localStorage.setItem(LOCAL_SUPPORT_KEY, JSON.stringify(toSave));
    }
  } catch (e) {
    console.warn('Erro ao salvar suporte em localStorage:', e);
  }
}

/**
 * Helper para extrair dados de configuração global a partir de uma linha retornada pelo Supabase
 */
function parseGlobalConfigRow(row: any, localFallback: GlobalAdminConfig): GlobalAdminConfig {
  let whatsapp = row.support_phone || row.whatsapp_suporte || row.whatsappSuporte || row.whatsapp || row.telefone || localFallback.whatsappSuporte;
  let email = row.support_email || row.email_suporte || row.emailSuporte || row.email || localFallback.emailSuporte;
  let apk = row.apk_url || row.apk_download_url || row.apkDownloadUrl || row.apk || localFallback.apkDownloadUrl;
  let contatosFeitos = row.contatos_feitos || row.contatosFeitos || row.observacoes || localFallback.contatosFeitos || '';
  let listaContatos: ContatoRegistro[] = localFallback.listaContatos || [];

  if (row.data && typeof row.data === 'object') {
    if (row.data.support_phone || row.data.whatsappSuporte) whatsapp = row.data.support_phone || row.data.whatsappSuporte;
    if (row.data.support_email || row.data.emailSuporte) email = row.data.support_email || row.data.emailSuporte;
    if (row.data.apk_url || row.data.apkDownloadUrl) apk = row.data.apk_url || row.data.apkDownloadUrl;
    if (row.data.contatos_feitos || row.data.contatosFeitos) contatosFeitos = row.data.contatos_feitos || row.data.contatosFeitos;
    if (Array.isArray(row.data.listaContatos)) listaContatos = row.data.listaContatos;
  }

  if (Array.isArray(row.lista_contatos)) {
    listaContatos = row.lista_contatos;
  } else if (typeof contatosFeitos === 'string' && contatosFeitos.startsWith('[')) {
    try {
      const parsedList = JSON.parse(contatosFeitos);
      if (Array.isArray(parsedList)) {
        listaContatos = parsedList;
      }
    } catch {}
  }

  return {
    whatsappSuporte: whatsapp,
    emailSuporte: email,
    apkDownloadUrl: apk,
    contatosFeitos,
    listaContatos,
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

/**
 * Busca a configuração global do sistema (WhatsApp, E-mail, APK e Contatos Feitos) do Supabase.
 * Caso não encontre ou esteja offline, retorna o cache do localStorage.
 */
export async function fetchGlobalAdminConfig(): Promise<GlobalAdminConfig> {
  const local = getLocalSupportConfig();
  if (!isSupabaseConfigured) return local;

  try {
    // 1. Tenta buscar da tabela dedicada 'app_settings'
    const { data: appSettingsRows, error: appErr } = await supabase
      .from('app_settings')
      .select('*')
      .limit(10);

    if (!appErr && appSettingsRows && appSettingsRows.length > 0) {
      const match = appSettingsRows.find((r: any) => r.id === 'global_settings' || r.id === 'global_admin_settings') || appSettingsRows[0];
      const parsed = parseGlobalConfigRow(match, local);
      saveLocalSupportConfig(parsed);
      return parsed;
    }

    // 2. Tenta buscar da tabela 'global_config'
    const { data: globalConfigRows, error: gcErr } = await supabase
      .from('global_config')
      .select('*')
      .limit(10);

    if (!gcErr && globalConfigRows && globalConfigRows.length > 0) {
      const match = globalConfigRows.find((r: any) => r.id === 'global_settings' || r.id === 'global_admin_settings') || globalConfigRows[0];
      const parsed = parseGlobalConfigRow(match, local);
      saveLocalSupportConfig(parsed);
      return parsed;
    }

    // 3. Tenta buscar da tabela 'configuracao_igreja' onde id in ('global_settings', 'global_admin_settings')
    const { data: globalChurchRow, error: gErr } = await supabase
      .from('configuracao_igreja')
      .select('*')
      .in('id', ['global_settings', 'global_admin_settings'])
      .maybeSingle();

    if (!gErr && globalChurchRow) {
      const parsed = parseGlobalConfigRow(globalChurchRow, local);
      saveLocalSupportConfig(parsed);
      return parsed;
    }

    // 4. Se não houver linha global específica, tenta carregar da primeira linha de configuracao_igreja disponível
    const { data: firstRows, error: fErr } = await supabase
      .from('configuracao_igreja')
      .select('*')
      .limit(1);

    if (!fErr && firstRows && firstRows.length > 0) {
      const parsed = parseGlobalConfigRow(firstRows[0], local);
      saveLocalSupportConfig(parsed);
      return parsed;
    }
  } catch (err) {
    console.warn('Aviso ao buscar configurações globais do admin no Supabase:', err);
  }

  return local;
}

/**
 * Salva as configurações globais do Super Admin no Supabase (utilizando upsert na tabela dedicada e de configurações)
 * com fallback completo para localStorage.
 */
export async function saveGlobalAdminConfig(
  config: GlobalAdminConfig,
  userId?: string
): Promise<SaveGlobalConfigResult> {
  // 1. Salva no localStorage imediatamente para garantir sincronia local e tolerância a falhas
  saveLocalSupportConfig(config);

  if (!isSupabaseConfigured) {
    return {
      success: true,
      savedToDb: false,
      error: 'Supabase não está configurado na aplicação. Dados salvos localmente.',
    };
  }

  const errors: string[] = [];
  let savedAtLeastOnce = false;

  try {
    const uid = await getCurrentUserId(userId);
    const nowIso = new Date().toISOString();

    const contatosJson = config.listaContatos && config.listaContatos.length > 0
      ? JSON.stringify(config.listaContatos)
      : (config.contatosFeitos || '');

    // Payload 1: Padrão com nomes de coluna padrão (id, apk_url, support_email, support_phone, contatos_feitos, updated_at)
    const payloadStandard: any = {
      id: 'global_settings',
      apk_url: config.apkDownloadUrl,
      support_email: config.emailSuporte,
      support_phone: config.whatsappSuporte,
      contatos_feitos: contatosJson,
      updated_at: nowIso,
    };

    // Payload 2: Padrão alternativo (apk_download_url, email_suporte, whatsapp_suporte)
    const payloadAlt: any = {
      id: 'global_settings',
      apk_download_url: config.apkDownloadUrl,
      email_suporte: config.emailSuporte,
      whatsapp_suporte: config.whatsappSuporte,
      contatos_feitos: contatosJson,
      updated_at: nowIso,
    };

    // Payload para tabela 'configuracao_igreja'
    const churchSettingsPayload: any = {
      id: 'global_settings',
      nome_igreja: 'Configurações Globais do Sistema',
      pastor_presidente: 'Super Admin',
      tesoureiro_padrao: 'Super Admin',
      whatsapp_suporte: config.whatsappSuporte,
      email_suporte: config.emailSuporte,
      apk_download_url: config.apkDownloadUrl,
      observacoes: contatosJson,
      updated_at: nowIso,
    };
    if (uid) {
      churchSettingsPayload.user_id = uid;
    }

    // 1. Tenta upsert na tabela 'app_settings' com schema padrão (apk_url, support_email, support_phone)
    try {
      const { error: appErr1 } = await supabase
        .from('app_settings')
        .upsert(payloadStandard, { onConflict: 'id' });

      if (!appErr1) {
        savedAtLeastOnce = true;
      } else {
        // Se falhar (por exemplo, nome de colunas em português), tenta com schema alternativo
        const { error: appErr2 } = await supabase
          .from('app_settings')
          .upsert(payloadAlt, { onConflict: 'id' });

        if (!appErr2) {
          savedAtLeastOnce = true;
        } else {
          errors.push(`app_settings: ${appErr1.message || appErr2.message}`);
        }
      }
    } catch (e: any) {
      errors.push(`app_settings: ${e?.message || 'erro'}`);
    }

    // 2. Tenta upsert na tabela 'global_config'
    try {
      const { error: gcErr1 } = await supabase
        .from('global_config')
        .upsert(payloadStandard, { onConflict: 'id' });

      if (!gcErr1) {
        savedAtLeastOnce = true;
      } else {
        const { error: gcErr2 } = await supabase
          .from('global_config')
          .upsert(payloadAlt, { onConflict: 'id' });
        if (!gcErr2) {
          savedAtLeastOnce = true;
        }
      }
    } catch (e: any) {
      // silencioso
    }

    // 3. Upsert na tabela 'configuracao_igreja' (com chaves 'global_settings' e 'global_admin_settings')
    try {
      const { error: ciErr1 } = await supabase
        .from('configuracao_igreja')
        .upsert(churchSettingsPayload, { onConflict: 'id' });

      const { error: ciErr2 } = await supabase
        .from('configuracao_igreja')
        .upsert({ ...churchSettingsPayload, id: 'global_admin_settings' }, { onConflict: 'id' });

      if (!ciErr1 || !ciErr2) {
        savedAtLeastOnce = true;
      } else {
        errors.push(`configuracao_igreja: ${ciErr1?.message || ciErr2?.message}`);
      }
    } catch (e: any) {
      errors.push(`configuracao_igreja: ${e?.message || 'erro'}`);
    }

    // 4. Se o Super Admin estiver logado, atualiza também a linha pessoal dele para manter sincronia
    if (uid) {
      try {
        await supabase
          .from('configuracao_igreja')
          .update({
            whatsapp_suporte: config.whatsappSuporte,
            email_suporte: config.emailSuporte,
            apk_download_url: config.apkDownloadUrl,
            observacoes: contatosJson,
          } as any)
          .eq('user_id', uid);
      } catch (e) {
        // Atualização complementar silenciosa
      }
    }

    if (savedAtLeastOnce) {
      return {
        success: true,
        savedToDb: true,
      };
    } else {
      return {
        success: true,
        savedToDb: false,
        error: errors.join(' | ') || 'Não foi possível gravar no banco Supabase.',
      };
    }
  } catch (err: any) {
    console.error('Erro ao persistir configurações globais no Supabase:', err);
    return {
      success: true,
      savedToDb: false,
      error: err?.message || 'Erro inesperado na conexão com o banco.',
    };
  }
}

export function buildWhatsAppLink(phoneNumber?: string, customMessage?: string): string {
  if (!phoneNumber) return '#';
  let digits = phoneNumber.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  if (!digits) return '#';
  const text = customMessage || 'Olá, preciso de suporte no Sistema de Tesouraria.';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function formatWhatsAppDisplay(phoneNumber?: string): string {
  if (!phoneNumber) return '';
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phoneNumber;
}

export const DEFAULT_CONFIG: ConfigIgreja = {
  nomeIgreja: 'Minha Igreja',
  pastorPresidente: 'Pastor Presidente',
  tesoureiroPadrao: 'Tesoureiro Principal',
  porcentagemMatriz: 20,
  aplicarRepasseMatriz: true,
  tipoBaseRepasseMatriz: 'todas',
  categoriasRepasseMatriz: ['dizimo', 'oferta_culto', 'oferta_missoes', 'oferta_especial', 'doacao', 'outros'],
  porcentagemPrebenda: 0,
  aplicarPrebenda: false,
  tipoBasePrebenda: 'todas',
  categoriasPrebenda: ['dizimo', 'oferta_culto', 'oferta_missoes', 'oferta_especial', 'doacao', 'outros'],
  deduzirMatrizBasePrebenda: false,
  whatsappSuporte: '5511999999999',
  emailSuporte: 'suporte@tesouraria.com',
  apkDownloadUrl: 'https://drive.google.com',
};

/* =========================================================
   HELPER: Formatação e Sanitização Segura de Datas para SQL
   ========================================================= */

export function toSqlDate(val?: string | null): string {
  if (!val || typeof val !== 'string' || !val.trim()) {
    return new Date().toISOString().split('T')[0];
  }
  const trimmed = val.trim();
  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // Formato YYYY-MM-DDTHH:mm:ss...
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.split('T')[0];
  }
  // Formato DD/MM/YYYY ou DD/MM/YYYY HH:mm...
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

export function toSqlTimestamp(val?: string | null): string | null {
  if (!val || typeof val !== 'string' || !val.trim()) return null;
  const trimmed = val.trim();
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return null;
}

/* =========================================================
   HELPER: Obter e Validar Sessão do Usuário Autenticado
   ========================================================= */

export async function getCurrentUserId(explicitUserId?: string): Promise<string | null> {
  if (explicitUserId) return explicitUserId;
  if (!isSupabaseConfigured) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (err) {
    // Silencioso se não houver sessão ativa
  }

  return null;
}

/* =========================================================
   MAPPERS (Converter de snake_case do Supabase para camelCase do App)
   ========================================================= */

function mapRowToConfig(row: SupabaseConfiguracaoIgrejaRow): ConfigIgreja {
  const localSupport = getLocalSupportConfig();
  const rowAny = row as any;
  const whatsappSuporte = rowAny.whatsapp_suporte || localSupport.whatsappSuporte || '5511999999999';
  const emailSuporte = rowAny.email_suporte || localSupport.emailSuporte || 'suporte@tesouraria.com';
  const apkDownloadUrl = rowAny.apk_download_url || localSupport.apkDownloadUrl || 'https://drive.google.com';

  // Mantém salvo localmente para a tela de login
  saveLocalSupportConfig(whatsappSuporte, emailSuporte, apkDownloadUrl);

  return {
    nomeIgreja: row.nome_igreja,
    cnpj: row.cnpj || undefined,
    cidadeUF: row.cidade_uf || undefined,
    pastorPresidente: row.pastor_presidente,
    pastorLocal: row.pastor_local || undefined,
    tesoureiroPadrao: row.tesoureiro_padrao,
    segundoTesoureiroPadrao: row.segundo_tesoureiro_padrao || undefined,
    porcentagemMatriz: row.porcentagem_matriz != null ? Number(row.porcentagem_matriz) : 20,
    aplicarRepasseMatriz: row.aplicar_repasse_matriz ?? true,
    tipoBaseRepasseMatriz: (row.tipo_base_repasse_matriz as 'todas' | 'selecionadas') || 'todas',
    categoriasRepasseMatriz: (row.categorias_repasse_matriz as CategoriaEntrada[]) || undefined,
    porcentagemPrebenda: row.porcentagem_prebenda != null ? Number(row.porcentagem_prebenda) : 0,
    aplicarPrebenda: row.aplicar_prebenda ?? false,
    tipoBasePrebenda: (row.tipo_base_prebenda as 'todas' | 'selecionadas') || 'todas',
    categoriasPrebenda: (row.categorias_prebenda as CategoriaEntrada[]) || undefined,
    deduzirMatrizBasePrebenda: row.deduzir_matriz_base_prebenda ?? false,
    logoUrl: row.logo_url || undefined,
    whatsappSuporte,
    emailSuporte,
    apkDownloadUrl,
  };
}

function mapConfigToRow(config: ConfigIgreja, userId: string): Partial<SupabaseConfiguracaoIgrejaRow> {
  // Salva no cache local para que a tela de login tenha acesso instantâneo
  saveLocalSupportConfig(config.whatsappSuporte, config.emailSuporte, config.apkDownloadUrl);

  return {
    id: `config_${userId}`,
    user_id: userId,
    nome_igreja: config.nomeIgreja || 'Tesouraria da Igreja',
    cnpj: config.cnpj || null,
    cidade_uf: config.cidadeUF || null,
    pastor_presidente: config.pastorPresidente || 'Pastor Presidente',
    pastor_local: config.pastorLocal || null,
    tesoureiro_padrao: config.tesoureiroPadrao || 'Tesoureiro Principal',
    segundo_tesoureiro_padrao: config.segundoTesoureiroPadrao || null,
    porcentagem_matriz: config.porcentagemMatriz != null ? Number(config.porcentagemMatriz) : 20,
    aplicar_repasse_matriz: config.aplicarRepasseMatriz ?? true,
    tipo_base_repasse_matriz: config.tipoBaseRepasseMatriz || 'todas',
    categorias_repasse_matriz: (config.categoriasRepasseMatriz as string[]) || null,
    porcentagem_prebenda: config.porcentagemPrebenda != null ? Number(config.porcentagemPrebenda) : 0,
    aplicar_prebenda: config.aplicarPrebenda ?? false,
    tipo_base_prebenda: config.tipoBasePrebenda || 'todas',
    categorias_prebenda: (config.categoriasPrebenda as string[]) || null,
    deduzir_matriz_base_prebenda: config.deduzirMatrizBasePrebenda ?? false,
    logo_url: config.logoUrl || null,
  };
}

let lastSuccessfulTipoStrategy: string | null = null;

function mapRowToLancamento(row: SupabaseLancamentoRow): Lancamento {
  const rawTipo = String(row.tipo || '').toLowerCase().trim();
  const isSaida =
    rawTipo === 'saida' ||
    rawTipo === 'saída' ||
    rawTipo === 's' ||
    rawTipo === 'd' ||
    rawTipo === 'despesa' ||
    rawTipo === 'debito' ||
    rawTipo === 'débito' ||
    rawTipo === 'out' ||
    rawTipo === 'expense' ||
    rawTipo.includes('said') ||
    rawTipo.includes('desp') ||
    rawTipo.includes('debit') ||
    rawTipo.includes('out') ||
    ['aluguel', 'agua', 'luz', 'internet', 'alimentacao', 'manutencao', 'acao_social', 'material_ebd'].includes(rawTipo);

  const tipo: TipoLancamento = isSaida ? 'saida' : 'entrada';

  return {
    id: row.id,
    tipo,
    categoria: (row.categoria as CategoriaEntrada | CategoriaSaida) || (isSaida ? 'outros' : 'oferta_culto'),
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
    porcentagemMatriz: row.porcentagem_matriz != null ? Number(row.porcentagem_matriz) : 20,
    aplicarRepasseMatriz: row.aplicar_repasse_matriz ?? true,
    tipoBaseRepasseMatriz: (row.tipo_base_repasse_matriz as 'todas' | 'selecionadas') || 'todas',
    categoriasRepasseMatriz: (row.categorias_repasse_matriz as CategoriaEntrada[]) || undefined,
    porcentagemPrebenda: row.porcentagem_prebenda != null ? Number(row.porcentagem_prebenda) : 0,
    aplicarPrebenda: row.aplicar_prebenda ?? false,
    tipoBasePrebenda: (row.tipo_base_prebenda as 'todas' | 'selecionadas') || 'todas',
    categoriasPrebenda: (row.categorias_prebenda as CategoriaEntrada[]) || undefined,
    deduzirMatrizBasePrebenda: row.deduzir_matriz_base_prebenda ?? false,
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

export async function fetchConfiguracaoIgreja(userId?: string): Promise<{ data: ConfigIgreja; isSupabase: boolean }> {
  if (!isSupabaseConfigured) {
    return { data: DEFAULT_CONFIG, isSupabase: false };
  }

  try {
    const uid = await getCurrentUserId(userId);
    if (!uid) {
      console.warn('fetchConfiguracaoIgreja: Usuário não autenticado no Supabase.');
      return { data: DEFAULT_CONFIG, isSupabase: true };
    }

    const { data, error } = await supabase
      .from('configuracao_igreja')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) {
      console.error('Erro Supabase ao buscar configuracao_igreja:', error);
      return { data: DEFAULT_CONFIG, isSupabase: false };
    }

    if (!data) {
      // Cria a configuração inicial para este usuário no Supabase
      await saveConfiguracaoIgreja(DEFAULT_CONFIG, uid);
      return { data: DEFAULT_CONFIG, isSupabase: true };
    }

    return { data: mapRowToConfig(data), isSupabase: true };
  } catch (err) {
    console.error('Erro Supabase inesperado ao buscar configurações:', err);
    return { data: DEFAULT_CONFIG, isSupabase: false };
  }
}

// Helper para extrair coluna não encontrada do erro PGRST204 ou mensagem de schema cache
function extractMissingColumn(error: any): string | null {
  if (!error) return null;
  const msg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
  const match = msg.match(/Could not find the '([^']+)' column/i);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

export async function saveConfiguracaoIgreja(config: ConfigIgreja, userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const uid = await getCurrentUserId(userId);
    if (!uid) {
      console.error('Erro Supabase: Tentativa de salvar configuracao_igreja sem usuário autenticado.');
      return false;
    }

    const initialRow = mapConfigToRow(config, uid);
    let currentRow = { ...initialRow };
    let lastError: any = null;
    let success = false;

    // Tenta salvar com auto-remoção graciosa de colunas caso a tabela no Supabase não tenha as migrações mais recentes
    for (let attempt = 0; attempt < 6; attempt++) {
      const { data, error } = await supabase
        .from('configuracao_igreja')
        .upsert(currentRow, { onConflict: 'id' })
        .select();

      if (!error) {
        success = !!data;
        lastError = null;
        break;
      }

      lastError = error;
      const missingCol = extractMissingColumn(error);
      if (missingCol && missingCol in currentRow) {
        console.warn(`Supabase: coluna '${missingCol}' ausente na tabela configuracao_igreja. Removendo do payload para salvar compatível...`);
        delete (currentRow as any)[missingCol];
        continue;
      } else if (error.code === 'PGRST204') {
        if ('aplicar_prebenda' in currentRow) {
          delete (currentRow as any).aplicar_prebenda;
          continue;
        }
        if ('porcentagem_prebenda' in currentRow) {
          delete (currentRow as any).porcentagem_prebenda;
          continue;
        }
        if ('logo_url' in currentRow) {
          delete (currentRow as any).logo_url;
          continue;
        }
      }
      break;
    }

    if (lastError) {
      console.error('Erro Supabase ao salvar configuracao_igreja:', lastError);
      return false;
    }
    return success;
  } catch (err) {
    console.error('Erro Supabase inesperado ao salvar configuracao_igreja:', err);
    return false;
  }
}

/* =========================================================
   SERVIÇOS DE FECHAMENTOS DE CULTO & LANÇAMENTOS
   ========================================================= */

export async function fetchFechamentos(userId?: string): Promise<{ data: FechamentoCulto[]; isSupabase: boolean }> {
  if (!isSupabaseConfigured) {
    return { data: [], isSupabase: false };
  }

  try {
    const uid = await getCurrentUserId(userId);
    if (!uid) {
      console.warn('fetchFechamentos: Usuário não autenticado no Supabase.');
      return { data: [], isSupabase: true };
    }

    // 1. Busca os fechamentos filtrando explicitamente pelo usuário logado
    const { data: fechamentosRows, error: fechamentosError } = await supabase
      .from('fechamentos_culto')
      .select('*')
      .eq('user_id', uid)
      .order('criado_em', { ascending: false });

    if (fechamentosError) {
      console.error('Erro Supabase ao buscar fechamentos_culto:', fechamentosError);
      return { data: [], isSupabase: false };
    }

    if (!fechamentosRows || fechamentosRows.length === 0) {
      return { data: [], isSupabase: true };
    }

    // 2. Busca os lançamentos filtrando explicitamente pelo usuário logado
    const { data: lancamentosRows, error: lancamentosError } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('user_id', uid);

    if (lancamentosError) {
      console.error('Erro Supabase ao buscar lancamentos:', lancamentosError);
    }

    const allLancamentos = lancamentosRows || [];

    const fechamentosCompleto: FechamentoCulto[] = fechamentosRows.map((fRow) => {
      const fLancamentos = allLancamentos.filter((l) => l.fechamento_id === fRow.id);
      return mapRowToFechamento(fRow, fLancamentos);
    });

    return { data: fechamentosCompleto, isSupabase: true };
  } catch (err) {
    console.error('Erro Supabase inesperado ao carregar fechamentos:', err);
    return { data: [], isSupabase: false };
  }
}

export async function saveFechamento(fechamento: FechamentoCulto, userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const uid = await getCurrentUserId(userId);
    if (!uid) {
      console.error('Erro Supabase: Tentativa de salvar fechamento sem usuário autenticado.');
      return false;
    }

    const cleanContagem = fechamento.contagemDinheiro && typeof fechamento.contagemDinheiro === 'object'
      ? fechamento.contagemDinheiro
      : {
          c200: 0, c100: 0, c50: 0, c20: 0, c10: 0, c5: 0, c2: 0,
          m100: 0, m050: 0, m025: 0, m010: 0, m005: 0,
        };

    const fechamentoRow: Partial<SupabaseFechamentoCultoRow> = {
      id: fechamento.id || `culto-${Date.now()}`,
      user_id: uid,
      nome_igreja: fechamento.nomeIgreja || 'Minha Igreja',
      data: toSqlDate(fechamento.data),
      data_inicio: fechamento.dataInicio ? toSqlDate(fechamento.dataInicio) : null,
      data_fim: fechamento.dataFim ? toSqlDate(fechamento.dataFim) : null,
      hora: fechamento.hora || '19:00',
      tipo_culto: fechamento.tipoCulto || 'Fechamento de Caixa',
      pregador: fechamento.pregador || null,
      passagem_biblica: fechamento.passagemBiblica || null,
      qtd_membros: typeof fechamento.qtdMembros === 'number' ? fechamento.qtdMembros : 0,
      qtd_visitantes: typeof fechamento.qtdVisitantes === 'number' ? fechamento.qtdVisitantes : 0,
      pastor_presidente: fechamento.pastorPresidente || null,
      tesoureiro: fechamento.tesoureiro || 'Tesoureiro Principal',
      pastor_local: fechamento.pastorLocal || null,
      segunda_testemunha: fechamento.segundaTestemunha || null,
      porcentagem_matriz: fechamento.porcentagemMatriz != null ? Number(fechamento.porcentagemMatriz) : 20,
      aplicar_repasse_matriz: fechamento.aplicarRepasseMatriz ?? true,
      tipo_base_repasse_matriz: fechamento.tipoBaseRepasseMatriz || 'todas',
      categorias_repasse_matriz: Array.isArray(fechamento.categoriasRepasseMatriz)
        ? (fechamento.categoriasRepasseMatriz as string[])
        : ['dizimo', 'oferta_culto', 'oferta_missoes', 'oferta_especial', 'doacao', 'outros'],
      porcentagem_prebenda: fechamento.porcentagemPrebenda != null ? Number(fechamento.porcentagemPrebenda) : 0,
      aplicar_prebenda: fechamento.aplicarPrebenda ?? false,
      tipo_base_prebenda: fechamento.tipoBasePrebenda || 'todas',
      categorias_prebenda: Array.isArray(fechamento.categoriasPrebenda)
        ? (fechamento.categoriasPrebenda as string[])
        : ['dizimo', 'oferta_culto', 'oferta_missoes', 'oferta_especial', 'doacao', 'outros'],
      deduzir_matriz_base_prebenda: fechamento.deduzirMatrizBasePrebenda ?? false,
      observacoes: fechamento.observacoes || null,
      contagem_dinheiro: cleanContagem,
      status: fechamento.status === 'fechado' ? 'fechado' : 'aberto',
      criado_em: toSqlTimestamp(fechamento.criadoEm) || new Date().toISOString(),
      fechado_em: toSqlTimestamp(fechamento.fechadoEm),
      relatorio_ia: fechamento.relatorioIA || null,
    };

    let currentRow = { ...fechamentoRow };
    let fError: any = null;
    let fData: any = null;

    // Tentativa resiliente com auto-remoção de colunas que não existam no schema cache atual do Supabase
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await supabase
        .from('fechamentos_culto')
        .upsert(currentRow, { onConflict: 'id' })
        .select();

      if (!res.error) {
        fData = res.data;
        fError = null;
        break;
      }

      fError = res.error;
      const missingCol = extractMissingColumn(fError);
      if (missingCol && missingCol in currentRow) {
        console.warn(`Supabase: coluna '${missingCol}' ausente na tabela fechamentos_culto. Removendo do payload para salvar compatível...`);
        delete (currentRow as any)[missingCol];
        continue;
      } else if (fError.code === 'PGRST204') {
        if ('aplicar_prebenda' in currentRow) {
          delete (currentRow as any).aplicar_prebenda;
          continue;
        }
        if ('porcentagem_prebenda' in currentRow) {
          delete (currentRow as any).porcentagem_prebenda;
          continue;
        }
        if ('relatorio_ia' in currentRow) {
          delete (currentRow as any).relatorio_ia;
          continue;
        }
      }
      break;
    }

    if (fError) {
      console.error('Erro Supabase ao salvar fechamentos_culto:', fError);
      return false;
    }

    // Salva os lançamentos vinculados explicitamente com user_id
    if (fechamento.lancamentos && fechamento.lancamentos.length > 0) {
      const allTipoStrategies: { name: string; resolve: (isSaida: boolean, cat: string) => string }[] = [
        { name: 'lowercase', resolve: (isSaida) => (isSaida ? 'saida' : 'entrada') },
        { name: 'accent_lower', resolve: (isSaida) => (isSaida ? 'saída' : 'entrada') },
        { name: 'capitalized', resolve: (isSaida) => (isSaida ? 'Saida' : 'Entrada') },
        { name: 'capitalized_accent', resolve: (isSaida) => (isSaida ? 'Saída' : 'Entrada') },
        { name: 'uppercase', resolve: (isSaida) => (isSaida ? 'SAIDA' : 'ENTRADA') },
        { name: 'accent_upper', resolve: (isSaida) => (isSaida ? 'SAÍDA' : 'ENTRADA') },
        { name: 'receita_despesa_lower', resolve: (isSaida) => (isSaida ? 'despesa' : 'receita') },
        { name: 'receita_despesa_cap', resolve: (isSaida) => (isSaida ? 'Despesa' : 'Receita') },
        { name: 'receita_despesa_upper', resolve: (isSaida) => (isSaida ? 'DESPESA' : 'RECEITA') },
        { name: 'credito_debito_lower', resolve: (isSaida) => (isSaida ? 'debito' : 'credito') },
        { name: 'credito_debito_accent_lower', resolve: (isSaida) => (isSaida ? 'débito' : 'crédito') },
        { name: 'credito_debito_cap', resolve: (isSaida) => (isSaida ? 'Débito' : 'Crédito') },
        { name: 'credito_debito_cap_no_accent', resolve: (isSaida) => (isSaida ? 'Debito' : 'Credito') },
        { name: 'credito_debito_upper', resolve: (isSaida) => (isSaida ? 'DEBITO' : 'CREDITO') },
        { name: 'credito_debito_accent_upper', resolve: (isSaida) => (isSaida ? 'DÉBITO' : 'CRÉDITO') },
        { name: 'single_char_es', resolve: (isSaida) => (isSaida ? 'S' : 'E') },
        { name: 'single_char_es_lower', resolve: (isSaida) => (isSaida ? 's' : 'e') },
        { name: 'single_char_cd', resolve: (isSaida) => (isSaida ? 'D' : 'C') },
        { name: 'single_char_cd_lower', resolve: (isSaida) => (isSaida ? 'd' : 'c') },
        { name: 'single_char_rd', resolve: (isSaida) => (isSaida ? 'D' : 'R') },
        { name: 'in_out_lower', resolve: (isSaida) => (isSaida ? 'out' : 'in') },
        { name: 'in_out_upper', resolve: (isSaida) => (isSaida ? 'OUT' : 'IN') },
        { name: 'income_expense_lower', resolve: (isSaida) => (isSaida ? 'expense' : 'income') },
        { name: 'income_expense_cap', resolve: (isSaida) => (isSaida ? 'Expense' : 'Income') },
        { name: 'income_expense_upper', resolve: (isSaida) => (isSaida ? 'EXPENSE' : 'INCOME') },
        { name: 'category_as_type', resolve: (isSaida, cat) => cat || (isSaida ? 'outros' : 'oferta_culto') },
        { name: 'category_as_type_upper', resolve: (isSaida, cat) => (cat || (isSaida ? 'outros' : 'oferta_culto')).toUpperCase() },
        { name: 'dizimo_despesa', resolve: (isSaida) => (isSaida ? 'despesa' : 'dizimo') },
        { name: 'dizimo_despesa_accent', resolve: (isSaida) => (isSaida ? 'Despesa' : 'Dízimo') },
      ];

      const tipoStrategies = lastSuccessfulTipoStrategy
        ? [
            ...allTipoStrategies.filter((s) => s.name === lastSuccessfulTipoStrategy),
            ...allTipoStrategies.filter((s) => s.name !== lastSuccessfulTipoStrategy),
          ]
        : allTipoStrategies;

      let lastError: any = null;
      let savedSuccessfully = false;

      for (const strategy of tipoStrategies) {
        const rows = fechamento.lancamentos.map((l) => {
          const rawTipo = String(l.tipo || '').toLowerCase().trim();
          const isSaida = rawTipo === 'saida' || rawTipo === 'saída' || rawTipo.includes('said') || rawTipo.includes('desp');
          const finalTipo = strategy.resolve(isSaida, l.categoria);

          return {
            id: l.id,
            user_id: uid,
            fechamento_id: fechamento.id,
            tipo: finalTipo,
            categoria: l.categoria || (isSaida ? 'outros' : 'oferta_culto'),
            descricao: l.descricao || 'Lançamento',
            valor: Number(l.valor) || 0,
            forma_pagamento: l.formaPagamento || 'dinheiro',
            nome_pessoa: l.nomePessoa || null,
            data: toSqlDate(l.data),
          };
        });

        const { error } = await supabase
          .from('lancamentos')
          .upsert(rows, { onConflict: 'id' })
          .select();

        if (!error) {
          savedSuccessfully = true;
          lastSuccessfulTipoStrategy = strategy.name;
          break;
        }

        lastError = error;
        // Se o erro for de check constraint (23514 / lancamentos_tipo_check), tenta a próxima estratégia
        if (error.code !== '23514' && !error.message?.includes('lancamentos_tipo_check') && !error.message?.includes('check constraint')) {
          break;
        }
      }

      // Fallback linha a linha caso lote falhe
      if (!savedSuccessfully) {
        for (const l of fechamento.lancamentos) {
          const rawTipo = String(l.tipo || '').toLowerCase().trim();
          const isSaida = rawTipo === 'saida' || rawTipo === 'saída' || rawTipo.includes('said') || rawTipo.includes('desp');

          for (const strategy of tipoStrategies) {
            const singleRow = {
              id: l.id,
              user_id: uid,
              fechamento_id: fechamento.id,
              tipo: strategy.resolve(isSaida, l.categoria),
              categoria: l.categoria || (isSaida ? 'outros' : 'oferta_culto'),
              descricao: l.descricao || 'Lançamento',
              valor: Number(l.valor) || 0,
              forma_pagamento: l.formaPagamento || 'dinheiro',
              nome_pessoa: l.nomePessoa || null,
              data: toSqlDate(l.data),
            };

            const { error: rowErr } = await supabase
              .from('lancamentos')
              .upsert(singleRow, { onConflict: 'id' });

            if (!rowErr) {
              lastSuccessfulTipoStrategy = strategy.name;
              savedSuccessfully = true;
              break;
            }
          }
        }
      }

      if (!savedSuccessfully && lastError) {
        console.warn('Aviso ao sincronizar lançamentos:', lastError.message || lastError);
      }
    }

    return true;
  } catch (err) {
    console.error('Erro Supabase inesperado ao salvar fechamento:', err);
    return false;
  }
}

export async function deleteFechamento(fechamentoId: string, userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const uid = await getCurrentUserId(userId);
    if (!uid) {
      console.error('Erro Supabase: Tentativa de excluir fechamento sem usuário autenticado.');
      return false;
    }

    // 1. Apaga os lançamentos vinculados ao usuário e ao fechamento
    const { error: lError } = await supabase
      .from('lancamentos')
      .delete()
      .eq('fechamento_id', fechamentoId)
      .eq('user_id', uid);

    if (lError) {
      console.error('Erro Supabase ao excluir lançamentos do fechamento:', lError);
    }

    // 2. Apaga o fechamento do usuário
    const { error: fError } = await supabase
      .from('fechamentos_culto')
      .delete()
      .eq('id', fechamentoId)
      .eq('user_id', uid);

    if (fError) {
      console.error('Erro Supabase ao excluir fechamentos_culto:', fError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Erro Supabase inesperado ao excluir fechamento:', err);
    return false;
  }
}

export async function deleteLancamento(
  lancamentoId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const uid = await getCurrentUserId(userId);

    // Tenta primeiro com filtro por id e user_id
    let query = supabase.from('lancamentos').delete().eq('id', lancamentoId);
    if (uid) {
      query = query.eq('user_id', uid);
    }

    const { error } = await query;

    if (error) {
      console.warn('Tentativa com user_id retornou erro no Supabase, tentando excluir diretamente por id:', error);
      const { error: errDirect } = await supabase
        .from('lancamentos')
        .delete()
        .eq('id', lancamentoId);

      if (errDirect) {
        console.error('Erro Supabase ao excluir lançamento:', errDirect);
        return {
          success: false,
          error: errDirect.message || 'Erro de permissão ou segurança (RLS) ao excluir o lançamento no banco de dados.',
        };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Erro Supabase inesperado ao excluir lançamento:', err);
    return {
      success: false,
      error: err?.message || 'Falha de conexão com o banco de dados ao tentar excluir.',
    };
  }
}

export async function resetAllUserData(userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const uid = await getCurrentUserId(userId);
    if (!uid) {
      console.error('Erro: Tentativa de resetar dados sem usuário autenticado.');
      return false;
    }

    // 1. Exclui todos os lançamentos do usuário
    const { error: lErr } = await supabase
      .from('lancamentos')
      .delete()
      .eq('user_id', uid);

    if (lErr) {
      console.error('Erro ao limpar lançamentos:', lErr);
    }

    // 2. Exclui todos os fechamentos do usuário
    const { error: fErr } = await supabase
      .from('fechamentos_culto')
      .delete()
      .eq('user_id', uid);

    if (fErr) {
      console.error('Erro ao limpar fechamentos:', fErr);
    }

    // 3. Restaura configuração padrão da igreja no Supabase
    await saveConfiguracaoIgreja(DEFAULT_CONFIG, uid);

    return true;
  } catch (err) {
    console.error('Erro inesperado ao resetar dados do usuário:', err);
    return false;
  }
}

/* =========================================================
   SERVIÇOS DE USUÁRIOS, PERFIS & ASSINATURAS (MERCADO PAGO)
   ========================================================= */

export const MERCADO_PAGO_PLAN_BASE_URL = 'https://mpago.la/2ZjJrWE';

/**
 * Retorna o link oficial do Mercado Pago com o external_reference vinculado ao ID do usuário.
 */
export function getMercadoPagoSubscriptionUrl(userId?: string): string {
  if (!userId) return MERCADO_PAGO_PLAN_BASE_URL;
  return `${MERCADO_PAGO_PLAN_BASE_URL}?external_reference=${encodeURIComponent(userId)}`;
}

/**
 * Verifica se o usuário tem assinatura ativa (ou em período de teste válido).
 * REGRA EXCLUSIVA: O Super Admin (wenes13@hotmail.com) possui isenção permanente e status PRO vitalício automático.
 */
export function isSubscriptionActive(user?: User | { email?: string; subscriptionStatus?: string; statusAssinatura?: string; isDemo?: boolean } | null): boolean {
  if (!user) return false;

  // 1. Liberação automática e isenção vitalícia para o Super Admin ou Modo Demo
  if (isSuperAdmin(user) || (user as User).isDemo === true) {
    return true;
  }

  // 2. Verificação padrão para status_assinatura ou subscriptionStatus
  const statusAssinatura = ((user as any).statusAssinatura || (user as any).status_assinatura || '').toLowerCase().trim();
  const subStatus = (user.subscriptionStatus || (user as any).subscription_status || '').toLowerCase().trim();

  return (
    statusAssinatura === 'ativo' ||
    statusAssinatura === 'active' ||
    statusAssinatura === 'pago' ||
    statusAssinatura === 'aprovado' ||
    subStatus === 'active' ||
    subStatus === 'ativo' ||
    subStatus === 'trialing' ||
    subStatus === 'pago'
  );
}

export async function syncUserProfile(user: User): Promise<boolean> {
  if (!isSupabaseConfigured || !user.id) return false;

  // AVISO: NUNCA incluir status_assinatura nem sobrescrever dados de assinatura aqui.
  // status_assinatura é estritamente de leitura (controlado externamente / webhook do Mercado Pago / painel do banco).
  const payload: Record<string, any> = {
    id: user.id,
    user_id: user.id,
    email: user.email,
    nome: user.nome,
    cargo: user.cargo || null,
    nome_igreja: user.nomeIgreja || null,
    created_at: user.createdAt || new Date().toISOString(),
  };

  // Tenta salvar, removendo dinamicamente quaisquer colunas opcionais que não existam no Supabase
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (!error) {
        return true;
      }

      // Se o erro for de coluna inexistente no schema cache do Supabase (PGRST204)
      if (error.code === 'PGRST204' || error.message?.includes('Could not find the') || error.message?.includes('column')) {
        const match = error.message?.match(/Could not find the '([^']+)' column/);
        if (match && match[1] && match[1] in payload) {
          const missingCol = match[1];
          delete payload[missingCol];
          continue;
        }

        if ('cargo' in payload) {
          delete payload.cargo;
          continue;
        }
        if ('nome_igreja' in payload) {
          delete payload.nome_igreja;
          continue;
        }
        if ('created_at' in payload) {
          delete payload.created_at;
          continue;
        }
      }

      console.warn('Aviso Supabase ao sincronizar perfil:', error.message);
      break;
    } catch (err) {
      console.warn('Erro inesperado ao sincronizar perfil:', err);
      break;
    }
  }

  return true;
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    // 1. Consulta primeiro por user_id = userId
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // 2. Se não encontrar por user_id, consulta por id = userId
    if (!data) {
      const resById = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (resById.data) {
        data = resById.data;
      }
    }

    if (error && !data) {
      console.error('Erro Supabase ao buscar perfil em profiles:', error);
      return null;
    }

    if (data) {
      const isSuper = isSuperAdmin(data.email);
      // Lê o valor da coluna subscription_status diretamente da tabela profiles do Supabase
      const rawSubStatus = typeof data.subscription_status === 'string' ? data.subscription_status.trim().toLowerCase() : '';
      const rawStatusAssinatura = typeof data.status_assinatura === 'string' ? data.status_assinatura.trim().toLowerCase() : '';
      const rawGenericStatus = typeof data.status === 'string' ? data.status.trim().toLowerCase() : '';

      // Liberação se subscription_status for 'active' (ou 'ativo' / 'trialing' / 'pago')
      const isStatusActive =
        isSuper ||
        rawSubStatus === 'active' ||
        rawSubStatus === 'ativo' ||
        rawSubStatus === 'trialing' ||
        rawSubStatus === 'pago' ||
        rawStatusAssinatura === 'ativo' ||
        rawStatusAssinatura === 'active' ||
        rawStatusAssinatura === 'pago' ||
        rawStatusAssinatura === 'aprovado' ||
        rawGenericStatus === 'ativo' ||
        rawGenericStatus === 'active';

      const subscriptionStatus = isStatusActive ? 'active' : 'inactive';
      const statusAssinatura = isStatusActive ? 'ativo' : (rawStatusAssinatura || 'pendente');

      return {
        id: data.id || data.user_id || userId,
        email: data.email,
        nome: data.nome,
        cargo: data.cargo || undefined,
        nomeIgreja: data.nome_igreja || undefined,
        hasPaid: Boolean(data.has_paid || isStatusActive || isSuper),
        statusAssinatura,
        subscriptionStatus,
        subscriptionPlan: isSuper ? 'pro_isento' : (data.subscription_plan || 'mensal'),
        subscriptionExpiresAt: isSuper ? 'Vitalício / Isento' : (data.subscription_expires_at || undefined),
        mpPreapprovalId: data.mp_preapproval_id || undefined,
        createdAt: data.created_at || new Date().toISOString(),
      };
    }
    return null;
  } catch (err) {
    console.error('Erro Supabase inesperado ao carregar perfil do usuário:', err);
    return null;
  }
}

/**
 * Consulta o status atualizado do usuário diretamente no Supabase sem realizar sobrescrita.
 */
export async function updateUserSubscriptionStatus(
  userId: string,
  _status: 'active' | 'inactive' | 'trialing' | 'cancelled' | string,
  _mpPreapprovalId?: string
): Promise<boolean> {
  // Conforme diretriz de segurança, o front-end normal NÃO altera subscription_status no banco de dados.
  // Apenas consulta o status atualizado.
  if (!isSupabaseConfigured || !userId) return false;
  const user = await fetchUserProfile(userId);
  return isSubscriptionActive(user);
}

/**
 * Função Administrativa (Super Admin / Painel de Controle):
 * Permite alterar manualmente o status de assinatura de um usuário (ex: liberar acesso imediatamente definindo status_assinatura = 'ativo').
 */
export async function adminSetUserSubscriptionStatus(
  identifier: string,
  status: 'ativo' | 'pendente' = 'ativo',
  days: number = 35
): Promise<{ success: boolean; message: string; user?: any }> {
  try {
    const res = await fetch('/api/admin/set-user-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier,
        status,
        days,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.error || data.message || 'Falha ao atualizar status do usuário.',
      };
    }

    return {
      success: true,
      message: data.message || `Status atualizado com sucesso para '${status}'!`,
      user: data.user,
    };
  } catch (err: any) {
    console.error('Erro ao chamar adminSetUserSubscriptionStatus:', err);
    return {
      success: false,
      message: err.message || 'Erro de conexão com o servidor ao atualizar status.',
    };
  }
}

/**
 * Função Administrativa: Lista os perfis cadastrados para visualização e liberação rápida.
 */
export async function adminListAllProfiles(): Promise<Array<any>> {
  try {
    const res = await fetch('/api/admin/list-profiles');
    if (!res.ok) return [];
    const data = await res.json();
    return data.profiles || [];
  } catch (err) {
    console.error('Erro ao listar perfis administrativos:', err);
    return [];
  }
}


