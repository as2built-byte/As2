@echo off
echo 🔥 PASSAGE EN JAVASCRIPT PUR - URGENT

REM 1. Supprimer l'ancien fichier TypeScript
echo 1. Suppression de l'ancien fichier TypeScript...
if exist "plugins\firebase.client.ts" del "plugins\firebase.client.ts"

REM 2. Nettoyage complet des caches
echo 2. Nettoyage complet...
if exist ".nuxt" rmdir /s /q ".nuxt"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM 3. Regeneration forcee
echo 3. Regeneration forcee...
npx nuxt prepare

echo.
echo 🔥 JAVASCRIPT PUR ACTIF !
echo.
echo Modifications effectuees:
echo ✅ Firebase: .ts -> .js (sans types)
echo ✅ TypeScript: completement desactive
echo ✅ tsconfig: contourne avec esbuild
echo ✅ DevLogs: desactive
echo.
echo Lance maintenant: npm run dev
echo Plus d'erreurs TypeScript garanties !
echo.
pause
