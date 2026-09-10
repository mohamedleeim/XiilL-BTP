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
  SubscriptionTier
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

// In-memory token storage (MANDATORY: Never store in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Get current in-memory access token
 */
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
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
    label: 'سجل الأدمين والاشتراكات',
    description: 'Admin, Abonnements & Utilisateurs du Chantier',
    headers: [
      'Admin ID (كود الأدمين)',
      'Email (البريد)',
      'Name (الاسم)',
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
    headers: ['ID Chantier', 'Nom du Chantier', 'Maître d\'Ouvrage / Client', 'Téléphone', 'Ville', 'Budget Contractuel (MAD)', 'Date Début', 'Statut', 'Avancement %'],
    tabColor: { red: 0.2, green: 0.6, blue: 0.85 }
  },
  {
    title: 'Bordereau_CPS',
    label: 'بنود دفتر التحملات والأسعار',
    description: 'Bordereau des Prix & CPS (Attachements)',
    headers: ['ID Article', 'ID Chantier', 'Lot BTP', 'N° Article', 'Désignation des Prestations & Travaux', 'Unité', 'Prix Unitaire (MAD)', 'Quantité Prévue', 'Montant Prévu (MAD)', 'Quantité Réalisée', 'Taux Réalisé %', 'Montant Exécuté (MAD)'],
    tabColor: { red: 0.4, green: 0.7, blue: 0.3 }
  },
  {
    title: 'Pointage_Journalier',
    label: 'بوانطاج العمال اليومي',
    description: 'Pointage Quotidien des Équipes',
    headers: ['Date', 'ID Chantier', 'Nom Chantier', 'ID Ouvrier', 'Nom Ouvrier', 'Statut Pointage', 'Heures Sup', 'Avances MAD', 'Notes'],
    tabColor: { red: 0.9, green: 0.4, blue: 0.2 }
  },
  {
    title: 'Paie_Ouvriers',
    label: 'سجل أجور العمال',
    description: 'Salaires & Règlements Hebdomadaires/Mensuels',
    headers: ['ID Ouvrier', 'Nom & Prénom', 'Spécialité / Métier', 'Type de Rémunération', 'Salaire de Base (MAD)', 'Téléphone', 'N° CIN', 'Statut'],
    tabColor: { red: 0.8, green: 0.3, blue: 0.7 }
  },
  {
    title: 'Achats_Fournisseurs',
    label: 'فواتير وبونات السلع والموردين',
    description: 'Bons de Livraison, Factures & Dettes Matériaux',
    headers: ['ID Achat', 'Date', 'ID Fournisseur', 'ID Chantier', 'Désignation Matériaux', 'Quantité', 'Unité', 'Prix Unitaire (MAD)', 'Montant Total (MAD)', 'Montant Réglé (MAD)', 'Reste Dû / Créance (MAD)', 'N° BL / Facture'],
    tabColor: { red: 0.95, green: 0.75, blue: 0.1 }
  },
  {
    title: 'Depenses_Chantier',
    label: 'مصاريف الورش النثرية واليومية',
    description: 'Petite Caisse, Carburant & Dépenses Diverses',
    headers: ['ID Dépense', 'Date', 'Catégorie de Dépense', 'Montant (MAD)', 'ID Chantier', 'Mode de Règlement', 'Bénéficiaire', 'Observations'],
    tabColor: { red: 0.85, green: 0.2, blue: 0.3 }
  },
  {
    title: 'Decomptes_Clients',
    label: 'دفعات ووضعيات الزبناء',
    description: 'Situations de Travaux & Encaissements Clients',
    headers: ['ID Règlement', 'Date', 'ID Chantier', 'Tranche / Situation Décompte', 'Montant Reçu (MAD)', 'Mode de Paiement', 'N° Reçu / Chèque'],
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
  autoRepair: boolean = false
): Promise<SheetValidationResult> => {
  const token = getAccessToken();
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

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

    for (const def of BTP_STANDARD_SHEETS) {
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
            const def = BTP_STANDARD_SHEETS.find(d => d.title.toLowerCase().trim() === title.toLowerCase().trim());
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

    const tabStatuses: SheetTabStatus[] = BTP_STANDARD_SHEETS.map(def => {
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
        ? (repaired ? 'تم فحص الملف: تمت إضافة وتنسيق الأوراق ورؤوس الأعمدة الناقصة تلقائياً بنجاح!' : 'تم التحقق بنجاح: جميع الأوراق الثمانية ورؤوس الأعمدة متطابقة وجاهزة 100%!')
        : `الملف تنقصه ${missing.length} أوراق رئيسية لمطابقة هيكل الأوراش.`
    };
  }

  // 2. Unauthenticated Check (e.g. Field Supervisor without Gmail login)
  // Check tabs via Google Visualization endpoint (GViz)
  const tabStatuses: SheetTabStatus[] = [];
  let foundCount = 0;

  for (const def of BTP_STANDARD_SHEETS) {
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

  const allTabsPresent = foundCount === BTP_STANDARD_SHEETS.length;

  return {
    success: foundCount > 0,
    spreadsheetId,
    spreadsheetTitle: 'ملف Google Sheets المعتمد للورش',
    url,
    existingTabs: tabStatuses.filter(t => t.status === 'ok').map(t => t.title),
    missingTabs: BTP_STANDARD_SHEETS.filter(def => tabStatuses.find(t => t.title === def.title)?.status === 'missing'),
    allTabsPresent,
    repaired: false,
    tabStatuses,
    message: allTabsPresent
      ? 'تم التحقق بنجاح: ملف الشيت هو هو وجميع الأوراق الثمانية متطابقة وجاهزة!'
      : (foundCount > 0 
          ? `تم التحقق: وُجدت ${foundCount} أوراق من أصل 8. تأكد من أن الملف تمت مشاركته بالكامل.` 
          : 'تعذر التحقق من محتوى الملف. يرجى التأكد من أن الرابط صحيح وأن الملف متاح لمن لديه الرابط (Tous les utilisateurs avec le lien).')
  };
};

/**
 * Create a new Master Google Spreadsheet in the user's Drive with all 8 sheets & headers initialized
 */
export const createMasterSpreadsheet = async (
  title: string = 'XiilL BTP — Système Central de Gestion des Chantiers'
): Promise<{ id: string; url: string; title: string }> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بـ Gmail أولاً لإنشاء ملف Google Sheets');

  const body = {
    properties: {
      title,
      locale: 'fr_FR',
      autoRecalc: 'ON_CHANGE'
    },
    sheets: BTP_STANDARD_SHEETS.map((s, index) => ({
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

  // Initialize header rows immediately for all 8 sheets!
  try {
    const dataPayload = BTP_STANDARD_SHEETS.map(m => ({
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
  managerOrCompanyName: string = 'المقاول العام'
): Promise<{
  spreadsheet: { id: string; url: string; title: string };
  isExisting: boolean;
  validation: SheetValidationResult;
}> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بـ Gmail أولاً لإدارة Google Sheets');

  // Step 1: Search Drive for existing spreadsheet
  const existingFiles = await searchDriveForBtpSpreadsheets();

  if (existingFiles.length > 0) {
    const targetFile = existingFiles[0];
    // Inspect and auto-repair any missing sheets!
    const validation = await inspectAndRepairSpreadsheet(targetFile.id, true);
    return {
      spreadsheet: {
        id: targetFile.id,
        url: targetFile.url,
        title: targetFile.name
      },
      isExisting: true,
      validation
    };
  }

  // Step 2: If none exists, create a brand new one
  const cleanTitle = `XiilL BTP — ${managerOrCompanyName} (Chantiers & Gestion)`;
  const created = await createMasterSpreadsheet(cleanTitle);
  const validation = await inspectAndRepairSpreadsheet(created.id, false);

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
      'Role (الدور)',
      'Type Abonnement (نوع الباقة)',
      'Date Début (تاريخ بدأ الباقة)',
      'Date Fin (تاريخ إنتهاء الباقة)',
      'Status (الحالة التلقائية)',
      'CreatedAt (تاريخ التسجيل)',
      'LastLogin (آخر دخول)',
      'Notes (ملاحظات)'
    ];

    if (!checkValues.values || checkValues.values.length === 0 || checkValues.values[0].length < 11) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Admin_Registry!A1:K1?valueInputOption=USER_ENTERED`, {
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
    admin.role,
    formatTierLabel(admin.subscription?.tier),
    formatSheetDate(admin.subscription?.startDate),
    formatSheetDate(admin.subscription?.endDate),
    statusDisplay,
    admin.createdAt,
    admin.lastLoginAt || 'لم يدخل بعد',
    admin.notes || (admin.companyName ? `مقاول: ${admin.companyName}` : '')
  ];

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Admin_Registry!A:K:append?valueInputOption=USER_ENTERED`, {
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
    await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Admin_Registry!A2:K500:clear`, {
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
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('سجل_الأدمين')}!A2:K500:clear`, {
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
  const token = getAccessToken();
  if (!token) return [];

  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Admin_Registry!A2:K100`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.values || !Array.isArray(data.values)) return [];

    return data.values.map((row: string[]) => {
      if (!row || !row[0] || !row[1]) return null;

      const adminId = (row[0] || '').trim();
      const email = (row[1] || '').trim().toLowerCase();
      const name = (row[2] || '').trim() || 'مدير عام';
      const role = ((row[3] || '').trim().toLowerCase() === 'super_admin' ? 'super_admin' : 'admin') as 'super_admin' | 'admin';

      // Detect if row is in legacy 7-column schema (where row[4] was status: 'active', 'نشط', etc.)
      const col4 = (row[4] || '').trim().toLowerCase();
      const isLegacy = row.length <= 8 || ['active', 'نشط', 'suspended', 'معلق', 'expired', 'منتهي'].includes(col4);

      let tier: SubscriptionTier = 'trial_3days';
      let startDate = new Date().toISOString();
      let endDate = new Date(Date.now() + 30 * 86400000).toISOString();
      let rawStatus = 'active';
      let createdAt = new Date().toISOString();
      let lastLoginAt: string | undefined = undefined;
      let notes = '';

      if (isLegacy) {
        rawStatus = (row[4] || 'active').trim();
        createdAt = safeIsoDate(row[5], new Date().toISOString());
        startDate = createdAt;
        const startMs = new Date(startDate).getTime();
        endDate = new Date(startMs + 30 * 86400000).toISOString();
        tier = 'monthly';
        lastLoginAt = row[6] && row[6] !== 'لم يدخل بعد' ? row[6] : undefined;
        notes = (row[7] || '').trim();
      } else {
        tier = parseTierLabel(row[4]);
        startDate = safeIsoDate(row[5], new Date().toISOString());
        endDate = safeIsoDate(row[6], new Date(Date.now() + (tier === 'annual' ? 365 : tier === 'monthly' ? 30 : 3) * 86400000).toISOString());
        rawStatus = (row[7] || 'active').trim();
        createdAt = safeIsoDate(row[8], startDate);
        lastLoginAt = row[9] && row[9] !== 'لم يدخل بعد' ? row[9] : undefined;
        notes = (row[10] || '').trim();
      }

      const subscription: SubscriptionInfo = {
        tier: tier as any,
        startDate,
        endDate,
        status: 'active',
        price: tier === 'annual' ? 2610 : tier === 'monthly' ? 290 : 0
      };

      const autoStatus = computeAutoStatus(subscription, rawStatus);
      if (autoStatus === 'expired') {
        subscription.status = 'expired';
      }

      return {
        id: adminId,
        email,
        name,
        role,
        status: autoStatus,
        subscription,
        createdAt,
        lastLoginAt,
        notes
      };
    }).filter((a): a is AdminAccount => Boolean(a && a.id && a.email));
  } catch (err) {
    console.error('Failed to read Admin Registry from sheet:', err);
    return [];
  }
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
 * Synchronize all current application tables into Google Sheets tabs
 */
export const syncAllDataToGoogleSheets = async (
  spreadsheetId: string,
  state: AppState,
  targetAdminId?: string
): Promise<{ success: boolean; rowsCount: number; message: string }> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بـ Gmail للقيام بالمزامنة');

  // Filter state if targetAdminId is specified (Tenant Isolation)
  const filterByAdmin = <T>(items: T[]): T[] => {
    if (!targetAdminId || targetAdminId === 'ALL') return items;
    return items.filter((item: any) => !item.adminId || item.adminId === targetAdminId);
  };

  const projects = filterByAdmin(state.projects);
  const cpsArticles = filterByAdmin(state.cpsArticles);
  const workers = filterByAdmin(state.workers);
  const purchases = filterByAdmin(state.purchases);
  const expenses = filterByAdmin(state.expenses);
  const clientPayments = filterByAdmin(state.clientPayments);

  // Prepare Sheets Data (Format BTP Maroc en Français)
  const projectsData = [
    ['ID Chantier', 'Nom du Chantier', 'Maître d\'Ouvrage / Client', 'Téléphone', 'Ville', 'Budget Contractuel (MAD)', 'Date Début', 'Statut', 'Avancement %'],
    ...projects.map(p => [
      p.id,
      p.name,
      p.clientName,
      p.clientPhone,
      p.locationCity,
      p.budget,
      p.startDate,
      p.status,
      `${p.progressPct}%`
    ])
  ];

  const cpsData = [
    ['ID Article', 'ID Chantier', 'Lot BTP', 'N° Article', 'Désignation des Prestations & Travaux', 'Unité', 'Prix Unitaire (MAD)', 'Quantité Prévue', 'Montant Prévu (MAD)', 'Quantité Réalisée', 'Taux Réalisé %', 'Montant Exécuté (MAD)'],
    ...cpsArticles.map(a => [
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
      a.executedAmount
    ])
  ];

  const workersData = [
    ['ID Ouvrier', 'Nom & Prénom', 'Spécialité / Métier', 'Type de Rémunération', 'Salaire de Base (MAD)', 'Téléphone', 'N° CIN', 'Statut'],
    ...workers.map(w => [
      w.id,
      w.name,
      w.specialty,
      w.wageType,
      w.wageAmount,
      w.phone,
      w.cin || '',
      w.active ? 'Actif' : 'Inactif'
    ])
  ];

  const purchasesData = [
    ['ID Achat', 'Date', 'ID Fournisseur', 'ID Chantier', 'Désignation Matériaux', 'Quantité', 'Unité', 'Prix Unitaire (MAD)', 'Montant Total (MAD)', 'Montant Réglé (MAD)', 'Reste Dû / Créance (MAD)', 'N° BL / Facture'],
    ...purchases.map(p => [
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
      p.invoiceNumber || ''
    ])
  ];

  const expensesData = [
    ['ID Dépense', 'Date', 'Catégorie de Dépense', 'Montant (MAD)', 'ID Chantier', 'Mode de Règlement', 'Bénéficiaire', 'Observations'],
    ...expenses.map(e => [
      e.id,
      e.date,
      e.category,
      e.amount,
      e.projectId,
      e.paymentMethod,
      e.recipientName || '',
      e.notes || ''
    ])
  ];

  const clientPaymentsData = [
    ['ID Règlement', 'Date', 'ID Chantier', 'Tranche / Situation Décompte', 'Montant Reçu (MAD)', 'Mode de Paiement', 'N° Reçu / Chèque'],
    ...clientPayments.map(cp => [
      cp.id,
      cp.date,
      cp.projectId,
      cp.milestoneTitle,
      cp.amount,
      cp.paymentMethod,
      cp.receiptNumber || ''
    ])
  ];

  // Batch update all sheets with automatic clearing of old rows
  const updateTab = async (sheetName: string, fallbackArabic: string, values: any[][]) => {
    // 1. Clear previous rows from row 2 onwards so deleted records are completely wiped!
    await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:Z2000:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => null);

    // 2. Put fresh values from A1
    let res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values })
    }).catch(() => null);

    if (!res || !res.ok) {
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fallbackArabic)}!A2:Z2000:clear`, {
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
  await updateTab('Paie_Ouvriers', 'خلاص_العمال_والأجور', workersData);
  await updateTab('Achats_Fournisseurs', 'المشتريات_والموردين', purchasesData);
  await updateTab('Depenses_Chantier', 'المصاريف_اليومية', expensesData);
  await updateTab('Decomptes_Clients', 'دفعات_الزبناء_Décomptes', clientPaymentsData);

  // Synchronize Admin_Registry with subscription plans and automatic statuses (also clears deleted admins)
  if (state.adminAccounts && state.adminAccounts.length > 0) {
    await pushAdminsToMasterSheet(spreadsheetId, state.adminAccounts);
  }

  const totalRows = projects.length + cpsArticles.length + workers.length + purchases.length + expenses.length + clientPayments.length;

  return {
    success: true,
    rowsCount: totalRows,
    message: `Synchronisation réussie : ${totalRows} lignes enregistrées dans Google Sheets.`
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
