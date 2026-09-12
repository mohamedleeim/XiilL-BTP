import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { OfflineBanner } from './components/common/OfflineBanner';
import { AuthPortalView } from './components/auth/AuthPortalView';
import { MasterControlPanel } from './components/admin/MasterControlPanel';

import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import { ProjectHubView } from './components/projects/ProjectHubView';
import { WorkersView } from './components/workers/WorkersView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ClientPaymentsView } from './components/client/ClientPaymentsView';
import { ReportsView } from './components/reports/ReportsView';
import { AiAssistantView } from './components/ai/AiAssistantView';
import { TeamView } from './components/team/TeamView';
import { TrashView } from './components/trash/TrashView';
import { AuditLogView } from './components/audit/AuditLogView';
import { WorkspaceHubView } from './components/workspace/WorkspaceHubView';
import { SuperAdminHubView } from './components/admin/SuperAdminHubView';
import { TenantSupervisorManagerView } from './components/team/TenantSupervisorManagerView';
import { ManagerSheetOnboardingModal } from './components/workspace/ManagerSheetOnboardingModal';
import { SubscriptionPlansModal } from './components/subscription/SubscriptionPlansModal';
import { SheetAuditAlertBanner } from './components/common/SheetAuditAlertBanner';
import { MasterSheetAuditModal } from './components/modals/MasterSheetAuditModal';
import { Crown, Eye } from 'lucide-react';

const MainContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [inspectingTenantId, setInspectingTenantId] = useState<string | null>(null);
  const {
    isAuthenticated,
    activeSession,
    selectedProjectId,
    isPlatformSuperAdmin,
    adminAccounts,
    switchActiveAdmin,
    isSubscriptionPlansOpen,
    closeSubscriptionPlans
  } = useApp();

  if (!isAuthenticated) {
    return <AuthPortalView />;
  }

  // 1. Super Admin (Platform Owner) Dedicated Route:
  // When the authenticated user is the Super Admin and not inspecting a specific tenant,
  // show the Master SaaS Control Panel directly — NOT the construction chantiers views!
  if (activeSession?.type === 'super_admin' && !inspectingTenantId) {
    return (
      <MasterControlPanel
        onInspectTenant={(tenantId) => {
          setInspectingTenantId(tenantId);
          switchActiveAdmin(tenantId);
        }}
      />
    );
  }

  const inspectedTenant = inspectingTenantId ? adminAccounts.find(a => a.id === inspectingTenantId) : null;
  const isProjectSelected = selectedProjectId !== 'all';

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'projects':
        // If a specific project is selected, render the dedicated Project Hub
        return isProjectSelected ? (
          <ProjectHubView 
            initialSubTab="overview" 
            onSubTabChange={(subTab) => {
              if (subTab === 'attendance') setCurrentTab('attendance');
              else if (subTab === 'payroll') setCurrentTab('weekly_payroll');
              else if (subTab === 'workers') setCurrentTab('workers');
              else if (subTab === 'suppliers') setCurrentTab('suppliers');
              else if (subTab === 'expenses') setCurrentTab('expenses');
              else if (subTab === 'invoices') setCurrentTab('invoices');
              else if (subTab === 'reports') setCurrentTab('reports');
            }} 
          />
        ) : (
          <ProjectsView />
        );
      case 'project_hub':
        return <ProjectHubView />;
      case 'attendance':
        return <WorkersView initialTab="attendance" />;
      case 'weekly_payroll':
        return <WorkersView initialTab="payroll" />;
      case 'workers':
        return <WorkersView initialTab="workers" />;
      case 'suppliers':
        return <SuppliersView />;
      case 'expenses':
        return <ExpensesView />;
      case 'invoices':
        return <ClientPaymentsView />;
      case 'reports':
        return <ReportsView />;
      case 'workspace':
        return <WorkspaceHubView />;
      case 'super_admin':
        return isPlatformSuperAdmin ? <SuperAdminHubView /> : <TenantSupervisorManagerView />;
      case 'ai_assistant':
        return <AiAssistantView />;
      case 'team':
        return <TenantSupervisorManagerView />;
      case 'trash':
        return <TrashView />;
      case 'activity_log':
        return <AuditLogView />;
      default:
        return <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Inspection Support Banner for Super Admin */}
      {inspectingTenantId && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 px-4 py-2 flex items-center justify-between shadow-lg sticky top-0 z-50">
          <div className="flex items-center gap-2 text-xs font-black">
            <Eye className="w-4 h-4" />
            <span>وضع الدعم الفني: أنت تعاين حالياً فضاء المقاول ({inspectedTenant?.name || inspectingTenantId} — {inspectingTenantId})</span>
          </div>
          <button
            onClick={() => {
              setInspectingTenantId(null);
              switchActiveAdmin(null);
            }}
            className="py-1 px-3 bg-zinc-950 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>العودة إلى لوحة تحكم المالك العام</span>
          </button>
        </div>
      )}

      {/* Top Header */}
      <Header />

      {/* Sheet Verification & Bidirectional Audit Alert Banner */}
      <SheetAuditAlertBanner />

      {/* Master Sheet Audit & Bidirectional Inspection Modal */}
      <MasterSheetAuditModal />

      {/* Offline sync status notice */}
      <OfflineBanner />

      {/* General Manager Smart Sheet Onboarding & Schema Validation Modal */}
      <ManagerSheetOnboardingModal />

      {/* Subscription Plans Modal (3 Days Trial, Monthly, Annual 25% Off) */}
      <SubscriptionPlansModal isOpen={isSubscriptionPlansOpen} onClose={closeSubscriptionPlans} />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />

        {/* Scrollable Content Container */}
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto max-h-[calc(100vh-53px)] pb-24 lg:pb-12">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
