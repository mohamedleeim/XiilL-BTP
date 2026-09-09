export type UserRole = 'owner' | 'supervisor';

export type ProjectStatus = 'active' | 'completed' | 'paused';

export type WorkerWageType = 'daily' | 'monthly';

export type WorkerSpecialty = 
  | 'بناء' 
  | 'نجار مسلح' 
  | 'حداد تسليح' 
  | 'صباغ' 
  | 'بلومبي / سباك' 
  | 'كهربائي' 
  | 'زلايجي / مركب بلاط' 
  | 'جباص / فني جبس' 
  | 'مانوفر / عامل بسيط' 
  | 'شيف كروحة / رئيس فرقة' 
  | 'سائق آليات' 
  | 'أخرى';

export type AttendanceStatus = 'present' | 'half_day' | 'absent' | 'overtime';

export type MaterialUnit = 
  | 'طن (Tonne)' 
  | 'كيس (Sac)' 
  | 'متر مكعب (m³)' 
  | 'متر مربع (m²)' 
  | 'متر طولي (ml)' 
  | 'حبة (Pièce)' 
  | 'شاحنة (Camion)' 
  | 'سطل (Seau)' 
  | 'أخرى';

export type PaymentMethod = 
  | 'كاش (Espèces)' 
  | 'شيك (Chèque)' 
  | 'تحويل بنكي (Virement)' 
  | 'كمبيالة (Traite)';

export type ExpenseCategory = 
  | 'وقود ونقل' 
  | 'كراء آليات ومعدات' 
  | 'تغذية العمال ووجبات' 
  | 'رخص وإجراءات إدارية' 
  | 'شراء أدوات صغيرة' 
  | 'صيانة وإصلاحات' 
  | 'أجور إضافية طارئة' 
  | 'أخرى';

export type SupplierCategory = 
  | 'إسمنت ورمل وقرمود' 
  | 'حديد تسليح' 
  | 'خشب ونجارة' 
  | 'كهرباء وإنارة' 
  | 'ترصيص وصحي' 
  | 'صباغة وعوازل' 
  | 'ألومنيوم وزجاج' 
  | 'كراء معدات وسقالات' 
  | 'أخرى';

export type ReportType = 
  | 'project_summary'    // تقرير المشروع الشامل
  | 'daily_log'          // التقرير اليومي للورش
  | 'delivery_receipt'   // وصل تسليم وأداء
  | 'client_invoice'     // فاتورة العميل / كشف الأشغال
  | 'supplier_statement' // كشف حساب المورد
  | 'cost_estimate';     // عرض ثمن وتقدير التكلفة (Devis)

export interface SupervisorPermissions {
  canRecordAttendance: boolean; // تسجيل الحضور والبوانطاج
  canRecordExpenses: boolean;   // تسجيل المصاريف اليومية
  canRecordPurchases: boolean;  // تسجيل مشتريات المواد وبونات التسليم
  canUpdateCps: boolean;        // تحديث تقدم بنود دفتر التحملات CPS
  canViewFinancials: boolean;   // رؤية الأرقام المالية والميزانية
  canAddWorkers: boolean;       // إضافة عمال جدد
}

export type SubscriptionTier = 'trial_3days' | 'monthly' | 'annual';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  status: 'trial' | 'active' | 'expired';
  price: number;     // in MAD (0 for trial, 290 for monthly, 2610 for annual)
  discountPercentage?: number; // e.g. 25% for annual
  autoRenew?: boolean;
}

export interface AdminAccount {
  id: string; // Unique generated ID e.g. "ADM-7842-K9"
  email: string;
  name: string;
  companyName?: string;
  phone?: string;
  role: 'super_admin' | 'admin';
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  notes?: string;
  sheetId?: string; // specific spreadsheet ID for this admin
  sheetUrl?: string; // specific spreadsheet URL for this admin
  sheetTitle?: string;
  lastSheetSync?: string;
  subscription?: SubscriptionInfo;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  size?: string;
  projectId?: string;
}

export interface ChatSpaceItem {
  name: string; // spaces/XXXX
  displayName: string;
  type: string;
}

export interface WorkspaceConfig {
  masterSheetId?: string;
  masterSheetUrl?: string;
  masterSheetTitle?: string;
  guestSheetUrl?: string;
  guestSheetId?: string;
  supervisorSheetUrl?: string;
  supervisorSheetId?: string;
  driveFolderId?: string;
  chatSpaceName?: string;
  chatWebhookUrl?: string;
  lastSheetsSync?: string;
  lastDriveSync?: string;
  autoSyncEnabled?: boolean;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  assignedProjectIds: string[]; // empty or ['*'] for owner
  pinCode?: string;
  active: boolean;
  avatar?: string;
  createdAt: string;
  lastActive?: string;
  adminId?: string; // Tenant isolation: which Admin owns this supervisor
  permissions?: SupervisorPermissions; // Granular supervisor permissions
}

export interface Project {
  id: string;
  adminId?: string; // Tenant isolation
  name: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  locationCity: string;
  locationAddress?: string;
  budget: number; // in MAD
  startDate: string;
  targetEndDate?: string;
  status: ProjectStatus;
  progressPct: number; // 0 - 100
  notes?: string;
  assignedSupervisorIds: string[];
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Worker {
  id: string;
  adminId?: string; // Tenant isolation
  name: string;
  specialty: WorkerSpecialty;
  wageType: WorkerWageType;
  wageAmount: number; // Daily rate or Monthly salary in MAD
  phone: string;
  cin?: string; // Carte d'Identité Nationale
  projectIds: string[];
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Attendance {
  id: string;
  adminId?: string;
  date: string; // YYYY-MM-DD
  workerId: string;
  projectId: string;
  status: AttendanceStatus;
  overtimeHours?: number;
  notes?: string;
  isPaid?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WagePayment {
  id: string;
  adminId?: string;
  workerId: string;
  projectId: string;
  periodStart: string;
  periodEnd: string;
  daysWorked: number;
  overtimeHours?: number;
  grossAmount: number;
  advancesDeducted: number; // التسبيقات
  netAmount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface WageAdvance {
  id: string;
  adminId?: string;
  workerId: string;
  projectId: string;
  amount: number;
  date: string;
  isDeducted: boolean;
  deductedInPaymentId?: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  adminId?: string; // Tenant isolation
  name: string;
  category: SupplierCategory;
  phone: string;
  city: string;
  address?: string;
  iceNumber?: string;
  initialDebt: number; // MAD
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Purchase {
  id: string;
  adminId?: string;
  date: string;
  supplierId: string;
  projectId: string;
  materialName: string;
  quantity: number;
  unit: MaterialUnit;
  unitPrice: number;
  totalAmount: number;
  paidAmount: number;
  remainingDebt: number;
  invoiceNumber?: string;
  receiptPhoto?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface SupplierPayment {
  id: string;
  adminId?: string;
  supplierId: string;
  projectId?: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  adminId?: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  projectId: string;
  paymentMethod: PaymentMethod;
  recipientName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface ClientPayment {
  id: string;
  adminId?: string;
  projectId: string;
  amount: number;
  date: string;
  milestoneTitle: string;
  paymentMethod: PaymentMethod;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectFinancials {
  budget: number;
  totalSpent: number;
  materialsSpent: number;
  laborSpent: number;
  expensesSpent: number;
  clientReceived: number;
  remainingBudget: number;
  budgetPercentage: number;
  isOverBudget: boolean;
  isNearBudget: boolean;
  suppliersDebt: number;
  totalPurchases?: number;
  totalWages?: number;
  totalExpenses?: number;
}

export type CpsArticleStatus = 'not_started' | 'in_progress' | 'completed';

export interface CpsArticle {
  id: string;
  adminId?: string;
  projectId: string;
  lot: string; // e.g. "01. أشغال الأساسات والهيكل (Gros-Œuvre)", "02. البناء والتقسيم (Maçonnerie)", etc.
  articleNumber: string; // e.g. "01.01", "02.01", "1", "12"
  designation: string; // اسم وتفصيل البند
  unit: string; // m³, m², ml, Kg, Tonne, U, Forfait, Ens, etc.
  unitPrice: number; // الثمن الأحادي بالدرهم (Prix Unitaire HT/TTC)
  quantityPlanned: number; // الكمية التقديرية المقررة في دفتر الشروط (Qté prévue)
  totalPlannedPrice: number; // المبلغ الإجمالي المبرمج = quantityPlanned * unitPrice
  quantityExecuted: number; // الكمية المنجزة الفعلية بالورش حتى الآن (Qté exécutée)
  progressPct: number; // نسبة تقدم الأرتيكل 0 - 100%
  executedAmount: number; // المبلغ المنجز المستحق = quantityExecuted * unitPrice
  status: CpsArticleStatus;
  notes?: string;
  lastUpdatedDate?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'restore' | 'export' | 'sync' | 'login';
  entity: 'project' | 'worker' | 'attendance' | 'supplier' | 'purchase' | 'expense' | 'payment' | 'user' | 'system' | 'cps_article';
  details: string;
  projectId?: string;
}

export interface TrashItem {
  id: string;
  entityType: 'project' | 'worker' | 'supplier' | 'purchase' | 'expense' | 'cps_article';
  entityId: string;
  title: string;
  deletedAt: string;
  deletedBy: string;
  expiresAt: string; // deletedAt + 7 days
  data: unknown;
}

export interface SyncQueueItem {
  id: string;
  timestamp: number;
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  payload: unknown;
  status: 'pending' | 'synced' | 'failed';
  retryCount: number;
}

export interface ActiveSession {
  type: 'super_admin' | 'admin' | 'supervisor';
  id: string; // adminId or userId
  name: string;
  email?: string;
  phone?: string;
  adminId?: string; // For supervisor: which tenant admin owns them
  projectId?: string; // For supervisor: which project they are assigned to
  sheetId?: string; // Linked Google Sheet ID
  sheetUrl?: string; // Linked Google Sheet URL
  sheetTitle?: string;
}

export interface AppState {
  users: User[];
  currentUser: User;
  adminAccounts: AdminAccount[];
  currentAdmin: AdminAccount | null;
  workspaceConfig: WorkspaceConfig;
  superAdminMode: boolean;
  projects: Project[];
  workers: Worker[];
  attendance: Attendance[];
  wagePayments: WagePayment[];
  wageAdvances: WageAdvance[];
  suppliers: Supplier[];
  purchases: Purchase[];
  supplierPayments: SupplierPayment[];
  expenses: Expense[];
  clientPayments: ClientPayment[];
  cpsArticles: CpsArticle[];
  activityLogs: ActivityLog[];
  trashBin: TrashItem[];
  syncQueue: SyncQueueItem[];
  isLocked?: boolean;
  activeSession?: ActiveSession | null;
  selectedProjectId: string | 'all';
  lang: 'ar' | 'fr';
  isOnline: boolean;
  lastSyncTime: string | null;
}
