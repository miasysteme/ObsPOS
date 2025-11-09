# Edge Function: create-user

## 📋 Description

Fonction serverless pour créer des utilisateurs avec privilèges admin, bypasse les problèmes de RLS lors de la création d'utilisateurs depuis le frontend.

## 🔧 Problème Résolu

**Avant** : Lors de la création d'utilisateur avec `signUp()`, la session bascule automatiquement sur le nouveau user (qui n'existe pas encore dans `public.users`), causant un échec RLS et "Accès refusé".

**Après** : Cette Edge Function utilise `SUPABASE_SERVICE_ROLE_KEY` pour bypasser RLS et créer l'utilisateur de manière atomique dans `auth.users` ET `public.users`.

## 🚀 Déploiement

### Prérequis
- Supabase CLI installé : `npm install -g supabase`
- Compte Supabase avec accès au projet

### Étapes

1. **Se connecter à Supabase** :
```bash
npx supabase login
```

2. **Lier le projet** (si pas déjà fait) :
```bash
npx supabase link --project-ref frpaidnzwnokektodkay
```

3. **Déployer la fonction** :
```bash
npx supabase functions deploy create-user
```

4. **Vérifier le déploiement** :
- Allez dans Supabase Dashboard → Edge Functions
- Vous devriez voir `create-user` listée et active

## 📡 Utilisation

### Depuis le Frontend

```typescript
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'secure-password',
    full_name: 'John Doe',
    role: 'manager',
    tenant_id: 'uuid-here',
    shop_id: 'uuid-here', // optionnel
    is_active: true,
  }),
});

const result = await response.json();
```

### Réponse Success

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "manager"
  }
}
```

### Réponse Error

```json
{
  "error": "Error message here"
}
```

## 🔐 Permissions

La fonction vérifie que l'appelant est :
- **super_admin** : peut créer pour n'importe quel tenant
- **admin** : peut créer uniquement pour son propre tenant

## 🛡️ Sécurité

- ✅ Vérification token JWT
- ✅ Vérification rôle appelant
- ✅ Validation tenant_id pour admins
- ✅ Rollback automatique si erreur (supprime de auth.users si insert public.users échoue)
- ✅ Auto-confirmation email (pas besoin de cliquer sur lien)

## 📝 Logs

Pour voir les logs de la fonction :
```bash
npx supabase functions logs create-user
```

## ⚡ Variables d'Environnement

La fonction utilise automatiquement :
- `SUPABASE_URL` : URL du projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service role (admin)
- `SUPABASE_ANON_KEY` : Clé anonyme

Ces variables sont automatiquement injectées par Supabase lors de l'exécution.

## 🐛 Debugging

Si la fonction ne fonctionne pas :

1. **Vérifier les logs** :
```bash
npx supabase functions logs create-user --tail
```

2. **Tester localement** :
```bash
npx supabase functions serve create-user
```

3. **Vérifier les permissions** :
- Dashboard → Settings → API → Service Role Key doit être configurée
- Edge Functions doivent être activées pour le projet

## 🔄 Rollback

En cas d'erreur lors de l'insertion dans `public.users`, la fonction supprime automatiquement l'utilisateur de `auth.users` pour éviter les comptes fantômes.

---

*Créé le 9 Novembre 2025 - Fix bug RLS création utilisateurs*
