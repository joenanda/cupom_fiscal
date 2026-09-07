import { obterInformacoesUF, IUFInfo } from '../constants/ufs';

export interface IChaveAcessoDecomposta {
  chaveCompleta: string;
  chaveFormatada: string;
  uf: IUFInfo;
  anoMes: string;
  ano: number;
  mes: number;
  cnpjEmitente: string;
  cnpjEmitenteFormatado: string;
  modelo: string;
  isNFCe: boolean;
  serie: string;
  numeroNota: string;
  tipoEmissao: string;
  tipoEmissaoDescricao: string;
  codigoNumerico: string;
  digitoVerificadorInformado: number;
  digitoVerificadorCalculado: number;
}

export interface IResultadoValidacaoChave {
  valida: boolean;
  erro?: string;
  dados?: IChaveAcessoDecomposta;
}

const TIPOS_EMISSAO: Record<string, string> = {
  '1': 'Emissão normal',
  '2': 'Contingência FS-IA',
  '3': 'Contingência SCAN',
  '4': 'Contingência DPEC/EPEC',
  '5': 'Contingência FS-DA',
  '6': 'Contingência SVC-AN',
  '7': 'Contingência SVC-RS',
  '9': 'Contingência off-line da NFC-e',
};

/**
 * Calcula o Dígito Verificador (DV) de 43 dígitos segundo o algoritmo Módulo 11 da SEFAZ
 * Pesos de 2 a 9 aplicados da direita para a esquerda.
 */
export function calcularDigitoVerificadorSEFAZ(chave43: string): number {
  if (chave43.length !== 43 || !/^\d{43}$/.test(chave43)) {
    throw new Error('A base para cálculo do DV deve conter exatamente 43 dígitos numéricos.');
  }

  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let pesoIdx = 0;
  let soma = 0;

  for (let i = chave43.length - 1; i >= 0; i--) {
    const digito = parseInt(chave43.charAt(i), 10);
    soma += digito * pesos[pesoIdx];
    pesoIdx = (pesoIdx + 1) % pesos.length;
  }

  const resto = soma % 11;
  return (resto === 0 || resto === 1) ? 0 : 11 - resto;
}

/**
 * Formata CNPJ de 14 dígitos para visualização 00.000.000/0000-00
 */
export function formatarCNPJ(cnpj: string | number): string {
  const str = String(cnpj || '');
  return str.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Formata a chave de 44 dígitos em blocos de 4 dígitos para visualização amigável
 */
export function formatarChaveAcesso(chave: string | number): string {
  const str = String(chave || '');
  return str.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/**
 * Validador e Decompositor Completo de Chave de Acesso de Documentos Fiscais Eletrônicos
 * Valida regras estruturais, Módulo 11 SEFAZ e validação específica de NFC-e (Modelo 65).
 */
export function validarChaveAcessoNFCe(chaveRaw: string, exigirModelo65: boolean = true): IResultadoValidacaoChave {
  if (!chaveRaw) {
    return {
      valida: false,
      erro: 'Chave de acesso não informada.',
    };
  }

  // Remove quaisquer caracteres não-numéricos (espaços, pontuação, etc.)
  const chaveLimpa = chaveRaw.replace(/\D/g, '');

  if (chaveLimpa.length !== 44) {
    return {
      valida: false,
      erro: `Chave de acesso possui ${chaveLimpa.length} dígitos. O padrão SEFAZ exige exatamente 44 dígitos numéricos.`,
    };
  }

  // Decomposição dos campos da chave conforme MOC SEFAZ
  const cUF = chaveLimpa.substring(0, 2);
  const aamm = chaveLimpa.substring(2, 6);
  const cnpj = chaveLimpa.substring(6, 20);
  const modelo = chaveLimpa.substring(20, 22);
  const serie = chaveLimpa.substring(22, 25);
  const nNF = chaveLimpa.substring(25, 34);
  const tpEmis = chaveLimpa.substring(34, 35);
  const cNF = chaveLimpa.substring(35, 43);
  const cDV = chaveLimpa.substring(43, 44);

  // 1. Validação de UF (Código IBGE)
  const ufInfo = obterInformacoesUF(cUF);
  if (!ufInfo) {
    return {
      valida: false,
      erro: `Código de UF "${cUF}" inválido ou não reconhecido na tabela do IBGE.`,
    };
  }

  // 2. Validação da Data (AAMM)
  const anoDigitos = parseInt(aamm.substring(0, 2), 10);
  const mes = parseInt(aamm.substring(2, 4), 10);
  const anoCompleto = 2000 + anoDigitos;

  if (mes < 1 || mes > 12) {
    return {
      valida: false,
      erro: `Mês de emissão inválido na chave de acesso: "${aamm.substring(2, 4)}". Esperado entre 01 e 12.`,
    };
  }

  // 3. Validação do Modelo do Documento
  const isNFCe = modelo === '65';
  if (exigirModelo65 && !isNFCe) {
    if (modelo === '55') {
      return {
        valida: false,
        erro: 'A chave informada pertence a uma NF-e (Modelo 55 - Nota Fiscal Eletrônica), e não a um Cupom Fiscal NFC-e (Modelo 65).',
      };
    }
    return {
      valida: false,
      erro: `Modelo fiscal "${modelo}" não suportado. Este sistema opera exclusivamente com NFC-e (Modelo 65).`,
    };
  }

  // 4. Validação do Dígito Verificador (Módulo 11)
  const base43 = chaveLimpa.substring(0, 43);
  const dvCalculado = calcularDigitoVerificadorSEFAZ(base43);
  const dvInformado = parseInt(cDV, 10);

  if (dvCalculado !== dvInformado) {
    return {
      valida: false,
      erro: `Dígito verificador inválido! Informado: ${dvInformado}, Esperado pelo algoritmo SEFAZ (Módulo 11): ${dvCalculado}.`,
    };
  }

  return {
    valida: true,
    dados: {
      chaveCompleta: chaveLimpa,
      chaveFormatada: formatarChaveAcesso(chaveLimpa),
      uf: ufInfo,
      anoMes: aamm,
      ano: anoCompleto,
      mes,
      cnpjEmitente: cnpj,
      cnpjEmitenteFormatado: formatarCNPJ(cnpj),
      modelo,
      isNFCe,
      serie,
      numeroNota: String(parseInt(nNF, 10)), // Exibição limpa sem zeros à esquerda
      tipoEmissao: tpEmis,
      tipoEmissaoDescricao: TIPOS_EMISSAO[tpEmis] || 'Outro / Não identificado',
      codigoNumerico: cNF,
      digitoVerificadorInformado: dvInformado,
      digitoVerificadorCalculado: dvCalculado,
    },
  };
}
