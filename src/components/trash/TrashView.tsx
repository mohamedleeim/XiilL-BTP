import React from 'react';
import { useApp } from '../../context/AppContext';
import { Trash2, RotateCcw, AlertTriangle, Building2, Users, Truck, Receipt } from 'lucide-react';

export const TrashView: React.FC = () => {
  const { state, restoreFromTrash, permanentlyDeleteFromTrash, t } = useApp();

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'project': return <Building2 className="w-4 h-4 text-blue-400" />;
      case 'worker': return <Users className="w-4 h-4 text-amber-400" />;
      case 'supplier': return <Truck className="w-4 h-4 text-emerald-400" />;
      case 'purchase': return <Receipt className="w-4 h-4 text-purple-400" />;
      case 'expense': return <Receipt className="w-4 h-4 text-rose-400" />;
      default: return <Trash2 className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'project': return 'ورش / مشروع';
      case 'worker': return 'عامل';
      case 'supplier': return 'مورد';
      case 'purchase': return 'مشتريات مواد';
      case 'expense': return 'مصروف';
      default: return type;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-amber-500" />
            <span>سلة المحذوفات وحماية البيانات (7 أيام استرجاع)</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            يتم الاحتفاظ بالعناصر المحذوفة لمدة 7 أيام قبل حذفها النهائي تلقائياً
          </p>
        </div>
      </div>

      {state.trashBin.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <Trash2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-300">سلة المحذوفات فارغة</h3>
          <p className="text-xs text-zinc-500 mt-1">لم يتم حذف أي عنصر مؤخراً في النظام</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">
              العناصر المحذوفة مؤقتاً ({state.trashBin.length})
            </span>
          </div>

          <div className="divide-y divide-zinc-800">
            {state.trashBin.map((item) => {
              const daysLeft = Math.max(0, Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

              return (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-850 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-zinc-800 border border-zinc-700">
                      {getEntityIcon(item.entityType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-400">
                          {getEntityTypeLabel(item.entityType)}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          حذف بتاريخ: {new Date(item.deletedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        {item.data.name || item.data.materialName || item.data.category || `معرف: ${item.originalId}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-end">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      متبقي {daysLeft} أيام
                    </span>

                    <button
                      onClick={() => restoreFromTrash(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>استرجاع</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع بعد هذه الخطوة.')) {
                          permanentlyDeleteFromTrash(item.id);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>حذف نهائي</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
