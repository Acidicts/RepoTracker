import * as api from './api.js';

const LANGUAGE_COLORS = {
  bash: '#89E051',
  c: '#555555',
  clojure: '#DB5855',
  cpp: '#F34B7D',
  csharp: '#178600',
  css: '#563D7C',
  dart: '#00B4AB',
  elixir: '#6E4A7E',
  git: '#181717',
  go: '#00ADD8',
  haskell: '#5E5086',
  html: '#E34C26',
  java: '#B07219',
  javascript: '#F1E05A',
  json: '#292929',
  kotlin: '#A97BFF',
  lua: '#000080',
  markdown: '#083FA1',
  perl: '#0298C3',
  php: '#4F5D95',
  python: '#3572A5',
  r: '#198CE7',
  ruby: '#CC342D',
  erb: '#CC342D',
  rust: '#DEA584',
  scala: '#C22D40',
  shell: '#89E051',
  sql: '#E38C00',
  swift: '#F05138',
  typescript: '#3178C6',
  yaml: '#CB171E',
  unknown: '#999999',
};

const LANGUAGE_EXTENSIONS = {
  bash: ['.sh', '.bash'],
  c: ['.c', '.h'],
  clojure: ['.clj', '.cljs', '.cljc', '.edn'],
  cpp: ['.cpp', '.cc', '.cxx', '.hpp', '.hh', '.hxx'],
  csharp: ['.cs', '.csx'],
  css: ['.css'],
  dart: ['.dart'],
  elixir: ['.ex', '.exs'],
  erb: ['.erb'],
  git: ['.gitignore', '.gitattributes'],
  go: ['.go'],
  haskell: ['.hs', '.lhs'],
  html: ['.html', '.htm'],
  java: ['.java'],
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  json: ['.json'],
  kotlin: ['.kt', '.kts'],
  lua: ['.lua'],
  markdown: ['.md', '.markdown'],
  perl: ['.pl', '.pm'],
  php: ['.php', '.phtml'],
  python: ['.py', '.pyw', '.pyi'],
  r: ['.r', '.R'],
  ruby: ['.rb'],
  rust: ['.rs'],
  scala: ['.scala', '.sc'],
  shell: ['.sh', '.zsh', '.ksh'],
  sql: ['.sql'],
  swift: ['.swift'],
  typescript: ['.ts', '.tsx'],
  yaml: ['.yaml', '.yml'],
  unknown: [],
}

const tbody = document.getElementById("commit-list");
const commitTemplate = document.getElementById("commit-list-template");

var commitItems = new Array();

class Commit {
  constructor(sha, title, date, linesAdded, linesDeleted, filesChanged, languageBreakdown, actionsStatus, committerIconUrl, commitUrl) {
    this.sha = sha;
    this.title = title;
    this.date = date;
    this.linesAdded = linesAdded;
    this.linesDeleted = linesDeleted;
    this.filesChanged = filesChanged;
    this.languageBreakdown = languageBreakdown;
    this.actionsStatus = actionsStatus;
    this.committerIconUrl = committerIconUrl;
    this.commitUrl = commitUrl;
  }

  updateActionsStatus(newStatus) {
    this.actionsStatus = newStatus;
  }

  usableUrl() {
    const match = this.commitUrl.match(
      /^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/]+)\/git\/commits\/([0-9a-f]+)$/
    );

    if (!match) {
      throw new Error("URL does not match expected GitHub commit API format");
    }

    const [, owner, repo, sha] = match;

    return `https://github.com/${owner}/${repo}/commit/${sha}`;
  }
}

function toHumanString(str) {
  return str
    .replace(/^[\s_]+|[\s_]+$/g, '')
    .replace(/[_\s]+/g, ' ')
    .replace(/^[a-z]/, m => m.toUpperCase());
}

const EXTENSION_TO_LANGUAGE = Object.entries(LANGUAGE_EXTENSIONS).reduce((map, [lang, exts]) => {
  for (const ext of exts) map[ext] = lang;
  return map;
}, {});

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
      LANGUAGE_COLORS[lang.toLowerCase()] || LANGUAGE_COLORS.unknown;
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

function GFG(str, maxLength, suffix = '...') {
    if (str.length > maxLength) {
        return str.substring(0, maxLength) + suffix;
    }
    return str;
}

function addCommit(sha, title, date, linesAdded, linesDeleted, filesChanged, languageBreakdown, actionsStatus, committerIconUrl, url) {
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

  clone.querySelector(".commit-list-item-title").textContent = GFG(title, 50, "...");
  clone.querySelector(".commit-list-item-date").textContent = date;
  clone.querySelector(".commit-list-item-line-changes-added").textContent = linesAdded;
  clone.querySelector(".commit-list-item-line-changes-removed").textContent = linesDeleted;
  clone.querySelector(".commit-list-item-file-changed").textContent = `${filesChanged} files changed`;
  clone.querySelector(".commit-list-item-sha").textContent = GFG(sha, 7, "");
  clone.querySelector(".commit-list-item-sha").href = commitItems.find(c => c.sha === sha).usableUrl();
  tbody.appendChild(clone);
}

function getRepoInfo() {
  const repo_input = document.getElementById("repo_input").value;
  return repo_input.split("/");
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

function fileToLang(files) {
  const langMap = {};
  for (const file of files) {
    const ext = '.' + (file.filename.split('.').pop() || '');
    const lang = EXTENSION_TO_LANGUAGE[ext] || 'unknown';
    langMap[lang] = (langMap[lang] || 0) + file["additions"] + file["deletions"];
  }
  return langMapToLangBreakdown(langMap);
}

function langMapToLangBreakdown(langMap) {
  const total = Object.values(langMap).reduce((sum, value) => sum + value, 0);
  const breakdown = {};
  for (const [lang, value] of Object.entries(langMap)) {
    breakdown[lang] = value / total;
  }
  return breakdown;
}

async function getCommits() {
  const commits = await api.getCommits(getRepoInfo()[0], getRepoInfo()[1]);
  for (const commit_obj of commits) {
    const sha = commit_obj["sha"];
    const commit = await api.getCommit(getRepoInfo()[0], getRepoInfo()[1], sha);
    createCommit(commit["sha"], commit["commit"]["message"], formatDate(commit["commit"]["author"]["date"]), commit["stats"]["additions"], commit["stats"]["deletions"], commit["files"].length, fileToLang(commit["files"]), "yellow", commit["author"]["avatar_url"], commit["commit"]["url"]);
    addCommit(commit["sha"], commit["commit"]["message"], formatDate(commit["commit"]["author"]["date"]), commit["stats"]["additions"], commit["stats"]["deletions"], commit["files"].length, fileToLang(commit["files"]), "yellow", commit["author"]["avatar_url"], commit["commit"]["url"]);
    console.log(`Commit ${commit["sha"]} added to commitItems.`);
  }
}

function createCommit(sha, title, date, linesAdded, linesDeleted, filesChanged, languageBreakdown, actionsStatus, committerIconUrl, Url) {
  const commit = new Commit(sha, title, date, linesAdded, linesDeleted, filesChanged, languageBreakdown, actionsStatus, committerIconUrl, Url);
  commitItems.push(commit);
  return commit;
}

function clearCommits() {
  tbody.innerHTML = '';
  commitItems = new Array();
}

async function updateCiData(commit) {
  const ciData = await api.getCIStatus(getRepoInfo()[0], getRepoInfo()[1], commit.sha);
  let complete = true;
  let failed = false;
  for (const checkRun of ciData["check_runs"]) {
    if (["queued", "in_progress", "waiting", "requested", "pending"].includes(checkRun["status"])) {
      complete = false;
    }
    if (checkRun["status"] === "completed" && ["failure", "timed_out", "cancelled", "action_required"].includes(checkRun["conclusion"])) {
      failed = true;
    }
    console.log(`Check run ${checkRun["name"]} for commit ${commit.sha}: status=${checkRun["status"]}, conclusion=${checkRun["conclusion"]}`);
  }
  const status = failed ? "red" : (complete ? "green" : "yellow");
  commitItems.find(c => c.sha === commit.sha).updateActionsStatus(status);
}

async function updateAllCommits() {
  const items = commitItems.filter(c => c.actionsStatus === "yellow");
  for (const commit of items) {
    await updateCiData(commit);
  }
}

function drawAllCommits() {
  tbody.innerHTML = '';
  for (const commit of commitItems) {
    addCommit(commit.sha, commit.title, commit.date, commit.linesAdded, commit.linesDeleted, commit.filesChanged, commit.languageBreakdown, commit.actionsStatus, commit.committerIconUrl, commit.commitUrl);
  }
}

function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
}

function getCookie(name) {
  const cname = name + "=";
  const cookies = document.cookie.split(";");
  for (let c of cookies) {
    c = c.trim();
    if (c.indexOf(cname) === 0) {
      return decodeURIComponent(c.substring(cname.length));
    }
  }
  return null;
}

document.getElementById("repo-input-button").addEventListener("click", async () => {
  clearCommits();
  setCookie("repo_input", document.getElementById("repo_input").value, 7);
  try {
    await api.checkGithubKey();
    await getCommits();
    await updateAllCommits();
    console.log('About to draw', commitItems.length);
    drawAllCommits();
    console.log('Finished drawing', commitItems.length);
  } catch (error) {
    console.error("Error fetching commits:", error);
    alert("Error fetching commits. Please check the repository and your GitHub key.");
  }
});

document.getElementById("save-settings").addEventListener("click", async () => {
  try {
    await api.checkGithubKey();
    document.getElementById("settings-modal").close();
    setCookie("github_key", document.getElementById("github_key").value, 7);
    alert("Success, the GitHub key is valid.");
  } catch (error) {
    console.error("Invalid GitHub key:", error);
    alert("Invalid GitHub key. Please check and try again.");
  }
});

document.getElementById("settings-button").addEventListener('click', () => {
  const settingsModal = document.getElementById("settings-modal");
  settingsModal.showModal();
});

document.addEventListener("DOMContentLoaded", function () {
  const repoInput = document.getElementById("repo_input");
  const githubKey = document.getElementById("github_key");

  const savedRepo = getCookie("repo_input");
  if (savedRepo) {
    repoInput.value = savedRepo;
  }

  const savedKey = getCookie("github_key");
  if (savedKey) {
    githubKey.value = savedKey;
  }
});
