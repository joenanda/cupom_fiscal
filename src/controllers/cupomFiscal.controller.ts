import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ChaveAcessoNFCe } from '../domain/models/ChaveAcesso';
import { validarChaveAcessoNFCe } from '../core/validators/chaveAcesso.validator';
import { FiscalAdapterFactory } from '../services/adapters/FiscalAdapterFactory';
import { DanfeNfceService } from '../services/pdf/danfeNfce.service';
import { DocumentStorageService } from '../services/storage/documentStorage.service';
import { CertificadoA1Service } from '../services/certificates/certificadoA1.service';
import { AppError } from '../core/errors/AppError';

export class CupomFiscalController {
  private _storageService: DocumentStorageService;
  private _danfeService: DanfeNfceService;
  private static _certificadoAtivo?: CertificadoA1Service;
  private static _certificadoWindowsAtivo?: any;

  constructor() {
    this._storageService = new DocumentStorageService();
    this._danfeService = new DanfeNfceService();

    // Inicializa certificado padrão do .env se configurado
    if (process.env.CERTIFICATE_PATH && process.env.CERTIFICATE_PASSWORD) {
      try {
        CupomFiscalController._certificadoAtivo = new CertificadoA1Service(
          process.env.CERTIFICATE_PATH,
          process.env.CERTIFICATE_PASSWORD
        );
      } catch (err: any) {
        console.warn(`[Aviso] Não foi possível carregar o certificado configurado no .env: ${err.message}`);
      }
    }
  }

  /**
   * GET /api/v1/certificados/windows
   * Lista certificados instalados no repositório do Windows do cliente
   */
  public listarCertificadosWindows = async (_req: Request, res: Response): Promise<void> => {
    const { WindowsCertStoreService } = await import('../services/certificates/windowsCertStore.service');
    const certs = await WindowsCertStoreService.listarCertificados();
    res.json({
      sucesso: true,
      dados: certs,
      ativo: CupomFiscalController._certificadoWindowsAtivo?.thumbprint || null,
    });
  };

  /**
   * POST /api/v1/certificados/selecionar-windows
   * Define um certificado do Windows como ativo
   */
  public selecionarCertificadoWindows = async (req: Request, res: Response): Promise<void> => {
    const { thumbprint } = req.body;
    if (!thumbprint) {
      throw new AppError('Thumbprint do certificado não informado.', 400);
    }

    const { WindowsCertStoreService } = await import('../services/certificates/windowsCertStore.service');
    const certs = await WindowsCertStoreService.listarCertificados();
    const cert = certs.find((c) => c.thumbprint.toLowerCase() === thumbprint.toLowerCase());

    if (!cert) {
      throw new AppError('Certificado não localizado no repositório do Windows.', 404);
    }

    CupomFiscalController._certificadoWindowsAtivo = cert;
    // Reseta certificado de arquivo se houver
    CupomFiscalController._certificadoAtivo = undefined;

    res.json({
      sucesso: true,
      mensagem: `Certificado "${cert.razaoSocial}" selecionado com sucesso!`,
      dados: cert,
    });
  };

  /**
   * POST /api/v1/nfce/validar
   * Valida e decompõe a chave de 44 dígitos sem custos de requisição externa
   */
  public validarChave = async (req: Request, res: Response): Promise<void> => {
    const { chave } = req.body;
    const resultado = validarChaveAcessoNFCe(chave);

    if (!resultado.valida) {
      res.status(400).json({
        sucesso: false,
        erro: resultado.erro,
      });
      return;
    }

    res.json({
      sucesso: true,
      dados: resultado.dados,
    });
  };

  /**
   * POST /api/v1/nfce/consultar
   * Realiza a consulta, baixa o XML, gera o DANFE em PDF e armazena os arquivos
   */
  public consultarEBaixar = async (req: Request, res: Response): Promise<void> => {
    const { chave, provedor } = req.body;

    // 1. Valida a chave de acesso
    const chaveObj = ChaveAcessoNFCe.criar(chave);

    // 2. Cria o adapter fiscal apropriado
    let provedorFinal = provedor || (process.env.INTEGRATION_PROVIDER as any) || 'MOCK';
    if ((provedorFinal === 'SEFAZ' || provedorFinal === 'WINDOWS_CERT') && CupomFiscalController._certificadoWindowsAtivo) {
      provedorFinal = 'WINDOWS_CERT';
    }

    const adapter = FiscalAdapterFactory.criar({
      provedor: provedorFinal,
      windowsThumbprint: CupomFiscalController._certificadoWindowsAtivo?.thumbprint,
      caminhoCertificado: process.env.CERTIFICATE_PATH,
      senhaCertificado: process.env.CERTIFICATE_PASSWORD,
    });

    // 3. Executa a consulta
    const resultado = await adapter.consultarEBaixarNFCe(chaveObj);

    let possuiXml = false;
    let possuiPdf = false;

    // 4. Salva o XML se obtido
    if (resultado.xmlConteudo) {
      this._storageService.salvarXml(chaveObj.valor, resultado.xmlConteudo);
      possuiXml = true;

      // 5. Gera e salva o DANFE em PDF (Bobina 80mm)
      try {
        const pdfBuffer = await this._danfeService.gerarDanfePdf(resultado.xmlConteudo, chaveObj.valor);
        this._storageService.salvarPdf(chaveObj.valor, pdfBuffer);
        possuiPdf = true;
      } catch (pdfErr: any) {
        console.error(`Erro na geração do PDF para chave ${chaveObj.valor}:`, pdfErr);
      }
    }

    // 6. Registra metadados no histórico
    this._storageService.registrarMetadados({
      chaveAcesso: chaveObj.valor,
      cnpjEmitente: resultado.cnpjEmitente,
      razaoSocialEmitente: resultado.razaoSocialEmitente,
      valorTotal: resultado.valorTotal,
      dataAutorizacao: resultado.dataAutorizacao,
      numeroProtocolo: resultado.numeroProtocolo,
      dataConsulta: new Date().toISOString(),
      cStat: resultado.cStat,
      statusDescricao: resultado.statusDescricao,
      possuiXml,
      possuiPdf,
    });

    res.json({
      sucesso: resultado.sucesso,
      resultado: {
        ...resultado,
        links: {
          xml: possuiXml ? `/api/v1/nfce/${chaveObj.valor}/xml` : null,
          danfe: possuiPdf ? `/api/v1/nfce/${chaveObj.valor}/danfe` : null,
        },
      },
    });
  };

  /**
   * GET /api/v1/nfce/:chave/xml
   * Download do arquivo XML
   */
  public baixarXml = async (req: Request, res: Response): Promise<void> => {
    const chave = Array.isArray(req.params.chave) ? req.params.chave[0] : String(req.params.chave);
    const caminho = this._storageService.obterCaminhoXml(chave);

    if (!caminho) {
      throw new AppError(`XML não localizado para a chave: ${chave}`, 404);
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="NFCe-${chave}.xml"`);
    fs.createReadStream(caminho).pipe(res);
  };

  /**
   * GET /api/v1/nfce/:chave/danfe
   * Visualização / Download do DANFE em PDF
   */
  public baixarDanfePdf = async (req: Request, res: Response): Promise<void> => {
    const chave = Array.isArray(req.params.chave) ? req.params.chave[0] : String(req.params.chave);
    const download = req.query.download === 'true';
    let caminho = this._storageService.obterCaminhoPdf(chave);

    // Se o PDF não existir mas tivermos o XML, gera sob demanda
    if (!caminho) {
      const caminhoXml = this._storageService.obterCaminhoXml(chave);
      if (caminhoXml) {
        const xml = fs.readFileSync(caminhoXml, 'utf-8');
        const pdfBuffer = await this._danfeService.gerarDanfePdf(xml, chave);
        caminho = this._storageService.salvarPdf(chave, pdfBuffer);
      } else {
        throw new AppError(`DANFE não disponível para a chave: ${chave}`, 404);
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="DANFE-NFCe-${chave}.pdf"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="DANFE-NFCe-${chave}.pdf"`);
    }

    fs.createReadStream(caminho).pipe(res);
  };

  /**
   * GET /api/v1/nfce/historico
   * Lista as últimas notas consultadas
   */
  public listarHistorico = async (_req: Request, res: Response): Promise<void> => {
    const lista = this._storageService.listarHistorico();
    res.json({ sucesso: true, dados: lista });
  };

  /**
   * POST /api/v1/certificados/upload
   * Upload e validação de Certificado Digital A1 (.pfx)
   */
  public uploadCertificado = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    const senha = req.body.senha;

    if (!file) {
      throw new AppError('Nenhum arquivo de certificado (.pfx) foi enviado.', 400);
    }
    if (!senha) {
      throw new AppError('A senha do certificado digital é obrigatória.', 400);
    }

    // Valida criptograficamente o certificado
    const certService = new CertificadoA1Service(file.buffer, senha);
    CupomFiscalController._certificadoAtivo = certService;
    CupomFiscalController._certificadoWindowsAtivo = undefined;

    // Salva o arquivo de forma segura na pasta de storage
    const certDir = path.resolve(process.cwd(), 'storage/certificates');
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }
    const certPath = path.join(certDir, 'certificado_ativo.pfx');
    fs.writeFileSync(certPath, file.buffer);

    res.json({
      sucesso: true,
      mensagem: 'Certificado A1 (.pfx) carregado e validado com sucesso!',
      origem: 'ARQUIVO_PFX',
      dados: certService.dados,
    });
  };

  /**
   * GET /api/v1/certificados/status
   * Informações do certificado digital atualmente configurado
   */
  public statusCertificado = async (_req: Request, res: Response): Promise<void> => {
    if (CupomFiscalController._certificadoWindowsAtivo) {
      res.json({
        configurado: true,
        origem: 'WINDOWS_STORE',
        dados: CupomFiscalController._certificadoWindowsAtivo,
      });
      return;
    }

    if (CupomFiscalController._certificadoAtivo) {
      res.json({
        configurado: true,
        origem: 'ARQUIVO_PFX',
        dados: CupomFiscalController._certificadoAtivo.dados,
      });
      return;
    }

    res.json({
      configurado: false,
      mensagem: 'Nenhum certificado ativo no momento. Você pode selecionar um do Windows ou enviar arquivo .pfx.',
    });
  };

  /**
   * GET /api/v1/sistema/atualizacao
   * Consulta o repositório GitHub para verificar novas versões
   */
  public verificarAtualizacao = async (_req: Request, res: Response): Promise<void> => {
    const { AutoUpdateService } = await import('../services/updater/autoUpdate.service');
    const info = await AutoUpdateService.verificarAtualizacoes();
    res.json({ sucesso: true, dados: info });
  };

  /**
   * POST /api/v1/sistema/atualizar
   * Baixa e aplica a atualização automaticamente a partir da release do GitHub
   */
  public aplicarAtualizacao = async (req: Request, res: Response): Promise<void> => {
    const { urlDownload, nomeArquivo } = req.body;
    const { AutoUpdateService } = await import('../services/updater/autoUpdate.service');
    await AutoUpdateService.baixarEAplicarAtualizacao(urlDownload, nomeArquivo);
    res.json({
      sucesso: true,
      mensagem: 'Atualização aplicada com sucesso! Reinicie o sistema se necessário para carregar as alterações.',
    });
  };

  /**
   * POST /api/v1/sistema/encerrar
   * Finaliza o servidor e fecha a aplicação por completo
   */
  public encerrarSistema = async (_req: Request, res: Response): Promise<void> => {
    res.json({
      sucesso: true,
      mensagem: 'Sistema e processos finalizados com sucesso.',
    });

    setTimeout(() => {
      console.log('>>> [SHUTDOWN] Encerrando processo do servidor fiscal e aplicação...');
      try {
        const { exec } = require('child_process');
        exec('taskkill /IM SistemaCupomFiscal.exe /F', () => {
          process.exit(0);
        });
      } catch {
        process.exit(0);
      }
    }, 500);
  };

  /**
   * GET /api/v1/licenca/status
   * Consulta status de ativação e Machine ID desta máquina
   */
  public statusLicenca = async (_req: Request, res: Response): Promise<void> => {
    const { LicenseService } = await import('../services/license/license.service');
    const status = LicenseService.verificarStatusLicenca();
    res.json({ sucesso: true, dados: status });
  };

  /**
   * POST /api/v1/licenca/ativar
   * Ativa a máquina com a chave fornecida pela Guará
   */
  public ativarLicenca = async (req: Request, res: Response): Promise<void> => {
    const { chave } = req.body;
    const { LicenseService } = await import('../services/license/license.service');
    const status = LicenseService.ativarComChave(chave);
    res.json({ sucesso: true, dados: status });
  };
}
