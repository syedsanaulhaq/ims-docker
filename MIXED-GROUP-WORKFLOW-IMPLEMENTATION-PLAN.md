# Mixed Group Workflow Implementation Plan

## Problem
A single request can contain items from multiple groups (for example: Group 1, Group 2, Group 4).
Current workflow state is request-level, so one request can only follow one group lane at a time.
That causes wrong approvals for mixed-group requests.

## Target Behavior
One user request remains one request number, but approval is executed per group lane.

- Request submitted once by requester.
- System creates one lane for each group present in request items.
- Each lane progresses through that group's configured steps and approvers.
- Parent request status is derived from lane statuses.

## Core Business Decisions
Recommended defaults:

1. Partial approval is allowed.
2. Rejection is lane-scoped (one lane can reject, others can still approve).
3. Parent request status values:
   - pending: at least one lane pending and none rejected/completed-only state for closure.
   - partially_approved: one or more lanes approved and one or more lanes pending/rejected.
   - approved: all lanes approved.
   - rejected: all lanes rejected.
4. Issuance can proceed for approved lanes without waiting for unrelated pending lanes.

If leadership prefers strict mode, switch to all-or-nothing by policy flag.

## Data Model
### 1. Keep existing table
Keep ims_dynamic_workflow_steps as the source of group step definitions.

### 2. Replace single-state with lane-state
Use ims_request_workflow_state as lane-level table.

Required shape:

- request_id UNIQUEIDENTIFIER NOT NULL
- group_number INT NOT NULL
- request_approval_id UNIQUEIDENTIFIER NULL
- current_step_order INT NOT NULL
- total_steps INT NOT NULL
- status NVARCHAR(30) NOT NULL  (pending, completed, rejected)
- current_approver_id NVARCHAR(450) NULL
- completed_at DATETIME NULL
- rejected_at DATETIME NULL
- rejected_by NVARCHAR(450) NULL
- rejection_reason NVARCHAR(MAX) NULL
- created_at DATETIME NOT NULL
- updated_at DATETIME NOT NULL

Primary key:

- (request_id, group_number)

Indexes:

- IX_ims_request_workflow_state_request_status (request_id, status)
- IX_ims_request_workflow_state_approver_pending (current_approver_id, status)

### 3. Optional mapping table for audit
Optional but useful:

ims_request_workflow_items

- request_id UNIQUEIDENTIFIER
- group_number INT
- approval_item_id UNIQUEIDENTIFIER
- item_master_id UNIQUEIDENTIFIER NULL
- created_at DATETIME
- Primary key (request_id, group_number, approval_item_id)

This makes lane to item trace explicit and faster to query.

## API Contract Changes
### Existing approve endpoint
POST /api/approvals/:approvalId/approve

Add optional inputs:

- lane_group_number: number | null
- lane_action_mode: single_lane | auto_by_items

Behavior:

- single_lane: only advance lane_group_number.
- auto_by_items: derive groups from approved/rejected items and process each touched lane.

### New lane status endpoint
GET /api/approvals/request/:requestId/lanes

Response:

- request_id
- parent_status
- lanes[]:
  - group_number
  - status
  - current_step_order
  - total_steps
  - current_approver_id
  - approver_name
  - approver_roles
  - item_count
  - approved_count
  - rejected_count

### New my-lane-pending endpoint
GET /api/approvals/my-lane-pending

Returns only lanes where:

- status = pending
- current user is valid approver for current step (or equals current_approver_id depending on assignment mode)

## Workflow Engine Logic
### Initialization
On request submission:

1. Load all request items and resolve group_number from item_masters.group_number.
2. Build unique group set.
3. For each group:
   - load steps from ims_dynamic_workflow_steps
   - create or upsert lane state row
   - assign first lane approver
4. Parent status set to pending.

### Advance logic
advanceWorkflow should support:

- advanceWorkflow(pool, requestId, actorId, options)
- options.groupNumber optional
- options.touchedGroups optional

Rules:

- If groupNumber provided, only that lane is evaluated.
- If touchedGroups provided, evaluate only those lanes.
- Actor must match current lane step role rule.
- Lane moves to next step or completed.
- Parent status recalculated after all lane updates.

### Parent status recompute
Given all lanes for request:

- if every lane status = completed => approved
- else if every lane status = rejected => rejected
- else if any completed and any pending/rejected => partially_approved
- else => pending

## UI Changes
### Approver screen
Show grouped sections:

- Group 1 items
- Group 2 items
- Group 4 items

Each section displays lane header:

- lane status
- step x of y
- current approver

Approver action applies to selected group section only or to selected items with auto_by_items mode.

### Requester tracking
Add lane progress timeline:

- one card per group lane
- parent badge from aggregate status

## Migration Plan
Phase 1 (safe, no behavior change for single-group)

1. Add composite key support for lane rows.
2. Add current_approver_id and audit columns.
3. Update initializeWorkflowForRequest to create multiple lanes.
4. Keep existing single-group behavior compatible.

Phase 2 (mixed-group execution)

1. Update approve flow to advance lane-by-lane.
2. Recompute and persist parent status from lane states.
3. Update inbox query to lane-aware pending list.

Phase 3 (UX and reporting)

1. Add lane endpoint and lane UI cards.
2. Add lane-based issuance processing.
3. Add lane analytics and SLA reporting.

## Backward Compatibility
- Single-group requests continue unchanged (one lane only).
- Mixed-group requests no longer fail with mixed_groups.
- Existing role/step definitions reused; no admin reconfiguration required.

## Acceptance Test Matrix
1. Single-group request with valid workflow:
   - creates one lane
   - completes normally

2. Mixed-group request (Group 1 + Group 2):
   - creates two lanes
   - each lane shows correct approver path

3. Lane-scoped rejection:
   - one lane rejected
   - other lane can still progress
   - parent becomes partially_approved

4. All lanes approved:
   - parent becomes approved

5. All lanes rejected:
   - parent becomes rejected

6. Unauthorized actor on lane:
   - action blocked with actor_not_allowed_for_step

7. Issuance for approved lane while other lane pending:
   - approved lane can issue
   - parent remains partially_approved/pending per policy

## Immediate Next Step
Implement Phase 1 and Phase 2 on backend first, then wire minimal lane UI read-only view for visibility before full action UX changes.
