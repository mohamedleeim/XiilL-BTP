import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Project, ProjectStatus } from '../../types';
import { 
  Building2, 
  MapPin, 
  Phone, 
  MessageSquare, 
  ArrowRight, 
  Edit3, 
  Trash2, 
  Coins, 
  CheckCircle2, 
  Layers, 
  Percent,
  Calendar,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

interface ProjectContextBannerProps {
  onNavigateTab?: (tab: string) => void;
}

export const ProjectContextBanner: React.FC<ProjectContextBannerProps> = ({ onNavigateTab }) => {
  const { 
    selectedProjectId, 
    setSelectedProjectId, 
    accessibleProjects, 
    getProjectFinancials, 
    updateProject, 
    deleteProject,
    t,
    currentUser,
    state
  } = useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showSwitchDropdown, setShowSwitchDropdown] = useState(false);

  if (selectedProjectId === 'all') return null;

  const currentProject = accessibleProjects.find(p => p.id === selectedProjectId);
  if (!currentProject) return null;

  const fin = getProjectFinancials(currentProject.id);
  const projectWorkersCount = state.workers.filter(w => w.projectIds.includes(currentProject.id)).length;
  const projectPurchasesCount = state.purchases.filter(p => p.projectId === currentProject.id).length;
  const projectExpensesCount = state.expenses.filter(e => e.projectId === currentProject.id).length;

  const openWhatsApp = (phone: string, projectName: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const moroccanPhone = cleanPhone.startsWith('0') ? `212${cleanPhone.slice(1)}` : cleanPhone;
    const msg = encodeURIComponent(`السلام عليكم، بخصوص ورش البناء (${projectName}) — تطبيق XiilL BTP`);
    window.open(`https://wa.me/${moroccanPhone}?text=${msg}`, '_blank');
  };

  const handleQuickProgressChange = (newPct: number) => {
    updateProject(currentProject.id, { progressPct: Math.min(100, Math.max(0, newPct)) });
  };

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 mb-6 shadow-xl relative overflow-hidden">
      
      {/* Subtle top indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Project Identity & Details */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-zinc-950 uppercase tracking-wider">
                فضاء الورش النشط
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                currentProject.status === 'active' 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : currentProject.status === 'completed'
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}>
                {currentProject.status === 'active' ? 'قيد الإنجاز' : currentProject.status === 'completed' ? 'مكتمل' : 'متوقف'}
              </span>
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>{currentProject.locationCity}</span>
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white truncate tracking-tight">
              {currentProject.name}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
              <span>الزبون: <strong className="text-zinc-200">{currentProject.clientName}</strong></span>
              <span className="flex items-center gap-1 font-mono text-zinc-300">
                <Phone className="w-3 h-3 text-emerald-400" />
                <span>{currentProject.clientPhone}</span>
              </span>
              <button
                onClick={() => openWhatsApp(currentProject.clientPhone, currentProject.name)}
                className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 text-[11px] font-bold"
              >
                <MessageSquare className="w-3 h-3" />
                <span>واتساب</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls & Project Switcher */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          
          {/* Quick Project Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSwitchDropdown(!showSwitchDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>تبديل الورش</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {showSwitchDropdown && (
              <div className="absolute top-full mt-1.5 rtl:left-0 ltr:right-0 w-64 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-2 z-50">
                <div className="px-2 py-1 text-[11px] text-zinc-400 font-bold border-b border-zinc-800 mb-1">
                  اختر الورش للدخول لعملياته:
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {accessibleProjects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setShowSwitchDropdown(false);
                      }}
                      className={`w-full text-right rtl:text-right ltr:text-left p-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                        p.id === currentProject.id 
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' 
                          : 'hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="truncate">
                        <p className="font-semibold text-zinc-100 truncate">{p.name}</p>
                        <p className="text-[10px] text-zinc-400">{p.locationCity} — {p.clientName}</p>
                      </div>
                      {p.id === currentProject.id && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Edit Project Button (Available to Supervisor & Owner) */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
            title="تعديل بيانات الورش والميزانية"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">تعديل الورش</span>
          </button>

          {/* Return to Global Overview */}
          <button
            onClick={() => setSelectedProjectId('all')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 text-zinc-950 rtl:rotate-0 ltr:rotate-180" />
            <span>كافة الأوراش (Vue Globale)</span>
          </button>
        </div>

      </div>

      {/* Project Financial Bar & Metrics Summary */}
      <div className="mt-4 pt-4 border-t border-zinc-800/90 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        
        <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
          <span className="text-[10px] text-zinc-400 block font-medium">الميزانية التقديرية</span>
          <span className="text-sm font-extrabold text-white tabular-nums">
            {(fin?.budget ?? currentProject?.budget ?? 0).toLocaleString()} {t.currency}
          </span>
        </div>

        <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
          <span className="text-[10px] text-zinc-400 block font-medium">إجمالي المصروف الفعلي</span>
          <span className={`text-sm font-extrabold tabular-nums ${fin?.isOverBudget ? 'text-red-400' : 'text-amber-400'}`}>
            {(fin?.totalSpent ?? 0).toLocaleString()} {t.currency}
          </span>
          <span className="text-[10px] text-zinc-500 block">({(fin?.budgetPercentage ?? 0).toFixed(0)}% من الميزانية)</span>
        </div>

        <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
          <span className="text-[10px] text-zinc-400 block font-medium">مقبوضات من الزبون</span>
          <span className="text-sm font-extrabold text-emerald-400 tabular-nums">
            {(fin?.clientReceived ?? 0).toLocaleString()} {t.currency}
          </span>
          <span className="text-[10px] text-zinc-500 block">
            المتبقي: {Math.max(0, (currentProject?.budget ?? 0) - (fin?.clientReceived ?? 0)).toLocaleString()} د.م
          </span>
        </div>

        <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium mb-1">
            <span>نسبة الإنجاز</span>
            <span className="text-amber-400 font-bold">{currentProject.progressPct}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden mb-1.5">
            <div 
              style={{ width: `${currentProject.progressPct}%` }} 
              className="bg-amber-500 h-full transition-all"
            />
          </div>
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <button 
              onClick={() => handleQuickProgressChange(currentProject.progressPct - 5)}
              className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              -5%
            </button>
            <span className="text-zinc-500">تحديث سريع</span>
            <button 
              onClick={() => handleQuickProgressChange(currentProject.progressPct + 5)}
              className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              +5%
            </button>
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditProjectQuickModal 
          project={currentProject} 
          onClose={() => setIsEditModalOpen(false)} 
        />
      )}

    </div>
  );
};

interface EditModalProps {
  project: Project;
  onClose: () => void;
}

const EditProjectQuickModal: React.FC<EditModalProps> = ({ project, onClose }) => {
  const { updateProject, deleteProject, setSelectedProjectId } = useApp();
  const [formData, setFormData] = useState({
    name: project.name,
    clientName: project.clientName,
    clientPhone: project.clientPhone,
    locationCity: project.locationCity,
    budget: project.budget,
    progressPct: project.progressPct,
    status: project.status,
    notes: project.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProject(project.id, formData);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`هل أنت متأكد من حذف ورش (${project.name}) ونقله لسلة المحذوفات؟`)) {
      deleteProject(project.id);
      setSelectedProjectId('all');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">تعديل بيانات الورش</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">اسم الورش *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">الزبون</label>
              <input
                type="text"
                required
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">هاتف الزبون</label>
              <input
                type="tel"
                required
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">المدينة</label>
              <input
                type="text"
                value={formData.locationCity}
                onChange={(e) => setFormData({ ...formData, locationCity: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">الميزانية (MAD)</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">حالة الورش</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
              >
                <option value="active">قيد الإنجاز</option>
                <option value="paused">متوقف مؤقتاً</option>
                <option value="completed">مكتمل</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">نسبة الإنجاز ({formData.progressPct}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={formData.progressPct}
                onChange={(e) => setFormData({ ...formData, progressPct: Number(e.target.value) })}
                className="w-full accent-amber-500 mt-2"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 font-bold border border-red-800/80"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف الورش</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
