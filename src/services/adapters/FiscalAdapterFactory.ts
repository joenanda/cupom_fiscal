import { IFiscalAdapter } from './IFiscalAdapter';
import { SefazSoapAdapter } from './SefazSoapAdapter';
import { SefazWindowsCertAdapter } from './SefazWindowsCertAdapter';
import { FocusNfeAdapter } from './FocusNfeAdapter';
import { MockFiscalAdapter } from './MockFiscalAdapter';
import { CertificadoA1Service } from '../certificates/certificadoA1.service';
import { AmbienteSefaz } from '../sefaz/webservices';

export interface IFiscalAdapterConfig {
  provedor?: 'SEFAZ' | 'WINDOWS_CERT' | 'FOCUS_NFE' | 'MOCK';
  ambienteSefaz?: AmbienteSefaz;
  caminhoCertificado?: string;
  senhaCertificado?: string;
  pfxBuffer?: Buffer;
  windowsThumbprint?: string;
  focusNfeToken?: string;
}

export class FiscalAdapterFactory {
  public static criar(config?: IFiscalAdapterConfig): IFiscalAdapter {
    const provedor = (config?.provedor || process.env.INTEGRATION_PROVIDER || 'MOCK').toUpperCase();

    switch (provedor) {
      case 'WINDOWS_CERT': {
        const thumbprint = config?.windowsThumbprint || process.env.WINDOWS_CERT_THUMBPRINT;
        if (!thumbprint) {
          throw new Error('Para utilizar o certificado do Windows, é necessário selecionar um certificado válido (Thumbprint).');
        }
        const tpAmb = (config?.ambienteSefaz || Number(process.env.SEFAZ_TP_AMB) || 2) as AmbienteSefaz;
        return new SefazWindowsCertAdapter(thumbprint, tpAmb);
      }

      case 'SEFAZ': {
        const caminhoCert = config?.caminhoCertificado || process.env.CERTIFICATE_PATH;
        const senhaCert = config?.senhaCertificado || process.env.CERTIFICATE_PASSWORD;
        const pfxBuffer = config?.pfxBuffer;

        const fonteCertificado = pfxBuffer || caminhoCert;
        if (!fonteCertificado || !senhaCert) {
          throw new Error('Para utilizar o provedor SEFAZ via arquivo, é obrigatório informar o Certificado Digital A1 (.pfx) e sua senha.');
        }

        const certService = new CertificadoA1Service(fonteCertificado, senhaCert);
        const tpAmb = (config?.ambienteSefaz || Number(process.env.SEFAZ_TP_AMB) || 2) as AmbienteSefaz;

        return new SefazSoapAdapter(certService, tpAmb);
      }

      case 'FOCUS_NFE': {
        const token = config?.focusNfeToken || process.env.FOCUS_NFE_TOKEN || '';
        const isHomolog = (process.env.FOCUS_NFE_ENV || 'homologacao') === 'homologacao';
        return new FocusNfeAdapter(token, isHomolog);
      }

      case 'MOCK':
      default:
        return new MockFiscalAdapter();
    }
  }
}
