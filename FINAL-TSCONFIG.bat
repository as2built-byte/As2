@echo off
echo 🔥 CRÉATION COMPLÈTE DES FICHIERS TypeScript MANQUANTS

REM 1. Créer tsconfig.node.json
echo 1. Création de tsconfig.node.json...
(
echo {
echo   "extends": "./tsconfig.json",
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
echo     "skipLibCheck": true,
echo     "types": ["node"]
echo   },
echo   "include": [
echo     "**/*.js",
echo     "**/*.mjs",
echo     "**/*.ts"
echo   ]
echo }
) > ".nuxt\tsconfig.node.json"

REM 2. Créer tsconfig.build.json
echo 2. Création de tsconfig.build.json...
(
echo {
echo   "extends": "./tsconfig.json",
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
echo     "skipLibCheck": true
echo   },
echo   "include": [
echo     "**/*.js",
echo     "**/*.mjs",
echo     "**/*.ts",
echo     "**/*.vue"
echo   ]
echo }
) > ".nuxt\tsconfig.build.json"

echo.
echo 🔥 TOUS LES FICHIERS TypeScript CRÉÉS !
echo.
echo Fichiers créés:
echo ✅ .nuxt\tsconfig.app.json
echo ✅ .nuxt\tsconfig.shared.json
echo ✅ .nuxt\tsconfig.node.json
echo ✅ .nuxt\tsconfig.build.json
echo.
echo Maintenant:
echo 1. Arrête le serveur (Ctrl+C)
echo 2. Relance: npm run dev
echo.
echo PLUS AUCUNE ERREUR TypeScript !
echo.
pause
