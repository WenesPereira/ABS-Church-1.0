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
 * Salva ou compartilha um arquivo (PNG / PDF) de forma direta e sem modais intermediários.
 * Faz upload temporário para o Supabase Storage para gerar link HTTP e aciona a Web Share API
 * no Android/iOS ou download limpo no Desktop.
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
  const cleanTitle = title || `Recibo #${rawNumber}`;
  const cleanText = text || `Recibo oficial de contribuição #${rawNumber}`;

  // 1. Upload para o Supabase Storage para gerar URL pública 'https://'
  let publicUrl: string | undefined;
  try {
    const uploadRes = await uploadBlobToSupabase(blob, fileName, mimeType, bucket);
    if (uploadRes.publicUrl) {
      publicUrl = uploadRes.publicUrl;
    }
  } catch (upErr) {
    console.warn('Upload temporário falhou, procedendo com fallback offline:', upErr);
  }

  // 2. DISPARO NATIVO (GAVETA DE APPS DO ANDROID / ONEDRIVE / ADOBE / DRIVE / WHATSAPP)
  if (publicUrl) {
    const shareData = {
      title: cleanTitle,
      text: `${cleanText}\nAcesse o documento oficial:`,
      url: publicUrl,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return { success: true, method: 'share', fileUrl: publicUrl, blob };
      } catch (err: any) {
        // Se o usuário cancelar a partilha ou der erro, abre a URL diretamente
        console.info('Compartilhamento cancelado ou finalizado, abrindo URL diretamente:', err);
        const win = window.open(publicUrl, '_blank');
        if (!win) {
          window.location.href = publicUrl;
        }
        return { success: true, method: 'new-window', fileUrl: publicUrl, blob };
      }
    } else {
      const win = window.open(publicUrl, '_blank');
      if (!win) {
        window.location.href = publicUrl;
      }
      return { success: true, method: 'new-window', fileUrl: publicUrl, blob };
    }
  }

  // 3. FALLBACK OFFLINE SE O SUPABASE NÃO ESTIVER DISPONÍVEL
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // Fallback se não obteve publicUrl: tenta Web Share API com File nativo
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function'
    ) {
      try {
        const file = new File([blob], fileName, { type: mimeType });
        if (navigator.canShare({ files: [file] })) {
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
      }
    }

    // Fallback final no mobile: blob URL
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      window.location.href = blobUrl;
    }
    return { success: true, method: 'new-window', fileUrl: blobUrl, blob };
  }

  // Fallback Desktop via Blob local
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
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 3000);

    return { success: true, method: 'download', fileUrl: blobUrl, blob };
  } catch (err) {
    console.error('Erro ao acionar download direto no desktop:', err);
    return { success: false, method: 'download', blob };
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
  const fileName = `recibo_#${cleanNumber}.png`;

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

    const imgData = canvas.toDataURL('image/png');

    // 2. Converte para Blob e faz o upload/compartilhamento seguro via Supabase Storage
    const response = await fetch(imgData);
    const blob = await response.blob();

    return await saveOrShareReceiptFile({
      blob,
      fileName,
      mimeType: 'image/png',
      title: `Recibo #${cleanNumber}`,
      text: `Recibo de Contribuição #${cleanNumber} - ${churchName}`,
    });
  } catch (err: any) {
    console.error('Erro ao gerar e compartilhar recibo:', err);
    throw err;
  }
}

