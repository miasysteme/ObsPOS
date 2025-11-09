# 🎯 Prochaines Étapes - Configuration GitHub et CI/CD

## ✅ Ce qui est fait

- ✅ Repository Git initialisé
- ✅ Premier commit créé avec tout le projet
- ✅ Workflow GitHub Actions configuré
- ✅ Scripts d'automatisation créés
- ✅ Documentation complète

---

## 📝 Étapes Suivantes (10 minutes)

### Étape 1 : Créer le Repository GitHub (2 min)

#### Option A : Via l'interface GitHub

1. Allez sur https://github.com/new
2. Remplissez :
   - **Repository name** : `ObsPOS`
   - **Description** : `Plateforme SaaS Multi-tenant pour gestion de boutiques - PhonesPOS`
   - **Visibility** : Private (recommandé) ou Public
3. **Ne cochez PAS** "Initialize this repository with..."
4. Cliquez sur **"Create repository"**

#### Option B : Via GitHub CLI (si installé)

```powershell
gh repo create ObsPOS --private --source=. --remote=origin
```

---

### Étape 2 : Connecter et Pusher le Code (1 min)

Une fois le repository créé, GitHub vous affichera ces commandes :

```bash
# Ajouter le remote
git remote add origin https://github.com/[votre-username]/ObsPOS.git

# Renommer la branche en main
git branch -M main

# Pousser le code
git push -u origin main
```

**Exécutez-les dans PowerShell** :

```powershell
cd c:\Users\miada\ObsPOS

# Remplacez [votre-username] par votre nom d'utilisateur GitHub
git remote add origin https://github.com/[votre-username]/ObsPOS.git

git branch -M main

git push -u origin main
```

---

### Étape 3 : Configurer les Secrets GitHub (5 min)

#### 3.1 Récupérer les IDs Vercel

```powershell
.\scripts\get-vercel-ids.ps1
```

Notez les valeurs affichées.

#### 3.2 Créer un Token Vercel

1. Allez sur https://vercel.com/account/tokens
2. Cliquez sur **"Create Token"**
3. Configurez :
   - Name : `GitHub Actions PhonesPOS`
   - Scope : `Full Account`
   - Expiration : `No Expiration`
4. Copiez le token (vous ne le verrez qu'une fois !)

#### 3.3 Ajouter les Secrets dans GitHub

1. Allez sur votre repository : `https://github.com/[votre-username]/ObsPOS`
2. Cliquez sur **Settings** → **Secrets and variables** → **Actions**
3. Cliquez sur **"New repository secret"** pour chaque secret :

| Secret Name | Valeur |
|-------------|--------|
| `VERCEL_TOKEN` | Le token Vercel que vous venez de créer |
| `VERCEL_ORG_ID` | Valeur du script get-vercel-ids.ps1 |
| `VERCEL_PROJECT_ID` | Valeur du script get-vercel-ids.ps1 |
| `VITE_SUPABASE_URL` | `https://frpaidnzwnokektodkay.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Votre clé Supabase (voir `.env.local`) |

---

### Étape 4 : Mettre à Jour les Badges (1 min)

Dans `README.md`, remplacez `[votre-username]` par votre vrai username GitHub :

```markdown
[![Deploy Admin](https://github.com/[votre-username]/ObsPOS/actions/workflows/deploy-admin.yml/badge.svg)](https://github.com/[votre-username]/ObsPOS/actions/workflows/deploy-admin.yml)
```

Commitez et pushez :

```bash
git add README.md
git commit -m "docs: mise à jour des badges avec le bon username"
git push
```

---

### Étape 5 : Tester le CI/CD (1 min)

#### Test Automatique

Le push de l'étape 4 devrait déclencher automatiquement le workflow !

Vérifiez dans : `https://github.com/[votre-username]/ObsPOS/actions`

#### Test Manuel (optionnel)

1. Allez dans **Actions**
2. Cliquez sur **"🚀 Deploy Admin to Vercel"**
3. Cliquez sur **"Run workflow"**
4. Sélectionnez `main`
5. Cliquez sur **"Run workflow"**

---

## 🎉 C'est Terminé !

Une fois ces étapes complétées :

### Ce qui se passe automatiquement

À chaque `git push` sur `main` :

```
1. GitHub Actions détecte le push
2. Clone le code
3. Installe les dépendances
4. Type-check TypeScript
5. Build l'application
6. Déploie sur Vercel Production
7. Met à jour obs-systeme.store
```

**Temps total** : 2-3 minutes

---

## 📊 Monitoring

### Vérifier le Statut

- **GitHub Actions** : https://github.com/[votre-username]/ObsPOS/actions
- **Vercel Dashboard** : https://vercel.com/sonutecpro/phonespos-admin
- **Production** : https://obs-systeme.store

### Badge de Statut

Le badge dans le README vous indique :
- 🟢 Vert = Dernier déploiement réussi
- 🔴 Rouge = Dernier déploiement échoué
- 🟡 Jaune = Déploiement en cours

---

## 🚀 Workflow de Développement

### Développement Local

```bash
# 1. Créer une branche
git checkout -b feature/nouvelle-fonctionnalite

# 2. Développer
npm run dev:admin

# 3. Tester
npm run build:admin

# 4. Commiter
git add .
git commit -m "feat: ajout de la nouvelle fonctionnalité"

# 5. Pusher
git push origin feature/nouvelle-fonctionnalite
```

### Déploiement en Production

```bash
# 1. Merger dans main (via PR ou directement)
git checkout main
git merge feature/nouvelle-fonctionnalite

# 2. Pusher
git push origin main

# 3. Attendre 2-3 minutes
# Le CI/CD s'occupe du reste automatiquement !
```

---

## 📚 Documentation

### Guides Disponibles

- **`CICD_QUICKSTART.md`** - Référence rapide CI/CD
- **`.github/CICD_SETUP.md`** - Configuration détaillée
- **`CICD_SUMMARY.md`** - Résumé des fonctionnalités
- **`DEPLOYMENT.md`** - Guide de déploiement complet
- **`README.md`** - Vue d'ensemble du projet

### Scripts Utiles

```powershell
# Récupérer les IDs Vercel
.\scripts\get-vercel-ids.ps1

# Vérifier avant déploiement
npm run deploy:check

# Déployer manuellement (si nécessaire)
npm run deploy:admin
```

---

## ❓ Besoin d'Aide ?

### Problèmes Courants

**Le workflow ne se déclenche pas**
- Vérifiez que vous êtes sur la branche `main`
- Vérifiez que vous avez modifié des fichiers dans `apps/admin/**`

**Erreur "Invalid token"**
- Recréez le VERCEL_TOKEN
- Mettez à jour le secret dans GitHub

**Erreur de build**
- Testez localement : `npm run build:admin`
- Vérifiez les logs dans GitHub Actions

### Support

Consultez le troubleshooting dans `.github/CICD_SETUP.md`

---

## 🎯 Checklist Finale

Avant de considérer le CI/CD comme opérationnel :

- [ ] Repository GitHub créé
- [ ] Code pushé sur GitHub
- [ ] 5 secrets configurés dans GitHub
- [ ] Badges mis à jour dans README
- [ ] Premier workflow exécuté avec succès
- [ ] Application accessible sur obs-systeme.store
- [ ] Badge GitHub Actions est vert

---

## 🎊 Félicitations !

Votre projet est maintenant équipé d'un pipeline CI/CD professionnel !

**Plus besoin de déployer manuellement - Commit → Push → Déployé ! 🚀**
