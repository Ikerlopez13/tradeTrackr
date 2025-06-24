-- 1. Asegurar que existe la columna account_balance
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'account_balance'
    ) THEN
        ALTER TABLE profiles ADD COLUMN account_balance DECIMAL(15,2) DEFAULT 1000.00;
        RAISE NOTICE 'Columna account_balance añadida a profiles';
    ELSE
        RAISE NOTICE 'Columna account_balance ya existe';
    END IF;
END $$;

-- 2. Asegurar que RLS está habilitado en profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas existentes que puedan estar causando problemas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 4. Crear políticas RLS correctas para profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Verificar que los usuarios existentes tienen registros en profiles
INSERT INTO profiles (id, username, account_balance, is_premium)
SELECT 
    au.id,
    COALESCE(au.email, 'user_' || au.id),
    1000.00,
    false
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 6. Actualizar registros existentes que no tengan account_balance
UPDATE profiles 
SET account_balance = 1000.00 
WHERE account_balance IS NULL;

-- 7. Actualizar registros que tengan username NULL
UPDATE profiles 
SET username = 'user_' || id
WHERE username IS NULL;

-- Mostrar resultado
SELECT 'Configuración de profiles completada' as status; 