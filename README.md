# غرس: ركّز وازرع

مؤقت تركيز عربي مستوحى من Forest: كل جلسة تزرع نبتة، ولو طلعت من التطبيق في وضع التركيز العميق تذبل.
الكود نفسه يشتغل كموقع (PWA) وكتطبيق iOS عن طريق Capacitor.

## هيكل المشروع

| المسار | وش فيه |
|---|---|
| `www/` | التطبيق كامل (HTML وCSS وJS بدون أدوات بناء) |
| `www/js/app.js` | منطق الجلسة والشاشات |
| `www/js/platform.js` | الربط مع مزايا iOS: تنبيهات، اهتزاز، شريط الحالة، كشف قفل الشاشة |
| `www/js/trees.js` · `forest.js` | رسم النباتات والغابة |
| `www/fonts/` | الخطوط داخل التطبيق عشان يشتغل بدون نت |
| `www/privacy.html` | سياسة الخصوصية (Apple تطلب رابط لها) |
| `plugins/focus-guard/` | إضافة Swift تفرّق بين قفل الشاشة والخروج من التطبيق |
| `ios/` | مشروع Xcode (يدير المكتبات بـ Swift Package Manager) |
| `resources/` | مصادر الأيقونة وشاشة البداية |
| `codemagic.yaml` | بناء ورفع تلقائي على TestFlight |

## التشغيل في المتصفح

```bash
npm run serve
```
وافتح `http://localhost:8000`.

## بعد أي تعديل في `www/`

```bash
npx cap sync ios
```

## الرفع على TestFlight

### الطريقة الأولى: Codemagic (بدون Mac)
1. في App Store Connect: أنشئ التطبيق بنفس Bundle ID.
2. في App Store Connect → Users and Access → Integrations: أنشئ مفتاح API بصلاحية App Manager.
3. في Codemagic: أضف المفتاح في Team settings → Integrations باسم `Ghars ASC`.
4. عدّل في `codemagic.yaml`: `bundle_identifier` و`APP_STORE_APPLE_ID`.
5. عدّل `appId` في `capacitor.config.json` و`PRODUCT_BUNDLE_IDENTIFIER` في مشروع Xcode لنفس الـ Bundle ID.
6. اربط المستودع بـ Codemagic، وكل push على `main` يبني نسخة ويرفعها لـ TestFlight.

### الطريقة الثانية: Mac وXcode
```bash
npm ci
```
```bash
npx cap sync ios
```
```bash
npx cap open ios
```
في Xcode: اختر فريقك من Signing & Capabilities، بعدها Product → Archive → Distribute App → TestFlight.

## ملاحظات
- كشف قفل الشاشة يعتمد على إن الجهاز عليه رمز دخول. بدون رمز، القفل أكثر من مهلة الرجوع يُحسب خروج.
- حظر التطبيقات الفعلي (Screen Time API) مؤجل للإصدار الثاني لأنه يحتاج موافقة Apple على صلاحية Family Controls.
