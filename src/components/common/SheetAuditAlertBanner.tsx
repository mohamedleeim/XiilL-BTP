import React from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, FileSpreadsheet, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

export const SheetAuditAlertBanner: React.FC = () => {
  const { auditReport, openAuditModal, runMasterSheetAudit, isAuditing, isPlatformSuperAdmin } = useApp();

  // تنبيهات فحص ملف Google Sheets المركزي ورؤوس الأعمدة تظهر فقط وحصرياً لسوبر أدمين
  if (!isPlatformSuperAdmin) return null;

  if (!auditReport || !auditReport.hasDiscrepancies) return null;

  const diffCount = auditReport.diffs?.length || 0;
  const legacyCount = auditReport.legacyTabs?.length || 0;

  return (
    <div
      id="sheet-audit-alert-banner"
      className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-indigo-500/10 border-b border-amber-200/80 px-4 py-2.5 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs transition-all animate-in slide-in-from-top-2 duration-200"
      dir="rtl"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0 shadow-xs">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-amber-900 ml-1.5">
            تنبيه فحص ملف Google Sheets المركزي:
          </span>
          <span className="text-amber-800">
            تم رصد {diffCount} ملاحظات بالمطابقة
            {legacyCount > 0 && ` (تشمل ${legacyCount} أوراق قديمة من نظام الاستقلالية السابق)`}
            . يمكنك مراجعة رؤوس الأعمدة وقبول التغييرات لتحديث النظام.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
        <button
          onClick={() => runMasterSheetAudit()}
          disabled={isAuditing}
          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
          title="إعادة الفحص المباشر"
        >
          <RefreshCw className={`w-3 h-3 ${isAuditing ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">إعادة فحص</span>
        </button>

        <button
          onClick={openAuditModal}
          className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>فحص وقبول التغييرات</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
