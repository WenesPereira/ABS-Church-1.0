import html2canvas from 'html2canvas-pro';
import { supabase, isSupabaseConfigured } from './supabase';

export interface GenerateReceiptOptions {
  element: HTMLElement;
  receiptNumber: string;
  churchName?: string;
  contributorName?: string;
  backgroundColor?: string;
}

export interface ShareReceiptResult {
  success: boolean;
  method: 'share' | 'share-abort' | 'new-window' | 'download' | 'overlay';
  error?: string;
  blob?: Blob;
  fileUrl?: string;
}

export type SaveFileResult = ShareReceiptResult;

/**
 * Faz upload temporário do Blob para o Supabase Storage e retorna a URL pública HTTP
 */
export async function uploadBlobToSupabase(
  blob: Blob,
  fileName: string,
  mimeType: string,
  bucket: string = 'recibos'
): Promise<{ publicUrl?: string; storagePath?: string; error?: any }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase não configurado' };
  }

  const ext = fileName.split('.').pop() || (mimeType === 'application/pdf' ? 'pdf' : 'png');
  const cleanBase = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const storageFileName = `export_${Date.now()}_${cleanBase}.${ext}`;

  try {
    // 1. Tenta upload no bucket especificado (padrão: 'recibos')
    let activeBucket = bucket;
    let { error } = await supabase.storage
      .from(activeBucket)
      .upload(storageFileName, blob, {
        contentType: mimeType,
        upsert: true,
      });

    // 2. Fallback resiliente para bucket 'temp_exports' caso o principal retorne erro
    if (error && activeBucket !== 'temp_exports') {
      const retryRes = await supabase.storage
        .from('temp_exports')
        .upload(storageFileName, blob, {
          contentType: mimeType,
          upsert: true,
        });
      if (!retryRes.error) {
        error = null;
        activeBucket = 'temp_exports';
      }
    }

    if (error) {
      console.warn('Aviso no upload para Supabase Storage:', error.message || error);
      return { error };
    }

    // 3. Obtém a URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from(activeBucket)
      .getPublicUrl(storageFileName);

    const publicUrl = urlData?.publicUrl;
    return { publicUrl, storagePath: `${activeBucket}/${storageFileName}` };
  } catch (err) {
    console.warn('Exceção ao fazer upload para Supabase Storage:', err);
    return { error: err };
  }
}

/**
 * Salva ou compartilha um arquivo (PNG / PDF) utilizando prioritariamente a Web Share API nativa com File object.
 * Abre diretamente a gaveta de aplicativos do Android/iOS (WhatsApp, Drive, Adobe, etc.) sem disparar alertas de download de navegador.
 */
export async function saveOrShareReceiptFile(options: {
  blob: Blob;
  fileName: string;
  mimeType: 'image/png' | 'application/pdf';
  title?: string;
  text?: string;
  bucket?: string;
}): Promise<SaveFileResult> {
  const { blob, fileName, mimeType, title, text, bucket = 'recibos' } = options;
  const rawNumber = fileName.replace(/\D/g, '') || '000001';
  const cleanTitle = title || (mimeType === 'application/pdf' ? `Relatório #${rawNumber}` : `Recibo #${rawNumber}`);
  const cleanText = text || (mimeType === 'application/pdf' ? 'Relatório Oficial de Tesouraria - ABS Church' : 'Comprovante de Contribuição - ABS Church');

  // 1. Cria o objeto File nativo a partir do Blob
  const file = new File([blob], fileName, { type: mimeType });

  // 2. DISPARO NATIVO: Web Share API com File (Abre a gaveta de aplicativos nativa do sistema)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (typeof navigator.canShare === 'function') {
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: cleanTitle,
            text: cleanText,
          });
          return { success: true, method: 'share', blob };
        }
      } else {
        // WebView / navegador sem canShare mas com suporte a share com files
        await navigator.share({
          files: [file],
          title: cleanTitle,
          text: cleanText,
        });
        return { success: true, method: 'share', blob };
      }
    } catch (shareErr: any) {
      if (shareErr?.name === 'AbortError') {
        return { success: true, method: 'share-abort', blob };
      }
      console.warn('Web Share com File não completado:', shareErr);
    }
  }

  // Opcional: upload em segundo plano no Supabase Storage para backup
  if (isSupabaseConfigured) {
    uploadBlobToSupabase(blob, fileName, mimeType, bucket).catch((e) =>
      console.warn('Backup silencioso no Supabase Storage falhou:', e)
    );
  }

  // 3. Fallback direto (Download do arquivo caso navigator.share não esteja disponível)
  try {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 2000);
    return { success: true, method: 'download', fileUrl: blobUrl, blob };
  } catch (err) {
    console.error('Erro no fallback de download:', err);
    return { success: false, method: 'download', blob };
  }
}

/**
 * Função principal para gerar o recibo e compartilhar/salvar diretamente via Web Share API com File
 */
export async function generateAndShareReceipt(
  options: GenerateReceiptOptions
): Promise<ShareReceiptResult> {
  const { element, receiptNumber, churchName = 'ABS CHURCH', backgroundColor } = options;
  const cleanNumber = receiptNumber.replace(/\D/g, '') || '000001';
  const fileName = `Recibo_${cleanNumber}.png`;

  try {
    const computedBg = window.getComputedStyle(element).backgroundColor;
    const bg =
      backgroundColor ||
      (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent'
        ? computedBg
        : '#ffffff');

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: bg,
      logging: false,
    });

    return new Promise<ShareReceiptResult>((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        try {
          if (!blob) {
            resolve({ success: false, method: 'share', error: 'Falha ao gerar blob do recibo' });
            return;
          }

          const file = new File([blob], fileName, { type: 'image/png' });

          // 1. DISPARO NATIVO DIRETO: Web Share API com File (Abre WhatsApp, Drive, Galeria)
          if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
              if (typeof navigator.canShare === 'function') {
                if (navigator.canShare({ files: [file] })) {
                  await navigator.share({
                    files: [file],
                    title: `Recibo #${cleanNumber}`,
                    text: `Comprovante de Contribuição - ${churchName}`,
                  });
                  resolve({ success: true, method: 'share', blob });
                  return;
                }
              } else {
                await navigator.share({
                  files: [file],
                  title: `Recibo #${cleanNumber}`,
                  text: `Comprovante de Contribuição - ${churchName}`,
                });
                resolve({ success: true, method: 'share', blob });
                return;
              }
            } catch (err: any) {
              if (err?.name === 'AbortError') {
                resolve({ success: true, method: 'share-abort', blob });
                return;
              }
              console.warn('Web Share com File não completado:', err);
            }
          }

          // 2. Fallback direto para download do arquivo (sem janelas ou modais intermediários)
          const link = document.createElement('a');
          link.download = fileName;
          link.href = canvas.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
          }, 1000);

          resolve({ success: true, method: 'download', blob });
        } catch (blobErr: any) {
          reject(blobErr);
        }
      }, 'image/png');
    });
  } catch (err: any) {
    console.error('Erro ao gerar e compartilhar recibo:', err);
    throw err;
  }
}

