import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  KeyRound, 
  FileSpreadsheet, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Sparkles,
  Users,
  X,
  Building2,
  HardHat,
  RefreshCw,
  Crown
} from 'lucide-react';
import { 
  SUPER_ADMIN_EMAIL, 
  SUPER_ADMIN_MASTER_KEY, 
  KNOWN_MASTER_SPREADSHEET_ID, 
  KNOWN_MASTER_SPREADSHEET_URL 
} from '../../services/googleWorkspace';

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
    activeSession,
    activeChantierSheet,
    logoutGoogleAdmin,
    workspaceConfig,
    syncToGoogleSheets,
    isPlatformSuperAdmin,
    loginWithGoogleAdmin,
    loginAsSuperAdmin
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [masterKeyInput, setMasterKeyInput] = useState('');

  if (!isOpen) return null;

  const isSuperAdmin = isPlatformSuperAdmin;
  const isContractor = activeSession?.type === 'admin' || (!isSuperAdmin && !!currentAdmin);
  const isSupervisor = activeSession?.type === 'supervisor';

  const masterSheetUrl = workspaceConfig.masterSheetUrl || KNOWN_MASTER_SPREADSHEET_URL;

  // Handle immediate sync of the contractor's specific tab to the Master Sheet
  const handleSyncToMaster = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await syncToGoogleSheets();
      setSuccessMessage(res.message || 'تمت مزامنة معطيات ورقتك مع الشيت الأساسي بنجاح!');
    } catch (err: any) {
      setErrorMessage(err.message || 'فشلت المزامنة مع الشيت الأساسي.');
    } finally {
      setIsLoading(false);
    }
  };

  // Super Admin Login via Gmail
  const handleSuperAdminGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await loginWithGoogleAdmin();
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تسجيل دخول سوبر أدمين بـ Gmail.');
    } finally {
      setIsLoading(false);
    }
  };

  // Super Admin Login via Master Key
  const handleSuperAdminKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterKeyInput.trim()) {
      setErrorMessage('يرجى إدخال مفتاح الأمان الرئيسي.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await loginAsSuperAdmin(masterKeyInput.trim());
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'مفتاح الأمان غير صحيح.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
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
                حالة الربط بالشيت الأساسي للمنظومة
              </h2>
              <p className="text-xs text-zinc-400">
                منظومة تخزين موحدة — ورقة مخصصة لكل مقاول بدون الحاجة لتسجيل Gmail
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
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

          {/* VIEW 1: CONTRACTOR ACTIVE (NO GMAIL REQUIRED) */}
          {isContractor && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{currentAdmin?.name || activeSession?.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                          {currentAdmin?.id || activeSession?.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">حساب مقاول معتمد في المنظومة</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                    معفى من تسجيل Gmail ✓
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>الشيت الأساسي للمنظومة:</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {workspaceConfig.masterSheetTitle || 'ملف الورش المركزي'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300 border-t border-zinc-800/80 pt-2">
                    <span>قاعدة البيانات المركزية:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      8 أوراق رئيسية موحدة (Admin ID: {currentAdmin?.id || activeSession?.id})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400 text-[11px] border-t border-zinc-800/80 pt-2">
                    <span>حالة الربط والتزامن:</span>
                    <span className="text-emerald-400 font-bold">نشط ومتصل بالمنظومة</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={handleSyncToMaster}
                    disabled={isLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>مزامنة بيانات مقاولتي مع Google Sheets</span>
                  </button>

                  <a
                    href={masterSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>فتح الشيت</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: SUPERVISOR ACTIVE (NO GMAIL REQUIRED) */}
          {isSupervisor && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      <HardHat className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{activeSession?.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                          مشرف ورش
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        المدير العام التابع له: <span className="text-amber-400 font-mono font-bold">{activeSession?.adminId}</span>
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                    معفى من تسجيل Gmail ✓
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>حساب المقاول المعتمد:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {activeSession?.adminId}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-2">
                    يظهر لك في النظام مشاريع ومعطيات مقاولك المعتمد، وتتم المزامنة المركزية المباشرة مع جداول Google Sheets تلقائياً.
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSyncToMaster}
                    disabled={isLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>تحديث ومزامنة بيانات الورش الآن</span>
                  </button>

                  <a
                    href={masterSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>عرض الشيت</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: SUPER ADMIN ACTIVE (EXCLUSIVE GOOGLE & MASTER MANAGEMENT) */}
          {isSuperAdmin && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>المالك العام (Super Admin)</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                        المنظومة المركزية
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{googleUser?.email || SUPER_ADMIN_EMAIL}</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                  تحكم مركزي كامل
                </span>
              </div>

              <div className="text-xs text-zinc-300 bg-zinc-900 p-3 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span>معرف الشيت الأساسي (Master ID):</span>
                  <span className="font-mono text-zinc-400 text-[10px] truncate max-w-[180px]">
                    {KNOWN_MASTER_SPREADSHEET_ID}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2">
                  <span>هيكلية التخزين:</span>
                  <span className="text-emerald-400 font-bold">8 أوراق مركزية موحدة + عزل تلقائي بالمقاول</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onOpenSuperAdminHub && (
                  <button
                    onClick={() => { onClose(); onOpenSuperAdminHub(); }}
                    className="flex-1 py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>لوحة إدارة المقاولين والمشرفين</span>
                  </button>
                )}

                <button
                  onClick={handleSyncToMaster}
                  disabled={isLoading}
                  className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>مزامنة شاملة لكافة الأوراق</span>
                </button>

                <a
                  href={masterSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  <span>فتح الشيت</span>
                </a>
              </div>
            </div>
          )}

          {/* VIEW 4: NOT LOGGED IN / GUEST (ONLY SUPER ADMIN CAN LOG IN WITH GMAIL) */}
          {!activeSession && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-zinc-300 leading-relaxed space-y-1.5">
                <p className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>تسجيل الدخول بـ Gmail مخصص حصرياً للمالك العام (Super Admin):</span>
                </p>
                <p className="text-[11px] text-zinc-400">
                  كافة المقاولين والمشرفين معفيون من تسجيل الدخول بـ Gmail ويقومون بالدخول مباشرة عبر كود الأدمين أو PIN المشرف.
                </p>
              </div>

              {/* Super Admin Google Sign-In */}
              <button
                onClick={handleSuperAdminGoogleLogin}
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
                <span>دخول Super Admin عبر Gmail ({SUPER_ADMIN_EMAIL})</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink mx-3 text-[11px] text-zinc-500">أو عبر مفتاح الأمان السري</span>
                <div className="flex-grow border-t border-zinc-800"></div>
              </div>

              {/* Super Admin Master Key Entry */}
              <form onSubmit={handleSuperAdminKeyLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-4 text-amber-400" />
                    <span>مفتاح الأمان الرئيسي السري (Super Admin Master Key)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="أدخل مفتاح الأمان السري..."
                    value={masterKeyInput}
                    onChange={(e) => setMasterKeyInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-500 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !masterKeyInput.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-950" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>دخول المالك بمفتاح الأمان الرئيسي</span>
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-[11px] text-zinc-400">
          <span>نظام الشيت الأساسي الموحد نشط ومحمي</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
