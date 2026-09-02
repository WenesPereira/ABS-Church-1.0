import html2canvas from 'html2canvas-pro';

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
 * Salva ou compartilha um arquivo (PNG / PDF) de forma direta e sem modais intermediários
 */
export async function saveOrShareReceiptFile(options: {
  blob: Blob;
  fileName: string;
  mimeType: 'image/png' | 'application/pdf';
  title?: string;
  text?: string;
}): Promise<SaveFileResult> {
  const { blob, fileName, mimeType, title, text } = options;
  const rawNumber = fileName.replace(/\D/g, '') || '000001';
  const cleanTitle = title || `Recibo #${rawNumber}`;
  const cleanText = text || `Recibo oficial de contribuição #${rawNumber}`;

  // 1. Web Share API nativa com arquivo
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
      console.warn('Web Share API falhou, tentando fallback:', shareErr);
    }
  }

  // 2. Fallback direto de download
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
    }, 2000);

    return { success: true, method: 'download', fileUrl: blobUrl, blob };
  } catch (err) {
    console.error('Erro ao acionar download direto do arquivo:', err);
    return { success: false, method: 'download', blob };
  }
}


/**
 * Exibe um overlay visual em tela cheia com a imagem do recibo gerada
 * para WebViews que bloqueiam window.open e downloads automáticos.
 */
export function showReceiptImageModal(imgDataUrl: string, receiptNumber: string): void {
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
    <div class="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 text-slate-100 max-h-[92vh] flex flex-col items-center">
      <!-- Botão Fechar -->
      <button id="close-receipt-modal-btn" class="absolute top-3 right-3 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer" title="Fechar">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>

      <div class="text-center space-y-1 pt-1">
        <h4 class="font-black text-base text-white">Recibo de Contribuição #${cleanNumber}</h4>
        <div class="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-semibold text-center">
          <span>👆 <strong>Pressione e segure</strong> sobre o recibo abaixo para <strong>Salvar no Celular</strong></span>
        </div>
      </div>

      <div class="w-full flex-1 overflow-y-auto flex items-center justify-center p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
        <img src="${imgDataUrl}" alt="Recibo #${cleanNumber}" class="max-h-[55vh] w-auto object-contain rounded-xl shadow-lg border border-slate-800" />
      </div>

      <div class="w-full pt-1 flex gap-2">
        <button id="ok-receipt-modal-btn" class="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all text-center cursor-pointer">
          Fechar Visualização
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = document.getElementById('close-receipt-modal-btn');
  const okBtn = document.getElementById('ok-receipt-modal-btn');

  const cleanup = () => {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
  };

  if (closeBtn) closeBtn.onclick = cleanup;
  if (okBtn) okBtn.onclick = cleanup;
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

    // 2. Converte para Blob e cria o File nativo
    const response = await fetch(imgData);
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: 'image/png' });

    // 3. ESTRATÉGIA PRINCIPAL: Web Share API (Android, iOS, PWA, WebView com suporte)
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function'
    ) {
      try {
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Recibo #${cleanNumber}`,
            text: `Recibo de Contribuição #${cleanNumber} - ${churchName}`,
          });
          return { success: true, method: 'share' };
        }
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') {
          return { success: true, method: 'share-abort' };
        }
        console.warn('Web Share API não completou, acionando fallback:', shareErr);
      }
    }

    // 4. ESTRATÉGIA FALLBACK PARA DISPOSITIVOS MÓVEIS / ANDROID WEBVIEW
    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      try {
        const win = window.open('');
        if (win) {
          win.document.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Recibo #${cleanNumber}</title>
                <style>
                  body {
                    margin: 0;
                    padding: 16px;
                    background: #090d16;
                    color: #ffffff;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  }
                  .tip {
                    background: #f59e0b;
                    color: #000000;
                    font-weight: bold;
                    font-size: 13px;
                    padding: 10px 16px;
                    border-radius: 12px;
                    margin-bottom: 16px;
                    text-align: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  }
                  img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
                  }
                </style>
              </head>
              <body>
                <div class="tip">👆 Pressione e segure sobre a imagem para Salvar no Celular</div>
                <img src="${imgData}" alt="Recibo #${cleanNumber}" />
              </body>
            </html>
          `);
          win.document.close();
          return { success: true, method: 'new-window' };
        }
      } catch (popupErr) {
        console.warn('Falha ao abrir nova janela, exibindo modal in-app:', popupErr);
      }

      // Se window.open foi bloqueado, exibe modal overlay in-app
      showReceiptImageModal(imgData, cleanNumber);
      return { success: true, method: 'overlay' };
    }

    // 5. ESTRATÉGIA DESKTOP / WEB PADRÃO: Download tradicional via link <a> e Blob URL
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(blobUrl);
    }, 2000);

    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('Erro ao gerar e compartilhar recibo:', err);
    throw err;
  }
}
