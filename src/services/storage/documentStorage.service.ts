import fs from 'fs';
import path from 'path';

export interface IDocumentoMetadados {
  chaveAcesso: string;
  cnpjEmitente: string;
  razaoSocialEmitente?: string;
  valorTotal?: number;
  dataAutorizacao?: string;
  numeroProtocolo?: string;
  dataConsulta: string;
  cStat: number;
  statusDescricao: string;
  possuiXml: boolean;
  possuiPdf: boolean;
}

export class DocumentStorageService {
  private _baseDir: string;
  private _metadataFile: string;

  constructor(customDir?: string) {
    this._baseDir = customDir || path.resolve(process.cwd(), 'storage/documents');
    if (!fs.existsSync(this._baseDir)) {
      fs.mkdirSync(this._baseDir, { recursive: true });
    }
    this._metadataFile = path.join(this._baseDir, 'metadata.json');
  }

  public salvarXml(chave: string, xmlConteudo: string): string {
    const filePath = path.join(this._baseDir, `${chave}.xml`);
    fs.writeFileSync(filePath, xmlConteudo, 'utf-8');
    return filePath;
  }

  public salvarPdf(chave: string, pdfBuffer: Buffer): string {
    const filePath = path.join(this._baseDir, `DANFE-${chave}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);
    return filePath;
  }

  public obterCaminhoXml(chave: string): string | null {
    const filePath = path.join(this._baseDir, `${chave}.xml`);
    return fs.existsSync(filePath) ? filePath : null;
  }

  public obterCaminhoPdf(chave: string): string | null {
    const filePath = path.join(this._baseDir, `DANFE-${chave}.pdf`);
    return fs.existsSync(filePath) ? filePath : null;
  }

  public registrarMetadados(doc: IDocumentoMetadados): void {
    const historico = this.listarHistorico();
    const index = historico.findIndex((h) => h.chaveAcesso === doc.chaveAcesso);

    if (index >= 0) {
      historico[index] = doc;
    } else {
      historico.unshift(doc);
    }

    // Mantém no máximo os 50 registros mais recentes
    const limite = historico.slice(0, 50);
    fs.writeFileSync(this._metadataFile, JSON.stringify(limite, null, 2), 'utf-8');
  }

  public listarHistorico(): IDocumentoMetadados[] {
    if (!fs.existsSync(this._metadataFile)) {
      return [];
    }
    try {
      const data = fs.readFileSync(this._metadataFile, 'utf-8');
      return JSON.parse(data) as IDocumentoMetadados[];
    } catch {
      return [];
    }
  }
}
