@echo off
echo 🔥 CORRECTION FINALE DES IMPORTS FIREBASE

REM 1. Supprimer les anciens fichiers TypeScript
echo 1. Suppression des anciens fichiers TypeScript...
if exist "plugins\firebase.client.ts" del "plugins\firebase.client.ts"
if exist "app\firebase\config.ts" del "app\firebase\config.ts"

REM 2. Nettoyage complet
echo 2. Nettoyage complet...
if exist ".nuxt" rmdir /s /q ".nuxt"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM 3. Regeneration
echo 3. Regeneration...
npx nuxt prepare

echo.
echo 🔥 FIREBASE CORRIGÉ EN JAVASCRIPT PUR !
echo.
echo Modifications effectuees:
echo ✅ Config: app/firebase/config.ts -> app/firebase/config.js
echo ✅ Plugin: plugins/firebase.client.ts -> plugins/firebase.client.js
echo ✅ Import: chemin relatif direct "../app/firebase/config"
echo ✅ Types: interface et types TypeScript supprimes
echo.
echo Lance maintenant: npm run dev
echo Firebase devrait fonctionner parfaitement !
echo.
pause
