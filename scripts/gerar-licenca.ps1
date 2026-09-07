[CmdletBinding()]
param(
    [string]$MachineId = "",
    [string]$Tipo = "",
    [switch]$CopiarParaClipboard
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   GERADOR DE LICENÇAS - GUARÁ SEGURANÇA E INTERNET" -ForegroundColor Cyan
Write-Host "   Sistema Cupom Fiscal Eletrônico NFC-e (Modelo 65)" -ForegroundColor Cyan
Write-Host "================================================================`n"

# 1. Solicita o Machine ID do cliente se não informado
if (-not $MachineId) {
    Write-Host "Instrução: Peça para o cliente abrir o sistema e copiar o ID da máquina." -ForegroundColor Yellow
    $MachineId = Read-Host "Digite o Machine ID do cliente (ex: GUARA-XXXX-XXXX-XXXX)"
}

$MachineId = $MachineId.Trim().ToUpper()

if (-not $MachineId -or -not ($MachineId -match "^GUARA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$")) {
    Write-Host "`n[Aviso] O Machine ID informado não parece estar no formato padrão (GUARA-XXXX-XXXX-XXXX)." -ForegroundColor Yellow
    $confirma = Read-Host "Deseja continuar com este ID mesmo assim? (S/N)"
    if ($confirma -ne "S" -and $confirma -ne "s") {
        Write-Host "Operação cancelada." -ForegroundColor Red
        exit 1
    }
}

# 2. Solicita o Tipo de Licença
if (-not $Tipo) {
    Write-Host "`nEscolha o Tipo de Licença:" -ForegroundColor Cyan
    Write-Host " [1] Demonstração / Teste (30 dias)"
    Write-Host " [2] Assinatura Anual (365 dias)"
    Write-Host " [3] Vitalícia / Permanente (Sem Expiração)"
    $opcao = Read-Host "Digite o número da opção (1, 2 ou 3)"

    switch ($opcao) {
        "1" { $Tipo = "DEMO_30D" }
        "2" { $Tipo = "ANUAL_365D" }
        "3" { $Tipo = "VITALICIA" }
        default { $Tipo = "VITALICIA" }
    }
}

# 3. Calcula datas
$dataEmissao = (Get-Date).ToString("yyyy-MM-dd")
$dataExpiracao = $null
$tipoDescricao = "Vitalícia / Permanente"

if ($Tipo -eq "DEMO_30D") {
    $dataExpiracao = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    $tipoDescricao = "Demonstração (30 dias - Expira em $dataExpiracao)"
} elseif ($Tipo -eq "ANUAL_365D") {
    $dataExpiracao = (Get-Date).AddDays(365).ToString("yyyy-MM-dd")
    $tipoDescricao = "Assinatura Anual (Expira em $dataExpiracao)"
}

# 4. Assinatura HMAC-SHA256
$MASTER_SECRET = "GuaraSegurancaInternetFiscalNFCe2026SecretKey@Protect!"
$expString = if ($dataExpiracao) { $dataExpiracao } else { "LIFETIME" }
$dadosParaAssinar = "$MachineId|$Tipo|$expString"

$hmac = New-Object System.Security.Cryptography.HMACSHA256 ([System.Text.Encoding]::UTF8.GetBytes($MASTER_SECRET))
$hashBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($dadosParaAssinar))
$assinatura = [System.BitConverter]::ToString($hashBytes).Replace("-", "").ToLower()

# 5. Monta Payload JSON e Base64
$payloadObj = @{
    machineId = $MachineId
    tipo = $Tipo
    dataEmissao = $dataEmissao
    dataExpiracao = $dataExpiracao
    assinatura = $assinatura
}

$json = $payloadObj | ConvertTo-Json -Compress
$jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$base64 = [Convert]::ToBase64String($jsonBytes)
$chaveFinal = "GUARA-ACT-$base64"

# 6. Exibe a Chave Gerada
Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "   LICENÇA GERADA COM SUCESSO!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Cliente / ID:   $MachineId" -ForegroundColor White
Write-Host "  Modalidade:     $tipoDescricao" -ForegroundColor White
Write-Host "  Emissão:        $dataEmissao" -ForegroundColor White
Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  CHAVE DE ATIVAÇÃO:" -ForegroundColor Yellow
Write-Host "  $chaveFinal" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray

# Copia para a área de transferência do Windows se disponível
try {
    Set-Clipboard -Value $chaveFinal
    Write-Host "✓ A chave foi copiada automaticamente para sua Área de Transferência!" -ForegroundColor Green
} catch {}

Write-Host "`nEntregue esta chave para o cliente colar na tela de ativação do sistema." -ForegroundColor Yellow
