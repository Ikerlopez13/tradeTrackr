-- Deshabilitar confirmación de email en Supabase Auth
-- Esto permite que los usuarios se registren sin necesidad de confirmar su email

-- Actualizar la configuración de auth para deshabilitar confirmación de email
UPDATE auth.config 
SET 
    email_confirm_required = false,
    email_autoconfirm = true
WHERE id = 'default';

-- Si la tabla config no existe o no funciona, usar este método alternativo:
-- Esto se hace típicamente desde el dashboard de Supabase en Authentication > Settings

-- Verificar la configuración actual
SELECT * FROM auth.config WHERE id = 'default'; 