import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { AppError } from '../../core/errors/AppError';

const execAsync = promisify(exec);

export interface ICertificadoWindowsInfo {
  thumbprint: string;
  subject: string;
  razaoSocial: string;
  cnpj: string;
  cpf: string;
  emissor: string;
  validoDe: string;
  validoAte: string;
  diasRestantes: number;
  expirado: boolean;
  store: string;
}

export class WindowsCertStoreService {
  private static getScriptPath(nomeScript: string): string {
    const caminhos = [
      path.resolve(process.cwd(), `scripts/${nomeScript}`),
      path.resolve(__dirname, `../../../scripts/${nomeScript}`),
      path.resolve(__dirname, `../../scripts/${nomeScript}`),
      path.resolve(__dirname, `scripts/${nomeScript}`),
    ];

    for (const c of caminhos) {
      if (fs.existsSync(c)) return c;
    }
    return caminhos[0];
  }

  /**
   * Lista todos os certificados ICP-Brasil válidos instalados no repositório do Windows (Cert:\CurrentUser\My)
   */
  public static async listarCertificados(): Promise<ICertificadoWindowsInfo[]> {
    const scriptPath = this.getScriptPath('list-windows-certs.ps1');
    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;

    try {
      const { stdout } = await execAsync(cmd, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 15000,
      });

      if (!stdout || stdout.trim() === '') {
        return [];
      }

      // Remove eventuais caracteres de escape antes do JSON
      const jsonStr = stdout.trim();
      const startIndex = jsonStr.indexOf('[');
      const cleanJson = startIndex >= 0 ? jsonStr.substring(startIndex) : jsonStr;

      const parsed = JSON.parse(cleanJson);
      const lista = Array.isArray(parsed) ? parsed : [parsed];

      return lista.map((c: any) => ({
        thumbprint: c.Thumbprint,
        subject: c.Subject,
        razaoSocial: c.RazaoSocial || c.Subject,
        cnpj: c.CNPJ || '',
        cpf: c.CPF || '',
        emissor: c.Emissor,
        validoDe: c.ValidoDe,
        validoAte: c.ValidoAte,
        diasRestantes: Number(c.DiasRestantes),
        expirado: Boolean(c.Expirado),
        store: c.Store,
      }));
    } catch (err: any) {
      console.error('Erro ao listar certificados do Windows:', err);
      throw new AppError(`Falha ao ler repositório de certificados do Windows: ${err.message}`, 500);
    }
  }

  /**
   * Executa uma requisição SOAP mTLS para a SEFAZ usando um certificado do repositório do Windows
   */
  public static async executarRequisicaoSefaz(
    thumbprint: string,
    url: string,
    soapAction: string,
    xmlEnvelope: string
  ): Promise<string> {
    const scriptPath = this.getScriptPath('invoke-sefaz-windows-cert.ps1');

    try {
      const { stdout } = await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -Thumbprint "${thumbprint}" -Url "${url}" -SoapAction "${soapAction}" -XmlEnvelope "${xmlEnvelope.replace(/"/g, '`"')}"`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 35000,
      });

      const res = JSON.parse(stdout.trim());

      if (!res.Sucesso) {
        throw new AppError(res.Erro || `Erro HTTP ${res.StatusCode} retornado pela SEFAZ via certificado Windows.`, 502);
      }

      return res.XmlResposta;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Erro na comunicação mTLS com a SEFAZ via repositório Windows: ${err.message}`, 500);
    }
  }
}
