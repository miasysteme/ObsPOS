# ⚡ Démarrage Rapide - PhonesPOS

## 🎯 Pour commencer MAINTENANT

### Étape 1 : Installer les dépendances (5 min)

Ouvrez PowerShell dans ce dossier et exécutez :

```powershell
npm install
```

⏳ Patientez pendant l'installation (2-5 minutes selon votre connexion)

---

### Étape 2 : Créer un compte Supabase (GRATUIT) (10 min)

1. **Allez sur** : https://supabase.com/
2. **Cliquez** : "Start your project"
3. **Créez un compte** avec GitHub ou email
4. **Créez un nouveau projet** :
   - Organization : "SONUTEC" (ou votre nom)
   - Project name : "phonespos"
   - Database Password : (choisissez un mot de passe fort)
   - Region : "West EU (Ireland)" ou proche
   - Pricing Plan : **FREE** (suffisant pour démarrer)

⏳ Le projet Supabase prend ~2 minutes à se créer

5. **Notez ces informations** (dans Settings > API) :
   - **Project URL** : `https://xxxxxxxxxx.supabase.co`
   - **anon/public key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

### Étape 3 : Appliquer le schéma de base de données (5 min)

#### Option A : Via l'interface Supabase (Recommandé pour débuter)

1. Dans Supabase, allez dans **SQL Editor**
2. Créez une nouvelle requête
3. Copiez le contenu de `supabase/migrations/20240101000000_initial_schema.sql`
4. Collez et exécutez (bouton "Run")
5. Répétez pour `20240101000001_row_level_security.sql`
6. Répétez pour `20240101000002_functions_and_triggers.sql`
7. (Optionnel) Exécutez `supabase/seed.sql` pour les données de test

#### Option B : Via Supabase CLI

```powershell
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier le projet
supabase link --project-ref votre-project-ref

# Pousser les migrations
supabase db push
```

---

### Étape 4 : Configuration environnement (2 min)

1. **Copiez** le fichier `.env.example` :
```powershell
cp .env.example .env.local
```

2. **Modifiez** `.env.local` avec vos informations Supabase :
```env
VITE_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Étape 5 : Créer le super admin (3 min)

1. Dans Supabase, allez dans **Authentication > Users**
2. Cliquez **"Add user"** → **"Create new user"**
3. Remplissez :
   - Email : `admin@obs-systeme.store`
   - Password : (choisissez un mot de passe sécurisé)
   - ✅ Auto Confirm User
4. Cliquez **"Create user"**
5. **Copiez l'UUID** de l'utilisateur créé

6. Allez dans **SQL Editor** et exécutez :
```sql
INSERT INTO users (id, email, full_name, role, is_active)
VALUES (
  'COLLEZ-UUID-ICI',  -- UUID de l'étape 5
  'admin@obs-systeme.store',
  'Admin SONUTEC',
  'super_admin',
  true
);
```

---

### Étape 6 : Lancer l'application Admin (1 min)

```powershell
npm run dev:admin
```

🎉 Ouvrez votre navigateur : **http://localhost:3001**

**Connectez-vous avec** :
- Email : `admin@obs-systeme.store`
- Password : (celui que vous avez créé)

---

## ✅ Vérifications

Si tout fonctionne, vous devriez voir :

1. ✅ Page de connexion élégante (fond marron/orange)
2. ✅ Après connexion → Dashboard avec 4 cartes statistiques
3. ✅ Sidebar avec navigation (Dashboard, Établissements, etc.)
4. ✅ Aucune erreur dans la console navigateur

---

## 🐛 Problèmes Courants

### Erreur : "Invalid API key"
➡️ Vérifiez que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont corrects dans `.env.local`

### Erreur : "Email not confirmed"
➡️ Dans Supabase Auth, cliquez sur l'utilisateur et **"Confirm email"**

### Erreur : "Access denied" après connexion
➡️ Vérifiez que l'utilisateur a bien le rôle `super_admin` dans la table `users`

### Port 3001 déjà utilisé
➡️ Modifiez le port dans `apps/admin/vite.config.ts` (ligne `port: 3001`)

---

## 📚 Prochaines Étapes

Une fois l'application lancée :

1. **Explorez le Dashboard** actuel
2. **Lisez** `ROADMAP.md` pour comprendre la suite
3. **Commencez** par le module "Gestion des Établissements"

---

## 🎓 Ressources Utiles

- **Documentation complète** : `README.md`
- **Guide installation** : `INSTALLATION.md`
- **Feuille de route** : `ROADMAP.md`
- **Résumé projet** : `PROJET_RESUME.md`

---

## 💡 Conseils

### Mode Développement
- Utilisez **Chrome DevTools** pour déboguer
- Installez **React Developer Tools** (extension Chrome)
- Utilisez **Supabase Studio** pour gérer la base de données

### Organisation
- Créez une branche Git pour chaque fonctionnalité
- Commitez régulièrement
- Testez après chaque modification

---

## 🚀 Commandes Utiles

```powershell
# Lancer Admin
npm run dev:admin

# Lancer Client (quand créé)
npm run dev:client

# Build pour production
npm run build:admin

# Vérifier les types TypeScript
npm run type-check

# Générer les types Supabase
npm run db:types
```

---

## 📞 Besoin d'Aide ?

1. **Consultez** `INSTALLATION.md` pour plus de détails
2. **Vérifiez** les logs dans la console du navigateur
3. **Inspectez** les requêtes Supabase dans l'onglet Network

---

**Temps total estimé : ~25 minutes**

Bonne chance ! 🎉
