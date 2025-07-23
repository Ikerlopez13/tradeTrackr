-- Script para arreglar cálculos automáticos de P&L
-- Este trigger calcula automáticamente pnl_percentage cuando se proporciona pnl_money y viceversa

CREATE OR REPLACE FUNCTION auto_calculate_pnl()
RETURNS TRIGGER AS $$
DECLARE
    user_balance DECIMAL(15,2);
BEGIN
    -- Obtener el balance del usuario
    SELECT account_balance INTO user_balance
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Si no hay balance, usar 1000 como default
    IF user_balance IS NULL THEN
        user_balance := 1000.00;
    END IF;
    
    -- CASO 1: Se proporciona pnl_money pero no pnl_percentage
    IF NEW.pnl_money IS NOT NULL AND NEW.pnl_percentage IS NULL THEN
        NEW.pnl_percentage := ROUND((NEW.pnl_money / user_balance * 100)::NUMERIC, 4);
        
        -- Log para debug
        RAISE NOTICE 'Calculado pnl_percentage: % basado en pnl_money: $ % y balance: $ %', 
                     NEW.pnl_percentage, NEW.pnl_money, user_balance;
    END IF;
    
    -- CASO 2: Se proporciona pnl_percentage pero no pnl_money  
    IF NEW.pnl_percentage IS NOT NULL AND NEW.pnl_money IS NULL THEN
        NEW.pnl_money := ROUND((user_balance * NEW.pnl_percentage / 100)::NUMERIC, 2);
        
        -- Log para debug
        RAISE NOTICE 'Calculado pnl_money: $ % basado en pnl_percentage: % y balance: $ %', 
                     NEW.pnl_money, NEW.pnl_percentage, user_balance;
    END IF;
    
    -- CASO 3: Se proporcionan ambos - validar consistencia
    IF NEW.pnl_money IS NOT NULL AND NEW.pnl_percentage IS NOT NULL THEN
        DECLARE
            expected_percentage DECIMAL(10,4);
            percentage_diff DECIMAL(10,4);
        BEGIN
            expected_percentage := ROUND((NEW.pnl_money / user_balance * 100)::NUMERIC, 4);
            percentage_diff := ABS(expected_percentage - NEW.pnl_percentage);
            
            -- Si la diferencia es mayor al 5%, usar el valor de dinero como fuente de verdad
            IF percentage_diff > 5.0 THEN
                NEW.pnl_percentage := expected_percentage;
                
                RAISE NOTICE 'Corregido pnl_percentage inconsistente de % a % (diferencia: %)', 
                           NEW.pnl_percentage, expected_percentage, percentage_diff;
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS trigger_auto_calculate_pnl ON trades;

-- Crear el nuevo trigger que se ejecuta ANTES de insertar/actualizar
CREATE TRIGGER trigger_auto_calculate_pnl
    BEFORE INSERT OR UPDATE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_pnl();

-- Script para recalcular trades existentes que tienen solo uno de los valores
DO $$
DECLARE
    trade_record RECORD;
    user_balance DECIMAL(15,2);
    updated_count INTEGER := 0;
BEGIN
    -- Procesar trades que tienen pnl_money pero no pnl_percentage
    FOR trade_record IN 
        SELECT t.id, t.user_id, t.pnl_money, p.account_balance
        FROM trades t
        JOIN profiles p ON t.user_id = p.id
        WHERE t.pnl_money IS NOT NULL 
        AND t.pnl_percentage IS NULL
    LOOP
        user_balance := COALESCE(trade_record.account_balance, 1000.00);
        
        UPDATE trades 
        SET pnl_percentage = ROUND((trade_record.pnl_money / user_balance * 100)::NUMERIC, 4)
        WHERE id = trade_record.id;
        
        updated_count := updated_count + 1;
        
        RAISE NOTICE 'Trade % actualizado: $ % a % porciento', 
                     trade_record.id, trade_record.pnl_money, 
                     ROUND((trade_record.pnl_money / user_balance * 100)::NUMERIC, 4);
    END LOOP;
    
    -- Procesar trades que tienen pnl_percentage pero no pnl_money
    FOR trade_record IN 
        SELECT t.id, t.user_id, t.pnl_percentage, p.account_balance
        FROM trades t
        JOIN profiles p ON t.user_id = p.id
        WHERE t.pnl_percentage IS NOT NULL 
        AND t.pnl_money IS NULL
    LOOP
        user_balance := COALESCE(trade_record.account_balance, 1000.00);
        
        UPDATE trades 
        SET pnl_money = ROUND((user_balance * trade_record.pnl_percentage / 100)::NUMERIC, 2)
        WHERE id = trade_record.id;
        
        updated_count := updated_count + 1;
        
        RAISE NOTICE 'Trade % actualizado: % porciento a $ %', 
                     trade_record.id, trade_record.pnl_percentage,
                     ROUND((user_balance * trade_record.pnl_percentage / 100)::NUMERIC, 2);
    END LOOP;
    
    RAISE NOTICE 'Recálculo completado: % trades actualizados', updated_count;
END $$;

-- Verificar que el trigger funciona
SELECT 
    'VERIFICACIÓN FINAL' as status,
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE pnl_money IS NOT NULL) as trades_con_dinero,
    COUNT(*) FILTER (WHERE pnl_percentage IS NOT NULL) as trades_con_porcentaje,
    COUNT(*) FILTER (WHERE pnl_money IS NOT NULL AND pnl_percentage IS NOT NULL) as trades_completos
FROM trades; 