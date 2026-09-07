// =========================================================================
// SISTEMA DE DOWNLOAD DE CUPOM FISCAL ELETRÔNICO (NFC-e MOD 65)
// Frontend Logic - Pair Programming Fiscal
// =========================================================================

const CHAVE_EXEMPLO_TESTE = '35240811222333000181650010000123451123456780';

// Elementos do DOM
const inputChave = document.getElementById('input-chave');
const chaveCounter = document.getElementById('chave-counter');
const chaveFeedback = document.getElementById('chave-feedback');
const formConsulta = document.getElementById('form-consulta');
const selectProvedor = document.getElementById('select-provedor');
const btnConsultar = document.getElementById('btn-consultar');
const btnUsarExemplo = document.getElementById('btn-usar-exemplo');
const btnColar = document.getElementById('btn-colar');

// Elementos do Card de Resultado
const cardResultado = document.getElementById('card-resultado');
const resStatusText = document.getElementById('res-status-text');
const resProtocolo = document.getElementById('res-protocolo');
const resEmitente = document.getElementById('res-emitente');
const resCnpj = document.getElementById('res-cnpj');
const resDataEmissao = document.getElementById('res-data-emissao');
const resValor = document.getElementById('res-valor');
const resQtdItens = document.getElementById('res-qtd-itens');
const sectionItens = document.getElementById('section-itens');
const resItensTbody = document.getElementById('res-itens-tbody');
const btnDownloadXml = document.getElementById('btn-download-xml');
const btnDownloadPdf = document.getElementById('btn-download-pdf');
const btnVerXmlModal = document.getElementById('btn-ver-xml-modal');

// Elementos de Histórico
const historyContainer = document.getElementById('history-container');
const historyCount = document.getElementById('history-count');

// Elementos dos Modais
const modalXml = document.getElementById('modal-xml');
const xmlContentPre = document.getElementById('xml-content-pre');
const btnFecharModalXml = document.getElementById('btn-fechar-modal-xml');
const btnFecharModalXml2 = document.getElementById('btn-fechar-modal-xml-2');
const btnCopiarXml = document.getElementById('btn-copiar-xml');

const modalCert = document.getElementById('modal-cert');
const btnModalCert = document.getElementById('btn-modal-cert');
const btnFecharModalCert = document.getElementById('btn-fechar-modal-cert');
const btnCancelarModalCert = document.getElementById('btn-cancelar-modal-cert');
const formUploadCert = document.getElementById('form-upload-cert');
const certStatusText = document.getElementById('cert-status-text');
const certUploadStatus = document.getElementById('cert-upload-status');

let xmlCacheAtual = '';

// =========================================================================
// MÓDULO DE VALIDAÇÃO LOCAL (MÓDULO 11 SEFAZ NO CLIENTE)
// =========================================================================

function calcularDvSefaz(base43) {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let pesoIdx = 0;
  let soma = 0;

  for (let i = base43.length - 1; i >= 0; i--) {
    const d = parseInt(base43.charAt(i), 10);
    soma += d * pesos[pesoIdx];
    pesoIdx = (pesoIdx + 1) % pesos.length;
  }

  const resto = soma % 11;
  return (resto === 0 || resto === 1) ? 0 : 11 - resto;
}

function formatarChaveVisual(val) {
  const digits = val.replace(/\D/g, '').substring(0, 44);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function validarChaveInstantanea(chaveLimpa) {
  if (chaveLimpa.length < 44) {
    chaveFeedback.className = 'validation-feedback hidden';
    return;
  }

  const cUF = chaveLimpa.substring(0, 2);
  const mod = chaveLimpa.substring(20, 22);
  const base43 = chaveLimpa.substring(0, 43);
  const dvInformado = parseInt(chaveLimpa.charAt(43), 10);
  const dvCalculado = calcularDvSefaz(base43);

  if (mod !== '65') {
    chaveFeedback.className = 'validation-feedback invalida';
    chaveFeedback.innerHTML = `⚠️ Modelo fiscal "${mod}" detectado. Apenas NFC-e (Modelo 65) é suportado.`;
    return;
  }

  if (dvInformado !== dvCalculado) {
    chaveFeedback.className = 'validation-feedback invalida';
    chaveFeedback.innerHTML = `❌ Dígito verificador inválido! Informado: ${dvInformado}, Esperado: ${dvCalculado}`;
    return;
  }

  chaveFeedback.className = 'validation-feedback valida';
  chaveFeedback.innerHTML = `✓ Chave NFC-e Válida (UF IBGE: ${cUF} | Mod: 65 | DV: ${dvCalculado})`;
}

// =========================================================================
// EVENTOS DE ENTRADA
// =========================================================================

inputChave.addEventListener('input', (e) => {
  const rawDigits = e.target.value.replace(/\D/g, '').substring(0, 44);
  e.target.value = formatarChaveVisual(rawDigits);
  chaveCounter.innerText = `${rawDigits.length} / 44`;
  validarChaveInstantanea(rawDigits);
});

btnColar.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    const clean = text.replace(/\D/g, '').substring(0, 44);
    inputChave.value = formatarChaveVisual(clean);
    chaveCounter.innerText = `${clean.length} / 44`;
    validarChaveInstantanea(clean);
  } catch {
    alert('Permissão negada para acessar a área de transferência.');
  }
});

btnUsarExemplo.addEventListener('click', () => {
  inputChave.value = formatarChaveVisual(CHAVE_EXEMPLO_TESTE);
  chaveCounter.innerText = '44 / 44';
  validarChaveInstantanea(CHAVE_EXEMPLO_TESTE);
});

// =========================================================================
// ENVIO E CONSULTA DA NFC-e
// =========================================================================

formConsulta.addEventListener('submit', async (e) => {
  e.preventDefault();
  const chaveLimpa = inputChave.value.replace(/\D/g, '');

  if (chaveLimpa.length !== 44) {
    alert('Por favor, insira uma chave de acesso completa de 44 dígitos.');
    return;
  }

  const provedor = selectProvedor.value;

  // Estado de carregamento
  btnConsultar.disabled = true;
  btnConsultar.querySelector('.btn-text').innerText = 'Consultando SEFAZ...';

  try {
    const res = await fetch('/api/v1/nfce/consultar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: chaveLimpa, provedor }),
    });

    const data = await res.json();

    if (!res.ok || !data.sucesso) {
      throw new Error(data.erro || data.resultado?.mensagem || 'Falha ao consultar NFC-e.');
    }

    exibirResultado(data.resultado);
    carregarHistorico();
  } catch (err) {
    alert(`Erro na consulta: ${err.message}`);
  } finally {
    btnConsultar.disabled = false;
    btnConsultar.querySelector('.btn-text').innerText = 'Consultar e Baixar';
  }
});

function exibirResultado(res) {
  cardResultado.classList.remove('hidden');

  resStatusText.innerText = `${res.statusDescricao} (cStat: ${res.cStat})`;
  resProtocolo.innerText = res.numeroProtocolo || 'N/A';
  resEmitente.innerText = res.razaoSocialEmitente || 'EMPRESA EMITENTE';
  resCnpj.innerText = `CNPJ: ${res.cnpjEmitente}`;
  resDataEmissao.innerText = `Data: ${res.dataAutorizacao ? new Date(res.dataAutorizacao).toLocaleString('pt-BR') : '--'}`;

  const valorFormatado = res.valorTotal
    ? `R$ ${Number(res.valorTotal).toFixed(2).replace('.', ',')}`
    : 'R$ 0,00';
  resValor.innerText = valorFormatado;

  // Itens
  if (res.itens && res.itens.length > 0) {
    sectionItens.classList.remove('hidden');
    resQtdItens.innerText = `${res.itens.length} itens`;
    resItensTbody.innerHTML = res.itens.map(item => `
      <tr>
        <td>${item.numeroItem}</td>
        <td><code>${item.codigo}</code></td>
        <td>${item.descricao}</td>
        <td>${item.quantidade}</td>
        <td>${item.unidade}</td>
        <td>R$ ${Number(item.valorUnitario).toFixed(2)}</td>
        <td><strong>R$ ${Number(item.valorTotal).toFixed(2)}</strong></td>
      </tr>
    `).join('');
  } else {
    sectionItens.classList.add('hidden');
    resQtdItens.innerText = '';
  }

  // Links de Download
  btnDownloadXml.href = res.links?.xml || `/api/v1/nfce/${res.chaveAcesso}/xml`;
  btnDownloadPdf.href = res.links?.danfe || `/api/v1/nfce/${res.chaveAcesso}/danfe`;
  xmlCacheAtual = res.xmlConteudo || '';

  // Scroll suave até o resultado
  cardResultado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =========================================================================
// HISTÓRICO RECENTE
// =========================================================================

async function carregarHistorico() {
  try {
    const res = await fetch('/api/v1/nfce/historico');
    const data = await res.json();

    if (data.sucesso && data.dados && data.dados.length > 0) {
      historyCount.innerText = `${data.dados.length} registros`;
      historyContainer.innerHTML = data.dados.map(item => `
        <div class="history-item">
          <div class="history-item-left">
            <h5>${item.razaoSocialEmitente || 'Emitente'}</h5>
            <span class="history-item-chave">${formatarChaveVisual(item.chaveAcesso)}</span>
          </div>
          <div class="history-item-right">
            <span class="history-item-val">${item.valorTotal ? `R$ ${Number(item.valorTotal).toFixed(2).replace('.', ',')}` : ''}</span>
            <a href="/api/v1/nfce/${item.chaveAcesso}/danfe" target="_blank" class="link-example">DANFE (PDF)</a>
            <a href="/api/v1/nfce/${item.chaveAcesso}/xml" class="link-example">XML</a>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.warn('Não foi possível carregar histórico:', err);
  }
}

// =========================================================================
// MODAIS (XML & CERTIFICADO DIGITAL: WINDOWS E PFX)
// =========================================================================

btnVerXmlModal.addEventListener('click', () => {
  if (!xmlCacheAtual) {
    alert('Nenhum XML em cache para visualização.');
    return;
  }
  xmlContentPre.innerText = xmlCacheAtual;
  modalXml.classList.remove('hidden');
});

btnFecharModalXml.addEventListener('click', () => modalXml.classList.add('hidden'));
btnFecharModalXml2.addEventListener('click', () => modalXml.classList.add('hidden'));

btnCopiarXml.addEventListener('click', async () => {
  if (xmlCacheAtual) {
    await navigator.clipboard.writeText(xmlCacheAtual);
    btnCopiarXml.innerText = 'Copiado!';
    setTimeout(() => { btnCopiarXml.innerText = 'Copiar XML'; }, 2000);
  }
});

// ABAS DO MODAL DE CERTIFICADO
const tabBtnWindows = document.getElementById('tab-btn-windows');
const tabBtnArquivo = document.getElementById('tab-btn-arquivo');
const tabContentWindows = document.getElementById('tab-content-windows');
const tabContentArquivo = document.getElementById('tab-content-arquivo');
const windowsCertsList = document.getElementById('windows-certs-list');
const btnAtualizarWindowsCerts = document.getElementById('btn-atualizar-windows-certs');

tabBtnWindows.addEventListener('click', () => {
  tabBtnWindows.classList.add('active');
  tabBtnArquivo.classList.remove('active');
  tabContentWindows.classList.remove('hidden');
  tabContentArquivo.classList.add('hidden');
  carregarCertificadosWindows();
});

tabBtnArquivo.addEventListener('click', () => {
  tabBtnArquivo.classList.add('active');
  tabBtnWindows.classList.remove('active');
  tabContentArquivo.classList.remove('hidden');
  tabContentWindows.classList.add('hidden');
});

btnAtualizarWindowsCerts.addEventListener('click', carregarCertificadosWindows);

btnModalCert.addEventListener('click', () => {
  modalCert.classList.remove('hidden');
  carregarCertificadosWindows();
});

btnFecharModalCert.addEventListener('click', () => modalCert.classList.add('hidden'));
btnCancelarModalCert.addEventListener('click', () => modalCert.classList.add('hidden'));

async function carregarCertificadosWindows() {
  windowsCertsList.innerHTML = '<div class="loading-state">Buscando certificados no Windows...</div>';

  try {
    const res = await fetch('/api/v1/certificados/windows');
    const data = await res.json();

    if (!data.sucesso || !data.dados || data.dados.length === 0) {
      windowsCertsList.innerHTML = `
        <div class="empty-history" style="text-align: left;">
          Nenhum certificado ICP-Brasil com chave privada encontrado no Windows.<br>
          <small>Use a aba <strong>"2. Arquivo .PFX / .P12 em Disco"</strong> para enviar seu arquivo.</small>
        </div>
      `;
      return;
    }

    const thumbprintAtivo = data.ativo;

    windowsCertsList.innerHTML = data.dados.map(c => {
      const isAtivo = thumbprintAtivo && thumbprintAtivo.toLowerCase() === c.thumbprint.toLowerCase();
      const cnpjFmt = c.cnpj ? c.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : (c.cpf || 'Sem doc');
      return `
        <div class="cert-card ${isAtivo ? 'active-cert' : ''}">
          <div class="cert-info">
            <h4>${c.razaoSocial}</h4>
            <div class="cert-badges">
              <span class="cert-badge cnpj">CNPJ/CPF: ${cnpjFmt}</span>
              <span class="cert-badge valid">Expira em: ${c.diasRestantes} dias</span>
              <span class="cert-badge" title="Thumbprint: ${c.thumbprint}">ID: ${c.thumbprint.substring(0, 10)}...</span>
            </div>
          </div>
          <button type="button" class="btn-select-cert ${isAtivo ? 'selected' : 'unselected'}" onclick="selecionarCertificadoWindows('${c.thumbprint}')">
            ${isAtivo ? '✓ Ativo no Sistema' : 'Usar este Certificado'}
          </button>
        </div>
      `;
    }).join('');
  } catch (err) {
    windowsCertsList.innerHTML = `<div class="alert-box error">Erro ao carregar certificados do Windows: ${err.message}</div>`;
  }
}

window.selecionarCertificadoWindows = async function(thumbprint) {
  try {
    const res = await fetch('/api/v1/certificados/selecionar-windows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thumbprint }),
    });
    const data = await res.json();
    if (!data.sucesso) throw new Error(data.erro);

    certStatusText.innerText = `Windows: ${data.dados.razaoSocial.substring(0, 18)}...`;
    alert(`Certificado ativado: ${data.dados.razaoSocial}`);
    carregarCertificadosWindows();
  } catch (err) {
    alert(`Erro ao selecionar certificado: ${err.message}`);
  }
};

formUploadCert.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('cert-file');
  const passInput = document.getElementById('cert-pass');

  if (!fileInput.files[0]) {
    alert('Selecione um arquivo .pfx');
    return;
  }

  const formData = new FormData();
  formData.append('certificado', fileInput.files[0]);
  formData.append('senha', passInput.value);

  certUploadStatus.className = 'alert-box';
  certUploadStatus.innerText = 'Validando e carregando arquivo PFX...';
  certUploadStatus.classList.remove('hidden');

  try {
    const res = await fetch('/api/v1/certificados/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (!res.ok || !data.sucesso) {
      throw new Error(data.erro || 'Falha ao processar o certificado.');
    }

    certUploadStatus.className = 'alert-box success';
    certUploadStatus.innerHTML = `✓ Certificado validado com sucesso!<br><strong>${data.dados.razaoSocial}</strong> (Expira em: ${data.dados.diasParaExpirar} dias)`;
    certStatusText.innerText = `PFX: ${data.dados.cnpjTitular || data.dados.razaoSocial.substring(0, 15)}`;

    setTimeout(() => {
      modalCert.classList.add('hidden');
    }, 2500);
  } catch (err) {
    certUploadStatus.className = 'alert-box error';
    certUploadStatus.innerText = `Erro: ${err.message}`;
  }
});

// Checa status do certificado ao iniciar
async function verificarCertificadoStatus() {
  try {
    const res = await fetch('/api/v1/certificados/status');
    const data = await res.json();
    if (data.configurado && data.dados) {
      const prefix = data.origem === 'WINDOWS_STORE' ? 'Windows' : 'PFX';
      certStatusText.innerText = `${prefix}: ${data.dados.razaoSocial?.substring(0, 16) || data.dados.cnpjTitular}`;
    }
  } catch {
    // Modo padrão
  }
}

// =========================================================================
// SISTEMA DE ATUALIZAÇÃO AUTOMÁTICA VIA GITHUB RELEASES
// =========================================================================

const updateBanner = document.getElementById('update-banner');
const updateTitle = document.getElementById('update-title');
const updateDesc = document.getElementById('update-desc');
const btnAtualizarSistema = document.getElementById('btn-atualizar-sistema');
const btnDispensarUpdate = document.getElementById('btn-dispensar-update');

let dadosAtualizacaoAtual = null;

async function verificarAtualizacoesGitHub() {
  try {
    const res = await fetch('/api/v1/sistema/atualizacao');
    const data = await res.json();

    if (data.sucesso && data.dados && data.dados.possuiAtualizacao) {
      dadosAtualizacaoAtual = data.dados;
      updateTitle.innerText = `🎉 Nova versão v${data.dados.versaoRemota} disponível no GitHub!`;
      updateDesc.innerText = `Você está na versão v${data.dados.versaoAtual}. ${data.dados.descricao || ''}`;
      updateBanner.classList.remove('hidden');
    }
  } catch (err) {
    console.warn('Verificação de atualização do GitHub:', err);
  }
}

btnAtualizarSistema.addEventListener('click', async () => {
  if (!dadosAtualizacaoAtual || !dadosAtualizacaoAtual.urlDownload) {
    alert('Informações de download não disponíveis.');
    return;
  }

  btnAtualizarSistema.disabled = true;
  btnAtualizarSistema.innerText = 'Baixando e Atualizando...';

  try {
    const res = await fetch('/api/v1/sistema/atualizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urlDownload: dadosAtualizacaoAtual.urlDownload,
        nomeArquivo: dadosAtualizacaoAtual.nomeArquivo,
      }),
    });

    const data = await res.json();
    if (!data.sucesso) throw new Error(data.erro || 'Falha na atualização.');

    alert('Atualização instalada com sucesso! A página será recarregada.');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (err) {
    alert(`Erro ao atualizar sistema: ${err.message}`);
    btnAtualizarSistema.disabled = false;
    btnAtualizarSistema.innerText = 'Atualizar Agora';
  }
});

btnDispensarUpdate.addEventListener('click', () => {
  updateBanner.classList.add('hidden');
});

// Inicialização
verificarCertificadoStatus();
carregarHistorico();
verificarAtualizacoesGitHub();
