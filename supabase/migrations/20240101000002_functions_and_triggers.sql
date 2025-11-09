-- PhonesPOS - Fonctions et Triggers Automatiques

-- =====================================================
-- FONCTION: Vérifier le statut de l'abonnement
-- =====================================================
CREATE OR REPLACE FUNCTION check_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si l'abonnement est expiré
  IF NEW.subscription_expires_at < NOW() THEN
    NEW.subscription_status = 'expired';
  ELSIF NEW.subscription_expires_at > NOW() THEN
    NEW.subscription_status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_subscription_status
  BEFORE INSERT OR UPDATE ON establishments
  FOR EACH ROW
  EXECUTE FUNCTION check_subscription_status();

-- =====================================================
-- FONCTION: Limiter les ventes pour abonnement expiré
-- =====================================================
CREATE OR REPLACE FUNCTION check_sales_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription_status VARCHAR(20);
  v_sales_today INTEGER;
BEGIN
  -- Récupérer le statut d'abonnement
  SELECT subscription_status INTO v_subscription_status
  FROM establishments
  WHERE id = NEW.tenant_id;
  
  -- Si abonnement expiré, vérifier le nombre de ventes aujourd'hui
  IF v_subscription_status = 'expired' THEN
    SELECT COUNT(*) INTO v_sales_today
    FROM sales
    WHERE tenant_id = NEW.tenant_id
    AND DATE(created_at) = CURRENT_DATE;
    
    -- Limiter à 10 ventes par jour
    IF v_sales_today >= 10 THEN
      RAISE EXCEPTION 'Abonnement expiré : limite de 10 ventes/jour atteinte. Veuillez renouveler votre abonnement.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_sales_limit
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION check_sales_limit();

-- =====================================================
-- FONCTION: Mettre à jour le stock après une vente
-- =====================================================
CREATE OR REPLACE FUNCTION update_stock_after_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Décrémenter le stock du produit
  UPDATE products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;
  
  -- Enregistrer le mouvement de stock
  INSERT INTO stock_movements (
    tenant_id,
    product_id,
    shop_id,
    movement_type,
    quantity,
    user_id,
    reference
  )
  SELECT 
    s.tenant_id,
    NEW.product_id,
    s.shop_id,
    'sale',
    -NEW.quantity,
    s.user_id,
    s.invoice_number
  FROM sales s
  WHERE s.id = NEW.sale_id;
  
  -- Marquer l'IMEI comme vendu si présent
  IF NEW.imei IS NOT NULL THEN
    UPDATE product_imeis
    SET status = 'sold', sold_at = NOW()
    WHERE imei = NEW.imei;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_after_sale
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_after_sale();

-- =====================================================
-- FONCTION: Logger les actions importantes
-- =====================================================
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Appliquer l'audit sur les tables critiques
CREATE TRIGGER trigger_audit_sales
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION log_audit();

CREATE TRIGGER trigger_audit_products
  AFTER UPDATE OR DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_audit();

CREATE TRIGGER trigger_audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_audit();

-- =====================================================
-- FONCTION: Activer l'abonnement après paiement validé
-- =====================================================
CREATE OR REPLACE FUNCTION activate_subscription_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription_id UUID;
  v_current_end_date DATE;
  v_new_end_date DATE;
BEGIN
  -- Si le paiement est validé
  IF NEW.status = 'validated' AND OLD.status = 'pending' THEN
    -- Récupérer la souscription
    SELECT id, end_date INTO v_subscription_id, v_current_end_date
    FROM subscriptions
    WHERE tenant_id = NEW.tenant_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Calculer la nouvelle date de fin (30 jours)
    IF v_current_end_date > CURRENT_DATE THEN
      v_new_end_date := v_current_end_date + INTERVAL '30 days';
    ELSE
      v_new_end_date := CURRENT_DATE + INTERVAL '30 days';
    END IF;
    
    -- Créer ou mettre à jour l'abonnement
    IF v_subscription_id IS NOT NULL THEN
      UPDATE subscriptions
      SET end_date = v_new_end_date,
          status = 'active'
      WHERE id = v_subscription_id;
    ELSE
      INSERT INTO subscriptions (
        tenant_id,
        plan_name,
        price,
        start_date,
        end_date,
        status
      ) VALUES (
        NEW.tenant_id,
        'Standard',
        NEW.amount,
        CURRENT_DATE,
        v_new_end_date,
        'active'
      );
    END IF;
    
    -- Mettre à jour l'établissement
    UPDATE establishments
    SET subscription_status = 'active',
        subscription_expires_at = v_new_end_date
    WHERE id = NEW.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_activate_subscription
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION activate_subscription_after_payment();

-- =====================================================
-- FONCTION: Générer un numéro de facture unique
-- =====================================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_date VARCHAR(8);
  v_sequence INTEGER;
BEGIN
  -- Format: INV-YYYYMMDD-XXXX
  v_prefix := 'INV';
  v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  -- Récupérer la séquence du jour
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM LENGTH(invoice_number) - 3) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM sales
  WHERE tenant_id = NEW.tenant_id
  AND DATE(created_at) = CURRENT_DATE;
  
  NEW.invoice_number := v_prefix || '-' || v_date || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_invoice_number
  BEFORE INSERT ON sales
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- FONCTION: Générer un numéro de réparation unique
-- =====================================================
CREATE OR REPLACE FUNCTION generate_repair_number()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_date VARCHAR(8);
  v_sequence INTEGER;
BEGIN
  -- Format: REP-YYYYMMDD-XXXX
  v_prefix := 'REP';
  v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  -- Récupérer la séquence du jour
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(repair_number FROM LENGTH(repair_number) - 3) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM repairs
  WHERE tenant_id = NEW.tenant_id
  AND DATE(created_at) = CURRENT_DATE;
  
  NEW.repair_number := v_prefix || '-' || v_date || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_repair_number
  BEFORE INSERT ON repairs
  FOR EACH ROW
  WHEN (NEW.repair_number IS NULL)
  EXECUTE FUNCTION generate_repair_number();

-- =====================================================
-- VUE: Dashboard statistiques
-- =====================================================
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
  e.id as tenant_id,
  e.name as establishment_name,
  COUNT(DISTINCT s.id) as total_shops,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT p.id) as total_products,
  SUM(p.stock_quantity) as total_stock,
  COUNT(DISTINCT CASE WHEN DATE(sa.created_at) = CURRENT_DATE THEN sa.id END) as sales_today,
  COALESCE(SUM(CASE WHEN DATE(sa.created_at) = CURRENT_DATE THEN sa.total_amount ELSE 0 END), 0) as revenue_today,
  COUNT(DISTINCT CASE WHEN DATE(sa.created_at) >= DATE_TRUNC('month', CURRENT_DATE) THEN sa.id END) as sales_this_month,
  COALESCE(SUM(CASE WHEN DATE(sa.created_at) >= DATE_TRUNC('month', CURRENT_DATE) THEN sa.total_amount ELSE 0 END), 0) as revenue_this_month,
  e.subscription_status,
  e.subscription_expires_at
FROM establishments e
LEFT JOIN shops s ON s.tenant_id = e.id AND s.is_active = true
LEFT JOIN users u ON u.tenant_id = e.id AND u.is_active = true
LEFT JOIN products p ON p.tenant_id = e.id AND p.is_active = true
LEFT JOIN sales sa ON sa.tenant_id = e.id
GROUP BY e.id, e.name, e.subscription_status, e.subscription_expires_at;
