import html2canvas from 'html2canvas-pro';

export interface GenerateReceiptImageOptions {
  fileName?: string;
  backgroundColor?: string;
  scale?: number;
}

/**
 * Converte um elemento DOM (card de recibo) em imagem PNG de alta definição,
 * com suporte nativo a Web Share API para celulares/PWA e fallback seguro via Blob URL.
 */
export async function downloadElementAsPng(
  element: HTMLElement,
  fileName: string = 'recibo.png',
  options: GenerateReceiptImageOptions = {}
): Promise<void> {
  const scale = options.scale || 3; // Alta resolução para legibilidade e impressão
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
          // Sanitização preventiva de cores para compatibilidade com o canvas
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

  // Converte o canvas para Blob binário em vez de base64 DataURL gigante
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });

  if (!blob) {
    throw new Error('Falha ao gerar o arquivo binário da imagem do recibo.');
  }

  // 1. Tenta compartilhamento nativo no celular / PWA (Web Share API com suporte a arquivos)
  if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
    try {
      const file = new File([blob], cleanFileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Recibo de Contribuição',
          text: `Recibo Oficial de Contribuição - ${cleanFileName.replace('.png', '')}`,
        });
        return;
      }
    } catch (shareErr: any) {
      // Se o usuário cancelou o menu nativo de compartilhamento (AbortError), encerra sem forçar download duplo
      if (shareErr?.name === 'AbortError') {
        return;
      }
      console.warn('Web Share cancelado ou não aceito, executando download Blob URL:', shareErr);
    }
  }

  // 2. Download seguro via Blob Object URL com nome limpo de arquivo
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = blobUrl;
  link.download = cleanFileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();

  // Limpeza do elemento e revogação da URL da memória após o clique
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(blobUrl);
  }, 1000);
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
