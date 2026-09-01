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
 * Detecta se o app está rodando em modo instalado / PWA / standalone / TWA
 */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');
  return isStandalone;
}

/**
 * Exibe um modal/overlay de fallback para WebViews que bloqueiam downloads diretos,
 * instruindo o usuário a pressionar e segurar a imagem para salvá-la na galeria.
 */
export function showMobileImagePreviewOverlay(blobUrl: string, fileName: string): void {
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
 * Salva ou compartilha um arquivo (PNG / PDF) com estratégia otimizada:
 * - App Instalado / Mobile: Web Share API com arquivos para salvar na Galeria/Fotos/Downloads
 * - Desktop / Navegador Web: Download direto via tag <a> com nome limpo e Blob URL
 * - Fallback defensivo para WebView: Visualizador com instrução de toque longo
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

  // 1. FLUXO APP INSTALADO / SMARTPHONE (Web Share API nativo com suporte a arquivos)
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    try {
      const file = new File([blob], fileName, { type: mimeType });
      const canShareFiles = navigator.canShare({ files: [file] });

      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title: title || `Recibo #${fileName.replace(/\D/g, '')}`,
          text: text || `Recibo Oficial de Contribuição - ${fileName}`,
        });
        return { success: true, method: 'share', blob };
      }
    } catch (shareErr: any) {
      // Se o usuário cancelou o menu nativo do sistema operacional (AbortError), encerra sem forçar download duplo
      if (shareErr?.name === 'AbortError') {
        return { success: true, method: 'share-abort', blob };
      }
      console.warn('Web Share API não completou ou foi cancelado:', shareErr);
    }
  }

  // 2. DISPOSITIVOS MÓVEIS / WEBVIEW SEM SUPORTE A ARQUIVOS VIA SHARE
  const blobUrl = URL.createObjectURL(blob);

  if (isMobile) {
    if (mimeType === 'image/png') {
      // Exibe preview amigável para salvar na galeria
      showMobileImagePreviewOverlay(blobUrl, fileName);
      return { success: true, method: 'fallback-preview', fileUrl: blobUrl, blob };
    } else {
      // Para PDF em WebView, abre em nova aba/janela segura
      try {
        const opened = window.open(blobUrl, '_blank');
        if (opened) {
          return { success: true, method: 'fallback-preview', fileUrl: blobUrl, blob };
        }
      } catch {
        // segue para o link abaixo
      }
    }
  }

  // 3. FLUXO WEB (DESKTOP / NAVEGADOR PADRÃO): Download direto via Blob Object URL
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
      if (!isMobile || mimeType !== 'image/png') {
        URL.revokeObjectURL(blobUrl);
      }
    }, 1500);

    return { success: true, method: 'download', fileUrl: blobUrl, blob };
  } catch (err) {
    console.error('Erro ao acionar download no navegador:', err);
    return { success: false, method: 'download', fileUrl: blobUrl, blob };
  }
}

/**
 * Converte um elemento DOM (card de recibo) em imagem PNG de alta definição,
 * preservando o layout CSS original, bordas, cores e alinhamentos.
 */
export async function downloadElementAsPng(
  element: HTMLElement,
  fileName: string = 'recibo.png',
  options: GenerateReceiptImageOptions = {}
): Promise<SaveFileResult> {
  const scale = options.scale || 3;
  // Se options.backgroundColor não for passado, usa a cor de fundo do próprio elemento
  const computedBg = window.getComputedStyle(element).backgroundColor;
  const backgroundColor =
    options.backgroundColor ||
    (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent'
      ? computedBg
      : '#090d16');

  const cleanFileName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor,
    logging: false,
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
    title: options.title || `Recibo #${cleanFileName.replace(/\D/g, '')}`,
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
  const computedBg = window.getComputedStyle(element).backgroundColor;
  const backgroundColor =
    options.backgroundColor ||
    (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent'
      ? computedBg
      : '#090d16');

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
