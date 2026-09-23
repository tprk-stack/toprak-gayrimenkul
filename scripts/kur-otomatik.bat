@echo off
REM Toprak Gayrimenkul - Otomatik ilan senkronunu her gun 09:00'da calistirir.
REM Cift tiklayin, yonetici izni isterse onaylayin. Kurulum bir kez yapilir.
setlocal
cd /d "%~dp0.."
set TASKNAME=ToprakIlanSync
set SCRIPT="%CD%\scripts\oto-sync.mjs"
set LOGDIR=%LOCALAPPDATA%\ToprakIlanSync
if not exist "%LOGDIR%" mkdir "%LOGDIR%"

REM Node yolunu bul
where node > "%TEMP%\nodepath.txt" 2>nul
set /p NODE=<"%TEMP%\nodepath.txt"
del "%TEMP%\nodepath.txt"

REM Her gun 09:00, sessiz mod, cikti log dosyasina
schtasks /create /tn "%TASKNAME%" /f /sc daily /st 09:00 ^
  /tr "\"%NODE%\" %SCRIPT% --sessiz ^>^> \"%LOGDIR%\sync.log\" 2^>^&1" >nul 2>&1

if %errorlevel%==0 (
  echo [OK] Zamanlanmis gorev kuruldu: %TASKNAME% - her gun 09:00
  echo Log: %LOGDIR%\sync.log
) else (
  echo [HATA] Gorev kurulamadi. Bu dosyaya sag tiklayip "Yonetici olarak calistir" deyin.
)
echo.
echo Ilk senkronu simdi baslatmak icin: npm run ilan:oto
pause
