import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Sparkles,
  Check,
  ShieldCheck,
  Zap,
  Calendar,
  Clock,
  Crown,
  ChevronRight,
  PhoneCall,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  calculateDaysRemaining,
  getSubscriptionStatusText
} from '../../services/subscriptionPlans';
import { SubscriptionTier } from '../../types';
import { SUPER_ADMIN_EMAIL } from '../../services/googleWorkspace';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentAdmin, updateAdminSubscription, isPlatformSuperAdmin } = useApp();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSub = currentAdmin?.subscription;
  const currentTier = currentSub?.tier || 'trial_3days';
  const remainingDays = calculateDaysRemaining(currentSub);
  const statusInfo = getSubscriptionStatusText(currentSub);

  const handleSelectPlan = (tier: SubscriptionTier) => {
    if (!currentAdmin) return;
    updateAdminSubscription(currentAdmin.id, tier);
    setSuccessMessage(
      tier === 'trial_3days'
        ? 'تم تفعيل الفترة التجريبية (3 أيام) بنجاح!'
        : tier === 'annual'
        ? 'تهانينا! تم تفعيل الباقة السنوية مع خصم 25% بنجاح!'
        : 'تم تفعيل الباقة الشهرية بنجاح!'
    );
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  باقات واشتراكات منظومة XiilL BTP
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                  تسيير الأوراش
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                اختر الباقة المناسبة لمقاولتك للاستفادة من كافة خصائص التسيير والمزامنة السحابية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Bar */}
        {currentAdmin && (
          <div className="px-5 py-3 bg-zinc-950/70 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">حساب المقاول:</span>
              <span className="font-mono font-bold text-amber-400">{currentAdmin.id}</span>
              <span className="text-zinc-500">({currentAdmin.name})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">الوضعية الحالية:</span>
              <span className={`px-2.5 py-1 rounded-full font-bold border text-[11px] ${statusInfo.colorClass}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="m-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Plans Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = currentTier === plan.id;
              const isAnnual = plan.id === 'annual';
              const isTrial = plan.id === 'trial_3days';

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 border ${
                    isAnnual
                      ? 'bg-gradient-to-b from-amber-500/10 via-zinc-900 to-zinc-950 border-amber-500/40 shadow-xl shadow-amber-500/5'
                      : isCurrent
                      ? 'bg-zinc-900/90 border-amber-500/40 ring-1 ring-amber-500/20'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Badge */}
                  {plan.isPopular && (
                    <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 text-[10px] font-black tracking-wide shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>{plan.badge}</span>
                    </div>
                  )}

                  {!plan.isPopular && (
                    <div className="inline-block self-start mb-2 px-2.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-300">
                      {plan.badge}
                    </div>
                  )}

                  {/* Plan Name & Pricing */}
                  <div className="mb-4">
                    <h3 className="text-base font-extrabold text-white mt-1">
                      {plan.titleAr}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {plan.titleFr}
                    </p>

                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {plan.priceMAD === 0 ? 'مجاناً' : `${plan.priceMAD.toLocaleString()} د.م`}
                      </span>
                      <span className="text-xs text-zinc-400">
                        / {plan.durationLabelAr}
                      </span>
                    </div>

                    {/* Original Price & Discount Display */}
                    {plan.originalPriceMAD && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-zinc-500 line-through font-mono">
                          {plan.originalPriceMAD.toLocaleString()} د.م
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                          خصم 25% (توفير 870 د.م)
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed">
                      {plan.descriptionAr}
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="border-t border-zinc-800/80 pt-3 my-3 space-y-2 flex-1">
                    <span className="text-[11px] font-bold text-zinc-400 block mb-2">
                      المزايا المشمولة:
                    </span>
                    {plan.featuresAr.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-2 border-t border-zinc-800/60">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>باقتك المفعلة حالياً</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectPlan(plan.id)}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                          isAnnual
                            ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{plan.buttonTextAr}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contact and Assistance Note */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white">ضمان الرضا والدعم المستمر: </span>
                فواتير معتمدة، وسائل دفع مرنة (تحويل بنكي / Virement)، ومرافقة تقنية لكافة عمال ومسؤولي المقاولة.
              </div>
            </div>
            <a
              href={`mailto:${SUPER_ADMIN_EMAIL}?subject=طلب اشتراك في منظومة XiilL BTP`}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
              <span>تواصل مع الإدارة العامة</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
