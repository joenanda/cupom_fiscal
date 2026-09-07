$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop 'Sistema Cupom Fiscal NFC-e.lnk'
$targetExe = "C:\Users\JOSIMAR DE ASSIS\AppData\Local\SistemaCupomFiscal\SistemaCupomFiscal.exe"
$installDir = "C:\Users\JOSIMAR DE ASSIS\AppData\Local\SistemaCupomFiscal"
$icoPath = Join-Path $installDir "app.ico"

# Copia o novo executável e o app.ico para a pasta instalada
Copy-Item (Join-Path (Get-Location) "release\SistemaCupomFiscal.exe") $targetExe -Force
Copy-Item (Join-Path (Get-Location) "release\app.ico") $icoPath -Force
Copy-Item (Join-Path (Get-Location) "release\logo.png") (Join-Path $installDir "logo.png") -Force

Write-Host "Arquivos copiados para $installDir"
Write-Host "SistemaCupomFiscal.exe size: $( (Get-Item $targetExe).Length ) bytes"
Write-Host "app.ico size: $( (Get-Item $icoPath).Length ) bytes"

# Atualiza o atalho
$sh = New-Object -ComObject WScript.Shell
$s = $sh.CreateShortcut($lnkPath)
$s.TargetPath = $targetExe
$s.WorkingDirectory = $installDir
$s.Description = "Sistema de Download de Cupom Fiscal NFC-e (Mod 65) - GUARÁ SEGURANÇA E INTERNET"
# Em arquivos .ico, o caminho direto sem ,0 ou com ,0:
$s.IconLocation = "$icoPath"
$s.Save()

Write-Host "Atalho atualizado com IconLocation: $($s.IconLocation)"

# Força atualização do cache de ícones do Windows
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ShellHelper {
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
    public static void Flush() {
        SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
    }
}
"@
[ShellHelper]::Flush()
Write-Host "Cache do Windows Explorer atualizado com SHChangeNotify!"
