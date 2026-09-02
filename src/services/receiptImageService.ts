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

  // 3. Fallback limpo (Desktop ou ambiente sem suporte a Web Share API de arquivos)
  if (mimeType === 'image/png') {
    try {
      const dataUrl = URL.createObjectURL(blob);
      const w = window.open('');
      if (w) {
        w.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${cleanTitle}</title>
              <style>
                body { margin: 0; padding: 16px; background: #0f172a; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; min-height: 100vh; }
                img { max-width: 100%; height: auto; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                .tip { margin-bottom: 12px; color: #f59e0b; font-size: 14px; font-weight: bold; text-align: center; }
              </style>
            </head>
            <body>
              <div class="tip">Toque e segure na imagem para salvar ou compartilhar</div>
              <img src="${dataUrl}" alt="${cleanTitle}"/>
            </body>
          </html>
        `);
        w.document.close();
        return { success: true, method: 'new-window', fileUrl: dataUrl, blob };
      }
    } catch (popupErr) {
      console.warn('Fallback window.open falhou:', popupErr);
    }

    const dataUrl = URL.createObjectURL(blob);
    showReceiptImageModal(dataUrl, rawNumber, cleanTitle);
    return { success: true, method: 'overlay', fileUrl: dataUrl, blob };
  } else {
    // Para PDF no Desktop
    try {
      const blobUrl = URL.createObjectURL(blob);
      const w = window.open(blobUrl, '_blank');
      if (!w) {
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
        }, 3000);
      }
      return { success: true, method: 'new-window', fileUrl: blobUrl, blob };
    } catch (desktopErr) {
      console.error('Erro no fallback do PDF:', desktopErr);
      return { success: false, method: 'download', blob };
    }
  }
}

/**
 * Exibe um overlay visual em tela cheia com a imagem do recibo gerada
 * para WebViews que bloqueiam window.open e downloads automáticos.
 */
export function showReceiptImageModal(
  imgDataUrl: string,
  receiptNumber: string,
  churchName: string = 'ABS CHURCH'
): void {
  const existing = document.getElementById('receipt-fullscreen-preview-modal');
  if (existing) {
    existing.remove();
  }

  const cleanNumber = receiptNumber.replace(/\D/g, '') || '000001';

  const modal = document.createElement('div');
  modal.id = 'receipt-fullscreen-preview-modal';
  modal.className =
    'fixed inset-0 z-[9999] flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200';

  modal.innerHTML = `
    <div class="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5 text-slate-100 max-h-[94vh] flex flex-col items-center">
      <!-- Botão Fechar -->
      <button id="close-receipt-modal-btn" class="absolute top-3 right-3 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer" title="Fechar">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>

      <div class="text-center space-y-1 pt-1 pr-6">
        <h4 class="font-black text-base text-white">Recibo de Contribuição #${cleanNumber}</h4>
        <div class="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-semibold text-center">
          <span>👆 <strong>Pressione e segure</strong> sobre o recibo abaixo para <strong>Salvar no Celular</strong></span>
        </div>
      </div>

      <!-- Tag <img> Real para permitir o toque longo / salvar foto nativo do Android -->
      <div class="w-full flex-1 overflow-y-auto flex items-center justify-center p-2 bg-slate-950/70 rounded-2xl border border-slate-800">
        <img
          id="receipt-real-preview-img"
          src="${imgDataUrl}"
          alt="Recibo #${cleanNumber}"
          style="width: 100%; height: auto; max-height: 52vh; object-fit: contain; user-select: none; -webkit-user-select: none; pointer-events: auto; display: block;"
          class="rounded-xl shadow-lg border border-slate-800"
        />
      </div>

      <!-- Botões de Ação: Compartilhar / Salvar Imagem e Fechar -->
      <div class="w-full pt-1 space-y-2">
        <button
          id="share-receipt-img-btn"
          type="button"
          class="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
          <span>Compartilhar / Salvar Imagem</span>
        </button>

        <button
          id="ok-receipt-modal-btn"
          type="button"
          class="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all text-center cursor-pointer"
        >
          Fechar Visualização
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = document.getElementById('close-receipt-modal-btn');
  const okBtn = document.getElementById('ok-receipt-modal-btn');
  const shareBtn = document.getElementById('share-receipt-img-btn');

  const cleanup = () => {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
  };

  if (closeBtn) closeBtn.onclick = cleanup;
  if (okBtn) okBtn.onclick = cleanup;

  if (shareBtn) {
    shareBtn.onclick = async () => {
      try {
        const res = await fetch(imgDataUrl);
        const blob = await res.blob();
        await saveOrShareReceiptFile({
          blob,
          fileName: `recibo_#${cleanNumber}.png`,
          mimeType: 'image/png',
          title: `Recibo #${cleanNumber}`,
          text: `Recibo de Contribuição #${cleanNumber} - ${churchName}`,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Erro ao compartilhar recibo:', err);
        }
      }
    };
  }
}

/**
 * Função principal para gerar o recibo e compartilhar/salvar com compatibilidade total para Android WebView e Desktop.
 */
export async function generateAndShareReceipt(
  options: GenerateReceiptOptions
): Promise<ShareReceiptResult> {
  const { element, receiptNumber, churchName = 'ABS CHURCH', backgroundColor } = options;
  const cleanNumber = receiptNumber.replace(/\D/g, '') || '000001';
  const fileName = `Recibo_${cleanNumber}.png`;

  try {
    // 1. Renderiza o elemento com html2canvas de alta definição
    const computedBg = window.getComputedStyle(element).backgroundColor;
    const bg =
      backgroundColor ||
      (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent'
        ? computedBg
        : '#ffffff');

    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: bg,
      logging: false,
    });

    return new Promise<ShareReceiptResult>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve({ success: false, method: 'share', error: 'Falha ao gerar blob do recibo' });
          return;
        }

        const file = new File([blob], fileName, { type: 'image/png' });

        // 2. DISPARO NATIVO: Web Share API com File (Abre a gaveta de apps nativa do Android/iOS)
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
            console.warn('Web Share com File cancelado ou não suportado:', err);
          }
        }

        // 3. Fallback: abre a imagem em dataURL numa nova janela limpa ou modal overlay
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const w = window.open('');
          if (w) {
            w.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Recibo #${cleanNumber}</title>
                  <style>
                    body { margin: 0; padding: 16px; background: #0f172a; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; min-height: 100vh; }
                    img { max-width: 100%; height: auto; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                    .tip { margin-bottom: 12px; color: #f59e0b; font-size: 14px; font-weight: bold; text-align: center; }
                  </style>
                </head>
                <body>
                  <div class="tip">Toque e segure na imagem para salvar ou compartilhar</div>
                  <img src="${dataUrl}" alt="Recibo #${cleanNumber}"/>
                </body>
              </html>
            `);
            w.document.close();
            resolve({ success: true, method: 'new-window', fileUrl: dataUrl, blob });
            return;
          }
        } catch (popupErr) {
          console.warn('Fallback popup falhou:', popupErr);
        }

        const dataUrl = canvas.toDataURL('image/png');
        showReceiptImageModal(dataUrl, cleanNumber, churchName);
        resolve({ success: true, method: 'overlay', fileUrl: dataUrl, blob });
      }, 'image/png');
    });
  } catch (err: any) {
    console.error('Erro ao gerar e compartilhar recibo:', err);
    throw err;
  }
}

