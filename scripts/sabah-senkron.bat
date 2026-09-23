@echo off
REM Toprak sabah senkronu: eklentinin indirdigi dosyalari siteye yerlestirir,
REM degisiklik varsa repoya gonderir (canli site otomatik guncellenir).
REM Zamanlanmis gorevle her sabah 08:30'da calisir; cift tiklayarak da calistirilir.
setlocal
set "REPO=C:\Users\HOME\Downloads\wbs"
set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;%PATH%"
set "LOGDIR=%LOCALAPPDATA%\ToprakIlanSync"
if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>&1
set "LOG=%LOGDIR%\sabah-sync.log"
cd /d "%REPO%" || (echo [%date% %time%] repo bulunamadi >> "%LOG%" & exit /b 1)
set "SRC=%USERPROFILE%\Downloads\toprak-senkron\ilanlar.json"
set "SRCDIR=%USERPROFILE%\Downloads\toprak-senkron"
echo [%date% %time%] basladi >> "%LOG%"

powershell -NoProfile -Command "$f='%SRC%'; if(!(Test-Path $f)){exit 1}; if((Get-Item $f).LastWriteTime.Date -ne (Get-Date).Date){exit 2}"
if errorlevel 2 (
  echo [%date% %time%] bugunku dosya yok, eski veri korundu >> "%LOG%"
  exit /b 0
)
if errorlevel 1 (
  echo [%date% %time%] dosya yok, eski veri korundu >> "%LOG%"
  exit /b 0
)

node scripts\dogrula.mjs "%SRC%" "%SRCDIR%" >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [%date% %time%] dogrulama basarisiz >> "%LOG%"
  exit /b 0
)
git add public\ilanlar.json public\ilan-images >> "%LOG%" 2>&1
git diff --cached --quiet
if not errorlevel 1 (
  echo [%date% %time%] degisiklik yok >> "%LOG%"
  exit /b 0
)
git -c user.name=tprk-stack -c user.email=tprk-stack@users.noreply.github.com commit -m "Sabah ilan senkronu" >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [%date% %time%] push basarisiz >> "%LOG%"
  exit /b 1
)
echo [%date% %time%] tamamlandi, canli site guncelleniyor >> "%LOG%"
exit /b 0
