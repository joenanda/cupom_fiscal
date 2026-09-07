import { exec } from 'child_process';
import path from 'path';

const p = path.resolve('scripts/list-windows-certs.ps1');
const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${p}"`;

exec(cmd, (err, stdout, stderr) => {
  console.log('Err:', err);
  console.log('Stderr:', stderr);
  console.log('Stdout length:', stdout ? stdout.length : 0);
  if (stdout && stdout.length > 0) {
    const list = JSON.parse(stdout);
    console.log('Total de certificados encontrados:', list.length);
    list.forEach((c: any) => console.log(`- [${c.Store}] ${c.RazaoSocial} (${c.CNPJ || c.CPF})`));
  }
});
