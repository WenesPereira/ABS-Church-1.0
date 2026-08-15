import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta as unknown as { env: Record<string, string> }).env || {};

// Credenciais padrão fornecidas para o projeto
export const DEFAULT_SUPABASE_URL = 'https://ikizzszskfpafdppupgc.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlraXp6c3pza2ZwYWZkcHB1cGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMzM0NzksImV4cCI6MjEwMTcwOTQ3OX0.pPlhTo9toQzbrA8b_mGJdDJd10KBcSp4f8L8W3_oK10';

const rawUrlInput = (
  env.VITE_SUPABASE_URL ||
  env.SUPABASE_URL ||
  DEFAULT_SUPABASE_URL
).trim();

const rawKeyInput = (
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY ||
  env.SUPABASE_KEY ||
  DEFAULT_SUPABASE_ANON_KEY
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

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? cleanedUrl : DEFAULT_SUPABASE_URL,
  isSupabaseConfigured ? cleanedKey : DEFAULT_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);



