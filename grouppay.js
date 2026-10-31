// تاب الدفعات: توزيع دفعة على مجموعة
const GroupPayTab = (() => {
  const { esc, card, btn, inputCls, empty, balance } = UI
  const { GROUPS, fmt, round2, toNum } = Calc

  const G = {
    pid: null, group: null, amount: '', mode: 'each', date: Calc.todayStr(),
    selected: new Set(), seen: new Set(), extras: {}, exW: '', exA: '',
  }

  function resetAll(pid) {
    Object.assign(G, { pid, group: null, amount: '', mode: 'each', date: Calc.todayStr(), extras: {}, exW: '', exA: '' })
    G.selected = new Set()
    G.seen = new Set()
  }

  const groupWorkers = () =>
    G.group
      ? Store.get().workers.filter((w) => w.project_id === G.pid && w.group_type === G.group).sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      : []

  // عمال جدد (Realtime) يُعلَّمون تلقائيًا، والمحذوفون يُزالون
  function sync() {
    const ws = groupWorkers()
    ws.forEach((w) => { if (!G.seen.has(w.id)) { G.seen.add(w.id); G.selected.add(w.id) } })
    const ids = new Set(ws.map((w) => w.id))
    ;[...G.selected].forEach((id) => !ids.has(id) && G.selected.delete(id))
    Object.keys(G.extras).forEach((id) => !G.selected.has(id) && delete G.extras[id])
    return ws
  }

  function plan(ws) {
    const ids = ws.filter((w) => G.selected.has(w.id)).map((w) => w.id)
    return Calc.distribute({ amount: G.amount, mode: G.mode, workerIds: ids, extras: G.extras })
  }

  const amtHtml = (p) =>
    p ? `<div class="font-extrabold text-brand">${fmt(p.amount)} ₪</div>${p.extra > 0 ? `<div class="text-xs text-green-700">+${fmt(p.extra)} إضافي</div>` : ''}` : ''

  const step = (n, title, inner) =>
    card(`<div class="mb-3 flex items-center gap-2"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-extrabold text-white">${n}</span><h3 class="font-extrabold">${title}</h3></div>${inner}`, 'mb-3')

  function render(project) {
    if (G.pid !== project.id) resetAll(project.id)
    const { workers, entries } = Store.get()
    const all = workers.filter((w) => w.project_id === project.id)
    const ws = sync()
    const p = plan(ws)
    const byId = Object.fromEntries(p.map((x) => [x.workerId, x]))
    const grand = round2(p.reduce((s, x) => s + x.amount, 0))

    const bal = {}
    if (G.group) {
      const by = {}
      entries.forEach((e) => (by[e.worker_id] = by[e.worker_id] || []).push(e))
      ws.forEach((w) => (bal[w.id] = Calc.total(by[w.id] || [])))
    }

    const groupBtns = GROUPS.map((g) => {
      const c = all.filter((w) => w.group_type === g).length
      return `<button data-a="gpGroup" data-id="${g}" class="min-h-[56px] rounded-xl border text-sm font-extrabold ${G.group === g ? 'border-brand bg-brand text-white' : 'border-gray-300 bg-white'}">${g}<div class="text-xs font-normal opacity-80">${c} عامل</div></button>`
    }).join('')

    let rest = ''
    if (!G.group) rest = empty({ icon: '👆', title: 'اختر مجموعة للبدء' })
    else if (!ws.length) rest = empty({ icon: '👷', title: `لا يوجد عمال في مجموعة «${esc(G.group)}»`, hint: 'أضف عمالًا من تاب العمال أولًا' })
    else {
      const modeBtns = [['each', 'لكل عامل'], ['split', 'يُقسم عليهم']].map(([k, l]) =>
        `<button data-a="gpMode" data-id="${k}" class="min-h-[44px] rounded-lg text-sm font-bold ${G.mode === k ? 'bg-white text-brand shadow' : 'text-gray-600'}">${l}</button>`).join('')

      const rows = ws.map((w) => `
        <label class="flex min-h-[56px] cursor-pointer items-center gap-3 border-t border-gray-100 py-2 first:border-0">
          <input type="checkbox" data-a="gpToggle" data-id="${esc(w.id)}" ${G.selected.has(w.id) ? 'checked' : ''} class="h-6 w-6 shrink-0 accent-blue-600">
          <div class="min-w-0 flex-1">
            <div class="truncate font-bold">${esc(w.name)}</div>
            <div class="text-xs text-gray-400">رصيده الحالي: ${balance(bal[w.id] || 0)}</div>
          </div>
          <div id="gp-amt-${esc(w.id)}" class="shrink-0 text-end">${G.selected.has(w.id) ? amtHtml(byId[w.id]) : ''}</div>
        </label>`).join('')

      const opts = ws.filter((w) => G.selected.has(w.id))
        .map((w) => `<option value="${esc(w.id)}" ${G.exW === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')
      const nameOf = (id) => (ws.find((w) => w.id === id) || {}).name || ''
      const extraList = Object.entries(G.extras).map(([id, v]) => `
        <li class="flex items-center justify-between rounded-xl bg-green-50 px-3 py-2">
          <span class="font-bold">${esc(nameOf(id))} <span class="text-green-700">+${fmt(v)} ₪</span></span>
          <button data-a="gpRemoveExtra" data-id="${esc(id)}" aria-label="إزالة" class="h-9 w-9 rounded-full bg-white text-red-600">✕</button>
        </li>`).join('')

      rest = `
        ${step(2, 'المبلغ', `
          <input id="gp-amount" data-gp="amount" class="${inputCls} text-xl font-extrabold" inputmode="decimal" placeholder="مثال: 1000" autocomplete="off" value="${esc(G.amount)}">
          <div class="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">${modeBtns}</div>
          <p class="mt-2 text-xs text-gray-500">${G.mode === 'each' ? 'كل عامل محدد يستلم المبلغ كاملًا.' : 'المبلغ يُقسم بالتساوي على العمال المحددين.'}</p>
          <label class="mt-3 block"><span class="mb-1 block text-sm font-bold text-gray-700">تاريخ الدفعة</span>
            <input type="date" data-gp="date" class="${inputCls}" value="${esc(G.date)}"></label>`)}
        ${step(3, 'العمال المشمولون', `
          <div class="mb-2 flex gap-2">
            ${btn('تحديد الكل', { a: 'gpAll', v: 'secondary', size: 'sm' })}${btn('إلغاء الكل', { a: 'gpNone', v: 'secondary', size: 'sm' })}
            <span class="ms-auto self-center text-sm text-gray-500">${G.selected.size} / ${ws.length}</span>
          </div>${rows}`)}
        ${step(4, 'مبلغ إضافي لعامل معين (اختياري)', `
          <div class="grid grid-cols-[1fr_110px] gap-2">
            <select data-gp="exW" class="${inputCls}"><option value="">اختر العامل…</option>${opts}</select>
            <input data-gp="exA" class="${inputCls}" inputmode="decimal" placeholder="المبلغ" autocomplete="off" value="${esc(G.exA)}">
          </div>
          ${btn('＋ إضافة الزيادة', { a: 'gpAddExtra', v: 'secondary', cls: 'mt-2 w-full' })}
          ${extraList ? `<ul class="mt-3 space-y-2">${extraList}</ul>` : ''}`)}
        <div class="sticky bottom-3 z-20">${card(`
          <div class="mb-2 flex items-center justify-between">
            <span id="gp-count" class="text-gray-600">${p.length} عامل</span>
            <span class="text-xl font-extrabold text-brand">المجموع: <span id="gp-total">${fmt(grand)}</span> ₪</span>
          </div>
          ${btn('✓ تأكيد وتوزيع', { a: 'gpConfirm', size: 'lg', cls: 'w-full', attrs: 'id="gp-confirm"', disabled: !(p.length && grand > 0) })}
          <p class="mt-2 text-center text-xs text-gray-400">تُسجَّل كسلفة/دفعة في سجل كل عامل وتُخصم من رصيده.</p>`, 'border-brand/30 shadow-lg')}</div>`
    }

    return `<h2 class="mb-3 text-lg font-extrabold">توزيع دفعة على مجموعة</h2>
      ${step(1, 'اختر المجموعة', `<div class="grid grid-cols-4 gap-2">${groupBtns}</div>`)}${rest}`
  }

  // تحديث الأرقام فقط أثناء الكتابة (بدون إعادة رسم الصفحة كي لا يختفي مؤشر الكتابة/لوحة المفاتيح)
  function patch() {
    const ws = groupWorkers()
    const p = plan(ws)
    const byId = Object.fromEntries(p.map((x) => [x.workerId, x]))
    const grand = round2(p.reduce((s, x) => s + x.amount, 0))
    ws.forEach((w) => {
      const el = UI.$('gp-amt-' + w.id)
      if (el) el.innerHTML = G.selected.has(w.id) ? amtHtml(byId[w.id]) : ''
    })
    if (UI.$('gp-total')) UI.$('gp-total').textContent = fmt(grand)
    if (UI.$('gp-count')) UI.$('gp-count').textContent = p.length + ' عامل'
    if (UI.$('gp-confirm')) UI.$('gp-confirm').disabled = !(p.length && grand > 0)
  }

  document.addEventListener('input', (e) => {
    const k = e.target.dataset && e.target.dataset.gp
    if (k === 'amount') { G.amount = e.target.value; patch() }
    else if (k === 'exA') G.exA = e.target.value
  })
  document.addEventListener('change', (e) => {
    const k = e.target.dataset && e.target.dataset.gp
    if (k === 'date') G.date = e.target.value
    else if (k === 'exW') G.exW = e.target.value
    else if (e.target.dataset && e.target.dataset.a === 'gpToggle') {
      const id = e.target.dataset.id
      G.selected.has(id) ? G.selected.delete(id) : G.selected.add(id)
      if (!G.selected.has(id)) delete G.extras[id]
      if (G.exW === id) G.exW = ''
      App.render(true)
    }
  })

  Actions.gpGroup = (el) => {
    G.group = el.dataset.id
    G.extras = {}; G.exW = ''; G.exA = ''
    G.seen = new Set()
    G.selected = new Set() // sync() يعلّم كل عمال المجموعة افتراضيًا
    App.render(true)
  }
  Actions.gpMode = (el) => { G.mode = el.dataset.id; App.render(true) }
  Actions.gpAll = () => { groupWorkers().forEach((w) => G.selected.add(w.id)); App.render(true) }
  Actions.gpNone = () => { G.selected = new Set(); G.extras = {}; G.exW = ''; App.render(true) }
  Actions.gpRemoveExtra = (el) => { delete G.extras[el.dataset.id]; App.render(true) }
  Actions.gpAddExtra = () => {
    const v = toNum(G.exA)
    if (!G.exW) return UI.toast('اختر العامل', 'err')
    if (!(v > 0)) return UI.toast('اكتب المبلغ الإضافي', 'err')
    G.extras[G.exW] = round2(toNum(G.extras[G.exW]) + v)
    G.exW = ''; G.exA = ''
    App.render(true)
  }

  Actions.gpConfirm = async (el) => {
    const ws = groupWorkers()
    const p = plan(ws)
    const grand = round2(p.reduce((s, x) => s + x.amount, 0))
    if (!p.length || !(grand > 0)) return
    if (!window.confirm(`سيتم تسجيل دفعة لـ ${p.length} عامل من مجموعة «${G.group}» بمجموع ${fmt(grand)} ₪.\nهل تريد المتابعة؟`)) return
    const rows = p.map((x) => ({
      worker_id: x.workerId, date: G.date, daily_wage: 0, food: 0, smoke: 0, advance: x.amount,
      notes: `دفعة جماعية - ${G.group}` + (x.extra > 0 ? ` (منها ${fmt(x.extra)} إضافي)` : ''),
    }))
    el.disabled = true
    el.textContent = 'جارٍ التوزيع…'
    try {
      await Store.addEntries(rows) // طلب واحد: ينجح للجميع أو يفشل للجميع
      UI.toast(`تم توزيع ${fmt(grand)} ₪ على ${p.length} عامل ✓`)
      G.amount = ''; G.extras = {}; G.exW = ''; G.exA = ''
      G.selected = new Set(ws.map((w) => w.id))
    } catch (e) {
      UI.toast(e.message || 'تعذّر التوزيع', 'err')
    }
    App.render(true)
  }

  return { render }
})()
