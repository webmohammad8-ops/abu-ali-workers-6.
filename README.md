# نظام حسابات المقاولين (بدون React وبدون npm)

HTML + JavaScript عادي. Tailwind وSupabase يُحمَّلان من CDN، فلا يوجد `npm install` ولا `npm run dev` ولا بناء.

## 1) إعداد Supabase (مرة واحدة)
1. أنشئ مشروعًا في https://supabase.com
2. SQL Editor ← New query ← الصق محتوى `supabase/schema.sql` ← Run
3. Project Settings ← API ← انسخ `Project URL` و `anon public key`
4. افتح الملف `config.js` وضعهما:
   ```js
   window.CONFIG = { SUPABASE_URL: 'https://xxxx.supabase.co', SUPABASE_ANON_KEY: 'eyJ...' }
   ```

## 2) التشغيل
افتح `index.html` بالمتصفح مباشرة (يلزم إنترنت).
تثبيت التطبيق على الجوال (PWA) يعمل فقط بعد الرفع على رابط https.

## 3) الرفع على Cloudflare Pages
- Workers & Pages ← Create ← Pages ← Upload assets (أو Connect to Git)
- Build command: فارغ — Output directory: `/` (جذر المجلد)

## الملفات
- `index.html` الصفحة الوحيدة، `config.js` إعدادات Supabase
- `js/` : calc (الحسابات) • store (Supabase + Realtime) • ui • dashboard • workers • invoices • grouppay • project • archive • app (الموجّه)
- `manifest.webmanifest` + `sw.js` + الأيقونات: لتحويله إلى PWA
- `supabase/schema.sql`: الجداول + bucket الفواتير + Realtime

## ملاحظات
- التنقل بالـ hash (`#/p/...`) فلا يحتاج إعدادات توجيه على السيرفر.
- الدفعة الجماعية تُسجَّل في `daily_entries` كصف يومية 0 والمبلغ في خانة **السلفة**.
- مصروف الشهر = اليوميات + مبالغ الفواتير في الشهر الحالي. الأسبوع: السبت → الجمعة.
- الأمان: لا يوجد تسجيل دخول؛ السياسات تسمح لمن يملك المفتاح بالقراءة والكتابة. لا تنشر الرابط علنًا.
