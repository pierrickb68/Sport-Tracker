const CONFIG = window.FORM_CONFIG || { mode: 'new' };
let exerciseCount = 0;

// ── Datalist: merge user exercises ────────────────────────────────────────────
fetch('/api/exercises').then(r => r.json()).then(names => {
  const dl = document.getElementById('exercises-datalist');
  const existing = new Set([...dl.options].map(o => o.value.toLowerCase()));
  names.forEach(name => {
    if (!existing.has(name.toLowerCase())) {
      const opt = document.createElement('option');
      opt.value = name;
      dl.appendChild(opt);
    }
  });
}).catch(() => {});

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
