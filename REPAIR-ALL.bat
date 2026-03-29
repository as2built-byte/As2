@echo off
echo 🔧 REPARATION COMPLETE DE L'APPLICATION...

REM 1. Arrêter le serveur
echo.
echo 1. ARRETE le serveur (Ctrl+C dans ton terminal)
pause

REM 2. Nettoyage complet
echo 2. Nettoyage complet...
if exist ".nuxt" rmdir /s /q ".nuxt"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM 3. Desactiver Firebase
echo 3. Desactivation de Firebase...
if exist "plugins\firebase.client.ts" ren "plugins\firebase.client.ts" "firebase.client.ts.disabled"

REM 4. Page d'accueil simple
echo 4. Configuration minimale appliquee

REM 5. Regeneration
echo 5. Regeneration des fichiers...
npx nuxt prepare

echo.
echo ✅ REPARATION TERMINEE !
echo.
echo Maintenant:
echo 1. Redemarre le serveur: npm run dev
echo 2. Attends le demarrage
echo 3. Ouvre: http://localhost:3000/
echo.
echo Tu devrais voir la page AS2BUILT sans erreur 500 !
echo.
pause
