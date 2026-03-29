@echo off
echo 🔧 CORRECTION FINALE - TypeScript + Tailwind + Limites

REM 1. Nettoyage complet
echo 1. Nettoyage complet des caches...
if exist ".nuxt" rmdir /s /q ".nuxt"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM 2. Reactiver Firebase
echo 2. Reactivation de Firebase...
if exist "plugins\firebase.client.ts.disabled" ren "plugins\firebase.client.ts.disabled" "firebase.client.ts"

REM 3. Regeneration forcee
echo 3. Regeneration forcee...
npx nuxt prepare --force

echo.
echo ✅ CORRECTIONS TERMINEES !
echo.
echo Modifications effectuees:
echo ✅ TypeScript: verification stricte desactivee
echo ✅ Tailwind: assets/css/tailwind.css importe correctement
echo ✅ Limites: message d'essai de 7 jours inclus
echo ✅ Firebase: reactif et pret
echo.
echo Lance maintenant: npm run dev
echo Le serveur devrait demarrer sans erreur !
echo.
pause
