# Script de déploiement PhonesPOS
# Usage: .\scripts\deploy.ps1 [admin|client]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('admin', 'client')]
    [string]$App = 'admin'
)

Write-Host "🚀 Déploiement PhonesPOS - Application $App" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Vercel CLI est installé
Write-Host "📋 Vérification de Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI n'est pas installé." -ForegroundColor Red
    Write-Host "Installation de Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec de l'installation de Vercel CLI" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Vercel CLI installé avec succès" -ForegroundColor Green
} else {
    Write-Host "✅ Vercel CLI est installé" -ForegroundColor Green
}

Write-Host ""

# Vérifier si les dépendances sont installées
Write-Host "📦 Vérification des dépendances..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation des dépendances..." -ForegroundColor Yellow
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec de l'installation des dépendances" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dépendances installées" -ForegroundColor Green
} else {
    Write-Host "✅ Dépendances déjà installées" -ForegroundColor Green
}

Write-Host ""

# Vérifier le fichier .env.local
Write-Host "🔑 Vérification de la configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  Fichier .env.local non trouvé" -ForegroundColor Yellow
    Write-Host "Veuillez créer un fichier .env.local avec vos variables d'environnement" -ForegroundColor Yellow
    Write-Host "Exemple: cp .env.example .env.local" -ForegroundColor Yellow
    
    $continue = Read-Host "Continuer quand même? (o/n)"
    if ($continue -ne 'o') {
        exit 0
    }
} else {
    Write-Host "✅ Configuration trouvée" -ForegroundColor Green
}

Write-Host ""

# Build de l'application
Write-Host "🔨 Build de l'application $App..." -ForegroundColor Yellow
Set-Location "apps\$App"

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Échec du build" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}

Write-Host "✅ Build réussi" -ForegroundColor Green
Write-Host ""

# Demander confirmation
Write-Host "🚀 Prêt à déployer sur Vercel" -ForegroundColor Cyan
$deploy = Read-Host "Déployer en production? (o/n)"

if ($deploy -eq 'o') {
    Write-Host "📤 Déploiement en cours..." -ForegroundColor Yellow
    vercel --prod
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Déploiement réussi!" -ForegroundColor Green
        Write-Host "Votre application est en ligne!" -ForegroundColor Green
    } else {
        Write-Host "❌ Échec du déploiement" -ForegroundColor Red
    }
} else {
    Write-Host "📤 Déploiement en mode preview..." -ForegroundColor Yellow
    vercel
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Déploiement preview réussi!" -ForegroundColor Green
    } else {
        Write-Host "❌ Échec du déploiement" -ForegroundColor Red
    }
}

Set-Location ..\..
