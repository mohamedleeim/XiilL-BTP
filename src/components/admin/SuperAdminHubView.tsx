import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldAlert, 
  ShieldCheck, 
  UserPlus, 
  KeyRound, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Trash2, 
  RefreshCw, 
  ExternalLink,
  ListChecks,
  Users,
  Building2,
  Lock,
  Eye,
  Sliders,
  Share2,
  Crown,
  Zap,
  Calendar
} from 'lucide-react';
import { generateUniqueAdminId, SUPER_ADMIN_EMAIL } from '../../services/googleWorkspace';
import { SupervisorPermissions, SubscriptionTier } from '../../types';
import { 
  formatTierLabel, 
  computeAutoStatus, 
  formatSheetDate, 
  calculateDaysRemaining 
} from '../../services/subscriptionPlans';

export const SuperAdminHubView: React.FC = () => {
  const { 
    state, 
    currentAdmin, 
    adminAccounts, 
    registerNewAdmin, 
    updateAdminStatus, 
    deleteAdmin,
    updateAdminSubscription,
    superAdminMode,
    setSuperAdminMode,
    switchActiveAdmin,
    updateSupervisorPermissions,
    assignSupervisorProjects,
    workspaceConfig,
    createMasterSheet,
    inspectAndConnectMasterSheet,
    syncToGoogleSheets,
    syncAdminsFromMasterSheet,
    isGoogleAuthenticated,
    googleUser,
    resetToCleanData,
    isPlatformSuperAdmin
  } = useApp();

  // New Admin Form State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newTier, setNewTier] = useState<SubscriptionTier>('trial_3days');
  const [generatedId, setGeneratedId] = useState(() => generateUniqueAdminId(adminAccounts.map(a => a.id)));
  
  // UI States
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingAdmins, setIsSyncingAdmins] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isInspectingSheet, setIsInspectingSheet] = useState(false);
  const [sheetInspectionResult, setSheetInspectionResult] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  const handleSyncAdmins = async () => {
    setIsSyncingAdmins(true);
    try {
      const res = await syncAdminsFromMasterSheet();
      setNotification({
        type: 'success',
        text: res.message
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'فشلت المزامنة من Google Sheets'
      });
    } finally {
      setIsSyncingAdmins(false);
    }
  };

  // Supervisor Permissions State
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>(() => {
    const firstSup = state.users.find(u => u.role === 'supervisor');
    return firstSup?.id || state.users[0]?.id || '';
  });

  const selectedSupervisor = state.users.find(u => u.id === selectedSupervisorId);

  const [supervisorPerms, setSupervisorPerms] = useState<SupervisorPermissions>({
    canRecordAttendance: selectedSupervisor?.permissions?.canRecordAttendance ?? true,
    canRecordExpenses: selectedSupervisor?.permissions?.canRecordExpenses ?? true,
    canRecordPurchases: selectedSupervisor?.permissions?.canRecordPurchases ?? true,
    canUpdateCps: selectedSupervisor?.permissions?.canUpdateCps ?? true,
    canViewFinancials: selectedSupervisor?.permissions?.canViewFinancials ?? false,
    canAddWorkers: selectedSupervisor?.permissions?.canAddWorkers ?? true
  });

  const [supervisorProjects, setSupervisorProjects] = useState<string[]>(
    selectedSupervisor?.assignedProjectIds || ['*']
  );

  // When supervisor selection changes
  const handleSelectSupervisor = (id: string) => {
    setSelectedSupervisorId(id);
    const sup = state.users.find(u => u.id === id);
    if (sup) {
      setSupervisorPerms({
        canRecordAttendance: sup.permissions?.canRecordAttendance ?? true,
        canRecordExpenses: sup.permissions?.canRecordExpenses ?? true,
        canRecordPurchases: sup.permissions?.canRecordPurchases ?? true,
        canUpdateCps: sup.permissions?.canUpdateCps ?? true,
        canViewFinancials: sup.permissions?.canViewFinancials ?? false,
        canAddWorkers: sup.permissions?.canAddWorkers ?? true
      });
      setSupervisorProjects(sup.assignedProjectIds || ['*']);
    }
  };

  const handleRegenerateId = () => {
    setGeneratedId(generateUniqueAdminId(adminAccounts.map(a => a.id)));
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) {
      setNotification({ type: 'error', text: 'يرجى إدخال البريد الإلكتروني والاسم.' });
      return;
    }

    setIsRegistering(true);
    setNotification(null);

    try {
      const created = await registerNewAdmin({
        email: newEmail.trim(),
        name: newName.trim(),
        companyName: newCompanyName.trim() || undefined,
        phone: newPhone.trim() || undefined,
        notes: newNotes.trim() || undefined,
        subscriptionTier: newTier
      });

      setNotification({
        type: 'success',
        text: `تم تسجيل الأدمين بنجاح بالكود: ${created.id} وإضافته لورقة Admin_Registry في Google Sheets!`
      });

      // Reset form & generate new id for next
      setNewEmail('');
      setNewName('');
      setNewCompanyName('');
      setNewPhone('');
      setNewNotes('');
      setGeneratedId(generateUniqueAdminId([...adminAccounts.map(a => a.id), created.id]));
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشل تسجيل الأدمين الجديد.' });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSaveSupervisorSettings = () => {
    if (!selectedSupervisorId) return;
    updateSupervisorPermissions(selectedSupervisorId, supervisorPerms);
    assignSupervisorProjects(selectedSupervisorId, supervisorProjects);
    setNotification({
      type: 'success',
      text: `تم حفظ وتحديث صلاحيات المشرف (${selectedSupervisor?.name}) بنجاح!`
    });
  };

  const handleCreateMasterSheet = async () => {
    setIsCreatingSheet(true);
    setNotification(null);
    try {
      const res = await createMasterSheet('XiilL BTP — المنظومة المركزية للأوراش');
      setNotification({
        type: 'success',
        text: res.isExisting
          ? `تم العثور على ملفك المعتمد (${res.title || 'XiilL BTP'}) وتأكيد تطابق الأوراق ورؤوس الأعمدة بنجاح!`
          : `تم إنشاء وتهيئة ملف Google Sheets الرئيسي بنجاح مع ورقة Admin_Registry لكافة الأدمينات!`
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشل فحص أو إنشاء ملف Google Sheets.' });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleInspectMasterSheet = async () => {
    setIsInspectingSheet(true);
    setNotification(null);
    try {
      const val = await inspectAndConnectMasterSheet();
      setSheetInspectionResult(val);
      setNotification({
        type: 'success',
        text: val.message
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشل فحص أوراق ورؤوس أعمدة Google Sheets.' });
    } finally {
      setIsInspectingSheet(false);
    }
  };

  const handleSyncToSheets = async () => {
    setIsSyncing(true);
    setNotification(null);
    try {
      const res = await syncToGoogleSheets();
      setNotification({
        type: 'success',
        text: res.message
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشل مزامنة البيانات مع Google Sheets.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (text: string, id: string, type: 'id' | 'invite') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedInvite(id);
      setTimeout(() => setCopiedInvite(null), 2000);
    }
  };

  const generateInviteMessage = (admin: any) => {
    return `السلام عليكم سي ${admin.name}،
مرحباً بك في نظام XiilL BTP لإدارة أوراش البناء والمقاولات.
تم تفعيل حسابك كأدمين للنظام:
🔑 كود الدخول الخاص بك: *${admin.id}*
📧 البريد المعتمد: ${admin.email}

يرجى فتح التطبيق، واختيار "مدير عام / أدمين"، ثم إدخال كود الأدمين أعلاه ومتابعة الدخول.
سيفتح لك فضاء عملك المستقل الخاص بأوراشك، مشرفيك، عمالك ومصاريفك. بالتوفيق!`;
  };

  const isSuperAdmin = isPlatformSuperAdmin;

  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-zinc-900 border border-zinc-800 rounded-3xl text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">بوابة الأدمين الكبير (Super Admin) محجوبة</h2>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
          هذه البوابة مخصصة حصرياً لمالك المنظومة الرئيسي ({SUPER_ADMIN_EMAIL}) لإنشاء وتوليد معرفات الأدمينات ومبيعات التراخيص.
          يمكنك إدارة أوراشك ومشاريعك ومشرفيك بكل حرية من فضاء عملك المستقل.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Banner & Super Admin Header */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/30 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-zinc-950 font-black shadow-md shrink-0">
              <ShieldCheck className="w-7 h-7 text-zinc-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-white">
                  بوابة الأدمين الكبير (Super Admin Central Hub)
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                  ADM-ROOT-88
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                توليد أكواد الأدمينات الجدد، تسجيلهم التلقائي في Google Sheets، وإدارة صلاحيات المشرفين
              </p>
            </div>
          </div>

          {/* Quick Central View Toggle & Clean Reset */}
          <div className="flex flex-wrap items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
            <span className="text-xs text-zinc-400 font-medium px-2">فضاء العرض:</span>
            <button
              onClick={() => { setSuperAdminMode(true); switchActiveAdmin(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                superAdminMode 
                  ? 'bg-amber-500 text-zinc-950 shadow-md' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              المنظومة المركزية (كافة الأوراش)
            </button>
            {currentAdmin && currentAdmin.role !== 'super_admin' && (
              <span className="text-xs text-amber-400 px-2 font-mono">
                محدد: {currentAdmin.name} ({currentAdmin.id})
              </span>
            )}

            {/* Clear all mock data button */}
            <button
              onClick={() => {
                if (window.confirm('هل أنت متأكد من تصفير ومسح بيانات الأوراش والعمليات اليومية (مع الحفاظ على حسابات المقاولين المعتمدين)؟')) {
                  resetToCleanData({ wipeTenants: false });
                  setNotification({
                    type: 'success',
                    text: 'تم تصفير الأوراش والعمليات بنجاح مع الحفاظ على المقاولين المعتمدين (Chantiers = 0).'
                  });
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold transition-colors cursor-pointer"
              title="تصفير الأوراش والعمليات مع الحفاظ على المقاولين"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تصفير الأوراش (0 Données)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-semibold leading-relaxed">{notification.text}</div>
          <button 
            onClick={() => setNotification(null)}
            className="text-zinc-500 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid: Admin Registration & Master Google Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECTION 1: NEW ADMIN GENERATOR FORM */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  إضافة أدمين جديد وتوليد كود غير مكرر (Générateur d'IDs)
                </h2>
                <p className="text-[11px] text-zinc-400">
                  عندما يطلب منك مقاول أن يكون أدمين، أدخل إيميله لتوليد كود يربطه بنظامه المستقل
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
              {adminAccounts.length} أدمينات مسجلين
            </span>
          </div>

          <form onSubmit={handleRegisterAdmin} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  البريد الإلكتروني (Gmail المقاول) *
                </label>
                <input
                  type="email"
                  placeholder="exemple.contractor@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-500 text-white text-xs placeholder:text-zinc-600 focus:outline-none"
                  required
                />
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  اسم الأدمين أو المقاول *
                </label>
                <input
                  type="text"
                  placeholder="مثال: سي كمال العلمي"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-500 text-white text-xs placeholder:text-zinc-600 focus:outline-none"
                  required
                />
              </div>

              {/* Company */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  اسم الشركة / المقاولة (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: سوسيتي العلمي ترافو SARL"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-500 text-white text-xs placeholder:text-zinc-600 focus:outline-none"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  رقم الهاتف (للتواصل والواتساب)
                </label>
                <input
                  type="tel"
                  placeholder="0661xxxxxx"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-500 text-white text-xs placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Generated Unique ID Preview */}
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[11px] text-zinc-400 block">كود الأدمين المولد تلقائياً (غير مكرر):</span>
                  <span className="text-sm font-mono font-extrabold text-amber-400 tracking-wider">{generatedId}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegenerateId}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="توليد كود جديد"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>توليد كود آخر</span>
                </button>
              </div>
            </div>

            {/* Subscription Tier Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>نوع الباقة الممنوحة للأدمين:</span>
                <span className="text-[10px] text-amber-400 font-normal">تسجل تلقائياً في ورقة Admin_Registry</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewTier('trial_3days')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    newTier === 'trial_3days'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="block text-xs">تجريبية 3 أيام</span>
                  <span className="block text-[10px] text-zinc-400 mt-0.5">مجانية للتجربة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewTier('monthly')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    newTier === 'monthly'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="block text-xs">باقة شهرية</span>
                  <span className="block text-[10px] text-emerald-400 mt-0.5">290 د.م / شهر</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewTier('annual')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    newTier === 'annual'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="block text-xs">باقة سنوية</span>
                  <span className="block text-[10px] text-amber-400 mt-0.5 font-semibold">خصم 25%</span>
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">ملاحظات إضافية (أوراش، مدينة، الخ)</label>
              <input
                type="text"
                placeholder="مثال: مقاول فيلات في طنجة، ورش النخيل..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-500 text-white text-xs placeholder:text-zinc-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isRegistering}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isRegistering ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>تسجيل الأدمين وتحديث ورقة Admin_Registry</span>
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 2: GOOGLE SHEETS MASTER CARD */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  ملف Google Sheets المركزي
                </h2>
                <p className="text-[11px] text-zinc-400">
                  يتضمن ورقة Admin_Registry وسجلات كافة الأوراش
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-zinc-400">
                <span>حالة الربط:</span>
                <span className={`font-bold ${isGoogleAuthenticated ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isGoogleAuthenticated ? 'متصل بـ Gmail' : 'غير متصل'}
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>ملف Google Sheets:</span>
                <span className="font-mono text-[11px] text-zinc-200">
                  {workspaceConfig.masterSheetId ? 'مفعل وجاهز' : 'غير منشأ بعد'}
                </span>
              </div>
              {workspaceConfig.lastSheetsSync && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span>آخر مزامنة:</span>
                  <span className="text-zinc-300 font-mono text-[10px]">
                    {new Date(workspaceConfig.lastSheetsSync).toLocaleTimeString('ar-MA')}
                  </span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-zinc-400 space-y-1 leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
              <p className="font-semibold text-zinc-300">أوراق العمل التلقائية داخل الملف:</p>
              <ul className="list-disc list-inside text-zinc-400 space-y-0.5 text-[10px]">
                <li><span className="text-amber-400 font-mono font-bold">Admin_Registry</span>: سجل الأكواد والأدمينات</li>
                <li>المشاريع_الأوراش: بيانات الصفقات والمقاولين</li>
                <li>بنود_CPS_والبردورو: بنود الأشغال والتقدم</li>
                <li>المشتريات والمصاريف وخلاص العمال</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {!workspaceConfig.masterSheetId ? (
              <button
                onClick={handleCreateMasterSheet}
                disabled={isCreatingSheet}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCreatingSheet ? <Loader2 className="w-4 h-4 animate-spin text-zinc-950" /> : <FileSpreadsheet className="w-4 h-4" />}
                <span>فحص Drive وربط ملف Google Sheets</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <a
                    href={workspaceConfig.masterSheetUrl || `https://docs.google.com/spreadsheets/d/${workspaceConfig.masterSheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    <span>فتح في Sheets</span>
                  </a>
                  <button
                    onClick={handleInspectMasterSheet}
                    disabled={isInspectingSheet}
                    className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-zinc-700 cursor-pointer disabled:opacity-50"
                    title="فحص الأوراق ورؤوس الأعمدة"
                  >
                    {isInspectingSheet ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <ListChecks className="w-3.5 h-3.5" />}
                    <span>فحص الأوراق</span>
                  </button>
                </div>
                <button
                  onClick={handleSyncToSheets}
                  disabled={isSyncing || isInspectingSheet}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>مزامنة كافة الجداول الآن</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 3: REGISTERED ADMINS TABLE & TENANT ISOLATION */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>سجل الأدمينات المعتمدين في المنظومة (Admin Registry)</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs">
                {adminAccounts.length}
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">
              لكل أدمين فضاء مستقل بأوراشه ومصاريفه، يمكنك نسخ كود الأدمين أو رسالة الدعوة لمشاركتها معه
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAdmins}
              disabled={isSyncingAdmins}
              className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold border border-zinc-700 text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="استيراد وتحديث المقاولين المسجلين في الشيت المركزي فوراً"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncingAdmins ? 'animate-spin' : ''}`} />
              <span>{isSyncingAdmins ? 'جارِ المزامنة...' : 'مزامنة المقاولين من Google Sheets'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-[11px]">
                <th className="py-2.5 px-3">كود الأدمين (Admin ID)</th>
                <th className="py-2.5 px-3">الاسم / المقاولة</th>
                <th className="py-2.5 px-3">البريد الإلكتروني</th>
                <th className="py-2.5 px-3">نوع الباقة</th>
                <th className="py-2.5 px-3">تاريخ البدء / الانتهاء</th>
                <th className="py-2.5 px-3">الحالة التلقائية</th>
                <th className="py-2.5 px-3 text-center">إجراءات ودعوة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {adminAccounts.map((admin) => {
                const isCurrent = currentAdmin?.id === admin.id;
                const isRoot = admin.role === 'super_admin';
                const sub = admin.subscription;
                const autoStatus = computeAutoStatus(sub, admin.status);
                const isExpired = autoStatus === 'expired';
                const daysRemaining = calculateDaysRemaining(sub);

                return (
                  <tr key={admin.id} className={`hover:bg-zinc-800/40 transition-colors ${isCurrent ? 'bg-amber-500/5' : ''}`}>
                    
                    {/* Admin ID */}
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      <div className="flex items-center gap-1.5">
                        <span>{admin.id}</span>
                        <button
                          onClick={() => copyToClipboard(admin.id, admin.id, 'id')}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                          title="نسخ الكود"
                        >
                          {copiedId === admin.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Name / Company */}
                    <td className="py-3 px-3 font-semibold text-white">
                      <div>
                        <span>{admin.name}</span>
                        {admin.companyName && (
                          <span className="text-[10px] text-zinc-400 block font-normal">{admin.companyName}</span>
                        )}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-3 text-zinc-300 font-mono text-[11px]">
                      {admin.email}
                    </td>

                    {/* Subscription Tier & Quick Switch */}
                    <td className="py-3 px-3">
                      {isRoot ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                          صلاحية دائمة
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={sub?.tier || 'trial_3days'}
                            onChange={(e) => updateAdminSubscription(admin.id, e.target.value as SubscriptionTier)}
                            className="text-[10px] bg-zinc-900 border border-zinc-700 text-amber-300 rounded px-1.5 py-1 font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                          >
                            <option value="trial_3days">تجريبية (3 أيام)</option>
                            <option value="monthly">شهرية (290 د.م)</option>
                            <option value="annual">سنوية (خصم 25%)</option>
                          </select>
                        </div>
                      )}
                    </td>

                    {/* Dates & countdown */}
                    <td className="py-3 px-3 text-zinc-300 font-mono text-[10px]">
                      {isRoot ? (
                        <span className="text-zinc-500">غير محددة</span>
                      ) : sub ? (
                        <div>
                          <div className="flex items-center gap-1 text-zinc-400">
                            <span>بدء:</span>
                            <span>{formatSheetDate(sub.startDate) || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 font-semibold">
                            <span className={isExpired ? 'text-rose-400' : 'text-zinc-300'}>انتهاء:</span>
                            <span className={isExpired ? 'text-rose-400' : 'text-zinc-200'}>{formatSheetDate(sub.endDate) || '—'}</span>
                          </div>
                          {!isExpired && (
                            <span className="text-[9px] text-amber-400/90 block">
                              (متبقي {daysRemaining} {daysRemaining === 1 ? 'يوم' : 'أيام'})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>

                    {/* Automatic Status */}
                    <td className="py-3 px-3">
                      {isRoot ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          الأدمين الكبير
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            onClick={() => updateAdminStatus(admin.id, admin.status === 'suspended' ? 'active' : 'suspended')}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              admin.status === 'suspended'
                                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                : isExpired
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                            }`}
                            title={admin.status === 'suspended' ? 'الحساب مجمد يدوياً' : isExpired ? 'انتهت فترة الاشتراك تلقائياً' : 'الحساب نشط'}
                          >
                            {admin.status === 'suspended' 
                              ? 'معطل (يدوي)' 
                              : isExpired 
                              ? 'منتهي الصلاحية (تلقائي)' 
                              : 'نشط (تلقائي)'}
                          </button>
                          {isExpired && (
                            <button
                              onClick={() => updateAdminSubscription(admin.id, 'monthly')}
                              className="text-[9px] text-amber-400 hover:underline flex items-center gap-0.5"
                            >
                              <Zap className="w-2.5 h-2.5" />
                              <span>تجديد شهر</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Copy invite message */}
                        <button
                          onClick={() => copyToClipboard(generateInviteMessage(admin), admin.id, 'invite')}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-medium flex items-center gap-1"
                          title="نسخ نص الدعوة للواتساب"
                        >
                          {copiedInvite === admin.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3 text-amber-400" />}
                          <span>دعوة WhatsApp</span>
                        </button>

                        {/* Switch to this admin's workspace view */}
                        {!isRoot && (
                          <button
                            onClick={() => switchActiveAdmin(admin.id)}
                            className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-medium flex items-center gap-1"
                            title="عرض فضاء هذا الأدمين"
                          >
                            <Eye className="w-3 h-3" />
                            <span>معاينة فضائه</span>
                          </button>
                        )}

                        {/* Delete */}
                        {!isRoot && (
                          <button
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف الأدمين (${admin.name})؟`)) {
                                deleteAdmin(admin.id);
                              }
                            }}
                            className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded"
                            title="حذف الأدمين"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: SUPERVISOR PERMISSIONS & CHANTIERS ASSIGNMENT */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-5 shadow-lg">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              إدارة وتوزيع صلاحيات المشرفين (Supervisors Permissions)
            </h2>
            <p className="text-[11px] text-zinc-400">
              يقوم الأدمين بتحديد الصلاحيات الدقيقة لكل شيف شانطي والأوراش المخصصة له
            </p>
          </div>
        </div>

        {/* Supervisor Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">اختر المشرف (Chef de chantier):</label>
            <select
              value={selectedSupervisorId}
              onChange={(e) => handleSelectSupervisor(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:border-amber-500 focus:outline-none"
            >
              {state.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.avatar || '👤'} {u.name} ({u.role === 'owner' ? 'مقاول' : 'مشرف ورش'})
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Projects Selector */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">الأوراش المأذونة للمشرف:</label>
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs">
              <label className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={supervisorProjects.includes('*')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSupervisorProjects(['*']);
                    } else {
                      setSupervisorProjects([]);
                    }
                  }}
                  className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
                />
                <span>كافة الأوراش (*)</span>
              </label>

              {!supervisorProjects.includes('*') && state.projects.map((proj) => {
                const isSelected = supervisorProjects.includes(proj.id);
                return (
                  <label key={proj.id} className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSupervisorProjects([...supervisorProjects, proj.id]);
                        } else {
                          setSupervisorProjects(supervisorProjects.filter(id => id !== proj.id));
                        }
                      }}
                      className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
                    />
                    <span>{proj.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Granular Permissions Checkboxes */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-200">الصلاحيات الممنوحة للمشرف في النظام:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={supervisorPerms.canRecordAttendance}
                onChange={(e) => setSupervisorPerms({ ...supervisorPerms, canRecordAttendance: e.target.checked })}
                className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
              />
              <div>
                <span className="text-xs font-bold text-white block">تسجيل الحضور والبوانطاج (Pointage)</span>
                <span className="text-[10px] text-zinc-400">إدخال بوانطاج العمال اليومي وحساب الساعات والتسبيقات</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={supervisorPerms.canRecordExpenses}
                onChange={(e) => setSupervisorPerms({ ...supervisorPerms, canRecordExpenses: e.target.checked })}
                className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
              />
              <div>
                <span className="text-xs font-bold text-white block">مصاريف الصندوق (Petite caisse)</span>
                <span className="text-[10px] text-zinc-400">تسجيل نفقات الورش اليومية والمحروقات ومستلزمات الموقع</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={supervisorPerms.canRecordPurchases}
                onChange={(e) => setSupervisorPerms({ ...supervisorPerms, canRecordPurchases: e.target.checked })}
                className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
              />
              <div>
                <span className="text-xs font-bold text-white block">مشتريات السلعة وبونات الموردين (BL)</span>
                <span className="text-[10px] text-zinc-400">تسجيل وصول السلعة (الإسمنت، الرمل، الحديد) وبونات التسليم</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={supervisorPerms.canUpdateCps}
                onChange={(e) => setSupervisorPerms({ ...supervisorPerms, canUpdateCps: e.target.checked })}
                className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
              />
              <div>
                <span className="text-xs font-bold text-white block">تقدم بنود CPS والبردورو (Avancement)</span>
                <span className="text-[10px] text-zinc-400">تحديث الكميات المنجزة في كل أرتيكل لحساب نسبة تقدم الورش</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={supervisorPerms.canAddWorkers}
                onChange={(e) => setSupervisorPerms({ ...supervisorPerms, canAddWorkers: e.target.checked })}
                className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
              />
              <div>
                <span className="text-xs font-bold text-white block">إضافة عمال جدد للورش</span>
                <span className="text-[10px] text-zinc-400">تسجيل بيانات وبطاقات العمال المياومين والحرفيين</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={supervisorPerms.canViewFinancials}
                onChange={(e) => setSupervisorPerms({ ...supervisorPerms, canViewFinancials: e.target.checked })}
                className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
              />
              <div>
                <span className="text-xs font-bold text-white block">الاطلاع على الأرقام المالية الحساسة</span>
                <span className="text-[10px] text-zinc-400">عرض الأرباح الصافية ومبالغ الدفعات الإجمالية للمقاول</span>
              </div>
            </label>

          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveSupervisorSettings}
            className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>حفظ وتثبيت صلاحيات المشرف</span>
          </button>
        </div>
      </div>

    </div>
  );
};
