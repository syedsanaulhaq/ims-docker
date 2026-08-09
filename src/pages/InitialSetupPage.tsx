import React from 'react';
import InitialInventorySetup from '@/components/setup/InitialInventorySetup';

const InitialSetupPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Initial Inventory Setup</h1>
          <p className="text-gray-600 mt-2">
            Set up your starting inventory quantities to establish a baseline for tracking all future stock movements.
          </p>
        </div>
        <InitialInventorySetup />
      </div>
    </div>
  );
};

export default InitialSetupPage;
