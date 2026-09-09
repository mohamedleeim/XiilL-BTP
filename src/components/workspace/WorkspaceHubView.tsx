import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FileSpreadsheet, 
  HardDrive, 
  MessageSquare, 
  RefreshCw, 
  UploadCloud, 
  ExternalLink, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FolderPlus, 
  FileText, 
  Sparkles, 
  Building2, 
  Users, 
  DollarSign, 
  Truck,
  Link2,
  Lock
} from 'lucide-react';
import { extractSpreadsheetId } from '../../services/googleWorkspace';
import { SupervisorSheetSyncCard } from './SupervisorSheetSyncCard';

export const WorkspaceHubView: React.FC = () => {
  const { 
    state, 
    workspaceConfig, 
    updateWorkspaceConfig, 
    syncToGoogleSheets, 
    createMasterSheet, 
    setGuestGoogleSheetUrl, 
    backupToDrive, 
    uploadToDrive, 
    sendChantierChatNotification, 
    sendCustomChatMessage,
    isGoogleAuthenticated,
    googleUser,
    currentAdmin,
    superAdminMode,
    openSheetOnboarding,
    activeChantierSheet,
    activeSession
  } = useApp();

  const [activeTab, setActiveTab] = useState<'sheets' | 'drive' | 'chat'>('sheets');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sheets Tab State
  const [sheetUrlInput, setSheetUrlInput] = useState(workspaceConfig.guestSheetUrl || workspaceConfig.masterSheetUrl || '');

  // Drive Tab State
  const [driveUploadFile, setDriveUploadFile] = useState<File | null>(null);
  const [driveUploadCategory, setDriveUploadCategory] = useState<'plan' | 'bl' | 'photo' | 'report'>('bl');

  // Chat Tab State
  const [chatWebhookInput, setChatWebhookInput] = useState(workspaceConfig.chatWebhookUrl || '');
  const [customChatMessage, setCustomChatMessage] = useState('');
  const [selectedChatProject, setSelectedChatProject] = useState<string>(state.projects[0]?.id || '');

  // 1. SHEETS HANDLERS
  const handleSyncSheets = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await syncToGoogleSheets();
      setNotification({ type: 'success', text: res.message });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشل مزامنة Google Sheets.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewMaster = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await createMasterSheet('XiilL BTP — أوراش البناء والـ CPS');
      setNotification({ type: 'success', text: `تم إنشاء الجدول بنجاح! المعرف: ${res.id}` });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشل إنشاء جدول Google Sheets جديد.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSheetUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrlInput.trim()) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await setGuestGoogleSheetUrl(sheetUrlInput.trim());
      setNotification({ type: 'success', text: res.message });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'رابط Google Sheets غير صالح.' });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. DRIVE HANDLERS
  const handleBackupToDrive = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await backupToDrive();
      setNotification({ 
        type: 'success', 
        text: `تم حفظ نسخة احتياطية كاملة إلى Google Drive بنجاح! الملف: ${res.name}` 
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشل رفع النسخة الاحتياطية إلى Drive.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUploadToDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveUploadFile) return;

    setIsLoading(true);
    setNotification(null);
    try {
      const prefix = driveUploadCategory.toUpperCase();
      const fileName = `${prefix}_${Date.now()}_${driveUploadFile.name}`;
      const res = await uploadToDrive(fileName, driveUploadFile, driveUploadFile.type);
      setNotification({ 
        type: 'success', 
        text: `تم رفع المستند إلى مجلد XiilL_BTP في Google Drive بنجاح! (${res.name})` 
      });
      setDriveUploadFile(null);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشل رفع الملف إلى Google Drive.' });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. CHAT HANDLERS
  const handleSaveChatWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkspaceConfig({ chatWebhookUrl: chatWebhookInput.trim() });
    setNotification({ type: 'success', text: 'تم حفظ رابط Google Chat Webhook بنجاح!' });
  };

  const handleSendChatReport = async (type: 'daily' | 'payroll' | 'debt' | 'cps') => {
    setIsLoading(true);
    setNotification(null);
    try {
      const targetProj = state.projects.find(p => p.id === selectedChatProject) || state.projects[0];
      
      const payload = {
        project: targetProj,
        projects: state.projects,
        workers: state.workers,
        purchases: state.purchases,
        expenses: state.expenses,
        cpsArticles: state.cpsArticles.filter(a => a.projectId === targetProj?.id),
        date: new Date().toISOString()
      };

      await sendChantierChatNotification(type, payload);
      setNotification({ 
        type: 'success', 
        text: 'تم إرسال الإشعار والتقرير إلى فضاء Google Chat بنجاح!' 
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشل إرسال الإشعار إلى Google Chat.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCustomChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customChatMessage.trim()) return;

    setIsLoading(true);
    setNotification(null);
    try {
      await sendCustomChatMessage(customChatMessage.trim());
      setNotification({ type: 'success', text: 'تم إرسال الرسالة إلى Google Chat بنجاح!' });
      setCustomChatMessage('');
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'فشل إرسال الرسالة إلى Google Chat.' });
    } finally {
      setIsLoading(false);
    }
  };

  const activeSpreadsheetId = workspaceConfig.masterSheetId || workspaceConfig.guestSheetId;
  const activeSpreadsheetUrl = workspaceConfig.masterSheetUrl || workspaceConfig.guestSheetUrl || (activeSpreadsheetId ? `https://docs.google.com/spreadsheets/d/${activeSpreadsheetId}` : null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Header & Overview */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-white">
                  مركز Google Workspace (Sheets, Drive & Chat)
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                  {isGoogleAuthenticated ? 'Gmail متصل' : 'وضع محلي / رابط مباشر'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                مزامنة الجداول، النسخ الاحتياطي في السحاب (Drive)، وإرسال تقارير الأوراش لـ Google Chat
              </p>
            </div>
          </div>

          {/* Quick Sync Button */}
          {activeSpreadsheetId && (
            <button
              onClick={handleSyncSheets}
              disabled={isLoading}
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>مزامنة سريعة مع Google Sheets</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-semibold leading-relaxed">{notification.text}</div>
          <button onClick={() => setNotification(null)} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs Selector: Sheets, Drive, Chat */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab('sheets')}
          className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'sheets'
              ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Google Sheets (الجداول ومزامنة الأوراش)</span>
        </button>

        <button
          onClick={() => setActiveTab('drive')}
          className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'drive'
              ? 'bg-amber-500 text-zinc-950 font-bold shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Google Drive (النسخ الاحتياطي والوثائق)</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'chat'
              ? 'bg-blue-500 text-zinc-950 font-bold shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Google Chat (تقارير ورش البناء والـ Webhook)</span>
        </button>
      </div>

      {/* TAB 1: GOOGLE SHEETS */}
      {activeTab === 'sheets' && (
        <div className="space-y-6">
          {/* Supervisor Dedicated Sheet Sync Card if current session is supervisor */}
          {activeSession?.type === 'supervisor' && (
            <SupervisorSheetSyncCard />
          )}

          {/* Smart Onboarding CTA for Manager */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-600/15 to-zinc-900 border border-amber-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  المعالج الذكي لربط وفحص الأوراق الثمانية (الخيار أ)
                </h3>
                <p className="text-xs text-zinc-400">
                  فحص Google Drive التلقائي، مطابقة أوراق الورش والـ CPS، وإصلاح أي ورقة ناقصة ذاتياً.
                </p>
              </div>
            </div>
            <button
              id="btn-trigger-smart-onboarding-hub"
              onClick={openSheetOnboarding}
              className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-zinc-950" />
              <span>فتح معالج تهيئة ومطابقة الجداول</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Sheets Controls */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">إعدادات ومزامنة Google Sheets</h2>
              </div>
              {workspaceConfig.lastSheetsSync && (
                <span className="text-[10px] text-zinc-400 font-mono">
                  آخر مزامنة: {new Date(workspaceConfig.lastSheetsSync).toLocaleTimeString('ar-MA')}
                </span>
              )}
            </div>

            {/* Current Status Card */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">الجدول النشط حالياً:</span>
                <span className="font-bold text-white font-mono text-xs">
                  {activeSpreadsheetId || 'غير محدد بعد'}
                </span>
              </div>

              {activeSpreadsheetUrl && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-400">الرابط المباشر:</span>
                  <a
                    href={activeSpreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold text-xs"
                  >
                    <span>فتح في Google Sheets</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-zinc-400">نطاق المزامنة المطبق:</span>
                <span className="text-amber-400 font-bold">
                  {superAdminMode ? 'كافة أوراش المنظومة (Super Admin)' : `أوراش المقاول (${currentAdmin?.name || 'الأدمين الحالي'})`}
                </span>
              </div>
            </div>

            {/* Sync Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleSyncSheets}
                disabled={isLoading || !activeSpreadsheetId}
                className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-950" /> : <RefreshCw className="w-4 h-4" />}
                <span>مزامنة كافة بيانات الأوراش والـ CPS</span>
              </button>

              {isGoogleAuthenticated && (
                <button
                  onClick={handleCreateNewMaster}
                  disabled={isLoading}
                  className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FolderPlus className="w-4 h-4 text-emerald-400" />
                  <span>إنشاء ملف Google Sheets جديد في حسابي</span>
                </button>
              )}
            </div>

            {/* Link Manual / Guest Sheet */}
            <form onSubmit={handleSaveSheetUrl} className="pt-4 border-t border-zinc-800 space-y-3">
              <label className="text-xs font-bold text-zinc-200 block">
                ربط رابط ملف Google Sheets مخصص (للمستخدمين بدون تسجيل دخول أو لجداول خاصة):
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors shrink-0"
                >
                  ربط وحفظ
                </button>
              </div>
            </form>
          </div>

          {/* Sheets Structure Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white border-b border-zinc-800 pb-2">
              هيكلية البيانات في Google Sheets
            </h3>
            <div className="space-y-3 text-zinc-300 text-[11px] leading-relaxed">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <p className="font-bold text-emerald-400">1. ورقة المشاريع_الأوراش</p>
                <p className="text-zinc-400">اسم الورش، المقاول، المدينة، الميزانية، وتاريخ البدء ونسبة التقدم.</p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <p className="font-bold text-emerald-400">2. ورقة بنود_CPS_والبردورو</p>
                <p className="text-zinc-400">رقم الأرتيكل، التعيين (Designation)، الوحدة، السعر الأحادي، الكمية والتقدم.</p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <p className="font-bold text-emerald-400">3. ورقة العمال والبوانطاج</p>
                <p className="text-zinc-400">قائمة البنائين والحرفيين، اليومية، التسبيقات وحساب السبت.</p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <p className="font-bold text-emerald-400">4. ورقة مشتريات ومصاريف الشانطي</p>
                <p className="text-zinc-400">فواتير السلعة، الموردين، والديون المتبقية ونفقات الصندوق الصغير.</p>
              </div>
            </div>
          </div>

        </div>
        </div>
      )}

      {/* TAB 2: GOOGLE DRIVE */}
      {activeTab === 'drive' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Drive Controls */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold text-white">النسخ الاحتياطي والوثائق على Google Drive</h2>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                مجلد: XiilL_BTP_Backups
              </span>
            </div>

            {/* Cloud Backup Action */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">نسخة احتياطية مشفرة للسحابة (Cloud Backup)</h3>
                  <p className="text-[11px] text-zinc-400">
                    حفظ كافة بيانات الأوراش والعمال والـ CPS في مجلد خاص في حساب Google Drive
                  </p>
                </div>
                <button
                  onClick={handleBackupToDrive}
                  disabled={isLoading}
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-950" /> : <UploadCloud className="w-4 h-4" />}
                  <span>أخذ نسخة إلى Drive الآن</span>
                </button>
              </div>

              {workspaceConfig.lastDriveSync && (
                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>آخر نسخة محفوظة بنجاح في: {new Date(workspaceConfig.lastDriveSync).toLocaleString('ar-MA')}</span>
                </div>
              )}
            </div>

            {/* Upload Document / Photo to Drive */}
            <form onSubmit={handleFileUploadToDrive} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>رفع وثيقة ورش، بون توصيل أو صورة (BL / Plan) إلى Google Drive</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] text-zinc-400">اختر الملف من جهازك (PDF، صورة، مخطط):</label>
                  <input
                    type="file"
                    onChange={(e) => setDriveUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-zinc-300 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400">نوع الوثيقة:</label>
                  <select
                    value={driveUploadCategory}
                    onChange={(e: any) => setDriveUploadCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="bl">بون تسليم سلعة (BL)</option>
                    <option value="photo">صورة أشغال الورش</option>
                    <option value="plan">بلان هندسي (Plan PDF)</option>
                    <option value="report">تقرير أو كشف حساب</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isLoading || !driveUploadFile}
                  className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                  <span>رفع إلى Google Drive</span>
                </button>
              </div>
            </form>
          </div>

          {/* Drive Folders Guide */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white border-b border-zinc-800 pb-2">
              تنظيم مجلدات Google Drive
            </h3>
            <div className="space-y-3 text-zinc-300 text-[11px] leading-relaxed">
              <p>
                يقوم النظام تلقائياً بإنشاء مجلد رئيسي باسم <span className="font-mono text-amber-400">XiilL_BTP</span> في جذر حساب Drive الخاص بك.
              </p>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="font-bold text-zinc-200">المجلدات الفرعية التلقائية:</span>
                <ul className="list-disc list-inside text-zinc-400 space-y-1 pt-1 text-[10px]">
                  <li><span className="font-mono text-white">Backups/</span>: ملفات النسخ الاحتياطي التلقائي (JSON).</li>
                  <li><span className="font-mono text-white">BL_Fournisseurs/</span>: صور وبونات تسليم المواد.</li>
                  <li><span className="font-mono text-white">Photos_Chantiers/</span>: صور ورش البناء اليومية.</li>
                  <li><span className="font-mono text-white">CPS_Documents/</span>: دفاتر الشروط المعمارية والصفقات.</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: GOOGLE CHAT */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chat Dispatcher */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <h2 className="text-sm font-bold text-white">إرسال تقارير الأوراش إلى Google Chat</h2>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                Webhook / Space Integration
              </span>
            </div>

            {/* Webhook Configuration */}
            <form onSubmit={handleSaveChatWebhook} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
              <label className="font-bold text-zinc-200 block">
                رابط Google Chat Webhook (Incoming Webhook URL):
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=...&token=..."
                  value={chatWebhookInput}
                  onChange={(e) => setChatWebhookInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-zinc-950 font-bold text-xs transition-colors shrink-0"
                >
                  حفظ الرابط
                </button>
              </div>
              <p className="text-[10px] text-zinc-400">
                * يمكنك إنشاء Webhook من إعدادات فضاء Google Chat الخاص بفريق العمل أو المقاول.
              </p>
            </form>

            {/* Project Selector for Report */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-200">اختر الورش الموجه له التقرير:</label>
              <select
                value={selectedChatProject}
                onChange={(e) => setSelectedChatProject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:border-blue-500 focus:outline-none"
              >
                {state.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.clientName} ({p.locationCity})</option>
                ))}
              </select>
            </div>

            {/* One-Click Ready Dispatch Templates */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-200">نماذج التقارير الفورية بضغطة زر واحدة:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <button
                  onClick={() => handleSendChatReport('daily')}
                  disabled={isLoading || !workspaceConfig.chatWebhookUrl}
                  className="p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-right text-xs transition-all flex items-start gap-2.5 cursor-pointer disabled:opacity-40"
                >
                  <Building2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">🏗️ تقرير الورش اليومي</span>
                    <span className="text-[10px] text-zinc-400">عدد العمال الحاضرين، المصاريف اليومية وتنبيهات الموقع</span>
                  </div>
                </button>

                <button
                  onClick={() => handleSendChatReport('payroll')}
                  disabled={isLoading || !workspaceConfig.chatWebhookUrl}
                  className="p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-right text-xs transition-all flex items-start gap-2.5 cursor-pointer disabled:opacity-40"
                >
                  <Users className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">💵 كشف خلاص السيمانة (السبت)</span>
                    <span className="text-[10px] text-zinc-400">حساب السبت، التسبيقات المخصومة وصافي مستحقات العمال</span>
                  </div>
                </button>

                <button
                  onClick={() => handleSendChatReport('debt')}
                  disabled={isLoading || !workspaceConfig.chatWebhookUrl}
                  className="p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-right text-xs transition-all flex items-start gap-2.5 cursor-pointer disabled:opacity-40"
                >
                  <Truck className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">🚚 تقرير ديون الموردين والسلعة</span>
                    <span className="text-[10px] text-zinc-400">باقي مبالغ الإسمنت والحديد والرمل المستحقة للأداء</span>
                  </div>
                </button>

                <button
                  onClick={() => handleSendChatReport('cps')}
                  disabled={isLoading || !workspaceConfig.chatWebhookUrl}
                  className="p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-right text-xs transition-all flex items-start gap-2.5 cursor-pointer disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">📊 تقدم أشغال بنود الـ CPS</span>
                    <span className="text-[10px] text-zinc-400">ملخص إنجاز أرتيكلات الصفقات ونسب الإتمام المحققة</span>
                  </div>
                </button>

              </div>
            </div>

            {/* Custom Chat Message */}
            <form onSubmit={handleSendCustomChat} className="pt-3 border-t border-zinc-800 space-y-2">
              <label className="text-xs font-bold text-zinc-200">إرسال رسالة مخصصة إلى فضاء Google Chat:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="مثال: تم إفراغ حمولة الرمل في ورش النخيل بنجاح..."
                  value={customChatMessage}
                  onChange={(e) => setCustomChatMessage(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isLoading || !customChatMessage.trim() || !workspaceConfig.chatWebhookUrl}
                  className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span>إرسال</span>
                </button>
              </div>
            </form>
          </div>

          {/* Chat Setup Guide */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white border-b border-zinc-800 pb-2">
              كيفية إعداد Webhook في Google Chat
            </h3>
            <ol className="list-decimal list-inside text-zinc-300 space-y-2 text-[11px] leading-relaxed">
              <li>افتح فضاء العمل (Space) الخاص بالورش في تطبيق Google Chat.</li>
              <li>اضغط على سهم القائمة بجانب اسم الفضاء ثم اختر <span className="font-semibold text-white">Apps & Integrations</span>.</li>
              <li>اضغط على <span className="font-semibold text-white">Webhooks</span> ثم <span className="font-semibold text-white">Add Webhook</span>.</li>
              <li>سمّ الـ Webhook باسم <span className="font-mono text-amber-400">XiilL BTP Bot</span> ثم انسخ الرابط.</li>
              <li>ألصق الرابط في الخانة هنا واضغط "حفظ الرابط".</li>
            </ol>
          </div>

        </div>
      )}

    </div>
  );
};
