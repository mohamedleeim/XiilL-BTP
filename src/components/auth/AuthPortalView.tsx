import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Building2,
  HardHat,
  Crown,
  KeyRound,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LogIn,
  Lock,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '../../services/googleWorkspace';

export const AuthPortalView: React.FC = () => {
  const {
    loginAsSuperAdmin,
    loginAsAdmin,
    loginAsSupervisor,
    loginWithGoogleAdmin,
    state
  } = useApp();

  // Primary Login Tabs (General Manager vs Supervisor only - NO Super Admin tab here!)
  type AuthTab = 'admin' | 'supervisor';
  const [activeTab, setActiveTab] = useState<AuthTab>('admin');

  // Dedicated Super Admin Verification View Mode
  const [isSuperAdminMode, setIsSuperAdminMode] = useState<boolean>(false);

  // Super Admin Verification State
  const [masterSecurityKey, setMasterSecurityKey] = useState<string>('');
  const [showKeyText, setShowKeyText] = useState<boolean>(false);

  // Admin form state (strictly ID Code with device persistence)
  const [adminCode, setAdminCode] = useState<string>(() => {
    try {
      return localStorage.getItem('xiill_btp_remember_admin_code') || '';
    } catch (e) {
      return '';
    }
  });
  const [adminRememberMe, setAdminRememberMe] = useState<boolean>(true);

  // Supervisor form state (with persisted memory for auto-fill & one-click access)
  const [supervisorAdminId, setSupervisorAdminId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('xiill_btp_remember_supervisor');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.adminId || '';
      }
    } catch (e) {}
    return '';
  });

  const [supervisorProjectId, setSupervisorProjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('xiill_btp_remember_supervisor');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.projectId || '';
      }
    } catch (e) {}
    return '';
  });

  const [customProjectName, setCustomProjectName] = useState('');

  const [supervisorName, setSupervisorName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('xiill_btp_remember_supervisor');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.supervisorName || '';
      }
    } catch (e) {}
    return '';
  });

  const [isCustomSupervisorName, setIsCustomSupervisorName] = useState(false);
  const [newSupervisorPhone, setNewSupervisorPhone] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clean Manager ID & Dynamic Isolated Lookups
  const cleanSupervisorAdminId = supervisorAdminId.trim().toUpperCase();

  const matchedManager = cleanSupervisorAdminId
    ? state.adminAccounts.find(a => a.id.toUpperCase() === cleanSupervisorAdminId)
    : null;

  // Projects strictly belonging to this manager
  const managerProjects = cleanSupervisorAdminId
    ? state.projects.filter(p => p.adminId?.toUpperCase() === cleanSupervisorAdminId)
    : [];

  // Supervisors strictly assigned to this manager or unassigned fallback
  const managerSupervisors = cleanSupervisorAdminId
    ? state.users.filter(u => u.role === 'supervisor' && (u.adminId?.toUpperCase() === cleanSupervisorAdminId || !u.adminId))
    : [];

  // Submit Handler: General Manager / Admin (Strictly ID Code)
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = adminCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('يرجى إدخال كود الأدمين الخاص بك (Admin ID Code)');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      if (adminRememberMe) {
        localStorage.setItem('xiill_btp_remember_admin_code', cleanCode);
      } else {
        localStorage.removeItem('xiill_btp_remember_admin_code');
      }
      const res = await loginAsAdmin(cleanCode);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر تسجيل الدخول بكود الأدمين المدخل');
    } finally {
      setLoading(false);
    }
  };

  // Submit Handler: Field Supervisor (Chef de Chantier)
  const handleSupervisorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanSupervisorAdminId) {
      setErrorMessage('يرجى إدخال كود أدمين المدير العام (Admin ID)');
      return;
    }

    const projId = supervisorProjectId.trim() || customProjectName.trim();
    if (!projId) {
      setErrorMessage('يرجى اختيار الورش المخصص لك أو إدخال اسمه');
      return;
    }

    const supName = supervisorName.trim();
    if (!supName) {
      setErrorMessage('يرجى تحديد أو إدخال اسم المشرف الميداني');
      return;
    }

    if (!supervisorPin.trim()) {
      setErrorMessage('يرجى إدخال رمز الدخول السري (PIN)');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await loginAsSupervisor({
        adminId: cleanSupervisorAdminId,
        projectId: projId,
        supervisorIdOrName: supName,
        pin: supervisorPin.trim(),
        rememberMe,
        phone: newSupervisorPhone.trim() || undefined
      });
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر تسجيل دخول المشرف. يرجى التأكد من البيانات والرمز السري.');
    } finally {
      setLoading(false);
    }
  };

  // Super Admin Strict Verification: Method 1 (Official Google Account)
  const handleSuperAdminGoogleVerification = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await loginWithGoogleAdmin();
      if (res.role === 'super_admin') {
        setSuccessMessage('تم التحقق بنجاح! جاري تحويلك للوحة تحكم المالك العام...');
      } else {
        throw new Error(`الحساب المختار (${res.message}) ليس حساب المالك العام المصرح به.`);
      }
    } catch (err: any) {
      const errStr = String(err?.message || '');
      if (
        errStr.includes('access_denied') ||
        errStr.includes('403') ||
        errStr.includes("n'a pas terminé") ||
        errStr.includes('procédure de validation') ||
        errStr.includes('unapproved')
      ) {
        setErrorMessage(
          'تنبيه Google OAuth (خطأ 403: access_denied): مشروع Google Cloud لا يزال في وضع التجربة (Testing mode) ولم يتم نشره لـ Production، لذا يمنع Google الحسابات غير المسجلة كـ Test Users. للحل: يمكنك النقر على "Publier l\'application" في Google Cloud Console، أو الدخول فوراً بالخيار 2 أدناه بمفتاح الأمان الرئيسي السري (Master Key) دون الحاجة لـ Google إطلاقاً.'
        );
      } else if (errStr.includes('userinfo') || errStr.includes('invalid-credential') || errStr.includes('401') || errStr.includes('credential')) {
        setErrorMessage(
          'تعذر التحقق التلقائي عبر نافذة Google بسبب قيود المتصفح أو أذونات الحساب. يمكنك الدخول فوراً بالخيار 2 أدناه باستخدام مفتاح الأمان الرئيسي السري (XiilL-ROOT-2026-BTP).'
        );
      } else {
        setErrorMessage(err?.message || `فشل التحقق: مسموح حصرياً للمالك العام (${SUPER_ADMIN_EMAIL}).`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Super Admin Strict Verification: Method 2 (Master Root Security Key)
  const handleSuperAdminKeyVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterSecurityKey.trim()) {
      setErrorMessage('يرجى كتابة مفتاح الأمان السري للمالك العام.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await loginAsSuperAdmin(masterSecurityKey.trim());
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err?.message || 'مفتاح الأمان السري غير صحيح. تم رفض الوصول لمنطقة المالك.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-amber-500 selection:text-zinc-950">
      
      {/* Top Header */}
      <header className="border-b border-zinc-900 px-4 sm:px-8 py-3.5 bg-zinc-900/40 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/10 font-bold">
              <Building2 className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">XiilL</span>
                <span className="text-amber-400 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 font-mono font-bold">
                  BTP
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">بوابة الولوج الموحدة لمنظومة إدارة الأوراش والمقاولات</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>نظام عزل البيانات والمصادقة الأمنية المشددة</span>
          </div>
        </div>
      </header>

      {/* Main Form Center */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-xl bg-zinc-900/90 border border-zinc-800/90 rounded-2xl shadow-2xl p-5 sm:p-8 backdrop-blur-sm">
          
          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="font-semibold">{successMessage}</div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW A: DEDICATED SUPER ADMIN VERIFICATION SCREEN                         */}
          {/* ========================================================================= */}
          {isSuperAdminMode ? (
            <div className="space-y-6">
              
              {/* Return Button */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSuperAdminMode(false);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors font-semibold"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>العودة لتسجيل دخول المقاولين والمشرفين</span>
                </button>
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                  منطقة المالك المحمية
                </span>
              </div>

              {/* Header */}
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-zinc-950 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
                  <Crown className="w-6 h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  التحقق الأمني لمالك المنظومة (Super Admin)
                </h2>
                <p className="text-xs text-zinc-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                  هذه البوابة مخصصة حصرياً للمالك العام للتحكم الشامل في المنظومة وإدارة حسابات وتراخيص المقاولين.
                </p>
                <div className="inline-block mt-2 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-amber-400 font-mono text-xs font-semibold">
                  {SUPER_ADMIN_EMAIL}
                </div>
              </div>

              {/* Strict Method 1: Google OAuth Official Verification */}
              <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>الخيار 1: المصادقة السحابية الرسمية عبر حساب Google المعتمد</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  يتم التحقق الفوري من هويتك عبر تسجيل الدخول بحساب Gmail الرسمي للمالك ({SUPER_ADMIN_EMAIL}). أي بريد آخر سيتم رفضه فوراً.
                </p>

                <button
                  type="button"
                  onClick={handleSuperAdminGoogleVerification}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-900 border border-zinc-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>التحقق والدخول عبر Google للمالك العام</span>
                    </>
                  )}
                </button>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>تنبيه بخصوص خطأ 403 (access_denied) بحسابات Google:</span>
                  </div>
                  إذا ظهرت رسالة أن التطبيق لم يكمل إجراء التحقق (403: access_denied)، فذلك لأن تطبيق Google Cloud ما زال في وضع التجربة (Testing). يمكنك نشر التطبيق لـ "Production" في Google Cloud Console، أو استخدام <strong className="text-white">الخيار 2 أدناه بمفتاح الأمان الرئيسي السري</strong> للدخول الفوري دون أي قيود من Google.
                </div>
              </div>

              {/* Strict Method 2: Master Root Key */}
              <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>الخيار 2: التحقق بواسطة مفتاح الأمان الرئيسي السري (Master Key)</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  إذا لم تكن متصلاً بحساب Google، أدخل مفتاح الأمان السري المشفر الخاص بمالك المنظومة للتحقق الصارم من الهوية.
                </p>

                <form onSubmit={handleSuperAdminKeyVerification} className="space-y-3">
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showKeyText ? 'text' : 'password'}
                      required
                      value={masterSecurityKey}
                      onChange={(e) => setMasterSecurityKey(e.target.value)}
                      placeholder="أدخل مفتاح الأمان السري للمالك..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 pr-10 pl-10 text-white font-mono placeholder:font-sans placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 text-xs sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyText(!showKeyText)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Crown className="w-4 h-4" />
                        <span>تحقق من المفتاح والدخول للوحة التحكم</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW B: STANDARD USER LOGIN (General Manager & Supervisor Only)          */
            /* ========================================================================= */
            <div>
              {/* Heading */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>فضاء العمل المستقل والآمن</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  تسجيل الدخول إلى منظومة <span className="text-amber-400">XiilL BTP</span>
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
                  يرجى تحديد صفتك للولوج إلى فضاء العمل المخصص لك والمستقل كلياً.
                </p>
              </div>

              {/* Two Standard Role Tabs (Manager / Admin vs Supervisor) */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-zinc-950/80 rounded-xl border border-zinc-800/80 mb-6">
                {/* Tab 1: General Manager / Admin */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col items-center justify-center py-3 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'admin'
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                  <span>مدير عام / مقاول</span>
                  <span className={`text-[10px] hidden sm:block ${activeTab === 'admin' ? 'text-zinc-900 font-semibold' : 'text-zinc-500'}`}>
                    بواسطة كود الأدمين
                  </span>
                </button>

                {/* Tab 2: Supervisor / Chef de Chantier */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('supervisor');
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col items-center justify-center py-3 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'supervisor'
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <HardHat className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                  <span>مشرف ورش</span>
                  <span className={`text-[10px] hidden sm:block ${activeTab === 'supervisor' ? 'text-zinc-900 font-semibold' : 'text-zinc-500'}`}>
                    Chef de Chantier
                  </span>
                </button>
              </div>

              {/* Form 1: General Manager / Admin */}
              {activeTab === 'admin' && (
                <form onSubmit={handleAdminSubmit} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">فضاء المقاول المستقل: </span>
                      أدخل كود الأدمين الخاص بك (Admin ID Code) للولوج الحصري إلى أوراشك، عمالك، مورديك وإدارة مشرفيك.
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      كود الأدمين المعين لمقاولتك <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
                        placeholder="مثال: ADM-XXXX-XX"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 pr-10 text-white font-mono placeholder:font-sans placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors text-sm"
                      />
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      يبدأ كود الأدمين دائماً بـ ADM- (تم تزويدك به عند الاشتراك)
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 px-0.5 bg-zinc-950/40 rounded-xl px-3 py-2 border border-zinc-800/60">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-300 select-none">
                      <input
                        type="checkbox"
                        checked={adminRememberMe}
                        onChange={(e) => setAdminRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500/20 cursor-pointer accent-amber-500"
                      />
                      <span className="font-medium">حفظ تسجيل الدخول في هذا الجهاز (تذكرني)</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">جلسة دائمة</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 font-bold text-zinc-950 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>دخول إلى فضاء العمل المستقل</span>
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-zinc-500 mt-3">
                    ليس لديك كود أدمين؟ يتم إصدار وتفعيل الكود حصرياً من طرف المالك العام للمنظومة.
                  </p>
                </form>
              )}

              {/* Form 2: Field Supervisor (Strict Manager & Project Isolation) */}
              {activeTab === 'supervisor' && (
                <form onSubmit={handleSupervisorSubmit} className="space-y-4">
                  {/* Informative Header */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
                    <HardHat className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">فضاء المشرف الميداني (Chef de Chantier): </span>
                      أدخل كود أدمين مديرك العام لعرض أوراشه الخاصة فقط، تسجيل حضور العمال، ومتابعة وصول السلع في فضاء مستقل تماماً.
                    </div>
                  </div>

                  {/* Step 1: General Manager Admin ID */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>1. كود أدمين المدير العام (Admin ID du Gérant)</span>
                        <span className="text-amber-400">*</span>
                      </label>
                      {matchedManager && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>المقاول: {matchedManager.name}</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={supervisorAdminId}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setSupervisorAdminId(val);
                          // Reset project & supervisor when manager ID changes
                          if (supervisorProjectId && !state.projects.some(p => p.id === supervisorProjectId && p.adminId?.toUpperCase() === val)) {
                            setSupervisorProjectId('');
                          }
                        }}
                        placeholder="مثال: ADM-XXXX-XX"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white font-mono placeholder:font-sans placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors text-sm"
                      />
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      كود الأدمين المقدم لك من طرف المقاول/المدير العام لفرز مشاريعه حصراً.
                    </span>
                  </div>

                  {/* Step 2: Project Selection for this Manager */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>2. اختيار الورش التابع للمدير العام (Projet / Chantier)</span>
                      <span className="text-amber-400">*</span>
                    </label>

                    {cleanSupervisorAdminId ? (
                      managerProjects.length > 0 ? (
                        <select
                          required
                          value={supervisorProjectId}
                          onChange={(e) => setSupervisorProjectId(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors text-sm"
                        >
                          <option value="">-- اضغط لاختيار الورش من قائمة أوراش هذا المدير --</option>
                          {managerProjects.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.city ? `(${p.city})` : ''} - [{p.status === 'active' ? 'نشط' : p.status === 'completed' ? 'منتهي' : 'متوقف'}]
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>لا توجد أوراش مسجلة بعد لهذا المدير. أدخل اسم الورش الميداني لبدء العمل:</span>
                          </div>
                          <input
                            type="text"
                            required
                            value={customProjectName}
                            onChange={(e) => setCustomProjectName(e.target.value)}
                            placeholder="مثال: ورش إقامة الأندلس - طنجة"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      )
                    ) : (
                      <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs text-zinc-500 text-center">
                        يرجى إدخال كود أدمين المدير العام أولاً لتصفية قائمة أوراشه فقط.
                      </div>
                    )}
                  </div>

                  {/* Step 3: Supervisor Name Selection / Custom Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <HardHat className="w-3.5 h-3.5 text-amber-400" />
                        <span>3. اسم المشرف الميداني (Nom du Chef de Chantier)</span>
                        <span className="text-amber-400">*</span>
                      </label>
                      {cleanSupervisorAdminId && managerSupervisors.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCustomSupervisorName(!isCustomSupervisorName)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                        >
                          {isCustomSupervisorName ? 'اختيار من المشرفين المسجلين' : '+ كتابة اسم مشرف جديد'}
                        </button>
                      )}
                    </div>

                    {isCustomSupervisorName || managerSupervisors.length === 0 ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          required
                          value={supervisorName}
                          onChange={(e) => setSupervisorName(e.target.value)}
                          placeholder="اكتب اسم المشرف (مثال: رشيد - شيف شانطي)"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                        />
                        <input
                          type="tel"
                          value={newSupervisorPhone}
                          onChange={(e) => setNewSupervisorPhone(e.target.value)}
                          placeholder="رقم الهاتف (اختياري، مثال: 0661234567)"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    ) : (
                      <select
                        required
                        value={supervisorName}
                        onChange={(e) => setSupervisorName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors text-sm"
                      >
                        <option value="">-- اختر اسمك من قائمة مشرفي هذا المدير --</option>
                        {managerSupervisors.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.name} {s.phone ? `(${s.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Step 4: PIN Code */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>4. رمز الدخول السري (Code PIN)</span>
                        <span className="text-amber-400">*</span>
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">الافتراضي: 1234</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        required
                        maxLength={8}
                        value={supervisorPin}
                        onChange={(e) => setSupervisorPin(e.target.value)}
                        placeholder="••••"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 pr-10 pl-10 text-white font-mono placeholder:font-sans focus:outline-none focus:border-amber-500 transition-colors text-sm tracking-widest text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Step 5: Persistent Auto-login (Cookies / LocalStorage) */}
                  <div className="pt-1">
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/60 hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-zinc-900 border-zinc-700 accent-amber-500"
                      />
                      <span className="font-medium text-white">الحفاظ على تسجيل الدخول وتذكر بيانات الورش في هذا الجهاز</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 font-bold text-zinc-950 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>دخول المشرف الميداني للورش المختار</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Dedicated, Separate Super Admin Portal Entry (Isolated at bottom) */}
              <div className="pt-6 mt-6 border-t border-zinc-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSuperAdminMode(true);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 text-zinc-400 hover:text-amber-400 text-xs font-bold transition-all group cursor-pointer shadow-sm"
                >
                  <Crown className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span>بوابة التحقق الخاصة بالمالك العام (Super Admin)</span>
                  <ArrowLeft className="w-3.5 h-3.5 opacity-60 group-hover:-translate-x-1 transition-transform" />
                </button>
                <p className="text-[10px] text-zinc-600 mt-2">
                  منطقة محصنة ومخصصة حصرياً للمالك الرئيسي للتحكم المركزي وإدارة التراخيص
                </p>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-3.5 px-4 text-center text-xs text-zinc-500">
        منظومة <span className="text-zinc-400 font-bold">XiilL BTP</span> • نظام سحابي لإدارة مقاولات البناء والأشغال العمومية
      </footer>

    </div>
  );
};
