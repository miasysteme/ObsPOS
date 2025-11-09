# Script de vérification pré-déploiement
Write-Host "🔍 Vérification Pré-Déploiement PhonesPOS" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# 1. Vérifier Node.js
Write-Host "1. Vérification Node.js..." -ForegroundColor Yellow
$node = node --version 2>$null
if ($node) {
    Write-Host "   ✅ Node.js installé: $node" -ForegroundColor Green
} else {
    Write-Host "   ❌ Node.js non installé" -ForegroundColor Red
    $errors++
}

# 2. Vérifier npm
Write-Host "2. Vérification npm..." -ForegroundColor Yellow
$npm = npm --version 2>$null
if ($npm) {
    Write-Host "   ✅ npm installé: $npm" -ForegroundColor Green
} else {
    Write-Host "   ❌ npm non installé" -ForegroundColor Red
    $errors++
}

# 3. Vérifier les dépendances
Write-Host "3. Vérification des dépendances..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✅ Dépendances installées" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Dépendances non installées (exécutez: npm install)" -ForegroundColor Yellow
    $warnings++
}

# 4. Vérifier .env.local
Write-Host "4. Vérification de la configuration..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   ✅ Fichier .env.local trouvé" -ForegroundColor Green
    
    # Vérifier les variables essentielles
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "VITE_SUPABASE_URL") {
        Write-Host "   ✅ VITE_SUPABASE_URL configuré" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  VITE_SUPABASE_URL manquant" -ForegroundColor Yellow
        $warnings++
    }
    
    if ($envContent -match "VITE_SUPABASE_ANON_KEY") {
        Write-Host "   ✅ VITE_SUPABASE_ANON_KEY configuré" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  VITE_SUPABASE_ANON_KEY manquant" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "   ⚠️  Fichier .env.local non trouvé" -ForegroundColor Yellow
    $warnings++
}

# 5. Vérifier la structure du projet
Write-Host "5. Vérification de la structure du projet..." -ForegroundColor Yellow
$requiredPaths = @(
    "apps\admin",
    "packages\shared",
    "packages\database",
    "supabase\migrations"
)

foreach ($path in $requiredPaths) {
    if (Test-Path $path) {
        Write-Host "   ✅ $path existe" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $path manquant" -ForegroundColor Red
        $errors++
    }
}

# 6. Tester le build
Write-Host "6. Test du build..." -ForegroundColor Yellow
Write-Host "   Tentative de build de l'application admin..." -ForegroundColor Gray

Push-Location "apps\admin"
$buildOutput = npm run build 2>&1
$buildSuccess = $LASTEXITCODE -eq 0
Pop-Location

if ($buildSuccess) {
    Write-Host "   ✅ Build réussi" -ForegroundColor Green
} else {
    Write-Host "   ❌ Échec du build" -ForegroundColor Red
    Write-Host "   Erreurs:" -ForegroundColor Red
    Write-Host $buildOutput -ForegroundColor Red
    $errors++
}

# 7. Vérifier Git
Write-Host "7. Vérification Git..." -ForegroundColor Yellow
if (Test-Path ".git") {
    Write-Host "   ✅ Dépôt Git initialisé" -ForegroundColor Green
    
    # Vérifier les fichiers non commités
    $gitStatus = git status --porcelain 2>$null
    if ($gitStatus) {
        Write-Host "   ⚠️  Fichiers non commités trouvés" -ForegroundColor Yellow
        $warnings++
    } else {
        Write-Host "   ✅ Tous les fichiers sont commités" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  Dépôt Git non initialisé (exécutez: git init)" -ForegroundColor Yellow
    $warnings++
}

# Résumé
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Résumé de la Vérification" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "🎉 Tout est prêt pour le déploiement!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "1. Exécutez: .\scripts\deploy.ps1" -ForegroundColor White
    Write-Host "   OU" -ForegroundColor Gray
    Write-Host "2. Suivez le guide: DEPLOYMENT.md" -ForegroundColor White
    exit 0
} elseif ($errors -eq 0) {
    Write-Host "⚠️  $warnings avertissement(s) trouvé(s)" -ForegroundColor Yellow
    Write-Host "Le déploiement peut fonctionner mais certaines fonctionnalités pourraient ne pas être disponibles" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Corrigez les avertissements pour un déploiement optimal" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ $errors erreur(s) et $warnings avertissement(s) trouvé(s)" -ForegroundColor Red
    Write-Host "Veuillez corriger les erreurs avant de déployer" -ForegroundColor Red
    Write-Host ""
    Write-Host "Consultez INSTALLATION.md pour l'aide" -ForegroundColor Yellow
    exit 1
}
