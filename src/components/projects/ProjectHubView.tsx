import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProjectContextBanner } from '../common/ProjectContextBanner';
import { WorkersView } from '../workers/WorkersView';
import { SuppliersView } from '../suppliers/SuppliersView';
import { ExpensesView } from '../expenses/ExpensesView';
import { ReportsView } from '../reports/ReportsView';
import { ClientPaymentsView } from '../client/ClientPaymentsView';
import { CpsTrackingView } from './CpsTrackingView';
import { 
  Building2, 
  CalendarCheck2, 
  Coins, 
  Users, 
  Truck, 
  Receipt, 
  DollarSign, 
  FileText, 
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

export type ProjectSubTab = 
  | 'overview'
  | 'cps'
  | 'attendance'
  | 'payroll'
  | 'workers'
  | 'suppliers'
  | 'expenses'
  | 'invoices'
  | 'reports';

interface ProjectHubViewProps {
  initialSubTab?: ProjectSubTab;
  onSubTabChange?: (tab: ProjectSubTab) => void;
}

export const ProjectHubView: React.FC<ProjectHubViewProps> = ({ 
  initialSubTab = 'overview',
  onSubTabChange 
}) => {
  const { 
    state, 
    selectedProjectId, 
    setSelectedProjectId, 
    accessibleProjects, 
    getProjectFinancials,
    t 
  } = useApp();

  const [activeTab, setActiveTab] = useState<ProjectSubTab>(initialSubTab);

  const handleTabChange = (tab: ProjectSubTab) => {
    setActiveTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  const currentProject = accessibleProjects.find(p => p.id === selectedProjectId);

  if (!currentProject) {
    return (
      <div className="text-center py-16 p-6 space-y-4">
        <Building2 className="w-12 h-12 text-zinc-600 mx-auto" />
        <h2 className="text-lg font-bold text-white">لم يتم تحديد أي ورش</h2>
        <p className="text-xs text-zinc-400">يرجى اختيار ورش من القائمة للوصول إلى عملياته المخصصة</p>
        <button
          onClick={() => setSelectedProjectId('all')}
          className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
        >
          عرض قائمة الأوراش
        </button>
      </div>
    );
  }

  const fin = getProjectFinancials(currentProject.id);
  const projectWorkers = state.workers.filter(w => w.projectIds.includes(currentProject.id));
  const projectPurchases = state.purchases.filter(p => p.projectId === currentProject.id);
  const projectExpenses = state.expenses.filter(e => e.projectId === currentProject.id);
  const projectClientPayments = state.clientPayments.filter(cp => cp.projectId === currentProject.id);
  const projectCpsArticles = state.cpsArticles.filter(a => a.projectId === currentProject.id && !a.isDeleted);

  // Remaining debts on this project to suppliers
  const projectMaterialDebt = projectPurchases.reduce((sum, p) => sum + p.remainingDebt, 0);

  const tabsConfig = [
    { id: 'overview' as ProjectSubTab, label: 'لوحة قيادة الورش', icon: Building2 },
    { id: 'cps' as ProjectSubTab, label: 'تقدم CPS والبردورو', icon: Layers, highlight: true, count: projectCpsArticles.length },
    { id: 'attendance' as ProjectSubTab, label: 'البوانطاج اليومي', icon: CalendarCheck2 },
    { id: 'payroll' as ProjectSubTab, label: 'خلاص السيمانة', icon: Coins, count: projectWorkers.length },
    { id: 'workers' as ProjectSubTab, label: 'العمال والتسبيقات', icon: Users, count: projectWorkers.length },
    { id: 'suppliers' as ProjectSubTab, label: 'السلعة والموردين', icon: Truck, count: projectPurchases.length },
    { id: 'expenses' as ProjectSubTab, label: 'المصاريف والنفقات', icon: Receipt, count: projectExpenses.length },
    { id: 'invoices' as ProjectSubTab, label: 'دفعات الزبون (Décomptes)', icon: DollarSign, count: projectClientPayments.length },
    { id: 'reports' as ProjectSubTab, label: 'التقارير وكشف الحساب', icon: FileText }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Main Project Context Banner */}
      <ProjectContextBanner />

      {/* Dedicated Project Sub Navigation Tabs Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar shadow-md">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-zinc-950 shadow-md ring-1 ring-amber-400'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
              <span>{tab.label}</span>

              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isActive ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================
          SUB-TAB 1: PROJECT OVERVIEW (نظرة عامة والمالية)
         ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>الميزانية الإجمالية</span>
                <Building2 className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl font-black text-white font-mono">{(currentProject?.budget ?? 0).toLocaleString()} {t.currency}</p>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
                <span>نسبة الإنجاز:</span>
                <span className="text-amber-400 font-bold">{currentProject?.progressPct ?? 0}%</span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>إجمالي المصروف الفعلي</span>
                <TrendingUp className="w-4 h-4 text-red-400" />
              </div>
              <p className={`text-xl font-black font-mono ${fin?.isOverBudget ? 'text-red-400' : 'text-amber-400'}`}>
                {(fin?.totalSpent ?? 0).toLocaleString()} {t.currency}
              </p>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
                <span>استهلاك الميزانية:</span>
                <span className={fin?.isOverBudget ? 'text-red-400 font-bold' : 'text-zinc-300'}>
                  {(fin?.budgetPercentage ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>المقبوض من الزبون</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-black text-emerald-400 font-mono">{(fin?.clientReceived ?? 0).toLocaleString()} {t.currency}</p>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
                <span>المتبقي في ذمة الزبون:</span>
                <span className="text-emerald-400 font-bold">
                  {Math.max(0, (currentProject?.budget ?? 0) - (fin?.clientReceived ?? 0)).toLocaleString()} د.م
                </span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>ديون السلعة على الورش</span>
                <Truck className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-xl font-black text-red-400 font-mono">{(projectMaterialDebt ?? 0).toLocaleString()} {t.currency}</p>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
                <span>عدد بونات السلعة:</span>
                <span className="text-zinc-300 font-bold">{projectPurchases.length} بون</span>
              </div>
            </div>
          </div>

          {/* Quick Action Matrix for this Project */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => handleTabChange('attendance')}
              className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-right transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-xs mb-1">تسجيل بوانطاج اليوم</h4>
              <p className="text-[11px] text-zinc-400">حضور {projectWorkers.length} عمال</p>
            </button>

            <button
              onClick={() => handleTabChange('payroll')}
              className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-right transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                <Coins className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-xs mb-1">خلاص السيمانة (السبت)</h4>
              <p className="text-[11px] text-zinc-400">تصفية أجور وتنزيل التسبيقات</p>
            </button>

            <button
              onClick={() => handleTabChange('suppliers')}
              className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-right transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-105 transition-transform">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-xs mb-1">تسجيل بون سلعة جديد</h4>
              <p className="text-[11px] text-zinc-400">إسمنت، حديد، رمل وقرمود</p>
            </button>

            <button
              onClick={() => handleTabChange('invoices')}
              className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-right transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-xs mb-1">تسجيل دفعة زبون</h4>
              <p className="text-[11px] text-zinc-400">وصل Décompte وطباعة</p>
            </button>
          </div>

          {/* Dedicated CPS Progress Showcase Card in Overview */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/30 border border-amber-500/30 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>تقدم الأشغال حسب دفتر التحملات (CPS) والبردورو</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                      {projectCpsArticles.length} بنود
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    حساب نسبة تقدم الورش التلقائية استناداً إلى قياسات كل بند ومبلغه في البردورو
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleTabChange('cps')}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all cursor-pointer shadow-md shrink-0"
              >
                <span>فتح جدول بنود CPS والبردورو</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>

            {/* Quick CPS mini progress bar */}
            <div className="space-y-1.5 bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-semibold">النسبة الإجمالية المحققة:</span>
                <span className="text-amber-400 font-mono font-black text-sm">
                  {currentProject.progressPct ?? 0}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, currentProject.progressPct ?? 0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-1">
                <span>
                  المنجز: {projectCpsArticles.reduce((sum, a) => sum + (a.executedAmount || 0), 0).toLocaleString()} د.م
                </span>
                <span>
                  المقدر: {projectCpsArticles.reduce((sum, a) => sum + (a.totalPlannedPrice || 0), 0).toLocaleString()} د.م
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Section: Expenses & Materials */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Distribution */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>توزيع تكاليف ونفقات الورش</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span>مشتريات السلعة ومواد البناء (Fournitures):</span>
                    <span className="font-mono font-bold">{(fin.materialsSpent || 0).toLocaleString()} د.م</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${fin.totalSpent > 0 ? ((fin.materialsSpent || 0) / fin.totalSpent) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span>أجور ومستحقات العمال وخلاص السبت (Main d'œuvre):</span>
                    <span className="font-mono font-bold">{(fin.laborSpent || 0).toLocaleString()} د.م</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${fin.totalSpent > 0 ? ((fin.laborSpent || 0) / fin.totalSpent) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span>المصاريف العامة (كراء، مازوت، تغذية، رخص):</span>
                    <span className="font-mono font-bold">{(fin.expensesSpent || 0).toLocaleString()} د.م</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${fin.totalSpent > 0 ? ((fin.expensesSpent || 0) / fin.totalSpent) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Workers Summary on this project */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>طاقم عمال هذا الورش ({projectWorkers.length})</span>
                </h3>
                <button
                  onClick={() => handleTabChange('workers')}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  إدارة العمال والتسبيقات ←
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {projectWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block">{worker.name}</span>
                      <span className="text-[11px] text-zinc-400">{worker.specialty}</span>
                    </div>
                    <span className="font-mono text-amber-400 font-semibold">
                      {worker.wageAmount} د.م / {worker.wageType === 'daily' ? 'اليوم' : 'الشهر'}
                    </span>
                  </div>
                ))}

                {projectWorkers.length === 0 && (
                  <div className="text-center py-6 text-zinc-500 text-xs">
                    لم يتم إلحاق أي عامل بهذا الورش بعد.
                    <button
                      onClick={() => handleTabChange('workers')}
                      className="block mx-auto text-amber-400 underline font-bold mt-2"
                    >
                      + إلحاق عمال بالورش الآن
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB CPS: CPS & BORDEREAU DES PRIX (تقدم الأشغال)
         ======================================================== */}
      {activeTab === 'cps' && (
        <CpsTrackingView projectId={currentProject.id} />
      )}

      {/* ========================================================
          SUB-TAB 2: DAILY ATTENDANCE (تسجيل الحضور والبوانطاج)
         ======================================================== */}
      {activeTab === 'attendance' && (
        <WorkersView initialTab="attendance" />
      )}

      {/* ========================================================
          SUB-TAB 3: WEEKLY PAYROLL (خلاص السيمانة وحساب السبت)
         ======================================================== */}
      {activeTab === 'payroll' && (
        <WorkersView initialTab="payroll" />
      )}

      {/* ========================================================
          SUB-TAB 4: WORKERS & ADVANCES (عمال الورش والتسبيقات)
         ======================================================== */}
      {activeTab === 'workers' && (
        <WorkersView initialTab="workers" />
      )}

      {/* ========================================================
          SUB-TAB 5: SUPPLIERS & PURCHASES (الموردون وبونات السلعة)
         ======================================================== */}
      {activeTab === 'suppliers' && (
        <SuppliersView />
      )}

      {/* ========================================================
          SUB-TAB 6: EXPENSES (المصاريف والنفقات العامة للورش)
         ======================================================== */}
      {activeTab === 'expenses' && (
        <ExpensesView />
      )}

      {/* ========================================================
          SUB-TAB 7: CLIENT INVOICES & PAYMENTS (دفعات الزبون والفواتير)
         ======================================================== */}
      {activeTab === 'invoices' && (
        <ClientPaymentsView hideHeaderBanner={true} />
      )}

      {/* ========================================================
          SUB-TAB 8: REPORTS & BALANCE SHEET (التقارير وكشف الحساب)
         ======================================================== */}
      {activeTab === 'reports' && (
        <ReportsView />
      )}

    </div>
  );
};
