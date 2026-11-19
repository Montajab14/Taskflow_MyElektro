// MyElektro — interface : authentification, étapes (CRUD, filtres, priorité),
// habitudes et activité (routes en #/...).
(function () {
  const STATUS_LABELS = { todo: 'À faire', doing: 'Sur le bench', done: 'Validé' };
  const PRIORITY_LABELS = { low: 'Basse', medium: 'Normale', high: 'Haute' };
  const SORTS = [
    ['-createdAt', 'Plus récentes'],
    ['dueDate', 'Échéance'],
    ['-updatedAt', 'Modifiées récemment'],
    ['title', 'Titre'],
  ];
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
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.5 0 8.34 2.77 9.94 6.65a1 1 0 0 1 0 .7 10.8 10.8 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2.06 11.65a1 1 0 0 0 0 .7C3.66 16.23 7.5 19 12 19a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/><path d="M9.88 9.88a3 3 0 0 0 4.24 4.24"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
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

  // ---------- Dates (toujours AAAA-MM-JJ, dans le fuseau du navigateur) ----------
  const todayLocal = () => new Date().toLocaleDateString('sv-SE');
  const parseDay = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const isoDay = (date) => date.toLocaleDateString('sv-SE');
  const addDays = (iso, n) => { const d = parseDay(iso); d.setDate(d.getDate() + n); return isoDay(d); };
  const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

  function formatDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
    if (!iso) return 'Pas d’échéance';
    return parseDay(iso).toLocaleDateString('fr-FR', opts);
  }

  function isOverdue(task) {
    return !!task.dueDate && task.status !== 'done' && task.dueDate < todayLocal();
  }

  const ledBadge = (status) => h('span', { class: `led led-${status}` }, h('i'), h('span', {}, STATUS_LABELS[status] || status));

  /** Priorité affichée seulement quand elle sort de l'ordinaire. */
  function priorityTag(priority) {
    if (priority === 'high') return h('span', { class: 'prio prio-high' }, icon('up'), 'Priorité haute');
    if (priority === 'low') return h('span', { class: 'prio prio-low' }, icon('down'), 'Priorité basse');
    return null;
  }

  /** Barre d'avancement, à partir du résumé calculé par l'API (B1). */
  function progressPanel(sum) {
    const { total, byStatus } = sum;
    const pct = (n) => `${((n / total) * 100).toFixed(2)}%`;
    const rate = Math.round(sum.completionRate * 100);
    return h('section', { class: 'panel progress', 'aria-label': 'Avancement' },
      h('div', { class: 'progress-head' },
        h('h2', {}, 'Avancement'),
        h('div', { class: 'progress-figure' },
          h('strong', {}, `${rate} %`),
          h('span', {}, `${plural(byStatus.done, 'étape validée', 'étapes validées')} sur ${total}`))),
      h('div', { class: 'track', role: 'img', 'aria-label': `${byStatus.done} validées, ${byStatus.doing} sur le bench, ${byStatus.todo} à faire` },
        h('span', { class: 'seg seg-done', style: `width:${pct(byStatus.done)}` }),
        h('span', { class: 'seg seg-doing', style: `width:${pct(byStatus.doing)}` })),
      h('ul', { class: 'stats' },
        ...['todo', 'doing', 'done'].map((s) =>
          h('li', { class: `stat stat-${s} led led-${s}` }, h('i'), h('span', {}, STATUS_LABELS[s]), h('strong', {}, byStatus[s]))),
        sum.overdue > 0 && h('li', { class: 'stat stat-overdue' }, icon('alert'), h('span', {}, 'En retard'), h('strong', {}, sum.overdue))));
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

  // ---------- Champ mot de passe : icône œil et checklist des règles ----------
  /** Entoure le champ d'un conteneur et ajoute le bouton qui affiche ou masque le mot de passe. */
  function addPasswordToggle(input) {
    const wrap = h('div', { class: 'pw-wrap' });
    input.replaceWith(wrap);
    const btn = h('button', {
      type: 'button', class: 'pw-toggle', 'aria-label': 'Afficher le mot de passe', 'aria-pressed': 'false',
      onclick: () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(show));
        btn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
        btn.replaceChildren(icon(show ? 'eyeOff' : 'eye'));
      },
    }, icon('eye'));
    wrap.append(input, btn);
    return wrap;
  }

  /** Remet tous les champs mot de passe du formulaire en mode masqué. */
  function hidePasswords(form) {
    form.querySelectorAll('.pw-wrap').forEach((wrap) => {
      const input = $('input', wrap);
      if (input.type === 'password') return;
      input.type = 'password';
      const btn = $('.pw-toggle', wrap);
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Afficher le mot de passe');
      btn.replaceChildren(icon('eye'));
    });
  }

  /** Liste des règles sous le champ : ✗ tant que la règle n'est pas respectée, ✓ dès qu'elle l'est. */
  function addPasswordChecklist(input, after) {
    const list = h('ul', { class: 'pw-rules', id: 'pw-rules', 'aria-label': 'Conditions du mot de passe' });
    const draw = () => list.replaceChildren(...Validate.passwordChecks(input.value).map((c) =>
      h('li', { class: c.ok ? 'ok' : 'ko' },
        icon(c.ok ? 'check' : 'x'),
        h('span', {}, c.label),
        h('span', { class: 'sr-only' }, c.ok ? ' : respectée' : ' : non respectée'))));
    input.addEventListener('input', () => {
      draw();
      // L'erreur du dernier envoi disparaît dès que l'utilisateur retape son mot de passe
      input.classList.remove('invalid');
      const err = input.closest('.field').querySelector('[data-err="password"]');
      if (err) err.textContent = '';
    });
    input.form.addEventListener('reset', () => setTimeout(() => { list.classList.remove('submitted'); draw(); }));
    input.setAttribute('aria-describedby', 'pw-rules');
    draw();
    after.after(list);
    return list;
  }

  // ---------- Authentification ----------
  function setupAuth() {
    addPasswordToggle($('#login-password'));
    const regWrap = addPasswordToggle($('#reg-password'));
    const rules = addPasswordChecklist($('#reg-password'), regWrap);

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
      if (errors.length) {
        if (isRegister && errors.some((er) => er.field === 'password')) rules.classList.add('submitted');
        return showErrors(form, errors);
      }
      showErrors(form, []);
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const session = await (isRegister ? Api.register(body) : Api.login(body));
        Api.setSession(session);
        form.reset();
        hidePasswords(form);
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

  // ---------- Rendu ----------
  const content = () => $('#content');
  /** Remplace la page. animate=false pour une mise à jour sur place (sans le fondu d'entrée). */
  function render(...nodes) {
    const opts = nodes[0] && nodes[0].animate === false ? nodes.shift() : {};
    content().classList.toggle('still', opts.animate === false);
    content().replaceChildren(...nodes);
    if (opts.animate !== false) content().focus({ preventScroll: true });
  }
  const loading = () => render(h('p', { class: 'muted center' }, 'Chargement…'));

  function errorPanel(err, retry) {
    return h('div', { class: 'panel error-panel' },
      h('p', {}, err.message),
      h('div', { class: 'actions' },
        retry && h('button', { class: 'btn ghost small', onclick: retry }, 'Réessayer'),
        h('a', { class: 'btn ghost small', href: '#/tasks' }, 'Retour aux étapes')));
  }

  /** Fenêtre de confirmation ; renvoie true si l'utilisateur confirme. */
  function confirmDialog(title, text, action = 'Supprimer') {
    const dlg = $('#dlg-delete');
    $('#dlg-delete-title').textContent = title;
    $('#dlg-delete-text').textContent = text;
    $('#dlg-delete button[value=confirm]').textContent = action;
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise((resolve) => {
      dlg.addEventListener('close', () => resolve(dlg.returnValue === 'confirm'), { once: true });
    });
  }

  // ---------- Liste des étapes : filtres (B1) ----------
  const listState = { status: '', q: '', sort: '-createdAt', overdue: false };
  const hasFilters = () => listState.status || listState.q || listState.overdue;
  let listRequest = 0;

  function taskRow(t) {
    const late = isOverdue(t);
    return h('li', { class: `task-card status-${t.status}` },
      h('a', { class: 'task-main', href: `#/tasks/${encodeURIComponent(t.id)}` },
        h('span', { class: 'task-title' }, t.title),
        h('span', { class: 'task-meta' },
          h('span', { class: `task-due${late ? ' overdue' : ''}` },
            late && icon('alert'), (late ? 'En retard · ' : '') + formatDate(t.dueDate)),
          priorityTag(t.priority))),
      ledBadge(t.status));
  }

  function toolbar() {
    const segs = [['', 'Toutes'], ['todo', STATUS_LABELS.todo], ['doing', STATUS_LABELS.doing], ['done', STATUS_LABELS.done]];
    const seg = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Filtrer par statut' },
      ...segs.map(([value, label]) => h('button', {
        type: 'button', 'aria-pressed': String(listState.status === value),
        onclick: (e) => {
          listState.status = value;
          seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
          loadResults();
        },
      }, value && h('i', { class: `dot dot-${value}` }), label)));

    let timer;
    const search = h('label', { class: 'search' },
      icon('search'),
      h('input', {
        type: 'search', name: 'q', placeholder: 'Rechercher', 'aria-label': 'Rechercher dans les étapes', value: listState.q,
        oninput: (e) => {
          clearTimeout(timer);
          timer = setTimeout(() => { listState.q = e.target.value.trim(); loadResults(); }, 250);
        },
      }));

    const sort = h('select', {
      class: 'sort', 'aria-label': 'Trier',
      onchange: (e) => { listState.sort = e.target.value; loadResults(); },
    }, ...SORTS.map(([value, label]) => h('option', { value }, label)));
    sort.value = listState.sort;

    const late = h('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(listState.overdue),
      onclick: () => {
        listState.overdue = !listState.overdue;
        late.setAttribute('aria-pressed', String(listState.overdue));
        loadResults();
      },
    }, icon('alert'), 'En retard');

    return h('div', { class: 'toolbar' }, seg, h('div', { class: 'toolbar-right' }, search, late, sort));
  }

  async function loadResults() {
    const box = $('#results');
    if (!box) return;
    const req = ++listRequest;
    box.setAttribute('aria-busy', 'true');
    let tasks;
    try {
      tasks = await Api.listTasks({
        status: listState.status, q: listState.q, sort: listState.sort, overdue: listState.overdue ? 'true' : '',
      });
    } catch (err) {
      if (req === listRequest) box.replaceChildren(errorPanel(err, loadResults));
      return;
    }
    if (req !== listRequest) return; // une recherche plus récente est déjà partie
    // Les étapes sans échéance passent après les autres quand on trie par échéance
    if (listState.sort === 'dueDate') tasks.sort((a, b) => (!a.dueDate) - (!b.dueDate));
    box.removeAttribute('aria-busy');
    box.replaceChildren(tasks.length
      ? h('ul', { class: 'task-list' }, tasks.map(taskRow))
      : h('div', { class: 'panel empty' },
        h('h2', {}, 'Aucune étape ne correspond'),
        h('p', { class: 'muted' }, 'Essayez un autre statut ou une autre recherche'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { Object.assign(listState, { status: '', q: '', overdue: false }); viewList(); } }, 'Effacer les filtres')));
  }

  async function viewList() {
    loading();
    let sum;
    try { sum = await Api.summary(); } catch (err) { return render(errorPanel(err, viewList)); }

    const head = h('div', { class: 'page-head' },
      h('h1', {}, 'Mes étapes de montage'),
      h('a', { class: 'btn primary', href: '#/tasks/new' }, icon('plus'), 'Nouvelle étape'));

    if (sum.total === 0) {
      return render(head, h('div', { class: 'panel empty' },
        h('h2', {}, 'Aucune étape pour l’instant'),
        h('p', { class: 'muted' }, 'Commencez par le schéma de votre prochain montage'),
        h('a', { class: 'btn primary', href: '#/tasks/new' }, icon('plus'), 'Ajouter ma première étape')));
    }
    render(head, progressPanel(sum), h('section', { class: 'list-block' }, toolbar(), h('div', { id: 'results' })));
    await loadResults();
  }

  // ---------- Détail, formulaire, suppression ----------
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
          h('dt', {}, 'Priorité'),
          h('dd', { class: `prio-text prio-${task.priority || 'medium'}` }, PRIORITY_LABELS[task.priority || 'medium']),
          task.completedAt && [h('dt', {}, 'Validée le'), h('dd', { class: 'date' }, formatDate(isoDay(new Date(task.completedAt))))],
          h('dt', {}, 'Description'),
          h('dd', { class: task.description ? 'prewrap' : 'muted' }, task.description || 'Aucune description')),
        h('div', { class: 'actions' },
          h('a', { class: 'btn primary', href: `#/tasks/${encodeURIComponent(task.id)}/edit` }, icon('pencil'), 'Modifier'),
          h('span', { class: 'spacer' }),
          del)));
  }

  async function confirmDelete(task) {
    const ok = await confirmDialog('Supprimer cette étape ?', `« ${task.title} » sera définitivement supprimée.`);
    if (!ok) return;
    try {
      await Api.deleteTask(task.id);
      toast('Étape supprimée');
      location.hash = '#/tasks';
    } catch (err) { toast(err.message, 'error'); }
  }

  function selectField(id, name, options, value) {
    const sel = h('select', { id, name }, ...options.map(([v, label]) => h('option', { value: v }, label)));
    sel.value = value;
    return sel;
  }

  async function viewForm(id) {
    let task = { title: '', status: 'todo', priority: 'medium', description: '', dueDate: '' };
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
      h('div', { class: 'field-row' },
        h('div', { class: 'field' },
          h('label', { for: 'f-status' }, 'Statut'),
          selectField('f-status', 'status', Validate.STATUSES.map((s) => [s, STATUS_LABELS[s]]), task.status),
          h('p', { class: 'err', 'data-err': 'status' })),
        h('div', { class: 'field' },
          h('label', { for: 'f-priority' }, 'Priorité'),
          selectField('f-priority', 'priority', Validate.PRIORITIES.map((p) => [p, PRIORITY_LABELS[p]]), task.priority || 'medium'),
          h('p', { class: 'err', 'data-err': 'priority' })),
        h('div', { class: 'field' },
          h('label', { for: 'f-due' }, 'Échéance', h('small', {}, 'facultative')),
          h('input', { id: 'f-due', name: 'dueDate', type: 'date', value: task.dueDate || '' }),
          h('p', { class: 'err', 'data-err': 'dueDate' }))),
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

  // ---------- Habitudes (B2) ----------
  const STRIP_DAYS = 14;

  function habitRow(habit, doneDays, refresh) {
    const today = todayLocal();
    const { stats } = habit;
    const toggle = h('button', {
      type: 'button', class: 'habit-check', 'aria-pressed': String(stats.doneToday),
      'aria-label': `${habit.name} : ${stats.doneToday ? 'fait aujourd’hui, cliquer pour annuler' : 'cocher pour aujourd’hui'}`,
      onclick: async () => {
        toggle.disabled = true;
        try {
          if (stats.doneToday) await Api.uncheckHabit(habit.id, today);
          else await Api.checkHabit(habit.id, today);
          await refresh();
        } catch (err) { toast(err.message, 'error'); toggle.disabled = false; }
      },
    }, h('i', { class: 'led-lamp' }), h('span', {}, stats.doneToday ? 'Fait aujourd’hui' : 'À faire aujourd’hui'));

    // Les 14 derniers jours, du plus ancien à aujourd'hui : une rangée de LED
    const done = new Set(doneDays);
    const strip = h('ol', { class: 'strip', 'aria-label': `${plural(done.size, 'jour coché', 'jours cochés')} sur les ${STRIP_DAYS} derniers` },
      ...Array.from({ length: STRIP_DAYS }, (_, i) => {
        const day = addDays(today, i - STRIP_DAYS + 1);
        const label = `${formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })} : ${done.has(day) ? 'fait' : 'pas fait'}`;
        return h('li', { class: `${done.has(day) ? 'on' : ''}${day === today ? ' today' : ''}`, title: label });
      }));

    const del = h('button', {
      type: 'button', class: 'btn danger quiet small icon-only', 'aria-label': `Supprimer l’habitude ${habit.name}`,
      onclick: async () => {
        const ok = await confirmDialog('Supprimer cette habitude ?', `« ${habit.name} » et tous ses jours cochés seront supprimés.`);
        if (!ok) return;
        try { await Api.deleteHabit(habit.id); toast('Habitude supprimée'); await refresh(); } catch (err) { toast(err.message, 'error'); }
      },
    }, icon('trash'));

    return h('li', { class: 'habit' },
      h('div', { class: 'habit-main' },
        h('span', { class: 'habit-name' }, habit.name),
        habit.description && h('span', { class: 'habit-desc' }, habit.description),
        h('span', { class: 'habit-stats' },
          `Série ${plural(stats.currentStreak, 'jour', 'jours')}`, h('span', { class: 'sep' }, '·'),
          `Record ${plural(stats.longestStreak, 'jour', 'jours')}`, h('span', { class: 'sep' }, '·'),
          plural(stats.total, 'fois', 'fois'))),
      strip, toggle, del);
  }

  async function viewHabits({ animate = true } = {}) {
    if (animate) loading();
    const today = todayLocal();
    let habits;
    let completions;
    try {
      habits = await Api.listHabits();
      completions = await Promise.all(habits.map((hb) => Api.listCompletions(hb.id, addDays(today, 1 - STRIP_DAYS), today)));
    } catch (err) { return render(errorPanel(err, viewHabits)); }

    const refresh = () => viewHabits({ animate: false });
    const form = h('form', { class: 'habit-new', novalidate: true },
      h('label', { class: 'sr-only', for: 'habit-name' }, 'Nouvelle habitude'),
      h('input', { id: 'habit-name', name: 'name', type: 'text', maxlength: 80, placeholder: 'Nouvelle habitude', required: true }),
      h('button', { class: 'btn primary', type: 'submit' }, icon('plus'), 'Ajouter'),
      h('p', { class: 'err', 'data-err': 'name' }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.elements.name.value.trim();
      if (!name) return showErrors(form, [{ field: 'name', message: 'Donnez un nom à l’habitude' }]);
      try {
        await Api.createHabit({ name });
        toast('Habitude ajoutée');
        await refresh();
        $('#habit-name').focus();
      } catch (err) { showErrors(form, err.details || [], err.message); }
    });

    const doneToday = habits.filter((hb) => hb.stats.doneToday).length;
    render(...[animate === false && { animate: false }].filter(Boolean),
      h('div', { class: 'page-head' },
        h('div', {},
          h('h1', {}, 'Habitudes'),
          h('p', { class: 'page-sub' }, habits.length
            ? `${doneToday} sur ${habits.length} faite${doneToday > 1 ? 's' : ''} aujourd’hui`
            : 'Les gestes d’atelier à refaire chaque jour'))),
      form,
      habits.length
        ? h('ul', { class: 'habit-list' }, habits.map((hb, i) => habitRow(hb, completions[i].map((c) => c.date), refresh)))
        : h('div', { class: 'panel empty' },
          h('h2', {}, 'Aucune habitude pour l’instant'),
          h('p', { class: 'muted' }, 'Ajoutez-en une ci-dessus, puis cochez-la chaque jour pour bâtir une série')));
  }

  // ---------- Activité (B3 heatmap, B4 semaines) ----------
  function heatmapPanel(heat) {
    const first = parseDay(heat.from);
    const pad = (first.getDay() + 6) % 7; // lundi = 0
    const level = (n) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / Math.max(heat.max, 1)) * 4)));
    const cells = [
      ...Array.from({ length: pad }, () => h('span', { class: 'cell pad', 'aria-hidden': 'true' })),
      ...heat.days.map((d) => h('span', {
        class: `cell l${level(d.count)}`,
        title: `${d.count ? plural(d.count, 'étape validée', 'étapes validées') : 'Aucune étape validée'} le ${formatDate(d.date, { day: 'numeric', month: 'long', year: 'numeric' })}`,
      })),
    ];
    const columns = Math.ceil(cells.length / 7);

    // Nom du mois au-dessus de la colonne qui contient son 1er jour
    const months = [];
    heat.days.forEach((d, i) => {
      if (d.date.endsWith('-01') || i === 0) {
        const col = Math.floor((i + pad) / 7) + 1;
        if (!months.length || col - months[months.length - 1].col >= 3) {
          months.push({ col, label: formatDate(d.date, { month: 'short' }) });
        }
      }
    });

    const scroll = h('div', { class: 'heat-scroll' },
      h('div', { class: 'heat', style: `--cols:${columns}` },
        h('div', { class: 'heat-months', 'aria-hidden': 'true' },
          ...months.map((m) => h('span', { style: `grid-column-start:${m.col}` }, m.label))),
        h('div', { class: 'heat-days', 'aria-hidden': 'true' }, h('span', {}, 'lun'), h('span', {}, 'mer'), h('span', {}, 'ven')),
        h('div', { class: 'heat-grid', role: 'img', 'aria-label': `${plural(heat.total, 'étape validée', 'étapes validées')} entre le ${formatDate(heat.from)} et le ${formatDate(heat.to)}` }, ...cells)));
    // Sur un écran étroit, on montre d'abord les semaines les plus récentes
    requestAnimationFrame(() => { scroll.scrollLeft = scroll.scrollWidth; });

    return h('section', { class: 'panel chart' },
      h('div', { class: 'chart-head' },
        h('h2', {}, 'Étapes validées sur 12 mois'),
        h('p', { class: 'muted' }, `${plural(heat.total, 'étape validée', 'étapes validées')}, record de ${heat.max} en un jour`)),
      scroll,
      h('div', { class: 'heat-legend', 'aria-hidden': 'true' },
        'Moins', ...[0, 1, 2, 3, 4].map((l) => h('span', { class: `cell l${l}` })), 'Plus'));
  }

  function weeklyPanel(weekly) {
    const weeks = weekly.weeks;
    const max = Math.max(1, ...weeks.flatMap((w) => [w.created, w.completed]));
    const bar = (n, kind) => h('span', { class: `bar bar-${kind}`, style: `height:${(n / max) * 100}%` });
    const current = weeks[weeks.length - 1];
    return h('section', { class: 'panel chart' },
      h('div', { class: 'chart-head' },
        h('h2', {}, 'Les 12 dernières semaines'),
        h('ul', { class: 'legend' },
          h('li', {}, h('i', { class: 'key key-created' }), 'Créées'),
          h('li', {}, h('i', { class: 'key key-completed' }), 'Validées'))),
      h('div', { class: 'weeks', role: 'img', 'aria-label': `Cette semaine : ${plural(current.created, 'étape créée', 'étapes créées')}, ${plural(current.completed, 'validée', 'validées')}` },
        ...weeks.map((w, i) => h('div', {
          class: `week${i === weeks.length - 1 ? ' current' : ''}`,
          title: `Semaine du ${formatDate(w.weekStart, { day: 'numeric', month: 'long' })} : ${plural(w.created, 'créée', 'créées')}, ${plural(w.completed, 'validée', 'validées')}`,
        },
        h('div', { class: 'bars' }, bar(w.created, 'created'), bar(w.completed, 'completed')),
        h('span', { class: 'week-label' }, formatDate(w.weekStart, { day: 'numeric', month: 'numeric' }))))));
  }

  async function viewActivity() {
    loading();
    let sum; let heat; let weekly;
    try {
      [sum, heat, weekly] = await Promise.all([Api.summary(), Api.heatmap(), Api.weekly(12)]);
    } catch (err) { return render(errorPanel(err, viewActivity)); }

    const kpi = (label, value, note) => h('div', { class: 'kpi' },
      h('span', { class: 'kpi-label' }, label), h('strong', {}, value), note && h('span', { class: 'kpi-note' }, note));
    const open = sum.byStatus.todo + sum.byStatus.doing;
    render(
      h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Activité'), h('p', { class: 'page-sub' }, 'Ce que vous avez validé, jour après jour'))),
      h('div', { class: 'kpis' },
        kpi('Étapes', sum.total, `${open} en cours ou à faire`),
        kpi('Validées', `${Math.round(sum.completionRate * 100)} %`, plural(sum.byStatus.done, 'étape', 'étapes')),
        kpi('En retard', sum.overdue, sum.overdue ? 'échéance dépassée' : 'aucune échéance dépassée'),
        kpi('Priorité haute', sum.byPriority.high, 'toutes étapes confondues')),
      heatmapPanel(heat),
      weeklyPanel(weekly));
  }

  // ---------- Routeur ----------
  function setNav(section) {
    document.querySelectorAll('.nav a').forEach((a) => {
      if (a.dataset.nav === section) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

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
    if (hash === '/habits') { setNav('habits'); return viewHabits(); }
    if (hash === '/activity') { setNav('activity'); return viewActivity(); }
    setNav('tasks');
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
