import { SubscriptionInfo, SubscriptionTier } from '../types';

export interface PlanDetails {
  id: SubscriptionTier;
  titleAr: string;
  titleFr: string;
  badge: string;
  durationLabelAr: string;
  durationDays: number;
  priceMAD: number;
  originalPriceMAD?: number;
  discountPercentage?: number;
  descriptionAr: string;
  featuresAr: string[];
  isPopular?: boolean;
  buttonTextAr: string;
}

export const SUBSCRIPTION_PLANS: PlanDetails[] = [
  {
    id: 'trial_3days',
    titleAr: 'باقة التجربة المجانية',
    titleFr: 'Essai Gratuit 3 Jours',
    badge: '3 أيام تجريبية',
    durationLabelAr: '3 أيام مجاناً',
    durationDays: 3,
    priceMAD: 0,
    descriptionAr: 'تجربة شاملة لكافة مزايا منظومة XiilL BTP لإدارة الأوراش والمقاولات بدون أي التزام مالي.',
    featuresAr: [
      'إدارة أوراش البناء غير محدودة',
      'بوانطاج العمال اليومي وتسجيل الحضور',
      'حساب أجور العمال والتسبيقات الأسبوعية',
      'إدارة مشتريات المواد وفواتير الموردين',
      'ربط ومزامنة فورية مع Google Sheets',
      'دفتر التحملات وتتبع بنود CPS'
    ],
    buttonTextAr: 'بدء التجربة المجانية (3 أيام)'
  },
  {
    id: 'monthly',
    titleAr: 'الباقة الشهرية المتجددة',
    titleFr: 'Abonnement Mensuel',
    badge: 'مرونة شهرية',
    durationLabelAr: 'شهرياً',
    durationDays: 30,
    priceMAD: 290,
    descriptionAr: 'الخيار الأنسب للمقاولات التي ترغب في مرونة الدفع الشهري المستمر مع تحديثات فورية ودعم مستمر.',
    featuresAr: [
      'كافة مزايا المنظومة بدون أي قيود',
      'مزامنة سحابية غير محدودة مع Google Drive و Sheets',
      'حسابات غير محدودة لمشرفي الأوراش (Chefs de Chantier)',
      'تقارير محاسبية تفصيلية وPDF وضعيات الأشغال',
      'تنبيهات فورية ومتابعة ديون الموردين',
      'دعم فني وتوجيه هاتفي مستمر'
    ],
    buttonTextAr: 'الاشتراك في الباقة الشهرية'
  },
  {
    id: 'annual',
    titleAr: 'الباقة السنوية الاحترافية',
    titleFr: 'Abonnement Annuel (Économisez 25%)',
    badge: 'خصم 25% (الأكثر طلباً)',
    durationLabelAr: 'سنوياً (توفير 3 أشهر)',
    durationDays: 365,
    priceMAD: 2610, // 290 * 12 = 3480 -> 25% off = 2610 MAD
    originalPriceMAD: 3480,
    discountPercentage: 25,
    isPopular: true,
    descriptionAr: 'العرض الأقوى والأكثر توفيراً للمقاولات الجادة: احصل على خصم 25% فوري يعادل 3 أشهر مجانية بالكامل!',
    featuresAr: [
      'خصم استثنائي 25% (توفير 870 درهم مغربي)',
      'اشتراك كامل لمدة 365 يوماً بدون انقطاع',
      'أولوية قصوى في الدعم الفني والمرافقة الشخصية',
      'نسخ احتياطي سحابي تلقائي لبيانات الأوراش في Google Drive',
      'تخصيص كامل لترويسة كشوفات الحساب ولوجو المقاولة',
      'تدريب المشرفين والعمال على استعمال المنظومة'
    ],
    buttonTextAr: 'الاشتراك في الباقة السنوية (وفر 25%)'
  }
];

/**
 * Creates a default 3-day trial subscription starting right now
 */
export const createDefaultTrialSubscription = (): SubscriptionInfo => {
  const now = new Date();
  const endDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  return {
    tier: 'trial_3days',
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    status: 'trial',
    price: 0,
    discountPercentage: 0,
    autoRenew: false
  };
};

/**
 * Creates a monthly subscription
 */
export const createMonthlySubscription = (): SubscriptionInfo => {
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    tier: 'monthly',
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    status: 'active',
    price: 290,
    discountPercentage: 0,
    autoRenew: true
  };
};

/**
 * Creates an annual subscription with 25% discount
 */
export const createAnnualSubscription = (): SubscriptionInfo => {
  const now = new Date();
  const endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  return {
    tier: 'annual',
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    status: 'active',
    price: 2610,
    discountPercentage: 25,
    autoRenew: true
  };
};

/**
 * Calculates remaining days in subscription or trial
 */
export const calculateDaysRemaining = (sub?: SubscriptionInfo): number => {
  if (!sub || !sub.endDate) return 0;
  const now = Date.now();
  const end = new Date(sub.endDate).getTime();
  const diffMs = end - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Format subscription label with countdown
 */
export const getSubscriptionStatusText = (sub?: SubscriptionInfo): {
  label: string;
  daysRemaining: number;
  isExpired: boolean;
  colorClass: string;
} => {
  if (!sub) {
    return {
      label: 'غير مفعل',
      daysRemaining: 0,
      isExpired: true,
      colorClass: 'text-zinc-400 bg-zinc-800'
    };
  }

  const days = calculateDaysRemaining(sub);
  const isExpired = days <= 0;

  if (isExpired) {
    return {
      label: sub.tier === 'trial_3days' ? 'انتهت الفترة التجريبية' : 'انتهى الاشتراك',
      daysRemaining: 0,
      isExpired: true,
      colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
    };
  }

  if (sub.tier === 'trial_3days') {
    return {
      label: `فترة تجريبية (متبقي ${days} ${days === 1 ? 'يوم' : 'أيام'})`,
      daysRemaining: days,
      isExpired: false,
      colorClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    };
  }

  if (sub.tier === 'monthly') {
    return {
      label: `الباقة الشهرية (متبقي ${days} يوم)`,
      daysRemaining: days,
      isExpired: false,
      colorClass: 'text-blue-400 bg-blue-500/15 border-blue-500/30'
    };
  }

  return {
    label: `الباقة السنوية (متبقي ${days} يوم)`,
    daysRemaining: days,
    isExpired: false,
    colorClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
  };
};
