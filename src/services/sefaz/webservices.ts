export type AmbienteSefaz = 1 | 2; // 1 = Produção, 2 = Homologação

export interface IEndpointSefaz {
  producao: string;
  homologacao: string;
  soapAction: string;
}

export const ENDPOINTS_NFCE_CONSULTA: Record<string, IEndpointSefaz> = {
  // SVRS (Atende: AC, AL, AP, DF, ES, MA, PA, PB, PI, RJ, RN, RO, RR, SC, SE, TO)
  SVRS: {
    producao: 'https://nfce.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    homologacao: 'https://nfce-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    soapAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  },
  // São Paulo
  SP: {
    producao: 'https://nfce.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx',
    homologacao: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx',
    soapAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  },
  // Paraná
  PR: {
    producao: 'https://nfce.fazenda.pr.gov.br/nfce/NFeConsultaProtocolo4',
    homologacao: 'https://homologacao.nfce.fazenda.pr.gov.br/nfce/NFeConsultaProtocolo4',
    soapAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  },
  // Rio Grande do Sul
  RS: {
    producao: 'https://nfce.sefaz.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    homologacao: 'https://nfce-homologacao.sefaz.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    soapAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  },
  // Minas Gerais
  MG: {
    producao: 'https://nfce.fazenda.mg.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    homologacao: 'https://hnfce.fazenda.mg.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    soapAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  },
  // Bahia
  BA: {
    producao: 'https://nfce.sefaz.ba.gov.br/webservices/NFCeConsulta/NFCeConsulta.asmx',
    homologacao: 'https://hnfce.sefaz.ba.gov.br/webservices/NFCeConsulta/NFCeConsulta.asmx',
    soapAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  },
  // Goiás
  GO: {
    producao: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4',
    homologacao: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4',
    soapAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  },
  // Mato Grosso
  MT: {
    producao: 'https://nfce.sefaz.mt.gov.br/nfcews/services/NfeConsulta4',
    homologacao: 'https://homologacao.sefaz.mt.gov.br/nfcews/services/NfeConsulta4',
    soapAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  },
  // Mato Grosso do Sul
  MS: {
    producao: 'https://nfce.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4',
    homologacao: 'https://homologacao.nfce.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4',
    soapAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  },
  // Amazonas
  AM: {
    producao: 'https://nfce.sefaz.am.gov.br/services2/services/NfeConsulta4',
    homologacao: 'https://homnfce.sefaz.am.gov.br/services2/services/NfeConsulta4',
    soapAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  },
  // Ceará
  CE: {
    producao: 'https://nfce.sefaz.ce.gov.br/nfce/services/NFeConsultaProtocolo4',
    homologacao: 'https://nfceh.sefaz.ce.gov.br/nfce/services/NFeConsultaProtocolo4',
    soapAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  },
  // Pernambuco
  PE: {
    producao: 'https://nfce.sefaz.pe.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    homologacao: 'https://nfcehomolog.sefaz.pe.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    soapAction: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  },
};

/**
 * Retorna o endpoint correto de consulta da NFC-e de acordo com a UF e o Ambiente
 */
export function obterEndpointConsultaNFCe(siglaUF: string, autorizador: string, tpAmb: AmbienteSefaz): { url: string; soapAction: string } {
  // Se o estado possuir autorizador próprio cadastrado, usa ele; caso contrário, vai para a SVRS
  const autorizadorConfig = ENDPOINTS_NFCE_CONSULTA[siglaUF] || ENDPOINTS_NFCE_CONSULTA[autorizador] || ENDPOINTS_NFCE_CONSULTA['SVRS'];
  const url = tpAmb === 1 ? autorizadorConfig.producao : autorizadorConfig.homologacao;

  return {
    url,
    soapAction: autorizadorConfig.soapAction,
  };
}
