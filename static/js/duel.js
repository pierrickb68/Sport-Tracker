const ME = window.DUEL_CONFIG?.profile || '';
const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_CLASSES = ['rank-gold', 'rank-silver', 'rank-bronze'];

function avatarHTML(p, size) {
  const cls = `rank-avatar${size === 'lg' ? ' rank-avatar-lg' : ''}`;
  if (p.avatar_url) {
    return `<div class="${cls}"><img src="${p.avatar_url}" alt="${p.name}" class="rank-avatar-img"></div>`;
  }
  return `<div class="${cls}"><span class="rank-avatar-initial">${p.name[0].toUpperCase()}</span></div>`;
}

function fmtVolume(v) {
  if (v >= 1000) return (v / 1000).toFixed(1) + 't';
  return v.toLocaleString('fr-FR') + ' kg';
}

function renderPodium(top3) {
  const section = document.getElementById('podium-section');
  section.classList.remove('hidden');

  const slots = [
    { p: top3[1], label: '2', medalIdx: 1, heightCls: 'podium-base-2' },
    { p: top3[0], label: '1', medalIdx: 0, heightCls: 'podium-base-1' },
    { p: top3[2], label: '3', medalIdx: 2, heightCls: 'podium-base-3' },
  ];

  section.innerHTML = `
    <div class="podium">
      ${slots.map(({ p, label, medalIdx, heightCls }) => `
        <div class="podium-slot">
          <div class="podium-avatar-wrap ${MEDAL_CLASSES[medalIdx]}">
            ${avatarHTML(p, 'lg')}
          </div>
          <div class="podium-name${p.name === ME ? ' podium-name-me' : ''}">${p.name}${p.name === ME ? ' <span class="rank-me-tag">vous</span>' : ''}</div>
          <div class="podium-sessions">${p.sessions_30d} séance${p.sessions_30d !== 1 ? 's' : ''}</div>
          <div class="podium-base ${heightCls}">
            <span class="podium-rank-num">${label}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderRanking(data, maxSessions) {
  const list = document.getElementById('ranking-list');

  list.innerHTML = data.map((p, i) => {
    const pct = maxSessions > 0 ? Math.round((p.sessions_30d / maxSessions) * 100) : 0;
    const medalClass = MEDAL_CLASSES[i] || '';
    const isMe = p.name === ME;

    return `
      <div class="rank-card ${medalClass}" style="--rank-delay:${i * 0.07}s">
        <div class="rank-position">
          ${i < 3 ? `<span class="rank-medal">${MEDALS[i]}</span>` : `<span class="rank-num">${i + 1}</span>`}
        </div>
        <div class="rank-avatar ${medalClass}">
          <span class="rank-avatar-initial">${p.name[0].toUpperCase()}</span>
          ${p.avatar_url ? `<img src="${p.avatar_url}" alt="${p.name}" class="rank-avatar-img">` : ''}
        </div>
        <div class="rank-info">
          <div class="rank-name">${p.name}${isMe ? ' <span class="rank-me-tag">vous</span>' : ''}</div>
          <div class="rank-bar-wrap" title="${p.sessions_30d} séances (${pct}%)">
            <div class="rank-bar" style="width:0%" data-target="${pct}"></div>
          </div>
        </div>
        <div class="rank-stats">
          <div class="rank-stat">
            <span class="rank-stat-val">${p.sessions_30d}</span>
            <span class="rank-stat-lbl">séances</span>
          </div>
          <div class="rank-stat">
            <span class="rank-stat-val">${fmtVolume(p.volume_30d)}</span>
            <span class="rank-stat-lbl">volume</span>
          </div>
          <div class="rank-stat">
            <span class="rank-stat-val${p.streak > 0 ? ' stat-streak' : ''}">
              ${p.streak > 0 ? '🔥&nbsp;' : '—&nbsp;'}${p.streak}j
            </span>
            <span class="rank-stat-lbl">streak</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Animate bars after paint
  requestAnimationFrame(() => {
    document.querySelectorAll('.rank-bar[data-target]').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  });
}

async function loadDuel() {
  try {
    const data = await fetch('/api/duel').then(r => r.json());
    document.getElementById('duel-loading').classList.add('hidden');

    if (data.length === 0) {
      document.getElementById('duel-empty').classList.remove('hidden');
      return;
    }

    document.getElementById('duel-content').classList.remove('hidden');
    const maxSessions = Math.max(...data.map(p => p.sessions_30d), 1);

    if (data.length >= 3) {
      renderPodium(data.slice(0, 3));
    }

    renderRanking(data, maxSessions);

  } catch {
    document.getElementById('duel-loading').innerHTML =
      '<p style="color:#ff5555;font-family:var(--f-body)">Erreur de chargement du classement.</p>';
  }
}

loadDuel();
