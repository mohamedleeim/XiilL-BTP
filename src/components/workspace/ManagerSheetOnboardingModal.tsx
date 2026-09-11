import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FileSpreadsheet, 
  Sparkles, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Wrench, 
  X, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  Database
} from 'lucide-react';
import { BTP_STANDARD_SHEETS, SheetValidationResult } from '../../services/googleWorkspace';

export const ManagerSheetOnboardingModal: React.FC = () => {
  const {
    isSheetOnboardingOpen,
    closeSheetOnboarding,
    currentAdmin,
    isGoogleAuthenticated,
    googleUser,
    setupManagerSheetWithGoogle,
    setupManagerSheetFromPastedUrl,
    activeChantierSheet,
    syncToGoogleSheets
  } = useApp();

  const [selectedMode, setSelectedMode] = useState<'smart_google' | 'paste_url' | null>(null);
  const [pastedUrl, setPastedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<SheetValidationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isSheetOnboardingOpen) return null;

  // Handle Smart Google Drive & Sheets Setup
  const handleSmartGoogleSetup = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setValidationResult(null);

    try {
      const validation = await setupManagerSheetWithGoogle();
      setValidationResult(validation);
      setSuccessMsg(validation.message || 'تم ربط وضبط جدول Google Sheets بنجاح!');
      // Trigger initial sync to push current state into the sheet
      try {
        await syncToGoogleSheets(currentAdmin?.id);
      } catch (syncErr) {
        console.warn('Initial sync notice:', syncErr);
      }
    } catch (err: any) {
      console.error('Google Setup error:', err);
      setErrorMsg(err.message || 'تعذر الاتصال بـ Google Sheets. يرجى التأكد من الصلاحيات والمحاولة مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Pasted URL Verification
  const handleVerifyPastedUrl = async (autoRepair: boolean = false) => {
    if (!pastedUrl.trim()) {
      setErrorMsg('يرجى إدخال رابط جدول بيانات Google Sheets.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const validation = await setupManagerSheetFromPastedUrl(pastedUrl.trim(), autoRepair);
      setValidationResult(validation);
      if (validation.allTabsPresent) {
        setSuccessMsg(validation.message);
        try {
          await syncToGoogleSheets(currentAdmin?.id);
        } catch (syncErr) {
          console.warn('Sync warning:', syncErr);
        }
      } else {
        setErrorMsg(validation.message);
      }
    } catch (err: any) {
      console.error('Verify URL error:', err);
      setErrorMsg(err.message || 'فشل فحص الرابط. تأكد من أن الرابط صحيح وأن الملف مفتوح لمن لديه الرابط.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      id="manager-sheet-onboarding-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 p-6 text-white relative">
          <button 
            id="btn-close-sheet-onboarding"
            onClick={closeSheetOnboarding}
            className="absolute top-5 left-5 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
            title="إغلاق والتأجيل لاحقاً"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
              <FileSpreadsheet className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-200 border border-amber-300/30 mb-1">
                <Sparkles className="w-3 h-3" />
                فضاء {currentAdmin?.name || 'المقاول'} — منظومة الشيت الموحد
              </span>
              <h2 className="text-xl font-bold tracking-tight">
                الشيت الأساسي المركزي ومعطيات أوراش المقاولة
              </h2>
            </div>
          </div>
          <p className="text-amber-100/90 text-sm mt-1 max-w-2xl leading-relaxed">
            تم تخصيص ورقة عمل مستقلة لمقاولتك داخل الشيت الأساسي لـ Super Admin. أنت وجميع المشرفين معفيون تماماً من تسجيل الدخول بـ Gmail، ويتم توجيه جميع الحسابات والمعطيات تلقائياً إلى ورقتك.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">

          {/* Current Connected Status (if any) */}
          {activeChantierSheet.url && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                    الملف المرتبط حالياً: {activeChantierSheet.title || 'ملف الأوراش المركزي'}
                  </span>
                  <span className="block text-xs text-emerald-700 dark:text-emerald-300">
                    مزامنة مستقلة للمدير العام: {currentAdmin?.id}
                  </span>
                </div>
              </div>
              <a 
                href={activeChantierSheet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-100 rounded-lg transition-colors"
              >
                <span>فتح في Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Mode Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Option 1: Gmail Smart Auto */}
            <div 
              id="card-smart-google-mode"
              onClick={() => setSelectedMode('smart_google')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedMode === 'smart_google'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-full">
                  موصى به (تلقائي 100%)
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1">
                تسجيل الدخول بـ Gmail والإنشاء / الفحص التلقائي
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                يقوم النظام بالبحث أولاً في Drive للتأكد من وجود ملف سابق، فإن وجده فحص أوراقه الثمانية وصلح أي نقص لضمان مزامنة حقيقية بدون أخطاء، وإن لم يوجد ينشئه تلقائياً!
              </p>
              <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium space-y-1">
                <div>✓ فحص Drive الآلي للبحث عن ملف XiilL BTP</div>
                <div>✓ التدقيق في وجود الأوراق الـ 8 وتنسيقها</div>
                <div>✓ ربط وحفظ الملف تحت حسابك الخاص</div>
              </div>
            </div>

            {/* Option 2: Paste Existing URL */}
            <div 
              id="card-paste-url-mode"
              onClick={() => setSelectedMode('paste_url')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedMode === 'paste_url'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Link2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 rounded-full">
                  لدي ملف جاهز مسبقاً
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1">
                لصق رابط الملف والتأكد من مطابقة المعطيات
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                إذا كان لديك مسبقاً جدول بيانات أعددته أو شاركته معك الإدارة، الصق الرابط هنا للتأكد هل يتطابق مع معطيات وأوراق التطبيق أم يحتاج إصلاحاً.
              </p>
              <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium space-y-1">
                <div>✓ التحقق من صلاحية الرابط وأذونات الوصول</div>
                <div>✓ فحص الأوراق الثمانية (CPS، بوانطاج، مصاريف...)</div>
                <div>✓ إمكانية الإصلاح الذاتي التلقائي لأي ورقة ناقصة</div>
              </div>
            </div>

          </div>

          {/* Mode 1 Interactive Actions */}
          {selectedMode === 'smart_google' && (
            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    متابعة الإعداد التلقائي عبر حساب Gmail
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isGoogleAuthenticated 
                      ? `أنت متصل حالياً بـ: ${googleUser?.email}` 
                      : 'سيتطلب ذلك تسجيل دخول سريع بـ Gmail لمنح صلاحية إنشاء وفحص الشيت'}
                  </p>
                </div>
                {isGoogleAuthenticated && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded-full font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    متصل بـ Google
                  </span>
                )}
              </div>

              <button
                id="btn-trigger-smart-google"
                disabled={isLoading}
                onClick={handleSmartGoogleSetup}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري فحص Google Drive وإنشاء/مطابقة الأوراق الثمانية...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-200" />
                    <span>
                      {isGoogleAuthenticated 
                        ? 'فحص ملفاتي وإنشاء / مزامنة الشيت تلقائياً' 
                        : 'تسجيل الدخول بـ Gmail والمتابعة التلقائية'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Mode 2 Interactive Actions */}
          {selectedMode === 'paste_url' && (
            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  الصق رابط ملف Google Sheets الخاص بك هنا:
                </label>
                <div className="relative">
                  <input
                    id="input-manager-pasted-url"
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/1a2b3c.../edit"
                    value={pastedUrl}
                    onChange={(e) => setPastedUrl(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    dir="ltr"
                  />
                  <Link2 className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  تأكد من أن خيار المشاركة في الملف مضبوط على: أي شخص لديه الرابط (Tous les utilisateurs avec le lien).
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  id="btn-verify-pasted-url"
                  disabled={isLoading || !pastedUrl.trim()}
                  onClick={() => handleVerifyPastedUrl(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري فحص معطيات وأوراق الملف...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>فحص معطيات وأوراق الملف هل توافق التطبيق</span>
                    </>
                  )}
                </button>

                {validationResult && !validationResult.allTabsPresent && (
                  <button
                    id="btn-repair-missing-tabs"
                    disabled={isLoading}
                    onClick={() => handleVerifyPastedUrl(true)}
                    className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Wrench className="w-4 h-4 text-amber-200" />
                    <span>إصلاح وإضافة الأوراق الناقصة تلقائياً</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMsg}</div>
            </div>
          )}

          {/* Validation Checklist for the 8 Sheets */}
          {validationResult && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>نتيجة فحص الأوراق الثمانية المطلوبة لمنظومة XiilL BTP:</span>
                </h4>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  validationResult.allTabsPresent 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' 
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                }`}>
                  {validationResult.existingTabs.length} من أصل {BTP_STANDARD_SHEETS.length} أوراق مطابقة
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {validationResult.tabStatuses.map((tab, idx) => {
                  const isOk = tab.status === 'ok' || tab.status === 'repaired';
                  return (
                    <div 
                      key={tab.title}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isOk
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                          : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold border border-slate-200 dark:border-slate-700">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold">{tab.label}</div>
                          <div className="text-[10px] font-mono opacity-80" dir="ltr">{tab.title}</div>
                        </div>
                      </div>
                      <div>
                        {tab.status === 'ok' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            مطابقة
                          </span>
                        )}
                        {tab.status === 'repaired' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 font-bold">
                            <Wrench className="w-3.5 h-3.5" />
                            تم إصلاحها
                          </span>
                        )}
                        {tab.status === 'missing' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-300 font-bold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            غير موجودة
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            id="btn-skip-sheet-onboarding"
            onClick={closeSheetOnboarding}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
          >
            المتابعة والعمل محلياً الآن (يمكنك الربط لاحقاً)
          </button>

          {validationResult?.allTabsPresent ? (
            <button
              id="btn-confirm-and-proceed"
              onClick={closeSheetOnboarding}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>تم التحقق والاعتماد بنجاح — الدخول للبرنامج</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          ) : (
            <button
              id="btn-close-onboarding-alt"
              onClick={closeSheetOnboarding}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all"
            >
              إغلاق النافذة
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
