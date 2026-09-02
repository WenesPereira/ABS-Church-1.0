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
 * Faz upload do Blob para o Supabase Storage e retorna a URL pública HTTPS.
 * Utiliza o bucket 'recibos' ou 'temp_exports'.
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

    // 3. Obtém a URL pública HTTPS do arquivo
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
 * Salva ou compartilha um arquivo (PNG / PDF).
 * Realiza upload para o Supabase Storage (HTTPS) e dispara a Web Share API com a URL pública HTTPS,
 * eliminando problemas de Base64 / data URLs no WebView do Android.
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
  const cleanText = text || (mimeType === 'application/pdf' ? 'Relatório Oficial de Tesouraria - ABS Church' : `Comprovante de Contribuição #${rawNumber}`);

  let publicUrl: string | undefined;

  // 1. Upload do Blob para o Supabase Storage para obter URL pública HTTPS
  if (isSupabaseConfigured) {
    try {
      const uploadResult = await uploadBlobToSupabase(blob, fileName, mimeType, bucket);
      if (uploadResult.publicUrl) {
        publicUrl = uploadResult.publicUrl;
      }
    } catch (uploadErr) {
      console.warn('Upload para Supabase falhou, utilizando fallback:', uploadErr);
    }
  }

  // 2. DISPARO NATIVO: Web Share API com URL pública HTTPS ou Arquivo binário
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (publicUrl) {
        // Compartilhamento via URL HTTPS pública (compatibilidade 100% Android WebView / iOS)
        await navigator.share({
          title: cleanTitle,
          text: cleanText,
          url: publicUrl,
        });
        return { success: true, method: 'share', blob, fileUrl: publicUrl };
      } else {
        // Se Supabase não estiver configurado, tenta compartilhar via File object
        const file = new File([blob], fileName, { type: mimeType });
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: cleanTitle,
            text: cleanText,
          });
          return { success: true, method: 'share', blob };
        } else {
          await navigator.share({
            title: cleanTitle,
            text: cleanText,
          });
          return { success: true, method: 'share', blob };
        }
      }
    } catch (shareErr: any) {
      if (shareErr?.name === 'AbortError') {
        return { success: true, method: 'share-abort', blob, fileUrl: publicUrl };
      }
      console.warn('Web Share API não completado, tentando abertura:', shareErr);
      if (publicUrl) {
        window.open(publicUrl, '_blank');
        return { success: true, method: 'new-window', fileUrl: publicUrl, blob };
      }
    }
  }

  // 3. Fallback: Se tem URL pública HTTPS, abre no navegador/nova aba
  if (publicUrl) {
    try {
      window.open(publicUrl, '_blank');
      return { success: true, method: 'new-window', fileUrl: publicUrl, blob };
    } catch (winErr) {
      console.warn('window.open falhou:', winErr);
    }
  }

  // 4. Fallback final via Blob URL (nunca Base64)
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
    console.error('Erro no fallback:', err);
    return { success: false, method: 'download', blob };
  }
}

/**
 * Função principal para gerar o recibo e compartilhar/salvar via Supabase Storage HTTPS URL
 * Eliminando completamente o uso de Base64 / dataURLs.
 */
export async function generateAndShareReceipt(
  options: GenerateReceiptOptions
): Promise<ShareReceiptResult> {
  const { element, receiptNumber, churchName = 'ABS CHURCH', backgroundColor } = options;
  const cleanNumber = receiptNumber.replace(/\D/g, '') || '000001';
  const fileName = `recibo_${cleanNumber}_${Date.now()}.png`;

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

          // Salva ou compartilha via Supabase Storage HTTPS URL e Web Share API
          const result = await saveOrShareReceiptFile({
            blob,
            fileName: `Recibo_${cleanNumber}.png`,
            mimeType: 'image/png',
            title: `Recibo #${cleanNumber}`,
            text: `Comprovante de Contribuição #${cleanNumber} - ${churchName}`,
          });

          resolve(result);
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

