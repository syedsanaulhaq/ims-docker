-- Update save_delivery_with_items function to support dual pricing mode
-- This function handles both individual item pricing and total amount distribution

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS save_delivery_with_items(UUID, VARCHAR, JSONB, DATE, TEXT, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS get_tender_deliveries(UUID);
DROP FUNCTION IF EXISTS get_delivery_by_id(UUID);

CREATE OR REPLACE FUNCTION save_delivery_with_items(
  p_tender_id UUID,
  p_delivery_personnel VARCHAR,
  p_delivery_items JSONB,
  p_delivery_date DATE DEFAULT CURRENT_DATE,
  p_delivery_notes TEXT DEFAULT NULL,
  p_delivery_chalan VARCHAR DEFAULT NULL,
  p_chalan_file_path TEXT DEFAULT NULL,
  p_pricing_method VARCHAR DEFAULT 'individual',
  p_total_amount DECIMAL(12,2) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_delivery_id UUID;
  v_delivery_number INTEGER;
  v_item JSONB;
  v_total_qty DECIMAL := 0;
  v_distributed_amount DECIMAL;
  v_item_amount DECIMAL;
BEGIN
  -- Generate new delivery number
  SELECT COALESCE(MAX(delivery_number), 0) + 1 
  INTO v_delivery_number 
  FROM deliveries 
  WHERE tender_id = p_tender_id;
  
  -- Insert delivery record
  INSERT INTO deliveries (
    tender_id,
    delivery_number,
    delivery_personnel,
    delivery_date,
    delivery_notes,
    delivery_chalan,
    chalan_file_path,
    pricing_method,
    total_amount
  ) VALUES (
    p_tender_id,
    v_delivery_number,
    p_delivery_personnel,
    p_delivery_date,
    p_delivery_notes,
    p_delivery_chalan,
    p_chalan_file_path,
    p_pricing_method,
    p_total_amount
  ) RETURNING id INTO v_delivery_id;
  
  -- For total_only pricing, calculate total quantity first
  IF p_pricing_method = 'total_only' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_delivery_items)
    LOOP
      v_total_qty := v_total_qty + (v_item->>'delivery_qty')::DECIMAL;
    END LOOP;
  END IF;
  
  -- Insert delivery items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_delivery_items)
  LOOP
    -- Calculate item amount based on pricing method
    IF p_pricing_method = 'individual' THEN
      -- Use provided unit_price and total_item_amount
      v_item_amount := (v_item->>'total_item_amount')::DECIMAL;
    ELSIF p_pricing_method = 'total_only' AND p_total_amount IS NOT NULL THEN
      -- Distribute total amount based on quantity ratio
      v_distributed_amount := p_total_amount * ((v_item->>'delivery_qty')::DECIMAL / v_total_qty);
      v_item_amount := v_distributed_amount;
    ELSE
      v_item_amount := NULL;
    END IF;
    
    INSERT INTO delivery_items (
      delivery_id,
      item_master_id,
      item_name,
      delivery_qty,
      unit_price,
      total_item_amount
    ) VALUES (
      v_delivery_id,
      (v_item->>'item_master_id')::UUID,
      v_item->>'item_name',
      (v_item->>'delivery_qty')::DECIMAL,
      CASE 
        WHEN p_pricing_method = 'individual' THEN (v_item->>'unit_price')::DECIMAL
        WHEN p_pricing_method = 'total_only' AND v_total_qty > 0 THEN v_distributed_amount / (v_item->>'delivery_qty')::DECIMAL
        ELSE NULL
      END,
      v_item_amount
    );
  END LOOP;
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'delivery_id', v_delivery_id,
    'delivery_number', v_delivery_number,
    'message', 'Delivery created successfully with ' || jsonb_array_length(p_delivery_items) || ' items'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error response
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error creating delivery: ' || SQLERRM
    );
END;
$$;

-- Update get_tender_deliveries function to include pricing fields
CREATE OR REPLACE FUNCTION get_tender_deliveries(p_tender_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'delivery_number', d.delivery_number,
      'tender_id', d.tender_id,
      'delivery_personnel', d.delivery_personnel,
      'delivery_date', d.delivery_date,
      'delivery_notes', d.delivery_notes,
      'delivery_chalan', d.delivery_chalan,
      'chalan_file_path', d.chalan_file_path,
      'pricing_method', d.pricing_method,
      'total_amount', d.total_amount,
      'created_at', d.created_at,
      'updated_at', d.updated_at,
      'delivery_items', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'item_master_id', di.item_master_id,
            'item_name', di.item_name,
            'delivery_qty', di.delivery_qty,
            'unit_price', di.unit_price,
            'total_item_amount', di.total_item_amount
          )
        )
        FROM delivery_items di
        WHERE di.delivery_id = d.id
      )
    )
  )
  INTO v_result
  FROM deliveries d
  WHERE d.tender_id = p_tender_id
  ORDER BY d.delivery_number DESC;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Update get_delivery_by_id function to include pricing fields
CREATE OR REPLACE FUNCTION get_delivery_by_id(p_delivery_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', d.id,
    'delivery_number', d.delivery_number,
    'tender_id', d.tender_id,
    'delivery_personnel', d.delivery_personnel,
    'delivery_date', d.delivery_date,
    'delivery_notes', d.delivery_notes,
    'delivery_chalan', d.delivery_chalan,
    'chalan_file_path', d.chalan_file_path,
    'pricing_method', d.pricing_method,
    'total_amount', d.total_amount,
    'created_at', d.created_at,
    'updated_at', d.updated_at,
    'delivery_items', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'item_master_id', di.item_master_id,
          'item_name', di.item_name,
          'delivery_qty', di.delivery_qty,
          'unit_price', di.unit_price,
          'total_item_amount', di.total_item_amount
        )
      )
      FROM delivery_items di
      WHERE di.delivery_id = d.id
    )
  )
  INTO v_result
  FROM deliveries d
  WHERE d.id = p_delivery_id;
  
  RETURN v_result;
END;
$$;

-- Verify the functions are created
SELECT 
  routine_name, 
  routine_type, 
  data_type
FROM information_schema.routines 
WHERE routine_name IN ('save_delivery_with_items', 'get_tender_deliveries', 'get_delivery_by_id')
ORDER BY routine_name;
