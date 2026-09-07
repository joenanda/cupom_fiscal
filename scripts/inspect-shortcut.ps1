$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop 'Sistema Cupom Fiscal NFC-e.lnk'
if (Test-Path $lnkPath) {
    $sh = New-Object -ComObject WScript.Shell
    $s = $sh.CreateShortcut($lnkPath)
    Write-Host "Lnk Path: $lnkPath"
    Write-Host "TargetPath: $($s.TargetPath)"
    Write-Host "WorkingDirectory: $($s.WorkingDirectory)"
    Write-Host "IconLocation: $($s.IconLocation)"
    $iconFile = $s.IconLocation.Split(',')[0]
    Write-Host "IconFile exists ($iconFile): $(Test-Path $iconFile)"
} else {
    Write-Host "Shortcut not found on desktop"
}
