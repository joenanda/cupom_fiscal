import axios from 'axios';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { ChaveAcessoNFCe } from '../../domain/models/ChaveAcesso';
import { CertificadoA1Service } from '../certificates/certificadoA1.service';
import { obterEndpointConsultaNFCe, AmbienteSefaz } from './webservices';
import { AppError } from '../../core/errors/AppError';

export interface IRespostaConsultaSEFAZ {
  cStat: number;
  xMotivo: string;
  chave: string;
  tpAmb: number;
  verAplic: string;
  dhRecbto?: string;
  nProt?: string;
  digVal?: string;
  xmlCompleto?: string;
  dadosProtocolo?: any;
}

export class SefazSoapClient {
  private _certificadoService: CertificadoA1Service;
  private _tpAmb: AmbienteSefaz;
  private _xmlParser: XMLParser;

  constructor(certificadoService: CertificadoA1Service, tpAmb: AmbienteSefaz = 2) {
    this._certificadoService = certificadoService;
    this._tpAmb = tpAmb;
    this._xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true, // Facilita o acesso aos elementos ignorando namespaces soap/nfe
    });
  }

  /**
   * Monta o corpo da mensagem consSitNFe v4.00
   */
  private gerarXmlConsSitNFe(chaveAcesso: string): string {
    return `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${this._tpAmb}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${chaveAcesso}</chNFe></consSitNFe>`;
  }

  /**
   * Monta o Envelope SOAP 1.2 exigido pela SEFAZ
   */
  private montarEnvelopeSoap(soapAction: string, xmlDados: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>` +
      `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
      `<soap12:Body>` +
      `<nfeDadosMsg xmlns="${soapAction}">` +
      `${xmlDados}` +
      `</nfeDadosMsg>` +
      `</soap12:Body>` +
      `</soap12:Envelope>`;
  }

  /**
   * Executa a consulta da NFC-e via Web Service SOAP autenticada com o Certificado A1
   */
  public async consultarNFCe(chave: ChaveAcessoNFCe): Promise<IRespostaConsultaSEFAZ> {
    const { url, soapAction } = obterEndpointConsultaNFCe(
      chave.uf,
      chave.autorizadorSefaz,
      this._tpAmb
    );

    const xmlConsSit = this.gerarXmlConsSitNFe(chave.valor);
    const soapEnvelope = this.montarEnvelopeSoap(soapAction, xmlConsSit);

    try {
      const response = await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'SOAPAction': soapAction,
          'User-Agent': 'Sistema-Cupom-Fiscal/1.0',
        },
        httpsAgent: this._certificadoService.httpsAgent,
        timeout: 30000, // 30s de timeout
        responseType: 'text',
      });

      return this.processarRespostaSoap(response.data, chave.valor);
    } catch (err: any) {
      if (err.response) {
        // Erro HTTP retornado pela SEFAZ (ex: 403, 500)
        const xmlErro = typeof err.response.data === 'string' ? err.response.data : '';
        throw new AppError(`Erro retornado pelo servidor da SEFAZ (${err.response.status}): ${xmlErro || err.message}`, 502);
      } else if (err.code === 'ECONNABORTED') {
        throw new AppError('Tempo limite (timeout) atingido na comunicação com a SEFAZ. O serviço do estado pode estar instável.', 504);
      } else if (err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || err.code === 'CERT_HAS_EXPIRED') {
        throw new AppError(`Erro de validação de certificado SSL/TLS: ${err.message}`, 401);
      }
      throw new AppError(`Falha na conexão com a SEFAZ (${url}): ${err.message}`, 500);
    }
  }

  /**
   * Extrai e normaliza os dados do XML de retorno retConsSitNFe
   */
  private processarRespostaSoap(xmlSoapRetorno: string, chaveAcesso: string): IRespostaConsultaSEFAZ {
    const parsed = this._xmlParser.parse(xmlSoapRetorno);

    // Navega pela árvore do XML independente da presença de prefixos de namespace
    const envelope = parsed.Envelope || parsed;
    const body = envelope.Body || parsed;
    const nfeResultMsg = body.nfeResultMsg || body.nfeDadosMsg || body;
    const retConsSitNFe = nfeResultMsg.retConsSitNFe || nfeResultMsg;

    if (!retConsSitNFe) {
      throw new AppError('Estrutura de resposta SOAP da SEFAZ não reconhecida.', 502);
    }

    const cStat = parseInt(retConsSitNFe.cStat, 10);
    const xMotivo = retConsSitNFe.xMotivo || 'Sem motivo retornado';
    const protNFe = retConsSitNFe.protNFe;
    const infProt = protNFe?.infProt;

    return {
      cStat,
      xMotivo,
      chave: chaveAcesso,
      tpAmb: parseInt(retConsSitNFe.tpAmb || String(this._tpAmb), 10),
      verAplic: retConsSitNFe.verAplic || '',
      dhRecbto: infProt?.dhRecbto,
      nProt: infProt?.nProt,
      digVal: infProt?.digVal,
      xmlCompleto: xmlSoapRetorno,
      dadosProtocolo: infProt,
    };
  }
}
