import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FileSpreadsheet, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  Building2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { BTP_STANDARD_SHEETS, SheetValidationResult } from '../../services/googleWorkspace';

interface SupervisorSheetSyncCardProps {
  compact?: boolean;
}

export const SupervisorSheetSyncCard: React.FC<SupervisorSheetSyncCardProps> = ({ compact = false }) => {
  const {
    activeSession,
    activeChantierSheet,
    verifySupervisorSheetUrl,
    bindSupervisorSheetUrl,
    syncToGoogleSheets
  } = useApp();

  const [pastedUrl, setPastedUrl] = useState(activeChantierSheet.url || '');
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<SheetValidationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!activeChantierSheet.url || !compact);

  const isSupervisor = activeSession?.type === 'supervisor';

  // Handle Sheet Verification
  const handleVerifySheet = async (urlToVerify?: string) => {
    const targetUrl = (urlToVerify || pastedUrl).trim();
    if (!targetUrl) {
      setErrorMsg('يرجى إدخال رابط ملف Google Sheets الذي زودك به المدير العام.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const validation = await verifySupervisorSheetUrl(targetUrl);
      setValidationResult(validation);
      if (validation.allTabsPresent) {
        setSuccessMsg('تم التحقق بنجاح: ملف الشيت هو هو وجميع الأوراق الثمانية متطابقة وجاهزة!');
      } else {
        setErrorMsg(validation.message);
      }
    } catch (err: any) {
      console.error('Supervisor verify error:', err);
      setErrorMsg(err.message || 'تعذر الوصول إلى جدول البيانات. يرجى مراجعة الرابط والتأكد من مشاركته.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Binding & Committing the Sheet
  const handleBindSheet = async () => {
    const targetUrl = pastedUrl.trim();
    if (!targetUrl) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const validation = await bindSupervisorSheetUrl(targetUrl);
      setValidationResult(validation);
      setSuccessMsg('تم ربط واعتماد ملف الورش بنجاح! جميع المعطيات أصبحت متصلة بالشيت.');
      try {
        await syncToGoogleSheets();
      } catch (syncErr) {
        console.warn('Supervisor sync notice:', syncErr);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل اعتماد الملف.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      id="supervisor-sheet-sync-card"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
      dir="rtl"
    >
      {/* Top Banner / Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base">
                ملف Google Sheets المعتمد للورش
              </h3>
              {activeChantierSheet.source === 'manager_inherited' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  موروث تلقائياً من المدير العام
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              {activeSession?.adminId ? `المدير العام المشرف: ${activeSession.adminId}` : 'مزامنة معطيات الورش'}
            </p>
          </div>
        </div>

        {activeChantierSheet.url && (
          <div className="flex items-center gap-2">
            <a
              id="link-open-supervisor-sheet"
              href={activeChantierSheet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <span>معاينة الشيت</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              id="btn-quick-verify-inherited"
              disabled={isLoading}
              onClick={() => handleVerifySheet(activeChantierSheet.url!)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>تأكيد تطابق الأوراق</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 space-y-4">
        
        {/* Inherited Info Badge */}
        {activeChantierSheet.url ? (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 flex-1">
              <div className="font-bold text-emerald-900 dark:text-emerald-200">
                ✅ أنت متصل بملف الشيت المعتمد: {activeChantierSheet.title || 'ملف XiilL BTP للأوراش'}
              </div>
              <div className="text-emerald-700 dark:text-emerald-300">
                يتم توجيه جميع عمليات البوانطاج والمصاريف والسلع الخاصة بورشك إلى هذا الملف المركزي تلقائياً.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 flex-1">
              <div className="font-bold text-amber-900 dark:text-amber-200">
                لم يتم تحديد رابط Google Sheets بعد لهذا الورش
              </div>
              <div className="text-amber-700 dark:text-amber-300">
                يرجى لصق الرابط الذي زودك به المدير العام في الخانة أسفله للتأكد من أن الملف هو هو وأن أوراقه متطابقة.
              </div>
            </div>
          </div>
        )}

        {/* Dedicated URL Input for Supervisor */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            الصق رابط ملف Google Sheets الذي زودك به المدير العام:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                id="input-supervisor-sheet-url"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
                className="w-full pl-4 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                dir="ltr"
              />
              <Link2 className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>

            <button
              id="btn-supervisor-verify"
              disabled={isLoading || !pastedUrl.trim()}
              onClick={() => handleVerifySheet()}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الفحص...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>فحص وتأكيد تطابق الملف والأوراق</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        {/* Verified 8 Tabs Checklist Display */}
        {validationResult && (
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>حالة الأوراق الثمانية في هذا الملف:</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                validationResult.allTabsPresent 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
              }`}>
                {validationResult.existingTabs.length} من أصل 8 متطابقة
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {validationResult.tabStatuses.map(tab => {
                const isOk = tab.status === 'ok';
                return (
                  <div 
                    key={tab.title}
                    className={`p-2 rounded-lg border text-center text-xs ${
                      isOk 
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300' 
                        : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <div className="font-semibold text-[11px] truncate">{tab.label}</div>
                    <div className="text-[9px] font-mono opacity-70" dir="ltr">{tab.title}</div>
                    <div className="mt-1 flex items-center justify-center">
                      {isOk ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {validationResult.allTabsPresent && pastedUrl.trim() !== activeChantierSheet.url && (
              <button
                id="btn-confirm-bind-supervisor"
                disabled={isLoading}
                onClick={handleBindSheet}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد وربط هذا الملف فوراً للورش</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
