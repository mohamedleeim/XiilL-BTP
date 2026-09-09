import { 
  Project, 
  Worker, 
  Supplier, 
  Purchase, 
  Expense, 
  Attendance, 
  WagePayment, 
  WageAdvance, 
  SupplierPayment, 
  ClientPayment, 
  User, 
  ActivityLog, 
  TrashItem, 
  CpsArticle
} from '../types';

export const initialUsers: User[] = [
  {
    id: 'usr_owner_root',
    name: 'المقاول الرئيسي',
    phone: '0661000000',
    email: 'mohamedleeim@gmail.com',
    role: 'owner',
    assignedProjectIds: ['*'],
    pinCode: '0000',
    active: true,
    avatar: '👷‍♂️',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString()
  },
  {
    id: 'usr_sup_hamid',
    name: 'حميد (شيف شانطي)',
    phone: '0662112233',
    role: 'supervisor',
    assignedProjectIds: ['*'],
    pinCode: '1234',
    adminId: 'ADM-7842-K9',
    active: true,
    avatar: '👷‍♂️',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    permissions: {
      canRecordAttendance: true,
      canRecordExpenses: true,
      canRecordPurchases: true,
      canUpdateCps: true,
      canViewFinancials: false,
      canAddWorkers: true
    }
  }
];

// All initial demo records are completely wiped clean for live real data entry
export const initialProjects: Project[] = [];
export const initialWorkers: Worker[] = [];
export const initialAttendance: Attendance[] = [];
export const initialWageAdvances: WageAdvance[] = [];
export const initialWagePayments: WagePayment[] = [];
export const initialSuppliers: Supplier[] = [];
export const initialPurchases: Purchase[] = [];
export const initialSupplierPayments: SupplierPayment[] = [];
export const initialExpenses: Expense[] = [];
export const initialClientPayments: ClientPayment[] = [];
export const initialCpsArticles: CpsArticle[] = [];
export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'log_init_clean',
    timestamp: new Date().toISOString(),
    userId: 'usr_owner_root',
    userName: 'النظام السحابي',
    action: 'login',
    entity: 'system',
    details: 'تم تصفير كافة البيانات التجريبية وبدء المنظومة بنسخة فارغة نظيفة جاهزة لإدخال بيانات الأوراش الحقيقية والربط مع Gmail و Google Sheets.'
  }
];
export const initialTrashBin: TrashItem[] = [];

// Standard Moroccan Construction Lots (Lots de travaux BTP Maroc)
export const cpsStandardLots = [
  '01. أشغال الأساسات والهيكل العظمي (Gros-Œuvre)',
  '02. البناء والتقسيم وتلبيس الحوائط (Maçonnerie & Enduits)',
  '03. العزل المائي والحراري (Étanchéité)',
  '04. التبليط والزليج والرخام (Revêtement & Carrelage)',
  '05. النجارة الخشبية والألمنيوم (Menuiserie)',
  '06. الترصيص الصحي والصرف (Plomberie & Sanitaire)',
  '07. التجهيزات الكهربائية والإنارة (Électricité)',
  '08. الصباغة والزخرفة والجبس (Peinture & Faux-plafond)'
];

export interface CpsTemplate {
  id: string;
  name: string;
  description: string;
  articles: Array<{
    lot: string;
    articleNumber: string;
    designation: string;
    unit: string;
    unitPrice: number;
    quantityPlanned: number;
  }>;
}

// Templates for creating new real projects easily
export const cpsTemplates: CpsTemplate[] = [
  {
    id: 'villa',
    name: 'نموذج فيلا سكنية حديثة (Villa R+1)',
    description: 'قالب CPS متكامل يشمل أشغال الأساسات، الهيكل العظمي، البناء، العزل والتشطيبات الفاخرة.',
    articles: [
      { lot: '01. أشغال الأساسات والهيكل العظمي (Gros-Œuvre)', articleNumber: '01.01', designation: 'حفر الأساسات العامة في تربة عادية (Fouilles en pleine masse)', unit: 'm³', unitPrice: 45, quantityPlanned: 180 },
      { lot: '01. أشغال الأساسات والهيكل العظمي (Gros-Œuvre)', articleNumber: '01.02', designation: 'خرسانة النظافة (Béton de propreté dosé à 150 kg/m³)', unit: 'm³', unitPrice: 550, quantityPlanned: 15 },
      { lot: '01. أشغال الأساسات والهيكل العظمي (Gros-Œuvre)', articleNumber: '01.03', designation: 'خرسانة مسلحة للأساسات والسواري (Béton armé en fondation B25)', unit: 'm³', unitPrice: 1100, quantityPlanned: 75 },
      { lot: '02. البناء والتقسيم وتلبيس الحوائط (Maçonnerie & Enduits)', articleNumber: '02.01', designation: 'بناء الحوائط المزدوجة بالآجور 6 و 8 ثقوب (Double cloison en briques)', unit: 'm²', unitPrice: 130, quantityPlanned: 320 },
      { lot: '03. العزل المائي والحراري (Étanchéité)', articleNumber: '03.01', designation: 'العزل المائي متعدد الطبقات للسطح (Étanchéité multicouche)', unit: 'm²', unitPrice: 160, quantityPlanned: 190 },
      { lot: '04. التبليط والزليج والرخام (Revêtement & Carrelage)', articleNumber: '04.01', designation: 'توريد وتركيب بورسلان إسباني ممتاز 60x120 (Grès cérame)', unit: 'm²', unitPrice: 220, quantityPlanned: 260 },
      { lot: '06. الترصيص الصحي والصرف (Plomberie & Sanitaire)', articleNumber: '06.01', designation: 'أنابيب التغذية بالماء الصالح للشرب PPR ونقاط التوزيع', unit: 'Forfait', unitPrice: 18000, quantityPlanned: 1 },
      { lot: '07. التجهيزات الكهربائية والإنارة (Électricité)', articleNumber: '07.01', designation: 'التمديدات الكهربائية واللوحة الرئيسية وقواطع Hager', unit: 'Forfait', unitPrice: 24000, quantityPlanned: 1 },
      { lot: '08. الصباغة والزخرفة والجبس (Peinture & Faux-plafond)', articleNumber: '08.01', designation: 'صباغة مائية وفينيلية وصباغة ديكورية فاخرة (Vinyle & Ambra)', unit: 'm²', unitPrice: 65, quantityPlanned: 680 }
    ]
  },
  {
    id: 'immeuble',
    name: 'نموذج عمارة سكنية (Immeuble R+4)',
    description: 'قالب خاص بالعمارات والمنشآت السكنية والتجارية المتعددة الطوابق.',
    articles: [
      { lot: '01. أشغال الأساسات والهيكل العظمي (Gros-Œuvre)', articleNumber: '01.01', designation: 'حفر الأساسات الكبرى وترحيل الأتربة (Terrassement et évacuation)', unit: 'm³', unitPrice: 50, quantityPlanned: 550 },
      { lot: '01. أشغال الأساسات والهيكل العظمي (Gros-Œuvre)', articleNumber: '01.02', designation: 'خرسانة مسلحة للهيكل وسواري الطوابق R+4 (Béton armé en élévation)', unit: 'm³', unitPrice: 1250, quantityPlanned: 340 },
      { lot: '02. البناء والتقسيم وتلبيس الحوائط (Maçonnerie & Enduits)', articleNumber: '02.01', designation: 'بناء الجدران والواجهات بالآجور الأحمر والتلبيس الإسمنتي', unit: 'm²', unitPrice: 120, quantityPlanned: 1200 },
      { lot: '03. العزل المائي والحراري (Étanchéité)', articleNumber: '03.01', designation: 'عزل مائي للسطح غير القابل للنفاذ (Étanchéité sous protection lourde)', unit: 'm²', unitPrice: 175, quantityPlanned: 240 },
      { lot: '04. التبليط والزليج والرخام (Revêtement & Carrelage)', articleNumber: '04.01', designation: 'أشغال زليج الأرضيات ودرج العمارة بالرخام الوطني', unit: 'm²', unitPrice: 190, quantityPlanned: 980 }
    ]
  },
  {
    id: 'renovation',
    name: 'نموذج تهيئة وترميم وصيانة (Rénovation & Finition)',
    description: 'قالب خاص بأشغال التجديد، الإصلاح، الصباغة، والتشطيبات الداخلية والخارجية.',
    articles: [
      { lot: '02. البناء والتقسيم وتلبيس الحوائط (Maçonnerie & Enduits)', articleNumber: '02.01', designation: 'هدم القواطع القديمة وفتح المنافذ وترحيل الردمة', unit: 'Forfait', unitPrice: 6000, quantityPlanned: 1 },
      { lot: '04. التبليط والزليج والرخام (Revêtement & Carrelage)', articleNumber: '04.01', designation: 'تكسير وإعادة تبليط الحمام والمطبخ بالزليج الحديث', unit: 'm²', unitPrice: 140, quantityPlanned: 85 },
      { lot: '06. الترصيص الصحي والصرف (Plomberie & Sanitaire)', articleNumber: '06.01', designation: 'تجديد شبكة السباكة والصرف وتركيب أطقم Rocа', unit: 'Forfait', unitPrice: 12000, quantityPlanned: 1 },
      { lot: '08. الصباغة والزخرفة والجبس (Peinture & Faux-plafond)', articleNumber: '08.01', designation: 'إصلاح التشققات وصباغة كاملة وعوازل الرطوبة', unit: 'm²', unitPrice: 55, quantityPlanned: 340 }
    ]
  }
];
