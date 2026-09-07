try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$OutputEncoding = [System.Text.Encoding]::UTF8

$stores = @("CurrentUser", "LocalMachine")
$certs = @()

foreach ($loc in $stores) {
    try {
        $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", $loc)
        $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
        $items = $store.Certificates | Where-Object { $_.HasPrivateKey }

        foreach ($cert in $items) {
            $hoje = Get-Date
            $expirado = $cert.NotAfter -lt $hoje
            $diasRestantes = [math]::Floor(($cert.NotAfter - $hoje).TotalDays)

            $subject = $cert.Subject
            $razaoSocial = ""
            $cnpj = ""
            $cpf = ""

            if ($subject -match "CN=([^,]+)") {
                $cnCompleto = $matches[1]
                if ($cnCompleto -match "^(.*?):(\d{14})$") {
                    $razaoSocial = $matches[1]
                    $cnpj = $matches[2]
                } elseif ($cnCompleto -match "^(.*?):(\d{11})$") {
                    $razaoSocial = $matches[1]
                    $cpf = $matches[2]
                } else {
                    $razaoSocial = $cnCompleto
                }
            }

            $isIcp = ($cert.Issuer -like "*ICP-Brasil*" -or $subject -like "*ICP-Brasil*" -or $cnpj -ne "" -or $cpf -ne "")
            if ($isIcp -and -not $expirado) {
                $certs += [PSCustomObject]@{
                    Thumbprint = $cert.Thumbprint
                    Subject = $cert.Subject
                    RazaoSocial = if ($razaoSocial) { $razaoSocial } else { $cert.Subject }
                    CNPJ = $cnpj
                    CPF = $cpf
                    Emissor = $cert.Issuer
                    ValidoDe = $cert.NotBefore.ToString("yyyy-MM-ddTHH:mm:ss")
                    ValidoAte = $cert.NotAfter.ToString("yyyy-MM-ddTHH:mm:ss")
                    DiasRestantes = $diasRestantes
                    Expirado = $expirado
                    Store = $loc
                }
            }
        }
        $store.Close()
    } catch {}
}

$certs | ConvertTo-Json -Depth 3
