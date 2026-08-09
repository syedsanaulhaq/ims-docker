// ====================================================================
// 🎯 TENDER-ONLY FINANCIAL FRONTEND COMPONENTS
// ====================================================================
// These components ensure financial data is NEVER shown or entered
// until the tender/bid evaluation stage
// ====================================================================

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, TextArea, Progress, Tag, Alert, DatePicker } from 'antd';
import { 
    ShoppingCartOutlined, 
    CheckCircleOutlined, 
    WarningOutlined,
    ExclamationCircleOutlined,
    FileTextOutlined,
    TrophyOutlined 
} from '@ant-design/icons';

// ====================================================================
// 📝 1. PURE QUANTITY REQUEST FORM (ZERO FINANCIAL FIELDS)
// ====================================================================

const PureQuantityRequestForm = () => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        justification: '',
        priority: 'NORMAL',
        requiredDate: null,
        items: []
    });

    const [currentItem, setCurrentItem] = useState({
        name: '',
        category: '',
        quantity: '',
        unit: 'pieces',
        specifications: '',
        qualityStandards: '',
        brandPreference: '',
        alternativesAcceptable: true,
        quantityJustification: '',
        usagePurpose: '',
        urgencyReason: ''
    });

    const [stockAnalysis, setStockAnalysis] = useState(null);

    const handleItemAnalysis = async (itemName) => {
        // Get current stock analysis (quantities only)
        const analysis = await fetchStockAnalysis(itemName);
        setStockAnalysis(analysis);
    };

    const addItemToRequest = () => {
        if (!currentItem.name || !currentItem.quantity) {
            alert('Item name and quantity are required');
            return;
        }

        const newItem = {
            ...currentItem,
            id: Date.now(),
            // ABSOLUTELY NO FINANCIAL FIELDS
            // NO cost estimates
            // NO budget allocation
            // NO price expectations
        };

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));

        // Reset current item
        setCurrentItem({
            name: '',
            category: '',
            quantity: '',
            unit: 'pieces',
            specifications: '',
            qualityStandards: '',
            brandPreference: '',
            alternativesAcceptable: true,
            quantityJustification: '',
            usagePurpose: '',
            urgencyReason: ''
        });
    };

    return (
        <div className="pure-quantity-request-form">
            <Card title="📝 Create Procurement Request (Quantity & Specifications Only)" className="main-form-card">
                
                {/* Request Header Information */}
                <div className="form-section">
                    <h4>📋 Request Information</h4>
                    <Input 
                        placeholder="Request Title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        style={{marginBottom: 12}}
                        size="large"
                    />
                    
                    <TextArea 
                        placeholder="Overall Description of Requirement"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={3}
                        style={{marginBottom: 12}}
                    />
                    
                    <TextArea 
                        placeholder="Justification for this Procurement Request"
                        value={formData.justification}
                        onChange={(e) => setFormData({...formData, justification: e.target.value})}
                        rows={2}
                        style={{marginBottom: 12}}
                    />
                    
                    <div style={{display: 'flex', gap: '12px', marginBottom: 12}}>
                        <Select 
                            placeholder="Priority Level"
                            value={formData.priority}
                            onChange={(value) => setFormData({...formData, priority: value})}
                            style={{flex: 1}}
                        >
                            <Select.Option value="LOW">🟢 Low Priority</Select.Option>
                            <Select.Option value="NORMAL">🟡 Normal Priority</Select.Option>
                            <Select.Option value="HIGH">🟠 High Priority</Select.Option>
                            <Select.Option value="URGENT">🔴 Urgent</Select.Option>
                        </Select>
                        
                        <DatePicker 
                            placeholder="Required By Date"
                            value={formData.requiredDate}
                            onChange={(date) => setFormData({...formData, requiredDate: date})}
                            style={{flex: 1}}
                        />
                    </div>
                </div>

                {/* Item Addition Section */}
                <div className="form-section">
                    <h4>📦 Add Required Items</h4>
                    
                    <div className="item-input-grid">
                        <div className="basic-item-info">
                            <Input 
                                placeholder="Item Name"
                                value={currentItem.name}
                                onChange={(e) => {
                                    setCurrentItem({...currentItem, name: e.target.value});
                                    handleItemAnalysis(e.target.value);
                                }}
                                style={{marginBottom: 8}}
                            />
                            
                            <Select 
                                placeholder="Category"
                                value={currentItem.category}
                                onChange={(value) => setCurrentItem({...currentItem, category: value})}
                                style={{width: '100%', marginBottom: 8}}
                            >
                                <Select.Option value="IT_EQUIPMENT">💻 IT Equipment</Select.Option>
                                <Select.Option value="OFFICE_FURNITURE">🪑 Office Furniture</Select.Option>
                                <Select.Option value="OFFICE_SUPPLIES">📎 Office Supplies</Select.Option>
                                <Select.Option value="VEHICLES">🚗 Vehicles</Select.Option>
                                <Select.Option value="MAINTENANCE">🔧 Maintenance Items</Select.Option>
                            </Select>
                        </div>

                        <div className="quantity-section">
                            <div style={{display: 'flex', gap: '8px'}}>
                                <Input 
                                    type="number"
                                    placeholder="Quantity"
                                    value={currentItem.quantity}
                                    onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                                    style={{flex: 2}}
                                />
                                <Select 
                                    value={currentItem.unit}
                                    onChange={(value) => setCurrentItem({...currentItem, unit: value})}
                                    style={{flex: 1}}
                                >
                                    <Select.Option value="pieces">Pieces</Select.Option>
                                    <Select.Option value="sets">Sets</Select.Option>
                                    <Select.Option value="boxes">Boxes</Select.Option>
                                    <Select.Option value="units">Units</Select.Option>
                                </Select>
                            </div>
                            
                            {/* Stock Analysis Display (Quantities Only) */}
                            {stockAnalysis && (
                                <Card size="small" style={{marginTop: 8, backgroundColor: '#f6ffed'}}>
                                    <div className="stock-info">
                                        <p><strong>Current Stock:</strong> {stockAnalysis.currentStock} {currentItem.unit}</p>
                                        <p><strong>Minimum Level:</strong> {stockAnalysis.minimumLevel} {currentItem.unit}</p>
                                        <p><strong>Monthly Usage:</strong> {stockAnalysis.monthlyUsage} {currentItem.unit}</p>
                                        <Tag color={stockAnalysis.status === 'LOW' ? 'red' : 'green'}>
                                            {stockAnalysis.status}
                                        </Tag>
                                        {/* NO STOCK VALUE */}
                                        {/* NO COST PER UNIT */}
                                        {/* NO BUDGET IMPACT */}
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* Technical Specifications */}
                    <div className="specifications-section">
                        <h5>📋 Technical Specifications</h5>
                        <TextArea 
                            placeholder="Detailed technical specifications and requirements..."
                            value={currentItem.specifications}
                            onChange={(e) => setCurrentItem({...currentItem, specifications: e.target.value})}
                            rows={4}
                            style={{marginBottom: 8}}
                        />
                        
                        <TextArea 
                            placeholder="Quality standards and compliance requirements..."
                            value={currentItem.qualityStandards}
                            onChange={(e) => setCurrentItem({...currentItem, qualityStandards: e.target.value})}
                            rows={2}
                            style={{marginBottom: 8}}
                        />
                        
                        <div style={{display: 'flex', gap: '8px', marginBottom: 8}}>
                            <Input 
                                placeholder="Preferred Brand (if any)"
                                value={currentItem.brandPreference}
                                onChange={(e) => setCurrentItem({...currentItem, brandPreference: e.target.value})}
                                style={{flex: 2}}
                            />
                            <Select 
                                value={currentItem.alternativesAcceptable}
                                onChange={(value) => setCurrentItem({...currentItem, alternativesAcceptable: value})}
                                style={{flex: 1}}
                            >
                                <Select.Option value={true}>✅ Alternatives OK</Select.Option>
                                <Select.Option value={false}>❌ Specific Brand Only</Select.Option>
                            </Select>
                        </div>
                    </div>

                    {/* Justification Section */}
                    <div className="justification-section">
                        <h5>📝 Quantity & Need Justification</h5>
                        <TextArea 
                            placeholder="Why is this specific quantity needed?"
                            value={currentItem.quantityJustification}
                            onChange={(e) => setCurrentItem({...currentItem, quantityJustification: e.target.value})}
                            rows={2}
                            style={{marginBottom: 8}}
                        />
                        
                        <TextArea 
                            placeholder="How will these items be used?"
                            value={currentItem.usagePurpose}
                            onChange={(e) => setCurrentItem({...currentItem, usagePurpose: e.target.value})}
                            rows={2}
                            style={{marginBottom: 8}}
                        />
                        
                        {formData.priority === 'HIGH' || formData.priority === 'URGENT' ? (
                            <TextArea 
                                placeholder="Urgency justification (required for high/urgent priority)"
                                value={currentItem.urgencyReason}
                                onChange={(e) => setCurrentItem({...currentItem, urgencyReason: e.target.value})}
                                rows={2}
                                style={{marginBottom: 8}}
                            />
                        ) : null}
                    </div>

                    {/* NO FINANCIAL INPUT SECTION */}
                    {/* NO COST ESTIMATION */}
                    {/* NO BUDGET FIELDS */}
                    {/* NO PRICE EXPECTATIONS */}

                    <Button 
                        type="primary" 
                        onClick={addItemToRequest}
                        style={{marginTop: 12}}
                        icon={<ShoppingCartOutlined />}
                    >
                        Add Item to Request
                    </Button>
                </div>

                {/* Items Summary */}
                {formData.items.length > 0 && (
                    <div className="form-section">
                        <h4>📦 Items in Request ({formData.items.length})</h4>
                        {formData.items.map((item) => (
                            <Card key={item.id} size="small" style={{marginBottom: 8}}>
                                <div className="item-summary">
                                    <div className="item-header">
                                        <h6>{item.name}</h6>
                                        <Tag color="blue">{item.quantity} {item.unit}</Tag>
                                        <Button 
                                            size="small" 
                                            danger 
                                            onClick={() => removeItem(item.id)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                    <p><strong>Specifications:</strong> {item.specifications}</p>
                                    <p><strong>Justification:</strong> {item.quantityJustification}</p>
                                    {/* NO COST DISPLAY */}
                                    {/* NO BUDGET INFORMATION */}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Submit Section */}
                <div className="form-actions">
                    <Alert 
                        message="No Financial Information Required" 
                        description="This request focuses on quantities and specifications only. Financial evaluation will be handled during the tender process."
                        type="info" 
                        showIcon 
                        style={{marginBottom: 16}}
                    />
                    
                    <Button 
                        type="primary" 
                        size="large"
                        icon={<FileTextOutlined />}
                        onClick={submitRequest}
                        disabled={formData.items.length === 0}
                    >
                        Submit Procurement Request
                    </Button>
                    <Button style={{marginLeft: 8}} size="large">
                        Save as Draft
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// ====================================================================
// ✅ 2. NEED-BASED APPROVAL DASHBOARD (ZERO FINANCIAL ANALYSIS)
// ====================================================================

const NeedBasedApprovalDashboard = ({ requestId, userRole }) => {
    const [requestData, setRequestData] = useState(null);
    const [stockAnalysis, setStockAnalysis] = useState([]);
    const [usageAnalytics, setUsageAnalytics] = useState([]);
    const [approvalComments, setApprovalComments] = useState('');

    return (
        <div className="need-based-approval-dashboard">
            <Card title="✅ Request Approval Review (Need Analysis Only)">
                
                {/* Request Summary */}
                <div className="request-overview">
                    <h4>📋 Request: {requestData?.title}</h4>
                    <div className="request-meta">
                        <p><strong>From:</strong> {requestData?.requester_name} ({requestData?.dec_name})</p>
                        <p><strong>Priority:</strong> 
                            <Tag color={getPriorityColor(requestData?.priority)}>
                                {requestData?.priority}
                            </Tag>
                        </p>
                        <p><strong>Required By:</strong> {requestData?.required_date}</p>
                        <p><strong>Justification:</strong> {requestData?.justification}</p>
                    </div>
                </div>

                {/* Need Analysis for Each Item */}
                <div className="items-analysis">
                    <h4>📊 Items Need Analysis</h4>
                    {requestData?.items?.map((item, index) => (
                        <Card key={index} size="small" style={{marginBottom: 16}}>
                            <div className="item-need-analysis">
                                <h5>📦 {item.item_name}</h5>
                                
                                {/* Quantity Analysis */}
                                <div className="quantity-analysis">
                                    <h6>📏 Quantity Analysis</h6>
                                    <div className="quantity-metrics">
                                        <div className="metric">
                                            <span className="label">Requested:</span>
                                            <span className="value">{item.quantity_requested} {item.unit}</span>
                                        </div>
                                        <div className="metric">
                                            <span className="label">Current Stock:</span>
                                            <span className={`value ${item.current_stock <= item.minimum_level ? 'critical' : 'normal'}`}>
                                                {item.current_stock} {item.unit}
                                                {item.current_stock <= item.minimum_level && 
                                                    <ExclamationCircleOutlined style={{color: 'red', marginLeft: 4}} />
                                                }
                                            </span>
                                        </div>
                                        <div className="metric">
                                            <span className="label">Minimum Level:</span>
                                            <span className="value">{item.minimum_level} {item.unit}</span>
                                        </div>
                                        <div className="metric">
                                            <span className="label">After Procurement:</span>
                                            <span className="value success">
                                                {item.current_stock + item.quantity_requested} {item.unit}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Usage Pattern Analysis */}
                                <div className="usage-analysis">
                                    <h6>📈 Usage Pattern Analysis</h6>
                                    <div className="usage-metrics">
                                        <p><strong>Last 6 months usage:</strong> {item.usage_last_6_months} {item.unit}</p>
                                        <p><strong>Monthly average:</strong> {item.monthly_average} {item.unit}</p>
                                        <p><strong>Projected 6-month need:</strong> {item.projected_need} {item.unit}</p>
                                        <p><strong>Stock duration:</strong> 
                                            {item.monthly_average > 0 
                                                ? `${Math.floor((item.current_stock + item.quantity_requested) / item.monthly_average)} months`
                                                : 'N/A'
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Need Justification Review */}
                                <div className="justification-review">
                                    <h6>📝 Need Justification</h6>
                                    <div className="justification-content">
                                        <p><strong>Quantity Justification:</strong> {item.quantity_justification}</p>
                                        <p><strong>Usage Purpose:</strong> {item.usage_purpose}</p>
                                        {item.urgency_reason && (
                                            <p><strong>Urgency Reason:</strong> {item.urgency_reason}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Technical Specification Review */}
                                <div className="technical-review">
                                    <h6>🔧 Technical Specifications</h6>
                                    <pre className="specifications-text">{item.specifications}</pre>
                                    {item.quality_standards && (
                                        <div style={{marginTop: 8}}>
                                            <strong>Quality Standards:</strong>
                                            <pre className="quality-text">{item.quality_standards}</pre>
                                        </div>
                                    )}
                                </div>

                                {/* Stock Impact Assessment */}
                                <div className="stock-impact">
                                    <h6>📊 Stock Impact Assessment</h6>
                                    <div className="impact-analysis">
                                        {item.current_stock <= 0 ? (
                                            <Alert 
                                                message="Critical Stock Situation" 
                                                description="Item is completely out of stock. Immediate procurement necessary."
                                                type="error" 
                                                showIcon 
                                            />
                                        ) : item.current_stock <= item.minimum_level ? (
                                            <Alert 
                                                message="Low Stock Alert" 
                                                description="Current stock is below minimum level. Procurement recommended."
                                                type="warning" 
                                                showIcon 
                                            />
                                        ) : (
                                            <Alert 
                                                message="Stock Analysis" 
                                                description="Current stock level is adequate. Evaluate if additional quantity is justified."
                                                type="info" 
                                                showIcon 
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* NO FINANCIAL IMPACT SECTION */}
                                {/* NO BUDGET ANALYSIS */}
                                {/* NO COST JUSTIFICATION */}
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Approval Decision Section */}
                <div className="approval-decision">
                    <h4>🎯 Approval Decision</h4>
                    
                    <div className="decision-analysis">
                        <h5>📋 Need-Based Decision Criteria</h5>
                        <div className="criteria-checklist">
                            <div className="criterion">
                                <span>✅ Stock level justifies procurement</span>
                            </div>
                            <div className="criterion">
                                <span>✅ Quantity request is reasonable based on usage</span>
                            </div>
                            <div className="criterion">
                                <span>✅ Technical specifications are appropriate</span>
                            </div>
                            <div className="criterion">
                                <span>✅ Justification is adequate</span>
                            </div>
                            <div className="criterion">
                                <span>✅ Priority level is appropriate</span>
                            </div>
                        </div>
                    </div>

                    <div className="approval-comments">
                        <h5>💬 Approval Comments</h5>
                        <TextArea 
                            placeholder="Comments on need analysis, quantity justification, and technical requirements..."
                            value={approvalComments}
                            onChange={(e) => setApprovalComments(e.target.value)}
                            rows={4}
                            style={{marginBottom: 16}}
                        />
                    </div>

                    <div className="decision-buttons">
                        <Button 
                            type="primary" 
                            size="large"
                            icon={<CheckCircleOutlined />}
                            style={{marginRight: 12}}
                            onClick={() => handleApproval('APPROVED')}
                        >
                            ✅ Approve Request
                        </Button>
                        
                        <Button 
                            danger
                            size="large"
                            icon={<WarningOutlined />}
                            style={{marginRight: 12}}
                            onClick={() => handleApproval('REJECTED')}
                        >
                            ❌ Reject Request
                        </Button>
                        
                        <Button 
                            size="large"
                            onClick={() => handleApproval('RETURNED')}
                        >
                            🔄 Return for Clarification
                        </Button>
                    </div>

                    <Alert 
                        message="Need-Based Approval" 
                        description="Approval is based solely on operational need, stock analysis, and technical requirements. Financial evaluation will be conducted during the tender process."
                        type="info" 
                        showIcon 
                        style={{marginTop: 16}}
                    />
                </div>
            </Card>
        </div>
    );
};

// ====================================================================
// 💰 3. TENDER BID EVALUATION (FINANCIAL DATA ENTRY POINT)
// ====================================================================

const TenderBidEvaluation = ({ tenderId }) => {
    const [tenderData, setTenderData] = useState(null);
    const [bids, setBids] = useState([]);
    const [evaluationMode, setEvaluationMode] = useState('technical'); // 'technical' or 'financial'

    return (
        <Card title="📊 Tender Bid Evaluation">
            
            {/* Tender Information */}
            <div className="tender-info">
                <h4>📢 Tender: {tenderData?.tender_title}</h4>
                <p><strong>Source Request:</strong> {tenderData?.source_request_title}</p>
                <p><strong>Required Quantity:</strong> {tenderData?.total_quantity} units</p>
                <p><strong>Submission Deadline:</strong> {tenderData?.submission_deadline}</p>
            </div>

            {/* Evaluation Mode Toggle */}
            <div className="evaluation-mode">
                <Button.Group style={{marginBottom: 16}}>
                    <Button 
                        type={evaluationMode === 'technical' ? 'primary' : 'default'}
                        onClick={() => setEvaluationMode('technical')}
                    >
                        🔧 Technical Evaluation
                    </Button>
                    <Button 
                        type={evaluationMode === 'financial' ? 'primary' : 'default'}
                        onClick={() => setEvaluationMode('financial')}
                    >
                        💰 Financial Evaluation
                    </Button>
                </Button.Group>
            </div>

            {/* Bid Evaluation */}
            <div className="bids-evaluation">
                {bids.map((bid, index) => (
                    <Card key={index} size="small" style={{marginBottom: 16}}>
                        <div className="bid-evaluation">
                            <h5>🏢 {bid.vendor_name}</h5>
                            
                            {/* Technical Evaluation (Always Visible) */}
                            <div className="technical-evaluation">
                                <h6>🔧 Technical Assessment</h6>
                                <div className="technical-metrics">
                                    <p><strong>Technical Compliance:</strong> 
                                        <Tag color={bid.technical_compliance ? 'green' : 'red'}>
                                            {bid.technical_compliance ? 'COMPLIANT' : 'NON-COMPLIANT'}
                                        </Tag>
                                    </p>
                                    <p><strong>Technical Score:</strong> {bid.technical_score}/100</p>
                                    <p><strong>Delivery Timeline:</strong> {bid.delivery_timeline_days} days</p>
                                    <p><strong>Warranty:</strong> {bid.warranty_months} months</p>
                                </div>
                            </div>

                            {/* ✅ FINANCIAL EVALUATION - FIRST TIME MONEY APPEARS */}
                            {evaluationMode === 'financial' && bid.technical_compliance && (
                                <div className="financial-evaluation" style={{backgroundColor: '#fff7e6', padding: 12, marginTop: 12}}>
                                    <h6>💰 Financial Quotation (FIRST APPEARANCE OF MONEY)</h6>
                                    <div className="financial-details">
                                        <div className="price-breakdown">
                                            <div className="price-item">
                                                <span className="label">Unit Price:</span>
                                                <span className="value">Rs. {bid.quoted_unit_price?.toLocaleString()}</span>
                                            </div>
                                            <div className="price-item">
                                                <span className="label">Total Quoted:</span>
                                                <span className="value">Rs. {bid.total_quoted_amount?.toLocaleString()}</span>
                                            </div>
                                            <div className="price-item">
                                                <span className="label">Tax ({bid.tax_percentage}%):</span>
                                                <span className="value">Rs. {bid.tax_amount?.toLocaleString()}</span>
                                            </div>
                                            <div className="price-item total">
                                                <span className="label">Final Amount:</span>
                                                <span className="value">Rs. {bid.total_amount_including_tax?.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="additional-costs">
                                            <p><strong>Delivery Charges:</strong> Rs. {bid.delivery_charges?.toLocaleString()}</p>
                                            <p><strong>Installation:</strong> Rs. {bid.installation_charges?.toLocaleString()}</p>
                                            <p><strong>Payment Terms:</strong> {bid.payment_terms}</p>
                                            <p><strong>Advance Required:</strong> {bid.advance_payment_percentage}%</p>
                                        </div>

                                        <div className="financial-ranking">
                                            <p><strong>Financial Score:</strong> {bid.financial_score}/100</p>
                                            <p><strong>Overall Ranking:</strong> #{bid.overall_ranking}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Award Decision (Only for Compliant Bids) */}
                            {bid.technical_compliance && (
                                <div className="award-decision" style={{marginTop: 12}}>
                                    <Button 
                                        type="primary" 
                                        icon={<TrophyOutlined />}
                                        onClick={() => awardContract(bid.bid_id)}
                                    >
                                        🏆 Award Contract
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            <Alert 
                message="Financial Data Entry Point" 
                description="This is the first and only place where financial/pricing information enters the procurement system. All previous stages were quantity and specification focused only."
                type="warning" 
                showIcon 
                style={{marginTop: 16}}
            />
        </Card>
    );
};

// ====================================================================
// 🎨 4. HELPER FUNCTIONS AND STYLES
// ====================================================================

const removeItem = (itemId) => {
    setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
    }));
};

const submitRequest = async () => {
    try {
        // Submit request with NO financial data
        const requestPayload = {
            title: formData.title,
            description: formData.description,
            justification: formData.justification,
            priority: formData.priority,
            requiredDate: formData.requiredDate,
            items: formData.items.map(item => ({
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                specifications: item.specifications,
                qualityStandards: item.qualityStandards,
                brandPreference: item.brandPreference,
                alternativesAcceptable: item.alternativesAcceptable,
                quantityJustification: item.quantityJustification,
                usagePurpose: item.usagePurpose,
                urgencyReason: item.urgencyReason
                // NO FINANCIAL FIELDS
            }))
        };

        const response = await fetch('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
        });

        if (response.ok) {
            alert('Request submitted successfully! (No financial data required)');
        }
    } catch (error) {
        console.error('Error submitting request:', error);
    }
};

const handleApproval = async (decision) => {
    try {
        // Submit approval with NO financial considerations
        const approvalPayload = {
            requestId: requestId,
            decision: decision,
            needAnalysisComments: approvalComments,
            quantityJustificationReview: 'Based on stock analysis and usage patterns',
            technicalSpecificationReview: 'Specifications are appropriate',
            stockImpactAnalysis: 'Stock levels justify procurement'
            // NO BUDGET APPROVAL
            // NO COST ANALYSIS
            // NO FINANCIAL COMMENTS
        };

        const response = await fetch('/api/approvals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(approvalPayload)
        });

        if (response.ok) {
            alert(`Request ${decision.toLowerCase()} successfully! (Based on need analysis only)`);
        }
    } catch (error) {
        console.error('Error submitting approval:', error);
    }
};

const fetchStockAnalysis = async (itemName) => {
    // Fetch stock data without financial information
    const response = await fetch(`/api/stock/analysis/${itemName}`);
    const data = await response.json();
    return {
        currentStock: data.current_stock,
        minimumLevel: data.minimum_level,
        monthlyUsage: data.monthly_average,
        status: data.stock_status
        // NO STOCK VALUE
        // NO UNIT COST
        // NO FINANCIAL DATA
    };
};

const getPriorityColor = (priority) => {
    switch(priority) {
        case 'LOW': return 'green';
        case 'NORMAL': return 'blue';
        case 'HIGH': return 'orange';
        case 'URGENT': return 'red';
        default: return 'default';
    }
};

// ====================================================================
// 💅 5. CSS STYLES (NO FINANCIAL STYLING)
// ====================================================================

const styles = `
.pure-quantity-request-form {
    max-width: 1000px;
    margin: 0 auto;
}

.main-form-card {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.form-section {
    margin-bottom: 24px;
    padding: 20px;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    background: #fafafa;
}

.form-section h4 {
    margin-bottom: 16px;
    color: #1890ff;
    border-bottom: 2px solid #e6f7ff;
    padding-bottom: 8px;
}

.item-input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
}

.quantity-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    margin: 12px 0;
}

.metric {
    display: flex;
    flex-direction: column;
    padding: 8px 12px;
    background: white;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.metric .label {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
}

.metric .value {
    font-weight: 500;
    font-size: 14px;
}

.metric .value.critical {
    color: #ff4d4f;
}

.metric .value.success {
    color: #52c41a;
}

.financial-evaluation {
    border-left: 4px solid #faad14;
    background: linear-gradient(135deg, #fff7e6, #fffbe6);
}

.price-breakdown {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 8px;
    margin-bottom: 12px;
}

.price-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    background: white;
    border-radius: 4px;
}

.price-item.total {
    background: #f6ffed;
    border: 1px solid #b7eb8f;
    font-weight: bold;
}

/* Hide any accidentally included financial elements */
.cost-field,
.budget-field,
.price-field,
.financial-input {
    display: none !important;
}

/* Highlight that this is the financial entry point */
.financial-evaluation h6 {
    color: #fa8c16;
    background: #fff2e8;
    padding: 4px 8px;
    border-radius: 4px;
    display: inline-block;
}
`;

export {
    PureQuantityRequestForm,
    NeedBasedApprovalDashboard,
    TenderBidEvaluation,
    styles
};

// ====================================================================
// 📚 USAGE EXAMPLE
// ====================================================================

// In your main App component:
// 
// import {
//     PureQuantityRequestForm,
//     NeedBasedApprovalDashboard,
//     TenderBidEvaluation,
//     styles
// } from './TenderOnlyFinancialComponents';
// 
// function App() {
//     return (
//         <div>
//             <style>{styles}</style>
//             
//             {/* For DEC users - NO financial input */}
//             <PureQuantityRequestForm />
//             
//             {/* For approvers - NO financial analysis */}
//             <NeedBasedApprovalDashboard 
//                 requestId="req-001" 
//                 userRole="DG_ADMIN" 
//             />
//             
//             {/* For procurement - FINANCIAL DATA FIRST APPEARS */}
//             <TenderBidEvaluation tenderId="tender-001" />
//         </div>
//     );
// }
