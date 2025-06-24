-- Crear bucket de almacenamiento para screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para Storage (screenshots)
CREATE POLICY "Users can upload own screenshots" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'trade-screenshots' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own screenshots" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trade-screenshots' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own screenshots" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'trade-screenshots' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own screenshots" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'trade-screenshots' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Agregar columna screenshot_url a la tabla trades si no existe
ALTER TABLE trades ADD COLUMN IF NOT EXISTS screenshot_url TEXT; 