[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$Thumbprint,
    [Parameter(Mandatory=$true)]
    [string]$Url,
    [Parameter(Mandatory=$true)]
    [string]$SoapAction,
    [Parameter(Mandatory=$true)]
    [string]$XmlEnvelope
)

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$OutputEncoding = [System.Text.Encoding]::UTF8

try {
    # Localiza o certificado via .NET X509Store (CurrentUser e LocalMachine)
    $cert = $null
    foreach ($loc in @("CurrentUser", "LocalMachine")) {
        try {
            $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", $loc)
            $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
            $found = $store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindByThumbprint, $Thumbprint, $false)
            if ($found.Count -gt 0) {
                $cert = $found[0]
                $store.Close()
                break
            }
            $store.Close()
        } catch {}
    }

    if (-not $cert) {
        $errObj = [PSCustomObject]@{
            Sucesso = $false
            Erro = "Certificado com Thumbprint $Thumbprint não encontrado no repositório do Windows."
        }
        $errObj | ConvertTo-Json -Compress
        exit 1
    }

    # Configura o HttpClientHandler com o certificado do Windows
    $handler = [System.Net.Http.HttpClientHandler]::new()
    $handler.ClientCertificates.Add($cert)
    $handler.ServerCertificateCustomValidationCallback = { $true }

    $client = [System.Net.Http.HttpClient]::new($handler)
    $client.Timeout = [System.TimeSpan]::FromSeconds(30)

    $content = [System.Net.Http.StringContent]::new($XmlEnvelope, [System.Text.Encoding]::UTF8, "application/soap+xml")
    if ($SoapAction) {
        $content.Headers.Add("SOAPAction", $SoapAction)
    }

    $response = $client.PostAsync($Url, $content).GetAwaiter().GetResult()
    $statusCode = [int]$response.StatusCode
    $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

    $resObj = [PSCustomObject]@{
        Sucesso = ($statusCode -ge 200 -and $statusCode -lt 300)
        StatusCode = $statusCode
        XmlResposta = $body
    }

    $resObj | ConvertTo-Json -Compress
} catch {
    $errObj = [PSCustomObject]@{
        Sucesso = $false
        Erro = $_.Exception.Message
    }
    $errObj | ConvertTo-Json -Compress
    exit 1
}
