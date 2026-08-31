const { sql } = require('../db/connection.cjs');

async function notifyRequestUpdate(db, requestId, status, metadata = {}) {
  try {
    const actorName = metadata.actorName || 'System';
    const comments = metadata.comments || '';
    const actorId = metadata.actorId || null;

    // 1. Fetch the request details to find the requester_user_id
    const requestResult = await db.request()
      .input('RequestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT requester_user_id, request_number, request_type, requester_wing_id, requester_branch_id
        FROM stock_issuance_requests
        WHERE id = @RequestId
      `);

    if (!requestResult.recordset || requestResult.recordset.length === 0) {
      console.warn(`[Notification] Request ${requestId} not found.`);
      return;
    }

    const { requester_user_id, request_number, request_type } = requestResult.recordset[0];

    // 2. Define who should receive the notification and what the title/message is
    let targetUserId = null;
    let title = '';
    let message = '';
    let type = 'info'; // info, success, warning, error
    let actionUrl = `/dashboard/request-details/${requestId}`;
    let actionText = 'View Request';

    if (['APPROVED', 'REJECTED', 'ISSUED', 'DISPATCHED', 'ACKNOWLEDGED'].includes(status)) {
      // Notify the requester
      targetUserId = requester_user_id;
      title = `Request ${request_number} ${status}`;
      if (status === 'APPROVED') {
        message = `Your request ${request_number} has been approved by ${actorName}.${comments ? ' Comments: ' + comments : ''}`;
        type = 'success';
      } else if (status === 'REJECTED') {
        message = `Your request ${request_number} has been rejected by ${actorName}.${comments ? ' Comments: ' + comments : ''}`;
        type = 'error';
      } else if (status === 'ISSUED') {
        message = `Stock has been issued for your request ${request_number} by ${actorName}.`;
        type = 'success';
      } else if (status === 'DISPATCHED') {
        message = `Stock has been dispatched for your request ${request_number} by ${actorName}.`;
        type = 'info';
      } else {
        message = `Request ${request_number} has been acknowledged.`;
        type = 'info';
      }
    } else if (status === 'SUBMITTED' || status === 'FORWARDED') {
      // When submitted/forwarded, notify the active approvers (supervisors/admin)
      const approverResult = await db.request()
        .input('RequestId', sql.UniqueIdentifier, requestId)
        .query(`
          SELECT TOP 1 current_approver_id, current_role_name
          FROM request_approvals
          WHERE request_id = @RequestId AND current_status = 'PENDING'
        `);

      if (approverResult.recordset && approverResult.recordset.length > 0) {
        const { current_approver_id, current_role_name } = approverResult.recordset[0];
        if (current_approver_id) {
          targetUserId = current_approver_id;
        } else if (current_role_name) {
          // If role-based, notify all users with that role
          const roleUsers = await db.request()
            .input('RoleName', sql.NVarChar, current_role_name)
            .query(`
              SELECT u.Id 
              FROM AspNetUsers u
              INNER JOIN AspNetUserRoles ur ON u.Id = ur.UserId
              INNER JOIN AspNetRoles r ON ur.RoleId = r.Id
              WHERE r.Name = @RoleName
            `);
          
          if (roleUsers.recordset && roleUsers.recordset.length > 0) {
            for (const row of roleUsers.recordset) {
              await insertNotification(db, row.Id, `Pending Approval: ${request_number}`, `A request (${request_number}) is pending your approval.`, 'warning', actionUrl, actionText);
            }
          }
          return;
        }
      }

      // Fallback
      if (!targetUserId) {
        const adminUsers = await db.request()
          .query(`
            SELECT u.Id 
            FROM AspNetUsers u
            INNER JOIN AspNetUserRoles ur ON u.Id = ur.UserId
            INNER JOIN AspNetRoles r ON ur.RoleId = r.Id
            WHERE r.Name IN ('Admin', 'Supervisor', 'Branch Supervisor')
          `);
        if (adminUsers.recordset && adminUsers.recordset.length > 0) {
          for (const row of adminUsers.recordset) {
            await insertNotification(db, row.Id, `New Request: ${request_number}`, `A new request (${request_number}) has been submitted and is pending approval.`, 'info', actionUrl, actionText);
          }
        }
        return;
      }

      title = `Approval Required: ${request_number}`;
      message = `Request ${request_number} has been ${status.toLowerCase()} and requires your approval.`;
      type = 'warning';
    }

    if (targetUserId) {
      await insertNotification(db, targetUserId, title, message, type, actionUrl, actionText);
    }
  } catch (err) {
    console.error('[Notification Error] Failed to create notification:', err);
  }
}

async function insertNotification(db, userId, title, message, type, actionUrl, actionText) {
  try {
    await db.request()
      .input('UserId', sql.NVarChar, userId)
      .input('Title', sql.NVarChar, title)
      .input('Message', sql.NVarChar, message)
      .input('Type', sql.NVarChar, type)
      .input('ActionUrl', sql.NVarChar, actionUrl)
      .input('ActionText', sql.NVarChar, actionText)
      .query(`
        INSERT INTO Notifications (Id, UserId, Title, Message, Type, ActionUrl, ActionText, IsRead, CreatedAt)
        VALUES (NEWID(), @UserId, @Title, @Message, @Type, @ActionUrl, @ActionText, 0, GETDATE())
      `);
  } catch (err) {
    console.error('[Notification Insert Error] Failed to insert row:', err);
  }
}

module.exports = {
  notifyRequestUpdate
};
