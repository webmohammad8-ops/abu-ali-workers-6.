// تاب العمال
const WorkersTab = (() => {
  const { esc, card, btn, field, inputCls, empty, balance } = UI
  const { GROUPS } = Calc

  const S = { pid: null, filter: 'الكل' }

  function render(project) {
    if (S.pid !== project.id) { S.pid = project.id; S.filter = 'الكل' }
    const { workers, entries } = Store.get()
    const list = workers.filter((w) => w.project_id === project.id).sort((a, b) => a.name.localeCompare(b.name, 'ar'))

    const by = {}
    entries.forEach((e) => (by[e.worker_id] = by[e.worker_id] || []).push(e))

    const shown = S.filter === 'الكل' ? list : list.filter((w) => w.group_type === S.filter)
    const count = (g) => (g === 'الكل' ? list.length : list.filter((w) => w.group_type === g).length)

    const chips = ['الكل', ...GROUPS].map((g) =>
      `<button data-a="workerFilter" data-id="${g}" class="min-h-[42px] shrink-0 rounded-full border px-4 text-sm font-bold ${S.filter === g ? 'border-brand bg-brand text-white' : 'border-gray-300 bg-white text-gray-700'}">${g} <span class="opacity-70">(${count(g)})</span></button>`
    ).join('')

    let cards
    if (!list.length) cards = empty({ icon: '👷', title: 'لا يوجد عمال في هذا المشروع', hint: 'اضغط «إضافة عامل» للبدء' })
    else if (!shown.length) cards = empty({ icon: '🔎', title: `لا يوجد عمال في مجموعة «${esc(S.filter)}»` })
    else
      cards = shown.map((w) => card(`
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="truncate text-lg font-extrabold">${esc(w.name)}</div>
            <div class="mt-1 flex flex-wrap gap-2 text-sm">
              <span class="rounded-lg bg-gray-100 px-2 py-0.5 text-gray-700">سكنة: ${esc(w.sukneh_number || '—')}</span>
              <span class="rounded-lg bg-brand-light px-2 py-0.5 font-bold text-brand">${esc(w.group_type)}</span>
            </div>
          </div>
          <button data-a="editWorker" data-id="${esc(w.id)}" aria-label="تعديل" class="h-10 w-10 shrink-0 rounded-full bg-gray-100 active:bg-gray-200">✎</button>
        </div>
        <div class="mt-3 flex items-center justify-between gap-2">
          <div><div class="text-xs text-gray-500">إجمالي حسابه</div>${balance(Calc.total(by[w.id] || []), true)}</div>
          <a href="#/p/${esc(project.id)}/w/${esc(w.id)}">${btn('أرشيفه ←')}</a>
        </div>`)).join('<div class="h-3"></div>')

    return `${btn('＋ إضافة عامل', { a: 'addWorker', size: 'lg', cls: 'w-full' })}
      <div class="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">${chips}</div>
      <div class="mt-4">${cards}</div>`
  }

  function form(w) {
    const radios = GROUPS.map((g) => `
      <label class="block">
        <input type="radio" name="wk-group" value="${g}" class="peer sr-only" ${w.group_type === g ? 'checked' : ''}>
        <span class="flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-bold peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white">${g}</span>
      </label>`).join('')
    return `
      ${field('الاسم *', `<input id="wk-name" class="${inputCls}" autocomplete="off" value="${esc(w.name)}">`)}
      ${field('رقم السكنة', `<input id="wk-suk" class="${inputCls}" inputmode="numeric" autocomplete="off" value="${esc(w.sukneh_number || '')}">`)}
      <div class="mb-3"><span class="mb-1 block text-sm font-bold text-gray-700">المجموعة</span><div class="grid grid-cols-4 gap-2">${radios}</div></div>
      <div class="mt-2 flex gap-2">${btn('حفظ', { a: 'saveWorker', id: w.id || '', cls: 'flex-1' })}${btn('إلغاء', { a: 'modal-close', v: 'secondary', cls: 'flex-1' })}</div>
      ${w.id ? btn('🗑 حذف العامل', { a: 'deleteWorker', id: w.id, v: 'danger', cls: 'mt-2 w-full' }) : ''}`
  }

  Actions.workerFilter = (el) => { S.filter = el.dataset.id; App.render(true) }

  Actions.addWorker = () =>
    UI.openModal('عامل جديد', form({ name: '', sukneh_number: '', group_type: 'عامل' }), () => UI.$('wk-name').focus())

  Actions.editWorker = (el) => {
    const w = Store.get().workers.find((x) => x.id === el.dataset.id)
    if (w) UI.openModal('تعديل عامل', form(w))
  }

  Actions.saveWorker = (el) => {
    const name = UI.val('wk-name').trim()
    if (!name) return UI.toast('اكتب اسم العامل', 'err')
    const g = document.querySelector('input[name="wk-group"]:checked')
    const row = { name, sukneh_number: UI.val('wk-suk').trim() || null, group_type: g ? g.value : 'عامل' }
    const id = el.dataset.id
    UI.busy(el, async () => {
      try {
        if (id) await Store.updateWorker(id, row)
        else await Store.addWorker({ ...row, project_id: App.parseRoute().pid })
        UI.closeModal()
        UI.toast(id ? 'تم التعديل' : 'تمت إضافة العامل')
      } catch (e) {
        UI.toast(e.message || 'تعذّر الحفظ', 'err')
      }
    })
  }

  Actions.deleteWorker = async (el) => {
    const w = Store.get().workers.find((x) => x.id === el.dataset.id)
    if (!w || !window.confirm(`حذف العامل «${w.name}» وكل سجلاته؟`)) return
    try {
      await Store.deleteWorker(w.id)
      UI.closeModal()
      UI.toast('تم الحذف')
    } catch (e) {
      UI.toast(e.message || 'تعذّر الحذف', 'err')
    }
  }

  return { render }
})()
