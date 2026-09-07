[CmdletBinding()]
param(
    [string]$Mensagem = "Atualizacao do Sistema Cupom Fiscal NFC-e",
    [string]$NovaVersao = "",
    [string]$Token = ""
)

$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   AUTOMACAO DE PUBLICACAO NO GITHUB" -ForegroundColor Cyan
Write-Host "   Repositorio: https://github.com/joenanda/cupom_fiscal" -ForegroundColor Cyan
Write-Host "================================================================`n"

$baseDir = Get-Location
$gitExe = Join-Path $env:LOCALAPPDATA "MinGit\cmd\git.exe"
if (-not (Test-Path $gitExe)) {
    $cmdGit = Get-Command git -ErrorAction SilentlyContinue
    if ($cmdGit) { $gitExe = $cmdGit.Source } else { $gitExe = "git" }
}

# 1. Carrega Token do .env se nao informado
if (-not $Token) {
    if (Test-Path ".env") {
        $envLines = Get-Content ".env"
        foreach ($line in $envLines) {
            if ($line -match "^GITHUB_TOKEN=(.+)$") {
                $Token = $matches[1].Trim()
                break
            }
        }
    }
}

# 2. Versao do package.json
$pkgJsonPath = Join-Path $baseDir "package.json"
$pkg = Get-Content $pkgJsonPath | ConvertFrom-Json
$versaoAtual = $pkg.version

if ($NovaVersao) {
    $pkg.version = $NovaVersao
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($pkgJsonPath, ($pkg | ConvertTo-Json -Depth 5), $utf8NoBom)
    Write-Host "[Versao] Atualizada de $versaoAtual para $NovaVersao" -ForegroundColor Green
    $versaoAtual = $NovaVersao
} else {
    Write-Host "[Versao] Publicando versao: $versaoAtual" -ForegroundColor Green
}

# 3. Compila projeto TypeScript e gera executaveis
Write-Host "`n[1/5] Recompilando projeto e gerando instaladores .EXE..." -ForegroundColor Yellow
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $baseDir "scripts\build-release.ps1")
# 4. Cria arquivo ZIP de atualizacao leve (update-vX.X.X.zip)
$zipUpdatePath = Join-Path $baseDir "release\update-v$versaoAtual.zip"
Write-Host "`n[2/5] Compactando pacote de atualizacao rapida ($zipUpdatePath)..." -ForegroundColor Yellow
if (Test-Path $zipUpdatePath) { Remove-Item $zipUpdatePath -Force }

Push-Location (Join-Path $baseDir "release")
& "C:\Windows\System32\tar.exe" -a -cf "update-v$versaoAtual.zip" dist public scripts package.json app.ico logo.png SistemaCupomFiscal.exe
Pop-Location

# 5. Cria pacote completo ZIP
$zipCompletoPath = Join-Path $baseDir "release\SistemaCupomFiscal-completo.zip"
Write-Host "[3/5] Compactando pacote completo ($zipCompletoPath)..." -ForegroundColor Yellow
if (Test-Path $zipCompletoPath) { Remove-Item $zipCompletoPath -Force }

Push-Location (Join-Path $baseDir "release")
& "C:\Windows\System32\tar.exe" -a -cf "SistemaCupomFiscal-completo.zip" bin dist public scripts node_modules package.json .env app.ico logo.png SistemaCupomFiscal.exe Criar_Atalho_Area_de_Trabalho.bat
Pop-Location

# 5.1 Compila Instalador Offline com o Zip Embutido
Write-Host "[3.5/5] Compilando Instalador Offline (embutindo pacote completo)..." -ForegroundColor Yellow
$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$installerSource = Join-Path $baseDir "installer\Setup.cs"
$installerExe = Join-Path $baseDir "release\Instalador_SistemaCupomFiscal.exe"
$installerIcon = Join-Path $baseDir "installer\app.ico"
$installerLogo = Join-Path $baseDir "installer\logo_thumb.png"
& $cscPath /target:winexe "/out:$installerExe" /r:System.Windows.Forms.dll /r:System.Drawing.dll "/resource:$installerLogo,Logo" "/resource:$installerIcon,AppIcon" "/resource:$zipCompletoPath,PackageZip" "/win32icon:$installerIcon" "$installerSource"

# 6. Inicializacao e Configuracao do Git
Write-Host "`n[4/5] Preparando commit no repositorio Git..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    & "$gitExe" init -b main
    & "$gitExe" config user.name "joenanda"
    & "$gitExe" config user.email "contato@cupomfiscal.com"
}

# Configura remote origin com token
$remoteUrl = if ($Token) {
    "https://$Token@github.com/joenanda/cupom_fiscal.git"
} else {
    "https://github.com/joenanda/cupom_fiscal.git"
}

$remotes = & "$gitExe" remote
if ($remotes -contains "origin") {
    & "$gitExe" remote set-url origin $remoteUrl
} else {
    & "$gitExe" remote add origin $remoteUrl
}

& "$gitExe" add .
& "$gitExe" commit -m "release(v$versaoAtual): $Mensagem" -q

# 7. Push para o GitHub
Write-Host "`n[5/5] Enviando codigo para o GitHub (branch main)..." -ForegroundColor Yellow
$pushRes = & "$gitExe" push -u origin main 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[OK] Codigo enviado com sucesso para o GitHub!" -ForegroundColor Green
} else {
    Write-Host "`n[Aviso de Push] $pushRes" -ForegroundColor Yellow
    if (-not $Token) {
        Write-Host "-> Adicione seu GITHUB_TOKEN no arquivo .env!" -ForegroundColor Cyan
    }
}

# 8. Publica Release no GitHub
if ($Token) {
    Write-Host "`n[GitHub API] Criando Release oficial v$versaoAtual no GitHub..." -ForegroundColor Yellow
    try {
        $desc = "Versao $versaoAtual`n`n$Mensagem`n`nInstalador autonomo: Instalador_SistemaCupomFiscal.exe"
        $json = @{
            tag_name = "v$versaoAtual"
            target_commitish = "main"
            name = "Versao $versaoAtual"
            body = $desc
            draft = $false
            prerelease = $false
        } | ConvertTo-Json
        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($json)

        $headers = @{
            "Authorization" = "token $Token"
            "Accept" = "application/vnd.github.v3+json"
            "User-Agent" = "SistemaCupomFiscal-Deployer/1.0"
        }

        $relResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/joenanda/cupom_fiscal/releases" -Method Post -Headers $headers -Body $bodyBytes -ContentType "application/json; charset=utf-8"
        Write-Host "[OK] Release criada: $($relResponse.html_url)" -ForegroundColor Green

        if ($relResponse.upload_url) {
            $uploadBase = if ($relResponse.upload_url.Contains('{')) { $relResponse.upload_url.Substring(0, $relResponse.upload_url.IndexOf('{')) } else { $relResponse.upload_url }

            # Upload Instalador
            Write-Host "[GitHub API] Fazendo upload do Instalador_SistemaCupomFiscal.exe..." -ForegroundColor Yellow
            $installerBytes = [System.IO.File]::ReadAllBytes($installerExe)
            $upHeaders = @{
                "Authorization" = "token $Token"
                "Content-Type" = "application/octet-stream"
                "User-Agent" = "SistemaCupomFiscal-Deployer/1.0"
            }
            $targetUri = "$($uploadBase)?name=Instalador_SistemaCupomFiscal.exe"
            Invoke-RestMethod -Uri $targetUri -Method Post -Headers $upHeaders -Body $installerBytes | Out-Null
            Write-Host "[OK] Instalador_SistemaCupomFiscal.exe anexado!" -ForegroundColor Green

            # Upload Update Zip
            if (Test-Path $zipUpdatePath) {
                Write-Host "[GitHub API] Fazendo upload do update-v$versaoAtual.zip..." -ForegroundColor Yellow
                $zipBytes = [System.IO.File]::ReadAllBytes($zipUpdatePath)
                $targetUri = "$($uploadBase)?name=update-v$versaoAtual.zip"
                Invoke-RestMethod -Uri $targetUri -Method Post -Headers $upHeaders -Body $zipBytes | Out-Null
                Write-Host "[OK] update-v$versaoAtual.zip anexado!" -ForegroundColor Green
            }

            # Upload Pacote Completo
            if (Test-Path $zipCompletoPath) {
                Write-Host "[GitHub API] Fazendo upload do SistemaCupomFiscal-completo.zip..." -ForegroundColor Yellow
                $completoBytes = [System.IO.File]::ReadAllBytes($zipCompletoPath)
                $targetUri = "$($uploadBase)?name=SistemaCupomFiscal-completo.zip"
                Invoke-RestMethod -Uri $targetUri -Method Post -Headers $upHeaders -Body $completoBytes | Out-Null
                Write-Host "[OK] SistemaCupomFiscal-completo.zip anexado!" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "[Aviso Release] $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "  PUBLICACAO FINALIZADA COM SUCESSO!" -ForegroundColor Green
Write-Host "  Acesse: https://github.com/joenanda/cupom_fiscal" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
