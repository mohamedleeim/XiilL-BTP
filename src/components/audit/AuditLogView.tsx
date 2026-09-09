import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { History, Search, ShieldCheck, User, Clock, Building2 } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { state, t } = useApp();
  const [search, setSearch] = useState('');

  const filteredLogs = state.activityLogs.filter(l => 
    l.details.toLowerCase().includes(search.toLowerCase()) ||
    l.userName.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-amber-500" />
            <span>سجل العمليات والتدقيق الأمني للورش (Journal d'audit)</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            سجل غير قابل للتعديل يوثق كافة الأنشطة، التعديلات، وحركات الرواتب والمشتريات
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
        <Search className="w-4 h-4 text-zinc-400 absolute right-6 rtl:right-6 ltr:left-6 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="البحث في العمليات أو اسم المشرف أو نوع الحركة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 py-2 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="divide-y divide-zinc-800">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-zinc-850 transition-colors flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-white">{log.userName}</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                      {log.action}
                    </span>
                    {log.projectId && (
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-zinc-500" />
                        <span>معرف الورش: {log.projectId}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 font-medium">{log.details}</p>
                </div>
              </div>

              <div className="text-left rtl:text-left ltr:text-right shrink-0">
                <span className="text-[11px] text-zinc-400 font-mono block">
                  {new Date(log.timestamp).toLocaleDateString()}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono block">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
