/* ═══════════════════════════════════════════════════
   WORLD AI 360 — script.js
   Claude AI-powered global travel explorer
   Features: Photo gallery, location-aware, tabs, fast
   ═══════════════════════════════════════════════════ */
'use strict';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Uses Claude API via Anthropic endpoint
// Replace with your API key — the app will use Claude for fast responses
const ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

// Photo sources using Unsplash search API (free, no key needed for source)
const PHOTO_BASE = 'https://source.unsplash.com/800x600/?';
const PHOTO_THUMB = 'https://source.unsplash.com/200x150/?';

// Photo seeds for deterministic variety (Picsum fallback)
const PICSUM = 'https://picsum.photos/seed/';

// ─── CURRENCIES ───────────────────────────────────────────────────────────────
const CURRENCIES = {
  USD:{symbol:'$',  name:'US Dollar',         flag:'🇺🇸',rate:1},
  EUR:{symbol:'€',  name:'Euro',               flag:'🇪🇺',rate:0.92},
  GBP:{symbol:'£',  name:'British Pound',      flag:'🇬🇧',rate:0.79},
  INR:{symbol:'₹',  name:'Indian Rupee',       flag:'🇮🇳',rate:83.5},
  JPY:{symbol:'¥',  name:'Japanese Yen',       flag:'🇯🇵',rate:149.5},
  AED:{symbol:'د.إ',name:'UAE Dirham',         flag:'🇦🇪',rate:3.67},
  SGD:{symbol:'S$', name:'Singapore Dollar',   flag:'🇸🇬',rate:1.34},
  AUD:{symbol:'A$', name:'Australian Dollar',  flag:'🇦🇺',rate:1.53},
  CAD:{symbol:'C$', name:'Canadian Dollar',    flag:'🇨🇦',rate:1.36},
  CHF:{symbol:'Fr', name:'Swiss Franc',        flag:'🇨🇭',rate:0.90},
  BRL:{symbol:'R$', name:'Brazilian Real',     flag:'🇧🇷',rate:4.97},
  MXN:{symbol:'MX$',name:'Mexican Peso',       flag:'🇲🇽',rate:17.15},
  THB:{symbol:'฿',  name:'Thai Baht',          flag:'🇹🇭',rate:35.1},
  IDR:{symbol:'Rp', name:'Indonesian Rupiah',  flag:'🇮🇩',rate:15650},
  KRW:{symbol:'₩',  name:'South Korean Won',   flag:'🇰🇷',rate:1335},
  CNY:{symbol:'¥',  name:'Chinese Yuan',       flag:'🇨🇳',rate:7.24},
  SAR:{symbol:'﷼',  name:'Saudi Riyal',        flag:'🇸🇦',rate:3.75},
  ZAR:{symbol:'R',  name:'South African Rand', flag:'🇿🇦',rate:18.6},
  TRY:{symbol:'₺',  name:'Turkish Lira',       flag:'🇹🇷',rate:32.1},
  NGN:{symbol:'₦',  name:'Nigerian Naira',     flag:'🇳🇬',rate:1580},
  EGP:{symbol:'E£', name:'Egyptian Pound',     flag:'🇪🇬',rate:30.9},
  NPR:{symbol:'₨',  name:'Nepali Rupee',       flag:'🇳🇵',rate:133.5},
  PKR:{symbol:'₨',  name:'Pakistani Rupee',    flag:'🇵🇰',rate:278},
  BDT:{symbol:'৳',  name:'Bangladeshi Taka',   flag:'🇧🇩',rate:110},
  LKR:{symbol:'₨',  name:'Sri Lankan Rupee',   flag:'🇱🇰',rate:305},
};

// ─── STATE ────────────────────────────────────────────────────────────────────
let selectedTripType = 'Backpacker';
let selectedBudget   = 'Budget ($)';
let selectedCurrency = 'USD';
let isLoading        = false;
let lastData         = null;
let userLocation     = null;
let allPhotos        = [];
let galleryIndex     = 0;

// ─── TRENDING ─────────────────────────────────────────────────────────────────
const TRENDING = [
  {name:'Bali, Indonesia',    region:'Southeast Asia', emoji:'🌴',tag:'Trending #1',query:'Complete travel guide Bali Indonesia'},
  {name:'Kyoto, Japan',       region:'East Asia',      emoji:'⛩️',tag:'Trending #2',query:'Complete travel guide Kyoto Japan'},
  {name:'Santorini, Greece',  region:'Mediterranean',  emoji:'🇬🇷',tag:'Trending #3',query:'Complete travel guide Santorini Greece'},
  {name:'Marrakech, Morocco', region:'North Africa',   emoji:'🕌',tag:'Trending #4',query:'Complete travel guide Marrakech Morocco'},
  {name:'Patagonia',          region:'South America',  emoji:'🏔️',tag:'Rising Fast',query:'Complete travel guide Patagonia Argentina'},
  {name:'Amalfi Coast',       region:'Mediterranean',  emoji:'🤌',tag:'Must Visit', query:'Complete travel guide Amalfi Coast Italy'},
  {name:'Queenstown, NZ',     region:'Oceania',        emoji:'🏕️',tag:'Adventure',  query:'Complete travel guide Queenstown New Zealand'},
  {name:'Iceland',            region:'North Europe',   emoji:'🌋',tag:'Unique',     query:'Complete travel guide Iceland'},
];

// ─── PHOTO LABEL LISTS per destination (generated from name) ──────────────────
function getPhotoKeywords(data) {
  const dest = data.destination || 'travel';
  const country = data.country || '';
  const terms = [
    dest, `${dest} landmarks`, `${dest} old town`, `${dest} skyline`,
    `${dest} street market`, `${dest} temple`, `${dest} beach`,
    `${dest} food market`, `${dest} architecture`, `${dest} nature`,
    `${dest} waterfall`, `${dest} mountains`, `${dest} sunset`,
    `${dest} local life`, `${dest} night life`, `${dest} cafe`,
    `${dest} festival`, `${dest} hiking`, `${dest} river`,
    `${dest} palace`, `${dest} museum`, `${dest} gardens`,
    country + ' countryside', country + ' village', country + ' coast',
    country + ' food', country + ' culture', country + ' tradition',
    `${dest} aerial view`, `${dest} street food`, `${dest} bazaar`,
    ...(data.photoKeywords || [])
  ];
  return terms;
}

function buildPhotoUrls(data, count = 70) {
  const keywords = getPhotoKeywords(data);
  const photos = [];
  for (let i = 0; i < count; i++) {
    const kw = keywords[i % keywords.length];
    const seed = `${data.destination}-${i}`;
    photos.push({
      url: `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/600`,
      thumb: `https://picsum.photos/seed/${encodeURIComponent(seed)}/200/150`,
      caption: kw.replace(data.destination + ' ', '').replace(data.destination, '').trim() || kw,
    });
  }
  return photos;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initCursor();
  initHeader();
  initSearch();
  initOptionPills();
  initQuickPills();
  renderTrending();
  initCurrency();
  detectLocation();
  initTabs();
});

// ─── LOADER ───────────────────────────────────────────────────────────────────
function initLoader() {
  setTimeout(() => document.getElementById('loader').classList.add('hidden'), 2000);
}

// ─── CURSOR ───────────────────────────────────────────────────────────────────
function initCursor() {
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx+'px'; dot.style.top = my+'px';
  });
  (function animate(){
    rx += (mx-rx)*0.12; ry += (my-ry)*0.12;
    ring.style.left = rx+'px'; ring.style.top = ry+'px';
    requestAnimationFrame(animate);
  })();
  document.querySelectorAll('a,button,.q-pill,.f-pill,.t-card,.similar-card,.pm-photo').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('c-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('c-hover'));
  });
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function initHeader() {
  const h = document.getElementById('header');
  window.addEventListener('scroll', () => h.classList.toggle('scrolled', scrollY > 60));
}

// ─── LOCATION DETECTION ──────────────────────────────────────────────────────
async function detectLocation() {
  const val = document.getElementById('locationVal');
  try {
    const r = await fetch('https://ipapi.co/json/');
    const d = await r.json();
    if (d.city && d.country_name) {
      userLocation = { city: d.city, country: d.country_name, countryCode: d.country_code, currency: d.currency };
      val.textContent = `${d.city}, ${d.country_name}`;
      // Auto-set currency if available
      if (d.currency && CURRENCIES[d.currency]) {
        selectedCurrency = d.currency;
        updateCurrencyBadge();
        const sel = document.getElementById('currencySelect');
        if (sel) sel.value = d.currency;
      }
    } else {
      val.textContent = 'Unknown Location';
    }
  } catch {
    val.textContent = 'Location unavailable';
  }
}

// ─── CURRENCY ─────────────────────────────────────────────────────────────────
function initCurrency() {
  const sel = document.getElementById('currencySelect');
  if (!sel) return;
  Object.entries(CURRENCIES).forEach(([code, c]) => {
    const o = document.createElement('option');
    o.value = code;
    o.textContent = `${c.flag} ${code} — ${c.name}`;
    if (code === 'USD') o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    selectedCurrency = sel.value;
    updateCurrencyBadge();
    if (lastData) {
      renderBudget(lastData.budgetBreakdown);
      renderInfoCards(lastData.quickInfo);
    }
    document.getElementById('currencyDropdown').classList.remove('open');
  });
}
function updateCurrencyBadge() {
  const c = CURRENCIES[selectedCurrency];
  const badge = document.getElementById('currencyBadge');
  if (badge) badge.textContent = `${c.flag} ${selectedCurrency}`;
}
function toggleCurrencyDropdown() {
  document.getElementById('currencyDropdown').classList.toggle('open');
}
document.addEventListener('click', e => {
  const wrap = document.querySelector('.currency-wrap');
  if (wrap && !wrap.contains(e.target)) document.getElementById('currencyDropdown')?.classList.remove('open');
});

function convertPrice(str) {
  if (!str || typeof str !== 'string') return str;
  const c = CURRENCIES[selectedCurrency];
  return str.replace(/\$[\d,]+(\+)?/g, m => {
    const isPlus = m.endsWith('+');
    const n = parseFloat(m.replace(/[$,+]/g,''));
    const cv = Math.round(n * c.rate);
    const fmt = cv >= 10000 ? (cv/1000).toFixed(0)+'K' : cv >= 1000 ? cv.toLocaleString() : cv.toString();
    return c.symbol + fmt + (isPlus ? '+' : '');
  });
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
function initSearch() {
  const inp = document.getElementById('searchInput');
  const clr = document.getElementById('searchClear');
  inp.addEventListener('input', () => clr.classList.toggle('visible', inp.value.length > 0));
  inp.addEventListener('keydown', e => { if (e.key==='Enter' && !isLoading) handleSearch(); });
}
function clearSearch() {
  const i = document.getElementById('searchInput');
  i.value=''; document.getElementById('searchClear').classList.remove('visible'); i.focus();
}
function scrollToSearch() {
  document.getElementById('explore').scrollIntoView({behavior:'smooth'});
  setTimeout(()=>document.getElementById('searchInput').focus(), 500);
}
function resetSearch() {
  clearSearch();
  lastData = null; allPhotos = [];
  ['resultContent','resultError','resultLoading'].forEach(id => {
    document.getElementById(id).style.display='none';
  });
}

// ─── OPTION PILLS ─────────────────────────────────────────────────────────────
function initOptionPills() {
  document.querySelectorAll('.f-pill').forEach(p => {
    p.addEventListener('click', () => {
      const t = p.dataset.type;
      document.querySelectorAll(`.f-pill[data-type="${t}"]`).forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      if (t==='trip')   selectedTripType = p.textContent.replace(/^[^\w]+/,'').trim();
      if (t==='budget') selectedBudget   = p.textContent.replace(/^[^\w]+/,'').trim();
    });
  });
}

// ─── QUICK PILLS ──────────────────────────────────────────────────────────────
function initQuickPills() {
  document.querySelectorAll('.q-pill').forEach(p => {
    p.addEventListener('click', () => {
      const inp = document.getElementById('searchInput');
      inp.value = p.dataset.query;
      document.getElementById('searchClear').classList.add('visible');
      scrollToSearch();
      setTimeout(() => handleSearch(), 450);
    });
  });
}

// ─── TRENDING ─────────────────────────────────────────────────────────────────
function renderTrending() {
  const g = document.getElementById('trendingGrid');
  if (!g) return;
  g.innerHTML = TRENDING.map((d,i) => `
    <div class="t-card" onclick="searchFromCard('${esc(d.query)}')">
      <div class="t-img-wrap">
        <div class="t-num">${i+1}</div>
        <div class="t-img-placeholder">${d.emoji}</div>
      </div>
      <div class="t-body">
        <div class="t-badge">${d.tag}</div>
        <div class="t-name">${d.name}</div>
        <div class="t-region">${d.region}</div>
      </div>
    </div>
  `).join('');
}
function searchFromCard(q) {
  const inp = document.getElementById('searchInput');
  inp.value = q;
  document.getElementById('searchClear').classList.add('visible');
  document.getElementById('explore').scrollIntoView({behavior:'smooth'});
  setTimeout(() => handleSearch(), 650);
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab===tabId));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id===`tab-${tabId}`));
}

// ─── MAIN SEARCH ──────────────────────────────────────────────────────────────
async function handleSearch() {
  const inp = document.getElementById('searchInput');
  const query = inp.value.trim();
  if (!query || isLoading) { if (!query) inp.focus(); return; }

  showLoading();
  animateLoadingSteps();

  const locationCtx = userLocation
    ? `User is traveling from ${userLocation.city}, ${userLocation.country} (${userLocation.countryCode}). Tailor flight costs, visa info, and tips accordingly.`
    : 'User location unknown.';

  const prompt = buildPrompt(query, selectedTripType, selectedBudget, locationCtx);

  try {
    const text = await callClaude(prompt);
    const data = parseJSON(text);
    lastData = data;
    allPhotos = buildPhotoUrls(data, 70);
    renderResult(data);
  } catch(err) {
    showError(err.message || 'Unknown error');
    console.error('Error:', err);
  }
}

// ─── CLAUDE API ───────────────────────────────────────────────────────────────
async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({}));
    throw new Error(e?.error?.message || `HTTP ${res.status}`);
  }
  const d = await res.json();
  const text = d?.content?.[0]?.text;
  if (!text) throw new Error('No response from Claude.');
  return text;
}

// ─── PROMPT ───────────────────────────────────────────────────────────────────
function buildPrompt(query, tripType, budget, locationCtx) {
  return `You are World AI 360 — elite travel intelligence system. Respond ONLY with valid JSON (no markdown, no backticks).

User query: "${query}"
Trip type: ${tripType} | Budget preference: ${budget}
${locationCtx}

ALL monetary values MUST be in USD using $ symbol. App auto-converts.

Respond with this exact JSON structure:

{
  "destination": "Full City/Destination Name",
  "country": "Country Name",
  "region": "Continent or Region",
  "tagline": "Vivid one-line poetic description",
  "flag": "🌍",
  "photoKeywords": ["specific landmark name","famous attraction","local market name","unique site","iconic viewpoint","famous food street"],
  "quickInfo": [
    {"icon":"🌡️","label":"Best Season","value":"Oct–Apr","sub":"Warm & dry"},
    {"icon":"💰","label":"Daily Budget","value":"$40–$80","sub":"Mid-range"},
    {"icon":"✈️","label":"Avg Flight","value":"$800–$1200","sub":"Round trip"},
    {"icon":"🛂","label":"Visa","value":"Visa on Arrival","sub":"30 days free"},
    {"icon":"🗣️","label":"Language","value":"Local/English","sub":"English common"},
    {"icon":"⏱️","label":"Ideal Stay","value":"7–14 days","sub":"Recommended"},
    {"icon":"🌐","label":"Time Zone","value":"UTC+5:30","sub":"IST"},
    {"icon":"💊","label":"Health","value":"Standard vaccines","sub":"No special req"}
  ],
  "seasons": [
    {"name":"Winter","months":"Dec – Feb","desc":"Specific weather details, crowds, events","best":false,"emoji":"❄️"},
    {"name":"Spring","months":"Mar – May","desc":"Specific weather, blooms, festivals","best":true,"emoji":"🌸"},
    {"name":"Summer","months":"Jun – Aug","desc":"Temperature, rain, crowd level","best":false,"emoji":"☀️"},
    {"name":"Autumn","months":"Sep – Nov","desc":"Weather and why to visit or avoid","best":false,"emoji":"🍂"}
  ],
  "monthCalendar": [
    {"month":"Jan","emoji":"❄️","level":"off","label":"Low"},
    {"month":"Feb","emoji":"🌤️","level":"shoulder","label":"OK"},
    {"month":"Mar","emoji":"🌸","level":"peak","label":"Best"},
    {"month":"Apr","emoji":"🌸","level":"peak","label":"Best"},
    {"month":"May","emoji":"☀️","level":"shoulder","label":"Good"},
    {"month":"Jun","emoji":"🌧️","level":"off","label":"Rain"},
    {"month":"Jul","emoji":"🌧️","level":"off","label":"Rain"},
    {"month":"Aug","emoji":"🌧️","level":"off","label":"Rain"},
    {"month":"Sep","emoji":"🌤️","level":"shoulder","label":"OK"},
    {"month":"Oct","emoji":"🌟","level":"peak","label":"Best"},
    {"month":"Nov","emoji":"🌟","level":"peak","label":"Best"},
    {"month":"Dec","emoji":"❄️","level":"shoulder","label":"Good"}
  ],
  "aiResponse": "Detailed 700-900 word markdown travel guide with sections: ### Overview\\n\\n### Top Attractions\\n\\n### Getting There & Around\\n\\n### Local Food & Culture\\n\\n### Hidden Gems\\n\\n### Day-by-Day Sample Itinerary\\n\\n### Practical Tips. Use **bold** for key info and *emphasis* for places.",
  "budgetBreakdown": [
    {"tier":"Budget","pricePerDay":"$25–$45","featured":false,"items":[{"label":"Accommodation","value":"$8–$15"},{"label":"Food","value":"$6–$10"},{"label":"Transport","value":"$3–$8"},{"label":"Activities","value":"$5–$12"}]},
    {"tier":"Mid-Range","pricePerDay":"$60–$120","featured":true,"items":[{"label":"Accommodation","value":"$30–$60"},{"label":"Food","value":"$15–$25"},{"label":"Transport","value":"$8–$15"},{"label":"Activities","value":"$10–$20"}]},
    {"tier":"Luxury","pricePerDay":"$200–$500+","featured":false,"items":[{"label":"Accommodation","value":"$100–$300"},{"label":"Food","value":"$40–$80"},{"label":"Transport","value":"$30–$60"},{"label":"Activities","value":"$30–$60"}]}
  ],
  "costIndex": [
    {"label":"Accommodation","usdPerNight":35,"max":300},
    {"label":"Meal (budget)","usdPerMeal":5,"max":80},
    {"label":"Local transport","usdPerDay":3,"max":50},
    {"label":"Entry fees","usdPerDay":8,"max":60}
  ],
  "tips": [
    "Specific tip 1 with actionable detail",
    "Specific tip 2 with timing or cost info",
    "Specific tip 3 about local customs",
    "Specific tip 4 about safety or health",
    "Specific tip 5 about food or culture",
    "Specific tip 6 about transportation",
    "Specific tip 7 about accommodation booking",
    "Specific tip 8 about photography spots"
  ],
  "related": [
    {"name":"Destination 1","country":"Country","desc":"Why travelers love it","emoji":"🌏","query":"complete travel guide destination 1 country"},
    {"name":"Destination 2","country":"Country","desc":"What makes it unique","emoji":"🏝️","query":"complete travel guide destination 2 country"},
    {"name":"Destination 3","country":"Country","desc":"Best reason to visit","emoji":"🗺️","query":"complete travel guide destination 3 country"}
  ]
}

Tailor everything to ${budget} budget and ${tripType} travel style. All prices realistic USD. Be specific and accurate.`;
}

// ─── PARSE JSON ───────────────────────────────────────────────────────────────
function parseJSON(text) {
  const clean = text.trim()
    .replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'');
  return JSON.parse(clean);
}

// ─── RENDER RESULT ────────────────────────────────────────────────────────────
function renderResult(data) {
  // Destination hero
  renderDestHero(data);

  // All tabs
  renderInfoCards(data.quickInfo);
  renderMapPlaceholder(data.destination);
  renderSeasons(data);
  renderBudget(data.budgetBreakdown);
  renderCostCompare(data.costIndex);
  document.getElementById('aiBody').innerHTML = mdToHtml(data.aiResponse || '');
  renderPhotosMasonry();
  renderTips(data.tips);
  renderSimilar(data.related);

  showResult();
  switchTab('overview');
  setTimeout(() => {
    document.getElementById('resultContent').scrollIntoView({behavior:'smooth',block:'start'});
  }, 200);
}

function renderDestHero(data) {
  // 5-photo grid
  const grid = document.getElementById('destPhotosGrid');
  const photos5 = allPhotos.slice(0,5);
  grid.innerHTML = photos5.map((p,i) =>
    `<img class="ph-img" src="${p.url}" alt="${p.caption}" loading="${i>0?'lazy':'eager'}" onclick="openGallery(${i})" onerror="this.src='https://picsum.photos/seed/${data.destination}-${i}-fallback/800/600'">`
  ).join('');

  document.getElementById('destRegionBadge').textContent = `${data.flag || '🌍'} ${data.region}`;
  document.getElementById('destName').textContent = data.destination;
  document.getElementById('destTagline').textContent = data.tagline;

  // Meta row
  const flightInfo = data.quickInfo?.find(q=>q.label==='Avg Flight') || {};
  const seasonInfo = data.quickInfo?.find(q=>q.label==='Best Season') || {};
  const visaInfo   = data.quickInfo?.find(q=>q.label==='Visa') || {};
  const meta = [
    {icon:'🌐', label: data.country},
    {icon:'✈️', label: flightInfo.value ? convertPrice(flightInfo.value) : ''},
    {icon:'📅', label: seasonInfo.value || ''},
    {icon:'🛂', label: visaInfo.value || ''},
  ].filter(m=>m.label);
  document.getElementById('destMetaRow').innerHTML = meta.map(m =>
    `<div class="dm-item">${m.icon} <span>${m.label}</span></div>`
  ).join('');
  document.getElementById('glTitle').textContent = `${data.destination} — Photo Gallery`;
}

function renderInfoCards(quickInfo) {
  const grid = document.getElementById('infoGrid');
  grid.innerHTML = (quickInfo||[]).map((item,i) => {
    const isMonetary = item.label==='Daily Budget'||item.label==='Avg Flight';
    const val = isMonetary ? convertPrice(item.value) : item.value;
    return `<div class="info-card" style="animation-delay:${i*0.05}s">
      <div class="ic-icon">${item.icon}</div>
      <div class="ic-label">${item.label}</div>
      <div class="ic-value">${val}</div>
      <div class="ic-sub">${item.sub}</div>
    </div>`;
  }).join('');
}

function renderMapPlaceholder(destName) {
  document.getElementById('mapDestName').textContent = destName;
}

function renderSeasons(data) {
  // Season cards
  const sg = document.getElementById('seasonGrid');
  sg.innerHTML = (data.seasons||[]).map((s,i) =>
    `<div class="season-card${s.best?' best':''}" style="animation-delay:${i*0.07}s">
      <div class="sc-name">${s.emoji||''} ${s.name}</div>
      <div class="sc-months">${s.months}</div>
      <div class="sc-desc">${s.desc}</div>
      ${s.best?'<div class="sc-badge">⭐ Best Time</div>':''}
    </div>`
  ).join('');

  // Month calendar
  const mc = document.getElementById('monthCalendar');
  mc.innerHTML = (data.monthCalendar||[]).map(m =>
    `<div class="mc-month ${m.level}">
      <div class="mc-name">${m.month}</div>
      <div class="mc-icon">${m.emoji}</div>
      <div class="mc-label">${m.label}</div>
    </div>`
  ).join('');
}

function renderBudget(breakdown) {
  const c = CURRENCIES[selectedCurrency];
  const note = document.getElementById('currencyNote');
  note.innerHTML = `💱 Showing prices in <strong>${c.flag} ${selectedCurrency} (${c.name})</strong> — Rates are approximate and for planning purposes.`;

  const bg = document.getElementById('budgetGrid');
  bg.innerHTML = (breakdown||[]).map((b,i) =>
    `<div class="budget-card${b.featured?' featured':''}" style="animation-delay:${i*0.08}s">
      <div class="b-tier">${b.tier}</div>
      <div class="b-price">${convertPrice(b.pricePerDay)}</div>
      <div class="b-per">per person / day · ${c.flag} ${selectedCurrency}</div>
      ${(b.items||[]).map(it=>`<div class="b-item"><span>${it.label}</span><strong>${convertPrice(it.value)}</strong></div>`).join('')}
    </div>`
  ).join('');
}

function renderCostCompare(costIndex) {
  const cc = document.getElementById('costCompare');
  if (!costIndex || !costIndex.length) { cc.style.display='none'; return; }
  cc.style.display='block';
  const c = CURRENCIES[selectedCurrency];
  cc.innerHTML = `<h4>Cost Breakdown at a Glance</h4>` +
    costIndex.map(item => {
      const val = Math.round(item.usdPerNight || item.usdPerMeal || item.usdPerDay || 10);
      const maxVal = Math.round(item.max || 100);
      const pct = Math.min(100, Math.round((val/maxVal)*100));
      const cvVal = Math.round(val * c.rate);
      const cvMax = Math.round(maxVal * c.rate);
      const fmt = n => n>=10000?(n/1000).toFixed(0)+'K':n>=1000?n.toLocaleString():n.toString();
      return `<div class="cc-bar-wrap">
        <div class="cc-bar-label"><span>${item.label}</span><span>${c.symbol}${fmt(cvVal)} — ${c.symbol}${fmt(cvMax)}</span></div>
        <div class="cc-bar-track"><div class="cc-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
}

function renderPhotosMasonry() {
  const container = document.getElementById('photosMasonry');
  container.innerHTML = allPhotos.map((p,i) =>
    `<div class="pm-photo" onclick="openGallery(${i})">
      <img src="${p.url}" alt="${p.caption}" loading="lazy" onerror="this.src='https://picsum.photos/seed/photo-${i}/800/600'"/>
      <div class="pm-photo-cap">${p.caption}</div>
    </div>`
  ).join('');
}

function renderTips(tips) {
  const g = document.getElementById('tipsGrid');
  g.innerHTML = (tips||[]).map((t,i) =>
    `<div class="tip-card" style="animation-delay:${i*0.05}s">
      <div class="tip-num">${String(i+1).padStart(2,'0')}</div>
      <div class="tip-text">${t}</div>
    </div>`
  ).join('');
}

function renderSimilar(related) {
  const g = document.getElementById('similarGrid');
  g.innerHTML = (related||[]).map((r,i) =>
    `<div class="similar-card" style="animation-delay:${i*0.07}s" onclick="searchFromCard('${esc(r.query)}')">
      <div class="sim-emoji">${r.emoji}</div>
      <div class="sim-name">${r.name}</div>
      <div class="sim-country">${r.country}</div>
      <div class="sim-desc">${r.desc}</div>
    </div>`
  ).join('');
}

// ─── GALLERY LIGHTBOX ─────────────────────────────────────────────────────────
function openGallery(startIndex = 0) {
  galleryIndex = startIndex;
  renderGalleryThumbs();
  updateGalleryView();
  document.getElementById('galleryLightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeGallery() {
  document.getElementById('galleryLightbox').classList.remove('open');
  document.body.style.overflow = '';
}
function galleryPrev() {
  galleryIndex = (galleryIndex - 1 + allPhotos.length) % allPhotos.length;
  updateGalleryView();
}
function galleryNext() {
  galleryIndex = (galleryIndex + 1) % allPhotos.length;
  updateGalleryView();
}
function updateGalleryView() {
  if (!allPhotos.length) return;
  const p = allPhotos[galleryIndex];
  const img = document.getElementById('glImg');
  img.src = p.url;
  img.alt = p.caption;
  document.getElementById('glCaption').textContent = p.caption;
  document.getElementById('glCounter').textContent = `${galleryIndex+1} / ${allPhotos.length}`;
  document.querySelectorAll('.gl-thumb').forEach((t,i) => t.classList.toggle('active', i===galleryIndex));
  // Scroll active thumb into view
  const activeThumb = document.querySelector('.gl-thumb.active');
  if (activeThumb) activeThumb.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
}
function renderGalleryThumbs() {
  const g = document.getElementById('glThumbs');
  g.innerHTML = allPhotos.map((p,i) =>
    `<div class="gl-thumb${i===galleryIndex?' active':''}" onclick="galleryJump(${i})">
      <img src="${p.thumb}" alt="${p.caption}" loading="lazy" onerror="this.src='https://picsum.photos/seed/thumb-${i}/200/150'"/>
    </div>`
  ).join('');
}
function galleryJump(i) {
  galleryIndex = i;
  updateGalleryView();
}
// Keyboard nav
document.addEventListener('keydown', e => {
  if (!document.getElementById('galleryLightbox').classList.contains('open')) return;
  if (e.key==='ArrowLeft') galleryPrev();
  if (e.key==='ArrowRight') galleryNext();
  if (e.key==='Escape') closeGallery();
});

// ─── MARKDOWN → HTML ──────────────────────────────────────────────────────────
function mdToHtml(md) {
  if (!md) return '';
  return md
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^- (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`)
    .replace(/\n\n/g,'</p><p>')
    .replace(/^(?!<[hup])(.+)$/gm,'<p>$1</p>')
    .replace(/<p><\/p>/g,'');
}

// ─── UI STATE ─────────────────────────────────────────────────────────────────
let loadingStepIndex = 0;
function animateLoadingSteps() {
  const steps = document.querySelectorAll('.ls');
  loadingStepIndex = 0;
  steps.forEach((s,i) => { s.classList.remove('active','done'); if(i===0)s.classList.add('active'); });
  const interval = setInterval(() => {
    loadingStepIndex++;
    if (loadingStepIndex >= steps.length) { clearInterval(interval); return; }
    steps[loadingStepIndex-1].classList.remove('active');
    steps[loadingStepIndex-1].classList.add('done');
    steps[loadingStepIndex].classList.add('active');
  }, 900);
}

function showLoading() {
  isLoading = true;
  const btn = document.getElementById('searchBtn');
  btn.disabled = true;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Exploring...</span>`;
  document.getElementById('resultContent').style.display='none';
  document.getElementById('resultError').style.display='none';
  document.getElementById('resultLoading').style.display='flex';
}
function showResult() {
  isLoading = false;
  resetBtn();
  document.getElementById('resultLoading').style.display='none';
  document.getElementById('resultError').style.display='none';
  document.getElementById('resultContent').style.display='block';
}
function showError(msg) {
  isLoading = false;
  resetBtn();
  document.getElementById('resultLoading').style.display='none';
  document.getElementById('resultContent').style.display='none';
  document.getElementById('errorMessage').textContent = msg;
  document.getElementById('resultError').style.display='block';
}
function resetBtn() {
  const btn = document.getElementById('searchBtn');
  btn.disabled=false;
  btn.innerHTML=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>Explore</span>`;
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function esc(s){ return (s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }

// ─── SCROLL ANIMATIONS ───────────────────────────────────────────────────────
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity='1';
      e.target.style.transform='translateY(0)';
      io.unobserve(e.target);
    }
  });
}, {threshold:0.1});

window.addEventListener('load', () => {
  ['.feat-card','.t-card','.section-header'].forEach(sel => {
    document.querySelectorAll(sel).forEach((el,i) => {
      el.style.opacity='0';
      el.style.transform='translateY(28px)';
      el.style.transition=`opacity 0.6s ${i*0.08}s ease, transform 0.6s ${i*0.08}s ease`;
      io.observe(el);
    });
  });
});
