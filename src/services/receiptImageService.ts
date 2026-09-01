import html2canvas from 'html2canvas-pro';

export interface GenerateReceiptImageOptions {
  fileName?: string;
  backgroundColor?: string;
  scale?: number;
  title?: string;
}

export interface SaveFileResult {
  success: boolean;
  method: 'share' | 'share-abort' | 'download' | 'fallback-preview';
  fileUrl?: string;
  blob?: Blob;
}

/**
 * Detecta se o ambiente atual é um dispositivo móvel (Android / iOS) ou WebView
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
}

/**
 * Exibe um modal/overlay de fallback para WebViews que bloqueiam downloads diretos,
 * instruindo o usuário a pressionar e segurar a imagem para salvá-la na galeria.
 */
export function showMobileImagePreviewOverlay(blobUrl: string, fileName: string): void {
  // Remove qualquer overlay anterior
  const existing = document.getElementById('receipt-image-preview-overlay');
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'receipt-image-preview-overlay';
  overlay.className =
    'fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200';

  overlay.innerHTML = `
    <div class="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] flex flex-col items-center">
      <!-- Botão Fechar -->
      <button id="close-receipt-preview-btn" class="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer" title="Fechar">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>

      <div class="text-center space-y-1">
        <h4 class="font-black text-base text-white">Recibo Gerado</h4>
        <div class="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-medium flex items-center justify-center gap-1.5">
          <span>👆 <strong>Pressione e segure</strong> sobre a imagem abaixo para <strong>Salvar na Galeria</strong></span>
        </div>
      </div>

      <div class="w-full flex-1 overflow-y-auto flex items-center justify-center p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
        <img src="${blobUrl}" alt="${fileName}" class="max-h-[55vh] w-auto object-contain rounded-xl shadow-lg border border-slate-800" />
      </div>

      <div class="w-full pt-1 flex gap-2">
        <button id="ok-receipt-preview-btn" class="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all text-center cursor-pointer">
          Concluir
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = document.getElementById('close-receipt-preview-btn');
  const okBtn = document.getElementById('ok-receipt-preview-btn');

  const cleanup = () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  if (closeBtn) closeBtn.onclick = cleanup;
  if (okBtn) okBtn.onclick = cleanup;
}

/**
 * Salva ou compartilha um arquivo (PNG / PDF) com estratégia otimizada para Mobile/WebView/Desktop
 */
export async function saveOrShareReceiptFile(options: {
  blob: Blob;
  fileName: string;
  mimeType: 'image/png' | 'application/pdf';
  title?: string;
  text?: string;
}): Promise<SaveFileResult> {
  const { blob, fileName, mimeType, title = 'Recibo de Contribuição', text } = options;
  const isMobile = isMobileDevice();

  // 1. PRIORIDADE: Web Share API (Compartilhamento Nativo com Arquivos)
  if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
    try {
      const file = new File([blob], fileName, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: text || `Recibo Oficial de Contribuição - ${fileName}`,
        });
        return { success: true, method: 'share', blob };
      }
    } catch (shareErr: any) {
      if (shareErr?.name === 'AbortError') {
        // Usuário apenas fechou a gaveta nativa de compartilhamento
        return { success: true, method: 'share-abort', blob };
      }
      console.warn('Web Share API não completou ou indisponível:', shareErr);
    }
  }

  // 2. DISPOSITIVOS MÓVEIS / WEBVIEW SEM WEB SHARE:
  const blobUrl = URL.createObjectURL(blob);

  if (isMobile) {
    if (mimeType === 'image/png') {
      // Exibe preview amigável com instrução de salvar na galeria
      showMobileImagePreviewOverlay(blobUrl, fileName);
      return { success: true, method: 'fallback-preview', fileUrl: blobUrl, blob };
    } else {
      // Para PDF em WebView, abre em nova aba
      try {
        window.open(blobUrl, '_blank');
      } catch {
        // fallback para link
      }
    }
  }

  // 3. DESKTOP / FALLBACK GERAL: Download direto via tag <a> com nome limpo
  try {
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
      // Se não for preview ativo, revoga a url
      if (!isMobile || mimeType !== 'image/png') {
        URL.revokeObjectURL(blobUrl);
      }
    }, 1500);

    return { success: true, method: 'download', fileUrl: blobUrl, blob };
  } catch (err) {
    console.error('Erro ao acionar download:', err);
    return { success: false, method: 'download', fileUrl: blobUrl, blob };
  }
}

/**
 * Converte um elemento DOM (card de recibo) em imagem PNG de alta definição,
 * com suporte nativo a Web Share API para celulares/PWA e fallback seguro para WebView.
 */
export async function downloadElementAsPng(
  element: HTMLElement,
  fileName: string = 'recibo.png',
  options: GenerateReceiptImageOptions = {}
): Promise<SaveFileResult> {
  const scale = options.scale || 3;
  const backgroundColor = options.backgroundColor || '#020617';
  const cleanFileName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor,
    logging: false,
    onclone: (clonedDoc) => {
      try {
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const style = window.getComputedStyle(htmlEl);
          if (style.backgroundColor && style.backgroundColor.includes('oklch')) {
            htmlEl.style.backgroundColor = '#0f172a';
          }
          if (style.color && style.color.includes('oklch')) {
            htmlEl.style.color = '#f8fafc';
          }
          if (style.borderColor && style.borderColor.includes('oklch')) {
            htmlEl.style.borderColor = '#334155';
          }
        });
      } catch (e) {
        console.warn('Aviso de sanitização de cores para html2canvas:', e);
      }
    },
  });

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });

  if (!blob) {
    throw new Error('Falha ao gerar o arquivo binário da imagem do recibo.');
  }

  return await saveOrShareReceiptFile({
    blob,
    fileName: cleanFileName,
    mimeType: 'image/png',
    title: options.title || 'Recibo de Contribuição',
  });
}

/**
 * Converte o elemento DOM do recibo em um Blob PNG
 */
export async function generateElementPngBlob(
  element: HTMLElement,
  options: GenerateReceiptImageOptions = {}
): Promise<Blob | null> {
  const scale = options.scale || 3;
  const backgroundColor = options.backgroundColor || '#020617';

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor,
    logging: false,
  });

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}
