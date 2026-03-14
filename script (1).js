/* =============================================
   PICKAFLIX — script.js
   ============================================= */

const SUPABASE_URL = 'https://wuozvmsjxlitdnjmbaxv.supabase.co';
const SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1b3p2bXNqeGxpdGRuam1iYXh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTU1NTcsImV4cCI6MjA4ODc3MTU1N30.LEstq7e0d-_RXL7zRClycc9UShanp1uR16EVVSKH_w4';
const TMDB_KEY     = '5ce7e04ed7ea720c4e8c8f11b637e9ec';  // publishable key

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p/w500';
const MAX_RECS  = 8;

const { createClient } = supabase;

const SUPABASE_READY = SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY';
const sb = SUPABASE_READY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

function fakeChain() {
  const p = Promise.resolve({data:[], error:null, count:0});
  const c = { select:()=>c, insert:()=>c, delete:()=>c, update:()=>c,
    eq:()=>c, neq:()=>c, in:()=>c, order:()=>c, limit:()=>c, head:()=>c,
    single:()=>Promise.resolve({data:null,error:null}),
    then:(r,j)=>p.then(r,j), catch:(j)=>p.catch(j)
  };
  return c;
}

const db = {
  from: (t) => SUPABASE_READY ? sb.from(t) : fakeChain(),
  auth: {
    onAuthStateChange: (cb) => SUPABASE_READY
      ? sb.auth.onAuthStateChange(cb)
      : { data: { subscription: { unsubscribe:()=>{} } } },
    signInWithPassword: (o) => SUPABASE_READY
      ? sb.auth.signInWithPassword(o)
      : Promise.resolve({ error:{ message:'Add your Supabase keys to script.js first.' } }),
    signUp: (o) => SUPABASE_READY
      ? sb.auth.signUp(o)
      : Promise.resolve({ error:{ message:'Add your Supabase keys to script.js first.' } }),
    signOut: () => SUPABASE_READY ? sb.auth.signOut() : Promise.resolve({}),
  },
  rpc: (fn, args) => SUPABASE_READY ? sb.rpc(fn, args) : Promise.resolve({}),
};

/* ── STATE ──────────────────────────────────── */
let currentUser    = null;
let currentProfile = null;
let activeRecId    = null;

/* ── PAGES ──────────────────────────────────── */
const pageHome      = document.getElementById('page-home');
const pageSearch    = document.getElementById('page-search');
const pageCommunity = document.getElementById('page-community');

function showPage(page) {
  [pageHome, pageSearch, pageCommunity].forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ── LOGO / NAV ──────────────────────────────── */
document.getElementById('logo-home').addEventListener('click', () => showPage(pageHome));
document.getElementById('logo-search').addEventListener('click', () => showPage(pageHome));
document.getElementById('logo-community').addEventListener('click', () => showPage(pageHome));

document.getElementById('btn-recommend').addEventListener('click', () => {
  showPage(pageSearch);
  document.getElementById('search-input').focus();
});
document.getElementById('btn-community-home').addEventListener('click', () => showPage(pageCommunity));

/* ── SIGN OUT ────────────────────────────────── */
document.getElementById('btn-signout-home').addEventListener('click', doSignOut);
document.getElementById('btn-signout-search').addEventListener('click', doSignOut);
document.getElementById('btn-signout-community').addEventListener('click', doSignOut);
async function doSignOut() {
  await db.auth.signOut();
  window.location.reload();
}

/* ── AUTH STATE ──────────────────────────────── */
db.auth.onAuthStateChange(async (_event, session) => {
  currentUser = session?.user ?? null;
  updateSignOutBtns();
  if (currentUser) {
    currentProfile = await fetchOrCreateProfile(currentUser);
    showLoggedInView();
  } else {
    currentProfile = null;
    showAuthView();
  }
});

function updateSignOutBtns() {
  ['btn-signout-home','btn-signout-search','btn-signout-community'].forEach(id => {
    document.getElementById(id)?.classList.toggle('hidden', !currentUser);
  });
}

/* ── PROFILE ─────────────────────────────────── */
async function fetchOrCreateProfile(user) {
  let { data } = await db.from('profiles').select('*').eq('id', user.id).single();
  if (!data) {
    const username = user.user_metadata?.username || user.email.split('@')[0];
    const { data: d } = await db.from('profiles').insert({ id: user.id, username }).select().single();
    data = d;
  }
  return data;
}

/* ── AUTH FORMS ──────────────────────────────── */
const tabSignin = document.getElementById('tab-signin');
const tabCreate = document.getElementById('tab-create');
const formSignin = document.getElementById('form-signin');
const formCreate = document.getElementById('form-create');

function showTab(tab) {
  const isSignin = tab === 'signin';
  tabSignin.classList.toggle('active', isSignin);
  tabCreate.classList.toggle('active', !isSignin);
  formSignin.classList.toggle('hidden', !isSignin);
  formCreate.classList.toggle('hidden', isSignin);
}

tabSignin.addEventListener('click', () => showTab('signin'));
tabCreate.addEventListener('click', () => showTab('create'));
document.getElementById('link-to-create').addEventListener('click', e => { e.preventDefault(); showTab('create'); });
document.getElementById('link-to-signin').addEventListener('click', e => { e.preventDefault(); showTab('signin'); });

document.getElementById('btn-signin').addEventListener('click', async () => {
  const email    = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  const errEl    = document.getElementById('err-signin');
  if (!email || !password) { showErr(errEl, 'Please fill in all fields.'); return; }
  const btn = document.getElementById('btn-signin');
  btn.textContent = 'Signing in…'; btn.disabled = true;

  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out. Please try again.')), 10000));
  try {
    const { error } = await Promise.race([db.auth.signInWithPassword({ email, password }), timeout]);
    if (error) showErr(errEl, error.message);
    else showToast('Welcome back! Successfully signed in');
  } catch (e) {
    showErr(errEl, e.message);
  }
  btn.textContent = 'Sign In'; btn.disabled = false;
});

document.getElementById('btn-create').addEventListener('click', async () => {
  const username = document.getElementById('create-username').value.trim();
  const email    = document.getElementById('create-email').value.trim();
  const password = document.getElementById('create-password').value;
  const errEl    = document.getElementById('err-create');
  if (!username || !email || !password) { showErr(errEl, 'Please fill in all fields.'); return; }
  if (password.length < 6) { showErr(errEl, 'Password must be at least 6 characters.'); return; }
  const btn = document.getElementById('btn-create');
  btn.textContent = 'Creating…'; btn.disabled = true;
  const { error } = await db.auth.signUp({ email, password, options: { data: { username } } });
  btn.textContent = 'Create Account'; btn.disabled = false;
  if (error) showErr(errEl, error.message);
  else { showErr(errEl, '✅ Account created! You can now sign in.', true); showTab('signin'); }
});

function showErr(el, msg, ok = false) {
  el.textContent = msg;
  el.style.background = ok ? 'rgba(39,174,96,0.1)' : 'rgba(232,59,59,0.1)';
  el.style.borderColor = ok ? '#27ae60' : 'var(--red)';
  el.style.color = ok ? '#2ecc71' : '#ff8080';
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 6000);
}

/* ── VIEWS ───────────────────────────────────── */
function showAuthView() {
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('logged-view').classList.add('hidden');
}

async function showLoggedInView() {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('logged-view').classList.remove('hidden');
  document.getElementById('welcome-name').textContent = `Welcome, ${currentProfile.username}!`;
  switchCommTab('community');
  await Promise.all([loadMyRecs(), loadCinephiles()]);
}

/* ── COMMUNITY TABS ──────────────────────────── */
document.getElementById('comm-tab-community').addEventListener('click', () => switchCommTab('community'));
document.getElementById('comm-tab-rankings').addEventListener('click', () => switchCommTab('rankings'));

function switchCommTab(tab) {
  const isCom = tab === 'community';
  document.getElementById('comm-tab-community').classList.toggle('active', isCom);
  document.getElementById('comm-tab-rankings').classList.toggle('active', !isCom);
  document.getElementById('community-tab').classList.toggle('hidden', !isCom);
  document.getElementById('rankings-tab').classList.toggle('hidden', isCom);
  if (!isCom) loadRankings();
}

/* ── MY RECS ─────────────────────────────────── */
async function loadMyRecs() {
  const { data: recs } = await db.from('recommendations').select('*').eq('user_id', currentUser.id).order('created_at');
  const { data: profile } = await db.from('profiles').select('total_likes_received').eq('id', currentUser.id).single();
  document.getElementById('my-likes').textContent = profile?.total_likes_received || 0;
  renderMyRecs(recs || []);
}

function renderMyRecs(recs) {
  document.getElementById('my-recs-label').textContent = `My Movie Recommendations (${recs.length}/${MAX_RECS})`;
  const grid = document.getElementById('my-recs-grid');
  grid.innerHTML = '';
  recs.forEach(rec => grid.appendChild(buildRecItem(rec, true)));
}

function buildRecItem(rec, canDelete) {
  const wrap = document.createElement('div');
  wrap.className = 'rec-item';
  const poster = rec.poster_path
    ? `<img src="${IMG_BASE}${rec.poster_path}" alt="${esc(rec.title)}" loading="lazy" />`
    : `<div class="no-poster-sm">No Poster</div>`;
  wrap.innerHTML = `
    ${poster}
    <div class="rec-item-foot">
      <span class="rec-item-title">${esc(rec.title)}</span>
      <button class="btn-comment" title="Comments">💬</button>
    </div>
    <div class="rec-item-year">${rec.release_year || ''}</div>
    ${canDelete ? `<button class="btn-remove" title="Remove">✕</button>` : ''}`;
  wrap.querySelector('.btn-comment').addEventListener('click', () => openComments(rec.id, rec.title));
  if (canDelete) wrap.querySelector('.btn-remove').addEventListener('click', () => removeRec(rec.id));
  return wrap;
}

async function removeRec(id) {
  await db.from('recommendations').delete().eq('id', id).eq('user_id', currentUser.id);
  await loadMyRecs();
}

/* ── CINEPHILES ──────────────────────────────── */
async function loadCinephiles() {
  const { data: profiles } = await db.from('profiles').select('*').neq('id', currentUser.id);
  if (!profiles?.length) {
    document.getElementById('cinephiles-list').innerHTML = '<p class="empty-msg">No other users yet.</p>';
    return;
  }
  const { data: follows } = await db.from('follows').select('following_id').eq('follower_id', currentUser.id);
  const { data: likes }   = await db.from('profile_likes').select('liked_id').eq('liker_id', currentUser.id);
  const followSet = new Set((follows||[]).map(f=>f.following_id));
  const likeSet   = new Set((likes||[]).map(l=>l.liked_id));

  const ids = profiles.map(p=>p.id);
  const { data: allRecs } = await db.from('recommendations').select('*').in('user_id', ids);
  const byUser = {};
  (allRecs||[]).forEach(r => { (byUser[r.user_id]=byUser[r.user_id]||[]).push(r); });

  const container = document.getElementById('cinephiles-list');
  container.innerHTML = '';

  profiles.forEach(profile => {
    const recs      = byUser[profile.id] || [];
    const following = followSet.has(profile.id);
    const liked     = likeSet.has(profile.id);

    const card = document.createElement('div');
    card.className = 'cinephile-card';

    const recsHTML = recs.slice(0, MAX_RECS).map(rec => {
      const poster = rec.poster_path
        ? `<img src="${IMG_BASE}${rec.poster_path}" alt="${esc(rec.title)}" loading="lazy" />`
        : `<div class="no-poster-sm">No Poster</div>`;
      return `
        <div class="rec-item" style="width:100px">
          ${poster}
          <div class="rec-item-foot">
            <span class="rec-item-title">${esc(rec.title)}</span>
            <button class="btn-comment" data-rec-id="${rec.id}" data-title="${esc(rec.title)}">💬</button>
          </div>
          <div class="rec-item-year">${rec.release_year||''}</div>
        </div>`;
    }).join('');

    card.innerHTML = `
      <div class="cinephile-head">
        <div class="cinephile-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <span class="cinephile-username">${esc(profile.username)}</span>
        <div class="cinephile-actions">
          <div class="like-badge-sm">
            <button class="btn-like-profile ${liked?'liked':''}" data-uid="${profile.id}">♥</button>
            <span class="like-count" id="lc-${profile.id}">${profile.total_likes_received||0}</span>
          </div>
          <button class="btn-follow ${following?'following':''}" data-uid="${profile.id}">${following?'Following':'Follow'}</button>
        </div>
      </div>
      <p class="cinephile-rec-label">Movie Recommendations (${recs.length}/${MAX_RECS})</p>
      <div class="cinephile-recs">${recsHTML}</div>`;

    container.appendChild(card);

    card.querySelector('.btn-follow').addEventListener('click', e => toggleFollow(e.currentTarget, profile.id));
    card.querySelector('.btn-like-profile').addEventListener('click', e => toggleLike(e.currentTarget, profile.id));
    card.querySelectorAll('.btn-comment[data-rec-id]').forEach(btn => {
      btn.addEventListener('click', () => openComments(btn.dataset.recId, btn.dataset.title));
    });
  });
}

async function toggleFollow(btn, uid) {
  const isFollowing = btn.classList.contains('following');
  if (isFollowing) {
    await db.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', uid);
    btn.textContent = 'Follow'; btn.classList.remove('following');
  } else {
    await db.from('follows').insert({ follower_id: currentUser.id, following_id: uid });
    btn.textContent = 'Following'; btn.classList.add('following');
  }
}

async function toggleLike(btn, uid) {
  const liked = btn.classList.contains('liked');
  const numEl = document.getElementById(`lc-${uid}`);
  if (liked) {
    await db.from('profile_likes').delete().eq('liker_id', currentUser.id).eq('liked_id', uid);
    await db.rpc('decrement_likes', { target_id: uid });
    btn.classList.remove('liked');
    numEl.textContent = Math.max(0, parseInt(numEl.textContent) - 1);
  } else {
    await db.from('profile_likes').insert({ liker_id: currentUser.id, liked_id: uid });
    await db.rpc('increment_likes', { target_id: uid });
    btn.classList.add('liked');
    numEl.textContent = parseInt(numEl.textContent) + 1;
  }
}

/* ── RANKINGS ────────────────────────────────── */
async function loadRankings() {
  const { data } = await db.from('profiles').select('*').order('total_likes_received', { ascending: false }).limit(20);
  const list = document.getElementById('rankings-list');
  list.innerHTML = '';
  if (!data?.length) { list.innerHTML = '<p class="empty-msg">No rankings yet.</p>'; return; }
  data.forEach((p, i) => {
    const rank  = i + 1;
    const isMe  = currentUser && p.id === currentUser.id;
    const medal = rank===1?'🏆':rank===2?'🥈':rank===3?'🥉':rank;
    const likes = p.total_likes_received || 0;
    const row   = document.createElement('div');
    row.className = `rank-row${isMe?' rank-me':''}`;
    row.innerHTML = `
      <span class="rank-medal">${medal}</span>
      <span class="rank-username">${esc(p.username)}${rank===1?'<span class="top-badge">- Top Cinephile</span>':''}</span>
      <span class="rank-likes">${likes} like${likes!==1?'s':''}</span>`;
    list.appendChild(row);
  });
}

/* ── ADD MOVIE MODAL ─────────────────────────── */
document.getElementById('btn-add-movie').addEventListener('click', () => {
  document.getElementById('modal-add').classList.remove('hidden');
  document.getElementById('modal-search-input').value = '';
  document.getElementById('modal-results').innerHTML = '';
  document.getElementById('modal-search-input').focus();
});
document.getElementById('modal-add-close').addEventListener('click', () => document.getElementById('modal-add').classList.add('hidden'));
document.getElementById('modal-add').addEventListener('click', e => { if (e.target===document.getElementById('modal-add')) document.getElementById('modal-add').classList.add('hidden'); });

let modalTimer = null;
document.getElementById('modal-search-input').addEventListener('input', () => {
  const q = document.getElementById('modal-search-input').value.trim();
  clearTimeout(modalTimer);
  if (!q) { document.getElementById('modal-results').innerHTML=''; return; }
  modalTimer = setTimeout(() => tmdbSearch(q, 'modal-results', true), 400);
});

async function tmdbSearch(query, targetId, addMode = false) {
  const res  = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=1`);
  const data = await res.json();
  const el   = document.getElementById(targetId);
  el.innerHTML = '';
  (data.results||[]).filter(m=>m.title).slice(0,10).forEach(movie => {
    if (addMode) {
      const row = document.createElement('div');
      row.className = 'modal-row';
      const poster = movie.poster_path ? `<img src="${IMG_BASE}${movie.poster_path}" alt="${esc(movie.title)}" />` : `<div class="modal-no-poster">?</div>`;
      const year = movie.release_date?.substring(0,4) || 'N/A';
      row.innerHTML = `${poster}<div class="modal-movie-info"><div class="modal-movie-title">${esc(movie.title)}</div><div class="modal-movie-year">${year}</div></div><button class="btn-add-rec">Add</button>`;
      row.querySelector('.btn-add-rec').addEventListener('click', () => addRec(movie));
      el.appendChild(row);
    }
  });
}

async function addRec(movie) {
  const { count } = await db.from('recommendations').select('*',{count:'exact',head:true}).eq('user_id', currentUser.id);
  if (count >= MAX_RECS) { showToast(`Max ${MAX_RECS} recommendations allowed.`); return; }
  const { error } = await db.from('recommendations').insert({
    user_id: currentUser.id, movie_id: movie.id, title: movie.title,
    poster_path: movie.poster_path||null,
    release_year: movie.release_date?.substring(0,4)||'N/A',
    vote_average: movie.vote_average||null
  });
  if (error) { showToast(error.code==='23505'?'Already added!':'Error adding.'); return; }
  showToast(`"${movie.title}" added!`);
  document.getElementById('modal-add').classList.add('hidden');
  await loadMyRecs();
}

/* ── COMMENTS ────────────────────────────────── */
document.getElementById('modal-comment-close').addEventListener('click', () => document.getElementById('modal-comment').classList.add('hidden'));
document.getElementById('modal-comment').addEventListener('click', e => { if (e.target===document.getElementById('modal-comment')) document.getElementById('modal-comment').classList.add('hidden'); });
document.getElementById('comment-login-link').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('modal-comment').classList.add('hidden');
  showAuthView();
});

function openComments(recId, title) {
  activeRecId = recId;
  document.getElementById('comment-title').textContent = `💬 ${title}`;
  document.getElementById('modal-comment').classList.remove('hidden');
  document.getElementById('comment-input').value = '';
  const composer = document.getElementById('comment-composer');
  const prompt   = document.getElementById('comment-login-prompt');
  if (currentUser) { composer.classList.remove('hidden'); prompt.classList.add('hidden'); }
  else             { composer.classList.add('hidden');    prompt.classList.remove('hidden'); }
  loadComments(recId);
}

document.getElementById('btn-post-comment').addEventListener('click', async () => {
  const content = document.getElementById('comment-input').value.trim();
  if (!content || !currentUser || !activeRecId) return;
  const { error } = await db.from('comments').insert({ rec_id: activeRecId, user_id: currentUser.id, username: currentProfile.username, content });
  if (!error) { document.getElementById('comment-input').value = ''; loadComments(activeRecId); }
});

async function loadComments(recId) {
  const el = document.getElementById('comments-list');
  el.innerHTML = '<div class="empty-msg">Loading…</div>';
  const { data } = await db.from('comments').select('*').eq('rec_id', recId).order('created_at');
  if (!data?.length) { el.innerHTML = '<p class="empty-msg">No comments yet. Be the first!</p>'; return; }
  el.innerHTML = data.map(c => {
    const date  = new Date(c.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const canDel = currentUser && c.user_id === currentUser.id;
    return `<div class="comment-item">
      <div class="comment-head">
        <span class="comment-author">${esc(c.username)}</span>
        <span class="comment-date">${date}</span>
        ${canDel?`<button class="btn-del-comment" data-id="${c.id}">✕</button>`:''}
      </div>
      <p class="comment-body">${esc(c.content)}</p>
    </div>`;
  }).join('');
  el.querySelectorAll('.btn-del-comment').forEach(btn => {
    btn.addEventListener('click', async () => {
      await db.from('comments').delete().eq('id', btn.dataset.id);
      loadComments(recId);
    });
  });
}

/* ── MAIN MOVIE SEARCH ───────────────────────── */
const searchInput = document.getElementById('search-input');
const movieGrid   = document.getElementById('movie-grid');
let searchTimer   = null;

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  clearTimeout(searchTimer);
  movieGrid.innerHTML = '';
  document.getElementById('no-results').classList.add('hidden');
  if (!q) return;
  movieGrid.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
  searchTimer = setTimeout(() => fetchAndRenderMovies(q), 400);
});

async function fetchAndRenderMovies(query) {
  try {
    const res  = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=1`);
    const data = await res.json();
    renderMovies(data.results||[]);
  } catch {
    movieGrid.innerHTML = `<p style="color:var(--red);grid-column:1/-1;text-align:center;padding:20px">Failed to fetch movies. Check your connection.</p>`;
  }
}

function renderMovies(movies) {
  movieGrid.innerHTML = '';
  const valid = movies.filter(m => m.title);
  if (!valid.length) { document.getElementById('no-results').classList.remove('hidden'); return; }
  valid.forEach(movie => {
    const year   = movie.release_date?.substring(0,4) || 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;
    const card   = document.createElement('div');
    card.className = 'movie-card';
    const poster = movie.poster_path
      ? `<img src="${IMG_BASE}${movie.poster_path}" alt="${esc(movie.title)}" loading="lazy" />`
      : `<div class="no-poster">No Poster</div>`;
    const ratingOverlay = rating ? `
      <div class="rating-overlay">
        <svg class="star-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <span class="rating-num">${rating}</span>
      </div>` : '';
    card.innerHTML = `
      <div class="movie-poster-wrap">${poster}${ratingOverlay}</div>
      <div class="movie-card-info">
        <div class="movie-card-title">${esc(movie.title)}</div>
        <div class="movie-card-year">${year}</div>
      </div>`;
    movieGrid.appendChild(card);
  });
}

/* ── POSTER BACKGROUND ───────────────────────── */
async function loadPosterBackground() {
  try {
    const res  = await fetch(`${TMDB_BASE}/movie/popular?api_key=${TMDB_KEY}&page=1`);
    const data = await res.json();
    const res2 = await fetch(`${TMDB_BASE}/movie/popular?api_key=${TMDB_KEY}&page=2`);
    const data2 = await res2.json();
    const movies = [...(data.results||[]), ...(data2.results||[])].filter(m => m.poster_path);

    ['row-1','row-2','row-3'].forEach((rowId, i) => {
      const row    = document.getElementById(rowId);
      const subset = movies.slice(i*10, i*10+12);
      // Triplicate for seamless loop
      const imgs   = [...subset, ...subset, ...subset].map(m =>
        `<img src="${IMG_BASE}${m.poster_path}" alt="${esc(m.title)}" loading="lazy" />`
      ).join('');
      row.innerHTML = imgs;
    });
  } catch {
    // Silently fail — background is decorative
  }
}

loadPosterBackground();

/* ── TOAST ───────────────────────────────────── */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}

/* ── UTILITY ─────────────────────────────────── */
function esc(str='') {
  const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
}