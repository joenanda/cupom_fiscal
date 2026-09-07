import fs from 'fs';
import https from 'https';
import forge from 'node-forge';
import { AppError } from '../../core/errors/AppError';

export interface IDadosCertificadoA1 {
  razaoSocial: string;
  cnpjTitular?: string;
  cpfTitular?: string;
  emissor: string;
  validoDe: Date;
  validoAte: Date;
  diasParaExpirar: number;
  expirado: boolean;
}

export class CertificadoA1Service {
  private _pfxBuffer: Buffer;
  private _senha: string;
  private _dados?: IDadosCertificadoA1;
  private _httpsAgent?: https.Agent;

  constructor(pfxBufferOrPath: Buffer | string, senha: string) {
    if (typeof pfxBufferOrPath === 'string') {
      if (!fs.existsSync(pfxBufferOrPath)) {
        throw new AppError(`Arquivo de certificado A1 não encontrado no caminho: ${pfxBufferOrPath}`, 404);
      }
      this._pfxBuffer = fs.readFileSync(pfxBufferOrPath);
    } else {
      this._pfxBuffer = pfxBufferOrPath;
    }

    this._senha = senha;
    this.carregarEValidar();
  }

  /**
   * Valida a senha do certificado e extrai os metadados do X.509
   */
  private carregarEValidar(): void {
    try {
      const p12Der = this._pfxBuffer.toString('binary');
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, this._senha);

      // Localiza o certificado do usuário final
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag];

      if (!certBag || certBag.length === 0 || !certBag[0].cert) {
        throw new AppError('Não foi possível localizar o certificado X.509 no arquivo .pfx informado.', 422);
      }

      const cert = certBag[0].cert;
      const validoDe = cert.validity.notBefore;
      const validoAte = cert.validity.notAfter;
      const hoje = new Date();

      const msPorDia = 1000 * 60 * 60 * 24;
      const diasParaExpirar = Math.floor((validoAte.getTime() - hoje.getTime()) / msPorDia);
      const expirado = hoje > validoAte;

      if (expirado) {
        throw new AppError(`Certificado digital A1 expirado em ${validoAte.toLocaleDateString('pt-BR')}.`, 422);
      }

      // Extrai Subject e Emissor
      const subjectAttrs = cert.subject.attributes;
      const cnAttr = subjectAttrs.find(a => a.name === 'commonName' || a.type === '2.5.4.3');
      const razaoSocial = cnAttr && typeof cnAttr.value === 'string' ? cnAttr.value : 'Certificado A1';

      const issuerAttrs = cert.issuer.attributes;
      const issuerCnAttr = issuerAttrs.find(a => a.name === 'commonName' || a.type === '2.5.4.3');
      const emissor = issuerCnAttr && typeof issuerCnAttr.value === 'string' ? issuerCnAttr.value : 'Autoridade Certificadora';

      // Extrai CNPJ (padrão ICP-Brasil geralmente coloca o CNPJ no Common Name "RAZAO:CNPJ" ou em extensões OID 2.16.76.1.3.3)
      let cnpjTitular: string | undefined;
      let cpfTitular: string | undefined;

      const cnpjMatch = razaoSocial.match(/:(\d{14})$/);
      if (cnpjMatch) {
        cnpjTitular = cnpjMatch[1];
      } else {
        const cpfMatch = razaoSocial.match(/:(\d{11})$/);
        if (cpfMatch) {
          cpfTitular = cpfMatch[1];
        }
      }

      this._dados = {
        razaoSocial,
        cnpjTitular,
        cpfTitular,
        emissor,
        validoDe,
        validoAte,
        diasParaExpirar,
        expirado,
      };

      // Cria agente HTTPS pré-configurado com autenticação mútua (mTLS) para a SEFAZ
      this._httpsAgent = new https.Agent({
        pfx: this._pfxBuffer,
        passphrase: this._senha,
        rejectUnauthorized: false, // Necessário para cadeias SEFAZ com CAs intermediárias ICP-Brasil
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.2',
        ciphers: 'ALL:@SECLEVEL=1', // Garante compatibilidade com curvas criptográficas dos servidores SEFAZ
      });
    } catch (err: any) {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(`Falha ao descriptografar ou processar o Certificado A1. Verifique a senha informada. Erro: ${err.message}`, 401);
    }
  }

  public get dados(): IDadosCertificadoA1 {
    if (!this._dados) {
      throw new AppError('Certificado não inicializado corretamente.');
    }
    return this._dados;
  }

  public get httpsAgent(): https.Agent {
    if (!this._httpsAgent) {
      throw new AppError('Agente HTTPS com mTLS não inicializado.');
    }
    return this._httpsAgent;
  }

  public get pfxBuffer(): Buffer {
    return this._pfxBuffer;
  }

  public get senha(): string {
    return this._senha;
  }
}
