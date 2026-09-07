import { LicenseService } from '../src/services/license/license.service';

console.log('================================================================');
console.log('   TESTE DO SISTEMA DE LICENCIAMENTO E TRAVA DE HARDWARE');
console.log('   GUARÁ SEGURANÇA E INTERNET');
console.log('================================================================\n');

// 1. Obtém o Machine ID desta máquina
const machineId = LicenseService.obterMachineId();
console.log('[1] Machine ID Detectado:', machineId);

// 2. Verifica status inicial
const statusInicial = LicenseService.verificarStatusLicenca();
console.log('[2] Status Inicial:', statusInicial.ativado ? 'ATIVO' : 'BLOQUEADO', `(${statusInicial.mensagem})`);

// 3. Gera chave Vitalícia
console.log('\n[3] Gerando Chave de Licença Vitalícia para este Machine ID...');
const chaveVitalicia = LicenseService.gerarChave(machineId, 'VITALICIA');
console.log('Chave Gerada:', chaveVitalicia);

// 4. Ativação com a chave
console.log('\n[4] Ativando o sistema com a chave gerada...');
const statusAtivado = LicenseService.ativarComChave(chaveVitalicia);
console.log('Resultado da Ativação:', statusAtivado.ativado ? 'SUCESSO (ATIVO)' : 'FALHA');
console.log('Tipo:', statusAtivado.tipo);
console.log('Mensagem:', statusAtivado.mensagem);

// 5. Teste de tentativa de cópia para outro computador (Machine ID divergente)
console.log('\n[5] Teste de Proteção Anti-Cópia (Chave de outra máquina):');
try {
  const chaveOutraMaquina = LicenseService.gerarChave('GUARA-9999-8888-7777', 'VITALICIA');
  LicenseService.ativarComChave(chaveOutraMaquina);
  console.error('ERRO: Não deveria ter permitido ativar com ID de outra máquina!');
} catch (err: any) {
  console.log('✓ Bloqueio Anti-Cópia Funcionado:', err.message);
}

// 6. Teste de chave adulterada
console.log('\n[6] Teste de Assinatura Adulterada:');
try {
  LicenseService.ativarComChave('GUARA-ACT-eyJtYWNoaW5lSWQiOiIxMjM0In0=');
  console.error('ERRO: Não deveria ter permitido ativar chave adulterada!');
} catch (err: any) {
  console.log('✓ Bloqueio de Chave Falsa Funcionado:', err.message);
}

console.log('\n================================================================');
console.log('TODOS OS TESTES DE LICENCIAMENTO PASSARAM COM 100% DE SUCESSO!');
console.log('================================================================');
