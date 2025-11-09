# 🚀 Configuration CI/CD GitHub Actions

Ce guide explique comment configurer le déploiement automatique sur Vercel via GitHub Actions.

## 📋 Prérequis

- Repository GitHub configuré
- Projet Vercel configuré
- Compte avec accès aux settings du repository

---

## 🔑 Configuration des Secrets GitHub

### 1. Aller dans les Settings du Repository

1. Allez sur votre repository GitHub : `https://github.com/[votre-username]/ObsPOS`
2. Cliquez sur **Settings**
3. Dans le menu latéral, cliquez sur **Secrets and variables** → **Actions**
4. Cliquez sur **New repository secret**

### 2. Secrets Requis

Ajoutez les secrets suivants un par un :

#### VERCEL_TOKEN
```
Valeur : Votre token Vercel
Où le trouver : https://vercel.com/account/tokens
1. Cliquez sur "Create Token"
2. Nom : "GitHub Actions PhonesPOS"
3. Scope : Full Account
4. Expiration : No Expiration
5. Copiez le token
```

#### VERCEL_ORG_ID
```
Valeur : ID de votre organisation Vercel
Où le trouver :
1. Allez sur https://vercel.com/[votre-username]
2. Settings → General
3. Copiez "Team ID" ou "User ID"

Alternative en CLI :
vercel whoami
```

#### VERCEL_PROJECT_ID
```
Valeur : ID de votre projet Vercel
Où le trouver :
1. Allez sur votre projet : https://vercel.com/[username]/phonespos-admin
2. Settings → General
3. Copiez "Project ID"

Alternative :
Regardez dans le fichier .vercel/project.json après avoir déployé localement
```

#### VITE_SUPABASE_URL
```
Valeur : https://frpaidnzwnokektodkay.supabase.co
```

#### VITE_SUPABASE_ANON_KEY
```
Valeur : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZycGFpZG56d25va2VrdG9ka2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTg5MTksImV4cCI6MjA3ODE3NDkxOX0.dyMlc6CZSxuhpbuDL5qoVEnWm7zftn68nlsUBDZ_1YQ
```

---

## 📝 Récapitulatif des Secrets

| Secret | Description | Obligatoire |
|--------|-------------|-------------|
| `VERCEL_TOKEN` | Token d'authentification Vercel | ✅ Oui |
| `VERCEL_ORG_ID` | ID de l'organisation Vercel | ✅ Oui |
| `VERCEL_PROJECT_ID` | ID du projet Vercel | ✅ Oui |
| `VITE_SUPABASE_URL` | URL de votre projet Supabase | ✅ Oui |
| `VITE_SUPABASE_ANON_KEY` | Clé anonyme Supabase | ✅ Oui |

---

## 🔍 Comment Obtenir les IDs Vercel Rapidement

### Méthode 1 : Via le fichier .vercel/project.json

Après un déploiement local via `vercel`, vous trouverez un fichier `.vercel/project.json` :

```json
{
  "orgId": "votre_org_id",
  "projectId": "votre_project_id"
}
```

### Méthode 2 : Via Vercel CLI

```bash
# Installer Vercel CLI si pas déjà fait
npm install -g vercel

# Se connecter
vercel login

# Obtenir l'Org ID
vercel whoami

# Dans votre projet
cd c:\Users\miada\ObsPOS
vercel link

# Les IDs seront affichés
```

### Méthode 3 : Via l'interface Vercel

1. **Org ID** :
   - Allez sur https://vercel.com/account
   - Dans l'URL, vous verrez votre username
   - Ou dans Settings → General → Team ID

2. **Project ID** :
   - Allez sur votre projet
   - Settings → General → Project ID

---

## ✅ Vérification de la Configuration

Une fois les secrets configurés :

### 1. Vérifiez que tous les secrets sont présents

Allez dans **Settings** → **Secrets and variables** → **Actions**

Vous devriez voir 5 secrets :
- ✅ VERCEL_TOKEN
- ✅ VERCEL_ORG_ID
- ✅ VERCEL_PROJECT_ID
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY

### 2. Testez le workflow manuellement

1. Allez dans l'onglet **Actions** de votre repository
2. Cliquez sur le workflow "🚀 Deploy Admin to Vercel"
3. Cliquez sur **Run workflow**
4. Sélectionnez la branche `main`
5. Cliquez sur **Run workflow**

Le déploiement devrait démarrer automatiquement.

---

## 🎯 Déclenchement du CI/CD

Le workflow se déclenche automatiquement dans les cas suivants :

### 1. Push sur la branche `main`
```bash
git add .
git commit -m "feat: ajout nouvelle fonctionnalité"
git push origin main
```

Le CI/CD se déclenche uniquement si vous modifiez :
- `apps/admin/**` (fichiers de l'app Admin)
- `packages/**` (packages partagés)
- `vercel.json` (config Vercel)
- `.github/workflows/deploy-admin.yml` (workflow lui-même)

### 2. Déclenchement manuel

Via l'interface GitHub :
1. Actions → 🚀 Deploy Admin to Vercel
2. Run workflow → Run workflow

### 3. Après un Pull Request mergé

Quand vous mergez une PR dans `main`, le déploiement se déclenche automatiquement.

---

## 📊 Monitoring du Déploiement

### Pendant le déploiement

1. Allez dans l'onglet **Actions**
2. Cliquez sur le workflow en cours
3. Vous verrez les étapes en temps réel :
   - 📥 Checkout code
   - 🔧 Setup Node.js
   - 📦 Install dependencies
   - 🔍 Type check
   - 🏗️ Build application
   - 🚀 Deploy to Vercel
   - 📊 Deployment Summary

### Après le déploiement

Un résumé s'affiche automatiquement avec :
- 🌐 Production URL
- 📦 Vercel URL
- 🔗 Commit hash
- 👤 Auteur
- 📝 Message du commit

---

## 🐛 Troubleshooting

### Erreur : "Error: Failed to retrieve Project Settings"

**Cause** : VERCEL_ORG_ID ou VERCEL_PROJECT_ID incorrect

**Solution** :
1. Vérifiez les IDs dans Vercel
2. Mettez à jour les secrets GitHub

### Erreur : "Error: Invalid token"

**Cause** : VERCEL_TOKEN expiré ou incorrect

**Solution** :
1. Créez un nouveau token sur https://vercel.com/account/tokens
2. Mettez à jour le secret VERCEL_TOKEN dans GitHub

### Erreur : Build failed

**Cause** : Erreur de compilation TypeScript ou problème de dépendances

**Solution** :
1. Testez localement : `npm run build:admin`
2. Corrigez les erreurs
3. Commitez et pushez les corrections

### Le workflow ne se déclenche pas

**Vérifications** :
1. Êtes-vous sur la branche `main` ?
2. Avez-vous modifié des fichiers dans `apps/admin/**` ou `packages/**` ?
3. Le workflow est-il activé dans Settings → Actions ?

---

## 🔒 Sécurité

### Bonnes Pratiques

✅ **Ne commitez JAMAIS les secrets dans le code**
✅ **Utilisez toujours GitHub Secrets**
✅ **Limitez l'accès aux secrets aux collaborateurs de confiance**
✅ **Renouvelez les tokens régulièrement**
✅ **Utilisez des tokens avec les permissions minimales nécessaires**

### Secrets à NE JAMAIS commiter

❌ Fichier `.env.local`
❌ Fichier `.vercel/project.json`
❌ Tokens API
❌ Clés privées

Ces fichiers sont déjà dans `.gitignore`.

---

## 📚 Ressources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

## 🎉 Workflow Opérationnel !

Une fois configuré, votre workflow :
- ✅ Build automatiquement à chaque push
- ✅ Type-check le code
- ✅ Déploie sur Vercel en production
- ✅ Notifie en cas d'erreur
- ✅ Fournit un résumé détaillé

**Commit, Push, Relax ! 🚀**
