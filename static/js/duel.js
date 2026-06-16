const ME = window.DUEL_CONFIG?.profile || '';
const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_CLASSES = ['rank-gold', 'rank-silver', 'rank-bronze'];
const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

/* ── Helpers ─────────────────────────────────────────────── */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function avatarHTML(p, size) {
  const cls = `rank-avatar${size === 'lg' ? ' rank-avatar-lg' : ''}`;
  if (p.avatar_url) {
    return `<div class="${cls}"><img src="${esc(p.avatar_url)}" alt="${esc(p.name)}" class="rank-avatar-img"></div>`;
  }
  return `<div class="${cls}"><span class="rank-avatar-initial">${esc(p.name[0].toUpperCase())}</span></div>`;
}

function fmtVolume(v) {
  if (v == null) return '—';
  if (v >= 1000) return (v / 1000).toFixed(1) + 't';
  return v.toLocaleString('fr-FR') + ' kg';
}

function fmtProgress(v) {
  if (v == null) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
}

function meTag(name) {
  return name === ME ? ' <span class="rank-me-tag">vous</span>' : '';
}

/* ── Messages ─────────────────────────────────────────────── */
function getSaiyanMessage(p) {
  const s = p.sessions_month || 0;
  if (s >= 14) return "⚡ Ultra Instinct activé — personne ne peut l'arrêter";
  if (s >= 10) return '🔥 Super Saiyan 3 — le titre est largement mérité';
  if (s >= 6)  return '💪 Le trône lui appartient sans discussion';
  if (s >= 3)  return '👑 Le boss du mois s\'est levé';
  return '🌱 Même les légendes ont des débuts modestes';
}

function getFunMessage(p, rank, leader) {
  if (rank === 0) return null;
  const gap = (leader.sessions_month || 0) - (p.sessions_month || 0);
  const name = esc(p.name);
  if (p.sessions_month === 0) return `${name} a décidé que le canapé c'est un muscle 🛋️`;
  if (gap >= 8) return `${name} dort encore… zzz 😴`;
  if (gap >= 5) return `${name} a besoin d'un Senzu Bean 🌱`;
  if (gap >= 3) return `${name} est encore en warm-up 🥊`;
  if (gap >= 1) return `À ${gap} séance${gap > 1 ? 's' : ''} du trône — allez ${name} !`;
  return `${name} talonne le leader 🎯`;
}

/* ── Super Saiyan Banner ──────────────────────────────────── */
function renderSaiyan(data) {
  const section = document.getElementById('saiyan-section');
  if (!section) return;

  const winner = [...data].sort(
    (a, b) => (b.sessions_month - a.sessions_month) || (b.volume_month - a.volume_month)
  )[0];

  if (!winner || (winner.sessions_month || 0) === 0) {
    section.innerHTML = '';
    return;
  }

  const month = MONTHS_FR[new Date().getMonth()];
  const avatarInner = winner.avatar_url
    ? `<img src="${esc(winner.avatar_url)}" alt="${esc(winner.name)}" class="rank-avatar-img">`
    : `<span class="saiyan-avatar-initial">${esc(winner.name[0].toUpperCase())}</span>`;

  section.innerHTML = `
    <div class="saiyan-banner">
      <div class="saiyan-label">⚡ super saiyan du mois</div>
      <span class="saiyan-crown">👑</span>
      <div class="saiyan-avatar-wrap">${avatarInner}</div>
      <div class="saiyan-name">${esc(winner.name)}${meTag(winner.name)}</div>
      <div class="saiyan-subtitle">Guerrier de ${month}</div>
      <div class="saiyan-stats">
        <div class="saiyan-stat">
          <span class="saiyan-stat-val">${winner.sessions_month}</span>
          <span class="saiyan-stat-lbl">séances</span>
        </div>
        <div class="saiyan-stat">
          <span class="saiyan-stat-val">${fmtVolume(winner.volume_month)}</span>
          <span class="saiyan-stat-lbl">volume</span>
        </div>
        <div class="saiyan-stat">
          <span class="saiyan-stat-val">${winner.streak > 0 ? '🔥 ' + winner.streak + 'j' : '—'}</span>
          <span class="saiyan-stat-lbl">streak</span>
        </div>
      </div>
      <div class="saiyan-message">${getSaiyanMessage(winner)}</div>
    </div>
  `;
}

/* ── Head-to-head Comparison (2 profiles) ────────────────── */
function renderCompare(data) {
  const section = document.getElementById('compare-section');
  if (!section || data.length !== 2) { if (section) section.innerHTML = ''; return; }

  const [a, b] = data;

  function numRow(label, va, vb, fmt) {
    const f = fmt || (v => v == null ? '—' : String(v));
    const aW = va != null && vb != null && va > vb;
    const bW = va != null && vb != null && vb > va;
    return `<div class="compare-row">
      <div class="compare-val${aW ? ' compare-winner' : ''}">${f(va)}</div>
      <div class="compare-label">${label}</div>
      <div class="compare-val compare-val-right${bW ? ' compare-winner' : ''}">${f(vb)}</div>
    </div>`;
  }

  function strRow(label, va, vb) {
    return `<div class="compare-row">
      <div class="compare-val">${esc(va) || '—'}</div>
      <div class="compare-label">${label}</div>
      <div class="compare-val compare-val-right">${esc(vb) || '—'}</div>
    </div>`;
  }

  section.innerHTML = `
    <div class="duel-compare">
      <div class="duel-compare-title">comparaison mensuelle</div>
      <div class="compare-names">
        <span class="compare-name${a.name === ME ? ' compare-name-me' : ''}">${esc(a.name)}${meTag(a.name)}</span>
        <span class="compare-vs">VS</span>
        <span class="compare-name compare-name-right${b.name === ME ? ' compare-name-me' : ''}">${esc(b.name)}${meTag(b.name)}</span>
      </div>
      ${numRow('Séances ce mois', a.sessions_month, b.sessions_month)}
      ${numRow('Volume ce mois', a.volume_month, b.volume_month, fmtVolume)}
      ${numRow('Streak actuel', a.streak, b.streak, v => v > 0 ? '🔥 ' + v + 'j' : '—')}
      ${strRow('Exercice favori', a.fav_exercise, b.fav_exercise)}
      ${numRow('Progression poids', a.weight_progress, b.weight_progress, fmtProgress)}
      ${strRow('Jour préféré', a.fav_day, b.fav_day)}
    </div>
  `;
}

/* ── Podium ───────────────────────────────────────────────── */
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
          <div class="podium-name${p.name === ME ? ' podium-name-me' : ''}">${esc(p.name)}${meTag(p.name)}</div>
          <div class="podium-sessions">${p.sessions_30d} séance${p.sessions_30d !== 1 ? 's' : ''}</div>
          <div class="podium-base ${heightCls}">
            <span class="podium-rank-num">${label}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ── Ranking List ─────────────────────────────────────────── */
function renderRanking(data, maxSessions) {
  const list = document.getElementById('ranking-list');
  const leader = data[0];

  list.innerHTML = data.map((p, i) => {
    const pct = maxSessions > 0 ? Math.round((p.sessions_30d / maxSessions) * 100) : 0;
    const medalClass = MEDAL_CLASSES[i] || '';
    const isMe = p.name === ME;
    const funMsg = getFunMessage(p, i, leader);

    const extraParts = [];
    if (p.fav_exercise) extraParts.push(`🏋️ ${esc(p.fav_exercise)}`);
    if (p.fav_day)      extraParts.push(`📅 ${esc(p.fav_day)}`);
    if (p.weight_progress != null) {
      const sign = p.weight_progress >= 0 ? '↑' : '↓';
      extraParts.push(`${sign} ${fmtProgress(p.weight_progress)}`);
    }
    const extraLine = extraParts.length
      ? `<div class="rank-extra">${extraParts.join(' · ')}</div>`
      : '';

    return `
      <div class="rank-card ${medalClass}" style="--rank-delay:${i * 0.07}s">
        <div class="rank-position">
          ${i < 3 ? `<span class="rank-medal">${MEDALS[i]}</span>` : `<span class="rank-num">${i + 1}</span>`}
        </div>
        <div class="rank-avatar ${medalClass}">
          <span class="rank-avatar-initial">${esc(p.name[0].toUpperCase())}</span>
          ${p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="${esc(p.name)}" class="rank-avatar-img">` : ''}
        </div>
        <div class="rank-info">
          <div class="rank-name">${esc(p.name)}${isMe ? ' <span class="rank-me-tag">vous</span>' : ''}</div>
          ${funMsg ? `<div class="fun-message">${funMsg}</div>` : ''}
          <div class="rank-bar-wrap" title="${p.sessions_30d} séances (${pct}%)">
            <div class="rank-bar" style="width:0%" data-target="${pct}"></div>
          </div>
          ${extraLine}
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

  requestAnimationFrame(() => {
    document.querySelectorAll('.rank-bar[data-target]').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  });
}

/* ── Main ─────────────────────────────────────────────────── */
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

    renderSaiyan(data);
    renderCompare(data);
    if (data.length >= 3) renderPodium(data.slice(0, 3));
    renderRanking(data, maxSessions);

  } catch {
    document.getElementById('duel-loading').innerHTML =
      '<p style="color:#ff5555;font-family:var(--f-body)">Erreur de chargement du classement.</p>';
  }
}

loadDuel();
