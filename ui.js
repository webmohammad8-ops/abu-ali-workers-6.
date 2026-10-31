// أدوات الواجهة: قوالب HTML صغيرة + نوافذ + إشعارات
const Views = {}   // صفحات التطبيق
const Actions = {} // إجراءات الأزرار (data-a)

const UI = (() => {
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

  const inputCls =
    'w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-blue-200'

  const VARIANTS = {
    primary: 'bg-brand text-white active:bg-brand-dark disabled:bg-blue-300',
    secondary: 'bg-gray-100 text-gray-800 active:bg-gray-200 disabled:text-gray-400',
    danger: 'bg-red-50 text-red-600 active:bg-red-100',
  }

  // زر: a = اسم الإجراء، id = data-id
  function btn(label, o = {}) {
    const size = o.size === 'lg' ? 'min-h-[56px] text-lg px-5' : o.size === 'sm' ? 'min-h-[40px] text-sm px-3' : 'min-h-[48px] text-base px-4'
    return `<button type="button" ${o.a ? `data-a="${o.a}"` : ''} ${o.id != null ? `data-id="${esc(o.id)}"` : ''} ${o.attrs || ''} ${o.disabled ? 'disabled' : ''}
      class="inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:cursor-not-allowed ${size} ${VARIANTS[o.v || 'primary']} ${o.cls || ''}">${label}</button>`
  }

  const field = (label, inner, hint) =>
    `<label class="mb-3 block"><span class="mb-1 block text-sm font-bold text-gray-700">${label}</span>${inner}${
      hint ? `<span class="mt-1 block text-xs text-gray-500">${hint}</span>` : ''
    }</label>`

  const card = (inner, cls = '') => `<div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${cls}">${inner}</div>`

  const spinner = (cls = '') =>
    `<span class="inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-gray-200 border-t-brand ${cls}" role="status" aria-label="جارٍ التحميل"></span>`

  const pageLoader = (text = 'جارٍ التحميل…') =>
    `<div class="flex flex-col items-center justify-center gap-3 py-20 text-gray-500">${spinner('h-9 w-9')}<span>${text}</span></div>`

  const empty = (o) =>
    `<div class="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center">
      <div class="mb-2 text-4xl">${o.icon || '📭'}</div>
      <div class="font-bold text-gray-800">${o.title}</div>
      ${o.hint ? `<div class="mt-1 text-sm text-gray-500">${o.hint}</div>` : ''}
      ${o.action ? `<div class="mt-4">${o.action}</div>` : ''}
    </div>`

  // رصيد ملوّن: أخضر = للعامل، أحمر = على العامل
  function balance(value, big) {
    const cls = value > 0 ? 'text-green-700 bg-green-50' : value < 0 ? 'text-red-700 bg-red-50' : 'text-gray-600 bg-gray-100'
    const n = Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
    return `<span dir="ltr" class="inline-block whitespace-nowrap rounded-full px-3 py-1 font-extrabold ${big ? 'text-lg' : 'text-sm'} ${cls}">${value < 0 ? '-' : ''}${n} ₪</span>`
  }

  // الهيكل العام للصفحة
  function layout({ title, subtitle = '', back = '', actions = '', body = '' }) {
    const live = Store.get().live
    return `<div class="mx-auto min-h-screen max-w-3xl pb-16">
      <header class="sticky top-0 z-30 bg-brand px-4 pb-3 pt-3 text-white shadow">
        <div class="flex items-center gap-3">
          ${back ? `<button data-a="nav" data-id="${esc(back)}" aria-label="رجوع" class="h-10 w-10 shrink-0 rounded-full bg-white/15 text-xl active:bg-white/25">→</button>` : ''}
          <div class="min-w-0 flex-1">
            <a href="#/" class="block truncate text-xl font-extrabold leading-tight">${esc(title)}</a>
            ${subtitle ? `<div class="truncate text-sm text-blue-100">${esc(subtitle)}</div>` : ''}
          </div>
          <span title="${live ? 'متصل — التحديث فوري' : 'غير متصل بالتحديث الفوري'}" class="h-3 w-3 shrink-0 rounded-full ${live ? 'bg-green-400' : 'bg-yellow-300 animate-pulse'}"></span>
          ${actions}
        </div>
      </header>
      <main class="px-4 pt-4">${body}</main>
    </div>`
  }

  // ---------- نافذة منبثقة (Bottom sheet على الجوال) ----------
  const root = () => document.getElementById('modal-root')
  let prevOverflow = ''

  function closeModal() {
    if (!root().innerHTML) return
    root().innerHTML = ''
    document.body.style.overflow = prevOverflow
  }
  function openModal(title, bodyHtml, onMount) {
    closeModal()
    prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root().innerHTML = `<div id="modal-backdrop" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div class="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 pb-6 sm:rounded-3xl" role="dialog" aria-modal="true">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-lg font-extrabold">${title}</h3>
          <button data-a="modal-close" aria-label="إغلاق" class="h-10 w-10 rounded-full bg-gray-100 text-gray-600 active:bg-gray-200">✕</button>
        </div>
        ${bodyHtml}
      </div></div>`
    if (onMount) onMount(root())
  }
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeModal())

  // ---------- إشعارات ----------
  let timer
  function toast(msg, type) {
    const r = document.getElementById('toast-root')
    r.innerHTML = `<div role="status" class="fixed bottom-6 left-1/2 z-[60] max-w-[90%] -translate-x-1/2 rounded-xl px-5 py-3 text-center text-white shadow-lg ${type === 'err' ? 'bg-red-600' : 'bg-gray-900'}">${esc(msg)}</div>`
    clearTimeout(timer)
    timer = setTimeout(() => (r.innerHTML = ''), 3200)
  }

  const $ = (id) => document.getElementById(id)
  const val = (id) => ($(id) ? $(id).value : '')

  // يعطّل الزر أثناء عملية غير متزامنة
  async function busy(btnEl, fn) {
    const old = btnEl.textContent
    btnEl.disabled = true
    btnEl.textContent = 'جارٍ الحفظ…'
    try {
      return await fn()
    } finally {
      btnEl.disabled = false
      btnEl.textContent = old
    }
  }

  return { esc, inputCls, btn, field, card, spinner, pageLoader, empty, balance, layout, openModal, closeModal, toast, $, val, busy }
})()
