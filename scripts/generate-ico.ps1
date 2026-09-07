Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path (Get-Location) "public\assets\logo.png"
$sourceImg = [System.Drawing.Image]::FromFile($sourcePath)

Write-Host "Source image: $($sourceImg.Width) x $($sourceImg.Height)"

# Function to resize with high quality
function Resize-Image($img, $size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $size, $size)
    $g.Dispose()
    return $bmp
}

# Sizes needed for modern Windows
$sizes = @(256, 128, 64, 48, 32, 16)
$imagesData = @()

foreach ($s in $sizes) {
    $resized = Resize-Image $sourceImg $s
    $ms = New-Object System.IO.MemoryStream
    $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $ms.ToArray()
    $ms.Dispose()
    $resized.Dispose()
    
    $imagesData += ,@($s, $pngBytes)
}

$sourceImg.Dispose()

# Create ICO file stream
function Save-Ico($outputPath, $imgList) {
    $fs = New-Object System.IO.FileStream($outputPath, [System.IO.FileMode]::Create)
    $bw = New-Object System.IO.BinaryWriter($fs)

    # ICONDIR
    $bw.Write([uint16]0) # Reserved
    $bw.Write([uint16]1) # Type: 1 = ICO
    $bw.Write([uint16]$imgList.Count) # Count

    # Calculate offset
    # Header = 6 bytes, each ICONDIRENTRY = 16 bytes
    $offset = 6 + (16 * $imgList.Count)

    # Write ICONDIRENTRY for each image
    foreach ($item in $imgList) {
        $s = $item[0]
        $bytes = $item[1]

        $widthByte = if ($s -ge 256) { [byte]0 } else { [byte]$s }
        $heightByte = if ($s -ge 256) { [byte]0 } else { [byte]$s }

        $bw.Write($widthByte)       # Width
        $bw.Write($heightByte)      # Height
        $bw.Write([byte]0)          # ColorCount
        $bw.Write([byte]0)          # Reserved
        $bw.Write([uint16]1)        # Planes
        $bw.Write([uint16]32)       # BitCount (32-bit)
        $bw.Write([uint32]$bytes.Length) # SizeInBytes
        $bw.Write([uint32]$offset)  # Offset

        $offset += $bytes.Length
    }

    # Write Image Data (PNGs)
    foreach ($item in $imgList) {
        $bytes = $item[1]
        $bw.Write($bytes)
    }

    $bw.Flush()
    $bw.Close()
    $fs.Close()
}

$launcherIco = Join-Path (Get-Location) "launcher\app.ico"
$installerIco = Join-Path (Get-Location) "installer\app.ico"
$publicIco = Join-Path (Get-Location) "public\assets\favicon.ico"

Save-Ico $launcherIco $imagesData
Save-Ico $installerIco $imagesData
Save-Ico $publicIco $imagesData

Write-Host "Icons generated successfully at:"
Write-Host " - $launcherIco ($( (Get-Item $launcherIco).Length ) bytes)"
Write-Host " - $installerIco ($( (Get-Item $installerIco).Length ) bytes)"
Write-Host " - $publicIco ($( (Get-Item $publicIco).Length ) bytes)"
