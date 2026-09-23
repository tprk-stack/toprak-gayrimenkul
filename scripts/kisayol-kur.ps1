# Tek tik kisayollari: masaustu simgesi + bilgisayar acilisinda otomatik baslatma.
# Kullanim: powershell -ExecutionPolicy Bypass -File kisayol-kur.ps1 -Repo "C:\yol\repo"
param([string]$Repo = (Get-Location).Path)
$hedef = Join-Path $Repo 'scripts\sabah-senkron.bat'
$w = New-Object -ComObject WScript.Shell
$acilis = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\ToprakSabahSenkron.lnk'
$s = $w.CreateShortcut($acilis)
$s.TargetPath = $hedef
$s.WorkingDirectory = $Repo
$s.Description = 'Her acilista ilan senkronu'
$s.Save()
$mase = Join-Path $env:USERPROFILE 'Desktop\Toprak Sabah Senkron.lnk'
$d = $w.CreateShortcut($mase)
$d.TargetPath = $hedef
$d.WorkingDirectory = $Repo
$d.Save()
Write-Output 'kisayollar-tamam'
