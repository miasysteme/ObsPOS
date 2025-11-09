-- Add missing columns to shops table for admin module compatibility
ALTER TABLE shops ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS print_config JSONB DEFAULT '{
  "format": "A4",
  "show_logo": true,
  "show_header": true,
  "header_text": "",
  "footer_text": "Merci de votre visite !"
}'::jsonb;

-- Add comments
COMMENT ON COLUMN shops.email IS 'Email de contact de la boutique';
COMMENT ON COLUMN shops.logo_url IS 'URL du logo de la boutique (Supabase Storage)';
COMMENT ON COLUMN shops.print_config IS 'Configuration POS pour l''impression des tickets (format, logo, header, footer)';
