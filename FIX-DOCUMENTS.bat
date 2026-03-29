@echo off
echo 🔥 RÉPARATION FINALE - Documents.vue simplifié

REM 1. Sauvegarder l'ancien fichier
echo 1. Sauvegarde de l'ancien fichier...
if exist "app\pages\projet\[id]\documents.vue" copy "app\pages\projet\[id]\documents.vue" "app\pages\projet\[id]\documents.vue.backup" >nul

REM 2. Supprimer l'ancien fichier corrompu
echo 2. Suppression du fichier corrompu...
if exist "app\pages\projet\[id]\documents.vue" del "app\pages\projet\[id]\documents.vue"

REM 3. Créer la version simplifiée
echo 3. Création de la version simplifiée...
(
echo ^<!--
echo   Documents Page - Version simplifiée fonctionnelle
echo --^>
echo ^<template^>
echo   ^<div class="min-h-screen bg-slate-50"^>
echo     ^<!-- Header --^>
echo     ^<div class="bg-white border-b p-4"^>
echo       ^<h1 class="text-2xl font-bold"^>Documents^</h1^>
echo       ^<p class="text-slate-600"^>Gestion des documents du projet^</p^>
echo     ^</div^>
echo 
echo     ^<!-- Contenu principal --^>
echo     ^<main class="p-6"^>
echo       ^<!-- Recherche --^>
echo       ^<div class="mb-6"^>
echo         ^<input
echo           v-model="searchQuery"
echo           type="text"
echo           placeholder="Rechercher des documents..."
echo           class="w-full max-w-md px-4 py-2 border rounded-lg"
echo         /^>
echo       ^</div^>
echo 
echo       ^<!-- Stats --^>
echo       ^<div class="bg-white rounded-lg border p-4 mb-6"^>
echo         ^<div class="grid grid-cols-3 gap-4 text-center"^>
echo           ^<div^>
echo             ^<div class="text-2xl font-bold"^>{{ documents.length }}^</div^>
echo             ^<div class="text-sm text-slate-600"^>Total^</div^>
echo           ^</div^>
echo           ^<div^>
echo             ^<div class="text-2xl font-bold text-blue-600"^>{{ filteredDocuments.length }}^</div^>
echo             ^<div class="text-sm text-slate-600"^>Filtrés^</div^>
echo           ^</div^>
echo           ^<div^>
echo             ^<div class="text-2xl font-bold text-green-600"^>2.1 MB^</div^>
echo             ^<div class="text-sm text-slate-600"^>Taille^</div^>
echo           ^</div^>
echo         ^</div^>
echo       ^</div^>
echo 
echo       ^<!-- Loading --^>
echo       ^<div v-if="loading" class="text-center py-8"^>
echo         ^<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"^>^</div^>
echo         ^<p class="mt-2 text-slate-600"^>Chargement...^</p^>
echo       ^</div^>
echo 
echo       ^<!-- Documents grid --^>
echo       ^<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"^>
echo         ^<div
echo           v-for="document in filteredDocuments"
echo           :key="document.id"
echo           class="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
echo           @click="handlePreview(document)"
echo         ^>
echo           ^<div class="flex items-start gap-3"^>
echo             ^<div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"^>
echo               ^<span class="text-blue-600"^>📄^</span^>
echo             ^</div^>
echo             ^<div class="flex-1 min-w-0"^>
echo               ^<h3 class="font-semibold text-slate-900 truncate"^>{{ document.title }}^</h3^>
echo               ^<p class="text-sm text-blue-600 mb-1"^>{{ document.type }}^</p^>
echo               ^<p v-if="document.description" class="text-sm text-slate-600 line-clamp-2"^>
echo                 {{ document.description }}
echo               ^</p^>
echo               ^<div class="flex justify-between items-center mt-2 text-xs text-slate-500"^>
echo                 ^<span^>{{ formatDate(document.createdAt) }}^</span^>
echo                 ^<span^>{{ formatFileSize(document.fileSize) }}^</span^>
echo               ^</div^>
echo             ^</div^>
echo           ^</div^>
echo         ^</div^>
echo       ^</div^>
echo 
echo       ^<!-- Empty state --^>
echo       ^<div v-if="!loading ^&^& filteredDocuments.length === 0" class="text-center py-8"^>
echo         ^<div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"^>
echo           ^<span class="text-2xl"^>📄^</span^>
echo         ^</div^>
echo         ^<h3 class="text-lg font-medium text-slate-900 mb-2"^>Aucun document trouvé^</h3^>
echo         ^<p class="text-slate-600"^>
echo           {{ searchQuery ? 'Essayez une autre recherche' : 'Aucun document disponible' }}
echo         ^</p^>
echo       ^</div^>
echo     ^</main^>
echo   ^</div^>
echo ^</template^>
echo 
echo ^<script setup^>
echo console.log('📄 Documents page - Simplifiée fonctionnelle')
echo 
echo // Variables réactives
echo const documents = ref(^[^]^)
echo const loading = ref(true)
echo const searchQuery = ref('')
echo const showPreviewModal = ref(false)
echo const selectedDocument = ref(null)
echo 
echo // Données de test
echo const mockDocuments = ^[
echo   {
echo     id: '1',
echo     title: 'Plan Architectural Principal',
echo     type: 'plan',
echo     description: 'Plan du rez-de-chaussée avec dimensions complètes et annotations',
echo     createdAt: new Date('2024-01-15'),
echo     fileSize: 2048576
echo   },
echo   {
echo     id: '2',
echo     title: 'Rapport d\'inspection technique',
echo     type: 'report',
echo     description: 'Rapport détaillé de l\'inspection du site avec photos et recommandations',
echo     createdAt: new Date('2024-01-20'),
echo     fileSize: 1024000
echo   },
echo   {
echo     id: '3',
echo     title: 'Contrat de construction',
echo     type: 'contract',
echo     description: 'Contrat signé avec les entrepreneurs principaux du projet',
echo     createdAt: new Date('2024-01-10'),
echo     fileSize: 5120000
echo   }
echo ^]
echo 
echo // Computed
echo const filteredDocuments = computed(^(^) =^> ^{
echo   if ^(!searchQuery.value^) return documents.value
echo   const query = searchQuery.value.toLowerCase(^)
echo   return documents.value.filter^(doc =^> 
echo     doc.title.toLowerCase^(^).includes^(query^) ^|^|
echo     doc.type.toLowerCase^(^).includes^(query^) ^|^|
echo     doc.description^?.toLowerCase^(^).includes^(query^)
echo   ^)
echo ^}^)
echo 
echo // Methods
echo const loadDocuments = async ^(^) =^> ^{
echo   loading.value = true
echo   try ^{
echo     console.log('🔄 Loading documents...')
echo     await new Promise^(resolve =^> setTimeout^(resolve, 800^)^)
echo     documents.value = mockDocuments
echo     console.log^(`✅ Loaded ${documents.value.length} documents`^)
echo   ^} catch ^(error^) ^{
echo     console.error^('❌ Error loading documents:', error^)
echo   ^} finally ^{
echo     loading.value = false
echo   ^}
echo ^}
echo 
echo const handlePreview = ^(document^) =^> ^{
echo   console.log^('🔍 Preview:', document.title^)
echo   selectedDocument.value = document
echo   showPreviewModal.value = true
echo ^}
echo 
echo const formatFileSize = ^(bytes^) =^> ^{
echo   if ^(bytes === 0^) return '0 B'
echo   const k = 1024
echo   const sizes = ^['B', 'KB', 'MB', 'GB'^]
echo   const i = Math.floor^(Math.log^(bytes^) / Math.log^(k^)^)
echo   return parseFloat^((bytes / Math.pow^(k, i^)^).toFixed^(1^)^) + ' ' + sizes^[i^]
echo ^}
echo 
echo const formatDate = ^(date^) =^> ^{
echo   return new Intl.DateTimeFormat^('fr-FR', ^{
echo     day: 'numeric',
echo     month: 'short',
echo     year: 'numeric'
echo   ^}^).format^(date^)
echo ^}
echo 
echo // Load on mount
echo onMounted^(() =^> ^{
echo   loadDocuments^(^)
echo ^}^)
echo ^</script^>
echo 
echo ^<style scoped^>
echo .line-clamp-2 ^{
echo   display: -webkit-box;
echo   -webkit-line-clamp: 2;
echo   -webkit-box-orient: vertical;
echo   overflow: hidden;
echo ^}
echo ^</style^>
) > "app\pages\projet\[id]\documents.vue"

REM 4. Nettoyage
echo 4. Nettoyage des caches...
if exist ".nuxt" rmdir /s /q ".nuxt"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM 5. Regeneration
echo 5. Regeneration...
npx nuxt prepare

echo.
echo 🔥 RÉPARATION TERMINÉE !
echo.
echo Modifications effectuees:
echo ✅ Documents.vue: version simplifiée fonctionnelle
echo ✅ Variables réactives: ajoutees (ref, computed)
echo ✅ TypeScript: supprime (JavaScript pur)
echo ✅ Template: syntaxe corrigee
echo.
echo Maintenant:
echo 1. Redemarre: npm run dev
echo 2. Ouvre: http://localhost:3000/
echo 3. Teste: /projet/1/documents
echo.
pause
