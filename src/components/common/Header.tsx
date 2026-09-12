import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Globe, 
  UserCheck, 
  ChevronDown,
  Shield,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  LogOut,
  Crown,
  HardHat,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { AdminLoginModal } from '../auth/AdminLoginModal';

export const Header: React.FC = () => {
  const { 
    t, 
    lang, 
    setLang, 
    currentUser, 
    switchUser, 
    state, 
    accessibleProjects, 
    selectedProjectId, 
    setSelectedProjectId,
    isOnline,
    syncPendingCount,
    triggerSync,
    activeSession,
    logoutSession,
    googleUser,
    isGoogleAuthenticated,
    currentAdmin,
    workspaceConfig,
    syncToGoogleSheets,
    activeChantierSheet,
    openSheetOnboarding,
    openSubscriptionPlans,
    isPlatformSuperAdmin
  } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await triggerSync();
      setSyncFeedback({
        type: 'success',
        message: 'تمت المزامنة وحفظ البيانات في أوراق Google Sheets المركزية بنجاح!'
      });
      setTimeout(() => setSyncFeedback(null), 4500);
    } catch (err: any) {
      console.error('Manual sync error in Header:', err);
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'تعذر إتمام المزامنة مع Google Sheets.'
      });
      setTimeout(() => setSyncFeedback(null), 7000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 text-zinc-100 px-3 sm:px-6 py-2.5">
      {syncFeedback && (
        <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-medium flex items-center gap-2.5 max-w-lg w-[90%] backdrop-blur transition-all animate-in fade-in slide-in-from-top-2 ${
          syncFeedback.type === 'success'
            ? 'bg-zinc-950/95 border-emerald-500/50 text-emerald-300'
            : 'bg-zinc-950/95 border-red-500/50 text-red-300'
        }`}>
          {syncFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="flex-1 leading-snug">{syncFeedback.message}</span>
          <button onClick={() => setSyncFeedback(null)} className="p-1 hover:text-white text-zinc-400 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
          {/* Brand & Project Selector */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-zinc-950 font-bold shadow-sm">
              <Building2 className="w-5 h-5 text-zinc-950" />
            </div>
            <div className="hidden sm:block">
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                <span>XiilL</span>
                <span className="text-amber-500 text-xs px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 font-mono font-bold">BTP</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium leading-none mt-0.5">{t.appTagline}</p>
            </div>
          </div>

          {/* Project Selector */}
          <div className="relative flex items-center min-w-0 max-w-[200px] sm:max-w-xs">
            <Layers className="w-4 h-4 text-zinc-400 absolute right-2.5 rtl:right-2.5 ltr:left-2.5 pointer-events-none" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-zinc-800/90 border border-zinc-700/80 rounded-lg text-xs sm:text-sm text-zinc-200 py-1.5 rtl:pr-8 rtl:pl-3 ltr:pl-8 ltr:pr-3 focus:outline-none focus:border-amber-500 transition-colors truncate font-medium"
            >
              <option value="all">{t.allProjects} ({accessibleProjects.length})</option>
              {accessibleProjects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Action Controls: Sync, Role switch, Language, Lock */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Active Role / Contractor / Supervisor / Super Admin Status */}
          {activeSession ? (
            <div 
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm"
              title={
                isPlatformSuperAdmin 
                  ? 'المالك العام للمنظومة (Super Admin)' 
                  : activeSession.type === 'supervisor' 
                    ? `مشرف ورش لدى: ${activeSession.adminId}` 
                    : `مقاول عام معتمد: ${currentAdmin?.name || activeSession.name}`
              }
            >
              {isPlatformSuperAdmin ? (
                <>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold hidden sm:inline">سوبر أدمين</span>
                </>
              ) : activeSession.type === 'supervisor' ? (
                <>
                  <HardHat className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold hidden sm:inline">مشرف ورش</span>
                  <span className="text-[10px] text-zinc-400 hidden xl:inline truncate max-w-[90px]">
                    ({activeSession.name})
                  </span>
                </>
              ) : (
                <>
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold hidden sm:inline">
                    {currentAdmin?.id || activeSession.id}
                  </span>
                  <span className="text-[10px] text-zinc-400 hidden xl:inline truncate max-w-[90px]">
                    ({currentAdmin?.name || activeSession.name})
                  </span>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAdminModal(true)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border bg-zinc-800/90 border-zinc-700/80 text-zinc-300 hover:border-amber-500/50 hover:text-white transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold hidden sm:inline">دخول المنظومة</span>
            </button>
          )}

          {/* Subscription Plans Button */}
          {activeSession && (
            <button
              id="btn-header-subscription"
              onClick={openSubscriptionPlans}
              className="flex items-center gap-1.5 text-xs px-2 sm:px-2.5 py-1.5 rounded-lg border bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-600/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer shadow-sm"
              title="باقات واشتراكات المنظومة (3 أيام تجريبية، شهرية، سنوية مع خصم 25%)"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline font-bold">
                {currentAdmin?.subscription?.tier === 'annual'
                  ? 'باقة سنوية (خصم 25%)'
                  : currentAdmin?.subscription?.tier === 'monthly'
                  ? 'باقة شهرية'
                  : 'باقة تجريبية (3 أيام)'}
              </span>
              <span className="sm:hidden font-bold">الباقات</span>
            </button>
          )}

          {/* Offline / Online & Sync Pill */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            title={isOnline ? (syncPendingCount > 0 ? `${syncPendingCount} ${t.syncPending}` : t.allSynced) : t.offline}
            className={`flex items-center gap-1.5 text-xs px-2 sm:px-2.5 py-1.5 rounded-lg border transition-all ${
              !isOnline 
                ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                : syncPendingCount > 0 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
            )}
            
            <span className="hidden md:inline font-medium">
              {!isOnline 
                ? t.offline 
                : syncPendingCount > 0 
                  ? `${syncPendingCount} في الطابور` 
                  : 'متزامن'}
            </span>

            <RefreshCw className={`w-3 h-3 text-zinc-400 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Current User Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/70 hover:border-zinc-600 text-xs text-zinc-200 transition-colors"
            >
              <span className="text-sm">{currentUser.avatar || '👤'}</span>
              <div className="hidden lg:flex flex-col text-right rtl:text-right ltr:text-left">
                <span className="font-semibold text-xs leading-tight text-white max-w-[120px] truncate">{currentUser.name}</span>
                <span className="text-[10px] text-amber-400 leading-none">
                  {currentUser.role === 'owner' ? 'المقاول (Owner)' : 'مشرف (Supervisor)'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {showUserMenu && (
              <div className="absolute top-full mt-1.5 rtl:left-0 ltr:right-0 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-2 z-50">
                <div className="px-2 py-1.5 border-b border-zinc-800 mb-1">
                  <p className="text-[11px] text-zinc-400">{t.switchUser}</p>
                </div>
                <div className="space-y-1">
                  {state.users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        switchUser(user.id);
                        setShowUserMenu(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-right rtl:text-right ltr:text-left transition-colors ${
                        user.id === currentUser.id 
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                          : 'hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{user.avatar || '👤'}</span>
                        <div>
                          <p className="font-semibold text-zinc-100">{user.name}</p>
                          <p className="text-[10px] text-zinc-400">
                            {user.role === 'owner' ? t.roleOwner : t.roleSupervisor}
                          </p>
                        </div>
                      </div>
                      {user.id === currentUser.id && (
                        <UserCheck className="w-4 h-4 text-amber-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Language Switch */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
            className="px-2 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
            title="تبديل اللغة (Arabe / Français)"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'FR' : 'عربي'}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={logoutSession}
            className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="تسجيل الخروج والعودة لبوابة الدخول"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>

      </div>

      {/* Admin Login & Google Sheets Linking Modal */}
      <AdminLoginModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />
    </header>
  );
};
