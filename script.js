const LANGUAGE_COLORS = {
  html: '#e34c26',
  css: '#563d7c',
  javascript: '#f1e05a',
  typescript: '#3178c6',
  python: '#3572A5',
  yaml: '#cb171e',
  json: '#292929',
  markdown: '#083fa1',
  shell: '#89e051',
  bash: '#89e051',
  go: '#00ADD8',
  rust: '#dea584',
  java: '#b07219',
  c: '#555555',
  'c++': '#f34b7d',
  csharp: '#178600',
  ruby: '#701516',
  php: '#4F5D95',
  swift: '#ffac45',
  kotlin: '#A97BFF',
};

const tbody = document.getElementById("commit-list");
const commitTemplate = document.getElementById("commit-list-template");

function fallbackColor(name) {
  return `hsl(0, 0%, 60%)`;
}

function toHumanString(str) {
  return str
    .replace(/^[\s_]+|[\s_]+$/g, '')
    .replace(/[_\s]+/g, ' ')
    .replace(/^[a-z]/, m => m.toUpperCase());
}

function makeConicGradient(data, options = {}) {
  const { position = 'center', from = '0deg' } = options;

  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  if (total <= 0) {
    throw new Error('Proportions must sum to a positive number.');
  }

  let cumulative = 0;
  const stops = [];
  const segments = [];

  entries.forEach(([lang, value]) => {
    const color =
      LANGUAGE_COLORS[lang.toLowerCase()] || fallbackColor(lang.toLowerCase());
    const startPct = (cumulative / total) * 100;
    cumulative += value;
    const endPct = (cumulative / total) * 100;

    stops.push(`${color} ${startPct.toFixed(2)}% ${endPct.toFixed(2)}%`);

    segments.push({ lang, value, startPct, endPct, color });
  });

  const gradient = `conic-gradient(from ${from} at ${position}, ${stops.join(', ')})`;
  return { gradient, segments, total };
}

// Builds the invisible SVG ring of arcs used purely for hover/tooltip hit-testing,
// and wires each segment up to show/hide a shared custom tooltip element.
function buildHitLayer(svgEl, segments, total, tooltipEl) {
  const size = 34;         // matches viewBox / element size
  const radius = size / 2; // full radius so the stroke hit-area covers the visible ring
  const strokeWidth = size; // fat stroke = solid pie wedge coverage
  const circumference = 2 * Math.PI * (radius / 2); // circle drawn at half-radius so stroke fills 0..radius

  const cx = size / 2;
  const cy = size / 2;
  const r = radius / 2;

  svgEl.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svgEl.innerHTML = '';

  const svgNS = 'http://www.w3.org/2000/svg';

  segments.forEach(seg => {
    const fraction = (seg.endPct - seg.startPct) / 100;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    const offset = -((seg.startPct / 100) * circumference);

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'transparent');
    circle.setAttribute('stroke-width', strokeWidth);
    circle.setAttribute('stroke-dasharray', `${dash} ${gap}`);
    circle.setAttribute('stroke-dashoffset', offset);
    circle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
    circle.style.pointerEvents = 'stroke';
    circle.style.cursor = 'pointer';
    circle.tabIndex = 0;

    const pct = fraction * 100 <= 0 ? 0 : (seg.endPct - seg.startPct).toFixed(1);
    const label = `${toHumanString(seg.lang)} ${pct}%`;

    const showTooltip = () => {
      tooltipEl.textContent = label;
      tooltipEl.classList.add('is-visible');
    };
    const hideTooltip = () => {
      tooltipEl.classList.remove('is-visible');
    };

    circle.addEventListener('mouseenter', showTooltip);
    circle.addEventListener('mouseleave', hideTooltip);
    circle.addEventListener('focus', showTooltip);
    circle.addEventListener('blur', hideTooltip);

    svgEl.appendChild(circle);
  });
}

function renderPiChart(container, data, options = {}) {
  const { gradient, segments, total } = makeConicGradient(data, options);

  const chart = document.createElement('div');
  chart.className = 'commit-pi-chart';
  chart.style.background = gradient;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('commit-pi-chart-hitlayer');
  chart.appendChild(svg);

  const center = document.createElement('div');
  center.className = 'commit-pi-chart-center';
  chart.appendChild(center);

  const tooltip = document.createElement('span');
  tooltip.className = 'commit-pi-chart-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  chart.appendChild(tooltip);

  buildHitLayer(svg, segments, total, tooltip);

  container.appendChild(chart);
  return chart;
}

function addCommit(title, date, linesAdded, linesDeleted, filesChanged, languageBreakdown, actionsStatus) {
    const clone = document.importNode(commitTemplate.content, true);

    const chartEl = clone.querySelector(".commit-pi-chart");
    const { gradient, segments, total } = makeConicGradient(languageBreakdown);
    chartEl.style.background = gradient;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('commit-pi-chart-hitlayer');

    clone.querySelector(".commit-pi-chart-center-actions-status").style.backgroundColor = actionsStatus;
    chartEl.insertBefore(svg, chartEl.querySelector('.commit-pi-chart-center'));

    const tooltip = document.createElement('span');
    tooltip.className = 'commit-pi-chart-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    chartEl.appendChild(tooltip);

    buildHitLayer(svg, segments, total, tooltip);
    
    clone.querySelector(".commit-list-item-title").textContent = title;
    clone.querySelector(".commit-list-item-date").textContent = date;
    clone.querySelector(".commit-list-item-line-changes-added").textContent = linesAdded;
    clone.querySelector(".commit-list-item-line-changes-removed").textContent = linesDeleted;
    clone.querySelector(".commit-list-item-file-changed").textContent = `${filesChanged} files changed`;
    tbody.appendChild(clone);
}

addCommit("New Feature!", "16th Sept 2026", 4,10, 10, {"ruby": 0.2, "javascript": 0.5, "yap": 0.3}, "green");
addCommit("New Feature!", "13th Sept 2026", 100, 20, 3, {"html": 0.2, "javascript": 0.5, "yaml": 0.3}, "red");