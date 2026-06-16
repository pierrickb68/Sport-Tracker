const CONFIG = window.FORM_CONFIG || { mode: 'new' };
let exerciseCount = 0;

// ── Exercise name suggestions ─────────────────────────────────────────────────
const EXERCISE_NAMES = [
  'Développé couché', 'Développé incliné', 'Développé décliné',
  'Squat', 'Leg press', 'Soulevé de terre',
  'Tirage vertical', 'Rowing barre', 'Rowing haltère',
  'Curl biceps barre', 'Curl biceps haltère', 'Extension triceps poulie',
  'Dips', 'Développé militaire', 'Élévations latérales', 'Élévations frontales',
  'Hip thrust', 'Fentes', 'Leg curl', 'Leg extension',
  'Mollets debout', 'Abdos', 'Planche', 'Face pull',
  'Oiseau haltère', 'Pec deck', 'Pull-over', 'Traction',
  'Curl marteau', 'Skull crusher', 'Développé haltères',
  'Shrug', 'Good morning', 'Romanian deadlift', 'Bulgarian split squat', 'Calf press'
];

fetch('/api/exercises').then(r => r.json()).then(names => {
  const existing = new Set(EXERCISE_NAMES.map(n => n.toLowerCase()));
  names.forEach(n => { if (!existing.has(n.toLowerCase())) EXERCISE_NAMES.push(n); });
}).catch(() => {});

function attachAutocomplete(input) {
  const wrapper = input.closest('.exercise-autocomplete-wrapper');
  let dropdown = null;

  function getOrCreateDropdown() {
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'exercise-suggestions hidden';
      wrapper.appendChild(dropdown);
    }
    return dropdown;
  }

  function showSuggestions(query) {
    const q = query.toLowerCase().trim();
    if (q.length === 0) { hideDropdown(); return; }
    const matches = EXERCISE_NAMES.filter(n => n.toLowerCase().includes(q)).slice(0, 8);
    if (matches.length === 0) { hideDropdown(); return; }

    const dd = getOrCreateDropdown();
    dd.innerHTML = '';
    matches.forEach(name => {
      const item = document.createElement('div');
      item.className = 'exercise-suggestion-item';
      item.textContent = name;
      item.addEventListener('mousedown', (e) => e.preventDefault()); // desktop: prevent blur
      item.addEventListener('touchend', (e) => {
        e.preventDefault(); // iOS: prevent ghost click and blur race
        input.value = name;
        hideDropdown();
        input.blur();
      });
      item.addEventListener('click', () => {
        input.value = name;
        hideDropdown();
      });
      dd.appendChild(item);
    });
    dd.classList.remove('hidden');
  }

  function hideDropdown() {
    if (dropdown) dropdown.classList.add('hidden');
  }

  input.addEventListener('input', () => showSuggestions(input.value));
  input.addEventListener('focus', () => { if (input.value) showSuggestions(input.value); });
  input.addEventListener('blur', () => setTimeout(hideDropdown, 150));
  input.addEventListener('keydown', (e) => {
    if (!dropdown || dropdown.classList.contains('hidden')) return;
    const items = [...dropdown.querySelectorAll('.exercise-suggestion-item')];
    const idx = items.findIndex(i => i.classList.contains('active'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items.forEach(i => i.classList.remove('active'));
      items[Math.min(idx + 1, items.length - 1)]?.classList.add('active');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items.forEach(i => i.classList.remove('active'));
      items[Math.max(idx - 1, 0)]?.classList.add('active');
    } else if (e.key === 'Enter') {
      const active = dropdown.querySelector('.exercise-suggestion-item.active');
      if (active) { e.preventDefault(); input.value = active.textContent; hideDropdown(); }
    } else if (e.key === 'Escape') {
      hideDropdown();
    }
  });
}

// ── Exercise builder ──────────────────────────────────────────────────────────
function addExercise(prefill = null) {
  const tmpl = document.getElementById('exercise-template');
  const clone = tmpl.content.cloneNode(true);
  const block = clone.querySelector('.exercise-block');
  block.dataset.exerciseIndex = exerciseCount++;

  block.querySelector('.btn-remove-exercise').addEventListener('click', () => block.remove());
  block.querySelector('.btn-add-set').addEventListener('click', () => addSet(block));

  const noteBtn = block.querySelector('.exercise-note-btn');
  const noteArea = block.querySelector('.note-area');
  noteBtn.addEventListener('click', () => {
    const hidden = noteArea.classList.toggle('hidden');
    noteBtn.classList.toggle('active', !hidden);
    if (!hidden) noteArea.querySelector('.exercise-note-input').focus();
  });

  document.getElementById('exercises-container').appendChild(block);
  attachAutocomplete(block.querySelector('.exercise-name-input'));

  if (prefill) {
    block.querySelector('.exercise-name-input').value = prefill.name || '';
    if (prefill.unilateral) block.querySelector('.unilateral-checkbox').checked = true;
    if (prefill.comment) {
      block.querySelector('.exercise-note-input').value = prefill.comment;
      noteArea.classList.remove('hidden');
      noteBtn.classList.add('active');
    }
    (prefill.sets || []).forEach(s => addSet(block, s));
  } else {
    addSet(block);
    block.querySelector('.exercise-name-input').focus();
  }
}

function addSet(exerciseBlock, prefill = null) {
  const tmpl = document.getElementById('set-template');
  const clone = tmpl.content.cloneNode(true);
  const wrapper = clone.querySelector('.set-wrapper');
  const container = exerciseBlock.querySelector('.sets-container');
  const existing = container.querySelectorAll('.set-wrapper');

  wrapper.querySelector('.set-number').textContent = existing.length + 1;

  if (prefill) {
    wrapper.querySelector('.set-reps').value = prefill.reps;
    wrapper.querySelector('.set-weight').value = prefill.weight;
    if (prefill.comment) {
      wrapper.querySelector('.set-note-input').value = prefill.comment;
      wrapper.querySelector('.set-note-area').classList.remove('hidden');
      wrapper.querySelector('.btn-set-note').classList.add('active');
    }
  } else if (existing.length > 0) {
    const last = existing[existing.length - 1];
    const lastReps = last.querySelector('.set-reps').value;
    const lastWeight = last.querySelector('.set-weight').value;
    if (lastReps) wrapper.querySelector('.set-reps').value = lastReps;
    if (lastWeight) wrapper.querySelector('.set-weight').value = lastWeight;
  }

  wrapper.querySelector('.btn-remove-set').addEventListener('click', () => {
    wrapper.remove();
    renumberSets(exerciseBlock);
  });

  const noteBtn = wrapper.querySelector('.btn-set-note');
  const noteArea = wrapper.querySelector('.set-note-area');
  noteBtn.addEventListener('click', () => {
    const hidden = noteArea.classList.toggle('hidden');
    noteBtn.classList.toggle('active', !hidden);
    if (!hidden) noteArea.querySelector('.set-note-input').focus();
  });

  container.appendChild(wrapper);
}

function renumberSets(exerciseBlock) {
  exerciseBlock.querySelectorAll('.set-wrapper').forEach((w, i) => {
    w.querySelector('.set-number').textContent = i + 1;
  });
}

function clearExercises() {
  document.getElementById('exercises-container').innerHTML = '';
  exerciseCount = 0;
}

function prefillExercises(exercises) {
  clearExercises();
  (exercises || []).forEach(ex => addExercise(ex));
}

function collectExercises() {
  const exercises = [];
  document.querySelectorAll('.exercise-block').forEach(block => {
    const name = block.querySelector('.exercise-name-input').value.trim();
    if (!name) return;
    const unilateral = block.querySelector('.unilateral-checkbox').checked;
    const comment = block.querySelector('.exercise-note-input').value.trim();
    const sets = [];
    block.querySelectorAll('.set-wrapper').forEach(wrapper => {
      const reps = parseInt(wrapper.querySelector('.set-reps').value);
      const weight = parseFloat(wrapper.querySelector('.set-weight').value);
      const setComment = wrapper.querySelector('.set-note-input').value.trim();
      if (!isNaN(reps) && !isNaN(weight)) sets.push({ reps, weight, comment: setComment });
    });
    if (sets.length > 0) exercises.push({ name, unilateral, comment, sets });
  });
  return exercises;
}

// ── Init: pre-fill ────────────────────────────────────────────────────────────
document.getElementById('add-exercise-btn').addEventListener('click', () => addExercise());

if (CONFIG.mode === 'edit' && CONFIG.sessionData) {
  prefillExercises(CONFIG.sessionData.exercises);
} else if (CONFIG.mode === 'template_edit' && CONFIG.templateData) {
  prefillExercises(CONFIG.templateData.exercises);
} else {
  addExercise();
}

// ── Template loader (new session only) ───────────────────────────────────────
if (CONFIG.mode === 'new') {
  const loaderBtn = document.getElementById('template-loader-btn');
  const picker = document.getElementById('template-picker');
  const select = document.getElementById('template-select');
  const applyBtn = document.getElementById('apply-template-btn');
  const cancelBtn = document.getElementById('cancel-template-btn');

  loaderBtn.addEventListener('click', async () => {
    loaderBtn.classList.add('hidden');
    picker.classList.remove('hidden');
    try {
      const templates = await fetch('/api/templates').then(r => r.json());
      select.innerHTML = '<option value="">— Choisir un template —</option>';
      if (templates.length === 0) {
        select.innerHTML = '<option value="" disabled>Aucun template enregistré</option>';
      } else {
        templates.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = t.name;
          select.appendChild(opt);
        });
      }
    } catch {
      showToast('Erreur de chargement des templates.', 'error');
    }
  });

  cancelBtn.addEventListener('click', () => {
    picker.classList.add('hidden');
    loaderBtn.classList.remove('hidden');
  });

  applyBtn.addEventListener('click', async () => {
    const id = select.value;
    if (!id) { showToast('Choisissez un template.', 'error'); return; }
    const origText = applyBtn.textContent;
    applyBtn.disabled = true;
    applyBtn.textContent = 'Chargement...';
    try {
      const tmpl = await fetch(`/api/templates/${id}/with-last-weights`).then(r => r.json());
      prefillExercises(tmpl.exercises);
      const notesEl = document.getElementById('notes');
      if (notesEl && !notesEl.value) notesEl.value = tmpl.name;
      picker.classList.add('hidden');
      loaderBtn.classList.remove('hidden');
      showToast(`Template "${tmpl.name}" chargé !`);
    } catch {
      showToast('Erreur lors du chargement du template.', 'error');
    }
    applyBtn.disabled = false;
    applyBtn.textContent = origText;
  });
}

// ── Save as template (session modes only) ────────────────────────────────────
if (CONFIG.mode !== 'template_new' && CONFIG.mode !== 'template_edit') {
  const saveTemplateBtn = document.getElementById('save-template-btn');
  const modal = document.getElementById('save-template-modal');
  const modalCancel = document.getElementById('modal-cancel');
  const modalConfirm = document.getElementById('modal-confirm');
  const templateNameInput = document.getElementById('new-template-name');

  saveTemplateBtn.addEventListener('click', () => {
    const notesVal = document.getElementById('notes')?.value || '';
    templateNameInput.value = notesVal;
    modal.classList.remove('hidden');
    templateNameInput.focus();
  });

  modalCancel.addEventListener('click', () => modal.classList.add('hidden'));

  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  modalConfirm.addEventListener('click', async () => {
    const name = templateNameInput.value.trim();
    if (!name) { showToast('Entrez un nom pour le template.', 'error'); return; }
    const exercises = collectExercises();
    if (!exercises.length) { showToast('Ajoutez au moins un exercice.', 'error'); return; }

    modalConfirm.disabled = true;
    try {
      const res = await fetch('/templates/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, exercises })
      });
      if (res.ok) {
        modal.classList.add('hidden');
        showToast(`Template "${name}" sauvegardé !`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur.', 'error');
      }
    } catch {
      showToast('Erreur réseau.', 'error');
    }
    modalConfirm.disabled = false;
  });
}

// ── Draft auto-save (new session only) ───────────────────────────────────────
if (CONFIG.mode === 'new' && CONFIG.profile) {
  const DRAFT_KEY = `soultracker_draft_${CONFIG.profile}`;

  function saveDraft() {
    const exercises = collectExercises();
    const date = document.getElementById('date')?.value || '';
    const notes = document.getElementById('notes')?.value || '';
    if (!exercises.length && !notes) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      savedAt: new Date().toISOString(), date, notes, exercises
    }));
  }

  function clearDraft() { localStorage.removeItem(DRAFT_KEY); }
  window.__clearDraft = clearDraft;

  const raw = localStorage.getItem(DRAFT_KEY);
  if (raw) {
    try {
      const draft = JSON.parse(raw);
      const banner = document.getElementById('draft-banner');
      const msg = document.getElementById('draft-banner-msg');
      if (banner && msg && draft.savedAt) {
        const dt = new Date(draft.savedAt);
        const d = dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const t = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        msg.textContent = `Brouillon non terminé du ${d} à ${t} — voulez-vous le reprendre ?`;
        banner.classList.remove('hidden');

        document.getElementById('draft-resume-btn').addEventListener('click', () => {
          if (draft.date) document.getElementById('date').value = draft.date;
          if (draft.notes) document.getElementById('notes').value = draft.notes;
          prefillExercises(draft.exercises || []);
          banner.classList.add('hidden');
        });

        document.getElementById('draft-ignore-btn').addEventListener('click', () => {
          clearDraft();
          banner.classList.add('hidden');
        });
      }
    } catch { localStorage.removeItem(DRAFT_KEY); }
  }

  setInterval(saveDraft, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveDraft();
  });
  window.addEventListener('beforeunload', saveDraft);
}

// ── Form submit ───────────────────────────────────────────────────────────────
document.getElementById('session-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const exercises = collectExercises();
  if (!exercises.length) { showToast('Ajoutez au moins un exercice.', 'error'); return; }

  let payload, url;
  const isTemplate = CONFIG.mode === 'template_new' || CONFIG.mode === 'template_edit';

  if (isTemplate) {
    const name = document.getElementById('template-name').value.trim();
    if (!name) { showToast('Entrez un nom pour le template.', 'error'); return; }
    payload = { name, exercises };
    url = CONFIG.mode === 'template_new'
      ? '/templates/new'
      : `/templates/${CONFIG.templateId}/edit`;
  } else {
    const date = document.getElementById('date').value;
    const notes = document.getElementById('notes').value;
    if (!date) { showToast('Veuillez saisir une date.', 'error'); return; }
    payload = { date, notes, exercises };
    url = CONFIG.mode === 'edit'
      ? `/session/${CONFIG.sessionId}/edit`
      : '/add';
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  const origText = btn.textContent;
  btn.textContent = 'Enregistrement...';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      window.__clearDraft?.();
      showToast(isTemplate ? 'Template sauvegardé !' : 'Séance enregistrée !');
      setTimeout(() => {
        window.location.href = isTemplate ? '/templates' : '/';
      }, 800);
    } else {
      const err = await res.json();
      showToast(err.error || "Erreur lors de l'enregistrement.", 'error');
      btn.disabled = false;
      btn.textContent = origText;
    }
  } catch {
    showToast('Erreur réseau.', 'error');
    btn.disabled = false;
    btn.textContent = origText;
  }
});
