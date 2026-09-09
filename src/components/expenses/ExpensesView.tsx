import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import { ProjectContextBanner } from '../common/ProjectContextBanner';
import { 
  Receipt, 
  Plus, 
  Search, 
  Calendar, 
  Coins, 
  Trash2, 
  Building2,
  Tag,
  CreditCard,
  Edit3
} from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { 
    state, 
    accessibleProjects, 
    selectedProjectId, 
    addExpense, 
    updateExpense,
    deleteExpense, 
    t, 
    currentUser 
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const isAll = selectedProjectId === 'all';
  const currentProject = accessibleProjects.find(p => p.id === selectedProjectId);
  const defaultProjectId = !isAll ? selectedProjectId : (accessibleProjects[0]?.id || 'proj_1');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'وقود ونقل' as ExpenseCategory,
    amount: 500,
    projectId: defaultProjectId,
    paymentMethod: 'كاش (Espèces)' as PaymentMethod,
    recipientName: '',
    notes: ''
  });

  const filteredExpenses = state.expenses.filter(e => {
    const matchProject = isAll || e.projectId === selectedProjectId;
    const matchCategory = filterCategory === 'all' || e.category === filterCategory;
    const matchSearch = e.category.toLowerCase().includes(search.toLowerCase()) ||
                        (e.notes && e.notes.toLowerCase().includes(search.toLowerCase())) ||
                        (e.recipientName && e.recipientName.toLowerCase().includes(search.toLowerCase()));
    return matchProject && matchCategory && matchSearch;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const openCreateModal = () => {
    setEditingExpense(null);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      category: 'وقود ونقل',
      amount: 500,
      projectId: !isAll ? selectedProjectId : (accessibleProjects[0]?.id || 'proj_1'),
      paymentMethod: 'كاش (Espèces)',
      recipientName: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormData({
      date: exp.date,
      category: exp.category,
      amount: exp.amount,
      projectId: exp.projectId,
      paymentMethod: exp.paymentMethod,
      recipientName: exp.recipientName || '',
      notes: exp.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) return;

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        date: formData.date,
        category: formData.category,
        amount: formData.amount,
        projectId: formData.projectId,
        paymentMethod: formData.paymentMethod,
        recipientName: formData.recipientName,
        notes: formData.notes
      });
    } else {
      addExpense({
        date: formData.date,
        category: formData.category,
        amount: formData.amount,
        projectId: formData.projectId,
        paymentMethod: formData.paymentMethod,
        recipientName: formData.recipientName,
        notes: formData.notes
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Project Context Header */}
      {!isAll && (
        <ProjectContextBanner />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-500" />
            <span>
              {!isAll ? `مصاريف ونفقات ورش: ${currentProject?.name}` : 'المصاريف والنفقات العامة للورش'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            تتبع كراء المعدات، مازوت النقل، وجبات العمال، ورخص البناء
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-zinc-950" />
          <span>تسجيل مصروف جديد</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3 rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="البحث في المصاريف (مازوت، كراء، وجبات، اسم المستلم)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 py-2 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full sm:w-auto bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 py-2 px-3 focus:outline-none focus:border-amber-500"
        >
          <option value="all">جميع أصناف المصاريف</option>
          <option value="وقود ونقل">وقود ونقل</option>
          <option value="كراء آليات ومعدات">كراء آليات ومعدات</option>
          <option value="تغذية العمال ووجبات">تغذية العمال ووجبات</option>
          <option value="رخص وإجراءات إدارية">رخص وإجراءات إدارية</option>
          <option value="شراء أدوات صغيرة">شراء أدوات صغيرة</option>
          <option value="صيانة وإصلاحات">صيانة وإصلاحات</option>
          <option value="أخرى">أخرى</option>
        </select>

        <div className="text-right sm:text-left bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs shrink-0">
          <span className="text-zinc-400 ml-2">المجموع:</span>
          <span className="font-bold text-amber-400 font-mono text-sm">{(totalFilteredAmount ?? 0).toLocaleString()} {t.currency}</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
          <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="p-3.5 font-semibold">التاريخ والورش</th>
              <th className="p-3.5 font-semibold">صنف المصروف</th>
              <th className="p-3.5 font-semibold">المبلغ (MAD)</th>
              <th className="p-3.5 font-semibold">طريقة الأداء</th>
              <th className="p-3.5 font-semibold">المستلم / الملاحظات</th>
              <th className="p-3.5 font-semibold text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredExpenses.map((expense) => {
              const project = state.projects.find(p => p.id === expense.projectId);

              return (
                <tr key={expense.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="p-3.5">
                    <span className="font-mono text-zinc-300 block">{expense.date}</span>
                    <span className="text-[10px] text-amber-400">{project?.name || expense.projectId}</span>
                  </td>

                  <td className="p-3.5">
                    <span className="font-bold text-white block">{expense.category}</span>
                  </td>

                  <td className="p-3.5 font-mono font-bold text-amber-400 text-sm">
                    {(expense.amount ?? 0).toLocaleString()} د.م
                  </td>

                  <td className="p-3.5 text-zinc-300">
                    <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-[11px]">
                      {expense.paymentMethod}
                    </span>
                  </td>

                  <td className="p-3.5">
                    <span className="text-zinc-200 font-semibold block">{expense.recipientName || '-'}</span>
                    <span className="text-zinc-400 text-[11px]">{expense.notes || ''}</span>
                  </td>

                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEditModal(expense)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        title="تعديل المصروف"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف هذا المصروف بقيمة (${expense.amount} د.م)؟`)) {
                            deleteExpense(expense.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400"
                        title="حذف المصروف"
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

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12 p-6">
            <Receipt className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400 mb-3">لا توجد مصاريف مسجلة في هذا الورش</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
            >
              تسجيل أول مصروف
            </button>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-xs space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingExpense ? 'تعديل المصروف' : 'تسجيل مصروف ونفقات ورش جديد'}
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
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">تاريخ المصروف</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">صنف المصروف *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                  >
                    <option value="وقود ونقل">وقود ونقل (مازوت/طاكسي)</option>
                    <option value="كراء آليات ومعدات">كراء آليات ومعدات</option>
                    <option value="تغذية العمال ووجبات">تغذية العمال ووجبات</option>
                    <option value="رخص وإجراءات إدارية">رخص وإجراءات إدارية</option>
                    <option value="شراء أدوات صغيرة">شراء أدوات صغيرة</option>
                    <option value="صيانة وإصلاحات">صيانة وإصلاحات</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">المبلغ (MAD) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    step={10}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono text-base font-bold text-amber-400 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">طريقة الأداء</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                  >
                    <option value="كاش (Espèces)">كاش (Espèces)</option>
                    <option value="شيك بنكي (Chèque)">شيك بنكي (Chèque)</option>
                    <option value="تحويل بنكي (Virement)">تحويل بنكي (Virement)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">اسم المستلم أو السائق</label>
                  <input
                    type="text"
                    placeholder="مثال: سائق الطراكس / محطة أفريقيا"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  placeholder="تفاصيل المصروف..."
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
                  حفظ المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
