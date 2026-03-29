# Script de nettoyage des fichiers temporaires et dupliqués
$folderPath = "app\pages\projet\[id]"
Set-Location $folderPath

# Supprimer les fichiers problématiques
Remove-Item "coûts.vue" -Force -ErrorAction SilentlyContinue
Remove-Item "planning_end.vue" -Force -ErrorAction SilentlyContinue  
Remove-Item "planning_fix.vue" -Force -ErrorAction SilentlyContinue

Write-Host "Nettoyage terminé!" -ForegroundColor Green
Write-Host "Fichiers supprimés: coûts.vue, planning_end.vue, planning_fix.vue" -ForegroundColor Yellow
