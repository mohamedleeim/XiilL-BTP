import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, SupervisorPermissions } from '../../types';
import { 
  UserCog, 
  Plus, 
  ShieldCheck, 
  KeyRound, 
  Phone, 
  Building2, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Lock,
  MessageSquare,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  Briefcase,
  Check,
  X,
  Share2,
  CalendarCheck2,
  Receipt,
  Truck,
  Layers,
  DollarSign,
  Shield
} from 'lucide-react';

export const TenantSupervisorManagerView: React.FC = () => {
  const { 
    accessibleSupervisors, 
    accessibleProjects, 
    addUser, 
    updateUser, 
    deleteUser, 
    toggleUserStatus,
    currentAdmin,
    isPlatformSuperAdmin
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [visiblePinUserId, setVisiblePinUserId] = useState<string | null>(null);
  const [copiedSuccessId, setCopiedSuccessId] = useState<string | null>(null);

  // Form State
  const defaultPerms: SupervisorPermissions = {
    canRecordAttendance: true,
    canRecordExpenses: true,
    canRecordPurchases: true,
    canUpdateCps: true,
    canViewFinancials: false,
    canAddWorkers: true
  };

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    pinCode: '1234',
    assignedProjectIds: [] as string[],
    permissions: defaultPerms,
    avatar: '👷‍♂️'
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        phone: user.phone || '',
        pinCode: user.pinCode || '1234',
        assignedProjectIds: user.assignedProjectIds || [],
        permissions: user.permissions || defaultPerms,
        avatar: user.avatar || '👷‍♂️'
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        phone: '',
        pinCode: Math.floor(1000 + Math.random() * 9000).toString(),
        assignedProjectIds: accessibleProjects.length > 0 ? [accessibleProjects[0].id] : [],
        permissions: defaultPerms,
        avatar: '👷‍♂️'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.pinCode.trim()) return;

    if (editingUser) {
      updateUser(editingUser.id, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        pinCode: formData.pinCode.trim(),
        assignedProjectIds: formData.assignedProjectIds,
        permissions: formData.permissions,
        avatar: formData.avatar
      });
    } else {
      addUser({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        pinCode: formData.pinCode.trim(),
        role: 'supervisor',
        active: true,
        assignedProjectIds: formData.assignedProjectIds,
        permissions: formData.permissions,
        avatar: formData.avatar,
        adminId: currentAdmin?.id
      });
    }
    setIsModalOpen(false);
  };

  const toggleProjectSelection = (projectId: string) => {
    setFormData(prev => {
      const exists = prev.assignedProjectIds.includes(projectId);
      if (exists) {
        return { ...prev, assignedProjectIds: prev.assignedProjectIds.filter(id => id !== projectId) };
      } else {
        return { ...prev, assignedProjectIds: [...prev.assignedProjectIds, projectId] };
      }
    });
  };

  const handleWhatsAppShare = (user: User) => {
    const assignedProjectNames = accessibleProjects
      .filter(p => user.assignedProjectIds?.includes(p.id))
      .map(p => p.name)
      .join('، ') || 'كافة الأوراش';

    const text = `السلام عليكم سي ${user.name}،%0A%0Aإليك بيانات دخولك كمشرف ورش في منظومة البناء (XiilL BTP):%0A🔑 كود الدخول السري (PIN): ${user.pinCode || '1234'}%0A🏢 الأوراش المعينة لك: ${assignedProjectNames}%0A🌐 رابط المنظومة: ${window.location.origin}%0A%0Aبالتوفيق في تتبع ومراقبة أشغال الورش.`;
    
    const cleanPhone = (user.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '212' + cleanPhone.substring(1) : cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleCopyCredentials = (user: User) => {
    const assignedProjectNames = accessibleProjects
      .filter(p => user.assignedProjectIds?.includes(p.id))
      .map(p => p.name)
      .join('، ') || 'كافة الأوراش';

    const text = `بيانات دخول المشرف: ${user.name}\nكود الدخول (PIN): ${user.pinCode || '1234'}\nالأوراش المعينة: ${assignedProjectNames}\nالرابط: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedSuccessId(user.id);
    setTimeout(() => setCopiedSuccessId(null), 2000);
  };

  // Stats
  const totalSupervisors = accessibleSupervisors.length;
  const activeSupervisors = accessibleSupervisors.filter(u => u.active).length;
  const withFinancialsCount = accessibleSupervisors.filter(u => u.permissions?.canViewFinancials).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 p-5 sm:p-6 rounded-3xl border border-zinc-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>إدارة المشرفين والصلاحيات (Chefs de Chantier)</span>
              </h1>
              <p className="text-xs text-zinc-400">
                فضاء التحكم المستقل الخاص بمقاولتك: إضافة مشرفي الأوراش، تعيين مشاريعهم، وتحديد صلاحيات كل شيف شانطي
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-[11px] font-medium flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              <span>فضاء المقاول:</span>
              <strong className="text-white">{currentAdmin?.name || 'المدير العام'}</strong>
              <span className="font-mono text-amber-400 text-[10px]">({currentAdmin?.id || 'ADM-LOCAL'})</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
              نظام مستقل 100%
            </span>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/10 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-zinc-950 stroke-[3]" />
          <span>إضافة شيف شانطي جديد</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl">
          <span className="text-xs text-zinc-400 block mb-1">إجمالي المشرفين الميدانيين</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{totalSupervisors}</span>
            <Users className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">مسجلين بمقاولتك</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl">
          <span className="text-xs text-zinc-400 block mb-1">المشرفين النشطين</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">{activeSupervisors}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-[11px] text-emerald-500/80 mt-1 block">يمكنهم تسجيل البوانطاج</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl">
          <span className="text-xs text-zinc-400 block mb-1">الأوراش الخاضعة للمتابعة</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-400">{accessibleProjects.length}</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[11px] text-amber-500/80 mt-1 block">أوراشك الخاصة</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl">
          <span className="text-xs text-zinc-400 block mb-1">صلاحية رؤية المالية</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-400">{withFinancialsCount}</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">مشرفين موثوقين</span>
        </div>
      </div>

      {/* Supervisors Grid */}
      {accessibleSupervisors.length === 0 ? (
        <div className="bg-zinc-900/60 border border-dashed border-zinc-800 rounded-3xl p-10 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">لم تقم بإضافة أي شيف شانطي بعد</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            قم بإضافة مشرفي أوراشك الميدانيين لتمنحهم إمكانية تسجيل الحضور اليومي، بونات السلعة، ومصاريف الورش مباشرة من هواتفهم.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول شيف شانطي الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accessibleSupervisors.map((user) => {
            const userProjects = accessibleProjects.filter(p => user.assignedProjectIds?.includes(p.id));
            const isPinVisible = visiblePinUserId === user.id;
            const perms = user.permissions || defaultPerms;

            return (
              <div
                key={user.id}
                className={`bg-zinc-900 border rounded-3xl p-5 shadow-md flex flex-col justify-between transition-all ${
                  user.active ? 'border-zinc-800 hover:border-zinc-700' : 'border-red-500/30 opacity-75'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Avatar, Name & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl shadow-inner shrink-0">
                        {user.avatar || '👷‍♂️'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-extrabold text-white truncate">{user.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                          {user.phone ? (
                            <span className="font-mono flex items-center gap-1">
                              <Phone className="w-3 h-3 text-zinc-500" />
                              <span dir="ltr">{user.phone}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-600">بدون هاتف</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleUserStatus(user.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                        user.active 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                          : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                      }`}
                      title="انقر لتفعيل أو تجميد حساب المشرف"
                    >
                      {user.active ? 'نشط (Actif)' : 'مجمّد (Bloqué)'}
                    </button>
                  </div>

                  {/* PIN & Login Security Box */}
                  <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>رمز الدخول (PIN):</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-400 tracking-wider">
                          {isPinVisible ? user.pinCode || '1234' : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setVisiblePinUserId(isPinVisible ? null : user.id)}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                          title={isPinVisible ? 'إخفاء الرمز' : 'إظهار الرمز'}
                        >
                          {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Quick WhatsApp Share & Copy */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/60">
                      <button
                        onClick={() => handleWhatsAppShare(user)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="إرسال بيانات الدخول للشيف شانطي عبر واتساب"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-400" />
                        <span>إرسال بـ WhatsApp</span>
                      </button>

                      <button
                        onClick={() => handleCopyCredentials(user)}
                        className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="نسخ بيانات الدخول"
                      >
                        {copiedSuccessId === user.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3 h-3" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Assigned Chantiers */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-zinc-400 block">
                      الأوراش المدارة ({userProjects.length}):
                    </span>
                    {userProjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {userProjects.map(proj => (
                          <span
                            key={proj.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 text-[10px] font-medium"
                          >
                            <Building2 className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{proj.name}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-500 block italic">لم يتم تعيين أي ورش لهذا المشرف بعد</span>
                    )}
                  </div>

                  {/* Permissions Pills */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
                    <span className="text-[11px] font-bold text-zinc-400 block">الصلاحيات الممنوحة:</span>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <span className={`px-2 py-1 rounded-md flex items-center gap-1 ${perms.canRecordAttendance ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800/50 text-zinc-500 line-through'}`}>
                        <CalendarCheck2 className="w-3 h-3" />
                        <span>البوانطاج (Pointage)</span>
                      </span>

                      <span className={`px-2 py-1 rounded-md flex items-center gap-1 ${perms.canRecordPurchases ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800/50 text-zinc-500 line-through'}`}>
                        <Truck className="w-3 h-3" />
                        <span>بونات السلعة (BL)</span>
                      </span>

                      <span className={`px-2 py-1 rounded-md flex items-center gap-1 ${perms.canRecordExpenses ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800/50 text-zinc-500 line-through'}`}>
                        <Receipt className="w-3 h-3" />
                        <span>مصاريف الصندوق</span>
                      </span>

                      <span className={`px-2 py-1 rounded-md flex items-center gap-1 ${perms.canUpdateCps ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800/50 text-zinc-500 line-through'}`}>
                        <Layers className="w-3 h-3" />
                        <span>تقدم بنود CPS</span>
                      </span>

                      <span className={`px-2 py-1 rounded-md flex items-center gap-1 ${perms.canViewFinancials ? 'bg-amber-500/15 text-amber-300 font-bold' : 'bg-zinc-800/50 text-zinc-500'}`}>
                        <DollarSign className="w-3 h-3" />
                        <span>{perms.canViewFinancials ? 'رؤية الميزانية ✓' : 'حجب المالية ✕'}</span>
                      </span>

                      <span className={`px-2 py-1 rounded-md flex items-center gap-1 ${perms.canAddWorkers ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800/50 text-zinc-500 line-through'}`}>
                        <Users className="w-3 h-3" />
                        <span>إضافة عمال</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-4 mt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenModal(user)}
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>تعديل الصلاحيات</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`هل أنت متأكد من حذف حساب المشرف "${user.name}"؟`)) {
                        deleteUser(user.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                    title="حذف حساب المشرف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT SUPERVISOR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl text-zinc-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {editingUser ? `تعديل صلاحيات الشيف شانطي (${editingUser.name})` : 'إضافة شيف شانطي جديد (Nouveau Chef)'}
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    حدد الأوراش المصرح له بالوصول إليها وضبط صلاحياته الميدانية
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Role Selection (Single Option for Contractor: Supervisor) */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  الرول / المنصب الوظيفي (Role) <span className="text-amber-400">*</span>
                </label>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-amber-300">
                      مشرف ورش (Chef de Chantier / Conducteur de Travaux)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30">
                    اختيار وحيد معتمد للمقاول
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  بصفتك مقاولاً / مديراً عاماً، يقتصر دور أعضاء فريقك في المنظومة على رول (مشرف ورش) لإدارة وتتبع الأوراش المحددة لهم.
                </p>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">الاسم الكامل للمشرف *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: يوسف العلمي (Chef de chantier)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">رقم الهاتف (للتواصل وواتساب)</label>
                  <input
                    type="tel"
                    placeholder="0661234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* PIN Code & Avatar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">رمز الدخول السري PIN (4 أرقام) *</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={4}
                      required
                      placeholder="1234"
                      value={formData.pinCode}
                      onChange={(e) => setFormData({ ...formData, pinCode: e.target.value.replace(/[^0-9]/g, '') })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-amber-400 font-mono font-bold tracking-widest text-center text-sm focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pinCode: Math.floor(1000 + Math.random() * 9000).toString() })}
                      className="absolute left-2 top-2 text-[10px] text-zinc-400 hover:text-amber-400 bg-zinc-800 px-2 py-0.5 rounded cursor-pointer"
                    >
                      توليد تلقائي
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">الأيقونة (Avatar)</label>
                  <div className="flex gap-2">
                    {['👷‍♂️', '👷‍♀️', '👨‍💼', '📐', '🏗️'].map(emoji => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setFormData({ ...formData, avatar: emoji })}
                        className={`text-xl p-1.5 rounded-xl border transition-all ${
                          formData.avatar === emoji 
                            ? 'bg-amber-500/20 border-amber-500 scale-110' 
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Assigned Chantiers */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <label className="block text-zinc-200 font-bold">
                  الأوراش المسموح للمشرف بالوصول إليها وإدارتها:
                </label>
                <p className="text-[11px] text-zinc-400">
                  حدد الأوراش التي يعمل بها هذا المشرف (لن يتمكن من رؤية أو تعديل أي ورش آخر):
                </p>

                {accessibleProjects.length === 0 ? (
                  <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-500 text-xs text-center">
                    ليس لديك أوراش مسجلة حالياً. يمكنك إضافة المشرف الآن وتعيين الورش لاحقاً.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                    {accessibleProjects.map(proj => {
                      const isSelected = formData.assignedProjectIds.includes(proj.id);
                      return (
                        <button
                          type="button"
                          key={proj.id}
                          onClick={() => toggleProjectSelection(proj.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-right transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-amber-500/15 border-amber-500/40 text-white font-bold' 
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center text-xs shrink-0 ${
                            isSelected ? 'bg-amber-500 text-zinc-950 font-bold' : 'border border-zinc-700'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="truncate text-xs">{proj.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Granular Permissions */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="block text-zinc-200 font-bold">
                  ضبط الصلاحيات الميدانية الدقيقة:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canRecordAttendance}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canRecordAttendance: e.target.checked }
                      })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                    />
                    <div className="text-[11px]">
                      <span className="font-bold text-white block">تسجيل الحضور (Pointage)</span>
                      <span className="text-zinc-400 text-[10px]">بوانطاج العمال والساعات الإضافية</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canRecordPurchases}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canRecordPurchases: e.target.checked }
                      })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                    />
                    <div className="text-[11px]">
                      <span className="font-bold text-white block">بونات السلعة والمواد (BL)</span>
                      <span className="text-zinc-400 text-[10px]">تسجيل استلام الإسمنت، الحديد، والسلعة</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canRecordExpenses}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canRecordExpenses: e.target.checked }
                      })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                    />
                    <div className="text-[11px]">
                      <span className="font-bold text-white block">مصاريف الصندوق (Petite caisse)</span>
                      <span className="text-zinc-400 text-[10px]">نفقات الوقود والنقل والأدوات الصغيرة</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canUpdateCps}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canUpdateCps: e.target.checked }
                      })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                    />
                    <div className="text-[11px]">
                      <span className="font-bold text-white block">تحديث تقدم بنود CPS</span>
                      <span className="text-zinc-400 text-[10px]">تعديل الكميات المنجزة من البردورو</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canAddWorkers}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canAddWorkers: e.target.checked }
                      })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                    />
                    <div className="text-[11px]">
                      <span className="font-bold text-white block">إضافة عمال جدد</span>
                      <span className="text-zinc-400 text-[10px]">تسجيل بنائين وعمال جدد في الورش</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    formData.permissions.canViewFinancials 
                      ? 'bg-amber-500/10 border-amber-500/40' 
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canViewFinancials}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canViewFinancials: e.target.checked }
                      })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                    />
                    <div className="text-[11px]">
                      <span className={`font-bold block ${formData.permissions.canViewFinancials ? 'text-amber-300' : 'text-zinc-300'}`}>
                        رؤية الأرقام المالية والميزانية
                      </span>
                      <span className="text-zinc-400 text-[10px]">اتركه غير محدد لحجب الميزانية والأرباح</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black shadow-lg shadow-amber-500/10 transition-colors cursor-pointer"
                >
                  {editingUser ? 'حفظ التعديلات' : 'تأكيد وإضافة المشرف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
