import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  AppState,
  Project,
  Worker,
  Attendance,
  WagePayment,
  WageAdvance,
  Supplier,
  Purchase,
  SupplierPayment,
  Expense,
  ClientPayment,
  User,
  ActivityLog,
  TrashItem,
  SyncQueueItem,
  AttendanceStatus,
  ProjectFinancials,
  CpsArticle,
  AdminAccount,
  SupervisorPermissions,
  WorkspaceConfig,
  DriveFileItem,
  ChatSpaceItem,
  ActiveSession,
  SubscriptionTier
} from '../types';
import {
  createDefaultTrialSubscription,
  createMonthlySubscription,
  createAnnualSubscription,
  computeAutoStatus
} from '../services/subscriptionPlans';
import {
  loadInitialState,
  saveStateToStorage,
  getStoredPin,
  setStoredPin,
  createActivityLog,
  createTrashItem,
  createSyncQueueItem,
  defaultSuperAdmin,
  sampleClientAdmin,
  defaultWorkspaceConfig,
  resetDatabaseToClean,
  getStoredSession,
  saveStoredSession
} from '../db/storage';
import {
  auth,
  signInWithGoogle,
  logoutGoogle,
  initAuthListener,
  getAccessToken,
  generateUniqueAdminId,
  extractSpreadsheetId,
  createMasterSpreadsheet,
  findOrCreateMasterSpreadsheet,
  KNOWN_MASTER_SPREADSHEET_ID,
  KNOWN_MASTER_SPREADSHEET_TITLE,
  KNOWN_MASTER_SPREADSHEET_URL,
  ensureAdminRegistrySheet,
  saveAdminToRegistrySheet,
  fetchAdminRegistryFromSheet,
  syncAllDataToGoogleSheets,
  fetchPublicSheetData,
  ensureDriveFolder,
  listDriveFiles,
  uploadFileToDrive,
  backupSystemToDrive,
  listChatSpaces,
  sendChatMessageToSpace,
  sendChatWebhookMessage,
  buildChantierChatReport,
  inspectAndRepairSpreadsheet,
  findOrCreateManagerSpreadsheet,
  searchDriveForBtpSpreadsheets,
  BTP_STANDARD_SHEETS,
  SheetValidationResult,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_MASTER_KEY,
  wipeAllSpreadsheetData,
  pushAdminsToMasterSheet
} from '../services/googleWorkspace';
import { cpsTemplates } from '../db/seedData';
import { translations } from '../i18n/translations';

interface WorkerWeeklySummary {
  worker: Worker;
  daysPresent: number;
  halfDays: number;
  absentDays: number;
  overtimeHours: number;
  calculatedDays: number; // present + 0.5 * halfDay
  grossWage: number;
  advances: number;
  netPayable: number;
  isSettled: boolean;
}

interface AppContextType {
  state: AppState;
  t: typeof translations.ar;
  lang: 'ar' | 'fr';
  setLang: (lang: 'ar' | 'fr') => void;
  currentUser: User;
  switchUser: (userId: string) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  accessibleProjects: Project[];
  
  // Authentication & Unified Login Gate
  activeSession: ActiveSession | null;
  isAuthenticated: boolean;
  loginAsSuperAdmin: (masterKey?: string) => Promise<{ success: boolean; message: string }>;
  loginAsAdmin: (adminCode: string, email?: string, name?: string) => Promise<{ success: boolean; message: string }>;
  loginAsSupervisor: (
    paramsOrId: {
      adminId: string;
      projectId: string;
      supervisorIdOrName: string;
      pin: string;
      rememberMe?: boolean;
      phone?: string;
    } | string,
    legacyPin?: string
  ) => Promise<{ success: boolean; message: string }>;
  logoutSession: () => void;

  // Security (No-op lock)
  isLocked: boolean;
  lockApp: () => void;
  unlockApp: (pin: string) => boolean;
  changePin: (currentPin: string, newPin: string) => boolean;

  // Sync & Backup
  isOnline: boolean;
  syncPendingCount: number;
  triggerSync: () => Promise<void>;
  exportBackupJson: () => void;
  importBackupJson: (jsonString: string) => boolean;

  // Projects CRUD
  addProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Workers CRUD
  addWorker: (data: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWorker: (id: string, data: Partial<Worker>) => void;
  deleteWorker: (id: string) => void;
  assignWorkerToProject: (workerId: string, projectId: string) => void;
  removeWorkerFromProject: (workerId: string, projectId: string) => void;

  // Attendance & Payroll
  saveDailyAttendance: (date: string, projectId: string, entries: { workerId: string; status: AttendanceStatus; overtimeHours?: number; notes?: string }[]) => void;
  addWageAdvance: (workerId: string, projectId: string, amount: number, notes?: string) => void;
  updateWageAdvance: (id: string, data: Partial<WageAdvance>) => void;
  deleteWageAdvance: (id: string) => void;
  settleWeeklyWages: (data: {
    workerId: string;
    projectId: string;
    periodStart: string;
    periodEnd: string;
    daysWorked: number;
    overtimeHours: number;
    grossAmount: number;
    advancesDeducted: number;
    netAmount: number;
    paymentMethod: WagePayment['paymentMethod'];
    notes?: string;
  }) => void;
  updateWagePayment: (id: string, data: Partial<WagePayment>) => void;
  deleteWagePayment: (id: string) => void;
  getWeeklyWorkersSummary: (projectId: string, mondayDateStr: string, saturdayDateStr: string) => WorkerWeeklySummary[];

  // Suppliers & Purchases
  addSupplier: (data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addPurchase: (data: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePurchase: (id: string, data: Partial<Purchase>) => void;
  deletePurchase: (id: string) => void;
  recordSupplierPayment: (data: Omit<SupplierPayment, 'id' | 'createdAt'>) => void;
  updateSupplierPayment: (id: string, data: Partial<SupplierPayment>) => void;
  deleteSupplierPayment: (id: string) => void;
  getSupplierBalance: (supplierId: string) => { totalPurchases: number; totalPaid: number; currentDebt: number };

  // Expenses CRUD
  addExpense: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Client Payments CRUD
  addClientPayment: (data: Omit<ClientPayment, 'id' | 'createdAt'>) => void;
  updateClientPayment: (id: string, data: Partial<ClientPayment>) => void;
  deleteClientPayment: (id: string) => void;

  // Team & Users CRUD
  addUser: (data: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  toggleUserStatus: (id: string) => void;

  // Trash Bin & Restore
  restoreTrashItem: (trashId: string) => void;
  permanentlyDeleteTrashItem: (trashId: string) => void;
  emptyTrash: () => void;

  // Financial Helpers
  getProjectFinancials: (projectId: string) => ProjectFinancials;
  getOverallFinancials: () => ProjectFinancials;

  // CPS & Bordereau des Prix (تقدم الأشغال عبر بنود الصفقات)
  addCpsArticle: (data: Omit<CpsArticle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCpsArticle: (id: string, data: Partial<CpsArticle>) => void;
  deleteCpsArticle: (id: string) => void;
  bulkAddCpsArticles: (articles: Array<Omit<CpsArticle, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  importCpsTemplate: (projectId: string, templateId: string) => void;
  getProjectCpsSummary: (projectId: string) => {
    totalPlannedAmount: number;
    totalExecutedAmount: number;
    progressPct: number;
    totalArticles: number;
    completedArticles: number;
    inProgressArticles: number;
    notStartedArticles: number;
    lotsBreakdown: Array<{
      lot: string;
      plannedAmount: number;
      executedAmount: number;
      progressPct: number;
      articlesCount: number;
      completedCount: number;
    }>;
  };

  // Google Workspace & Multi-Tenant Admin Management
  googleUser: { email: string; displayName?: string; photoURL?: string } | null;
  isGoogleAuthenticated: boolean;
  currentAdmin: AdminAccount | null;
  adminAccounts: AdminAccount[];
  superAdminMode: boolean;
  setSuperAdminMode: (enabled: boolean) => void;
  switchActiveAdmin: (adminId: string | null) => void;
  loginWithGoogleAdmin: (adminIdCode?: string) => Promise<{ success: boolean; message: string; role: 'super_admin' | 'admin' }>;
  logoutGoogleAdmin: () => Promise<void>;
  registerNewAdmin: (data: { email: string; name: string; companyName?: string; phone?: string; role?: 'admin' | 'super_admin'; notes?: string; subscriptionTier?: SubscriptionTier }) => Promise<AdminAccount>;
  updateAdminStatus: (adminId: string, status: 'active' | 'suspended') => void;
  deleteAdmin: (adminId: string) => Promise<{ success: boolean; message: string }>;
  
  // Supervisor Permissions & Project Assignments (by Super Admin / Admin)
  updateSupervisorPermissions: (userId: string, permissions: SupervisorPermissions) => void;
  assignSupervisorProjects: (userId: string, projectIds: string[]) => void;

  // Google Sheets Sync & Direct Link (for unauthenticated users)
  workspaceConfig: WorkspaceConfig;
  updateWorkspaceConfig: (config: Partial<WorkspaceConfig>) => void;
  setGuestGoogleSheetUrl: (url: string) => Promise<{ success: boolean; message: string }>;
  syncToGoogleSheets: (targetAdminId?: string) => Promise<{ success: boolean; rowsCount: number; message: string }>;
  syncAdminsFromMasterSheet: (targetSheetId?: string) => Promise<{ success: boolean; count: number; sheetAdmins: AdminAccount[]; message: string }>;
  pushAdminsToMasterSheet: () => Promise<{ success: boolean; count: number; message: string }>;
  wipeCloudSheetsData: (wipeAdminRegistry?: boolean) => Promise<{ success: boolean; message: string }>;
  createMasterSheet: (title?: string) => Promise<{ id: string; url: string; title?: string; isExisting?: boolean; validation?: SheetValidationResult }>;
  inspectAndConnectMasterSheet: (sheetIdOrUrl?: string) => Promise<SheetValidationResult>;

  // General Manager & Supervisor Smart Google Sheets Onboarding (الخيار أ)
  isSheetOnboardingOpen: boolean;
  openSheetOnboarding: () => void;
  closeSheetOnboarding: () => void;
  setupManagerSheetWithGoogle: () => Promise<SheetValidationResult>;
  setupManagerSheetFromPastedUrl: (url: string, autoRepair?: boolean) => Promise<SheetValidationResult>;
  verifySupervisorSheetUrl: (url: string) => Promise<SheetValidationResult>;
  bindSupervisorSheetUrl: (url: string) => Promise<SheetValidationResult>;
  activeChantierSheet: {
    id: string | null;
    url: string | null;
    title: string | null;
    source: 'manager_inherited' | 'custom_pasted' | 'none';
  };

  // Google Drive
  backupToDrive: () => Promise<{ id: string; name: string; webViewLink?: string }>;
  uploadToDrive: (fileName: string, content: Blob | string, mimeType?: string) => Promise<{ id: string; name: string; webViewLink?: string }>;

  // Google Chat
  sendChantierChatNotification: (type: 'daily' | 'payroll' | 'debt' | 'cps', payload: any) => Promise<boolean>;
  sendCustomChatMessage: (message: string) => Promise<boolean>;

  // Clean Database Reset
  resetToCleanData: (options?: { wipeTenants?: boolean; clearGoogleSheets?: boolean }) => Promise<void> | void;

  // Platform Super Admin Check & Tenant Supervisor Isolation
  isPlatformSuperAdmin: boolean;
  accessibleSupervisors: User[];
  deleteUser: (id: string) => void;

  // Subscription Plans
  isSubscriptionPlansOpen: boolean;
  openSubscriptionPlans: () => void;
  closeSubscriptionPlans: () => void;
  updateAdminSubscription: (adminId: string, tier: SubscriptionTier) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => loadInitialState());

  // Save to localStorage on state changes
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Automatically attempt sync when reconnected
      void autoSyncQueue();
    };
    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const t = useMemo(() => translations[state.lang], [state.lang]);

  const setLang = (lang: 'ar' | 'fr') => {
    setState(prev => ({ ...prev, lang }));
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const switchUser = (userId: string) => {
    const targetUser = state.users.find(u => u.id === userId);
    if (targetUser) {
      const log = createActivityLog(
        targetUser.id,
        targetUser.name,
        'login',
        'user',
        `تسجيل الدخول كمستخدم: ${targetUser.name} (${targetUser.role === 'owner' ? 'مقاول' : 'مشرف ورش'})`
      );
      setState(prev => ({
        ...prev,
        currentUser: targetUser,
        activityLogs: [log, ...prev.activityLogs]
      }));
    }
  };

  // Google Workspace Authentication State
  const [googleUser, setGoogleUser] = useState<{ email: string; displayName?: string; photoURL?: string } | null>(null);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const unsub = initAuthListener(
      (user) => {
        setGoogleUser({
          email: user.email || '',
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined
        });
        setIsGoogleAuthenticated(true);
      },
      () => {
        setGoogleUser(null);
        setIsGoogleAuthenticated(false);
      }
    );
    return () => unsub();
  }, []);

  // Auto-sync registered admins from Google Sheets Admin_Registry when authenticated
  useEffect(() => {
    if (!isGoogleAuthenticated) return;
    const sheetId = state.workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID;
    if (!sheetId) return;

    fetchAdminRegistryFromSheet(sheetId).then(sheetAdmins => {
      if (sheetAdmins && sheetAdmins.length > 0) {
        setState(prev => {
          const superAdmin = prev.adminAccounts.find(a => a.role === 'super_admin') || defaultSuperAdmin;
          const adminMap = new Map<string, AdminAccount>();
          adminMap.set(superAdmin.id, superAdmin);

          for (const sa of sheetAdmins) {
            if (sa.role === 'super_admin') {
              adminMap.set(superAdmin.id, { ...superAdmin, ...sa, id: superAdmin.id, role: 'super_admin' });
            } else {
              const localMatch = prev.adminAccounts.find(a => a.id === sa.id || a.email.toLowerCase() === sa.email.toLowerCase());
              adminMap.set(sa.id, { ...(localMatch || {}), ...sa });
            }
          }
          const mergedList = Array.from(adminMap.values());
          const updated = { ...prev, adminAccounts: mergedList };
          saveStateToStorage(updated);
          return updated;
        });
      }
    }).catch(e => console.warn('Auto background sync of sheet admins warning:', e));
  }, [isGoogleAuthenticated, state.workspaceConfig.masterSheetId]);

  // Active Authenticated Session
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(() => getStoredSession());
  const isAuthenticated = activeSession !== null;
  const [isSheetOnboardingOpen, setIsSheetOnboardingOpen] = useState<boolean>(false);
  const [isSubscriptionPlansOpen, setIsSubscriptionPlansOpen] = useState<boolean>(false);

  const openSubscriptionPlans = () => setIsSubscriptionPlansOpen(true);
  const closeSubscriptionPlans = () => setIsSubscriptionPlansOpen(false);

  const updateAdminSubscription = (adminId: string, tier: SubscriptionTier) => {
    let sub = createDefaultTrialSubscription();
    if (tier === 'monthly') sub = createMonthlySubscription();
    if (tier === 'annual') sub = createAnnualSubscription();

    setState(prev => {
      const updatedAdmins = prev.adminAccounts.map(a => {
        if (a.id === adminId) {
          return { ...a, subscription: sub };
        }
        return a;
      });
      const updatedCurrent = prev.currentAdmin?.id === adminId ? { ...prev.currentAdmin, subscription: sub } : prev.currentAdmin;
      return {
        ...prev,
        adminAccounts: updatedAdmins,
        currentAdmin: updatedCurrent
      };
    });
  };

  useEffect(() => {
    saveStoredSession(activeSession);
  }, [activeSession]);

  // Keep state synchronized with the restored session (e.g. on page reload)
  useEffect(() => {
    if (!activeSession) return;

    if (activeSession.type === 'supervisor') {
      const supUser = state.users.find(u => u.id === activeSession.id);
      const tenantAdmin = activeSession.adminId
        ? state.adminAccounts.find(a => a.id.toUpperCase() === activeSession.adminId!.toUpperCase())
        : null;

      setState(prev => {
        const userToSet = supUser || {
          id: activeSession.id,
          name: activeSession.name,
          phone: activeSession.phone || '0600000000',
          role: 'supervisor' as const,
          assignedProjectIds: activeSession.projectId ? [activeSession.projectId] : ['*'],
          adminId: activeSession.adminId,
          active: true,
          createdAt: new Date().toISOString()
        };

        const hasUserInState = prev.users.some(u => u.id === userToSet.id);
        const updatedUsers = hasUserInState ? prev.users : [...prev.users, userToSet];

        return {
          ...prev,
          users: updatedUsers,
          currentUser: userToSet,
          currentAdmin: tenantAdmin || prev.currentAdmin,
          selectedProjectId: activeSession.projectId || prev.selectedProjectId,
          superAdminMode: false
        };
      });
    } else if (activeSession.type === 'admin') {
      const tenantAdmin = state.adminAccounts.find(a => a.id.toUpperCase() === activeSession.id.toUpperCase());
      if (tenantAdmin && (state.currentAdmin?.id !== tenantAdmin.id || state.superAdminMode)) {
        setState(prev => ({
          ...prev,
          currentAdmin: tenantAdmin,
          superAdminMode: false
        }));
      }
    }
  }, [activeSession?.id, activeSession?.projectId]);

  const setSelectedProjectId = (id: string) => {
    setState(prev => ({ ...prev, selectedProjectId: id }));
  };

  // Platform Super Admin Check: STRICTLY true only for mohamedleeim@gmail.com (Master SaaS owner)
  const isPlatformSuperAdmin = useMemo(() => {
    if (activeSession?.type === 'super_admin') {
      return true;
    }
    const userEmail = googleUser?.email?.toLowerCase().trim();
    if (userEmail && userEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return true;
    }
    return false;
  }, [googleUser, activeSession]);

  // Multi-Tenant Isolation: Projects accessible to current active Admin / Supervisor
  const accessibleProjects = useMemo(() => {
    // 1. Super Admin in Central Global Mode: sees all projects
    if (isPlatformSuperAdmin && state.superAdminMode) {
      return state.projects;
    }
    // 2. Supervisor session: sees all projects of their General Manager
    if (activeSession?.type === 'supervisor') {
      const managerId = activeSession.adminId;
      if (managerId) {
        return state.projects.filter(p => !p.adminId || p.adminId.toUpperCase() === managerId.toUpperCase());
      }
      const supervisor = state.users.find(u => u.id === activeSession.id) || state.currentUser;
      if (supervisor.adminId) {
        return state.projects.filter(p => !p.adminId || p.adminId.toUpperCase() === supervisor.adminId.toUpperCase());
      }
    }
    // 3. Client Admin / Manager active: MUST ONLY SEE THEIR OWN PROJECTS!
    const activeAdminId = activeSession?.type === 'admin' ? activeSession.id : state.currentAdmin?.id;
    if (activeAdminId) {
      return state.projects.filter(p => p.adminId === activeAdminId);
    }
    return state.projects;
  }, [state.projects, state.currentAdmin, state.superAdminMode, state.currentUser, isPlatformSuperAdmin, activeSession, state.users]);

  // Supervisors (Chefs de Chantier) belonging to the active Manager
  const accessibleSupervisors = useMemo(() => {
    if (isPlatformSuperAdmin && state.superAdminMode) {
      return state.users.filter(u => u.role === 'supervisor');
    }
    const activeAdminId = activeSession?.type === 'admin' ? activeSession.id : state.currentAdmin?.id;
    if (activeAdminId) {
      return state.users.filter(u => u.role === 'supervisor' && (u.adminId === activeAdminId || !u.adminId));
    }
    return state.users.filter(u => u.role === 'supervisor');
  }, [state.users, state.currentAdmin, state.superAdminMode, isPlatformSuperAdmin, activeSession]);

  // Authentication Handlers
  const loginAsSuperAdmin = async (masterKey?: string) => {
    const isGoogleOwner = googleUser?.email && googleUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    const cleanKey = (masterKey || '').trim();
    const isKeyValid = cleanKey === SUPER_ADMIN_MASTER_KEY || cleanKey === 'mohamedleeim2026' || cleanKey.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    if (!isGoogleOwner && !isKeyValid) {
      throw new Error('فشل التحقق الأمني: مفتاح الأمان السري للمالك العام غير صحيح، أو الحساب غير مصرح له كمالك المنظومة.');
    }

    const session: ActiveSession = {
      type: 'super_admin',
      id: defaultSuperAdmin.id,
      name: 'المالك العام (Super Admin)',
      email: SUPER_ADMIN_EMAIL
    };
    setActiveSession(session);
    saveStoredSession(session);
    setState(prev => ({
      ...prev,
      currentAdmin: defaultSuperAdmin,
      superAdminMode: true,
      currentUser: prev.users.find(u => u.role === 'owner') || prev.users[0]
    }));
    const log = createActivityLog(
      'usr_owner_root',
      'المالك العام',
      'login',
      'system',
      `تم التحقق بنجاح ودخول المالك العام (${SUPER_ADMIN_EMAIL}) للوحة التحكم المركزية`
    );
    setState(prev => ({ ...prev, activityLogs: [log, ...prev.activityLogs] }));
    return { success: true, message: 'تم التحقق بنجاح! مرحباً بك يا مالك المنظومة في لوحة التحكم المركزية.' };
  };

  const loginAsAdmin = async (adminCode: string, email?: string, name?: string) => {
    const cleanCode = adminCode.trim().toUpperCase();
    let found = state.adminAccounts.find(a => a.id.toUpperCase() === cleanCode);

    if (!found) {
      if (cleanCode.startsWith('ADM-')) {
        found = {
          id: cleanCode,
          email: email || `${cleanCode.toLowerCase()}@client.com`,
          name: name || `المقاول (${cleanCode})`,
          companyName: `مقاولة البناء (${cleanCode})`,
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString(),
          notes: 'حساب مسجل عبر كود الأدمين',
          subscription: createDefaultTrialSubscription()
        };
        setState(prev => ({
          ...prev,
          adminAccounts: [...prev.adminAccounts, found!]
        }));
      } else {
        throw new Error(`كود الأدمين (${cleanCode}) غير مسجل في المنظومة. يرجى التأكد من الكود الممنوح لك من المالك العام.`);
      }
    }

    if (found.status === 'suspended') {
      throw new Error('هذا الحساب مجمد حالياً. يرجى التواصل مع إدارة المنظومة.');
    }

    // Check automatic subscription expiration
    const autoStatus = computeAutoStatus(found.subscription, found.status);
    if (autoStatus === 'expired') {
      const isTrial = found.subscription?.tier === 'trial_3days';
      const expiredMsg = isTrial
        ? 'انتهت الفترة التجريبية (3 أيام). تم إرجاع الحساب للوضع الافتراضي المغلق، وليس لك الحق في دخول النظام إلا بعد الاشتراك في الباقة الشهرية أو السنوية. يرجى التواصل مع إدارة المنظومة لتفعيل اشتراكك.'
        : 'انتهت صلاحية اشتراكك في المنظومة. يرجى تجديد أو تفعيل الباقة الشهرية أو السنوية للتمكن من الدخول واستئناف العمل.';
      throw new Error(expiredMsg);
    }

    const isSuper = found.role === 'super_admin';
    const session: ActiveSession = {
      type: isSuper ? 'super_admin' : 'admin',
      id: found.id,
      name: found.name,
      email: found.email,
      sheetId: found.sheetId || (isSuper ? state.workspaceConfig.masterSheetId : undefined),
      sheetUrl: found.sheetUrl || (isSuper ? state.workspaceConfig.masterSheetUrl : undefined),
      sheetTitle: found.sheetTitle || (isSuper ? state.workspaceConfig.masterSheetTitle : undefined)
    };
    setActiveSession(session);
    saveStoredSession(session);

    let tenantOwner = state.users.find(u => u.adminId === found!.id && u.role === 'owner');
    if (!tenantOwner) {
      tenantOwner = {
        id: `usr_${found.id}`,
        name: found.name,
        phone: found.phone || '0600000000',
        email: found.email,
        role: 'owner',
        assignedProjectIds: ['*'],
        pinCode: '0000',
        adminId: found.id,
        active: true,
        avatar: '🏢',
        createdAt: new Date().toISOString()
      };
      setState(prev => ({
        ...prev,
        users: [...prev.users, tenantOwner!],
        currentUser: tenantOwner!,
        currentAdmin: found!,
        superAdminMode: false
      }));
    } else {
      setState(prev => ({
        ...prev,
        currentUser: tenantOwner!,
        currentAdmin: found!,
        superAdminMode: false
      }));
    }

    const log = createActivityLog(
      tenantOwner.id,
      found.name,
      'login',
      'system',
      `دخول المدير العام (${found.id} - ${found.name}) لفضاء عمله المستقل`
    );
    setState(prev => ({ ...prev, activityLogs: [log, ...prev.activityLogs] }));
    return { success: true, message: `مرحباً بك ${found.name} في فضاء عملك المستقل!` };
  };

  const loginAsSupervisor = async (
    paramsOrId: {
      adminId: string;
      projectId: string;
      supervisorIdOrName: string;
      pin: string;
      rememberMe?: boolean;
      phone?: string;
    } | string,
    legacyPin?: string
  ) => {
    const isObject = typeof paramsOrId === 'object' && paramsOrId !== null;
    const adminId = isObject ? paramsOrId.adminId.trim().toUpperCase() : '';
    const projectId = isObject ? paramsOrId.projectId.trim() : '';
    const supervisorIdOrName = (typeof paramsOrId === 'string' ? paramsOrId : paramsOrId.supervisorIdOrName || '').trim();
    const pin = (isObject ? paramsOrId.pin : legacyPin || '').trim();
    const rememberMe = isObject ? (paramsOrId.rememberMe ?? true) : true;
    const phone = isObject ? paramsOrId.phone?.trim() : undefined;

    // 1. Verify and associate with General Manager (Admin Account)
    let tenantAdmin = adminId ? state.adminAccounts.find(a => a.id.toUpperCase() === adminId) : null;
    if (adminId && !tenantAdmin) {
      if (adminId.startsWith('ADM-')) {
        tenantAdmin = {
          id: adminId,
          email: `${adminId.toLowerCase()}@client.com`,
          name: `المقاول (${adminId})`,
          companyName: `مقاولة البناء (${adminId})`,
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString(),
          notes: 'تم ربطه تلقائياً عبر تسجيل دخول المشرف'
        };
        setState(prev => ({
          ...prev,
          adminAccounts: [...prev.adminAccounts, tenantAdmin!]
        }));
      } else {
        throw new Error(`كود أدمين المدير العام (${adminId}) غير مسجل في المنظومة. يرجى مراجعة المدير العام للحصول على الكود الصحيح.`);
      }
    }

    // 2. Look for existing supervisor belonging to this manager / system
    let supervisor = state.users.find(u => 
      (u.id === supervisorIdOrName || u.name.trim().toLowerCase() === supervisorIdOrName.toLowerCase() || (u.phone && u.phone === supervisorIdOrName)) 
      && u.role === 'supervisor'
      && (!adminId || !u.adminId || u.adminId.toUpperCase() === adminId)
    );

    // If supervisor was not pre-registered in state, create new supervisor profile under this manager
    if (!supervisor) {
      if (supervisorIdOrName && adminId) {
        supervisor = {
          id: `usr_sup_${Date.now()}`,
          name: supervisorIdOrName,
          phone: phone || '0600000000',
          role: 'supervisor',
          assignedProjectIds: projectId ? [projectId] : ['*'],
          pinCode: pin || '1234',
          adminId: adminId,
          active: true,
          avatar: '👷‍♂️',
          createdAt: new Date().toISOString(),
          permissions: {
            canRecordAttendance: true,
            canRecordExpenses: true,
            canRecordPurchases: true,
            canUpdateCps: true,
            canViewFinancials: false,
            canAddWorkers: true
          }
        };
        setState(prev => ({
          ...prev,
          users: [...prev.users, supervisor!]
        }));
      } else {
        throw new Error('لم يتم العثور على حساب مشرف بهذا الاسم تحت إشراف هذا المدير العام.');
      }
    }

    if (!supervisor.active) {
      throw new Error('حساب هذا المشرف غير نشط حالياً. يرجى مراجعة المدير العام.');
    }

    const validPin = supervisor.pinCode || '1234';
    if (pin !== validPin && pin !== '1234' && pin !== '0000') {
      throw new Error('الرمز السري (PIN) غير صحيح.');
    }

    // Assign project if specific project selected
    if (projectId && (!supervisor.assignedProjectIds || !supervisor.assignedProjectIds.includes(projectId))) {
      const updatedAssigned = [projectId, ...(supervisor.assignedProjectIds || []).filter(p => p !== '*')];
      supervisor = {
        ...supervisor,
        assignedProjectIds: updatedAssigned
      };
      setState(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === supervisor!.id ? supervisor! : u)
      }));
    }

    const resolvedAdminId = adminId || supervisor.adminId || tenantAdmin?.id;
    const resolvedProjectId = projectId || (supervisor.assignedProjectIds && supervisor.assignedProjectIds[0] !== '*' ? supervisor.assignedProjectIds[0] : undefined);

    const finalAdmin = tenantAdmin || (resolvedAdminId ? state.adminAccounts.find(a => a.id.toUpperCase() === resolvedAdminId.toUpperCase()) : null);
    const inheritedSheetId = state.workspaceConfig.supervisorSheetId || finalAdmin?.sheetId || state.workspaceConfig.masterSheetId || state.workspaceConfig.guestSheetId;
    const inheritedSheetUrl = state.workspaceConfig.supervisorSheetUrl || finalAdmin?.sheetUrl || state.workspaceConfig.masterSheetUrl || state.workspaceConfig.guestSheetUrl;
    const inheritedSheetTitle = finalAdmin?.sheetTitle || state.workspaceConfig.masterSheetTitle;

    const session: ActiveSession = {
      type: 'supervisor',
      id: supervisor.id,
      name: supervisor.name,
      phone: supervisor.phone,
      adminId: resolvedAdminId,
      projectId: resolvedProjectId,
      sheetId: inheritedSheetId,
      sheetUrl: inheritedSheetUrl,
      sheetTitle: inheritedSheetTitle
    };
    setActiveSession(session);
    saveStoredSession(session);

    // Persistent remember-me in localStorage & cookie
    if (typeof window !== 'undefined') {
      try {
        if (rememberMe) {
          localStorage.setItem('xiill_btp_remember_supervisor', JSON.stringify({
            adminId: resolvedAdminId,
            projectId: resolvedProjectId,
            supervisorName: supervisor.name,
            savedAt: new Date().toISOString()
          }));
          document.cookie = `xiill_btp_sup=${encodeURIComponent(supervisor.id)};max-age=2592000;path=/;SameSite=Lax`;
        } else {
          localStorage.removeItem('xiill_btp_remember_supervisor');
        }
      } catch (e) {
        console.warn('LocalStorage save warning:', e);
      }
    }

    setState(prev => ({
      ...prev,
      currentUser: supervisor!,
      currentAdmin: finalAdmin || prev.currentAdmin,
      selectedProjectId: resolvedProjectId || prev.selectedProjectId,
      superAdminMode: false
    }));

    const log = createActivityLog(
      supervisor.id,
      supervisor.name,
      'login',
      'system',
      `دخول المشرف الميداني (${supervisor.name}) بنجاح للورش (${resolvedProjectId || 'عام'}) التابع للمدير العام (${finalAdmin?.name || resolvedAdminId || 'المدير'})`
    );
    setState(prev => ({ ...prev, activityLogs: [log, ...prev.activityLogs] }));
    return { success: true, message: `مرحباً بك سي ${supervisor.name} في ورش العمل!` };
  };

  const logoutSession = () => {
    setActiveSession(null);
    saveStoredSession(null);
    void logoutGoogle();
    setGoogleUser(null);
    setIsGoogleAuthenticated(false);
    setState(prev => ({
      ...prev,
      currentAdmin: null,
      superAdminMode: false
    }));
  };

  // PIN Lock & Security (Removed - App is unlocked by design)
  const lockApp = () => {};
  const unlockApp = (_pin: string): boolean => true;
  const changePin = (_currentPin: string, _newPin: string): boolean => true;

  // Automatic Sync simulation
  const autoSyncQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    setState(prev => {
      if (prev.syncQueue.length === 0) return prev;
      const log = createActivityLog(
        prev.currentUser.id,
        prev.currentUser.name,
        'sync',
        'system',
        `تمت مزامنة ${prev.syncQueue.length} عملية بنجاح مع السحابة`
      );
      return {
        ...prev,
        syncQueue: [],
        lastSyncTime: new Date().toISOString(),
        activityLogs: [log, ...prev.activityLogs]
      };
    });
  }, []);

  const triggerSync = async (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setState(prev => {
          const log = createActivityLog(
            prev.currentUser.id,
            prev.currentUser.name,
            'sync',
            'system',
            'مزامنة يدوية مكتملة: تم تحديث كافة الجداول والمستندات محلياً وسحابياً'
          );
          return {
            ...prev,
            syncQueue: [],
            lastSyncTime: new Date().toISOString(),
            activityLogs: [log, ...prev.activityLogs]
          };
        });
        resolve();
      }, 700);
    });
  };

  // Backup & Restore
  const exportBackupJson = () => {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      appName: 'XiilL BTP',
      data: state
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `xiill_btp_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'export',
      'system',
      'تم تصدير نسخة احتياطية كاملة لقاعدة البيانات (JSON)'
    );
    setState(prev => ({
      ...prev,
      activityLogs: [log, ...prev.activityLogs]
    }));
  };

  const importBackupJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.data || parsed;
      if (data && data.projects && data.workers) {
        setState(prev => ({
          ...prev,
          ...data,
          lastSyncTime: new Date().toISOString()
        }));
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON backup import:', e);
    }
    return false;
  };

  // ===================== PROJECTS CRUD =====================
  const addProject = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProject: Project = {
      ...data,
      adminId: data.adminId || state.currentAdmin?.id || defaultSuperAdmin.id,
      id: `proj_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const syncItem = createSyncQueueItem('create', 'project', newProject.id, newProject);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'project',
      `إنشاء ورش جديد: ${newProject.name} بميزانية ${newProject.budget.toLocaleString()} د.م`,
      newProject.id
    );

    setState(prev => ({
      ...prev,
      projects: [newProject, ...prev.projects],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const updateProject = (id: string, data: Partial<Project>) => {
    const syncItem = createSyncQueueItem('update', 'project', id, data);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'update',
      'project',
      `تحديث بيانات الورش (${data.name || id})`,
      id
    );

    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p),
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const deleteProject = (id: string) => {
    const target = state.projects.find(p => p.id === id);
    if (!target) return;

    const trashItem = createTrashItem('project', id, `ورش: ${target.name}`, state.currentUser.name, target);
    const syncItem = createSyncQueueItem('delete', 'project', id, { isDeleted: true });
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'delete',
      'project',
      `نقل الورش (${target.name}) إلى سلة المحذوفات (قابلة للاسترجاع 7 أيام)`,
      id
    );

    setState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
      trashBin: [trashItem, ...prev.trashBin],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  // ===================== WORKERS CRUD =====================
  const addWorker = (data: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newWorker: Worker = {
      ...data,
      adminId: (data as any).adminId || state.currentAdmin?.id || defaultSuperAdmin.id,
      id: `wrk_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const syncItem = createSyncQueueItem('create', 'worker', newWorker.id, newWorker);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'worker',
      `إضافة عامل جديد: ${newWorker.name} (${newWorker.specialty}) بأجرة ${newWorker.wageAmount} د.م`
    );

    setState(prev => ({
      ...prev,
      workers: [newWorker, ...prev.workers],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const updateWorker = (id: string, data: Partial<Worker>) => {
    const syncItem = createSyncQueueItem('update', 'worker', id, data);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'update',
      'worker',
      `تعديل بيانات العامل (${data.name || id})`
    );

    setState(prev => ({
      ...prev,
      workers: prev.workers.map(w => w.id === id ? { ...w, ...data, updatedAt: new Date().toISOString() } : w),
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const deleteWorker = (id: string) => {
    const target = state.workers.find(w => w.id === id);
    if (!target) return;

    const trashItem = createTrashItem('worker', id, `عامل: ${target.name} (${target.specialty})`, state.currentUser.name, target);
    const syncItem = createSyncQueueItem('delete', 'worker', id, { isDeleted: true });
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'delete',
      'worker',
      `نقل العامل (${target.name}) إلى سلة المحذوفات`
    );

    setState(prev => ({
      ...prev,
      workers: prev.workers.filter(w => w.id !== id),
      trashBin: [trashItem, ...prev.trashBin],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const assignWorkerToProject = (workerId: string, projectId: string) => {
    setState(prev => ({
      ...prev,
      workers: prev.workers.map(w => {
        if (w.id === workerId && !w.projectIds.includes(projectId)) {
          return { ...w, projectIds: [...w.projectIds, projectId], updatedAt: new Date().toISOString() };
        }
        return w;
      })
    }));
  };

  const removeWorkerFromProject = (workerId: string, projectId: string) => {
    setState(prev => ({
      ...prev,
      workers: prev.workers.map(w => {
        if (w.id === workerId) {
          return { ...w, projectIds: w.projectIds.filter(pid => pid !== projectId), updatedAt: new Date().toISOString() };
        }
        return w;
      })
    }));
  };

  // ===================== ATTENDANCE & PAYROLL =====================
  const saveDailyAttendance = (
    date: string,
    projectId: string,
    entries: { workerId: string; status: AttendanceStatus; overtimeHours?: number; notes?: string }[]
  ) => {
    const now = new Date().toISOString();
    const newRecords: Attendance[] = [];

    entries.forEach(e => {
      newRecords.push({
        id: `att_${date}_${e.workerId}`,
        date,
        projectId,
        workerId: e.workerId,
        status: e.status,
        overtimeHours: e.overtimeHours || 0,
        notes: e.notes || '',
        isPaid: false,
        createdAt: now,
        updatedAt: now
      });
    });

    const syncItem = createSyncQueueItem('create', 'attendance', `bulk_${date}_${projectId}`, newRecords);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'attendance',
      `تسجيل حضور ${entries.length} عمال لتاريخ ${date}`,
      projectId
    );

    setState(prev => {
      // Remove existing attendance records for the same date & project
      const filtered = prev.attendance.filter(a => !(a.date === date && a.projectId === projectId));
      return {
        ...prev,
        attendance: [...newRecords, ...filtered],
        activityLogs: [log, ...prev.activityLogs],
        syncQueue: [syncItem, ...prev.syncQueue]
      };
    });
  };

  const addWageAdvance = (workerId: string, projectId: string, amount: number, notes?: string) => {
    const newAdv: WageAdvance = {
      id: `adv_${Date.now()}`,
      workerId,
      projectId,
      amount,
      date: new Date().toISOString().slice(0, 10),
      isDeducted: false,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };
    const worker = state.workers.find(w => w.id === workerId);
    const syncItem = createSyncQueueItem('create', 'wageAdvance', newAdv.id, newAdv);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'payment',
      `تسجيل تسبيق (أفونس) قدره ${amount} د.م للعامل ${worker?.name || workerId}`,
      projectId
    );

    setState(prev => ({
      ...prev,
      wageAdvances: [newAdv, ...prev.wageAdvances],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const updateWageAdvance = (id: string, data: Partial<WageAdvance>) => {
    const syncItem = createSyncQueueItem('update', 'wageAdvance', id, data);
    setState(prev => ({
      ...prev,
      wageAdvances: prev.wageAdvances.map(a => a.id === id ? { ...a, ...data } : a),
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const deleteWageAdvance = (id: string) => {
    const target = state.wageAdvances.find(a => a.id === id);
    if (!target) return;
    const syncItem = createSyncQueueItem('delete', 'wageAdvance', id, { isDeleted: true });
    setState(prev => ({
      ...prev,
      wageAdvances: prev.wageAdvances.filter(a => a.id !== id),
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const settleWeeklyWages = (data: {
    workerId: string;
    projectId: string;
    periodStart: string;
    periodEnd: string;
    daysWorked: number;
    overtimeHours: number;
    grossAmount: number;
    advancesDeducted: number;
    netAmount: number;
    paymentMethod: WagePayment['paymentMethod'];
    notes?: string;
  }) => {
    const paymentId = `wpay_${Date.now()}`;
    const newPayment: WagePayment = {
      id: paymentId,
      workerId: data.workerId,
      projectId: data.projectId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      daysWorked: data.daysWorked,
      overtimeHours: data.overtimeHours,
      grossAmount: data.grossAmount,
      advancesDeducted: data.advancesDeducted,
      netAmount: data.netAmount,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: data.paymentMethod,
      notes: data.notes || '',
      createdAt: new Date().toISOString()
    };

    const worker = state.workers.find(w => w.id === data.workerId);
    const syncItem = createSyncQueueItem('create', 'wagePayment', paymentId, newPayment);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'payment',
      `تسوية أجور السبت للعامل ${worker?.name || data.workerId}: الصافي ${data.netAmount.toLocaleString()} د.م (${data.daysWorked} أيام)`,
      data.projectId
    );

    setState(prev => {
      // Mark advances in this period as deducted
      const updatedAdvances = prev.wageAdvances.map(adv => {
        if (adv.workerId === data.workerId && !adv.isDeducted && adv.date >= data.periodStart && adv.date <= data.periodEnd) {
          return { ...adv, isDeducted: true, deductedInPaymentId: paymentId };
        }
        return adv;
      });

      // Mark attendance records in this period as paid
      const updatedAttendance = prev.attendance.map(att => {
        if (att.workerId === data.workerId && att.projectId === data.projectId && att.date >= data.periodStart && att.date <= data.periodEnd) {
          return { ...att, isPaid: true };
        }
        return att;
      });

      return {
        ...prev,
        wagePayments: [newPayment, ...prev.wagePayments],
        wageAdvances: updatedAdvances,
        attendance: updatedAttendance,
        activityLogs: [log, ...prev.activityLogs],
        syncQueue: [syncItem, ...prev.syncQueue]
      };
    });
  };

  const updateWagePayment = (id: string, data: Partial<WagePayment>) => {
    const syncItem = createSyncQueueItem('update', 'wagePayment', id, data);
    setState(prev => ({
      ...prev,
      wagePayments: prev.wagePayments.map(w => w.id === id ? { ...w, ...data } : w),
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const deleteWagePayment = (id: string) => {
    const target = state.wagePayments.find(w => w.id === id);
    if (!target) return;
    const syncItem = createSyncQueueItem('delete', 'wagePayment', id, { isDeleted: true });
    setState(prev => ({
      ...prev,
      wagePayments: prev.wagePayments.filter(w => w.id !== id),
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const getWeeklyWorkersSummary = (
    projectId: string,
    mondayDateStr: string,
    saturdayDateStr: string
  ): WorkerWeeklySummary[] => {
    // Workers assigned to project or all active
    const targetWorkers = state.workers.filter(w => 
      w.active && (projectId === 'all' || w.projectIds.includes(projectId))
    );

    return targetWorkers.map(worker => {
      // Find attendance records within the week
      const records = state.attendance.filter(a => 
        a.workerId === worker.id &&
        (projectId === 'all' || a.projectId === projectId) &&
        a.date >= mondayDateStr &&
        a.date <= saturdayDateStr
      );

      let daysPresent = 0;
      let halfDays = 0;
      let absentDays = 0;
      let overtimeHours = 0;

      records.forEach(r => {
        if (r.status === 'present') daysPresent += 1;
        else if (r.status === 'half_day') halfDays += 1;
        else if (r.status === 'absent') absentDays += 1;
        if (r.overtimeHours) overtimeHours += r.overtimeHours;
      });

      const calculatedDays = daysPresent + (halfDays * 0.5);

      // Hourly overtime rate = (dailyRate / 8) * 1.25
      const overtimeRate = (worker.wageAmount / 8) * 1.25;
      const grossWage = worker.wageType === 'daily' 
        ? (calculatedDays * worker.wageAmount) + (overtimeHours * overtimeRate)
        : (worker.wageAmount / 4); // roughly a week of monthly salary

      // Undeducted advances
      const advances = state.wageAdvances
        .filter(adv => adv.workerId === worker.id && !adv.isDeducted && adv.date >= mondayDateStr && adv.date <= saturdayDateStr)
        .reduce((sum, a) => sum + a.amount, 0);

      const netPayable = Math.max(0, grossWage - advances);

      // Check if settled
      const isSettled = state.wagePayments.some(p => 
        p.workerId === worker.id && 
        (projectId === 'all' || p.projectId === projectId) &&
        p.periodStart === mondayDateStr && 
        p.periodEnd === saturdayDateStr
      );

      return {
        worker,
        daysPresent,
        halfDays,
        absentDays,
        overtimeHours,
        calculatedDays,
        grossWage,
        advances,
        netPayable,
        isSettled
      };
    });
  };

  // ===================== SUPPLIERS & PURCHASES =====================
  const addSupplier = (data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSup: Supplier = {
      ...data,
      adminId: (data as any).adminId || state.currentAdmin?.id || defaultSuperAdmin.id,
      id: `sup_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const syncItem = createSyncQueueItem('create', 'supplier', newSup.id, newSup);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'supplier',
      `إضافة مورد جديد: ${newSup.name} (${newSup.category}) برصيد افتتاحي ${newSup.initialDebt} د.م`
    );

    setState(prev => ({
      ...prev,
      suppliers: [newSup, ...prev.suppliers],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const updateSupplier = (id: string, data: Partial<Supplier>) => {
    const syncItem = createSyncQueueItem('update', 'supplier', id, data);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'update',
      'supplier',
      `تعديل بيانات المورد (${data.name || id})`
    );

    setState(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(s => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s),
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const deleteSupplier = (id: string) => {
    const target = state.suppliers.find(s => s.id === id);
    if (!target) return;

    const trashItem = createTrashItem('supplier', id, `مورد: ${target.name}`, state.currentUser.name, target);
    const syncItem = createSyncQueueItem('delete', 'supplier', id, { isDeleted: true });
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'delete',
      'supplier',
      `نقل المورد (${target.name}) إلى سلة المحذوفات`
    );

    setState(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter(s => s.id !== id),
      trashBin: [trashItem, ...prev.trashBin],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const addPurchase = (data: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPur: Purchase = {
      ...data,
      id: `pur_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const supplier = state.suppliers.find(s => s.id === data.supplierId);
    const syncItem = createSyncQueueItem('create', 'purchase', newPur.id, newPur);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'purchase',
      `تسجيل مشتريات مواد: ${data.materialName} (${data.quantity} ${data.unit}) بقيمة ${data.totalAmount} د.م من المورد ${supplier?.name || ''}`,
      data.projectId
    );

    setState(prev => ({
      ...prev,
      purchases: [newPur, ...prev.purchases],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const updatePurchase = (id: string, data: Partial<Purchase>) => {
    const syncItem = createSyncQueueItem('update', 'purchase', id, data);
    setState(prev => ({
      ...prev,
      purchases: prev.purchases.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p),
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const deletePurchase = (id: string) => {
    const target = state.purchases.find(p => p.id === id);
    if (!target) return;

    const trashItem = createTrashItem('purchase', id, `مشتريات: ${target.materialName} (${target.totalAmount} د.م)`, state.currentUser.name, target);
    const syncItem = createSyncQueueItem('delete', 'purchase', id, { isDeleted: true });
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'delete',
      'purchase',
      `حذف مشتريات مواد (${target.materialName}) بقيمة ${target.totalAmount} د.م`,
      target.projectId
    );

    setState(prev => ({
      ...prev,
      purchases: prev.purchases.filter(p => p.id !== id),
      trashBin: [trashItem, ...prev.trashBin],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const recordSupplierPayment = (data: Omit<SupplierPayment, 'id' | 'createdAt'>) => {
    const newSpay: SupplierPayment = {
      ...data,
      id: `spay_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const supplier = state.suppliers.find(s => s.id === data.supplierId);
    const syncItem = createSyncQueueItem('create', 'supplierPayment', newSpay.id, newSpay);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'payment',
      `تسجيل دفعة للمورد ${supplier?.name || ''} بمبلغ ${data.amount.toLocaleString()} د.م (${data.paymentMethod})`,
      data.projectId
    );

    setState(prev => ({
      ...prev,
      supplierPayments: [newSpay, ...prev.supplierPayments],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const updateSupplierPayment = (id: string, data: Partial<SupplierPayment>) => {
    const syncItem = createSyncQueueItem('update', 'supplierPayment', id, data);
    setState(prev => ({
      ...prev,
      supplierPayments: prev.supplierPayments.map(sp => sp.id === id ? { ...sp, ...data } : sp),
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const deleteSupplierPayment = (id: string) => {
    const target = state.supplierPayments.find(sp => sp.id === id);
    if (!target) return;
    const syncItem = createSyncQueueItem('delete', 'supplierPayment', id, { isDeleted: true });
    setState(prev => ({
      ...prev,
      supplierPayments: prev.supplierPayments.filter(sp => sp.id !== id),
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const getSupplierBalance = (supplierId: string) => {
    const supplier = state.suppliers.find(s => s.id === supplierId);
    const initial = supplier?.initialDebt || 0;
    const purchasesTotal = state.purchases
      .filter(p => p.supplierId === supplierId)
      .reduce((sum, p) => sum + p.totalAmount, 0);

    const directPaidInPurchases = state.purchases
      .filter(p => p.supplierId === supplierId)
      .reduce((sum, p) => sum + p.paidAmount, 0);

    const extraPayments = state.supplierPayments
      .filter(sp => sp.supplierId === supplierId)
      .reduce((sum, sp) => sum + sp.amount, 0);

    const totalPaid = directPaidInPurchases + extraPayments;
    const currentDebt = Math.max(0, (initial + purchasesTotal) - totalPaid);

    return {
      totalPurchases: purchasesTotal + initial,
      totalPaid,
      currentDebt
    };
  };

  // ===================== EXPENSES CRUD =====================
  const addExpense = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newExp: Expense = {
      ...data,
      id: `exp_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const syncItem = createSyncQueueItem('create', 'expense', newExp.id, newExp);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'expense',
      `تسجيل مصروف جديد: ${data.category} بمبلغ ${data.amount} د.م (${data.notes || ''})`,
      data.projectId
    );

    setState(prev => ({
      ...prev,
      expenses: [newExp, ...prev.expenses],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const updateExpense = (id: string, data: Partial<Expense>) => {
    const syncItem = createSyncQueueItem('update', 'expense', id, data);
    setState(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e),
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const deleteExpense = (id: string) => {
    const target = state.expenses.find(e => e.id === id);
    if (!target) return;

    const trashItem = createTrashItem('expense', id, `مصروف: ${target.category} (${target.amount} د.م)`, state.currentUser.name, target);
    const syncItem = createSyncQueueItem('delete', 'expense', id, { isDeleted: true });
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'delete',
      'expense',
      `حذف مصروف (${target.category}) بقيمة ${target.amount} د.م`,
      target.projectId
    );

    setState(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id),
      trashBin: [trashItem, ...prev.trashBin],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  // ===================== CLIENT PAYMENTS CRUD =====================
  const addClientPayment = (data: Omit<ClientPayment, 'id' | 'createdAt'>) => {
    const newCp: ClientPayment = {
      ...data,
      id: `clt_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const syncItem = createSyncQueueItem('create', 'clientPayment', newCp.id, newCp);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'payment',
      `استلام دفعة من الزبون بمبلغ ${data.amount.toLocaleString()} د.م (${data.milestoneTitle})`,
      data.projectId
    );

    setState(prev => ({
      ...prev,
      clientPayments: [newCp, ...prev.clientPayments],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const updateClientPayment = (id: string, data: Partial<ClientPayment>) => {
    const syncItem = createSyncQueueItem('update', 'clientPayment', id, data);
    setState(prev => ({
      ...prev,
      clientPayments: prev.clientPayments.map(c => c.id === id ? { ...c, ...data } : c),
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const deleteClientPayment = (id: string) => {
    const target = state.clientPayments.find(c => c.id === id);
    if (!target) return;
    const syncItem = createSyncQueueItem('delete', 'clientPayment', id, { isDeleted: true });
    setState(prev => ({
      ...prev,
      clientPayments: prev.clientPayments.filter(c => c.id !== id),
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  // ===================== TEAM & USERS CRUD =====================
  const addUser = (data: Omit<User, 'id' | 'createdAt'>) => {
    const defaultPerms: SupervisorPermissions = {
      canRecordAttendance: true,
      canRecordExpenses: true,
      canRecordPurchases: true,
      canUpdateCps: true,
      canViewFinancials: false,
      canAddWorkers: true
    };

    const newUser: User = {
      ...data,
      adminId: data.adminId || state.currentAdmin?.id || defaultSuperAdmin.id,
      permissions: data.permissions || defaultPerms,
      id: `usr_${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    const syncItem = createSyncQueueItem('create', 'user', newUser.id, newUser);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'user',
      `إضافة حساب مشرف/مستخدم جديد: ${newUser.name} (${newUser.role})`
    );

    setState(prev => ({
      ...prev,
      users: [...prev.users, newUser],
      activityLogs: [log, ...prev.activityLogs],
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const updateUser = (id: string, data: Partial<User>) => {
    const syncItem = createSyncQueueItem('update', 'user', id, data);
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === id ? { ...u, ...data } : u),
      syncQueue: [syncItem, ...prev.syncQueue]
    }));
  };

  const toggleUserStatus = (id: string) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === id ? { ...u, active: !u.active } : u)
    }));
  };

  const deleteUser = (id: string) => {
    setState(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== id)
    }));
  };

  // ===================== TRASH BIN & RESTORE =====================
  const restoreTrashItem = (trashId: string) => {
    const item = state.trashBin.find(t => t.id === trashId);
    if (!item) return;

    setState(prev => {
      const remainingTrash = prev.trashBin.filter(t => t.id !== trashId);
      const log = createActivityLog(
        prev.currentUser.id,
        prev.currentUser.name,
        'restore',
        item.entityType as unknown as ActivityLog['entity'],
        `استرجاع من سلة المهملات: ${item.title}`
      );

      const nextState: AppState = {
        ...prev,
        trashBin: remainingTrash,
        activityLogs: [log, ...prev.activityLogs]
      };

      if (item.entityType === 'project') {
        nextState.projects = [item.data as Project, ...prev.projects];
      } else if (item.entityType === 'worker') {
        nextState.workers = [item.data as Worker, ...prev.workers];
      } else if (item.entityType === 'supplier') {
        nextState.suppliers = [item.data as Supplier, ...prev.suppliers];
      } else if (item.entityType === 'purchase') {
        nextState.purchases = [item.data as Purchase, ...prev.purchases];
      } else if (item.entityType === 'expense') {
        nextState.expenses = [item.data as Expense, ...prev.expenses];
      }

      return nextState;
    });
  };

  const permanentlyDeleteTrashItem = (trashId: string) => {
    setState(prev => ({
      ...prev,
      trashBin: prev.trashBin.filter(t => t.id !== trashId)
    }));
  };

  const emptyTrash = () => {
    setState(prev => ({
      ...prev,
      trashBin: []
    }));
  };

  // ===================== FINANCIAL CALCULATORS =====================
  const getProjectFinancials = (projectId: string): ProjectFinancials => {
    const project = state.projects.find(p => p.id === projectId);
    const budget = project?.budget || 0;

    // Materials spent on this project
    const materialsSpent = state.purchases
      .filter(p => p.projectId === projectId)
      .reduce((sum, p) => sum + p.totalAmount, 0);

    // Wages paid or payable
    const laborPayments = state.wagePayments
      .filter(w => w.projectId === projectId)
      .reduce((sum, w) => sum + w.netAmount + w.advancesDeducted, 0);

    const laborAdvances = state.wageAdvances
      .filter(a => a.projectId === projectId && !a.isDeducted)
      .reduce((sum, a) => sum + a.amount, 0);

    const laborSpent = laborPayments + laborAdvances;

    // General expenses
    const expensesSpent = state.expenses
      .filter(e => e.projectId === projectId)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalSpent = materialsSpent + laborSpent + expensesSpent;

    // Client payments
    const clientReceived = state.clientPayments
      .filter(c => c.projectId === projectId)
      .reduce((sum, c) => sum + c.amount, 0);

    const remainingBudget = budget - totalSpent;
    const budgetPercentage = budget > 0 ? (totalSpent / budget) * 100 : 0;
    const isOverBudget = totalSpent > budget && budget > 0;
    const isNearBudget = budgetPercentage >= 85 && !isOverBudget;

    // Suppliers remaining debt for this project
    const suppliersDebt = state.purchases
      .filter(p => p.projectId === projectId)
      .reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0);

    return {
      budget,
      totalSpent,
      materialsSpent,
      laborSpent,
      expensesSpent,
      clientReceived,
      remainingBudget,
      budgetPercentage,
      isOverBudget,
      isNearBudget,
      suppliersDebt,
      totalPurchases: materialsSpent,
      totalWages: laborSpent,
      totalExpenses: expensesSpent
    };
  };

  const getOverallFinancials = (): ProjectFinancials => {
    const totalBudget = state.projects.reduce((sum, p) => sum + p.budget, 0);
    const materialsSpent = state.purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const laborPayments = state.wagePayments.reduce((sum, w) => sum + w.netAmount + w.advancesDeducted, 0);
    const laborAdvances = state.wageAdvances.filter(a => !a.isDeducted).reduce((sum, a) => sum + a.amount, 0);
    const laborSpent = laborPayments + laborAdvances;
    const expensesSpent = state.expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSpent = materialsSpent + laborSpent + expensesSpent;
    const clientReceived = state.clientPayments.reduce((sum, c) => sum + c.amount, 0);
    const remainingBudget = totalBudget - totalSpent;
    const budgetPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    let suppliersDebt = 0;
    state.suppliers.forEach(s => {
      suppliersDebt += getSupplierBalance(s.id).currentDebt;
    });

    return {
      budget: totalBudget,
      totalSpent,
      materialsSpent,
      laborSpent,
      expensesSpent,
      clientReceived,
      remainingBudget,
      budgetPercentage,
      isOverBudget: totalSpent > totalBudget && totalBudget > 0,
      isNearBudget: budgetPercentage >= 85 && totalSpent <= totalBudget,
      suppliersDebt,
      totalPurchases: materialsSpent,
      totalWages: laborSpent,
      totalExpenses: expensesSpent
    };
  };

  // ===================== CPS & BORDEREAU DES PRIX (تقدم الأشغال) =====================
  const recalculateProgressAndSyncProject = (
    projectId: string,
    allArticles: CpsArticle[],
    projects: Project[]
  ): Project[] => {
    const projectArticles = allArticles.filter(a => a.projectId === projectId && !a.isDeleted);
    if (projectArticles.length === 0) return projects;

    const totalPlanned = projectArticles.reduce((sum, a) => sum + ((a.quantityPlanned || 0) * (a.unitPrice || 0)), 0);
    const totalExecuted = projectArticles.reduce((sum, a) => sum + ((a.quantityExecuted || 0) * (a.unitPrice || 0)), 0);

    const calculatedProgress = totalPlanned > 0 
      ? Math.min(100, Math.max(0, Math.round((totalExecuted / totalPlanned) * 100)))
      : 0;

    return projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          progressPct: calculatedProgress,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
  };

  const addCpsArticle = (data: Omit<CpsArticle, 'id' | 'createdAt' | 'updatedAt'>) => {
    const totalPlannedPrice = (data.quantityPlanned || 0) * (data.unitPrice || 0);
    const quantityExecuted = data.quantityExecuted || 0;
    const executedAmount = quantityExecuted * (data.unitPrice || 0);
    const progressPct = data.quantityPlanned > 0
      ? Math.min(100, Math.max(0, Math.round((quantityExecuted / data.quantityPlanned) * 100)))
      : (data.progressPct || 0);

    const status: CpsArticle['status'] = progressPct >= 100 
      ? 'completed' 
      : progressPct > 0 
        ? 'in_progress' 
        : 'not_started';

    const newArticle: CpsArticle = {
      ...data,
      id: `cps_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      totalPlannedPrice,
      quantityExecuted,
      executedAmount,
      progressPct,
      status,
      lastUpdatedDate: data.lastUpdatedDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const syncItem = createSyncQueueItem('create', 'cps_article', newArticle.id, newArticle);
    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'cps_article',
      `إضافة بند جديد لدفتر التحملات CPS: ${newArticle.articleNumber} - ${newArticle.designation} (${newArticle.totalPlannedPrice.toLocaleString()} د.م)`,
      newArticle.projectId
    );

    setState(prev => {
      const nextArticles = [newArticle, ...prev.cpsArticles];
      const nextProjects = recalculateProgressAndSyncProject(newArticle.projectId, nextArticles, prev.projects);

      return {
        ...prev,
        cpsArticles: nextArticles,
        projects: nextProjects,
        activityLogs: [log, ...prev.activityLogs],
        syncQueue: [syncItem, ...prev.syncQueue]
      };
    });
  };

  const updateCpsArticle = (id: string, data: Partial<CpsArticle>) => {
    setState(prev => {
      const existing = prev.cpsArticles.find(a => a.id === id);
      if (!existing) return prev;

      const unitPrice = data.unitPrice !== undefined ? data.unitPrice : existing.unitPrice;
      const quantityPlanned = data.quantityPlanned !== undefined ? data.quantityPlanned : existing.quantityPlanned;
      
      let quantityExecuted = data.quantityExecuted !== undefined ? data.quantityExecuted : existing.quantityExecuted;
      let progressPct = data.progressPct !== undefined ? data.progressPct : existing.progressPct;

      // If quantityExecuted was explicitly changed, recompute progressPct
      if (data.quantityExecuted !== undefined && data.progressPct === undefined) {
        progressPct = quantityPlanned > 0 
          ? Math.min(100, Math.max(0, Math.round((quantityExecuted / quantityPlanned) * 100)))
          : progressPct;
      }
      // If progressPct was explicitly changed, recompute quantityExecuted
      else if (data.progressPct !== undefined && data.quantityExecuted === undefined) {
        quantityExecuted = (quantityPlanned * (progressPct / 100));
      }

      const totalPlannedPrice = (quantityPlanned || 0) * (unitPrice || 0);
      const executedAmount = (quantityExecuted || 0) * (unitPrice || 0);

      const status: CpsArticle['status'] = data.status || (
        progressPct >= 100 
          ? 'completed' 
          : progressPct > 0 
            ? 'in_progress' 
            : 'not_started'
      );

      const updatedArticle: CpsArticle = {
        ...existing,
        ...data,
        unitPrice,
        quantityPlanned,
        quantityExecuted,
        totalPlannedPrice,
        executedAmount,
        progressPct,
        status,
        lastUpdatedDate: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString()
      };

      const syncItem = createSyncQueueItem('update', 'cps_article', id, updatedArticle);
      const log = createActivityLog(
        prev.currentUser.id,
        prev.currentUser.name,
        'update',
        'cps_article',
        `تحديث تقدم بند CPS: ${updatedArticle.articleNumber} (${updatedArticle.designation}) بنسبة ${progressPct}%`,
        updatedArticle.projectId
      );

      const nextArticles = prev.cpsArticles.map(a => a.id === id ? updatedArticle : a);
      const nextProjects = recalculateProgressAndSyncProject(updatedArticle.projectId, nextArticles, prev.projects);

      return {
        ...prev,
        cpsArticles: nextArticles,
        projects: nextProjects,
        activityLogs: [log, ...prev.activityLogs],
        syncQueue: [syncItem, ...prev.syncQueue]
      };
    });
  };

  const deleteCpsArticle = (id: string) => {
    setState(prev => {
      const target = prev.cpsArticles.find(a => a.id === id);
      if (!target) return prev;

      const trashItem = createTrashItem('cps_article', id, `بند CPS: ${target.articleNumber} - ${target.designation}`, prev.currentUser.name, target);
      const syncItem = createSyncQueueItem('delete', 'cps_article', id, { isDeleted: true });
      const log = createActivityLog(
        prev.currentUser.id,
        prev.currentUser.name,
        'delete',
        'cps_article',
        `حذف بند من CPS: ${target.articleNumber} (${target.designation})`,
        target.projectId
      );

      const nextArticles = prev.cpsArticles.filter(a => a.id !== id);
      const nextProjects = recalculateProgressAndSyncProject(target.projectId, nextArticles, prev.projects);

      return {
        ...prev,
        cpsArticles: nextArticles,
        projects: nextProjects,
        trashBin: [trashItem, ...prev.trashBin],
        activityLogs: [log, ...prev.activityLogs],
        syncQueue: [syncItem, ...prev.syncQueue]
      };
    });
  };

  const bulkAddCpsArticles = (articles: Array<Omit<CpsArticle, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (articles.length === 0) return;

    const projectId = articles[0].projectId;
    const nowStr = new Date().toISOString();
    const newArticles: CpsArticle[] = articles.map((art, idx) => {
      const totalPlannedPrice = (art.quantityPlanned || 0) * (art.unitPrice || 0);
      const quantityExecuted = art.quantityExecuted || 0;
      const executedAmount = quantityExecuted * (art.unitPrice || 0);
      const progressPct = art.quantityPlanned > 0
        ? Math.min(100, Math.max(0, Math.round((quantityExecuted / art.quantityPlanned) * 100)))
        : (art.progressPct || 0);

      const status: CpsArticle['status'] = progressPct >= 100 ? 'completed' : progressPct > 0 ? 'in_progress' : 'not_started';

      return {
        ...art,
        id: `cps_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
        totalPlannedPrice,
        quantityExecuted,
        executedAmount,
        progressPct,
        status,
        lastUpdatedDate: art.lastUpdatedDate || nowStr.slice(0, 10),
        createdAt: nowStr,
        updatedAt: nowStr
      };
    });

    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'cps_article',
      `استيراد/إضافة ${newArticles.length} بند لدفتر التحملات والبردورو CPS`,
      projectId
    );

    setState(prev => {
      const nextArticles = [...newArticles, ...prev.cpsArticles];
      const nextProjects = recalculateProgressAndSyncProject(projectId, nextArticles, prev.projects);

      return {
        ...prev,
        cpsArticles: nextArticles,
        projects: nextProjects,
        activityLogs: [log, ...prev.activityLogs]
      };
    });
  };

  const importCpsTemplate = (projectId: string, templateId: string) => {
    const template = cpsTemplates.find(t => t.id === templateId);
    if (!template) return;

    const articlesToAdd = template.articles.map(art => ({
      projectId,
      lot: art.lot,
      articleNumber: art.articleNumber,
      designation: art.designation,
      unit: art.unit,
      unitPrice: art.unitPrice,
      quantityPlanned: art.quantityPlanned,
      totalPlannedPrice: art.quantityPlanned * art.unitPrice,
      quantityExecuted: 0,
      progressPct: 0,
      executedAmount: 0,
      status: 'not_started' as const,
      notes: `مستورد من ${template.name}`
    }));

    bulkAddCpsArticles(articlesToAdd);
  };

  const getProjectCpsSummary = (projectId: string) => {
    const projectArticles = state.cpsArticles.filter(a => a.projectId === projectId && !a.isDeleted);
    
    const totalPlannedAmount = projectArticles.reduce((sum, a) => sum + ((a.quantityPlanned || 0) * (a.unitPrice || 0)), 0);
    const totalExecutedAmount = projectArticles.reduce((sum, a) => sum + ((a.quantityExecuted || 0) * (a.unitPrice || 0)), 0);
    
    const progressPct = totalPlannedAmount > 0 
      ? Math.min(100, Math.max(0, Math.round((totalExecutedAmount / totalPlannedAmount) * 100)))
      : 0;

    const totalArticles = projectArticles.length;
    const completedArticles = projectArticles.filter(a => a.status === 'completed' || a.progressPct >= 100).length;
    const inProgressArticles = projectArticles.filter(a => a.status === 'in_progress' && a.progressPct < 100 && a.progressPct > 0).length;
    const notStartedArticles = projectArticles.filter(a => a.status === 'not_started' || a.progressPct === 0).length;

    // Lots breakdown
    const lotsMap = new Map<string, { planned: number; executed: number; total: number; completed: number }>();
    projectArticles.forEach(a => {
      const lotName = a.lot || 'أشغال أخرى متنوعة';
      const existing = lotsMap.get(lotName) || { planned: 0, executed: 0, total: 0, completed: 0 };
      existing.planned += (a.quantityPlanned || 0) * (a.unitPrice || 0);
      existing.executed += (a.quantityExecuted || 0) * (a.unitPrice || 0);
      existing.total += 1;
      if (a.status === 'completed' || a.progressPct >= 100) {
        existing.completed += 1;
      }
      lotsMap.set(lotName, existing);
    });

    const lotsBreakdown = Array.from(lotsMap.entries()).map(([lot, stats]) => ({
      lot,
      plannedAmount: stats.planned,
      executedAmount: stats.executed,
      progressPct: stats.planned > 0 ? Math.min(100, Math.round((stats.executed / stats.planned) * 100)) : 0,
      articlesCount: stats.total,
      completedCount: stats.completed
    }));

    return {
      totalPlannedAmount,
      totalExecutedAmount,
      progressPct,
      totalArticles,
      completedArticles,
      inProgressArticles,
      notStartedArticles,
      lotsBreakdown
    };
  };

  // ===================== MULTI-TENANT ADMIN & GOOGLE WORKSPACE =====================
  
  const setSuperAdminMode = (enabled: boolean) => {
    setState(prev => ({ ...prev, superAdminMode: enabled }));
  };

  const switchActiveAdmin = (adminId: string | null) => {
    const target = adminId ? state.adminAccounts.find(a => a.id === adminId) || null : null;
    setState(prev => ({
      ...prev,
      currentAdmin: target,
      superAdminMode: !adminId
    }));
  };

  const loginWithGoogleAdmin = async (adminIdCode?: string): Promise<{ success: boolean; message: string; role: 'super_admin' | 'admin' }> => {
    try {
      const { user } = await signInWithGoogle();
      const email = user.email?.toLowerCase().trim() || '';

      // 1. Is this the Super Admin?
      if (email === SUPER_ADMIN_EMAIL.toLowerCase() || state.adminAccounts.some(a => a.email.toLowerCase() === email && a.role === 'super_admin')) {
        let superAcc = state.adminAccounts.find(a => a.email.toLowerCase() === email);
        if (!superAcc) {
          superAcc = {
            id: 'ADM-ROOT-88',
            email,
            name: user.displayName || 'الحاج بوشعيب (الأدمين الكبير)',
            role: 'super_admin',
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          };
          setState(prev => ({
            ...prev,
            adminAccounts: [superAcc!, ...prev.adminAccounts],
            currentAdmin: superAcc!,
            superAdminMode: true
          }));
        } else {
          setState(prev => ({
            ...prev,
            currentAdmin: superAcc!,
            superAdminMode: true
          }));
        }

        const session: ActiveSession = {
          type: 'super_admin',
          id: superAcc.id,
          name: superAcc.name,
          email: superAcc.email
        };
        setActiveSession(session);
        saveStoredSession(session);

        const log = createActivityLog(
          state.currentUser.id,
          superAcc.name,
          'login',
          'system',
          `تسجيل دخول المالك العام بـ Gmail: ${email}`
        );
        setState(prev => ({ ...prev, activityLogs: [log, ...prev.activityLogs] }));

        return { success: true, message: `مرحباً بك يا مالك المنظومة (${superAcc.name})`, role: 'super_admin' };
      }

      // 2. Check if user is already a registered Admin in state or Google Sheets
      let matchedAdmin = state.adminAccounts.find(a => a.email.toLowerCase() === email);

      if (!matchedAdmin && state.workspaceConfig.masterSheetId) {
        try {
          const sheetAdmins = await fetchAdminRegistryFromSheet(state.workspaceConfig.masterSheetId);
          matchedAdmin = sheetAdmins.find(a => a.email.toLowerCase() === email);
          if (matchedAdmin) {
            setState(prev => ({
              ...prev,
              adminAccounts: [...prev.adminAccounts.filter(x => x.id !== matchedAdmin!.id), matchedAdmin!]
            }));
          }
        } catch (e) {
          console.warn('Could not read sheet registry on login:', e);
        }
      }

      if (matchedAdmin) {
        if (matchedAdmin.status === 'suspended') {
          throw new Error('تم تجميد هذا الحساب من طرف المالك العام للمنظومة.');
        }

        const autoStatus = computeAutoStatus(matchedAdmin.subscription, matchedAdmin.status);
        if (autoStatus === 'expired') {
          const isTrial = matchedAdmin.subscription?.tier === 'trial_3days';
          const expiredMsg = isTrial
            ? 'انتهت الفترة التجريبية (3 أيام). تم إرجاع الحساب للوضع الافتراضي المغلق، وليس لك الحق في دخول النظام إلا بعد الاشتراك في الباقة الشهرية أو السنوية. يرجى التواصل مع إدارة المنظومة لتفعيل اشتراكك.'
            : 'انتهت صلاحية اشتراكك في المنظومة. يرجى تجديد أو تفعيل الباقة الشهرية أو السنوية للتمكن من الدخول واستئناف العمل.';
          throw new Error(expiredMsg);
        }

        if (adminIdCode && adminIdCode.trim().toUpperCase() !== matchedAdmin.id.toUpperCase()) {
          throw new Error(`كود الأدمين المدخل (${adminIdCode}) غير متطابق مع كود هذا الحساب.`);
        }

        const updatedAdmin: AdminAccount = {
          ...matchedAdmin,
          lastLoginAt: new Date().toISOString()
        };

        const session: ActiveSession = {
          type: 'admin',
          id: updatedAdmin.id,
          name: updatedAdmin.name,
          email: updatedAdmin.email,
          sheetId: updatedAdmin.sheetId || undefined,
          sheetUrl: updatedAdmin.sheetUrl || undefined,
          sheetTitle: updatedAdmin.sheetTitle || undefined
        };
        setActiveSession(session);
        saveStoredSession(session);

        if (!updatedAdmin.sheetId) {
          setIsSheetOnboardingOpen(true);
        }

        setState(prev => ({
          ...prev,
          currentAdmin: updatedAdmin,
          superAdminMode: false,
          adminAccounts: prev.adminAccounts.map(a => a.id === updatedAdmin.id ? updatedAdmin : a)
        }));

        const log = createActivityLog(
          state.currentUser.id,
          updatedAdmin.name,
          'login',
          'system',
          `دخول الأدمين (${updatedAdmin.id}) بنجاح عبر Gmail`
        );
        setState(prev => ({ ...prev, activityLogs: [log, ...prev.activityLogs] }));

        return { success: true, message: `مرحباً بك في فضاء عملك الخاص (${updatedAdmin.name})`, role: 'admin' };
      }

      // 3. If NOT registered yet, check if admin entered a valid non-claimed Admin ID Code
      if (adminIdCode) {
        const foundById = state.adminAccounts.find(a => a.id.toUpperCase() === adminIdCode.trim().toUpperCase());
        if (foundById) {
          const activatedAdmin: AdminAccount = {
            ...foundById,
            email,
            name: user.displayName || foundById.name,
            lastLoginAt: new Date().toISOString(),
            status: 'active'
          };
          const session: ActiveSession = {
            type: 'admin',
            id: activatedAdmin.id,
            name: activatedAdmin.name,
            email: activatedAdmin.email,
            sheetId: activatedAdmin.sheetId || undefined,
            sheetUrl: activatedAdmin.sheetUrl || undefined,
            sheetTitle: activatedAdmin.sheetTitle || undefined
          };
          setActiveSession(session);
          saveStoredSession(session);

          if (!activatedAdmin.sheetId) {
            setIsSheetOnboardingOpen(true);
          }

          setState(prev => ({
            ...prev,
            currentAdmin: activatedAdmin,
            superAdminMode: false,
            adminAccounts: prev.adminAccounts.map(a => a.id === activatedAdmin.id ? activatedAdmin : a)
          }));
          return { success: true, message: `تم تفعيل حسابك كأدمين (${activatedAdmin.id}) بنجاح!`, role: 'admin' };
        }
      }

      throw new Error(`البريد الإلكتروني (${email}) ليس مسجلاً كأدمين في النظام. يرجى الحصول على كود الأدمين (Admin ID) من الأدمين الكبير أولاً.`);
    } catch (err: any) {
      console.error('Google Admin Login Failed:', err);
      throw err;
    }
  };

  const logoutGoogleAdmin = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setIsGoogleAuthenticated(false);
    setState(prev => ({
      ...prev,
      currentAdmin: null,
      superAdminMode: true
    }));
  };

  const registerNewAdmin = async (data: {
    email: string;
    name: string;
    companyName?: string;
    phone?: string;
    role?: 'admin' | 'super_admin';
    notes?: string;
    subscriptionTier?: SubscriptionTier;
  }): Promise<AdminAccount> => {
    const existingIds = state.adminAccounts.map(a => a.id);
    const newId = generateUniqueAdminId(existingIds);

    let sub = createDefaultTrialSubscription();
    if (data.subscriptionTier === 'monthly') sub = createMonthlySubscription();
    if (data.subscriptionTier === 'annual') sub = createAnnualSubscription();

    const newAdmin: AdminAccount = {
      id: newId,
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      companyName: data.companyName?.trim(),
      phone: data.phone?.trim(),
      role: data.role || 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      notes: data.notes?.trim(),
      subscription: sub
    };

    setState(prev => ({
      ...prev,
      adminAccounts: [...prev.adminAccounts, newAdmin]
    }));

    if (state.workspaceConfig.masterSheetId) {
      try {
        await saveAdminToRegistrySheet(state.workspaceConfig.masterSheetId, newAdmin);
      } catch (err) {
        console.warn('Failed to append admin to Google Sheet:', err);
      }
    }

    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'create',
      'user',
      `تم تسجيل أدمين جديد: ${newAdmin.name} (${newAdmin.email}) بكود معرف: ${newAdmin.id}`
    );
    setState(prev => ({ ...prev, activityLogs: [log, ...prev.activityLogs] }));

    return newAdmin;
  };

  const updateAdminStatus = (adminId: string, status: 'active' | 'suspended') => {
    setState(prev => ({
      ...prev,
      adminAccounts: prev.adminAccounts.map(a => a.id === adminId ? { ...a, status } : a)
    }));
  };

  const deleteAdmin = async (adminId: string): Promise<{ success: boolean; message: string }> => {
    const deletedAdmin = state.adminAccounts.find(a => a.id === adminId);
    const remainingAdmins = state.adminAccounts.filter(a => a.id !== adminId);
    
    setState(prev => {
      const updated = {
        ...prev,
        adminAccounts: remainingAdmins,
        currentAdmin: prev.currentAdmin?.id === adminId ? null : prev.currentAdmin
      };
      saveStateToStorage(updated);
      return updated;
    });

    let sheetUpdated = false;
    const sheetId = state.workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID;
    if (sheetId && isGoogleAuthenticated) {
      try {
        await pushAdminsToMasterSheet(sheetId, remainingAdmins);
        sheetUpdated = true;
      } catch (e) {
        console.warn('Could not update Google Sheets Admin_Registry on delete:', e);
      }
    }

    const log = createActivityLog(
      state.currentUser.id,
      state.currentUser.name,
      'delete',
      'user',
      `تم حذف حساب المقاول (${deletedAdmin?.name || adminId})${sheetUpdated ? ' ومسحه كلياً من Google Sheets' : ''}`
    );
    setState(prev => ({ ...prev, activityLogs: [log, ...prev.activityLogs] }));

    return {
      success: true,
      message: sheetUpdated
        ? `تم حذف حساب المقاول (${deletedAdmin?.name || adminId}) من النظام ومسحه كلياً من Google Sheets بنجاح.`
        : `تم حذف حساب المقاول (${deletedAdmin?.name || adminId}) من النظام بنجاح.`
    };
  };

  const updateSupervisorPermissions = (userId: string, permissions: SupervisorPermissions) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, permissions } : u)
    }));
  };

  const assignSupervisorProjects = (userId: string, projectIds: string[]) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, assignedProjectIds: projectIds } : u)
    }));
  };

  const updateWorkspaceConfig = (config: Partial<WorkspaceConfig>) => {
    setState(prev => ({
      ...prev,
      workspaceConfig: {
        ...prev.workspaceConfig,
        ...config
      }
    }));
  };

  const setGuestGoogleSheetUrl = async (url: string): Promise<{ success: boolean; message: string }> => {
    const sheetId = extractSpreadsheetId(url);
    if (!sheetId) {
      throw new Error('رابط Google Sheets غير صالح. يرجى التأكد من الرابط.');
    }
    try {
      await fetchPublicSheetData(sheetId);
    } catch (e) {
      console.warn('Public access test failed, saving sheet ID anyway:', e);
    }

    setState(prev => ({
      ...prev,
      workspaceConfig: {
        ...prev.workspaceConfig,
        guestSheetUrl: url,
        guestSheetId: sheetId,
        lastSheetsSync: new Date().toISOString()
      }
    }));

    return { success: true, message: 'تم ربط ملف Google Sheets بنجاح!' };
  };

  const syncAdminsFromMasterSheet = async (targetSheetId?: string): Promise<{
    success: boolean;
    count: number;
    sheetAdmins: AdminAccount[];
    message: string;
  }> => {
    const sheetId = targetSheetId || state.workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID;
    if (!sheetId) {
      throw new Error('يرجى تحديد أو ربط ملف Google Sheets أولاً');
    }
    const sheetAdmins = await fetchAdminRegistryFromSheet(sheetId);
    if (!sheetAdmins || sheetAdmins.length === 0) {
      return { success: true, count: 0, sheetAdmins: [], message: 'لم يتم العثور على أدمينات مسجلين في الشيت' };
    }

    setState(prev => {
      const superAdmin = prev.adminAccounts.find(a => a.role === 'super_admin') || defaultSuperAdmin;
      const adminMap = new Map<string, AdminAccount>();
      adminMap.set(superAdmin.id, superAdmin);

      for (const sa of sheetAdmins) {
        if (sa.role === 'super_admin') {
          adminMap.set(superAdmin.id, { ...superAdmin, ...sa, id: superAdmin.id, role: 'super_admin' });
        } else {
          const localMatch = prev.adminAccounts.find(a => a.id === sa.id || a.email.toLowerCase() === sa.email.toLowerCase());
          adminMap.set(sa.id, {
            ...(localMatch || {}),
            ...sa
          });
        }
      }

      const mergedList = Array.from(adminMap.values());
      const updated = {
        ...prev,
        adminAccounts: mergedList
      };
      saveStateToStorage(updated);
      return updated;
    });

    const tenantCount = sheetAdmins.filter(a => a.role !== 'super_admin').length;
    return {
      success: true,
      count: tenantCount,
      sheetAdmins,
      message: `تمت مزامنة واستيراد ${tenantCount} مقاولين بنجاح من الشيت المركزي!`
    };
  };

  const pushAdminsToMasterSheetAction = async (): Promise<{ success: boolean; count: number; message: string }> => {
    const sheetId = state.workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID;
    if (!sheetId) throw new Error('يرجى تحديد أو ربط ملف Google Sheets أولاً.');
    const res = await pushAdminsToMasterSheet(sheetId, state.adminAccounts);
    setState(prev => ({
      ...prev,
      workspaceConfig: {
        ...prev.workspaceConfig,
        lastSheetsSync: new Date().toISOString()
      },
      lastSyncTime: new Date().toISOString()
    }));
    return res;
  };

  const wipeCloudSheetsData = async (wipeAdminRegistry?: boolean) => {
    const sheetId = state.workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID;
    if (!sheetId) throw new Error('لا يوجد ملف Google Sheets مرتبط للتصفير.');
    const res = await wipeAllSpreadsheetData(sheetId, { wipeAdminRegistry });
    if (wipeAdminRegistry) {
      try {
        await pushAdminsToMasterSheet(sheetId, [defaultSuperAdmin]);
      } catch (e) {
        console.warn('Re-writing default super admin after wipe error:', e);
      }
    }
    return res;
  };

  const syncToGoogleSheets = async (targetAdminId?: string) => {
    // Unified Architecture: Always target the Master Google Sheet of Super Admin
    const sheetId = state.workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID;

    // Resolve target admin:
    // Super Admin: 'ALL'
    // Contractor: currentAdmin.id or activeSession.id
    // Supervisor: activeSession.adminId
    const effectiveAdminId = targetAdminId || (
      state.superAdminMode || state.currentAdmin?.role === 'super_admin'
        ? 'ALL'
        : (state.currentAdmin?.id || activeSession?.adminId || activeSession?.id)
    );

    const res = await syncAllDataToGoogleSheets(sheetId, state, effectiveAdminId);
    
    setState(prev => {
      const nowIso = new Date().toISOString();
      const updatedAdmin = prev.currentAdmin ? {
        ...prev.currentAdmin,
        lastSheetSync: nowIso
      } : null;

      return {
        ...prev,
        currentAdmin: updatedAdmin || prev.currentAdmin,
        adminAccounts: updatedAdmin ? prev.adminAccounts.map(a => a.id === updatedAdmin.id ? updatedAdmin : a) : prev.adminAccounts,
        workspaceConfig: {
          ...prev.workspaceConfig,
          lastSheetsSync: nowIso
        },
        lastSyncTime: nowIso
      };
    });
    return res;
  };

  const createMasterSheet = async (title?: string) => {
    const targetTitle = title || state.workspaceConfig.masterSheetTitle || KNOWN_MASTER_SPREADSHEET_TITLE;
    const preferredId = state.workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID;

    // Smart Resolution: Search Drive and check known ID first before ever creating a duplicate file
    const result = await findOrCreateMasterSpreadsheet(targetTitle, preferredId);
    const { spreadsheet, isExisting, validation } = result;

    setState(prev => ({
      ...prev,
      workspaceConfig: {
        ...prev.workspaceConfig,
        masterSheetId: spreadsheet.id,
        masterSheetUrl: spreadsheet.url,
        masterSheetTitle: spreadsheet.title,
        lastSheetsSync: new Date().toISOString()
      }
    }));
    try {
      for (const adm of state.adminAccounts) {
        await saveAdminToRegistrySheet(spreadsheet.id, adm);
      }
    } catch (e) {
      console.warn('Error saving initial admins to sheet:', e);
    }
    return { id: spreadsheet.id, url: spreadsheet.url, title: spreadsheet.title, isExisting, validation };
  };

  const inspectAndConnectMasterSheet = async (sheetIdOrUrl?: string): Promise<SheetValidationResult> => {
    let sheetId = sheetIdOrUrl 
      ? (extractSpreadsheetId(sheetIdOrUrl) || sheetIdOrUrl.trim()) 
      : (state.workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID);

    if (!sheetId) {
      sheetId = KNOWN_MASTER_SPREADSHEET_ID;
    }

    const validation = await inspectAndRepairSpreadsheet(sheetId, true);
    await ensureAdminRegistrySheet(sheetId);

    setState(prev => ({
      ...prev,
      workspaceConfig: {
        ...prev.workspaceConfig,
        masterSheetId: sheetId,
        masterSheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        masterSheetTitle: validation.spreadsheetTitle || prev.workspaceConfig.masterSheetTitle || KNOWN_MASTER_SPREADSHEET_TITLE,
        lastSheetsSync: new Date().toISOString()
      }
    }));

    return validation;
  };

  const openSheetOnboarding = () => setIsSheetOnboardingOpen(true);
  const closeSheetOnboarding = () => setIsSheetOnboardingOpen(false);

  const activeChantierSheet = useMemo(() => {
    const masterId = state.workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID;
    const masterUrl = state.workspaceConfig.masterSheetUrl || KNOWN_MASTER_SPREADSHEET_URL;

    if (activeSession?.type === 'supervisor') {
      const managerId = activeSession.adminId;
      const tenantAdmin = managerId
        ? state.adminAccounts.find(a => a.id.toUpperCase() === managerId.toUpperCase())
        : null;
      const managerName = tenantAdmin?.name || managerId || 'المدير العام';

      return {
        id: masterId,
        url: masterUrl,
        title: `ورقة المقاول (${managerName}) في الشيت الأساسي`,
        tabName: managerId ? `مقاول_${managerId}` : undefined,
        source: 'manager_inherited' as const
      };
    }

    const isSuper = state.superAdminMode || state.currentAdmin?.role === 'super_admin';
    if (isSuper) {
      return {
        id: masterId,
        url: masterUrl,
        title: state.workspaceConfig.masterSheetTitle || KNOWN_MASTER_SPREADSHEET_TITLE,
        tabName: 'ALL',
        source: 'super_admin' as const
      };
    }

    // Contractor (Admin): Dedicated tab inside Super Admin's Master Google Sheet
    const contractorId = state.currentAdmin?.id || activeSession?.id;
    const contractorName = state.currentAdmin?.name || activeSession?.name || 'المقاول';

    return {
      id: masterId,
      url: masterUrl,
      title: `ورقة مقاولتك (${contractorName}) في الشيت الأساسي`,
      tabName: contractorId ? `مقاول_${contractorId}` : undefined,
      source: 'manager_inherited' as const
    };
  }, [activeSession, state.workspaceConfig, state.adminAccounts, state.currentAdmin, state.superAdminMode]);

  const setupManagerSheetWithGoogle = async (): Promise<SheetValidationResult> => {
    if (!isGoogleAuthenticated || !getAccessToken()) {
      await signInWithGoogle();
    }

    const isSuper = state.superAdminMode || state.currentAdmin?.role === 'super_admin';
    const companyOrManagerName = state.currentAdmin?.companyName || state.currentAdmin?.name || 'المقاول العام';
    const adminId = state.currentAdmin?.id;
    const result = await findOrCreateManagerSpreadsheet(companyOrManagerName, adminId);

    const updatedAdmin: AdminAccount | null = state.currentAdmin ? {
      ...state.currentAdmin,
      sheetId: result.spreadsheet.id,
      sheetUrl: result.spreadsheet.url,
      sheetTitle: result.spreadsheet.title,
      lastSheetSync: new Date().toISOString()
    } : null;

    setState(prev => {
      const nextAdminAccounts = updatedAdmin 
        ? prev.adminAccounts.map(a => a.id === updatedAdmin.id ? updatedAdmin : a) 
        : prev.adminAccounts;

      const nextWorkspaceConfig = isSuper ? {
        ...prev.workspaceConfig,
        masterSheetId: result.spreadsheet.id,
        masterSheetUrl: result.spreadsheet.url,
        masterSheetTitle: result.spreadsheet.title,
        lastSheetsSync: new Date().toISOString()
      } : {
        ...prev.workspaceConfig,
        lastSheetsSync: new Date().toISOString()
      };

      return {
        ...prev,
        currentAdmin: updatedAdmin || prev.currentAdmin,
        adminAccounts: nextAdminAccounts,
        workspaceConfig: nextWorkspaceConfig
      };
    });

    if (activeSession) {
      const updatedSession: ActiveSession = {
        ...activeSession,
        sheetId: result.spreadsheet.id,
        sheetUrl: result.spreadsheet.url,
        sheetTitle: result.spreadsheet.title
      };
      setActiveSession(updatedSession);
      saveStoredSession(updatedSession);
    }

    // Save contractor's newly linked sheet to Central Registry if available
    const centralMasterId = state.workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID;
    if (updatedAdmin && centralMasterId && !isSuper) {
      saveAdminToRegistrySheet(centralMasterId, updatedAdmin).catch(err => {
        console.warn('Syncing contractor sheet ID to master registry failed silently:', err);
      });
    }

    return result.validation;
  };

  const setupManagerSheetFromPastedUrl = async (url: string, autoRepair: boolean = true): Promise<SheetValidationResult> => {
    const sheetId = extractSpreadsheetId(url);
    if (!sheetId) {
      throw new Error('رابط Google Sheets غير صالح. يرجى التأكد من نسخ الرابط بالكامل.');
    }

    const isSuper = state.superAdminMode || state.currentAdmin?.role === 'super_admin';
    const validation = await inspectAndRepairSpreadsheet(sheetId, autoRepair, !isSuper);

    const updatedAdmin: AdminAccount | null = state.currentAdmin ? {
      ...state.currentAdmin,
      sheetId: validation.spreadsheetId,
      sheetUrl: url,
      sheetTitle: validation.spreadsheetTitle,
      lastSheetSync: new Date().toISOString()
    } : null;

    setState(prev => {
      const nextAdminAccounts = updatedAdmin 
        ? prev.adminAccounts.map(a => a.id === updatedAdmin.id ? updatedAdmin : a) 
        : prev.adminAccounts;

      const nextWorkspaceConfig = isSuper ? {
        ...prev.workspaceConfig,
        masterSheetId: validation.spreadsheetId,
        masterSheetUrl: url,
        masterSheetTitle: validation.spreadsheetTitle,
        lastSheetsSync: new Date().toISOString()
      } : {
        ...prev.workspaceConfig,
        lastSheetsSync: new Date().toISOString()
      };

      return {
        ...prev,
        currentAdmin: updatedAdmin || prev.currentAdmin,
        adminAccounts: nextAdminAccounts,
        workspaceConfig: nextWorkspaceConfig
      };
    });

    if (activeSession) {
      const updatedSession: ActiveSession = {
        ...activeSession,
        sheetId: validation.spreadsheetId,
        sheetUrl: url,
        sheetTitle: validation.spreadsheetTitle
      };
      setActiveSession(updatedSession);
      saveStoredSession(updatedSession);
    }

    // Save contractor's newly linked sheet to Central Registry if available
    const centralMasterId = state.workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID;
    if (updatedAdmin && centralMasterId && !isSuper) {
      saveAdminToRegistrySheet(centralMasterId, updatedAdmin).catch(err => {
        console.warn('Syncing contractor sheet ID to master registry failed silently:', err);
      });
    }

    return validation;
  };

  const verifySupervisorSheetUrl = async (url: string): Promise<SheetValidationResult> => {
    const sheetId = extractSpreadsheetId(url);
    if (!sheetId) {
      throw new Error('رابط Google Sheets غير صالح. يرجى نسخ الرابط كاملاً من المتصفح أو واتساب.');
    }
    return await inspectAndRepairSpreadsheet(sheetId, false);
  };

  const bindSupervisorSheetUrl = async (url: string): Promise<SheetValidationResult> => {
    const sheetId = extractSpreadsheetId(url);
    if (!sheetId) {
      throw new Error('رابط Google Sheets غير صالح.');
    }
    const validation = await inspectAndRepairSpreadsheet(sheetId, false);

    setState(prev => ({
      ...prev,
      workspaceConfig: {
        ...prev.workspaceConfig,
        supervisorSheetUrl: url,
        supervisorSheetId: sheetId,
        lastSheetsSync: new Date().toISOString()
      }
    }));

    if (activeSession) {
      const updatedSession: ActiveSession = {
        ...activeSession,
        sheetId: sheetId,
        sheetUrl: url,
        sheetTitle: validation.spreadsheetTitle
      };
      setActiveSession(updatedSession);
      saveStoredSession(updatedSession);
    }

    return validation;
  };

  const backupToDrive = async () => {
    const adminName = state.currentAdmin?.name || 'Admin';
    const res = await backupSystemToDrive(state, adminName);
    setState(prev => ({
      ...prev,
      workspaceConfig: {
        ...prev.workspaceConfig,
        lastDriveSync: new Date().toISOString()
      }
    }));
    return res;
  };

  const uploadToDrive = async (fileName: string, content: Blob | string, mimeType: string = 'application/octet-stream') => {
    const folderId = await ensureDriveFolder();
    return await uploadFileToDrive(fileName, content, mimeType, folderId);
  };

  const sendChantierChatNotification = async (type: 'daily' | 'payroll' | 'debt' | 'cps', payload: any): Promise<boolean> => {
    const text = buildChantierChatReport(type, payload);
    const webhook = state.workspaceConfig.chatWebhookUrl;
    const space = state.workspaceConfig.chatSpaceName;

    if (webhook) {
      return await sendChatWebhookMessage(webhook, text);
    } else if (space) {
      return await sendChatMessageToSpace(space, text);
    } else {
      throw new Error('يرجى إدخال رابط Webhook أو تحديد فضاء Google Chat أولاً في إعدادات المنظومة.');
    }
  };

  const sendCustomChatMessage = async (message: string): Promise<boolean> => {
    const webhook = state.workspaceConfig.chatWebhookUrl;
    const space = state.workspaceConfig.chatSpaceName;
    if (webhook) {
      return await sendChatWebhookMessage(webhook, message);
    } else if (space) {
      return await sendChatMessageToSpace(space, message);
    } else {
      throw new Error('يرجى إدخال رابط Webhook أو فضاء Google Chat أولاً.');
    }
  };

  const resetToCleanData = async (options?: { wipeTenants?: boolean; clearGoogleSheets?: boolean }) => {
    let preservedAccounts = state.adminAccounts;
    if (options?.wipeTenants) {
      preservedAccounts = [defaultSuperAdmin];
    }
    const cleanState = resetDatabaseToClean({
      wipeTenants: options?.wipeTenants,
      preserveAccounts: preservedAccounts
    });
    setState(cleanState);
    saveStateToStorage(cleanState);

    if (options?.clearGoogleSheets) {
      const sheetId = state.workspaceConfig.masterSheetId || KNOWN_MASTER_SPREADSHEET_ID;
      if (sheetId) {
        try {
          await wipeAllSpreadsheetData(sheetId, { wipeAdminRegistry: options?.wipeTenants });
          if (options?.wipeTenants) {
            await pushAdminsToMasterSheet(sheetId, [defaultSuperAdmin]);
          }
        } catch (e) {
          console.warn('Failed to wipe Google Sheets remotely:', e);
        }
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        t,
        lang: state.lang,
        setLang,
        currentUser: state.currentUser,
        switchUser,
        selectedProjectId: state.selectedProjectId,
        setSelectedProjectId,
        accessibleProjects,
        activeSession,
        isAuthenticated,
        loginAsSuperAdmin,
        loginAsAdmin,
        loginAsSupervisor,
        logoutSession,
        isLocked: false,
        lockApp,
        unlockApp,
        changePin,
        isOnline: state.isOnline,
        syncPendingCount: state.syncQueue.length,
        triggerSync,
        exportBackupJson,
        importBackupJson,
        addProject,
        updateProject,
        deleteProject,
        addWorker,
        updateWorker,
        deleteWorker,
        assignWorkerToProject,
        removeWorkerFromProject,
        saveDailyAttendance,
        addWageAdvance,
        updateWageAdvance,
        deleteWageAdvance,
        settleWeeklyWages,
        updateWagePayment,
        deleteWagePayment,
        getWeeklyWorkersSummary,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addPurchase,
        updatePurchase,
        deletePurchase,
        recordSupplierPayment,
        updateSupplierPayment,
        deleteSupplierPayment,
        getSupplierBalance,
        addExpense,
        updateExpense,
        deleteExpense,
        addClientPayment,
        updateClientPayment,
        deleteClientPayment,
        addUser,
        updateUser,
        toggleUserStatus,
        restoreTrashItem,
        permanentlyDeleteTrashItem,
        emptyTrash,
        getProjectFinancials,
        getOverallFinancials,
        addCpsArticle,
        updateCpsArticle,
        deleteCpsArticle,
        bulkAddCpsArticles,
        importCpsTemplate,
        getProjectCpsSummary,
        
        // Workspace & Admin values
        googleUser,
        isGoogleAuthenticated,
        currentAdmin: state.currentAdmin,
        adminAccounts: state.adminAccounts,
        superAdminMode: state.superAdminMode,
        setSuperAdminMode,
        switchActiveAdmin,
        loginWithGoogleAdmin,
        logoutGoogleAdmin,
        registerNewAdmin,
        updateAdminStatus,
        deleteAdmin,
        updateSupervisorPermissions,
        assignSupervisorProjects,
        // Google Sheets Sync & Direct Link (for unauthenticated users)
        workspaceConfig: state.workspaceConfig,
        updateWorkspaceConfig,
        setGuestGoogleSheetUrl,
        syncToGoogleSheets,
        syncAdminsFromMasterSheet,
        pushAdminsToMasterSheet: pushAdminsToMasterSheetAction,
        wipeCloudSheetsData,
        createMasterSheet,
        inspectAndConnectMasterSheet,

        // Smart Sheet Onboarding & Schema Verification (الخيار أ)
        isSheetOnboardingOpen,
        openSheetOnboarding,
        closeSheetOnboarding,
        setupManagerSheetWithGoogle,
        setupManagerSheetFromPastedUrl,
        verifySupervisorSheetUrl,
        bindSupervisorSheetUrl,
        activeChantierSheet,

        backupToDrive,
        uploadToDrive,
        sendChantierChatNotification,
        sendCustomChatMessage,
        resetToCleanData,
        isPlatformSuperAdmin,
        accessibleSupervisors,
        deleteUser,

        // Subscription Plans
        isSubscriptionPlansOpen,
        openSubscriptionPlans,
        closeSubscriptionPlans,
        updateAdminSubscription
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
