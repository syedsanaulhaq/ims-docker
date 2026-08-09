// Quick fix for status update issue
// Add this function to reload data after saving visits

export const reloadDataAfterVisitSave = async (loadDataFunction: () => Promise<void>) => {
  try {
    await loadDataFunction();
    
  } catch (error) {
    
  }
};

// Usage: Add this line after successfully saving a visit
// await reloadDataAfterVisitSave(loadData);
