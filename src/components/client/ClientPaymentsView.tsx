import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClientPayment, PaymentMethod } from '../../types';
import { ProjectContextBanner } from '../common/ProjectContextBanner';
import { 
  DollarSign, 
  Plus, 
  Search, 
  Calendar, 
  FileText, 
  Trash2, 
  Edit3, 
  Phone, 
  MessageSquare, 
  Printer, 
  Building2, 
  CheckCircle2, 
  Clock,
  ArrowDownLeft,
  Percent
} from 'lucide-react';

export const ClientPaymentsView: React.FC<{ hideHeaderBanner?: boolean }> = ({ hideHeaderBanner = false }) => {
  const { 
    state, 
    accessibleProjects, 
    selectedProjectId, 
    addClientPayment, 
    updateClientPayment, 
    deleteClientPayment, 
    getProjectFinancials,
    t, 
    currentUser 
  } = useApp();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<ClientPayment | null>(null);
  const [printingPayment, setPrintingPayment] = useState<ClientPayment | null>(null);

  const isAll = selectedProjectId === 'all';
  const currentProject = accessibleProjects.find(p => p.id === selectedProjectId);
  const defaultProjectId = !isAll ? selectedProjectId : (accessibleProjects[0]?.id || 'proj_1');

  const [formData, setFormData] = useState({
    projectId: defaultProjectId,
    amount: 50000,
    date: new Date().toISOString().slice(0, 10),
    milestoneTitle: 'دفعة أشغال (Décompte)',
    paymentMethod: 'شيك (Chèque)' as PaymentMethod,
    receiptNumber: `REC-${Date.now().toString().slice(-4)}`,
    notes: ''
  });

  // Filtered payments
  const filteredPayments = state.clientPayments.filter(cp => {
    const matchProject = isAll || cp.projectId === selectedProjectId;
    const matchSearch = cp.milestoneTitle.toLowerCase().includes(search.toLowerCase()) ||
                        (cp.receiptNumber && cp.receiptNumber.toLowerCase().includes(search.toLowerCase())) ||
                        (cp.notes && cp.notes.toLowerCase().includes(search.toLowerCase()));
    return matchProject && matchSearch;
  });

  const totalReceived = filteredPayments.reduce((sum, cp) => sum + cp.amount, 0);

  // Milestone Presets
  const milestonePresets = [
    'دفعة تسبيق وتجهيز الورش (Avance de démarrage)',
    'دفعة الأساسات والأشغال الكبرى (Gros Œuvres)',
    'دفعة الأعمدة وسقف الطابق الأرضي (Dalle RDC)',
    'دفعة سقف الطابق الأول (Dalle 1er Étage)',
    'دفعة المرطوب والتقسيم (Maçonnerie & Enduit)',
    'دفعة الترصيص والكهرباء (Plomberie & Électricité)',
    'دفعة الفينيسيون والزليج والصباغة (Finition)',
    'الدفعة النهائية وتسليم المفاتيح (Solde final)'
  ];

  const openCreateModal = () => {
    setEditingPayment(null);
    setFormData({
      projectId: !isAll ? selectedProjectId : (accessibleProjects[0]?.id || 'proj_1'),
      amount: 50000,
      date: new Date().toISOString().slice(0, 10),
      milestoneTitle: milestonePresets[0],
      paymentMethod: 'شيك (Chèque)',
      receiptNumber: `REC-${new Date().getFullYear()}-${(filteredPayments.length + 1).toString().padStart(3, '0')}`,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cp: ClientPayment) => {
    setEditingPayment(cp);
    setFormData({
      projectId: cp.projectId,
      amount: cp.amount,
      date: cp.date,
      milestoneTitle: cp.milestoneTitle,
      paymentMethod: cp.paymentMethod,
      receiptNumber: cp.receiptNumber || '',
      notes: cp.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) return;

    if (editingPayment) {
      updateClientPayment(editingPayment.id, {
        projectId: formData.projectId,
        amount: formData.amount,
        date: formData.date,
        milestoneTitle: formData.milestoneTitle,
        paymentMethod: formData.paymentMethod,
        receiptNumber: formData.receiptNumber,
        notes: formData.notes
      });
    } else {
      addClientPayment({
        projectId: formData.projectId,
        amount: formData.amount,
        date: formData.date,
        milestoneTitle: formData.milestoneTitle,
        paymentMethod: formData.paymentMethod,
        receiptNumber: formData.receiptNumber,
        notes: formData.notes
      });
    }

    setIsModalOpen(false);
  };

  const sendReceiptWhatsApp = (cp: ClientPayment) => {
    const project = state.projects.find(p => p.id === cp.projectId);
    if (!project) return;

    const cleanPhone = project.clientPhone.replace(/[^0-9]/g, '');
    const moroccanPhone = cleanPhone.startsWith('0') ? `212${cleanPhone.slice(1)}` : cleanPhone;
    
    const fin = getProjectFinancials(project.id);
    const remaining = Math.max(0, (project?.budget ?? 0) - (fin?.clientReceived ?? 0));

    const message = 
      `*وصل استلام دفعة مالية — ${project?.name || ''}*\n` +
      `--------------------------------\n` +
      `👤 *السيد(ة):* ${project?.clientName || ''}\n` +
      `📅 *التاريخ:* ${cp.date}\n` +
      `🏷️ *البيان:* ${cp.milestoneTitle}\n` +
      `💰 *المبلغ المستلم:* ${(cp.amount ?? 0).toLocaleString()} درهم مغربي\n` +
      `💳 *طريقة الأداء:* ${cp.paymentMethod}\n` +
      (cp.receiptNumber ? `🔢 *رقم الوصل:* ${cp.receiptNumber}\n` : '') +
      `--------------------------------\n` +
      `📊 *إجمالي الميزانية:* ${(project?.budget ?? 0).toLocaleString()} د.م\n` +
      `✅ *المجموع المقبوض:* ${(fin?.clientReceived ?? 0).toLocaleString()} د.م\n` +
      `⏳ *المتبقي المستحق:* ${(remaining ?? 0).toLocaleString()} د.م\n` +
      `--------------------------------\n` +
      `نشكركم على ثقتكم في خدماتنا.`;

    window.open(`https://wa.me/${moroccanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const currentFin = currentProject ? getProjectFinancials(currentProject.id) : null;
  const projectRemaining = currentProject && currentFin ? Math.max(0, currentProject.budget - currentFin.clientReceived) : 0;
  const projectPaidPct = currentProject && currentFin && currentProject.budget > 0 ? (currentFin.clientReceived / currentProject.budget) * 100 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Project Context Header when viewing specific project and banner not hidden */}
      {!isAll && !hideHeaderBanner && (
        <ProjectContextBanner />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-amber-500" />
            <span>
              {!isAll ? `دفعات وفواتير الزبون (Décomptes): ${currentProject?.name}` : 'دفعات الزبناء وفواتير الأشغال (Décomptes)'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            تتبع أشطر ودفعات صاحب المشروع، إعداد الفواتير ووصولات الأداء
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-zinc-950" />
          <span>+ تسجيل دفعة زبون جديدة (Décompte)</span>
        </button>
      </div>

      {/* Financial KPIs for the Project */}
      {!isAll && currentProject && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>إجمالي ميزانية المشروع المتفق عليها</span>
              <Building2 className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-black text-white font-mono">{(currentProject?.budget ?? 0).toLocaleString()} {t.currency}</p>
            <p className="text-[11px] text-zinc-500 mt-1">الزبون: {currentProject?.clientName}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>مجموع الدفعات المقبوضة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-black text-emerald-400 font-mono">{(currentFin?.clientReceived ?? 0).toLocaleString()} {t.currency}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, projectPaidPct)}%` }} />
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">{projectPaidPct.toFixed(0)}%</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>المتبقي في ذمة الزبون</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl font-black text-amber-400 font-mono">{(projectRemaining ?? 0).toLocaleString()} {t.currency}</p>
            <p className="text-[11px] text-zinc-500 mt-1">يستحق عند اكتمال باقي الأشطر</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3 rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="البحث في الدفعات (دفعة الأساسات، رقم الوصل، الشيك...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 py-2 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="text-right sm:text-left bg-zinc-950/80 px-3.5 py-2 rounded-xl border border-zinc-800 text-xs shrink-0 flex items-center gap-2">
          <span className="text-zinc-400">إجمالي المقبوض:</span>
          <span className="font-bold text-emerald-400 font-mono text-sm">{(totalReceived ?? 0).toLocaleString()} {t.currency}</span>
        </div>
      </div>

      {/* Client Payments Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
          <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="p-3.5 font-semibold">التاريخ ورقم الوصل</th>
              <th className="p-3.5 font-semibold">المشروع / الزبون</th>
              <th className="p-3.5 font-semibold">عنوان الدفعة / الشطر</th>
              <th className="p-3.5 font-semibold">طريقة الأداء</th>
              <th className="p-3.5 font-semibold">المبلغ المستلم</th>
              <th className="p-3.5 font-semibold text-center">إجراءات ووصل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredPayments.map((payment) => {
              const project = state.projects.find(p => p.id === payment.projectId);

              return (
                <tr key={payment.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="p-3.5">
                    <span className="font-mono text-zinc-200 font-bold block">{payment.date}</span>
                    <span className="text-[10px] text-amber-400 font-mono">{payment.receiptNumber || 'بدون رقم'}</span>
                  </td>

                  <td className="p-3.5">
                    <span className="font-bold text-white block">{project?.name || payment.projectId}</span>
                    <span className="text-[11px] text-zinc-400">{project?.clientName}</span>
                  </td>

                  <td className="p-3.5">
                    <span className="font-semibold text-zinc-200 block">{payment.milestoneTitle}</span>
                    {payment.notes && (
                      <span className="text-[11px] text-zinc-500 block">{payment.notes}</span>
                    )}
                  </td>

                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 text-[11px]">
                      {payment.paymentMethod}
                    </span>
                  </td>

                  <td className="p-3.5 font-mono font-black text-emerald-400 text-base">
                    +{(payment.amount ?? 0).toLocaleString()} د.م
                  </td>

                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => sendReceiptWhatsApp(payment)}
                        className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/60"
                        title="إرسال وصل الأداء للزبون عبر واتساب"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setPrintingPayment(payment)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        title="طباعة وصل استلام الدفعة"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => openEditModal(payment)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        title="تعديل الدفعة"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف دفعة بقيمة (${payment.amount} د.م)؟`)) {
                            deleteClientPayment(payment.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400"
                        title="حذف الدفعة"
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

        {filteredPayments.length === 0 && (
          <div className="text-center py-12 p-6">
            <DollarSign className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400 mb-3">لا توجد دفعات زبون مسجلة في هذا الورش</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
            >
              تسجيل أول دفعة من الزبون
            </button>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Client Payment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-xs space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingPayment ? 'تعديل دفعة الزبون (Décompte)' : 'تسجيل دفعة زبون جديدة (Décompte)'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">الورش المعني *</label>
                  <select
                    required
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                  >
                    {accessibleProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">تاريخ الدفعة *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">المبلغ المقبوض (MAD) *</label>
                <input
                  type="number"
                  required
                  min={100}
                  step={500}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono text-lg font-bold text-emerald-400 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">بيان الدفعة / الشطر (Milestone) *</label>
                <input
                  type="text"
                  required
                  list="milestone-options"
                  placeholder="مثال: دفعة الأساسات والأعمدة..."
                  value={formData.milestoneTitle}
                  onChange={(e) => setFormData({ ...formData, milestoneTitle: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                />
                <datalist id="milestone-options">
                  {milestonePresets.map((m, idx) => (
                    <option key={idx} value={m} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">طريقة الأداء</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                  >
                    <option value="شيك (Chèque)">شيك (Chèque)</option>
                    <option value="تحويل بنكي (Virement)">تحويل بنكي (Virement)</option>
                    <option value="كاش (Espèces)">كاش (Espèces)</option>
                    <option value="كمبيالة (Traite)">كمبيالة (Traite)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">رقم الوصل / الشيك</label>
                  <input
                    type="text"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  placeholder="ملاحظات حول الدفعة أو الأشغال المنجزة..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  تأكيد وحفظ الدفعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {printingPayment && (
        <div className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-zinc-950 rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b pb-4 text-center">
              <div className="text-xl font-black uppercase tracking-wider text-amber-600">
                وصل استلام دفعة مالية
              </div>
              <div className="text-xs text-zinc-500 font-mono mt-1">
                REÇU DE PAIEMENT N° {printingPayment.receiptNumber || 'REC-001'}
              </div>
            </div>

            {/* Receipt Details */}
            {(() => {
              const project = state.projects.find(p => p.id === printingPayment.projectId);
              const fin = project ? getProjectFinancials(project.id) : null;
              const remaining = project && fin ? Math.max(0, project.budget - fin.clientReceived) : 0;

              return (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <div>
                      <span className="text-zinc-500 block">اسم الورش:</span>
                      <strong className="text-sm">{project?.name}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">الزبون / صاحب المشروع:</span>
                      <strong className="text-sm">{project?.clientName}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">تاريخ الدفعة:</span>
                      <strong className="font-mono">{printingPayment.date}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">طريقة الأداء:</span>
                      <strong>{printingPayment.paymentMethod}</strong>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                    <span className="text-zinc-600 block text-xs mb-1">المبلغ المستلم المقبوض:</span>
                    <span className="text-2xl font-black text-amber-700 font-mono">
                      {(printingPayment.amount ?? 0).toLocaleString()} درهم مغربي
                    </span>
                    <span className="block text-[11px] text-zinc-500 mt-1">({printingPayment.milestoneTitle})</span>
                  </div>

                  {project && fin && (
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] border-t pt-3">
                      <div>
                        <span className="text-zinc-400 block">الميزانية الإجمالية</span>
                        <strong>{(project.budget ?? 0).toLocaleString()} د.م</strong>
                      </div>
                      <div>
                        <span className="text-zinc-400 block">المجموع المقبوض</span>
                        <strong className="text-emerald-700">{(fin.clientReceived ?? 0).toLocaleString()} د.م</strong>
                      </div>
                      <div>
                        <span className="text-zinc-400 block">الباقي في الذمة</span>
                        <strong className="text-amber-700">{(remaining ?? 0).toLocaleString()} د.م</strong>
                      </div>
                    </div>
                  )}

                  <div className="pt-8 flex justify-between text-xs text-zinc-600">
                    <div className="text-center">
                      <p className="font-bold mb-8">توقيع وخاتم المقاولة</p>
                      <div className="border-t border-zinc-300 w-32 mx-auto"></div>
                    </div>
                    <div className="text-center">
                      <p className="font-bold mb-8">توقيع الزبون</p>
                      <div className="border-t border-zinc-300 w-32 mx-auto"></div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => setPrintingPayment(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 text-zinc-800 font-bold text-xs"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الوصل فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
