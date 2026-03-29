@echo off
echo Suppression complete du fichier corrompu...

REM Forcer la suppression
del /f /q "app\pages\index.vue" 2>nul

REM Copier la version finale
copy /y "app\pages\index-final.vue" "app\pages\index.vue" >nul 2>&1

echo.
echo ✅ Page d'accueil AS2BUILT finalisee !
echo.
echo Rafraichis: http://localhost:3000/
echo.
pause
