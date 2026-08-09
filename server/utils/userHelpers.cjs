const { sql } = require('../db/connection.cjs');

/**
 * Resolve a user's branch ID from AspNetUsers.
 * @param {import('mssql').ConnectionPool} pool
 * @param {string} userId
 * @returns {Promise<number|null>}
 */
async function getUserBranchId(pool, userId) {
  const result = await pool.request()
    .input('userId', sql.NVarChar(450), userId)
    .query('SELECT intBranchID as branch_id FROM AspNetUsers WHERE Id = @userId');

  const branchId = Number(result.recordset[0]?.branch_id || 0);
  return branchId || null;
}

module.exports = { getUserBranchId };
