// مخزن البيانات: كل شيء من Supabase (لا localStorage) + تحديث فوري Realtime
const Store = (() => {
  const BUCKET = 'invoices'
  const TABLES = { projects: 'projects', workers: 'workers', entries: 'daily_entries', invoices: 'invoices' }
  const state = { projects: [], workers: [], entries: [], invoices: [], loading: true, error: null, live: false }
  const listeners = new Set()
  const emit = () => listeners.forEach((f) => f())
  const set = (patch) => { Object.assign(state, patch); emit() }

  let sb = null
  let loadedOnce = false

  const upsert = (list, row) => {
    const i = list.findIndex((x) => x.id === row.id)
    if (i === -1) return [...list, row]
    const copy = list.slice()
    copy[i] = row
    return copy
  }
  const remove = (list, id) => list.filter((x) => x.id !== id)

  // Supabase يرجّع 1000 صف كحد أقصى لكل طلب، لذلك نقرأ على دفعات
  async function fetchAll(table) {
    const out = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb
        .from(table).select('*')
        .order('created_at', { ascending: true }).order('id', { ascending: true })
        .range(from, from + 999)
      if (error) throw error
      out.push(...data)
      if (data.length < 1000) break
    }
    return out
  }

  async function load() {
    try {
      const [projects, workers, entries, invoices] = await Promise.all(Object.values(TABLES).map(fetchAll))
      set({ projects, workers, entries, invoices, error: null, loading: false })
    } catch (e) {
      set({ error: e.message || 'تعذّر تحميل البيانات', loading: false })
    }
    loadedOnce = true
  }

  function applyEvent(key, payload) {
    if (payload.eventType === 'DELETE') {
      const id = payload.old && payload.old.id
      if (id) set({ [key]: remove(state[key], id) })
    } else {
      set({ [key]: upsert(state[key], payload.new) })
    }
  }

  function init() {
    sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    load()

    let channel = sb.channel('app-live')
    Object.entries(TABLES).forEach(([key, table]) => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, (p) => applyEvent(key, p))
    })
    let first = true
    channel.subscribe((status) => {
      set({ live: status === 'SUBSCRIBED' })
      // بعد عودة الاتصال من انقطاع نعيد التحميل كي لا يفوتنا شيء
      if (status === 'SUBSCRIBED') {
        if (!first) load()
        first = false
      }
    })

    // الجوال يوقف الاتصال في الخلفية: نحدّث عند العودة للتطبيق
    const refresh = () => { if (loadedOnce && document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
  }

  // ---------- الكتابة (تحدّث الواجهة فورًا، وRealtime يؤكدها لباقي الأجهزة) ----------
  async function insertOne(key, row) {
    const { data, error } = await sb.from(TABLES[key]).insert(row).select().single()
    if (error) throw error
    set({ [key]: upsert(state[key], data) })
    return data
  }
  async function insertMany(key, rows) {
    const { data, error } = await sb.from(TABLES[key]).insert(rows).select()
    if (error) throw error
    set({ [key]: data.reduce(upsert, state[key]) })
    return data
  }
  async function updateOne(key, id, patch) {
    const { data, error } = await sb.from(TABLES[key]).update(patch).eq('id', id).select().single()
    if (error) throw error
    set({ [key]: upsert(state[key], data) })
    return data
  }
  async function deleteOne(key, id) {
    const { error } = await sb.from(TABLES[key]).delete().eq('id', id)
    if (error) throw error
    set({ [key]: remove(state[key], id) })
  }

  // يستخرج مسار الملف داخل الـ bucket من الرابط العام
  function pathFromUrl(url) {
    if (!url) return null
    const marker = '/' + BUCKET + '/'
    const i = url.indexOf(marker)
    return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0])
  }

  return {
    BUCKET,
    get: () => state,
    on: (f) => listeners.add(f),
    init,
    reload: load,
    client: () => sb,

    addProject: (row) => insertOne('projects', row),
    async deleteProject(id) {
      const paths = state.invoices.filter((i) => i.project_id === id && i.image_url).map((i) => pathFromUrl(i.image_url)).filter(Boolean)
      if (paths.length) await sb.storage.from(BUCKET).remove(paths)
      await deleteOne('projects', id)
      const wIds = new Set(state.workers.filter((w) => w.project_id === id).map((w) => w.id))
      set({
        workers: state.workers.filter((w) => w.project_id !== id),
        entries: state.entries.filter((e) => !wIds.has(e.worker_id)),
        invoices: state.invoices.filter((i) => i.project_id !== id),
      })
    },

    addWorker: (row) => insertOne('workers', row),
    updateWorker: (id, patch) => updateOne('workers', id, patch),
    async deleteWorker(id) {
      await deleteOne('workers', id)
      set({ entries: state.entries.filter((e) => e.worker_id !== id) })
    },

    addEntry: (row) => insertOne('entries', row),
    addEntries: (rows) => insertMany('entries', rows), // طلب واحد: ينجح للجميع أو يفشل للجميع
    updateEntry: (id, patch) => updateOne('entries', id, patch),
    deleteEntry: (id) => deleteOne('entries', id),

    addInvoice: (row) => insertOne('invoices', row),
    async deleteInvoice(inv) {
      await deleteOne('invoices', inv.id)
      const p = pathFromUrl(inv.image_url)
      if (p) sb.storage.from(BUCKET).remove([p]).catch(() => {})
    },
  }
})()
