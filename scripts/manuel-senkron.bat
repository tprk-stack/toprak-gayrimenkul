@echo off
REM TEK TIKLA manuel senkron: magaza sayfasini acar, indirmenin bitmesini
REM bekler, sonra siteye isleyip degisiklik varsa canliya gonderir.
setlocal
set "REPO=C:\Users\HOME\Downloads\wbs"
set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;%PATH%"
cd /d "%REPO%" || (echo repo bulunamadi & pause & exit /b 1)
echo Magaza sayfasi aciliyor, tarama baslayacak. Lutfen sekmeyi kapatmayin.
start "" "https://sivastoprakgayrimenkulsivas.sahibinden.com/#toprak-oto"
node scripts\bekle-indirme.mjs 12
if errorlevel 1 (
  echo Zaman asimi: indirme tamamlanamadi, eski veri korundu.
  pause
  exit /b 0
)
call "%REPO%\scripts\sabah-senkron.bat"
pause
