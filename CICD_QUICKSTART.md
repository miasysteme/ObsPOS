# 🚀 CI/CD Quick Start - 5 Minutes

Guide rapide pour activer le déploiement automatique via GitHub Actions.

---

## ✅ Prérequis

- [ ] Repository GitHub créé et pushé
- [ ] Projet déployé au moins une fois localement sur Vercel
- [ ] Accès admin au repository GitHub

---

## 📝 Étapes (5 minutes)

### Étape 1 : Récupérer les IDs Vercel (2 min)

Ouvrez PowerShell dans le dossier du projet et exécutez :

```powershell
.\scripts\get-vercel-ids.ps1
```

Ce script va :
1. Vérifier que Vercel CLI est installé
2. Vérifier votre connexion Vercel
3. Récupérer automatiquement vos IDs
4. Les copier dans votre presse-papier

**Résultat attendu** :
```
🏢 VERCEL_ORG_ID: team_xxxxxxxxxxxxx
📦 VERCEL_PROJECT_ID: prj_xxxxxxxxxxxxx
```

---

### Étape 2 : Créer un Token Vercel (1 min)

1. Allez sur : https://vercel.com/account/tokens
2. Cliquez sur **"Create Token"**
3. Configurez :
   - **Name** : `GitHub Actions PhonesPOS`
   - **Scope** : `Full Account`
   - **Expiration** : `No Expiration`
4. Cliquez sur **"Create"**
5. **Copiez le token** (vous ne le verrez qu'une fois !)

---

### Étape 3 : Ajouter les Secrets GitHub (2 min)

1. Allez sur votre repository GitHub
2. Cliquez sur **Settings** → **Secrets and variables** → **Actions**
3. Cliquez sur **"New repository secret"** pour chaque secret :

#### Secret 1 : VERCEL_TOKEN
- **Name** : `VERCEL_TOKEN`
- **Value** : [Le token que vous venez de créer]

#### Secret 2 : VERCEL_ORG_ID
- **Name** : `VERCEL_ORG_ID`
- **Value** : [La valeur affichée par le script]

#### Secret 3 : VERCEL_PROJECT_ID
- **Name** : `VERCEL_PROJECT_ID`
- **Value** : [La valeur affichée par le script]

#### Secret 4 : VITE_SUPABASE_URL
- **Name** : `VITE_SUPABASE_URL`
- **Value** : `https://frpaidnzwnokektodkay.supabase.co`

#### Secret 5 : VITE_SUPABASE_ANON_KEY
- **Name** : `VITE_SUPABASE_ANON_KEY`
- **Value** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZycGFpZG56d25va2VrdG9ka2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTg5MTksImV4cCI6MjA3ODE3NDkxOX0.dyMlc6CZSxuhpbuDL5qoVEnWm7zftn68nlsUBDZ_1YQ`

---

## 🧪 Test du CI/CD

### Option 1 : Test Manuel

1. Allez dans l'onglet **Actions** de votre repository
2. Cliquez sur **"🚀 Deploy Admin to Vercel"**
3. Cliquez sur **"Run workflow"**
4. Sélectionnez `main`
5. Cliquez sur **"Run workflow"**

Le workflow devrait démarrer et se terminer avec succès en 2-3 minutes.

### Option 2 : Test Automatique

Faites un commit et push sur la branche `main` :

```bash
git add .
git commit -m "test: activation du CI/CD"
git push origin main
```

Le déploiement se déclenche automatiquement !

---

## ✅ Vérification

Une fois le workflow terminé, vérifiez :

1. **Badge de statut** : Devrait être vert dans le README
2. **Application** : https://obs-systeme.store devrait être à jour
3. **Logs** : Vérifiez les logs dans Actions pour plus de détails

---

## 📊 Résultat

Après cette configuration, à chaque push sur `main` :

```
git push origin main
    ↓
GitHub Actions détecte le push
    ↓
Lance le workflow automatiquement
    ↓
📥 Clone le code
🔧 Installe Node.js
📦 Installe les dépendances
🔍 Type check TypeScript
🏗️ Build l'application
🚀 Déploie sur Vercel Production
📊 Affiche le résumé
    ↓
✅ Application mise à jour sur obs-systeme.store
```

**Temps total** : 2-3 minutes par déploiement

---

## 🐛 Problèmes Courants

### Le script get-vercel-ids.ps1 ne trouve pas les IDs

**Solution** : Déployez d'abord manuellement :
```powershell
vercel --prod
```

Puis réexécutez le script.

---

### Erreur "Invalid token" dans GitHub Actions

**Solution** : Le token Vercel est incorrect ou expiré
1. Créez un nouveau token sur https://vercel.com/account/tokens
2. Mettez à jour le secret VERCEL_TOKEN dans GitHub

---

### Le workflow ne se déclenche pas

**Vérifiez** :
- Êtes-vous sur la branche `main` ?
- Avez-vous modifié des fichiers dans `apps/admin/**` ?
- Le workflow est-il activé dans Settings → Actions ?

---

## 📚 Documentation Complète

Pour plus de détails :
- `.github/CICD_SETUP.md` - Guide détaillé avec troubleshooting
- `.github/workflows/deploy-admin.yml` - Configuration du workflow

---

## 🎉 C'est Fait !

Votre CI/CD est maintenant opérationnel !

**Commit → Push → Relax** 🚀

Plus besoin de déployer manuellement, GitHub Actions s'occupe de tout !
