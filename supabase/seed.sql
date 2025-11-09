-- PhonesPOS - Données de démarrage (Seed)

-- =====================================================
-- SUPER ADMIN SONUTEC
-- =====================================================
-- Note: L'utilisateur doit être créé via Supabase Auth
-- Ensuite, insérer dans la table users avec le bon UUID

-- Exemple d'insertion (remplacer les UUIDs par les vrais)
-- INSERT INTO users (id, email, full_name, role, is_active)
-- VALUES (
--   'uuid-de-l-utilisateur-auth',
--   'admin@obs-systeme.store',
--   'Admin SONUTEC',
--   'super_admin',
--   true
-- );

-- =====================================================
-- ÉTABLISSEMENT DE TEST
-- =====================================================
INSERT INTO establishments (
  id,
  name,
  owner_name,
  email,
  phone,
  address,
  subscription_status,
  subscription_expires_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'TechPhone Dakar',
  'Amadou Diop',
  'contact@techphone.sn',
  '+221771234567',
  'Rue 10, Dakar, Sénégal',
  'active',
  CURRENT_DATE + INTERVAL '30 days'
);

-- =====================================================
-- BOUTIQUES DE TEST
-- =====================================================
INSERT INTO shops (tenant_id, name, address, phone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Boutique Sandaga', 'Marché Sandaga, Dakar', '+221771234567'),
  ('00000000-0000-0000-0000-000000000001', 'Boutique HLM', 'HLM Grand Yoff, Dakar', '+221771234568');

-- =====================================================
-- CATÉGORIES DE PRODUITS
-- =====================================================
INSERT INTO categories (tenant_id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Smartphones', 'Téléphones intelligents'),
  ('00000000-0000-0000-0000-000000000001', 'Accessoires', 'Accessoires pour téléphones'),
  ('00000000-0000-0000-0000-000000000001', 'Tablettes', 'Tablettes électroniques'),
  ('00000000-0000-0000-0000-000000000001', 'Écouteurs', 'Écouteurs et casques audio');

-- =====================================================
-- PRODUITS DE TEST
-- =====================================================
INSERT INTO products (
  tenant_id,
  category_id,
  name,
  sku,
  brand,
  model,
  cost_price,
  selling_price,
  stock_quantity,
  min_stock_level,
  has_imei,
  warranty_months
) 
SELECT 
  '00000000-0000-0000-0000-000000000001',
  c.id,
  'Samsung Galaxy A54',
  'SAM-A54-BLK',
  'Samsung',
  'Galaxy A54',
  250000,
  320000,
  15,
  5,
  true,
  12
FROM categories c WHERE c.name = 'Smartphones' LIMIT 1;

INSERT INTO products (
  tenant_id,
  category_id,
  name,
  sku,
  brand,
  model,
  cost_price,
  selling_price,
  stock_quantity,
  min_stock_level,
  has_imei,
  warranty_months
) 
SELECT 
  '00000000-0000-0000-0000-000000000001',
  c.id,
  'iPhone 14',
  'APL-IP14-BLK',
  'Apple',
  'iPhone 14',
  550000,
  680000,
  8,
  3,
  true,
  12
FROM categories c WHERE c.name = 'Smartphones' LIMIT 1;

INSERT INTO products (
  tenant_id,
  category_id,
  name,
  sku,
  brand,
  cost_price,
  selling_price,
  stock_quantity,
  min_stock_level,
  has_imei,
  warranty_months
) 
SELECT 
  '00000000-0000-0000-0000-000000000001',
  c.id,
  'Coque Samsung A54',
  'ACC-CSE-A54',
  'Generic',
  2000,
  3500,
  50,
  10,
  false,
  0
FROM categories c WHERE c.name = 'Accessoires' LIMIT 1;

INSERT INTO products (
  tenant_id,
  category_id,
  name,
  sku,
  brand,
  model,
  cost_price,
  selling_price,
  stock_quantity,
  min_stock_level,
  has_imei
) 
SELECT 
  '00000000-0000-0000-0000-000000000001',
  c.id,
  'AirPods Pro',
  'APL-AIRP-PRO',
  'Apple',
  'AirPods Pro',
  120000,
  150000,
  12,
  5,
  false
FROM categories c WHERE c.name = 'Écouteurs' LIMIT 1;

-- =====================================================
-- ABONNEMENT ACTIF
-- =====================================================
INSERT INTO subscriptions (
  tenant_id,
  plan_name,
  price,
  start_date,
  end_date,
  status,
  auto_renew
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Standard',
  20000,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  'active',
  false
);

-- =====================================================
-- NOTES
-- =====================================================
-- Pour créer des utilisateurs:
-- 1. Créer l'utilisateur via Supabase Auth (email/password)
-- 2. Récupérer l'UUID généré
-- 3. Insérer dans la table users avec le tenant_id approprié
-- 
-- Exemple:
-- INSERT INTO users (id, tenant_id, email, full_name, role, shop_id)
-- VALUES (
--   'uuid-from-auth',
--   '00000000-0000-0000-0000-000000000001',
--   'manager@techphone.sn',
--   'Fatou Sall',
--   'manager',
--   (SELECT id FROM shops WHERE name = 'Boutique Sandaga' LIMIT 1)
-- );
