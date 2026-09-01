import html2canvas from 'html2canvas-pro';

export interface GenerateReceiptImageOptions {
  fileName?: string;
  backgroundColor?: string;
  scale?: number;
  title?: string;
}

export interface SaveFileResult {
  success: boolean;
  method: 'share' | 'share-abort' | 'download';
  fileUrl?: string;
  blob?: Blob;
}

/**
 * Salva ou compartilha um arquivo (PNG / PDF) de forma direta e sem modais intermediários:
 * 1. Web Share API direta se o dispositivo tiver suporte a compartilhamento de arquivos (Mobile / PWA / WebView)
 * 2. Download direto com Blob Object URL no Desktop ou se o Web Share não estiver disponível
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

  // 1. PRIORIDADE MÓVEL: Acionamento direto da Web Share API nativa com arquivos
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
      // Se o usuário apenas fechou a gaveta nativa de compartilhamento (AbortError), não faz nada extra
      if (shareErr?.name === 'AbortError') {
        return { success: true, method: 'share-abort', blob };
      }
      console.warn('Web Share API não completou, aplicando fallback de download direto:', shareErr);
    }
  }

  // 2. FALLBACK DIRETO (Desktop ou Web Share não disponível): Download via link <a> e Blob URL
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
 * Converte um elemento DOM (card de recibo) em imagem PNG de alta definição,
 * preservando 100% do visual elegante original, e aciona compartilhamento nativo / download direto.
 */
export async function downloadElementAsPng(
  element: HTMLElement,
  fileName: string = 'recibo.png',
  options: GenerateReceiptImageOptions = {}
): Promise<SaveFileResult> {
  const scale = options.scale || 3;
  const cleanFileName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  const rawNumber = cleanFileName.replace(/\D/g, '') || '000001';

  // Pequeno delay para assegurar que todas as fontes, SVGs e estilos estejam totalmente pintados
  await new Promise((resolve) => setTimeout(resolve, 50));

  const computedBg = window.getComputedStyle(element).backgroundColor;
  const backgroundColor =
    options.backgroundColor ||
    (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent'
      ? computedBg
      : '#ffffff');

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
    title: options.title || `Recibo #${rawNumber}`,
    text: `Recibo oficial de contribuição #${rawNumber}`,
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
      : '#ffffff');

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
