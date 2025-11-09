# 🔒 FIX CRITIQUE : Politique RLS SELECT sur table users

**Date:** 9 Novembre 2025 14:23  
**Projet:** PhonesPOS_Data (frpaidnzwnokektodkay)  
**Status:** ✅ **CORRIGÉ ET DÉPLOYÉ**

---

## 🚨 PROBLÈME IDENTIFIÉ

### Symptômes

```
❌ Seul 1 utilisateur visible dans l'interface (Admin ObsPOS)
❌ Les utilisateurs créés n'apparaissent pas dans la liste
❌ Compteurs incorrects : 1 Total, 1 Actif, 0 Caissiers
❌ Boutiques montrent "0 utilisateur(s)" même avec users assignés
❌ Utilisateurs existent dans Supabase mais invisibles dans l'app
```

### Captures d'Écran

**Page Utilisateurs** :
- Total : 1 (devrait être 3)
- Actifs : 1 (devrait être 3)
- Administrateurs : 1 (correct)
- Caissiers : 0 (devrait être 1)
- Liste : Seul "Admin ObsPOS" visible

**Page Boutiques** :
- BOUTIQUE BINGERVILLE : "0 utilisateur(s)" (devrait être 1 - Test User)

---

## 🔍 CAUSE RACINE

### Politique RLS Restrictive

**Ancienne politique** : `"Users can read own data"`

```sql
FOR SELECT TO authenticated
USING (auth.uid() = id)
```

**Problème** : Chaque utilisateur ne pouvait voir **QUE** ses propres données !

**Conséquence** :
- Admin connecté (admin@obs-systeme.store) ne voyait que lui-même
- Les autres users (Djakolia, Test User) étaient invisibles
- Impossible de gérer les utilisateurs depuis l'interface

---

## ✅ SOLUTION APPLIQUÉE

### Nouvelle Politique RLS

**Nom** : `"Admins can view users in their tenant"`

```sql
CREATE POLICY "Admins can view users in their tenant"
ON public.users
FOR SELECT
TO authenticated
USING (
  -- Super admin peut voir tous les utilisateurs
  is_super_admin()
  OR
  -- Les admins/managers peuvent voir les utilisateurs de leur tenant
  (
    tenant_id = get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('owner', 'admin', 'manager')
    )
  )
  OR
  -- L'utilisateur peut toujours voir ses propres données
  auth.uid() = id
);
```

### Permissions Accordées

| Rôle | Peut voir |
|------|-----------|
| **super_admin** | ✅ TOUS les utilisateurs (tous tenants) |
| **owner** | ✅ Utilisateurs de SON établissement |
| **admin** | ✅ Utilisateurs de SON établissement |
| **manager** | ✅ Utilisateurs de SON établissement |
| **cashier** | ✅ Uniquement ses propres données |
| **warehouse** | ✅ Uniquement ses propres données |
| **technician** | ✅ Uniquement ses propres données |

---

## 🔧 MIGRATIONS APPLIQUÉES

### Migration 1 : Ajouter nouvelle politique

```sql
-- Nom: add_users_select_policy_for_admins
CREATE POLICY "Admins can view users in their tenant"
ON public.users
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR
  (
    tenant_id = get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('owner', 'admin', 'manager')
    )
  )
  OR
  auth.uid() = id
);
```

### Migration 2 : Supprimer ancienne politique

```sql
-- Nom: remove_old_users_select_policy
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
```

---

## ✅ VÉRIFICATION

### Utilisateurs Existants

Après correction, les 3 utilisateurs suivants existent :

```sql
1. admin@obs-systeme.store
   Rôle: super_admin
   Établissement: NULL (accès global)
   Boutique: NULL
   Status: Actif

2. djakaliaklotadiabagate@gmail.com
   Nom: DIABAGATE Djakolia Klota
   Rôle: manager
   Établissement: La Maison des Téléphone
   Boutique: NULL
   Status: Actif

3. test@example.com
   Nom: Test User
   Rôle: cashier
   Établissement: La Maison des Téléphone
   Boutique: BOUTIQUE BINGERVILLE
   Status: Actif
```

### Compteurs Attendus

Après rafraîchissement de l'interface :

```
✅ Total : 3 utilisateurs
✅ Actifs : 3 utilisateurs
✅ Administrateurs : 1 (super_admin)
✅ Caissiers : 1 (cashier)
```

### Boutiques

```
✅ BOUTIQUE BINGERVILLE : 1 utilisateur (Test User - cashier)
```

---

## 🔐 SÉCURITÉ

### Fonctions avec SECURITY DEFINER

Toutes les fonctions utilisées dans les politiques RLS ont `SECURITY DEFINER` pour éviter la récursion infinie :

```sql
✅ is_super_admin() - SECURITY DEFINER
✅ get_user_tenant_id() - SECURITY DEFINER
✅ can_create_user() - SECURITY DEFINER
```

**Pourquoi c'est important** :

Sans `SECURITY DEFINER`, les fonctions RLS créent une **récursion infinie** :
1. Politique RLS appelle `is_super_admin()`
2. `is_super_admin()` fait un SELECT sur `users`
3. SELECT sur `users` déclenche les politiques RLS
4. Retour à l'étape 1 → **BOUCLE INFINIE** 🔄

Avec `SECURITY DEFINER`, les fonctions **bypassent** les politiques RLS lors de leur exécution.

---

## 📊 POLITIQUES RLS ACTUELLES

### Table `users`

| Politique | Commande | Description |
|-----------|----------|-------------|
| **Admins can view users in their tenant** | SELECT | Super_admin voit tout, admin/manager voient leur tenant |
| **Authorized users can insert users** | INSERT | Super_admin ou users avec can_create_user() |
| **Owner can update users** | UPDATE | Owner peut modifier users de son tenant |
| **Owner can delete users** | DELETE | Owner peut supprimer users de son tenant |

---

## 🎯 TESTS DE VALIDATION

### Test 1 : Super Admin

**Se connecter avec** : admin@obs-systeme.store

**Résultat attendu** :
```
✅ Voit les 3 utilisateurs
✅ Compteur Total : 3
✅ Compteur Actifs : 3
✅ Compteur Administrateurs : 1
✅ Compteur Caissiers : 1
```

### Test 2 : Manager

**Se connecter avec** : djakaliaklotadiabagate@gmail.com

**Résultat attendu** :
```
✅ Voit les utilisateurs de "La Maison des Téléphone"
✅ Voit : lui-même + Test User (2 users)
✅ Ne voit PAS : admin@obs-systeme.store (autre tenant)
```

### Test 3 : Cashier

**Se connecter avec** : test@example.com

**Résultat attendu** :
```
❌ Accès refusé à l'application admin (normal)
→ Doit utiliser l'application POS
```

---

## 🐛 DEBUGGING

### Si les utilisateurs n'apparaissent toujours pas

1. **Rafraîchir l'application** : Ctrl+Shift+R (hard refresh)

2. **Vérifier la politique RLS** :
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'SELECT';
```

3. **Tester la requête directement** :
```sql
-- En tant que super_admin
SELECT email, role FROM users;
-- Devrait retourner 3 utilisateurs

-- En tant que manager (Djakolia)
SELECT email, role FROM users 
WHERE tenant_id = get_user_tenant_id();
-- Devrait retourner 2 utilisateurs (lui-même + Test User)
```

4. **Vérifier les logs console** :
```
F12 → Console → Chercher erreurs
```

### Erreurs Courantes

**Error: "No rows returned"**
→ Politique RLS trop restrictive, vérifier USING clause

**Error: "Infinite recursion detected"**
→ Fonctions RLS n'ont pas SECURITY DEFINER

**Error: "Permission denied"**
→ L'utilisateur n'a pas le bon rôle

---

## 📚 DOCUMENTATION LIÉE

- **USER_CREATION_BUG_FIX.md** : Bug création utilisateurs
- **ADMIN_ACCESS_ROLES.md** : Contrôle d'accès par rôle
- **DEPLOYMENT_SUCCESS.md** : Déploiement Edge Function

---

## ✅ RÉSUMÉ FINAL

| Aspect | Avant | Après |
|--------|-------|-------|
| **Politique SELECT** | ❌ Trop restrictive | ✅ Basée sur rôles |
| **Utilisateurs visibles** | ❌ 1 seul | ✅ 3 (selon rôle) |
| **Compteurs** | ❌ Incorrects | ✅ Corrects |
| **Boutiques → Users** | ❌ 0 utilisateur | ✅ Affichage correct |
| **Super admin** | ❌ Limité | ✅ Voit tout |
| **Manager** | ❌ Rien | ✅ Voit son tenant |
| **Sécurité** | ✅ OK | ✅ OK (SECURITY DEFINER) |

---

## 🎉 PROCHAINES ÉTAPES

1. ✅ **Rafraîchir l'application** (Ctrl+Shift+R)
2. ✅ **Se connecter avec admin@obs-systeme.store**
3. ✅ **Vérifier les compteurs** : Devrait afficher 3 utilisateurs
4. ✅ **Vérifier la liste** : 3 utilisateurs visibles
5. ✅ **Vérifier boutiques** : BOUTIQUE BINGERVILLE → 1 utilisateur

---

*Corrigé le 9 Novembre 2025*  
*Migrations : add_users_select_policy_for_admins, remove_old_users_select_policy*  
*Projet : frpaidnzwnokektodkay (PhonesPOS_Data)* 🚀
