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

  const file = new File([blob], fileName, { type: mimeType });

  // 1. DISPARO NATIVO IMEDIATO COM ARQUIVO (preserva o gesto do usuário sem atrasos de rede)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: cleanTitle,
          text: cleanText,
        });
        // Dispara upload em background para backup no Supabase sem prender a UI
        if (isSupabaseConfigured) {
          uploadBlobToSupabase(blob, fileName, mimeType, bucket).catch(() => {});
        }
        return { success: true, method: 'share', blob };
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') {
          return { success: true, method: 'share-abort', blob };
        }
        console.warn('Compartilhamento nativo de arquivo indisponível ou gesto expirado, acionando fallback:', shareErr?.message || shareErr);
      }
    }
  }

  let publicUrl: string | undefined;

  // 2. Upload do Blob para o Supabase Storage para obter URL pública HTTPS (se nativo falhou ou não suportado)
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

  // 3. Segunda tentativa nativa com URL pública se disponível
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && publicUrl) {
    try {
      await navigator.share({
        title: cleanTitle,
        text: cleanText,
        url: publicUrl,
      });
      return { success: true, method: 'share', blob, fileUrl: publicUrl };
    } catch (shareUrlErr: any) {
      if (shareUrlErr?.name === 'AbortError') {
        return { success: true, method: 'share-abort', blob, fileUrl: publicUrl };
      }
      console.warn('Web Share API com URL pública falhou:', shareUrlErr?.message || shareUrlErr);
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

/**
 * Compartilha o recibo com o membro:
 * 1. Usa o Blob já gerado ou baixa a imagem do Supabase como arquivo
 * 2. Verifica se o navegador/celular suporta compartilhar arquivos (navigator.canShare com files)
 *    e dispara o compartilhamento nativo com o arquivo PNG anexo (WhatsApp, Telegram, etc.)
 * 3. Se o compartilhamento nativo falhar (ex: gesto expirado, contexto restrito), executa
 *    automaticamente o fallback para WhatsApp com mensagem formatada e link direto da imagem
 */
export async function compartilharRecibo(
  urlImagem: string,
  numeroRecibo: string | number,
  nomeMembro: string,
  telefone?: string,
  existingBlob?: Blob
): Promise<void> {
  try {
    let blob: Blob;
    if (existingBlob) {
      blob = existingBlob;
    } else if (urlImagem) {
      // 1. Baixa a imagem do Supabase como arquivo
      const response = await fetch(urlImagem);
      blob = await response.blob();
    } else {
      console.warn("Nenhuma imagem ou blob fornecido para compartilhar.");
      return;
    }

    const file = new File([blob], `Recibo_${numeroRecibo}.png`, { type: 'image/png' });

    let shared = false;

    // 2. Verifica se o navegador/celular suporta compartilhar arquivos
    if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Comprovante #${numeroRecibo}`,
          text: `Comprovante de Contribuição #${numeroRecibo} - ${nomeMembro}`,
          files: [file],
        });
        shared = true;
        return;
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') {
          return; // Usuário cancelou o modal nativo
        }
        // Gesto do usuário expirou ou compartilhamento de arquivo não permitido:
        // Aciona o fallback para WhatsApp
        console.warn("Compartilhamento nativo não permitido ou gesto expirado, acionando fallback WhatsApp:", shareErr?.message || shareErr);
      }
    }

    if (!shared) {
      // Fallback para WhatsApp com mensagem formatada
      const textoMensagem = encodeURIComponent(
        `*Comprovante de Contribuição #${numeroRecibo}*\n` +
        `👤 *Membro:* ${nomeMembro}\n\n` +
        (urlImagem ? `📄 *Visualizar Recibo:* ${urlImagem}` : '')
      );

      const cleanPhone = telefone ? telefone.replace(/\D/g, '') : '';
      const waUrl = cleanPhone
        ? `https://api.whatsapp.com/send?phone=${cleanPhone.length === 10 || cleanPhone.length === 11 ? '55' + cleanPhone : cleanPhone}&text=${textoMensagem}`
        : `https://api.whatsapp.com/send?text=${textoMensagem}`;

      const opened = window.open(waUrl, '_blank');
      if (!opened && urlImagem) {
        window.location.href = waUrl;
      }
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return;
    }
    console.warn("Aviso ao compartilhar recibo, tentando envio WhatsApp:", error);
    if (urlImagem) {
      const textoMensagem = encodeURIComponent(
        `*Comprovante de Contribuição #${numeroRecibo}*\n` +
        `👤 *Membro:* ${nomeMembro}\n\n` +
        `📄 *Visualizar Recibo:* ${urlImagem}`
      );
      window.open(`https://api.whatsapp.com/send?text=${textoMensagem}`, '_blank');
    }
  }
}


