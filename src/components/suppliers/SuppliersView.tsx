import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Supplier, Purchase, SupplierPayment, SupplierCategory, MaterialUnit, PaymentMethod } from '../../types';
import { ProjectContextBanner } from '../common/ProjectContextBanner';
import { 
  Truck, 
  Plus, 
  Search, 
  Coins, 
  Phone, 
  Building2, 
  FileText, 
  TrendingUp, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Receipt,
  Layers,
  ArrowUpRight,
  TrendingDown,
  DollarSign
} from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const { 
    state, 
    accessibleProjects, 
    selectedProjectId, 
    setSelectedProjectId,
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
    t, 
    currentUser 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers' | 'price_history'>('purchases');
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');

  // Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);

  const isAll = selectedProjectId === 'all';
  const currentProject = accessibleProjects.find(p => p.id === selectedProjectId);
  const defaultProjectId = !isAll ? selectedProjectId : (accessibleProjects[0]?.id || 'proj_1');

  // Forms
  const [purchaseForm, setPurchaseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    supplierId: '',
    projectId: defaultProjectId,
    materialName: '',
    quantity: 10,
    unit: 'كيس (Sac)' as MaterialUnit,
    unitPrice: 85,
    paidAmount: 0,
    invoiceNumber: '',
    notes: ''
  });

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    category: 'إسمنت ورمل وقرمود' as SupplierCategory,
    phone: '',
    city: 'الدار البيضاء',
    address: '',
    iceNumber: '',
    initialDebt: 0,
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 5000,
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'كاش (Espèces)' as PaymentMethod,
    referenceNumber: '',
    notes: ''
  });

  // Purchases list filtered
  const filteredPurchases = state.purchases.filter(p => {
    const matchProject = isAll || p.projectId === selectedProjectId;
    const matchSupplier = filterSupplier === 'all' || p.supplierId === filterSupplier;
    const matchSearch = p.materialName.toLowerCase().includes(search.toLowerCase()) || 
                        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(search.toLowerCase()));
    return matchProject && matchSupplier && matchSearch;
  });

  // Calculate purchase total
  const calculatedTotal = purchaseForm.quantity * purchaseForm.unitPrice;
  const remainingDebt = Math.max(0, calculatedTotal - purchaseForm.paidAmount);

  const openCreatePurchaseModal = () => {
    setEditingPurchase(null);
    setPurchaseForm({
      date: new Date().toISOString().slice(0, 10),
      supplierId: state.suppliers[0]?.id || '',
      projectId: !isAll ? selectedProjectId : (accessibleProjects[0]?.id || 'proj_1'),
      materialName: '',
      quantity: 10,
      unit: 'كيس (Sac)',
      unitPrice: 85,
      paidAmount: 0,
      invoiceNumber: '',
      notes: ''
    });
    setIsPurchaseModalOpen(true);
  };

  const openEditPurchaseModal = (p: Purchase) => {
    setEditingPurchase(p);
    setPurchaseForm({
      date: p.date,
      supplierId: p.supplierId,
      projectId: p.projectId,
      materialName: p.materialName,
      quantity: p.quantity,
      unit: p.unit,
      unitPrice: p.unitPrice,
      paidAmount: p.paidAmount,
      invoiceNumber: p.invoiceNumber || '',
      notes: p.notes || ''
    });
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.materialName || !purchaseForm.supplierId) return;

    if (editingPurchase) {
      updatePurchase(editingPurchase.id, {
        date: purchaseForm.date,
        supplierId: purchaseForm.supplierId,
        projectId: purchaseForm.projectId,
        materialName: purchaseForm.materialName,
        quantity: purchaseForm.quantity,
        unit: purchaseForm.unit,
        unitPrice: purchaseForm.unitPrice,
        totalAmount: calculatedTotal,
        paidAmount: purchaseForm.paidAmount,
        remainingDebt: remainingDebt,
        invoiceNumber: purchaseForm.invoiceNumber,
        notes: purchaseForm.notes
      });
    } else {
      addPurchase({
        date: purchaseForm.date,
        supplierId: purchaseForm.supplierId,
        projectId: purchaseForm.projectId,
        materialName: purchaseForm.materialName,
        quantity: purchaseForm.quantity,
        unit: purchaseForm.unit,
        unitPrice: purchaseForm.unitPrice,
        totalAmount: calculatedTotal,
        paidAmount: purchaseForm.paidAmount,
        remainingDebt: remainingDebt,
        invoiceNumber: purchaseForm.invoiceNumber,
        notes: purchaseForm.notes
      });
    }

    setIsPurchaseModalOpen(false);
  };

  const openCreateSupplierModal = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      category: 'إسمنت ورمل وقرمود',
      phone: '',
      city: 'الدار البيضاء',
      address: '',
      iceNumber: '',
      initialDebt: 0,
      notes: ''
    });
    setIsSupplierModalOpen(true);
  };

  const openEditSupplierModal = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name,
      category: s.category,
      phone: s.phone || '',
      city: s.city || 'الدار البيضاء',
      address: s.address || '',
      iceNumber: s.iceNumber || '',
      initialDebt: s.initialDebt || 0,
      notes: s.notes || ''
    });
    setIsSupplierModalOpen(true);
  };

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name) return;

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, supplierForm);
    } else {
      addSupplier(supplierForm);
    }

    setIsSupplierModalOpen(false);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPayment || paymentForm.amount <= 0) return;

    recordSupplierPayment({
      supplierId: selectedSupplierForPayment.id,
      projectId: !isAll ? selectedProjectId : undefined,
      amount: paymentForm.amount,
      date: paymentForm.date,
      paymentMethod: paymentForm.paymentMethod,
      referenceNumber: paymentForm.referenceNumber,
      notes: paymentForm.notes
    });

    setIsPaymentModalOpen(false);
  };

  const openWhatsAppSupplier = (phone: string, supplierName: string, balance?: number) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const moroccanPhone = cleanPhone.startsWith('0') ? `212${cleanPhone.slice(1)}` : cleanPhone;
    const msg = encodeURIComponent(
      balance !== undefined 
        ? `السلام عليكم ${supplierName}، بخصوص كشف حساب السلعة ومستحقات الورش — الباقي المسجل: ${(balance ?? 0).toLocaleString()} د.م`
        : `السلام عليكم ${supplierName}، بخصوص طلبية سلعة جديدة للورش`
    );
    window.open(`https://wa.me/${moroccanPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Project Context Header when viewing specific project */}
      {!isAll && (
        <ProjectContextBanner />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-500" />
            <span>
              {!isAll ? `سلعة ومشتريات ورش: ${currentProject?.name}` : 'الموردين، بونات السلعة والكريدي'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            {!isAll
              ? `إدارة وصولات التسليم (Bon de Livraison) وتكلفة مواد هذا الورش.`
              : 'متابعة بونات الإسمنت والحديد، كشوفات حساب الموردين والديون المتبقية'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={openCreateSupplierModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>إضافة مورد (Fournisseur)</span>
          </button>

          <button
            onClick={openCreatePurchaseModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md"
          >
            <Plus className="w-4 h-4 text-zinc-950" />
            <span>تسجيل بون سلعة جديد (Bon)</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'purchases'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>بونات السلعة والمشتريات ({filteredPurchases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'suppliers'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>الموردون وكشف الحساب والديون ({state.suppliers.length})</span>
        </button>
      </div>

      {/* ======================= TAB 1: PURCHASES (بونات السلعة) ======================= */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3 rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="البحث باسم المادة (إسمنت، حديد 12، رملة...) أو رقم البون..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-200 py-2 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 focus:border-amber-500"
              />
            </div>

            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full sm:w-auto bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-200 py-2 px-3 focus:border-amber-500"
            >
              <option value="all">جميع الموردين</option>
              {state.suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Purchases Grid / Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="p-3.5 font-semibold">التاريخ والورش</th>
                  <th className="p-3.5 font-semibold">المادة والكمية</th>
                  <th className="p-3.5 font-semibold">المورد</th>
                  <th className="p-3.5 font-semibold">المجموع (MAD)</th>
                  <th className="p-3.5 font-semibold">المؤدى / الكريدي</th>
                  <th className="p-3.5 font-semibold">رقم البون</th>
                  <th className="p-3.5 font-semibold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredPurchases.map((purchase) => {
                  const supplier = state.suppliers.find(s => s.id === purchase.supplierId);
                  const project = state.projects.find(p => p.id === purchase.projectId);

                  return (
                    <tr key={purchase.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-3.5">
                        <span className="font-mono text-zinc-300 block">{purchase.date}</span>
                        <span className="text-[10px] text-amber-400">{project?.name || purchase.projectId}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-white block">{purchase.materialName}</span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {purchase.quantity} {purchase.unit} × {purchase.unitPrice} د.م
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-zinc-200">
                        {supplier?.name || purchase.supplierId}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-amber-400 text-sm">
                        {(purchase.totalAmount ?? 0).toLocaleString()} د.م
                      </td>

                      <td className="p-3.5">
                        <span className="text-emerald-400 font-mono block">مؤدى: {(purchase.paidAmount ?? 0).toLocaleString()} د.م</span>
                        {purchase.remainingDebt > 0 ? (
                          <span className="text-red-400 font-mono text-[11px]">كريدي: {(purchase.remainingDebt ?? 0).toLocaleString()} د.م</span>
                        ) : (
                          <span className="text-zinc-500 text-[10px]">خالص بالكامل</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-zinc-400">
                        {purchase.invoiceNumber || '-'}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditPurchaseModal(purchase)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                            title="تعديل البون"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف بون السلعة (${purchase.materialName})؟`)) {
                                deletePurchase(purchase.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400"
                            title="حذف البون"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPurchases.length === 0 && (
              <div className="text-center py-12 p-6">
                <Truck className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 mb-3">لا توجد بونات سلعة مسجلة في هذا الورش</p>
                <button
                  onClick={openCreatePurchaseModal}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
                >
                  تسجيل أول بون مشتريات
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 2: SUPPLIERS & DEBTS ======================= */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.suppliers.map((supplier) => {
            const bal = getSupplierBalance(supplier.id);

            return (
              <div key={supplier.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {supplier.category}
                    </span>
                    <span className="text-xs text-zinc-400">{supplier.city}</span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">{supplier.name}</h3>

                  {/* Financial Balance Card */}
                  <div className="bg-zinc-950/70 rounded-2xl p-3 border border-zinc-800 text-xs space-y-1.5 mb-3">
                    <div className="flex justify-between text-zinc-400">
                      <span>إجمالي المشتريات:</span>
                      <span className="font-mono text-zinc-200 font-bold">{(bal?.totalPurchases ?? 0).toLocaleString()} د.م</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>المؤدى له:</span>
                      <span className="font-mono font-bold">{(bal?.totalPaid ?? 0).toLocaleString()} د.م</span>
                    </div>
                    <div className="pt-1.5 border-t border-zinc-800 flex justify-between font-extrabold text-sm">
                      <span className="text-zinc-300">الكريدي المتبقي:</span>
                      <span className={`font-mono ${(bal?.currentDebt ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {(bal?.currentDebt ?? 0).toLocaleString()} د.م
                      </span>
                    </div>
                  </div>

                  {supplier.phone && (
                    <div className="flex items-center justify-between text-xs text-zinc-400 mb-3 px-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{supplier.phone}</span>
                      </span>
                      <button
                        onClick={() => openWhatsAppSupplier(supplier.phone, supplier.name, bal.currentDebt)}
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>كشف حساب واتساب</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedSupplierForPayment(supplier);
                      setPaymentForm({
                        amount: bal.currentDebt > 0 ? bal.currentDebt : 2000,
                        date: new Date().toISOString().slice(0, 10),
                        paymentMethod: 'كاش (Espèces)',
                        referenceNumber: '',
                        notes: ''
                      });
                      setIsPaymentModalOpen(true);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-sm transition-colors"
                  >
                    + أداء دفعة للمورد 💵
                  </button>

                  <button
                    onClick={() => openEditSupplierModal(supplier)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    title="تعديل بيانات المورد"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف المورد (${supplier.name})؟`)) {
                        deleteSupplier(supplier.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400"
                    title="حذف المورد"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================= MODAL: CREATE / EDIT PURCHASE ======================= */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-xs space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              {editingPurchase ? 'تعديل بون مشتريات المواد' : 'تسجيل بون مشتريات سلعة جديد'}
            </h3>

            <form onSubmit={handlePurchaseSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">المورد (Fournisseur) *</label>
                  <select
                    required
                    value={purchaseForm.supplierId}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                  >
                    <option value="">اختر المورد...</option>
                    {state.suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">الورش المخصص *</label>
                  <select
                    required
                    value={purchaseForm.projectId}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, projectId: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                  >
                    {accessibleProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">اسم المادة / السلعة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إسمنت CPJ 45، حديد 12mm، رملة واد لاو..."
                  value={purchaseForm.materialName}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, materialName: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">الكمية *</label>
                  <input
                    type="number"
                    required
                    min={0.1}
                    step={0.1}
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">الوحدة</label>
                  <select
                    value={purchaseForm.unit}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, unit: e.target.value as MaterialUnit })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                  >
                    <option value="كيس (Sac)">كيس (Sac)</option>
                    <option value="طن (Tonne)">طن (Tonne)</option>
                    <option value="متر مكعب (m³)">متر مكعب (m³)</option>
                    <option value="متر مربع (m²)">متر مربع (m²)</option>
                    <option value="قطعة (Pièce)">قطعة (Pièce)</option>
                    <option value="شاحنة (Camion)">شاحنة (Camion)</option>
                    <option value="كيلوغرام (Kg)">كيلوغرام (Kg)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">سعر الوحدة (MAD)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    step={0.5}
                    value={purchaseForm.unitPrice}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, unitPrice: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Live Totals Bar */}
              <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-400 block text-[10px]">المبلغ الإجمالي للبون:</span>
                  <span className="text-base font-black text-amber-400 font-mono">{calculatedTotal.toLocaleString()} د.م</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">الباقي كريدي على الورش:</span>
                  <span className="text-base font-black text-red-400 font-mono">{remainingDebt.toLocaleString()} د.م</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">المبلغ المؤدى نقداً / شيك</label>
                  <input
                    type="number"
                    min={0}
                    value={purchaseForm.paidAmount}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paidAmount: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono text-emerald-400 font-bold focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">رقم وصل التسليم (N° Bon)</label>
                  <input
                    type="text"
                    placeholder="BL-2025-089"
                    value={purchaseForm.invoiceNumber}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  حفظ بون المشتريات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: CREATE / EDIT SUPPLIER ======================= */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-xs space-y-3">
            <h3 className="text-base font-bold text-white">
              {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد (Fournisseur)'}
            </h3>

            <form onSubmit={handleSupplierSubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">اسم المورد / الشركة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مواد البناء الأندلس — دريس"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">صنف المواد</label>
                  <select
                    value={supplierForm.category}
                    onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value as SupplierCategory })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                  >
                    <option value="إسمنت ورمل وقرمود">إسمنت ورمل وقرمود</option>
                    <option value="حديد وتسليح">حديد وتسليح</option>
                    <option value="خشب ونجارة قالوب">خشب ونجارة قالوب</option>
                    <option value="كهرباء وإضاءة">كهرباء وإضاءة</option>
                    <option value="ترصيص صحي وقنوات">ترصيص صحي وقنوات</option>
                    <option value="صباغة وجبس">صباغة وجبس</option>
                    <option value="زليج وسيراميك">زليج وسيراميك</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">الهاتف *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0661234567"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">المدينة</label>
                  <input
                    type="text"
                    value={supplierForm.city}
                    onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">الرصيد السابق / كريدي قديم</label>
                  <input
                    type="number"
                    min={0}
                    value={supplierForm.initialDebt}
                    onChange={(e) => setSupplierForm({ ...supplierForm, initialDebt: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  حفظ المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: RECORD SUPPLIER PAYMENT ======================= */}
      {isPaymentModalOpen && selectedSupplierForPayment && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-xs space-y-3">
            <h3 className="text-base font-bold text-white">
              أداء دفعة للمورد: {selectedSupplierForPayment.name}
            </h3>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">المبلغ المؤدى (MAD) *</label>
                <input
                  type="number"
                  required
                  min={50}
                  step={100}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono text-base font-bold text-emerald-400 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">طريقة الأداء</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                  >
                    <option value="كاش (Espèces)">كاش (Espèces)</option>
                    <option value="شيك بنكي (Chèque)">شيك بنكي (Chèque)</option>
                    <option value="تحويل بنكي (Virement)">تحويل بنكي (Virement)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">تاريخ الدفعة</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">رقم الشيك أو الحوالة</label>
                <input
                  type="text"
                  placeholder="CHQ-984729"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  تأكيد الدفعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
