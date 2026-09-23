@echo off
REM Sabah senkronu kurulumu:
REM  1) git kimlik yardimcisi (push icin giris bilgisi)
REM  2) her sabah 08:30 zamanlanmis gorevi
REM Eklenti kurulumu ayrica Chrome'da bir kez elle yapilir (asagidaki adimlar yazdirilir).
setlocal
set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;%PATH%"
set "REPO=C:\Users\HOME\Downloads\wbs"
set "TASKNAME=ToprakSabahSenkron"
set "LOGDIR=%LOCALAPPDATA%\ToprakIlanSync"
if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>&1

echo [1/2] git, giris yapan hesabi kullanacak sekilde ayarlaniyor...
gh auth setup-git --hostname github.com >nul 2>&1
if errorlevel 1 (
  echo UYARI: gh girisi bulunamadi. Once "gh auth login" ile giris yapin.
)

echo [2/2] zamanlanmis gorev kuruluyor: her sabah 08:30...
schtasks /create /tn "%TASKNAME%" /f /sc daily /st 08:30 /tr "\"%REPO%\scripts\sabah-senkron.bat\"" >nul 2>&1
if %errorlevel%==0 (
  echo [OK] Kuruldu: %TASKNAME% - her sabah 08:30
  echo Log: %LOGDIR%\sabah-sync.log
) else (
  echo [HATA] Gorev kurulamadi. Bu dosyaya sag tiklayip "Yonetici olarak calistir" deyin.
)

echo [3/3] tek tik kisayollari olusturuluyor (masaustu + bilgisayar acilisi)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO%\scripts\kisayol-kur.ps1" -Repo "%REPO%" 2>&1 | findstr /c:"kisayollar-tamam" >nul 2>&1
if %errorlevel%==0 (
  echo [OK] Masaustunde "Toprak Sabah Senkron" simgesi + acilista otomatik baslatma kuruldu.
) else (
  echo [UYARI] Kisayol kurulamadi, zamanlanmis gorev yine de calisir.
)

echo.
echo ============================================================
echo EKLENTI KURULUMU (Chrome'da bir kez, 1 dakika):
echo  1. Chrome'da chrome://extensions adresini acin
echo  2. Sag ustte "Gelistirici modu"nu ACIN
echo  3. "Paketlenmemis oge yukle"ye tiklayin
echo  4. Su klasoru secin: %REPO%\scripts\uzanti
echo  5. Magaza sayfasini NORMAL sekmede acik birakin
echo Eklenti her sabah 08:00'de sayfayi kendisi acar ve toplar.
echo ============================================================
pause
