@echo off
echo 🔥 MISSION FINALE - Nettoyage complet

REM 1. Supprimer l'ancien plugin TypeScript
echo 1. Suppression de l'ancien plugin TypeScript...
if exist "app\plugins\firebase.client.ts" del "app\plugins\firebase.client.ts"

REM 2. Supprimer app.vue a la racine (garde app/app.vue)
echo 2. Suppression du doublon app.vue...
if exist "app.vue" del "app.vue"

REM 3. Nettoyage complet des caches
echo 3. Nettoyage complet...
if exist ".nuxt" rmdir /s /q ".nuxt"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM 4. Regeneration forcee
echo 4. Regeneration forcee...
npx nuxt prepare

echo.
echo 🔥 MISSION ACCOMPLIE !
echo.
echo Corrections effectuees:
echo ✅ Ligne 420: ref<Record<...> -> ref({})
echo ✅ Plugin: app/plugins/firebase.client.ts -> .js
echo ✅ Doublons: app.vue racine supprime
echo ✅ Overlay: HMR desactive dans nuxt.config.ts
echo ✅ Firebase: 100% JavaScript
echo.
echo Maintenant:
echo 1. Arrete le serveur (Ctrl+C)
echo 2. Relance: npm run dev
echo 3. Ouvre: http://localhost:3000/
echo.
echo L'interface AS2BUILT devrait s'afficher !
echo.
pause
