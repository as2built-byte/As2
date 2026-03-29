@echo off
echo 🔥 CRÉATION MANUELLE DES FICHIERS MANQUANTS

REM 1. Créer le dossier .nuxt s'il n'existe pas
if not exist ".nuxt" mkdir ".nuxt"

REM 2. Créer tsconfig.app.json
echo 2. Création de tsconfig.app.json...
(
echo {
echo   "extends": "./tsconfig.json",
echo   "include": [
echo     "**/*.js",
echo     "**/*.mjs",
echo     "**/*.ts",
echo     "**/*.vue",
echo     "**/*.json"
echo   ],
echo   "exclude": [
echo     "node_modules",
echo     ".nuxt",
echo     "dist"
echo   ],
echo   "compilerOptions": {
echo     "target": "ESNext",
echo     "module": "ESNext",
echo     "moduleResolution": "bundler",
echo     "allowImportingTsExtensions": true,
echo     "resolveJsonModule": true,
echo     "isolatedModules": true,
echo     "noEmit": true,
echo     "jsx": "preserve",
echo     "strict": false,
echo     "noUnusedLocals": false,
echo     "noUnusedParameters": false,
echo     "noFallthroughCasesInSwitch": true,
echo     "skipLibCheck": true,
echo     "types": [
echo       "@nuxt/types",
echo       "@types/node"
echo     ]
echo   }
echo }
) > ".nuxt\tsconfig.app.json"

REM 3. Créer le dossier temp pour #app-manifest
echo 3. Création du dossier temp...
if not exist ".nuxt\temp" mkdir ".nuxt\temp"

REM 4. Créer un fichier manifest vide
echo 4. Création du manifest vide...
echo {} > ".nuxt\temp\app-manifest.js"

echo.
echo 🔥 FICHIERS CRÉÉS MANUELLEMENT !
echo.
echo Fichiers créés:
echo ✅ .nuxt\tsconfig.app.json
echo ✅ .nuxt\temp\app-manifest.js
echo.
echo Maintenant:
echo 1. Arrête le serveur (Ctrl+C)
echo 2. Relance: npm run dev
echo.
echo Les erreurs devraient disparaitre !
echo.
pause
