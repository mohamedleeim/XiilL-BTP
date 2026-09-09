import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck2,
  Coins,
  Truck,
  Receipt,
  FileText,
  DollarSign,
  Bot,
  UserCog,
  Trash2,
  History,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Sparkles,
  Layers,
  FileSpreadsheet,
  HardDrive,
  Crown,
  Zap
} from 'lucide-react';
import { calculateDaysRemaining } from '../../services/subscriptionPlans';

export type NavTab = 
  | 'dashboard'
  | 'projects'
  | 'project_hub'
  | 'attendance'
  | 'weekly_payroll'
  | 'workers'
  | 'suppliers'
  | 'expenses'
  | 'invoices'
  | 'reports'
  | 'workspace'
  | 'super_admin'
  | 'ai_assistant'
  | 'team'
  | 'trash'
  | 'activity_log';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { 
    t, 
    currentUser, 
    state, 
    selectedProjectId, 
    setSelectedProjectId, 
    accessibleProjects,
    isPlatformSuperAdmin,
    accessibleSupervisors,
    currentAdmin,
    openSubscriptionPlans
  } = useApp();

  const isOwner = currentUser.role === 'owner';
  const trashCount = state.trashBin.length;
  const isProjectSelected = selectedProjectId !== 'all';
  const currentProject = accessibleProjects.find(p => p.id === selectedProjectId);

  // When a specific project is selected:
  const projectNavItems = [
    { id: 'projects' as NavTab, label: 'لوحة قيادة الورش والمالية', icon: Building2 },
    { id: 'attendance' as NavTab, label: 'تسجيل الحضور (Pointage)', icon: CalendarCheck2, highlight: true },
    { id: 'weekly_payroll' as NavTab, label: 'خلاص السيمانة (حساب السبت)', icon: Coins, highlight: true },
    { id: 'workers' as NavTab, label: 'عمال الورش والتسبيقات', icon: Users },
    { id: 'suppliers' as NavTab, label: 'السلعة وبونات الموردين (BL)', icon: Truck },
    { id: 'expenses' as NavTab, label: 'مصاريف ونفقات الورش', icon: Receipt },
    { id: 'invoices' as NavTab, label: 'دفعات الزبون (Décomptes)', icon: DollarSign },
    { id: 'reports' as NavTab, label: 'كشف حساب وتقارير الورش', icon: FileText },
  ];

  // When in Global mode (all projects):
  const globalNavItems = [
    { id: 'dashboard' as NavTab, label: t.dashboard, icon: LayoutDashboard },
    { id: 'projects' as NavTab, label: t.projects, icon: Building2 },
    { id: 'attendance' as NavTab, label: t.attendance, icon: CalendarCheck2 },
    { id: 'weekly_payroll' as NavTab, label: t.weeklyPayroll, icon: Coins, highlight: true },
    { id: 'workers' as NavTab, label: t.workers, icon: Users },
    { id: 'suppliers' as NavTab, label: t.suppliers, icon: Truck },
    { id: 'expenses' as NavTab, label: t.expenses, icon: Receipt },
    { id: 'invoices' as NavTab, label: 'دفعات وفواتير الزبناء (Décomptes)', icon: DollarSign },
    { id: 'reports' as NavTab, label: t.reports, icon: FileText },
  ];

  const adminItems = [
    { id: 'ai_assistant' as NavTab, label: t.aiAssistant, icon: Bot, isAi: true },
    ...(isPlatformSuperAdmin ? [{ id: 'team' as NavTab, label: t.team, icon: UserCog }] : []),
    { id: 'activity_log' as NavTab, label: t.activityLog, icon: History },
    { id: 'trash' as NavTab, label: t.trashBin, icon: Trash2, count: trashCount },
  ];

  const currentNavItems = isProjectSelected ? projectNavItems : globalNavItems;

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-zinc-900 border-l rtl:border-l ltr:border-r border-zinc-800 shrink-0 min-h-[calc(100vh-53px)] p-3">
      
      {/* Current Active Project Context Card */}
      {isProjectSelected && currentProject ? (
        <div className="mb-3 p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 via-zinc-900 to-zinc-900 border-2 border-amber-500/40 text-xs shadow-lg">
          <div className="flex items-center justify-between text-[10px] text-amber-400 font-extrabold uppercase mb-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>فضاء الورش النشط</span>
            </span>
            <span className="bg-amber-500 text-zinc-950 px-1.5 py-0.2 rounded font-mono font-bold">{currentProject.progressPct}%</span>
          </div>

          <p className="font-black text-white truncate text-xs mb-0.5">{currentProject.name}</p>
          <p className="text-[11px] text-zinc-400 truncate mb-2.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{currentProject.locationCity} • {currentProject.clientName}</span>
          </p>
          
          <button
            onClick={() => {
              setSelectedProjectId('all');
              onSelectTab('projects');
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180" />
            <span>← خروج لكافة الأوراش (Vue Globale)</span>
          </button>
        </div>
      ) : (
        /* Global Mode Status */
        <div className="mb-3 px-3 py-2.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <div className="text-right">
              <span className="text-xs font-bold text-zinc-200 block">المنظومة المركزية</span>
              <span className="text-[10px] text-zinc-400">كافة مشاريع المقاولة</span>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 font-mono font-bold">
            {accessibleProjects.length} ورش
          </span>
        </div>
      )}

      {/* Main Navigation Items */}
      <div className="space-y-1 flex-1 overflow-y-auto">
        <div className="text-[11px] font-bold text-zinc-400 px-3 py-1 uppercase tracking-wider flex items-center justify-between">
          <span>{isProjectSelected ? `عمليات ورش: ${currentProject?.name.slice(0, 14)}...` : 'عمليات المقاولة'}</span>
        </div>

        {currentNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/10 ring-1 ring-amber-400'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.highlight && !isActive && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold shrink-0">
                  {item.id === 'weekly_payroll' ? 'السبت' : 'يومي'}
                </span>
              )}
            </button>
          );
        })}

        {/* Cloud & Multi-Tenant Administration */}
        <div className="text-[11px] font-bold text-zinc-400 px-3 pt-4 pb-1 uppercase tracking-wider flex items-center justify-between">
          <span>{isPlatformSuperAdmin ? 'إدارة المنظومة والسحابة' : 'مشرفي الأوراش والسحابة'}</span>
          <span className="text-[10px] text-amber-400 font-mono">{isPlatformSuperAdmin ? 'Master' : 'Workspace'}</span>
        </div>

        <button
          onClick={() => onSelectTab('workspace')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            currentTab === 'workspace'
              ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md'
              : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className={`w-4 h-4 shrink-0 ${currentTab === 'workspace' ? 'text-zinc-950' : 'text-emerald-400'}`} />
            <span className="truncate">Google Workspace (سحابي)</span>
          </div>
          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">Sheets & Drive</span>
        </button>

        {isPlatformSuperAdmin ? (
          <button
            onClick={() => onSelectTab('super_admin')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'super_admin'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className={`w-4 h-4 shrink-0 ${currentTab === 'super_admin' ? 'text-zinc-950' : 'text-amber-400'}`} />
              <span className="truncate">بوابة الأدمين الكبير (Super Admin)</span>
            </div>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">IDs & Vente</span>
          </button>
        ) : (
          <button
            onClick={() => onSelectTab('team')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'team'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <UserCog className={`w-4 h-4 shrink-0 ${currentTab === 'team' ? 'text-zinc-950' : 'text-amber-400'}`} />
              <span className="truncate">إدارة المشرفين والصلاحيات</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
              {accessibleSupervisors.length}
            </span>
          </button>
        )}

        {/* Administration Section */}
        <div className="text-[11px] font-bold text-zinc-400 px-3 pt-4 pb-1 uppercase tracking-wider">
          الإدارة والذكاء الاصطناعي
        </div>

        {adminItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : item.isAi
                    ? 'text-amber-300 hover:bg-amber-500/10 border border-amber-500/20'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-zinc-950' : item.isAi ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.count !== undefined && item.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Subscription Quick Card */}
      {currentAdmin && (
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-amber-500/30 text-xs shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-zinc-400 font-medium">باقة الاشتراك:</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold text-[10px] border border-amber-500/30">
              {currentAdmin.subscription?.tier === 'annual'
                ? 'سنوية (خصم 25%)'
                : currentAdmin.subscription?.tier === 'monthly'
                ? 'شهرية'
                : 'تجريبية (3 أيام)'}
            </span>
          </div>
          {currentAdmin.subscription?.tier === 'trial_3days' && (
            <div className="text-[11px] text-zinc-400 mb-2">
              متبقي: <span className="font-bold text-amber-400">{calculateDaysRemaining(currentAdmin.subscription)} أيام</span>
            </div>
          )}
          <button
            onClick={openSubscriptionPlans}
            className="w-full py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm shadow-amber-500/20"
          >
            <Zap className="w-3 h-3" />
            <span>ترقية وتفاصيل الباقات</span>
          </button>
        </div>
      )}

      {/* Footer info & Offline state */}
      <div className="pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-500 space-y-1">
        <div className="flex justify-between items-center px-1">
          <span>التخزين المحلي (Offline)</span>
          <span className="text-emerald-400 font-mono font-bold">نشط 100%</span>
        </div>
        <div className="flex justify-between items-center px-1">
          <span>العملة الرسمية</span>
          <span className="text-zinc-300 font-mono">MAD (د.م)</span>
        </div>
      </div>
    </aside>
  );
};
