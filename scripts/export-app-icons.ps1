# Export platform icon sizes from the approved app logo. Run from any directory.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path $PSScriptRoot -Parent
$source = [System.Drawing.Image]::FromFile((Join-Path $projectRoot 'public/icon-512.png'))
$navy = [System.Drawing.ColorTranslator]::FromHtml('#001138')
function Export-AppIcon([string]$RelativePath, [int]$Size, [bool]$Opaque = $false, [double]$Scale = 1.0) {
    $destination = Join-Path $projectRoot $RelativePath
    [IO.Directory]::CreateDirectory((Split-Path $destination -Parent)) | Out-Null
    $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        if ($Opaque) { $graphics.Clear($navy) } else { $graphics.Clear([System.Drawing.Color]::Transparent) }
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $edge = [int][Math]::Round($Size * $Scale)
        $offset = [int][Math]::Round(($Size - $edge) / 2)
        $graphics.DrawImage($source, $offset, $offset, $edge, $edge)
        $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}
try {
    foreach ($density in @(
        @{ Name = 'mdpi'; Ratio = 1 },
        @{ Name = 'hdpi'; Ratio = 1.5 },
        @{ Name = 'xhdpi'; Ratio = 2 },
        @{ Name = 'xxhdpi'; Ratio = 3 },
        @{ Name = 'xxxhdpi'; Ratio = 4 }
    )) {
        $folder = "android/app/src/main/res/mipmap-$($density.Name)"
        $legacySize = [int](48 * $density.Ratio)
        Export-AppIcon "$folder/ic_launcher.png" $legacySize
        Export-AppIcon "$folder/ic_launcher_round.png" $legacySize
        # Adaptive layers are 108dp; keep the complete mark inside the safe region.
        Export-AppIcon "$folder/ic_launcher_foreground.png" ([int](108 * $density.Ratio)) $false (84.0 / 108)
    }
    Export-AppIcon 'public/favicon-16.png' 16
    Export-AppIcon 'public/favicon-32.png' 32
    Export-AppIcon 'public/apple-touch-icon.png' 180 $true
    Export-AppIcon 'public/icon-maskable-512.png' 512 $true
} finally {
    $source.Dispose()
}
Write-Output 'Android and web icons exported from public/icon-512.png.'
