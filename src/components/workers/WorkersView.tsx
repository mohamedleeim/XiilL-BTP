import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Worker, AttendanceStatus, WorkerSpecialty, WorkerWageType, WageAdvance, WagePayment } from '../../types';
import { ProjectContextBanner } from '../common/ProjectContextBanner';
import { 
  Users, 
  CalendarCheck2, 
  Coins, 
  Plus, 
  Search, 
  Check, 
  X, 
  Clock, 
  Edit3, 
  Trash2, 
  Phone, 
  CreditCard, 
  MessageSquare, 
  CheckCircle2, 
  Calendar, 
  AlertCircle, 
  FileSpreadsheet,
  UserPlus,
  UserMinus,
  Building2,
  Share2,
  DollarSign,
  Printer
} from 'lucide-react';

export const WorkersView: React.FC<{ initialTab?: 'attendance' | 'payroll' | 'workers' | 'advances' }> = ({ initialTab = 'attendance' }) => {
  const { 
    state, 
    accessibleProjects, 
    selectedProjectId, 
    setSelectedProjectId,
    saveDailyAttendance, 
    addWorker, 
    updateWorker, 
    deleteWorker, 
    assignWorkerToProject,
    removeWorkerFromProject,
    addWageAdvance,
    updateWageAdvance,
    deleteWageAdvance, 
    settleWeeklyWages,
    updateWagePayment,
    deleteWagePayment,
    getWeeklyWorkersSummary,
    t,
    currentUser 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'payroll' | 'workers' | 'advances'>(initialTab);

  // Selected date for daily attendance
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [attendanceEntries, setAttendanceEntries] = useState<Record<string, { status: AttendanceStatus; overtimeHours: number; notes: string }>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Filter & Search
  const [search, setSearch] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');

  // Modals
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<WageAdvance | null>(null);
  const [selectedWorkerForAdvance, setSelectedWorkerForAdvance] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<number>(200);
  const [advanceNotes, setAdvanceNotes] = useState<string>('');
  const [isAssignExistingModalOpen, setIsAssignExistingModalOpen] = useState(false);

  // Worker Form State
  const [workerFormData, setWorkerFormData] = useState({
    name: '',
    specialty: 'بناء' as WorkerSpecialty,
    wageType: 'daily' as WorkerWageType,
    wageAmount: 220,
    phone: '',
    cin: '',
    projectIds: [] as string[],
    active: true,
    notes: ''
  });

  const isAll = selectedProjectId === 'all';
  const currentProject = accessibleProjects.find(p => p.id === selectedProjectId);
  const targetProjectId = !isAll ? selectedProjectId : (accessibleProjects[0]?.id || 'proj_1');

  // Filter workers assigned to the active project (or all if isAll)
  const filteredWorkers = useMemo(() => {
    return state.workers.filter(w => {
      const matchProject = isAll || w.projectIds.includes(selectedProjectId);
      const matchSearch = w.name.toLowerCase().includes(search.toLowerCase()) || 
                          (w.cin && w.cin.toLowerCase().includes(search.toLowerCase())) ||
                          (w.phone && w.phone.includes(search));
      const matchSpec = filterSpecialty === 'all' || w.specialty === filterSpecialty;
      return matchProject && matchSearch && matchSpec;
    });
  }, [state.workers, selectedProjectId, isAll, search, filterSpecialty]);

  // Unassigned workers that can be added to this project
  const unassignedWorkers = useMemo(() => {
    if (isAll) return [];
    return state.workers.filter(w => !w.projectIds.includes(selectedProjectId));
  }, [state.workers, selectedProjectId, isAll]);

  // Load existing attendance for selected date
  React.useEffect(() => {
    const existing = state.attendance.filter(a => a.date === selectedDate && (isAll ? true : a.projectId === targetProjectId));
    const map: Record<string, { status: AttendanceStatus; overtimeHours: number; notes: string }> = {};

    filteredWorkers.forEach(w => {
      const rec = existing.find(a => a.workerId === w.id);
      if (rec) {
        map[w.id] = { status: rec.status, overtimeHours: rec.overtimeHours || 0, notes: rec.notes || '' };
      } else {
        map[w.id] = { status: 'present', overtimeHours: 0, notes: '' };
      }
    });

    setAttendanceEntries(map);
  }, [selectedDate, targetProjectId, isAll, filteredWorkers, state.attendance]);

  // Handle Attendance Save
  const handleSaveAttendance = () => {
    const entries = Object.entries(attendanceEntries).map(([workerId, val]: [string, { status: AttendanceStatus; overtimeHours: number; notes: string }]) => ({
      workerId,
      status: val.status,
      overtimeHours: val.overtimeHours,
      notes: val.notes
    }));

    saveDailyAttendance(selectedDate, targetProjectId, entries);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Mark all present in 1 tap
  const handleMarkAllPresent = () => {
    const updated = { ...attendanceEntries };
    filteredWorkers.forEach(w => {
      updated[w.id] = { ...(updated[w.id] || { overtimeHours: 0, notes: '' }), status: 'present' };
    });
    setAttendanceEntries(updated);
  };

  // Weekly Date Range calculation (e.g. current week Monday to Saturday)
  const getWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    return {
      mondayStr: monday.toISOString().slice(0, 10),
      saturdayStr: saturday.toISOString().slice(0, 10)
    };
  };

  const { mondayStr, saturdayStr } = getWeekDates();
  const weeklySummary = useMemo(() => {
    return getWeeklyWorkersSummary(selectedProjectId, mondayStr, saturdayStr);
  }, [getWeeklyWorkersSummary, selectedProjectId, mondayStr, saturdayStr, state.attendance, state.wageAdvances, state.wagePayments]);

  const openCreateWorkerModal = () => {
    setEditingWorker(null);
    setWorkerFormData({
      name: '',
      specialty: 'بناء',
      wageType: 'daily',
      wageAmount: 220,
      phone: '',
      cin: '',
      projectIds: !isAll ? [selectedProjectId] : (accessibleProjects[0] ? [accessibleProjects[0].id] : []),
      active: true,
      notes: ''
    });
    setIsWorkerModalOpen(true);
  };

  const openEditWorkerModal = (w: Worker) => {
    setEditingWorker(w);
    setWorkerFormData({
      name: w.name,
      specialty: w.specialty,
      wageType: w.wageType,
      wageAmount: w.wageAmount,
      phone: w.phone || '',
      cin: w.cin || '',
      projectIds: w.projectIds,
      active: w.active,
      notes: w.notes || ''
    });
    setIsWorkerModalOpen(true);
  };

  const handleWorkerFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerFormData.name) return;

    if (editingWorker) {
      updateWorker(editingWorker.id, workerFormData);
    } else {
      addWorker(workerFormData);
    }
    setIsWorkerModalOpen(false);
  };

  const openAddAdvanceModal = (workerId?: string) => {
    setEditingAdvance(null);
    setSelectedWorkerForAdvance(workerId || (filteredWorkers[0]?.id || ''));
    setAdvanceAmount(200);
    setAdvanceNotes('');
    setIsAdvanceModalOpen(true);
  };

  const handleAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerForAdvance || advanceAmount <= 0) return;

    if (editingAdvance) {
      updateWageAdvance(editingAdvance.id, {
        amount: advanceAmount,
        notes: advanceNotes
      });
    } else {
      addWageAdvance(selectedWorkerForAdvance, targetProjectId, advanceAmount, advanceNotes);
    }
    setIsAdvanceModalOpen(false);
  };

  // Filtered advances for project or all
  const filteredAdvances = state.wageAdvances.filter(a => 
    isAll || a.projectId === selectedProjectId
  );

  // Filtered wage settlements for project or all
  const filteredPayments = state.wagePayments.filter(p => 
    isAll || p.projectId === selectedProjectId
  );

  const openWhatsAppReceipt = (workerName: string, phone: string, amount: number, period: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const moroccanPhone = cleanPhone.startsWith('0') ? `212${cleanPhone.slice(1)}` : cleanPhone;
    const msg = encodeURIComponent(`وصل أداء خلاص السيمانة — منظومة XiilL BTP\nالعامل: ${workerName}\nالفترة: ${period}\nالصافي المستلم: ${amount} درهم مغربي.\nشكراً لجهودكم!`);
    window.open(`https://wa.me/${moroccanPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Project Context Header when viewing specific project */}
      {!isAll && (
        <ProjectContextBanner />
      )}

      {/* Top Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            <span>
              {!isAll ? `عمال وحضور ورش: ${currentProject?.name}` : 'إدارة اليد العاملة والـ Pointage'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            {!isAll 
              ? `تسجيل حضور عمال هذا الورش (${filteredWorkers.length} عامل)، التسبيقات، وتصفية خلاص السبت.`
              : 'تسجيل الحضور اليومي، أجور المعلمين، التسبيقات، وتسوية حساب السبت لجميع الأوراش'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isAll && unassignedWorkers.length > 0 && (
            <button
              onClick={() => setIsAssignExistingModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>إلحاق عامل للورش ({unassignedWorkers.length})</span>
            </button>
          )}

          <button
            onClick={openCreateWorkerModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4 text-zinc-950" />
            <span>إضافة عامل جديد</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Pill Selector */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'attendance'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <CalendarCheck2 className="w-4 h-4" />
          <span>Pointage اليومي (الحضور)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('payroll')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'payroll'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>خلاص السيمانة (تسوية السبت)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('advances')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'advances'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>التسبيقات (Les Avances) ({filteredAdvances.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('workers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'workers'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>لائحة العمال ({filteredWorkers.length})</span>
        </button>
      </div>

      {/* ======================= TAB 1: DAILY ATTENDANCE (POINTAGE) ======================= */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-4">
          {/* Controls: Date Picker, Quick 1-tap All Present, Save Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-3xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-zinc-400">تاريخ الـ Pointage:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs text-white font-mono focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={handleMarkAllPresent}
                className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors"
              >
                ✓ تحديد الكل حاضر
              </button>
            </div>

            <div className="flex items-center gap-2">
              {savedSuccess && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ الحضور بنجاح!</span>
                </span>
              )}

              <button
                onClick={handleSaveAttendance}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 text-zinc-950" />
                <span>حفظ الـ Pointage لتاريخ {selectedDate}</span>
              </button>
            </div>
          </div>

          {/* Attendance Workers List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-semibold">
              <span>العامل والمهنة</span>
              <span>حالة الحضور والساعات الإضافية</span>
            </div>

            <div className="divide-y divide-zinc-800/60">
              {filteredWorkers.map((worker) => {
                const currentStatus = attendanceEntries[worker.id]?.status || 'present';
                const currentOvertime = attendanceEntries[worker.id]?.overtimeHours || 0;
                const currentNotes = attendanceEntries[worker.id]?.notes || '';

                return (
                  <div key={worker.id} className="p-3.5 sm:p-4 hover:bg-zinc-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Worker Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-bold text-sm text-amber-400 shrink-0">
                        {worker.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{worker.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                            {worker.specialty}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                          <span className="font-mono">{worker.wageAmount} د.م/{worker.wageType === 'daily' ? 'اليوم' : 'الشهر'}</span>
                          {worker.phone && <span className="font-mono text-zinc-500">• {worker.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Pointage Controls */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Status Buttons: Present, Half Day, Absent */}
                      <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setAttendanceEntries({
                            ...attendanceEntries,
                            [worker.id]: { ...attendanceEntries[worker.id], status: 'present' }
                          })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'present'
                              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          حاضر (1.0)
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttendanceEntries({
                            ...attendanceEntries,
                            [worker.id]: { ...attendanceEntries[worker.id], status: 'half_day' }
                          })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'half_day'
                              ? 'bg-amber-500 text-zinc-950 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          نصف يوم (0.5)
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttendanceEntries({
                            ...attendanceEntries,
                            [worker.id]: { ...attendanceEntries[worker.id], status: 'absent' }
                          })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'absent'
                              ? 'bg-red-500 text-white shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          غائب (0)
                        </button>
                      </div>

                      {/* Overtime input */}
                      <div className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1.5 rounded-xl border border-zinc-800 text-xs">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-zinc-400 text-[11px]">ساعات إضافية:</span>
                        <input
                          type="number"
                          min={0}
                          max={12}
                          value={currentOvertime}
                          onChange={(e) => setAttendanceEntries({
                            ...attendanceEntries,
                            [worker.id]: { ...attendanceEntries[worker.id], overtimeHours: Number(e.target.value) }
                          })}
                          className="w-10 bg-zinc-900 rounded px-1.5 py-0.5 text-center text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Quick Advance Button */}
                      <button
                        onClick={() => openAddAdvanceModal(worker.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-semibold border border-zinc-700/80 transition-colors"
                        title="تسجيل تسبيق (أفونس) لهذا العامل"
                      >
                        + تسبيق
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {filteredWorkers.length === 0 && (
              <div className="text-center py-12 p-6">
                <Users className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 mb-3">لا يوجد عمال مسجلون في هذا الورش بعد</p>
                <button
                  onClick={openCreateWorkerModal}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
                >
                  إضافة أول عامل للورش
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 2: WEEKLY PAYROLL (خلاص السيمانة) ======================= */}
      {activeSubTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1 inline-block">
                خلاص السيمانة (حساب السبت المغربي)
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                تصفية وتسوية أجور الأسبوع ({mondayStr} إلى {saturdayStr})
              </h2>
              <p className="text-xs text-zinc-400">
                حساب الأيام الفعلية + الساعات الإضافية - خصم التسبيقات المسجلة = الصافي المؤدى
              </p>
            </div>

            <div className="text-left bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800 text-xs">
              <span className="text-zinc-400 block text-[10px]">مجموع الأجور الصافية للأسبوع:</span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                {(weeklySummary.reduce((sum, w) => sum + (w.netPayable || 0), 0)).toLocaleString()} د.م
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weeklySummary.map((item) => {
              const isSettled = item.isSettled;

              return (
                <div key={item.worker.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <span>{item.worker.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-normal">
                            {item.worker.specialty}
                          </span>
                        </h3>
                        <p className="text-xs text-zinc-400 font-mono">الأجر اليومي: {item.worker.wageAmount} د.م</p>
                      </div>

                      <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                        isSettled
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        {isSettled ? '✓ تم الخلاص' : 'غير مسوى'}
                      </span>
                    </div>

                    {/* Breakdown Box */}
                    <div className="bg-zinc-950/70 rounded-2xl p-3 border border-zinc-800 text-xs space-y-2 mb-4">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span>أيام العمل الفعلية:</span>
                        <span className="font-bold text-white font-mono">{item.daysWorked} أيام ({(item.grossWage ?? 0).toLocaleString()} د.م)</span>
                      </div>

                      {item.overtimeHours > 0 && (
                        <div className="flex items-center justify-between text-blue-400">
                          <span>ساعات إضافية ({item.overtimeHours} س):</span>
                          <span className="font-mono">+{(item.overtimePay ?? 0).toLocaleString()} د.م</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-red-400">
                        <span>التسبيقات المخصومة (Les avances):</span>
                        <span className="font-mono">-{(item.advancesAmount ?? 0).toLocaleString()} د.م</span>
                      </div>

                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-sm font-extrabold text-white">
                        <span>الصافي الواجب أداؤه:</span>
                        <span className="text-emerald-400 font-mono text-base">{(item.netPayable ?? 0).toLocaleString()} د.م</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openWhatsAppReceipt(item.worker.name, item.worker.phone || '', item.netPayable, `${mondayStr} إلى ${saturdayStr}`)}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 transition-colors"
                        title="إرسال وصل واتساب"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>

                    {!isSettled ? (
                      <button
                        onClick={() => {
                          settleWeeklyWages({
                            workerId: item.worker.id,
                            projectId: targetProjectId,
                            periodStart: mondayStr,
                            periodEnd: saturdayStr,
                            daysWorked: item.daysWorked,
                            overtimeHours: item.overtimeHours,
                            grossAmount: item.grossWage + item.overtimePay,
                            advancesDeducted: item.advancesAmount,
                            netAmount: item.netPayable,
                            paymentMethod: 'كاش (Espèces)',
                            notes: `تسوية أسبوعية عادية (${mondayStr} - ${saturdayStr})`
                          });
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-colors"
                      >
                        تسوية وخلاص الآن 💵
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تمت التسوية بنجاح</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Past Settlements Log */}
          {filteredPayments.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 mt-6">
              <h3 className="text-sm font-bold text-white mb-3">سجل التسويات السابقة (خلاص الأسابيع)</h3>
              <div className="space-y-2 text-xs">
                {filteredPayments.map(p => {
                  const worker = state.workers.find(w => w.id === p.workerId);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
                      <div>
                        <span className="font-bold text-white">{worker?.name || p.workerId}</span>
                        <span className="text-zinc-400 text-[10px] block">الفترة: {p.periodStart} إلى {p.periodEnd} • {p.daysWorked} أيام</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-400 font-mono">{(p.netAmount ?? 0).toLocaleString()} د.م</span>
                        <button
                          onClick={() => {
                            if (confirm('هل أنت متأكد من إلغاء وحذف هذه التسوية؟')) {
                              deleteWagePayment(p.id);
                            }
                          }}
                          className="p-1 rounded text-zinc-500 hover:text-red-400"
                          title="حذف التسوية"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 3: ADVANCES (التسبيقات) ======================= */}
      {activeSubTab === 'advances' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-3xl">
            <div>
              <h2 className="text-base font-bold text-white">سجل تسبيقات اليد العاملة (Les Avances)</h2>
              <p className="text-xs text-zinc-400">التسبيقات النقدية تقتطع تلقائياً عند تسوية أجور السبت</p>
            </div>

            <button
              onClick={() => openAddAdvanceModal()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md"
            >
              <Plus className="w-4 h-4 text-zinc-950" />
              <span>تسجيل تسبيق جديد</span>
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="p-3 font-semibold">التاريخ</th>
                  <th className="p-3 font-semibold">العامل</th>
                  <th className="p-3 font-semibold">المبلغ (MAD)</th>
                  <th className="p-3 font-semibold">الحالة</th>
                  <th className="p-3 font-semibold">ملاحظات</th>
                  <th className="p-3 font-semibold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredAdvances.map((adv) => {
                  const worker = state.workers.find(w => w.id === adv.workerId);

                  return (
                    <tr key={adv.id} className="hover:bg-zinc-800/40">
                      <td className="p-3 font-mono text-zinc-400">{adv.date}</td>
                      <td className="p-3 font-bold text-white">{worker?.name || adv.workerId}</td>
                      <td className="p-3 font-mono font-bold text-amber-400">{(adv.amount ?? 0).toLocaleString()} د.م</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          adv.isDeducted 
                            ? 'bg-zinc-800 text-zinc-400' 
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {adv.isDeducted ? 'مقتطع في السبت' : 'قيد الانتظار'}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400">{adv.notes || '-'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingAdvance(adv);
                              setSelectedWorkerForAdvance(adv.workerId);
                              setAdvanceAmount(adv.amount);
                              setAdvanceNotes(adv.notes || '');
                              setIsAdvanceModalOpen(true);
                            }}
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                            title="تعديل"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('هل أنت متأكد من حذف هذا التسبيق؟')) {
                                deleteWageAdvance(adv.id);
                              }
                            }}
                            className="p-1 rounded bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400"
                            title="حذف"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredAdvances.length === 0 && (
              <div className="text-center py-10 text-xs text-zinc-400">
                لا توجد تسبيقات مسجلة حالياً
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 4: WORKERS LIST ======================= */}
      {activeSubTab === 'workers' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3 rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="البحث باسم العامل، رقم البطاقة CIN، أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-200 py-2 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 focus:border-amber-500"
              />
            </div>

            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="w-full sm:w-auto bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-200 py-2 px-3 focus:border-amber-500"
            >
              <option value="all">جميع الحرف والمهن</option>
              <option value="معلم بناء">معلم بناء</option>
              <option value="مانوفر">مانوفر (عامل)</option>
              <option value="كوفراج">كوفراج (نجار قالب)</option>
              <option value="فيرايور">فيرايور (حداد تسليح)</option>
              <option value="جباص">جباص (جبس)</option>
              <option value="صباغ">صباغ (دهان)</option>
              <option value="زليجي">زليجي (سيراميك)</option>
              <option value="بلومبي">بلومبي (ترصيص صحي)</option>
              <option value="كهربائي">كهربائي</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkers.map((worker) => {
              const assignedProjects = state.projects.filter(p => worker.projectIds.includes(p.id));

              return (
                <div key={worker.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/20">
                        {worker.specialty}
                      </span>
                      {worker.cin && <span className="text-xs text-zinc-400 font-mono">{worker.cin}</span>}
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">{worker.name}</h3>

                    <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 text-xs space-y-1 mb-3">
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">الأجر:</span>
                        <span className="font-bold font-mono text-amber-400">{worker.wageAmount} د.م / {worker.wageType === 'daily' ? 'اليوم' : 'الشهر'}</span>
                      </div>
                      {worker.phone && (
                        <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-800">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{worker.phone}</span>
                          </span>
                          <button
                            onClick={() => {
                              const cleanPhone = worker.phone.replace(/[^0-9]/g, '');
                              const moroccanPhone = cleanPhone.startsWith('0') ? `212${cleanPhone.slice(1)}` : cleanPhone;
                              window.open(`https://wa.me/${moroccanPhone}`, '_blank');
                            }}
                            className="text-[11px] text-emerald-400 hover:underline"
                          >
                            واتساب
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Assigned projects list */}
                    <div className="text-[11px] text-zinc-400 mb-3">
                      <span className="block mb-1">الأوراش المعين فيها:</span>
                      <div className="flex flex-wrap gap-1">
                        {assignedProjects.map(p => (
                          <span key={p.id} className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 font-medium">
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-1.5">
                    {!isAll && (
                      <button
                        onClick={() => removeWorkerFromProject(worker.id, selectedProjectId)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 text-xs transition-colors"
                        title="إلغاء تعيين العامل من هذا الورش"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>إبعاد من الورش</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1.5 mr-auto">
                      <button
                        onClick={() => openEditWorkerModal(worker)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        title="تعديل بيانات العامل"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف العامل (${worker.name}) ونقله لسلة المحذوفات؟`)) {
                            deleteWorker(worker.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400"
                        title="حذف العامل نهائياً"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================= MODAL: CREATE / EDIT WORKER ======================= */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-xs">
            <h3 className="text-base font-bold text-white mb-4">
              {editingWorker ? 'تعديل بيانات العامل' : 'إضافة عامل جديد للورش'}
            </h3>

            <form onSubmit={handleWorkerFormSubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">اسم العامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: المعلم رشيد السوسي"
                  value={workerFormData.name}
                  onChange={(e) => setWorkerFormData({ ...workerFormData, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">المهنة / الحرفة *</label>
                  <select
                    value={workerFormData.specialty}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, specialty: e.target.value as WorkerSpecialty })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                  >
                    <option value="معلم بناء">معلم بناء</option>
                    <option value="مانوفر">مانوفر (عامل)</option>
                    <option value="كوفراج">كوفراج (نجار قالب)</option>
                    <option value="فيرايور">فيرايور (حداد تسليح)</option>
                    <option value="جباص">جباص (جبس)</option>
                    <option value="صباغ">صباغ (دهان)</option>
                    <option value="زليجي">زليجي (سيراميك)</option>
                    <option value="بلومبي">بلومبي (ترصيص صحي)</option>
                    <option value="كهربائي">كهربائي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">الأجرة اليومية (MAD) *</label>
                  <input
                    type="number"
                    required
                    min={50}
                    step={10}
                    value={workerFormData.wageAmount}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, wageAmount: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    placeholder="0661234567"
                    value={workerFormData.phone}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">رقم البطاقة الوطنية (CIN)</label>
                  <input
                    type="text"
                    placeholder="BH123456"
                    value={workerFormData.cin}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, cin: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono uppercase focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">الأوراش المعين فيها</label>
                <select
                  multiple
                  value={workerFormData.projectIds}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, (option) => (option as HTMLOptionElement).value);
                    setWorkerFormData({ ...workerFormData, projectIds: values });
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-zinc-100 focus:border-amber-500 h-20"
                >
                  {accessibleProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.locationCity})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-zinc-500">اضغط Ctrl لتحديد أكثر من ورش</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsWorkerModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  حفظ العامل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: ADD / EDIT ADVANCE ======================= */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-xs space-y-3">
            <h3 className="text-base font-bold text-white">
              {editingAdvance ? 'تعديل مبلغ التسبيق' : 'تسجيل تسبيق نقد (Avance) للعامل'}
            </h3>

            <form onSubmit={handleAdvanceSubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">اختر العامل *</label>
                <select
                  disabled={!!editingAdvance}
                  value={selectedWorkerForAdvance}
                  onChange={(e) => setSelectedWorkerForAdvance(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                >
                  {filteredWorkers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.specialty} — {w.wageAmount} د.م/يوم)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">مبلغ التسبيق (MAD) *</label>
                <input
                  type="number"
                  required
                  min={50}
                  step={50}
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono text-base font-bold focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">ملاحظات / سبب التسبيق</label>
                <input
                  type="text"
                  placeholder="مثال: تسبيق مصاريف عائلية قبل السبت"
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  تأكيد التسبيق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: ASSIGN EXISTING WORKER TO PROJECT ======================= */}
      {isAssignExistingModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">إلحاق عامل مسجل إلى ورش: {currentProject?.name}</h3>
              <button onClick={() => setIsAssignExistingModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            
            <p className="text-zinc-400">اختر من العمال المسجلين في النظام لإضافتهم فوراً لهذا الورش:</p>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {unassignedWorkers.map(w => (
                <div key={w.id} className="flex items-center justify-between p-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div>
                    <h4 className="font-bold text-white">{w.name}</h4>
                    <p className="text-[10px] text-amber-400">{w.specialty} • {w.wageAmount} د.م/يوم</p>
                  </div>
                  <button
                    onClick={() => {
                      assignWorkerToProject(w.id, selectedProjectId);
                      setIsAssignExistingModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold border border-emerald-500/30"
                  >
                    + تعيين في الورش
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
