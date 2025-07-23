-- Script ULTRA SEGURO para arreglar cálculos automáticos de P&L
-- Límites muy restrictivos para DECIMAL(10,4) = máximo 999999.9999

CREATE OR REPLACE FUNCTION auto_calculate_pnl()
RETURNS TRIGGER AS $$
DECLARE
    user_balance DECIMAL(15,2);
    calculated_percentage DECIMAL(10,4);
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
        -- Calcular porcentaje con límites ULTRA seguros para DECIMAL(10,4)
        calculated_percentage := (NEW.pnl_money / user_balance * 100);
        
        -- Límites muy restrictivos: máximo ±99,999% (deja margen para redondeo)
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
        
        -- Limitar a valores razonables para DECIMAL(15,2)
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
            expected_percentage DECIMAL(10,4);
            percentage_diff DECIMAL(10,4);
        BEGIN
            expected_percentage := (NEW.pnl_money / user_balance * 100);
            
            -- Solo validar si los valores están en rangos ultra seguros
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

-- Script ULTRA SEGURO para recalcular trades existentes
DO $$
DECLARE
    trade_record RECORD;
    user_balance DECIMAL(15,2);
    calculated_percentage DECIMAL(10,4);
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
        AND ABS(t.pnl_money) < 10000  -- Solo valores muy pequeños para evitar overflow
    LOOP
        user_balance := trade_record.account_balance;
        
        IF user_balance <= 0 THEN
            user_balance := 1000.00;
        END IF;
        
        -- Calcular porcentaje con límites ultra seguros
        calculated_percentage := (trade_record.pnl_money / user_balance * 100);
        
        -- Aplicar límites ultra restrictivos
        IF calculated_percentage > 99999 THEN
            RAISE NOTICE 'Trade % omitido: porcentaje muy grande (% %)', trade_record.id, calculated_percentage;
            skipped_count := skipped_count + 1;
            CONTINUE;
        ELSIF calculated_percentage < -99999 THEN
            RAISE NOTICE 'Trade % omitido: porcentaje muy pequeño (% %)', trade_record.id, calculated_percentage;
            skipped_count := skipped_count + 1;
            CONTINUE;
        END IF;
        
        -- Verificar que el valor redondeado no cause overflow
        calculated_percentage := ROUND(calculated_percentage, 4);
        
        IF ABS(calculated_percentage) >= 100000 THEN
            RAISE NOTICE 'Trade % omitido: valor redondeado muy grande (% %)', trade_record.id, calculated_percentage;
            skipped_count := skipped_count + 1;
            CONTINUE;
        END IF;
        
        UPDATE trades 
        SET pnl_percentage = calculated_percentage
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
        AND ABS(t.pnl_percentage) < 100  -- Solo porcentajes muy pequeños
    LOOP
        user_balance := trade_record.account_balance;
        
        IF user_balance <= 0 THEN
            user_balance := 1000.00;
        END IF;
        
        -- Calcular dinero con límites seguros
        calculated_money := (user_balance * trade_record.pnl_percentage / 100);
        
        -- Aplicar límites para DECIMAL(15,2)
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
    
    RAISE NOTICE 'Recálculo completado: % trades actualizados, % omitidos por valores extremos', updated_count, skipped_count;
END $$;

-- Verificar que el trigger funciona
SELECT 
    'VERIFICACIÓN FINAL' as status,
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE pnl_money IS NOT NULL) as trades_con_dinero,
    COUNT(*) FILTER (WHERE pnl_percentage IS NOT NULL) as trades_con_porcentaje,
    COUNT(*) FILTER (WHERE pnl_money IS NOT NULL AND pnl_percentage IS NOT NULL) as trades_completos,
    COUNT(*) FILTER (WHERE ABS(COALESCE(pnl_percentage, 0)) > 100) as trades_con_porcentaje_alto,
    MAX(ABS(COALESCE(pnl_percentage, 0))) as max_porcentaje_absoluto
FROM trades;

-- Mostrar trades que podrían causar problemas
SELECT 
    'TRADES PROBLEMÁTICOS' as info,
    id,
    pnl_money,
    pnl_percentage,
    CASE 
        WHEN pnl_money IS NOT NULL THEN
            ROUND((pnl_money / 1000.00 * 100), 4)
        ELSE NULL
    END as porcentaje_calculado
FROM trades 
WHERE (ABS(COALESCE(pnl_money, 0)) > 10000) 
   OR (ABS(COALESCE(pnl_percentage, 0)) > 100)
LIMIT 10; 