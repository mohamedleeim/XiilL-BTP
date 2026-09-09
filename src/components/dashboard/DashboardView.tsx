import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/StatCard';
import { NavTab } from '../common/Sidebar';
import { Project, ProjectStatus } from '../../types';
import { ProjectContextBanner } from '../common/ProjectContextBanner';
import { 
  Building2, 
  Coins, 
  Truck, 
  Users, 
  Receipt, 
  AlertTriangle, 
  CalendarCheck, 
  PlusCircle, 
  FileSpreadsheet, 
  ArrowUpRight, 
  TrendingDown, 
  Clock, 
  CheckCircle2,
  Calendar,
  Plus,
  Search,
  MapPin,
  Phone,
  MessageSquare,
  Edit3,
  Trash2,
  ExternalLink,
  Layers,
  ArrowRight,
  UserCheck,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { cpsTemplates } from '../../db/seedData';
import { SupervisorSheetSyncCard } from '../workspace/SupervisorSheetSyncCard';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { 
    t, 
    selectedProjectId, 
    setSelectedProjectId,
    accessibleProjects, 
    getProjectFinancials, 
    getOverallFinancials,
    addProject,
    updateProject,
    deleteProject,
    importCpsTemplate,
    state,
    currentUser,
    activeSession,
    activeChantierSheet,
    openSheetOnboarding
  } = useApp();

  const isAll = selectedProjectId === 'all';
  const currentProject = accessibleProjects.find(p => p.id === selectedProjectId);
  const fin = isAll ? getOverallFinancials() : getProjectFinancials(selectedProjectId);

  // Search & Filter state for Projects section in Dashboard
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('villa');

  // Project Form Data
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    clientName: '',
    clientPhone: '',
    clientAddress: '',
    locationCity: 'الدار البيضاء',
    locationAddress: '',
    budget: 500000,
    startDate: new Date().toISOString().slice(0, 10),
    targetEndDate: '',
    status: 'active' as ProjectStatus,
    progressPct: 0,
    notes: '',
    assignedSupervisorIds: [] as string[]
  });

  // Today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);
  
  // Today's attendance count
  const todayAttendance = state.attendance.filter(a => 
    a.date === todayStr && (isAll || a.projectId === selectedProjectId)
  );
  const presentCount = todayAttendance.filter(a => a.status === 'present' || a.status === 'half_day').length;
  const activeWorkersCount = state.workers.filter(w => w.active && (isAll || w.projectIds.includes(selectedProjectId))).length;

  const filteredProjects = accessibleProjects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(projectSearch.toLowerCase()) || 
                          p.clientName.toLowerCase().includes(projectSearch.toLowerCase()) ||
                          p.locationCity.toLowerCase().includes(projectSearch.toLowerCase());
    const matchesStatus = projectStatusFilter === 'all' || p.status === projectStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCreateProjectModal = () => {
    setEditingProject(null);
    setSelectedTemplateId('villa');
    setProjectFormData({
      name: '',
      clientName: '',
      clientPhone: '',
      clientAddress: '',
      locationCity: 'الدار البيضاء',
      locationAddress: '',
      budget: 500000,
      startDate: new Date().toISOString().slice(0, 10),
      targetEndDate: '',
      status: 'active',
      progressPct: 0,
      notes: '',
      assignedSupervisorIds: []
    });
    setIsNewProjectModalOpen(true);
  };

  const openEditProjectModal = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(proj);
    setSelectedTemplateId('none');
    setProjectFormData({
      name: proj.name,
      clientName: proj.clientName,
      clientPhone: proj.clientPhone,
      clientAddress: proj.clientAddress || '',
      locationCity: proj.locationCity,
      locationAddress: proj.locationAddress || '',
      budget: proj.budget,
      startDate: proj.startDate,
      targetEndDate: proj.targetEndDate || '',
      status: proj.status,
      progressPct: proj.progressPct,
      notes: proj.notes || '',
      assignedSupervisorIds: proj.assignedSupervisorIds || []
    });
    setIsNewProjectModalOpen(true);
  };

  const handleProjectFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFormData.name || !projectFormData.clientName) return;

    if (editingProject) {
      updateProject(editingProject.id, projectFormData);
    } else {
      const newProj = addProject(projectFormData);
      if (selectedTemplateId && selectedTemplateId !== 'none' && newProj?.id) {
        importCpsTemplate(newProj.id, selectedTemplateId);
      }
    }
    setIsNewProjectModalOpen(false);
  };

  const openWhatsApp = (phone: string, projectName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const moroccanPhone = cleanPhone.startsWith('0') ? `212${cleanPhone.slice(1)}` : cleanPhone;
    const msg = encodeURIComponent(`السلام عليكم، بخصوص ورش البناء (${projectName}) — تطبيق XiilL BTP`);
    window.open(`https://wa.me/${moroccanPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* If inside a specific project, show the project context banner */}
      {!isAll && (
        <ProjectContextBanner />
      )}

      {/* Field Supervisor Dedicated Sheet Verification & Sync Card */}
      {activeSession?.type === 'supervisor' && (
        <SupervisorSheetSyncCard />
      )}

      {/* General Manager Missing Sheet Setup Reminder Banner */}
      {activeSession?.type === 'admin' && !activeChantierSheet.url && (
        <div 
          id="banner-manager-setup-sheets"
          className="p-4 bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-amber-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                لم يتم تهيئة جدول بيانات Google Sheets المركزي لحسابك بعد
              </h4>
              <p className="text-xs text-amber-300/80">
                قم بالربط التلقائي بحساب Gmail أو الصق ملفك السابق لتدقيق الأوراق الثمانية وضمان حفظ معطيات الأوراش.
              </p>
            </div>
          </div>
          <button
            id="btn-open-sheets-onboarding-banner"
            onClick={openSheetOnboarding}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>بدء التهيئة الذكية لـ Google Sheets</span>
          </button>
        </div>
      )}

      {/* Header Banner & Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 sm:p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {isAll ? 'لوحة القيادة الموحدة (Vue Globale)' : `ورش: ${currentProject?.name}`}
            </span>
            <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              {todayStr}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isAll ? 'لوحة التحكم الشاملة لإدارة أوراش البناء' : currentProject?.name}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            {isAll 
              ? `متابعة حية لـ ${accessibleProjects.length} أوراش، حضور العمال، مشتريات المواد وديون الموردين في المغرب.`
              : `الزبون: ${currentProject?.clientName} (${currentProject?.clientPhone}) — الموقع: ${currentProject?.locationCity}`}
          </p>
        </div>

        {/* Quick Saturday Payroll CTA button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('weekly_payroll')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Coins className="w-4 h-4 text-zinc-950" />
            <span>تسوية أجور السبت (خلاص السيمانة)</span>
          </button>
        </div>
      </div>

      {/* Budget Overrun Warning Banner */}
      {fin.isOverBudget && (
        <div className="bg-red-950/40 border border-red-800/80 rounded-2xl p-4 flex items-center gap-3 text-red-200">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold block">تحذير مالي: تجاوز الميزانية المحددة!</span>
            <span>بلغ إجمالي المصروفات {(fin.totalSpent ?? 0).toLocaleString()} د.م وتجاوز الميزانية بمقدار {Math.abs(fin.remainingBudget ?? 0).toLocaleString()} د.م.</span>
          </div>
        </div>
      )}

      {fin.isNearBudget && !fin.isOverBudget && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-4 flex items-center gap-3 text-amber-200">
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold block">{t.budgetWarning}</span>
            <span>تم استهلاك {(fin.budgetPercentage ?? 0).toFixed(1)}% من الميزانية المخصصة للورش.</span>
          </div>
        </div>
      )}

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title={isAll ? 'إجمالي ميزانيات المشاريع' : 'ميزانية الورش'}
          value={`${(fin.budget ?? 0).toLocaleString()} ${t.currency}`}
          subtitle={`المصروف: ${(fin.totalSpent ?? 0).toLocaleString()} ${t.currency}`}
          icon={<Building2 className="w-5 h-5" />}
          variant={fin.isOverBudget ? 'danger' : 'default'}
        />

        <StatCard
          title="مشتريات السلعة والمواد"
          value={`${(fin.materialsSpent ?? 0).toLocaleString()} ${t.currency}`}
          subtitle="إسمنت، حديد، رمل، خشب، قنوات"
          icon={<Truck className="w-5 h-5" />}
        />

        <StatCard
          title="أجور اليد العاملة والتسبيقات"
          value={`${(fin.laborSpent ?? 0).toLocaleString()} ${t.currency}`}
          subtitle="أجور المعلمين والمانوفر والأفونسات"
          icon={<Users className="w-5 h-5" />}
        />

        <StatCard
          title="ديون الموردين (الكريدي)"
          value={`${(fin.suppliersDebt ?? 0).toLocaleString()} ${t.currency}`}
          subtitle="بونات السلعة غير المؤداة"
          icon={<Coins className="w-5 h-5" />}
          variant={fin.suppliersDebt > 20000 ? 'warning' : 'default'}
        />
      </div>

      {/* SECTION: Projects Hub (قسم المشاريع وإدارتها والدخول لكل ورش) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              <span>أوراش ومشاريع البناء ({accessibleProjects.length})</span>
            </h2>
            <p className="text-xs text-zinc-400">
              اضغط على أي ورش للدخول لفضاء عملياته المستقلة (عمال، حضور، سلعة، مصاريف، خلاص السيمانة)
            </p>
          </div>

          <button
            onClick={openCreateProjectModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-zinc-950" />
            <span>إضافة ورش جديد</span>
          </button>
        </div>

        {/* Filter & Search for projects */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800/80 mb-5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث باسم الورش، الزبون، أو المدينة..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 py-2 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={projectStatusFilter}
            onChange={(e) => setProjectStatusFilter(e.target.value)}
            className="w-full sm:w-auto bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 py-2 px-3 focus:outline-none focus:border-amber-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">قيد الإنجاز</option>
            <option value="completed">مكتمل</option>
            <option value="paused">متوقف مؤقتاً</option>
          </select>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const pFin = getProjectFinancials(project.id);
            const pWorkers = state.workers.filter(w => w.projectIds.includes(project.id));
            const isCurrentlySelected = selectedProjectId === project.id;

            return (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={`group rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrentlySelected
                    ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                    : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950'
                }`}
              >
                <div>
                  {/* Status & City */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      project.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : project.status === 'completed'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {project.status === 'active' ? 'قيد الإنجاز' : project.status === 'completed' ? 'مكتمل' : 'متوقف'}
                    </span>

                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>{project.locationCity}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white mb-2 leading-snug group-hover:text-amber-300 transition-colors">
                    {project.name}
                  </h3>

                  {/* Client card */}
                  <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-2.5 mb-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="text-zinc-400">الزبون:</span>
                      <span className="font-semibold text-white truncate max-w-[150px]">{project.clientName}</span>
                    </div>

                    <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>{project.clientPhone}</span>
                      </span>
                      <button
                        onClick={(e) => openWhatsApp(project.clientPhone, project.name, e)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-medium"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>واتساب</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-400">نسبة التقدم:</span>
                      <span className="font-bold text-amber-400 tabular-nums">{project.progressPct}%</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{ width: `${project.progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Financials & Workers snapshot */}
                  <div className="grid grid-cols-3 gap-1.5 bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/60 text-xs mb-3 text-center">
                    <div>
                      <span className="text-[9px] text-zinc-400 block">الميزانية</span>
                      <span className="font-bold text-zinc-200 tabular-nums text-[11px]">{(project?.budget ?? 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 block">المصروف</span>
                      <span className={`font-bold tabular-nums text-[11px] ${pFin?.isOverBudget ? 'text-red-400' : 'text-zinc-200'}`}>
                        {(pFin?.totalSpent ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 block">العمال</span>
                      <span className="font-bold text-emerald-400 tabular-nums text-[11px]">{pWorkers.length}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  
                  {/* Enter Project Workspace CTA */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProjectId(project.id);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      isCurrentlySelected 
                        ? 'bg-amber-500 text-zinc-950 shadow-sm' 
                        : 'bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{isCurrentlySelected ? 'الورش النشط حالياً' : 'دخول الورش 🏗️'}</span>
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={(e) => openEditProjectModal(project, e)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                    title="تعديل بيانات الورش"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`هل أنت متأكد من حذف ورش (${project.name}) ونقله لسلة المحذوفات؟`)) {
                        deleteProject(project.id);
                        if (selectedProjectId === project.id) {
                          setSelectedProjectId('all');
                        }
                      }
                    }}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 transition-colors"
                    title="حذف الورش"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12 bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-6">
            <Building2 className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400 mb-3">لا يوجد أي ورش يطابق معايير البحث</p>
            <button
              onClick={openCreateProjectModal}
              className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
            >
              إنشاء ورش جديد
            </button>
          </div>
        )}

      </div>

      {/* Quick Action Bar for Field Operations */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-3xl">
        <div className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider">
          عمليات النظام والورش بضغطة واحدة (Accès Rapide)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => onNavigate('attendance')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-800/70 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 border border-zinc-700/60 hover:border-amber-500/50 transition-all text-right rtl:text-right ltr:text-left cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="block text-white truncate">تسجيل الحضور</span>
              <span className="text-[10px] text-zinc-400">Pointage ({presentCount}/{activeWorkersCount})</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('suppliers')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-800/70 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 border border-zinc-700/60 hover:border-amber-500/50 transition-all text-right rtl:text-right ltr:text-left cursor-pointer"
          >
            <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="block text-white truncate">بون مشتريات مواد</span>
              <span className="text-[10px] text-zinc-400">إسمنت، رمل، حديد</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('expenses')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-800/70 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 border border-zinc-700/60 hover:border-amber-500/50 transition-all text-right rtl:text-right ltr:text-left cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <span className="block text-white truncate">تسجيل مصروف</span>
              <span className="text-[10px] text-zinc-400">كراء آليات، مازوت، وجبات</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-800/70 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 border border-zinc-700/60 hover:border-amber-500/50 transition-all text-right rtl:text-right ltr:text-left cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="min-w-0">
              <span className="block text-white truncate">التقارير و PDF</span>
              <span className="text-[10px] text-zinc-400">إرسال لواتساب</span>
            </div>
          </button>
        </div>
      </div>

      {/* Progress & Financial Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Budget Progress & Burn Rate */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                توزيع المصروفات ونسبة استهلاك الميزانية
              </h2>
              <p className="text-xs text-zinc-400">تحليل تكلفة المواد مقابل اليد العاملة والمصاريف العامة</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-amber-400 tabular-nums">
                {fin.budgetPercentage.toFixed(1)}%
              </span>
              <span className="text-[10px] text-zinc-500 block">من الميزانية</span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full bg-zinc-800 rounded-full h-3.5 overflow-hidden flex mb-6">
            <div 
              style={{ width: `${Math.min(100, (fin.materialsSpent / (fin.budget || 1)) * 100)}%` }} 
              className="bg-amber-500 h-full" 
              title="تكلفة المواد"
            />
            <div 
              style={{ width: `${Math.min(100, (fin.laborSpent / (fin.budget || 1)) * 100)}%` }} 
              className="bg-emerald-500 h-full" 
              title="أجور العمال"
            />
            <div 
              style={{ width: `${Math.min(100, (fin.expensesSpent / (fin.budget || 1)) * 100)}%` }} 
              className="bg-blue-500 h-full" 
              title="المصاريف العامة"
            />
          </div>

          {/* Breakdown Items */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>المواد والسلعة</span>
              </div>
              <p className="text-base font-bold text-white tabular-nums">
                {(fin?.materialsSpent ?? 0).toLocaleString()} {t.currency}
              </p>
              <p className="text-[10px] text-zinc-400">
                {(fin?.totalSpent ?? 0) > 0 ? (((fin?.materialsSpent ?? 0) / fin.totalSpent) * 100).toFixed(0) : 0}% من المصاريف
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>أجور اليد العاملة</span>
              </div>
              <p className="text-base font-bold text-white tabular-nums">
                {(fin?.laborSpent ?? 0).toLocaleString()} {t.currency}
              </p>
              <p className="text-[10px] text-zinc-400">
                {(fin?.totalSpent ?? 0) > 0 ? (((fin?.laborSpent ?? 0) / fin.totalSpent) * 100).toFixed(0) : 0}% من المصاريف
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-xs text-blue-400 mb-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>المصاريف العامة</span>
              </div>
              <p className="text-base font-bold text-white tabular-nums">
                {(fin?.expensesSpent ?? 0).toLocaleString()} {t.currency}
              </p>
              <p className="text-[10px] text-zinc-400">
                {(fin?.totalSpent ?? 0) > 0 ? (((fin?.expensesSpent ?? 0) / fin.totalSpent) * 100).toFixed(0) : 0}% من المصاريف
              </p>
            </div>
          </div>

          {/* Client Received vs Balance */}
          <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-300">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">دفعات الزبون المقبوضة:</span>
              <span className="font-bold text-emerald-400">{(fin?.clientReceived ?? 0).toLocaleString()} {t.currency}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">الميزانية المتبقية:</span>
              <span className={`font-bold ${(fin?.remainingBudget ?? 0) < 0 ? 'text-red-400' : 'text-zinc-100'}`}>
                {(fin?.remainingBudget ?? 0).toLocaleString()} {t.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Live Site Activity Feed */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>سجل النشاط المباشر للورش</span>
              </h2>
              <button 
                onClick={() => onNavigate('activity_log')}
                className="text-[11px] text-amber-400 hover:underline"
              >
                عرض الكل
              </button>
            </div>

            <div className="space-y-3">
              {state.activityLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="text-xs p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/70">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                    <span className="font-semibold text-zinc-300">{log.userName}</span>
                    <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-zinc-200 text-xs line-clamp-2">{log.details}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-800 text-center">
            <span className="text-[11px] text-zinc-400 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>نظام XiilL BTP مغربي 100% يعمل Offline</span>
            </span>
          </div>
        </div>

      </div>

      {/* Modal: Create or Edit Project */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">
              {editingProject ? 'تعديل بيانات الورش' : 'إنشاء ورش بناء جديد'}
            </h2>

            <form onSubmit={handleProjectFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">اسم الورش أو المشروع *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: بناء فيلا عصرية — بوسكورة"
                  value={projectFormData.name}
                  onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">اسم الزبون / المالك *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: السيد عبد السلام المنصوري"
                    value={projectFormData.clientName}
                    onChange={(e) => setProjectFormData({ ...projectFormData, clientName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">هاتف الزبون *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0661234567"
                    value={projectFormData.clientPhone}
                    onChange={(e) => setProjectFormData({ ...projectFormData, clientPhone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">المدينة</label>
                  <input
                    type="text"
                    placeholder="الدار البيضاء، مراكش، طنجة..."
                    value={projectFormData.locationCity}
                    onChange={(e) => setProjectFormData({ ...projectFormData, locationCity: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">الميزانية التقديرية (MAD) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={projectFormData.budget}
                    onChange={(e) => setProjectFormData({ ...projectFormData, budget: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">تاريخ انطلاق الأشغال</label>
                  <input
                    type="date"
                    value={projectFormData.startDate}
                    onChange={(e) => setProjectFormData({ ...projectFormData, startDate: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">الحالة</label>
                  <select
                    value={projectFormData.status}
                    onChange={(e) => setProjectFormData({ ...projectFormData, status: e.target.value as ProjectStatus })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="active">قيد الإنجاز (Active)</option>
                    <option value="paused">متوقف مؤقتاً (En pause)</option>
                    <option value="completed">مكتمل (Terminé)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  نسبة تقدم الأشغال الأولية ({projectFormData.progressPct}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={projectFormData.progressPct}
                  onChange={(e) => setProjectFormData({ ...projectFormData, progressPct: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              {!editingProject && (
                <div className="bg-zinc-950/70 border border-amber-500/30 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Layers className="w-4 h-4" />
                    <span>توليد جدول بنود CPS والبردورو تلقائياً</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    اختر نموذج دفتر تحملات مغربي جاهز لتوليد البنود والأسعار التقديرية مباشرة مع المشروع:
                  </p>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="none">بدون نموذج (سأقوم بإدخال بنود CPS يدوياً)</option>
                    {cpsTemplates.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} — {tpl.description} ({tpl.articles.length} بند)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
