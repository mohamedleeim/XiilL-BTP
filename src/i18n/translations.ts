export const translations = {
  ar: {
    // App Branding & Navigation
    appName: 'XiilL BTP',
    appTagline: 'إدارة ورش البناء والمقاولات',
    dashboard: 'لوحة التحكم',
    projects: 'الأوراش والمشاريع',
    workers: 'العمال والأجور',
    attendance: 'تسجيل الحضور',
    weeklyPayroll: 'حساب السيمانة',
    suppliers: 'الموردون والمشتريات',
    expenses: 'المصاريف والنفقات',
    reports: 'التقارير والفواتير',
    team: 'فريق العمل والمشرفين',
    aiAssistant: 'المساعد الذكي (دارجة)',
    trashBin: 'سلة المحذوفات',
    activityLog: 'سجل النشاطات',
    settings: 'الإعدادات والأمان',

    // Roles & Users
    roleOwner: 'مقاول / صاحب العمل (Owner)',
    roleSupervisor: 'مشرف ورش (Supervisor)',
    currentUser: 'المستخدم الحالي',
    switchUser: 'تبديل الحساب',
    allProjects: 'جميع الأوراش',
    selectProject: 'اختر الورش',

    // Statuses
    statusActive: 'قيد الإنجاز',
    statusCompleted: 'مكتمل',
    statusPaused: 'متوقف مؤقتاً',
    present: 'حاضر (يوم كامل)',
    halfDay: 'نصف يوم',
    absent: 'غائب',
    overtime: 'ساعات إضافية',

    // Currency & Units
    currency: 'د.م',
    currencyFull: 'درهم مغربي',
    mad: 'MAD',

    // Actions
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    restore: 'استرجاع',
    save: 'حفظ التغييرات',
    cancel: 'إلغاء',
    search: 'بحث...',
    filter: 'تصفية',
    exportPdf: 'تصدير PDF',
    print: 'طباعة',
    shareWhatsapp: 'مشاركة عبر واتساب',
    quickAdd: 'تسجيل سريع',
    syncNow: 'مزامنة الآن',
    lockApp: 'قفل التطبيق',
    unlockApp: 'فتح القفل',

    // Metrics & Financials
    totalBudget: 'إجمالي الميزانية',
    totalSpent: 'إجمالي المصروفات',
    materialsSpent: 'تكلفة المواد',
    laborSpent: 'أجور العمال',
    generalExpenses: 'مصاريف عامة',
    clientPaymentsTotal: 'دفعات الزبناء',
    remainingBudget: 'الميزانية المتبقية',
    budgetUsed: 'نسبة استهلاك الميزانية',
    suppliersDebt: 'ديون الموردين الحالية',
    unpaidWages: 'أجور غير مسواة',
    budgetWarning: 'تنبيه: اقتراب نفاد ميزانية الورش!',

    // Offline & Sync
    online: 'متصل بالإنترنت',
    offline: 'وضع عدم الاتصال (أوفلاين - البيانات محفوظة محلياً)',
    syncPending: 'توجد عمليات في طابور المزامنة',
    allSynced: 'جميع البيانات متزامنة محلياً وسحابياً',
    lastSync: 'آخر مزامنة',

    // Workers & Attendance
    dailyWage: 'أجر يومي',
    monthlyWage: 'راتب شهري',
    daysWorked: 'أيام العمل',
    totalWages: 'مجموع المستحقات',
    advances: 'التسبيقات (أفونس)',
    netSalary: 'الصافي للدفع',
    paySaturday: 'تسوية أجور السبت',
    advancePaid: 'تسجيل تسبيق',

    // Suppliers & Purchases
    supplierName: 'اسم المورد',
    material: 'المادة / السلعة',
    unitPrice: 'سعر الوحدة',
    quantity: 'الكمية',
    paid: 'المدفوع',
    remaining: 'الباقي (دين)',
    paySupplier: 'أداء دفعة للمورد',

    // Reports (6 Types)
    report1: 'تقرير الورش الشامل',
    report2: 'التقرير اليومي للورش',
    report3: 'وصل تسليم / أداء',
    report4: 'فاتورة العميل / بيان الأشغال',
    report5: 'كشف حساب المورد (الكريدي)',
    report6: 'عرض ثمن تقديري (Devis)',

    // AI Assistant
    aiAssistantTitle: 'مساعد XiilL BTP الذكي للأوراش',
    aiAssistantDesc: 'اسأل بالدارجة المغربية أو العربية عن أرقام الورش، تكاليف السلعة، حسابات العمال، وديون الفورنيسور.',
    aiQueryOnlyWarning: 'تنبيه أمان: المساعد يجيب للاستعلام فقط ولا يعدّل أي سجلات دون موافقتك الصريحة.',

    // Security & Pin
    pinRequired: 'أدخل الرمز السري (PIN) للمتابعة',
    incorrectPin: 'الرمز السري غير صحيح',
    changePin: 'تغيير الرمز السري',
    backupDatabase: 'نسخ احتياطي للبيانات (JSON)',
    restoreDatabase: 'استعادة نسخة احتياطية',
    trashRetentionNotice: 'العناصر المحذوفة تُحفظ في سلة المهملات لمدة 7 أيام قبل الحذف النهائي.',
  },
  fr: {
    // App Branding & Navigation
    appName: 'XiilL BTP',
    appTagline: 'Gestion de Chantiers BTP',
    dashboard: 'Tableau de bord',
    projects: 'Chantiers & Projets',
    workers: 'Ouvriers & Salaires',
    attendance: 'Pointage Journalier',
    weeklyPayroll: 'Paie du Samedi',
    suppliers: 'Fournisseurs & Achats',
    expenses: 'Dépenses & Frais',
    reports: 'Rapports & Factures',
    team: 'Équipe & Chefs de Chantier',
    aiAssistant: 'Assistant IA (Darija)',
    trashBin: 'Corbeille (7 jours)',
    activityLog: 'Journal d’activité',
    settings: 'Paramètres & Sécurité',

    // Roles & Users
    roleOwner: 'Entrepreneur / Patron (Owner)',
    roleSupervisor: 'Chef de Chantier (Supervisor)',
    currentUser: 'Utilisateur actif',
    switchUser: 'Changer d’utilisateur',
    allProjects: 'Tous les chantiers',
    selectProject: 'Sélectionner un chantier',

    // Statuses
    statusActive: 'En cours',
    statusCompleted: 'Terminé',
    statusPaused: 'En pause',
    present: 'Présent (Journée)',
    halfDay: 'Demi-journée',
    absent: 'Absent',
    overtime: 'Heures sup.',

    // Currency & Units
    currency: 'DH',
    currencyFull: 'Dirham Marocain',
    mad: 'MAD',

    // Actions
    add: 'Ajouter',
    edit: 'Modifier',
    delete: 'Supprimer',
    restore: 'Restaurer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    search: 'Rechercher...',
    filter: 'Filtrer',
    exportPdf: 'Exporter PDF',
    print: 'Imprimer',
    shareWhatsapp: 'Partager sur WhatsApp',
    quickAdd: 'Saisie rapide',
    syncNow: 'Synchroniser',
    lockApp: 'Verrouiller',
    unlockApp: 'Déverrouiller',

    // Metrics & Financials
    totalBudget: 'Budget Total',
    totalSpent: 'Dépenses Totales',
    materialsSpent: 'Achats Matériaux',
    laborSpent: 'Main d’œuvre',
    generalExpenses: 'Frais Généraux',
    clientPaymentsTotal: 'Règlements Clients',
    remainingBudget: 'Budget Restant',
    budgetUsed: 'Consommation Budget',
    suppliersDebt: 'Dettes Fournisseurs',
    unpaidWages: 'Salaires en attente',
    budgetWarning: 'Attention: Budget du chantier bientôt épuisé !',

    // Offline & Sync
    online: 'En ligne',
    offline: 'Hors ligne (Mode terrain - Données locales)',
    syncPending: 'Opérations en attente de synchronisation',
    allSynced: 'Toutes les données sont synchronisées',
    lastSync: 'Dernière synchro',

    // Workers & Attendance
    dailyWage: 'Journalier',
    monthlyWage: 'Mensuel',
    daysWorked: 'Jours travaillés',
    totalWages: 'Total dû',
    advances: 'Avances perçues',
    netSalary: 'Net à payer',
    paySaturday: 'Règlement du Samedi',
    advancePaid: 'Enregistrer avance',

    // Suppliers & Purchases
    supplierName: 'Nom Fournisseur',
    material: 'Matériau / Article',
    unitPrice: 'Prix Unitaire',
    quantity: 'Quantité',
    paid: 'Payé',
    remaining: 'Reste (Crédit)',
    paySupplier: 'Payer fournisseur',

    // Reports
    report1: 'Rapport Général de Chantier',
    report2: 'Rapport Journalier de Chantier',
    report3: 'Bon de Livraison / Reçu',
    report4: 'Facture Client / Décompte',
    report5: 'Relevé Fournisseur (Crédit)',
    report6: 'Devis Estimatif & Quantitatif',

    // AI Assistant
    aiAssistantTitle: 'Assistant XiilL BTP IA',
    aiAssistantDesc: 'Interrogez en Darija ou Français sur les coûts, stocks, présences et dettes du chantier.',
    aiQueryOnlyWarning: 'Sécurité: L’assistant répond en lecture seule sans modifier les données sans confirmation.',

    // Security & Pin
    pinRequired: 'Entrez le code PIN pour continuer',
    incorrectPin: 'Code PIN incorrect',
    changePin: 'Changer le code PIN',
    backupDatabase: 'Sauvegarder la base (JSON)',
    restoreDatabase: 'Restaurer une sauvegarde',
    trashRetentionNotice: 'Les éléments supprimés restent dans la corbeille pendant 7 jours.',
  }
};
