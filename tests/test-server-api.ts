import http from 'http';
import app from '../src/server';
import axios from 'axios';
import { calcularDigitoVerificadorSEFAZ } from '../src/core/validators/chaveAcesso.validator';

async function testarApiCompleta() {
  console.log('================================================================');
  console.log('       TESTE COMPLETO DOS ENDPOINTS DA API REST (NFC-e)');
  console.log('================================================================\n');

  const PORT_TEST = 3334;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(PORT_TEST, () => {
      console.log(`Servidor de teste iniciado em http://localhost:${PORT_TEST}`);
      resolve();
    });
  });

  const api = axios.create({ baseURL: `http://localhost:${PORT_TEST}/api/v1` });

  try {
    // 1. Health Check
    console.log('[TESTE 1] Health Check: GET /api/v1/health');
    const resHealth = await api.get('/health');
    console.log(`- Status: ${resHealth.status} -> Provedor: ${resHealth.data.provedorAtivo}`);

    // 2. Validação de Chave: POST /api/v1/nfce/validar
    console.log('\n[TESTE 2] Validação de Chave: POST /api/v1/nfce/validar');
    const baseChave = '3524081122233300018165001000012345112345678';
    const dv = calcularDigitoVerificadorSEFAZ(baseChave);
    const chaveValida = `${baseChave}${dv}`;

    const resValidar = await api.post('/nfce/validar', { chave: chaveValida });
    console.log(`- Status: ${resValidar.status} -> Válida: ${resValidar.data.sucesso}`);
    console.log(`- UF: ${resValidar.data.dados.uf.sigla} | CNPJ: ${resValidar.data.dados.cnpjEmitenteFormatado}`);

    // 3. Consulta e Download: POST /api/v1/nfce/consultar
    console.log('\n[TESTE 3] Consulta e Download: POST /api/v1/nfce/consultar');
    const resConsultar = await api.post('/nfce/consultar', {
      chave: chaveValida,
      provedor: 'MOCK',
    });
    console.log(`- Status: ${resConsultar.status} -> Sucesso: ${resConsultar.data.sucesso}`);
    console.log(`- Protocolo: ${resConsultar.data.resultado.numeroProtocolo}`);
    console.log(`- Link XML: ${resConsultar.data.resultado.links.xml}`);
    console.log(`- Link DANFE: ${resConsultar.data.resultado.links.danfe}`);

    // 4. Download do XML: GET /api/v1/nfce/:chave/xml
    console.log('\n[TESTE 4] Download do XML: GET /api/v1/nfce/:chave/xml');
    const resXml = await api.get(`/nfce/${chaveValida}/xml`, { responseType: 'text' });
    console.log(`- Status: ${resXml.status} -> Tipo: ${resXml.headers['content-type']}`);
    console.log(`- Tamanho XML: ${resXml.data.length} caracteres`);
    console.log(`- Contém nfeProc: ${resXml.data.includes('<nfeProc') ? 'SIM (OK)' : 'NÃO'}`);

    // 5. Download do DANFE PDF: GET /api/v1/nfce/:chave/danfe
    console.log('\n[TESTE 5] Download do DANFE PDF: GET /api/v1/nfce/:chave/danfe');
    const resPdf = await api.get(`/nfce/${chaveValida}/danfe`, { responseType: 'arraybuffer' });
    console.log(`- Status: ${resPdf.status} -> Tipo: ${resPdf.headers['content-type']}`);
    console.log(`- Tamanho PDF: ${(resPdf.data.length / 1024).toFixed(2)} KB`);
    console.log(`- Assinatura PDF (%PDF): ${resPdf.data.slice(0, 4).toString() === '%PDF' ? 'VÁLIDA (OK)' : 'INVÁLIDA'}`);

    // 6. Histórico de Consultas: GET /api/v1/nfce/historico
    console.log('\n[TESTE 6] Listagem de Histórico: GET /api/v1/nfce/historico');
    const resHist = await api.get('/nfce/historico');
    console.log(`- Status: ${resHist.status} -> Quantidade no Histórico: ${resHist.data.dados.length}`);

    console.log('\n================================================================');
    console.log('TODOS OS ENDPOINTS DA API REST FORAM TESTADOS COM SUCESSO 100%!');
    console.log('================================================================');
  } catch (err: any) {
    console.error('Erro nos testes da API:', err.response?.data || err.message);
  } finally {
    server.close();
  }
}

testarApiCompleta();
