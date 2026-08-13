import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta as unknown as { env: Record<string, string> }).env || {};

const rawUrlInput = (
  env.VITE_SUPABASE_URL ||
  env.SUPABASE_URL ||
  ''
).trim();

const rawKeyInput = (
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY ||
  env.SUPABASE_KEY ||
  ''
).trim();

export function sanitizeSupabaseUrl(urlStr: string): string {
  if (!urlStr) return '';
  let cleaned = urlStr.trim();

  // Adiciona https:// se o usuário forneceu a URL sem o protocolo
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    // Retorna apenas o origin (protocolo + host + porta), removendo caminhos como /rest/v1 ou /auth/v1
    return parsed.origin;
  } catch {
    cleaned = cleaned
      .replace(/\/rest\/v1\/?$/i, '')
      .replace(/\/auth\/v1\/?$/i, '')
      .replace(/\/+$/, '');
    return cleaned;
  }
}

export function sanitizeSupabaseKey(keyStr: string): string {
  if (!keyStr) return '';
  return keyStr.trim().replace(/[\r\n\s]/g, '');
}

const cleanedUrl = sanitizeSupabaseUrl(rawUrlInput);
const cleanedKey = sanitizeSupabaseKey(rawKeyInput);

function validateSupabaseConfig(url: string, key: string): boolean {
  if (!url || !key) return false;

  const lowerUrl = url.toLowerCase();

  if (
    lowerUrl.includes('placeholder') ||
    lowerUrl.includes('your-supabase') ||
    lowerUrl.includes('your_supabase') ||
    lowerUrl.includes('example') ||
    lowerUrl.includes('your-project') ||
    lowerUrl.includes('unconfigured')
  ) {
    return false;
  }

  const isSupabaseHost =
    lowerUrl.includes('.supabase.co') ||
    lowerUrl.includes('.supabase.in') ||
    lowerUrl.includes('.supabase.net') ||
    lowerUrl.includes('localhost') ||
    lowerUrl.includes('127.0.0.1');

  if (!isSupabaseHost) {
    return false;
  }

  const lowerKey = key.toLowerCase();
  if (
    lowerKey.includes('placeholder') ||
    lowerKey.includes('your_supabase') ||
    lowerKey.includes('your-key') ||
    key.length < 20
  ) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = validateSupabaseConfig(cleanedUrl, cleanedKey);

if (!isSupabaseConfigured) {
  console.info(
    'ℹ️ Supabase não configurado com credenciais válidas. O aplicativo operará normalmente utilizando o armazenamento local (LocalStorage).'
  );
}

const safeUrl = isSupabaseConfigured ? cleanedUrl : 'https://unconfigured-project.supabase.co';
const safeKey = isSupabaseConfigured ? cleanedKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.unconfigured';

export const supabase: SupabaseClient = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});


