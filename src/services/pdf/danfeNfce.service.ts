import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { XMLParser } from 'fast-xml-parser';
import { AppError } from '../../core/errors/AppError';
import { formatarCNPJ, formatarChaveAcesso } from '../../core/validators/chaveAcesso.validator';

const FORMAS_PAGAMENTO: Record<string, string> = {
  '01': 'Dinheiro',
  '02': 'Cheque',
  '03': 'Cartão de Crédito',
  '04': 'Cartão de Débito',
  '05': 'Crédito Loja',
  '10': 'Vale Alimentação',
  '11': 'Vale Refeição',
  '12': 'Vale Presente',
  '13': 'Vale Combustível',
  '15': 'Boleto Bancário',
  '16': 'Depósito Bancário',
  '17': 'Pagamento Instantâneo (PIX)',
  '18': 'Transferência bancária, Carteira Digital',
  '19': 'Programa de fidelidade, Cashback',
  '90': 'Sem pagamento',
  '99': 'Outros',
};

export class DanfeNfceService {
  private _parser: XMLParser;

  constructor() {
    this._parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      parseTagValue: false,
    });
  }

  /**
   * Converte o XML da NFC-e (Modelo 65) em um buffer PDF no formato de Bobina Térmica 80mm
   */
  public async gerarDanfePdf(xmlString: string, chaveAcessoFallback?: string): Promise<Buffer> {
    if (!xmlString) {
      throw new AppError('XML da NFC-e não fornecido para geração do DANFE.', 400);
    }

    const docParsed = this._parser.parse(xmlString);
    const nfeProc = docParsed.nfeProc || docParsed;
    const nfe = nfeProc.NFe || docParsed.NFe;

    if (!nfe || !nfe.infNFe) {
      throw new AppError('Estrutura de XML inválida: elemento <NFe><infNFe> não encontrado.', 422);
    }

    const infNFe = nfe.infNFe;
    const ide = infNFe.ide || {};
    const emit = infNFe.emit || {};
    const dest = infNFe.dest;
    const total = infNFe.total?.ICMSTot || {};
    const pag = infNFe.pag || {};
    const protNFe = nfeProc.protNFe?.infProt || {};

    // Extrai chave de acesso
    let chave = (infNFe['@_Id'] || '').replace('NFe', '');
    if (!chave && chaveAcessoFallback) {
      chave = chaveAcessoFallback;
    }

    // Normaliza lista de itens
    const detRaw = infNFe.det;
    const itens = Array.isArray(detRaw) ? detRaw : detRaw ? [detRaw] : [];

    // Normaliza pagamentos
    const detPagRaw = pag.detPag;
    const pagamentos = Array.isArray(detPagRaw) ? detPagRaw : detPagRaw ? [detPagRaw] : [];

    // QR Code URL
    const qrCodeXml = nfe.infNFeSupl?.qrCode || '';
    const qrCodeContent = qrCodeXml || `https://www.fazenda.sp.gov.br/nfce/qrcode?p=${chave}|2|1|1`;

    // Gera o buffer do QRCode
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeContent, {
      margin: 1,
      width: 120,
      errorCorrectionLevel: 'M',
    });

    // Dimensões da bobina de 80mm
    // 80mm = ~226.77 pt
    const larguraPt = 226.77;
    const margemX = 10;
    const larguraUtil = larguraPt - (margemX * 2);

    // Cálculo dinâmico da altura da bobina térmica para acomodar todos os itens sem quebra indesejada
    const alturaEstimada = 340 + (itens.length * 28) + (pagamentos.length * 15) + 160;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: [larguraPt, Math.max(alturaEstimada, 500)],
        margins: { top: 12, bottom: 12, left: margemX, right: margemX },
        autoFirstPage: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const linhaDivisoria = () => {
        doc.moveDown(0.3);
        doc.strokeColor('#555555').lineWidth(0.5);
        doc.text('---------------------------------------------------------------------------------', {
          align: 'center',
          characterSpacing: -1,
        });
        doc.moveDown(0.3);
      };

      // 1. CABEÇALHO DO EMITENTE
      doc.font('Helvetica-Bold').fontSize(9).text(emit.xFant || emit.xNome || 'ESTABELECIMENTO COMERCIAL', { align: 'center' });
      if (emit.xFant && emit.xNome) {
        doc.font('Helvetica').fontSize(7).text(emit.xNome, { align: 'center' });
      }

      const ender = emit.enderEmit || {};
      const enderecoFormatado = `${ender.xLgr || ''}, ${ender.nro || 'S/N'} ${ender.xBairro || ''} - ${ender.xMun || ''}/${ender.UF || ''}`;
      doc.font('Helvetica').fontSize(6.5).text(enderecoFormatado, { align: 'center' });
      doc.text(`CNPJ: ${formatarCNPJ(emit.CNPJ || '')}   IE: ${emit.IE || 'ISENTO'}`, { align: 'center' });

      linhaDivisoria();

      // 2. TÍTULO DO DOCUMENTO AUXILIAR
      doc.font('Helvetica-Bold').fontSize(7.5).text('DANFE NFC-e', { align: 'center' });
      doc.font('Helvetica').fontSize(6.5).text('Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica', { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(6).text('Não permite aproveitamento de crédito de ICMS', { align: 'center' });

      linhaDivisoria();

      // 3. TABELA DE ITENS
      doc.font('Helvetica-Bold').fontSize(6.5);
      doc.text('CÓDIGO | DESCRIÇÃO | QTD | UN | VL UNIT | VL TOTAL');
      linhaDivisoria();

      doc.font('Helvetica').fontSize(6.5);
      itens.forEach((item: any, idx: number) => {
        const prod = item.prod || {};
        const numItem = item['@_nItem'] || (idx + 1);
        const cod = prod.cProd || '';
        const desc = prod.xProd || 'ITEM SEM DESCRICAO';
        const qtd = Number(prod.qCom || 1).toFixed(2);
        const un = prod.uCom || 'UN';
        const vUn = Number(prod.vUnCom || 0).toFixed(2);
        const vTot = Number(prod.vProd || 0).toFixed(2);

        doc.font('Helvetica-Bold').fontSize(6.5).text(`${numItem}. ${cod} - ${desc}`, { width: larguraUtil });
        doc.font('Helvetica').fontSize(6.5);
        doc.text(`     ${qtd} ${un} x R$ ${vUn} = R$ ${vTot}`, { align: 'right' });
        doc.moveDown(0.2);
      });

      linhaDivisoria();

      // 4. TOTAIS E FORMAS DE PAGAMENTO
      doc.font('Helvetica').fontSize(7);
      doc.text(`Qtd. Total de Itens:`, { continued: true });
      doc.text(`${itens.length}`, { align: 'right' });

      doc.text(`Subtotal dos Produtos:`, { continued: true });
      doc.text(`R$ ${Number(total.vProd || total.vNF || 0).toFixed(2)}`, { align: 'right' });

      if (Number(total.vDesc || 0) > 0) {
        doc.text(`Descontos:`, { continued: true });
        doc.text(`- R$ ${Number(total.vDesc).toFixed(2)}`, { align: 'right' });
      }

      doc.font('Helvetica-Bold').fontSize(8.5);
      doc.text(`VALOR A PAGAR R$:`, { continued: true });
      doc.text(`R$ ${Number(total.vNF || 0).toFixed(2)}`, { align: 'right' });

      linhaDivisoria();

      // FORMAS DE PAGAMENTO
      doc.font('Helvetica-Bold').fontSize(6.5).text('FORMA DE PAGAMENTO | VALOR PAGO');
      doc.font('Helvetica').fontSize(6.5);
      pagamentos.forEach((p: any) => {
        const tPag = String(p.tPag || '99').padStart(2, '0');
        const descPag = FORMAS_PAGAMENTO[tPag] || 'Outros';
        const vPag = Number(p.vPag || 0).toFixed(2);
        doc.text(`${descPag}:`, { continued: true });
        doc.text(`R$ ${vPag}`, { align: 'right' });
      });

      linhaDivisoria();

      // 5. IMPOSTOS (LEI 12.741/2012)
      const vTotTrib = Number(total.vTotTrib || 0).toFixed(2);
      doc.font('Helvetica').fontSize(6).text(`Tributos Totais Incidentes (Lei Fed. 12.741/12): R$ ${vTotTrib}`, { align: 'center' });

      linhaDivisoria();

      // 6. IDENTIFICAÇÃO DO CONSUMIDOR
      doc.font('Helvetica-Bold').fontSize(6.5).text('CONSUMIDOR:', { align: 'center' });
      if (dest && (dest.CPF || dest.CNPJ)) {
        const idConsumidor = dest.CPF ? `CPF: ${dest.CPF}` : `CNPJ: ${dest.CNPJ}`;
        doc.font('Helvetica').fontSize(6.5).text(`${dest.xNome || 'CONSUMIDOR'} - ${idConsumidor}`, { align: 'center' });
      } else {
        doc.font('Helvetica').fontSize(6.5).text('CONSUMIDOR NÃO IDENTIFICADO', { align: 'center' });
      }

      linhaDivisoria();

      // 7. INFORMAÇÕES DE EMISSÃO E PROTOCOLO
      const dataEmissao = ide.dhEmi ? new Date(ide.dhEmi).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
      doc.font('Helvetica').fontSize(6.5);
      doc.text(`Número: ${ide.nNF || ''}   Série: ${ide.serie || ''}   Emissão: ${dataEmissao}`, { align: 'center' });
      doc.text(`Via do Consumidor`, { align: 'center' });

      if (protNFe.nProt) {
        doc.font('Helvetica-Bold').fontSize(6.5).text(`Protocolo de Autorização: ${protNFe.nProt}`, { align: 'center' });
        doc.font('Helvetica').fontSize(6).text(`Data da Autorização: ${protNFe.dhRecbto ? new Date(protNFe.dhRecbto).toLocaleString('pt-BR') : ''}`, { align: 'center' });
      }

      linhaDivisoria();

      // 8. CHAVE DE ACESSO
      doc.font('Helvetica-Bold').fontSize(6.5).text('Consulte pela Chave de Acesso em:', { align: 'center' });
      doc.font('Helvetica').fontSize(6).text('www.fazenda.sp.gov.br/nfce/consulta', { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(6.5).text('CHAVE DE ACESSO:', { align: 'center' });
      doc.font('Helvetica').fontSize(6.5).text(formatarChaveAcesso(chave), { align: 'center' });

      doc.moveDown(0.5);

      // 9. QR-CODE OFICIAL DA SEFAZ
      const qrCodeX = (larguraPt - 90) / 2;
      doc.image(qrCodeBuffer, qrCodeX, doc.y, { width: 90, height: 90 });
      doc.y += 95;

      doc.font('Helvetica').fontSize(6).text('Consulta via leitor de QR Code', { align: 'center' });
      doc.moveDown(0.5);

      doc.end();
    });
  }
}
