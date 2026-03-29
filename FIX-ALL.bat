@echo off
echo 🔧 REPARATION COMPLETE - TAILWIND + FIREBASE

REM 1. Creer le dossier assets/css s'il n'existe pas
if not exist "assets" mkdir "assets"
if not exist "assets\css" mkdir "assets\css"

REM 2. Nettoyage profond
echo 2. Nettoyage profond...
if exist ".nuxt" rmdir /s /q ".nuxt"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM 3. Reactiver Firebase
echo 3. Reactivation de Firebase...
if exist "plugins\firebase.client.ts.disabled" ren "plugins\firebase.client.ts.disabled" "firebase.client.ts"

REM 4. Regeneration
echo 4. Regeneration complete...
npx nuxt prepare

echo.
echo ✅ REPARATION TERMINEE !
echo.
echo Corrections effectuees:
echo - Fichier tailwind.css cree
echo - Module @nuxt/icon retire (incompatible)
echo - Configuration Nuxt simplifiee
echo - Firebase reactif
echo - Limites de plans preservees
echo.
echo Lance maintenant: npm run dev
echo.
pause
