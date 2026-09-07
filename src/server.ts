import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import cupomFiscalRoutes from './routes/cupomFiscal.routes';
import { AppError } from './core/errors/AppError';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Localiza a pasta public de forma segura (em dev, dist ou empacotado como .exe)
const publicDir = fs.existsSync(path.resolve(__dirname, '../public'))
  ? path.resolve(__dirname, '../public')
  : path.resolve(process.cwd(), 'public');

app.use(express.static(publicDir));

// Rotas da API
app.use('/api/v1', cupomFiscalRoutes);

// Health Check
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    provedorAtivo: process.env.INTEGRATION_PROVIDER || 'MOCK',
    ambienteSefaz: process.env.SEFAZ_TP_AMB === '1' ? 'Produção' : 'Homologação',
  });
});

// Middleware Global de Tratamento de Erros
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      sucesso: false,
      erro: err.message,
      detalhes: err.detalhes,
    });
    return;
  }

  console.error('[Erro não tratado]:', err);
  res.status(500).json({
    sucesso: false,
    erro: 'Ocorreu um erro interno no servidor ao processar a requisição fiscal.',
    detalhe: err.message,
  });
});

// Inicia servidor
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n================================================================`);
  console.log(`🚀 SISTEMA DE DOWNLOAD DE CUPOM FISCAL (NFC-e MODELO 65)`);
  console.log(`📡 Aplicação em Execução: ${url}`);
  console.log(`📋 Health Check:         ${url}/api/v1/health`);
  console.log(`🏢 Provedor Ativo:       ${process.env.INTEGRATION_PROVIDER || 'MOCK'}`);
  console.log(`================================================================\n`);

  // Abre automaticamente o navegador padrão do Windows para conveniência do cliente
  if (process.env.AUTO_OPEN_BROWSER !== 'false' && process.env.NODE_ENV !== 'test') {
    const startCmd = process.platform === 'win32' ? `start ${url}` : `open ${url}`;
    exec(startCmd, (err) => {
      if (err) console.log(`Para acessar a interface, abra no navegador: ${url}`);
    });
  }
});

export default app;
