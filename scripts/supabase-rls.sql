-- Supabase RLS baseline for Food POS tables.
-- Apply only when running on Supabase/Postgres.
-- Note: this policy set expects authenticated users via Supabase Auth.

ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appetizer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appetizer_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_read ON categories;
DROP POLICY IF EXISTS menu_items_read ON menu_items;
DROP POLICY IF EXISTS appetizer_groups_read ON appetizer_groups;
DROP POLICY IF EXISTS appetizer_variants_read ON appetizer_variants;
DROP POLICY IF EXISTS orders_read ON orders;
DROP POLICY IF EXISTS orders_write ON orders;
DROP POLICY IF EXISTS order_items_read ON order_items;
DROP POLICY IF EXISTS order_items_write ON order_items;

CREATE POLICY categories_read ON categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY menu_items_read ON menu_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY appetizer_groups_read ON appetizer_groups
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY appetizer_variants_read ON appetizer_variants
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY orders_read ON orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY orders_write ON orders
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY order_items_read ON order_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY order_items_write ON order_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
