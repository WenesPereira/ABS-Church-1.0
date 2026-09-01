import { jsPDF } from 'jspdf';
import { Lancamento, ConfigIgreja } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  formatReceiptDisplay,
  formatReceiptNumberDigits,
  formatPhoneDisplay,
  buildOfficialWhatsAppReceiptMessage,
} from '../utils/receiptHelper';

export interface GenerateReceiptPdfOptions {
  lancamento: Lancamento;
  config: ConfigIgreja;
  churchId?: string;
  pastorName?: string;
  tesoureiroName?: string;
}

export interface GeneratedReceiptResult {
  doc: jsPDF;
  blob: Blob;
  fileName: string;
  storagePath: string;
  publicUrl: string;
  whatsappMessage: string;
  isUploadedToStorage: boolean;
  error?: any;
}

/**
 * Gera um documento PDF estático, profissional e não editável para o recibo oficial de contribuição.
 */
export function generateReceiptPdfDocument(options: GenerateReceiptPdfOptions): {
  doc: jsPDF;
  blob: Blob;
  fileName: string;
} {
  const { lancamento, config, pastorName, tesoureiroName } = options;

  const rawReceipt = lancamento.receiptNumber || '000001';
  const receiptDigits = formatReceiptNumberDigits(rawReceipt);
  const receiptDisplay = formatReceiptDisplay(rawReceipt);
  const churchName = (config.nomeIgreja || 'ABS CHURCH').toUpperCase();
  const contributorName = (lancamento.contributorName || lancamento.nomePessoa || 'Contribuinte').toUpperCase();
  const phone = lancamento.contributorPhone ? formatPhoneDisplay(lancamento.contributorPhone) : '';
  const valorNum = typeof lancamento.valor === 'number' ? lancamento.valor : Number(lancamento.valor) || 0;
  
  const valorFormatado = valorNum.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const tipoLabel = lancamento.categoria === 'dizimo'
    ? 'DÍZIMO'
    : (lancamento.categoria || 'OFERTA').replace('_', ' ').toUpperCase();

  const formaPagto = (lancamento.formaPagamento || 'dinheiro').toUpperCase();
  
  const dataLancamento = lancamento.data || new Date().toISOString().split('T')[0];

  // Configuração do documento A5 Retrato (148 x 210 mm) para proporção perfeita de recibo
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = 148;
  const pageHeight = 210;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 124mm

  // Fundo sutil / Moldura externa
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Borda decorativa externa dupla
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.roundedRect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin * 2) + 8, 3, 3, 'S');

  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.2);
  doc.roundedRect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin * 2) + 4, 2, 2, 'S');

  let y = margin + 4;

  // 1. CABEÇALHO DA IGREJA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(churchName, pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500

  if (config.cnpj || config.cidadeUF) {
    const subHeader = [
      config.cnpj ? `CNPJ: ${config.cnpj}` : null,
      config.cidadeUF ? config.cidadeUF : null,
    ]
      .filter(Boolean)
      .join('  •  ');
    doc.text(subHeader, pageWidth / 2, y, { align: 'center' });
    y += 4.5;
  }

  // Linha divisória com detalhe dourado/âmbar
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.setLineWidth(0.8);
  doc.line(margin + 10, y, pageWidth - margin - 10, y);
  y += 7;

  // 2. SELO / TÍTULO DO RECIBO
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RECIBO OFICIAL DE CONTRIBUIÇÃO', margin + 6, y + 8.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(`Nº ${receiptDisplay}`, pageWidth - margin - 6, y + 8.5, { align: 'right' });
  y += 18;

  // 3. QUADRO DE DADOS DO LANÇAMENTO
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 54, 2, 2, 'S');

  let rowY = y + 7;
  const labelX = margin + 5;
  const valueX = margin + 42;

  const renderField = (label: string, value: string, isHighlighted = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, labelX, rowY);

    doc.setFont('helvetica', isHighlighted ? 'bold' : 'normal');
    doc.setFontSize(isHighlighted ? 9.5 : 8.5);
    doc.setTextColor(15, 23, 42);
    
    // Corta texto longo se necessário
    const maxWidth = contentWidth - 46;
    const splitVal = doc.splitTextToSize(value, maxWidth);
    doc.text(splitVal, valueX, rowY);
    
    // Linha sutil separadora entre campos
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(labelX, rowY + 3.5, pageWidth - margin - 5, rowY + 3.5);

    rowY += 9;
  };

  renderField('Contribuinte:', contributorName, true);
  if (phone) {
    renderField('WhatsApp:', phone);
  } else {
    renderField('Identificação:', 'Membro / Congregado');
  }
  renderField('Finalidade:', tipoLabel);
  renderField('Forma Pagto:', formaPagto);
  renderField('Data / Hora:', dataLancamento);

  y += 58;

  // 4. QUADRO DESTACADO DO VALOR TOTAL (Verde Esmeralda Elegante)
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(6, 78, 59); // emerald-900
  doc.text('VALOR DA CONTRIBUIÇÃO:', margin + 6, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(valorFormatado, pageWidth - margin - 6, y + 11, { align: 'right' });
  y += 21;

  // 5. VERSÍCULO / AGRADECIMENTO ECLESIÁSTICO
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('"Agradecemos a sua fidelidade e contribuição com a obra do Senhor!"', pageWidth / 2, y, {
    align: 'center',
  });
  y += 4.5;
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('"Cada um contribua segundo propôs no seu coração; não com tristeza,', pageWidth / 2, y, {
    align: 'center',
  });
  y += 3.5;
  doc.text('nem por necessidade; porque Deus ama ao que dá com alegria." (2 Co 9:7)', pageWidth / 2, y, {
    align: 'center',
  });
  y += 11;

  // 6. LINHAS DE ASSINATURA (Pastor e Tesouraria)
  const sigBoxWidth = (contentWidth - 10) / 2;
  const sig1X = margin;
  const sig2X = margin + sigBoxWidth + 10;
  const lineY = y + 10;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(sig1X + 4, lineY, sig1X + sigBoxWidth - 4, lineY);
  doc.line(sig2X + 4, lineY, sig2X + sigBoxWidth - 4, lineY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  
  const pastorFinal = pastorName || config.pastorPresidente || 'Pastor Presidente';
  const tesoureiroFinal = tesoureiroName || config.tesoureiroPadrao || 'Tesouraria';

  doc.text(pastorFinal, sig1X + sigBoxWidth / 2, lineY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Pastor Responsável', sig1X + sigBoxWidth / 2, lineY + 6.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(tesoureiroFinal, sig2X + sigBoxWidth / 2, lineY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Tesouraria Eclesiástica', sig2X + sigBoxWidth / 2, lineY + 6.5, { align: 'center' });

  // 7. RODAPÉ DE AUTENTICIDADE
  const footerY = pageHeight - margin + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  const authCode = `DOC-AUTENTICADO-${receiptDigits}-${(lancamento.id || '').slice(0, 8).toUpperCase()}`;
  doc.text(
    `Documento digital oficial gerado via Sistema EKLESIA • ${authCode}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  const fileName = `recibo_${receiptDigits}.pdf`;
  const blob = doc.output('blob');

  return {
    doc,
    blob,
    fileName,
  };
}

/**
 * Gera o PDF estático do recibo e realiza o upload para o Storage Supabase
 * Caminho no bucket 'recibos': ${church_id}/recibo_${receipt_number}.pdf
 */
export async function processAndUploadReceiptPdf(
  options: GenerateReceiptPdfOptions
): Promise<GeneratedReceiptResult> {
  const { lancamento, config, churchId } = options;

  const rawReceipt = lancamento.receiptNumber || '000001';
  const receiptDigits = formatReceiptNumberDigits(rawReceipt);
  const effectiveChurchId = churchId || lancamento.contributorId || 'geral';

  // 1. Gera o PDF em memória
  const { doc, blob, fileName } = generateReceiptPdfDocument(options);

  // Caminho isolado no bucket 'recibos'
  const storagePath = `${effectiveChurchId}/${fileName}`;

  let publicUrl = '';
  let isUploadedToStorage = false;
  let uploadError: any = null;

  // 2. Realiza o upload para o bucket 'recibos' no Supabase Storage
  if (isSupabaseConfigured) {
    try {
      const uploadRes = await supabase.storage
        .from('recibos')
        .upload(storagePath, blob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadRes.error) {
        uploadError = uploadRes.error;
        console.warn('Aviso ao enviar PDF para o bucket "recibos" do Supabase:', uploadRes.error.message);
      } else {
        isUploadedToStorage = true;
      }

      // Obtém a URL pública do arquivo
      const { data: publicUrlData } = supabase.storage
        .from('recibos')
        .getPublicUrl(storagePath);

      if (publicUrlData && publicUrlData.publicUrl) {
        publicUrl = publicUrlData.publicUrl;
      }
    } catch (err) {
      uploadError = err;
      console.warn('Erro inesperado no upload do recibo PDF para o Supabase Storage:', err);
    }
  }

  // Fallback para URL caso o storage não esteja online ou configured
  if (!publicUrl) {
    try {
      publicUrl = URL.createObjectURL(blob);
    } catch {
      publicUrl = `https://eklesia-recibos.app/${storagePath}`;
    }
  }

  // 3. Monta a mensagem oficial de WhatsApp com a URL pública
  const whatsappMessage = buildOfficialWhatsAppReceiptMessage({
    receiptNumber: receiptDigits,
    churchName: config.nomeIgreja || 'ABS CHURCH',
    contributorName: lancamento.contributorName || lancamento.nomePessoa || 'Contribuinte',
    pdfPublicUrl: publicUrl,
  });

  return {
    doc,
    blob,
    fileName,
    storagePath,
    publicUrl,
    whatsappMessage,
    isUploadedToStorage,
    error: uploadError,
  };
}
