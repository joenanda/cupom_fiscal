import { IFiscalAdapter, IResultadoDownloadNFCe } from './IFiscalAdapter';
import { ChaveAcessoNFCe } from '../../domain/models/ChaveAcesso';
import { SefazSoapClient } from '../sefaz/sefazSoapClient';
import { CertificadoA1Service } from '../certificates/certificadoA1.service';
import { AmbienteSefaz } from '../sefaz/webservices';

export class SefazSoapAdapter implements IFiscalAdapter {
  private _soapClient: SefazSoapClient;

  constructor(certificadoService: CertificadoA1Service, ambiente: AmbienteSefaz = 2) {
    this._soapClient = new SefazSoapClient(certificadoService, ambiente);
  }

  public async consultarEBaixarNFCe(chave: ChaveAcessoNFCe): Promise<IResultadoDownloadNFCe> {
    const resposta = await this._soapClient.consultarNFCe(chave);

    const autorizada = resposta.cStat === 100;

    return {
      sucesso: autorizada,
      chaveAcesso: chave.valor,
      cStat: resposta.cStat,
      statusDescricao: resposta.xMotivo,
      autorizada,
      numeroProtocolo: resposta.nProt,
      dataAutorizacao: resposta.dhRecbto,
      cnpjEmitente: chave.cnpjEmitente,
      xmlConteudo: resposta.xmlCompleto,
      provedor: 'SEFAZ_DIRETO',
      mensagem: autorizada
        ? 'NFC-e consultada e autorizada com sucesso na SEFAZ.'
        : `SEFAZ retornou status ${resposta.cStat}: ${resposta.xMotivo}`,
    };
  }
}
