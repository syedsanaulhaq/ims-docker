-- Find tables related to stock acquisition
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND (
        table_name ILIKE '%acquisition%' OR 
        table_name ILIKE '%stock%' OR
        table_name ILIKE '%tender%' OR
        table_name = 'deliveries' OR
        table_name = 'delivery_items'
    )
)
ORDER BY table_name, ordinal_position;
