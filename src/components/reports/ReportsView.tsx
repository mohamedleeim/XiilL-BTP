import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FileText, 
  Printer, 
  Share2, 
  MessageSquare, 
  Building2, 
  Calendar, 
  Users, 
  Truck, 
  Coins, 
  CheckCircle2,
  Download,
  Receipt,
  FileSpreadsheet,
  ChevronRight
} from 'lucide-react';
import { ProjectContextBanner } from '../common/ProjectContextBanner';

export type ReportType = 
  | 'project_summary'
  | 'daily_log'
  | 'delivery_receipt'
  | 'client_invoice'
  | 'supplier_statement'
  | 'cost_estimate';

export const ReportsView: React.FC = () => {
  const { 
    state, 
    accessibleProjects, 
    selectedProjectId, 
    getProjectFinancials, 
    getSupplierBalance, 
    t 
  } = useApp();

  const [activeReport, setActiveReport] = useState<ReportType>('project_summary');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(state.suppliers[0]?.id || '');

  // Active project context
  const currentProject = accessibleProjects.find(p => p.id === selectedProjectId) || accessibleProjects[0] || state.projects[0];
  const fin = getProjectFinancials(currentProject ? currentProject.id : 'proj_1');
  const activeSupplier = state.suppliers.find(s => s.id === selectedSupplierId) || state.suppliers[0];
  const supplierBal = activeSupplier ? getSupplierBalance(activeSupplier.id) : { totalPurchases: 0, totalPaid: 0, currentDebt: 0 };

  const handlePrint = () => {
    window.print();
  };

  // Generate WhatsApp Message according to report type (French BTP Standard)
  const generateWhatsAppMessage = () => {
    let msg = '';
    switch (activeReport) {
      case 'project_summary':
        msg = `🏗️ *Rapport Synthétique de Chantier — XiilL BTP*
🏢 Projet / Chantier: *${currentProject?.name}*
👤 Maître d'Ouvrage: *${currentProject?.clientName}*
📊 Taux d'avancement: *${currentProject?.progressPct ?? 0}%*
💰 Budget Contractuel: *${(fin?.budget ?? 0).toLocaleString()} MAD*
💵 Dépenses Totales Réalisées: *${(fin?.totalSpent ?? 0).toLocaleString()} MAD*
  • Matériaux & Fournitures: ${(fin?.materialsSpent ?? 0).toLocaleString()} MAD
  • Main-d'œuvre & Paie: ${(fin?.laborSpent ?? 0).toLocaleString()} MAD
  • Frais Généraux: ${(fin?.expensesSpent ?? 0).toLocaleString()} MAD
📥 Acomptes Perçus Client: *${(fin?.clientReceived ?? 0).toLocaleString()} MAD*
🪙 Solde Budgétaire Disponible: *${(fin?.remainingBudget ?? 0).toLocaleString()} MAD*`;
        break;

      case 'daily_log':
        const todayAtt = state.attendance.filter(a => a.date === reportDate && a.projectId === currentProject?.id);
        const pres = todayAtt.filter(a => a.status === 'present' || a.status === 'half_day').length;
        msg = `📋 *Rapport Journalier de Chantier — ${reportDate}*
🏗️ Chantier: *${currentProject?.name}*
👷 Effectif présent ce jour: *${pres} ouvriers*
🚚 Matériaux réceptionnés: ${state.purchases.filter(p => p.date === reportDate && p.projectId === currentProject?.id).map(p => p.materialName).join(', ') || 'Aucune livraison enregistrée ce jour'}
📌 Constat d'exécution: Travaux en cours conformes aux plans du BET et normes NM.`;
        break;

      case 'client_invoice':
        msg = `📑 *Décompte d'Avancement des Travaux / Facture*
🏢 Projet: *${currentProject?.name}*
👤 Maître d'Ouvrage: *${currentProject?.clientName}*
📊 Taux d'exécution global: *${currentProject?.progressPct ?? 0}%*
💰 Montant Marché HT: *${(fin?.budget ?? 0).toLocaleString()} MAD*
💵 Acomptes reçus antérieurement: *${(fin?.clientReceived ?? 0).toLocaleString()} MAD*
⚠️ *Net à Payer (Situation): ${Math.max(0, ((fin?.budget ?? 0) * (currentProject?.progressPct || 0) / 100) - (fin?.clientReceived ?? 0)).toLocaleString()} MAD*`;
        break;

      case 'supplier_statement':
        msg = `🏢 *Relevé de Compte Fournisseur & Situation*
📦 Fournisseur: *${activeSupplier?.name}*
📅 Arrêté au: *${reportDate}*
💵 Total Achats / Facturé: *${(supplierBal?.totalPurchases ?? 0).toLocaleString()} MAD*
✅ Total Règlements Effectués: *${(supplierBal?.totalPaid ?? 0).toLocaleString()} MAD*
🔴 *Solde Restant Dû (Créance): ${(supplierBal?.currentDebt ?? 0).toLocaleString()} MAD*`;
        break;

      default:
        msg = `🏗️ Rapport Technique de Chantier — ${currentProject?.name} (Système XiilL BTP Maroc)`;
    }

    const phone = currentProject?.clientPhone ? currentProject.clientPhone.replace(/[^0-9]/g, '') : '';
    const cleanPhone = phone.startsWith('0') ? `212${phone.slice(1)}` : phone;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const reportItems = [
    { id: 'project_summary' as ReportType, title: '1. Rapport Général & Bilan', subtitle: 'Situation financière et avancement du chantier', icon: Building2 },
    { id: 'daily_log' as ReportType, title: '2. Journal Quotidien de Chantier', subtitle: 'Pointage, effectifs et réceptions de matériaux', icon: Calendar },
    { id: 'client_invoice' as ReportType, title: '3. Décompte d’Avancement / Facture', subtitle: 'Situation des travaux et décompte provisoire', icon: FileSpreadsheet },
    { id: 'supplier_statement' as ReportType, title: '4. Relevé de Compte Fournisseur', subtitle: 'Créances, factures BL et règlements', icon: Truck },
    { id: 'delivery_receipt' as ReportType, title: '5. Bon de Réception Matériaux', subtitle: 'Bordereau de déchargement sur chantier', icon: Receipt },
    { id: 'cost_estimate' as ReportType, title: '6. Devis Estimatif & BPU', subtitle: 'Bordereau des prix unitaires et métrés', icon: Coins },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Project Context Header */}
      {selectedProjectId !== 'all' && (
        <div className="print:hidden">
          <ProjectContextBanner />
        </div>
      )}

      {/* Header (Hidden when printing) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-500" />
            <span>التقارير الميدانية، الفواتير، ومشاركة PDF عبر واتساب</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            نماذج مغربية معتمدة وجاهزة للطباعة والإرسال الفوري لزبائن وموردي الورش
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={generateWhatsAppMessage}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>مشاركة عبر واتساب</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-zinc-950" />
            <span>طباعة وتصدير PDF</span>
          </button>
        </div>
      </div>

      {/* Report Selector Ribbon (Hidden when printing) */}
      <div className="print:hidden grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 bg-zinc-900 p-2.5 rounded-2xl border border-zinc-800">
        {reportItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeReport === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveReport(item.id)}
              className={`p-2.5 rounded-xl text-right rtl:text-right ltr:text-left transition-all border ${
                isActive 
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow' 
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-4 h-4 mb-1.5 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
              <div className="text-xs font-bold line-clamp-1">{item.title}</div>
              <div className="text-[10px] text-zinc-500 truncate">{item.subtitle}</div>
            </button>
          );
        })}
      </div>

      {/* Date & Supplier Filters for Reports (Hidden when printing) */}
      <div className="print:hidden flex flex-wrap items-center gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">تاريخ التقرير:</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-200 font-mono"
          />
        </div>

        {activeReport === 'supplier_statement' && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">اختر المورد:</span>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-200"
            >
              {state.suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ================= PRINTABLE PAPER CANVAS (FRENCH BTP STANDARD) ========== */}
      {/* ========================================================================= */}
      <div className="bg-white text-zinc-900 p-8 sm:p-12 rounded-3xl shadow-xl border border-zinc-300 max-w-4xl mx-auto font-sans print:p-0 print:border-none print:shadow-none ltr:text-left rtl:text-left" dir="ltr">
        
        {/* Printable Document Header (Standard Moroccan Construction / BTP Style) */}
        <div className="border-b-2 border-zinc-900 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black text-zinc-950 tracking-tight uppercase">
                ENTREPRISE GÉNÉRALE DE BÂTIMENT & T.P
              </h2>
              <p className="text-xs text-zinc-600 font-medium mt-0.5">
                Travaux Tous Corps d'État (T.C.E) — Génie Civil, Gros Œuvres, VRD — Casablanca, Maroc
              </p>
              <div className="flex items-center gap-3 text-[11px] text-zinc-600 font-mono mt-1.5">
                <span>ICE: 002938172000045</span>
                <span>•</span>
                <span>IF: 49201928</span>
                <span>•</span>
                <span>RC: 39182 Casablanca</span>
                <span>•</span>
                <span>CNSS: 8192039</span>
              </div>
            </div>

            <div className="text-right border-l border-zinc-300 pl-4">
              <div className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300 inline-block mb-1 font-mono">
                XiilL BTP Système
              </div>
              <div className="text-xs text-zinc-500 font-mono">Date: {reportDate}</div>
              <div className="text-xs text-zinc-500 font-mono">Réf: DOC-{new Date().getFullYear()}-0{activeReport.length}</div>
            </div>
          </div>
        </div>

        {/* ================= REPORT 1: PROJECT SUMMARY ================= */}
        {activeReport === 'project_summary' && currentProject && (
          <div className="space-y-6">
            <div className="bg-zinc-100 p-4 rounded-xl border border-zinc-300 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">PROJET / CHANTIER</span>
                <span className="text-lg font-black text-zinc-900">{currentProject.name}</span>
                <span className="text-xs text-zinc-600 block mt-0.5">Ville: {currentProject.locationCity} — Date d'ouverture: {currentProject.startDate}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">MAÎTRE D'OUVRAGE (CLIENT)</span>
                <span className="text-base font-bold text-zinc-900">{currentProject.clientName}</span>
                <span className="text-xs text-zinc-600 font-mono block">{currentProject.clientPhone}</span>
              </div>
            </div>

            {/* Financial & Physical Status Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="border border-zinc-300 p-3 rounded-xl bg-zinc-50">
                <span className="text-[11px] text-zinc-600 font-bold block mb-1">Budget Contractuel HT</span>
                <span className="text-lg font-black text-zinc-900 font-mono">{(fin?.budget ?? 0).toLocaleString()} MAD</span>
              </div>
              <div className="border border-zinc-300 p-3 rounded-xl bg-zinc-50">
                <span className="text-[11px] text-zinc-600 font-bold block mb-1">Dépenses Totales Réalisées</span>
                <span className="text-lg font-black text-zinc-900 font-mono">{(fin?.totalSpent ?? 0).toLocaleString()} MAD</span>
              </div>
              <div className="border border-zinc-300 p-3 rounded-xl bg-zinc-50">
                <span className="text-[11px] text-zinc-600 font-bold block mb-1">Taux d'Avancement Global</span>
                <span className="text-lg font-black text-amber-700 font-mono">{currentProject?.progressPct ?? 0}%</span>
              </div>
            </div>

            {/* Expense Breakdown Table */}
            <div>
              <h3 className="text-sm font-bold text-zinc-900 mb-2 border-b pb-1 uppercase tracking-wide">
                Ventilation Analytique des Dépenses de Chantier
              </h3>
              <table className="w-full text-xs text-left border border-zinc-300">
                <thead className="bg-zinc-100 font-bold border-b border-zinc-300">
                  <tr>
                    <th className="p-2.5">Poste de Dépense</th>
                    <th className="p-2.5">Désignation des Prestations</th>
                    <th className="p-2.5 text-right">Montant (MAD)</th>
                    <th className="p-2.5 text-right">% Dépenses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  <tr>
                    <td className="p-2.5 font-bold">1. Matériaux & Fournitures</td>
                    <td className="p-2.5 text-zinc-600">Ciment CPJ45, sable lavé, acier HA T12/T14, briques, gravette...</td>
                    <td className="p-2.5 font-mono font-bold text-right">{(fin?.materialsSpent ?? 0).toLocaleString()} MAD</td>
                    <td className="p-2.5 font-mono text-right">{(fin?.totalSpent ?? 0) > 0 ? (((fin?.materialsSpent ?? 0) / fin.totalSpent) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">2. Main-d'œuvre & Paie</td>
                    <td className="p-2.5 text-zinc-600">Salaires maîtres maçons, coffreurs, ferrailleurs, manœuvres</td>
                    <td className="p-2.5 font-mono font-bold text-right">{(fin?.laborSpent ?? 0).toLocaleString()} MAD</td>
                    <td className="p-2.5 font-mono text-right">{(fin?.totalSpent ?? 0) > 0 ? (((fin?.laborSpent ?? 0) / fin.totalSpent) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">3. Frais Généraux & Matériel</td>
                    <td className="p-2.5 text-zinc-600">Location engins & grues, gasoil, transport, autorisations communales</td>
                    <td className="p-2.5 font-mono font-bold text-right">{(fin?.expensesSpent ?? 0).toLocaleString()} MAD</td>
                    <td className="p-2.5 font-mono text-right">{(fin?.totalSpent ?? 0) > 0 ? (((fin?.expensesSpent ?? 0) / fin.totalSpent) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr className="bg-zinc-100 font-black text-zinc-950">
                    <td className="p-2.5" colSpan={2}>TOTAL GÉNÉRAL DES DÉPENSES ENGAGÉES</td>
                    <td className="p-2.5 font-mono text-sm text-right" colSpan={2}>{(fin?.totalSpent ?? 0).toLocaleString()} MAD</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Client Payments & Balance */}
            <div className="bg-zinc-50 border border-zinc-300 p-4 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-700">Acomptes encaissés du Maître d'Ouvrage (Client):</span>
                <span className="font-bold font-mono text-zinc-900">{(fin?.clientReceived ?? 0).toLocaleString()} MAD</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-700">Solde budgétaire disponible sur chantier:</span>
                <span className="font-bold font-mono text-zinc-900">{(fin?.remainingBudget ?? 0).toLocaleString()} MAD</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-1.5">
                <span className="font-bold text-zinc-900">Total des dettes fournisseurs en cours (Créances):</span>
                <span className="font-black font-mono text-red-700">{(fin?.suppliersDebt ?? 0).toLocaleString()} MAD</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= REPORT 2: DAILY LOG ================= */}
        {activeReport === 'daily_log' && (
          <div className="space-y-6">
            <div className="text-center pb-2 border-b">
              <h3 className="text-base font-black text-zinc-900 uppercase">Journal & Rapport Quotidien de Chantier</h3>
              <p className="text-xs text-zinc-600">Rapport journalier d'exécution des travaux — Date: {reportDate}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border border-zinc-300 p-3 rounded-xl bg-zinc-50">
                <span className="font-bold block mb-1">Chantier: {currentProject?.name}</span>
                <span className="text-zinc-600 block">Chef de chantier: {state.users.find(u => u.role === 'supervisor')?.name || 'Superviseur Technique Agréé'}</span>
              </div>
              <div className="border border-zinc-300 p-3 rounded-xl bg-zinc-50">
                <span className="font-bold block mb-1">Conditions climatiques: Ensoleillé et favorable au coulage</span>
                <span className="text-zinc-600 block">Horaires de travail: 08h00 à 17h00</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-zinc-900 mb-2 uppercase">1. Effectifs & Pointage Journalier de la Main-d'œuvre</h4>
              <table className="w-full text-xs text-left border border-zinc-300">
                <thead className="bg-zinc-100 font-bold border-b border-zinc-300">
                  <tr>
                    <th className="p-2">Nom & Prénom</th>
                    <th className="p-2">Fonction / Spécialité</th>
                    <th className="p-2">Statut Pointage</th>
                    <th className="p-2 text-right">Heures Sup.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {state.workers.filter(w => w.active).slice(0, 6).map((w) => (
                    <tr key={w.id}>
                      <td className="p-2 font-semibold">{w.name}</td>
                      <td className="p-2 text-zinc-600">{w.specialty}</td>
                      <td className="p-2 font-bold text-emerald-800">Présent (1.0 j)</td>
                      <td className="p-2 font-mono text-right">0 h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="text-xs font-bold text-zinc-900 mb-2 uppercase">2. Matériaux et Fournitures Réceptionnés sur Site</h4>
              <div className="border border-zinc-300 rounded-xl p-3 bg-zinc-50 text-xs space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>• 100 Sacs de Ciment CPJ 45 (LafargeHolcim Maroc) — Bon de Livraison N° BL-8192</span>
                  <span className="font-mono">8,500 MAD</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>• 1 Camion de sable lavé d'oued (20 tonnes) — Transporteur agréé</span>
                  <span className="font-mono">2,200 MAD</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-zinc-900 mb-1 uppercase">3. Avancement des Travaux & Constats Techniques</h4>
              <div className="border border-zinc-300 rounded-xl p-3 text-xs text-zinc-700 bg-white leading-relaxed">
                Achèvement du coulage des poteaux du rez-de-chaussée, pose du coffrage de la dalle pleine, réception et contrôle du ferraillage haute adhérence FeE500 conformément aux plans du Bureau d'Études Techniques (BET).
              </div>
            </div>
          </div>
        )}

        {/* ================= REPORT 3: CLIENT INVOICE / DECOMPTE ================= */}
        {activeReport === 'client_invoice' && currentProject && (
          <div className="space-y-6">
            <div className="text-center pb-2 border-b">
              <h3 className="text-base font-black text-zinc-900 uppercase">DÉCOMPTE D'AVANCEMENT DES TRAVAUX (SITUATION N° 02)</h3>
              <p className="text-xs text-zinc-600">Marché de Travaux — Projet: {currentProject.name}</p>
            </div>

            <div className="flex justify-between text-xs bg-zinc-50 border border-zinc-300 p-3 rounded-xl">
              <div>
                <span className="text-zinc-500 font-bold uppercase block text-[10px]">Client / Maître d'Ouvrage:</span>
                <span className="font-bold text-zinc-900 text-sm block">{currentProject.clientName}</span>
                <span className="text-zinc-600 block">{currentProject.clientAddress || currentProject.locationCity}</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 font-bold uppercase block text-[10px]">Coordonnées Bancaires (RIB):</span>
                <span className="font-mono font-bold text-zinc-900">181 330 21111 8293049102 44</span>
                <span className="text-zinc-600 block">Banque Populaire du Maroc — Agence Maârif</span>
              </div>
            </div>

            <table className="w-full text-xs text-left border border-zinc-300">
              <thead className="bg-zinc-100 font-bold border-b border-zinc-300">
                <tr>
                  <th className="p-2.5">Poste</th>
                  <th className="p-2.5">Désignation des Travaux Exécutés</th>
                  <th className="p-2.5 text-right">Montant Marché HT</th>
                  <th className="p-2.5 text-right">Avancement</th>
                  <th className="p-2.5 text-right">Montant Dû HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                <tr>
                  <td className="p-2.5 font-mono">01</td>
                  <td className="p-2.5 font-semibold">Terrassements généraux & Fondations superficielles</td>
                  <td className="p-2.5 font-mono text-right">150,000 MAD</td>
                  <td className="p-2.5 font-mono font-bold text-emerald-800 text-right">100%</td>
                  <td className="p-2.5 font-mono font-bold text-right">150,000 MAD</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-mono">02</td>
                  <td className="p-2.5 font-semibold">Gros-Œuvre & Structure en Béton Armé (Poteaux, Poutres, Dalles)</td>
                  <td className="p-2.5 font-mono text-right">250,000 MAD</td>
                  <td className="p-2.5 font-mono font-bold text-amber-700 text-right">60%</td>
                  <td className="p-2.5 font-mono font-bold text-right">150,000 MAD</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-mono">03</td>
                  <td className="p-2.5 font-semibold">Maçonnerie en briques rouges & Enduits intérieurs/extérieurs</td>
                  <td className="p-2.5 font-mono text-right">100,000 MAD</td>
                  <td className="p-2.5 font-mono font-bold text-zinc-500 text-right">20%</td>
                  <td className="p-2.5 font-mono font-bold text-right">20,000 MAD</td>
                </tr>
                <tr className="bg-zinc-100 font-black">
                  <td className="p-2.5" colSpan={4}>TOTAL GÉNÉRAL DES TRAVAUX EXÉCUTÉS H.T</td>
                  <td className="p-2.5 font-mono text-sm text-right">320,000 MAD</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-zinc-600 font-semibold" colSpan={4}>À déduire: Acomptes reçus antérieurement</td>
                  <td className="p-2.5 font-mono text-red-700 font-bold text-right">- {(fin?.clientReceived ?? 0).toLocaleString()} MAD</td>
                </tr>
                <tr className="bg-zinc-900 text-white font-black">
                  <td className="p-3 text-sm" colSpan={4}>NET À PAYER AU TITRE DE CETTE SITUATION (MAD)</td>
                  <td className="p-3 font-mono text-base font-bold text-amber-400 text-right">
                    {Math.max(0, 320000 - (fin?.clientReceived ?? 0)).toLocaleString()} MAD
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ================= REPORT 4: SUPPLIER STATEMENT ================= */}
        {activeReport === 'supplier_statement' && activeSupplier && (
          <div className="space-y-6">
            <div className="text-center pb-2 border-b">
              <h3 className="text-base font-black text-zinc-900 uppercase">RELEVÉ DE COMPTE FOURNISSEUR & SITUATION CRÉANCES</h3>
              <p className="text-xs text-zinc-600">Fournisseur: {activeSupplier.name} ({activeSupplier.category}) — Arrêté au {reportDate}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="border border-zinc-300 p-3 rounded-xl bg-zinc-50">
                <span className="text-zinc-500 font-bold block mb-1">Total Achats Facturés</span>
                <span className="text-base font-black text-zinc-900 font-mono">{(supplierBal?.totalPurchases ?? 0).toLocaleString()} MAD</span>
              </div>
              <div className="border border-zinc-300 p-3 rounded-xl bg-zinc-50">
                <span className="text-zinc-500 font-bold block mb-1">Total Règlements Effectués</span>
                <span className="text-base font-black text-emerald-800 font-mono">{(supplierBal?.totalPaid ?? 0).toLocaleString()} MAD</span>
              </div>
              <div className="border border-zinc-300 p-3 rounded-xl bg-red-50 border-red-200">
                <span className="text-red-700 font-bold block mb-1">Solde Restant Dû (Créance)</span>
                <span className="text-lg font-black text-red-700 font-mono">{(supplierBal?.currentDebt ?? 0).toLocaleString()} MAD</span>
              </div>
            </div>

            <table className="w-full text-xs text-left border border-zinc-300">
              <thead className="bg-zinc-100 font-bold border-b border-zinc-300">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Désignation Fourniture</th>
                  <th className="p-2">Quantité</th>
                  <th className="p-2 text-right">Débit (Achat)</th>
                  <th className="p-2 text-right">Crédit (Règlement)</th>
                  <th className="p-2 text-right">Solde Dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-mono">
                {state.purchases.filter(p => p.supplierId === activeSupplier.id).map(p => (
                  <tr key={p.id}>
                    <td className="p-2 text-zinc-600">{p.date}</td>
                    <td className="p-2 font-sans font-semibold">{p.materialName}</td>
                    <td className="p-2">{p.quantity} {p.unit}</td>
                    <td className="p-2 font-bold text-right">{(p.totalAmount ?? 0).toLocaleString()} MAD</td>
                    <td className="p-2 text-emerald-700 font-bold text-right">{(p.paidAmount ?? 0).toLocaleString()} MAD</td>
                    <td className="p-2 text-red-700 font-bold text-right">{(p.remainingDebt ?? 0).toLocaleString()} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= REPORT 5: DELIVERY RECEIPT ================= */}
        {activeReport === 'delivery_receipt' && (
          <div className="space-y-6">
            <div className="text-center pb-2 border-b">
              <h3 className="text-base font-black text-zinc-900 uppercase">BON DE RÉCEPTION & DÉCHARGEMENT MATÉRIAUX</h3>
              <p className="text-xs text-zinc-600">Procès-verbal de réception sur chantier — Normes NM Maroc</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 border border-zinc-300 p-4 rounded-xl">
              <div>
                <span className="font-bold block">Chantier: {currentProject?.name}</span>
                <span className="text-zinc-600 block">Fournisseur: Société Matériaux LafargeHolcim Maroc</span>
                <span className="text-zinc-600 block">Chauffeur: M. Rachid Bennani</span>
              </div>
              <div className="text-right">
                <span className="font-bold block">N° Bon de Livraison: BL-2026-8812</span>
                <span className="text-zinc-600 block font-mono">Matricule Véhicule: 12-A-89102</span>
                <span className="text-zinc-600 block">Heure de Déchargement: 10h30</span>
              </div>
            </div>

            <table className="w-full text-xs text-left border border-zinc-300">
              <thead className="bg-zinc-100 font-bold border-b border-zinc-300">
                <tr>
                  <th className="p-2.5">Désignation des Matériaux</th>
                  <th className="p-2.5">Quantité Déclarée (BL)</th>
                  <th className="p-2.5">Quantité Reçue Conforme</th>
                  <th className="p-2.5">Contrôle de Conformité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                <tr>
                  <td className="p-2.5 font-bold">Ciment CPJ 45 (Sacs de 50 kg)</td>
                  <td className="p-2.5 font-mono">100 Sacs</td>
                  <td className="p-2.5 font-mono font-bold">100 Sacs</td>
                  <td className="p-2.5 text-emerald-800 font-bold">Conforme sans humidité</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">Acier Haute Adhérence T12 FeE500</td>
                  <td className="p-2.5 font-mono">2.5 Tonnes</td>
                  <td className="p-2.5 font-mono font-bold">2.5 Tonnes</td>
                  <td className="p-2.5 text-emerald-800 font-bold">Certificat de conformité NM fourni</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ================= REPORT 6: COST ESTIMATE (DEVIS) ================= */}
        {activeReport === 'cost_estimate' && (
          <div className="space-y-6">
            <div className="text-center pb-2 border-b">
              <h3 className="text-base font-black text-zinc-900 uppercase">DEVIS ESTIMATIF & BORDEREAU DES PRIX UNITAIRES (BPU)</h3>
              <p className="text-xs text-zinc-600">Offre de prix contractuelle — XiilL BTP Maroc</p>
            </div>

            <table className="w-full text-xs text-left border border-zinc-300">
              <thead className="bg-zinc-100 font-bold border-b border-zinc-300">
                <tr>
                  <th className="p-2">N°</th>
                  <th className="p-2">Désignation des Prestations & Travaux</th>
                  <th className="p-2">Unité</th>
                  <th className="p-2 text-right">Quantité</th>
                  <th className="p-2 text-right">Prix Unitaire HT</th>
                  <th className="p-2 text-right">Total HT (MAD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-mono">
                <tr>
                  <td className="p-2">01</td>
                  <td className="p-2 font-sans font-semibold">Fouilles en pleine masse et rigoles pour semelles</td>
                  <td className="p-2 font-sans">m³</td>
                  <td className="p-2 text-right">120</td>
                  <td className="p-2 text-right">90 MAD</td>
                  <td className="p-2 font-bold text-right">10,800 MAD</td>
                </tr>
                <tr>
                  <td className="p-2">02</td>
                  <td className="p-2 font-sans font-semibold">Béton armé dosé à 350 kg/m³ pour fondations et amorces</td>
                  <td className="p-2 font-sans">m³</td>
                  <td className="p-2 text-right">85</td>
                  <td className="p-2 text-right">1,100 MAD</td>
                  <td className="p-2 font-bold text-right">93,500 MAD</td>
                </tr>
                <tr>
                  <td className="p-2">03</td>
                  <td className="p-2 font-sans font-semibold">Maçonnerie en doubles cloisons de briques 12 trous</td>
                  <td className="p-2 font-sans">m²</td>
                  <td className="p-2 text-right">450</td>
                  <td className="p-2 text-right">80 MAD</td>
                  <td className="p-2 font-bold text-right">36,000 MAD</td>
                </tr>
                <tr className="bg-zinc-900 text-white font-black">
                  <td className="p-2.5 text-sm font-sans" colSpan={5}>MONTANT TOTAL ESTIMATIF DU DEVIS HT</td>
                  <td className="p-2.5 text-base font-bold text-amber-400 text-right">140,300 MAD</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Signatures & Stamp Footer (Standard for all Moroccan construction documents) */}
        <div className="mt-12 pt-6 border-t-2 border-zinc-900 grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <span className="font-bold text-zinc-900 block mb-1">Le Chef de Chantier</span>
            <span className="text-[10px] text-zinc-500 block">Visa technique & constat</span>
            <div className="h-14 border border-dashed border-zinc-400 rounded-lg mt-2 flex items-center justify-center text-[10px] text-zinc-400 font-mono">
              Signature & Date
            </div>
          </div>

          <div>
            <span className="font-bold text-zinc-900 block mb-1">Cachet & Direction</span>
            <span className="text-[10px] text-zinc-500 block">Entreprise de BTP</span>
            <div className="h-14 border border-dashed border-amber-400 rounded-lg mt-2 flex items-center justify-center text-[10px] text-amber-800 font-semibold bg-amber-50">
              Cachet officiel de la Société
            </div>
          </div>

          <div>
            <span className="font-bold text-zinc-900 block mb-1">Maître d'Ouvrage / Tiers</span>
            <span className="text-[10px] text-zinc-500 block">Client ou Fournisseur</span>
            <div className="h-14 border border-dashed border-zinc-400 rounded-lg mt-2 flex items-center justify-center text-[10px] text-zinc-400 font-mono">
              Mention "Lu et Approuvé"
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
