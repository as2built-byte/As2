@echo off
echo 🔧 REACTIVATION FIREBASE + CORRECTION CONFIG...

REM 1. Reactiver Firebase
echo 1. Reactivation de Firebase...
if exist "plugins\firebase.client.ts.disabled" ren "plugins\firebase.client.ts.disabled" "firebase.client.ts"

REM 2. Nettoyage
echo 2. Nettoyage des caches...
if exist ".nuxt" rmdir /s /q ".nuxt"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM 3. Regeneration
echo 3. Regeneration...
npx nuxt prepare

echo.
echo ✅ FIREBASE REACTIVE + CONFIG CORRIGEE !
echo.
echo Maintenant:
echo 1. Redemarre: npm run dev
echo 2. Firebase est de nouveau actif
echo 3. La configuration est correcte
echo.
pause
