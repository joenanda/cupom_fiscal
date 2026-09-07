[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  GERAÇÃO DO PACOTE DE INSTALAÇÃO WINDOWS (.EXE PARA O CLIENTE)" -ForegroundColor Cyan
Write-Host "================================================================`n"

$baseDir = Get-Location
$releaseDir = Join-Path $baseDir "release"

# 1. Compila TypeScript
Write-Host "[1/6] Compilando código TypeScript..." -ForegroundColor Yellow
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha na compilação do TypeScript!"
    exit 1
}

# 2. Prepara estrutura de pastas da release
Write-Host "[2/6] Estruturando diretório de release..." -ForegroundColor Yellow
if (Test-Path $releaseDir) {
    Remove-Item -Path $releaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path (Join-Path $releaseDir "bin") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $releaseDir "storage\documents") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $releaseDir "storage\certificates") -Force | Out-Null

# 3. Copia executável do Node.js portátil para release\bin\node.exe
Write-Host "[3/6] Copiando runtime Node.js portátil..." -ForegroundColor Yellow
$localNode = (Get-Command node).Source
Copy-Item $localNode (Join-Path $releaseDir "bin\node.exe") -Force

# 4. Copia pastas essenciais (dist, public, scripts, node_modules)
Write-Host "[4/6] Copiando arquivos da aplicação, frontend e scripts..." -ForegroundColor Yellow
Copy-Item -Path (Join-Path $baseDir "dist") -Destination $releaseDir -Recurse -Force
Copy-Item -Path (Join-Path $baseDir "public") -Destination $releaseDir -Recurse -Force
Copy-Item -Path (Join-Path $baseDir "scripts") -Destination $releaseDir -Recurse -Force
Copy-Item -Path (Join-Path $baseDir "node_modules") -Destination $releaseDir -Recurse -Force

# Copia arquivo .env padrão
Set-Content -Path (Join-Path $releaseDir ".env") -Value @"
PORT=3000
NODE_ENV=production
INTEGRATION_PROVIDER=MOCK
SEFAZ_TP_AMB=2
STORAGE_DISK=local
STORAGE_LOCAL_DIR=./storage/documents
AUTO_OPEN_BROWSER=true
"@ -Encoding UTF8

# 5. Compila o executável principal SistemaCupomFiscal.exe com ícone oficial
Write-Host "[5/6] Compilando executável nativo Windows (SistemaCupomFiscal.exe)..." -ForegroundColor Yellow
$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$sourceFile = Join-Path $baseDir "launcher\Program.cs"
$outputExe = Join-Path $releaseDir "SistemaCupomFiscal.exe"
$iconFile = Join-Path $baseDir "launcher\app.ico"
$logoFile = Join-Path $baseDir "launcher\logo_thumb.png"

$icoTool = Join-Path $baseDir "scripts\MakePerfectIco.exe"
if (Test-Path $icoTool) {
    & $icoTool | Out-Null
}

& $cscPath /target:winexe "/out:$outputExe" /r:System.Windows.Forms.dll /r:System.Drawing.dll "/resource:$logoFile,Logo" "/win32icon:$iconFile" "$sourceFile"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha na compilação do executável C#!"
    exit 1
}

# Copia ícone para a release
Copy-Item $iconFile (Join-Path $releaseDir "app.ico") -Force
Copy-Item (Join-Path $baseDir "public\assets\logo.png") (Join-Path $releaseDir "logo.png") -Force

# 6. Cria script de 1 clique para gerar atalho na Área de Trabalho do cliente
Write-Host "[6/6] Criando script de atalho para Área de Trabalho..." -ForegroundColor Yellow
$shortcutBat = Join-Path $releaseDir "Criar_Atalho_Area_de_Trabalho.bat"
$batContent = @"
@echo off
chcp 65001 > nul
echo ================================================================
echo   INSTALADOR DE ATALHO - SISTEMA CUPOM FISCAL NFC-e
echo ================================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "`$ws = New-Object -ComObject WScript.Shell; `$s = `$ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Sistema Cupom Fiscal NFC-e.lnk')); `$s.TargetPath = [System.IO.Path]::Combine((Get-Location), 'SistemaCupomFiscal.exe'); `$s.WorkingDirectory = (Get-Location).Path; `$s.Description = 'Consulta e Download de Cupom Fiscal Eletrônico NFC-e - GUARÁ SEGURANÇA E INTERNET'; `$ico = [System.IO.Path]::Combine((Get-Location), 'app.ico'); if (Test-Path `$ico) { `$s.IconLocation = `$ico + ',0' }; `$s.Save(); [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');"
echo [OK] Atalho criado na sua Area de Trabalho com o icone oficial da Guara Seguranca e Internet!
echo.
echo Para abrir o sistema, clique no atalho 'Sistema Cupom Fiscal NFC-e' na sua Area de Trabalho
echo ou execute diretamente o arquivo 'SistemaCupomFiscal.exe'.
echo.
pause
"@
Set-Content -Path $shortcutBat -Value $batContent -Encoding UTF8

Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "  PACOTE GERADO COM SUCESSO NA PASTA 'release\'!" -ForegroundColor Green
Write-Host "  Executavel Principal: release\SistemaCupomFiscal.exe" -ForegroundColor Green
Write-Host "  Instalador de Atalho: release\Criar_Atalho_Area_de_Trabalho.bat" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
