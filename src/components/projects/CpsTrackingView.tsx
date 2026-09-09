import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CpsArticle } from '../../types';
import { cpsStandardLots, cpsTemplates } from '../../db/seedData';
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Printer,
  Edit3,
  Trash2,
  Sparkles,
  Sliders,
  FolderOpen,
  ArrowUpRight,
  Calculator,
  ChevronDown,
  Building,
  CheckSquare,
  BarChart3,
  X,
  Save,
  Download
} from 'lucide-react';

interface CpsTrackingViewProps {
  projectId?: string;
}

export const CpsTrackingView: React.FC<CpsTrackingViewProps> = ({ projectId }) => {
  const {
    state,
    selectedProjectId,
    accessibleProjects,
    addCpsArticle,
    updateCpsArticle,
    deleteCpsArticle,
    importCpsTemplate,
    getProjectCpsSummary,
    t,
    currentUser
  } = useApp();

  // Target project
  const activeProjectId = projectId || (selectedProjectId !== 'all' ? selectedProjectId : accessibleProjects[0]?.id);
  const currentProject = accessibleProjects.find(p => p.id === activeProjectId);

  // States
  const [search, setSearch] = useState('');
  const [selectedLot, setSelectedLot] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<CpsArticle | null>(null);
  const [quickUpdateArticle, setQuickUpdateArticle] = useState<CpsArticle | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isDecompteModalOpen, setIsDecompteModalOpen] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    lot: string;
    articleNumber: string;
    designation: string;
    unit: string;
    unitPrice: number;
    quantityPlanned: number;
    quantityExecuted: number;
    notes: string;
  }>({
    lot: cpsStandardLots[0],
    articleNumber: '1.1',
    designation: '',
    unit: 'm²',
    unitPrice: 150,
    quantityPlanned: 100,
    quantityExecuted: 0,
    notes: ''
  });

  // Quick Update State
  const [quickExecutedQty, setQuickExecutedQty] = useState<number>(0);
  const [quickProgressPct, setQuickProgressPct] = useState<number>(0);

  // Calculate CPS summary for active project
  const cpsSummary = useMemo(() => {
    if (!activeProjectId) {
      return {
        totalPlannedAmount: 0,
        totalExecutedAmount: 0,
        progressPct: 0,
        totalArticles: 0,
        completedArticles: 0,
        inProgressArticles: 0,
        notStartedArticles: 0,
        lotsBreakdown: []
      };
    }
    return getProjectCpsSummary(activeProjectId);
  }, [activeProjectId, state.cpsArticles, getProjectCpsSummary]);

  // Project articles
  const projectArticles = useMemo(() => {
    if (!activeProjectId) return [];
    return state.cpsArticles.filter(a => a.projectId === activeProjectId && !a.isDeleted);
  }, [state.cpsArticles, activeProjectId]);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    return projectArticles.filter(art => {
      const matchesSearch = 
        art.designation.toLowerCase().includes(search.toLowerCase()) ||
        art.articleNumber.toLowerCase().includes(search.toLowerCase()) ||
        art.lot.toLowerCase().includes(search.toLowerCase());

      const matchesLot = selectedLot === 'all' || art.lot === selectedLot;
      
      const matchesStatus = 
        selectedStatus === 'all' || 
        (selectedStatus === 'completed' && (art.status === 'completed' || art.progressPct >= 100)) ||
        (selectedStatus === 'in_progress' && (art.status === 'in_progress' || (art.progressPct > 0 && art.progressPct < 100))) ||
        (selectedStatus === 'not_started' && (art.status === 'not_started' || art.progressPct === 0));

      return matchesSearch && matchesLot && matchesStatus;
    });
  }, [projectArticles, search, selectedLot, selectedStatus]);

  // Handlers for Add/Edit
  const handleOpenAddModal = () => {
    setEditingArticle(null);
    const nextNum = `${projectArticles.length + 1}.1`;
    setFormData({
      lot: cpsStandardLots[0],
      articleNumber: nextNum,
      designation: '',
      unit: 'm²',
      unitPrice: 200,
      quantityPlanned: 50,
      quantityExecuted: 0,
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (article: CpsArticle) => {
    setEditingArticle(article);
    setFormData({
      lot: article.lot,
      articleNumber: article.articleNumber,
      designation: article.designation,
      unit: article.unit,
      unitPrice: article.unitPrice,
      quantityPlanned: article.quantityPlanned,
      quantityExecuted: article.quantityExecuted,
      notes: article.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !formData.designation.trim()) return;

    if (editingArticle) {
      updateCpsArticle(editingArticle.id, {
        lot: formData.lot,
        articleNumber: formData.articleNumber,
        designation: formData.designation,
        unit: formData.unit,
        unitPrice: Number(formData.unitPrice) || 0,
        quantityPlanned: Number(formData.quantityPlanned) || 0,
        quantityExecuted: Number(formData.quantityExecuted) || 0,
        notes: formData.notes
      });
    } else {
      addCpsArticle({
        projectId: activeProjectId,
        lot: formData.lot,
        articleNumber: formData.articleNumber,
        designation: formData.designation,
        unit: formData.unit,
        unitPrice: Number(formData.unitPrice) || 0,
        quantityPlanned: Number(formData.quantityPlanned) || 0,
        quantityExecuted: Number(formData.quantityExecuted) || 0,
        totalPlannedPrice: (Number(formData.quantityPlanned) || 0) * (Number(formData.unitPrice) || 0),
        executedAmount: (Number(formData.quantityExecuted) || 0) * (Number(formData.unitPrice) || 0),
        progressPct: Number(formData.quantityPlanned) > 0 
          ? Math.min(100, Math.round(((Number(formData.quantityExecuted) || 0) / Number(formData.quantityPlanned)) * 100))
          : 0,
        status: (Number(formData.quantityExecuted) || 0) >= Number(formData.quantityPlanned) && Number(formData.quantityPlanned) > 0
          ? 'completed'
          : (Number(formData.quantityExecuted) || 0) > 0
            ? 'in_progress'
            : 'not_started',
        notes: formData.notes
      });
    }

    setIsAddModalOpen(false);
  };

  // Quick Update Handlers
  const handleOpenQuickUpdate = (article: CpsArticle) => {
    setQuickUpdateArticle(article);
    setQuickExecutedQty(article.quantityExecuted);
    setQuickProgressPct(article.progressPct);
  };

  const handleApplyQuickUpdate = () => {
    if (!quickUpdateArticle) return;
    
    updateCpsArticle(quickUpdateArticle.id, {
      quantityExecuted: quickExecutedQty,
      progressPct: quickProgressPct
    });

    setQuickUpdateArticle(null);
  };

  const handleSetQuickPercentage = (pct: number) => {
    if (!quickUpdateArticle) return;
    const clampedPct = Math.min(100, Math.max(0, pct));
    const qty = Math.round(((quickUpdateArticle.quantityPlanned * clampedPct) / 100) * 100) / 100;
    setQuickProgressPct(clampedPct);
    setQuickExecutedQty(qty);
  };

  const handleSetQuickQuantity = (qty: number) => {
    if (!quickUpdateArticle) return;
    const safeQty = Math.max(0, qty);
    const pct = quickUpdateArticle.quantityPlanned > 0
      ? Math.min(100, Math.round((safeQty / quickUpdateArticle.quantityPlanned) * 100))
      : 0;
    setQuickExecutedQty(safeQty);
    setQuickProgressPct(pct);
  };

  const handleImportTemplate = (templateId: string) => {
    if (!activeProjectId) return;
    importCpsTemplate(activeProjectId, templateId);
    setIsTemplateModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!currentProject) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
        <Layers className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-white">يرجى تحديد ورش لتتبع بنود CPS</h3>
        <p className="text-xs text-zinc-400">
          تتبع دفتر التحملات والبردورو دو بري مرتبط بكل ورش على حدة لحساب تقدم الأشغال الدقيق.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* ========================================================
          HEADER & CPS TITLE BAR
         ======================================================== */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-5 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>تتبع الأشغال عبر CPS و البردورو (Bordereau des Prix)</span>
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentProject.name}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                حساب نسبة تقدم الورش الدقيقة والمبالغ المنجزة بناءً على قياسات وكميات كل بند في دفتر التحملات
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {projectArticles.length === 0 && (
            <button
              id="import-cps-template-btn"
              onClick={() => setIsTemplateModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-950 text-xs font-bold shadow-md hover:brightness-110 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>استيراد نموذج CPS مغربي</span>
            </button>
          )}

          {projectArticles.length > 0 && (
            <button
              id="open-decompte-btn"
              onClick={() => setIsDecompteModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 text-xs font-bold border border-zinc-700 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>كشف الأشغال (Décompte)</span>
            </button>
          )}

          <button
            id="add-cps-article-btn"
            onClick={handleOpenAddModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة بند (Article)</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          CPS KPI METRICS DASHBOARD
         ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Global Progress Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span className="font-semibold">نسبة التقدم المحسوبة (CPS)</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400 font-mono">
              {cpsSummary.progressPct}%
            </span>
            <span className="text-[11px] text-zinc-400">
              (محدّث تلقائياً)
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, cpsSummary.progressPct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
            <span>مجموع البنود: {cpsSummary.totalArticles}</span>
            <span className="text-emerald-400 font-bold">{cpsSummary.completedArticles} مكتمل</span>
          </div>
        </div>

        {/* 2. Total Planned Amount (Marché / Bordereau) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-semibold">إجمالي البردورو التقديري</span>
            <Calculator className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">
            {(cpsSummary.totalPlannedAmount ?? 0).toLocaleString()} <span className="text-xs text-zinc-400">{t.currency}</span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
            <span>ميزانية الورش المحددة:</span>
            <span className="text-zinc-300 font-mono font-bold">{(currentProject.budget ?? 0).toLocaleString()} د.م</span>
          </div>
        </div>

        {/* 3. Executed Amount (Décompte des Travaux) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-semibold">المبلغ المنجز الفعلي (Décompte)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            {(cpsSummary.totalExecutedAmount ?? 0).toLocaleString()} <span className="text-xs text-zinc-400">{t.currency}</span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
            <span>البنود قيد الإنجاز:</span>
            <span className="text-amber-400 font-bold">{cpsSummary.inProgressArticles} بنود</span>
          </div>
        </div>

        {/* 4. Remaining Amount to Execute */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-semibold">المتبقي للإنجاز (Reste)</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 font-mono">
            {Math.max(0, (cpsSummary.totalPlannedAmount ?? 0) - (cpsSummary.totalExecutedAmount ?? 0)).toLocaleString()}{' '}
            <span className="text-xs text-zinc-400">{t.currency}</span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
            <span>بنود لم تنطلق بعد:</span>
            <span className="text-zinc-400 font-bold">{cpsSummary.notStartedArticles} بنود</span>
          </div>
        </div>

      </div>

      {/* ========================================================
          CONSTRUCTION LOTS BREAKDOWN (تقدم الأشغال حسب الحصص)
         ======================================================== */}
      {cpsSummary.lotsBreakdown.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>نسبة تقدم الأشغال حسب حصص البناء (Avancement par Lot)</span>
            </h3>
            <span className="text-[11px] text-zinc-400 font-mono">
              {cpsSummary.lotsBreakdown.length} حصص
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cpsSummary.lotsBreakdown.map((lot) => {
              const isSelected = selectedLot === lot.lot;
              return (
                <button
                  key={lot.lot}
                  onClick={() => setSelectedLot(isSelected ? 'all' : lot.lot)}
                  className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[170px]" title={lot.lot}>
                      {lot.lot}
                    </span>
                    <span className="text-xs font-mono font-black text-amber-400">
                      {lot.progressPct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        lot.progressPct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${lot.progressPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                    <span>
                      {(lot.executedAmount ?? 0).toLocaleString()} / {(lot.plannedAmount ?? 0).toLocaleString()} د.م
                    </span>
                    <span>
                      {lot.completedCount}/{lot.articlesCount} بنود
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          SEARCH, FILTER AND QUICK TEMPLATE BUTTONS
         ======================================================== */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="cps-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم البند أو الوصف أو الحصة..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Lot Filter */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <select
            id="cps-lot-select"
            value={selectedLot}
            onChange={(e) => setSelectedLot(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">جميع الحصص (Toutes les Lots)</option>
            {cpsStandardLots.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            id="cps-status-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="in_progress">قيد الإنجاز (En cours)</option>
            <option value="completed">مكتمل (Terminé 100%)</option>
            <option value="not_started">لم يبدأ (Non commencé)</option>
          </select>

          {/* Templates Modal Trigger */}
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>نماذج جاهزة</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          ARTICLES TABLE (BORDEREAU DES PRIX & ATTACHEMENT)
         ======================================================== */}
      {filteredArticles.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center space-y-4">
          <Layers className="w-12 h-12 text-zinc-600 mx-auto" />
          <h4 className="text-sm font-bold text-white">لا توجد بنود مطابقة في دفتر التحملات</h4>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            يمكنك إضافة بنود الصفقة يدوياً أو استيراد نموذج متكامل لبناء فيلا أو عمارة أو إصلاح شامل بنقرة واحدة.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-2 hover:bg-amber-400 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>استيراد نموذج CPS</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center gap-2 border border-zinc-700 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة بند يدوي</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800/80 select-none">
                <tr>
                  <th className="py-3 px-3 font-semibold">رقم البند</th>
                  <th className="py-3 px-3 font-semibold">الحصة (Lot)</th>
                  <th className="py-3 px-4 font-semibold">بيان الأشغال (Désignation)</th>
                  <th className="py-3 px-2 font-semibold text-center">الوحدة</th>
                  <th className="py-3 px-3 font-semibold text-left">سعر الوحدة (P.U)</th>
                  <th className="py-3 px-3 font-semibold text-left">الكمية المقدرة</th>
                  <th className="py-3 px-3 font-semibold text-left">المبلغ المقدر</th>
                  <th className="py-3 px-3 font-semibold text-left">الكمية المنجزة</th>
                  <th className="py-3 px-3 font-semibold text-left">المبلغ المنجز</th>
                  <th className="py-3 px-4 font-semibold text-center min-w-[130px]">نسبة الإنجاز</th>
                  <th className="py-3 px-3 font-semibold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredArticles.map((art) => {
                  const isCompleted = art.status === 'completed' || art.progressPct >= 100;
                  const isStarted = art.progressPct > 0;

                  return (
                    <tr
                      key={art.id}
                      className="hover:bg-zinc-800/40 transition-colors group"
                    >
                      {/* 1. Article Number */}
                      <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                        {art.articleNumber}
                      </td>

                      {/* 2. Lot */}
                      <td className="py-3 px-3 text-zinc-300 font-medium whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-[11px] text-zinc-300 border border-zinc-700/50">
                          {art.lot}
                        </span>
                      </td>

                      {/* 3. Designation */}
                      <td className="py-3 px-4 text-white font-semibold">
                        <div>
                          <span>{art.designation}</span>
                          {art.notes && (
                            <span className="block text-[10px] text-zinc-400 font-normal">
                              {art.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Unit */}
                      <td className="py-3 px-2 text-center font-mono text-zinc-300 font-bold whitespace-nowrap">
                        {art.unit}
                      </td>

                      {/* 5. Unit Price */}
                      <td className="py-3 px-3 text-left font-mono text-zinc-300 whitespace-nowrap">
                        {(art.unitPrice ?? 0).toLocaleString()} <span className="text-[10px] text-zinc-500">د.م</span>
                      </td>

                      {/* 6. Quantity Planned */}
                      <td className="py-3 px-3 text-left font-mono text-zinc-300 whitespace-nowrap">
                        {(art.quantityPlanned ?? 0).toLocaleString()}
                      </td>

                      {/* 7. Total Planned Amount */}
                      <td className="py-3 px-3 text-left font-mono font-bold text-white whitespace-nowrap">
                        {(art.totalPlannedPrice ?? 0).toLocaleString()} <span className="text-[10px] text-zinc-500">د.م</span>
                      </td>

                      {/* 8. Quantity Executed */}
                      <td className="py-3 px-3 text-left font-mono font-bold text-amber-400 whitespace-nowrap">
                        {(art.quantityExecuted ?? 0).toLocaleString()}
                      </td>

                      {/* 9. Executed Amount */}
                      <td className="py-3 px-3 text-left font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {(art.executedAmount ?? 0).toLocaleString()} <span className="text-[10px] text-zinc-500">د.م</span>
                      </td>

                      {/* 10. Progress % and Bar */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center justify-between w-full text-[11px] font-mono">
                            <span className={`font-bold ${isCompleted ? 'text-emerald-400' : isStarted ? 'text-amber-400' : 'text-zinc-500'}`}>
                              {art.progressPct}%
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {isCompleted ? 'مكتمل' : isStarted ? 'جارٍ' : 'لم يبدأ'}
                            </span>
                          </div>
                          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isCompleted ? 'bg-emerald-500' : isStarted ? 'bg-amber-500' : 'bg-zinc-700'
                              }`}
                              style={{ width: `${Math.min(100, art.progressPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 11. Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick Adjust Progress Button */}
                          <button
                            id={`quick-progress-btn-${art.id}`}
                            title="تحديث نسبة التقدم السريع"
                            onClick={() => handleOpenQuickUpdate(art)}
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Article */}
                          <button
                            id={`edit-article-btn-${art.id}`}
                            title="تعديل البند"
                            onClick={() => handleOpenEditModal(art)}
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Article */}
                          <button
                            id={`delete-article-btn-${art.id}`}
                            title="حذف البند"
                            onClick={() => deleteCpsArticle(art.id)}
                            className="p-1.5 rounded-lg bg-zinc-800 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              
              {/* Total Footer Row */}
              <tfoot className="bg-zinc-950/90 font-bold border-t border-zinc-800 text-zinc-300">
                <tr>
                  <td colSpan={6} className="py-3.5 px-4 text-left font-bold text-white">
                    المجموع الإجمالي للبنود المعروضة:
                  </td>
                  <td className="py-3.5 px-3 text-left font-mono text-white text-sm">
                    {filteredArticles.reduce((sum, a) => sum + (a.totalPlannedPrice || 0), 0).toLocaleString()} د.م
                  </td>
                  <td className="py-3.5 px-3 text-left font-mono text-amber-400 text-xs">
                    —
                  </td>
                  <td className="py-3.5 px-3 text-left font-mono text-emerald-400 text-sm">
                    {filteredArticles.reduce((sum, a) => sum + (a.executedAmount || 0), 0).toLocaleString()} د.م
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-amber-400">
                    {cpsSummary.progressPct}%
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: ADD / EDIT CPS ARTICLE MODAL
         ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Layers className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-white">
                  {editingArticle ? 'تعديل بند في دفتر التحملات والبردورو' : 'إضافة بند جديد لدفتر التحملات (CPS)'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-4">
              
              {/* Lot & Article Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">حصة البناء (Lot) *</label>
                  <select
                    value={formData.lot}
                    onChange={(e) => setFormData({ ...formData, lot: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  >
                    {cpsStandardLots.map(lot => (
                      <option key={lot} value={lot}>{lot}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">رقم البند (N° Article) *</label>
                  <input
                    type="text"
                    value={formData.articleNumber}
                    onChange={(e) => setFormData({ ...formData, articleNumber: e.target.value })}
                    placeholder="مثال: 1.1 أو 2.3"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Designation */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">بيان ووصف الأشغال (Désignation des travaux) *</label>
                <textarea
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="مثال: Béton armé pour semelles filantes et isolées dosé à 350 kg/m³"
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Unit, Unit Price, Quantity Planned */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">الوحدة (Unité) *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="m²">م² (m²)</option>
                    <option value="m³">م³ (m³)</option>
                    <option value="ml">م.ط (ml)</option>
                    <option value="U">وحدة (U)</option>
                    <option value="ens">مجموعة (Ens)</option>
                    <option value="kg">كلغ (kg)</option>
                    <option value="F">جزافي (Forfait)</option>
                    <option value="T">طن (Tonne)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">سعر الوحدة (P.U بالدرهم) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">الكمية المقدرة (Qté Prévue) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.quantityPlanned}
                    onChange={(e) => setFormData({ ...formData, quantityPlanned: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Quantity Executed Currently */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">الكمية المنجزة حالياً (Qté Réalisée)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.quantityExecuted}
                    onChange={(e) => setFormData({ ...formData, quantityExecuted: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-col justify-center text-xs font-mono">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>المبلغ التقديري للبند:</span>
                    <span className="text-white font-bold">
                      {((formData.unitPrice || 0) * (formData.quantityPlanned || 0)).toLocaleString()} د.م
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400 text-[11px] mt-1">
                    <span>المبلغ المنجز حالياً:</span>
                    <span className="text-emerald-400 font-bold">
                      {((formData.unitPrice || 0) * (formData.quantityExecuted || 0)).toLocaleString()} د.م
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">ملاحظات / شروط خاصة</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="مثال: مطابقة لدفتر الشروط الفنية أو اسم المزود"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black transition-all shadow-md cursor-pointer"
                >
                  {editingArticle ? 'حفظ التعديلات' : 'إضافة البند للـ CPS'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: QUICK PROGRESS SLIDER & STEPPER MODAL
         ======================================================== */}
      {quickUpdateArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sliders className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">تحديث تقدم البند (Mise à jour avancement)</h3>
                  <span className="text-[11px] text-amber-400 font-mono">{quickUpdateArticle.articleNumber} - {quickUpdateArticle.lot}</span>
                </div>
              </div>
              <button
                onClick={() => setQuickUpdateArticle(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs">
                <p className="text-white font-bold mb-1">{quickUpdateArticle.designation}</p>
                <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                  <span>الكمية المقدرة: {quickUpdateArticle.quantityPlanned} {quickUpdateArticle.unit}</span>
                  <span>السعر الأحادي: {quickUpdateArticle.unitPrice} د.م</span>
                </div>
              </div>

              {/* Progress Percentage Display & Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">نسبة التقدم المنجزة:</label>
                  <span className="text-2xl font-black text-amber-400 font-mono">{quickProgressPct}%</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={quickProgressPct}
                  onChange={(e) => handleSetQuickPercentage(parseInt(e.target.value) || 0)}
                  className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />

                {/* Quick Presets Buttons */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[0, 25, 50, 75, 100].slice(1).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSetQuickPercentage(p)}
                      className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                        quickProgressPct === p
                          ? 'bg-amber-500 text-zinc-950 ring-1 ring-amber-400'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact Executed Quantity Input */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <label className="text-xs font-semibold text-zinc-300">أو أدخل الكمية المقاسة المنجزة بالمتر / العدد:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={quickExecutedQty}
                    onChange={(e) => handleSetQuickQuantity(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs font-mono font-bold text-zinc-400 px-3 py-2 bg-zinc-800 rounded-xl">
                    {quickUpdateArticle.unit}
                  </span>
                </div>
              </div>

              {/* Calculated Result Card */}
              <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-xs font-mono flex justify-between items-center">
                <span className="text-zinc-400">المبلغ المنجز المحسوب:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {((quickExecutedQty || 0) * (quickUpdateArticle.unitPrice || 0)).toLocaleString()} د.م
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickUpdateArticle(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleApplyQuickUpdate}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>تثبيت التقدم</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: IMPORT READY-TO-USE CPS TEMPLATES MODAL
         ======================================================== */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">استيراد نموذج دفتر تحملات مغربي جاهز (Modèles CPS)</h3>
                  <p className="text-xs text-zinc-400">نماذج مطابقة للمعايير المغربية للمقاولات وأشغال البناء</p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {cpsTemplates.map(template => (
                <div
                  key={template.id}
                  className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4.5 hover:border-amber-500/40 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{template.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                          {template.articles.length} بند
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">{template.description}</p>
                    </div>

                    <button
                      onClick={() => handleImportTemplate(template.id)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>استيراد إلى هذا الورش</span>
                    </button>
                  </div>

                  {/* Sample articles preview */}
                  <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60 text-[11px] text-zinc-300 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 block mb-1">عينة من بنود هذا النموذج:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {template.articles.slice(0, 4).map((art, i) => (
                        <div key={i} className="truncate text-zinc-400 font-mono">
                          • {art.articleNumber} - {art.designation} ({art.unitPrice} د.م)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: PRINTABLE ATTACHEMENT & DECOMPTE PROVISOIRE
         ======================================================== */}
      {isDecompteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[95vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">كشف حساب الأشغال المنجزة (Décompte des Travaux)</h3>
                  <p className="text-xs text-zinc-400">وثيقة رسمية لتقديمها للزبون أو المهندس المعماري</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الكشف</span>
                </button>
                <button
                  onClick={() => setIsDecompteModalOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Box */}
            <div className="bg-white text-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-6 font-sans">
              
              {/* Official Header */}
              <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-zinc-900">OCHANTI MAROC - مقاولات البناء</h1>
                  <p className="text-xs text-zinc-600">كشف وتتبع تقدم الأشغال الشهرية (Attachement & Décompte)</p>
                  <p className="text-xs text-zinc-500">التاريخ: {new Date().toLocaleDateString('ar-MA')}</p>
                </div>
                <div className="text-left">
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 font-mono font-bold text-xs rounded-lg border border-amber-300">
                    DECOMPTE N° 01
                  </span>
                  <p className="text-xs text-zinc-700 font-bold mt-1.5">الورش: {currentProject.name}</p>
                  <p className="text-[11px] text-zinc-500">الزبون: {currentProject.clientName}</p>
                </div>
              </div>

              {/* High-level summary row */}
              <div className="grid grid-cols-3 gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-center font-mono">
                <div>
                  <span className="text-[11px] text-zinc-500 block">المبلغ الإجمالي للصفقة</span>
                  <span className="text-sm font-black text-zinc-900">{(cpsSummary.totalPlannedAmount ?? 0).toLocaleString()} MAD</span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block">المبلغ المنجز المستحق</span>
                  <span className="text-sm font-black text-emerald-700">{(cpsSummary.totalExecutedAmount ?? 0).toLocaleString()} MAD</span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block">النسبة الإجمالية للتقدم</span>
                  <span className="text-sm font-black text-amber-700">{cpsSummary.progressPct}%</span>
                </div>
              </div>

              {/* Articles Table in Document */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-[11px] border border-zinc-300">
                  <thead className="bg-zinc-100 text-zinc-800 border-b border-zinc-300 font-bold">
                    <tr>
                      <th className="p-2 border-l border-zinc-300">N°</th>
                      <th className="p-2 border-l border-zinc-300">Désignation des travaux</th>
                      <th className="p-2 border-l border-zinc-300 text-center">Unité</th>
                      <th className="p-2 border-l border-zinc-300 text-left">P.U (MAD)</th>
                      <th className="p-2 border-l border-zinc-300 text-left">Qté Prévue</th>
                      <th className="p-2 border-l border-zinc-300 text-left">Qté Réalisée</th>
                      <th className="p-2 border-l border-zinc-300 text-left">Montant Réalisé</th>
                      <th className="p-2 text-center">% Avancement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {projectArticles.map(art => (
                      <tr key={art.id} className="hover:bg-zinc-50">
                        <td className="p-2 border-l border-zinc-300 font-mono font-bold">{art.articleNumber}</td>
                        <td className="p-2 border-l border-zinc-300 font-semibold">{art.designation}</td>
                        <td className="p-2 border-l border-zinc-300 text-center font-mono">{art.unit}</td>
                        <td className="p-2 border-l border-zinc-300 text-left font-mono">{(art.unitPrice ?? 0).toLocaleString()}</td>
                        <td className="p-2 border-l border-zinc-300 text-left font-mono">{(art.quantityPlanned ?? 0).toLocaleString()}</td>
                        <td className="p-2 border-l border-zinc-300 text-left font-mono font-bold text-zinc-900">{(art.quantityExecuted ?? 0).toLocaleString()}</td>
                        <td className="p-2 border-l border-zinc-300 text-left font-mono font-bold text-zinc-900">{(art.executedAmount ?? 0).toLocaleString()} MAD</td>
                        <td className="p-2 text-center font-mono font-bold text-zinc-900">{art.progressPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-100 font-bold border-t-2 border-zinc-400 text-zinc-900 font-mono">
                    <tr>
                      <td colSpan={6} className="p-2.5 text-left font-bold">المجموع العام للأشغال المنجزة (Total HT):</td>
                      <td className="p-2.5 text-left text-sm font-black text-emerald-800">
                        {(cpsSummary.totalExecutedAmount ?? 0).toLocaleString()} MAD
                      </td>
                      <td className="p-2.5 text-center font-black">{cpsSummary.progressPct}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-zinc-300 text-xs">
                <div className="text-center space-y-8">
                  <p className="font-bold text-zinc-700">توقيع وخاتم المقاول (L'Entreprise):</p>
                  <p className="text-zinc-400">....................................................</p>
                </div>
                <div className="text-center space-y-8">
                  <p className="font-bold text-zinc-700">تأشيرة المشرف / صاحب المشروع (Maître d'Ouvrage):</p>
                  <p className="text-zinc-400">....................................................</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
