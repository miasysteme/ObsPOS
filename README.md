# PhonesPOS - Plateforme SaaS Multi-tenant

[![Deploy Admin](https://github.com/[votre-username]/ObsPOS/actions/workflows/deploy-admin.yml/badge.svg)](https://github.com/[votre-username]/ObsPOS/actions/workflows/deploy-admin.yml)
[![Production](https://img.shields.io/badge/Production-Live-success?style=flat&logo=vercel)](https://obs-systeme.store)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

## 📋 Description

PhonesPOS est une plateforme SaaS multi-tenant développée par SONUTEC SARL pour la digitalisation complète des établissements de vente au détail (téléphonie, électronique, accessoires).

## 🏗️ Architecture

### Stack Technique
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn-ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Déploiement**: Vercel (Frontend) + Supabase Cloud (Backend)

### Structure Monorepo
```
phonespos/
├── apps/
│   ├── admin/          # Application Admin SONUTEC (admin.phonespos.com)
│   └── client/         # Application Client Établissements (app.phonespos.com)
├── packages/
│   ├── ui/             # Composants shadcn-ui partagés
│   ├── database/       # Types Supabase, schémas
│   └── shared/         # Utilitaires partagés
├── supabase/
│   ├── migrations/     # Migrations SQL avec RLS
│   ├── functions/      # Edge Functions
│   └── seed.sql        # Données initiales
└── docs/               # Documentation
```

## 🎯 Deux Applications

### 1. Admin SONUTEC (`admin.phonespos.com`)
Gestion de la plateforme SaaS :
- Gestion des établissements
- Suivi des abonnements
- Validation des paiements
- Tableau de bord global
- Paramétrage de la plateforme

### 2. Client (`app.phonespos.com`)
Application pour les établissements abonnés :
- POS (Point de vente)
- Gestion du stock
- Inventaires
- Service Après-Vente (SAV)
- Reporting

## 🎨 Identité Visuelle

| Élément | Code Couleur |
|---------|--------------|
| Principal (Marron) | `#5a2424` |
| Secondaire (Orange) | `#f27120` |
| Accent (Jaune) | `#fbd336` |
| Alerte (Rouge) | `#f02726` |

## 🔐 Sécurité Multi-tenant

- Isolation complète par `tenant_id`
- Row Level Security (RLS) sur toutes les tables
- Authentification Supabase Auth (JWT)
- Audit logs complet

## 💳 Abonnement

- **Tarif**: 20 000 F CFA / mois / boutique
- **Paiement**: Wave API ou dépôt manuel
- **Blocage**: Automatique après expiration + 10 jours de grâce
- **Quota limité**: 10 ventes/jour en mode expiré

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- Compte Supabase
- npm ou pnpm

### Installation
```bash
# Installer les dépendances
npm install

# Configuration Supabase
cp .env.example .env.local
# Remplir les variables SUPABASE_URL et SUPABASE_ANON_KEY

# Lancer l'application Admin
npm run dev:admin

# Lancer l'application Client
npm run dev:client
```

## 📦 Déploiement

### 🚀 CI/CD Automatique (Recommandé)

Le projet est configuré avec GitHub Actions pour un déploiement automatique à chaque commit sur `main`.

#### Configuration Initiale (5 minutes)

```powershell
# 1. Récupérer les IDs Vercel nécessaires
.\scripts\get-vercel-ids.ps1

# 2. Suivre le guide de configuration
# Voir .github/CICD_SETUP.md
```

**Une fois configuré** : Chaque push sur `main` déclenche automatiquement :
- ✅ Type checking
- ✅ Build de l'application
- ✅ Déploiement sur Vercel Production
- ✅ Notification de statut

#### Déploiement Manuel

```powershell
# 1. Vérifier que tout est prêt
npm run deploy:check

# 2. Déployer sur Vercel
npm run deploy:admin
```

📖 **Guides détaillés** :
- `.github/CICD_SETUP.md` - Configuration CI/CD GitHub Actions ⭐
- `DEPLOY_NOW.md` - Guide express (15-20 min)
- `DEPLOYMENT.md` - Guide complet avec toutes les options
- `QUICK_START.md` - Configuration Supabase + Premier lancement

### Infrastructure

- **Frontend**: Vercel (auto-deploy depuis main via GitHub Actions)
- **Backend**: Supabase Cloud
- **DNS**: Namecheap → Vercel DNS
- **CI/CD**: GitHub Actions ✅
- **Monitoring**: Vercel Analytics + GitHub Actions logs

## 📄 License

Propriété de SONUTEC SARL - Tous droits réservés
