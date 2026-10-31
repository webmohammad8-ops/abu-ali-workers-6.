// الموجّه + الرسم + تسجيل دخول المدير
const App = (() => {
  const { esc } = UI;

  function parseRoute() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?');
    const q = new URLSearchParams(qs || '');

    let m = path.match(/^\/p\/([^/]+)\/w\/([^/]+)$/);

    if (m) {
      return {
        name: 'archive',
        pid: decodeURIComponent(m[1]),
        wid: decodeURIComponent(m[2]),
        q
      };
    }

    m = path.match(/^\/p\/([^/]+)$/);

    if (m) {
      return {
        name: 'project',
        pid: decodeURIComponent(m[1]),
        q
      };
    }

    return { name: 'dashboard', q };
  }

  const go = (hash) => {
    location.hash = hash;
  };

  const configured = () =>
    !!(
      window.CONFIG &&
      CONFIG.SUPABASE_URL &&
      CONFIG.SUPABASE_ANON_KEY
    );

  function setupScreen(msg) {
    return `
      <div class="mx-auto max-w-lg p-4 pt-10">
        ${UI.card(`
          <h1 class="mb-2 text-xl font-extrabold">
            ⚙️ إعداد Supabase مطلوب
          </h1>
          <p class="mb-3 text-gray-600">${msg}</p>
          <p class="text-sm text-gray-500">
            تأكد من إعداد ملف config.js ثم أعد تحميل الصفحة.
          </p>
        `)}
      </div>
    `;
  }

  // شاشة دخول المدير
  function loginScreen() {
    return `
      <div dir="rtl"
        class="min-h-screen flex items-center justify-center p-4 bg-gray-50">

        <div class="w-full max-w-md">

          <div class="text-center mb-6">
            <div class="text-5xl mb-3">🏗️</div>
            <h1 class="text-2xl font-extrabold text-gray-900">
              المقاول أبو علي
            </h1>
            <p class="text-gray-500 mt-2">
              نظام إدارة حسابات العمال والمشاريع
            </p>
          </div>

          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">

            <h2 class="text-xl font-bold mb-2 text-gray-900">
              تسجيل دخول المدير
            </h2>

            <p class="text-sm text-gray-500 mb-6">
              أدخل بيانات حساب المدير للمتابعة.
            </p>

            <form id="managerLoginForm">

              <label class="block text-sm font-bold mb-2">
                البريد الإلكتروني
              </label>

              <input
                id="managerEmail"
                type="email"
                required
                autocomplete="username"
                placeholder="example@email.com"
                class="w-full border border-gray-300 rounded-xl p-3 mb-4 outline-none focus:border-blue-500"
              />

              <label class="block text-sm font-bold mb-2">
                كلمة المرور
              </label>

              <input
                id="managerPassword"
                type="password"
                required
                autocomplete="current-password"
                placeholder="أدخل كلمة المرور"
                class="w-full border border-gray-300 rounded-xl p-3 mb-4 outline-none focus:border-blue-500"
              />

              <div
                id="loginError"
                class="hidden text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4"
              ></div>

              <button
                id="managerLoginButton"
                type="submit"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl p-3 transition"
              >
                تسجيل الدخول
              </button>

            </form>
          </div>

          <p class="text-center text-xs text-gray-400 mt-5">
            نظام حسابات المقاولين
          </p>

        </div>
      </div>
    `;
  }

  let pending = false;

  // الرسم
  function render(force) {
    const root = document.getElementById('app');

    if (!root) return;

    if (!force) {
      const a = document.activeElement;

      if (
        a &&
        root.contains(a) &&
        /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)
      ) {
        pending = true;
        return;
      }
    }

    pending = false;

    const y = window.scrollY;
    const s = Store.get();
    const r = parseRoute();

    let html;

    try {
      if (!configured()) {
        html = setupScreen(
          'لم يتم العثور على بيانات الاتصال بـ Supabase.'
        );
      }

      else if (!window.supabase) {
        html = setupScreen(
          'تعذّر تحميل مكتبة Supabase. تأكد من الاتصال بالإنترنت.'
        );
      }

      else if (!s.authReady) {
        html = UI.layout({
          title: 'نظام حسابات المقاولين',
          body: UI.pageLoader()
        });
      }

      else if (!s.user) {
        html = loginScreen();
      }

      else if (s.loading) {
        html = UI.layout({
          title: 'نظام حسابات المقاولين',
          body: UI.pageLoader()
        });
      }

      else if (s.error && !s.projects.length) {
        html = UI.layout({
          title: 'نظام حسابات المقاولين',
          body: UI.card(`
            <div class="text-center">
              <div class="mb-2 text-3xl">⚠️</div>

              <div class="mb-1 font-bold">
                تعذّر تحميل البيانات
              </div>

              <div dir="ltr"
                class="mb-3 text-sm text-gray-500">
                ${esc(s.error)}
              </div>

              ${UI.btn('إعادة المحاولة', { a: 'reload' })}
            </div>
          `)
        });
      }

      else {
        html = Views[r.name](r);

        // شريط تسجيل الخروج
        html = `
          <div class="flex justify-end px-3 pt-3">
            <button
              data-a="logout"
              class="bg-red-50 text-red-600 border border-red-100 rounded-lg px-4 py-2 text-sm font-bold"
            >
              تسجيل الخروج
            </button>
          </div>
          ${html}
        `;
      }

    } catch (e) {
      console.error(e);

      html = UI.layout({
        title: 'خطأ',
        body: UI.card(`
          <div class="text-center text-red-600">
            حدث خطأ غير متوقع: ${esc(e.message)}
          </div>
        `)
      });
    }

    root.innerHTML = html;

    window.scrollTo(0, y);
  }

  // تسجيل الدخول من النموذج
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'managerLoginForm') return;

    e.preventDefault();

    const email = document
      .getElementById('managerEmail').value.trim();

    const password = document
      .getElementById('managerPassword').value;

    const button = document.getElementById('managerLoginButton');
    const errorBox = document.getElementById('loginError');

    button.disabled = true;
    button.textContent = 'جارٍ تسجيل الدخول...';

    errorBox.classList.add('hidden');

    try {
      await Store.signIn(email, password);

      render(true);

    } catch (error) {
      console.error(error);

      errorBox.textContent =
        'تعذّر تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور.';

      errorBox.classList.remove('hidden');

      button.disabled = false;
      button.textContent = 'تسجيل الدخول';
    }
  });

  // الأحداث
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'modal-backdrop') {
      return UI.closeModal();
    }

    const el = e.target.closest('[data-a]');

    if (!el) return;

    const fn = Actions[el.dataset.a];

    if (fn) {
      await fn(el, e);
    }
  });

  document.addEventListener('focusout', () => {
    if (pending) {
      setTimeout(() => pending && render(), 120);
    }
  });

  window.addEventListener('hashchange', () => {
    UI.closeModal();
    render(true);
    window.scrollTo(0, 0);
  });

  Actions['modal-close'] = () => UI.closeModal();

  Actions.nav = (el) => go(el.dataset.id);

  Actions.reload = () => {
    Store.reload();
  };

  Actions.logout = async () => {
    try {
      await Store.signOut();
      go('/');
      render(true);
    } catch (error) {
      alert('تعذّر تسجيل الخروج: ' + error.message);
    }
  };

  function start() {
    Store.on(() => render());

    if (configured() && window.supabase) {
      Store.init().catch((error) => {
        console.error(error);
      });
    }

    render(true);

    if (
      'serviceWorker' in navigator &&
      /^https?:$/.test(location.protocol)
    ) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  return {
    render,
    go,
    parseRoute,
    start
  };
})();

App.start();
