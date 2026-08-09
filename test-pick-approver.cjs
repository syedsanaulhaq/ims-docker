const { getPool, initializePool } = require('./server/db/connection.cjs');
const { advanceWorkflow } = require('./server/utils/workflowEngine.cjs');

async function main() {
  await initializePool();
  const pool = getPool();
  
  const reqId = '52049EBE-CD64-45DB-A102-D80A27F1A6C7';
  const actorId = 'fe516fe7-4ee0-4d52-a4d9-ced9c3beb6dc'; // Haseeb Faryad
  
  const result = await advanceWorkflow(pool, reqId, actorId, {
    touchedGroups: [1, 3, 5]
  });
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
