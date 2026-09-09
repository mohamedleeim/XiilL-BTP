#!/bin/bash

# ====================================================================
# XiilL BTP — سكربت رفع ونشر المنظومة على GitHub
# ====================================================================

set -e

echo "========================================================"
echo "  🚀 بدء تجهيز ورفع منظومة XiilL BTP إلى GitHub"
echo "========================================================"

# 1. التأكد من وجود Git
if ! command -v git &> /dev/null; then
    echo "❌ خطأ: Git غير مثبت على هذا الجهاز. يرجى تثبيت Git أولاً."
    exit 1
fi

# 2. تهيئة مستودع Git إذا لم يكن مهيئاً
if [ ! -d ".git" ]; then
    echo "📦 تهيئة مستودع Git جديد..."
    git init
fi

# 3. إعداد الفرع الرئيسي main
git branch -M main

# 4. فحص الملفات وإضافتها
echo "📂 إضافة كافة ملفات المشروع..."
git add .

# 5. عمل Commit
COMMIT_MSG="feat: XiilL BTP production system with subscription plans (3 days trial, monthly, annual 25% off) and Admin ID login"
echo "💾 حفظ التعديلات (Commit)..."
git commit -m "$COMMIT_MSG" || echo "⚠️ لا توجد تعديلات جديدة للـ Commit"

# 6. التحقق من وجود Remote Origin
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

if [ -z "$CURRENT_REMOTE" ]; then
    echo ""
    echo "⚠️ لم تقم بربط المستودع برابط GitHub بعد."
    echo "👉 يرجى إنشاء مستودع جديد على https://github.com/new (مثال: xiill-btp)"
    echo "ثم ألصق رابط المستودع هنا (مثال: https://github.com/username/xiill-btp.git):"
    read -r REPO_URL
    if [ -n "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
        echo "✅ تم ربط المستودع بـ: $REPO_URL"
    else
        echo "❌ تم إلغاء الربط. يمكنك لاحقاً كتابة: git remote add origin <YOUR_REPO_URL>"
        exit 1
    fi
else
    echo "🔗 المستودع مرتبط بـ: $CURRENT_REMOTE"
fi

# 7. رفع الكود إلى GitHub
echo "🚀 جاري رفع الكود إلى فرع main..."
git push -u origin main

echo ""
echo "========================================================"
echo "  🎉 تم رفع المنظومة بنجاح إلى GitHub!"
echo "========================================================"
echo "الخطوات التالية لتفعيل النشر التلقائي (GitHub Pages):"
echo "1. افتح مستودعك على GitHub -> Settings -> Pages"
echo "2. تحت Build and deployment -> Source -> اختر 'GitHub Actions'"
echo "3. سيتم تشغيل ملف .github/workflows/deploy.yml تلقائياً ونشر الموقع مباشرة!"
echo "========================================================"
