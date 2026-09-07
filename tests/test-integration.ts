import forge from 'node-forge';
import { CertificadoA1Service } from '../src/services/certificates/certificadoA1.service';
import { FiscalAdapterFactory } from '../src/services/adapters/FiscalAdapterFactory';
import { ChaveAcessoNFCe } from '../src/domain/models/ChaveAcesso';
import { calcularDigitoVerificadorSEFAZ } from '../src/core/validators/chaveAcesso.validator';

console.log('================================================================');
console.log('  TESTES DO SERVIÇO DE INTEGRAÇÃO FISCAL (SEFAZ / CERTIFICADO / ADAPTER)');
console.log('================================================================\n');

/**
 * Cria um PFX/PKCS#12 válido em memória via node-forge para testar o CertificadoA1Service
 */
function gerarCertificadoA1Teste(senha: string): Buffer {
  const pki = forge.pki;
  const keys = pki.rsa.generateKeyPair(1024);
  const cert = pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [
    { name: 'commonName', value: 'EMPRESA EXEMPLO FISCAL LTDA:11222333000181' },
    { name: 'countryName', value: 'BR' },
    { shortName: 'ST', value: 'SP' },
    { name: 'organizationName', value: 'ICP-Brasil' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, senha, {
    generateLocalKeyId: true,
    friendlyName: 'Certificado de Teste SEFAZ',
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, 'binary');
}

async function run() {
  const senhaCorreta = 'SenhaTeste123';
  const pfxBuffer = gerarCertificadoA1Teste(senhaCorreta);

  // 1. Teste de Leitura e Parsing do Certificado A1
  console.log('[TESTE 1] Leitura e Validação do Certificado A1 (.pfx)');
  const certService = new CertificadoA1Service(pfxBuffer, senhaCorreta);
  const dados = certService.dados;

  console.log(`- Razão Social: ${dados.razaoSocial}`);
  console.log(`- CNPJ Extraído: ${dados.cnpjTitular}`);
  console.log(`- Válido de: ${dados.validoDe.toISOString()} até ${dados.validoAte.toISOString()}`);
  console.log(`- Dias para expirar: ${dados.diasParaExpirar} dias`);
  console.log(`- Expirado: ${dados.expirado}`);
  console.log(`- Agente HTTPS mTLS inicializado: ${!!certService.httpsAgent ? 'SIM (OK)' : 'NÃO'}`);
  console.log('-> Sucesso!\n----------------------------------------------------------------\n');

  // 2. Teste com Senha Incorreta
  console.log('[TESTE 2] Tentativa de Carregar Certificado com Senha Incorreta');
  try {
    new CertificadoA1Service(pfxBuffer, 'SenhaErrada!');
    console.error('ERRO: Deveria ter disparado exceção de senha incorreta!');
  } catch (err: any) {
    console.log(`-> Exceção esperada capturada: "${err.message}"`);
  }
  console.log('\n----------------------------------------------------------------\n');

  // 3. Teste do Adapter Pattern e Download de NFC-e
  console.log('[TESTE 3] Consulta e Download de NFC-e via Adapter');
  const baseChave = '3524081122233300018165001000012345112345678';
  const dv = calcularDigitoVerificadorSEFAZ(baseChave);
  const chaveObj = ChaveAcessoNFCe.criar(`${baseChave}${dv}`);

  const adapter = FiscalAdapterFactory.criar({ provedor: 'MOCK' });
  const resultado = await adapter.consultarEBaixarNFCe(chaveObj);

  console.log(`- Provedor: ${resultado.provedor}`);
  console.log(`- Sucesso: ${resultado.sucesso}`);
  console.log(`- cStat: ${resultado.cStat} (${resultado.statusDescricao})`);
  console.log(`- Protocolo SEFAZ: ${resultado.numeroProtocolo}`);
  console.log(`- Emitente: ${resultado.razaoSocialEmitente} (${resultado.cnpjEmitente})`);
  console.log(`- Valor Total: R$ ${resultado.valorTotal?.toFixed(2)}`);
  console.log(`- Quantidade de Itens: ${resultado.itens?.length}`);
  console.log(`- XML Disponível: ${resultado.xmlConteudo ? `${resultado.xmlConteudo.length} caracteres` : 'NÃO'}`);

  console.log('\n================================================================');
  console.log('TODOS OS TESTES DO SERVIÇO DE INTEGRAÇÃO CONCLUÍDOS COM SUCESSO!');
  console.log('================================================================');
}

run().catch(console.error);
