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

// Elementos das Abas e Validação
const tabDownload = document.getElementById('tab-download');
const tabValidar = document.getElementById('tab-validar');
const headerDownload = document.getElementById('header-download');
const headerValidar = document.getElementById('header-validar');
const cardValidacao = document.getElementById('card-validacao');
const valStatusBadge = document.getElementById('val-status-badge');
const valStatusText = document.getElementById('val-status-text');
const valMotivo = document.getElementById('val-motivo');
const valProtocolo = document.getElementById('val-protocolo');
const valData = document.getElementById('val-data');
const valCstat = document.getElementById('val-cstat');

let appMode = 'download';

if (tabDownload && tabValidar) {
  tabDownload.addEventListener('click', () => {
    appMode = 'download';
    tabDownload.classList.add('active');
    tabValidar.classList.remove('active');
    headerDownload.classList.remove('hidden');
    headerValidar.classList.add('hidden');
    btnConsultar.querySelector('.btn-text').innerText = 'Consultar e Baixar';
    cardValidacao.classList.add('hidden');
  });

  tabValidar.addEventListener('click', () => {
    appMode = 'validar';
    tabValidar.classList.add('active');
    tabDownload.classList.remove('active');
    headerValidar.classList.remove('hidden');
    headerDownload.classList.add('hidden');
    btnConsultar.querySelector('.btn-text').innerText = 'Validar na SEFAZ';
    cardResultado.classList.add('hidden');
  });
}
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
  const textoOriginalBtn = appMode === 'download' ? 'Consultar e Baixar' : 'Validar na SEFAZ';
  btnConsultar.querySelector('.btn-text').innerText = appMode === 'download' ? 'Consultando...' : 'Validando...';
  
  cardResultado.classList.add('hidden');
  if (cardValidacao) cardValidacao.classList.add('hidden');

  try {
    const endpoint = appMode === 'download' ? '/api/v1/nfce/consultar' : '/api/v1/nfce/validar-sefaz';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: chaveLimpa, provedor }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.erro || data.mensagem || 'Falha na comunicação com o servidor');
    }

    if (!data.sucesso) {
      alert(`Consulta retornou sem sucesso: ${data.mensagem || data.statusDescricao || (data.resultado && data.resultado.mensagem) || 'Erro desconhecido'}`);
    }

    if (appMode === 'validar') {
      exibirResultadoValidacao(data);
    } else {
      exibirResultado(data.resultado);
      carregarHistorico();
    }
  } catch (err) {
    alert(`Erro na requisição: ${err.message}`);
  } finally {
    btnConsultar.disabled = false;
    btnConsultar.querySelector('.btn-text').innerText = textoOriginalBtn;
  }
});

function exibirResultadoValidacao(dados) {
  cardValidacao.classList.remove('hidden');
  
  valStatusBadge.className = 'result-status-badge';
  if (dados.cStat === 100 || dados.cStat === 150) {
    valStatusBadge.classList.add('status-authorized');
    valStatusText.innerText = 'AUTORIZADA';
  } else {
    valStatusBadge.classList.add('status-error');
    valStatusText.innerText = 'NÃO AUTORIZADA / CANCELADA';
  }

  valMotivo.innerText = dados.statusDescricao || 'Sem descrição';
  valProtocolo.innerText = `Protocolo: ${dados.numeroProtocolo || '--'}`;
  valData.innerText = `Data Sefaz: ${dados.dataAutorizacao || '--'}`;
  valCstat.innerText = dados.cStat || '--';
}

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

// =========================================================================
// ENCERRAMENTO LIMPO DO SISTEMA
// =========================================================================
const btnEncerrarSistema = document.getElementById('btn-encerrar-sistema');
const modalEncerrar = document.getElementById('modal-encerrar');
const btnCloseModalEncerrar = document.getElementById('btn-close-modal-encerrar');
const btnCancelarEncerrar = document.getElementById('btn-cancelar-encerrar');
const btnConfirmarEncerrar = document.getElementById('btn-confirmar-encerrar');

if (btnEncerrarSistema && modalEncerrar) {
  btnEncerrarSistema.addEventListener('click', () => {
    modalEncerrar.classList.remove('hidden');
  });

  const fecharModalEncerrar = () => modalEncerrar.classList.add('hidden');
  if (btnCloseModalEncerrar) btnCloseModalEncerrar.addEventListener('click', fecharModalEncerrar);
  if (btnCancelarEncerrar) btnCancelarEncerrar.addEventListener('click', fecharModalEncerrar);

  if (btnConfirmarEncerrar) {
    btnConfirmarEncerrar.addEventListener('click', async () => {
      btnConfirmarEncerrar.disabled = true;
      btnConfirmarEncerrar.innerText = 'Encerrando...';

      try {
        await fetch('/api/v1/sistema/encerrar', { method: 'POST' });
      } catch {
        // Ignora erro pois o servidor encerra na hora
      }

      document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #f8fafc; font-family: 'Plus Jakarta Sans', sans-serif; text-align: center; padding: 20px;">
          <img src="assets/logo.png" style="width: 90px; height: 90px; object-fit: contain; margin-bottom: 20px;" alt="Guará">
          <h2 style="color: #38bdf8; margin-bottom: 8px;">Sistema Fiscal Encerrado com Sucesso</h2>
          <p style="color: #f97316; font-weight: 700; margin-bottom: 16px; font-size: 0.9rem;">GUARÁ SEGURANÇA E INTERNET</p>
          <p style="color: #94a3b8; max-width: 440px; margin-bottom: 24px; line-height: 1.6;">O servidor local e todos os processos foram finalizados com segurança. Você já pode fechar esta aba do navegador.</p>
          <button onclick="window.close()" style="background: #1e293b; color: #fff; border: 1px solid #334155; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">Fechar Aba</button>
        </div>
      `;

      setTimeout(() => {
        try { window.close(); } catch {}
      }, 1500);
    });
  }
}

// =========================================================================
// SISTEMA DE LICENCIAMENTO E ATIVAÇÃO GUARÁ
// =========================================================================
const btnModalLicenca = document.getElementById('btn-modal-licenca');
const licenseDot = document.getElementById('license-dot');
const licenseStatusText = document.getElementById('license-status-text');
const modalAtivacao = document.getElementById('modal-ativacao');
const btnCloseModalAtivacao = document.getElementById('btn-close-modal-ativacao');
const inputMachineId = document.getElementById('input-machine-id');
const btnCopiarMachineId = document.getElementById('btn-copiar-machine-id');
const inputChaveAtivacao = document.getElementById('input-chave-ativacao');
const btnSubmeterAtivacao = document.getElementById('btn-submeter-ativacao');
const licencaStatusMsg = document.getElementById('licenca-status-msg');

let statusLicencaAtual = null;

async function verificarStatusLicenca() {
  try {
    const res = await fetch('/api/v1/licenca/status');
    const data = await res.json();

    if (data.sucesso && data.dados) {
      statusLicencaAtual = data.dados;
      if (inputMachineId) inputMachineId.value = data.dados.machineId;

      if (data.dados.ativado) {
        if (licenseDot) licenseDot.className = 'status-dot dot-active';
        if (btnModalLicenca) btnModalLicenca.classList.remove('blocked');
        const tipoLabel = data.dados.tipo || 'Ativa';
        if (licenseStatusText) licenseStatusText.innerText = `Licença: ${tipoLabel}`;
        if (modalAtivacao) modalAtivacao.classList.add('hidden');
        if (btnCloseModalAtivacao) btnCloseModalAtivacao.style.display = 'block';
      } else {
        if (licenseDot) licenseDot.className = 'status-dot dot-error';
        if (btnModalLicenca) btnModalLicenca.classList.add('blocked');
        if (licenseStatusText) licenseStatusText.innerText = 'Licença: Bloqueado (Ativar)';
        if (modalAtivacao) modalAtivacao.classList.remove('hidden');
        if (btnCloseModalAtivacao) btnCloseModalAtivacao.style.display = 'none';
      }
    }
  } catch (err) {
    console.warn('Erro ao checar licença:', err);
  }
}

if (btnModalLicenca && modalAtivacao) {
  btnModalLicenca.addEventListener('click', () => {
    modalAtivacao.classList.remove('hidden');
  });
}

if (btnCloseModalAtivacao && modalAtivacao) {
  btnCloseModalAtivacao.addEventListener('click', () => {
    if (statusLicencaAtual && statusLicencaAtual.ativado) {
      modalAtivacao.classList.add('hidden');
    }
  });
}

if (btnCopiarMachineId && inputMachineId) {
  btnCopiarMachineId.addEventListener('click', () => {
    if (inputMachineId.value) {
      navigator.clipboard.writeText(inputMachineId.value);
      btnCopiarMachineId.innerHTML = '<span>✓ Copiado!</span>';
      setTimeout(() => {
        btnCopiarMachineId.innerHTML = '<span>Copiar ID</span>';
      }, 2000);
    }
  });
}

if (btnSubmeterAtivacao && inputChaveAtivacao) {
  btnSubmeterAtivacao.addEventListener('click', async () => {
    const chave = inputChaveAtivacao.value.trim();
    if (!chave) {
      licencaStatusMsg.className = 'alert-box error';
      licencaStatusMsg.innerText = 'Por favor, cole sua chave de ativação.';
      licencaStatusMsg.classList.remove('hidden');
      return;
    }

    btnSubmeterAtivacao.disabled = true;
    btnSubmeterAtivacao.innerText = 'Validando Chave...';
    licencaStatusMsg.classList.add('hidden');

    try {
      const res = await fetch('/api/v1/licenca/ativar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave }),
      });
      const data = await res.json();

      if (!res.ok || !data.sucesso) {
        throw new Error(data.erro || 'Chave inválida para este computador.');
      }

      licencaStatusMsg.className = 'alert-box success';
      licencaStatusMsg.innerHTML = `✓ ${data.dados.mensagem || 'Sistema ativado com sucesso!'}`;
      licencaStatusMsg.classList.remove('hidden');

      setTimeout(() => {
        verificarStatusLicenca();
      }, 1500);
    } catch (err) {
      licencaStatusMsg.className = 'alert-box error';
      licencaStatusMsg.innerText = `Erro: ${err.message}`;
      licencaStatusMsg.classList.remove('hidden');
    } finally {
      btnSubmeterAtivacao.disabled = false;
      btnSubmeterAtivacao.innerText = 'Ativar Sistema Agora';
    }
  });
}

// =========================================================================
// SISTEMA DE ATUALIZAÇÃO AUTOMÁTICA E POP-UP (GITHUB RELEASES)
// =========================================================================
const lblVersaoSistema = document.getElementById('lbl-versao-sistema');
const btnVerificarAtualizacaoFooter = document.getElementById('btn-verificar-atualizacao-footer');
const lblStatusAtualizacao = document.getElementById('lbl-status-atualizacao');
const modalAtualizacao = document.getElementById('modal-atualizacao');
const btnFecharModalAtualizacao = document.getElementById('btn-fechar-modal-atualizacao');
const btnLembrarMaisTarde = document.getElementById('btn-lembrar-mais-tarde');
const modalUpdateVersaoAtual = document.getElementById('modal-update-versao-atual');
const modalUpdateVersaoNova = document.getElementById('modal-update-versao-nova');
const modalUpdateData = document.getElementById('modal-update-data');
const modalUpdateDescricao = document.getElementById('modal-update-descricao');
const btnAplicarAtualizacao = document.getElementById('btn-aplicar-atualizacao');
const lblBtnAplicarAtualizacao = document.getElementById('lbl-btn-aplicar-atualizacao');
const updateProgressContainer = document.getElementById('update-progress-container');
const updateProgressStatus = document.getElementById('update-progress-status');
const updateProgressPercent = document.getElementById('update-progress-percent');
const updateProgressBar = document.getElementById('update-progress-bar');
const updateFeedbackMsg = document.getElementById('update-feedback-msg');

let dadosAtualizacaoPendente = null;

async function verificarAtualizacoesGitHub(abrirModalSeNaoHouver = false) {
  const iconTarget = btnVerificarAtualizacaoFooter ? btnVerificarAtualizacaoFooter.querySelector('.spin-icon-target') : null;
  if (iconTarget) iconTarget.classList.add('spin-icon');
  if (lblStatusAtualizacao) lblStatusAtualizacao.innerText = 'Buscando atualizações...';

  try {
    const res = await fetch('/api/v1/sistema/atualizacao');
    const data = await res.json();

    if (data.sucesso && data.dados) {
      const info = data.dados;
      dadosAtualizacaoPendente = info;

      if (lblVersaoSistema && info.versaoAtual) {
        lblVersaoSistema.innerText = `v${info.versaoAtual}`;
      }

      if (info.possuiAtualizacao) {
        // Nova versão disponível no GitHub!
        if (lblStatusAtualizacao) {
          lblStatusAtualizacao.innerHTML = `<span style="color: #4ade80; font-weight: 700;">Nova Versão v${info.versaoRemota}!</span>`;
        }
        abrirModalAtualizacao(info);
      } else {
        if (lblStatusAtualizacao) {
          lblStatusAtualizacao.innerText = 'Sistema Atualizado';
        }
        if (abrirModalSeNaoHouver) {
          alert(`O seu Sistema Cupom Fiscal já está atualizado na versão mais recente (v${info.versaoAtual || '1.0.2'})!`);
        }
      }
    }
  } catch (err) {
    console.warn('Falha ao verificar atualizações no GitHub:', err);
    if (lblStatusAtualizacao) lblStatusAtualizacao.innerText = 'Verificar Atualizações';
    if (abrirModalSeNaoHouver) {
      alert('Não foi possível verificar atualizações no momento. Verifique sua conexão à internet.');
    }
  } finally {
    if (iconTarget) iconTarget.classList.remove('spin-icon');
  }
}

function abrirModalAtualizacao(info) {
  if (!modalAtualizacao) return;

  if (modalUpdateVersaoAtual) modalUpdateVersaoAtual.innerText = `v${info.versaoAtual || '1.0.2'}`;
  if (modalUpdateVersaoNova) modalUpdateVersaoNova.innerText = `v${info.versaoRemota || '1.0.3'}`;
  if (modalUpdateData && info.dataPublicacao) {
    try {
      const d = new Date(info.dataPublicacao);
      modalUpdateData.innerText = `Lançada em ${d.toLocaleDateString('pt-BR')}`;
    } catch {}
  }
  if (modalUpdateDescricao) {
    modalUpdateDescricao.innerText = info.descricao || 'Melhorias de desempenho, segurança e correções fiscais.';
  }

  if (updateProgressContainer) updateProgressContainer.classList.add('hidden');
  if (updateFeedbackMsg) updateFeedbackMsg.classList.add('hidden');
  if (btnAplicarAtualizacao) {
    btnAplicarAtualizacao.disabled = false;
    if (lblBtnAplicarAtualizacao) lblBtnAplicarAtualizacao.innerText = 'Baixar e Atualizar Agora';
  }

  modalAtualizacao.classList.remove('hidden');
}

function fecharModalAtualizacao() {
  if (modalAtualizacao) modalAtualizacao.classList.add('hidden');
}

if (btnFecharModalAtualizacao) btnFecharModalAtualizacao.addEventListener('click', fecharModalAtualizacao);
if (btnLembrarMaisTarde) btnLembrarMaisTarde.addEventListener('click', fecharModalAtualizacao);

if (btnVerificarAtualizacaoFooter) {
  btnVerificarAtualizacaoFooter.addEventListener('click', () => {
    verificarAtualizacoesGitHub(true);
  });
}

if (btnAplicarAtualizacao) {
  btnAplicarAtualizacao.addEventListener('click', async () => {
    if (!dadosAtualizacaoPendente || !dadosAtualizacaoPendente.urlDownload) {
      alert('URL de download não localizada para esta versão.');
      return;
    }

    btnAplicarAtualizacao.disabled = true;
    if (btnLembrarMaisTarde) btnLembrarMaisTarde.disabled = true;
    if (lblBtnAplicarAtualizacao) lblBtnAplicarAtualizacao.innerText = 'Atualizando Sistema...';

    if (updateProgressContainer) updateProgressContainer.classList.remove('hidden');
    if (updateProgressStatus) updateProgressStatus.innerText = 'Baixando pacote oficial do GitHub...';
    if (updateFeedbackMsg) updateFeedbackMsg.classList.add('hidden');

    try {
      const res = await fetch('/api/v1/sistema/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urlDownload: dadosAtualizacaoPendente.urlDownload,
          nomeArquivo: dadosAtualizacaoPendente.nomeArquivo,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.sucesso) {
        throw new Error(data.erro || 'Falha ao aplicar a atualização.');
      }

      if (updateProgressStatus) updateProgressStatus.innerText = '✓ Atualização concluída com sucesso!';
      if (updateFeedbackMsg) {
        updateFeedbackMsg.className = 'alert-box success';
        updateFeedbackMsg.innerHTML = '<strong>Sucesso!</strong> Sistema atualizado. <strong>Feche o sistema e abra novamente</strong> pelo atalho da Área de Trabalho para aplicar as novidades!';
        updateFeedbackMsg.classList.remove('hidden');
      }

      // Chama a rota para encerrar o servidor no backend (opcional, ou espera o usuário fechar)
      setTimeout(() => {
        fetch('/api/v1/sistema/encerrar', { method: 'POST' }).catch(() => {});
        alert("O sistema foi atualizado e será encerrado agora. Por favor, abra-o novamente pelo atalho na sua Área de Trabalho.");
        window.close(); // Tenta fechar a aba
      }, 3500);
    } catch (err) {
      if (updateFeedbackMsg) {
        updateFeedbackMsg.className = 'alert-box error';
        updateFeedbackMsg.innerText = `Erro ao atualizar: ${err.message}`;
        updateFeedbackMsg.classList.remove('hidden');
      }
      btnAplicarAtualizacao.disabled = false;
      if (btnLembrarMaisTarde) btnLembrarMaisTarde.disabled = false;
      if (lblBtnAplicarAtualizacao) lblBtnAplicarAtualizacao.innerText = 'Tentar Novamente';
    }
  });
}

// Inicialização
verificarStatusLicenca();
verificarCertificadoStatus();
carregarHistorico();
verificarAtualizacoesGitHub(false);

// Permite testar/visualizar o Pop-up de Atualização com ?testUpdate=1
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('testUpdate') === '1') {
  setTimeout(() => {
    abrirModalAtualizacao({
      possuiAtualizacao: true,
      versaoAtual: '1.0.2',
      versaoRemota: '1.0.3',
      nomeRelease: 'Versão 1.0.3 Oficial',
      dataPublicacao: new Date().toISOString(),
      descricao: '• Novo ícone oficial em alta resolução Guará Segurança e Internet no instalador e atalho da Área de Trabalho\n• Exibição da versão no rodapé do sistema com checagem automática\n• Pop-up de notificação de novas atualizações do GitHub com 1 clique\n• Otimizações na geração de DANFE PDF e consulta SEFAZ',
      urlDownload: 'https://github.com/joenanda/cupom_fiscal/releases/download/v1.0.2/update-v1.0.2.zip',
      nomeArquivo: 'update-v1.0.2.zip',
    });
  }, 600);
}

