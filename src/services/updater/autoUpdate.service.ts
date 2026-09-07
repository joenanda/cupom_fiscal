import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import packageJson from '../../../package.json';
import { AppError } from '../../core/errors/AppError';

const execAsync = promisify(exec);

export interface IUpdateInfo {
  possuiAtualizacao: boolean;
  versaoAtual: string;
  versaoRemota?: string;
  nomeRelease?: string;
  descricao?: string;
  dataPublicacao?: string;
  urlDownload?: string;
  nomeArquivo?: string;
  tamanhoBytes?: number;
}

export class AutoUpdateService {
  private static REPO_OWNER = 'joenanda';
  private static REPO_NAME = 'cupom_fiscal';

  /**
   * Verifica no GitHub se existe uma versão mais recente publicada
   */
  public static async verificarAtualizacoes(): Promise<IUpdateInfo> {
    const versaoAtual = packageJson.version || '1.0.0';
    const urlApi = `https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/releases/latest`;

    try {
      const response = await axios.get(urlApi, {
        headers: {
          'User-Agent': 'SistemaCupomFiscal-Updater/1.0',
          'Accept': 'application/vnd.github.v3+json',
        },
        timeout: 10000,
      });

      const release = response.data;
      const tagRemota = (release.tag_name || '').replace(/^v/i, '');
      const possuiAtualizacao = this.compararVersoes(tagRemota, versaoAtual) > 0;

      // Localiza o asset de zip ou exe nos downloads da release
      let urlDownload = release.zipball_url;
      let nomeArquivo = `update-v${tagRemota}.zip`;
      let tamanhoBytes = 0;

      if (release.assets && release.assets.length > 0) {
        // Dá preferência ao pacote zip de atualização ou ao Instalador.exe
        const zipAsset = release.assets.find((a: any) => a.name.toLowerCase().endsWith('.zip'));
        const exeAsset = release.assets.find((a: any) => a.name.toLowerCase().endsWith('.exe'));
        const assetEscolhido = zipAsset || exeAsset || release.assets[0];

        urlDownload = assetEscolhido.browser_download_url;
        nomeArquivo = assetEscolhido.name;
        tamanhoBytes = assetEscolhido.size;
      }

      return {
        possuiAtualizacao,
        versaoAtual,
        versaoRemota: tagRemota,
        nomeRelease: release.name || `Versão ${tagRemota}`,
        descricao: release.body || 'Correções e melhorias do sistema fiscal.',
        dataPublicacao: release.published_at,
        urlDownload,
        nomeArquivo,
        tamanhoBytes,
      };
    } catch (err: any) {
      // Se o repositório ainda não tiver nenhuma release publicada no GitHub
      if (err.response?.status === 404) {
        return {
          possuiAtualizacao: false,
          versaoAtual,
          descricao: 'Repositório GitHub ainda não possui releases publicadas.',
        };
      }
      console.warn('Falha ao verificar atualizações no GitHub:', err.message);
      return {
        possuiAtualizacao: false,
        versaoAtual,
        descricao: `Não foi possível conectar ao GitHub: ${err.message}`,
      };
    }
  }

  /**
   * Baixa a atualização do GitHub e instala automaticamente
   */
  public static async baixarEAplicarAtualizacao(urlDownload: string, nomeArquivo: string): Promise<void> {
    if (!urlDownload) {
      throw new AppError('URL de download da atualização não informada.', 400);
    }

    const tempDir = path.resolve(process.cwd(), 'storage/temp_update');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const destinoArquivo = path.join(tempDir, nomeArquivo);

    // 1. Download do arquivo da release do GitHub
    const writer = fs.createWriteStream(destinoArquivo);
    const response = await axios({
      url: urlDownload,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'User-Agent': 'SistemaCupomFiscal-Updater/1.0',
      },
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 2. Se for um arquivo ZIP, descompacta sobre os arquivos da aplicação
    if (nomeArquivo.toLowerCase().endsWith('.zip')) {
      const appRoot = process.cwd();
      // Usa Expand-Archive do PowerShell nativo do Windows
      const cmdDescompactar = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '${destinoArquivo}' -DestinationPath '${appRoot}' -Force"`;
      await execAsync(cmdDescompactar);
    } else if (nomeArquivo.toLowerCase().endsWith('.exe')) {
      // Se for um novo instalador, executa silenciosamente
      exec(`"${destinoArquivo}"`);
    }

    // 3. Limpeza temporária
    try {
      fs.unlinkSync(destinoArquivo);
    } catch {}
  }

  /**
   * Compara versões no padrão SemVer (ex: '1.0.1' vs '1.0.0')
   * Retorna > 0 se v1 > v2, < 0 se v1 < v2, 0 se iguais
   */
  private static compararVersoes(v1: string, v2: string): number {
    const partes1 = v1.split('.').map(Number);
    const partes2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(partes1.length, partes2.length); i++) {
      const num1 = partes1[i] || 0;
      const num2 = partes2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }
}
