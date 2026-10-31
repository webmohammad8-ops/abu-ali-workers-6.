// تاب الفواتير (Gallery + رفع بالكاميرا)
const InvoicesTab = (() => {
  const { esc, btn, field, inputCls, empty } = UI
  const { fmt, showDate, toNum } = Calc

  let file = null
  let previewUrl = null

  function render(project) {
    const list = Store.get().invoices.filter((i) => i.project_id === project.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
    const sum = list.reduce((s, i) => s + toNum(i.amount), 0)

    const gallery = list.length
      ? `<div class="grid grid-cols-2 gap-3">${list.map((i) => `
          <button data-a="viewInvoice" data-id="${esc(i.id)}" class="overflow-hidden rounded-2xl border border-gray-200 bg-white text-start shadow-sm active:opacity-80">
            ${i.image_url
              ? `<img src="${esc(i.image_url)}" alt="فاتورة" loading="lazy" class="aspect-[3/4] w-full bg-gray-100 object-cover">`
              : `<div class="flex aspect-[3/4] items-center justify-center bg-gray-100 text-4xl">🧾</div>`}
            <div class="p-2">
              <div class="font-extrabold">${fmt(i.amount)} ₪</div>
              <div class="text-xs text-gray-400">${showDate(i.created_at.slice(0, 10))}</div>
              ${i.notes ? `<div class="mt-1 line-clamp-2 text-xs text-gray-600">${esc(i.notes)}</div>` : ''}
            </div>
          </button>`).join('')}</div>`
      : empty({ icon: '🧾', title: 'لا توجد فواتير في هذا المشروع', hint: 'ارفع أول فاتورة بالكاميرا' })

    return `${btn('📷 رفع فاتورة من الجوال', { a: 'addInvoice', size: 'lg', cls: 'w-full' })}
      ${list.length ? `<div class="mt-3 flex justify-between rounded-xl bg-brand-light px-4 py-2 text-sm font-bold text-brand"><span>${list.length} فاتورة</span><span>المجموع: ${fmt(sum)} ₪</span></div>` : ''}
      <div class="mt-4">${gallery}</div>`
  }

  function setFile(f) {
    file = f
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = f ? URL.createObjectURL(f) : null
    const box = UI.$('inv-preview')
    if (box) box.innerHTML = previewUrl
      ? `<img src="${previewUrl}" alt="معاينة" class="mb-3 max-h-64 w-full rounded-xl bg-gray-100 object-contain">`
      : `<div class="mb-3 flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400">لم تُلتقط صورة بعد</div>`
    const save = UI.$('inv-save')
    if (save) save.disabled = !file
  }

  Actions.addInvoice = () => {
    file = null
    UI.openModal('رفع فاتورة', `
      <input id="inv-cam" type="file" accept="image/*" capture="environment" hidden>
      <input id="inv-gal" type="file" accept="image/*" hidden>
      <div id="inv-preview"></div>
      <div class="mb-3 grid grid-cols-2 gap-2">
        ${btn('📷 التقاط صورة', { a: 'invCam', v: 'secondary' })}${btn('🖼 من المعرض', { a: 'invGal', v: 'secondary' })}
      </div>
      ${field('المبلغ (₪)', `<input id="inv-amount" class="${inputCls}" inputmode="decimal" placeholder="0" autocomplete="off">`)}
      ${field('ملاحظات', `<input id="inv-notes" class="${inputCls}" autocomplete="off">`)}
      <div class="flex gap-2">${btn('حفظ الفاتورة', { a: 'saveInvoice', cls: 'flex-1', attrs: 'id="inv-save"', disabled: true })}${btn('إلغاء', { a: 'modal-close', v: 'secondary', cls: 'flex-1' })}</div>`,
      () => {
        setFile(null)
        UI.$('inv-save').disabled = true
        ;['inv-cam', 'inv-gal'].forEach((id) => UI.$(id).addEventListener('change', (e) => e.target.files[0] && setFile(e.target.files[0])))
      })
  }
  Actions.invCam = () => UI.$('inv-cam').click()
  Actions.invGal = () => UI.$('inv-gal').click()

  // تصغير صورة الجوال قبل الرفع (صور الكاميرا تكون 4–10MB)
  function compress(f, maxSide = 1600, quality = 0.8) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(f)
      const img = new Image()
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * k)
        c.height = Math.round(img.height * k)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        c.toBlob((b) => { URL.revokeObjectURL(url); resolve(b && b.size < f.size ? b : f) }, 'image/jpeg', quality)
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(f) }
      img.src = url
    })
  }

  Actions.saveInvoice = (el) => {
    if (!file) return UI.toast('التقط صورة الفاتورة أولًا', 'err')
    const pid = App.parseRoute().pid
    const amount = toNum(UI.val('inv-amount'))
    const notes = UI.val('inv-notes').trim() || null
    UI.busy(el, async () => {
      const sb = Store.client()
      const path = `${pid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      try {
        const blob = await compress(file)
        const up = await sb.storage.from(Store.BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
        if (up.error) throw up.error
        const { data } = sb.storage.from(Store.BUCKET).getPublicUrl(path)
        try {
          await Store.addInvoice({ project_id: pid, image_url: data.publicUrl, amount, notes })
        } catch (e) {
          sb.storage.from(Store.BUCKET).remove([path]).catch(() => {}) // نحذف الصورة اليتيمة
          throw e
        }
        UI.closeModal()
        UI.toast('تم رفع الفاتورة')
      } catch (e) {
        UI.toast(e.message || 'تعذّر رفع الفاتورة', 'err')
      }
    })
  }

  Actions.viewInvoice = (el) => {
    const i = Store.get().invoices.find((x) => x.id === el.dataset.id)
    if (!i) return
    UI.openModal(`${fmt(i.amount)} ₪ • ${showDate(i.created_at.slice(0, 10))}`, `
      ${i.image_url ? `<img src="${esc(i.image_url)}" alt="فاتورة" class="mb-3 w-full rounded-xl bg-gray-100">` : ''}
      ${i.notes ? `<p class="mb-3 text-gray-700">${esc(i.notes)}</p>` : ''}
      <div class="flex gap-2">
        ${i.image_url ? `<a href="${esc(i.image_url)}" target="_blank" rel="noreferrer" class="flex-1">${btn('فتح الصورة', { v: 'secondary', cls: 'w-full' })}</a>` : ''}
        ${btn('🗑 حذف', { a: 'deleteInvoice', id: i.id, v: 'danger', cls: 'flex-1' })}
      </div>`)
  }

  Actions.deleteInvoice = async (el) => {
    const i = Store.get().invoices.find((x) => x.id === el.dataset.id)
    if (!i || !window.confirm('حذف هذه الفاتورة؟')) return
    try {
      await Store.deleteInvoice(i)
      UI.closeModal()
      UI.toast('تم الحذف')
    } catch (e) {
      UI.toast(e.message || 'تعذّر الحذف', 'err')
    }
  }

  return { render }
})()
