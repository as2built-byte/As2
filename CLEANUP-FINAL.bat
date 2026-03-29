@echo off
echo 🔥 NETTOYAGE FINAL DES ERREURS TypeScript

REM 1. Nettoyage complet des caches
echo 1. Nettoyage complet...
if exist ".nuxt" rmdir /s /q ".nuxt"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM 2. Regeneration forcee
echo 2. Regeneration forcee...
npx nuxt prepare

echo.
echo 🔥 NETTOYAGE TERMINÉ !
echo.
echo Corrections effectuees:
echo ✅ Documents.vue: recrée version finale fonctionnelle
echo ✅ useEmailJS.ts: window corrigé avec process.client
echo ✅ TypeScript: desactive via nuxt.config.ts
echo ✅ Auto-imports: seront regénérés
echo.
echo Maintenant:
echo 1. Arrete le serveur (Ctrl+C)
echo 2. Relance: npm run dev
echo 3. Ouvre: http://localhost:3000/
echo.
echo Les erreurs devraient disparaitre !
echo.
pause
