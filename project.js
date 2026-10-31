// صفحة المشروع: 3 تابات (العمال / الفواتير / الدفعات)
;(() => {
  const { esc, btn, empty, layout } = UI

  const TABS = [
    { id: 'workers', label: '👷 العمال' },
    { id: 'invoices', label: '🧾 الفواتير' },
    { id: 'pay', label: '💵 الدفعات' },
  ]

  Views.project = (r) => {
    const project = Store.get().projects.find((p) => p.id === r.pid)
    if (!project)
      return layout({
        title: 'مشروع غير موجود', back: '#/',
        body: empty({ icon: '🔍', title: 'لم يتم العثور على المشروع', action: btn('العودة للرئيسية', { a: 'nav', id: '#/' }) }),
      })

    const tab = TABS.some((t) => t.id === r.q.get('tab')) ? r.q.get('tab') : 'workers'
    const tabs = TABS.map((t) =>
      `<button data-a="setTab" data-id="${t.id}" class="min-h-[46px] rounded-xl text-sm font-extrabold transition ${tab === t.id ? 'bg-white text-brand shadow' : 'text-gray-600'}">${t.label}</button>`).join('')

    const content = tab === 'workers' ? WorkersTab.render(project) : tab === 'invoices' ? InvoicesTab.render(project) : GroupPayTab.render(project)

    return layout({
      title: project.name,
      subtitle: project.location ? '📍 ' + project.location : '',
      back: '#/',
      actions: `<button data-a="deleteProject" data-id="${esc(project.id)}" aria-label="حذف المشروع" class="h-10 w-10 shrink-0 rounded-full bg-white/15 active:bg-white/25">🗑</button>`,
      body: `<div class="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-gray-200 p-1">${tabs}</div>${content}`,
    })
  }

  Actions.setTab = (el) => {
    const r = App.parseRoute()
    location.replace(`#/p/${encodeURIComponent(r.pid)}?tab=${el.dataset.id}`)
  }

  Actions.deleteProject = async (el) => {
    const p = Store.get().projects.find((x) => x.id === el.dataset.id)
    if (!p || !window.confirm(`حذف المشروع «${p.name}» مع كل عماله وفواتيره وسجلاته؟\nلا يمكن التراجع.`)) return
    try {
      await Store.deleteProject(p.id)
      UI.toast('تم حذف المشروع')
      App.go('#/')
    } catch (e) {
      UI.toast(e.message || 'تعذّر الحذف', 'err')
    }
  }
})()
