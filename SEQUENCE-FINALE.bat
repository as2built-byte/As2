@echo off
echo 🔥 SÉQUENCE FINALE DE RÉPARATION

echo.
echo Étape 1: Installation des dépendances
npm install

echo.
echo Étape 2: Nettoyage complet Nuxt
npx nuxi cleanup

echo.
echo Étape 3: Régénération des fichiers de configuration
npx nuxi prepare

echo.
echo Étape 4: Démarrage du serveur
npm run dev

echo.
echo 🔥 SÉQUENCE TERMINÉE !
echo.
pause
