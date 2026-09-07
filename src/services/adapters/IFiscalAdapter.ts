import { ChaveAcessoNFCe } from '../../domain/models/ChaveAcesso';

export interface IItemCupom {
  numeroItem: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface IResultadoDownloadNFCe {
  sucesso: boolean;
  chaveAcesso: string;
  cStat: number;
  statusDescricao: string;
  autorizada: boolean;
  numeroProtocolo?: string;
  dataAutorizacao?: string;
  cnpjEmitente: string;
  razaoSocialEmitente?: string;
  nomeFantasiaEmitente?: string;
  valorTotal?: number;
  itens?: IItemCupom[];
  xmlConteudo?: string;
  mensagem?: string;
  provedor: 'SEFAZ_DIRETO' | 'FOCUS_NFE' | 'MOCK_TESTE';
}

export interface IFiscalAdapter {
  consultarEBaixarNFCe(chave: ChaveAcessoNFCe): Promise<IResultadoDownloadNFCe>;
}
