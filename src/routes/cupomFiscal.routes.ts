import { Router } from 'express';
import multer from 'multer';
import { CupomFiscalController } from '../controllers/cupomFiscal.controller';

const router = Router();
const controller = new CupomFiscalController();

// Configuração do Multer para armazenamento de certificado em memória temporária para validação
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB
  },
  fileFilter: (_req, file, cb) => {
    const isPfx = file.originalname.toLowerCase().endsWith('.pfx') ||
                  file.originalname.toLowerCase().endsWith('.p12');
    if (!isPfx) {
      return cb(new Error('Apenas arquivos de certificado .pfx ou .p12 são aceitos.'));
    }
    cb(null, true);
  },
});

import { LicenseService } from '../services/license/license.service';
import { AppError } from '../core/errors/AppError';

// Middleware de verificação de Licença e Trava de Máquina (Hardware Lock)
const exigirLicencaAtiva = (_req: any, _res: any, next: any) => {
  const status = LicenseService.verificarStatusLicenca();
  if (!status.ativado) {
    throw new AppError(status.mensagem || 'Sistema fiscal bloqueado. É necessária a ativação da licença pela Guará Segurança e Internet.', 403);
  }
  next();
};

// Rotas de Cupons Fiscais (NFC-e Modelo 65 - Protegidas por Licença)
router.post('/nfce/validar', controller.validarChave);
router.post('/nfce/consultar', exigirLicencaAtiva, controller.consultarEBaixar);
router.get('/nfce/historico', controller.listarHistorico);
router.get('/nfce/:chave/xml', exigirLicencaAtiva, controller.baixarXml);
router.get('/nfce/:chave/danfe', exigirLicencaAtiva, controller.baixarDanfePdf);

// Rotas de Gestão do Certificado Digital (Windows Store e Arquivo PFX)
router.get('/certificados/windows', controller.listarCertificadosWindows);
router.post('/certificados/selecionar-windows', controller.selecionarCertificadoWindows);
router.post('/certificados/upload', upload.single('certificado'), controller.uploadCertificado);
router.get('/certificados/status', controller.statusCertificado);

// Rotas de Licença e Ativação do Sistema (Guará Segurança e Internet)
router.get('/licenca/status', controller.statusLicenca);
router.post('/licenca/ativar', controller.ativarLicenca);

// Rotas de Atualização Automática (GitHub Releases)
router.get('/sistema/atualizacao', controller.verificarAtualizacao);
router.post('/sistema/atualizar', controller.aplicarAtualizacao);

// Rota de Encerramento Completo da Aplicação
router.post('/sistema/encerrar', controller.encerrarSistema);

export default router;
