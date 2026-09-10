// ============================================================================
// Notification Utility
// ============================================================================
// Utility helpers for creating database-backed user notifications

const { sql } = require('../db/connection.cjs');

/**
 * Inserts a notification into the Notifications table.
 */
const createNotification = async (db, userId, title, message, type = 'info', actionUrl = null, actionText = null) => {
  try {
    if (!userId) {
      console.warn('⚠️ No userId provided to createNotification, skipping.');
      return;
    }
    const cleanUserId = String(userId);
    
    await db.request()
      .input('UserId', sql.NVarChar, cleanUserId)
      .input('Title', sql.NVarChar, title)
      .input('Message', sql.NVarChar, message)
      .input('Type', sql.NVarChar, type)
      .input('ActionUrl', sql.NVarChar, actionUrl)
      .input('ActionText', sql.NVarChar, actionText)
      .query(`
        INSERT INTO Notifications (Id, UserId, Title, Message, Type, ActionUrl, ActionText, CreatedAt, IsRead)
        VALUES (NEWID(), @UserId, @Title, @Message, @Type, @ActionUrl, @ActionText, GETDATE(), 0)
      `);
    console.log(`📧 Notification created successfully for user ${cleanUserId}: "${title}"`);
  } catch (err) {
    console.error('❌ Failed to create application notification:', err.message);
  }
};

/**
 * Handles request state change notifications.
 * Fetches request metadata and notifies either the requester or the next/current approver.
 */
const notifyRequestUpdate = async (db, requestId, action, options = {}) => {
  try {
    if (!requestId) return;

    // 1. Fetch request details
    const requestResult = await db.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT 
          sir.id,
          sir.request_number,
          CONVERT(NVARCHAR(450), sir.requester_user_id) AS requester_user_id,
          sir.request_status,
          sir.approval_status,
          u.FullName AS requester_name
        FROM stock_issuance_requests sir
        LEFT JOIN AspNetUsers u ON sir.requester_user_id = TRY_CONVERT(uniqueidentifier, u.Id)
        WHERE sir.id = @requestId
      `);

    if (requestResult.recordset.length === 0) {
      console.warn(`⚠️ Request ${requestId} not found for notification.`);
      return;
    }

    const request = requestResult.recordset[0];
    const { request_number, requester_user_id, requester_name } = request;

    // 2. Fetch current approver from request_approvals
    const approvalResult = await db.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT TOP 1 
          CONVERT(NVARCHAR(450), current_approver_id) AS current_approver_id,
          current_status
        FROM request_approvals
        WHERE request_id = @requestId
        ORDER BY updated_date DESC, created_date DESC
      `);

    const currentApproverId = approvalResult.recordset[0]?.current_approver_id || null;

    const actorName = options.actorName || 'System';
    const comments = options.comments || '';

    // Action handling
    switch (action.toUpperCase()) {
      case 'SUBMITTED':
        // A request is newly submitted. Notify the current approver.
        if (currentApproverId) {
          await createNotification(
            db,
            currentApproverId,
            `New Stock Request: ${request_number}`,
            `${requester_name} has submitted a new stock request. Your review and approval is required.`,
            'info',
            '/dashboard/approval-dashboard-request-based',
            'Review Request'
          );
        }
        break;

      case 'APPROVED':
        // The request has been approved at a step, or fully approved.
        // First, notify the requester that the request was updated.
        const approvalLabel = request.approval_status || 'Approved';
        await createNotification(
          db,
          requester_user_id,
          `Request Approved: ${request_number}`,
          `Your request has been approved by ${actorName}. Status: ${approvalLabel}.`,
          'success',
          `/dashboard/request-details/${requestId}`,
          'View Details'
        );

        // If it was forwarded to next step (i.e. still pending and has a current approver who is NOT the requester)
        if (currentApproverId && currentApproverId !== requester_user_id && request.request_status !== 'Approved') {
          await createNotification(
            db,
            currentApproverId,
            `Stock Request Pending: ${request_number}`,
            `A stock request is pending your review and approval.`,
            'info',
            '/dashboard/approval-dashboard-request-based',
            'Review Request'
          );
        }
        break;

      case 'FORWARDED':
        // Request has been forwarded (e.g. to admin or next designation)
        const forwardLabel = request.approval_status || 'Forwarded';
        await createNotification(
          db,
          requester_user_id,
          `Request Forwarded: ${request_number}`,
          `Your request has been forwarded by ${actorName}. Status: ${forwardLabel}.`,
          'info',
          `/dashboard/request-details/${requestId}`,
          'View Details'
        );

        // Notify the new approver
        if (currentApproverId && currentApproverId !== requester_user_id) {
          await createNotification(
            db,
            currentApproverId,
            `Stock Request Forwarded: ${request_number}`,
            `A stock request has been forwarded to you and is pending your review.`,
            'info',
            '/dashboard/approval-dashboard-request-based',
            'Review Request'
          );
        }
        break;

      case 'REJECTED':
        // Request rejected by supervisor or admin
        await createNotification(
          db,
          requester_user_id,
          `Request Rejected: ${request_number}`,
          `Your request has been rejected by ${actorName}.${comments ? ' Reason: ' + comments : ''}`,
          'error',
          `/dashboard/request-details/${requestId}`,
          'View Details'
        );
        break;

      case 'RETURNED':
        // Request returned to requester for edit
        await createNotification(
          db,
          requester_user_id,
          `Request Returned: ${request_number}`,
          `Your request has been returned to you by ${actorName} for correction/review.${comments ? ' Comments: ' + comments : ''}`,
          'warning',
          `/dashboard/request-details/${requestId}`,
          'View Details'
        );
        break;

      case 'ISSUED':
        // Request has been issued by central storekeeper
        await createNotification(
          db,
          requester_user_id,
          `Request Issued: ${request_number}`,
          `Your request items have been issued by the storekeeper. Please collect them.`,
          'success',
          `/dashboard/request-details/${requestId}`,
          'View Details'
        );
        break;

      case 'DISPATCHED':
        // Request has been dispatched by central storekeeper
        await createNotification(
          db,
          requester_user_id,
          `Request Dispatched: ${request_number}`,
          `Your requested items have been dispatched.`,
          'info',
          `/dashboard/request-details/${requestId}`,
          'View Details'
        );
        break;

      case 'ACKNOWLEDGED':
        // Request receipt acknowledged by user. Optionally notify the storekeeper/issuer,
        // but typically this completes the workflow.
        await createNotification(
          db,
          requester_user_id,
          `Request Completed: ${request_number}`,
          `You have acknowledged the receipt of your requested items. The request is now closed.`,
          'success',
          `/dashboard/request-details/${requestId}`,
          'View Details'
        );
        break;
    }
  } catch (err) {
    console.error('❌ Failed to handle request update notification:', err.message);
  }
};

module.exports = {
  createNotification,
  notifyRequestUpdate
};
