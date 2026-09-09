import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavTab } from './Sidebar';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck2,
  Coins,
  Users,
  Truck,
  Receipt,
  DollarSign,
  FileText,
  Bot
} from 'lucide-react';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const { t, selectedProjectId } = useApp();
  const isProjectSelected = selectedProjectId !== 'all';

  // Dedicated project mobile tabs when a project is selected
  const projectMobileTabs = [
    { id: 'projects' as NavTab, label: 'الورش', icon: Building2 },
    { id: 'attendance' as NavTab, label: 'البوانطاج', icon: CalendarCheck2 },
    { id: 'weekly_payroll' as NavTab, label: 'السيمانة', icon: Coins },
    { id: 'workers' as NavTab, label: 'العمال', icon: Users },
    { id: 'suppliers' as NavTab, label: 'السلعة', icon: Truck },
    { id: 'expenses' as NavTab, label: 'المصاريف', icon: Receipt },
    { id: 'invoices' as NavTab, label: 'الفواتير', icon: DollarSign },
    { id: 'reports' as NavTab, label: 'التقارير', icon: FileText },
  ];

  // Global mobile tabs
  const globalMobileTabs = [
    { id: 'dashboard' as NavTab, label: t.dashboard, icon: LayoutDashboard },
    { id: 'projects' as NavTab, label: t.projects, icon: Building2 },
    { id: 'attendance' as NavTab, label: 'الحضور', icon: CalendarCheck2 },
    { id: 'weekly_payroll' as NavTab, label: 'السيمانة', icon: Coins },
    { id: 'workers' as NavTab, label: 'العمال', icon: Users },
    { id: 'suppliers' as NavTab, label: 'السلعة', icon: Truck },
    { id: 'invoices' as NavTab, label: 'الفواتير', icon: DollarSign },
    { id: 'reports' as NavTab, label: 'التقارير', icon: FileText },
  ];

  const activeMobileTabs = isProjectSelected ? projectMobileTabs : globalMobileTabs;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/98 backdrop-blur-md border-t border-zinc-800 px-1 py-1.5 flex items-center justify-around shadow-2xl overflow-x-auto no-scrollbar">
      {activeMobileTabs.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-all shrink-0 min-w-[46px] ${
              isActive
                ? 'text-amber-400 font-bold scale-105'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-amber-400 stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[9px] sm:text-[10px] mt-0.5 whitespace-nowrap truncate max-w-[52px] leading-tight font-medium">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
