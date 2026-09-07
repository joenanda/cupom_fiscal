import {
  validarChaveAcessoNFCe,
  IChaveAcessoDecomposta,
} from '../../core/validators/chaveAcesso.validator';
import { AppError } from '../../core/errors/AppError';

/**
 * Objeto de Valor (Value Object) que encapsula a Chave de Acesso da NFC-e.
 * Garante que nenhuma instância seja criada com uma chave inválida.
 */
export class ChaveAcessoNFCe {
  private readonly _dados: IChaveAcessoDecomposta;

  private constructor(dados: IChaveAcessoDecomposta) {
    this._dados = Object.freeze(dados);
  }

  public static criar(chave: string, permitirOutrosModelos: boolean = false): ChaveAcessoNFCe {
    const resultado = validarChaveAcessoNFCe(chave, !permitirOutrosModelos);

    if (!resultado.valida || !resultado.dados) {
      throw new AppError(resultado.erro || 'Chave de acesso inválida.', 422);
    }

    return new ChaveAcessoNFCe(resultado.dados);
  }

  public get valor(): string {
    return this._dados.chaveCompleta;
  }

  public get formatada(): string {
    return this._dados.chaveFormatada;
  }

  public get uf(): string {
    return this._dados.uf.sigla;
  }

  public get codigoIbgeUF(): string {
    return this._dados.uf.codigoIbge;
  }

  public get autorizadorSefaz(): string {
    return this._dados.uf.autorizadorNfce;
  }

  public get cnpjEmitente(): string {
    return this._dados.cnpjEmitente;
  }

  public get cnpjEmitenteFormatado(): string {
    return this._dados.cnpjEmitenteFormatado;
  }

  public get anoMes(): string {
    return this._dados.anoMes;
  }

  public get modelo(): string {
    return this._dados.modelo;
  }

  public get serie(): string {
    return this._dados.serie;
  }

  public get numero(): string {
    return this._dados.numeroNota;
  }

  public get tipoEmissao(): string {
    return this._dados.tipoEmissao;
  }

  public get tipoEmissaoDescricao(): string {
    return this._dados.tipoEmissaoDescricao;
  }

  public get digitoVerificador(): number {
    return this._dados.digitoVerificadorCalculado;
  }

  public toJSON(): IChaveAcessoDecomposta {
    return { ...this._dados };
  }
}
