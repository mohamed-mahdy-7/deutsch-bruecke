# Generates the PWA icon set from the same geometry as the in-app LogoMark.
# Requires Windows PowerShell 5.1+ with System.Drawing (built into Windows).
param(
  [string]$OutputDir = (Join-Path $PSScriptRoot "..\public\icons")
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$null = New-Item -ItemType Directory -Force -Path $OutputDir

$primary = [System.Drawing.ColorTranslator]::FromHtml("#1f6f6d")
$accent = [System.Drawing.ColorTranslator]::FromHtml("#e08a3d")
$paper = [System.Drawing.ColorTranslator]::FromHtml("#fdf9f2")

function New-BrueckeIcon {
  param(
    [int]$Size,
    [string]$Path,
    [bool]$Rounded,
    [double]$MarkScale = 1.0
  )

  $bitmap = New-Object System.Drawing.Bitmap(
    $Size,
    $Size,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $backgroundBrush = New-Object System.Drawing.SolidBrush($primary)
  $paperBrush = New-Object System.Drawing.SolidBrush($paper)
  $accentBrush = New-Object System.Drawing.SolidBrush($accent)
  $pen = New-Object System.Drawing.Pen($paperBrush, 2.2)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $softPen = New-Object System.Drawing.Pen(
    (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(204, 253, 249, 242))),
    2.2
  )
  $softPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $softPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $baseScale = $Size / 48.0
  $graphics.ScaleTransform($baseScale, $baseScale)

  if ($Rounded) {
    $radius = 14.0
    $diameter = $radius * 2
    $shape = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shape.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $shape.AddArc(48 - $diameter, 0, $diameter, $diameter, 270, 90)
    $shape.AddArc(48 - $diameter, 48 - $diameter, $diameter, $diameter, 0, 90)
    $shape.AddArc(0, 48 - $diameter, $diameter, $diameter, 90, 90)
    $shape.CloseFigure()
    $graphics.FillPath($backgroundBrush, $shape)
    $shape.Dispose()
  }
  else {
    $graphics.FillRectangle($backgroundBrush, 0, 0, 48, 48)
  }

  $graphics.ResetTransform()
  $markScale = $baseScale * $MarkScale
  $offset = ($Size - (48 * $markScale)) / 2.0
  $graphics.TranslateTransform([single]$offset, [single]$offset)
  $graphics.ScaleTransform($markScale, $markScale)

  # Sun
  $graphics.FillEllipse($accentBrush, 20.8, 10.3, 6.4, 6.4)

  # Bridge deck and arch
  $graphics.DrawLine($pen, 9.5, 32.5, 38.5, 32.5)
  $graphics.DrawBezier($pen, 13, 32.5, 13, 25.5, 17.5, 20.5, 24, 20.5)
  $graphics.DrawBezier($pen, 24, 20.5, 30.5, 20.5, 35, 25.5, 35, 32.5)

  # Piers and water lines
  $graphics.DrawLine($pen, 17, 32.5, 17, 36.5)
  $graphics.DrawLine($pen, 31, 32.5, 31, 36.5)
  $graphics.DrawLine($softPen, 13, 36.5, 21, 36.5)
  $graphics.DrawLine($softPen, 27, 36.5, 35, 36.5)

  $graphics.ResetTransform()
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $pen.Dispose()
  $softPen.Dispose()
  $backgroundBrush.Dispose()
  $paperBrush.Dispose()
  $accentBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-BrueckeIcon -Size 192 -Path (Join-Path $OutputDir "icon-192.png") -Rounded $true
New-BrueckeIcon -Size 512 -Path (Join-Path $OutputDir "icon-512.png") -Rounded $true
New-BrueckeIcon -Size 512 -Path (Join-Path $OutputDir "icon-maskable-512.png") -Rounded $false -MarkScale 0.72
New-BrueckeIcon -Size 180 -Path (Join-Path $OutputDir "apple-touch-icon.png") -Rounded $false -MarkScale 0.86

Write-Host "Generated PWA icons in $OutputDir"
