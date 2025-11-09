# 📜 Scripts de Déploiement

Ce dossier contient les scripts PowerShell pour automatiser le déploiement de PhonesPOS.

## Scripts Disponibles

### 1. `check-deployment.ps1` - Vérification Pré-Déploiement

Vérifie que tout est prêt avant de déployer.

**Usage** :
```powershell
.\scripts\check-deployment.ps1
```

ou via npm :
```powershell
npm run deploy:check
```

**Vérifie** :
- ✅ Node.js et npm installés
- ✅ Dépendances installées
- ✅ Configuration .env.local
- ✅ Structure du projet
- ✅ Build réussi
- ✅ Git initialisé

---

### 2. `deploy.ps1` - Déploiement Automatique

Déploie l'application sur Vercel.

**Usage** :
```powershell
# Déployer l'application Admin
.\scripts\deploy.ps1 -App admin

# Déployer l'application Client (quand créée)
.\scripts\deploy.ps1 -App client
```

ou via npm :
```powershell
npm run deploy:admin
npm run deploy:client
```

**Ce qu'il fait** :
1. Vérifie Vercel CLI
2. Installe les dépendances si nécessaire
3. Vérifie la configuration
4. Build l'application
5. Demande confirmation
6. Déploie sur Vercel

---

## 🚀 Workflow de Déploiement

### Première fois

1. **Vérifier** que tout est OK :
   ```powershell
   npm run deploy:check
   ```

2. **Déployer** :
   ```powershell
   npm run deploy:admin
   ```

### Déploiements suivants

```powershell
npm run deploy:admin
```

---

## 🔧 Personnalisation

### Modifier le script deploy.ps1

Vous pouvez modifier :
- Les messages de log
- Les vérifications
- Les commandes de build
- Les options Vercel

### Ajouter des vérifications

Éditez `check-deployment.ps1` pour ajouter vos propres vérifications.

---

## 📝 Logs

Les scripts affichent des messages colorés :
- 🟢 **Vert** : Succès
- 🟡 **Jaune** : Avertissement
- 🔴 **Rouge** : Erreur

---

## 🐛 Troubleshooting

### "Execution Policy" Error

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Script ne s'exécute pas

Utilisez les commandes npm :
```powershell
npm run deploy:check
npm run deploy:admin
```

---

## 📚 Documentation

Pour plus d'informations :
- **Guide de déploiement** : `../DEPLOYMENT.md`
- **Guide express** : `../DEPLOY_NOW.md`
- **Installation** : `../INSTALLATION.md`
