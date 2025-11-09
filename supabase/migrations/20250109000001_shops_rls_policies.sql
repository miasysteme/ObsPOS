-- RLS Policies for shops table
-- Enable RLS (already enabled, but good to confirm)
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can do everything
CREATE POLICY "Super admins have full access to shops"
ON shops
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

-- Policy: Owners can manage their establishment's shops
CREATE POLICY "Owners can manage their establishment shops"
ON shops
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'owner'
    AND users.tenant_id = shops.tenant_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'owner'
    AND users.tenant_id = shops.tenant_id
  )
);

-- Policy: Managers can view and update their shop
CREATE POLICY "Managers can view and update their shop"
ON shops
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'manager'
    AND users.shop_id = shops.id
  )
);

CREATE POLICY "Managers can update their shop"
ON shops
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'manager'
    AND users.shop_id = shops.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'manager'
    AND users.shop_id = shops.id
  )
);

-- Policy: Cashiers can view their shop
CREATE POLICY "Cashiers can view their shop"
ON shops
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('cashier', 'warehouse', 'technician')
    AND users.shop_id = shops.id
  )
);

-- Add comment
COMMENT ON TABLE shops IS 'Boutiques avec politiques RLS pour super_admin, owner, manager, cashier';
