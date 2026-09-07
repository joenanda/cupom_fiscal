Add-Type -AssemblyName System.Drawing
$ico = [System.Drawing.Icon]::ExtractAssociatedIcon("C:\Users\JOSIMAR DE ASSIS\Desktop\Sistema Cupom Fiscal NFC-e.lnk")
$bmp = $ico.ToBitmap()
$outPath = "C:\Users\JOSIMAR DE ASSIS\.gemini\antigravity-ide\brain\2c50fc11-55a7-47d3-91e3-9541c392a8a4\desktop_shortcut_extracted_icon.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$ico.Dispose()
Write-Host "Saved desktop_shortcut_extracted_icon.png"
