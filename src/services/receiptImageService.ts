import html2canvas from 'html2canvas-pro';

export interface GenerateReceiptImageOptions {
  fileName?: string;
  backgroundColor?: string;
  scale?: number;
}

/**
 * Converte um elemento DOM (card de recibo) em imagem PNG de alta definição e executa o download automático
 */
export async function downloadElementAsPng(
  element: HTMLElement,
  fileName: string = 'recibo.png',
  options: GenerateReceiptImageOptions = {}
): Promise<string> {
  const scale = options.scale || 2.5; // Resolução nítida para compartilhamento e impressão
  const backgroundColor = options.backgroundColor || '#020617'; // slate-950

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

  const dataUrl = canvas.toDataURL('image/png');

  // Dispara o download automático do arquivo PNG no dispositivo
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return dataUrl;
}

/**
 * Converte o elemento DOM do recibo em um Blob PNG para compartilhamento nativo se suportado
 */
export async function generateElementPngBlob(
  element: HTMLElement,
  options: GenerateReceiptImageOptions = {}
): Promise<Blob | null> {
  const scale = options.scale || 2.5;
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
