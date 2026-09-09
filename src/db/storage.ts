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
  AdminAccount,
  WorkspaceConfig
} from '../types';

import {
  initialUsers,
  initialProjects,
  initialWorkers,
  initialAttendance,
  initialWageAdvances,
  initialSuppliers,
  initialPurchases,
  initialSupplierPayments,
  initialExpenses,
  initialClientPayments,
  initialActivityLogs,
  initialTrashBin,
  initialCpsArticles
} from './seedData';
import { ActiveSession } from '../types';
import { createAnnualSubscription, createDefaultTrialSubscription } from '../services/subscriptionPlans';

const STORAGE_KEY = 'xiill_btp_v1_live';
export const AUTH_SESSION_KEY = 'xiill_btp_active_session';
const PIN_KEY = 'xiill_btp_pin';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const defaultSuperAdmin: AdminAccount = {
  id: 'ADM-ROOT-88',
  email: 'mohamedleeim@gmail.com',
  name: 'الأدمين الرئيسي (Super Admin)',
  companyName: 'مقاولة البناء والأشغال العامة',
  role: 'super_admin',
  status: 'active',
  createdAt: new Date().toISOString(),
  notes: 'الأدمين الكبير ومؤسس المنظومة',
  subscription: createAnnualSubscription()
};

export const sampleClientAdmin: AdminAccount = {
  id: 'ADM-7842-K9',
  email: 'said.btp@gmail.com',
  name: 'سعيد المقاول (شركة بنونة للبناء)',
  companyName: 'مقاولة بنونة للأشغال العامة',
  phone: '0663445566',
  role: 'admin',
  status: 'active',
  createdAt: new Date().toISOString(),
  notes: 'كود أدمين معتمد - فضاء عمل مستقل',
  subscription: createDefaultTrialSubscription()
};

export const defaultWorkspaceConfig: WorkspaceConfig = {
  masterSheetId: '',
  masterSheetUrl: '',
  guestSheetUrl: '',
  guestSheetId: '',
  driveFolderId: '',
  chatSpaceName: '',
  chatWebhookUrl: '',
  lastSheetsSync: undefined,
  lastDriveSync: undefined,
  autoSyncEnabled: true
};

export const getStoredSession = (): ActiveSession | null => {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

export const saveStoredSession = (session: ActiveSession | null): void => {
  try {
    if (!session) {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } else {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    }
  } catch (e) {
    console.warn('Failed to save session to localStorage:', e);
  }
};

export const resetDatabaseToClean = (): AppState => {
  try {
    localStorage.removeItem('ochanti_maroc_v1_data');
    localStorage.removeItem('ochanti_maroc_v2_live');
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear localStorage keys:', e);
  }

  const cleanState: AppState = {
    users: initialUsers,
    currentUser: initialUsers[0],
    adminAccounts: [defaultSuperAdmin, sampleClientAdmin],
    currentAdmin: defaultSuperAdmin,
    workspaceConfig: defaultWorkspaceConfig,
    superAdminMode: true,
    projects: [],
    workers: [],
    attendance: [],
    wagePayments: [],
    wageAdvances: [],
    suppliers: [],
    purchases: [],
    supplierPayments: [],
    expenses: [],
    clientPayments: [],
    cpsArticles: [],
    activityLogs: initialActivityLogs,
    trashBin: [],
    syncQueue: [],
    isLocked: false,
    activeSession: null,
    selectedProjectId: 'all',
    lang: 'ar',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSyncTime: new Date().toISOString()
  };

  saveStateToStorage(cleanState);
  return cleanState;
};

export const loadInitialState = (): AppState => {
  try {
    if (localStorage.getItem('ochanti_maroc_v1_data')) {
      localStorage.removeItem('ochanti_maroc_v1_data');
    }

    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized) {
      const parsed = JSON.parse(serialized) as Partial<AppState>;
      // Auto purge trash older than 7 days
      const now = Date.now();
      const validTrash = (parsed.trashBin || []).filter(item => {
        return new Date(item.expiresAt).getTime() > now;
      });

      const users = parsed.users && parsed.users.length > 0 ? parsed.users : initialUsers;
      const currentUser = parsed.currentUser || users[0];
      const adminAccounts = parsed.adminAccounts && parsed.adminAccounts.length > 0 
        ? parsed.adminAccounts 
        : [defaultSuperAdmin, sampleClientAdmin];
      const currentAdmin = parsed.currentAdmin !== undefined ? parsed.currentAdmin : defaultSuperAdmin;
      const workspaceConfig = { ...defaultWorkspaceConfig, ...(parsed.workspaceConfig || {}) };

      return {
        users,
        currentUser,
        adminAccounts,
        currentAdmin,
        workspaceConfig,
        superAdminMode: parsed.superAdminMode ?? true,
        projects: (parsed.projects || []).filter(p => !p.isDeleted),
        workers: (parsed.workers || []).filter(w => !w.isDeleted),
        attendance: parsed.attendance || [],
        wagePayments: parsed.wagePayments || [],
        wageAdvances: parsed.wageAdvances || [],
        suppliers: (parsed.suppliers || []).filter(s => !s.isDeleted),
        purchases: (parsed.purchases || []).filter(p => !p.isDeleted),
        supplierPayments: parsed.supplierPayments || [],
        expenses: (parsed.expenses || []).filter(e => !e.isDeleted),
        clientPayments: parsed.clientPayments || [],
        cpsArticles: (parsed.cpsArticles || []).filter(a => !a.isDeleted),
        activityLogs: parsed.activityLogs || initialActivityLogs,
        trashBin: validTrash,
        syncQueue: parsed.syncQueue || [],
        isLocked: false,
        activeSession: getStoredSession(),
        selectedProjectId: parsed.selectedProjectId || 'all',
        lang: (parsed.lang as 'ar' | 'fr') || 'ar',
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        lastSyncTime: parsed.lastSyncTime || new Date().toISOString()
      };
    }
  } catch (err) {
    console.error('Error reading localStorage in XiilL BTP, falling back to clean state:', err);
  }

  return resetDatabaseToClean();
};

export const saveStateToStorage = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed saving to localStorage:', err);
  }
};

export const getStoredPin = (): string => {
  return localStorage.getItem(PIN_KEY) || '1234';
};

export const setStoredPin = (newPin: string): void => {
  localStorage.setItem(PIN_KEY, newPin);
};

export const createActivityLog = (
  userId: string,
  userName: string,
  action: ActivityLog['action'],
  entity: ActivityLog['entity'],
  details: string,
  projectId?: string
): ActivityLog => {
  return {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action,
    entity,
    details,
    projectId
  };
};

export const createTrashItem = (
  entityType: TrashItem['entityType'],
  entityId: string,
  title: string,
  deletedBy: string,
  data: unknown
): TrashItem => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SEVEN_DAYS_MS).toISOString();
  return {
    id: `trash_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    entityType,
    entityId,
    title,
    deletedAt: now.toISOString(),
    deletedBy,
    expiresAt,
    data
  };
};

export const createSyncQueueItem = (
  action: SyncQueueItem['action'],
  entity: string,
  entityId: string,
  payload: unknown
): SyncQueueItem => {
  return {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    action,
    entity,
    entityId,
    payload,
    status: 'pending',
    retryCount: 0
  };
};
