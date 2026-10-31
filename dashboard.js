// الصفحة الرئيسية
;(() => {
  const { esc, card, btn, field, inputCls, empty, layout } = UI
  const { fmt, showDate, toNum } = Calc

  const stat = (label, value, sub) =>
    card(`<div class="text-2xl font-extrabold text-brand">${value}</div>
      <div class="text-sm font-bold text-gray-700">${label}</div>
      ${sub ? `<div class="text-xs text-gray-400">${sub}</div>` : ''}`, 'text-center')

  Views.dashboard = () => {
    const { projects, workers, entries, invoices } = Store.get()

    const m = Calc.monthRange()
    const wages = entries.filter((e) => Calc.inRange(e.date, m)).reduce((s, e) => s + toNum(e.daily_wage), 0)
    const inv = invoices.filter((i) => Calc.inRange(i.created_at.slice(0, 10), m)).reduce((s, i) => s + toNum(i.amount), 0)

    const count = {}
    workers.forEach((w) => (count[w.project_id] = (count[w.project_id] || 0) + 1))
    const nameOf = (id) => (projects.find((p) => p.id === id) || {}).name || '—'
    const last = [...invoices].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)

    const projectsHtml = projects.length
      ? `<div class="space-y-3">${projects.map((p) => `
          <a href="#/p/${esc(p.id)}" class="block">
            ${card(`<div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-lg font-extrabold">${esc(p.name)}</div>
                <div class="truncate text-sm text-gray-500">📍 ${esc(p.location || 'بدون موقع')}</div>
              </div>
              <div class="shrink-0 rounded-xl bg-brand-light px-3 py-2 text-center text-brand">
                <div class="text-lg font-extrabold leading-none">${count[p.id] || 0}</div><div class="text-xs">عامل</div>
              </div></div>`, 'active:bg-gray-50')}
          </a>`).join('')}</div>`
      : empty({ icon: '🏗️', title: 'لا توجد مشاريع بعد', hint: 'ابدأ بإضافة أول مشروع' })

    const invoicesHtml = last.length
      ? `<div class="space-y-2">${last.map((i) => `
          <a href="#/p/${esc(i.project_id)}?tab=invoices" class="block">
            ${card(`<div class="flex items-center gap-3">
              ${i.image_url
                ? `<img src="${esc(i.image_url)}" alt="" loading="lazy" class="h-14 w-14 shrink-0 rounded-lg bg-gray-100 object-cover">`
                : `<div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-2xl">🧾</div>`}
              <div class="min-w-0 flex-1">
                <div class="truncate font-bold">${esc(nameOf(i.project_id))}</div>
                <div class="truncate text-sm text-gray-500">${esc(i.notes || 'بدون ملاحظة')}</div>
              </div>
              <div class="shrink-0 text-end">
                <div class="font-extrabold">${fmt(i.amount)} ₪</div>
                <div class="text-xs text-gray-400">${showDate(i.created_at.slice(0, 10))}</div>
              </div></div>`, 'p-3 active:bg-gray-50')}
          </a>`).join('')}</div>`
      : empty({ icon: '🧾', title: 'لا توجد فواتير مرفوعة', hint: 'ارفع الفواتير من داخل أي مشروع' })

    return layout({
      title: 'نظام حسابات المقاولين',
      subtitle: `عدد المشاريع: ${projects.length}`,
      body: `
        <div class="grid grid-cols-2 gap-3">
          ${stat('إجمالي المشاريع', projects.length)}
          ${stat('إجمالي العمال', workers.length)}
          ${stat('مصروف الشهر', fmt(wages + inv) + ' ₪', 'أجور + فواتير')}
          ${stat('عدد الفواتير', invoices.length)}
        </div>
        ${btn('＋ إضافة مشروع جديد', { a: 'addProject', size: 'lg', cls: 'mt-4 w-full' })}
        <h2 class="mb-2 mt-6 text-lg font-extrabold">المشاريع</h2>${projectsHtml}
        <h2 class="mb-2 mt-6 text-lg font-extrabold">آخر 5 فواتير</h2>${invoicesHtml}`,
    })
  }

  Actions.addProject = () => {
    UI.openModal('مشروع جديد', `
      ${field('اسم المشروع *', `<input id="pj-name" class="${inputCls}" autocomplete="off">`)}
      ${field('الموقع', `<input id="pj-loc" class="${inputCls}" autocomplete="off">`)}
      <div class="flex gap-2">${btn('حفظ', { a: 'saveProject', cls: 'flex-1' })}${btn('إلغاء', { a: 'modal-close', v: 'secondary', cls: 'flex-1' })}</div>`,
      () => UI.$('pj-name').focus())
  }

  Actions.saveProject = (el) => {
    const name = UI.val('pj-name').trim()
    if (!name) return UI.toast('اكتب اسم المشروع', 'err')
    UI.busy(el, async () => {
      try {
        await Store.addProject({ name, location: UI.val('pj-loc').trim() || null })
        UI.closeModal()
        UI.toast('تمت إضافة المشروع')
      } catch (e) {
        UI.toast(e.message || 'تعذّر الحفظ', 'err')
      }
    })
  }
})()
