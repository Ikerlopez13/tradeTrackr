-- Solo agregar columnas que puedan faltar
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referrals_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rewards_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_progress INTEGER DEFAULT 0;

-- Agregar columna screenshot_url a trades si no existe
ALTER TABLE trades ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Crear bucket de almacenamiento para screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para Storage (screenshots) - Solo si no existen
DO $$ 
BEGIN
  -- Política para subir screenshots
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload own screenshots') THEN
    CREATE POLICY "Users can upload own screenshots" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'trade-screenshots' AND 
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  -- Política para ver screenshots
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can view own screenshots') THEN
    CREATE POLICY "Users can view own screenshots" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'trade-screenshots' AND 
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  -- Política para actualizar screenshots
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can update own screenshots') THEN
    CREATE POLICY "Users can update own screenshots" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'trade-screenshots' AND 
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  -- Política para eliminar screenshots
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete own screenshots') THEN
    CREATE POLICY "Users can delete own screenshots" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'trade-screenshots' AND 
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$; 