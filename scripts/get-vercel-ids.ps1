# Script pour récupérer les IDs Vercel nécessaires au CI/CD
# Usage: .\scripts\get-vercel-ids.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Récupération des IDs Vercel pour CI/CD   " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Vercel CLI est installé
Write-Host "🔍 Vérification de Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI n'est pas installé." -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation en cours..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI installé avec succès!" -ForegroundColor Green
    Write-Host ""
}

# Vérifier la connexion Vercel
Write-Host "🔐 Vérification de la connexion Vercel..." -ForegroundColor Yellow
$vercelUser = vercel whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Non connecté à Vercel." -ForegroundColor Red
    Write-Host ""
    Write-Host "Connexion en cours..." -ForegroundColor Yellow
    vercel login
    $vercelUser = vercel whoami
}

Write-Host "✅ Connecté en tant que: $vercelUser" -ForegroundColor Green
Write-Host ""

# Récupérer les IDs depuis le fichier .vercel/project.json
$projectJsonPath = ".vercel/project.json"

if (Test-Path $projectJsonPath) {
    Write-Host "📄 Lecture du fichier .vercel/project.json..." -ForegroundColor Yellow
    $projectJson = Get-Content $projectJsonPath | ConvertFrom-Json
    
    $orgId = $projectJson.orgId
    $projectId = $projectJson.projectId
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "         📋 IDs RÉCUPÉRÉS AVEC SUCCÈS        " -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "🏢 VERCEL_ORG_ID:" -ForegroundColor Cyan
    Write-Host "   $orgId" -ForegroundColor White
    Write-Host ""
    
    Write-Host "📦 VERCEL_PROJECT_ID:" -ForegroundColor Cyan
    Write-Host "   $projectId" -ForegroundColor White
    Write-Host ""
    
    # Afficher les instructions
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host "   📝 PROCHAINES ÉTAPES - GitHub Secrets    " -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "1. Allez sur GitHub :" -ForegroundColor White
    Write-Host "   https://github.com/[votre-username]/ObsPOS/settings/secrets/actions" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "2. Cliquez sur 'New repository secret'" -ForegroundColor White
    Write-Host ""
    
    Write-Host "3. Ajoutez ces secrets :" -ForegroundColor White
    Write-Host ""
    
    Write-Host "   Secret : VERCEL_ORG_ID" -ForegroundColor Cyan
    Write-Host "   Valeur : $orgId" -ForegroundColor White
    Write-Host ""
    
    Write-Host "   Secret : VERCEL_PROJECT_ID" -ForegroundColor Cyan
    Write-Host "   Valeur : $projectId" -ForegroundColor White
    Write-Host ""
    
    Write-Host "4. Créez aussi un VERCEL_TOKEN :" -ForegroundColor White
    Write-Host "   - Allez sur https://vercel.com/account/tokens" -ForegroundColor Gray
    Write-Host "   - Cliquez sur 'Create Token'" -ForegroundColor Gray
    Write-Host "   - Nom : 'GitHub Actions PhonesPOS'" -ForegroundColor Gray
    Write-Host "   - Scope : Full Account" -ForegroundColor Gray
    Write-Host "   - Copiez le token" -ForegroundColor Gray
    Write-Host "   - Ajoutez-le comme secret VERCEL_TOKEN dans GitHub" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "5. Ajoutez également :" -ForegroundColor White
    Write-Host "   - VITE_SUPABASE_URL" -ForegroundColor Cyan
    Write-Host "   - VITE_SUPABASE_ANON_KEY" -ForegroundColor Cyan
    Write-Host ""
    
    # Copier dans le presse-papier (si possible)
    $clipboardContent = @"
VERCEL_ORG_ID=$orgId
VERCEL_PROJECT_ID=$projectId
"@
    
    try {
        Set-Clipboard -Value $clipboardContent
        Write-Host "✅ Les IDs ont été copiés dans le presse-papier!" -ForegroundColor Green
    } catch {
        Write-Host "ℹ️  Copiez manuellement les IDs ci-dessus" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "📚 Pour plus de détails, consultez :" -ForegroundColor White
    Write-Host "   .github/CICD_SETUP.md" -ForegroundColor Gray
    Write-Host ""
    
} else {
    Write-Host "❌ Fichier .vercel/project.json introuvable." -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Vous devez d'abord déployer le projet localement :" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   cd apps/admin" -ForegroundColor Gray
    Write-Host "   vercel" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Ensuite, réexécutez ce script." -ForegroundColor Yellow
    Write-Host ""
    
    # Tenter de lier le projet
    Write-Host "Voulez-vous lier le projet maintenant ? (O/N)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq "O" -or $response -eq "o") {
        Write-Host ""
        Write-Host "🔗 Liaison du projet avec Vercel..." -ForegroundColor Yellow
        vercel link
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Projet lié avec succès!" -ForegroundColor Green
            Write-Host "Réexécutez ce script pour obtenir les IDs." -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "              ✅ TERMINÉ !                  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
