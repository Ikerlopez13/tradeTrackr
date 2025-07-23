-- Script SEGURO para arreglar cálculos automáticos de P&L
-- Este trigger maneja valores extremos y previene overflow

-- Primero, aumentar la precisión de la columna pnl_percentage si es necesario
ALTER TABLE trades ALTER COLUMN pnl_percentage TYPE DECIMAL(15,4);

CREATE OR REPLACE FUNCTION auto_calculate_pnl()
RETURNS TRIGGER AS $$
DECLARE
    user_balance DECIMAL(15,2);
    calculated_percentage DECIMAL(15,4);
    calculated_money DECIMAL(15,2);
BEGIN
    -- Obtener el balance del usuario
    SELECT account_balance INTO user_balance
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Si no hay balance, usar 1000 como default
    IF user_balance IS NULL OR user_balance <= 0 THEN
        user_balance := 1000.00;
    END IF;
    
    -- CASO 1: Se proporciona pnl_money pero no pnl_percentage
    IF NEW.pnl_money IS NOT NULL AND NEW.pnl_percentage IS NULL THEN
        -- Calcular porcentaje con límites seguros
        calculated_percentage := (NEW.pnl_money / user_balance * 100);
        
        -- Limitar a valores razonables para evitar overflow
        IF calculated_percentage > 99999 THEN
            calculated_percentage := 99999;
        ELSIF calculated_percentage < -99999 THEN
            calculated_percentage := -99999;
        END IF;
        
        NEW.pnl_percentage := ROUND(calculated_percentage, 4);
        
        RAISE NOTICE 'Calculado pnl_percentage: % basado en pnl_money: $ %', 
                     NEW.pnl_percentage, NEW.pnl_money;
    END IF;
    
    -- CASO 2: Se proporciona pnl_percentage pero no pnl_money  
    IF NEW.pnl_percentage IS NOT NULL AND NEW.pnl_money IS NULL THEN
        -- Calcular dinero con límites seguros
        calculated_money := (user_balance * NEW.pnl_percentage / 100);
        
        -- Limitar a valores razonables
        IF calculated_money > 999999999 THEN
            calculated_money := 999999999;
        ELSIF calculated_money < -999999999 THEN
            calculated_money := -999999999;
        END IF;
        
        NEW.pnl_money := ROUND(calculated_money, 2);
        
        RAISE NOTICE 'Calculado pnl_money: $ % basado en pnl_percentage: %', 
                     NEW.pnl_money, NEW.pnl_percentage;
    END IF;
    
    -- CASO 3: Se proporcionan ambos - validar consistencia (solo si son valores razonables)
    IF NEW.pnl_money IS NOT NULL AND NEW.pnl_percentage IS NOT NULL THEN
        DECLARE
            expected_percentage DECIMAL(15,4);
            percentage_diff DECIMAL(15,4);
        BEGIN
            expected_percentage := (NEW.pnl_money / user_balance * 100);
            
            -- Solo validar si los valores están en rangos razonables
            IF ABS(expected_percentage) <= 99999 AND ABS(NEW.pnl_percentage) <= 99999 THEN
                percentage_diff := ABS(expected_percentage - NEW.pnl_percentage);
                
                -- Si la diferencia es mayor al 5%, usar el valor de dinero como fuente de verdad
                IF percentage_diff > 5.0 THEN
                    NEW.pnl_percentage := ROUND(expected_percentage, 4);
                    
                    RAISE NOTICE 'Corregido pnl_percentage inconsistente de % a %', 
                               NEW.pnl_percentage, expected_percentage;
                END IF;
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

-- Script SEGURO para recalcular trades existentes
DO $$
DECLARE
    trade_record RECORD;
    user_balance DECIMAL(15,2);
    calculated_percentage DECIMAL(15,4);
    calculated_money DECIMAL(15,2);
    updated_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    -- Procesar trades que tienen pnl_money pero no pnl_percentage
    FOR trade_record IN 
        SELECT t.id, t.user_id, t.pnl_money, COALESCE(p.account_balance, 1000.00) as account_balance
        FROM trades t
        LEFT JOIN profiles p ON t.user_id = p.id
        WHERE t.pnl_money IS NOT NULL 
        AND t.pnl_percentage IS NULL
        AND ABS(t.pnl_money) < 1000000  -- Solo procesar valores razonables
    LOOP
        user_balance := trade_record.account_balance;
        
        IF user_balance <= 0 THEN
            user_balance := 1000.00;
        END IF;
        
        -- Calcular porcentaje con límites seguros
        calculated_percentage := (trade_record.pnl_money / user_balance * 100);
        
        -- Aplicar límites
        IF calculated_percentage > 99999 THEN
            calculated_percentage := 99999;
        ELSIF calculated_percentage < -99999 THEN
            calculated_percentage := -99999;
        END IF;
        
        UPDATE trades 
        SET pnl_percentage = ROUND(calculated_percentage, 4)
        WHERE id = trade_record.id;
        
        updated_count := updated_count + 1;
        
        RAISE NOTICE 'Trade % actualizado: $ % a % porciento', 
                     trade_record.id, trade_record.pnl_money, calculated_percentage;
    END LOOP;
    
    -- Procesar trades que tienen pnl_percentage pero no pnl_money
    FOR trade_record IN 
        SELECT t.id, t.user_id, t.pnl_percentage, COALESCE(p.account_balance, 1000.00) as account_balance
        FROM trades t
        LEFT JOIN profiles p ON t.user_id = p.id
        WHERE t.pnl_percentage IS NOT NULL 
        AND t.pnl_money IS NULL
        AND ABS(t.pnl_percentage) < 10000  -- Solo procesar valores razonables
    LOOP
        user_balance := trade_record.account_balance;
        
        IF user_balance <= 0 THEN
            user_balance := 1000.00;
        END IF;
        
        -- Calcular dinero con límites seguros
        calculated_money := (user_balance * trade_record.pnl_percentage / 100);
        
        -- Aplicar límites
        IF calculated_money > 999999999 THEN
            calculated_money := 999999999;
        ELSIF calculated_money < -999999999 THEN
            calculated_money := -999999999;
        END IF;
        
        UPDATE trades 
        SET pnl_money = ROUND(calculated_money, 2)
        WHERE id = trade_record.id;
        
        updated_count := updated_count + 1;
        
        RAISE NOTICE 'Trade % actualizado: % porciento a $ %', 
                     trade_record.id, trade_record.pnl_percentage, calculated_money;
    END LOOP;
    
    RAISE NOTICE 'Recálculo completado: % trades actualizados', updated_count;
END $$;

-- Verificar que el trigger funciona
SELECT 
    'VERIFICACIÓN FINAL' as status,
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE pnl_money IS NOT NULL) as trades_con_dinero,
    COUNT(*) FILTER (WHERE pnl_percentage IS NOT NULL) as trades_con_porcentaje,
    COUNT(*) FILTER (WHERE pnl_money IS NOT NULL AND pnl_percentage IS NOT NULL) as trades_completos,
    COUNT(*) FILTER (WHERE ABS(COALESCE(pnl_percentage, 0)) > 10000) as trades_con_porcentaje_extremo
FROM trades; 