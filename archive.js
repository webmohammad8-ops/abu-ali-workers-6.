// أرشيف العامل الشخصي
;(() => {
  const { esc, card, btn, field, inputCls, empty, balance, layout } = UI
  const { fmt, net, showDate, dayName, toNum } = Calc

  Views.archive = (r) => {
    const { workers, entries } = Store.get()
    const back = '#/p/' + encodeURIComponent(r.pid)
    const w = workers.find((x) => x.id === r.wid)
    if (!w)
      return layout({ title: 'عامل غير موجود', back, body: empty({ icon: '🔍', title: 'لم يتم العثور على العامل', action: btn('رجوع', { a: 'nav', id: back }) }) })

    const list = entries
      .filter((e) => e.worker_id === w.id)
      .sort((a, b) => (a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date)))
    const week = Calc.sumRange(list, Calc.weekRange())
    const month = Calc.sumRange(list, Calc.monthRange())

    const sum = (label, s) =>
      card(`<div class="text-xs font-bold text-gray-500">${label}</div><div class="mt-1">${balance(s.net)}</div><div class="mt-1 text-xs text-gray-400">${s.days} يوم</div>`, 'p-3 text-center')

    const cell = (v) => (toNum(v) ? fmt(v) : '-')
    const rows = list.map((e) => {
      const n = net(e)
      return `<tr class="border-t border-gray-100">
        <td class="whitespace-nowrap px-2 py-2">${showDate(e.date)}<div class="text-xs text-gray-400">${dayName(e.date)}</div></td>
        <td class="px-2">${cell(e.daily_wage)}</td><td class="px-2">${cell(e.food)}</td><td class="px-2">${cell(e.smoke)}</td><td class="px-2">${cell(e.advance)}</td>
        <td dir="ltr" class="whitespace-nowrap px-2 font-extrabold ${n < 0 ? 'text-red-600' : 'text-green-700'}">${fmt(n)}</td>
        <td class="min-w-[110px] px-2 text-start text-xs text-gray-500">${esc(e.notes || '')}</td>
        <td class="whitespace-nowrap px-2">
          <button data-a="editEntry" data-id="${esc(e.id)}" aria-label="تعديل" class="me-1 h-10 w-10 rounded-lg bg-gray-100 active:bg-gray-200">✎</button>
          <button data-a="deleteEntry" data-id="${esc(e.id)}" aria-label="حذف" class="h-10 w-10 rounded-lg bg-red-50 active:bg-red-100">🗑</button>
        </td></tr>`
    }).join('')

    const table = list.length
      ? `<div class="overflow-x-auto rounded-2xl border border-gray-200 bg-white"><table class="w-full min-w-[720px] text-center text-sm">
          <thead class="bg-gray-100 text-gray-700"><tr>${['التاريخ', 'اليومية', 'أكل', 'دخان', 'سلفة', 'الصافي', 'ملاحظات', 'تعديل / حذف'].map((h) => `<th class="whitespace-nowrap px-2 py-3 font-extrabold">${h}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody></table></div>`
      : empty({ icon: '📒', title: 'لا توجد سجلات لهذا العامل', hint: 'اضغط «إضافة يوم جديد»' })

    return layout({
      title: w.name, subtitle: `سكنة ${w.sukneh_number || '—'} • ${w.group_type}`, back,
      body: `
        <div class="grid grid-cols-3 gap-2">
          ${sum('هذا الأسبوع', week)}${sum('هذا الشهر', month)}
          ${card(`<div class="text-xs font-bold text-gray-500">الإجمالي</div><div class="mt-1">${balance(Calc.total(list))}</div><div class="mt-1 text-xs text-gray-400">${list.length} سجل</div>`, 'p-3 text-center')}
        </div>
        <p class="mt-1 text-xs text-gray-400">الأسبوع من السبت إلى الجمعة. الأخضر = للعامل، الأحمر = على العامل.</p>
        ${btn('＋ إضافة يوم جديد', { a: 'addEntry', size: 'lg', cls: 'mt-3 w-full' })}
        <div class="mt-4">${table}</div>`,
    })
  }

  function form(e) {
    return `
      ${field('التاريخ *', `<input id="en-date" type="date" class="${inputCls}" value="${esc(e.date)}">`)}
      ${field('اليومية (₪)', `<input id="en-wage" class="${inputCls}" inputmode="decimal" placeholder="0" autocomplete="off" value="${esc(e.daily_wage)}">`)}
      <div class="grid grid-cols-3 gap-2">
        ${field('أكل', `<input id="en-food" class="${inputCls}" inputmode="decimal" placeholder="0" autocomplete="off" value="${esc(e.food)}">`)}
        ${field('دخان', `<input id="en-smoke" class="${inputCls}" inputmode="decimal" placeholder="0" autocomplete="off" value="${esc(e.smoke)}">`)}
        ${field('سلفة', `<input id="en-adv" class="${inputCls}" inputmode="decimal" placeholder="0" autocomplete="off" value="${esc(e.advance)}">`)}
      </div>
      ${field('ملاحظات', `<input id="en-notes" class="${inputCls}" autocomplete="off" value="${esc(e.notes)}">`)}
      <div id="en-preview" class="mb-3 rounded-xl p-3 text-center text-lg font-extrabold"></div>
      <div class="flex gap-2">${btn('حفظ', { a: 'saveEntry', id: e.id || '', cls: 'flex-1' })}${btn('إلغاء', { a: 'modal-close', v: 'secondary', cls: 'flex-1' })}</div>`
  }

  const read = () => ({
    daily_wage: UI.val('en-wage'), food: UI.val('en-food'), smoke: UI.val('en-smoke'), advance: UI.val('en-adv'),
  })

  function mount() {
    const upd = () => {
      const n = net(read())
      const box = UI.$('en-preview')
      box.className = `mb-3 rounded-xl p-3 text-center text-lg font-extrabold ${n < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`
      box.innerHTML = `الصافي: <span dir="ltr">${fmt(n)} ₪</span>`
    }
    ;['en-wage', 'en-food', 'en-smoke', 'en-adv'].forEach((id) => UI.$(id).addEventListener('input', upd))
    upd()
  }

  const blank = () => ({ date: Calc.todayStr(), daily_wage: '', food: '', smoke: '', advance: '', notes: '' })

  Actions.addEntry = () => UI.openModal('إضافة يوم جديد', form(blank()), mount)

  Actions.editEntry = (el) => {
    const e = Store.get().entries.find((x) => x.id === el.dataset.id)
    if (!e) return
    const z = (v) => (toNum(v) ? String(v) : '')
    UI.openModal('تعديل اليوم', form({ id: e.id, date: e.date, daily_wage: z(e.daily_wage), food: z(e.food), smoke: z(e.smoke), advance: z(e.advance), notes: e.notes || '' }), mount)
  }

  Actions.saveEntry = (el) => {
    const date = UI.val('en-date')
    if (!date) return UI.toast('اختر التاريخ', 'err')
    const v = read()
    const row = {
      date, daily_wage: toNum(v.daily_wage), food: toNum(v.food), smoke: toNum(v.smoke), advance: toNum(v.advance),
      notes: UI.val('en-notes').trim() || null,
    }
    if (!row.daily_wage && !row.food && !row.smoke && !row.advance) return UI.toast('اكتب مبلغًا واحدًا على الأقل', 'err')
    const id = el.dataset.id
    UI.busy(el, async () => {
      try {
        if (id) await Store.updateEntry(id, row)
        else await Store.addEntry({ ...row, worker_id: App.parseRoute().wid })
        UI.closeModal()
        UI.toast(id ? 'تم التعديل' : 'تمت إضافة اليوم')
      } catch (e) {
        UI.toast(e.message || 'تعذّر الحفظ', 'err')
      }
    })
  }

  Actions.deleteEntry = async (el) => {
    const e = Store.get().entries.find((x) => x.id === el.dataset.id)
    if (!e || !window.confirm(`حذف سجل ${showDate(e.date)}؟`)) return
    try {
      await Store.deleteEntry(e.id)
      UI.toast('تم الحذف')
    } catch (err) {
      UI.toast(err.message || 'تعذّر الحذف', 'err')
    }
  }
})()
