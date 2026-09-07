import { IFiscalAdapter, IResultadoDownloadNFCe } from './IFiscalAdapter';
import { ChaveAcessoNFCe } from '../../domain/models/ChaveAcesso';

export class MockFiscalAdapter implements IFiscalAdapter {
  public async consultarEBaixarNFCe(chave: ChaveAcessoNFCe): Promise<IResultadoDownloadNFCe> {
    const dataAtual = new Date().toISOString();
    const protocoloMock = `1${chave.codigoIbgeUF}24${Math.floor(100000000 + Math.random() * 900000000)}`;

    const xmlExemplo = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${chave.valor}" versao="4.00">
      <ide>
        <cUF>${chave.codigoIbgeUF}</cUF>
        <cNF>12345678</cNF>
        <natOp>VENDA MERCADORIA CONSUMIDOR</natOp>
        <mod>65</mod>
        <serie>${chave.serie}</serie>
        <nNF>${chave.numero}</nNF>
        <dhEmi>${dataAtual}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>4</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${chave.digitoVerificador}</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>1.0.0</verProc>
      </ide>
      <emit>
        <CNPJ>${chave.cnpjEmitente}</CNPJ>
        <xNome>SUPERMERCADO MODELO BRASIL LTDA</xNome>
        <xFant>MERCADO BRASIL</xFant>
        <enderEmit>
          <xLgr>AVENIDA PAULISTA</xLgr>
          <nro>1000</nro>
          <xBairro>BELA VISTA</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>${chave.uf}</UF>
          <CEP>01310100</CEP>
        </enderEmit>
        <IE>123456789110</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CPF>12345678909</CPF>
        <xNome>CONSUMIDOR FINAL</xNome>
        <indIEDest>9</indIEDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>7891000100101</cProd>
          <cEAN>7891000100101</cEAN>
          <xProd>CAFE TORRADO E MOIDO 500G</xProd>
          <NCM>09012100</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>2.0000</qCom>
          <vUnCom>18.50</vUnCom>
          <vProd>37.00</vProd>
          <uTrib>UN</uTrib>
          <qTrib>2.0000</qTrib>
          <vUnTrib>18.50</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>37.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>6.66</vICMS>
            </ICMS00>
          </ICMS>
        </imposto>
      </det>
      <det nItem="2">
        <prod>
          <cProd>7892000200202</cProd>
          <cEAN>7892000200202</cEAN>
          <xProd>LEITE INTEGRAL UHT 1L</xProd>
          <NCM>04012010</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>4.0000</qCom>
          <vUnCom>5.49</vUnCom>
          <vProd>21.96</vProd>
          <uTrib>UN</uTrib>
          <qTrib>4.0000</qTrib>
          <vUnTrib>5.49</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>21.96</vBC>
              <pICMS>12.00</pICMS>
              <vICMS>2.64</vICMS>
            </ICMS00>
          </ICMS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>58.96</vBC>
          <vICMS>9.30</vICMS>
          <vProd>58.96</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vPIS>0.97</vPIS>
          <vCOFINS>4.48</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>58.96</vNF>
          <vTotTrib>18.52</vTotTrib>
        </ICMSTot>
      </total>
      <pag>
        <detPag>
          <tPag>03</tPag>
          <vPag>58.96</vPag>
          <card>
            <tpIntegra>1</tpIntegra>
            <CNPJ>01027058000191</CNPJ>
            <tBand>01</tBand>
            <cAut>123456</cAut>
          </card>
        </detPag>
      </pag>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>SVRS20240101</verAplic>
      <chNFe>${chave.valor}</chNFe>
      <dhRecbto>${dataAtual}</dhRecbto>
      <nProt>${protocoloMock}</nProt>
      <digVal>uX3qXzH+2Z9M8N7O6P5Q4R3S2T1=</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NFC-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

    return {
      sucesso: true,
      chaveAcesso: chave.valor,
      cStat: 100,
      statusDescricao: 'Autorizado o uso da NFC-e (Ambiente de Teste / Mock)',
      autorizada: true,
      numeroProtocolo: protocoloMock,
      dataAutorizacao: dataAtual,
      cnpjEmitente: chave.cnpjEmitente,
      razaoSocialEmitente: 'SUPERMERCADO MODELO BRASIL LTDA',
      nomeFantasiaEmitente: 'MERCADO BRASIL',
      valorTotal: 58.96,
      itens: [
        {
          numeroItem: 1,
          codigo: '7891000100101',
          descricao: 'CAFE TORRADO E MOIDO 500G',
          ncm: '09012100',
          cfop: '5102',
          unidade: 'UN',
          quantidade: 2,
          valorUnitario: 18.5,
          valorTotal: 37.0,
        },
        {
          numeroItem: 2,
          codigo: '7892000200202',
          descricao: 'LEITE INTEGRAL UHT 1L',
          ncm: '04012010',
          cfop: '5102',
          unidade: 'UN',
          quantidade: 4,
          valorUnitario: 5.49,
          valorTotal: 21.96,
        },
      ],
      xmlConteudo: xmlExemplo,
      provedor: 'MOCK_TESTE',
      mensagem: 'NFC-e autorizada e recuperada com sucesso para testes.',
    };
  }
}
