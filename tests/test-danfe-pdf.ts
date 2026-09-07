import fs from 'fs';
import path from 'path';
import { DanfeNfceService } from '../src/services/pdf/danfeNfce.service';
import { MockFiscalAdapter } from '../src/services/adapters/MockFiscalAdapter';
import { ChaveAcessoNFCe } from '../src/domain/models/ChaveAcesso';
import { calcularDigitoVerificadorSEFAZ } from '../src/core/validators/chaveAcesso.validator';

async function testarPdf() {
  console.log('================================================================');
  console.log('       TESTE DE GERAÇÃO DO DANFE NFC-e EM PDF (BOBINA 80MM)');
  console.log('================================================================\n');

  const baseChave = '3524081122233300018165001000012345112345678';
  const dv = calcularDigitoVerificadorSEFAZ(baseChave);
  const chaveObj = ChaveAcessoNFCe.criar(`${baseChave}${dv}`);

  const adapter = new MockFiscalAdapter();
  const resultado = await adapter.consultarEBaixarNFCe(chaveObj);

  if (!resultado.xmlConteudo) {
    throw new Error('XML não retornado pelo adapter');
  }

  const pdfService = new DanfeNfceService();
  console.log('Gerando PDF do DANFE a partir do XML da NFC-e...');
  const pdfBuffer = await pdfService.gerarDanfePdf(resultado.xmlConteudo, chaveObj.valor);

  const outputDir = path.resolve(__dirname, '../storage/documents');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `DANFE-NFCe-${chaveObj.valor}.pdf`);
  fs.writeFileSync(outputPath, pdfBuffer);

  console.log(`- PDF gerado com sucesso!`);
  console.log(`- Tamanho: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`- Arquivo salvo em: ${outputPath}`);
  console.log('\n================================================================');
  console.log('TESTE DE GERAÇÃO DE PDF CONCLUÍDO COM SUCESSO!');
  console.log('================================================================');
}

testarPdf().catch(console.error);
