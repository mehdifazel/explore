# مرجع API والکس و منطق آربیتراژ پروژه

آخرین بازبینی: 2026-08-30

این سند، مرجع مستقل و پروژه‌محور API والکس برای داشبورد آربیتراژ است. مرجع نهایی تغییرات آینده، [مستندات رسمی Wallex](https://developers.wallex.ir/docs/) است.

## هدف و محدوده

صفحه مشترک پروژه با انتخاب `Wallex`، داده‌های بازارهای تومان و USDT والکس را دریافت می‌کند و دقیقاً با همان منطق نسخه نوبیتکس، VWAP خرید/فروش را برای `Setup Value` محاسبه و با Binance مقایسه می‌کند. تمام Endpointهای استفاده‌شده عمومی‌اند و نباید API Key در Frontend ذخیره شود.

## واحد پول و نماد بازار

- ارز فیات والکس `TMN` و واحد قیمت آن تومان است.
- `1 MT = 1,000,000 TMN`.
- مقدار پیش‌فرض `100 MT = 100,000,000 TMN`.
- نمونه نمادها: `BTCTMN`, `USDTTMN`, `BTCUSDT`.
- بازارهای تومانی والکس در state و رابط برنامه با پسوند `-tmn` نگهداری می‌شوند و هیچ تبدیل یا نام‌گذاری ریالی در مسیر Wallex وجود ندارد.

## میزبان و قالب پاسخ

- Base URL رسمی: `https://api.wallex.ir`
- پاسخ‌ها JSON هستند.
- الگوی عمومی پاسخ: `success`, `message`, `result`.
- درخواست‌های خصوصی از `x-api-key` استفاده می‌کنند، اما این پروژه هیچ Endpoint خصوصی ندارد.
- API والکس، Origin عمومی localhost را مجاز نمی‌کند. سرور محلی پروژه مسیر `/api/wallex/*` را فقط به میزبان ثابت `https://api.wallex.ir` proxy می‌کند؛ هیچ credential یا هدر خصوصی ارسال نمی‌شود.

مرجع: [مقدمه رسمی](https://developers.wallex.ir/docs/)

## بازارها و آمار لحظه‌ای

### Endpoint مورد استفاده برنامه

```http
GET /v1/markets
```

پاسخ واقعی این Endpoint یک `result.symbols` دارد. هر نماد شامل `symbol`, `baseAsset`, `quoteAsset`, وضعیت فعال بازار و شیء `stats` است. فیلدهای مورد استفاده:

- `stats.bidPrice`: بالاترین سفارش خرید؛ بهترین قیمت فروش فوری کاربر.
- `stats.askPrice`: پایین‌ترین سفارش فروش؛ بهترین قیمت خرید فوری کاربر.
- `stats.lastPrice`: آخرین معامله.
- `stats.24h_ch`: درصد تغییر 24 ساعته.
- `stats.24h_quoteVolume`: حجم 24 ساعته بر حسب quote asset.
- `isMarketTypeEnable`: یک فلگ قدیمی/نوع‌بازار است که در پاسخ زنده برای اکثر نمادهای دارای آمار `false` است؛ بنابراین مبنای حذف بازار از داشبورد قرار نمی‌گیرد.

### Endpoint فهرست رسمی جدید

```http
GET /hector/web/v1/markets
```

این Endpoint در مستندات فعلی به‌عنوان فهرست بازارها معرفی شده و `result.markets` برمی‌گرداند. فیلدهای مهم آن شامل `symbol`, `base_asset`, `quote_asset`, `price`, `change_24h`, `volume_24h`, `quote_volume_24h`, `is_spot`, `is_tmn_based`, `is_usdt_based`, `amount_precision` و `price_precision` است. چون بهترین bid/ask را مستقیماً ندارد، برنامه برای جدول لحظه‌ای از `/v1/markets` استفاده می‌کند.

مرجع: [مارکت‌های والکس](https://developers.wallex.ir/docs/basic-services-markets)

## عمق بازار

```http
GET /v1/depth?symbol={SYMBOL}
```

- `result.ask`: سفارش‌های فروش؛ از این سمت برای Buy Setup استفاده می‌شود.
- `result.bid`: سفارش‌های خرید؛ از این سمت برای Sell Setup استفاده می‌شود.
- هر پله شامل `price`, `quantity` و `sum = price × quantity` است.
- مستندات، Poll بسیار مکرر این Endpoint را توصیه نمی‌کند و استفاده از WebSocket را برای داده لحظه‌ای پیشنهاد می‌دهد.

مرجع: [عمق بازار](https://developers.wallex.ir/docs/basic-services-depth)

## فرمول Setup بازار TMN

برای سرمایه `V = Setup Value × 1,000,000 TMN`، پله‌های Order Book به ترتیب بهترین قیمت مصرف می‌شوند. آخرین پله فقط به اندازه باقی‌مانده مصرف می‌شود:

```text
remaining = V - accumulatedValue
usedAmount = min(levelQuantity, remaining / levelPrice)
VWAP = accumulatedValue / accumulatedAmount
```

- `TMN Buy Setup`: VWAP روی `ask` بازار رمزارز/TMN.
- `TMN Sell Setup`: VWAP روی `bid` بازار رمزارز/TMN.
- `USDT Buy Average`: VWAP روی `ask` بازار `USDTTMN`.
- `USDT Sell Average`: VWAP روی `bid` بازار `USDTTMN`.

قیمت‌های ضمنی تتری برای دو مسیر آربیتراژ:

```text
USDT Buy Setup = TMN Buy Setup / USDT Sell Average
USDT Sell Setup = TMN Sell Setup / USDT Buy Average
```

مقایسه با Binance:

```text
Buy opportunity %  = (Binance / USDT Buy Setup - 1) × 100
Sell opportunity % = (USDT Sell Setup / Binance - 1) × 100
```

## بازار USDT والکس

- `USDT Buy Setup`: VWAP روی `ask` بازار رمزارز/USDT.
- `USDT Sell Setup`: VWAP روی `bid` بازار رمزارز/USDT.
- مقدار هدف USDT با تبدیل Setup Value از طریق VWAP خرید USDT در بازار `USDTTMN` محاسبه می‌شود، نه با یک قیمت تک‌پله‌ای.

## WebSocket

والکس استفاده از Socket را برای عمق لحظه‌ای توصیه می‌کند. طبق مستندات:

- اتصال پس از 30 دقیقه محدود می‌شود.
- Server هر 20 ثانیه PING می‌فرستد و PONG می‌تواند مدت اتصال را افزایش دهد.
- کانال‌های جداگانه برای عمق خرید، عمق فروش، معاملات، قیمت لحظه‌ای و رویدادهای خصوصی وجود دارند.

نسخه فعلی پروژه REST است. مهاجرت بعدی به WebSocket باید snapshot اولیه، reconnect، heartbeat و fallback به REST داشته باشد.

مرجع: [WebSocket والکس](https://developers.wallex.ir/docs/socket-intro)

## APIهای دیگر

مستندات رسمی بخش‌های کیف پول، کندل، معاملات اخیر، کارمزد حساب، بانک و برداشت تومان، معامله Spot، معامله تعهدی، اعتبار معاملاتی و معامله آنی را نیز پوشش می‌دهد. این موارد خصوصی یا خارج از هدف نمایش قیمت‌اند و در برنامه فعلی استفاده نمی‌شوند.

## شبکه برداشت

Endpointهای عمومی بازار Wallex، شبکه‌های برداشت فعال هر دارایی را ارائه نمی‌کنند. اطلاعات شبکه در API خصوصی کیف پول (`GET /v1/account/wallets/{symbol}`) و با `x-api-key` در دسترس است. برنامه کلید را فقط از متغیر محیطی `WALLEX_API_KEY` در سرور می‌خواند و endpoint داخلی `/api/wallex-private/networks` فقط نام شبکه، وضعیت برداشت/واریز، کارمزد و حداقل برداشت را به مرورگر می‌فرستد؛ آدرس کیف پول و memo حذف می‌شوند. نتیجه‌ها ۱۵ دقیقه cache و درخواست‌ها با حداکثر ۵ اتصال هم‌زمان اجرا می‌شوند. اگر کلید تنظیم نشده باشد، به‌جای اطلاعات حدسی پیام راهنما نمایش داده می‌شود.

در آزمون عملی، کلیدی که فقط scope خواندن عمومی داشت برای endpoint کیف پول پاسخ `scope شما معتبر نیست` دریافت کرد. بنابراین دسترسی واقعی این endpoint باید هنگام ساخت کلید در پنل Wallex فعال باشد؛ صرف معتبر بودن API Key برای بازارها کافی نیست.

## امنیت

- Frontend نباید API Key داشته باشد.
- Endpoint عمومی نیازی به `x-api-key` ندارد.
- اگر کلیدی قبلاً در Git یا فایل Frontend قرار گرفته، باید از پنل Wallex revoke/rotate شود؛ صرف حذف از commit جدید، تاریخچه قدیمی را امن نمی‌کند.
- هرگونه معامله واقعی باید در Backend امن با secret management و مجوز حداقلی پیاده‌سازی شود.

## معیار صحت adapter والکس

1. `quoteAsset=TMN` به بازار فیات و `quoteAsset=USDT` به بازار تتری نگاشت شود.
2. اعداد TMN بدون ضرب یا تقسیم 10 نمایش داده شوند.
3. `ask → Buy Setup` و `bid → Sell Setup` باشد.
4. آخرین پله partial fill و عمق ناکافی `N/A` شود.
5. درخواست عمومی بدون API Key انجام شود.
6. batchهای محاسبه Order Book روی هم نیفتند.
7. Spread خام با سود خالص—پس از کارمزد، انتقال و ریسک اجرا—اشتباه نشود.
