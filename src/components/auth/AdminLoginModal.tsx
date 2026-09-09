import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  KeyRound, 
  Link2, 
  FileSpreadsheet, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Check, 
  ExternalLink,
  Sparkles,
  Users,
  X,
  Mail
} from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '../../services/googleWorkspace';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWorkspaceHub?: () => void;
  onOpenSuperAdminHub?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onOpenWorkspaceHub,
  onOpenSuperAdminHub
}) => {
  const { 
    googleUser, 
    isGoogleAuthenticated, 
    currentAdmin, 
    loginWithGoogleAdmin, 
    logoutGoogleAdmin,
    setGuestGoogleSheetUrl,
    workspaceConfig,
    syncToGoogleSheets,
    isPlatformSuperAdmin
  } = useApp();

  const [activeTab, setActiveTab] = useState<'gmail' | 'sheets_link'>('gmail');
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [guestSheetUrlInput, setGuestSheetUrlInput] = useState(workspaceConfig.guestSheetUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await loginWithGoogleAdmin(adminCodeInput);
      setSuccessMessage(res.message);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      const errStr = String(err?.message || '');
      if (errStr.includes('userinfo') || errStr.includes('invalid-credential') || errStr.includes('401')) {
        setErrorMessage('تعذر استكمال المصادقة التلقائية عبر نافذة Google نظراً لقيود المتصفح أو أذونات الحساب.');
      } else {
        setErrorMessage(err.message || 'فشل تسجيل الدخول بـ Gmail.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkGuestSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestSheetUrlInput.trim()) {
      setErrorMessage('يرجى إدخال رابط ملف Google Sheets.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await setGuestGoogleSheetUrl(guestSheetUrlInput.trim());
      setSuccessMessage(res.message);
      // Attempt immediate sync
      try {
        await syncToGoogleSheets();
        setSuccessMessage('تم ربط ملف Google Sheets ومزامنة بيانات الأوراش بنجاح!');
      } catch (syncErr: any) {
        // still linked
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر استخراج معرف جدول Google Sheets من الرابط.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSuperAdmin = isPlatformSuperAdmin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                فضاء الأدمين والربط السحابي (Google Workspace)
              </h2>
              <p className="text-xs text-zinc-400">
                تسجيل الدخول للأدمينات وإمكانية الربط المباشر مع Google Sheets
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 p-1.5 bg-zinc-950/60 border-b border-zinc-800 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('gmail'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'gmail' 
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>تسجيل الدخول بـ Gmail للأدمينات</span>
          </button>
          <button
            onClick={() => { setActiveTab('sheets_link'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'sheets_link' 
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ربط Google Sheets (بدون تسجيل)</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Status Banners */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* TAB 1: GMAIL AUTH FOR ADMINS */}
          {activeTab === 'gmail' && (
            <div className="space-y-4">
              
              {/* If already logged in */}
              {isGoogleAuthenticated && currentAdmin ? (
                <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                        ✓
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{currentAdmin.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                            {currentAdmin.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">{googleUser?.email}</p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                      {isSuperAdmin ? 'الأدمين الكبير (Super Admin)' : 'أدمين معتمد'}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <span>فضاء العمل الخاص بك:</span>
                    <span className="font-bold text-amber-400">
                      {isSuperAdmin ? 'المنظومة المركزية (كافة الأوراش)' : `مشاريع المقاول (${currentAdmin.name})`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {isSuperAdmin && onOpenSuperAdminHub && (
                      <button
                        onClick={() => { onClose(); onOpenSuperAdminHub(); }}
                        className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        <span>لوحة الأدمين الكبير والمشرفين</span>
                      </button>
                    )}

                    {onOpenWorkspaceHub && (
                      <button
                        onClick={() => { onClose(); onOpenWorkspaceHub(); }}
                        className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>مركز Google Workspace</span>
                      </button>
                    )}

                    <button
                      onClick={logoutGoogleAdmin}
                      className="py-2 px-3 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>خروج</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Not logged in: Show Admin ID field + Google Sign-In button */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-zinc-300 leading-relaxed space-y-1">
                    <p className="font-bold text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>تسجيل الدخول بـ Gmail مخصص للأدمينات وأصحاب المقاولات:</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      كل أدمين لديه نظامه المستقل الخاص به (لا تظهر له مشاريع الأدمينات الآخرين). يقوم الأدمين الكبير بتزويدك بكود خاص بك (Admin ID) لربطه بحسابك.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>كود الأدمين الخاص بك (Code Admin ID)</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        (مطلوب إذا كنت تسجل لأول مرة)
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: ADM-7842-K9"
                      value={adminCodeInput}
                      onChange={(e) => setAdminCodeInput(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-500 text-white font-mono text-xs placeholder:text-zinc-600 focus:outline-none tracking-wider"
                    />
                    <p className="text-[10px] text-zinc-400">
                      * إذا لم يكن لديك كود، يرجى التواصل مع الأدمين الكبير للمنظومة (<span className="text-amber-400 font-mono">mohamedleeim@gmail.com</span>) لإنشاء كودك الخاص.
                    </p>
                  </div>

                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                    )}
                    <span>المتابعة وتسجيل الدخول بـ Google</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIRECT GOOGLE SHEETS LINK (WITHOUT LOGIN) */}
          {activeTab === 'sheets_link' && (
            <form onSubmit={handleLinkGuestSheet} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-zinc-300 leading-relaxed">
                <p className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>مزامنة مباشرة عبر رابط Google Sheets (بدون تسجيل الدخول):</span>
                </p>
                <p className="text-[11px] text-zinc-400">
                  إذا لم ترغب في تسجيل الدخول بـ Gmail، يمكنك وضع رابط ملف Google Sheets هنا. سيتولى النظام استخراج المعرف ومزامنة كافة جداول الأوراش والـ CPS ومصاريف الشانطي معه مباشرة.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>رابط ملف Google Sheets (URL أو Spreadsheet ID)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  value={guestSheetUrlInput}
                  onChange={(e) => setGuestSheetUrlInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-emerald-500 text-white text-xs placeholder:text-zinc-600 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-zinc-400">
                  * تأكد من إعطاء صلاحية القراءة والتعديل لأي شخص لديه الرابط (Anyone with the link can edit) إذا لم تكن مسجلاً الدخول.
                </p>
              </div>

              {workspaceConfig.guestSheetId && (
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-zinc-300">الجدول المربوط حالياً:</span>
                  </div>
                  <a
                    href={workspaceConfig.guestSheetUrl || `https://docs.google.com/spreadsheets/d/${workspaceConfig.guestSheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>فتح في تبويب جديد</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-950" /> : <Link2 className="w-4 h-4" />}
                  <span>حفظ الرابط ومزامنة بيانات الورش</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-[11px] text-zinc-400">
          <span>نظام التخزين المحلي والـ Offline نشط دائماً</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
