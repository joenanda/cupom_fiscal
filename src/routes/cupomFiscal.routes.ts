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

// Rotas de Cupons Fiscais (NFC-e Modelo 65)
router.post('/nfce/validar', controller.validarChave);
router.post('/nfce/consultar', controller.consultarEBaixar);
router.get('/nfce/historico', controller.listarHistorico);
router.get('/nfce/:chave/xml', controller.baixarXml);
router.get('/nfce/:chave/danfe', controller.baixarDanfePdf);

// Rotas de Gestão do Certificado Digital (Windows Store e Arquivo PFX)
router.get('/certificados/windows', controller.listarCertificadosWindows);
router.post('/certificados/selecionar-windows', controller.selecionarCertificadoWindows);
router.post('/certificados/upload', upload.single('certificado'), controller.uploadCertificado);
router.get('/certificados/status', controller.statusCertificado);

// Rotas de Atualização Automática (GitHub Releases)
router.get('/sistema/atualizacao', controller.verificarAtualizacao);
router.post('/sistema/atualizar', controller.aplicarAtualizacao);

export default router;
