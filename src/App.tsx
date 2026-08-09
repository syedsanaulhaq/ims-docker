import { Toaster } from "@/components/ui/sonner";import InitialSetupPageFresh from './pages/InitialSetupPageFresh';import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { SessionProvider } from "@/contexts/SessionContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import UserDashboard from "@/pages/UserDashboard";
import PersonalDashboard from "@/pages/PersonalDashboard";
import SmartDashboard from "@/pages/SmartDashboard";
// import ApprovalManager from "@/pages/ApprovalManager"; // REMOVED - File is corrupted and not used in any routes
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Categories from "./pages/Categories";
import SubCategories from "./pages/SubCategories";
import Offices from "./pages/Offices";
import Reports from "./pages/Reports";
import StockTransactions from "./pages/StockTransactions";
import StockIssuances from "./pages/StockIssuances";
import ContractTender from "./pages/ContractTender";
import CreateTender from "./pages/CreateTender";
import EditTender from "./pages/EditTender";
import TenderDetails from "./pages/TenderDetails";
import TenderFormFresh2 from './components/tenders/TenderFormFresh2';
import EnhancedTenderDashboard from './components/tenders/EnhancedTenderDashboard';
import TenderDashboard from './components/tender/Dashboard';

import ItemMaster from "./pages/ItemMaster";
import VendorInfo from "./pages/VendorInfo";
import VendorManagementEnhanced from "./pages/VendorManagementEnhanced";
import NotFound from "./pages/NotFound";
import TenderReport from "./pages/TenderReport";
import TenderReportEnhanced from "./pages/TenderReportEnhanced";
import InventoryReportPage from "./pages/InventoryReportPage";
import StockAcquisitionReport from "./pages/StockAcquisitionReport";
import DeliveryReport from "./pages/DeliveryReport";
import InventoryDashboard from "./pages/InventoryDashboard";
import InventorySettings from "./pages/InventorySettings";
import StockIssuance from "./pages/StockIssuance";
import StockIssuancePersonal from "./pages/StockIssuancePersonal";
import ReturnedRequestEditPage from "./pages/ReturnedRequestEditPage";
import StockIssuanceWing from "./pages/StockIssuanceWing";
import StockIssuanceBranch from "./pages/StockIssuanceBranch";
import StockReturn from "./pages/StockReturn";
import HistoricalIssuance from "./pages/HistoricalIssuance";
import OpeningBalanceEntry from "./pages/OpeningBalanceEntry";
import YearwiseInventoryReport from "./pages/YearwiseInventoryReport";
import ApprovalManagement from "./pages/ApprovalManagement";
import StockIssuanceProcessing from "./pages/StockIssuanceProcessing";
import { StockIssuanceDashboard } from "./pages/StockIssuanceDashboard";
import MyIssuedItems from "./pages/MyIssuedItems";
import PersonalInventory from "./pages/PersonalInventory";
import WingInventory from "./pages/WingInventory";
import WingDashboard from "./pages/WingDashboard";
import WingMembers from "./pages/WingMembers";
import BranchInventory from "./pages/BranchInventory";
import BranchDashboard from "./pages/BranchDashboard";
import BranchMembers from "./pages/BranchMembers";
import MyBranchDemandPage from "./pages/MyBranchDemandPage";
import SupervisorApprovals from "./pages/SupervisorApprovals";
import AdminApprovals from "./pages/AdminApprovals";
import RoleManagement from "./pages/RoleManagement";
import UserRoleAssignment from "./pages/UserRoleAssignment";
import ExpandableReceivingForm from "./pages/ExpandableReceivingForm";
import IntegratedStockAcquisition from "./pages/IntegratedStockAcquisition";
import StockTransactionList from "./pages/StockTransactionList";
import TransactionManager from "./components/stockTransactions/TransactionManager";
import StockAcquisitionDashboard from "./components/stockTransactions/StockAcquisitionDashboard";
import EnhancedStockAcquisitionDashboard from "./components/stockTransactions/EnhancedStockAcquisitionDashboard";
import EnhancedStockAcquisitionWithDelivery from "./components/stockTransactions/EnhancedStockAcquisitionWithDelivery";
import UnifiedTenderManagement from "./pages/UnifiedTenderManagement";
import TenderAcquisitionReport from "./pages/TenderAcquisitionReport";
import AllInventoryItemsPage from "./pages/AllInventoryItemsPage";
import StockQuantitiesPage from "./pages/StockQuantitiesPage";
import CurrentInventoryStock from "./pages/CurrentInventoryStock";
import ApprovalDashboard from "./components/ApprovalDashboard";
import ApprovalDashboardRequestBased from "./components/ApprovalDashboardRequestBased";
import WorkflowAdmin from "./components/WorkflowAdmin";
import ApprovalForwarding from "./components/ApprovalForwarding";
import MyRequestsPage from "./pages/MyRequestsPage";
import WingRequestsPage from "./pages/WingRequestsPage";
import RequestDetailsPage from "./pages/RequestDetailsPage";
import RequisitionReportPage from "./pages/RequisitionReportPage";
import StockOperationRequestDetails from "./pages/StockOperationRequestDetails";
import RequestHistoryPage from "./pages/RequestHistoryPage";
import WingRequestHistoryPage from "./pages/WingRequestHistoryPage";
import BranchRequestHistoryPage from "./pages/BranchRequestHistoryPage";
import BranchStorekeeperReviewPage from "./pages/BranchStorekeeperReviewPage";
import RequiredItemsPage from "./pages/RequiredItemsPage";
import RequestsHistoryLayout from "./pages/RequestsHistory/RequestsHistoryLayout";
import FutureRequestsPage from "./pages/RequestsHistory/FutureRequestsPage";
import RejectedRequestsPage from "./pages/RequestsHistory/RejectedRequestsPage";
import PendingRequestsPage from "./pages/RequestsHistory/PendingRequestsPage";
import InventoryAlertsPage from "./pages/InventoryAlertsPage";
import InventoryDetails from "./pages/InventoryDetails";
import ItemDetailsPage from "./pages/ItemDetailsPage";
import StockOperations from "./pages/StockOperations";
import { PendingVerificationsPage } from "./pages/PendingVerificationsPage";
import { StoreKeeperVerificationsPage } from "./pages/StoreKeeperVerificationsPage";
import VerificationHistoryPage from "./pages/VerificationHistoryPage";
import ProcurementDetails from "./pages/ProcurementDetails";
import NewProcurementRequest from "./pages/NewProcurementRequest";
import MyProcurementRequests from "./pages/MyProcurementRequests";
import AdminProcurementReview from "./pages/AdminProcurementReview";
import NotificationsPage from "./pages/NotificationsPage";
import InitialSetupPage from "./pages/InitialSetupPage";
import DigitalSystemLanding from "./pages/DigitalSystemLanding";
import PersonalIMS from "./pages/PersonalIMS";
import SSOLogin from "./pages/SSOLogin";
import ItemGroupsManager from "./pages/ItemGroupsManager";
import CategoryItemsManager from "./pages/CategoryItemsManager";
import TenderVendorManagement from "./pages/TenderVendorManagement";
import VendorProposalsGrid from "./pages/VendorProposalsGrid";
import CreatePurchaseOrder from "./pages/CreatePurchaseOrder";
import EditPurchaseOrder from "./pages/EditPurchaseOrder";
import PurchaseOrderDashboard from "./pages/PurchaseOrderDashboard";
import PurchaseOrderDetails from "./pages/PurchaseOrderDetails";
import ReceivingReportPage from "./pages/ReceivingReportPage";
import ReceiveDelivery from "./pages/ReceiveDelivery";
import { useParams } from "react-router-dom";

const queryClient = new QueryClient();

// Wrapper component to handle route parameters for ApprovalForwarding
const ApprovalForwardingWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <ApprovalForwarding approvalId={id || ""} />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <SessionProvider>
            <ThemeProvider attribute="class" defaultTheme="light" storageKey="ims-portal-theme">
              <TooltipProvider>
                <Toaster />
                <ShadcnToaster />
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* SSO Login - Entry point from Digital System */}
                <Route path="/sso-login" element={<SSOLogin />} />
                
                {/* Digital System Landing - Entry point from DS */}
                <Route path="/ds-landing" element={
                  <ProtectedRoute>
                    <DigitalSystemLanding />
                  </ProtectedRoute>
                } />
                
                {/* Personal IMS - For individual users */}
                <Route path="/personal-ims" element={
                  <ProtectedRoute>
                    <PersonalIMS />
                  </ProtectedRoute>
                } />
                
                {/* Wing IMS - For wing-level inventory (to be implemented) */}
                <Route path="/wing-ims" element={
                  <ProtectedRoute>
                    <div className="p-6">
                      <h1 className="text-3xl font-bold">Wing IMS</h1>
                      <p className="text-gray-600 mt-2">Coming Soon - Wing-level inventory management</p>
                    </div>
                  </ProtectedRoute>
                } />
                
                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout>
                      <SmartDashboard />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/user-dashboard" element={
                  <ProtectedRoute>
                    <Layout>
                      <PersonalDashboard />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/personal-dashboard" element={
                  <ProtectedRoute>
                    <Layout>
                      <PersonalDashboard />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout><Outlet /></Layout>
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="initial-setup" element={<InitialSetupPageFresh />} />
                  <Route path="inventory-details" element={<InventoryDetails />} />
                  <Route path="item-details/:itemId" element={<ItemDetailsPage />} />
                  <Route path="stock-operations" element={<StockOperations />} />
                  <Route path="procurement-details" element={<ProcurementDetails />} />
                  <Route path="inventory-dashboard" element={<InventoryDashboard />} />
                  <Route path="inventory-all-items" element={<AllInventoryItemsPage />} />
                  <Route path="inventory-stock-quantities" element={<StockQuantitiesPage />} />
                  <Route path="inventory-alerts" element={<InventoryAlertsPage />} />
                  <Route path="inventory-settings" element={<InventorySettings />} />
                  <Route path="stock-issuance" element={<StockIssuance />} />
                  <Route path="stock-issuance-personal" element={<StockIssuancePersonal />} />
                  <Route path="stock-issuance-wing" element={<StockIssuanceWing />} />
                  <Route path="stock-issuance-branch" element={<StockIssuanceBranch />} />
                  <Route path="stock-issuance-dashboard" element={<StockIssuanceDashboard />} />
                  <Route path="stock-return" element={<StockReturn />} />
                  <Route path="historical-issuance" element={<HistoricalIssuance />} />
                  <Route path="opening-balance-entry" element={<OpeningBalanceEntry />} />
                  <Route path="yearwise-inventory-report" element={<YearwiseInventoryReport />} />
                  <Route path="my-issued-items" element={<MyIssuedItems />} />
                  <Route path="personal-inventory" element={<PersonalInventory />} />
                  <Route path="wing-inventory" element={<WingInventory />} />
                  <Route path="wing-dashboard" element={<WingDashboard />} />
                  <Route path="wing-members" element={<WingMembers />} />
                  <Route path="branch-inventory" element={<BranchInventory />} />
                  <Route path="branch-dashboard" element={<BranchDashboard />} />
                  <Route path="branch-members" element={<BranchMembers />} />
                  <Route path="pending-verifications" element={<PendingVerificationsPage />} />
                  <Route path="store-keeper-verifications" element={<StoreKeeperVerificationsPage />} />
                  <Route path="verification-history" element={<VerificationHistoryPage />} />
                  <Route path="approval-management" element={<ApprovalManagement />} />
                  <Route path="approval-dashboard" element={<ApprovalDashboard />} />
                  <Route path="approval-dashboard-request-based" element={<ApprovalDashboardRequestBased />} />
                  <Route path="approval-dashboard-request-based-admin" element={<ApprovalDashboardRequestBased viewMode="admin" />} />
                  <Route path="supervisor-approval-dashboard" element={<ApprovalDashboardRequestBased />} />
                  <Route path="wing-approval-dashboard" element={<ApprovalDashboardRequestBased />} />
                  <Route path="my-requests" element={<MyRequestsPage />} />
                  <Route path="wing-requests" element={<WingRequestsPage />} />
                  <Route path="request-details/:requestId" element={<RequestDetailsPage />} />
                  <Route path="requisition-report" element={<RequisitionReportPage />} />
                  <Route path="requisition-report/:requestId" element={<RequisitionReportPage />} />
                  <Route path="stock-operation-request-details/:requestId" element={<StockOperationRequestDetails />} />
                  <Route path="approval-forwarding/:id" element={<ApprovalForwardingWrapper />} />
                  <Route path="request-history" element={<RequestHistoryPage />} />
                  <Route path="requests-history" element={<RequestsHistoryLayout />}>
                    <Route path="future" element={<FutureRequestsPage />} />
                    <Route path="rejected" element={<RejectedRequestsPage />} />
                    <Route path="pending" element={<PendingRequestsPage />} />
                  </Route>
                  <Route path="wing-request-history" element={<WingRequestHistoryPage />} />
                  <Route path="branch-request-history" element={<BranchRequestHistoryPage />} />
                  <Route path="my-branch-demand" element={<MyBranchDemandPage />} />
                  <Route path="branch-storekeeper-review" element={<BranchStorekeeperReviewPage />} />
                  <Route path="workflow-admin" element={<WorkflowAdmin />} />
                  <Route path="stock-issuance-processing" element={<StockIssuanceProcessing />} />
                </Route>

                {/* Procurement Workflow - Protected */}
                <Route path="/procurement" element={
                  <ProtectedRoute>
                    <Layout><Outlet /></Layout>
                  </ProtectedRoute>
                }>
                  <Route path="new-request" element={<NewProcurementRequest />} />
                  <Route path="my-requests" element={<MyProcurementRequests />} />
                  <Route path="admin-review" element={<AdminProcurementReview />} />
                </Route>
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout><Outlet /></Layout>
                  </ProtectedRoute>
                }>
                  <Route path="categories" element={<Categories />} />
                  <Route path="sub-categories" element={<SubCategories />} />
                  <Route path="vendors" element={<VendorManagementEnhanced />} />
                  <Route path="supervisor-approval-dashboard" element={<ApprovalDashboardRequestBased />} />
                  <Route path="wing-approval-dashboard" element={<ApprovalDashboardRequestBased />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="stock-transactions" element={<StockTransactions />} />
                  <Route path="stock-acquisition-dashboard" element={<EnhancedStockAcquisitionWithDelivery />} />
                  <Route path="stock-acquisition/:tenderId" element={<UnifiedTenderManagement />} />
                  <Route path="stock-acquisition-report/:tenderId" element={<TenderAcquisitionReport />} />
                  <Route path="stock-transaction-list" element={<StockTransactionList />} />
                  <Route path="transaction-manager" element={<TransactionManager />} />
                  <Route path="transaction-manager/:tenderId" element={<TransactionManager />} />
                  <Route path="issuances" element={<StockIssuances />} />
                  <Route path="tender-management" element={<TenderDashboard />} />
                  <Route path="required-items" element={<RequiredItemsPage />} />
                  <Route path="contract-tender" element={<ContractTender />} />
                  <Route path="create-tender" element={<CreateTender />} />
                  <Route path="tender-details/:id" element={<TenderDetails />} />
                  <Route path="edit-tender/:id" element={<EditTender />} />
                  <Route path="spot-purchases" element={<ContractTender initialType="Petty Purchase" />} />
                  <Route path="tenders" element={<EnhancedTenderDashboard />} />
                  <Route path="tenders/create" element={<CreateTender />} />
                  <Route path="tenders/edit/:id" element={<EditTender />} />
                  <Route path="tenders/new" element={<TenderFormFresh2 />} />
                  <Route path="tenders/:id/edit" element={<EditTender />} />
                  <Route path="tenders/:id/report" element={<TenderReportEnhanced />} />
                  <Route path="tenders/:id/stock-acquisition" element={<IntegratedStockAcquisition />} />
                  <Route path="stock-acquisition/:id/report" element={<StockAcquisitionReport />} />
                  <Route path="tenders/:tenderId/expandable-receiving" element={<ExpandableReceivingForm />} />
                  <Route path="delivery-report/:id" element={<DeliveryReport />} />
                  <Route path="inventory/:id/report" element={<InventoryReportPage />} />
                  <Route path="item-master" element={<ItemMaster />} />
                  <Route path="item-groups" element={<ItemGroupsManager />} />
                  <Route path="category-items" element={<CategoryItemsManager />} />
                  <Route path="tender-vendor-management" element={<TenderVendorManagement />} />
                  <Route path="purchase-orders" element={<PurchaseOrderDashboard />} />
                  <Route path="create-po" element={<CreatePurchaseOrder />} />
                  <Route path="po/:id" element={<PurchaseOrderDetails />} />
                  <Route path="po/:id/edit" element={<EditPurchaseOrder />} />
                  <Route path="po/:id/receiving-report" element={<ReceivingReportPage />} />
                </Route>

                {/* Stock Acquisition (Receive Delivery) - Outside nested routes for clean URL */}
                <Route path="/purchase-orders/:poId/receive-delivery" element={
                  <ProtectedRoute>
                    <Layout>
                      <ReceiveDelivery />
                    </Layout>
                  </ProtectedRoute>
                } />

                {/* Stock Acquisition - Protected */}
                <Route path="/stock-acquisition" element={
                  <ProtectedRoute>
                    <Layout><Outlet /></Layout>
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="contract-tender" element={<ContractTender />} />
                  <Route path="spot-purchases" element={<ContractTender initialType="Petty Purchase" />} />
                  <Route path="dashboard" element={<EnhancedStockAcquisitionDashboard />} />
                </Route>

                {/* Stock Issuance - Protected */}
                <Route path="/stock-issuance" element={
                  <ProtectedRoute>
                    <Layout><Outlet /></Layout>
                  </ProtectedRoute>
                }>
                  <Route index element={<StockIssuance />} />
                  <Route path="dashboard" element={<StockIssuanceDashboard />} />
                  <Route path=":requestId" element={<RequestDetailsPage />} />
                  <Route path="processing" element={<StockIssuanceProcessing />} />
                  <Route path="approval-management" element={<ApprovalManagement />} />
                  <Route path="edit/:id" element={<StockIssuancePersonal />} />
                  <Route path="returned-requests/edit/:id" element={<ReturnedRequestEditPage />} />
                </Route>

                {/* Approval Workflows - Protected */}
                <Route path="/approvals" element={
                  <ProtectedRoute>
                    <Layout><Outlet /></Layout>
                  </ProtectedRoute>
                }>
                  <Route path="supervisor" element={<SupervisorApprovals />} />
                  <Route path="admin" element={<AdminApprovals />} />
                </Route>

                {/* Reports - Protected */}
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <Layout><Outlet /></Layout>
                  </ProtectedRoute>
                }>
                  <Route index element={<Reports />} />
                  <Route path="inventory" element={<InventoryReportPage />} />
                  <Route path="stock-acquisition" element={<StockAcquisitionReport />} />
                </Route>

                {/* Settings - Admin Only (except IMS role pages which have their own checks) */}
                <Route path="/settings" element={
                  <Layout><Outlet /></Layout>
                }>
                  <Route index element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                      <InventorySettings />
                    </ProtectedRoute>
                  } />
                  <Route path="categories" element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                      <Categories />
                    </ProtectedRoute>
                  } />
                  <Route path="vendors" element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                      <VendorManagementEnhanced />
                    </ProtectedRoute>
                  } />
                  <Route path="item-master" element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                      <ItemMaster />
                    </ProtectedRoute>
                  } />
                  {/* IMS Role Management - uses its own Super Admin check */}
                  <Route path="roles" element={<RoleManagement />} />
                  <Route path="users" element={<UserRoleAssignment />} />
                </Route>

                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </ThemeProvider>
        </SessionProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
}

export default App;
