export interface IUFInfo {
  codigoIbge: string;
  sigla: string;
  nome: string;
  autorizadorNfce: 'SVRS' | 'SVAN' | 'PROPRIO';
  urlConsultaPortal?: string;
}

export const TABELA_IBGE_UF: Record<string, IUFInfo> = {
  '11': { codigoIbge: '11', sigla: 'RO', nome: 'Rondônia', autorizadorNfce: 'SVRS' },
  '12': { codigoIbge: '12', sigla: 'AC', nome: 'Acre', autorizadorNfce: 'SVRS' },
  '13': { codigoIbge: '13', sigla: 'AM', nome: 'Amazonas', autorizadorNfce: 'PROPRIO' },
  '14': { codigoIbge: '14', sigla: 'RR', nome: 'Roraima', autorizadorNfce: 'SVRS' },
  '15': { codigoIbge: '15', sigla: 'PA', nome: 'Pará', autorizadorNfce: 'SVRS' },
  '16': { codigoIbge: '16', sigla: 'AP', nome: 'Amapá', autorizadorNfce: 'SVRS' },
  '17': { codigoIbge: '17', sigla: 'TO', nome: 'Tocantins', autorizadorNfce: 'SVRS' },
  '21': { codigoIbge: '21', sigla: 'MA', nome: 'Maranhão', autorizadorNfce: 'SVRS' },
  '22': { codigoIbge: '22', sigla: 'PI', nome: 'Piauí', autorizadorNfce: 'SVRS' },
  '23': { codigoIbge: '23', sigla: 'CE', nome: 'Ceará', autorizadorNfce: 'PROPRIO' },
  '24': { codigoIbge: '24', sigla: 'RN', nome: 'Rio Grande do Norte', autorizadorNfce: 'SVRS' },
  '25': { codigoIbge: '25', sigla: 'PB', nome: 'Paraíba', autorizadorNfce: 'SVRS' },
  '26': { codigoIbge: '26', sigla: 'PE', nome: 'Pernambuco', autorizadorNfce: 'PROPRIO' },
  '27': { codigoIbge: '27', sigla: 'AL', nome: 'Alagoas', autorizadorNfce: 'SVRS' },
  '28': { codigoIbge: '28', sigla: 'SE', nome: 'Sergipe', autorizadorNfce: 'SVRS' },
  '29': { codigoIbge: '29', sigla: 'BA', nome: 'Bahia', autorizadorNfce: 'PROPRIO' },
  '31': { codigoIbge: '31', sigla: 'MG', nome: 'Minas Gerais', autorizadorNfce: 'PROPRIO' },
  '32': { codigoIbge: '32', sigla: 'ES', nome: 'Espírito Santo', autorizadorNfce: 'SVRS' },
  '33': { codigoIbge: '33', sigla: 'RJ', nome: 'Rio de Janeiro', autorizadorNfce: 'SVRS' },
  '35': { codigoIbge: '35', sigla: 'SP', nome: 'São Paulo', autorizadorNfce: 'PROPRIO' },
  '41': { codigoIbge: '41', sigla: 'PR', nome: 'Paraná', autorizadorNfce: 'PROPRIO' },
  '42': { codigoIbge: '42', sigla: 'SC', nome: 'Santa Catarina', autorizadorNfce: 'SVRS' },
  '43': { codigoIbge: '43', sigla: 'RS', nome: 'Rio Grande do Sul', autorizadorNfce: 'PROPRIO' },
  '50': { codigoIbge: '50', sigla: 'MS', nome: 'Mato Grosso do Sul', autorizadorNfce: 'PROPRIO' },
  '51': { codigoIbge: '51', sigla: 'MT', nome: 'Mato Grosso', autorizadorNfce: 'PROPRIO' },
  '52': { codigoIbge: '52', sigla: 'GO', nome: 'Goiás', autorizadorNfce: 'PROPRIO' },
  '53': { codigoIbge: '53', sigla: 'DF', nome: 'Distrito Federal', autorizadorNfce: 'SVRS' },
};

export function obterInformacoesUF(codigoIbge: string): IUFInfo | null {
  return TABELA_IBGE_UF[codigoIbge] || null;
}
