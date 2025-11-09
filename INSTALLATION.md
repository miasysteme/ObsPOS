# Guide d'Installation - PhonesPOS

## 📋 Prérequis

- **Node.js** 18+ ([télécharger](https://nodejs.org/))
- **npm** 9+ (inclus avec Node.js)
- **Compte Supabase** ([créer un compte gratuit](https://supabase.com/))
- **Git** (optionnel)

## 🚀 Installation

### 1. Installation des dépendances

Ouvrez PowerShell dans le dossier du projet et exécutez :

```powershell
# Installer toutes les dépendances du monorepo
npm install
```

### 2. Configuration Supabase

#### A. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com/) et créez un nouveau projet
2. Notez l'URL du projet et la clé `anon` (publique)

#### B. Appliquer les migrations

1. Installer Supabase CLI :
```powershell
npm install -g supabase
```

2. Se connecter à Supabase :
```powershell
supabase login
```

3. Lier le projet local au projet Supabase :
```powershell
supabase link --project-ref your-project-ref
```

4. Pousser les migrations :
```powershell
supabase db push
```

5. (Optionnel) Charger les données de test :
```sql
# Connectez-vous au SQL Editor sur supabase.com et exécutez le contenu du fichier :
# supabase/seed.sql
```

### 3. Configuration des variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```bash
cp .env.example .env.local
```

Modifiez `.env.local` avec vos informations Supabase :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Wave API (optionnel pour l'instant)
VITE_WAVE_API_KEY=
VITE_WAVE_SECRET=

# URLs
VITE_ADMIN_URL=http://localhost:3001
VITE_CLIENT_URL=http://localhost:3000

# Configuration abonnement
VITE_SUBSCRIPTION_PRICE=20000
VITE_GRACE_PERIOD_DAYS=10
VITE_LIMITED_SALES_PER_DAY=10
```

### 4. Créer un super administrateur

1. Allez dans l'interface Supabase : **Authentication > Users**
2. Cliquez sur **Add user** et créez un utilisateur avec :
   - Email : `admin@obs-systeme.store`
   - Password : (mot de passe sécurisé)
3. Notez l'UUID de l'utilisateur créé
4. Allez dans **SQL Editor** et exécutez :

```sql
INSERT INTO users (id, email, full_name, role, is_active)
VALUES (
  'uuid-de-l-utilisateur-auth',  -- Remplacez par l'UUID réel
  'admin@obs-systeme.store',
  'Admin SONUTEC',
  'super_admin',
  true
);
```

## 🏃 Lancement de l'application

### Application Admin (SONUTEC)

```powershell
npm run dev:admin
```

L'application sera accessible sur : **http://localhost:3001**

### Application Client (Établissements)

```powershell
npm run dev:client
```

L'application sera accessible sur : **http://localhost:3000**

## 🔐 Connexion

### Admin SONUTEC
- URL : http://localhost:3001
- Email : admin@obs-systeme.store
- Mot de passe : celui que vous avez défini

## 📦 Build pour production

### Build Admin
```powershell
npm run build:admin
```

### Build Client
```powershell
npm run build:client
```

### Build tout
```powershell
npm run build:all
```

## 🐛 Résolution des problèmes

### Erreur : "Cannot find module"
```powershell
# Supprimer node_modules et réinstaller
rm -r node_modules
npm install
```

### Erreur de connexion Supabase
- Vérifiez que les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont correctes
- Vérifiez que les migrations ont été appliquées

### Erreur de permission base de données
- Vérifiez que RLS (Row Level Security) est activé
- Vérifiez que l'utilisateur a bien le rôle `super_admin`

## 📝 Commandes utiles

```powershell
# Générer les types TypeScript depuis Supabase
npm run db:types

# Réinitialiser la base de données (ATTENTION : supprime toutes les données)
npm run db:reset

# Vérifier les types TypeScript
npm run type-check

# Linter
npm run lint
```

## 🌐 Déploiement

### Frontend (Vercel)
1. Créez un compte sur [vercel.com](https://vercel.com/)
2. Importez le dépôt Git
3. Configurez :
   - **Root Directory** : `apps/admin` (ou `apps/client`)
   - **Build Command** : `npm run build`
   - **Environment Variables** : Ajoutez toutes les variables `.env.local`

### Backend (Supabase)
Le backend est déjà hébergé sur Supabase Cloud. Aucune action supplémentaire nécessaire.

## 📚 Documentation

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation React](https://react.dev/)
- [Documentation Tailwind CSS](https://tailwindcss.com/)
- [Documentation shadcn/ui](https://ui.shadcn.com/)

## 🆘 Support

Pour toute question ou problème :
- Email : support@sonutec.com
- Documentation du projet : Voir `README.md`
