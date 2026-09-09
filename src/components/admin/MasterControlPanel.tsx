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
  UploadCloud,
  X,
  AlertCircle
} from 'lucide-react';
import { generateUniqueAdminId, SUPER_ADMIN_EMAIL } from '../../services/googleWorkspace';
import { AdminAccount } from '../../types';

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
    syncToGoogleSheets,
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
  const [newNotes, setNewNotes] = useState('');
  const [generatedId, setGeneratedId] = useState(() => generateUniqueAdminId(adminAccounts.map(a => a.id)));

  // UI state
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

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
        notes: newNotes.trim() || undefined
      });

      setNotification({
        type: 'success',
        text: `تم إصدار الترخيص وتسجيل المدير العام بنجاح بالكود: ${created.id}`
      });

      // Reset form
      setNewEmail('');
      setNewName('');
      setNewCompanyName('');
      setNewPhone('');
      setNewNotes('');
      setGeneratedId(generateUniqueAdminId([...adminAccounts.map(a => a.id), created.id]));
      setIsRegisterModalOpen(false);
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
    return `السلام عليكم سي ${admin.name}،
مرحباً بك في منظومة *XiilL BTP* لإدارة أوراش البناء والمقاولات.
تم تفعيل رخصة حسابك كمدير عام للنظام بنجاح:
🔑 كود الدخول الخاص بك (Admin ID): *${admin.id}*
📧 البريد المعتمد: ${admin.email}

*طريقة الدخول:*
1. افتح المنظومة واختر "مدير عام / أدمين"
2. أدخل كود الأدمين الخاص بك أعلاه واضغط دخول
3. سيفتح لك فضاء عملك المستقل كلياً للتحكم في أوراشك، مشرفيك، عمالك، ومصاريفك. بالتوفيق!`;
  };

  const handleShareWhatsApp = (admin: AdminAccount) => {
    const msg = generateInviteMessage(admin);
    const phone = admin.phone ? admin.phone.replace(/[^0-9]/g, '') : '';
    const cleanPhone = phone.startsWith('0') ? `212${phone.slice(1)}` : phone;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCreateMasterSheet = async () => {
    setLoading(true);
    setNotification(null);
    try {
      const res = await createMasterSheet('XiilL BTP — المنظومة المركزية للأوراش');
      setNotification({
        type: 'success',
        text: `تم إنشاء ملف Google Sheets المركزي بنجاح مع ورقة Admin_Registry لكافة التراخيص!`
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'فشل إنشاء جدول Google Sheets المركزي.' });
    } finally {
      setLoading(false);
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
                onClick={() => setIsRegisterModalOpen(true)}
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
                  onClick={() => setIsRegisterModalOpen(true)}
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
                      <button
                        onClick={() => copyToClipboard(tenant.id, tenant.id, 'id')}
                        className="py-1 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-amber-400 hover:border-amber-500 flex items-center gap-1.5 transition-colors"
                        title="نسخ كود الأدمين"
                      >
                        <span>{tenant.id}</span>
                        {isCopiedThisId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 opacity-60" />
                        )}
                      </button>
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
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من حذف حساب الأدمين (${tenant.name} - ${tenant.id})؟`)) {
                              deleteAdmin(tenant.id);
                              setNotification({
                                type: 'success',
                                text: `تم حذف حساب الأدمين (${tenant.name}) بنجاح.`
                              });
                            }
                          }}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                          title="حذف هذا الحساب"
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      جدول Google Sheets المركزي (Master Registry & Multi-Tenants)
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      يتم فيه تسجيل وتخزين كافة المدراء العامين وتراخيصهم تلقائياً في ورقة <span className="text-emerald-400 font-mono">Admin_Registry</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!workspaceConfig.masterSheetId ? (
                    <button
                      onClick={handleCreateMasterSheet}
                      disabled={loading}
                      className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span>إنشاء Google Sheets المركزي الآن</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <a
                        href={workspaceConfig.masterSheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-2 border border-zinc-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-emerald-400" />
                        <span>فتح الجدول في Google Sheets</span>
                      </a>
                      <button
                        onClick={handleSyncToSheets}
                        disabled={loading}
                        className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>مزامنة كافة المشتركين</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {workspaceConfig.lastSheetsSync && (
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>آخر مزامنة ناجحة: {new Date(workspaceConfig.lastSheetsSync).toLocaleString('ar-MA')}</span>
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
                <span>صيانة المنظومة وتصفير البيانات التجريبية</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                إذا أردت البدء ببيانات نظيفة وحقيقية للمبيعات، يمكنك مسح وتصفير كافة البيانات التجريبية (الأوراش والعمال والمصاريف الوهمية) مع الحفاظ على حساب المالك العام.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>تنبيه هام وحاسم</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                هذا الإجراء سيقوم بحذف الأوراش والمصاريف والعمال المسجلين حالياً والبدء من الصفر. ينصح بأخذ نسخة احتياطية (JSON) قبل التصفير.
              </p>

              <button
                onClick={() => {
                  if (window.confirm('هل أنت متأكد تماماً من تصفير ومسح كافة البيانات التجريبية والبدء ببيانات نظيفة 100%؟')) {
                    resetToCleanData();
                    setNotification({
                      type: 'success',
                      text: 'تم تصفير المنظومة ومسح البيانات التجريبية بنجاح! المنظومة جاهزة للإنتاج الفعلي.'
                    });
                  }
                }}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد تصفير كافة البيانات الآن (0 Données)</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: REGISTER NEW GENERAL MANAGER / TENANT */}
      {/* ========================================================================= */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 text-zinc-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
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
              {/* Generated Admin ID */}
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
                    className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                    title="توليد كود آخر"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
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
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    الهاتف (WhatsApp)
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="06XXXXXXXX"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  ملاحظات أو نوع الاشتراك
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="مثال: باقة سنوية - دفع عبر تحويل بنكي"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="py-2 px-4 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>حفظ وإصدار الترخيص الآن</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
