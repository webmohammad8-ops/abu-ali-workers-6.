// مخزن البيانات: Supabase + تسجيل دخول المدير + Realtime
const Store = (() => {
  const BUCKET = 'invoices';

  const TABLES = {
    projects: 'projects',
    workers: 'workers',
    entries: 'daily_entries',
    invoices: 'invoices'
  };

  const state = {
    projects: [],
    workers: [],
    entries: [],
    invoices: [],
    loading: true,
    error: null,
    live: false,
    user: null,
    authReady: false
  };

  const listeners = new Set();
  const emit = () => listeners.forEach((f) => f());
  const set = (patch) => {
    Object.assign(state, patch);
    emit();
  };

  let sb = null;
  let loadedOnce = false;
  let activeUserId = null;
  let liveChannel = null;

  const upsert = (list, row) => {
    const i = list.findIndex((x) => x.id === row.id);
    if (i === -1) return [...list, row];

    const copy = list.slice();
    copy[i] = row;
    return copy;
  };

  const remove = (list, id) =>
    list.filter((x) => x.id !== id);

  // قراءة جميع الصفوف على دفعات
  async function fetchAll(table) {
    const out = [];

    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb
        .from(table)
        .select('*')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + 999);

      if (error) throw error;

      out.push(...data);

      if (data.length < 1000) break;
    }

    return out;
  }

  async function load() {
    if (!sb || !state.user) return;

    set({ loading: true, error: null });

    try {
      const [projects, workers, entries, invoices] =
        await Promise.all(
          Object.values(TABLES).map(fetchAll)
        );

      set({
        projects,
        workers,
        entries,
        invoices,
        error: null,
        loading: false
      });
    } catch (e) {
      set({
        error: e.message || 'تعذّر تحميل البيانات',
        loading: false
      });
    }

    loadedOnce = true;
  }

  function applyEvent(key, payload) {
    if (payload.eventType === 'DELETE') {
      const id = payload.old && payload.old.id;

      if (id) {
        set({ [key]: remove(state[key], id) });
      }
    } else {
      set({
        [key]: upsert(state[key], payload.new)
      });
    }
  }

  function subscribeRealtime() {
    if (liveChannel) {
      sb.removeChannel(liveChannel);
      liveChannel = null;
    }

    let channel = sb.channel('app-live');

    Object.entries(TABLES).forEach(([key, table]) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table
        },
        (payload) => applyEvent(key, payload)
      );
    });

    let first = true;

    liveChannel = channel;

    channel.subscribe((status) => {
      set({ live: status === 'SUBSCRIBED' });

      if (status === 'SUBSCRIBED') {
        if (!first) load();
        first = false;
      }
    });
  }

  async function activateData(user) {
    if (!user) return;

    if (activeUserId === user.id && loadedOnce) return;

    activeUserId = user.id;

    set({
      user,
      loading: true,
      error: null
    });

    await load();
    subscribeRealtime();

    // تحديث البيانات عند العودة للتطبيق
    if (!window.__abuAliRefreshBound) {
      const refresh = () => {
        if (
          loadedOnce &&
          state.user &&
          document.visibilityState === 'visible'
        ) {
          load();
        }
      };

      document.addEventListener('visibilitychange', refresh);
      window.addEventListener('online', refresh);

      window.__abuAliRefreshBound = true;
    }
  }

  function clearData() {
    activeUserId = null;
    loadedOnce = false;

    if (liveChannel && sb) {
      sb.removeChannel(liveChannel);
      liveChannel = null;
    }

    set({
      user: null,
      projects: [],
      workers: [],
      entries: [],
      invoices: [],
      loading: false,
      error: null,
      live: false
    });
  }

  // تهيئة Supabase والتحقق من جلسة المدير
  async function init() {
    sb = window.supabase.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    const { data, error } = await sb.auth.getSession();

    if (error) {
      set({
        authReady: true,
        loading: false,
        error: error.message
      });
      return;
    }

    const user = data.session?.user || null;

    set({
      authReady: true,
      user
    });

    if (user) {
      await activateData(user);
    } else {
      set({ loading: false });
    }

    // متابعة تغيّر حالة تسجيل الدخول
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearData();
      }
    });
  }

  // تسجيل دخول المدير
  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (data.user) {
      await activateData(data.user);
    }

    return data;
  }

  // تسجيل الخروج
  async function signOut() {
    const { error } = await sb.auth.signOut();

    if (error) throw error;

    clearData();
  }

  // عمليات الكتابة
  async function insertOne(key, row) {
    const { data, error } = await sb
      .from(TABLES[key])
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    set({ [key]: upsert(state[key], data) });

    return data;
  }

  async function insertMany(key, rows) {
    const { data, error } = await sb
      .from(TABLES[key])
      .insert(rows)
      .select();

    if (error) throw error;

    set({
      [key]: data.reduce(upsert, state[key])
    });

    return data;
  }

  async function updateOne(key, id, patch) {
    const { data, error } = await sb
      .from(TABLES[key])
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    set({ [key]: upsert(state[key], data) });

    return data;
  }

  async function deleteOne(key, id) {
    const { error } = await sb
      .from(TABLES[key])
      .delete()
      .eq('id', id);

    if (error) throw error;

    set({ [key]: remove(state[key], id) });
  }

  // استخراج مسار الصورة من رابطها
  function pathFromUrl(url) {
    if (!url) return null;

    const marker = '/' + BUCKET + '/';
    const i = url.indexOf(marker);

    return i === -1
      ? null
      : decodeURIComponent(
          url.slice(i + marker.length).split('?')[0]
        );
  }

  return {
    BUCKET,

    get: () => state,

    on: (f) => listeners.add(f),

    init,
    reload: load,

    client: () => sb,

    signIn,
    signOut,

    addProject: (row) =>
      insertOne('projects', row),

    async deleteProject(id) {
      const paths = state.invoices
        .filter((i) => i.project_id === id && i.image_url)
        .map((i) => pathFromUrl(i.image_url))
        .filter(Boolean);

      if (paths.length) {
        const { error } = await sb.storage
          .from(BUCKET)
          .remove(paths);

        if (error) throw error;
      }

      const wIds = new Set(
        state.workers
          .filter((w) => w.project_id === id)
          .map((w) => w.id)
      );

      await deleteOne('projects', id);

      set({
        workers: state.workers.filter(
          (w) => w.project_id !== id
        ),
        entries: state.entries.filter(
          (e) => !wIds.has(e.worker_id)
        ),
        invoices: state.invoices.filter(
          (i) => i.project_id !== id
        )
      });
    },

    addWorker: (row) =>
      insertOne('workers', row),

    updateWorker: (id, patch) =>
      updateOne('workers', id, patch),

    async deleteWorker(id) {
      await deleteOne('workers', id);

      set({
        entries: state.entries.filter(
          (e) => e.worker_id !== id
        )
      });
    },

    addEntry: (row) =>
      insertOne('entries', row),

    addEntries: (rows) =>
      insertMany('entries', rows),

    updateEntry: (id, patch) =>
      updateOne('entries', id, patch),

    deleteEntry: (id) =>
      deleteOne('entries', id),

    addInvoice: (row) =>
      insertOne('invoices', row),

    async deleteInvoice(inv) {
      await deleteOne('invoices', inv.id);

      const path = pathFromUrl(inv.image_url);

      if (path) {
        sb.storage.from(BUCKET).remove([path]).catch(() => {});
      }
    }
  };
})();
