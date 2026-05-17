let exerciseCount = 0;

function addExercise() {
  const template = document.getElementById('exercise-template');
  const clone = template.content.cloneNode(true);
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
  addSet(block);
  block.querySelector('.exercise-name-input').focus();
}

function addSet(exerciseBlock) {
  const template = document.getElementById('set-template');
  const clone = template.content.cloneNode(true);
  const wrapper = clone.querySelector('.set-wrapper');
  const container = exerciseBlock.querySelector('.sets-container');
  const existing = container.querySelectorAll('.set-wrapper');

  wrapper.querySelector('.set-number').textContent = existing.length + 1;

  if (existing.length > 0) {
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
  exerciseBlock.querySelectorAll('.set-wrapper').forEach((wrapper, i) => {
    wrapper.querySelector('.set-number').textContent = i + 1;
  });
}

function collectFormData() {
  const date = document.getElementById('date').value;
  const notes = document.getElementById('notes').value;
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

  return { date, notes, exercises };
}

document.getElementById('add-exercise-btn').addEventListener('click', addExercise);

document.getElementById('session-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = collectFormData();

  if (!data.date) { showToast('Veuillez saisir une date.', 'error'); return; }
  if (data.exercises.length === 0) { showToast('Ajoutez au moins un exercice.', 'error'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';

  try {
    const res = await fetch('/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      showToast('Séance enregistrée !');
      setTimeout(() => window.location.href = '/', 800);
    } else {
      const err = await res.json();
      showToast(err.error || 'Erreur lors de l\'enregistrement.', 'error');
      btn.disabled = false;
      btn.textContent = 'Enregistrer la séance';
    }
  } catch {
    showToast('Erreur réseau.', 'error');
    btn.disabled = false;
    btn.textContent = 'Enregistrer la séance';
  }
});

addExercise();
