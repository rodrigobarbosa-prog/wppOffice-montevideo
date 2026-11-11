Add-Type -AssemblyName System.Drawing
$projectRoot=Split-Path -Parent $PSScriptRoot
$rows=@(
 @{ id='25'; title='Pared WPP / impresora'; before='25-pared-wpp-antes.png'; photo='25-pared-wpp-impresora.jpg'; after='25-pared-wpp-despues.png' },
 @{ id='26'; title='Hall: acceso y banos'; before='26-hall-banos-antes.png'; photo='26-hall-banos-accesos.jpg'; after='26-hall-banos-despues.png' },
 @{ id='27'; title='Hall: ascensores y espejos'; before='27-hall-espejos-antes.png'; photo='27-hall-ascensores-espejos.jpg'; after='27-hall-espejos-despues.png' }
)
$width=1860; $rowHeight=700
$sheet=[Drawing.Bitmap]::new($width,$rowHeight*3)
$g=[Drawing.Graphics]::FromImage($sheet)
$g.Clear([Drawing.Color]::FromArgb(238,239,233))
$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$headerFont=[Drawing.Font]::new('Arial',22,[Drawing.FontStyle]::Bold)
$labelFont=[Drawing.Font]::new('Arial',15,[Drawing.FontStyle]::Bold)
for($r=0;$r -lt $rows.Count;$r++){
 $row=$rows[$r]; $top=$r*$rowHeight
 $g.FillRectangle([Drawing.Brushes]::DarkSlateGray,0,$top,$width,50)
 $g.DrawString($row.title,$headerFont,[Drawing.Brushes]::White,20,($top+9))
 $sources=@(
  @{ label='CAPTURA ANTERIOR'; path=(Join-Path $projectRoot ('artifacts/'+$row.before)) },
  @{ label='FOTO REAL'; path=(Join-Path $projectRoot ('assets/references/'+$row.photo)) },
  @{ label='MODELO CORREGIDO'; path=(Join-Path $projectRoot ('artifacts/'+$row.after)) }
 )
 for($col=0;$col -lt 3;$col++){
  $left=20+$col*615
  $g.DrawString($sources[$col].label,$labelFont,[Drawing.Brushes]::DarkSlateGray,$left,($top+65))
  $im=[Drawing.Image]::FromFile($sources[$col].path)
  if($im.PropertyIdList -contains 274){
   $orientation=[BitConverter]::ToUInt16($im.GetPropertyItem(274).Value,0)
   if($orientation -eq 6){$im.RotateFlip([Drawing.RotateFlipType]::Rotate90FlipNone)}
   elseif($orientation -eq 8){$im.RotateFlip([Drawing.RotateFlipType]::Rotate270FlipNone)}
   elseif($orientation -eq 3){$im.RotateFlip([Drawing.RotateFlipType]::Rotate180FlipNone)}
  }
  $factor=[Math]::Min(595.0/$im.Width,580.0/$im.Height)
  $w=[int]($im.Width*$factor);$h=[int]($im.Height*$factor)
  $x=$left+[int]((595-$w)/2);$y=$top+100+[int]((580-$h)/2)
  $g.DrawImage($im,$x,$y,$w,$h);$im.Dispose()
 }
}
$sheet.Save((Join-Path $projectRoot 'artifacts/comparacion-pasillos-25-27.png'),[Drawing.Imaging.ImageFormat]::Png)
$labelFont.Dispose();$headerFont.Dispose();$g.Dispose();$sheet.Dispose()

