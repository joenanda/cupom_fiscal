import axios from 'axios';
import { IFiscalAdapter, IResultadoDownloadNFCe } from './IFiscalAdapter';
import { ChaveAcessoNFCe } from '../../domain/models/ChaveAcesso';
import { AppError } from '../../core/errors/AppError';

export class FocusNfeAdapter implements IFiscalAdapter {
  private _apiToken: string;
  private _baseUrl: string;

  constructor(apiToken: string, ambienteHomologacao: boolean = true) {
    this._apiToken = apiToken;
    this._baseUrl = ambienteHomologacao
      ? 'https://homologacao.focusnfe.com.br/v2'
      : 'https://api.focusnfe.com.br/v2';
  }

  public async consultarEBaixarNFCe(chave: ChaveAcessoNFCe): Promise<IResultadoDownloadNFCe> {
    if (!this._apiToken) {
      throw new AppError('Token de API da Focus NFe não configurado (FOCUS_NFE_TOKEN).', 400);
    }

    try {
      const response = await axios.get(`${this._baseUrl}/nfce/${chave.valor}?completa=1`, {
        auth: {
          username: this._apiToken,
          password: '',
        },
        timeout: 20000,
      });

      const data = response.data;
      const autorizada = data.status === 'autorizado';

      // Também busca o XML bruto se disponível
      let xmlConteudo: string | undefined;
      if (data.caminho_xml_nota_fiscal) {
        try {
          const xmlResponse = await axios.get(`https://api.focusnfe.com.br${data.caminho_xml_nota_fiscal}`, {
            responseType: 'text',
          });
          xmlConteudo = xmlResponse.data;
        } catch {
          // Se falhar o download secundário do XML, segue com os dados retornados
        }
      }

      return {
        sucesso: autorizada,
        chaveAcesso: chave.valor,
        cStat: autorizada ? 100 : 999,
        statusDescricao: data.mensagem_sefaz || data.status || 'Status não disponível',
        autorizada,
        numeroProtocolo: data.numero_protocolo,
        dataAutorizacao: data.data_autorizacao,
        cnpjEmitente: data.cnpj_emitente || chave.cnpjEmitente,
        razaoSocialEmitente: data.nome_emitente,
        valorTotal: data.valor_total ? parseFloat(data.valor_total) : undefined,
        xmlConteudo,
        provedor: 'FOCUS_NFE',
        mensagem: autorizada
          ? 'NFC-e obtida com sucesso via Focus NFe API.'
          : `Status Focus NFe: ${data.status} - ${data.mensagem_sefaz}`,
      };
    } catch (err: any) {
      if (err.response) {
        if (err.response.status === 404) {
          return {
            sucesso: false,
            chaveAcesso: chave.valor,
            cStat: 217,
            statusDescricao: 'NFC-e não localizada na base da Focus NFe ou SEFAZ.',
            autorizada: false,
            cnpjEmitente: chave.cnpjEmitente,
            provedor: 'FOCUS_NFE',
            mensagem: 'Nota fiscal não encontrada.',
          };
        }
        throw new AppError(`Erro na API Focus NFe (${err.response.status}): ${JSON.stringify(err.response.data)}`, 502);
      }
      throw new AppError(`Falha de conexão com a API da Focus NFe: ${err.message}`, 500);
    }
  }
}
