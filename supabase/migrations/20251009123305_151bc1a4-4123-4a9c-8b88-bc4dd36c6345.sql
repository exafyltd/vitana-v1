-- Change item_id from uuid to text to support all product types
-- This allows us to handle products with string IDs (supplements, external products)
-- as well as UUID-based IDs (lab tests)
ALTER TABLE cart_items ALTER COLUMN item_id TYPE text USING item_id::text;