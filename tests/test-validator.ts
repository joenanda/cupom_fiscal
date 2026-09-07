import {
  validarChaveAcessoNFCe,
  calcularDigitoVerificadorSEFAZ,
} from '../src/core/validators/chaveAcesso.validator';

console.log('================================================================');
console.log('   TESTES DO MÓDULO DE VALIDAÇÃO DE CHAVE DE ACESSO (NFC-e)');
console.log('================================================================\n');

// 1. Geração e validação de chave NFC-e válida (Mod 65 - SP)
const baseNFCeSP = '3524081122233300018165001000012345112345678';
const dvCalculadoSP = calcularDigitoVerificadorSEFAZ(baseNFCeSP);
const chaveValidaNFCe = `${baseNFCeSP}${dvCalculadoSP}`;

console.log(`[TESTE 1] Chave NFC-e SP (Mod 65) Válida:`);
console.log(`Chave: ${chaveValidaNFCe}`);
const res1 = validarChaveAcessoNFCe(chaveValidaNFCe);
console.log(`Resultado: ${res1.valida ? 'VÁLIDA (OK)' : 'INVÁLIDA'}`);
if (res1.valida && res1.dados) {
  console.log(`- UF: ${res1.dados.uf.sigla} (${res1.dados.uf.nome}) - Autorizador: ${res1.dados.uf.autorizadorNfce}`);
  console.log(`- Emissão: ${res1.dados.mes}/${res1.dados.ano}`);
  console.log(`- CNPJ Emitente: ${res1.dados.cnpjEmitenteFormatado}`);
  console.log(`- Modelo: ${res1.dados.modelo} (NFC-e: ${res1.dados.isNFCe})`);
  console.log(`- Série: ${res1.dados.serie} | Número: ${res1.dados.numeroNota}`);
  console.log(`- Tipo Emissão: ${res1.dados.tipoEmissaoDescricao}`);
  console.log(`- DV Calculado: ${res1.dados.digitoVerificadorCalculado}`);
}
console.log('\n----------------------------------------------------------------\n');

// 2. Chave com Dígito Verificador Incorreto
const chaveDVInvalido = `${baseNFCeSP}${(dvCalculadoSP + 1) % 10}`;
console.log(`[TESTE 2] Chave com DV Incorreto:`);
console.log(`Chave: ${chaveDVInvalido}`);
const res2 = validarChaveAcessoNFCe(chaveDVInvalido);
console.log(`Resultado esperado: INVÁLIDA -> Obtido: ${res2.valida ? 'VÁLIDA' : 'INVÁLIDA'}`);
console.log(`Mensagem de Erro: "${res2.erro}"`);
console.log('\n----------------------------------------------------------------\n');

// 3. Chave com Modelo 55 (NF-e tradicional, não cupom fiscal)
const baseNFeRJ = '3324081122233300018155001000012345112345678';
const dvNFeRJ = calcularDigitoVerificadorSEFAZ(baseNFeRJ);
const chaveNFe55 = `${baseNFeRJ}${dvNFeRJ}`;
console.log(`[TESTE 3] Chave de NF-e (Modelo 55 - Incompatível com NFC-e):`);
console.log(`Chave: ${chaveNFe55}`);
const res3 = validarChaveAcessoNFCe(chaveNFe55);
console.log(`Resultado esperado: INVÁLIDA (Modelo 55) -> Obtido: ${res3.valida ? 'VÁLIDA' : 'INVÁLIDA'}`);
console.log(`Mensagem de Erro: "${res3.erro}"`);
console.log('\n----------------------------------------------------------------\n');

// 4. Chave com tamanho incorreto (ex: 40 dígitos)
const chaveCurta = '35240811222333000181650010000123451';
console.log(`[TESTE 4] Chave com tamanho incorreto (${chaveCurta.length} dígitos):`);
const res4 = validarChaveAcessoNFCe(chaveCurta);
console.log(`Resultado esperado: INVÁLIDA -> Obtido: ${res4.valida ? 'VÁLIDA' : 'INVÁLIDA'}`);
console.log(`Mensagem de Erro: "${res4.erro}"`);
console.log('\n----------------------------------------------------------------\n');

// 5. Chave com UF inexistente
const baseUFInvalida = '9924081122233300018165001000012345112345678';
const dvUFInvalida = calcularDigitoVerificadorSEFAZ(baseUFInvalida);
const chaveUFInvalida = `${baseUFInvalida}${dvUFInvalida}`;
console.log(`[TESTE 5] Chave com UF IBGE 99 (Inexistente):`);
const res5 = validarChaveAcessoNFCe(chaveUFInvalida);
console.log(`Resultado esperado: INVÁLIDA -> Obtido: ${res5.valida ? 'VÁLIDA' : 'INVÁLIDA'}`);
console.log(`Mensagem de Erro: "${res5.erro}"`);
console.log('\n================================================================');
console.log('TODOS OS TESTES DE VALIDAÇÃO FORAM EXECUTADOS!');
console.log('================================================================');
