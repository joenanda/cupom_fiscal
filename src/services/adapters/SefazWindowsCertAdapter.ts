import { XMLParser } from 'fast-xml-parser';
import { IFiscalAdapter, IResultadoDownloadNFCe } from './IFiscalAdapter';
import { ChaveAcessoNFCe } from '../../domain/models/ChaveAcesso';
import { WindowsCertStoreService } from '../certificates/windowsCertStore.service';
import { obterEndpointConsultaNFCe, AmbienteSefaz } from '../sefaz/webservices';
import { AppError } from '../../core/errors/AppError';

export class SefazWindowsCertAdapter implements IFiscalAdapter {
  private _thumbprint: string;
  private _tpAmb: AmbienteSefaz;
  private _xmlParser: XMLParser;

  constructor(thumbprint: string, tpAmb: AmbienteSefaz = 2) {
    this._thumbprint = thumbprint;
    this._tpAmb = tpAmb;
    this._xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      parseTagValue: false,
    });
  }

  public async consultarEBaixarNFCe(chave: ChaveAcessoNFCe): Promise<IResultadoDownloadNFCe> {
    const { url, soapAction } = obterEndpointConsultaNFCe(
      chave.uf,
      chave.autorizadorSefaz,
      this._tpAmb
    );

    const xmlConsSit = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${this._tpAmb}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${chave.valor}</chNFe></consSitNFe>`;

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>` +
      `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
      `<soap12:Body>` +
      `<nfeDadosMsg xmlns="${soapAction}">` +
      `${xmlConsSit}` +
      `</nfeDadosMsg>` +
      `</soap12:Body>` +
      `</soap12:Envelope>`;

    const xmlResposta = await WindowsCertStoreService.executarRequisicaoSefaz(
      this._thumbprint,
      url,
      soapAction,
      soapEnvelope
    );

    const parsed = this._xmlParser.parse(xmlResposta);
    const envelope = parsed.Envelope || parsed;
    const body = envelope.Body || parsed;
    const nfeResultMsg = body.nfeResultMsg || body.nfeDadosMsg || body;
    const retConsSitNFe = nfeResultMsg.retConsSitNFe || nfeResultMsg;

    if (!retConsSitNFe) {
      throw new AppError('Estrutura de resposta SOAP da SEFAZ não reconhecida.', 502);
    }

    const cStat = parseInt(retConsSitNFe.cStat, 10);
    const xMotivo = retConsSitNFe.xMotivo || 'Sem motivo retornado';
    const infProt = retConsSitNFe.protNFe?.infProt;
    const autorizada = cStat === 100;

    return {
      sucesso: autorizada,
      chaveAcesso: chave.valor,
      cStat,
      statusDescricao: xMotivo,
      autorizada,
      numeroProtocolo: infProt?.nProt,
      dataAutorizacao: infProt?.dhRecbto,
      cnpjEmitente: chave.cnpjEmitente,
      xmlConteudo: xmlResposta,
      provedor: 'SEFAZ_DIRETO',
      mensagem: autorizada
        ? 'NFC-e autorizada e recuperada com sucesso via Certificado do Windows.'
        : `SEFAZ retornou status ${cStat}: ${xMotivo}`,
    };
  }
}
