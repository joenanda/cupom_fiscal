import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { AppError } from '../../core/errors/AppError';

export interface ILicenseData {
  machineId: string;
  tipo: 'DEMO_30D' | 'ANUAL_365D' | 'VITALICIA';
  dataEmissao: string;
  dataExpiracao: string | null;
  assinatura: string;
}

export interface ILicenseStatus {
  ativado: boolean;
  machineId: string;
  tipo?: string;
  diasRestantes?: number | null;
  dataExpiracao?: string | null;
  mensagem: string;
}

export class LicenseService {
  // Chave mestra exclusiva da Guará Segurança e Internet para assinatura HMAC-SHA256
  private static readonly MASTER_SECRET = 'GuaraSegurancaInternetFiscalNFCe2026SecretKey@Protect!';
  private static readonly LICENSE_FILE_PATH = path.resolve(process.cwd(), 'storage', 'licenca.key');

  private static cachedMachineId: string | null = null;

  /**
   * Obtém o identificador único de hardware do computador do cliente (Motherboard / CPU / OS UUID)
   * Formato amigável: GUARA-XXXX-XXXX-XXXX
   */
  public static obterMachineId(): string {
    if (this.cachedMachineId) return this.cachedMachineId;

    try {
      let rawId = '';

      if (process.platform === 'win32') {
        try {
          // Consulta UUID da placa-mãe via PowerShell
          const cmd = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID"';
          rawId = execSync(cmd, { encoding: 'utf-8', timeout: 4000 }).trim();
        } catch {
          // Fallback via comando wmic / bios
          try {
            const cmdWmic = 'wmic csproduct get uuid';
            const out = execSync(cmdWmic, { encoding: 'utf-8', timeout: 3000 });
            rawId = out.replace('UUID', '').trim();
          } catch {}
        }
      }

      // Se falhar ou estiver em outro OS, usa identificador de rede / hostname
      if (!rawId || rawId.length < 5 || rawId === 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF') {
        const os = require('os');
        rawId = `${os.hostname()}-${os.platform()}-${os.arch()}`;
      }

      // Gera hash SHA-256 e formata em blocos GUARA-XXXX-XXXX-XXXX
      const hash = crypto.createHash('sha256').update(rawId + '_GUARA_HW').digest('hex').toUpperCase();
      this.cachedMachineId = `GUARA-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`;
      return this.cachedMachineId;
    } catch {
      this.cachedMachineId = 'GUARA-DEFAULT-0001-9999';
      return this.cachedMachineId;
    }
  }

  /**
   * Verifica se o sistema possui uma licença válida e ativa para esta máquina
   */
  public static verificarStatusLicenca(): ILicenseStatus {
    const machineId = this.obterMachineId();

    if (!fs.existsSync(this.LICENSE_FILE_PATH)) {
      return {
        ativado: false,
        machineId,
        mensagem: 'Sistema não ativado. Ative sua licença da Guará Segurança e Internet para liberar todas as funções.',
      };
    }

    try {
      const content = fs.readFileSync(this.LICENSE_FILE_PATH, 'utf-8').trim();
      const payload: ILicenseData = JSON.parse(Buffer.from(content, 'base64').toString('utf-8'));

      // 1. Valida se a licença pertence a este computador (Hardware Lock)
      if (payload.machineId !== machineId) {
        return {
          ativado: false,
          machineId,
          mensagem: 'Licença inválida para este computador. Foi detectada uma tentativa de cópia de outra máquina.',
        };
      }

      // 2. Valida a assinatura digital com a chave mestra
      const assinaturaEsperada = this.calcularAssinatura(payload.machineId, payload.tipo, payload.dataExpiracao);
      if (payload.assinatura !== assinaturaEsperada) {
        return {
          ativado: false,
          machineId,
          mensagem: 'Chave de licença corrompida ou adulterada.',
        };
      }

      // 3. Valida se a data de expiração foi atingida
      if (payload.dataExpiracao) {
        const expiraEm = new Date(payload.dataExpiracao);
        const agora = new Date();
        const diferencaMs = expiraEm.getTime() - agora.getTime();
        const diasRestantes = Math.ceil(diferencaMs / (1000 * 60 * 60 * 24));

        if (diasRestantes <= 0) {
          return {
            ativado: false,
            machineId,
            tipo: payload.tipo,
            dataExpiracao: payload.dataExpiracao,
            diasRestantes: 0,
            mensagem: 'Sua licença expirou. Entre em contato com a Guará Segurança e Internet para renovação.',
          };
        }

        return {
          ativado: true,
          machineId,
          tipo: payload.tipo === 'DEMO_30D' ? 'Demonstração (30 dias)' : 'Assinatura Anual',
          dataExpiracao: payload.dataExpiracao,
          diasRestantes,
          mensagem: `Licença ativa. Restam ${diasRestantes} dia(s) de uso.`,
        };
      }

      // Licença Vitalícia
      return {
        ativado: true,
        machineId,
        tipo: 'Vitalícia / Permanente',
        diasRestantes: null,
        dataExpiracao: null,
        mensagem: 'Licença Vitalícia Oficial Ativa • Guará Segurança e Internet.',
      };
    } catch {
      return {
        ativado: false,
        machineId,
        mensagem: 'Falha ao ler licença existente. Por favor, ative novamente.',
      };
    }
  }

  /**
   * Ativa o sistema a partir de uma chave fornecida pelo usuário
   */
  public static ativarComChave(chave: string): ILicenseStatus {
    if (!chave || typeof chave !== 'string') {
      throw new AppError('Informe uma chave de ativação válida.', 400);
    }

    const chaveLimpa = chave.trim();
    const machineIdAtual = this.obterMachineId();

    try {
      // Formato da chave: GUARA-ACT-<base64Payload>
      let rawBase64 = chaveLimpa;
      if (rawBase64.startsWith('GUARA-ACT-')) {
        rawBase64 = rawBase64.replace('GUARA-ACT-', '');
      }

      const jsonStr = Buffer.from(rawBase64, 'base64').toString('utf-8');
      const payload: ILicenseData = JSON.parse(jsonStr);

      if (!payload.machineId || !payload.tipo || !payload.assinatura) {
        throw new Error('Formato da chave inválido.');
      }

      // Trava de máquina:
      if (payload.machineId !== machineIdAtual) {
        throw new AppError(`Esta chave foi gerada para outro computador (ID: ${payload.machineId}). O ID deste PC é ${machineIdAtual}.`, 403);
      }

      // Validação da assinatura:
      const assinaturaEsperada = this.calcularAssinatura(payload.machineId, payload.tipo, payload.dataExpiracao);
      if (payload.assinatura !== assinaturaEsperada) {
        throw new AppError('Chave de ativação inválida ou não autorizada pela Guará.', 403);
      }

      // Verifica se já expirou
      if (payload.dataExpiracao && new Date(payload.dataExpiracao).getTime() < Date.now()) {
        throw new AppError('Esta chave de ativação já está expirada.', 400);
      }

      // Salva no disco
      const dir = path.dirname(this.LICENSE_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(this.LICENSE_FILE_PATH, rawBase64, 'utf-8');

      return this.verificarStatusLicenca();
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Falha ao ativar o sistema: chave inválida ou formato incorreto.`, 400);
    }
  }

  /**
   * Gera uma chave de licença (utilizado exclusivamente pela ferramenta do administrador da Guará)
   */
  public static gerarChave(machineId: string, tipo: 'DEMO_30D' | 'ANUAL_365D' | 'VITALICIA'): string {
    let dataExpiracao: string | null = null;
    const agora = new Date();

    if (tipo === 'DEMO_30D') {
      const exp = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);
      dataExpiracao = exp.toISOString().split('T')[0];
    } else if (tipo === 'ANUAL_365D') {
      const exp = new Date(agora.getTime() + 365 * 24 * 60 * 60 * 1000);
      dataExpiracao = exp.toISOString().split('T')[0];
    }

    const assinatura = this.calcularAssinatura(machineId, tipo, dataExpiracao);

    const payload: ILicenseData = {
      machineId,
      tipo,
      dataEmissao: agora.toISOString().split('T')[0],
      dataExpiracao,
      assinatura,
    };

    const base64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `GUARA-ACT-${base64}`;
  }

  private static calcularAssinatura(machineId: string, tipo: string, dataExpiracao: string | null): string {
    const dados = `${machineId}|${tipo}|${dataExpiracao || 'LIFETIME'}`;
    return crypto.createHmac('sha256', this.MASTER_SECRET).update(dados).digest('hex');
  }
}
