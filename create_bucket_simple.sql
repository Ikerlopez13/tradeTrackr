-- Crear bucket de forma simple
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trade-screenshots', 
  'trade-screenshots', 
  true, 
  5242880, -- 5MB en bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Agregar columna screenshot_url si no existe
ALTER TABLE trades ADD COLUMN IF NOT EXISTS screenshot_url TEXT; 