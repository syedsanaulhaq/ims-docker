-- ====================================================================
-- 🔄 FLEXIBLE MANUAL APPROVAL WORKFLOW SYSTEM DATABASE SCHEMA
-- ====================================================================
-- This schema allows completely configurable approval workflows that can
-- be easily maintained and modified without code changes.
-- 
-- Your Specified Flow: DEC Request → DG Admin → AD Admin → Procurement
-- ====================================================================

USE InventoryManagementDB;
GO

-- ====================================================================
-- 🎯 1. WORKFLOW TEMPLATES (Master Workflow Definitions)
-- ====================================================================

CREATE TABLE workflow_templates (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    template_code NVARCHAR(50) UNIQUE NOT NULL, -- 'STANDARD_FLOW', 'HIGH_VALUE', 'EMERGENCY'
    template_name NVARCHAR(100) NOT NULL,
    display_name NVARCHAR(200) NOT NULL,
    description NVARCHAR(1000),
    
    -- Applicability Rules (Optional)
    min_amount DECIMAL(15,2) NULL,
    max_amount DECIMAL(15,2) NULL,
    applicable_request_types NVARCHAR(500), -- JSON or CSV: 'PROCUREMENT,MAINTENANCE,SERVICE'
    applicable_categories NVARCHAR(500), -- JSON or CSV of category IDs
    
    -- Template Configuration
    total_steps INT NOT NULL DEFAULT 0,
    estimated_completion_hours INT DEFAULT 72,
    
    -- Status and Control
    is_active BIT DEFAULT 1,
    is_default BIT DEFAULT 0,
    
    -- Audit Fields
    created_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_by UNIQUEIDENTIFIER NULL,
    updated_at DATETIME2 NULL,
    
    -- Indexes
    INDEX IX_workflow_templates_active (is_active) WHERE is_active = 1,
    INDEX IX_workflow_templates_default (is_default) WHERE is_default = 1,
    
    FOREIGN KEY (created_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (updated_by) REFERENCES AspNetUsers(Id)
);

-- ====================================================================
-- 🔧 2. WORKFLOW STEPS (Steps in Each Workflow Template)
-- ====================================================================

CREATE TABLE workflow_steps (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workflow_template_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Step Configuration
    step_order INT NOT NULL, -- 1, 2, 3, 4...
    step_code NVARCHAR(50) NOT NULL, -- 'DEC_SUBMISSION', 'DG_ADMIN_REVIEW', 'AD_ADMIN_APPROVAL'
    step_name NVARCHAR(100) NOT NULL,
    step_display_name NVARCHAR(200) NOT NULL,
    step_description NVARCHAR(500),
    
    -- Role and Permission Requirements
    required_role NVARCHAR(50) NOT NULL, -- 'DEC_HEAD', 'DG_ADMIN', 'AD_ADMIN', 'PROCUREMENT_HEAD'
    alternative_roles NVARCHAR(200) NULL, -- CSV: 'WING_HEAD,OFFICE_HEAD' (users who can also perform this step)
    backup_role NVARCHAR(50) NULL, -- Fallback role if primary not available
    
    -- Step Behavior Configuration
    is_mandatory BIT DEFAULT 1, -- Must be completed (cannot be skipped)
    can_be_skipped BIT DEFAULT 0, -- Can be skipped under certain conditions
    skip_conditions NVARCHAR(500) NULL, -- JSON conditions for when step can be skipped
    requires_comments BIT DEFAULT 1, -- Comments mandatory when executing step
    
    -- Timing and SLA Configuration
    expected_completion_hours INT DEFAULT 24,
    escalation_hours INT DEFAULT 48,
    auto_escalate BIT DEFAULT 0, -- Automatically escalate if overdue
    escalate_to_role NVARCHAR(50) NULL, -- Role to escalate to if overdue
    
    -- Available Actions for This Step
    can_approve BIT DEFAULT 1,
    can_reject BIT DEFAULT 1,
    can_return_to_previous BIT DEFAULT 1,
    can_forward_to_next BIT DEFAULT 1,
    can_modify_request BIT DEFAULT 0,
    can_add_items BIT DEFAULT 0,
    can_remove_items BIT DEFAULT 0,
    
    -- Next Step Logic
    next_step_on_approve UNIQUEIDENTIFIER NULL, -- Specific next step if approved (NULL = auto next)
    next_step_on_reject UNIQUEIDENTIFIER NULL, -- Where to go if rejected (NULL = end workflow)
    
    -- Audit Fields
    created_at DATETIME2 DEFAULT GETDATE(),
    
    -- Indexes
    INDEX IX_workflow_steps_template_order (workflow_template_id, step_order),
    INDEX IX_workflow_steps_role (required_role),
    
    FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (next_step_on_approve) REFERENCES workflow_steps(id),
    FOREIGN KEY (next_step_on_reject) REFERENCES workflow_steps(id)
);

-- ====================================================================
-- 👥 3. WORKFLOW ROLE ASSIGNMENTS (Who Can Perform Which Roles)
-- ====================================================================

CREATE TABLE workflow_role_assignments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    role_code NVARCHAR(50) NOT NULL, -- 'DEC_HEAD', 'DG_ADMIN', 'AD_ADMIN', 'PROCUREMENT_HEAD'
    role_display_name NVARCHAR(100) NOT NULL,
    
    -- Organizational Scope (User has this role within specific organizational units)
    dec_id UNIQUEIDENTIFIER NULL, -- Specific to DEC (from DEC_MST table)
    wing_id UNIQUEIDENTIFIER NULL, -- Specific to Wing (from WingsInformation table)
    office_id UNIQUEIDENTIFIER NULL, -- Specific to Office (from tblOffices table)
    
    -- Authority and Limits
    max_approval_amount DECIMAL(15,2) NULL, -- Maximum amount this user can approve in this role
    can_skip_steps BIT DEFAULT 0, -- Can skip optional steps
    can_modify_workflow BIT DEFAULT 0, -- Can modify workflow on the fly
    can_delegate BIT DEFAULT 0, -- Can delegate tasks to others
    
    -- Status and Timing
    is_active BIT DEFAULT 1,
    effective_from DATE DEFAULT CAST(GETDATE() AS DATE),
    effective_to DATE NULL,
    
    -- Delegation Support
    delegates_to UNIQUEIDENTIFIER NULL, -- User who can act on behalf when primary is unavailable
    delegation_active BIT DEFAULT 0,
    delegation_start_date DATE NULL,
    delegation_end_date DATE NULL,
    
    -- Backup/Alternative Users
    backup_user_id UNIQUEIDENTIFIER NULL, -- Backup user for this role
    
    -- Audit Fields
    assigned_by UNIQUEIDENTIFIER NOT NULL,
    assigned_at DATETIME2 DEFAULT GETDATE(),
    
    -- Indexes
    INDEX IX_role_assignments_user_active (user_id, is_active) WHERE is_active = 1,
    INDEX IX_role_assignments_role_active (role_code, is_active) WHERE is_active = 1,
    INDEX IX_role_assignments_org_scope (dec_id, wing_id, office_id),
    
    FOREIGN KEY (user_id) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (delegates_to) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (backup_user_id) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (assigned_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (dec_id) REFERENCES DEC_MST(DEC_ID),
    FOREIGN KEY (wing_id) REFERENCES WingsInformation(WingID),
    FOREIGN KEY (office_id) REFERENCES tblOffices(Office_ID)
);

-- ====================================================================
-- 📋 4. REQUEST WORKFLOW INSTANCES (Active Workflow for Each Request)
-- ====================================================================

CREATE TABLE request_workflow_instances (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_id UNIQUEIDENTIFIER NOT NULL,
    workflow_template_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Current Status
    current_step_id UNIQUEIDENTIFIER NULL, -- Which step is currently active
    current_step_order INT DEFAULT 1,
    next_step_id UNIQUEIDENTIFIER NULL, -- Pre-calculated next step
    
    -- Overall Workflow Status
    workflow_status NVARCHAR(30) DEFAULT 'INITIATED', 
    -- 'INITIATED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED', 'ON_HOLD', 'ESCALATED'
    
    -- Progress Tracking
    total_steps INT NOT NULL,
    completed_steps INT DEFAULT 0,
    pending_steps INT NOT NULL,
    
    -- Assignment and Timing
    assigned_by UNIQUEIDENTIFIER NOT NULL, -- User who assigned this workflow
    assigned_at DATETIME2 DEFAULT GETDATE(),
    started_at DATETIME2 DEFAULT GETDATE(),
    completed_at DATETIME2 NULL,
    
    -- SLA and Performance
    estimated_completion_at DATETIME2 NULL, -- Based on workflow template SLA
    is_overdue BIT DEFAULT 0,
    total_hours_taken INT NULL,
    
    -- Workflow Modifications (Flexibility Feature)
    is_modified BIT DEFAULT 0, -- Has workflow been modified from template
    modification_reason NVARCHAR(500),
    modified_by UNIQUEIDENTIFIER NULL,
    modified_at DATETIME2 NULL,
    
    -- Final Outcome
    final_action NVARCHAR(30) NULL, -- 'APPROVED', 'REJECTED', 'CANCELLED'
    final_comments NVARCHAR(1000) NULL,
    completed_by UNIQUEIDENTIFIER NULL,
    
    -- Audit and Tracking
    created_at DATETIME2 DEFAULT GETDATE(),
    
    -- Indexes
    INDEX IX_workflow_instances_request (request_id),
    INDEX IX_workflow_instances_current_step (current_step_id) WHERE current_step_id IS NOT NULL,
    INDEX IX_workflow_instances_status (workflow_status),
    INDEX IX_workflow_instances_overdue (is_overdue) WHERE is_overdue = 1,
    
    FOREIGN KEY (request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id),
    FOREIGN KEY (current_step_id) REFERENCES workflow_steps(id),
    FOREIGN KEY (next_step_id) REFERENCES workflow_steps(id),
    FOREIGN KEY (assigned_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (modified_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (completed_by) REFERENCES AspNetUsers(Id)
);

-- ====================================================================
-- ⚡ 5. WORKFLOW STEP EXECUTIONS (Audit Trail of Each Step)
-- ====================================================================

CREATE TABLE workflow_step_executions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workflow_instance_id UNIQUEIDENTIFIER NOT NULL,
    workflow_step_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Execution Details
    assigned_to UNIQUEIDENTIFIER NOT NULL, -- User responsible for this step
    executed_by UNIQUEIDENTIFIER NULL, -- User who actually performed the action (could be delegate)
    execution_sequence INT NOT NULL, -- In case step is executed multiple times (return scenarios)
    
    -- Action Taken
    action_taken NVARCHAR(20) NOT NULL, 
    -- 'APPROVED', 'REJECTED', 'RETURNED', 'FORWARDED', 'SKIPPED', 'ESCALATED', 'DELEGATED'
    action_comments NVARCHAR(1000),
    internal_comments NVARCHAR(1000), -- Private comments for audit
    
    -- Timing Information
    assigned_at DATETIME2 DEFAULT GETDATE(),
    started_at DATETIME2 NULL, -- When user opened/started working on it
    completed_at DATETIME2 NULL,
    
    -- SLA and Performance Tracking
    expected_completion_at DATETIME2 NOT NULL,
    is_overdue BIT DEFAULT 0,
    hours_taken INT NULL, -- Actual hours taken to complete
    business_hours_taken INT NULL, -- Business hours excluding weekends/holidays
    
    -- Step Status
    execution_status NVARCHAR(20) DEFAULT 'PENDING', 
    -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'ESCALATED', 'SKIPPED'
    
    -- Escalation Information
    escalated_at DATETIME2 NULL,
    escalated_to UNIQUEIDENTIFIER NULL, -- User escalated to
    escalation_reason NVARCHAR(500),
    
    -- Delegation Information
    delegated_at DATETIME2 NULL,
    delegated_by UNIQUEIDENTIFIER NULL,
    delegation_reason NVARCHAR(500),
    
    -- Modification Tracking
    modified_request BIT DEFAULT 0, -- Did this step modify the original request
    modification_summary NVARCHAR(1000),
    
    -- Next Step Information (for tracking flow)
    next_step_id UNIQUEIDENTIFIER NULL,
    routing_reason NVARCHAR(500), -- Why was this next step chosen
    
    -- Audit Fields
    created_at DATETIME2 DEFAULT GETDATE(),
    
    -- Indexes
    INDEX IX_step_executions_workflow_instance (workflow_instance_id),
    INDEX IX_step_executions_assigned_to (assigned_to),
    INDEX IX_step_executions_status (execution_status),
    INDEX IX_step_executions_overdue (is_overdue) WHERE is_overdue = 1,
    INDEX IX_step_executions_pending (execution_status) WHERE execution_status = 'PENDING',
    
    FOREIGN KEY (workflow_instance_id) REFERENCES request_workflow_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_step_id) REFERENCES workflow_steps(id),
    FOREIGN KEY (assigned_to) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (executed_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (escalated_to) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (delegated_by) REFERENCES AspNetUsers(Id),
    FOREIGN KEY (next_step_id) REFERENCES workflow_steps(id)
);

-- ====================================================================
-- 📊 6. WORKFLOW NOTIFICATIONS (Communication and Alerts)
-- ====================================================================

CREATE TABLE workflow_notifications (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workflow_instance_id UNIQUEIDENTIFIER NOT NULL,
    step_execution_id UNIQUEIDENTIFIER NULL,
    
    -- Notification Details
    recipient_user_id UNIQUEIDENTIFIER NOT NULL,
    notification_type NVARCHAR(30) NOT NULL, 
    -- 'STEP_ASSIGNED', 'STEP_OVERDUE', 'WORKFLOW_COMPLETED', 'WORKFLOW_REJECTED', 'ESCALATION_ALERT'
    
    -- Message Content
    title NVARCHAR(200) NOT NULL,
    message NVARCHAR(1000) NOT NULL,
    action_url NVARCHAR(500), -- URL to take action on the workflow step
    
    -- Delivery Status
    is_sent BIT DEFAULT 0,
    sent_at DATETIME2 NULL,
    is_read BIT DEFAULT 0,
    read_at DATETIME2 NULL,
    
    -- Communication Channels
    send_email BIT DEFAULT 1,
    send_in_app BIT DEFAULT 1,
    send_sms BIT DEFAULT 0,
    
    -- Priority and Urgency
    priority_level NVARCHAR(10) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    is_reminder BIT DEFAULT 0, -- Is this a reminder notification
    reminder_sequence INT DEFAULT 1, -- 1st reminder, 2nd reminder, etc.
    
    -- Scheduling
    scheduled_send_at DATETIME2 DEFAULT GETDATE(),
    
    -- Audit Fields
    created_at DATETIME2 DEFAULT GETDATE(),
    
    -- Indexes
    INDEX IX_notifications_recipient (recipient_user_id, is_read),
    INDEX IX_notifications_workflow (workflow_instance_id),
    INDEX IX_notifications_pending (is_sent) WHERE is_sent = 0,
    INDEX IX_notifications_overdue (notification_type) WHERE notification_type = 'STEP_OVERDUE',
    
    FOREIGN KEY (workflow_instance_id) REFERENCES request_workflow_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (step_execution_id) REFERENCES workflow_step_executions(id),
    FOREIGN KEY (recipient_user_id) REFERENCES AspNetUsers(Id)
);

-- ====================================================================
-- 🎯 7. SAMPLE WORKFLOW CONFIGURATIONS
-- ====================================================================

-- Insert Your Standard Flow: DEC → DG Admin → AD Admin → Procurement
INSERT INTO workflow_templates (template_code, template_name, display_name, description, total_steps, estimated_completion_hours, is_default, created_by) VALUES
('STANDARD_FLOW', 'Standard Procurement Flow', 'DEC → DG Admin → AD Admin → Procurement', 'Your specified standard flow for most procurement requests', 4, 72, 1, '00000000-0000-0000-0000-000000000001');

DECLARE @StandardFlowID UNIQUEIDENTIFIER = (SELECT id FROM workflow_templates WHERE template_code = 'STANDARD_FLOW');

-- Step 1: DEC Submission (This step is auto-completed when DEC creates request)
INSERT INTO workflow_steps (workflow_template_id, step_order, step_code, step_name, step_display_name, step_description, required_role, expected_completion_hours) VALUES
(@StandardFlowID, 1, 'DEC_SUBMISSION', 'DEC Submission', 'DEC Creates Request', 'DEC submits procurement request with requirements', 'DEC_HEAD', 0);

DECLARE @Step1ID UNIQUEIDENTIFIER = SCOPE_IDENTITY();

-- Step 2: DG Admin Review  
INSERT INTO workflow_steps (workflow_template_id, step_order, step_code, step_name, step_display_name, step_description, required_role, expected_completion_hours) VALUES
(@StandardFlowID, 2, 'DG_ADMIN_REVIEW', 'DG Admin Review', 'DG Admin Reviews & Approves', 'DG Admin reviews request and decides to approve or reject', 'DG_ADMIN', 24);

DECLARE @Step2ID UNIQUEIDENTIFIER = SCOPE_IDENTITY();

-- Step 3: AD Admin Approval
INSERT INTO workflow_steps (workflow_template_id, step_order, step_code, step_name, step_display_name, step_description, required_role, expected_completion_hours) VALUES  
(@StandardFlowID, 3, 'AD_ADMIN_APPROVAL', 'AD Admin Approval', 'AD Admin Final Approval', 'AD Admin provides final approval before procurement', 'AD_ADMIN', 24);

DECLARE @Step3ID UNIQUEIDENTIFIER = SCOPE_IDENTITY();

-- Step 4: Procurement Action
INSERT INTO workflow_steps (workflow_template_id, step_order, step_code, step_name, step_display_name, step_description, required_role, expected_completion_hours, can_modify_request, can_add_items) VALUES
(@StandardFlowID, 4, 'PROCUREMENT_ACTION', 'Procurement Action', 'Procurement Creates Tender', 'Procurement team creates tender and manages vendor selection', 'PROCUREMENT_HEAD', 24, 1, 1);

-- Update next step references for flow control
UPDATE workflow_steps SET next_step_on_approve = @Step2ID WHERE id = @Step1ID;
UPDATE workflow_steps SET next_step_on_approve = @Step3ID WHERE id = @Step2ID;
UPDATE workflow_steps SET next_step_on_approve = @Step3ID WHERE id = @Step3ID;
-- Step 4 has no next step (workflow ends)

-- Insert Additional Workflow Templates

-- High Value Equipment Flow (requires additional approvals)
INSERT INTO workflow_templates (template_code, template_name, display_name, description, total_steps, min_amount, estimated_completion_hours, created_by) VALUES
('HIGH_VALUE_FLOW', 'High Value Equipment Flow', 'DEC → Wing → DG Admin → Director → AD Admin → Procurement', 'For high-value equipment requiring additional approvals', 6, 500000.00, 120, '00000000-0000-0000-0000-000000000001');

-- Emergency Purchase Flow (fast track)
INSERT INTO workflow_templates (template_code, template_name, display_name, description, total_steps, max_amount, estimated_completion_hours, created_by) VALUES
('EMERGENCY_FLOW', 'Emergency Purchase Flow', 'DEC → DG Admin → Procurement (Fast Track)', 'Emergency purchases that bypass AD Admin for speed', 3, 100000.00, 24, '00000000-0000-0000-0000-000000000001');

-- Infrastructure Projects Flow  
INSERT INTO workflow_templates (template_code, template_name, display_name, description, total_steps, min_amount, estimated_completion_hours, created_by) VALUES
('INFRASTRUCTURE_FLOW', 'Infrastructure Projects Flow', 'DEC → Wing → Office → DG Admin → Finance → AD Admin → Procurement', 'Major infrastructure and construction projects', 7, 1000000.00, 168, '00000000-0000-0000-0000-000000000001');

PRINT '✅ Flexible Workflow System Schema Created Successfully!';
PRINT '🔄 You can now configure any approval flow: DEC → DG Admin → AD Admin → Procurement';
PRINT '🎯 Workflows are completely configurable through admin interface';
PRINT '📊 Full audit trail and SLA monitoring included';

GO
