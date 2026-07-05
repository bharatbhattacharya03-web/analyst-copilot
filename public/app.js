// ----- Tabs -----
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    panels.forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

// ----- Ticker -----
const tickerEl = document.getElementById('ticker');
const tickerData = [
  ['BA', '+ open roles'],
  ['DA', '+ open roles'],
  ['RA', '+ open roles']
];
tickerEl.innerHTML = tickerData.map(([code, label]) => `<span>${code} <span style="color:var(--muted)">${label}</span></span>`).join('');

// ----- Job search -----
const roleGrid = document.getElementById('roleGrid');
const searchRoleInput = document.getElementById('searchRole');
const searchLocationInput = document.getElementById('searchLocation');
const searchRemote = document.getElementById('searchRemote');
const openLinkedInBtn = document.getElementById('openLinkedIn');

roleGrid.querySelectorAll('.role-card').forEach(card => {
  card.addEventListener('click', () => {
    roleGrid.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    searchRoleInput.value = card.dataset.role;
  });
});

function buildLinkedInSearchUrl(keywords, location, remoteOnly) {
  const base = 'https://www.linkedin.com/jobs/search/';
  const params = new URLSearchParams();
  if (keywords) params.set('keywords', keywords);
  if (location) params.set('location', location);
  if (remoteOnly) params.set('f_WT', '2');
  return `${base}?${params.toString()}`;
}

openLinkedInBtn.addEventListener('click', () => {
  const keywords = searchRoleInput.value.trim() || 'Business Analyst';
  const location = searchLocationInput.value.trim();
  const remote = searchRemote.checked;
  const url = buildLinkedInSearchUrl(keywords, location, remote);
  window.open(url, '_blank', 'noopener');
});

// ----- Resume scoring -----
const fileDrop = document.getElementById('fileDrop');
const resumeFileInput = document.getElementById('resumeFile');
const fileLabel = document.getElementById('fileLabel');
const scoreBtn = document.getElementById('scoreBtn');
const scoreResult = document.getElementById('scoreResult');
const resumeRoleSelect = document.getElementById('resumeRole');
const jobContextInput = document.getElementById('jobContext');

let selectedFile = null;

resumeFileInput.addEventListener('change', () => {
  if (resumeFileInput.files[0]) {
    selectedFile = resumeFileInput.files[0];
    fileLabel.textContent = selectedFile.name;
  }
});

['dragover', 'dragenter'].forEach(evt => {
  fileDrop.addEventListener(evt, (e) => {
    e.preventDefault();
    fileDrop.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach(evt => {
  fileDrop.addEventListener(evt, (e) => {
    e.preventDefault();
    fileDrop.classList.remove('dragover');
  });
});
fileDrop.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    selectedFile = file;
    fileLabel.textContent = file.name;
  } else {
    fileLabel.textContent = 'Please drop a PDF file';
  }
});

function scoreClass(score) {
  if (score >= 75) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderScore(data) {
  scoreResult.classList.remove('hidden');
  const cls = scoreClass(data.score);
  scoreResult.innerHTML = `
    <div class="score-headline">
      <div class="score-number ${cls}">${data.score}</div>
      <div class="score-label">MATCH SCORE / 100</div>
    </div>
    <div class="score-summary">${escapeHtml(data.summary || '')}</div>
    <div class="score-cols" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="score-cols strengths">
        <h4>Strengths</h4>
        <ul>${(data.strengths || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
      </div>
      <div class="score-cols gaps">
        <h4>Gaps</h4>
        <ul>${(data.gaps || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
      </div>
    </div>
    ${(data.suggested_keywords && data.suggested_keywords.length) ? `
    <div class="keywords">
      <h4 style="font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:0 0 8px;">Keywords to add</h4>
      ${data.suggested_keywords.map(k => `<span class="keyword-chip">${escapeHtml(k)}</span>`).join('')}
    </div>` : ''}
  `;
}

scoreBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    fileLabel.textContent = 'Please choose a PDF resume first';
    return;
  }
  scoreBtn.disabled = true;
  scoreBtn.textContent = 'Scoring...';
  scoreResult.classList.add('hidden');

  try {
    const formData = new FormData();
    formData.append('resume', selectedFile);
    formData.append('role', resumeRoleSelect.value);
    formData.append('jobContext', jobContextInput.value.trim());

    const res = await fetch('/api/resume-score', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      scoreResult.classList.remove('hidden');
      scoreResult.innerHTML = `<p class="status-note">${escapeHtml(data.error || 'Something went wrong.')}</p>`;
      return;
    }
    renderScore(data);
  } catch (err) {
    scoreResult.classList.remove('hidden');
    scoreResult.innerHTML = `<p class="status-note">Network error: ${escapeHtml(err.message)}</p>`;
  } finally {
    scoreBtn.disabled = false;
    scoreBtn.textContent = 'Score my resume';
  }
});

// ----- Chat -----
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatWindow = document.getElementById('chatWindow');
let chatHistory = [];

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  const p = document.createElement('p');
  p.textContent = text;
  div.appendChild(p);
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  addMessage('user', message);
  chatHistory.push({ role: 'user', content: message });
  chatInput.value = '';
  chatInput.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: chatHistory })
    });
    const data = await res.json();

    if (!res.ok) {
      addMessage('error', data.error || 'Something went wrong.');
      return;
    }
    addMessage('bot', data.reply);
    chatHistory.push({ role: 'assistant', content: data.reply });
  } catch (err) {
    addMessage('error', `Network error: ${err.message}`);
  } finally {
    chatInput.disabled = false;
    chatInput.focus();
  }
});
