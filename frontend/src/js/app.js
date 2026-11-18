// MyElektro — interface : authentification + CRUD des tâches (routes en #/...).
(function () {
  const STATUS_LABELS = { todo: 'À faire', doing: 'Sur le bench', done: 'Validé' };
  const $ = (sel, root = document) => root.querySelector(sel);

  /** Crée un élément ; les textes passent par textContent (jamais innerHTML) pour éviter le XSS. */
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  // Icônes au trait (tracés de lucide, licence ISC), une taille et une épaisseur pour toute l'interface.
  const ICONS = {
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    pencil: '<path d="M21.17 6.81a1 1 0 0 0-3.98-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONS[name]; // chaînes constantes ci-dessus, jamais de donnée utilisateur
    return svg;
  }

  function toast(message, kind = 'ok') {
    const t = $('#toast');
    t.textContent = message;
    t.className = `toast ${kind}`;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.hidden = true; }, 3500);
  }

  function formatDate(iso) {
    if (!iso) return 'Pas d’échéance';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function isOverdue(task) {
    if (!task.dueDate || task.status === 'done') return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return task.dueDate < today;
  }

  const ledBadge = (status) => h('span', { class: `led led-${status}` }, h('i'), h('span', {}, STATUS_LABELS[status] || status));

  /** Barre d'avancement : part des étapes validées et sur le bench, puis le compte par statut. */
  function progressPanel(tasks) {
    const count = (s) => tasks.filter((t) => t.status === s).length;
    const total = tasks.length;
    const done = count('done');
    const pct = (n) => `${((n / total) * 100).toFixed(2)}%`;
    const rate = Math.round((done / total) * 100);
    return h('section', { class: 'panel progress', 'aria-label': 'Avancement' },
      h('div', { class: 'progress-head' },
        h('h2', {}, 'Avancement'),
        h('div', { class: 'progress-figure' },
          h('strong', {}, `${rate}\u202F%`),
          h('span', {}, `${done} ${done > 1 ? 'étapes validées' : 'étape validée'} sur ${total}`))),
      h('div', { class: 'track', role: 'img', 'aria-label': `${done} validées, ${count('doing')} sur le bench, ${count('todo')} à faire` },
        h('span', { class: 'seg seg-done', style: `width:${pct(done)}` }),
        h('span', { class: 'seg seg-doing', style: `width:${pct(count('doing'))}` })),
      h('ul', { class: 'stats' },
        ...['todo', 'doing', 'done'].map((s) =>
          h('li', { class: `stat stat-${s} led led-${s}` }, h('i'), h('span', {}, STATUS_LABELS[s]), h('strong', {}, count(s))))));
  }

  // ---------- Erreurs de formulaire ----------
  function showErrors(form, errors, fallback) {
    form.querySelectorAll('[data-err]').forEach((p) => { p.textContent = ''; });
    form.querySelectorAll('.invalid').forEach((i) => i.classList.remove('invalid'));
    let general = fallback || '';
    for (const { field, message } of errors) {
      const p = form.querySelector(`[data-err="${field}"]`);
      if (p) {
        p.textContent = message;
        const input = form.elements[field];
        if (input && input.classList) input.classList.add('invalid');
      } else general = general ? `${general} ${message}` : message;
    }
    const gen = form.querySelector('[data-err="_form"]');
    if (gen) gen.textContent = general;
    const first = form.querySelector('.invalid');
    if (first) first.focus();
  }

  // ---------- Authentification ----------
  function setupAuth() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const isLogin = tab.dataset.tab === 'login';
        document.querySelectorAll('.tab').forEach((t) => {
          t.classList.toggle('active', t === tab);
          t.setAttribute('aria-selected', String(t === tab));
        });
        $('#form-login').hidden = !isLogin;
        $('#form-register').hidden = isLogin;
      });
    });

    async function submit(e, isRegister) {
      e.preventDefault();
      const form = e.target;
      const body = Object.fromEntries(new FormData(form).entries());
      if (!body.name) delete body.name;
      const errors = Validate.validateCredentials(body, { isRegister });
      if (errors.length) return showErrors(form, errors);
      showErrors(form, []);
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const session = await (isRegister ? Api.register(body) : Api.login(body));
        Api.setSession(session);
        form.reset();
        location.hash = '#/tasks';
        route();
      } catch (err) {
        showErrors(form, err.details, err.message);
      } finally {
        btn.disabled = false;
      }
    }
    $('#form-login').addEventListener('submit', (e) => submit(e, false));
    $('#form-register').addEventListener('submit', (e) => submit(e, true));
  }

  function logout() {
    Api.clearSession();
    location.hash = '#/login';
    route();
  }

  // ---------- Vues ----------
  const content = () => $('#content');
  function render(...nodes) {
    content().replaceChildren(...nodes);
    content().focus({ preventScroll: true });
  }
  const loading = () => render(h('p', { class: 'muted center' }, 'Chargement…'));

  function errorPanel(err, retry) {
    return h('div', { class: 'panel error-panel' },
      h('p', {}, err.message),
      retry && h('button', { class: 'btn ghost small', onclick: retry }, 'Réessayer'),
      h('a', { class: 'btn ghost small', href: '#/tasks' }, 'Retour à la liste'));
  }

  async function viewList() {
    loading();
    let tasks;
    try { tasks = await Api.listTasks(); } catch (err) { return render(errorPanel(err, viewList)); }

    const list = tasks.length
      ? h('ul', { class: 'task-list' }, tasks.map((t) =>
        h('li', { class: `task-card status-${t.status}` },
          h('a', { class: 'task-main', href: `#/tasks/${encodeURIComponent(t.id)}` },
            h('span', { class: 'task-title' }, t.title),
            h('span', { class: `task-due${isOverdue(t) ? ' overdue' : ''}` },
              isOverdue(t) && icon('alert'), (isOverdue(t) ? 'En retard · ' : '') + formatDate(t.dueDate))),
          ledBadge(t.status))))
      : h('div', { class: 'panel empty' },
        h('h2', {}, 'Aucune étape pour l’instant'),
        h('p', { class: 'muted' }, 'Commencez par le schéma de votre prochain montage'),
        h('a', { class: 'btn primary', href: '#/tasks/new' }, icon('plus'), 'Ajouter ma première étape'));

    render(
      h('div', { class: 'page-head' },
        h('h1', {}, 'Mes étapes de montage'),
        h('a', { class: 'btn primary', href: '#/tasks/new' }, icon('plus'), 'Nouvelle étape')),
      tasks.length ? progressPanel(tasks) : null, list);
  }

  async function viewDetail(id) {
    loading();
    let task;
    try { task = await Api.getTask(id); } catch (err) { return render(errorPanel(err)); }

    const del = h('button', { class: 'btn danger quiet', onclick: () => confirmDelete(task) }, icon('trash'), 'Supprimer');
    render(
      h('a', { class: 'back', href: '#/tasks' }, icon('back'), 'Retour aux étapes'),
      h('article', { class: 'panel detail' },
        h('div', { class: 'detail-head' }, h('h1', {}, task.title), ledBadge(task.status)),
        h('dl', {},
          h('dt', {}, 'Échéance'),
          h('dd', { class: `date${isOverdue(task) ? ' overdue' : ''}` }, (isOverdue(task) ? 'En retard · ' : '') + formatDate(task.dueDate)),
          h('dt', {}, 'Description'),
          h('dd', { class: task.description ? 'prewrap' : 'muted' }, task.description || 'Aucune description')),
        h('div', { class: 'actions' },
          h('a', { class: 'btn primary', href: `#/tasks/${encodeURIComponent(task.id)}/edit` }, icon('pencil'), 'Modifier'),
          h('span', { class: 'spacer' }),
          del)));
  }

  async function confirmDelete(task) {
    const dlg = $('#dlg-delete');
    $('#dlg-delete-text').textContent = `« ${task.title} » sera définitivement supprimée.`;
    dlg.returnValue = '';
    dlg.showModal();
    dlg.addEventListener('close', async () => {
      if (dlg.returnValue !== 'confirm') return;
      try {
        await Api.deleteTask(task.id);
        toast('Étape supprimée');
        location.hash = '#/tasks';
      } catch (err) { toast(err.message, 'error'); }
    }, { once: true });
  }

  async function viewForm(id) {
    let task = { title: '', status: 'todo', description: '', dueDate: '' };
    if (id) {
      loading();
      try { task = await Api.getTask(id); } catch (err) { return render(errorPanel(err)); }
    }

    const form = h('form', { class: 'form panel', novalidate: true },
      h('h1', {}, id ? 'Modifier l’étape' : 'Nouvelle étape'),
      h('div', { class: 'field' },
        h('label', { for: 'f-title' }, 'Titre', h('small', {}, '1 à 120 caractères')),
        h('input', { id: 'f-title', name: 'title', type: 'text', maxlength: 200, value: task.title, required: true }),
        h('p', { class: 'err', 'data-err': 'title' })),
      h('div', { class: 'field' },
        h('label', { for: 'f-status' }, 'Statut'),
        (() => {
          const sel = h('select', { id: 'f-status', name: 'status' },
            ...Validate.STATUSES.map((s) => h('option', { value: s }, STATUS_LABELS[s])));
          sel.value = task.status;
          return sel;
        })(),
        h('p', { class: 'err', 'data-err': 'status' })),
      h('div', { class: 'field' },
        h('label', { for: 'f-due' }, 'Échéance', h('small', {}, 'facultative')),
        h('input', { id: 'f-due', name: 'dueDate', type: 'date', value: task.dueDate || '' }),
        h('p', { class: 'err', 'data-err': 'dueDate' })),
      h('div', { class: 'field' },
        h('label', { for: 'f-desc' }, 'Description', h('small', {}, '1000 caractères au plus')),
        h('textarea', { id: 'f-desc', name: 'description', rows: 5 }, task.description || ''),
        h('p', { class: 'counter', id: 'desc-counter' }),
        h('p', { class: 'err', 'data-err': 'description' })),
      h('p', { class: 'err form-err', 'data-err': '_form' }),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', type: 'submit' }, id ? 'Enregistrer' : 'Ajouter'),
        h('a', { class: 'btn ghost', href: id ? `#/tasks/${encodeURIComponent(id)}` : '#/tasks' }, 'Annuler')));

    const desc = $('textarea', form);
    const counter = $('#desc-counter', form);
    const updateCounter = () => { counter.textContent = `${desc.value.length} / 1000`; };
    desc.addEventListener('input', updateCounter);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const raw = Object.fromEntries(new FormData(form).entries());
      const { errors, value } = Validate.validateTask(raw);
      if (errors.length) return showErrors(form, errors);
      showErrors(form, []);
      const btn = $('button[type=submit]', form);
      btn.disabled = true;
      try {
        const saved = id ? await Api.updateTask(id, value) : await Api.createTask(value);
        toast(id ? 'Étape enregistrée' : 'Étape ajoutée');
        location.hash = `#/tasks/${encodeURIComponent(saved.id)}`;
      } catch (err) {
        showErrors(form, err.details || [], err.message);
      } finally { btn.disabled = false; }
    });

    render(form);
    updateCounter();
    $('#f-title').focus();
  }

  // ---------- Routeur ----------
  function route() {
    const loggedIn = !!Api.getToken();
    const hash = location.hash.replace(/^#/, '') || (loggedIn ? '/tasks' : '/login');

    $('#view-auth').hidden = loggedIn;
    $('#view-app').hidden = !loggedIn;

    if (!loggedIn) {
      if (hash !== '/login') location.hash = '#/login';
      return;
    }
    const user = Api.getUser();
    $('#whoami').textContent = user ? (user.name || user.email) : '';

    let m;
    if (hash === '/login' || hash === '/tasks' || hash === '/') return viewList();
    if (hash === '/tasks/new') return viewForm(null);
    if ((m = hash.match(/^\/tasks\/([^/]+)\/edit$/))) return viewForm(decodeURIComponent(m[1]));
    if ((m = hash.match(/^\/tasks\/([^/]+)$/))) return viewDetail(decodeURIComponent(m[1]));
    render(h('div', { class: 'panel' }, h('p', {}, 'Page introuvable'), h('a', { href: '#/tasks' }, 'Retour aux étapes')));
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('myelektro:unauthorized', () => {
    toast('Session expirée, reconnectez-vous', 'error');
    location.hash = '#/login';
    route();
  });
  $('#btn-logout').addEventListener('click', logout);

  setupAuth();
  route();
})();
