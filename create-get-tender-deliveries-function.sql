-- Create get_tender_deliveries RPC function
-- This function retrieves all deliveries for a specific tender with their items

CREATE OR REPLACE FUNCTION get_tender_deliveries(p_tender_id UUID)
RETURNS TABLE (
    id UUID,
    delivery_number INTEGER,
    tender_id UUID,
    delivery_personnel TEXT,
    delivery_date DATE,
    delivery_notes TEXT,
    delivery_chalan TEXT,
    chalan_file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    delivery_items JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.delivery_number,
        d.tender_id,
        d.delivery_personnel,
        d.delivery_date,
        d.delivery_notes,
        d.delivery_chalan,
        d.chalan_file_path,
        d.created_at,
        d.updated_at,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'item_master_id', di.item_master_id,
                        'item_name', im.item_name,
                        'delivery_qty', di.delivery_qty
                    )
                )
                FROM delivery_items di
                LEFT JOIN item_masters im ON di.item_master_id = im.id
                WHERE di.delivery_id = d.id
            ),
            '[]'::jsonb
        ) as delivery_items
    FROM deliveries d
    WHERE d.tender_id = p_tender_id
    ORDER BY d.delivery_number, d.created_at;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_tender_deliveries(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tender_deliveries(UUID) TO anon;

-- Add helpful comment
COMMENT ON FUNCTION get_tender_deliveries(UUID) IS 'Retrieves all deliveries for a specific tender with their delivery items';
