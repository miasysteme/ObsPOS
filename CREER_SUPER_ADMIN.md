# 🔐 Créer le Super Administrateur

## Étape 1 : Créer l'utilisateur dans Supabase Auth

1. **Ouvrez** Supabase Dashboard : https://supabase.com/dashboard/project/frpaidnzwnokektodkay

2. **Allez dans** : **Authentication** → **Users**

3. **Cliquez** sur **"Add user"** → **"Create new user"**

4. **Remplissez** :
   ```
   Email: admin@obs-systeme.store
   Password: [choisissez un mot de passe sécurisé]
   ✅ Auto Confirm User (cochez cette case !)
   ```

5. **Cliquez** sur **"Create user"**

6. **IMPORTANT** : **Copiez l'UUID** de l'utilisateur créé
   - Il apparaît dans la colonne "ID" de la liste
   - Format : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

## Étape 2 : Ajouter l'utilisateur dans la table users

1. **Allez dans** : **SQL Editor**

2. **Créez une nouvelle requête**

3. **Collez ce SQL** (remplacez `VOTRE-UUID-ICI` par l'UUID copié) :

```sql
INSERT INTO public.users (id, email, full_name, role, is_active)
VALUES (
  'VOTRE-UUID-ICI',  -- ← Remplacez par l'UUID de l'étape 1
  'admin@obs-systeme.store',
  'Admin ObsPOS',
  'super_admin',
  true
);
```

4. **Cliquez** sur **"Run"**

5. **Vérifiez** que la requête retourne : `Success. 1 rows affected.`

---

## ✅ Vérification

Pour vérifier que tout fonctionne :

```sql
SELECT id, email, full_name, role, is_active
FROM public.users
WHERE role = 'super_admin';
```

Vous devriez voir votre super admin !

---

## 🚀 Prêt pour le Déploiement !

Maintenant vous pouvez :

1. **Installer les dépendances** :
   ```powershell
   npm install
   ```

2. **Lancer l'application** :
   ```powershell
   npm run dev:admin
   ```

3. **Ouvrir** : http://localhost:3001

4. **Se connecter** avec :
   - Email : `admin@obs-systeme.store`
   - Password : [celui que vous avez choisi]

---

## 📝 Configuration Redirect URLs Supabase

N'oubliez pas d'ajouter les URLs autorisées dans :
**Authentication** → **URL Configuration** → **Redirect URLs** :

```
https://obs-systeme.store/admin/**
https://obs-systeme.store/**
http://localhost:3001/**
http://localhost:3000/**
```

**Site URL** :
```
https://obs-systeme.store
```

---

## 🎯 Résumé de ce qui est fait

✅ Base de données créée (15 tables)
✅ RLS activé sur toutes les tables
✅ Triggers et fonctions automatiques
✅ .env.local configuré
✅ Super admin à créer (vous êtes sur cette étape !)

**Prochaines étapes** :
1. Créer le super admin (ci-dessus)
2. Installer les dépendances
3. Lancer l'application
4. Déployer sur Vercel
