$dest = Join-Path $env:LOCALAPPDATA 'MinGit'
if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

$gitExe = Join-Path $dest 'cmd\git.exe'
if (-not (Test-Path $gitExe)) {
    $zip = Join-Path $dest 'mingit.zip'
    Write-Host "Baixando MinGit oficial portátil (sem necessidade de administrador)..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/MinGit-2.44.0-64-bit.zip" -OutFile $zip
    Write-Host "Extraindo MinGit..."
    Expand-Archive -Path $zip -DestinationPath $dest -Force
    Remove-Item $zip -Force
}

Write-Host "MinGit pronto em: $gitExe"
& $gitExe --version

# Adiciona à sessão atual
$env:PATH = "$dest\cmd;$env:PATH"
