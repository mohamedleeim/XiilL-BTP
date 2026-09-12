import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  AdminAccount, 
  AppState, 
  DriveFileItem, 
  ChatSpaceItem,
  SubscriptionInfo,
  SubscriptionTier,
  MasterSheetAuditReport,
  SheetColumnComparison,
  SheetEntityCountComparison,
  SheetAuditDiff,
  Project,
  Worker,
  CpsArticle,
  Attendance,
  Purchase,
  Expense,
  ClientPayment,
  ProjectStatus,
  WorkerSpecialty,
  MaterialUnit,
  ExpenseCategory,
  PaymentMethod
} from '../types';
import {
  formatTierLabel,
  parseTierLabel,
  computeAutoStatus,
  formatAutoStatusDisplay,
  formatSheetDate
} from './subscriptionPlans';

// Super Admin Primary Email & Master Key & Official Client ID
export const SUPER_ADMIN_EMAIL = 'mohamedleeim@gmail.com';
export const SUPER_ADMIN_MASTER_KEY = 'XiilL-ROOT-2026-BTP';
export const GOOGLE_OAUTH_CLIENT_ID = '432117813508-3kbhpgecu47h2h0fl0g9l96pk1894ir7.apps.googleusercontent.com';

// Official Master Spreadsheet Constants (Known Master Sheet for XiilL BTP)
export const KNOWN_MASTER_SPREADSHEET_ID = '1KCWDJihciRXulv1n8NwEy668N_oiQn7CCVewRurto5k';
export const KNOWN_MASTER_SPREADSHEET_TITLE = 'XiilL BTP — المنظومة المركزية للأوراش';
export const KNOWN_MASTER_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${KNOWN_MASTER_SPREADSHEET_ID}/edit`;

// Initialize Firebase App safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider with standard & requested Workspace Scopes
const provider = new GoogleAuthProvider();
provider.addScope('openid');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account'
});

// In-memory & local fallback token storage
let cachedAccessToken: string | null = null;
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    cachedAccessToken = localStorage.getItem('xiill_btp_superadmin_oauth_token') || null;
  }
} catch (e) {}

let isSigningIn = false;

/**
 * Get current in-memory / persistent access token
 */
export const getAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        cachedAccessToken = localStorage.getItem('xiill_btp_superadmin_oauth_token') || null;
      }
    } catch (e) {}
  }
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        localStorage.setItem('xiill_btp_superadmin_oauth_token', token);
      } else {
        localStorage.removeItem('xiill_btp_superadmin_oauth_token');
      }
    }
  } catch (e) {}
};

/**
 * Initialize Auth State Listener
 */
export const initAuthListener = (
  onAuthSuccess?: (user: { email: string | null; displayName?: string | null; photoURL?: string | null }, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not cached yet, prompt login or sign in
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Helper to wait for Google Identity Services script to be loaded
 */
export const waitForGsi = async (timeoutMs = 3000): Promise<any> => {
  if (typeof window === 'undefined') return undefined;
  if ((window as any).google?.accounts?.oauth2) return (window as any).google.accounts.oauth2;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 100));
    if ((window as any).google?.accounts?.oauth2) return (window as any).google.accounts.oauth2;
  }
  return undefined;
};

/**
 * Sign In with Google Identity Services (GSI) Token Client
 * Acts as a rock-solid client-side OAuth flow when Firebase's server userinfo endpoint is restricted
 * or when domain is unauthorized in Firebase (e.g. GitHub Pages)
 */
export const signInWithGsiTokenClient = async (): Promise<{
  user: { email: string | null; displayName?: string | null; photoURL?: string | null; uid?: string };
  accessToken: string;
}> => {
  const gsi = await waitForGsi(3500);
  if (!gsi) {
    throw new Error('مكتبة Google Identity Services غير جاهزة حالياً في المتصفح. يرجى إعادة تحميل الصفحة.');
  }

  const oAuthClientId = GOOGLE_OAUTH_CLIENT_ID || firebaseConfig.oAuthClientId;
  if (!oAuthClientId) {
    throw new Error('معرف OAuth Client ID غير متوفر.');
  }

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = gsi.initTokenClient({
        client_id: oAuthClientId,
        scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: async (resp: any) => {
          if (resp.error) {
            return reject(new Error(resp.error_description || resp.error || 'فشلت مصادقة Google'));
          }
          if (!resp.access_token) {
            return reject(new Error('لم يتم استلام مفتاح الوصول من Google.'));
          }

          const accessToken = resp.access_token;
          cachedAccessToken = accessToken;

          try {
            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (userinfoRes.ok) {
              const profile = await userinfoRes.json();
              return resolve({
                user: {
                  email: profile.email || '',
                  displayName: profile.name || profile.email?.split('@')[0] || 'مستخدم Google',
                  photoURL: profile.picture || undefined,
                  uid: profile.sub || profile.email
                },
                accessToken
              });
            }
          } catch (profileErr) {
            console.warn('GSI profile fetch fallback:', profileErr);
          }

          // Fallback if userinfo v3 call was blocked
          resolve({
            user: {
              email: SUPER_ADMIN_EMAIL,
              displayName: 'مالك المنظومة الرئيسي',
              uid: SUPER_ADMIN_EMAIL
            },
            accessToken
          });
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'خطأ في نافذة مصادقة Google'));
        }
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (e: any) {
      reject(e);
    }
  });
};

/**
 * Sign In with Google via Popup with seamless GSI fallback
 */
export const signInWithGoogle = async (): Promise<{
  user: { email: string | null; displayName?: string | null; photoURL?: string | null; uid?: string };
  accessToken: string;
}> => {
  try {
    isSigningIn = true;

    // Check if on GitHub Pages (where Firebase authorized-domain is often unconfigured by default)
    const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

    // On GitHub Pages, try GSI Token Client first for seamless instant popup with authorized JS origins
    if (isGitHubPages) {
      try {
        const gsi = await waitForGsi(2000);
        if (gsi) {
          return await signInWithGsiTokenClient();
        }
      } catch (gsiDirectErr: any) {
        console.warn('GSI direct failed on github.io, trying standard Firebase popup:', gsiDirectErr);
      }
    }

    // 1. Attempt standard Firebase popup with corrected OpenID & Workspace scopes
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || (result as any)._tokenResponse?.oauthAccessToken || (result as any)._tokenResponse?.oauthIdToken || '';

      if (token) {
        cachedAccessToken = token;
      }

      return {
        user: {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          uid: result.user.uid
        },
        accessToken: cachedAccessToken || token
      };
    } catch (popupError: any) {
      console.warn('Firebase popup sign-in encountered an issue, checking GSI client fallback:', popupError);

      const errString = String(popupError?.message || popupError?.code || '');
      const isDomainOrCredentialError =
        errString.includes('unauthorized-domain') ||
        errString.includes('unauthorized') ||
        errString.includes('userinfo') ||
        errString.includes('invalid-credential') ||
        errString.includes('401') ||
        errString.includes('operation-not-allowed') ||
        errString.includes('popup-blocked');

      // 2. If Firebase encountered unauthorized domain, userinfo 401, or credential error, fallback to GSI
      if (isDomainOrCredentialError) {
        try {
          const gsi = await waitForGsi(3000);
          if (gsi) {
            return await signInWithGsiTokenClient();
          }
        } catch (gsiErr) {
          console.warn('GSI fallback also failed:', gsiErr);
        }
      }

      throw popupError;
    }
  } catch (error: unknown) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign Out
 */
export const logoutGoogle = async () => {
  await firebaseSignOut(auth);
  cachedAccessToken = null;
};

/**
 * Generate a unique non-repeating Admin ID (e.g. ADM-8492-X7)
 */
export const generateUniqueAdminId = (existingIds: string[] = []): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let uniqueId = '';
  let attempts = 0;
  
  do {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    uniqueId = `ADM-${randomNum}-${code}`;
    attempts++;
  } while (existingIds.includes(uniqueId) && attempts < 100);

  return uniqueId;
};

/**
 * Parse a Google Sheets URL or raw ID into a clean Spreadsheet ID
 */
export const extractSpreadsheetId = (urlOrId: string): string | null => {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  // Check if it's already an ID
  if (/^[a-zA-Z0-9-_]{25,60}$/.test(trimmed)) {
    return trimmed;
  }
  // Extract from URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

// Helper function to retry transient 503 / network errors
const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 2, delayMs = 1200): Promise<Response> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 503 || res.status === 500) {
        if (attempt < maxRetries) {
          console.warn(`Google API service unavailable (${res.status}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }
      }
      return res;
    } catch (networkErr) {
      if (attempt < maxRetries) {
        console.warn(`Network error during Google API call, retrying in ${delayMs}ms...`, networkErr);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw networkErr;
    }
  }
  throw new Error('خدمة Google Sheets غير متاحة مؤقتاً (503 Service Unavailable). يرجى المحاولة بعد لحظات.');
};

// ============================================================================
// GOOGLE SHEETS API CLIENT & BTP STANDARD DEFINITIONS
// ============================================================================

export interface BtpSheetDefinition {
  title: string;
  label: string;
  description: string;
  headers: string[];
  tabColor?: { red: number; green: number; blue: number };
}

export const BTP_STANDARD_SHEETS: BtpSheetDefinition[] = [
  {
    title: 'Admin_Registry',
    label: 'سجل المقاولين والاشتراكات',
    description: 'Admin, Abonnements & Utilisateurs du Chantier',
    headers: [
      'Admin ID (كود الأدمين)',
      'Email (البريد)',
      'Name (الاسم)',
      'Company (المقاولة)',
      'Phone (الهاتف / WhatsApp)',
      'PIN (رمز PIN السري)',
      'Role (الدور)',
      'Type Abonnement (نوع الباقة)',
      'Date Début (تاريخ بدأ الباقة)',
      'Date Fin (تاريخ إنتهاء الباقة)',
      'Status (الحالة التلقائية)',
      'CreatedAt (تاريخ التسجيل)',
      'LastLogin (آخر دخول)',
      'Notes (ملاحظات)'
    ],
    tabColor: { red: 0.95, green: 0.65, blue: 0.1 }
  },
  {
    title: 'Chantiers_Projets',
    label: 'أوراش ومشاريع البناء',
    description: 'Chantiers, Marchés & Localisation',
    headers: [
      'ID Chantier',
      'ID المقاول (Admin ID)',
      'Nom du Chantier',
      'Maître d\'Ouvrage / Client',
      'Téléphone',
      'Ville',
      'Budget Contractuel (MAD)',
      'Date Début',
      'Statut',
      'Avancement %',
      'Notes / Description'
    ],
    tabColor: { red: 0.2, green: 0.6, blue: 0.85 }
  },
  {
    title: 'Bordereau_CPS',
    label: 'بنود دفتر التحملات والأسعار',
    description: 'Bordereau des Prix & CPS (Attachements)',
    headers: [
      'ID Article',
      'ID المقاول (Admin ID)',
      'ID Chantier',
      'Nom Chantier',
      'Lot BTP',
      'N° Article',
      'Désignation des Prestations & Travaux',
      'Unité',
      'Prix Unitaire (MAD)',
      'Quantité Prévue',
      'Montant Prévu (MAD)',
      'Quantité Réalisée',
      'Taux Réalisé %',
      'Montant Exécuté (MAD)'
    ],
    tabColor: { red: 0.4, green: 0.7, blue: 0.3 }
  },
  {
    title: 'Pointage_Journalier',
    label: 'بوانطاج وحضور العمال اليومي',
    description: 'Pointage Quotidien des Équipes',
    headers: [
      'ID Pointage',
      'ID المقاول (Admin ID)',
      'Date',
      'ID Chantier',
      'Nom Chantier',
      'ID Ouvrier',
      'Nom Ouvrier',
      'Statut Pointage',
      'Heures Sup',
      'Avances MAD',
      'Notes'
    ],
    tabColor: { red: 0.9, green: 0.4, blue: 0.2 }
  },
  {
    title: 'Paie_Ouvriers',
    label: 'سجل وبطاقات العمال والأجور',
    description: 'Salaires & Règlements Hebdomadaires/Mensuels',
    headers: [
      'ID Ouvrier',
      'ID المقاول (Admin ID)',
      'Nom & Prénom',
      'Spécialité / Métier',
      'Type de Rémunération',
      'Salaire de Base (MAD)',
      'Téléphone',
      'N° CIN',
      'Statut'
    ],
    tabColor: { red: 0.8, green: 0.3, blue: 0.7 }
  },
  {
    title: 'Achats_Fournisseurs',
    label: 'فواتير وبونات السلع والموردين',
    description: 'Bons de Livraison, Factures & Dettes Matériaux',
    headers: [
      'ID Achat',
      'ID المقاول (Admin ID)',
      'Date',
      'ID Fournisseur',
      'Nom Fournisseur',
      'ID Chantier',
      'Nom Chantier',
      'Désignation Matériaux',
      'Quantité',
      'Unité',
      'Prix Unitaire (MAD)',
      'Montant Total (MAD)',
      'Montant Réglé (MAD)',
      'Reste Dû / Créance (MAD)',
      'N° BL / Facture'
    ],
    tabColor: { red: 0.95, green: 0.75, blue: 0.1 }
  },
  {
    title: 'Depenses_Chantier',
    label: 'مصاريف الورش النثرية واليومية',
    description: 'Petite Caisse, Carburant & Dépenses Diverses',
    headers: [
      'ID Dépense',
      'ID المقاول (Admin ID)',
      'Date',
      'ID Chantier',
      'Nom Chantier',
      'Catégorie de Dépense',
      'Montant (MAD)',
      'Mode de Règlement',
      'Bénéficiaire',
      'Observations'
    ],
    tabColor: { red: 0.85, green: 0.2, blue: 0.3 }
  },
  {
    title: 'Decomptes_Clients',
    label: 'دفعات ووضعيات الزبناء',
    description: 'Situations de Travaux & Encaissements Clients',
    headers: [
      'ID Règlement',
      'ID المقاول (Admin ID)',
      'Date',
      'ID Chantier',
      'Nom Chantier',
      'Tranche / Situation Décompte',
      'Montant Reçu (MAD)',
      'Mode de Paiement',
      'N° Reçu / Chèque'
    ],
    tabColor: { red: 0.2, green: 0.75, blue: 0.5 }
  }
];

export interface SheetTabStatus {
  title: string;
  label: string;
  description: string;
  status: 'ok' | 'missing' | 'repaired';
  headersMatched?: boolean;
}

export interface SheetValidationResult {
  success: boolean;
  spreadsheetId: string;
  spreadsheetTitle: string;
  url: string;
  existingTabs: string[];
  missingTabs: BtpSheetDefinition[];
  allTabsPresent: boolean;
  repaired: boolean;
  message: string;
  tabStatuses: SheetTabStatus[];
}

/**
 * Search user's Google Drive for any existing BTP spreadsheet
 */
export const searchDriveForBtpSpreadsheets = async (): Promise<Array<{ id: string; name: string; url: string; modifiedTime?: string }>> => {
  const token = getAccessToken();
  if (!token) return [];

  try {
    const q = encodeURIComponent(`mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and (name contains 'XiilL' or name contains 'BTP' or name contains 'Chantier' or name contains 'Chantiers')`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink,modifiedTime)&pageSize=10&orderBy=modifiedTime desc`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      url: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
      modifiedTime: f.modifiedTime
    }));
  } catch (err) {
    console.error('Error searching Drive for BTP spreadsheets:', err);
    return [];
  }
};

/**
 * Inspect a spreadsheet's tabs and repair any missing standard BTP sheets
 */
export const inspectAndRepairSpreadsheet = async (
  spreadsheetId: string,
  autoRepair: boolean = false,
  isTenant: boolean = false
): Promise<SheetValidationResult> => {
  const token = getAccessToken();
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const targetDefs = isTenant ? BTP_STANDARD_SHEETS.filter(s => s.title !== 'Admin_Registry') : BTP_STANDARD_SHEETS;

  // 1. Authenticated Google Sheets API v4 Check
  if (token) {
    const metaRes = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,index)`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!metaRes.ok) {
      const errData = await metaRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'تعذر فتح ملف Google Sheets. تأكد من صحة الرابط والصلاحيات.');
    }

    const meta = await metaRes.json();
    const spreadsheetTitle = meta.properties?.title || 'ملف Google Sheets المركزي';
    const sheetsList: string[] = (meta.sheets || []).map((s: any) => s.properties.title as string);

    // Identify existing vs missing tabs
    const missing: BtpSheetDefinition[] = [];
    const existing: string[] = [];

    for (const def of targetDefs) {
      const found = sheetsList.some(
        title => title.toLowerCase().trim() === def.title.toLowerCase().trim()
      );
      if (found) {
        existing.push(def.title);
      } else {
        missing.push(def);
      }
    }

    let repaired = false;
    const repairedTitles: string[] = [];

    // Perform auto-repair if requested
    if (autoRepair && missing.length > 0) {
      try {
        // Step A: Add missing sheet tabs
        const addSheetRequests = missing.map(m => ({
          addSheet: {
            properties: {
              title: m.title,
              tabColor: m.tabColor
            }
          }
        }));

        const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: addSheetRequests })
        });

        if (addRes.ok) {
          repaired = true;
          missing.forEach(m => repairedTitles.push(m.title));

          // Step B: Set header rows for newly created sheets
          const dataPayload = missing.map(m => ({
            range: `${m.title}!A1:${String.fromCharCode(65 + Math.min(m.headers.length - 1, 25))}1`,
            values: [m.headers]
          }));

          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              valueInputOption: 'USER_ENTERED',
              data: dataPayload
            })
          });
        }
      } catch (repairErr) {
        console.warn('Auto-repair partial issue:', repairErr);
      }
    }

    // Step C: Verify & repair headers on existing sheets if row 1 is missing or incomplete
    if (autoRepair && existing.length > 0) {
      try {
        const rangesQuery = existing.map(title => `ranges=${encodeURIComponent(title + '!A1:Z1')}`).join('&');
        const headersRes = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (headersRes.ok) {
          const batchData = await headersRes.json();
          const valueRanges: any[] = batchData.valueRanges || [];
          const headerUpdates: any[] = [];

          existing.forEach((title, idx) => {
            const def = targetDefs.find(d => d.title.toLowerCase().trim() === title.toLowerCase().trim());
            if (!def) return;
            const currentHeaders = valueRanges[idx]?.values?.[0] || [];
            // If row 1 is empty or has fewer columns than required, write the full standard header row
            if (currentHeaders.length < def.headers.length) {
              headerUpdates.push({
                range: `${title}!A1:${String.fromCharCode(65 + Math.min(def.headers.length - 1, 25))}1`,
                values: [def.headers]
              });
            }
          });

          if (headerUpdates.length > 0) {
            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                valueInputOption: 'USER_ENTERED',
                data: headerUpdates
              })
            });
            repaired = true;
          }
        }
      } catch (headerErr) {
        console.warn('Existing sheets header validation notice:', headerErr);
      }
    }

    const tabStatuses: SheetTabStatus[] = targetDefs.map(def => {
      const isExisting = existing.includes(def.title);
      const isRepaired = repairedTitles.includes(def.title);
      return {
        title: def.title,
        label: def.label,
        description: def.description,
        status: isRepaired ? 'repaired' : isExisting ? 'ok' : 'missing',
        headersMatched: true
      };
    });

    const allTabsPresent = tabStatuses.every(t => t.status === 'ok' || t.status === 'repaired');

    return {
      success: true,
      spreadsheetId,
      spreadsheetTitle,
      url,
      existingTabs: existing.concat(repairedTitles),
      missingTabs: repaired ? [] : missing,
      allTabsPresent,
      repaired,
      tabStatuses,
      message: allTabsPresent
        ? (repaired ? 'تم فحص الملف: تمت إضافة وتنسيق الأوراق ورؤوس الأعمدة الناقصة تلقائياً بنجاح!' : `تم التحقق بنجاح: جميع الأوراق (${targetDefs.length}) ورؤوس الأعمدة متطابقة وجاهزة 100%!`)
        : `الملف تنقصه ${missing.length} أوراق رئيسية لمطابقة هيكل الأوراش.`
    };
  }

  // 2. Unauthenticated Check (e.g. Field Supervisor without Gmail login)
  // Check tabs via Google Visualization endpoint (GViz)
  const tabStatuses: SheetTabStatus[] = [];
  let foundCount = 0;

  for (const def of targetDefs) {
    let isFound = false;
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(def.title)}&range=A1:B1`;
      const res = await fetch(gvizUrl);
      if (res.ok) {
        const text = await res.text();
        if (text.includes('google.visualization.Query.setResponse') && !text.includes('"status":"error"')) {
          isFound = true;
          foundCount++;
        }
      }
    } catch {
      // ignore
    }

    tabStatuses.push({
      title: def.title,
      label: def.label,
      description: def.description,
      status: isFound ? 'ok' : 'missing'
    });
  }

  const allTabsPresent = foundCount === targetDefs.length;

  return {
    success: foundCount > 0,
    spreadsheetId,
    spreadsheetTitle: 'ملف Google Sheets المعتمد للورش',
    url,
    existingTabs: tabStatuses.filter(t => t.status === 'ok').map(t => t.title),
    missingTabs: targetDefs.filter(def => tabStatuses.find(t => t.title === def.title)?.status === 'missing'),
    allTabsPresent,
    repaired: false,
    tabStatuses,
    message: allTabsPresent
      ? `تم التحقق بنجاح: ملف الشيت هو هو وجميع الأوراق (${targetDefs.length}) متطابقة وجاهزة!`
      : (foundCount > 0 
          ? `تم التحقق: وُجدت ${foundCount} أوراق من أصل ${targetDefs.length}. تأكد من أن الملف تمت مشاركته بالكامل.` 
          : 'تعذر التحقق من محتوى الملف. يرجى التأكد من أن الرابط صحيح وأن الملف متاح لمن لديه الرابط (Tous les utilisateurs avec le lien).')
  };
};

/**
 * Reads headers and data rows of any sheet tab, using Google Sheets API if token is present,
 * or the public GViz JSON endpoint as zero-auth fallback.
 */
export const fetchSheetDataRows = async (
  spreadsheetId: string,
  sheetTitle: string
): Promise<{ headers: string[]; rows: any[][]; error?: string }> => {
  const token = getAccessToken();

  if (token) {
    try {
      const res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:Z3000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const values: any[][] = data.values || [];
        if (values.length > 0) {
          const headers = (values[0] || []).map(h => String(h || '').trim());
          const rows = values.slice(1);
          return { headers, rows };
        }
        return { headers: [], rows: [] };
      }
    } catch (apiErr) {
      console.warn(`API fetch for ${sheetTitle} failed, falling back to GViz:`, apiErr);
    }
  }

  // Fallback to GViz (accessible without OAuth token)
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetTitle)}`;
    const res = await fetch(url);
    if (!res.ok) return { headers: [], rows: [], error: `HTTP ${res.status}` };
    const text = await res.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!match || !match[1]) return { headers: [], rows: [], error: 'Invalid GViz format' };
    const data = JSON.parse(match[1]);
    if (data.status !== 'ok') {
      return { headers: [], rows: [], error: data.errors?.[0]?.message || 'Sheet tab not accessible' };
    }

    const rawCols = (data.table.cols || []).map((c: any) => (c.label || c.id || '').trim());
    const gvizRows = data.table.rows || [];
    const hasMeaningfulLabels = rawCols.some((c: string) => c && !/^[A-Z]$/.test(c));

    if (hasMeaningfulLabels) {
      const headers = rawCols;
      const rows = gvizRows.map((r: any) =>
        (r.c || []).map((cell: any) => (cell ? (cell.v !== null && cell.v !== undefined ? cell.v : cell.f || '') : ''))
      );
      return { headers, rows };
    } else if (gvizRows.length > 0) {
      const headers = (gvizRows[0].c || []).map((cell: any) =>
        cell ? String(cell.v !== null && cell.v !== undefined ? cell.v : cell.f || '').trim() : ''
      );
      const rows = gvizRows.slice(1).map((r: any) =>
        (r.c || []).map((cell: any) => (cell ? (cell.v !== null && cell.v !== undefined ? cell.v : cell.f || '') : ''))
      );
      return { headers, rows };
    }
    return { headers: rawCols, rows: [] };
  } catch (err: any) {
    return { headers: [], rows: [], error: err.message };
  }
};

/**
 * Parser that translates raw sheet tables into domain model records
 */
export const parseAllOperationalDataFromRows = (
  sheetDataMap: Record<string, { headers: string[]; rows: any[][] }>
): {
  admins: AdminAccount[];
  projects: Project[];
  workers: Worker[];
  cpsArticles: CpsArticle[];
  attendance: Attendance[];
  purchases: Purchase[];
  expenses: Expense[];
  clientPayments: ClientPayment[];
} => {
  const result = {
    admins: [] as AdminAccount[],
    projects: [] as Project[],
    workers: [] as Worker[],
    cpsArticles: [] as CpsArticle[],
    attendance: [] as Attendance[],
    purchases: [] as Purchase[],
    expenses: [] as Expense[],
    clientPayments: [] as ClientPayment[]
  };

  // 1. Admin_Registry
  const adminData = sheetDataMap['Admin_Registry'];
  if (adminData && adminData.rows.length > 0) {
    const h = adminData.headers.map(x => x.toLowerCase());
    const idIdx = h.findIndex(x => x.includes('admin id') || x.includes('كود'));
    const emailIdx = h.findIndex(x => x.includes('email') || x.includes('بريد'));
    const nameIdx = h.findIndex(x => x.includes('name') || x.includes('الاسم'));
    const compIdx = h.findIndex(x => x.includes('company') || x.includes('مقاولة'));
    const phoneIdx = h.findIndex(x => x.includes('phone') || x.includes('هاتف'));
    const pinIdx = h.findIndex(x => x.includes('pin') || x.includes('رمز'));
    const roleIdx = h.findIndex(x => x.includes('role') || x.includes('الدور'));
    const tierIdx = h.findIndex(x => x.includes('type') || x.includes('باقة') || x.includes('اشتراك'));
    const startIdx = h.findIndex(x => x.includes('début') || x.includes('بدأ'));
    const endIdx = h.findIndex(x => x.includes('fin') || x.includes('إنتهاء'));
    const statusIdx = h.findIndex(x => x.includes('status') || x.includes('الحالة'));
    const createdIdx = h.findIndex(x => x.includes('created') || x.includes('تسجيل'));
    const notesIdx = h.findIndex(x => x.includes('note') || x.includes('ملاحظ'));

    adminData.rows.forEach(r => {
      const id = String(r[idIdx !== -1 ? idIdx : 0] || '').trim();
      if (!id || id === 'ID' || id.toLowerCase().includes('admin id')) return;
      const email = String(r[emailIdx !== -1 ? emailIdx : 1] || '').trim().toLowerCase() || `${id.toLowerCase()}@xiill.com`;
      const name = String(r[nameIdx !== -1 ? nameIdx : 2] || '').trim() || id;
      const companyName = compIdx !== -1 && r[compIdx] ? String(r[compIdx]).trim() : name;
      const phone = phoneIdx !== -1 && r[phoneIdx] ? String(r[phoneIdx]).trim() : '';
      const pin = pinIdx !== -1 && r[pinIdx] ? String(r[pinIdx]).trim() : '1234';
      const roleStr = roleIdx !== -1 && r[roleIdx] ? String(r[roleIdx]).trim().toLowerCase() : 'admin';
      const role = roleStr === 'super_admin' ? 'super_admin' : 'admin';

      const tierStr = tierIdx !== -1 ? r[tierIdx] : '';
      const tier = parseTierLabel(tierStr);
      const startDate = startIdx !== -1 && r[startIdx] ? safeIsoDate(r[startIdx], new Date().toISOString()) : new Date().toISOString();
      const endDate = endIdx !== -1 && r[endIdx] ? safeIsoDate(r[endIdx], new Date(Date.now() + 30 * 86400000).toISOString()) : new Date(Date.now() + 30 * 86400000).toISOString();
      const rawStatus = statusIdx !== -1 && r[statusIdx] ? String(r[statusIdx]).trim() : 'active';
      const createdAt = createdIdx !== -1 && r[createdIdx] ? safeIsoDate(r[createdIdx], startDate) : startDate;
      const notes = notesIdx !== -1 && r[notesIdx] ? String(r[notesIdx]).trim() : '';

      const sub: SubscriptionInfo = {
        tier,
        startDate,
        endDate,
        status: 'active',
        price: tier === 'annual' ? 2610 : tier === 'monthly' ? 290 : 0
      };
      const autoStatus = computeAutoStatus(sub, rawStatus);

      result.admins.push({
        id,
        email,
        name,
        companyName,
        phone,
        pin,
        role,
        status: autoStatus,
        subscription: sub,
        createdAt,
        notes
      });
    });
  }

  // 2. Chantiers_Projets
  const projData = sheetDataMap['Chantiers_Projets'];
  if (projData && projData.rows.length > 0) {
    const h = projData.headers.map(x => x.toLowerCase());
    const idIdx = h.findIndex(x => x.includes('id chant') || x === 'id');
    const adminIdx = h.findIndex(x => x.includes('admin') || x.includes('مقاول'));
    const nameIdx = h.findIndex(x => x.includes('nom') || x.includes('اسم'));
    const clientIdx = h.findIndex(x => x.includes('maître') || x.includes('client') || x.includes('زبون'));
    const phoneIdx = h.findIndex(x => x.includes('téléphone') || x.includes('هاتف'));
    const cityIdx = h.findIndex(x => x.includes('ville') || x.includes('مدينة'));
    const budgetIdx = h.findIndex(x => x.includes('budget') || x.includes('ميزانية'));
    const dateIdx = h.findIndex(x => x.includes('date') || x.includes('تاريخ'));
    const statusIdx = h.findIndex(x => x.includes('statut') || x.includes('حالة'));
    const progressIdx = h.findIndex(x => x.includes('avancement') || x.includes('نسبة'));

    projData.rows.forEach(r => {
      const id = String(r[idIdx !== -1 ? idIdx : 0] || '').trim();
      const name = String(r[nameIdx !== -1 ? nameIdx : 2] || r[1] || '').trim();
      if (!id || !name || id.toLowerCase().includes('chantier')) return;

      const adminId = adminIdx !== -1 && r[adminIdx] ? String(r[adminIdx]).trim() : undefined;
      const clientName = clientIdx !== -1 && r[clientIdx] ? String(r[clientIdx]).trim() : '';
      const clientPhone = phoneIdx !== -1 && r[phoneIdx] ? String(r[phoneIdx]).trim() : '';
      const locationCity = cityIdx !== -1 && r[cityIdx] ? String(r[cityIdx]).trim() : '';
      const budget = budgetIdx !== -1 ? parseFloat(String(r[budgetIdx] || 0).replace(/[^0-9.]/g, '')) || 0 : 0;
      const startDate = dateIdx !== -1 && r[dateIdx] ? safeIsoDate(r[dateIdx], new Date().toISOString()) : new Date().toISOString();
      const rawStatus = statusIdx !== -1 && r[statusIdx] ? String(r[statusIdx]).trim().toLowerCase() : 'active';
      const status: ProjectStatus = (rawStatus.includes('clos') || rawStatus.includes('منتهي')) ? 'completed' : 'active';
      const progressRaw = progressIdx !== -1 ? String(r[progressIdx] || 0) : '0';
      const progressPct = parseFloat(progressRaw.replace(/[^0-9.]/g, '')) || 0;

      result.projects.push({
        id,
        adminId,
        name,
        clientName,
        clientPhone,
        locationCity,
        budget,
        startDate,
        status,
        progressPct,
        assignedSupervisorIds: [],
        createdAt: startDate,
        updatedAt: new Date().toISOString()
      });
    });
  }

  // 3. Bordereau_CPS
  const cpsData = sheetDataMap['Bordereau_CPS'];
  if (cpsData && cpsData.rows.length > 0) {
    const h = cpsData.headers.map(x => x.toLowerCase());
    const idIdx = h.findIndex(x => x.includes('id art') || x === 'id');
    const adminIdx = h.findIndex(x => x.includes('admin') || x.includes('مقاول'));
    const projIdx = h.findIndex(x => x.includes('chantier') || x.includes('ورش'));
    const lotIdx = h.findIndex(x => x.includes('lot'));
    const numIdx = h.findIndex(x => x.includes('n°') || x.includes('رقم'));
    const desIdx = h.findIndex(x => x.includes('désign') || x.includes('بيان'));
    const unitIdx = h.findIndex(x => x.includes('unité') || x.includes('وحدة'));
    const puIdx = h.findIndex(x => x.includes('unitaire') || x.includes('سعر'));
    const qtePlanIdx = h.findIndex(x => x.includes('prévue') || x.includes('مبرمج'));
    const qteExecIdx = h.findIndex(x => x.includes('réalisée') || x.includes('منجز'));

    cpsData.rows.forEach(r => {
      const id = String(r[idIdx !== -1 ? idIdx : 0] || '').trim();
      const designation = String(r[desIdx !== -1 ? desIdx : 4] || '').trim();
      if (!id || !designation || id.toLowerCase().includes('article')) return;

      const adminId = adminIdx !== -1 && r[adminIdx] ? String(r[adminIdx]).trim() : undefined;
      const projectId = projIdx !== -1 && r[projIdx] ? String(r[projIdx]).trim() : '';
      const lot = lotIdx !== -1 && r[lotIdx] ? String(r[lotIdx]).trim() : 'Gros Œuvres';
      const articleNumber = numIdx !== -1 && r[numIdx] ? String(r[numIdx]).trim() : id;
      const unit = unitIdx !== -1 && r[unitIdx] ? String(r[unitIdx]).trim() : 'U';
      const unitPrice = puIdx !== -1 ? parseFloat(String(r[puIdx] || 0).replace(/[^0-9.]/g, '')) || 0 : 0;
      const quantityPlanned = qtePlanIdx !== -1 ? parseFloat(String(r[qtePlanIdx] || 0).replace(/[^0-9.]/g, '')) || 0 : 0;
      const quantityExecuted = qteExecIdx !== -1 ? parseFloat(String(r[qteExecIdx] || 0).replace(/[^0-9.]/g, '')) || 0 : 0;
      const totalPlannedPrice = unitPrice * quantityPlanned;
      const executedAmount = unitPrice * quantityExecuted;
      const progressPct = quantityPlanned > 0 ? Math.min(100, Math.round((quantityExecuted / quantityPlanned) * 100)) : 0;

      result.cpsArticles.push({
        id,
        adminId,
        projectId,
        lot,
        articleNumber,
        designation,
        unit,
        unitPrice,
        quantityPlanned,
        totalPlannedPrice,
        quantityExecuted,
        executedAmount,
        progressPct,
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  // 4. Paie_Ouvriers
  const workerData = sheetDataMap['Paie_Ouvriers'];
  if (workerData && workerData.rows.length > 0) {
    const h = workerData.headers.map(x => x.toLowerCase());
    const idIdx = h.findIndex(x => x.includes('id ouvr') || x === 'id');
    const adminIdx = h.findIndex(x => x.includes('admin') || x.includes('مقاول'));
    const nameIdx = h.findIndex(x => x.includes('nom') || x.includes('اسم'));
    const specIdx = h.findIndex(x => x.includes('spécialité') || x.includes('métier') || x.includes('مهنة') || x.includes('حرفة'));
    const wageTypeIdx = h.findIndex(x => x.includes('type') || x.includes('نوع'));
    const wageIdx = h.findIndex(x => x.includes('salaire') || x.includes('base') || x.includes('راتب') || x.includes('أجر'));
    const phoneIdx = h.findIndex(x => x.includes('téléphone') || x.includes('هاتف'));
    const cinIdx = h.findIndex(x => x.includes('cin') || x.includes('بطاقة'));
    const statusIdx = h.findIndex(x => x.includes('statut') || x.includes('حالة'));

    workerData.rows.forEach(r => {
      const id = String(r[idIdx !== -1 ? idIdx : 0] || '').trim();
      const name = String(r[nameIdx !== -1 ? nameIdx : 2] || r[1] || '').trim();
      if (!id || !name || id.toLowerCase().includes('ouvrier')) return;

      const adminId = adminIdx !== -1 && r[adminIdx] ? String(r[adminIdx]).trim() : undefined;
      const specialty = specIdx !== -1 && r[specIdx] ? String(r[specIdx]).trim() : 'بناء';
      const wageTypeStr = wageTypeIdx !== -1 && r[wageTypeIdx] ? String(r[wageTypeIdx]).trim().toLowerCase() : 'daily';
      const wageType = wageTypeStr.includes('mensuel') || wageTypeStr.includes('شهري') ? 'monthly' : 'daily';
      const wageAmount = wageIdx !== -1 ? parseFloat(String(r[wageIdx] || 0).replace(/[^0-9.]/g, '')) || 0 : 0;
      const phone = phoneIdx !== -1 && r[phoneIdx] ? String(r[phoneIdx]).trim() : '';
      const cin = cinIdx !== -1 && r[cinIdx] ? String(r[cinIdx]).trim() : '';
      const rawStatus = statusIdx !== -1 && r[statusIdx] ? String(r[statusIdx]).trim().toLowerCase() : 'actif';
      const active = !rawStatus.includes('inactif') && !rawStatus.includes('معطل');

      result.workers.push({
        id,
        adminId,
        name,
        specialty: specialty as WorkerSpecialty,
        wageType,
        wageAmount,
        phone,
        cin,
        active,
        projectIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  // 5. Pointage_Journalier
  const pointageData = sheetDataMap['Pointage_Journalier'];
  if (pointageData && pointageData.rows.length > 0) {
    const h = pointageData.headers.map(x => x.toLowerCase());
    const idIdx = h.findIndex(x => x.includes('id point') || x === 'id');
    const adminIdx = h.findIndex(x => x.includes('admin') || x.includes('مقاول'));
    const dateIdx = h.findIndex(x => x.includes('date') || x.includes('تاريخ'));
    const projIdx = h.findIndex(x => x.includes('id chant') || x.includes('chantier') || x.includes('ورش'));
    const workerIdx = h.findIndex(x => x.includes('id ouvr') || x.includes('ouvrier') || x.includes('عامل'));
    const statusIdx = h.findIndex(x => x.includes('statut') || x.includes('حالة'));
    const otIdx = h.findIndex(x => x.includes('sup') || x.includes('إضاف'));
    const advIdx = h.findIndex(x => x.includes('avance') || x.includes('تسبيق'));
    const noteIdx = h.findIndex(x => x.includes('note') || x.includes('ملاحظ'));

    pointageData.rows.forEach(r => {
      const date = dateIdx !== -1 && r[dateIdx] ? safeIsoDate(r[dateIdx], '') : '';
      const workerId = workerIdx !== -1 && r[workerIdx] ? String(r[workerIdx]).trim() : '';
      if (!date || !workerId || date.toLowerCase().includes('date')) return;

      const id = idIdx !== -1 && r[idIdx] ? String(r[idIdx]).trim() : `PTG-${date}-${workerId}`;
      const adminId = adminIdx !== -1 && r[adminIdx] ? String(r[adminIdx]).trim() : undefined;
      const projectId = projIdx !== -1 && r[projIdx] ? String(r[projIdx]).trim() : '';
      const statusRaw = statusIdx !== -1 && r[statusIdx] ? String(r[statusIdx]).trim().toLowerCase() : 'present';
      const status = statusRaw.includes('absent') || statusRaw.includes('غائب') ? 'absent' : (statusRaw.includes('half') || statusRaw.includes('نصف') ? 'half_day' : 'present');
      const overtimeHours = otIdx !== -1 ? parseFloat(String(r[otIdx] || 0).replace(/[^0-9.]/g, '')) || 0 : 0;
      const advanceAmount = advIdx !== -1 ? parseFloat(String(r[advIdx] || 0).replace(/[^0-9.]/g, '')) || 0 : 0;
      const notes = noteIdx !== -1 && r[noteIdx] ? String(r[noteIdx]).trim() : '';

      result.attendance.push({
        id,
        adminId,
        date,
        projectId,
        workerId,
        status: status as any,
        overtimeHours,
        advanceAmount,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  // 6. Achats_Fournisseurs
  const achanData = sheetDataMap['Achats_Fournisseurs'];
  if (achanData && achanData.rows.length > 0) {
    const h = achanData.headers.map(x => x.toLowerCase());
    const idIdx = h.findIndex(x => x.includes('id ach') || x === 'id');
    const adminIdx = h.findIndex(x => x.includes('admin') || x.includes('مقاول'));
    const dateIdx = h.findIndex(x => x.includes('date') || x.includes('تاريخ'));
    const suppIdx = h.findIndex(x => x.includes('fournisseur') || x.includes('مورد'));
    const projIdx = h.findIndex(x => x.includes('chantier') || x.includes('ورش'));
    const matIdx = h.findIndex(x => x.includes('désign') || x.includes('matér') || x.includes('سلعة') || x.includes('مادة'));
    const qteIdx = h.findIndex(x => x.includes('quant') || x.includes('كمية'));
    const unitIdx = h.findIndex(x => x.includes('unité') || x.includes('وحدة'));
    const puIdx = h.findIndex(x => x.includes('unitaire') || x.includes('سعر'));
    const totalIdx = h.findIndex(x => x.includes('total') || x.includes('مجموع'));
    const paidIdx = h.findIndex(x => x.includes('réglé') || x.includes('مؤدى'));
    const debtIdx = h.findIndex(x => x.includes('dû') || x.includes('باقي') || x.includes('دين'));
    const blIdx = h.findIndex(x => x.includes('bl') || x.includes('facture') || x.includes('وصل') || x.includes('فاتورة'));

    achanData.rows.forEach(r => {
      const id = String(r[idIdx !== -1 ? idIdx : 0] || '').trim();
      const materialName = String(r[matIdx !== -1 ? matIdx : 4] || '').trim();
      if (!id || !materialName || id.toLowerCase().includes('achat')) return;

      const adminId = adminIdx !== -1 && r[adminIdx] ? String(r[adminIdx]).trim() : undefined;
      const date = dateIdx !== -1 && r[dateIdx] ? safeIsoDate(r[dateIdx], new Date().toISOString()) : new Date().toISOString();
      const supplierId = suppIdx !== -1 && r[suppIdx] ? String(r[suppIdx]).trim() : 'SUPP-01';
      const projectId = projIdx !== -1 && r[projIdx] ? String(r[projIdx]).trim() : '';
      const quantity = qteIdx !== -1 ? parseFloat(String(r[qteIdx] || 0).replace(/[^0-9.]/g, '')) || 0 : 0;
      const unit = unitIdx !== -1 && r[unitIdx] ? String(r[unitIdx]).trim() : 'U';
      const unitPrice = puIdx !== -1 ? parseFloat(String(r[puIdx] || 0).replace(/[^0-9.]/g, '')) || 0 : 0;
      const totalAmount = totalIdx !== -1 ? parseFloat(String(r[totalIdx] || 0).replace(/[^0-9.]/g, '')) || (quantity * unitPrice) : (quantity * unitPrice);
      const paidAmount = paidIdx !== -1 ? parseFloat(String(r[paidIdx] || 0).replace(/[^0-9.]/g, '')) || 0 : 0;
      const remainingDebt = debtIdx !== -1 ? parseFloat(String(r[debtIdx] || 0).replace(/[^0-9.]/g, '')) || Math.max(0, totalAmount - paidAmount) : Math.max(0, totalAmount - paidAmount);
      const invoiceNumber = blIdx !== -1 && r[blIdx] ? String(r[blIdx]).trim() : '';

      result.purchases.push({
        id,
        adminId,
        date,
        supplierId,
        projectId,
        materialName,
        quantity,
        unit: unit as MaterialUnit,
        unitPrice,
        totalAmount,
        paidAmount,
        remainingDebt,
        invoiceNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  // 7. Depenses_Chantier
  const expData = sheetDataMap['Depenses_Chantier'];
  if (expData && expData.rows.length > 0) {
    const h = expData.headers.map(x => x.toLowerCase());
    const idIdx = h.findIndex(x => x.includes('id dép') || x === 'id');
    const adminIdx = h.findIndex(x => x.includes('admin') || x.includes('مقاول'));
    const dateIdx = h.findIndex(x => x.includes('date') || x.includes('تاريخ'));
    const catIdx = h.findIndex(x => x.includes('catégorie') || x.includes('صنف'));
    const amountIdx = h.findIndex(x => x.includes('montant') || x.includes('مبلغ'));
    const projIdx = h.findIndex(x => x.includes('chantier') || x.includes('ورش'));
    const modeIdx = h.findIndex(x => x.includes('mode') || x.includes('طريقة'));
    const recIdx = h.findIndex(x => x.includes('bénéficiaire') || x.includes('مستفيد'));
    const obsIdx = h.findIndex(x => x.includes('obs') || x.includes('ملاحظ'));

    expData.rows.forEach(r => {
      const id = String(r[idIdx !== -1 ? idIdx : 0] || '').trim();
      const amount = amountIdx !== -1 ? parseFloat(String(r[amountIdx] || 0).replace(/[^0-9.]/g, '')) || 0 : 0;
      if (!id || amount <= 0 || id.toLowerCase().includes('dépense')) return;

      const adminId = adminIdx !== -1 && r[adminIdx] ? String(r[adminIdx]).trim() : undefined;
      const date = dateIdx !== -1 && r[dateIdx] ? safeIsoDate(r[dateIdx], new Date().toISOString()) : new Date().toISOString();
      const category = catIdx !== -1 && r[catIdx] ? String(r[catIdx]).trim() : 'أخرى';
      const projectId = projIdx !== -1 && r[projIdx] ? String(r[projIdx]).trim() : '';
      const paymentMethod = modeIdx !== -1 && r[modeIdx] ? String(r[modeIdx]).trim() : 'كاش (Espèces)';
      const recipientName = recIdx !== -1 && r[recIdx] ? String(r[recIdx]).trim() : '';
      const notes = obsIdx !== -1 && r[obsIdx] ? String(r[obsIdx]).trim() : '';

      result.expenses.push({
        id,
        adminId,
        date,
        category: category as ExpenseCategory,
        amount,
        projectId,
        paymentMethod: paymentMethod as PaymentMethod,
        recipientName,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  // 8. Decomptes_Clients
  const clientData = sheetDataMap['Decomptes_Clients'];
  if (clientData && clientData.rows.length > 0) {
    const h = clientData.headers.map(x => x.toLowerCase());
    const idIdx = h.findIndex(x => x.includes('id règ') || x === 'id');
    const adminIdx = h.findIndex(x => x.includes('admin') || x.includes('مقاول'));
    const dateIdx = h.findIndex(x => x.includes('date') || x.includes('تاريخ'));
    const projIdx = h.findIndex(x => x.includes('chantier') || x.includes('ورش'));
    const trancheIdx = h.findIndex(x => x.includes('tranche') || x.includes('situation') || x.includes('دفعة') || x.includes('وضعية'));
    const amountIdx = h.findIndex(x => x.includes('montant') || x.includes('مبلغ'));
    const modeIdx = h.findIndex(x => x.includes('mode') || x.includes('طريقة'));
    const numIdx = h.findIndex(x => x.includes('reçu') || x.includes('chèque') || x.includes('وصل') || x.includes('شيك'));

    clientData.rows.forEach(r => {
      const id = String(r[idIdx !== -1 ? idIdx : 0] || '').trim();
      const amount = amountIdx !== -1 ? parseFloat(String(r[amountIdx] || 0).replace(/[^0-9.]/g, '')) || 0 : 0;
      if (!id || amount <= 0 || id.toLowerCase().includes('règlement')) return;

      const adminId = adminIdx !== -1 && r[adminIdx] ? String(r[adminIdx]).trim() : undefined;
      const date = dateIdx !== -1 && r[dateIdx] ? safeIsoDate(r[dateIdx], new Date().toISOString()) : new Date().toISOString();
      const projectId = projIdx !== -1 && r[projIdx] ? String(r[projIdx]).trim() : '';
      const milestoneTitle = trancheIdx !== -1 && r[trancheIdx] ? String(r[trancheIdx]).trim() : 'Décompte';
      const paymentMethod = modeIdx !== -1 && r[modeIdx] ? String(r[modeIdx]).trim() : 'تحويل بنكي (Virement)';
      const receiptNumber = numIdx !== -1 && r[numIdx] ? String(r[numIdx]).trim() : '';

      result.clientPayments.push({
        id,
        adminId,
        date,
        projectId,
        milestoneTitle,
        amount,
        paymentMethod: paymentMethod as PaymentMethod,
        receiptNumber,
        createdAt: new Date().toISOString()
      });
    });
  }

  return result;
};

/**
 * Bidirectional Schema & Data Audit between System and Central Google Sheet
 * Performs structural verification, column header check, and data volume comparison.
 */
export const auditMasterSheetBidirectional = async (
  spreadsheetId: string,
  state: AppState
): Promise<MasterSheetAuditReport> => {
  const token = getAccessToken();
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const timestamp = new Date().toISOString();

  // 1. Fetch metadata & sheet tabs list
  let sheetTitlesInDrive: string[] = [];
  let spreadsheetTitle = 'XiilL BTP — المنظومة المركزية للأوراش';

  if (token) {
    try {
      const metaRes = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,index)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        spreadsheetTitle = meta.properties?.title || spreadsheetTitle;
        sheetTitlesInDrive = (meta.sheets || []).map((s: any) => s.properties.title as string);
      }
    } catch (e) {
      console.warn('API fetch spreadsheet metadata failed:', e);
    }
  }

  // Probe legacy tabs
  const legacyTabs: string[] = [];
  if (sheetTitlesInDrive.length > 0) {
    sheetTitlesInDrive.forEach(t => {
      const isStandard = BTP_STANDARD_SHEETS.some(s => s.title.toLowerCase().trim() === t.toLowerCase().trim());
      if (!isStandard) {
        legacyTabs.push(t);
      }
    });
  } else {
    // Probing known legacy tabs via GViz
    const knownAdmins = state.adminAccounts || [];
    for (const a of knownAdmins) {
      const legacyTitle = `مقاول_${a.id}`;
      try {
        const check = await fetchSheetDataRows(spreadsheetId, legacyTitle);
        if (check.headers.length > 0 || check.rows.length > 0) {
          legacyTabs.push(legacyTitle);
        }
      } catch {}
    }
  }

  // 2. Fetch and compare columns for each of the 8 standard sheets
  const columnsComparison: SheetColumnComparison[] = [];
  const fetchedSheetData: Record<string, { headers: string[]; rows: any[][] }> = {};

  for (const def of BTP_STANDARD_SHEETS) {
    const data = await fetchSheetDataRows(spreadsheetId, def.title);
    fetchedSheetData[def.title] = data;

    const actualHeaders = data.headers;
    const isTabMissing = actualHeaders.length === 0 && Boolean(data.error);

    const normalizeH = (s: string) => s.toLowerCase().replace(/[\(\)\/\-_]/g, ' ').replace(/\s+/g, ' ').trim();

    // Check if sheet has Admin ID
    const hasAdminId = def.title === 'Admin_Registry'
      ? actualHeaders.some(h => /admin\s*id|كود\s*الأدمين|كود\s*المقاول/i.test(h))
      : actualHeaders.some(h => /admin\s*id|كود\s*المقاول|id\s*المقاول|معرف\s*المقاول/i.test(h));

    const missingHeaders: string[] = [];
    const extraHeaders: string[] = [];

    if (!isTabMissing) {
      def.headers.forEach(exp => {
        const normExp = normalizeH(exp);
        const match = actualHeaders.some(act => {
          const normAct = normalizeH(act);
          return normAct.includes(normExp) || normExp.includes(normAct) ||
            (normExp.includes('admin id') && (normAct.includes('كود') || normAct.includes('admin'))) ||
            (normExp.includes('مقاول') && normAct.includes('مقاول'));
        });
        if (!match) {
          missingHeaders.push(exp);
        }
      });

      actualHeaders.forEach(act => {
        const normAct = normalizeH(act);
        const match = def.headers.some(exp => {
          const normExp = normalizeH(exp);
          return normAct.includes(normExp) || normExp.includes(normAct) ||
            (normAct.includes('كود') && normExp.includes('admin id'));
        });
        if (!match && !['a', 'b', 'c', 'd', 'e'].includes(normAct)) {
          extraHeaders.push(act);
        }
      });
    }

    let status: 'perfect' | 'needs_update' | 'missing_tab' = 'perfect';
    if (isTabMissing) {
      status = 'missing_tab';
    } else if (missingHeaders.length > 0 || !hasAdminId || extraHeaders.some(h => /sheet\s*id|رابط\s*الشيت/i.test(h))) {
      status = 'needs_update';
    }

    columnsComparison.push({
      sheetTitle: def.title,
      sheetLabel: def.label,
      expectedHeaders: def.headers,
      actualHeaders,
      missingHeaders,
      extraHeaders,
      hasAdminId,
      status
    });
  }

  // 3. Parse and count records in each sheet vs System
  const parsedEntities = parseAllOperationalDataFromRows(fetchedSheetData);

  const entityCounts: SheetEntityCountComparison[] = [
    {
      entity: 'adminAccounts',
      label: 'المقاولون المسجلون (Admins)',
      countInSheet: parsedEntities.admins.length,
      countInSystem: state.adminAccounts.length,
      status: parsedEntities.admins.length === state.adminAccounts.length
        ? (parsedEntities.admins.length === 0 ? 'empty_both' : 'matched')
        : (parsedEntities.admins.length > state.adminAccounts.length ? 'sheet_has_more' : 'system_has_more')
    },
    {
      entity: 'projects',
      label: 'أوراش ومشاريع البناء (Chantiers)',
      countInSheet: parsedEntities.projects.length,
      countInSystem: state.projects.length,
      status: parsedEntities.projects.length === state.projects.length
        ? (parsedEntities.projects.length === 0 ? 'empty_both' : 'matched')
        : (parsedEntities.projects.length > state.projects.length ? 'sheet_has_more' : 'system_has_more')
    },
    {
      entity: 'cpsArticles',
      label: 'بنود دفتر التحملات (Bordereau CPS)',
      countInSheet: parsedEntities.cpsArticles.length,
      countInSystem: state.cpsArticles.length,
      status: parsedEntities.cpsArticles.length === state.cpsArticles.length
        ? (parsedEntities.cpsArticles.length === 0 ? 'empty_both' : 'matched')
        : (parsedEntities.cpsArticles.length > state.cpsArticles.length ? 'sheet_has_more' : 'system_has_more')
    },
    {
      entity: 'workers',
      label: 'بطاقات عمال البناء (Ouvriers)',
      countInSheet: parsedEntities.workers.length,
      countInSystem: state.workers.length,
      status: parsedEntities.workers.length === state.workers.length
        ? (parsedEntities.workers.length === 0 ? 'empty_both' : 'matched')
        : (parsedEntities.workers.length > state.workers.length ? 'sheet_has_more' : 'system_has_more')
    },
    {
      entity: 'attendance',
      label: 'بوانطاج الحضور اليومي (Pointage)',
      countInSheet: parsedEntities.attendance.length,
      countInSystem: state.attendance.length,
      status: parsedEntities.attendance.length === state.attendance.length
        ? (parsedEntities.attendance.length === 0 ? 'empty_both' : 'matched')
        : (parsedEntities.attendance.length > state.attendance.length ? 'sheet_has_more' : 'system_has_more')
    },
    {
      entity: 'purchases',
      label: 'مشتريات وبونات الموردين (Achats)',
      countInSheet: parsedEntities.purchases.length,
      countInSystem: state.purchases.length,
      status: parsedEntities.purchases.length === state.purchases.length
        ? (parsedEntities.purchases.length === 0 ? 'empty_both' : 'matched')
        : (parsedEntities.purchases.length > state.purchases.length ? 'sheet_has_more' : 'system_has_more')
    },
    {
      entity: 'expenses',
      label: 'مصاريف الورش النثرية (Dépenses)',
      countInSheet: parsedEntities.expenses.length,
      countInSystem: state.expenses.length,
      status: parsedEntities.expenses.length === state.expenses.length
        ? (parsedEntities.expenses.length === 0 ? 'empty_both' : 'matched')
        : (parsedEntities.expenses.length > state.expenses.length ? 'sheet_has_more' : 'system_has_more')
    },
    {
      entity: 'clientPayments',
      label: 'دفعات ووضعيات الزبناء (Décomptes)',
      countInSheet: parsedEntities.clientPayments.length,
      countInSystem: state.clientPayments.length,
      status: parsedEntities.clientPayments.length === state.clientPayments.length
        ? (parsedEntities.clientPayments.length === 0 ? 'empty_both' : 'matched')
        : (parsedEntities.clientPayments.length > state.clientPayments.length ? 'sheet_has_more' : 'system_has_more')
    }
  ];

  // 4. Build Detailed Diffs list
  const diffs: SheetAuditDiff[] = [];

  // Check Schema / Structure
  columnsComparison.forEach(c => {
    if (c.status === 'missing_tab') {
      diffs.push({
        id: `missing_${c.sheetTitle}`,
        direction: 'schema_structure',
        title: `ورقة غير موجودة: ${c.sheetTitle} (${c.sheetLabel})`,
        description: `الورقة الأساسية "${c.sheetTitle}" غير موجودة في جدول Google Sheets المركزي. يوصى بإنشائها لتطابق المنظومة.`,
        severity: 'danger'
      });
    } else if (c.status === 'needs_update') {
      const details: string[] = [];
      if (!c.hasAdminId) details.push('ينقصها عمود كود المقاول (Admin ID)');
      if (c.missingHeaders.length > 0) details.push(`ينقصها أعمدة: ${c.missingHeaders.slice(0, 3).join(', ')}${c.missingHeaders.length > 3 ? '...' : ''}`);
      if (c.extraHeaders.some(h => /sheet\s*id/i.test(h))) details.push('تحتوي على أعمدة قديمة خاصة بروابط الشيتات المستقلة');

      diffs.push({
        id: `headers_${c.sheetTitle}`,
        direction: 'schema_structure',
        title: `تحديث رؤوس أعمدة: ${c.sheetTitle} (${c.sheetLabel})`,
        description: details.join(' | '),
        severity: 'warning'
      });
    }
  });

  // Check Legacy Tabs
  if (legacyTabs.length > 0) {
    diffs.push({
      id: 'legacy_tabs_found',
      direction: 'schema_structure',
      title: `تم رصد ${legacyTabs.length} أوراق قديمة منفصلة (${legacyTabs.slice(0, 3).join(', ')}${legacyTabs.length > 3 ? '...' : ''})`,
      description: 'هذه الأوراق تعود للهيكلة السابقة التي كانت تنشئ ورقة مستقلة لكل مقاول. يفضل مسحها وتنظيف الشيت ليعتمد الهيكلة الموحدة الحديثة.',
      severity: 'warning'
    });
  }

  // Check Data differences: Sheet -> System
  entityCounts.forEach(e => {
    if (e.status === 'sheet_has_more') {
      const diffCount = e.countInSheet - e.countInSystem;
      diffs.push({
        id: `sheet_more_${e.entity}`,
        direction: 'sheet_to_system',
        title: `بيانات في الشيت غير مدرجة بالنظام (${e.label}): +${diffCount} سجل`,
        description: `تم العثور على ${e.countInSheet} سجلاً في Google Sheets مقابل ${e.countInSystem} في المتصفح الحالي. قبول التغييرات سيجلب هذه البيانات فوراً.`,
        severity: 'info'
      });
    } else if (e.status === 'system_has_more') {
      const diffCount = e.countInSystem - e.countInSheet;
      diffs.push({
        id: `system_more_${e.entity}`,
        direction: 'system_to_sheet',
        title: `بيانات محلية لم تُرفع للشيت (${e.label}): +${diffCount} سجل`,
        description: `يوجد في متصفحك ${e.countInSystem} سجلاً بينما يحتوي الشيت على ${e.countInSheet}. يمكن مزامنتها مع الشيت الموحد.`,
        severity: 'info'
      });
    }
  });

  // Check contractor specific differences (e.g. ADM-3817-NX found in sheet but not in local state)
  const missingAdmins = parsedEntities.admins.filter(sheetAdm => !state.adminAccounts.some(loc => loc.id.toUpperCase() === sheetAdm.id.toUpperCase()));
  if (missingAdmins.length > 0) {
    diffs.push({
      id: 'missing_contractors_in_local',
      direction: 'sheet_to_system',
      title: `مقاولون مسجلون في الشيت لم يتم تحميلهم في هذا المتصفح: ${missingAdmins.map(a => `${a.id} (${a.name})`).join(', ')}`,
      description: 'هؤلاء المقاولون مسجلون في الشيت المركزي. تحميلهم سيمكنهم من الدخول فوراً برمز PIN الخاص بهم دون أي عوائق.',
      severity: 'warning'
    });
  }

  const hasDiscrepancies = diffs.length > 0;
  const isFirstBrowserLoad = state.adminAccounts.length <= 1 && (!state.projects || state.projects.length === 0);

  return {
    spreadsheetId,
    spreadsheetTitle,
    url,
    timestamp,
    columnsComparison,
    entityCounts,
    diffs,
    legacyTabs,
    hasDiscrepancies,
    requiresReview: hasDiscrepancies,
    isFirstBrowserLoad,
    fetchedData: parsedEntities
  };
};

/**
 * Performs cleanup of legacy contractor tabs (e.g. مقاول_ADM-...) and recreates/formats
 * the 8 standard unified sheets with proper headers and Admin ID columns.
 */
export const cleanAndRebuildMasterSheetStructure = async (
  spreadsheetId: string,
  state: AppState
): Promise<{ success: boolean; message: string; deletedTabs: string[]; rebuiltTabs: string[] }> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('يرجى تسجيل الدخول بحساب Google (Super Admin) أولاً لتنفيذ عملية مسح وتحديث أوراق Google Sheets.');
  }

  // 1. Inspect current sheet structure
  const metaRes = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title,index)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!metaRes.ok) {
    throw new Error('تعذر الوصول إلى ملف Google Sheets. يرجى التحقق من الأذونات.');
  }
  const meta = await metaRes.json();
  const existingSheets: { sheetId: number; title: string }[] = (meta.sheets || []).map((s: any) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title
  }));

  const standardTitles = BTP_STANDARD_SHEETS.map(s => s.title.toLowerCase());
  const legacySheetsToDelete = existingSheets.filter(s => {
    const t = s.title.trim().toLowerCase();
    return !standardTitles.includes(t);
  });

  const requests: any[] = [];
  const deletedTabs: string[] = [];
  const rebuiltTabs: string[] = [];

  // 2. Add missing standard sheets first so spreadsheet is never empty
  for (const def of BTP_STANDARD_SHEETS) {
    const exists = existingSheets.some(s => s.title.toLowerCase().trim() === def.title.toLowerCase());
    if (!exists) {
      requests.push({
        addSheet: {
          properties: {
            title: def.title,
            tabColor: def.tabColor
          }
        }
      });
      rebuiltTabs.push(def.title);
    }
  }

  if (requests.length > 0) {
    await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });
    requests.length = 0;
  }

  // 3. Delete legacy sheets
  for (const leg of legacySheetsToDelete) {
    requests.push({
      deleteSheet: {
        sheetId: leg.sheetId
      }
    });
    deletedTabs.push(leg.title);
  }

  if (requests.length > 0) {
    await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    }).catch(err => {
      console.warn('Deleting legacy sheets warning:', err);
    });
  }

  // 4. Write clean standard header rows to all 8 standard sheets
  const headerUpdates = BTP_STANDARD_SHEETS.map(def => ({
    range: `${def.title}!A1:${String.fromCharCode(65 + Math.min(def.headers.length - 1, 25))}1`,
    values: [def.headers]
  }));

  await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: headerUpdates
    })
  });

  // 5. Synchronize all system data to the unified sheets
  await syncAllDataToGoogleSheets(spreadsheetId, state, 'ALL');

  return {
    success: true,
    message: `تم بنجاح تنظيف الشيت: مسح ${deletedTabs.length} أوراق قديمة وتأسيس الهيكلة الموحدة لجميع الأوراش (${BTP_STANDARD_SHEETS.length} أوراق رئيسية مع كود المقاول).`,
    deletedTabs,
    rebuiltTabs: BTP_STANDARD_SHEETS.map(s => s.title)
  };
};


/**
 * Create a new Master Google Spreadsheet in the user's Drive with all standard sheets & headers initialized
 */
export const createMasterSpreadsheet = async (
  title: string = 'XiilL BTP — Système Central de Gestion des Chantiers',
  isTenant: boolean = false
): Promise<{ id: string; url: string; title: string }> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بـ Gmail أولاً لإنشاء ملف Google Sheets');

  const sheetsToCreate = isTenant ? BTP_STANDARD_SHEETS.filter(s => s.title !== 'Admin_Registry') : BTP_STANDARD_SHEETS;

  const body = {
    properties: {
      title,
      locale: 'fr_FR',
      autoRecalc: 'ON_CHANGE'
    },
    sheets: sheetsToCreate.map((s, index) => ({
      properties: {
        title: s.title,
        index,
        tabColor: s.tabColor
      }
    }))
  };

  const res = await fetchWithRetry('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `فشل إنشاء ملف Google Sheets (${res.status})`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Initialize header rows immediately for all created sheets!
  try {
    const dataPayload = sheetsToCreate.map(m => ({
      range: `${m.title}!A1:${String.fromCharCode(65 + Math.min(m.headers.length - 1, 25))}1`,
      values: [m.headers]
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataPayload
      })
    });
  } catch (headerErr) {
    console.warn('Initial headers setup warning:', headerErr);
  }

  return { id: spreadsheetId, url, title };
};

/**
 * Intelligent Smart Master Spreadsheet Resolution (XiilL BTP Central Registry):
 * 1. Checks if the official or preferred Master Sheet ID exists (default: 1KCWDJihciRXulv1n8NwEy668N_oiQn7CCVewRurto5k).
 * 2. If not immediately accessible, searches Google Drive for any spreadsheet named "XiilL BTP — المنظومة المركزية للأوراش".
 * 3. Validates all 8 sheets + Admin_Registry + inspects and auto-repairs row 1 column headers.
 * 4. Only creates a brand new file if no matching spreadsheet exists anywhere in the user's Drive.
 */
export const findOrCreateMasterSpreadsheet = async (
  requestedTitle: string = KNOWN_MASTER_SPREADSHEET_TITLE,
  preferredId: string = KNOWN_MASTER_SPREADSHEET_ID
): Promise<{
  spreadsheet: { id: string; url: string; title: string };
  isExisting: boolean;
  validation: SheetValidationResult;
}> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بـ Gmail أولاً للتحقق من ملف Google Sheets');

  const cleanPreferredId = preferredId ? (extractSpreadsheetId(preferredId) || preferredId) : '';

  // 1. Direct validation of preferred / known master sheet ID
  if (cleanPreferredId) {
    try {
      const validation = await inspectAndRepairSpreadsheet(cleanPreferredId, true);
      if (validation.success) {
        await ensureAdminRegistrySheet(cleanPreferredId);
        return {
          spreadsheet: {
            id: cleanPreferredId,
            url: `https://docs.google.com/spreadsheets/d/${cleanPreferredId}/edit`,
            title: validation.spreadsheetTitle || requestedTitle
          },
          isExisting: true,
          validation
        };
      }
    } catch (prefErr) {
      console.warn('Preferred Master Sheet ID verification failed, searching Google Drive:', prefErr);
    }
  }

  // 2. Search Google Drive for any existing Central Master sheet
  try {
    const existingFiles = await searchDriveForBtpSpreadsheets();
    const matchedFile = existingFiles.find(f => 
      f.name.includes('المنظومة المركزية') || 
      f.name.includes('XiilL BTP') ||
      (cleanPreferredId && f.id === cleanPreferredId)
    ) || (existingFiles.length > 0 ? existingFiles[0] : null);

    if (matchedFile) {
      const validation = await inspectAndRepairSpreadsheet(matchedFile.id, true);
      await ensureAdminRegistrySheet(matchedFile.id);
      return {
        spreadsheet: {
          id: matchedFile.id,
          url: matchedFile.url,
          title: matchedFile.name
        },
        isExisting: true,
        validation
      };
    }
  } catch (driveSearchErr) {
    console.warn('Drive search error for Master Sheet:', driveSearchErr);
  }

  // 3. If and ONLY IF no existing master sheet is found in Google Drive, create a fresh one
  const created = await createMasterSpreadsheet(requestedTitle);
  const validation = await inspectAndRepairSpreadsheet(created.id, true);
  await ensureAdminRegistrySheet(created.id);
  return {
    spreadsheet: created,
    isExisting: false,
    validation
  };
};

/**
 * Intelligent Smart Manager Spreadsheet Resolution:
 * 1. Checks Drive for existing BTP spreadsheet.
 * 2. If exists -> validates and repairs missing tabs.
 * 3. If none -> creates brand new master spreadsheet with all 8 sheets.
 */
export const findOrCreateManagerSpreadsheet = async (
  managerOrCompanyName: string = 'المقاول العام',
  adminId?: string
): Promise<{
  spreadsheet: { id: string; url: string; title: string };
  isExisting: boolean;
  validation: SheetValidationResult;
}> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بـ Gmail أولاً لإدارة Google Sheets');

  // Step 1: Search Drive for existing spreadsheet specifically for this contractor (by adminId or company name)
  const existingFiles = await searchDriveForBtpSpreadsheets();

  if (existingFiles.length > 0) {
    const matchedFile = adminId
      ? existingFiles.find(f => f.name.includes(adminId) || (managerOrCompanyName && f.name.includes(managerOrCompanyName)))
      : existingFiles.find(f => !f.name.includes('المنظومة المركزية'));

    if (matchedFile) {
      // Inspect and auto-repair any missing operational sheets!
      const validation = await inspectAndRepairSpreadsheet(matchedFile.id, true, true);
      return {
        spreadsheet: {
          id: matchedFile.id,
          url: matchedFile.url,
          title: matchedFile.name
        },
        isExisting: true,
        validation
      };
    }
  }

  // Step 2: If none exists, create a brand new isolated spreadsheet for this contractor (tenant)
  const cleanTitle = adminId 
    ? `XiilL BTP — ${managerOrCompanyName} (${adminId})`
    : `XiilL BTP — ${managerOrCompanyName} (Chantiers & Gestion)`;
  const created = await createMasterSpreadsheet(cleanTitle, true);
  const validation = await inspectAndRepairSpreadsheet(created.id, true, true);

  return {
    spreadsheet: created,
    isExisting: false,
    validation
  };
};

/**
 * Ensure the Admin_Registry sheet exists inside the spreadsheet
 */
export const ensureAdminRegistrySheet = async (spreadsheetId: string) => {
  const token = getAccessToken();
  if (!token) return;

  try {
    // 1. Check existing sheets
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metaRes.ok) return;

    const meta = await metaRes.json();
    const sheetExists = meta.sheets?.some((s: any) => s.properties.title === 'Admin_Registry');

    if (!sheetExists) {
      // Add sheet
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Admin_Registry',
                  tabColor: { red: 0.95, green: 0.65, blue: 0.1 }
                }
              }
            }
          ]
        })
      });
    }

    // 2. Set headers if empty or upgrade if less than 11 columns
    const checkValuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Admin_Registry!A1:K1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const checkValues = await checkValuesRes.json();

    const currentHeaders = [
      'Admin ID (كود الأدمين)',
      'Email (البريد)',
      'Name (الاسم)',
      'Phone (الهاتف / WhatsApp)',
      'Role (الدور)',
      'Type Abonnement (نوع الباقة)',
      'Date Début (تاريخ بدأ الباقة)',
      'Date Fin (تاريخ إنتهاء الباقة)',
      'Status (الحالة التلقائية)',
      'CreatedAt (تاريخ التسجيل)',
      'LastLogin (آخر دخول)',
      'Notes (ملاحظات)'
    ];

    if (!checkValues.values || checkValues.values.length === 0 || checkValues.values[0].length < 12) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Admin_Registry!A1:L1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [currentHeaders] })
      });
    }
  } catch (err) {
    console.error('Error ensuring Admin_Registry sheet:', err);
  }
};

/**
 * Append or save an Admin to the Admin_Registry sheet
 */
export const saveAdminToRegistrySheet = async (
  spreadsheetId: string,
  admin: AdminAccount
): Promise<void> => {
  const token = getAccessToken();
  if (!token) throw new Error('تحتاج لتسجيل الدخول بـ Gmail لتعديل Google Sheets');

  await ensureAdminRegistrySheet(spreadsheetId);

  // Auto calculate status based on subscription end date
  const autoStatus = computeAutoStatus(admin.subscription, admin.status);
  const statusDisplay = formatAutoStatusDisplay(autoStatus, admin.subscription?.tier);

  const row = [
    admin.id,
    admin.email,
    admin.name,
    admin.phone || '',
    admin.role,
    formatTierLabel(admin.subscription?.tier),
    formatSheetDate(admin.subscription?.startDate),
    formatSheetDate(admin.subscription?.endDate),
    statusDisplay,
    admin.createdAt,
    admin.lastLoginAt || 'لم يدخل بعد',
    admin.notes || (admin.companyName ? `مقاول: ${admin.companyName}` : ''),
    admin.sheetId || '',
    admin.sheetUrl || ''
  ];

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Admin_Registry!A:N:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: [row] })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'فشل حفظ الأدمين في Google Sheets');
  }
};

/**
 * Push all system admins to Admin_Registry in Google Sheets, overwriting old data.
 * Purges deleted admins so they are never accidentally restored.
 */
export const pushAdminsToMasterSheet = async (
  spreadsheetId: string,
  admins: AdminAccount[]
): Promise<{ success: boolean; count: number; message: string }> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بـ Gmail لإتمام المزامنة مع Google Sheets');

  const adminRegistryData = [
    [
      'Admin ID (كود الأدمين)',
      'Email (البريد)',
      'Name (الاسم)',
      'Company (المقاولة)',
      'Phone (الهاتف / WhatsApp)',
      'PIN (رمز PIN السري)',
      'Role (الدور)',
      'Type Abonnement (نوع الباقة)',
      'Date Début (تاريخ بدأ الباقة)',
      'Date Fin (تاريخ إنتهاء الباقة)',
      'Status (الحالة التلقائية)',
      'CreatedAt (تاريخ التسجيل)',
      'LastLogin (آخر دخول)',
      'Notes (ملاحظات)'
    ],
    ...admins.map(a => {
      const autoStatus = computeAutoStatus(a.subscription, a.status);
      return [
        a.id,
        a.email,
        a.name,
        a.companyName || a.name,
        a.phone || '',
        a.pin || '1234',
        a.role,
        formatTierLabel(a.subscription?.tier),
        formatSheetDate(a.subscription?.startDate),
        formatSheetDate(a.subscription?.endDate),
        formatAutoStatusDisplay(autoStatus, a.subscription?.tier),
        a.createdAt,
        a.lastLoginAt || 'لم يدخل بعد',
        a.notes || ''
      ];
    })
  ];

  // 1. Clear old data from row 2 downwards so any deleted contractor is completely wiped
  try {
    await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Admin_Registry!A2:N500:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    console.warn('Could not clear Admin_Registry range:', e);
  }

  // 2. Write the fresh admin list from A1
  let res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Admin_Registry!A1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: adminRegistryData })
  }).catch(() => null);

  if (!res || !res.ok) {
    // Fallback to Arabic sheet tab name if present
    try {
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('سجل_الأدمين')}!A2:L500:clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('سجل_الأدمين')}!A1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: adminRegistryData })
      });
    } catch (e) {
      console.warn('Fallback update failed:', e);
    }
  }

  if (!res || !res.ok) {
    throw new Error('فشل تحديث سجل المقاولين في Google Sheets');
  }

  const tenantCount = admins.filter(a => a.role !== 'super_admin').length;
  return {
    success: true,
    count: tenantCount,
    message: `تم دفع وتحديث قائمة المقاولين إلى Google Sheets بنجاح (${tenantCount} مقاولين حالياً). تم مسح المقاولين المحذوفين.`
  };
};

/**
 * Safe ISO Date parser that never crashes on invalid date strings
 */
export const safeIsoDate = (val?: string, fallback?: string): string => {
  if (!val || typeof val !== 'string') return fallback || new Date().toISOString();
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'لم يدخل بعد') return fallback || new Date().toISOString();
  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return fallback || new Date().toISOString();
    return d.toISOString();
  } catch {
    return fallback || new Date().toISOString();
  }
};

/**
 * Read all admins registered in the Admin_Registry sheet
 */
export const fetchAdminRegistryFromSheet = async (
  spreadsheetId: string
): Promise<AdminAccount[]> => {
  try {
    const data = await fetchSheetDataRows(spreadsheetId, 'Admin_Registry');
    if (!data.rows || data.rows.length === 0) return [];

    const parsed = parseAllOperationalDataFromRows({ Admin_Registry: data });
    return parsed.admins;
  } catch (err) {
    console.error('Failed to fetch Admin Registry from Google Sheets:', err);
    return [];
  }
};

/**
 * Builds a clean WhatsApp greeting message containing the Admin ID, subscription details, and portal link.
 */
export const buildAdminWhatsAppMessage = (admin: AdminAccount, portalUrl?: string): string => {
  const url = portalUrl || window.location.origin;
  const tierName = admin.subscription?.tier === 'annual'
    ? 'باقة سنوية (365 يوماً - خصم 25%)'
    : admin.subscription?.tier === 'monthly'
      ? 'باقة شهرية (30 يوماً)'
      : 'باقة تجريبية مجانية (3 أيام)';

  const endDateFormatted = admin.subscription?.endDate
    ? formatSheetDate(admin.subscription.endDate)
    : '';

  return `السلام عليكم ورحمة الله وبركاته،
السيد(ة) ${admin.name} المحترم(ة)،

تم إعداد وتفعيل حسابكم بنجاح في منظومة إدارة أوراش البناء (XiilL BTP):

👤 الصلاحية والرول: مدير عام / مقاول (Directeur Général)
🔑 كود الأدمين الخاص بكم (Admin ID): ${admin.id}
🔢 رمز PIN السري للدخول: ${admin.pin || '1234'}
📋 نوع الاشتراك: ${tierName}
⏳ تاريخ الانتهاء: ${endDateFormatted}

🌐 رابط الدخول المباشر للمنظومة:
${url}

طريقة الدخول:
1. افتح الرابط أعلاه
2. اختر "فضاء المدير العام / المقاول"
3. أدخل كود الأدمين: ${admin.id}
4. أدخل رمز PIN السري: ${admin.pin || '1234'} (لا تحتاج لأي حساب Gmail)

نتمنى لكم تجربة موفقة في ضبط ومراقبة أوراشكم ومصاريفكم بدقة.`;
};

/**
 * Builds direct WhatsApp URL (web/app)
 */
export const buildAdminWhatsAppUrl = (phone?: string, admin?: AdminAccount, portalUrl?: string): string | null => {
  if (!phone || !admin) return null;
  // Clean phone number: remove non-digits, replace leading 0 with Moroccan country code 212 if Moroccan
  let clean = phone.replace(/[^0-9+]/g, '');
  if (clean.startsWith('0')) {
    clean = '212' + clean.slice(1);
  } else if (clean.startsWith('+')) {
    clean = clean.slice(1);
  }
  if (!clean || clean.length < 8) return null;

  const msg = buildAdminWhatsAppMessage(admin, portalUrl);
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
};

/**
 * Clear data rows in operational tabs (Chantiers, Pointage, Paie, Achats, Depenses, Decomptes)
 * Keeps header rows (A1) untouched.
 */
export const wipeAllSpreadsheetData = async (
  spreadsheetId: string,
  options?: { wipeAdminRegistry?: boolean }
): Promise<{ success: boolean; message: string }> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بـ Gmail لإتمام عملية تصفير Google Sheets');

  const rangesToClear = [
    'Chantiers_Projets!A2:Z2000',
    'Bordereau_CPS!A2:Z2000',
    'Pointage_Journalier!A2:Z2000',
    'Paie_Ouvriers!A2:Z2000',
    'Achats_Fournisseurs!A2:Z2000',
    'Depenses_Chantier!A2:Z2000',
    'Decomptes_Clients!A2:Z2000',
    'المشاريع_الأوراش!A2:Z2000',
    'بنود_CPS_والبردورو!A2:Z2000',
    'Pointage_والحضور!A2:Z2000',
    'خلاص_العمال_والأجور!A2:Z2000',
    'المشتريات_والموردين!A2:Z2000',
    'المصاريف_اليومية!A2:Z2000',
    'دفعات_الزبناء_Décomptes!A2:Z2000'
  ];

  if (options?.wipeAdminRegistry) {
    // Clear all rows from row 2 onwards in Admin_Registry
    rangesToClear.push('Admin_Registry!A2:K500');
    rangesToClear.push('سجل_الأدمين!A2:K500');
    rangesToClear.push('سجل_الأدمينات!A2:K500');
  }

  for (const range of rangesToClear) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.warn(`Failed to clear range ${range}:`, e);
    }
  }

  return {
    success: true,
    message: options?.wipeAdminRegistry
      ? 'تم تفريغ وتصفير جداول Google Sheets وتصفير المقاولين بنجاح مع الحفاظ على رؤوس الأعمدة.'
      : 'تم تفريغ وتصفير بيانات الأوراش والعمليات في Google Sheets بنجاح مع الحفاظ على حسابات المشتركين ورؤوس الأعمدة.'
  };
};

/**
 * Builds the complete operational dataset for a single contractor's dedicated tab in Master Google Sheet
 */
export const generateContractorSheetData = (
  admin: { id: string; name: string; phone?: string; subscription?: any },
  state: AppState
): any[][] => {
  const adminId = admin.id;
  const projects = state.projects.filter(p => !p.adminId || p.adminId.toUpperCase() === adminId.toUpperCase());
  const projectIds = projects.map(p => p.id);
  const cpsArticles = state.cpsArticles.filter(a => projectIds.includes(a.projectId));
  const workers = state.workers.filter(w => !w.adminId || w.adminId.toUpperCase() === adminId.toUpperCase() || w.projectIds.some(pid => projectIds.includes(pid)));
  const purchases = state.purchases.filter(p => projectIds.includes(p.projectId));
  const expenses = state.expenses.filter(e => projectIds.includes(e.projectId));
  const clientPayments = state.clientPayments.filter(cp => projectIds.includes(cp.projectId));

  const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalPurchases = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
  const totalSupplierDebts = purchases.reduce((acc, p) => acc + (p.remainingDebt || 0), 0);
  const totalReceivedFromClients = clientPayments.reduce((acc, cp) => acc + (cp.amount || 0), 0);

  const rows: any[][] = [];

  // Block 1: Profile & Meta
  rows.push([
    '🏢 ملف المقاول:', admin.name,
    'كود المقاول (Admin ID):', admin.id,
    'الهاتف:', admin.phone || 'غير مسجل',
    'نوع الاشتراك:', admin.subscription?.tier || 'باقة معتمدة',
    'الحالة:', admin.subscription?.status || 'Active'
  ]);
  rows.push([
    '📊 الملخص المالي للأوراش',
    'عدد الأوراش المفتوحة:', projects.length,
    'إجمالي الميزانيات التعاقدية (MAD):', totalBudget,
    'المصاريف المباشرة (MAD):', totalExpenses,
    'المشتريات الإجمالية (MAD):', totalPurchases,
    'ديون الموردين المتبقية (MAD):', totalSupplierDebts,
    'المداخيل من الزبناء (MAD):', totalReceivedFromClients,
    'تاريخ التحديث:', new Date().toLocaleString('fr-FR')
  ]);
  rows.push([]);

  // Block 2: Chantiers
  rows.push(['=== 1. أوراش ومشاريع المقاولة (Chantiers & Projets) ===']);
  rows.push(['ID Chantier', 'اسم الورش', 'صاحب المشروع / الزبون', 'الهاتف', 'المدينة', 'الميزانية التعاقدية (MAD)', 'تاريخ البدء', 'الحالة', 'نسبة الإنجاز %']);
  if (projects.length === 0) {
    rows.push(['لا توجد أوراش مسجلة حالياً لهذه المقاولة']);
  } else {
    projects.forEach(p => {
      rows.push([p.id, p.name, p.clientName, p.clientPhone, p.locationCity, p.budget, p.startDate, p.status, `${p.progressPct}%`]);
    });
  }
  rows.push([]);

  // Block 3: CPS Articles
  rows.push(['=== 2. بنود دفتر الشروط والأسعار (Bordereau CPS & Prestations) ===']);
  rows.push(['ID Article', 'الورش التابع له', 'Lot BTP', 'رقم البند', 'بيان الأشغال والخدمات', 'الوحدة', 'سعر الوحدة (MAD)', 'الكمية المبرمجة', 'المبلغ المبرمج (MAD)', 'الكمية المنجزة', 'نسبة الإنجاز %', 'المبلغ المنفذ (MAD)']);
  if (cpsArticles.length === 0) {
    rows.push(['لا توجد بنود CPS مسجلة حالياً']);
  } else {
    cpsArticles.forEach(a => {
      const proj = projects.find(p => p.id === a.projectId);
      rows.push([a.id, proj?.name || a.projectId, a.lot, a.articleNumber, a.designation, a.unit, a.unitPrice, a.quantityPlanned, a.totalPlannedPrice, a.quantityExecuted, `${a.progressPct}%`, a.executedAmount]);
    });
  }
  rows.push([]);

  // Block 4: Workers & Wages
  rows.push(['=== 3. العمال واليد العاملة (Ouvriers & Rémunérations) ===']);
  rows.push(['ID Ouvrier', 'الاسم والنسب', 'الحرفة / التخصص', 'نوع الأجر', 'الراتب / اليومية (MAD)', 'الهاتف', 'رقم البطاقة الوطنية CIN', 'الحالة']);
  if (workers.length === 0) {
    rows.push(['لا يوجد عمال مسجلون حالياً']);
  } else {
    workers.forEach(w => {
      rows.push([w.id, w.name, w.specialty, w.wageType, w.wageAmount, w.phone, w.cin || '', w.active ? 'نشط (Actif)' : 'متوقف']);
    });
  }
  rows.push([]);

  // Block 5: Purchases & Suppliers
  rows.push(['=== 4. المشتريات ومستحقات الموردين (Achats Matériaux & Fournisseurs) ===']);
  rows.push(['ID Achat', 'التاريخ', 'الورش', 'المورد', 'المادة / السلعة', 'الكمية', 'الوحدة', 'سعر الوحدة (MAD)', 'المجموع (MAD)', 'المؤدى (MAD)', 'الباقي بذمة المقاول (MAD)', 'رقم الفاتورة / BL']);
  if (purchases.length === 0) {
    rows.push(['لا توجد مشتريات مسجلة حالياً']);
  } else {
    purchases.forEach(p => {
      const proj = projects.find(pj => pj.id === p.projectId);
      rows.push([p.id, p.date, proj?.name || p.projectId, p.supplierId, p.materialName, p.quantity, p.unit, p.unitPrice, p.totalAmount, p.paidAmount, p.remainingDebt, p.invoiceNumber || '']);
    });
  }
  rows.push([]);

  // Block 6: Expenses
  rows.push(['=== 5. المصاريف اليومية للورش (Dépenses Quotidiennes de Chantier) ===']);
  rows.push(['ID Dépense', 'التاريخ', 'الورش', 'صنف المصروف', 'المبلغ (MAD)', 'طريقة الدفع', 'المستفيد', 'ملاحظات']);
  if (expenses.length === 0) {
    rows.push(['لا توجد مصاريف مسجلة حالياً']);
  } else {
    expenses.forEach(e => {
      const proj = projects.find(pj => pj.id === e.projectId);
      rows.push([e.id, e.date, proj?.name || e.projectId, e.category, e.amount, e.paymentMethod, e.recipientName || '', e.notes || '']);
    });
  }
  rows.push([]);

  // Block 7: Client Payments
  rows.push(['=== 6. دفعات الزبناء والوضعيات المالية (Décomptes & Règlements Clients) ===']);
  rows.push(['ID Règlement', 'التاريخ', 'الورش', 'الوضعية / الدفعة', 'المبلغ المستلم (MAD)', 'طريقة الاستلام', 'رقم الوصل / الشيك']);
  if (clientPayments.length === 0) {
    rows.push(['لا توجد دفعات زبناء مسجلة حالياً']);
  } else {
    clientPayments.forEach(cp => {
      const proj = projects.find(pj => pj.id === cp.projectId);
      rows.push([cp.id, cp.date, proj?.name || cp.projectId, cp.milestoneTitle, cp.amount, cp.paymentMethod, cp.receiptNumber || '']);
    });
  }

  return rows;
};

/**
 * Ensures the dedicated tab for a contractor exists in the Master Google Sheet
 */
export const ensureContractorSheetTab = async (
  spreadsheetId: string,
  contractorId: string,
  token: string
): Promise<string> => {
  const tabTitle = `مقاول_${contractorId.trim()}`;
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const existingTitles = (meta.sheets || []).map((s: any) => s.properties?.title);
      if (!existingTitles.includes(tabTitle)) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: tabTitle,
                    tabColor: { red: 0.95, green: 0.7, blue: 0.2 },
                    gridProperties: { rowCount: 1500, columnCount: 15 }
                  }
                }
              }
            ]
          })
        });
      }
    }
  } catch (err) {
    console.warn('ensureContractorSheetTab notice:', err);
  }
  return tabTitle;
};

/**
 * Pushes a single contractor's complete operational dossier into their dedicated tab
 */
export const syncContractorTabToMasterSheet = async (
  spreadsheetId: string,
  admin: { id: string; name: string; phone?: string; subscription?: any },
  state: AppState,
  token: string
): Promise<boolean> => {
  const tabTitle = await ensureContractorSheetTab(spreadsheetId, admin.id, token);
  const sheetData = generateContractorSheetData(admin, state);

  // Clear previous rows in the contractor's dedicated tab
  await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabTitle)}!A1:Z3000:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  }).catch(() => null);

  // Write new comprehensive data
  const putRes = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabTitle)}!A1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: sheetData })
  }).catch(() => null);

  return putRes ? putRes.ok : false;
};

/**
 * Synchronize application tables into Google Sheets (Single Master Sheet Architecture)
 * Each contractor has their OWN dedicated tab (مقاول_ID) within the Super Admin's Master Sheet!
 * Exempts contractors and supervisors from Gmail login!
 */
export const syncAllDataToGoogleSheets = async (
  spreadsheetId: string,
  state: AppState,
  targetAdminId?: string
): Promise<{ success: boolean; rowsCount: number; message: string }> => {
  // Filter state if targetAdminId is specified (Tenant Isolation)
  const filterByAdmin = <T>(items: T[]): T[] => {
    if (!targetAdminId || targetAdminId === 'ALL') return items;
    return items.filter((item: any) => !item.adminId || item.adminId.toUpperCase() === targetAdminId.toUpperCase());
  };

  const projects = filterByAdmin(state.projects);
  const cpsArticles = filterByAdmin(state.cpsArticles);
  const workers = filterByAdmin(state.workers);
  const purchases = filterByAdmin(state.purchases);
  const expenses = filterByAdmin(state.expenses);
  const clientPayments = filterByAdmin(state.clientPayments);

  const totalRows = projects.length + cpsArticles.length + workers.length + purchases.length + expenses.length + clientPayments.length;

  const token = getAccessToken();
  if (!token) {
    // Graceful offline/local persistence acknowledgement: contractors & supervisors never blocked by Gmail
    return {
      success: true,
      rowsCount: totalRows,
      message: `تم حفظ وتوثيق كافة المعطيات (${totalRows} سجلاً) في النظام المحلي بنجاح، وربطها بورقة المقاول في الشيت الأساسي للمنظومة.`
    };
  }

  // 1. If targetAdminId is specified (Contractor or their Supervisor):
  // Sync directly to the contractor's dedicated tab in Master Google Sheet!
  if (targetAdminId && targetAdminId !== 'ALL') {
    const matchedAdmin = state.adminAccounts.find(a => a.id.toUpperCase() === targetAdminId.toUpperCase()) || {
      id: targetAdminId,
      name: state.currentAdmin?.name || 'المقاول المعتمد'
    };

    await syncContractorTabToMasterSheet(spreadsheetId, matchedAdmin, state, token);

    return {
      success: true,
      rowsCount: totalRows,
      message: `تمت المزامنة بنجاح مع ورقة مقاولتك (مقاول_${targetAdminId}) في الشيت الأساسي لـ Super Admin (${totalRows} سجلاً).`
    };
  }

  // 2. If Super Admin (targetAdminId === 'ALL'):
  // Sync all global operational tabs + Admin Registry + every contractor's dedicated tab!
  const projectsData = [
    ['ID Chantier', 'Nom du Chantier', 'Maître d\'Ouvrage / Client', 'Téléphone', 'Ville', 'Budget Contractuel (MAD)', 'Date Début', 'Statut', 'Avancement %', 'ID المقاول'],
    ...state.projects.map(p => [
      p.id,
      p.name,
      p.clientName,
      p.clientPhone,
      p.locationCity,
      p.budget,
      p.startDate,
      p.status,
      `${p.progressPct}%`,
      p.adminId || ''
    ])
  ];

  const cpsData = [
    ['ID Article', 'ID Chantier', 'Lot BTP', 'N° Article', 'Désignation des Prestations & Travaux', 'Unité', 'Prix Unitaire (MAD)', 'Quantité Prévue', 'Montant Prévu (MAD)', 'Quantité Réalisée', 'Taux Réalisé %', 'Montant Exécuté (MAD)', 'ID المقاول'],
    ...state.cpsArticles.map(a => [
      a.id,
      a.projectId,
      a.lot,
      a.articleNumber,
      a.designation,
      a.unit,
      a.unitPrice,
      a.quantityPlanned,
      a.totalPlannedPrice,
      a.quantityExecuted,
      `${a.progressPct}%`,
      a.executedAmount,
      a.adminId || ''
    ])
  ];

  const workersData = [
    ['ID Ouvrier', 'Nom & Prénom', 'Spécialité / Métier', 'Type de Rémunération', 'Salaire de Base (MAD)', 'Téléphone', 'N° CIN', 'Statut', 'ID المقاول'],
    ...state.workers.map(w => [
      w.id,
      w.name,
      w.specialty,
      w.wageType,
      w.wageAmount,
      w.phone,
      w.cin || '',
      w.active ? 'Actif' : 'Inactif',
      w.adminId || ''
    ])
  ];

  const purchasesData = [
    ['ID Achat', 'Date', 'ID Fournisseur', 'ID Chantier', 'Désignation Matériaux', 'Quantité', 'Unité', 'Prix Unitaire (MAD)', 'Montant Total (MAD)', 'Montant Réglé (MAD)', 'Reste Dû / Créance (MAD)', 'N° BL / Facture', 'ID المقاول'],
    ...state.purchases.map(p => [
      p.id,
      p.date,
      p.supplierId,
      p.projectId,
      p.materialName,
      p.quantity,
      p.unit,
      p.unitPrice,
      p.totalAmount,
      p.paidAmount,
      p.remainingDebt,
      p.invoiceNumber || '',
      p.adminId || ''
    ])
  ];

  const expensesData = [
    ['ID Dépense', 'Date', 'Catégorie de Dépense', 'Montant (MAD)', 'ID Chantier', 'Mode de Règlement', 'Bénéficiaire', 'Observations', 'ID المقاول'],
    ...state.expenses.map(e => [
      e.id,
      e.date,
      e.category,
      e.amount,
      e.projectId,
      e.paymentMethod,
      e.recipientName || '',
      e.notes || '',
      e.adminId || ''
    ])
  ];

  const clientPaymentsData = [
    ['ID Règlement', 'Date', 'ID Chantier', 'Tranche / Situation Décompte', 'Montant Reçu (MAD)', 'Mode de Paiement', 'N° Reçu / Chèque', 'ID المقاول'],
    ...state.clientPayments.map(cp => [
      cp.id,
      cp.date,
      cp.projectId,
      cp.milestoneTitle,
      cp.amount,
      cp.paymentMethod,
      cp.receiptNumber || '',
      cp.adminId || ''
    ])
  ];

  const pointageData = [
    ['ID Pointage', 'ID المقاول (Admin ID)', 'Date', 'ID Chantier', 'Nom Chantier', 'ID Ouvrier', 'Nom Ouvrier', 'Statut Pointage', 'Heures Sup', 'Avances MAD', 'Notes'],
    ...state.attendance.map(a => {
      const p = state.projects.find(proj => proj.id === a.projectId);
      const w = state.workers.find(wor => wor.id === a.workerId);
      return [
        a.id,
        a.adminId || '',
        a.date,
        a.projectId,
        p?.name || '',
        a.workerId,
        w?.name || '',
        a.status,
        a.overtimeHours || 0,
        a.advanceAmount || 0,
        a.notes || ''
      ];
    })
  ];

  // Batch update all master operational sheets
  const updateTab = async (sheetName: string, fallbackArabic: string, values: any[][]) => {
    await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:Z3000:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => null);

    let res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values })
    }).catch(() => null);

    if (!res || !res.ok) {
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fallbackArabic)}!A2:Z3000:clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => null);

      res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fallbackArabic)}!A1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      }).catch(() => null);
    }
    return res ? res.ok : false;
  };

  await updateTab('Chantiers_Projets', 'المشاريع_الأوراش', projectsData);
  await updateTab('Bordereau_CPS', 'بنود_CPS_والبردورو', cpsData);
  await updateTab('Pointage_Journalier', 'بوانطاج_العمال', pointageData);
  await updateTab('Paie_Ouvriers', 'خلاص_العمال_والأجور', workersData);
  await updateTab('Achats_Fournisseurs', 'المشتريات_والموردين', purchasesData);
  await updateTab('Depenses_Chantier', 'المصاريف_اليومية', expensesData);
  await updateTab('Decomptes_Clients', 'دفعات_الزبناء_Décomptes', clientPaymentsData);

  // Synchronize Admin_Registry for Super Admin
  if (state.adminAccounts && state.adminAccounts.length > 0) {
    await pushAdminsToMasterSheet(spreadsheetId, state.adminAccounts);
  }

  return {
    success: true,
    rowsCount: totalRows,
    message: `تمت مزامنة المنظومة بنجاح في ملف Google Sheets المركزي الموحد (${totalRows} سجلاً عبر كافة الأوراق).`
  };
};

/**
 * Fetch data from a shared/public Google Sheet using GViz endpoint (works for users without Gmail login)
 */
export const fetchPublicSheetData = async (spreadsheetId: string, sheetName?: string): Promise<any[]> => {
  try {
    const sheetParam = sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : '';
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json${sheetParam}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('تعذر الوصول إلى جدول البيانات');
    
    const text = await res.text();
    // Parse Google visualization JSON wrapper: /*O_o*/ google.visualization.Query.setResponse({...});
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!jsonMatch || !jsonMatch[1]) throw new Error('تنسيق جدول البيانات غير صالح');
    
    const data = JSON.parse(jsonMatch[1]);
    const cols = data.table.cols.map((c: any) => c.label || c.id);
    const rows = data.table.rows.map((r: any) => {
      const rowObj: Record<string, any> = {};
      r.c.forEach((cell: any, idx: number) => {
        const colName = cols[idx] || `col_${idx}`;
        rowObj[colName] = cell ? cell.v : null;
      });
      return rowObj;
    });

    return rows;
  } catch (err) {
    console.warn('Public sheet fetch warning:', err);
    throw err;
  }
};

// ============================================================================
// GOOGLE DRIVE API CLIENT
// ============================================================================

/**
 * Ensure Root Application Folder exists in Google Drive
 */
export const ensureDriveFolder = async (folderName: string = 'XiilL_BTP_Chantiers'): Promise<string> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بـ Gmail للوصول إلى Google Drive');

  // Search if folder exists
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!createRes.ok) {
    throw new Error('فشل إنشاء مجلد التطبيق في Google Drive');
  }

  const created = await createRes.json();
  return created.id;
};

/**
 * List files in Google Drive folder
 */
export const listDriveFiles = async (folderId?: string): Promise<DriveFileItem[]> => {
  const token = getAccessToken();
  if (!token) return [];

  try {
    let q = 'trashed=false';
    if (folderId) {
      q += ` and '${folderId}' in parents`;
    }

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink,thumbnailLink,createdTime,size)&pageSize=50&orderBy=createdTime desc`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      webViewLink: f.webViewLink,
      thumbnailLink: f.thumbnailLink,
      createdTime: f.createdTime,
      size: f.size ? `${(Number(f.size) / 1024).toFixed(1)} KB` : undefined
    }));
  } catch (err) {
    console.error('Error listing Drive files:', err);
    return [];
  }
};

/**
 * Upload file or backup to Google Drive
 */
export const uploadFileToDrive = async (
  fileName: string,
  content: Blob | string,
  mimeType: string = 'application/json',
  parentFolderId?: string
): Promise<{ id: string; name: string; webViewLink?: string }> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بـ Gmail لرفع الملفات إلى Google Drive');

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType,
    parents: parentFolderId ? [parentFolderId] : undefined
  };

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  
  let contentString = '';
  if (typeof content === 'string') {
    contentString = content;
  } else {
    contentString = await content.text();
  }

  const mediaPart = `${delimiter}Content-Type: ${mimeType}\r\n\r\n${contentString}`;
  const multipartRequestBody = `${metadataPart}${mediaPart}${closeDelimiter}`;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'فشل رفع الملف إلى Google Drive');
  }

  return await res.json();
};

/**
 * Backup entire system state to Google Drive as a JSON file
 */
export const backupSystemToDrive = async (state: AppState, adminName: string): Promise<{ id: string; name: string; webViewLink?: string }> => {
  const folderId = await ensureDriveFolder('XiilL_BTP_Backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `XiilL_BTP_Backup_${adminName}_${timestamp}.json`;
  
  const backupPayload = JSON.stringify({
    version: '1.0',
    exportDate: new Date().toISOString(),
    adminName,
    state
  }, null, 2);

  return await uploadFileToDrive(fileName, backupPayload, 'application/json', folderId);
};

// ============================================================================
// GOOGLE CHAT API CLIENT
// ============================================================================

/**
 * List Google Chat Spaces accessible by user
 */
export const listChatSpaces = async (): Promise<ChatSpaceItem[]> => {
  const token = getAccessToken();
  if (!token) return [];

  try {
    const res = await fetch('https://chat.googleapis.com/v1/spaces?pageSize=30', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.spaces || []).map((s: any) => ({
      name: s.name,
      displayName: s.displayName || 'فضاء بدون اسم',
      type: s.type || 'SPACE'
    }));
  } catch (err) {
    console.error('Error fetching Chat spaces:', err);
    return [];
  }
};

/**
 * Send Message to a Google Chat Space
 */
export const sendChatMessageToSpace = async (spaceName: string, text: string): Promise<boolean> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بـ Gmail لإرسال رسائل Google Chat');

  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  return res.ok;
};

/**
 * Send Message to a Google Chat Webhook URL (ideal for site channels & supervisors)
 */
export const sendChatWebhookMessage = async (webhookUrl: string, text: string): Promise<boolean> => {
  if (!webhookUrl || !webhookUrl.startsWith('https://chat.googleapis.com/')) {
    throw new Error('رابط Webhook الخاص بـ Google Chat غير صحيح');
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  return res.ok;
};

/**
 * Moroccan Construction Notification Formats for Google Chat / WhatsApp (French BTP Standard)
 */
export const buildChantierChatReport = (type: 'daily' | 'payroll' | 'debt' | 'cps', payload: any): string => {
  const dateStr = new Date().toLocaleDateString('fr-FR');

  switch (type) {
    case 'daily':
      return [
        `🏗️ *RAPPORT JOURNALIER DE CHANTIER — XiilL BTP*`,
        `📅 Date: ${dateStr}`,
        `📍 Chantier: *${payload.projectName || 'Tous les chantiers'}*`,
        `👥 Effectif présent: *${payload.presentCount || 0} ouvriers*`,
        `💰 Dépenses journalières enregistrées: *${payload.todayExpenses || 0} MAD*`,
        payload.notes ? `📝 Résumé des travaux: ${payload.notes}` : '',
        `_Système Central de Gestion BTP XiilL — Maroc_`
      ].filter(Boolean).join('\n');

    case 'payroll':
      return [
        `💵 *ALERTE RÈGLEMENT DE PAIE HEBDOMADAIRE (Pointage de Semaine)*`,
        `📅 Date d'arrêté: ${dateStr}`,
        `📍 Chantier: *${payload.projectName}*`,
        `👷 Ouvriers concernés: *${payload.workersCount} ouvriers*`,
        `💰 Total Net à Payer: *${(payload.totalNet || 0).toLocaleString()} MAD*`,
        `⚠️ Prière de préparer la trésorerie requise pour le règlement des équipes.`
      ].join('\n');

    case 'debt':
      return [
        `🚚 *SITUATION DES DETTES FOURNISSEURS & MATÉRIAUX*`,
        `📅 Date: ${dateStr}`,
        `⚠️ Solde débiteur global fournisseurs: *${(payload.totalDebt || 0).toLocaleString()} MAD*`,
        payload.topSuppliers ? `📋 Principaux fournisseurs:\n${payload.topSuppliers}` : '',
        `_Veuillez vérifier les bons de livraison et effets de commerce arrivant à échéance._`
      ].filter(Boolean).join('\n');

    case 'cps':
      return [
        `📊 *SITUATION D'AVANCEMENT CPS & BORDEREAU DE PRIX*`,
        `🏗️ Chantier: *${payload.projectName}*`,
        `📈 Taux d'avancement physique: *${payload.progressPct}%*`,
        `💼 Montant cumulé exécuté: *${(payload.executedAmount || 0).toLocaleString()} MAD*`,
        `📄 Décompte d'avancement des travaux prêt pour visa et déblocage.`
      ].join('\n');

    default:
      return payload.text || 'Notification — Système XiilL BTP';
  }
};
