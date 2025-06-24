-- Agregar columna account_balance a la tabla profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_balance DECIMAL(15,2) DEFAULT 1000;

-- Comentario para el nuevo campo
COMMENT ON COLUMN profiles.account_balance IS 'Balance inicial de la cuenta del usuario para cálculos de P&L';

-- Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_account_balance ON profiles(account_balance);

-- Inicializar account_balance para usuarios existentes que no lo tengan
UPDATE profiles 
SET account_balance = 1000 
WHERE account_balance IS NULL;

-- Verificar que se creó correctamente
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'account_balance'; 