// ====================================================================
// 🏆 DIRECT TENDER AWARD ENTRY SYSTEM
// ====================================================================
// Simple frontend components for entering winning vendor details
// Financial data is ONLY entered at this stage
// ====================================================================

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, DatePicker, InputNumber, Table, Space, Tag, Alert, Divider } from 'antd';
import { 
    TrophyOutlined,
    DollarOutlined,
    UserOutlined,
    CalendarOutlined,
    FileTextOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';

const { TextArea } = Input;

// ====================================================================
// 🏆 1. DIRECT AWARD ENTRY FORM
// ====================================================================

const DirectTenderAwardForm = () => {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [requestItems, setRequestItems] = useState([]);
    const [awardData, setAwardData] = useState({
        awardTitle: '',
        awardDate: null,
        expectedDeliveryDate: null,
        
        // Vendor Information
        vendorName: '',
        vendorRegistration: '',
        vendorAddress: '',
        vendorContactPerson: '',
        vendorPhone: '',
        vendorEmail: '',
        
        // Contract Information
        contractNumber: '',
        contractDate: null,
        
        // Financial Information (ONLY HERE)
        totalContractAmount: 0,
        taxAmount: 0,
        finalAmount: 0,
        paymentTerms: ''
    });

    const [itemPrices, setItemPrices] = useState({});

    // Fetch approved requests that need award entry
    useEffect(() => {
        fetchApprovedRequests();
    }, []);

    const fetchApprovedRequests = async () => {
        // This would fetch approved requests from the API
        // For now, using sample data
        const sampleRequests = [
            {
                request_id: 1,
                request_code: 'REQ-20250913-001',
                request_title: 'Office Laptops Procurement',
                dec_name: 'IT Equipment Committee',
                approved_date: '2025-09-10',
                items: [
                    { item_id: 1, item_name: 'Standard Office Laptop', quantity_requested: 10, specifications: 'Core i5, 8GB RAM, 256GB SSD' },
                    { item_id: 2, item_name: 'Laser Printer', quantity_requested: 2, specifications: 'HP LaserJet, A4 Size, Network Ready' }
                ]
            },
            {
                request_id: 2,
                request_code: 'REQ-20250913-002',
                request_title: 'Office Furniture Procurement',
                dec_name: 'Administrative Equipment Committee',
                approved_date: '2025-09-11',
                items: [
                    { item_id: 3, item_name: 'Office Desk', quantity_requested: 5, specifications: '4x2 feet, wooden, with drawers' }
                ]
            }
        ];
        // Set sample data for demo
    };

    const handleRequestSelection = (requestId) => {
        // Sample data for demo - in real app, this would fetch from API
        const sampleRequests = [
            {
                request_id: 1,
                request_code: 'REQ-20250913-001',
                request_title: 'Office Laptops Procurement',
                dec_name: 'IT Equipment Committee',
                approved_date: '2025-09-10',
                items: [
                    { item_id: 1, item_name: 'Standard Office Laptop', quantity_requested: 10, specifications: 'Core i5, 8GB RAM, 256GB SSD' },
                    { item_id: 2, item_name: 'Laser Printer', quantity_requested: 2, specifications: 'HP LaserJet, A4 Size, Network Ready' }
                ]
            },
            {
                request_id: 2,
                request_code: 'REQ-20250913-002',
                request_title: 'Office Furniture Procurement',
                dec_name: 'Administrative Equipment Committee',
                approved_date: '2025-09-11',
                items: [
                    { item_id: 3, item_name: 'Office Desk', quantity_requested: 5, specifications: '4x2 feet, wooden, with drawers' }
                ]
            }
        ];
        
        const request = sampleRequests.find(r => r.request_id === requestId);
        setSelectedRequest(request);
        setRequestItems(request?.items || []);
        
        // Initialize item prices
        const prices = {};
        request?.items.forEach(item => {
            prices[item.item_id] = {
                unitPrice: 0,
                totalPrice: 0
            };
        });
        setItemPrices(prices);
    };

    const handleItemPriceChange = (itemId, field, value) => {
        const newPrices = { ...itemPrices };
        newPrices[itemId][field] = value;
        
        // Auto-calculate total price if unit price changes
        if (field === 'unitPrice') {
            const item = requestItems.find(i => i.item_id === itemId);
            newPrices[itemId].totalPrice = value * item.quantity_requested;
        }
        
        setItemPrices(newPrices);
        
        // Update total contract amount
        calculateTotalAmount(newPrices);
    };

    const calculateTotalAmount = (prices) => {
        let total = 0;
        Object.values(prices).forEach(price => {
            total += price.totalPrice || 0;
        });
        
        const taxAmount = total * 0.17; // 17% tax (adjust as needed)
        const finalAmount = total + taxAmount;
        
        setAwardData({
            ...awardData,
            totalContractAmount: total,
            taxAmount: taxAmount,
            finalAmount: finalAmount
        });
    };

    const handleSubmit = async () => {
        try {
            // Prepare award data
            const awardPayload = {
                ...awardData,
                requestId: selectedRequest.request_id,
                items: requestItems.map(item => ({
                    itemId: item.item_id,
                    quantityAwarded: item.quantity_requested,
                    unitPrice: itemPrices[item.item_id].unitPrice,
                    totalPrice: itemPrices[item.item_id].totalPrice,
                    specifications: item.specifications
                }))
            };

            // Submit to API
            const response = await fetch('/api/tender-awards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(awardPayload)
            });

            if (response.ok) {
                alert('✅ Tender award created successfully!');
                // Reset form
                setSelectedRequest(null);
                setRequestItems([]);
                setAwardData({});
                setItemPrices({});
            }
        } catch (error) {
            console.error('Error creating award:', error);
            alert('❌ Error creating tender award');
        }
    };

    return (
        <div className="direct-award-form">
            <Card title={<><TrophyOutlined /> Direct Tender Award Entry</>} style={{ maxWidth: 1200, margin: '0 auto' }}>
                
                {/* Step 1: Select Approved Request */}
                <Card size="small" title="📋 Step 1: Select Approved Request" style={{ marginBottom: 16 }}>
                    <Select 
                        placeholder="Select approved procurement request"
                        style={{ width: '100%' }}
                        onChange={handleRequestSelection}
                        value={selectedRequest?.request_id}
                    >
                        <Select.Option value={1}>REQ-20250913-001 - Office Laptops Procurement (Approved)</Select.Option>
                        <Select.Option value={2}>REQ-20250913-002 - Office Furniture Procurement (Approved)</Select.Option>
                    </Select>
                    
                    {selectedRequest && (
                        <Alert 
                            message={`Selected: ${selectedRequest.request_title}`}
                            description={`From: ${selectedRequest.dec_name} | Approved: ${selectedRequest.approved_date}`}
                            type="info" 
                            showIcon 
                            style={{ marginTop: 12 }}
                        />
                    )}
                </Card>

                {selectedRequest && (
                    <>
                        {/* Step 2: Award Information */}
                        <Card size="small" title="🏆 Step 2: Award Information" style={{ marginBottom: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                                <Input 
                                    placeholder="Award Title"
                                    prefix={<FileTextOutlined />}
                                    value={awardData.awardTitle}
                                    onChange={(e) => setAwardData({...awardData, awardTitle: e.target.value})}
                                />
                                <DatePicker 
                                    placeholder="Award Date"
                                    style={{ width: '100%' }}
                                    value={awardData.awardDate}
                                    onChange={(date) => setAwardData({...awardData, awardDate: date})}
                                />
                                <DatePicker 
                                    placeholder="Expected Delivery Date"
                                    style={{ width: '100%' }}
                                    value={awardData.expectedDeliveryDate}
                                    onChange={(date) => setAwardData({...awardData, expectedDeliveryDate: date})}
                                />
                            </div>
                        </Card>

                        {/* Step 3: Winning Vendor Information */}
                        <Card size="small" title="🏢 Step 3: Winning Vendor Information" style={{ marginBottom: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                                <Input 
                                    placeholder="Vendor Name"
                                    prefix={<UserOutlined />}
                                    value={awardData.vendorName}
                                    onChange={(e) => setAwardData({...awardData, vendorName: e.target.value})}
                                />
                                <Input 
                                    placeholder="Vendor Registration Number"
                                    value={awardData.vendorRegistration}
                                    onChange={(e) => setAwardData({...awardData, vendorRegistration: e.target.value})}
                                />
                                <Input 
                                    placeholder="Contact Person"
                                    value={awardData.vendorContactPerson}
                                    onChange={(e) => setAwardData({...awardData, vendorContactPerson: e.target.value})}
                                />
                                <Input 
                                    placeholder="Phone Number"
                                    value={awardData.vendorPhone}
                                    onChange={(e) => setAwardData({...awardData, vendorPhone: e.target.value})}
                                />
                                <Input 
                                    placeholder="Email Address"
                                    value={awardData.vendorEmail}
                                    onChange={(e) => setAwardData({...awardData, vendorEmail: e.target.value})}
                                />
                            </div>
                            <TextArea 
                                placeholder="Vendor Address"
                                rows={2}
                                style={{ marginTop: 16 }}
                                value={awardData.vendorAddress}
                                onChange={(e) => setAwardData({...awardData, vendorAddress: e.target.value})}
                            />
                        </Card>

                        {/* Step 4: Items & Pricing (FINANCIAL DATA ENTRY POINT) */}
                        <Card 
                            size="small" 
                            title={<><DollarOutlined /> Step 4: Items & Pricing (Financial Information)</>} 
                            style={{ marginBottom: 16 }}
                        >
                            <Alert 
                                message="Financial Data Entry" 
                                description="This is the ONLY place where financial/pricing information is entered in the system."
                                type="warning" 
                                showIcon 
                                style={{ marginBottom: 16 }}
                            />
                            
                            <Table 
                                dataSource={requestItems}
                                rowKey="item_id"
                                pagination={false}
                                size="small"
                                columns={[
                                    {
                                        title: 'Item',
                                        dataIndex: 'item_name',
                                        key: 'item_name',
                                        width: 200
                                    },
                                    {
                                        title: 'Specifications',
                                        dataIndex: 'specifications',
                                        key: 'specifications',
                                        width: 250
                                    },
                                    {
                                        title: 'Quantity',
                                        dataIndex: 'quantity_requested',
                                        key: 'quantity',
                                        width: 80,
                                        align: 'center'
                                    },
                                    {
                                        title: 'Unit Price (PKR)',
                                        key: 'unit_price',
                                        width: 150,
                                        render: (_, record) => (
                                            <InputNumber
                                                placeholder="Unit Price"
                                                style={{ width: '100%' }}
                                                formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                parser={value => value.replace(/₹\s?|(,*)/g, '')}
                                                value={itemPrices[record.item_id]?.unitPrice}
                                                onChange={(value) => handleItemPriceChange(record.item_id, 'unitPrice', value)}
                                            />
                                        )
                                    },
                                    {
                                        title: 'Total Price (PKR)',
                                        key: 'total_price',
                                        width: 150,
                                        render: (_, record) => (
                                            <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
                                                ₹ {(itemPrices[record.item_id]?.totalPrice || 0).toLocaleString()}
                                            </div>
                                        )
                                    }
                                ]}
                            />
                        </Card>

                        {/* Step 5: Contract Summary */}
                        <Card size="small" title="📄 Step 5: Contract Summary" style={{ marginBottom: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                                <Input 
                                    placeholder="Contract Number"
                                    value={awardData.contractNumber}
                                    onChange={(e) => setAwardData({...awardData, contractNumber: e.target.value})}
                                />
                                <DatePicker 
                                    placeholder="Contract Date"
                                    style={{ width: '100%' }}
                                    value={awardData.contractDate}
                                    onChange={(date) => setAwardData({...awardData, contractDate: date})}
                                />
                            </div>
                            
                            <TextArea 
                                placeholder="Payment Terms"
                                rows={2}
                                style={{ marginTop: 16 }}
                                value={awardData.paymentTerms}
                                onChange={(e) => setAwardData({...awardData, paymentTerms: e.target.value})}
                            />
                            
                            {/* Financial Summary */}
                            <div style={{ 
                                marginTop: 16, 
                                padding: 16, 
                                background: '#f6ffed', 
                                border: '1px solid #b7eb8f',
                                borderRadius: 4 
                            }}>
                                <h4 style={{ margin: 0, marginBottom: 12 }}>💰 Financial Summary</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                    <div>
                                        <span style={{ color: '#666' }}>Subtotal:</span>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                            ₹ {awardData.totalContractAmount.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ color: '#666' }}>Tax (17%):</span>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                            ₹ {awardData.taxAmount.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ color: '#666' }}>Final Amount:</span>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                                            ₹ {awardData.finalAmount.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Submit Button */}
                        <div style={{ textAlign: 'center', marginTop: 24 }}>
                            <Button 
                                type="primary" 
                                size="large"
                                icon={<CheckCircleOutlined />}
                                onClick={handleSubmit}
                                style={{ minWidth: 200 }}
                            >
                                🏆 Create Tender Award
                            </Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
};

// ====================================================================
// 📊 2. AWARDS LISTING & MANAGEMENT
// ====================================================================

const TenderAwardsList = () => {
    const [awards, setAwards] = useState([]);

    useEffect(() => {
        fetchAwards();
    }, []);

    const fetchAwards = async () => {
        // Sample awards data
        const sampleAwards = [
            {
                award_id: 1,
                award_code: 'AWARD-20250913-001',
                award_title: 'Office Laptops Award',
                vendor_name: 'Tech Solutions Pvt Ltd',
                award_date: '2025-09-13',
                final_amount: 850000,
                status: 'AWARDED'
            }
        ];
        setAwards(sampleAwards);
    };

    const awardColumns = [
        {
            title: 'Award Code',
            dataIndex: 'award_code',
            key: 'award_code'
        },
        {
            title: 'Award Title',
            dataIndex: 'award_title',
            key: 'award_title'
        },
        {
            title: 'Vendor',
            dataIndex: 'vendor_name',
            key: 'vendor_name'
        },
        {
            title: 'Award Date',
            dataIndex: 'award_date',
            key: 'award_date'
        },
        {
            title: 'Contract Amount',
            dataIndex: 'final_amount',
            key: 'final_amount',
            render: (amount) => `₹ ${amount.toLocaleString()}`
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'AWARDED' ? 'green' : 'blue'}>
                    {status}
                </Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button size="small">View Details</Button>
                    <Button size="small" type="primary">Process Delivery</Button>
                </Space>
            )
        }
    ];

    return (
        <Card title={<><TrophyOutlined /> Tender Awards Management</>}>
            <Table 
                dataSource={awards}
                columns={awardColumns}
                rowKey="award_id"
                pagination={{ pageSize: 10 }}
            />
        </Card>
    );
};

// ====================================================================
// 📦 3. QUANTITY-ONLY REQUEST FORM (NO FINANCIAL FIELDS)
// ====================================================================

const QuantityOnlyRequestForm = () => {
    const [requestData, setRequestData] = useState({
        title: '',
        description: '',
        justification: '',
        priority: 'NORMAL',
        requiredDate: null,
        items: []
    });

    const handleAddItem = () => {
        const newItem = {
            itemId: null,
            itemName: '',
            quantityRequested: 0,
            specifications: '',
            justification: ''
            // NO FINANCIAL FIELDS
        };
        setRequestData({
            ...requestData,
            items: [...requestData.items, newItem]
        });
    };

    const handleSubmitRequest = async () => {
        try {
            const response = await fetch('/api/procurement-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                alert('✅ Procurement request submitted successfully!');
                // Reset form
                setRequestData({
                    title: '',
                    description: '',
                    justification: '',
                    priority: 'NORMAL',
                    requiredDate: null,
                    items: []
                });
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('❌ Error submitting request');
        }
    };

    return (
        <Card title="📝 Create Procurement Request (Quantities Only)" style={{ maxWidth: 800, margin: '0 auto' }}>
            <Alert 
                message="No Financial Information Required" 
                description="This form only captures quantities and specifications. Financial information is handled separately during the tender award process."
                type="info" 
                showIcon 
                style={{ marginBottom: 16 }}
            />
            
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Input 
                    placeholder="Request Title"
                    value={requestData.title}
                    onChange={(e) => setRequestData({...requestData, title: e.target.value})}
                />
                
                <TextArea 
                    placeholder="Description"
                    rows={3}
                    value={requestData.description}
                    onChange={(e) => setRequestData({...requestData, description: e.target.value})}
                />
                
                <TextArea 
                    placeholder="Justification"
                    rows={2}
                    value={requestData.justification}
                    onChange={(e) => setRequestData({...requestData, justification: e.target.value})}
                />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Select 
                        placeholder="Priority"
                        value={requestData.priority}
                        onChange={(value) => setRequestData({...requestData, priority: value})}
                    >
                        <Select.Option value="LOW">🟢 Low</Select.Option>
                        <Select.Option value="NORMAL">🟡 Normal</Select.Option>
                        <Select.Option value="HIGH">🟠 High</Select.Option>
                        <Select.Option value="URGENT">🔴 Urgent</Select.Option>
                    </Select>
                    
                    <DatePicker 
                        placeholder="Required Date"
                        style={{ width: '100%' }}
                        value={requestData.requiredDate}
                        onChange={(date) => setRequestData({...requestData, requiredDate: date})}
                    />
                </div>

                <Divider>📦 Items Required</Divider>
                
                {requestData.items.map((item, index) => (
                    <Card key={index} size="small" title={`Item ${index + 1}`}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                            <Input 
                                placeholder="Item Name"
                                value={item.itemName}
                                onChange={(e) => {
                                    const newItems = [...requestData.items];
                                    newItems[index].itemName = e.target.value;
                                    setRequestData({...requestData, items: newItems});
                                }}
                            />
                            <InputNumber 
                                placeholder="Quantity"
                                min={1}
                                style={{ width: '100%' }}
                                value={item.quantityRequested}
                                onChange={(value) => {
                                    const newItems = [...requestData.items];
                                    newItems[index].quantityRequested = value;
                                    setRequestData({...requestData, items: newItems});
                                }}
                            />
                        </div>
                        <TextArea 
                            placeholder="Technical Specifications"
                            rows={2}
                            value={item.specifications}
                            onChange={(e) => {
                                const newItems = [...requestData.items];
                                newItems[index].specifications = e.target.value;
                                setRequestData({...requestData, items: newItems});
                            }}
                        />
                    </Card>
                ))}
                
                <Button type="dashed" onClick={handleAddItem} style={{ width: '100%' }}>
                    + Add Item
                </Button>
                
                <Button 
                    type="primary" 
                    size="large" 
                    onClick={handleSubmitRequest}
                    style={{ width: '100%' }}
                >
                    📤 Submit Request
                </Button>
            </Space>
        </Card>
    );
};

export {
    DirectTenderAwardForm,
    TenderAwardsList,
    QuantityOnlyRequestForm
};
