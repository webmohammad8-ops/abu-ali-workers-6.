// دوال حسابية خالصة — متاحة عالميًا باسم Calc
(function () {
// دوال حسابية خالصة (بدون React) — سهلة الاختبار

const GROUPS = ['طوبار', 'حداد', 'طراش', 'عامل']

// يحوّل نصًا (حتى بالأرقام العربية) إلى رقم
function toNum(v) {
  if (v === null || v === undefined) return 0
  const s = String(v)
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace('٫', '.')
    .replace(',', '.')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

// صافي اليوم = اليومية - الأكل - الدخان - السلفة
function net(e) {
  return round2(toNum(e.daily_wage) - toNum(e.food) - toNum(e.smoke) - toNum(e.advance))
}

function total(entries) {
  return round2(entries.reduce((s, e) => s + net(e), 0))
}

const pad = (n) => (n < 10 ? '0' : '') + n
function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const todayStr = () => ymd(new Date())

function parse(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

// الأسبوع يبدأ يوم السبت وينتهي يوم الجمعة
function weekRange(ref = new Date()) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const back = (d.getDay() + 1) % 7 // السبت=6 → 0
  d.setDate(d.getDate() - back)
  const from = ymd(d)
  d.setDate(d.getDate() + 6)
  return { from, to: ymd(d) }
}

function monthRange(ref = new Date()) {
  const from = ymd(new Date(ref.getFullYear(), ref.getMonth(), 1))
  const to = ymd(new Date(ref.getFullYear(), ref.getMonth() + 1, 0))
  return { from, to }
}

function inRange(dateStr, { from, to }) {
  const d = String(dateStr).slice(0, 10)
  return d >= from && d <= to
}

function sumRange(entries, range) {
  const list = entries.filter((e) => inRange(e.date, range))
  return { net: total(list), days: new Set(list.map((e) => e.date)).size, count: list.length }
}

/**
 * توزيع دفعة جماعية.
 *  amount   : المبلغ المُدخل
 *  mode     : 'each'  → كل عامل يستلم المبلغ كاملًا
 *             'split' → يُقسم المبلغ بالتساوي على العمال المحددين
 *  workerIds: العمال المحددون
 *  extras   : { [workerId]: مبلغ إضافي }
 * يعيد [{ workerId, base, extra, amount }]
 */
function distribute({ amount, mode = 'each', workerIds, extras = {} }) {
  const total = round2(toNum(amount))
  const n = workerIds.length
  if (!n || total <= 0) return []
  let bases
  if (mode === 'split') {
    const share = Math.floor((total / n) * 100) / 100
    bases = workerIds.map(() => share)
    // الباقي (كسور القروش) على أول عامل حتى يطابق المجموع تمامًا
    bases[0] = round2(bases[0] + (total - share * n))
  } else {
    bases = workerIds.map(() => total)
  }
  return workerIds.map((id, i) => {
    const extra = round2(toNum(extras[id]))
    return { workerId: id, base: bases[i], extra, amount: round2(bases[i] + extra) }
  })
}

const fmt = (n) =>
  round2(toNum(n)).toLocaleString('en-US', { maximumFractionDigits: 2 })

const money = (n) => `${fmt(n)} ₪`

function showDate(s) {
  if (!s) return ''
  const [y, m, d] = String(s).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const dayName = (s) => DAYS[parse(s).getDay()]

window.Calc = { GROUPS, toNum, round2, net, total, ymd, todayStr, weekRange, monthRange, inRange, sumRange, distribute, fmt, money, showDate, dayName }
})()
