# 🚀 Guide de Déploiement - PhonesPOS

## 📋 Prérequis

Avant de déployer, assurez-vous d'avoir :
- ✅ Un compte Supabase configuré
- ✅ Un projet Supabase avec les migrations appliquées
- ✅ Un compte Vercel (gratuit)
- ✅ Un compte GitHub (pour le déploiement automatique)

---

## 🎯 Méthode 1 : Déploiement Rapide via Vercel CLI (Recommandé)

### Étape 1 : Préparer l'environnement local

1. **Installer les dépendances** (si ce n'est pas déjà fait) :
```powershell
npm install
```

2. **Créer le fichier `.env.local`** :
```powershell
cp .env.example .env.local
```

3. **Configurer `.env.local`** avec vos variables Supabase :
```env
VITE_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_WAVE_API_KEY=
VITE_WAVE_SECRET=
VITE_ADMIN_URL=https://admin-phonespos.vercel.app
VITE_CLIENT_URL=https://app-phonespos.vercel.app
VITE_SUBSCRIPTION_PRICE=20000
VITE_GRACE_PERIOD_DAYS=10
VITE_LIMITED_SALES_PER_DAY=10
```

### Étape 2 : Installer Vercel CLI

```powershell
npm install -g vercel
```

### Étape 3 : Se connecter à Vercel

```powershell
vercel login
```

Suivez les instructions pour vous connecter (via GitHub, GitLab, Bitbucket ou email).

### Étape 4 : Déployer l'Application Admin

```powershell
cd apps/admin
vercel
```

**Répondez aux questions** :
- **Set up and deploy?** → Y (Yes)
- **Which scope?** → Sélectionnez votre compte/organisation
- **Link to existing project?** → N (No, create new project)
- **Project name** → `phonespos-admin`
- **In which directory is your code located?** → `./` (appuyez sur Entrée)
- **Override settings?** → N (No)

Vercel va :
1. Installer les dépendances
2. Builder l'application
3. La déployer
4. Vous donner une URL de production

### Étape 5 : Configurer les Variables d'Environnement

Après le premier déploiement, ajoutez vos variables :

```powershell
vercel env add VITE_SUPABASE_URL production
# Collez votre URL Supabase

vercel env add VITE_SUPABASE_ANON_KEY production
# Collez votre clé anon Supabase

vercel env add VITE_ADMIN_URL production
# Collez l'URL de votre déploiement (ex: https://phonespos-admin.vercel.app)

vercel env add VITE_CLIENT_URL production
# Ex: https://phonespos-client.vercel.app
```

### Étape 6 : Redéployer avec les variables

```powershell
vercel --prod
```

🎉 **Votre application Admin est déployée !**

---

## 🎯 Méthode 2 : Déploiement via Interface Vercel (Plus Simple)

### Étape 1 : Préparer le dépôt Git

1. **Initialisez Git** (si ce n'est pas fait) :
```powershell
git init
git add .
git commit -m "Initial commit - PhonesPOS v1.0"
```

2. **Créez un dépôt GitHub** :
   - Allez sur https://github.com/new
   - Nom : `phonespos`
   - Visibilité : Private (recommandé)
   - Créez le dépôt

3. **Poussez le code** :
```powershell
git remote add origin https://github.com/votre-username/phonespos.git
git branch -M main
git push -u origin main
```

### Étape 2 : Connecter Vercel à GitHub

1. Allez sur https://vercel.com/new
2. Cliquez **"Import Git Repository"**
3. Sélectionnez votre dépôt `phonespos`
4. Cliquez **"Import"**

### Étape 3 : Configurer le Projet Admin

**Configuration du Build** :
- **Framework Preset** : Vite
- **Root Directory** : `apps/admin`
- **Build Command** : `npm run build`
- **Output Directory** : `dist`
- **Install Command** : `npm install`

**Variables d'Environnement** :
Ajoutez toutes les variables :

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxxxxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI...` |
| `VITE_ADMIN_URL` | `https://your-deployment.vercel.app` |
| `VITE_CLIENT_URL` | `https://your-client.vercel.app` |
| `VITE_SUBSCRIPTION_PRICE` | `20000` |
| `VITE_GRACE_PERIOD_DAYS` | `10` |
| `VITE_LIMITED_SALES_PER_DAY` | `10` |

4. Cliquez **"Deploy"**

⏳ Attendez 2-3 minutes...

🎉 **Déploiement terminé !**

---

## 🌐 Configuration du Domaine Personnalisé

### Option 1 : Sous-domaine Vercel (Gratuit)

Par défaut, Vercel vous donne : `phonespos-admin-xxx.vercel.app`

Vous pouvez le personnaliser :
1. Dans le projet Vercel → **Settings** → **Domains**
2. Ajoutez : `phonespos-admin.vercel.app`

### Option 2 : Domaine Personnalisé (Recommandé)

Si vous avez `phonespos.com` :

1. **Dans Vercel** :
   - Project Settings → Domains
   - Ajoutez : `admin.phonespos.com`

2. **Dans votre DNS (Cloudflare, etc.)** :
   - Type : `CNAME`
   - Name : `admin`
   - Value : `cname.vercel-dns.com`
   - Proxy : OFF (pour la vérification initiale)

3. Attendez la propagation DNS (5-30 minutes)

4. Vercel génère automatiquement un certificat SSL

---

## 🔧 Configuration Supabase pour Production

### Mettre à jour les URL autorisées

Dans Supabase → **Authentication** → **URL Configuration** :

**Site URL** :
```
https://admin.phonespos.com
```

**Redirect URLs** :
```
https://admin.phonespos.com/**
https://app.phonespos.com/**
https://phonespos-admin.vercel.app/**
http://localhost:3001/**
```

---

## 🧪 Tester le Déploiement

1. **Ouvrez** l'URL de production
2. **Connectez-vous** avec votre super admin
3. **Vérifiez** :
   - ✅ Page de connexion s'affiche
   - ✅ Connexion fonctionne
   - ✅ Dashboard s'affiche
   - ✅ Statistiques se chargent
   - ✅ Pas d'erreurs dans la console

---

## 🔄 Déploiement Continu (CI/CD)

Une fois connecté à GitHub, **chaque push déclenche un déploiement automatique** :

```powershell
# Faites vos modifications
git add .
git commit -m "Ajout module gestion établissements"
git push

# → Vercel déploie automatiquement !
```

### Branches et Environnements

- **main** → Production (https://phonespos-admin.vercel.app)
- **develop** → Preview (https://phonespos-admin-git-develop.vercel.app)
- **feature/xxx** → Preview unique

---

## 🚀 Déployer l'Application Client (Future)

Quand l'application Client sera créée :

```powershell
cd apps/client
vercel
```

Configuration similaire avec :
- **Root Directory** : `apps/client`
- **URL** : `app.phonespos.com`

---

## 📊 Monitoring et Analytics

### Vercel Analytics (Gratuit)

Automatiquement activé :
- Temps de chargement
- Erreurs
- Trafic
- Core Web Vitals

### Vercel Speed Insights

Pour activer :
```powershell
npm install @vercel/speed-insights
```

Ajoutez dans `apps/admin/src/main.tsx` :
```typescript
import { SpeedInsights } from "@vercel/speed-insights/react";

// Dans le render
<SpeedInsights />
```

---

## 🐛 Troubleshooting

### Erreur : "Build failed"

**Causes communes** :
1. Variables d'environnement manquantes
2. Erreurs TypeScript
3. Dépendances manquantes

**Solution** :
```powershell
# Tester le build localement
cd apps/admin
npm run build

# Si ça échoue, corrigez les erreurs
# Si ça marche, vérifiez les variables d'env sur Vercel
```

### Erreur : "Cannot connect to Supabase"

**Solution** :
1. Vérifiez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
2. Vérifiez que l'URL de prod est dans les Redirect URLs Supabase
3. Vérifiez que RLS est bien activé

### Page blanche après déploiement

**Solution** :
1. Ouvrez la console navigateur (F12)
2. Regardez les erreurs
3. Souvent dû aux variables d'environnement

---

## 📝 Checklist de Déploiement

Avant de déployer en production :

- [ ] ✅ Supabase configuré et migrations appliquées
- [ ] ✅ Super admin créé dans Supabase
- [ ] ✅ Variables d'environnement configurées
- [ ] ✅ Build local réussi (`npm run build`)
- [ ] ✅ Tests de connexion en local
- [ ] ✅ Code pushé sur GitHub
- [ ] ✅ Projet Vercel créé
- [ ] ✅ Domaine configuré (optionnel)
- [ ] ✅ Redirect URLs Supabase mis à jour
- [ ] ✅ Test de connexion en production

---

## 💰 Coûts Estimés

### Gratuit (Phase MVP)

- **Vercel** : Plan Hobby (gratuit)
  - 100 GB bandwidth/mois
  - Déploiements illimités
  - SSL automatique

- **Supabase** : Plan Free (gratuit)
  - 500 MB base de données
  - 1 GB stockage fichiers
  - 2 GB bandwidth/mois
  - 50 000 requêtes/mois

### Payant (Production)

**Vercel Pro** : $20/mois
- 1 TB bandwidth
- Analytics avancés
- Équipe

**Supabase Pro** : $25/mois
- 8 GB base de données
- 100 GB stockage
- 50 GB bandwidth
- Support prioritaire

---

## 🎯 Étapes Suivantes Après Déploiement

1. **Configurer monitoring** (Sentry pour les erreurs)
2. **Activer Analytics** (Vercel Analytics)
3. **Configurer backups** automatiques Supabase
4. **Documenter** les procédures de déploiement pour l'équipe
5. **Tester** la performance (Lighthouse, PageSpeed)

---

## 📞 Support

Pour les problèmes de déploiement :
- **Vercel** : https://vercel.com/support
- **Supabase** : https://supabase.com/docs
- **Documentation** : Ce fichier + INSTALLATION.md

---

**Dernière mise à jour** : Novembre 2024  
**Version** : 1.0
