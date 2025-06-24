-- Verificar que el bucket existe
SELECT * FROM storage.buckets WHERE id = 'trade-screenshots';

-- Verificar las políticas de storage
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%screenshot%';

-- Verificar que la columna screenshot_url existe en trades
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trades' 
AND column_name = 'screenshot_url';

-- Verificar las nuevas columnas en profiles
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('referral_code', 'referrals_count', 'rewards_count', 'pro_progress'); 