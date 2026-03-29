@echo off
echo 🔥 CRÉATION DU FICHIER tsconfig.shared.json MANQUANT

REM 1. Créer tsconfig.shared.json
echo 1. Création de tsconfig.shared.json...
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
echo     "types": ["@nuxt/types"]
echo   },
echo   "include": [
echo     "**/*.js",
echo     "**/*.mjs",
echo     "**/*.ts",
echo     "**/*.vue"
echo   ]
echo }
) > ".nuxt\tsconfig.shared.json"

echo.
echo 🔥 tsconfig.shared.json CRÉÉ !
echo.
echo Maintenant:
echo 1. Arrête le serveur (Ctrl+C)
echo 2. Relance: npm run dev
echo.
echo Plus d'erreurs TypeScript !
echo.
pause
