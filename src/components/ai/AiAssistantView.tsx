import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bot, Send, Sparkles, Building2, Coins, Truck, Users, MessageSquare, AlertCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  quickActions?: { label: string; query: string }[];
}

export const AiAssistantView: React.FC = () => {
  const { 
    state, 
    accessibleProjects, 
    selectedProjectId, 
    getProjectFinancials, 
    getOverallFinancials, 
    getSupplierBalance, 
    getWeeklyWorkersSummary,
    t 
  } = useApp();

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      sender: 'assistant',
      text: `مرحباً بك! أنا **المساعد الذكي لورش البناء (XiilL BTP AI)** 🏗️.
أنا مدرب على حسابات الأوراش المغربية بالدارجة والفرنسية والعربية. يمكنك أن تسألني عن:
• مصاريف الإسمنت والحديد والسلعة
• حساب السيمانة وأجور المعلمين والمانوفرية
• ديون وكريدي الموردين (Fournisseurs)
• المعايير التقنية المغربية وحساب كميات الخرسانة`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickActions: [
        { label: '📊 ملخص ميزانية الأوراش', query: 'عطيني ملخص شامل للميزانية والمصاريف' },
        { label: '🧱 شحال خسرنا على السلعة؟', query: 'شحال شرينا ديال السلعة والمواد؟' },
        { label: '💰 شكون الفورنيسور اللي كيتسالنا الكريدي؟', query: 'عطيني لائحة ديون الموردين والكريدي' },
        { label: '👷 حساب خلاص السيمانة', query: 'شحال المجموع ديال خلاص السيمانة نهار السبت؟' },
      ]
    }
  ]);

  const [isThinking, setIsThinking] = useState(false);

  // Smart Contextual Offline Query Interpreter tailored to Moroccan Construction data
  const processQuery = (q: string) => {
    const query = q.toLowerCase();
    const isAll = selectedProjectId === 'all';
    const fin = isAll ? getOverallFinancials() : getProjectFinancials(selectedProjectId);
    const currProj = accessibleProjects.find(p => p.id === selectedProjectId);

    if (query.includes('ميزانية') || query.includes('ملخص') || query.includes('خسرنا') || query.includes('budget') || query.includes('dépense')) {
      return `📊 **الوضعية المالية للورش ${isAll ? '(كافة الأوراش)' : `(${currProj?.name})`}**:
• **الميزانية الإجمالية**: ${fin.budget.toLocaleString()} د.م
• **المصروف الفعلي**: ${fin.totalSpent.toLocaleString()} د.م (${fin.budgetPercentage.toFixed(1)}%)
• **مشتريات المواد**: ${fin.materialsSpent.toLocaleString()} د.م
• **أجور العمال**: ${fin.laborSpent.toLocaleString()} د.م
• **المصاريف العامة**: ${fin.expensesSpent.toLocaleString()} د.م
• **الميزانية المتبقية**: ${fin.remainingBudget.toLocaleString()} د.م
${fin.isOverBudget ? '⚠️ **تنبيه:** تم تجاوز الميزانية المحددة للمشروع!' : '✅ المصروفات تحت سقف الميزانية المحددة.'}`;
    }

    if (query.includes('سلعة') || query.includes('مواد') || query.includes('سيما') || query.includes('حديد') || query.includes('achat') || query.includes('matériau')) {
      const topPurchases = state.purchases.slice(0, 5);
      return `🧱 **سجل مشتريات المواد والسلعة**:
• إجمالي مشتريات المواد: **${fin.materialsSpent.toLocaleString()} د.م**
• عدد عمليات الشراء المسجلة: **${state.purchases.length} بون**

أبرز المشتريات الأخيرة:
${topPurchases.map(p => `• ${p.materialName}: ${p.quantity} ${p.unit} بمبلغ ${p.totalAmount.toLocaleString()} د.م`).join('\n')}

💡 يمكنك مراجعة أسعار الإسمنت والحديد في شاشة "الموردون والمشتريات".`;
    }

    if (query.includes('فورنيسور') || query.includes('مورد') || query.includes('كريدي') || query.includes('fournisseur') || query.includes('dette')) {
      const debts = state.suppliers.map(s => ({
        supplier: s,
        bal: getSupplierBalance(s.id)
      })).filter(item => item.bal.currentDebt > 0);

      if (debts.length === 0) {
        return `✅ **ممتاز!** لا يوجد أي كريدي متأخر على المقاولة لجميع الموردين، جميع الحسابات مسواة بالكامل.`;
      }

      return `🏢 **ديون وكريدي الموردين العالقة (Dettes Fournisseurs)**:
• إجمالي الكريدي المتبقي: **${fin.suppliersDebt.toLocaleString()} د.م**

تفصيل الحساب لكل مورد:
${debts.map(d => `• **${d.supplier.name}** (${d.supplier.category}): باقي كيتسال **${d.bal.currentDebt.toLocaleString()} د.م** (هاتف: ${d.supplier.phone})`).join('\n')}

💡 يمكنك تسجيل أداء دفعة مباشرة أو إرسال كشف الحساب عبر واتساب في تبويب الموردين.`;
    }

    if (query.includes('سيمانة') || query.includes('سبت') || query.includes('عمال') || query.includes('أجور') || query.includes('pointage') || query.includes('paie')) {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);

      const weekly = getWeeklyWorkersSummary(
        selectedProjectId,
        monday.toISOString().slice(0, 10),
        saturday.toISOString().slice(0, 10)
      );

      const totalNet = weekly.reduce((sum, item) => sum + item.netPayable, 0);

      return `👷 **حساب خلاص السيمانة (أسبوع السبت)**:
• عدد العمال المسجلين: **${weekly.length} عمال**
• إجمالي المستحق للدفع نهار السبت: **${totalNet.toLocaleString()} د.م**

تفصيل العمال:
${weekly.slice(0, 5).map(w => `• **${w.worker.name}** (${w.worker.specialty}): عمل ${w.calculatedDays} أيام — الصافي: **${w.netPayable} د.م** ${w.isSettled ? '✅ خلاص' : '⏳ قيد الانتظار'}`).join('\n')}

💡 توجه إلى زر "تسوية أجور السبت" لتسجيل خلاص الأجور بضغطة واحدة.`;
    }

    if (query.includes('بيتون') || query.includes('خرسانة') || query.includes('سميلات') || query.includes('جرعة') || query.includes('dosage')) {
      return `📐 **معايير خلط الخرسانة المسلحة المعتمدة في المغرب (Dosage Béton)**:
• **خرسانة الأساسات والسميلات (B25 / 350 kg/m³)**:
  - 1 كيس إسمنت CPJ 45 (50 كغ)
  - 4 برويطات كياص (Gravier G1/G2)
  - 2.5 برويطة رمل مغسول (Sable)
  - 25 لتر ماء نقي
• **خرسانة النظافة (Béton de propreté)**: 150 إلى 200 كغ/م³.
• **المرطوب والتلبيس (Enduit)**: 300 إلى 350 كغ/م³ بإسمنت CPJ 35.`;
    }

    return `شكراً على استفسارك! بخصوص سؤالك: "${q}".
في نظام XiilL BTP، تم تحديث بيانات الورش ${currProj ? currProj.name : 'الحالي'} وجميع السجلات المالية محفوظة محلياً. يمكنك تصفح التقارير الميدانية أو استخراج بيان الحساب في أي وقت.`;
  };

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    setTimeout(() => {
      const reply = processQuery(text);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 flex flex-col h-[calc(100vh-140px)]">
      
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-1.5">
              <span>مساعد الورش الذكي — XiilL BTP AI</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                متصل وجاهز Offline
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              إجابة فورية بالدارجة المغربية عن تكاليف الورش، حساب السيمانة، ورصيد الموردين
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 overflow-y-auto space-y-4 shadow-inner">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-amber-500 text-zinc-950 font-semibold shadow-md rounded-br-none rtl:rounded-bl-none rtl:rounded-br-2xl'
                : 'bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-bl-none rtl:rounded-br-none rtl:rounded-bl-2xl whitespace-pre-wrap'
            }`}>
              {msg.text}

              {msg.quickActions && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-wrap gap-1.5">
                  {msg.quickActions.map((qa, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(qa.query)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-semibold transition-colors cursor-pointer border border-zinc-700/60"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              )}

              <div className={`text-[9px] mt-1 font-mono text-right rtl:text-left ${
                msg.sender === 'user' ? 'text-zinc-800' : 'text-zinc-500'
              }`}>
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-2xl p-3 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>جاري تحليل بيانات الورش وحساب الأرقام...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="bg-zinc-900 p-2.5 rounded-2xl border border-zinc-800 flex items-center gap-2 shrink-0 shadow-lg">
        <input
          type="text"
          placeholder="اكتب سؤالك هنا بالدارجة أو الفرنسية (مثال: شحال كيتسال لينا فورنيسور السيما؟)"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
        />

        <button
          onClick={() => handleSend()}
          className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-colors cursor-pointer shrink-0"
          title="إرسال"
        >
          <Send className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>

    </div>
  );
};
