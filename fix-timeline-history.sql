-- Fix approval history for request 5E1DC911-2A32-47E8-B7D4-C91CDF3DA4B8
-- Remove stale test records (steps 1 and 2 were from earlier debugging)
DELETE FROM approval_history WHERE id IN ('EBAAEE4E-1F7D-4395-B643-9417B8DAD1BF', 'D3532BC5-6761-4683-B4C0-EB0161182F3E');

-- Update the forwarded_to_admin entry with proper forwarded_to and comment
UPDATE approval_history 
SET forwarded_to = '3ff04743-1c84-4502-8a8c-4f1064300d05', 
    comments = 'Forwarded request to Admin for approval',
    step_number = 1
WHERE id = '8FE99302-55B3-46F1-8A35-C70928CC57F9';

-- Update admin approved entry with proper comment
UPDATE approval_history 
SET comments = 'Request approved',
    step_number = 2
WHERE id = '9241C7D4-CF3C-4DCA-ACD0-BDD192974C33';
