Add-Type -AssemblyName System.Drawing

function Compress-Image ($src, $maxDim) {
    if (-not (Test-Path $src)) { return }
    $img = [System.Drawing.Bitmap]::FromFile($src)
    $origW = $img.Width
    $origH = $img.Height

    $scale = 1.0
    if ($origW -gt $maxDim -or $origH -gt $maxDim) {
        if ($origW -ge $origH) {
            $scale = $maxDim / $origW
        } else {
            $scale = $maxDim / $origH
        }
    }

    $newW = [int]($origW * $scale)
    $newH = [int]($origH * $scale)

    $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $newW, $newH)

    $img.Dispose()
    $g.Dispose()

    $tempPath = $src + ".tmp.png"
    $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Remove-Item $src -Force
    Rename-Item $tempPath $src -Force
    Write-Output "Compressed $src to $newW x $newH"
}

Compress-Image "c:\MehndiGo\mobile\assets\images\o1.png" 720
Compress-Image "c:\MehndiGo\mobile\assets\images\q.png" 720
Compress-Image "c:\MehndiGo\mobile\assets\images\adaptive-icon.png" 512
Compress-Image "c:\MehndiGo\mobile\assets\images\splash-icon.png" 512
Compress-Image "c:\MehndiGo\mobile\assets\images\logo-glow.png" 512
