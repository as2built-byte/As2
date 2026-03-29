@echo off
echo 🎯 CONFIGURATION INTERFACE - Pages et Layouts

REM 1. Creer app.vue a la racine si necessaire
echo 1. Verification de app.vue...
if not exist "app.vue" (
  echo Creer app.vue a la racine...
  (
  echo ^<template^>
  echo   ^<div^>
  echo     ^<NuxtLayout^>
  echo       ^<NuxtPage /^>
  echo     ^</NuxtLayout^>
  echo   ^</div^>
  echo ^</template^>
  ) > app.vue
)

REM 2. Nettoyage pour appliquer srcDir
echo 2. Nettoyage pour appliquer srcDir...
if exist ".nuxt" rmdir /s /q ".nuxt"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM 3. Regeneration
echo 3. Regeneration avec srcDir...
npx nuxt prepare

echo.
echo 🎯 INTERFACE CONFIGURÉE !
echo.
echo Modifications effectuees:
echo ✅ srcDir: 'app' ajoute dans nuxt.config.ts
echo ✅ app/app.vue: deja correct avec NuxtLayout/NuxtPage
echo ✅ app.vue: cree a la racine si necessaire
echo ✅ Nuxt pointe maintenant vers app/pages/
echo.
echo Redemarre le serveur: npm run dev
echo Tu devrais voir ta page AS2BUILT maintenant !
echo.
pause
