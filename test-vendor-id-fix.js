// Test script to verify vendor_id is being sent correctly to the backend
const testTenderWithVendor = async () => {
  const tenderData = {
    tender_spot_type: 'Contract/Tender',
    type: 'Contract/Tender',
    title: 'Test Tender with Vendor ID',
    referenceNumber: 'TEST-VENDOR-001',
    description: 'Testing vendor_id functionality',
    estimatedValue: 50000,
    publishDate: new Date().toISOString(),
    publicationDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
    submissionDeadline: new Date().toISOString(),
    openingDate: new Date().toISOString(),
    officeIds: ['1'],
    wingIds: ['1'],
    decIds: ['1'],
    vendor_id: '12345678-1234-1234-1234-123456789012', // Test vendor ID
    items: [
      {
        itemMasterId: '11111111-1111-1111-1111-111111111111',
        nomenclature: 'Test Item',
        quantity: 10,
        estimatedUnitPrice: 100,
        specifications: 'Test specifications',
        remarks: 'Test remarks'
      }
    ]
  };

  try {
    const response = await fetch('http://localhost:3001/api/tenders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tenderData)
    });

    if (response.ok) {
      const result = await response.json();
      } else {
      const errorText = await response.text();
      }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

testTenderWithVendor();
