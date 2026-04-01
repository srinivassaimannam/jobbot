// ── STATE ──────────────────────────────────────────────
const CONFIG_KEY = 'jobbot_config';
const SAVED_KEY  = 'jobbot_saved';

let config  = {};
let allJobs = [];
let saved   = [];
let filters = { exp: '', type: '', platform: '', remote: false };

// ── BOOT ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  config = loadConfig();
  saved  = loadSaved();
  updateSavedCount();

  if (config.apiKey && config.role) {
    showMain();
    populateSettings();
    document.getElementById('search-input').value = config.role;
    runSearch();
  } else {
    document.getElementById('setup-screen').style.display = 'flex';
    document.getElementById('setup-screen').style.flexDirection = 'column';
    document.getElementById('setup-screen').style.minHeight = '100vh';
    document.getElementById('setup-screen').style.justifyContent = 'center';
  }
});

// ── SETUP ──────────────────────────────────────────────
function saveSetupAndSearch() {
  const apiKey = document.getElementById('s-apikey').value.trim();
  const role   = document.getElementById('s-role').value.trim();
  if (!role) { alert('Please enter your target role.'); return; }

  config = {
    name:     document.getElementById('s-name').value.trim(),
    role,
    skills:   document.getElementById('s-skills').value.trim(),
    location: document.getElementById('s-location').value.trim(),
    exp:      document.getElementById('s-exp').value,
    type:     document.getElementById('s-type').value,
    apiKey,
    count:    '10'
  };
  saveConfig(config);
  showMain();
  populateSettings();
  document.getElementById('search-input').value = role;
  runSearch();
}

// ── MAIN VIEW ──────────────────────────────────────────
function showMain() {
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('main-screen').style.display  = 'block';
}

function switchView(view) {
  document.getElementById('view-search').style.display = view === 'search' ? 'block' : 'none';
  document.getElementById('view-saved').style.display  = view === 'saved'  ? 'block' : 'none';
  document.getElementById('nav-search').classList.toggle('active-nav', view === 'search');
  document.getElementById('nav-saved').classList.toggle('active-nav',  view === 'saved');
  document.getElementById('filters-bar').style.display = view === 'search' ? 'flex' : 'none';
  if (view === 'saved') renderSaved();
}

// ── SEARCH ─────────────────────────────────────────────
async function runSearch() {
  const query = document.getElementById('search-input').value.trim() || config.role;
  if (!query) { alert('Enter a job title or skill to search.'); return; }

  setStatus('<span class="spinner"></span> Searching jobs for <strong>' + query + '</strong>...');
  document.getElementById('job-grid').innerHTML = '';

  if (!config.apiKey) {
    setTimeout(() => renderMockJobs(query), 800);
    return;
  }

  const loc      = config.location || '';
  const fullQ    = loc ? `${query} in ${loc}` : query;
  const empType  = config.type   || '';
  const expLevel = config.exp    || '';
  const count    = config.count  || '10';

  let url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(fullQ)}&num_pages=1&page=1`;
  if (empType)  url += `&employment_types=${empType}`;
  if (expLevel) url += `&job_requirements=${expLevel}`;

  try {
    const resp = await fetch(url, {
      headers: {
        'X-RapidAPI-Key':  config.apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    });
    const data = await resp.json();

    if (data.status === 'ERROR' || !data.data) {
      setStatus('⚠ API error — check your RapidAPI key in Settings.');
      return;
    }

    allJobs = data.data.slice(0, parseInt(count));
    setStatus(`Found <strong>${allJobs.length}</strong> jobs for "${query}"`);
    applyFilters();
  } catch (e) {
    setStatus('⚠ Search failed. Check your API key in Settings.');
    console.error(e);
  }
}

function applyFilters() {
  filters.remote = document.getElementById('remote-only').checked;

  let jobs = [...allJobs];

  if (filters.exp)      jobs = jobs.filter(j => (j.job_required_experience?.required_experience_in_months || 0) >= expToMonths(filters.exp));
  if (filters.type)     jobs = jobs.filter(j => (j.job_employment_type || '').toLowerCase() === filters.type.toLowerCase());
  if (filters.platform) jobs = jobs.filter(j => (j.job_publisher || '').toLowerCase().includes(filters.platform));
  if (filters.remote)   jobs = jobs.filter(j => j.job_is_remote);

  renderJobs(jobs);
}

function expToMonths(val) {
  return { ENTRY_LEVEL: 0, MID_LEVEL: 36, SENIOR_LEVEL: 72, DIRECTOR: 120 }[val] || 0;
}

// ── RENDER JOBS ────────────────────────────────────────
function renderJobs(jobs) {
  const grid = document.getElementById('job-grid');
  if (!jobs.length) {
    grid.innerHTML = `<div class="empty-state"><h3>No jobs found</h3><p>Try different keywords or clear filters.</p></div>`;
    return;
  }

  grid.innerHTML = jobs.map((j, i) => {
    const id        = 'job_' + i;
    const platform  = detectPlatform(j.job_publisher);
    const posted    = j.job_posted_at_datetime_utc ? timeSince(new Date(j.job_posted_at_datetime_utc)) : '';
    const isNew     = posted && (posted.includes('h ago') || (posted.includes('d ago') && parseInt(posted) <= 2));
    const isSaved   = saved.some(s => s.id === id);
    const desc      = (j.job_description || '').substring(0, 220);
    const expTag    = j.job_required_experience?.required_experience_in_months
                      ? formatExp(j.job_required_experience.required_experience_in_months) : '';
    const applyLink = j.job_apply_link || '#';

    return `<div class="job-card" style="animation-delay:${i * 0.04}s">
      <div class="jc-top">
        <div>
          <div class="jc-title">${j.job_title || 'Software Engineer'}</div>
          <div class="jc-company">${j.employer_name || 'Company'} &middot; ${j.job_city || j.job_country || 'India'}</div>
        </div>
        <button class="jc-save-btn ${isSaved ? 'saved' : ''}" onclick="toggleSave('${id}', this, ${JSON.stringify(j).replace(/'/g,"&#39;")})" title="${isSaved ? 'Saved' : 'Save job'}">
          ${isSaved ? '★' : '☆'}
        </button>
      </div>
      <div class="jc-tags">
        <span class="tag tag-platform">${platform}</span>
        ${j.job_employment_type ? `<span class="tag tag-type">${formatType(j.job_employment_type)}</span>` : ''}
        ${j.job_is_remote ? '<span class="tag tag-remote">Remote</span>' : ''}
        ${isNew ? '<span class="tag tag-new">New</span>' : ''}
        ${expTag ? `<span class="tag tag-exp">${expTag}</span>` : ''}
      </div>
      ${desc ? `<p class="jc-desc">${desc}...</p>` : ''}
      <div class="jc-footer">
        <span class="jc-date">${posted || 'Recently posted'}</span>
        <div class="jc-actions">
          <a href="${applyLink}" target="_blank" class="btn-apply">Apply now ↗</a>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderMockJobs(query) {
  const loc = config.location || 'India';
  const mock = [
    { job_title: query, employer_name: 'Infosys', job_city: loc, job_employment_type: 'FULLTIME', job_publisher: 'Naukri', job_is_remote: false, job_description: `We are looking for a talented ${query} to join our growing analytics team. You will work on building data pipelines, dashboards, and reports to support business decisions.`, job_apply_link: 'https://www.naukri.com/', job_posted_at_datetime_utc: new Date(Date.now() - 3600000*5).toISOString() },
    { job_title: `Senior ${query}`, employer_name: 'TCS Digital', job_city: loc, job_employment_type: 'FULLTIME', job_publisher: 'LinkedIn', job_is_remote: false, job_description: `Senior ${query} role. Work with stakeholders to define KPIs, create dashboards in Power BI / Tableau, and write complex SQL queries for data extraction.`, job_apply_link: 'https://www.linkedin.com/jobs/', job_posted_at_datetime_utc: new Date(Date.now() - 3600000*18).toISOString() },
    { job_title: `${query} – Remote`, employer_name: 'Wipro Technologies', job_city: 'Remote', job_employment_type: 'FULLTIME', job_publisher: 'Indeed', job_is_remote: true, job_description: `Fully remote ${query} position. Strong Python and SQL skills required. You will analyse large datasets and deliver actionable insights to cross-functional teams.`, job_apply_link: 'https://in.indeed.com/', job_posted_at_datetime_utc: new Date(Date.now() - 3600000*2).toISOString() },
    { job_title: `${query} (Contract)`, employer_name: 'HCL Technologies', job_city: loc, job_employment_type: 'CONTRACTOR', job_publisher: 'Naukri', job_is_remote: false, job_description: `6-month contract for an experienced ${query}. Immediate joiners preferred. Competitive daily rate offered.`, job_apply_link: 'https://www.naukri.com/', job_posted_at_datetime_utc: new Date(Date.now() - 3600000*48).toISOString() },
    { job_title: `Lead ${query}`, employer_name: 'Accenture India', job_city: loc, job_employment_type: 'FULLTIME', job_publisher: 'LinkedIn', job_is_remote: false, job_description: `Lead our analytics centre of excellence. Mentor junior analysts, drive data strategy, and present insights to C-level executives.`, job_apply_link: 'https://www.linkedin.com/jobs/', job_posted_at_datetime_utc: new Date(Date.now() - 3600000*72).toISOString() },
  ];
  allJobs = mock;
  setStatus(`Found <strong>${mock.length}</strong> jobs for "${query}" <span style="color:#92400e;font-size:12px;">(demo — add RapidAPI key in ⚙ Settings for live results)</span>`);
  renderJobs(mock);
}

// ── SAVE / TRACKER ─────────────────────────────────────
function toggleSave(id, btn, jobData) {
  const idx = saved.findIndex(s => s.id === id);
  if (idx >= 0) {
    saved.splice(idx, 1);
    btn.textContent = '☆';
    btn.classList.remove('saved');
  } else {
    saved.push({
      id,
      title:    jobData.job_title,
      company:  jobData.employer_name,
      platform: detectPlatform(jobData.job_publisher),
      link:     jobData.job_apply_link || '#',
      status:   'Saved',
      date:     new Date().toLocaleDateString('en-IN')
    });
    btn.textContent = '★';
    btn.classList.add('saved');
  }
  saveSavedList();
  updateSavedCount();
}

function renderSaved() {
  const list = document.getElementById('saved-list');
  if (!saved.length) {
    list.innerHTML = `<div class="empty-state"><h3>No saved jobs yet</h3><p>Star jobs from the search results to track them here.</p></div>`;
    return;
  }
  list.innerHTML = saved.map((s, i) => `
    <div class="saved-card">
      <div class="saved-card-left">
        <h4>${s.title}</h4>
        <p>${s.company} &middot; ${s.platform} &middot; ${s.date}</p>
      </div>
      <div class="saved-card-right">
        <a href="${s.link}" target="_blank" class="btn-apply" style="font-size:12px;padding:5px 12px;">Apply ↗</a>
        <select class="status-select" onchange="updateStatus(${i}, this.value)">
          ${['Saved','Applied','Interview','Offer','Rejected'].map(st => `<option${s.status===st?' selected':''}>${st}</option>`).join('')}
        </select>
        <button class="remove-btn" onclick="removeFromSaved(${i})">×</button>
      </div>
    </div>`).join('');
}

function updateStatus(i, val) { saved[i].status = val; saveSavedList(); }
function removeFromSaved(i) { saved.splice(i, 1); saveSavedList(); updateSavedCount(); renderSaved(); }
function updateSavedCount() { document.getElementById('saved-count').textContent = saved.length; }

// ── PILL FILTERS ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupPills('exp-pills',      val => { filters.exp = val;      applyFilters(); });
  setupPills('type-pills',     val => { filters.type = val;     applyFilters(); });
  setupPills('platform-pills', val => { filters.platform = val; applyFilters(); });
});

function setupPills(containerId, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      onChange(pill.dataset.val);
    });
  });
}

// ── SETTINGS ──────────────────────────────────────────
function toggleSettings() {
  const panel   = document.getElementById('settings-panel');
  const overlay = document.getElementById('settings-overlay');
  const visible = panel.style.display !== 'none';
  panel.style.display   = visible ? 'none' : 'block';
  overlay.style.display = visible ? 'none' : 'block';
}

function populateSettings() {
  document.getElementById('cfg-name').value     = config.name     || '';
  document.getElementById('cfg-role').value     = config.role     || '';
  document.getElementById('cfg-skills').value   = config.skills   || '';
  document.getElementById('cfg-location').value = config.location || '';
  document.getElementById('cfg-apikey').value   = config.apiKey   || '';
  document.getElementById('cfg-count').value    = config.count    || '10';
}

function saveSettings() {
  config.name     = document.getElementById('cfg-name').value.trim();
  config.role     = document.getElementById('cfg-role').value.trim();
  config.skills   = document.getElementById('cfg-skills').value.trim();
  config.location = document.getElementById('cfg-location').value.trim();
  config.apiKey   = document.getElementById('cfg-apikey').value.trim();
  config.count    = document.getElementById('cfg-count').value;
  saveConfig(config);
  toggleSettings();
  document.getElementById('search-input').value = config.role;
  runSearch();
}

function resetApp() {
  if (!confirm('This will clear all your settings and saved jobs. Continue?')) return;
  localStorage.removeItem(CONFIG_KEY);
  localStorage.removeItem(SAVED_KEY);
  location.reload();
}

// ── SETTINGS BTN ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const sbtn = document.querySelector('.settings-btn');
  if (sbtn) sbtn.addEventListener('click', toggleSettings);
});

// ── HELPERS ────────────────────────────────────────────
function setStatus(html) { document.getElementById('status-bar').innerHTML = html; }

function detectPlatform(publisher) {
  if (!publisher) return 'LinkedIn';
  const p = publisher.toLowerCase();
  if (p.includes('indeed'))  return 'Indeed';
  if (p.includes('naukri'))  return 'Naukri';
  if (p.includes('linkedin')) return 'LinkedIn';
  return publisher;
}

function formatType(t) {
  return { FULLTIME: 'Full-time', PARTTIME: 'Part-time', CONTRACTOR: 'Contract', INTERN: 'Internship' }[t] || t;
}

function formatExp(months) {
  if (months < 12) return `${months}m exp`;
  const yrs = Math.floor(months / 12);
  return `${yrs}+ yrs exp`;
}

function timeSince(date) {
  const sec = Math.floor((Date.now() - date) / 1000);
  if (sec < 3600)  return Math.floor(sec / 60) + 'm ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  return Math.floor(sec / 86400) + 'd ago';
}

// ── STORAGE ────────────────────────────────────────────
function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}; } catch { return {}; }
}
function saveConfig(cfg) { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); }
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; }
}
function saveSavedList() { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); }

// ── SEARCH ON ENTER ────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement.id === 'search-input') runSearch();
});
