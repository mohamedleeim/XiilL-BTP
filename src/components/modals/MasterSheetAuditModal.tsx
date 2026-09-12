import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Download,
  X,
  ExternalLink,
  Layers,
  Table,
  HelpCircle,
  Database,
  ArrowRightLeft,
  Info
} from 'lucide-react';
import { KNOWN_MASTER_SPREADSHEET_URL } from '../../services/googleWorkspace';

export const MasterSheetAuditModal: React.FC = () => {
  const {
    auditReport,
    isAuditModalOpen,
    isAuditing,
    closeAuditModal,
    runMasterSheetAudit,
    applySheetAuditChanges,
    rebuildUnifiedMasterStructure,
    state
  } = useApp();

  const [isApplying, setIsApplying] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'columns' | 'data' | 'legacy'>('overview');

  if (!isAuditModalOpen) return null;

  const handleApplyChanges = async () => {
    setIsApplying(true);
    setActionFeedback(null);
    try {
      const res = await applySheetAuditChanges();
      setActionFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء تطبيق التغييرات'
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleRebuildStructure = async () => {
    const confirmRebuild = window.confirm(
      'تنبيه مهم:\nسيتم فحص ملف Google Sheets المركزي ومسح كافة الأوراق والتبويبات القديمة أو المستقلة، ثم إعادة إنشاء الأوراق الـ 8 الموحدة مع كافة رؤوس الأعمدة المعيارية ومعرّف المقاول (Admin ID).\n\nهل تريد المتابعة بالتنفيذ؟'
    );
    if (!confirmRebuild) return;

    setIsRebuilding(true);
    setActionFeedback(null);
    try {
      const res = await rebuildUnifiedMasterStructure();
      setActionFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء إعادة هيكلة ملف الشيت'
      });
    } finally {
      setIsRebuilding(false);
    }
  };

  const masterSheetUrl = state.workspaceConfig?.masterSpreadsheetUrl || state.workspaceConfig?.masterSheetUrl || KNOWN_MASTER_SPREADSHEET_URL;

  return (
    <div
      id="master-sheet-audit-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
    >
      <div
        id="master-sheet-audit-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">فحص ومطابقة ملف Google Sheets المركزي</h3>
                {auditReport?.hasDiscrepancies ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    توجد فروقات تحتاج معالجة
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    الهيكلة متطابقة 100%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                تدقيق ثنائي الاتجاه بين ذاكرة النظام وملف الشيت المركزي الموحد (النموذج الجديد غير المستقل)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {masterSheetUrl && (
              <a
                href={masterSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-slate-200 transition-colors flex items-center gap-1.5"
                title="فتح ملف الشيت في تبويب جديد"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">فتح الشيت</span>
              </a>
            )}
            <button
              onClick={() => runMasterSheetAudit()}
              disabled={isAuditing}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors disabled:opacity-50"
              title="إعادة الفحص المباشر"
            >
              <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={closeAuditModal}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {actionFeedback && (
          <div
            className={`px-6 py-3 text-sm flex items-center gap-2 border-b ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-slate-50 flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Info className="w-4 h-4" />
            نظرة عامة والملخص
          </button>
          <button
            onClick={() => setActiveTab('columns')}
            className={`pb-2.5 px-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'columns'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-4 h-4" />
            فحص رؤوس الأعمدة ({auditReport?.columnsComparison?.filter(c => !c.match).length || 0})
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`pb-2.5 px-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'data'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            مطابقة السجلات والبيانات
          </button>
          <button
            onClick={() => setActiveTab('legacy')}
            className={`pb-2.5 px-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'legacy'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            الأوراق القديمة / المستقلة ({auditReport?.legacySheetsFound?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Quick Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
                    <span>الأوراق المعيارية المكتشفة</span>
                    <Layers className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">
                    {auditReport?.discoveredSheets?.filter(s =>
                      ['Admin_Registry', 'Chantiers_Projets', 'Bordereau_CPS', 'Pointage_Journalier', 'Paie_Ouvriers', 'Achats_Fournisseurs', 'Depenses_Chantier', 'Decomptes_Clients'].includes(s)
                    ).length || 0}
                    <span className="text-sm font-normal text-slate-400 mr-1">/ 8 أوراق</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {auditReport?.missingStandardSheets?.length === 0
                      ? 'جميع الأوراق المعيارية موجودة'
                      : `ينقص ${auditReport?.missingStandardSheets?.length || 0} أوراق`}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
                    <span>الأوراق القديمة المطلوب مسحها</span>
                    <Trash2 className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">
                    {auditReport?.legacySheetsFound?.length || 0}
                    <span className="text-sm font-normal text-slate-400 mr-1">ورقة زائدة</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {auditReport?.legacySheetsFound && auditReport.legacySheetsFound.length > 0
                      ? 'أوراق سابقة لنظام الاستقلالية القديم'
                      : 'الملف نظيف من الأوراق القديمة'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
                    <span>حالة مقاولي البناء (Admins)</span>
                    <Database className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">
                    {auditReport?.fetchedData?.admins?.length || state.adminAccounts.length}
                    <span className="text-sm font-normal text-slate-400 mr-1">حساب مقاول</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    متصلين بالملف المركزي الموحد
                  </div>
                </div>
              </div>

              {/* Discrepancies Alerts List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    قائمة التنبيهات والفروقات المسجلة ({auditReport?.diffs?.length || 0})
                  </h4>
                  <span className="text-xs text-slate-500">
                    آخر فحص: {auditReport?.timestamp ? new Date(auditReport.timestamp).toLocaleTimeString('ar-MA') : 'الآن'}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {auditReport?.diffs && auditReport.diffs.length > 0 ? (
                    auditReport.diffs.map((diff, idx) => (
                      <div key={idx} className="p-3.5 flex items-start gap-3 hover:bg-slate-50/80 transition-colors">
                        <span
                          className={`mt-0.5 px-2 py-0.5 text-xs font-bold rounded-md shrink-0 ${
                            diff.severity === 'error'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : diff.severity === 'warning'
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {diff.severity === 'error' ? 'حرج' : diff.severity === 'warning' ? 'تنبيه' : 'معلومة'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {diff.sheetName}
                            </span>
                            <span className="text-xs text-slate-800">{diff.description}</span>
                          </div>
                          <p className="text-xs text-indigo-600 mt-1 font-medium flex items-center gap-1">
                            <span>الإجراء الموصى به:</span>
                            <span>{diff.recommendedAction}</span>
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-sm">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      لا توجد أي فروقات مسجلة! النظام والشيت متطابقان وفق الهيكلة الموحدة الحديثة.
                    </div>
                  )}
                </div>
              </div>

              {/* Explanatory Note on Centralized Storage */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 leading-relaxed flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block mb-1">حول الهيكلة المركزية الموحدة (XiilL BTP):</strong>
                  تم إلغاء نظام إنشاء أوراق مستقلة لكل مقاول. الآن تُحفظ كافة بيانات المقاولين، المشاريع، بوانطاج العمال، المشتريات والمصاريف في 8 أوراق مركزية موحدة فقط، مع تمييز بيانات كل مقاول عبر عمود إلزامي موحد: <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-bold">ID المقاول (Admin ID)</code>، مما يضمن سرعة التصفح وعدم تجاوز حدود Google Sheets وتوحيد قاعدة البيانات.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COLUMNS COMPARISON */}
          {activeTab === 'columns' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                يقوم هذا الفحص بمقارنة رؤوس الأعمدة الموجودة فعلياً في ملف الشيت مقارنة برؤوس الأعمدة المعيارية المطلوبة في المنظومة.
              </div>

              <div className="space-y-3">
                {auditReport?.columnsComparison && auditReport.columnsComparison.length > 0 ? (
                  auditReport.columnsComparison.map((item, idx) => (
                    <div
                      key={idx}
                      className={`bg-white rounded-xl border p-4 shadow-xs ${
                        item.match ? 'border-slate-200' : 'border-amber-300 bg-amber-50/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Table className="w-4 h-4 text-indigo-600" />
                          <h5 className="font-bold text-sm text-slate-800">{item.sheetName}</h5>
                        </div>
                        {item.match ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            الأعمدة متطابقة
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            فروقات في الأعمدة
                          </span>
                        )}
                      </div>

                      {item.missingInSheet.length > 0 && (
                        <div className="mt-2 text-xs">
                          <span className="font-semibold text-rose-700 block mb-1">
                            أعمدة معيارية ناقصة في الشيت ({item.missingInSheet.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.missingInSheet.map((col, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[11px]"
                              >
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.extraInSheet.length > 0 && (
                        <div className="mt-2 text-xs">
                          <span className="font-semibold text-slate-600 block mb-1">
                            أعمدة إضافية موجودة بالشيت ({item.extraInSheet.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.extraInSheet.map((col, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[11px]"
                              >
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                    لا تتوفر تفاصيل فحص الأعمدة حالياً. يرجى الضغط على زر إعادة الفحص.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DATA COMPARISON */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <span>مقارنة عدد السجلات المحفوظة في النظام المحلي مقابل الموجودة في ملف Google Sheets المركزي.</span>
                <span className="font-bold text-indigo-700">ميزة الجلب التلقائي مفعلة</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-xs text-right divide-y divide-slate-200">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-4">الورقة / الوحدة</th>
                      <th className="py-2.5 px-4 text-center">الموجود بالنظام</th>
                      <th className="py-2.5 px-4 text-center">الموجود بالشيت</th>
                      <th className="py-2.5 px-4 text-center">الفارق</th>
                      <th className="py-2.5 px-4 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {auditReport?.entityCounts && auditReport.entityCounts.length > 0 ? (
                      auditReport.entityCounts.map((ec, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-4 font-medium text-slate-900">{ec.entityName}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">{ec.systemCount}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-indigo-700">{ec.sheetCount}</td>
                          <td className="py-2.5 px-4 text-center font-mono">
                            {ec.diff === 0 ? (
                              <span className="text-slate-400">0</span>
                            ) : ec.diff > 0 ? (
                              <span className="text-emerald-600 font-bold">+{ec.diff} بالشيت</span>
                            ) : (
                              <span className="text-amber-600 font-bold">{ec.diff}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {ec.diff === 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                                متطابق
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                                يحتاج دمج
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          اضغط على فحص لتحديث مقارنة السجلات.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LEGACY SHEETS CLEANUP */}
          {activeTab === 'legacy' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1.5 text-sm text-amber-950">
                  <Trash2 className="w-4 h-4 text-amber-700" />
                  تنظيف الأوراق السابقة الخاصة بنظام الاستقلالية الملغى:
                </div>
                في الإصدارات السابقة، كان النظام يُنشئ ورقة مستقلة لكل مقاول أو ورش. الآن، وبناءً على التغييرات الجديدة، يتم تجميع وتخزين كل البيانات في 8 أوراق معيارية موحدة. الأوراق المدرجة أدناه قديمة ويمكن مسحها لتنظيف الملف وتخفيف وزنه.
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
                <h5 className="font-bold text-xs text-slate-700 mb-3">الأوراق الزائدة المكتشفة في الملف المركزي:</h5>
                {auditReport?.legacySheetsFound && auditReport.legacySheetsFound.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {auditReport.legacySheetsFound.map((name, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-slate-700">{name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                          ورقة قديمة
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    لا توجد أي أوراق قديمة أو زائدة في ملف Google Sheets.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Button 1: Rebuild and Clean Legacy Sheets */}
            <button
              onClick={handleRebuildStructure}
              disabled={isRebuilding || isAuditing}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              title="مسح الأوراق القديمة وتأسيس الهيكلة الموحدة"
            >
              {isRebuilding ? (
                <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
              ) : (
                <Trash2 className="w-4 h-4 text-rose-600" />
              )}
              <span>مسح الأوراق القديمة وتأسيس الهيكلة الموحدة</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={closeAuditModal}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              تجاهل ومتابعة
            </button>

            {/* Button 2: Apply and Merge Sheet Changes into System */}
            <button
              onClick={handleApplyChanges}
              disabled={isApplying || isAuditing}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isApplying ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
              <span>قبول وتطبيق التغييرات في النظام</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
