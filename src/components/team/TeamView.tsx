import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import { 
  UserCog, 
  Plus, 
  ShieldCheck, 
  Key, 
  Phone, 
  Building2, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';

export const TeamView: React.FC = () => {
  const { state, addUser, updateUser, accessibleProjects, t, currentUser } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: 'supervisor' as UserRole,
    pin: '1234',
    phone: '',
    email: '',
    assignedProjectIds: [] as string[],
    avatar: '👷'
  });

  const isOwner = currentUser.role === 'owner';

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        role: user.role,
        pin: user.pinCode || '1234',
        phone: user.phone || '',
        email: user.email || '',
        assignedProjectIds: user.assignedProjectIds || [],
        avatar: user.avatar || '👷'
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        role: 'supervisor',
        pin: '1234',
        phone: '',
        email: '',
        assignedProjectIds: [state.projects[0]?.id || ''],
        avatar: '👷'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.pin) return;

    if (editingUser) {
      updateUser(editingUser.id, formData);
    } else {
      addUser(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <UserCog className="w-6 h-6 text-amber-500" />
            <span>إدارة فريق العمل والمشرفين (Chefs de Chantier)</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            تحديد صلاحيات الوصول لكل مشرف، إدارة الرموز السرية PIN، وتعيين الأوراش
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-zinc-950" />
            <span>إضافة مشرف جديد</span>
          </button>
        )}
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.users.map((user) => {
          const userProjects = state.projects.filter(p => user.assignedProjectIds?.includes(p.id));

          return (
            <div
              key={user.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    user.role === 'owner'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {user.role === 'owner' ? 'مقاول رئيسي (Owner)' : 'مشرف ورش (Supervisor)'}
                  </span>

                  <span className="text-2xl">{user.avatar || '👷'}</span>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{user.name}</h3>

                <div className="space-y-1.5 text-xs text-zinc-400 mt-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                  <div className="flex justify-between">
                    <span>رمز الدخول (PIN):</span>
                    <span className="font-mono font-bold text-amber-400">•••• ({user.pinCode || '1234'})</span>
                  </div>

                  {user.phone && (
                    <div className="flex justify-between">
                      <span>الهاتف:</span>
                      <span className="font-mono text-zinc-200">{user.phone}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-800/60">
                    <span className="text-[11px] text-zinc-400 block mb-1">الأوراش المسموح بالوصول إليها:</span>
                    {user.role === 'owner' ? (
                      <span className="text-emerald-400 font-semibold text-[11px]">كافة الأوراش والمشاريع (وصول شامل)</span>
                    ) : userProjects.length > 0 ? (
                      <div className="space-y-1">
                        {userProjects.map(p => (
                          <div key={p.id} className="text-zinc-300 text-[11px] flex items-center gap-1 truncate">
                            <Building2 className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-[11px]">لم يتم تعيين أي ورش بعد</span>
                    )}
                  </div>
                </div>
              </div>

              {isOwner && (
                <div className="pt-3 mt-4 border-t border-zinc-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenModal(user)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    title="تعديل"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD / EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">
              {editingUser ? 'تعديل بيانات المشرف' : 'إضافة مشرف ورش جديد'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">اسم المشرف *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: يوسف العلمي (Chef de chantier)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">رمز الدخول PIN (4 أرقام) *</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500 font-mono tracking-widest text-center"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    placeholder="0661223344"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">الدور والصلاحيات *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="supervisor">مشرف ورش (Supervisor) — وصول للأوراش المحددة فقط</option>
                  <option value="owner">مقاول رئيسي (Owner) — صلاحيات كاملة</option>
                </select>
              </div>

              {formData.role === 'supervisor' && (
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">الأوراش المخصصة له</label>
                  <select
                    multiple
                    value={formData.assignedProjectIds}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, (option) => (option as HTMLOptionElement).value);
                      setFormData({ ...formData, assignedProjectIds: values });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-zinc-100 focus:outline-none focus:border-amber-500 h-24"
                  >
                    {state.projects.map(proj => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name} ({proj.locationCity})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-zinc-500">اضغط Ctrl لاختيار أكثر من ورش</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
