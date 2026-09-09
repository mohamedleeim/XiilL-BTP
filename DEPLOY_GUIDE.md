# دليل رفع ونشر منظومة XiilL BTP وتفعيل تسجيل الدخول بـ Google (Gmail)

---

## 🚀 الجزء الأول: رفع المنظومة على GitHub

تم تجهيز ملف تلقائي بالكامل يدعى `deploy.sh` بالإضافة إلى إعدادات **GitHub Actions** في `.github/workflows/deploy.yml`.

### الخطوة 1: إنشاء مستودع جديد على GitHub
1. اذهب إلى [GitHub - New Repository](https://github.com/new).
2. اختر اسم المستودع (مثال: `xiill-btp`).
3. اجعل المستودع **Public** أو **Private** حسب رغبتك.
4. **لا تضع علامة** على (Add a README file أو .gitignore) لأن الملفات جاهزة بالفعل.
5. اضغط على **Create repository**.
6. انسخ رابط المستودع (مثال: `https://github.com/username/xiill-btp.git`).

### الخطوة 2: رفع الكود عبر السكربت الجاهز
في موجه الأوامر (Terminal) داخل مجلد المشروع، شغّل السكربت:
```bash
chmod +x deploy.sh
./deploy.sh
```
أو نفذ الأوامر يدوياً:
```bash
git init
git add .
git commit -m "feat: XiilL BTP release with subscription plans & Admin ID login"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/xiill-btp.git
git push -u origin main
```

---

## 🌐 الجزء الثاني: نشر الموقع على الإنترنت (أونلاين)

### الخيار 1: النشر التلقائي عبر GitHub Pages (مجاني 100%)
1. في صفحة مستودعك على GitHub، اذهب إلى تبويب **Settings**.
2. من القائمة الجانبية، اختر **Pages**.
3. تحت قسم **Build and deployment**:
   - في خانة **Source**، اختر: `GitHub Actions`.
4. تلقائياً سيعمل ملف `.github/workflows/deploy.yml` الذي جهزناه، وخلال دقيقة واحدة ستجد رابط موقعك المنشور:
   `https://YOUR_USERNAME.github.io/xiill-btp/`

### الخيار 2: النشر عبر Vercel أو Netlify (بضغطة زر واحدة)
1. سجل دخولك على [Vercel.com](https://vercel.com) أو [Netlify.com](https://netlify.com) باستخدام حساب GitHub.
2. اختر **Add New Project** ثم استورد مستودع `xiill-btp`.
3. اضغط **Deploy** مباشرة (الإعدادات الافتراضية: Vite / Framework React / Directory `./dist`).

---

## 🔑 الجزء الثالث: تفعيل تسجيل الدخول بحساب Gmail (Google Auth & Workspace)

منظومة XiilL BTP تدعم تسجيل الدخول المباشر للمالك العام والمستخدمين عبر Google Identity Services (GSI) و Google Workspace APIs.

### الخطوة 1: تهيئة Google Cloud Console
1. افتح [Google Cloud Console](https://console.cloud.google.com/).
2. أنشئ مشروعاً جديداً باسم `XiilL BTP Workspace`.
3. من القائمة الجانبية، اذهب إلى **APIs & Services** > **OAuth consent screen** (شاشة موافقة OAuth):
   - اختر **External** (خارجي).
   - اكتب اسم التطبيق: `XiilL BTP`.
   - أدخل بريد الدعم: `mohamedleeim@gmail.com`.
   - أضف النطاقات (Scopes) المطلوبة:
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/drive.file`
4. اذهب إلى **APIs & Services** > **Credentials** (بيانات الاعتماد):
   - اضغط على **Create Credentials** > **OAuth client ID**.
   - نوع التطبيق: **Web application**.
   - الاسم: `XiilL BTP Web Client`.
   - **Authorized JavaScript origins (الأصول المعتمدة):**
     - أضف رابط الموقع المحلي: `http://localhost:3000`
     - أضف رابط الموقع المنشور: `https://YOUR_USERNAME.github.io` (أو نطاق Vercel الخاص بك).
   - **Authorized redirect URIs:**
     - أضف نفس الرابط: `https://YOUR_USERNAME.github.io/xiill-btp/`
5. اضغط **Save** وانسخ الـ **Client ID**.

### الخطوة 2: تفعيل APIs المطلوبة
من **APIs & Services** > **Library**، ابحث عن وفعل التالي:
- **Google Sheets API** (لمزامنة أوراق الحضور وجداول المصاريف والموردين).
- **Google Drive API** (لرفع صور البونات BL والنسخ الاحتياطي).

### الخطوة 3: تسجيل الدخول في المنظومة
- **المالك العام (Super Admin):**
  - البريد المعتمد: `mohamedleeim@gmail.com`.
  - بمجرد الدخول بحساب Gmail هذا، تفتح لوحة التحكم المركزية تلقائياً ويتمكن من مراقبة كافة المقاولين وإنشاء أكواد المشتركين.
- **المقاولون المستقلون (Admins):**
  - يدخلون حصرياً بواسطة **كود الأدمين (Admin ID Code)** المخصص لهم (مثال: `ADM-XXXX-XX`).
  - تم إلغاء خانة اسم المقاول أو الشركة لتسهيل وتسريع الدخول.
  - خيار **"حفظ تسجيل الدخول في هذا الجهاز"** مفعل افتراضياً للبقاء متصلاً دائماً.
- **مشرفو الأوراش (Supervisors):**
  - يدخلون برمز PIN واسم المشرف المربوط بكود أدمين المقاول.

---

## 💼 باقات واشتراكات المنظومة المتوفرة

1. **باقة التجربة المجانية (3 أيام):**
   - 0 د.م (تفعيل فوري).
   - تجربة كاملة للمنظومة وإدارة ورش البناء.

2. **الباقة الشهرية:**
   - 290 د.م / شهرياً.
   - عمل مستمر وتزامن سحابي غير محدود.

3. **الباقة السنوية (خصم 25% فوري):**
   - 2,610 د.م / سنوياً (بدل 3,480 د.م).
   - توفير 3 أشهر كاملة (870 د.م توفير).
   - دعم مباشر وأولوية في النسخ الاحتياطي على Google Drive.
