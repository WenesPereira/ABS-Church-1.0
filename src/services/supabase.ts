import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta as unknown as { env: Record<string, string> }).env || {};
const rawUrl = (env.VITE_SUPABASE_URL || '').trim();
const rawKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

function validateSupabaseConfig(url: string, key: string): boolean {
  if (!url || !key) return false;

  const lowerUrl = url.toLowerCase().trim();
  const lowerKey = key.toLowerCase().trim();

  // Rejeita URLs/Chaves com palavras genéricas, placeholders ou caminhos não configurados
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

  // Uma URL do Supabase válida deve conter um domínio do Supabase ou localhost para dev
  const isSupabaseHost =
    lowerUrl.includes('.supabase.co') ||
    lowerUrl.includes('.supabase.in') ||
    lowerUrl.includes('.supabase.net') ||
    lowerUrl.includes('localhost:54321') ||
    lowerUrl.includes('127.0.0.1:54321');

  if (!isSupabaseHost) {
    return false;
  }

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

export const isSupabaseConfigured = validateSupabaseConfig(rawUrl, rawKey);

if (!isSupabaseConfigured) {
  console.info(
    'ℹ️ Supabase não configurado com credenciais válidas. O aplicativo operará normalmente utilizando o armazenamento local (LocalStorage).'
  );
}

// Fallback de URL/Key para evitar exceções do SDK
const safeUrl = isSupabaseConfigured ? rawUrl : 'https://unconfigured-project.supabase.co';
const safeKey = isSupabaseConfigured ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.unconfigured';

export const supabase: SupabaseClient = createClient(safeUrl, safeKey);

