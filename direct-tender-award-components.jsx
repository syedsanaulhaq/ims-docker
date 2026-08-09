// ====================================================================
// 🏆 DIRECT TENDER AWARD ENTRY SYSTEM
// ====================================================================
// Frontend components for entering tender awards directly without bidding.
// Financial data is entered ONLY at this stage.
// ====================================================================

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, InputNumber, Select, TextArea, DatePicker, Form, Table, Space, Divider, Alert, Typography, Row, Col } from 'antd';
import { 
    TrophyOutlined, 
    DollarOutlined,
    ShoppingCartOutlined,
    CalendarOutlined,
    ContactsOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text } = Typography;

// ====================================================================
// 🎯 1. TENDER PREPARATION (NO FINANCIAL DATA)
// ====================================================================

const TenderPreparationForm = ({ sourceRequestId }) => {
    const [form] = Form.useForm();
    const [requestData, setRequestData] = useState(null);
    const [tenderItems, setTenderItems] = useState([]);

    useEffect(() => {
        if (sourceRequestId) {
            fetchRequestData(sourceRequestId);
        }
    }, [sourceRequestId]);

    const fetchRequestData = async (requestId) => {
        try {
            const response = await fetch(`/api/v1/requests/${requestId}`);
            const data = await response.json();
            setRequestData(data);
            
            // Convert request items to tender items (no financial data)
            const items = data.items.map((item, index) => ({
                key: index,
                item_sequence: index + 1,
                item_name: item.item_name,
                category_name: item.category_name || 'General',
                quantity_required: item.quantity_requested,
                detailed_specifications: item.specifications,
                technical_requirements: item.technical_requirements || '',
                required_delivery_days: 30,
                warranty_required_months: 12
            }));
            setTenderItems(items);
        } catch (error) {
            console.error('Error fetching request data:', error);
        }
    };

    const handlePrepareTender = async (values) => {
        try {
            const tenderData = {
                ...values,
                source_request_id: sourceRequestId,
                items: tenderItems
            };

            const response = await fetch('/api/v1/tenders/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(tenderData)
            });

            const result = await response.json();
            
            if (result.success) {
                alert(`Tender prepared successfully! Tender ID: ${result.tender_id}`);
                // Redirect to award entry
                window.location.href = `/tender-award/${result.tender_id}`;
            }
        } catch (error) {
            console.error('Error preparing tender:', error);
        }
    };

    const itemColumns = [
        {
            title: '#',
            dataIndex: 'item_sequence',
            width: 60
        },
        {
            title: 'Item Name',
            dataIndex: 'item_name',
            width: 200
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity_required',
            width: 100
        },
        {
            title: 'Specifications',
            dataIndex: 'detailed_specifications',
            ellipsis: true
        },
        {
            title: 'Delivery Days',
            dataIndex: 'required_delivery_days',
            width: 120,
            render: (value, record, index) => (
                <InputNumber
                    value={value}
                    min={1}
                    max={365}
                    onChange={(newValue) => {
                        const newItems = [...tenderItems];
                        newItems[index].required_delivery_days = newValue;
                        setTenderItems(newItems);
                    }}
                />
            )
        }
    ];

    return (
        <Card title="📋 Prepare Tender (No Financial Data)" className="tender-preparation">
            <Alert 
                message="Tender Preparation Stage" 
                description="At this stage, only specifications and quantities are defined. Financial data will be entered when awarding the tender."
                type="info" 
                showIcon 
                style={{marginBottom: 24}}
            />

            {requestData && (
                <div className="source-request-info">
                    <Title level={4}>📄 Source Request: {requestData.request_title}</Title>
                    <Text>From: {requestData.requester_name} | DEC: {requestData.dec_name}</Text>
                </div>
            )}

            <Form form={form} layout="vertical" onFinish={handlePrepareTender}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item 
                            name="tender_title" 
                            label="Tender Title"
                            rules={[{ required: true, message: 'Please enter tender title' }]}
                        >
                            <Input placeholder="Enter descriptive tender title" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item 
                            name="required_delivery_date" 
                            label="Required Delivery Date"
                            rules={[{ required: true, message: 'Please select delivery date' }]}
                        >
                            <DatePicker style={{width: '100%'}} />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item 
                    name="tender_description" 
                    label="Tender Description"
                >
                    <TextArea 
                        rows={3} 
                        placeholder="Detailed description of procurement requirements"
                    />
                </Form.Item>

                <Divider>📦 Tender Items (Specifications Only)</Divider>

                <Table 
                    columns={itemColumns}
                    dataSource={tenderItems}
                    pagination={false}
                    size="small"
                    style={{marginBottom: 24}}
                />

                <Form.Item>
                    <Button 
                        type="primary" 
                        htmlType="submit" 
                        icon={<FileTextOutlined />}
                        size="large"
                    >
                        Prepare Tender (Ready for Award)
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
};

// ====================================================================
// 🏆 2. DIRECT TENDER AWARD ENTRY (WITH FINANCIAL DATA)
// ====================================================================

const DirectTenderAwardForm = ({ tenderId }) => {
    const [form] = Form.useForm();
    const [tenderData, setTenderData] = useState(null);
    const [tenderItems, setTenderItems] = useState([]);
    const [itemPricing, setItemPricing] = useState([]);
    const [totalCalculated, setTotalCalculated] = useState(0);

    useEffect(() => {
        if (tenderId) {
            fetchTenderData(tenderId);
        }
    }, [tenderId]);

    useEffect(() => {
        // Calculate total when item pricing changes
        const total = itemPricing.reduce((sum, item) => sum + (item.total_cost || 0), 0);
        setTotalCalculated(total);
        form.setFieldsValue({ total_contract_value: total });
    }, [itemPricing]);

    const fetchTenderData = async (id) => {
        try {
            const response = await fetch(`/api/v1/tenders/${id}/details`);
            const data = await response.json();
            setTenderData(data.tender);
            setTenderItems(data.items);
            
            // Initialize pricing array
            const initialPricing = data.items.map(item => ({
                tender_item_id: item.tender_item_id,
                item_name: item.item_name,
                quantity: item.quantity_required,
                unit_price: 0,
                total_cost: 0
            }));
            setItemPricing(initialPricing);
        } catch (error) {
            console.error('Error fetching tender data:', error);
        }
    };

    const updateItemPrice = (index, field, value) => {
        const newPricing = [...itemPricing];
        newPricing[index][field] = value;
        
        if (field === 'unit_price') {
            newPricing[index].total_cost = value * newPricing[index].quantity;
        } else if (field === 'total_cost') {
            newPricing[index].unit_price = value / newPricing[index].quantity;
        }
        
        setItemPricing(newPricing);
    };

    const handleAwardTender = async (values) => {
        try {
            const awardData = {
                ...values,
                tender_id: tenderId,
                item_pricing: itemPricing,
                expected_delivery_date: moment(values.expected_delivery_date).format('YYYY-MM-DD')
            };

            const response = await fetch('/api/v1/tenders/award', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(awardData)
            });

            const result = await response.json();
            
            if (result.success) {
                alert('Tender awarded successfully!');
                // Redirect to award summary
                window.location.href = `/tender-award-summary/${result.award_id}`;
            }
        } catch (error) {
            console.error('Error awarding tender:', error);
        }
    };

    const pricingColumns = [
        {
            title: 'Item',
            dataIndex: 'item_name',
            width: 200
        },
        {
            title: 'Qty',
            dataIndex: 'quantity',
            width: 80
        },
        {
            title: '💰 Unit Price (PKR)',
            width: 150,
            render: (_, record, index) => (
                <InputNumber
                    value={record.unit_price}
                    min={0}
                    precision={2}
                    formatter={value => `₨ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/₨\s?|(,*)/g, '')}
                    onChange={(value) => updateItemPrice(index, 'unit_price', value || 0)}
                    style={{width: '100%'}}
                />
            )
        },
        {
            title: '💰 Total Cost (PKR)',
            width: 180,
            render: (_, record, index) => (
                <InputNumber
                    value={record.total_cost}
                    min={0}
                    precision={2}
                    formatter={value => `₨ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/₨\s?|(,*)/g, '')}
                    onChange={(value) => updateItemPrice(index, 'total_cost', value || 0)}
                    style={{width: '100%'}}
                />
            )
        }
    ];

    return (
        <div className="direct-award-form">
            {/* Tender Information */}
            {tenderData && (
                <Card title="📋 Tender Information" style={{marginBottom: 24}}>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Text strong>Tender Code:</Text><br />
                            <Text>{tenderData.tender_code}</Text>
                        </Col>
                        <Col span={8}>
                            <Text strong>Title:</Text><br />
                            <Text>{tenderData.tender_title}</Text>
                        </Col>
                        <Col span={8}>
                            <Text strong>Status:</Text><br />
                            <Text type="warning">READY FOR AWARD</Text>
                        </Col>
                    </Row>
                </Card>
            )}

            {/* Award Entry Form */}
            <Card title="🏆 Enter Tender Award (Financial Data Entry Point)" className="award-entry">
                <Alert 
                    message="Financial Data Entry Stage" 
                    description="This is the ONLY place where financial/cost information is entered in the system."
                    type="warning" 
                    showIcon 
                    style={{marginBottom: 24}}
                />

                <Form form={form} layout="vertical" onFinish={handleAwardTender}>
                    {/* Vendor Information */}
                    <Card type="inner" title="🏢 Winning Vendor Information" style={{marginBottom: 24}}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item 
                                    name="vendor_name" 
                                    label="Vendor Company Name"
                                    rules={[{ required: true, message: 'Please enter vendor name' }]}
                                >
                                    <Input placeholder="Enter winning vendor name" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item 
                                    name="vendor_registration" 
                                    label="Registration Number"
                                >
                                    <Input placeholder="Company registration number" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item 
                                    name="vendor_contact" 
                                    label="Contact Person"
                                    rules={[{ required: true, message: 'Please enter contact person' }]}
                                >
                                    <Input placeholder="Contact person name" />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item 
                                    name="vendor_phone" 
                                    label="Phone Number"
                                    rules={[{ required: true, message: 'Please enter phone number' }]}
                                >
                                    <Input placeholder="+92-21-12345678" />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item 
                                    name="vendor_email" 
                                    label="Email Address"
                                    rules={[{ required: true, type: 'email', message: 'Please enter valid email' }]}
                                >
                                    <Input placeholder="vendor@company.com" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item 
                            name="vendor_address" 
                            label="Complete Address"
                        >
                            <TextArea rows={2} placeholder="Complete vendor address" />
                        </Form.Item>
                    </Card>

                    {/* Financial Information */}
                    <Card type="inner" title="💰 Financial Information" style={{marginBottom: 24}}>
                        <Alert 
                            message="⭐ PRIMARY FINANCIAL DATA ENTRY POINT ⭐" 
                            description="Enter the actual contracted prices and costs here."
                            type="error" 
                            showIcon 
                            style={{marginBottom: 16}}
                        />

                        <Title level={5}>📊 Item-wise Pricing</Title>
                        <Table 
                            columns={pricingColumns}
                            dataSource={itemPricing}
                            pagination={false}
                            size="small"
                            style={{marginBottom: 16}}
                        />

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item 
                                    name="total_contract_value" 
                                    label="Total Contract Value (PKR)"
                                    rules={[{ required: true, message: 'Please enter total contract value' }]}
                                >
                                    <InputNumber
                                        min={0}
                                        precision={2}
                                        formatter={value => `₨ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                        parser={value => value.replace(/₨\s?|(,*)/g, '')}
                                        style={{width: '100%'}}
                                        size="large"
                                        readOnly
                                    />
                                </Form.Item>
                                <Text type="secondary">
                                    Calculated Total: ₨ {totalCalculated.toLocaleString()}
                                </Text>
                            </Col>
                            <Col span={12}>
                                <Form.Item 
                                    name="contract_currency" 
                                    label="Contract Currency"
                                    initialValue="PKR"
                                >
                                    <Select>
                                        <Select.Option value="PKR">Pakistani Rupee (PKR)</Select.Option>
                                        <Select.Option value="USD">US Dollar (USD)</Select.Option>
                                        <Select.Option value="EUR">Euro (EUR)</Select.Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item 
                            name="payment_terms" 
                            label="Payment Terms"
                            rules={[{ required: true, message: 'Please enter payment terms' }]}
                        >
                            <TextArea 
                                rows={2} 
                                placeholder="e.g., 30% advance, 70% on delivery" 
                            />
                        </Form.Item>
                    </Card>

                    {/* Contract Details */}
                    <Card type="inner" title="📋 Contract Details" style={{marginBottom: 24}}>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item 
                                    name="delivery_days" 
                                    label="Delivery Timeline (Days)"
                                    rules={[{ required: true, message: 'Please enter delivery days' }]}
                                    initialValue={30}
                                >
                                    <InputNumber min={1} max={365} style={{width: '100%'}} />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item 
                                    name="warranty_months" 
                                    label="Warranty Period (Months)"
                                    rules={[{ required: true, message: 'Please enter warranty months' }]}
                                    initialValue={12}
                                >
                                    <InputNumber min={0} max={120} style={{width: '100%'}} />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item 
                                    name="contract_reference" 
                                    label="Contract Reference"
                                >
                                    <Input placeholder="CONTRACT-2025-XXX" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item 
                            name="selection_reason" 
                            label="Selection Justification"
                            rules={[{ required: true, message: 'Please provide selection reason' }]}
                        >
                            <TextArea 
                                rows={3} 
                                placeholder="Explain why this vendor was selected (technical compliance, pricing, experience, etc.)"
                            />
                        </Form.Item>
                    </Card>

                    {/* Submit Button */}
                    <Form.Item>
                        <Space size="large">
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                icon={<TrophyOutlined />}
                                size="large"
                                danger
                            >
                                🏆 Award Tender (Final Step)
                            </Button>
                            <Button size="large">
                                Save as Draft
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

// ====================================================================
// 📊 3. TENDER AWARD SUMMARY (FINANCIAL DATA DISPLAY)
// ====================================================================

const TenderAwardSummary = ({ awardId }) => {
    const [awardData, setAwardData] = useState(null);
    const [awardItems, setAwardItems] = useState([]);

    useEffect(() => {
        if (awardId) {
            fetchAwardData(awardId);
        }
    }, [awardId]);

    const fetchAwardData = async (id) => {
        try {
            const response = await fetch(`/api/v1/tender-awards/${id}/summary`);
            const data = await response.json();
            setAwardData(data.award);
            setAwardItems(data.items);
        } catch (error) {
            console.error('Error fetching award data:', error);
        }
    };

    const itemColumns = [
        {
            title: 'Item',
            dataIndex: 'awarded_item_name',
            width: 200
        },
        {
            title: 'Qty',
            dataIndex: 'awarded_quantity',
            width: 80
        },
        {
            title: 'Unit Price',
            dataIndex: 'unit_price',
            width: 120,
            render: (value) => `₨ ${value?.toLocaleString()}`
        },
        {
            title: 'Total Cost',
            dataIndex: 'total_item_cost',
            width: 150,
            render: (value) => `₨ ${value?.toLocaleString()}`
        }
    ];

    if (!awardData) {
        return <div>Loading award summary...</div>;
    }

    return (
        <div className="award-summary">
            <Card title="🏆 Tender Award Summary" extra={<Text type="success">AWARDED</Text>}>
                {/* Contract Overview */}
                <Card type="inner" title="📋 Contract Overview" style={{marginBottom: 16}}>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Text strong>Tender:</Text><br />
                            <Text>{awardData.tender_code}</Text><br />
                            <Text type="secondary">{awardData.tender_title}</Text>
                        </Col>
                        <Col span={8}>
                            <Text strong>Awarded To:</Text><br />
                            <Text>{awardData.awarded_vendor_name}</Text><br />
                            <Text type="secondary">{awardData.vendor_contact_person}</Text>
                        </Col>
                        <Col span={8}>
                            <Text strong>Award Date:</Text><br />
                            <Text>{moment(awardData.award_date).format('DD MMM YYYY')}</Text><br />
                            <Text type="secondary">Contract: {awardData.contract_reference}</Text>
                        </Col>
                    </Row>
                </Card>

                {/* Financial Summary */}
                <Card type="inner" title="💰 Financial Summary" style={{marginBottom: 16}}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <div style={{textAlign: 'center', padding: '20px', backgroundColor: '#f6ffed', border: '2px solid #b7eb8f', borderRadius: '8px'}}>
                                <Title level={2} style={{margin: 0, color: '#52c41a'}}>
                                    ₨ {awardData.total_contract_value?.toLocaleString()}
                                </Title>
                                <Text>Total Contract Value</Text>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div style={{padding: '10px'}}>
                                <p><strong>Currency:</strong> {awardData.contract_currency}</p>
                                <p><strong>Payment Terms:</strong> {awardData.payment_terms}</p>
                                <p><strong>Delivery:</strong> {awardData.promised_delivery_days} days</p>
                                <p><strong>Warranty:</strong> {awardData.warranty_months} months</p>
                            </div>
                        </Col>
                    </Row>
                </Card>

                {/* Item Breakdown */}
                <Card type="inner" title="📦 Item-wise Breakdown">
                    <Table 
                        columns={itemColumns}
                        dataSource={awardItems}
                        pagination={false}
                        size="small"
                        footer={() => (
                            <div style={{textAlign: 'right'}}>
                                <Text strong>
                                    Total: ₨ {awardItems.reduce((sum, item) => sum + item.total_item_cost, 0).toLocaleString()}
                                </Text>
                            </div>
                        )}
                    />
                </Card>

                {/* Action Buttons */}
                <div style={{marginTop: 24, textAlign: 'center'}}>
                    <Space size="large">
                        <Button type="primary" icon={<CalendarOutlined />}>
                            Track Delivery
                        </Button>
                        <Button icon={<FileTextOutlined />}>
                            Generate Contract
                        </Button>
                        <Button icon={<ContactsOutlined />}>
                            Contact Vendor
                        </Button>
                    </Space>
                </div>
            </Card>
        </div>
    );
};

// ====================================================================
// 🎨 STYLES
// ====================================================================

const styles = `
.tender-preparation {
    max-width: 1000px;
    margin: 0 auto;
}

.award-entry {
    max-width: 1200px;
    margin: 0 auto;
}

.award-summary {
    max-width: 1000px;
    margin: 0 auto;
}

.source-request-info {
    margin-bottom: 24px;
    padding: 16px;
    background: #fafafa;
    border-radius: 6px;
}
`;

export {
    TenderPreparationForm,
    DirectTenderAwardForm,
    TenderAwardSummary,
    styles
};

// ====================================================================
// 📚 USAGE EXAMPLE
// ====================================================================

/*
// In your main App component:

import {
    TenderPreparationForm,
    DirectTenderAwardForm,
    TenderAwardSummary
} from './DirectTenderAwardComponents';

// Routes:
<Route path="/prepare-tender/:requestId" element={<TenderPreparationForm />} />
<Route path="/tender-award/:tenderId" element={<DirectTenderAwardForm />} />
<Route path="/tender-award-summary/:awardId" element={<TenderAwardSummary />} />

*/
