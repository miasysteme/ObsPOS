# 🌐 Configuration pour Domaine Unique avec Chemins

## 📋 Configuration Actuelle

Vous utilisez le domaine **obs-systeme.store** sans sous-domaines.

### URLs de l'Application

- **Admin SONUTEC** : `https://obs-systeme.store/admin`
- **Client (Boutiques)** : `https://obs-systeme.store/`

---

## ✅ Modifications Appliquées

### 1. Configuration Vite Admin (`apps/admin/vite.config.ts`)

Ajout du `base: '/admin/'` pour que l'application Admin fonctionne sur le chemin `/admin`.

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/admin/',  // ← Important pour le routing
  // ...
});
```

### 2. Variables d'Environnement (`.env.example` et `.env.local`)

```env
VITE_ADMIN_URL=https://obs-systeme.store/admin
VITE_CLIENT_URL=https://obs-systeme.store
```

**Mettez à jour votre `.env.local`** avec ces valeurs !

### 3. Configuration Vercel Racine (`vercel.json`)

Le fichier `vercel.json` à la racine gère maintenant le routing :
- `/admin/*` → Application Admin
- `/*` → Application Client

---

## 🚀 Déploiement avec Cette Configuration

### Option 1 : Deux Projets Vercel Séparés (Recommandé)

C'est plus simple à gérer initialement :

#### Projet 1 : Admin

```powershell
cd apps/admin
vercel

# Configuration lors du déploiement :
# Project name: obs-systeme-admin
# Root directory: ./
```

**Dans Vercel Dashboard** :
- Settings → Domains
- Ajouter : `obs-systeme.store`
- Ajouter un rewrite : `/admin` → `obs-systeme-admin.vercel.app`

#### Projet 2 : Client (futur)

```powershell
cd apps/client
vercel

# Configuration :
# Project name: obs-systeme-client
```

**Dans Vercel Dashboard** :
- Settings → Domains
- Ajouter : `obs-systeme.store` (racine)

### Option 2 : Monorepo Vercel (Avancé)

Déployer les deux apps depuis un seul projet :

```powershell
# À la racine
vercel
```

Le fichier `vercel.json` gère automatiquement le routing.

⚠️ **Plus complexe** mais centralise tout.

---

## 🔧 Configuration DNS (chez votre registrar)

### Enregistrements DNS à Ajouter

1. **Enregistrement A ou CNAME** :
   - Type : `CNAME`
   - Name : `@` (pour obs-systeme.store)
   - Value : `cname.vercel-dns.com`
   - TTL : Auto ou 3600

2. **Pour www (optionnel)** :
   - Type : `CNAME`
   - Name : `www`
   - Value : `cname.vercel-dns.com`

### Vérifier la Configuration DNS

```powershell
nslookup obs-systeme.store
```

⏳ Propagation DNS : 5 minutes à 48 heures (généralement 15-30 min)

---

## 📝 Configuration Supabase

### Redirect URLs à Ajouter

Dans Supabase Dashboard → Authentication → URL Configuration :

```
https://obs-systeme.store/admin/**
https://obs-systeme.store/**
http://localhost:3001/**
http://localhost:3000/**
```

### Site URL

```
https://obs-systeme.store
```

---

## 🧪 Tester Localement

### Avant Déploiement

```powershell
# Build Admin avec le base path
cd apps/admin
npm run build

# Le build sera dans dist/ et inclura le chemin /admin
```

### Tester le Build Local

```powershell
# Installer un serveur HTTP local
npm install -g serve

# Servir les fichiers
cd apps/admin/dist
serve -s . -p 3001

# Ouvrir : http://localhost:3001
# Les assets seront chargés depuis /admin/
```

---

## 🎯 Workflow de Déploiement Recommandé

### Phase 1 : Admin Uniquement (Maintenant)

1. **Déployer Admin** sur Vercel
   ```powershell
   cd apps/admin
   vercel --prod
   ```

2. **Configurer le domaine** dans Vercel :
   - Ajouter `obs-systeme.store/admin`
   - Ou simplement `obs-systeme.store` temporairement

3. **Tester** l'application Admin

### Phase 2 : Ajouter le Client (Plus tard)

1. **Créer l'app Client**
2. **Déployer séparément** ou dans le monorepo
3. **Configurer le routing** pour racine → Client

---

## 🔄 Alternative : Sous-répertoire Temporaire

Si vous voulez tester avant de configurer le domaine :

### Utiliser les URLs Vercel par défaut

```
https://obs-systeme-admin.vercel.app  → Admin
https://obs-systeme-client.vercel.app → Client
```

Puis rediriger votre domaine :
```
obs-systeme.store/admin → obs-systeme-admin.vercel.app
obs-systeme.store       → obs-systeme-client.vercel.app
```

---

## 📊 Architecture Finale

```
obs-systeme.store
│
├── /admin          → Application Admin (SONUTEC)
│   ├── /login
│   ├── /dashboard
│   └── /...
│
└── /               → Application Client (Établissements)
    ├── /login
    ├── /pos
    ├── /stock
    └── /...
```

---

## ⚠️ Points Importants

### 1. Base Path dans Vite

Le `base: '/admin/'` est **crucial** :
- Tous les assets (JS, CSS, images) seront préfixés avec `/admin/`
- Sans ça, les chemins seront cassés

### 2. Router React (à venir)

Quand vous ajouterez React Router, utilisez :

```typescript
<BrowserRouter basename="/admin">
  <Routes>
    <Route path="/" element={<Dashboard />} />
    {/* Les routes seront /admin/, /admin/dashboard, etc. */}
  </Routes>
</BrowserRouter>
```

### 3. Variables d'Environnement

Toujours utiliser les variables pour les URLs :
```typescript
const adminUrl = import.meta.env.VITE_ADMIN_URL;
// https://obs-systeme.store/admin
```

---

## 🐛 Dépannage

### Problème : 404 sur les assets

**Cause** : Base path mal configuré

**Solution** :
```typescript
// apps/admin/vite.config.ts
base: '/admin/',  // Le slash final est important
```

### Problème : Redirections Supabase échouent

**Solution** : Vérifier les Redirect URLs dans Supabase incluent `/admin`:
```
https://obs-systeme.store/admin/**
```

### Problème : CSS/JS ne se chargent pas

**Cause** : Les fichiers sont cherchés au mauvais endroit

**Solution** : Vérifier dans le HTML généré que les chemins commencent par `/admin/`

---

## 📝 Checklist de Déploiement

- [ ] `.env.local` mis à jour avec les nouvelles URLs
- [ ] `vite.config.ts` a `base: '/admin/'`
- [ ] Build local réussi (`npm run build`)
- [ ] Assets ont le bon chemin dans le build
- [ ] Vercel configuré avec le bon routing
- [ ] DNS pointé vers Vercel
- [ ] Redirect URLs Supabase mis à jour
- [ ] Test de connexion en production
- [ ] Vérification des assets (CSS, JS, images)

---

## 🎯 Prochaines Étapes

1. **Mettre à jour `.env.local`** :
   ```powershell
   notepad .env.local
   ```
   Changez les URLs pour :
   ```
   VITE_ADMIN_URL=https://obs-systeme.store/admin
   VITE_CLIENT_URL=https://obs-systeme.store
   ```

2. **Tester le build** :
   ```powershell
   npm run build:admin
   ```

3. **Déployer** :
   ```powershell
   npm run deploy:admin
   ```

4. **Configurer le domaine** dans Vercel Dashboard

5. **Mettre à jour Supabase** Redirect URLs

---

## 💡 Recommandation

Pour simplifier, je recommande **Option 1** (deux projets Vercel) pour commencer :

1. Déployez Admin sur son propre projet Vercel
2. Configurez le domaine après pour pointer `/admin` vers ce projet
3. Plus tard, déployez Client sur un autre projet pour la racine

C'est plus simple à gérer et à déboguer !

---

**Tout est configuré ! Vous pouvez maintenant déployer avec votre domaine obs-systeme.store** 🚀
