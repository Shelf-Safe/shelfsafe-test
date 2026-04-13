const PATHS = [
  { id: 'frontend', icon: '🖥️', category: 'Software', title: 'Frontend', summary: 'React, UI systems, interaction quality, performance.' , tags:['React', 'UI', 'Fast feedback']},
  { id: 'fullstack', icon: '🧱', category: 'Software', title: 'Fullstack', summary: 'Frontend + backend + shipping practical product work.', tags:['MERN', 'APIs', 'Broad']},
  { id: 'backend', icon: '🔌', category: 'Software', title: 'Backend', summary: 'APIs, services, data flow, business logic, integrations.', tags:['Node', 'APIs', 'Logic']},
  { id: 'java', icon: '☕', category: 'Software', title: 'Java / Spring', summary: 'Structured enterprise backend and larger-company stacks.', tags:['Spring', 'OOP', 'Enterprise']},
  { id: 'python-backend', icon: '🐍', category: 'Software', title: 'Python Backend', summary: 'Automation, APIs, scripting, internal tools, services.', tags:['FastAPI', 'Automation', 'Flexible']},
  { id: 'mobile', icon: '📱', category: 'Software', title: 'Mobile', summary: 'App-focused engineering with product-facing interaction work.', tags:['iOS', 'Android', 'App UX']},
  { id: 'ml', icon: '🤖', category: 'AI / Data', title: 'ML / AI Engineer', summary: 'Models, pipelines, evaluation, data-heavy systems.', tags:['ML', 'Python', 'Data']},
  { id: 'ai-product', icon: '🧠', category: 'AI / Data', title: 'AI-enabled Product Engineer', summary: 'Use LLMs, agents, APIs, and product thinking together.', tags:['LLMs', 'Agents', 'Build fast']},
  { id: 'data-engineering', icon: '🛢️', category: 'AI / Data', title: 'Data Engineering', summary: 'Pipelines, warehousing, reliable data movement.', tags:['ETL', 'Data', 'Infrastructure']},
  { id: 'analytics', icon: '📊', category: 'AI / Data', title: 'Analytics / BI', summary: 'Dashboards, metrics, business insight, reporting.', tags:['SQL', 'Dashboards', 'Business']},
  { id: 'cloud', icon: '☁️', category: 'Cloud / Infra', title: 'Cloud', summary: 'Deployments, cloud services, architecture basics.', tags:['AWS', 'Azure', 'Platform']},
  { id: 'devops', icon: '⚙️', category: 'Cloud / Infra', title: 'DevOps', summary: 'CI/CD, infra automation, observability, reliability.', tags:['Pipelines', 'Infra', 'Ops']},
  { id: 'qa', icon: '🧪', category: 'Cloud / Infra', title: 'QA / Automation', summary: 'Testing systems, automation, quality gates.', tags:['Selenium', 'Cypress', 'Testing']},
  { id: 'security', icon: '🔐', category: 'Cloud / Infra', title: 'Cybersecurity', summary: 'Security workflows, risk mindset, defensive systems.', tags:['Security', 'Risk', 'Specialized']},
  { id: 'sap', icon: '🏢', category: 'Platforms', title: 'SAP', summary: 'Enterprise systems, workflows, implementation-heavy work.', tags:['ERP', 'Business systems', 'Niche']},
  { id: 'salesforce', icon: '💼', category: 'Platforms', title: 'Salesforce', summary: 'CRM, flows, automation, platform careers.', tags:['CRM', 'Platform', 'Demand']},
  { id: 'servicenow', icon: '🗂️', category: 'Platforms', title: 'ServiceNow', summary: 'Enterprise workflow platforms and operations tooling.', tags:['ITSM', 'Workflow', 'Platform']},
  { id: 'blockchain', icon: '⛓️', category: 'Specialized', title: 'Blockchain', summary: 'Smart contracts, Web3 systems, protocol-focused work.', tags:['Web3', 'Niche', 'High variance']},
  { id: 'solutions', icon: '🗣️', category: 'Specialized', title: 'Solutions Engineer', summary: 'Technical communication, demos, customer-facing problem solving.', tags:['Demos', 'Hybrid', 'Communication']},
  { id: 'product', icon: '🧭', category: 'Specialized', title: 'Product / TPM', summary: 'Cross-functional execution, prioritization, delivery.', tags:['Strategy', 'Planning', 'Leadership']}
];

const FOUNDATIONS = [
  { id: 'js', icon: '🟨', label: 'JavaScript / TypeScript' },
  { id: 'react', icon: '⚛️', label: 'React' },
  { id: 'node', icon: '🟩', label: 'Node / APIs' },
  { id: 'db', icon: '🗄️', label: 'Databases' },
  { id: 'sql', icon: '🧾', label: 'SQL' },
  { id: 'mongo', icon: '🍃', label: 'MongoDB' },
  { id: 'leetcode', icon: '🧠', label: 'LeetCode' },
  { id: 'dsa', icon: '🧩', label: 'DSA' },
  { id: 'sysdesign', icon: '🏗️', label: 'System Design' },
  { id: 'git', icon: '🌿', label: 'Git / Collaboration' },
  { id: 'testing', icon: '✅', label: 'Testing' },
  { id: 'cloud-basic', icon: '☁️', label: 'Cloud Basics' },
  { id: 'python', icon: '🐍', label: 'Python' },
  { id: 'java-core', icon: '☕', label: 'Java / OOP' },
  { id: 'communication', icon: '🎤', label: 'Communication' },
  { id: 'portfolio', icon: '🧪', label: 'Portfolio Projects' }
];

const QUESTIONS = [
  'Which 1–2 paths look most realistic for getting interviews sooner?',
  'What should be deprioritized right now?',
  'Should the student market themselves as frontend, fullstack, backend, or AI-enabled builder?',
  'How much LeetCode is actually enough at this stage?',
  'What kind of project would impress hiring managers more than flashy extras?',
  'What common mistakes do students make when choosing their first serious path?'
];

const LANES = [
  { id: 'focus', title: 'Focus now', copy: 'Highest near-term value.' },
  { id: 'build', title: 'Build next', copy: 'Strong secondary priorities.' },
  { id: 'explore', title: 'Explore later', copy: 'Interesting, not urgent.' },
  { id: 'skip', title: 'Skip for now', copy: 'Low ROI right now.' }
];

const STORAGE_KEY = 'mentor-focus-board-v2';

const state = {
  category: 'All',
  search: '',
  board: {
    focus: [],
    build: [],
    explore: [],
    skip: []
  },
  context: {
    currentBuild: 'ShelfSafe',
    mainGoal: 'Choose the smartest software path and first priorities',
    strengths: 'Rapid prototyping, presentations, curiosity, UI/product thinking',
    needGuidance: 'Positioning, fundamentals, roadmap, what matters first'
  },
  mentorNotes: ''
};

let dragPayload = null;

const dom = {
  categoryTabs: document.getElementById('categoryTabs'),
  pathSearch: document.getElementById('pathSearch'),
  pathGrid: document.getElementById('pathGrid'),
  pathTemplate: document.getElementById('pathTemplate'),
  foundationTemplate: document.getElementById('foundationTemplate'),
  foundationTray: document.getElementById('foundationTray'),
  board: document.getElementById('board'),
  questionCards: document.getElementById('questionCards'),
  mentorNotes: document.getElementById('mentorNotes'),
  currentBuild: document.getElementById('currentBuild'),
  mainGoal: document.getElementById('mainGoal'),
  strengths: document.getElementById('strengths'),
  needGuidance: document.getElementById('needGuidance'),
  pathCount: document.getElementById('pathCount'),
  saveBtn: document.getElementById('saveBtn'),
  summaryBtn: document.getElementById('summaryBtn'),
  exportBtn: document.getElementById('exportBtn'),
  focusNowOutput: document.getElementById('focusNowOutput'),
  buildNextOutput: document.getElementById('buildNextOutput'),
  exploreLaterOutput: document.getElementById('exploreLaterOutput'),
  planOutput: document.getElementById('planOutput')
};

function init() {
  loadState();
  renderTabs();
  renderPaths();
  renderFoundations();
  renderBoard();
  renderQuestions();
  syncContextInputs();
  wireInputs();
  initThree();
}

function renderTabs() {
  const categories = ['All', ...new Set(PATHS.map(item => item.category))];
  dom.categoryTabs.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `tab ${state.category === cat ? 'active' : ''}`;
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      state.category = cat;
      renderTabs();
      renderPaths();
    });
    dom.categoryTabs.appendChild(btn);
  });
}

function filteredPaths() {
  return PATHS.filter(path => {
    const matchCategory = state.category === 'All' || path.category === state.category;
    const hay = `${path.title} ${path.summary} ${path.tags.join(' ')}`.toLowerCase();
    const matchSearch = hay.includes(state.search.toLowerCase());
    return matchCategory && matchSearch;
  });
}

function renderPaths() {
  dom.pathGrid.innerHTML = '';
  const items = filteredPaths();
  dom.pathCount.textContent = `${items.length} items`;

  items.forEach(path => {
    const node = dom.pathTemplate.content.cloneNode(true);
    const card = node.querySelector('.item-card');
    card.dataset.type = 'path';
    card.dataset.id = path.id;
    node.querySelector('.item-card__icon').textContent = path.icon;
    node.querySelector('.item-card__title').textContent = path.title;
    node.querySelector('.item-card__category').textContent = path.category;
    node.querySelector('.item-card__summary').textContent = path.summary;
    const tags = node.querySelector('.item-card__tags');
    path.tags.forEach(tag => {
      const el = document.createElement('span');
      el.textContent = tag;
      tags.appendChild(el);
    });

    card.addEventListener('dragstart', (e) => {
      dragPayload = { type: 'path', id: path.id, fromLane: null };
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dblclick', () => addItemToLane({ type: 'path', id: path.id }, 'focus'));
    dom.pathGrid.appendChild(node);
  });
}

function renderFoundations() {
  dom.foundationTray.innerHTML = '';
  FOUNDATIONS.forEach(skill => {
    const node = dom.foundationTemplate.content.cloneNode(true);
    const chip = node.querySelector('.foundation-chip');
    chip.dataset.type = 'foundation';
    chip.dataset.id = skill.id;
    node.querySelector('.foundation-chip__icon').textContent = skill.icon;
    node.querySelector('.foundation-chip__label').textContent = skill.label;
    chip.addEventListener('dragstart', (e) => {
      dragPayload = { type: 'foundation', id: skill.id, fromLane: null };
      e.dataTransfer.effectAllowed = 'move';
      chip.classList.add('dragging');
    });
    chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
    chip.addEventListener('dblclick', () => addItemToLane({ type: 'foundation', id: skill.id }, 'focus'));
    dom.foundationTray.appendChild(node);
  });
}

function renderBoard() {
  dom.board.innerHTML = '';
  LANES.forEach(lane => {
    const section = document.createElement('section');
    section.className = 'lane';
    section.dataset.lane = lane.id;
    section.innerHTML = `
      <div class="lane__head">
        <div>
          <h3>${lane.title}</h3>
          <div class="lane__copy">${lane.copy}</div>
        </div>
        <div class="lane__count">${state.board[lane.id].length}</div>
      </div>
      <div class="lane__dropzone" data-lane="${lane.id}"></div>
    `;

    const zone = section.querySelector('.lane__dropzone');
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      section.classList.add('is-over');
    });
    zone.addEventListener('dragleave', () => section.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      section.classList.remove('is-over');
      if (!dragPayload) return;
      addItemToLane(dragPayload, lane.id);
    });

    if (state.board[lane.id].length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lane__empty';
      empty.textContent = 'Drop items here';
      zone.appendChild(empty);
    } else {
      state.board[lane.id].forEach(item => zone.appendChild(renderBoardItem(item, lane.id)));
    }

    dom.board.appendChild(section);
  });
}

function renderBoardItem(item, laneId) {
  const el = document.createElement('article');
  el.className = 'board-item';
  el.draggable = true;
  el.dataset.type = item.type;
  el.dataset.id = item.id;

  const meta = lookupItem(item);
  el.innerHTML = `
    <div class="board-item__icon">${meta.icon}</div>
    <div>
      <p class="board-item__title">${meta.title}</p>
      <div class="board-item__meta">${item.type === 'path' ? 'Pathway' : 'Foundation'}</div>
    </div>
    <button class="board-item__remove" type="button" aria-label="Remove">✕</button>
  `;

  el.addEventListener('dragstart', (e) => {
    dragPayload = { type: item.type, id: item.id, fromLane: laneId };
    e.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));
  el.querySelector('.board-item__remove').addEventListener('click', () => removeFromBoard(item.type, item.id));
  return el;
}

function addItemToLane(payload, laneId) {
  removeFromBoard(payload.type, payload.id, false);
  if (!state.board[laneId].some(item => item.type === payload.type && item.id === payload.id)) {
    state.board[laneId].push({ type: payload.type, id: payload.id });
  }
  persist();
  renderBoard();
}

function removeFromBoard(type, id, rerender = true) {
  Object.keys(state.board).forEach(lane => {
    state.board[lane] = state.board[lane].filter(item => !(item.type === type && item.id === id));
  });
  persist();
  if (rerender) renderBoard();
}

function lookupItem(item) {
  if (item.type === 'path') {
    const path = PATHS.find(p => p.id === item.id);
    return { icon: path?.icon || '•', title: path?.title || item.id };
  }
  const foundation = FOUNDATIONS.find(f => f.id === item.id);
  return { icon: foundation?.icon || '•', title: foundation?.label || item.id };
}

function renderQuestions() {
  dom.questionCards.innerHTML = '';
  QUESTIONS.forEach(q => {
    const card = document.createElement('article');
    card.className = 'question-card';
    card.textContent = q;
    dom.questionCards.appendChild(card);
  });
}

function syncContextInputs() {
  dom.currentBuild.value = state.context.currentBuild || '';
  dom.mainGoal.value = state.context.mainGoal || '';
  dom.strengths.value = state.context.strengths || '';
  dom.needGuidance.value = state.context.needGuidance || '';
  dom.mentorNotes.value = state.mentorNotes || '';
}

function wireInputs() {
  dom.pathSearch.addEventListener('input', (e) => {
    state.search = e.target.value;
    renderPaths();
  });

  ['currentBuild', 'mainGoal', 'strengths', 'needGuidance'].forEach(key => {
    dom[key].addEventListener('input', (e) => {
      state.context[key] = e.target.value;
      persist();
    });
  });

  dom.mentorNotes.addEventListener('input', (e) => {
    state.mentorNotes = e.target.value;
    persist();
  });

  dom.saveBtn.addEventListener('click', () => {
    persist();
    pulseButton(dom.saveBtn, 'Saved');
  });

  dom.summaryBtn.addEventListener('click', generateSummary);
  dom.exportBtn.addEventListener('click', exportBoard);
}

function laneTitles(laneId) {
  return state.board[laneId].map(item => lookupItem(item).title);
}

function generateSummary() {
  const focus = laneTitles('focus');
  const build = laneTitles('build');
  const explore = laneTitles('explore');
  const skip = laneTitles('skip');

  dom.focusNowOutput.classList.remove('empty');
  dom.buildNextOutput.classList.remove('empty');
  dom.exploreLaterOutput.classList.remove('empty');
  dom.planOutput.classList.remove('empty');

  dom.focusNowOutput.innerHTML = listOrEmpty(focus, 'No items chosen yet.');
  dom.buildNextOutput.innerHTML = listOrEmpty(build, 'Nothing here yet.');
  dom.exploreLaterOutput.innerHTML = listOrEmpty(explore, 'Nothing here yet.');

  const plan = [];
  if (focus.length) plan.push(`Lead with ${focus.slice(0, 3).join(', ')}.`);
  if (build.length) plan.push(`Use ${build.slice(0, 3).join(', ')} as the next layer after the primary focus is stable.`);
  if (skip.length) plan.push(`Deprioritize ${skip.slice(0, 4).join(', ')} for now to reduce noise.`);
  if (state.context.strengths) plan.push(`Lean on strengths: ${state.context.strengths}.`);
  if (state.context.needGuidance) plan.push(`Clarify open gaps around: ${state.context.needGuidance}.`);
  if (state.mentorNotes.trim()) plan.push(`Mentor note highlight: ${truncate(state.mentorNotes.trim(), 180)}.`);

  dom.planOutput.innerHTML = listOrEmpty(plan, 'Create some priorities first.');
  persist();
}

function listOrEmpty(items, emptyText) {
  if (!items.length) return emptyText;
  return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function exportBoard() {
  const payload = {
    exportedAt: new Date().toISOString(),
    context: state.context,
    mentorNotes: state.mentorNotes,
    board: Object.fromEntries(
      Object.entries(state.board).map(([lane, items]) => [lane, items.map(item => ({ ...item, title: lookupItem(item).title }))])
    )
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mentor-focus-board-export.json';
  link.click();
  URL.revokeObjectURL(url);
  pulseButton(dom.exportBtn, 'Exported');
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
  } catch (err) {
    console.warn('Could not load saved state', err);
  }
}

function pulseButton(btn, label) {
  const old = btn.textContent;
  btn.textContent = label;
  setTimeout(() => btn.textContent = old, 1200);
}

function truncate(text, limit) {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initThree() {
  if (!window.THREE) return;
  const canvas = document.getElementById('bg-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 16;

  const group = new THREE.Group();
  scene.add(group);

  const geometry = new THREE.BufferGeometry();
  const count = 900;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 28;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    scales[i] = Math.random();
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  const material = new THREE.PointsMaterial({
    color: 0x6adfff,
    size: 0.06,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const stars = new THREE.Points(geometry, material);
  group.add(stars);

  const orbGeo = new THREE.TorusKnotGeometry(2.7, 0.18, 110, 18);
  const orbMat = new THREE.MeshBasicMaterial({ color: 0xa694ff, wireframe: true, transparent: true, opacity: 0.18 });
  const orb = new THREE.Mesh(orbGeo, orbMat);
  group.add(orb);

  let mouseX = 0;
  let mouseY = 0;

  window.addEventListener('pointermove', (event) => {
    mouseX = (event.clientX / window.innerWidth - 0.5) * 1.6;
    mouseY = (event.clientY / window.innerHeight - 0.5) * 1.6;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  function tick() {
    const elapsed = clock.getElapsedTime();
    group.rotation.y += 0.0009;
    group.rotation.x = mouseY * 0.12;
    group.rotation.y += mouseX * 0.0015;
    orb.rotation.x = elapsed * 0.14;
    orb.rotation.y = elapsed * 0.2;
    stars.rotation.y = elapsed * 0.02;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

init();
