let chart = null;

const COLORS = {
  line: '#c9a84c',
  fill: 'rgba(201, 168, 76, 0.06)',
  point: '#e8c870',
  grid: 'rgba(255, 255, 255, 0.035)',
  text: '#888898'
};

const METRIC_LABELS = {
  max_weight: 'Poids max (kg)',
  volume: 'Volume (kg)',
  avg_reps: 'Reps moyennes'
};

async function loadProgression() {
  const exercise = document.getElementById('exercise-select').value;
  const metric = document.getElementById('metric-select').value;

  const loading = document.getElementById('chart-loading');
  const empty = document.getElementById('chart-empty');
  const canvas = document.getElementById('progression-chart');

  loading.classList.remove('hidden');
  empty.classList.add('hidden');
  canvas.style.display = 'none';

  if (chart) { chart.destroy(); chart = null; }

  const res = await fetch(`/api/progression/${encodeURIComponent(exercise)}`);
  const data = await res.json();

  loading.classList.add('hidden');

  if (data.length < 1) {
    empty.classList.remove('hidden');
    document.getElementById('chart-stats').innerHTML = '';
    return;
  }

  canvas.style.display = 'block';

  const labels = data.map(d => {
    const [y, m, day] = d.date.split('-');
    return `${day}/${m}/${y}`;
  });
  const values = data.map(d => d[metric]);

  chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: METRIC_LABELS[metric],
        data: values,
        borderColor: COLORS.line,
        backgroundColor: COLORS.fill,
        pointBackgroundColor: COLORS.point,
        pointBorderColor: COLORS.line,
        pointRadius: 5,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.35,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d0d1e',
          borderColor: '#1a1a2e',
          borderWidth: 1,
          titleColor: '#ede8e0',
          bodyColor: '#8888a4',
          padding: 12,
          titleFont: { family: 'Rajdhani', weight: '700', size: 13 },
          bodyFont: { family: 'Rajdhani', size: 12 },
          callbacks: {
            label: ctx => `${METRIC_LABELS[metric]}: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: COLORS.grid },
          ticks: { color: COLORS.text, font: { size: 11, family: 'Rajdhani', weight: '600' } }
        },
        y: {
          grid: { color: COLORS.grid },
          ticks: { color: COLORS.text, font: { size: 11, family: 'Rajdhani', weight: '600' } },
          beginAtZero: false
        }
      }
    }
  });

  renderStats(data, metric);
}

function renderStats(data, metric) {
  if (data.length === 0) { document.getElementById('chart-stats').innerHTML = ''; return; }

  const weights = data.map(d => d.max_weight);
  const volumes = data.map(d => d.volume);
  const bestWeight = Math.max(...weights);
  const totalVolume = volumes.reduce((a, b) => a + b, 0);

  const first = data[0][metric];
  const last = data[data.length - 1][metric];
  const progress = first > 0 ? (((last - first) / first) * 100).toFixed(1) : '—';
  const progressSign = parseFloat(progress) > 0 ? '+' : '';

  document.getElementById('chart-stats').innerHTML = `
    <div class="chart-stat">
      <div class="chart-stat-value">${bestWeight} kg</div>
      <div class="chart-stat-label">Record personnel</div>
    </div>
    <div class="chart-stat">
      <div class="chart-stat-value">${Math.round(totalVolume).toLocaleString('fr-FR')} kg</div>
      <div class="chart-stat-label">Volume total cumulé</div>
    </div>
    <div class="chart-stat">
      <div class="chart-stat-value">${progress !== '—' ? progressSign + progress + ' %' : '—'}</div>
      <div class="chart-stat-label">Progression globale</div>
    </div>
  `;
}

document.getElementById('exercise-select').addEventListener('change', loadProgression);
document.getElementById('metric-select').addEventListener('change', loadProgression);

loadProgression();
