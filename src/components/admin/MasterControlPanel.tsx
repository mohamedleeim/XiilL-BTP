import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Crown,
  ShieldCheck,
  Building2,
  Users,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  FileSpreadsheet,
  HardDrive,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  RefreshCw,
  Lock,
  Eye,
  Share2,
  LogOut,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Activity,
  Database,
  Download,
  Upload,
  UploadCloud,
  X,
  AlertCircle,
  CheckCheck,
  ListChecks,
  SlidersHorizontal,
  Table,
  MessageCircle,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import {
  generateUniqueAdminId,
  SUPER_ADMIN_EMAIL,
  KNOWN_MASTER_SPREADSHEET_ID,
  KNOWN_MASTER_SPREADSHEET_TITLE,
  SheetValidationResult,
  BTP_STANDARD_SHEETS,
  buildAdminWhatsAppUrl,
  buildAdminWhatsAppMessage
} from '../../services/googleWorkspace';
import { AdminAccount, SubscriptionTier } from '../../types';
import { getTierDurationInfo } from '../../services/subscriptionPlans';

interface MasterControlPanelProps {
  onInspectTenant?: (tenantId: string) => void;
}

export const MasterControlPanel: React.FC<MasterControlPanelProps> = ({ onInspectTenant }) => {
  const {
    state,
    adminAccounts,
    registerNewAdmin,
    updateAdminStatus,
    deleteAdmin,
    workspaceConfig,
    createMasterSheet,
    inspectAndConnectMasterSheet,
    syncToGoogleSheets,
    syncAdminsFromMasterSheet,
    pushAdminsToMasterSheet,
    wipeCloudSheetsData,
    backupToDrive,
    exportBackupJson,
    importBackupJson,
    resetToCleanData,
    logoutSession
  } = useApp();

  type MasterTab = 'overview' | 'tenants' | 'cloud' | 'audit' | 'maintenance';
  const [activeTab, setActiveTab] = useState<MasterTab>('overview');

  // Tenant search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Modal: Register New Tenant
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPin, setNewPin] = useState('1234');
  const [newNotes, setNewNotes] = useState('');
  const [newRole, setNewRole] = useState<'admin'>('admin');
  const [newTier, setNewTier] = useState<SubscriptionTier>('trial_3days');
  const [registeredSuccessAdmin, setRegisteredSuccessAdmin] = useState<AdminAccount | null>(null);
  const [generatedId, setGeneratedId] = useState(() => generateUniqueAdminId(adminAccounts.map(a => a.id)));

  // UI state
  const [loading, setLoading] = useState(false);
  const [isSyncingAdmins, setIsSyncingAdmins] = useState(false);
  const [isPushingAdmins, setIsPushingAdmins] = useState(false);
  const [isWipingCloud, setIsWipingCloud] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  const handlePushAdminsToSheet = async () => {
    setIsPushingAdmins(true);
    setNotification(null);
    try {
      const res = await pushAdminsToMasterSheet();
      setNotification({
        type: 'success',
        text: res.message
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'فشل دفع قائمة المقاولين إلى Google Sheets'
      });
    } finally {
      setIsPushingAdmins(false);
    }
  };

  const handleSyncAdminsFromSheet = async () => {
    setIsSyncingAdmins(true);
    setNotification(null);
    try {
      const res = await syncAdminsFromMasterSheet();
      setNotification({
        type: 'success',
        text: res.message
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'فشلت المزامنة مع الشيت المركزي'
      });
    } finally {
      setIsSyncingAdmins(false);
    }
  };

  // Sheets Verification & Schema State
  const [isInspecting, setIsInspecting] = useState(false);
  const [sheetValidation, setSheetValidation] = useState<SheetValidationResult | null>(null);
  const [manualSheetInput, setManualSheetInput] = useState('');
  const [isEditingSheetUrl, setIsEditingSheetUrl] = useState(false);

  // Filtered tenants (exclude root super admin from customer list)
  const customerTenants = useMemo(() => {
    return adminAccounts.filter(a => a.role !== 'super_admin');
  }, [adminAccounts]);

  const filteredTenants = useMemo(() => {
    return customerTenants.filter(admin => {
      const matchesSearch =
        admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (admin.companyName && admin.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (admin.phone && admin.phone.includes(searchQuery));

      const matchesStatus =
        statusFilter === 'all' || admin.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customerTenants, searchQuery, statusFilter]);

  // Global KPIs across whole platform
  const globalStats = useMemo(() => {
    const totalTenants = customerTenants.length;
    const activeLicenses = customerTenants.filter(t => t.status === 'active').length;
    const suspendedLicenses = customerTenants.filter(t => t.status === 'suspended').length;
    const totalProjects = state.projects.length;
    const totalWorkers = state.workers.length;
    const totalPurchasesCount = state.purchases.length;
    const totalExpensesCount = state.expenses.length;

    return {
      totalTenants,
      activeLicenses,
      suspendedLicenses,
      totalProjects,
      totalWorkers,
      totalPurchasesCount,
      totalExpensesCount
    };
  }, [customerTenants, state.projects, state.workers, state.purchases, state.expenses]);

  const handleRegenerateId = () => {
    setGeneratedId(generateUniqueAdminId(adminAccounts.map(a => a.id)));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) {
      setNotification({ type: 'error', text: 'يرجى ملء البريد الإلكتروني والاسم على الأقل.' });
      return;
    }

    setLoading(true);
    setNotification(null);
    try {
      const created = await registerNewAdmin({
        email: newEmail.trim(),
        name: newName.trim(),
        companyName: newCompanyName.trim() || undefined,
        phone: newPhone.trim() || undefined,
        pin: newPin.trim() || '1234',
        role: newRole,
        notes: newNotes.trim() || undefined,
        subscriptionTier: newTier
      });

      setRegisteredSuccessAdmin(created);
      setNotification({
        type: 'success',
        text: `تم إصدار الترخيص وتسجيل المقاول بنجاح بالكود: ${created.id} (PIN: ${created.pin || '1234'})`
      });

      // Reset form fields
      setNewEmail('');
      setNewName('');
      setNewCompanyName('');
      setNewPhone('');
      setNewPin('1234');
      setNewNotes('');
      setNewTier('trial_3days');
      setGeneratedId(generateUniqueAdminId([...adminAccounts.map(a => a.id), created.id]));
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'فشل تسجيل المدير العام الجديد.' });
    } finally {
      setLoading(false);
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

  const generateInviteMessage = (admin: AdminAccount) => {
    return buildAdminWhatsAppMessage(admin, window.location.origin);
  };

  const handleShareWhatsApp = (admin: AdminAccount) => {
    const url = buildAdminWhatsAppUrl(admin.phone, admin, window.location.origin);
    window.open(url, '_blank');
  };

  const handleCreateMasterSheet = async () => {
    setLoading(true);
    setNotification(null);
    try {
      const res = await createMasterSheet('XiilL BTP — المنظومة المركزية للأوراش');
      if (res.validation) {
        setSheetValidation(res.validation);
      }
      setNotification({
        type: 'success',
        text: res.isExisting
          ? `تم العثور على الملف المعتمد (${res.title || 'XiilL BTP'}) وتأكيد تطابق الأوراق ورؤوس الأعمدة بنجاح!`
          : `تم إنشاء وتهيئة ملف Google Sheets المركزي بنجاح مع كافة الأوراق ورؤوس الأعمدة ورقة Admin_Registry!`
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'فشل فحص أو إنشاء جدول Google Sheets المركزي.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInspectTabsAndHeaders = async () => {
    setIsInspecting(true);
    setNotification(null);
    try {
      const val = await inspectAndConnectMasterSheet(workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID);
      setSheetValidation(val);
      setNotification({
        type: 'success',
        text: val.message
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'فشل فحص الأوراق ورؤوس الأعمدة في Google Sheets.' });
    } finally {
      setIsInspecting(false);
    }
  };

  const handleSaveManualSheetId = async () => {
    const trimmed = manualSheetInput.trim();
    if (!trimmed) return;
    setIsInspecting(true);
    setNotification(null);
    try {
      const val = await inspectAndConnectMasterSheet(trimmed);
      setSheetValidation(val);
      setIsEditingSheetUrl(false);
      setManualSheetInput('');
      setNotification({
        type: 'success',
        text: `تم ربط الملف المحدد بنجاح والتحقق من الأوراق ورؤوس الأعمدة: ${val.message}`
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'تعذر فحص أو ربط ملف Google Sheets المدخل.' });
    } finally {
      setIsInspecting(false);
    }
  };

  const handleSyncToSheets = async () => {
    setLoading(true);
    setNotification(null);
    try {
      const res = await syncToGoogleSheets();
      setNotification({
        type: 'success',
        text: res.message
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'فشل مزامنة البيانات مع Google Sheets.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDriveBackup = async () => {
    setLoading(true);
    setNotification(null);
    try {
      const res = await backupToDrive();
      setNotification({
        type: 'success',
        text: `تم حفظ نسخة احتياطية سحابية شاملة بنجاح في Google Drive: (${res.name})`
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'فشل النسخ الاحتياطي إلى Google Drive.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      
      {/* ========================================================================= */}
      {/* MASTER TOP HEADER */}
      {/* ========================================================================= */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Brand & Master Status */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Crown className="w-6 h-6 text-zinc-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">XiilL BTP</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                  لوحة تحكم المالك العام
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono hidden sm:inline-block">
                  ADM-ROOT-88
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>المالك المعتمد:</span>
                <span className="text-amber-400 font-mono font-semibold">{SUPER_ADMIN_EMAIL}</span>
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {workspaceConfig.masterSheetUrl && (
              <a
                href={workspaceConfig.masterSheetUrl}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="فتح جدول Google Sheets المركزي"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google Sheets المركزي</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            )}

            <button
              onClick={handleSyncToSheets}
              disabled={loading}
              className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">مزامنة سحابية</span>
            </button>

            <button
              onClick={() => logoutSession()}
              className="py-1.5 px-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* NOTIFICATION TOAST */}
      {/* ========================================================================= */}
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 w-full">
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start justify-between gap-3 shadow-lg ${
              notification.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                : 'bg-red-500/15 border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span className="font-semibold">{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-zinc-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTAINER */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full flex-1 space-y-6">

        {/* Master Navigation Bar */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>نظرة عامة ومؤشرات المنظومة</span>
          </button>

          <button
            onClick={() => setActiveTab('tenants')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'tenants'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>إدارة المدراء العامين والتراخيص</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-950/40 font-mono">
              {customerTenants.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'cloud'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>الربط السحابي والنسخ المركزي</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'audit'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>سجل أمان المنظومة</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'maintenance'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>تصفير البيانات والصيانة</span>
          </button>
        </div>

        {/* ======================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ======================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold mb-2">
                  <span>إجمالي المدراء العامين (Tenants)</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {globalStats.totalTenants}
                </div>
                <div className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">{globalStats.activeLicenses} نشطة</span>
                  <span>•</span>
                  <span className="text-red-400 font-bold">{globalStats.suspendedLicenses} معلقة</span>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold mb-2">
                  <span>الأوراش المنشأة في المنظومة</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {globalStats.totalProjects}
                </div>
                <div className="text-[11px] text-zinc-400 mt-2">
                  عبر كافة حسابات المقاولين المسجلين
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold mb-2">
                  <span>اليد العاملة المسجلة إجمالاً</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {globalStats.totalWorkers}
                </div>
                <div className="text-[11px] text-zinc-400 mt-2">
                  عمال ومعلمية مسجلون في الأوراش
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold mb-2">
                  <span>العمليات المالية والفواتير</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {globalStats.totalPurchasesCount + globalStats.totalExpensesCount}
                </div>
                <div className="text-[11px] text-zinc-400 mt-2">
                  بون تسليم، سلعة ومصروف مقيد
                </div>
              </div>

            </div>

            {/* Quick Actions Hero Banner */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-500/15 via-zinc-900 to-zinc-900 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>توليد حساب وترخيص لمشتري جديد</span>
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  هل قمت ببيع المنظومة لمقاول أو شركة بناء جديدة؟
                </h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-xl leading-relaxed">
                  أنشئ كود أدمين فوري (Admin ID)، وحدد بيانات الشركة، وشارك كود الدخول والتعليمات مع المقاول عبر واتساب مباشرة بنقرة زر واحدة.
                </p>
              </div>
              <button
                onClick={() => {
                  setRegisteredSuccessAdmin(null);
                  setIsRegisterModalOpen(true);
                }}
                className="py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 font-bold text-zinc-950 shadow-lg shadow-amber-500/20 text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إصدار ترخيص جديد (Nouveau Tenant)</span>
              </button>
            </div>

            {/* Recent Tenants Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">أحدث المدراء العامين المسجلين</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">قائمة المقاولين المشتركين في المنظومة</p>
                </div>
                <button
                  onClick={() => setActiveTab('tenants')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                >
                  عرض كافة الحسابات ←
                </button>
              </div>

              <div className="divide-y divide-zinc-800/80">
                {customerTenants.slice(0, 5).map(tenant => {
                  const tenantProjectsCount = state.projects.filter(p => p.adminId === tenant.id).length;
                  return (
                    <div key={tenant.id} className="p-4 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-zinc-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-amber-400 font-mono text-xs">
                          {tenant.id.slice(-4)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{tenant.name}</span>
                            {tenant.companyName && (
                              <span className="text-xs text-zinc-400 font-medium">({tenant.companyName})</span>
                            )}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                tenant.status === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-red-500/15 text-red-300 border border-red-500/30'
                              }`}
                            >
                              {tenant.status === 'active' ? 'نشط' : 'مجمّد'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-mono">
                            <span className="text-amber-400 font-semibold">{tenant.id}</span>
                            <span>•</span>
                            <span>{tenant.email}</span>
                            <span>•</span>
                            <span>{tenantProjectsCount} ورش مسجل</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleShareWhatsApp(tenant)}
                          className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                          title="إرسال رسالة الاعتماد عبر واتساب"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        {onInspectTenant && (
                          <button
                            onClick={() => onInspectTenant(tenant.id)}
                            className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            title="معاينة فضاء المقاول كدعم فني"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>معاينة فضاء المقاول</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {customerTenants.length === 0 && (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    لم تقم بتسجيل أي مقاول أو مدير عام حتى الآن. اضغط "إصدار ترخيص جديد" للبدء.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: TENANTS MANAGEMENT */}
        {/* ======================================================================= */}
        {activeTab === 'tenants' && (
          <div className="space-y-4">
            
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-zinc-800 shadow-md">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، الشركة، كود الأدمين، البريد، أو الهاتف..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 pr-10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="all">كافة الحالات</option>
                  <option value="active">النشطة فقط</option>
                  <option value="suspended">المجمدة فقط</option>
                </select>

                <button
                  onClick={handlePushAdminsToSheet}
                  disabled={isPushingAdmins}
                  className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold border border-amber-400 text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  title="دفع وتحديث قائمة المقاولين الحالية في النظام إلى ملف Google Sheets ومسح أي مقاول محذوف"
                >
                  <Upload className={`w-3.5 h-3.5 ${isPushingAdmins ? 'animate-spin' : ''}`} />
                  <span>{isPushingAdmins ? 'جارِ الدفع للشيت...' : 'دفع المقاولين للشيت (نظام ← شيت)'}</span>
                </button>

                <button
                  onClick={handleSyncAdminsFromSheet}
                  disabled={isSyncingAdmins}
                  className="py-2 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold border border-zinc-700 text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  title="استيراد وتحديث المقاولين المسجلين في الشيت المركزي فوراً إلى النظام"
                >
                  <Download className={`w-3.5 h-3.5 text-amber-400 ${isSyncingAdmins ? 'animate-spin' : ''}`} />
                  <span>{isSyncingAdmins ? 'جارِ السحب...' : 'سحب من الشيت (شيت ← نظام)'}</span>
                </button>

                <button
                  onClick={() => {
                    setRegisteredSuccessAdmin(null);
                    setIsRegisterModalOpen(true);
                  }}
                  className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 font-bold text-zinc-950 shadow-md shadow-amber-500/20 text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مقاول / مدير عام جديد</span>
                </button>
              </div>
            </div>

            {/* Tenants Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTenants.map(tenant => {
                const tenantProjects = state.projects.filter(p => p.adminId === tenant.id);
                const isCopiedThisId = copiedId === tenant.id;

                return (
                  <div
                    key={tenant.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg hover:border-zinc-700 transition-all space-y-4"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400 shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-white">{tenant.name}</h4>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                tenant.status === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-red-500/15 text-red-300 border border-red-500/30'
                              }`}
                            >
                              {tenant.status === 'active' ? 'نشط' : 'مجمّد'}
                            </span>
                          </div>
                          {tenant.companyName && (
                            <p className="text-xs text-zinc-400 font-medium mt-0.5">
                              {tenant.companyName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Admin ID Badge & Copy */}
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() => copyToClipboard(tenant.id, tenant.id, 'id')}
                          className="py-1 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-amber-400 hover:border-amber-500 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="نسخ كود الأدمين"
                        >
                          <span>{tenant.id}</span>
                          {isCopiedThisId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </button>
                        <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                          <span>PIN:</span>
                          <span className="text-zinc-200 font-bold px-1 bg-zinc-950 border border-zinc-800 rounded">{tenant.pin || '1234'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contact & Meta info */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{tenant.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span>{tenant.phone || 'غير مسجل'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span>منذ: {new Date(tenant.createdAt).toLocaleDateString('ar-MA')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="text-amber-400 font-semibold">{tenantProjects.length} أوراش منشأة</span>
                      </div>
                    </div>

                    {tenant.notes && (
                      <p className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/60">
                        {tenant.notes}
                      </p>
                    )}

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleShareWhatsApp(tenant)}
                          className="py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>إرسال الكود واتساب</span>
                        </button>

                        <button
                          onClick={() => {
                            const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
                            updateAdminStatus(tenant.id, newStatus);
                            setNotification({
                              type: 'success',
                              text: `تم ${newStatus === 'active' ? 'تفعيل' : 'تجميد'} حساب المقاول (${tenant.name}) بنجاح.`
                            });
                          }}
                          className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                            tenant.status === 'active'
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                          }`}
                        >
                          {tenant.status === 'active' ? 'تجميد الترخيص' : 'إلغاء التجميد'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {onInspectTenant && (
                          <button
                            onClick={() => onInspectTenant(tenant.id)}
                            className="py-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة فضاء المقاول</span>
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            if (window.confirm(`هل أنت متأكد من حذف حساب الأدمين (${tenant.name} - ${tenant.id})؟ سيتم حذفه من المنظومة ومسحه كلياً من ملف Google Sheets المركزي.`)) {
                              try {
                                const res = await deleteAdmin(tenant.id);
                                setNotification({
                                  type: 'success',
                                  text: res.message
                                });
                              } catch (err: any) {
                                setNotification({
                                  type: 'error',
                                  text: err?.message || 'فشل حذف المقاول'
                                });
                              }
                            }
                          }}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                          title="حذف هذا الحساب ومسحه من Google Sheets"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}

              {filteredTenants.length === 0 && (
                <div className="col-span-2 p-12 text-center text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-2xl">
                  لم يتم العثور على أي مقاول يطابق معايير البحث.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 3: CLOUD INTEGRATION */}
        {/* ======================================================================= */}
        {activeTab === 'cloud' && (
          <div className="space-y-6">
            
            {/* Master Sheet Section */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>جدول Google Sheets المركزي (Master Registry & Multi-Tenants)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        المنظومة المركزية
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      يتم فيه تسجيل وتخزين كافة المدراء العامين وتراخيصهم تلقائياً في ورقة <span className="text-emerald-400 font-mono font-bold">Admin_Registry</span> وفحص الأوراق الثمانية
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleInspectTabsAndHeaders}
                    disabled={isInspecting || loading}
                    className="py-2 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 border border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
                    title="التأكد من وجود الأوراق ورؤوس الأعمدة بدون تغيير البيانات"
                  >
                    {isInspecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListChecks className="w-3.5 h-3.5" />}
                    <span>فحص الأوراق ورؤوس الأعمدة</span>
                  </button>

                  <a
                    href={workspaceConfig.masterSheetUrl || `https://docs.google.com/spreadsheets/d/${workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1.5 border border-zinc-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    <span>فتح في Sheets</span>
                  </a>

                  <button
                    onClick={handleSyncToSheets}
                    disabled={loading || isInspecting}
                    className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/20"
                    title="دفع وحفظ كافة الأوراش والمقاولين في ملف Google Sheets (نظام ← شيت)"
                  >
                    <Upload className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>{loading ? 'جارِ الدفع...' : 'دفع ومزامنة البيانات للشيت (نظام ← شيت)'}</span>
                  </button>

                  <button
                    onClick={() => setIsEditingSheetUrl(!isEditingSheetUrl)}
                    className="py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 border border-zinc-700"
                    title="تعديل رابط الملف أو إدخال معرف مخصص"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Master Sheet Active Info Bar */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">الملف المعتمد:</span>
                    <span className="text-white font-bold">{workspaceConfig.masterSheetTitle || KNOWN_MASTER_SPREADSHEET_TITLE}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      معتمد رسمياً
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
                    <span>المعرف (ID):</span>
                    <span className="text-zinc-200 select-all">{workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                  {workspaceConfig.lastSheetsSync && (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>آخر مزامنة: {new Date(workspaceConfig.lastSheetsSync).toLocaleString('ar-MA')}</span>
                    </div>
                  )}
                  <button
                    onClick={handleCreateMasterSheet}
                    disabled={loading || isInspecting}
                    className="text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                    title="يبحث في Google Drive أولاً عن الملف الأصلي ثم يربطه بدلاً من التكرار"
                  >
                    إعادة الكشف في Drive
                  </button>
                </div>
              </div>

              {/* Manual URL Input Bar (toggleable) */}
              {isEditingSheetUrl && (
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-amber-500/30 space-y-2">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>تغيير أو ربط رابط ملف Google Sheets يدوي:</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="الصق رابط أو معرف الملف (مثال: spreadsheets/d/1KCWDJihciRXulv1n8NwEy668N_oiQn7CCVewRurto5k/)"
                      value={manualSheetInput}
                      onChange={(e) => setManualSheetInput(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      onClick={handleSaveManualSheetId}
                      disabled={isInspecting || !manualSheetInput.trim()}
                      className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isInspecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                      <span>ربط وفحص الأوراق</span>
                    </button>
                    <button
                      onClick={() => setIsEditingSheetUrl(false)}
                      className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Inspection Results Display */}
              {sheetValidation && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">نتائج فحص هيكل الأوراق ورؤوس الأعمدة:</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-medium">{sheetValidation.message}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(sheetValidation.tabStatuses || []).map(tab => (
                      <div
                        key={tab.title}
                        className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5 truncate">
                          <span className="font-mono text-zinc-200 block text-[11px] truncate font-bold">{tab.title}</span>
                          <span className="text-[10px] text-zinc-400 block truncate">{tab.label}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          tab.status === 'ok'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tab.status === 'repaired'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {tab.status === 'ok' ? '✓ مطابق' : tab.status === 'repaired' ? '✓ تم ضبطه' : 'ناقص'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Google Drive Central Backups */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      النسخ الاحتياطي السحابي المركزي (Google Drive Central Cloud)
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      أخذ نسخة احتياطية مشفرة لجميع بيانات المنظومة المركزية بكافة أوراشها وحساباتها إلى مجلد <span className="text-blue-400 font-mono">XiilL_BTP_Backups</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDriveBackup}
                  disabled={loading}
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>أخذ نسخة كاملة إلى Drive الآن</span>
                </button>
              </div>

              {workspaceConfig.lastDriveSync && (
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span>آخر نسخة محفوظة في السحابة: {new Date(workspaceConfig.lastDriveSync).toLocaleString('ar-MA')}</span>
                </div>
              )}
            </div>

            {/* Local JSON Export & Import */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h3 className="text-base font-extrabold text-white">
                  النسخ الاحتياطي المحلي للمنظومة (Local JSON File)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  حفظ نسخة غير متصلة بالإنترنت لجهازك أو استعادة نسخة سابقة
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => exportBackupJson()}
                  className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold flex items-center gap-2 border border-zinc-700 transition-colors"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>تصدير ملف النسخة الاحتياطية (JSON)</span>
                </button>

                <label className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold flex items-center gap-2 border border-zinc-700 transition-colors cursor-pointer">
                  <UploadCloud className="w-4 h-4 text-amber-400" />
                  <span>استعادة المنظومة من ملف (JSON)</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        if (content) {
                          const success = importBackupJson(content);
                          if (success) {
                            setNotification({
                              type: 'success',
                              text: 'تمت استعادة كافة بيانات المنظومة بنجاح!'
                            });
                          } else {
                            setNotification({
                              type: 'error',
                              text: 'الملف المدخل غير متطابق مع بنية بيانات المنظومة.'
                            });
                          }
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 4: AUDIT & SECURITY */}
        {/* ======================================================================= */}
        {activeTab === 'audit' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="text-base font-extrabold text-white">
                سجل أمان العمليات المركزي (Audit Logs)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                تتبع كافة عمليات الدخول، توليد التراخيص، والتعديلات على النظام
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {state.activityLogs.slice(0, 30).map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white">{log.userName}: </span>
                      <span className="text-zinc-300">{log.details}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono self-end sm:self-center">
                    {new Date(log.timestamp).toLocaleString('ar-MA')}
                  </span>
                </div>
              ))}

              {state.activityLogs.length === 0 && (
                <div className="text-center py-8 text-xs text-zinc-500">
                  لا توجد سجلات بعد.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 5: MAINTENANCE & RESET */}
        {/* ======================================================================= */}
        {activeTab === 'maintenance' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                <span>صيانة المنظومة وخيارات التصفير الدقيقة</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                خيارات واضحة ومستقلة لتصفير العمليات التجريبية دون المساس بالحسابات المعتمدة، أو تصفير شامل للمقاولين، أو تفريغ Google Sheets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Option 1: Reset Operational Data Only (Keep Registered Contractors) */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Building2 className="w-4 h-4" />
                    <span>1. تصفير الأوراش والعمليات فقط</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    يمسح كافة الأوراش والعمال والمصاريف والـ CPS التجريبية محلياً.
                    <span className="text-emerald-400 font-semibold block mt-1">
                      ✓ يحافظ على كافة حسابات المقاولين المعتمدين (سعيد، محمد جالي).
                    </span>
                  </p>
                </div>

                <button
                  onClick={async () => {
                    if (window.confirm('هل تريد تصفير كافة الأوراش والعمليات اليومية مع الحفاظ على حسابات المقاولين في النظام وفي Google Sheets؟')) {
                      setLoading(true);
                      try {
                        await resetToCleanData({ wipeTenants: false, clearGoogleSheets: true });
                        setNotification({
                          type: 'success',
                          text: 'تم تصفير الأوراش والعمليات في النظام وفي Google Sheets بنجاح مع الحفاظ على حسابات المقاولين المعتمدين!'
                        });
                      } catch (err: any) {
                        setNotification({ type: 'error', text: err?.message || 'فشل تصفير الأوراش' });
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  تصفير الأوراش فقط (Chantiers = 0 في النظام والشيت)
                </button>
              </div>

              {/* Option 2: Full Clean Wipe (0 Tenants & 0 Projects) */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-red-500/25 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                    <Trash2 className="w-4 h-4" />
                    <span>2. تصفير شامل وحذف التجريبيين</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    يمسح الحسابات التجريبية والأوراش بالكامل محلياً وفي ملف Google Sheets المركزي.
                    <span className="text-zinc-300 font-semibold block mt-1">
                      يبقي فقط حسابك الرئيسي كـ Super Admin جاهزاً لإدخال المقاولين الفعليين.
                    </span>
                  </p>
                </div>

                <button
                  onClick={async () => {
                    if (window.confirm('تنبيه: هذا الخيار سيحذف الحسابات التجريبية والأوراش بالكامل في النظام ومسحها من Google Sheets (0 مقاولين تجريبيين و 0 أوراش). هل أنت متأكد؟')) {
                      setLoading(true);
                      try {
                        await resetToCleanData({ wipeTenants: true, clearGoogleSheets: true });
                        setNotification({
                          type: 'success',
                          text: 'تم التصفير الشامل في النظام ومسح ملف Google Sheets المركزي بنجاح! المنظومة نظيفة وجاهزة للمقاولين الحقيقيين.'
                        });
                      } catch (err: any) {
                        setNotification({ type: 'error', text: err?.message || 'فشل التصفير الشامل' });
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-red-600/20 disabled:opacity-50"
                >
                  تصفير شامل للإنتاج (0 Tenants في النظام والشيت)
                </button>
              </div>

              {/* Option 3: Remote Google Sheets Wipe */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/25 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>3. تفريغ جداول Google Sheets</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    يقوم بمسح وتفريغ صفوف البيانات من ملف Google Sheets المركزي عبر الـ API.
                    <span className="text-zinc-300 font-semibold block mt-1">
                      يحافظ 100% على رؤوس الأعمدة وعناوين الجداول وتنسيقها.
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={async () => {
                      if (window.confirm('هل تريد مسح وتفريغ كافة صفوف الأوراش والعمليات في Google Sheets المركزي مع الحفاظ على المقاولين؟')) {
                        setIsWipingCloud(true);
                        try {
                          const res = await wipeCloudSheetsData(false);
                          setNotification({
                            type: 'success',
                            text: res.message
                          });
                        } catch (err: any) {
                          setNotification({
                            type: 'error',
                            text: err.message || 'تعذر تصفير ملف Google Sheets'
                          });
                        } finally {
                          setIsWipingCloud(false);
                        }
                      }
                    }}
                    disabled={isWipingCloud || loading}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {isWipingCloud ? 'جارِ تفريغ الجداول...' : 'تفريغ الأوراش فقط (بقاء المقاولين)'}
                  </button>

                  <button
                    onClick={async () => {
                      if (window.confirm('تنبيه: هل تريد تفريغ شامل لكافة الجداول وحسابات المقاولين التجريبية في Google Sheets (مسح Admin_Registry)؟')) {
                        setIsWipingCloud(true);
                        try {
                          const res = await wipeCloudSheetsData(true);
                          setNotification({
                            type: 'success',
                            text: res.message
                          });
                        } catch (err: any) {
                          setNotification({
                            type: 'error',
                            text: err.message || 'تعذر تصفير ملف Google Sheets'
                          });
                        } finally {
                          setIsWipingCloud(false);
                        }
                      }
                    }}
                    disabled={isWipingCloud || loading}
                    className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-red-400 hover:text-red-300 font-bold text-xs transition-colors cursor-pointer border border-red-500/30 disabled:opacity-50"
                  >
                    {isWipingCloud ? 'جارِ المسح...' : 'تفريغ شامل للشيت + سجل المقاولين'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: REGISTER NEW GENERAL MANAGER / TENANT */}
      {/* ========================================================================= */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div
            className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-5 sm:p-6 text-zinc-100 space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {registeredSuccessAdmin ? (
              /* Success View */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-white">تم إصدار الترخيص وتسجيل المقاول بنجاح!</h3>
                      <p className="text-[11px] text-emerald-400/90 font-medium">تم إنشاء فضاء العمل وحفظ السجل المركزي</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setRegisteredSuccessAdmin(null);
                      setIsRegisterModalOpen(false);
                    }}
                    className="text-zinc-400 hover:text-white p-1 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Account Details Box */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-semibold">كود الأدمين الخاص بالمقاول:</span>
                    <button
                      onClick={() => copyToClipboard(registeredSuccessAdmin.id, registeredSuccessAdmin.id, 'id')}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-amber-500/40 text-amber-400 font-mono font-black text-sm flex items-center gap-1.5 hover:border-amber-400"
                      title="نسخ الكود"
                    >
                      <span>{registeredSuccessAdmin.id}</span>
                      {copiedId === registeredSuccessAdmin.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 opacity-60" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-zinc-800/80 text-xs">
                    <div>
                      <span className="text-zinc-500 block text-[11px]">المقاول المسجل:</span>
                      <span className="text-white font-bold">{registeredSuccessAdmin.name}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[11px]">الرول والصلاحية:</span>
                      <span className="text-amber-400 font-bold">مدير عام / مقاول</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[11px]">البريد الإلكتروني:</span>
                      <span className="text-zinc-300 truncate block font-mono">{registeredSuccessAdmin.email}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[11px]">الهاتف (واتساب):</span>
                      <span className="text-zinc-200 font-mono">{registeredSuccessAdmin.phone || 'غير مسجل'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[11px]">رمز PIN السري:</span>
                      <span className="text-amber-300 font-mono font-bold">{registeredSuccessAdmin.pin || '1234'}</span>
                    </div>
                    <div className="col-span-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-zinc-400 block">نوع الاشتراك والمدة التلقائية:</span>
                        <span className="text-xs font-bold text-amber-300">
                          {registeredSuccessAdmin.subscription?.tier === 'trial_3days'
                            ? 'اشتراك تجريبي (3 أيام تلقائياً)'
                            : registeredSuccessAdmin.subscription?.tier === 'monthly'
                            ? 'اشتراك شهري (30 يوماً)'
                            : 'اشتراك سنوي (365 يوماً)'}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-zinc-500 block">ينتهي في:</span>
                        <span className="text-xs font-mono text-zinc-300">
                          {registeredSuccessAdmin.subscription?.endDate
                            ? new Date(registeredSuccessAdmin.subscription.endDate).toLocaleDateString('ar-MA')
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct WhatsApp Call to Action */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(registeredSuccessAdmin)}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5 fill-current" />
                    <span>إرسال كود الأدمين وتفاصيل الدخول عبر WhatsApp للمقاول</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generateInviteMessage(registeredSuccessAdmin), registeredSuccessAdmin.id, 'invite')}
                      className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-zinc-700 transition-colors"
                    >
                      {copiedInvite === registeredSuccessAdmin.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedInvite === registeredSuccessAdmin.id ? 'تم نسخ الرسالة!' : 'نسخ نص الدعوة'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRegisteredSuccessAdmin(null);
                        setGeneratedId(generateUniqueAdminId(adminAccounts.map(a => a.id)));
                      }}
                      className="py-2 px-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors"
                    >
                      تسجيل مقاول آخر +
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRegisteredSuccessAdmin(null);
                        setIsRegisterModalOpen(false);
                      }}
                      className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Registration Form */
              <>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-white">إصدار ترخيص / تسجيل مدير عام جديد</h3>
                      <p className="text-[11px] text-zinc-400">توليد كود أدمين وإعداد فضاء العمل المستقل للمقاول</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="text-zinc-400 hover:text-white p-1 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* Generated Admin ID & Secret PIN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        كود الأدمين المولد تلقائياً (Admin ID)
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <KeyRound className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            readOnly
                            value={generatedId}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 pr-10 text-amber-400 font-mono font-bold text-sm focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleRegenerateId}
                          className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
                          title="توليد كود آخر"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                        <span>رمز PIN السري للمقاول</span>
                        <span className="text-[10px] text-amber-400">الافتراضي: 1234</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          maxLength={8}
                          placeholder="1234"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 pr-10 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Role Selection (Single option: General Manager / Contractor) */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      الرول / الصلاحية الممنوحة (Role) <span className="text-amber-400">*</span>
                    </label>
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs font-bold text-amber-300">
                          مدير عام / مقاول (Directeur Général / Entrepreneur)
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30">
                        اختيار وحيد معتمد
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      صلاحية وحيدة للمالك العام لترخيص المقاولين. المقاول بدوره له خيار وحيد لتعيين فريقه وهو (مشرف ورش).
                    </p>
                  </div>

                  {/* Name & Company */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        اسم المقاول / المسير <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="مثال: يوسف الإدريسي"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        اسم المقاولة / الشركة
                      </label>
                      <input
                        type="text"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        placeholder="مثال: سوس للبناء SARL"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        البريد الإلكتروني <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="client@entreprise.com"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                        <span>رقم الهاتف (WhatsApp)</span>
                        <span className="text-[10px] text-emerald-400">ضروري للتوصل بالكود</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="tel"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="06XXXXXXXX"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 pr-9 text-white text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subscription Tier Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                      <span>نوع الاشتراك / الباقة الممنوحة: <span className="text-amber-400">*</span></span>
                      <span className="text-[10px] text-zinc-400">تحدد صلاحية الدخول للمنظومة</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewTier('trial_3days')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          newTier === 'trial_3days'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/10'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="block text-xs font-bold">تجريبي 3 أيام</span>
                        <span className="block text-[10px] text-amber-400/90 mt-0.5">3 أيام تلقائياً</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewTier('monthly')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          newTier === 'monthly'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/10'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="block text-xs font-bold">اشتراك شهري</span>
                        <span className="block text-[10px] text-emerald-400 mt-0.5">290 د.م / شهر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewTier('annual')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          newTier === 'annual'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/10'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="block text-xs font-bold">اشتراك سنوي</span>
                        <span className="block text-[10px] text-amber-400 mt-0.5 font-semibold">خصم 25%</span>
                      </button>
                    </div>
                  </div>

                  {/* Automatic Duration Display & Expiry Notice */}
                  {(() => {
                    const durationInfo = getTierDurationInfo(newTier);
                    return (
                      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-zinc-300 font-semibold border-b border-zinc-800/80 pb-1.5">
                          <span className="flex items-center gap-1.5 text-amber-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>المدة المحتسبة تلقائياً:</span>
                          </span>
                          <span className="font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-md font-mono">
                            {durationInfo.durationLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                          <div>
                            <span className="text-zinc-500 block">تاريخ البدء:</span>
                            <span className="text-zinc-200 font-medium">{durationInfo.startDateFormatted}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">تاريخ الانتهاء التلقائي:</span>
                            <span className="text-amber-300 font-bold font-mono">{durationInfo.endDateFormatted}</span>
                          </div>
                        </div>
                        <div
                          className={`p-2 rounded-lg text-[11px] leading-relaxed ${
                            newTier === 'trial_3days'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                              : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                          }`}
                        >
                          {durationInfo.termsNote}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      ملاحظات أو تفاصيل إضافية
                    </label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="مثال: مقاول فيلات - تفعيل بعد تحويل بنكي"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsRegisterModalOpen(false)}
                      className="py-2 px-4 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>حفظ وإصدار الترخيص الآن</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
