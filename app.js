// الموجّه (Hash Router) + الرسم + تفويض الأحداث
const App = (() => {
  const { esc } = UI

  function parseRoute() {
    const h = location.hash.replace(/^#/, '') || '/'
    const [path, qs] = h.split('?')
    const q = new URLSearchParams(qs || '')
    let m = path.match(/^\/p\/([^/]+)\/w\/([^/]+)$/)
    if (m) return { name: 'archive', pid: decodeURIComponent(m[1]), wid: decodeURIComponent(m[2]), q }
    m = path.match(/^\/p\/([^/]+)$/)
    if (m) return { name: 'project', pid: decodeURIComponent(m[1]), q }
    return { name: 'dashboard', q }
  }

  const go = (hash) => { location.hash = hash }

  const configured = () => !!(window.CONFIG && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY)

  function setupScreen(msg) {
    return `<div class="mx-auto max-w-lg p-4 pt-10">${UI.card(`
      <h1 class="mb-2 text-xl font-extrabold">⚙️ إعداد Supabase مطلوب</h1>
      <p class="mb-3 text-gray-600">${msg}</p>
      <pre dir="ltr" class="overflow-x-auto rounded-xl bg-gray-100 p-3 text-left text-sm">window.CONFIG = {
  SUPABASE_URL: 'https://xxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...',
}</pre>
      <p class="mt-3 text-sm text-gray-500">افتح الملف <b>config.js</b> وضع القيمتين، ثم أعد تحميل الصفحة.</p>`)}</div>`
  }

  let pending = false

  // force=true: رسم مباشر. غير ذلك: إذا كان المستخدم يكتب في حقل نؤجّل الرسم حتى ينتهي كي لا يضيع المؤشر
  function render(force) {
    const root = document.getElementById('app')
    if (!force) {
      const a = document.activeElement
      if (a && root.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) {
        pending = true
        return
      }
    }
    pending = false
    const y = window.scrollY
    const s = Store.get()
    const r = parseRoute()
    let html
    try {
      if (!configured()) html = setupScreen('لم يتم العثور على بيانات الاتصال بـ Supabase.')
      else if (!window.supabase) html = setupScreen('تعذّر تحميل مكتبة Supabase. تأكد من الاتصال بالإنترنت ثم أعد تحميل الصفحة.')
      else if (s.loading) html = UI.layout({ title: 'نظام حسابات المقاولين', body: UI.pageLoader() })
      else if (s.error && !s.projects.length)
        html = UI.layout({
          title: 'نظام حسابات المقاولين',
          body: UI.card(`<div class="text-center"><div class="mb-2 text-3xl">⚠️</div><div class="mb-1 font-bold">تعذّر تحميل البيانات</div>
            <div dir="ltr" class="mb-3 text-sm text-gray-500">${esc(s.error)}</div>${UI.btn('إعادة المحاولة', { a: 'reload' })}</div>`),
        })
      else html = Views[r.name](r)
    } catch (e) {
      console.error(e)
      html = UI.layout({ title: 'خطأ', body: UI.card(`<div class="text-center text-red-600">حدث خطأ غير متوقع: ${esc(e.message)}</div>`) })
    }
    root.innerHTML = html
    window.scrollTo(0, y)
  }

  // ---------- الأحداث ----------
  document.addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') return UI.closeModal()
    const el = e.target.closest('[data-a]')
    if (!el) return
    const fn = Actions[el.dataset.a]
    if (fn) fn(el, e)
  })
  document.addEventListener('focusout', () => {
    if (pending) setTimeout(() => pending && render(), 120)
  })
  window.addEventListener('hashchange', () => {
    UI.closeModal()
    render(true)
    window.scrollTo(0, 0)
  })

  Actions['modal-close'] = () => UI.closeModal()
  Actions.nav = (el) => go(el.dataset.id)
  Actions.reload = () => { Store.get().loading = true; render(true); Store.reload() }

  function start() {
    Store.on(() => render())
    if (configured() && window.supabase) Store.init()
    render(true)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {})
    }
  }

  return { render, go, parseRoute, start }
})()

App.start()
