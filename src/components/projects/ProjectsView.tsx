import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Project, ProjectStatus } from '../../types';
import { ProjectContextBanner } from '../common/ProjectContextBanner';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Calendar, 
  Coins, 
  UserCheck, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  ArrowRight, 
  Users, 
  Truck, 
  Receipt,
  Sparkles
} from 'lucide-react';
import { cpsTemplates } from '../../db/seedData';

export const ProjectsView: React.FC = () => {
  const { 
    accessibleProjects, 
    selectedProjectId,
    setSelectedProjectId,
    addProject, 
    updateProject, 
    deleteProject, 
    getProjectFinancials,
    importCpsTemplate,
    state, 
    t, 
    currentUser 
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');

  // Form state
  const [formData, setFormData] = useState({
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

  const filteredProjects = accessibleProjects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.clientName.toLowerCase().includes(search.toLowerCase()) ||
                          p.locationCity.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openCreateModal = () => {
    setEditingProject(null);
    setSelectedTemplateId('villa'); // default to Moroccan Villa template
    setFormData({
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
    setIsModalOpen(true);
  };

  const openEditModal = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(proj);
    setSelectedTemplateId('none');
    setFormData({
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
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientName) return;

    if (editingProject) {
      updateProject(editingProject.id, formData);
    } else {
      const newProj = addProject(formData);
      if (selectedTemplateId && selectedTemplateId !== 'none' && newProj?.id) {
        importCpsTemplate(newProj.id, selectedTemplateId);
      }
    }
    setIsModalOpen(false);
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
      
      {/* If a project is currently selected, display context banner */}
      {selectedProjectId !== 'all' && (
        <ProjectContextBanner />
      )}

      {/* Top Controls: Title, Search, Filter & New Project CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-500" />
            <span>إدارة الأوراش ومشاريع البناء</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            اختر أي ورش للدخول لعملياته المستقلة (عمال، حضور، سلعة، مصاريف، خلاص السيمانة)
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-zinc-950" />
          <span>إنشاء ورش جديد</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3 rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="البحث باسم الورش، الزبون، أو المدينة (الدار البيضاء، مراكش، طنجة...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 py-2 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 py-2 px-3 focus:outline-none focus:border-amber-500"
          >
            <option value="all">جميع الحالات ({accessibleProjects.length})</option>
            <option value="active">قيد الإنجاز</option>
            <option value="completed">مكتمل</option>
            <option value="paused">متوقف مؤقتاً</option>
          </select>
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const fin = getProjectFinancials(project.id);
          const supervisors = state.users.filter(u => project.assignedSupervisorIds.includes(u.id));
          const projectWorkers = state.workers.filter(w => w.projectIds.includes(project.id));
          const projectCpsArticles = state.cpsArticles.filter(a => a.projectId === project.id && !a.isDeleted);
          const isSelected = selectedProjectId === project.id;

          return (
            <div
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={`rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/90'
              }`}
            >
              <div>
                {/* Status Badge & Location */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      project.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : project.status === 'completed'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {project.status === 'active' ? t.statusActive : project.status === 'completed' ? t.statusCompleted : t.statusPaused}
                    </span>

                    {projectCpsArticles.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-amber-400" />
                        <span>{projectCpsArticles.length} بنود CPS</span>
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{project.locationCity}</span>
                  </span>
                </div>

                {/* Project Title */}
                <h3 className="text-base font-bold text-white mb-1.5 leading-snug">
                  {project.name}
                </h3>

                {/* Client Info */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5 mb-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-zinc-400">الزبون:</span>
                    <span className="font-semibold text-white truncate max-w-[160px]">{project.clientName}</span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>{project.clientPhone}</span>
                    </span>
                    <button
                      onClick={(e) => openWhatsApp(project.clientPhone, project.name, e)}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>واتساب</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-400 font-medium flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>نسبة تقدم الأشغال (CPS):</span>
                    </span>
                    <span className="font-bold text-amber-400 tabular-nums">{project.progressPct}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${project.progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/60 text-xs mb-3">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">الميزانية التقديرية</span>
                    <span className="font-bold text-zinc-200 tabular-nums">{(project?.budget ?? 0).toLocaleString()} {t.currency}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">المصروف الفعلي</span>
                    <span className={`font-bold tabular-nums ${fin?.isOverBudget ? 'text-red-400' : 'text-zinc-200'}`}>
                      {(fin?.totalSpent ?? 0).toLocaleString()} {t.currency}
                    </span>
                  </div>
                </div>

                {/* Workers count snapshot */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-3 px-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>العمال المسجلون: <strong className="text-zinc-200">{projectWorkers.length}</strong></span>
                  </span>
                  <span>بداية: {project.startDate}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                
                {/* Enter Project Workspace CTA Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProjectId(project.id);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{isSelected ? 'الورش النشط' : 'دخول الورش 🏗️'}</span>
                </button>

                <button
                  onClick={(e) => openEditModal(project, e)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  title="تعديل الورش"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                
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
        <div className="text-center py-16 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6">
          <Building2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-300 mb-1">لا يوجد أي ورش يطابق البحث</h3>
          <p className="text-xs text-zinc-500 mb-4">قم بإنشاء ورش بناء جديد لبدء تسجيل الحضور والمشتريات</p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
          >
            إنشاء ورش جديد
          </button>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">
              {editingProject ? 'تعديل بيانات الورش' : 'إنشاء ورش بناء جديد'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">اسم الورش أو المشروع *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: بناء فيلا عصرية — بوسكورة"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">هاتف الزبون *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0661234567"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
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
                    value={formData.locationCity}
                    onChange={(e) => setFormData({ ...formData, locationCity: e.target.value })}
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
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">تاريخ انطلاق الأشغال</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">الحالة</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
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
                  نسبة تقدم الأشغال الأولية ({formData.progressPct}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formData.progressPct}
                  onChange={(e) => setFormData({ ...formData, progressPct: Number(e.target.value) })}
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
                  onClick={() => setIsModalOpen(false)}
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
