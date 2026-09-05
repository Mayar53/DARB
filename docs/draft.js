/* =========================================================
   DARB|درب — draft.js
   Backed by the Django API:
     - Accounts (email, full name, nickname, hashed password,
       role, permissions) live in the backend users table.
     - Opportunities, saved items, applied items and stories
       are stored per-user on the server, so they work on any
       device.
   API base is resolved ONCE below from the page's own host, so
   the same build works on desktop (localhost) and on a phone
   that loads the page from the LAN (e.g. 192.168.68.114:5500 →
   API at http://<same-host>:8000/api).

   In-memory shape mirrors the old localStorage model so the
   rendering code is unchanged — only the data layer talks to
   the API.
   ========================================================= */

/* Centralized API base URL. On a LAN-served page the phone's
   127.0.0.1 would mean the phone itself, so we derive the API
   host from wherever the page was loaded from. You can pin a
   specific base with localStorage.setItem("darb_api_base", url). */
const API_BASE = (function(){
  try {
    const saved = localStorage.getItem("darb_api_base");
    if (saved) return saved;
  } catch (e) { /* ignore */ }
  const host = (typeof location !== "undefined" && location.hostname) || "";
  if (host && host !== "127.0.0.1" && host !== "localhost" && host !== "0.0.0.0") {
    return `http://${host}:8000/api`;
  }
  return "http://127.0.0.1:8000/api";
})();

/* ---------------------------------------------------------
   Category list — key must match the backend `Category`
   choices (and the `category` field on each opportunity).
--------------------------------------------------------- */
const CATEGORIES = [
  { key:"volunteer",   label:"Volunteering",  color:"#0E4749" },
  { key:"competition", label:"Competitions",  color:"#C0533D" },
  { key:"fellowship",  label:"Fellowships",   color:"#6E4B6E" },
  { key:"internship",  label:"Internships",   color:"#3E5F8A" },
  { key:"course",      label:"Courses",       color:"#D4A24E" },
  { key:"workshop",    label:"Workshops",     color:"#B8762E" },
  { key:"session",     label:"Sessions",      color:"#3E6B4F" },
  { key:"conference",  label:"Conferences",   color:"#8A4A56" },
];

/* Field-based tags (Science, STEM, AI, Coding…). These are the "field" pills
   shown on cards, picked in the form (multi-select), and used as filters.
   Keys match the backend FIELD_KEYS / OpportunityField rows. */
const FIELDS = [
  { key:"general",           label:"General",          color:"#5C5C5C" },
  { key:"science",           label:"Science",          color:"#2E6E8E" },
  { key:"stem",              label:"STEM",             color:"#0E4749" },
  { key:"technology",        label:"Technology",       color:"#3E5F8A" },
  { key:"ai",                label:"AI",               color:"#5B3E8A" },
  { key:"coding",            label:"Coding",           color:"#2E8E6E" },
  { key:"computer-science",  label:"Computer Science", color:"#3E5F8A" },
  { key:"chemistry",         label:"Chemistry",        color:"#8A6E2E" },
  { key:"physics",           label:"Physics",          color:"#3E6B8E" },
  { key:"biology",           label:"Biology",          color:"#4E8A3E" },
  { key:"mathematics",       label:"Mathematics",      color:"#6E5B8E" },
  { key:"engineering",       label:"Engineering",      color:"#B8762E" },
  { key:"medicine",          label:"Medicine",         color:"#C0533D" },
  { key:"health",            label:"Health",           color:"#8A4A56" },
  { key:"environment",       label:"Environment",      color:"#3E6B4F" },
  { key:"art",               label:"Art",              color:"#8A4A6E" },
  { key:"design",            label:"Design",           color:"#B85E8A" },
  { key:"music",             label:"Music",            color:"#6E4B6E" },
  { key:"sports",            label:"Sports",           color:"#2E8E8E" },
  { key:"literature",        label:"Literature",       color:"#8A6E4E" },
  { key:"business",          label:"Business",         color:"#B8A22E" },
  { key:"entrepreneurship",  label:"Entrepreneurship", color:"#D4A24E" },
  { key:"leadership",        label:"Leadership",       color:"#C0533D" },
  { key:"education",         label:"Education",        color:"#3E8A6E" },
  { key:"research",          label:"Research",         color:"#5B5B8E" },
  { key:"social-sciences",   label:"Social Sciences",  color:"#8A6E8E" },
  { key:"culture",           label:"Culture",          color:"#8A5B3E" },
  { key:"social-impact",     label:"Social Impact",    color:"#4E8A8A" },
];

function fieldInfo(key){ return FIELDS.find(f => f.key === key); }

/* Tiny inline icons used inside each card's meta rows. */
const icon = {
  pin:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
  clock:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  cash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>`,
  cert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="9" r="5"/><path d="M9 13l-2 8 5-3 5 3-2-8"/></svg>`,
  age:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`,
  arrow:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  bookmark:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
  check:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`,
  flag: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 21V4m0 0h12l-2 4 2 4H5"/></svg>`,
  thumb:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 11v9H4v-9h3zm0 0l4-8c2 0 3 2 3 4l-1 4h7v2l-3 8H7"/></svg>`,
};

/* =========================================================
   API layer — every server call goes through `api()`.
   ========================================================= */

/* JWT session for the signed-in user. Tokens live in localStorage ONLY for
   session persistence across reloads/browser restarts; passwords never touch
   localStorage. The access token is short-lived; the refresh token lets us
   renew it silently so the user stays logged in. */
let accessToken = localStorage.getItem("darb_token") || null;
let refreshToken = localStorage.getItem("darb_refresh") || null;
let currentUserId = localStorage.getItem("darb_uid") ? Number(localStorage.getItem("darb_uid")) : null;

/* In-memory data — same shape as the old localStorage model,
   so all the rendering code below is unchanged. */
const data = {
  opportunities: [],   // from GET /opportunities
  saved: [],           // { opportunityId } for the current user
  applied: [],         // { opportunityId, date } for the current user
  stories: [],         // per-opportunity, fetched on demand
  users: [],           // admin list (admin panel) / author names
  lang: localStorage.getItem("darb_lang") || "en",
  onboarded: localStorage.getItem("darb_onboarded") === "1",
  sessionUserId: currentUserId,
};

/* One in-flight refresh at a time so concurrent 401s don't stampede. */
let refreshPromise = null;

async function refreshAccessToken(){
  // If a refresh is already running, share its result.
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    if (!refreshToken) throw new Error("No refresh token");
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const body = await res.json();
        if (body.detail) msg = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      } catch (e) { /* ignore */ }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    const tokens = await res.json();
    accessToken = tokens.access_token;
    if (tokens.refresh_token) {
      refreshToken = tokens.refresh_token;
      localStorage.setItem("darb_refresh", tokens.refresh_token);
    }
    localStorage.setItem("darb_token", accessToken);
    return tokens;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  // Access token expired/invalid — try the refresh token once, then retry.
  if (res.status === 401 && accessToken && refreshToken) {
    try {
      await refreshAccessToken();
      const retryHeaders = { "Content-Type": "application/json" };
      if (accessToken) retryHeaders["Authorization"] = `Bearer ${accessToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { ...retryHeaders, ...(options.headers || {}) },
      });
    } catch (refreshErr) {
      // Only a genuine refresh rejection (401/403) ends the session. A network
      // failure must NOT log the user out — keep the stored tokens and cached
      // user so the next successful request recovers.
      if (refreshErr && (refreshErr.status === 401 || refreshErr.status === 403)) {
        clearSession();
        throw new Error("Session expired — please log in again.");
      }
      throw refreshErr;
    }
  }

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      if (body.detail) msg = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch (e) { /* ignore */ }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

function setSession(user, tokens) {
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token || refreshToken;
  currentUserId = user.id;
  data.sessionUserId = user.id;
  data.isAdmin = !!user.is_staff;
  data.role = user.role || (user.is_staff ? "admin" : "user");
  data.permissions = user.permissions || [];
  data.currentUser = {
    id: user.id,
    nickname: user.nickname || user.full_name,
    email: user.email,
    name: user.full_name,
    avatar: user.avatar || "",
    role: data.role,
    permissions: data.permissions,
    is_staff: data.isAdmin,
  };
  localStorage.setItem("darb_token", accessToken);
  if (refreshToken) localStorage.setItem("darb_refresh", refreshToken);
  localStorage.setItem("darb_uid", String(user.id));
  localStorage.setItem("darb_user", JSON.stringify(data.currentUser));
}

function clearSession() {
  accessToken = null;
  refreshToken = null;
  currentUserId = null;
  data.sessionUserId = null;
  data.isAdmin = false;
  data.role = "user";
  data.permissions = [];
  data.currentUser = null;
  localStorage.removeItem("darb_token");
  localStorage.removeItem("darb_refresh");
  localStorage.removeItem("darb_uid");
  localStorage.removeItem("darb_user");
}

/* Backend-driven permission check (mirrors the backend: owner always passes). */
function hasPerm(perm){
  if (data.role === "owner") return true;
  return (data.permissions || []).includes(perm);
}
function isOwner(){ return data.role === "owner"; }

/* =========================================================
   Role-based destination after login:
   personal → Profile modal | admin → Admin Dashboard | owner → Owner Dashboard
   ========================================================= */
function routeAfterLogin(){
  if (isOwner())  { openDashboard("owner"); return; }
  if (isAdmin())  { openDashboard("admin"); return; }
  openProfile();
}

/* =========================================================
   Full-screen role dashboard (admin / owner)
   ========================================================= */
const dashboardView = document.getElementById("dashboardView");
const dashNav = document.getElementById("dashNav");
const dashContent = document.getElementById("dashContent");
const dashTitle = document.getElementById("dashTitle");
const dashRoleBadge = document.getElementById("dashRoleBadge");

let dashRole = null;   // "admin" | "owner"
let dashSection = null;

/* Which sections each role sees. Backend enforces; UI mirrors role + perms. */
function dashSections(){
  const base = [];
  if (isOwner()) {
    base.push(
      { key: "overview",      label: t("dash.overview") },
      { key: "add",           label: t("dash.add") },
      { key: "allopps",       label: t("dash.allOpps") },
      { key: "applications",  label: t("dash.applications") },
      { key: "admins",        label: t("dash.admins") },
      { key: "users",         label: t("dash.users") },
      { key: "organizations", label: t("dash.organizations") },
      { key: "reports",       label: t("dash.reports") },
      { key: "settings",      label: t("dash.settings") },
    );
  } else {
    base.push(
      { key: "overview", label: t("dash.overview") },
      { key: "add",      label: t("dash.add") },
      { key: "myopps",   label: t("dash.myOpps") },
    );
    if (hasPerm("manage_admin_applications")) base.push({ key: "applications", label: t("dash.applications") });
    if (hasPerm("manage_admins")) base.push({ key: "admins", label: t("dash.admins") });
    if (hasPerm("manage_users")) base.push({ key: "users", label: t("dash.users") });
    if (hasPerm("view_reports")) base.push({ key: "reports", label: t("dash.reports") });
  }
  return base;
}

function openDashboard(role){
  dashRole = role;
  dashboardView.hidden = false;
  document.body.style.overflow = "hidden";
  renderDashNav();
  loadDashSection(dashSections()[0]?.key || "overview");
}

function closeDashboard(){
  dashboardView.hidden = true;
  document.body.style.overflow = "";
  dashRole = null;
  dashSection = null;
  renderNav(); render();
}

function renderDashNav(){
  dashNav.innerHTML = "";
  dashSections().forEach(s => {
    const b = document.createElement("button");
    b.textContent = s.label;
    b.className = s.key === dashSection ? "active" : "";
    b.addEventListener("click", () => loadDashSection(s.key));
    dashNav.appendChild(b);
  });
  const foot = document.getElementById("dashSideFoot");
  foot.innerHTML = "";
  const logoutBtn = document.createElement("button");
  logoutBtn.textContent = t("common.logout");
  logoutBtn.addEventListener("click", () => { closeDashboard(); logout(); });
  foot.appendChild(logoutBtn);
  dashRoleBadge.textContent = dashRole === "owner" ? "OWNER" : t("profile.roleAdmin");
  dashRoleBadge.className = "dash-role-badge" + (dashRole === "owner" ? " owner" : "");
  dashTitle.textContent = dashRole === "owner" ? t("dash.ownerTitle") : t("dash.adminTitle");
}

function loadDashSection(key){
  dashSection = key;
  document.querySelectorAll("#dashNav button").forEach(b => b.classList.toggle("active", b.textContent === (dashSections().find(s => s.key === key) || {}).label));
  const titleMap = Object.fromEntries(dashSections().map(s => [s.key, s.label]));
  dashTitle.textContent = titleMap[key] || t("dash.overview");
  const renderers = {
    overview:      renderOverview,
    add:           renderAddOpportunity,
    allopps:       renderAllOpportunities,
    myopps:        renderMyOpps,
    applications:  renderApplicationsDash,
    admins:        renderAdminsDash,
    users:         renderUsersDash,
    organizations: renderOrganizationsDash,
    reports:       renderReportsDash,
    settings:      renderSettingsDash,
  };
  (renderers[key] || renderOverview)();
}

document.getElementById("dashBack").addEventListener("click", closeDashboard);

/* ---------- dashboard section renderers ---------- */

async function renderOverview(){
  dashContent.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    let usersCount = 0, adminsCount = 0, appsCount = 0, opps = [];
    if (isOwner()) {
      const [users, admins, apps] = await Promise.all([
        api("/auth/users"), api("/auth/admins"), api("/auth/admin-applications"),
      ]);
      usersCount = users.length; adminsCount = admins.length; appsCount = apps.length;
      opps = await api("/opportunities/all");
    } else {
      const d = await api("/opportunities/dashboard");
      opps = d.items || [];
    }
    const today = new Date();
    const published = opps.filter(o => o.status === "published").length;
    const hidden = opps.filter(o => o.status === "hidden" || o.status === "archived" || o.status === "draft").length;
    const expired = opps.filter(o => o.status === "published" && o.deadline && new Date(o.deadline + "T23:59:59") < today).length;
    const name = data.currentUser?.name || data.currentUser?.nickname || "";
    dashContent.innerHTML = `
      <p class="dash-section-title">${esc(t("dash.welcome", { name: name || "" }))}</p>
      <div class="dash-cards">
        <div class="dash-card"><span class="num">${usersCount || opps.length}</span><span class="lbl">${esc(isOwner() ? t("dash.totalUsers") : t("dash.myOpps"))}</span></div>
        ${isOwner() ? `<div class="dash-card"><span class="num">${adminsCount}</span><span class="lbl">${esc(t("dash.totalAdmins"))}</span></div>
        <div class="dash-card"><span class="num">${appsCount}</span><span class="lbl">${esc(t("dash.pendingApps"))}</span></div>` : ""}
        <div class="dash-card"><span class="num">${published}</span><span class="lbl">${esc(t("dash.published"))}</span></div>
        <div class="dash-card"><span class="num">${hidden}</span><span class="lbl">${esc(t("dash.hidden"))}</span></div>
        <div class="dash-card"><span class="num">${expired}</span><span class="lbl">${esc(t("dash.expired"))}</span></div>
      </div>`;
  } catch (err) {
    dashContent.innerHTML = `<p class="dash-empty">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* Shared Add Opportunity form (used by owner + admin). When set, the form is
   opened in EDIT mode and prefilled from this opportunity; saving PUTs it. */
let pendingEditOpp = null;

async function renderAddOpportunity(){
  let orgOptions = "";
  try {
    const orgs = await api("/auth/organizations");
    orgOptions = orgs.map(o => `<option value="${esc(o.name)}">`).join("");
  } catch (e) { /* orgs are optional; owner-only endpoint */ }
  dashContent.innerHTML = `
    <p class="dash-section-title">${esc(t("dash.add"))}</p>
    <form class="dash-form" id="dashOppForm">
      <label>${esc(t("admin.form.title"))}
        <input type="text" id="dfTitle" required>
      </label>
      <div class="dash-form-row">
        <label>${esc(t("dash.organization"))}
          <input type="text" id="dfOrg" list="dfOrgList" placeholder="e.g. NASA, UNICEF, a local team…">
          <datalist id="dfOrgList">${orgOptions}</datalist>
        </label>
        <label>${esc(t("admin.form.category"))}
          <select id="dfCategory">${CATEGORIES.map(c => `<option value="${c.key}">${esc(c.label)}</option>`).join("")}</select>
        </label>
      </div>
      <label>${esc(t("dash.fields"))}
        <div class="dash-chip-row" id="dfFieldsWrap">
          ${FIELDS.map(f => `<button type="button" class="dash-chip" data-field="${f.key}" style="--cat-color:${f.color}">${esc(f.label)}</button>`).join("")}
        </div>
      </label>
      <label>${esc(t("admin.form.desc"))}
        <textarea id="dfDesc" rows="3" required></textarea>
      </label>
      <div class="dash-form-row">
        <label>${esc(t("admin.form.location"))}
          <input type="text" id="dfLocation" placeholder="Baghdad, or Online">
        </label>
        <label>${esc(t("admin.form.mode"))}
          <select id="dfMode">
            <option value="online" data-i18n="filter.modeOnline">online</option>
            <option value="in-person" data-i18n="filter.modeInPerson">in-person</option>
            <option value="hybrid" data-i18n="filter.modeHybrid">hybrid</option>
          </select>
        </label>
      </div>
      <div class="dash-form-row">
        <label>${esc(t("admin.form.duration"))}
          <input type="text" id="dfDuration" placeholder="e.g. 2 months">
        </label>
        <label>${esc(t("admin.form.funding"))}
          <select id="dfFunding">
            <option value="free" data-i18n="filter.fundingFree">free</option>
            <option value="paid" data-i18n="filter.fundingCharged">paid</option>
          </select>
        </label>
      </div>
      <div class="dash-form-row">
        <label>${esc(t("admin.form.deadline"))}
          <input type="date" id="dfDeadline">
        </label>
        <label>${esc(t("admin.form.link"))}
          <input type="url" id="dfLink" required placeholder="https://…">
        </label>
      </div>
      <div class="dash-form-row">
        <label>${esc(t("admin.form.age"))}
          <select id="dfAge">
            <option value="all" data-i18n="filter.ageAll">all ages</option>
            <option value="13-15">13-15</option>
            <option value="15-18">15-18</option>
            <option value="+18">+18</option>
          </select>
        </label>
        <label>${esc(t("admin.form.certificate"))}
          <select id="dfCertificate"><option value="no">${data.lang === "ar" ? "لا" : "No"}</option><option value="yes">${data.lang === "ar" ? "نعم" : "Yes"}</option></select>
        </label>
        <label>${esc(t("dash.status"))}
          <select id="dfStatus">
            <option value="draft">${data.lang === "ar" ? "مسودة" : "Draft"}</option>
            <option value="published">${data.lang === "ar" ? "منشورة" : "Published"}</option>
            <option value="hidden">${data.lang === "ar" ? "مخفية" : "Hidden"}</option>
          </select>
        </label>
      </div>
      <div class="dash-actions">
        <button class="btn btn-primary" type="submit">${esc(t("admin.form.add"))}</button>
        <span class="modal-hint" id="dfHint" hidden></span>
      </div>
    </form>`;
  /* Field chips: toggle selection (multi-select, mirrors the M2M). */
  const chipWrap = document.getElementById("dfFieldsWrap");
  chipWrap.querySelectorAll(".dash-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
    });
  });
  document.getElementById("dashOppForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      category: document.getElementById("dfCategory").value,
      title: document.getElementById("dfTitle").value.trim(),
      description: document.getElementById("dfDesc").value.trim(),
      location: document.getElementById("dfLocation").value.trim(),
      mode: document.getElementById("dfMode").value,
      duration: document.getElementById("dfDuration").value.trim(),
      funding: document.getElementById("dfFunding").value,
      age: document.getElementById("dfAge").value,
      deadline: document.getElementById("dfDeadline").value || null,
      apply_url: document.getElementById("dfLink").value.trim(),
      certificate: document.getElementById("dfCertificate").value === "yes",
      status: document.getElementById("dfStatus").value,
      organization: document.getElementById("dfOrg").value.trim() || null,
      fields: [...document.querySelectorAll("#dfFieldsWrap .dash-chip.active")].map(c => c.dataset.field),
    };
    if (!payload.title || !payload.description || !payload.apply_url) { showToast(t("toast.oppRequired")); return; }
    const hint = document.getElementById("dfHint");
    const editId = e.target.dataset.editId;
    try {
      if (editId) {
        await api(`/opportunities/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
        if (hint) { hint.hidden = false; hint.textContent = t("toast.oppUpdated"); }
        showToast(t("toast.oppUpdated"));
      } else {
        await api("/opportunities", { method: "POST", body: JSON.stringify(payload) });
        if (hint) { hint.hidden = false; hint.textContent = t("toast.oppAdded"); }
        showToast(t("toast.oppAdded"));
      }
      delete e.target.dataset.editId;
      e.target.reset();
      await refreshOpportunities(); render();
      if (dashSection === "myopps") renderMyOpps();
      if (dashSection === "allopps") renderAllOpportunities();
    } catch (err) {
      if (hint) { hint.hidden = false; hint.textContent = err.message || t("toast.needBackend"); }
      showToast(err.message || t("toast.needBackend"));
    }
  });

  /* EDIT MODE: prefill the freshly-rendered form from the pending opportunity.
     This runs after the form exists, so there is no race with the async orgs
     fetch that built it. */
  if (pendingEditOpp) {
    const o = pendingEditOpp;
    pendingEditOpp = null;
    const form = document.getElementById("dashOppForm");
    if (form) form.dataset.editId = o.id;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ""; };
    set("dfTitle", o.title);
    set("dfDesc", o.desc || o.description);
    set("dfLocation", o.location);
    set("dfMode", o.mode);
    set("dfDuration", o.duration);
    set("dfFunding", o.paid ? "paid" : "free");
    set("dfDeadline", o.deadline || "");
    set("dfLink", o.link || o.apply_url);
    set("dfCategory", o.category);
    set("dfAge", o.age || "all");
    set("dfStatus", o.status || "published");
    set("dfCertificate", o.certificate ? "yes" : "no");
    set("dfOrg", o.organizationName || o.organization_name || "");
    document.getElementById("dfStatus").value = o.status || "published";
    // Pre-select field chips from the opportunity's saved fields.
    const selectedFields = new Set(o.fields || []);
    document.querySelectorAll("#dfFieldsWrap .dash-chip").forEach(chip => {
      if (selectedFields.has(chip.dataset.field)) chip.classList.add("active");
    });
  }
}

/* All opportunities (owner): table with created_by + org + status. */
async function renderAllOpportunities(){
  dashContent.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const all = await api("/opportunities/all");
    if (!all.length) { dashContent.innerHTML = `<p class="dash-empty">${esc(t("admin.myOpps.empty"))}</p>`; return; }
    dashContent.innerHTML = `
      <p class="dash-section-title">${esc(t("dash.allOpps"))}</p>
      <table class="dash-table">
        <thead><tr>
          <th>${esc(t("dash.oppTitle"))}</th>
          <th>${esc(t("dash.organization"))}</th>
          <th>${esc(t("dash.createdBy"))}</th>
          <th>${esc(t("admin.form.deadline"))}</th>
          <th>${esc(t("dash.status"))}</th>
          <th>${esc(t("dash.views"))}</th>
          <th>${esc(t("dash.clicks"))}</th>
          <th>${esc(t("dash.applied"))}</th>
          <th></th>
        </tr></thead>
        <tbody id="allOppsBody"></tbody>
      </table>`;
    const body = document.getElementById("allOppsBody");
    all.forEach(o => {
      const st = oppStatus(o);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="${esc(t("dash.oppTitle"))}">${esc(o.title)}</td>
        <td data-label="${esc(t("dash.organization"))}">${esc(o.organization_name || "—")}</td>
        <td data-label="${esc(t("dash.createdBy"))}">${esc(o.created_by_name || "—")}</td>
        <td data-label="${esc(t("admin.form.deadline"))}">${o.deadline ? esc(o.deadline) : "—"}</td>
        <td data-label="${esc(t("dash.status"))}"><span class="status-badge ${st}">${esc(t("admin.status." + st))}</span></td>
        <td data-label="${esc(t("dash.views"))}">${o.views || 0}</td>
        <td data-label="${esc(t("dash.clicks"))}">${o.apply_clicks || 0}</td>
        <td data-label="${esc(t("dash.applied"))}">${o.applied_count || 0}</td>
        <td data-label="">
          <button class="btn btn-outline btn-small" data-a="edit">${data.lang === "ar" ? "تعديل" : "Edit"}</button>
          <button class="btn btn-danger btn-small" data-a="del">${data.lang === "ar" ? "حذف" : "Delete"}</button>
        </td>`;
      tr.querySelector('[data-a="edit"]').addEventListener("click", () => {
        pendingEditOpp = o;
        loadDashSection("add");
      });
      tr.querySelector('[data-a="del"]').addEventListener("click", async () => {
        if (!confirm(t("toast.deleteConfirm", { title: o.title }))) return;
        try {
          await api(`/opportunities/${o.id}`, { method: "DELETE" });
          showToast(t("toast.oppDeleted"));
          renderAllOpportunities();
        } catch (err) { showToast(err.message || t("toast.needBackend")); }
      });
      body.appendChild(tr);
    });
  } catch (err) {
    dashContent.innerHTML = `<p class="dash-empty">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* My opportunities (admin): only the current admin's, with permitted actions. */
async function renderMyOpps(){
  dashContent.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const mine = await api("/opportunities/mine");
    if (!mine.length) { dashContent.innerHTML = `<p class="dash-empty">${esc(t("admin.myOpps.empty"))}</p>`; return; }
    dashContent.innerHTML = `
      <p class="dash-section-title">${esc(t("dash.myOpps"))}</p>
      <table class="dash-table">
        <thead><tr>
          <th>${esc(t("dash.oppTitle"))}</th>
          <th>${esc(t("dash.organization"))}</th>
          <th>${esc(t("admin.form.deadline"))}</th>
          <th>${esc(t("dash.status"))}</th>
          <th>${esc(t("dash.posted"))}</th>
          <th>${esc(t("dash.views"))}</th>
          <th>${esc(t("dash.clicks"))}</th>
          <th>${esc(t("dash.applied"))}</th>
          <th></th>
        </tr></thead>
        <tbody id="myOppsBody"></tbody>
      </table>`;
    const body = document.getElementById("myOppsBody");
    mine.forEach(o => {
      const st = oppStatus(o);
      const canEdit = hasPerm("edit_own_opportunity");
      const canDel = hasPerm("delete_own_opportunity");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="${esc(t("dash.oppTitle"))}">${esc(o.title)}</td>
        <td data-label="${esc(t("dash.organization"))}">${esc(o.organization_name || "—")}</td>
        <td data-label="${esc(t("admin.form.deadline"))}">${o.deadline ? esc(o.deadline) : "—"}</td>
        <td data-label="${esc(t("dash.status"))}"><span class="status-badge ${st}">${esc(t("admin.status." + st))}</span></td>
        <td data-label="${esc(t("dash.posted"))}">${o.created_at ? esc(String(o.created_at).slice(0, 10)) : "—"}</td>
        <td data-label="${esc(t("dash.views"))}">${o.views || 0}</td>
        <td data-label="${esc(t("dash.clicks"))}">${o.apply_clicks || 0}</td>
        <td data-label="${esc(t("dash.applied"))}">${o.applied_count || 0}</td>
        <td data-label="">
          <select class="btn-small" data-status="${o.id}">
            <option value="published" ${o.status === "published" ? "selected" : ""}>${data.lang === "ar" ? "منشورة" : "Published"}</option>
            <option value="hidden" ${o.status === "hidden" ? "selected" : ""}>${data.lang === "ar" ? "مخفية" : "Hidden"}</option>
            <option value="archived" ${o.status === "archived" ? "selected" : ""}>${data.lang === "ar" ? "مؤرشفة" : "Archived"}</option>
          </select>
          ${canEdit ? `<button class="btn btn-outline btn-small" data-a="edit">${data.lang === "ar" ? "تعديل" : "Edit"}</button>` : ""}
          ${canDel ? `<button class="btn btn-danger btn-small" data-a="del">${data.lang === "ar" ? "حذف" : "Delete"}</button>` : ""}
        </td>`;
      tr.querySelector(`[data-status="${o.id}"]`).addEventListener("change", async (ev) => {
        try {
          await api(`/opportunities/${o.id}`, { method: "PUT", body: JSON.stringify({ status: ev.target.value }) });
          showToast(t("toast.oppUpdated"));
          renderMyOpps(); render();
        } catch (err) { showToast(err.message || t("toast.needBackend")); }
      });
      if (canEdit) tr.querySelector('[data-a="edit"]').addEventListener("click", () => {
        pendingEditOpp = o;
        loadDashSection("add");
      });
      if (canDel) tr.querySelector('[data-a="del"]').addEventListener("click", async () => {
        if (!confirm(t("toast.deleteConfirm", { title: o.title }))) return;
        try {
          await api(`/opportunities/${o.id}`, { method: "DELETE" });
          showToast(t("toast.oppDeleted"));
          renderMyOpps(); render();
        } catch (err) { showToast(err.message || t("toast.needBackend")); }
      });
      body.appendChild(tr);
    });
  } catch (err) {
    dashContent.innerHTML = `<p class="dash-empty">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* Owner: pending admin applications with Approve/Reject. */
async function renderApplicationsDash(){
  dashContent.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const apps = await api("/auth/admin-applications");
    if (!apps.length) { dashContent.innerHTML = `<p class="dash-empty">${esc(t("admin.applications.empty"))}</p>`; return; }
    dashContent.innerHTML = `<p class="dash-section-title">${esc(t("dash.applications"))}</p>`;
    apps.forEach(a => {
      const el = document.createElement("div");
      el.className = "dash-app-item";
      el.innerHTML = `
        <div>
          <h4>${esc(a.full_name)}</h4>
          <p>${esc(a.email)}${a.organization ? ` · ${esc(a.organization)}` : ""}</p>
          ${a.website ? `<p>${esc(a.website)}</p>` : ""}
          ${a.position ? `<p>${esc(a.position)}</p>` : ""}
          ${a.reason ? `<p>${esc(a.reason)}</p>` : ""}
          <p>${esc(t("dash.appliedOn", { date: String(a.created_at).slice(0, 10) }))}</p>
        </div>
        <div class="dash-app-actions">
          <button class="btn btn-primary btn-small" data-aa="approve">${esc(t("admin.approve"))}</button>
          <button class="btn btn-danger btn-small" data-aa="reject">${esc(t("admin.reject"))}</button>
        </div>`;
      el.querySelector('[data-aa="approve"]').addEventListener("click", async () => {
        try { await api(`/auth/admin-applications/${a.id}/approve`, { method: "POST" }); showToast(t("admin.approved")); renderApplicationsDash(); }
        catch (err) { showToast(err.message || t("toast.needBackend")); }
      });
      el.querySelector('[data-aa="reject"]').addEventListener("click", async () => {
        try { await api(`/auth/admin-applications/${a.id}/reject`, { method: "POST" }); showToast(t("admin.rejected")); renderApplicationsDash(); }
        catch (err) { showToast(err.message || t("toast.needBackend")); }
      });
      dashContent.appendChild(el);
    });
  } catch (err) {
    dashContent.innerHTML = `<p class="dash-empty">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* Owner: admins table + permission management. */
async function renderAdminsDash(){
  dashContent.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const [admins, opps] = await Promise.all([api("/auth/admins"), api("/opportunities/all")]);
    const countBy = {};
    opps.forEach(o => { if (o.created_by) countBy[o.created_by] = (countBy[o.created_by] || 0) + 1; });
    dashContent.innerHTML = `
      <p class="dash-section-title">${esc(t("dash.admins"))}</p>
      <table class="dash-table">
        <thead><tr>
          <th>${esc(t("auth.name"))}</th><th>${esc(t("auth.email"))}</th>
          <th>${esc(t("dash.role"))}</th><th>${esc(t("dash.status"))}</th>
          <th>${esc(t("dash.permissions"))}</th><th>${esc(t("dash.oppCount"))}</th><th></th>
        </tr></thead>
        <tbody id="adminsBody"></tbody>
      </table>`;
    const body = document.getElementById("adminsBody");
    admins.forEach(a => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="${esc(t("auth.name"))}">${esc(a.full_name || a.email)}</td>
        <td data-label="${esc(t("auth.email"))}">${esc(a.email)}</td>
        <td data-label="${esc(t("dash.role"))}">${esc(a.role)}</td>
        <td data-label="${esc(t("dash.status"))}">${a.is_active ? t("dash.active") : t("dash.inactive")}</td>
        <td data-label="${esc(t("dash.permissions"))}" style="font-size:11px">${esc((a.permissions || []).join(", ") || "—")}</td>
        <td data-label="${esc(t("dash.oppCount"))}">${countBy[a.id] || 0}</td>
        <td data-label="">
          <button class="btn btn-outline btn-small" data-a="perm">${data.lang === "ar" ? "صلاحيات" : "Permissions"}</button>
          <button class="btn btn-small ${a.is_active ? "btn-danger" : "btn-primary"}" data-a="toggle">${a.is_active ? t("dash.deactivate") : t("dash.activate")}</button>
        </td>`;
      tr.querySelector('[data-a="perm"]').addEventListener("click", () => {
        const perms = (a.permissions || []).slice();
        const newPerms = prompt(`${t("dash.permissions")}:\ncreate_opportunity, edit_own_opportunity, delete_own_opportunity, hide_own_opportunity, edit_any_opportunity, delete_any_opportunity, hide_any_opportunity, review_opportunities, manage_users, manage_admin_applications, manage_admins, view_reports\n\n${data.lang === "ar" ? "افصل بفاصلة" : "comma-separated"}`, perms.join(", "));
        if (newPerms === null) return;
        const list = newPerms.split(",").map(s => s.trim()).filter(Boolean);
        api(`/auth/admins/${a.id}`, { method: "PATCH", body: JSON.stringify({ permissions: list }) })
          .then(() => { showToast(t("toast.oppUpdated")); renderAdminsDash(); })
          .catch(err => showToast(err.message || t("toast.needBackend")));
      });
      tr.querySelector('[data-a="toggle"]').addEventListener("click", async () => {
        try {
          await api(`/auth/admins/${a.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !a.is_active }) });
          showToast(t("toast.oppUpdated"));
          renderAdminsDash();
        } catch (err) { showToast(err.message || t("toast.needBackend")); }
      });
      body.appendChild(tr);
    });
  } catch (err) {
    dashContent.innerHTML = `<p class="dash-empty">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* Owner: registered personal users. */
async function renderUsersDash(){
  dashContent.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const users = await api("/auth/users");
    if (!users.length) { dashContent.innerHTML = `<p class="dash-empty">No users yet.</p>`; return; }
    dashContent.innerHTML = `
      <p class="dash-section-title">${esc(t("dash.users"))}</p>
      <table class="dash-table">
        <thead><tr><th>${esc(t("auth.name"))}</th><th>${esc(t("auth.email"))}</th><th>${esc(t("dash.role"))}</th><th>${esc(t("dash.status"))}</th></tr></thead>
        <tbody>${users.map(u => `<tr>
          <td data-label="${esc(t("auth.name"))}">${esc(u.full_name || "—")}</td>
          <td data-label="${esc(t("auth.email"))}">${esc(u.email)}</td>
          <td data-label="${esc(t("dash.role"))}">${esc(u.role)}</td>
          <td data-label="${esc(t("dash.status"))}">${u.is_active ? t("dash.active") : t("dash.inactive")}</td>
        </tr>`).join("")}</tbody>
      </table>`;
  } catch (err) {
    dashContent.innerHTML = `<p class="dash-empty">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* Owner: organizations list. */
async function renderOrganizationsDash(){
  dashContent.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const orgs = await api("/auth/organizations");
    dashContent.innerHTML = `
      <p class="dash-section-title">${esc(t("dash.organizations"))}</p>
      <form class="dash-form" id="orgForm" style="margin-bottom:16px">
        <div class="dash-form-row">
          <label>${esc(t("dash.orgName"))}<input type="text" id="orgName" required></label>
          <label>${esc(t("auth.website"))}<input type="url" id="orgWebsite"></label>
        </div>
        <div class="dash-actions"><button class="btn btn-primary" type="submit">${esc(t("dash.addOrg"))}</button></div>
      </form>
      <table class="dash-table">
        <thead><tr><th>${esc(t("dash.orgName"))}</th><th>${esc(t("auth.website"))}</th></tr></thead>
        <tbody>${(orgs || []).map(o => `<tr>
          <td data-label="${esc(t("dash.orgName"))}">${esc(o.name)}</td>
          <td data-label="${esc(t("auth.website"))}">${esc(o.website || "—")}</td>
        </tr>`).join("") || `<tr><td colspan="2" class="dash-empty">${esc(t("dash.noOrgs"))}</td></tr>`}</tbody>
      </table>`;
    document.getElementById("orgForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api("/auth/organizations", { method: "POST", body: JSON.stringify({
          name: document.getElementById("orgName").value.trim(),
          website: document.getElementById("orgWebsite").value.trim(),
        }) });
        showToast(t("toast.oppAdded"));
        renderOrganizationsDash();
      } catch (err) { showToast(err.message || t("toast.needBackend")); }
    });
  } catch (err) {
    dashContent.innerHTML = `<p class="dash-empty">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* Owner: reports/analytics. */
async function renderReportsDash(){
  dashContent.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const a = await api("/analytics");
    const row = (label, value) => `<div class="dash-app-item"><h4>${esc(label)}</h4><p class="dash-empty">${value}</p></div>`;
    const saved = (a.most_saved || []).map(x => `${esc(x.title)} — ${x.count}`).join("<br>") || t("admin.analytics.empty");
    const applied = (a.most_applied || []).map(x => `${esc(x.title)} — ${x.count}`).join("<br>") || t("admin.analytics.empty");
    const clicked = (a.most_clicked || []).map(x => `${esc(x.title)} — ${x.count}`).join("<br>") || t("admin.analytics.empty");
    const perAdmin = (a.per_admin || []).map(x => `${esc(x.admin_name)} — ${x.added_count} ${t("dash.oppCount").toLowerCase()}`).join("<br>") || t("admin.analytics.empty");
    dashContent.innerHTML = `
      <p class="dash-section-title">${esc(t("dash.reports"))}</p>
      ${row(t("admin.analytics.mostSaved"), saved)}
      ${row(t("admin.analytics.mostApplied"), applied)}
      ${row(t("admin.analytics.mostClicked"), clicked)}
      ${row(t("admin.analytics.perAdmin"), perAdmin)}`;
  } catch (err) {
    dashContent.innerHTML = `<p class="dash-empty">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* Owner: settings placeholder. */
async function renderSettingsDash(){
  dashContent.innerHTML = `
    <p class="dash-section-title">${esc(t("dash.settings"))}</p>
    <div class="dash-app-item">
      <div>
        <h4>DARB|درب</h4>
        <p>${esc(t("dash.settingsInfo"))}</p>
        <p>${esc(t("dash.ownerRole"))}: ${esc(data.currentUser?.email || "")}</p>
      </div>
    </div>`;
}

function saveLang(){ localStorage.setItem("darb_lang", data.lang); }
function saveOnboarded(){ localStorage.setItem("darb_onboarded", "1"); }

/* Map a backend opportunity to the card shape the renderer expects. */
function mapOpp(o) {
  return {
    id: o.id,
    title: o.title,
    desc: o.description,
    category: o.category,
    location: o.location,
    mode: o.mode,
    duration: o.duration,
    paid: o.funding === "paid",
    age: o.age,
    deadline: o.deadline,
    link: o.apply_url,
    certificate: o.certificate,
    applyClicks: o.apply_clicks,
    views: o.views || 0,
    appliedCount: o.applied_count || 0,
    createdByName: o.created_by_name,
    fields: o.fields || [],
    is_active: o.is_active,
    status: o.status || (o.is_active ? "published" : "hidden"),
  };
}

/* =========================================================
   i18n — en + ar catalog (identical to before).
   ========================================================= */
const I18N = {
  en: {
    "nav.about":"about", "nav.contact":"contact", "nav.account":"Account", "common.logout":"Logout",
    "onboarding.text":"Browse without an account, or sign up to save opportunities, track what you've applied to, and share your experiences.",
    "hero.tagline":"BROWSE YOUR PATH", "hero.sub":"Your future starts now",
    "hero.chipFast":"Deadline alerts", "hero.chipPersonal":"Made for you", "hero.chipRewards":"Points & badges",
    "search.placeholder":"Search for opportunities, programs, and more…", "search.btn":"Search",
    "search.navPlaceholder":"Search…", "search.results":"{n} opportunities", "search.resultsOne":"1 opportunity",
    "footer.categories":"Categories", "footer.aboutTitle":"About DARB", "footer.aboutText":"A volunteer project gathering every Iraqi youth opportunity in one place.",
    "filter.modeAll":"all modes", "filter.modeOnline":"online", "filter.modeInPerson":"in-person", "filter.modeHybrid":"hybrid",
    "filter.fundingAll":"all", "filter.fundingCharged":"paid", "filter.fundingFree":"free",
    "filter.ageAll":"all ages", "filter.certAll":"certificate: all", "filter.certYes":"has certificate", "filter.certNo":"no certificate",
    "filter.locationAll":"all locations", "filter.durationAll":"all durations",
    "filter.durationShort":"short (1 week or less)", "filter.durationMedium":"medium (up to 1 month)", "filter.durationLong":"long (over 1 month)",
    "filter.sortNewest":"sort: newest", "filter.sortDeadline":"sort: deadline soonest",
    "view.browse":"Browse", "view.saved":"Saved", "view.applied":"Applied",
    "browse.label":"Browse", "browse.title":"Opportunity categories",
    "empty.text":"No matches yet — but there are lots of opportunities out there. Try clearing a filter or searching a different keyword.",
    "empty.clear":"Clear filters",
    "footer.tagline":"Every opportunity, one place.", "footer.rights":"All rights reserved.",
    "footer.privacy":"Privacy & terms", "lang.toggle":"العربية",
    "auth.loginTitle":"Login", "auth.loginSub":"Welcome back — log in to save and share.",
    "auth.loginTab":"Login", "auth.registerTab":"Register",
    "auth.email":"Email", "auth.password":"Password", "auth.passwordMin":"Password (min 8 characters)",
    "auth.name":"Full name", "auth.nickname":"Nickname (shown publicly)", "auth.loginBtn":"Log in", "auth.registerBtn":"Create account",
    "auth.adminApplyTab":"Admin", "auth.adminApplyTab2":"Apply", "auth.adminRegisterTab":"Register", "auth.adminLoginTab":"Login",
    "auth.adminApplySub":"Apply for admin access — an existing admin will review your application. No account is created until it is approved.",
    "auth.organization":"Organization / Provider", "auth.website":"Website", "auth.position":"Position / role", "auth.reason":"Why do you need admin access?",
    "auth.adminApplyBtn":"Apply for admin", "auth.adminApplyInvalid":"Please fill in all fields.",
    "auth.adminRegisterSub":"Your application must be approved first. Once approved, create your admin account here.",
    "auth.adminRegisterBtn":"Create admin account",
    "auth.adminLoginSub":"Log in with your approved admin account.", "auth.adminLoginBtn":"Log in as admin",
    "auth.hint":"Admin accounts require an approved application.",
    "privacy.title":"Privacy & terms — in plain language",
    "admin.title":"Admin panel", "admin.sub":"Add, edit or delete opportunities — they appear on the page instantly.",
    "admin.tabDashboard":"Dashboard", "admin.tabManage":"Add opportunity", "admin.tabMyOpps":"My opportunities", "admin.tabImport":"CSV import", "admin.tabAnalytics":"Analytics", "admin.tabFlags":"Flags", "admin.tabApplications":"Applications", "admin.tabUsers":"Users", "admin.tabOrgs":"Organizations", "admin.tabAdmins":"Admins",
    "admin.dashboardWelcome":"Welcome, {name}", "admin.dashTotal":"Total", "admin.dashVisible":"Visible", "admin.dashHidden":"Hidden", "admin.dashExpired":"Expired",
    "admin.myOpps.empty":"You haven't posted any opportunities yet.",
    "admin.addedBy":"Added by {name}",
    "admin.status.visible":"Visible", "admin.status.hidden":"Hidden", "admin.status.expired":"Expired",
    "admin.admins.empty":"No admins yet.",
    "admin.applications.empty":"No pending admin applications.",
    "admin.approve":"Approve", "admin.reject":"Reject", "admin.approved":"Application approved — the applicant can now register their admin account.", "admin.rejected":"Application rejected.",
    "admin.applyPending":"Your admin application is pending approval.", "admin.applyRejected":"Your admin application was not approved.",
    "admin.applySubmitted":"Application submitted — an admin will review it.",
    "admin.applyNotApproved":"Your application has not been approved yet.",
    "admin.registerSuccess":"Admin account created — welcome!",
    "dash.ownerTitle":"Owner Dashboard", "dash.adminTitle":"Admin Dashboard",
    "dash.ownerNav":"Owner dashboard", "dash.adminNav":"Admin dashboard",
    "dash.overview":"Overview", "dash.add":"Add Opportunity", "dash.allOpps":"All Opportunities",
    "dash.myOpps":"My Opportunities", "dash.applications":"Admin Applications", "dash.admins":"Admins",
    "dash.users":"Users", "dash.organizations":"Organizations / NGOs", "dash.reports":"Reports",
    "dash.settings":"Settings", "dash.welcome":"Welcome, {name}",
    "dash.totalUsers":"Total users", "dash.totalAdmins":"Total admins", "dash.pendingApps":"Pending applications",
    "dash.published":"Published", "dash.hidden":"Hidden", "dash.expired":"Expired",
    "dash.organization":"Organization / Provider", "dash.status":"Status", "dash.posted":"Posted",
    "dash.oppTitle":"Opportunity", "dash.createdBy":"Created by", "dash.role":"Role",
    "dash.active":"Active", "dash.inactive":"Inactive", "dash.permissions":"Permissions",
    "dash.oppCount":"Opportunities", "dash.activate":"Activate", "dash.deactivate":"Deactivate",
    "dash.views":"Views", "dash.clicks":"Clicks", "dash.applied":"Applications",
    "dash.fields":"Field / Tags", "browse.fieldLabel":"Field",
    "dash.appliedOn":"Applied on {date}", "dash.orgName":"Organization name", "dash.addOrg":"Add organization",
    "dash.noOrgs":"No organizations yet.", "dash.settingsInfo":"System management settings for the site owner.",
    "dash.ownerRole":"Owner",
    "toast.adminExists":"That email is already registered." ,
    "admin.form.title":"Title", "admin.form.desc":"Description", "admin.form.category":"Category",
    "admin.form.location":"Location", "admin.form.mode":"Mode", "admin.form.duration":"Duration",
    "admin.form.funding":"Funding", "admin.form.age":"Age group", "admin.form.deadline":"Deadline",
    "admin.form.link":"Apply link", "admin.form.certificate":"Offers a certificate",
    "admin.form.add":"Add opportunity", "admin.form.cancel":"Cancel edit",
    "admin.import.hint":"Paste rows with headers: title, description, category, location, mode, duration, funding (paid/free), age (13-15/15-18/+18/all), deadline (YYYY-MM-DD), link, certificate (yes/no). One row per opportunity.",
    "admin.import.btn":"Import CSV",
    "reminder.text":"You have {n} saved opportunity closing soon.",
    "reminder.view":"View",
    "saved.title":"Saved opportunities", "applied.title":"Opportunities you applied to",
    "card.saved":"Saved", "card.save":"Save", "card.applied":"Applied", "card.details":"Details",
    "card.closed":"Closed", "card.closingSoon":"Closing soon", "card.closes":"Closes",
    "card.closesToday":"Closes today", "card.closesTomorrow":"Closes tomorrow", "card.closesInDays":"Closes in {n} days",
    "detail.share":"Copy link", "toast.linkCopied":"Link copied — share it anywhere.",
    "view.surprise":"Surprise me",
    "theme.dark":"Dark mode", "theme.light":"Light mode",
    "admin.export.btn":"Export CSV",
    "profile.title":"Your profile", "profile.points":"{n} points", "profile.badges":"Badges",
    "profile.noBadges":"Complete actions to unlock badges.", "profile.avatar":"Your avatar",
    "profile.emailLabel":"Email", "profile.fullName":"Full name", "profile.nicknameLabel":"Nickname",
    "profile.role":"Role", "profile.roleUser":"User", "profile.roleAdmin":"Admin",
    "profile.saveBtn":"Save changes",
    "profile.avatarBtn":"Change avatar", "profile.saved":"Profile updated.",
    "profile.nicknameRequired":"Nickname can't be empty.", "profile.nicknameTooLong":"Nickname is too long (64 max).",
    "badge.firstSave":"First save", "badge.firstSaveDesc":"Saved your first opportunity",
    "badge.firstApplied":"First apply", "badge.firstAppliedDesc":"Marked your first application",
    "badge.firstStory":"Storyteller", "badge.firstStoryDesc":"Shared your first experience",
    "badge.deadlineMaster":"Deadline master", "badge.deadlineMasterDesc":"Applied before a deadline",
    "badge.closingSoonSave":"Clutch saver", "badge.closingSoonSaveDesc":"Saved something closing this week",
    "badge.explorer":"Explorer", "badge.explorerDesc":"Opened 10+ opportunities",
    "recs.madeForYou":"Made for you", "recs.closingThisWeek":"Closing this week",
    "recs.none":"No matches yet — check back soon.",
    "detail.apply":"Apply now", "detail.save":"Save for later", "detail.saved":"Saved",
    "detail.applied":"Applied", "detail.markApplied":"I applied", "detail.unmarkApplied":"Applied ✓",
    "detail.stories":"Stories from participants", "detail.storiesEmpty":"No one has shared an experience yet. Be the first!",
    "detail.storyPh":"What was it like? A few sentences is plenty.",
    "detail.postStory":"Post your story", "detail.updateStory":"Update story", "detail.deleteStory":"Delete",
    "detail.loginToShare":"Log in to share your experience.",
    "story.helpful":"Helpful", "story.you":"(you)", "story.report":"Report", "story.reported":"Reported — thanks, we'll review it.",
    "toast.needLogin":"Log in to do that.", "toast.loggedOut":"Logged out. See you soon!",
    "toast.removedSaved":"Removed from saved.", "toast.saved":"Saved! Find it under the Saved tab.",
    "toast.applied":"Marked as applied — good luck!", "toast.unapplied":"Marked as not applied.",
    "toast.storyUpdated":"Story updated.", "toast.storyPosted":"Story posted — thanks for sharing!",
    "toast.storyDeleted":"Story deleted.", "toast.storyNeedsText":"Write a few words first.",
    "toast.adminRequired":"Admin account required.", "toast.wrongCreds":"Wrong email or password.",
    "toast.regInvalid":"Please fill in all fields (password min 8 chars).",
    "toast.regTaken":"That email is already registered.",
    "toast.oppRequired":"Title, description and link are required.",
    "toast.oppUpdated":"Opportunity updated.", "toast.oppAdded":"Opportunity added!",
    "toast.oppDeleted":"Opportunity deleted.", "toast.csvBad":"Couldn't parse that CSV — check the format.",
    "toast.csvImported":"Imported {n} opportunities.",
    "toast.deleteConfirm":"Delete \"{title}\"? This also removes its stories.",
    "toast.needBackend":"Couldn't reach the server — is the backend running?",
    "common.loading":"Loading…",
    "admin.analytics.title":"What youth are interested in",
    "admin.analytics.mostSaved":"Most saved", "admin.analytics.mostApplied":"Most applied",
    "admin.analytics.mostClicked":"Most-clicked apply links", "admin.analytics.empty":"No data yet — activity will show here.",
    "admin.analytics.perAdmin":"Added by each admin",
    "admin.flags.title":"Reported stories", "admin.flags.empty":"No reports right now. Nice and clean!",
    "admin.flags.keep":"Keep", "admin.flags.remove":"Remove story",
    "admin.flags.removed":"Story removed.", "admin.flags.kept":"Story kept — flags cleared.",
    "privacy.p1":"We keep things simple: this site stores the minimum data needed to work — your name, email, saved items, applied items, and stories you choose to share.",
    "privacy.p2":"Your full name is never shown publicly. Stories show only your nickname (or first name), and there are no public profiles or contact details.",
    "privacy.p3":"Anything you post in a story is visible to other visitors of that opportunity. Please don't share personal contact info — others can flag a story and we'll review it.",
    "privacy.p4":"Your data lives on a secure server. Passwords are stored hashed, never in plaintext.",
    "privacy.p5":"If something feels off, you can report a story, delete your own content anytime, and stop using the site whenever you like.",
  },
  ar: {
    "nav.about":"من نحن", "nav.contact":"اتصل بنا", "nav.account":"الحساب", "common.logout":"خروج",
    "onboarding.text":"تصفّح بدون حساب، أو سجّل لحفظ الفرص وتتبع ما قدّمت عليه ومشاركة تجاربك.",
    "hero.tagline":"تصفّح طريقك", "hero.sub":"مستقبلك يبدأ الآن",
    "hero.chipFast":"تنبيهات المواعيد", "hero.chipPersonal":"مناسبة لك", "hero.chipRewards":"نقاط وشارات",
    "search.placeholder":"ابحث عن فرص وبرامج والمزيد…", "search.btn":"بحث",
    "search.navPlaceholder":"ابحث…", "search.results":"{n} فرصة", "search.resultsOne":"فرصة واحدة",
    "footer.categories":"التصنيفات", "footer.aboutTitle":"عن درب", "footer.aboutText":"مشروع تطوعي يجمع كل فرص الشباب العراقي في مكان واحد.",
    "filter.modeAll":"كل الطرق", "filter.modeOnline":"أونلاين", "filter.modeInPerson":"حضوري", "filter.modeHybrid":"هجين",
    "filter.fundingAll":"الكل", "filter.fundingCharged":"مدفوع", "filter.fundingFree":"مجاني",
    "filter.ageAll":"كل الأعمار", "filter.certAll":"الشهادة: الكل", "filter.certYes":"يوجد شهادة", "filter.certNo":"بدون شهادة",
    "filter.locationAll":"كل المدن", "filter.durationAll":"كل المدد",
    "filter.durationShort":"قصيرة (أسبوع فأقل)", "filter.durationMedium":"متوسطة (شهر فأقل)", "filter.durationLong":"طويلة (أكثر من شهر)",
    "filter.sortNewest":"الأحدث أولاً", "filter.sortDeadline":"الأقرب موعداً",
    "view.browse":"تصفّح", "view.saved":"المحفوظة", "view.applied":"قدّمت",
    "browse.label":"تصفّح", "browse.title":"تصنيفات الفرص",
    "empty.text":"لا توجد نتائج مطابقة حالياً — لكن هناك الكثير من الفرص. جرّب مسح فلتر أو البحث بكلمة مختلفة.",
    "empty.clear":"مسح الفلاتر",
    "footer.tagline":"كل فرصة، في مكان واحد.", "footer.rights":"جميع الحقوق محفوظة.",
    "footer.privacy":"الخصوصية والشروط", "lang.toggle":"English",
    "auth.loginTitle":"تسجيل الدخول", "auth.loginSub":"مرحباً بعودتك — سجّل للحفظ والمشاركة.",
    "auth.loginTab":"دخول", "auth.registerTab":"إنشاء حساب",
    "auth.email":"البريد الإلكتروني", "auth.password":"كلمة المرور", "auth.passwordMin":"كلمة المرور (8 أحرف على الأقل)",
    "auth.name":"الاسم الكامل", "auth.nickname":"الاسم المستعار (يظهر علناً)", "auth.loginBtn":"دخول", "auth.registerBtn":"إنشاء حساب",
    "auth.adminApplyTab":"المشرف", "auth.adminApplyTab2":"تقديم طلب", "auth.adminRegisterTab":"إنشاء حساب", "auth.adminLoginTab":"دخول",
    "auth.adminApplySub":"قدّم طلباً للوصول كمسؤول — سيراجع أحد المشرفين طلبك. لن يُنشأ حساب حتى تتم الموافقة.",
    "auth.organization":"المنظمة / مقدّم الخدمة", "auth.website":"الموقع الإلكتروني", "auth.position":"المنصب / الدور", "auth.reason":"لماذا تحتاج صلاحيات المشرف؟",
    "auth.adminApplyBtn":"تقديم الطلب", "auth.adminApplyInvalid":"يرجى ملء جميع الحقول.",
    "auth.adminRegisterSub":"يجب الموافقة على طلبك أولاً. بعد الموافقة، أنشئ حساب المشرف هنا.",
    "auth.adminRegisterBtn":"إنشاء حساب المشرف",
    "auth.adminLoginSub":"سجّل الدخول بحساب المشرف المعتمد.", "auth.adminLoginBtn":"دخول كمشرف",
    "auth.hint":"حسابات المشرف تتطلب طلباً معتمداً.",
    "privacy.title":"الخصوصية والشروط — بلغة واضحة",
    "admin.title":"لوحة التحكم", "admin.sub":"أضف أو عدّل أو احذف الفرص — تظهر في الصفحة فوراً.",
    "admin.tabDashboard":"الرئيسية", "admin.tabManage":"إضافة فرصة", "admin.tabMyOpps":"فرصي", "admin.tabImport":"استيراد CSV", "admin.tabAnalytics":"التحليلات", "admin.tabFlags":"البلاغات", "admin.tabApplications":"الطلبات", "admin.tabUsers":"المستخدمون", "admin.tabOrgs":"المنظمات", "admin.tabAdmins":"المشرفون",
    "admin.dashboardWelcome":"مرحباً، {name}", "admin.dashTotal":"الإجمالي", "admin.dashVisible":"ظاهرة", "admin.dashHidden":"مخفية", "admin.dashExpired":"منتهية",
    "admin.myOpps.empty":"لم تنشر أي فرص بعد.",
    "admin.addedBy":"أُضيفت بواسطة {name}",
    "admin.status.visible":"ظاهرة", "admin.status.hidden":"مخفية", "admin.status.expired":"منتهية",
    "admin.admins.empty":"لا يوجد مشرفون بعد.",
    "admin.applications.empty":"لا توجد طلبات مشرف معلّقة.",
    "admin.approve":"موافقة", "admin.reject":"رفض", "admin.approved":"تمت الموافقة على الطلب — يمكن لمقدّم الطلب الآن إنشاء حساب المشرف.", "admin.rejected":"تم رفض الطلب.",
    "admin.applyPending":"طلبك للحصول على صلاحيات المشرف قيد المراجعة.", "admin.applyRejected":"لم تتم الموافقة على طلبك.",
    "admin.applySubmitted":"تم إرسال الطلب — سيراجعه أحد المشرفين.",
    "admin.applyNotApproved":"لم تتم الموافقة على طلبك بعد.",
    "admin.registerSuccess":"تم إنشاء حساب المشرف — مرحباً!",
    "dash.ownerTitle":"لوحة المالك", "dash.adminTitle":"لوحة المشرف",
    "dash.ownerNav":"لوحة المالك", "dash.adminNav":"لوحة المشرف",
    "dash.overview":"نظرة عامة", "dash.add":"إضافة فرصة", "dash.allOpps":"كل الفرص",
    "dash.myOpps":"فرصي", "dash.applications":"طلبات المشرفين", "dash.admins":"المشرفون",
    "dash.users":"المستخدمون", "dash.organizations":"المنظمات", "dash.reports":"التقارير",
    "dash.settings":"الإعدادات", "dash.welcome":"مرحباً، {name}",
    "dash.totalUsers":"إجمالي المستخدمين", "dash.totalAdmins":"إجمالي المشرفين", "dash.pendingApps":"الطلبات المعلّقة",
    "dash.published":"منشورة", "dash.hidden":"مخفية", "dash.expired":"منتهية",
    "dash.organization":"المنظمة / مقدّم الخدمة", "dash.status":"الحالة", "dash.posted":"تاريخ النشر",
    "dash.oppTitle":"الفرصة", "dash.createdBy":"أُنشئت بواسطة", "dash.role":"الدور",
    "dash.active":"نشط", "dash.inactive":"غير نشط", "dash.permissions":"الصلاحيات",
    "dash.oppCount":"الفرص", "dash.activate":"تفعيل", "dash.deactivate":"تعطيل",
    "dash.views":"المشاهدات", "dash.clicks":"النقرات", "dash.applied":"الطلبات",
    "dash.fields":"المجال / الوسوم", "browse.fieldLabel":"المجال",
    "dash.appliedOn":"قدّم في {date}", "dash.orgName":"اسم المنظمة", "dash.addOrg":"إضافة منظمة",
    "dash.noOrgs":"لا توجد منظمات بعد.", "dash.settingsInfo":"إعدادات إدارة النظام لمالك الموقع.",
    "dash.ownerRole":"المالك",
    "toast.adminExists":"هذا البريد مسجّل بالفعل.",
    "admin.form.title":"العنوان", "admin.form.desc":"الوصف", "admin.form.category":"التصنيف",
    "admin.form.location":"المكان", "admin.form.mode":"طريقة الحضور", "admin.form.duration":"المدة",
    "admin.form.funding":"التمويل", "admin.form.age":"الفئة العمرية", "admin.form.deadline":"الموعد النهائي",
    "admin.form.link":"رابط التقديم", "admin.form.certificate":"توجد شهادة",
    "admin.form.add":"إضافة فرصة", "admin.form.cancel":"إلغاء التعديل",
    "admin.import.hint":"الصق صفوفاً بالعناوين: title, description, category, location, mode, duration, funding (paid/free), age (13-15/15-18/+18/all), deadline (YYYY-MM-DD), link, certificate (yes/no). فرصة واحدة لكل صف.",
    "admin.import.btn":"استيراد CSV",
    "reminder.text":"لديك {n} فرصة محفوظة تنتهي قريباً.",
    "reminder.view":"عرض",
    "saved.title":"الفرص المحفوظة", "applied.title":"الفرص التي قدّمت عليها",
    "card.saved":"محفوظة", "card.save":"احفظ", "card.applied":"قدّمت", "card.details":"التفاصيل",
    "card.closed":"مغلق", "card.closingSoon":"ينتهي قريباً", "card.closes":"ينتهي",
    "card.closesToday":"ينتهي اليوم", "card.closesTomorrow":"ينتهي غداً", "card.closesInDays":"ينتهي خلال {n} أيام",
    "detail.share":"نسخ الرابط", "toast.linkCopied":"تم نسخ الرابط — شاركه في أي مكان.",
    "view.surprise":"فاجئني",
    "theme.dark":"الوضع الداكن", "theme.light":"الوضع الفاتح",
    "admin.export.btn":"تصدير CSV",
    "profile.title":"ملفك الشخصي", "profile.points":"{n} نقطة", "profile.badges":"الشارات",
    "profile.noBadges":"أكمل أنشطة لفتح الشارات.", "profile.avatar":"صورتك الرمزية",
    "profile.emailLabel":"البريد الإلكتروني", "profile.fullName":"الاسم الكامل", "profile.nicknameLabel":"اللقب",
    "profile.role":"الدور", "profile.roleUser":"مستخدم", "profile.roleAdmin":"مشرف",
    "profile.saveBtn":"حفظ التغييرات",
    "profile.avatarBtn":"تغيير الصورة", "profile.saved":"تم تحديث الملف.",
    "profile.nicknameRequired":"لا يمكن أن يكون اللقب فارغاً.", "profile.nicknameTooLong":"اللقب طويل جداً (64 حرفاً كحد أقصى).",
    "badge.firstSave":"أول حفظ", "badge.firstSaveDesc":"حفظت أول فرصة",
    "badge.firstApplied":"أول تقديم", "badge.firstAppliedDesc":"سجّلت أول تقديم",
    "badge.firstStory":"راوي", "badge.firstStoryDesc":"شاركت أول تجربة",
    "badge.deadlineMaster":"سيد المواعيد", "badge.deadlineMasterDesc":"قدّمت قبل الموعد النهائي",
    "badge.closingSoonSave":"منقذ اللحظة", "badge.closingSoonSaveDesc":"حفظت فرصة تنتهي هذا الأسبوع",
    "badge.explorer":"مستكشف", "badge.explorerDesc":"فتحت 10+ فرص",
    "recs.madeForYou":"مناسبة لك", "recs.closingThisWeek":"تنتهي هذا الأسبوع",
    "recs.none":"لا توجد نتائج بعد — عد لاحقاً.",
    "detail.apply":"قدّم الآن", "detail.save":"احفظها لاحقاً", "detail.saved":"محفوظة",
    "detail.applied":"قدّمت", "detail.markApplied":"قدّمت عليها", "detail.unmarkApplied":"قدّمت ✓",
    "detail.stories":"تجارب المشاركين", "detail.storiesEmpty":"لا أحد شارك تجربته بعد. كن أول من يشارك!",
    "detail.storyPh":"كيف كانت التجربة؟ بضع جمل تكفي.",
    "detail.postStory":"انشر تجربتك", "detail.updateStory":"تحديث التجربة", "detail.deleteStory":"حذف",
    "detail.loginToShare":"سجّل الدخول لمشاركة تجربتك.",
    "story.helpful":"مفيد", "story.you":"(أنت)", "story.report":"بلاغ", "story.reported":"تم استلام بلاغك — سنراجعه.",
    "toast.needLogin":"سجّل الدخول أولاً.", "toast.loggedOut":"تم تسجيل الخروج. نراك قريباً!",
    "toast.removedSaved":"أُزيلت من المحفوظة.", "toast.saved":"حُفظت! تجدها في تبويب المحفوظة.",
    "toast.applied":"تم وضع علامة قدّمت — حظاً موفقاً!", "toast.unapplied":"أُلغي وسم التقديم.",
    "toast.storyUpdated":"تم تحديث التجربة.", "toast.storyPosted":"نُشرت تجربتك — شكراً لمشاركتك!",
    "toast.storyDeleted":"حُذفت التجربة.", "toast.storyNeedsText":"اكتب بضع كلمات أولاً.",
    "toast.adminRequired":"يتطلب حساب مشرف.", "toast.wrongCreds":"البريد أو كلمة المرور غير صحيحة.",
    "toast.regInvalid":"املأ جميع الحقول (كلمة المرور 8 أحرف على الأقل).",
    "toast.regTaken":"هذا البريد مسجّل مسبقاً.",
    "toast.oppRequired":"العنوان والوصف والرابط مطلوبة.",
    "toast.oppUpdated":"تم تحديث الفرصة.", "toast.oppAdded":"أُضيفت الفرصة!",
    "toast.oppDeleted":"حُذفت الفرصة.", "toast.csvBad":"تعذّر قراءة الملف — تحقق من الصيغة.",
    "toast.csvImported":"تم استيراد {n} فرصة.",
    "toast.deleteConfirm":"حذف \"{title}\"؟ سيُحذف أيضاً ما يخصه من تجارب.",
    "toast.needBackend":"تعذّر الاتصال بالخادم — هل الخادم يعمل؟",
    "common.loading":"جارٍ التحميل…",
    "admin.analytics.title":"ما يهم الشباب",
    "admin.analytics.mostSaved":"الأكثر حفظاً", "admin.analytics.mostApplied":"الأكثر تقديماً",
    "admin.analytics.mostClicked":"الأكثر نقراً على رابط التقديم", "admin.analytics.empty":"لا توجد بيانات بعد — ستظهر النشاطات هنا.",
    "admin.analytics.perAdmin":"ما أضافه كل مشرف",
    "admin.flags.title":"التجارب المبلَّغ عنها", "admin.flags.empty":"لا توجد بلاغات الآن. كل شيء نظيف!",
    "admin.flags.keep":"إبقاء", "admin.flags.remove":"حذف التجربة",
    "admin.flags.removed":"حُذفت التجربة.", "admin.flags.kept":"أُبقيَت التجربة — مُسحت البلاغات.",
    "privacy.p1":"نحن نبقي الأمور بسيطة: يخزّن الموقع الحد الأدنى من البيانات اللازمة للعمل — اسمك وبريدك والمحفوظات والفرص التي قدّمت عليها والتجارب التي تشاركها.",
    "privacy.p2":"لا يُعرض اسمك الكامل علناً أبداً. تظهر التجارب بالاسم المستعار (أو الاسم الأول) فقط، ولا توجد ملفات تعريف عامة أو معلومات تواصل.",
    "privacy.p3":"أي شيء تنشره في تجربة يظهر لزوار تلك الفرصة. رجاءً لا تشارك معلومات تواصل شخصية — يمكن للآخرين الإبلاغ عن تجربة وسنراجعها.",
    "privacy.p4":"بياناتك محفوظة على خادم آمن، وكلمات المرور مخزّنة بشكل مشفّر وليس كنص صريح.",
    "privacy.p5":"إذا شعرت بأي شيء غير مناسب، يمكنك الإبلاغ عن تجربة، أو حذف محتواك في أي وقت، أو التوقف عن استخدام الموقع متى شئت.",
  },
};

function t(key, vars){
  let s = (I18N[data.lang] || I18N.en)[key] ?? I18N.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
  return s;
}

function applyI18n(){
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const translated = t(el.dataset.i18n);
    // Some labels wrap form controls (<label data-i18n>Label <input>…</label>).
    // Replacing textContent would destroy the nested input, so only swap the
    // leading text node and leave any child elements (inputs/buttons) intact.
    const firstChild = el.firstChild;
    if (el.children.length && firstChild && firstChild.nodeType === Node.TEXT_NODE) {
      firstChild.nodeValue = translated;
    } else {
      el.textContent = translated;
    }
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.documentElement.dir = data.lang === "ar" ? "rtl" : "ltr";
}

/* =========================================================
   Auth helpers
   ========================================================= */
function currentUser(){ return data.sessionUserId ? { id: data.sessionUserId, is_staff: data.isAdmin || false } : null; }
function isAdmin(){ return !!data.isAdmin; }
function displayName(user){
  if (!user) return "";
  const nick = user.nickname || user.name || "";
  const first = (nick || user.email || "").split(/\s+/)[0];
  return first || "Someone";
}
/* Initials fallback for the account chip when the user has no avatar. */
function userInitials(user){
  if (!user) return "?";
  const src = (user.nickname || user.name || user.email || "").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] || "";
  const second = parts.length > 1 ? (parts[parts.length - 1][0] || "") : "";
  return (first + second).toUpperCase() || "?";
}

/* =========================================================
   DOM refs
   ========================================================= */
const pillRow      = document.getElementById("categoryPills");
const grid          = document.getElementById("cardGrid");
const emptyState    = document.getElementById("emptyState");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const searchInput   = document.getElementById("searchInput");
const searchBtn     = document.getElementById("searchBtn");
const navSearchInput = document.getElementById("navSearchInput");
const resultCountEl = document.getElementById("resultCount");
const surpriseBtn2  = document.getElementById("surpriseBtn2");
const footerCatsEl  = document.getElementById("footerCats");
const modeFilter    = document.getElementById("modeFilter");
const fundingFilter = document.getElementById("fundingFilter");
const ageFilter     = document.getElementById("ageFilter");
const certFilter    = document.getElementById("certFilter");
const locationFilter = document.getElementById("locationFilter");
const durationFilter = document.getElementById("durationFilter");
const sortFilter    = document.getElementById("sortFilter");
const navActions    = document.getElementById("navActions");
const viewToggle    = document.getElementById("viewToggle");
const yearSpan      = document.getElementById("year");
const reminderBar   = document.getElementById("reminderBar");
const onboarding    = document.getElementById("onboarding");
const onboardingClose = document.getElementById("onboardingClose");
const langToggle    = document.getElementById("langToggle");
const privacyBtn    = document.getElementById("privacyBtn");

const authModal     = document.getElementById("authModal");
const adminModal    = document.getElementById("adminModal");
const privacyModal  = document.getElementById("privacyModal");
const profileModal  = document.getElementById("profileModal");
const toast         = document.getElementById("toast");

const activeCats = new Set(); // empty set = "show all categories"
const activeFields = new Set(); // empty set = "show all fields"
let currentView = "browse";   // "browse" | "saved" | "applied"

/* =========================================================
   Small UI helpers
   ========================================================= */
function showToast(msg){
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 2600);
}

function openModal(modal){ modal.hidden = false; document.body.style.overflow = "hidden"; }
function closeModal(modal){ modal.hidden = true; document.body.style.overflow = ""; }

function esc(str){
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

function formatDeadline(str){
  if (!str) return "";
  const d = new Date(str + "T23:59:59");
  if (isNaN(d)) return str;
  return d.toLocaleDateString(data.lang === "ar" ? "ar-EG" : "en-US", { month:"short", day:"numeric", year:"numeric" });
}

/* Human-friendly countdown: "Closes today/tomorrow/in N days" */
function daysUntil(str){
  if (!str) return null;
  const d = new Date(str + "T23:59:59");
  if (isNaN(d)) return null;
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}
function deadlineLabel(o){
  if (isClosed(o)) return t("card.closed");
  const days = daysUntil(o.deadline);
  if (days === null) return "";
  if (days <= 0) return t("card.closesToday");
  if (days === 1) return t("card.closesTomorrow");
  return t("card.closesInDays", { n: days });
}

function closingSoon(o){
  if (!o.deadline) return false;
  const d = new Date(o.deadline + "T23:59:59");
  if (isNaN(d) || d.getTime() < Date.now()) return false;
  return (d.getTime() - Date.now()) <= 7 * 24 * 60 * 60 * 1000;
}
function isClosed(o){
  if (!o.deadline) return false;
  const d = new Date(o.deadline + "T23:59:59");
  return !isNaN(d) && d.getTime() < Date.now();
}

function durationBucket(duration){
  const d = (duration || "").toLowerCase();
  if (/month|year|semester/.test(d)) return "long";
  if (/week/.test(d)) return "medium";
  return "short";
}

function catInfo(key){ return CATEGORIES.find(c => c.key === key); }
function isSavedByUser(oppId){ return data.saved.some(s => s.opportunityId === oppId); }
function isAppliedByUser(oppId){ return data.applied.some(s => s.opportunityId === oppId); }

/* =========================================================
   Category pills
   ========================================================= */
CATEGORIES.forEach(cat => {
  const btn = document.createElement("button");
  btn.className = "pill";
  btn.dataset.cat = cat.key;
  btn.style.setProperty("--cat-color", cat.color);
  btn.innerHTML = `<span class="pill-label">${cat.label}</span>`;
  btn.addEventListener("click", () => {
    if (activeCats.has(cat.key)) { activeCats.delete(cat.key); btn.classList.remove("active"); }
    else { activeCats.add(cat.key); btn.classList.add("active"); }
    render();
  });
  pillRow.appendChild(btn);
});

/* Field pills — filter by field tag (Science, STEM, AI, Coding…). */
const fieldPillRow = document.getElementById("fieldPills");
FIELDS.forEach(f => {
  const btn = document.createElement("button");
  btn.className = "pill";
  btn.dataset.field = f.key;
  btn.style.setProperty("--cat-color", f.color);
  btn.innerHTML = `<span class="pill-label">${f.label}</span>`;
  btn.addEventListener("click", () => {
    if (activeFields.has(f.key)) { activeFields.delete(f.key); btn.classList.remove("active"); }
    else { activeFields.add(f.key); btn.classList.add("active"); }
    render();
  });
  fieldPillRow.appendChild(btn);
});

function populateLocations(){
  const locations = [...new Set(data.opportunities.map(o => o.location).filter(Boolean))].sort();
  const current = locationFilter.value;
  locationFilter.innerHTML = `<option value="all">${t("filter.locationAll")}</option>` +
    locations.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join("");
  locationFilter.value = current;
}

/* =========================================================
   Filtering + rendering (unchanged — works off `data`)
   ========================================================= */
function getFiltered(){
  const query   = searchInput.value.trim().toLowerCase();
  const mode    = modeFilter.value;
  const funding = fundingFilter.value;
  const age     = ageFilter.value;
  const cert    = certFilter.value;
  const loc     = locationFilter.value;
  const dur     = durationFilter.value;
  const sort    = sortFilter.value;

  let pool = data.opportunities.filter(o => !isClosed(o)); // auto-hide closed
  if (currentView === "saved") pool = pool.filter(o => isSavedByUser(o.id));
  else if (currentView === "applied") pool = pool.filter(o => isAppliedByUser(o.id));

  let results = pool.filter(o => {
    if (activeCats.size > 0 && !activeCats.has(o.category)) return false;
    if (activeFields.size > 0) {
      const oppFields = o.fields || [];
      const hasAny = [...activeFields].some(f => oppFields.includes(f));
      if (!hasAny) return false;
    }
    if (mode !== "all" && o.mode !== mode) return false;
    if (funding === "charged" && !o.paid) return false;
    if (funding === "free" && o.paid) return false;
    if (age !== "all" && o.age !== "all" && o.age !== age) return false;
    if (cert === "yes" && !o.certificate) return false;
    if (cert === "no" && o.certificate) return false;
    if (loc !== "all" && o.location !== loc) return false;
    if (dur !== "all" && durationBucket(o.duration) !== dur) return false;
    if (query) {
      const catLabel = (catInfo(o.category) || {}).label || "";
      const fieldLabels = (o.fields || []).map(k => (fieldInfo(k) || {}).label || "").join(" ");
      const haystack = `${o.title} ${o.desc} ${o.location} ${o.organizationName || ""} ${catLabel} ${fieldLabels}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  if (sort === "deadline") {
    results.sort((a, b) => {
      const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return ad - bd;
    });
  } else {
    results.sort((a, b) => b.id - a.id);
  }
  return results;
}

function render(){
  populateLocations();
  const results = getFiltered();
  grid.innerHTML = "";

  results.forEach(o => {
    const cat = catInfo(o.category);
    const closed = isClosed(o);
    const soon = closingSoon(o);
    const saved = isSavedByUser(o.id);
    const applied = isAppliedByUser(o.id);

    const card = document.createElement("article");
    card.className = "card";
    card.style.setProperty("--cat-color", cat.color);
    const fieldTags = (o.fields || []).map(k => {
      const fi = fieldInfo(k);
      return fi ? `<span class="field-pill" style="background:${fi.color}">${esc(fi.label)}</span>` : "";
    }).join("");
    card.innerHTML = `
      <h3>${esc(o.title)}</h3>
      ${fieldTags ? `<div class="field-tags">${fieldTags}</div>` : ""}
      <p class="desc">${esc(o.desc)}</p>
      <div class="meta-list">
        <div class="meta-item">${icon.pin}${esc(o.location)} · ${esc(o.mode)}</div>
        <div class="meta-item">${icon.clock}${esc(o.duration)}</div>
        <div class="meta-item">${icon.cash}${o.paid ? t("filter.fundingCharged") : t("filter.fundingFree")}</div>
        <div class="meta-item">${icon.cert}${o.certificate ? t("filter.certYes") : t("filter.certNo")}</div>
      </div>
      <div class="card-footer">
        <span class="deadline ${closed ? "closed" : ""}">
          ${closed ? t("card.closed") : deadlineLabel(o)}
        </span>
        <span class="apply-link">${t("card.details")} ${icon.arrow}</span>
      </div>
    `;

    const saveBtn = document.createElement("button");
    saveBtn.className = "save-btn" + (saved ? " saved" : "");
    saveBtn.innerHTML = `${icon.bookmark}${saved ? t("card.saved") : t("card.save")}`;
    saveBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleSave(o.id); });

    const appliedBtn = document.createElement("button");
    appliedBtn.className = "save-btn" + (applied ? " applied" : "");
    appliedBtn.innerHTML = `${icon.check}${applied ? t("card.applied") : t("detail.markApplied")}`;
    appliedBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleApplied(o.id); });

    const top = document.createElement("div");
    top.className = "card-top";
    const badges = document.createElement("div");
    badges.className = "card-actions";
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.style.background = cat.color;
    badge.textContent = cat.label;
    badges.appendChild(badge);
    if (closed) {
      const b = document.createElement("span");
      b.className = "badge closed";
      b.textContent = t("card.closed");
      badges.appendChild(b);
    } else if (soon) {
      const b = document.createElement("span");
      b.className = "badge closing-soon";
      b.textContent = t("card.closingSoon");
      badges.appendChild(b);
    }
    badges.appendChild(saveBtn);
    badges.appendChild(appliedBtn);
    top.appendChild(badges);
    card.prepend(top);

    card.addEventListener("click", () => openDetail(o.id));
    grid.appendChild(card);
  });

  emptyState.classList.toggle("show", results.length === 0);
  if (resultCountEl) {
    resultCountEl.textContent = results.length === 1
      ? t("search.resultsOne")
      : t("search.results", { n: results.length });
  }
}

/* =========================================================
   View toggle
   ========================================================= */
viewToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".view-btn");
  if (!btn) return;
  currentView = btn.dataset.view;
  document.querySelectorAll(".view-btn").forEach(b => b.classList.toggle("active", b === btn));
  if ((currentView === "saved" || currentView === "applied") && !currentUser()) {
    showToast(t("toast.needLogin"));
    openModal(authModal);
    return;
  }
  render();
});

/* =========================================================
   Reminder bar
   ========================================================= */
function renderReminder(){
  const closing = data.saved
    .map(s => data.opportunities.find(o => o.id === s.opportunityId))
    .filter(o => o && closingSoon(o));
  if (closing.length === 0) { reminderBar.hidden = true; return; }
  reminderBar.hidden = false;
  reminderBar.innerHTML = `
    ${t("reminder.text", { n: closing.length })}
    <a href="#" data-reminder-link>${t("reminder.view")}</a>
  `;
  const link = reminderBar.querySelector("[data-reminder-link]");
  link.addEventListener("click", (e) => { e.preventDefault(); openDetail(closing[0].id); });
}

/* =========================================================
   Nav actions
   ========================================================= */
function renderNav(){
  const u = currentUser();
  navActions.innerHTML = "";
  const mk = (label, cls, fn) => {
    const b = document.createElement("button");
    b.className = "nav-btn " + (cls || "");
    b.textContent = label;
    b.addEventListener("click", fn);
    navActions.appendChild(b);
    return b;
  };

  if (u) {
    mk(t("view.saved"), currentView === "saved" ? "saved active" : "saved", () => {
      currentView = "saved";
      document.querySelectorAll(".view-btn").forEach(b => b.classList.toggle("active", b.dataset.view === "saved"));
      render();
    });
    mk(t("view.applied"), currentView === "applied" ? "saved active" : "saved", () => {
      currentView = "applied";
      document.querySelectorAll(".view-btn").forEach(b => b.classList.toggle("active", b.dataset.view === "applied"));
      render();
    });
    if (isAdmin()) mk(isOwner() ? t("dash.ownerNav") : t("dash.adminNav"), "primary", () => openDashboard(isOwner() ? "owner" : "admin"));
    renderAccountChip();
  } else {
    mk(t("admin.title"), "", () => openAuth("login"));
    mk(t("auth.loginBtn"), "", () => openAuth("login"));
    mk(t("auth.registerBtn"), "primary", () => openAuth("register"));
  }
}

/* Account chip in the nav: [avatar] [name] ▼ with a dropdown for the
   account/profile area and logout. Replaces the Login/Register buttons. */
let accountMenuOpen = false;

function accountChipHTML(user){
  const avatar = (user && user.avatar) || "";
  const avatarHtml = avatar
    ? esc(avatar)
    : `<span class="account-avatar-fallback">${esc(userInitials(user))}</span>`;
  const name = esc(displayName(user));
  return `
    <div class="nav-account">
      <button class="account-chip" data-account-chip aria-haspopup="true" aria-expanded="false">
        <span class="account-avatar">${avatarHtml}</span>
        <span class="account-name">${name}</span>
        <span class="account-caret">▼</span>
      </button>
      <div class="account-menu" data-account-menu hidden>
        ${isAdmin() ? `<button type="button" data-account-dash>${isOwner() ? t("dash.ownerNav") : t("dash.adminNav")}</button>` : ""}
        <button type="button" data-account-profile>${t("nav.account")}</button>
        <button type="button" data-account-logout>${t("common.logout")}</button>
      </div>
    </div>`;
}

function renderAccountChip(){
  const user = data.currentUser || { id: data.sessionUserId, email: "", name: "" };
  const wrap = document.createElement("div");
  wrap.className = "nav-account-wrap";
  wrap.innerHTML = accountChipHTML(user);
  navActions.appendChild(wrap);

  const chip = wrap.querySelector("[data-account-chip]");
  const menu = wrap.querySelector("[data-account-menu]");

  const closeMenu = () => {
    accountMenuOpen = false;
    menu.hidden = true;
    chip.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", closeMenu);
  };
  const openMenu = () => {
    accountMenuOpen = true;
    menu.hidden = false;
    chip.setAttribute("aria-expanded", "true");
    setTimeout(() => document.addEventListener("click", closeMenu), 0);
  };

  chip.addEventListener("click", (e) => {
    e.stopPropagation();
    if (accountMenuOpen) closeMenu(); else openMenu();
  });
  wrap.querySelector("[data-account-profile]").addEventListener("click", (e) => {
    e.stopPropagation();
    closeMenu();
    openProfile();
  });
  const dashBtn = wrap.querySelector("[data-account-dash]");
  if (dashBtn) dashBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeMenu();
    openDashboard(isOwner() ? "owner" : "admin");
  });
  wrap.querySelector("[data-account-logout]").addEventListener("click", (e) => {
    e.stopPropagation();
    closeMenu();
    logout();
  });
}

/* =========================================================
   Profile modal — view + edit the signed-in user's profile.
   All data comes from the backend (/auth/me); nothing here is
   treated as authoritative except what the API returns.
   ========================================================= */
function currentProfileUser(){
  return data.currentUser || null;
}

function renderProfileModal(){
  if (!profileModal) return;
  const user = currentProfileUser();
  if (!user) { profileModal.hidden = true; return; }
  const view = document.getElementById("profileView");
  if (!view) return;

  const avatar = user.avatar || "🙂";
  const nickname = (user.nickname || "").trim();
  const fullName = user.name || "";
  const email = user.email || "";
  const isStaff = !!data.isAdmin;
  const role = isStaff ? t("profile.roleAdmin") : t("profile.roleUser");

  const avatarHtml = `
    <span class="profile-avatar-lg" role="img" aria-label="${esc(avatar)}">${esc(avatar)}</span>`;

  const rowsHtml = `
    <div class="profile-row"><span class="k">${esc(t("profile.nicknameLabel"))}</span><span class="v">${esc(nickname || "—")}</span></div>
    <div class="profile-row"><span class="k">${esc(t("profile.emailLabel"))}</span><span class="v" dir="ltr">${esc(email || "—")}</span></div>
    <div class="profile-row"><span class="k">${esc(t("profile.fullName"))}</span><span class="v">${esc(fullName || "—")}</span></div>
    <div class="profile-row"><span class="k">${esc(t("profile.role"))}</span><span class="v ${isStaff ? "role-admin" : ""}">${isStaff ? "🛡 " : ""}${esc(role)}</span></div>`;

  view.innerHTML = `
    <div class="profile-hero">
      ${avatarHtml}
      <div class="profile-hero-info">
        <span class="profile-hero-name">${esc(nickname || fullName || email || "—")}</span>
        <span class="profile-hero-sub">${esc(email || "")}</span>
      </div>
    </div>
    <div class="profile-rows">${rowsHtml}</div>
    <form class="profile-form" id="profileEditForm">
      <label>${esc(t("profile.nicknameLabel"))}
        <input type="text" id="profileNickname" maxlength="64" value="${esc(nickname)}">
      </label>
      <div class="profile-actions">
        <button type="button" class="btn btn-outline btn-small" id="profileAvatarBtn">${esc(t("profile.avatarBtn"))}</button>
        <button type="submit" class="btn btn-primary btn-small" id="profileSaveBtn">${esc(t("profile.saveBtn"))}</button>
      </div>
    </form>
    <div class="profile-logout">
      <button type="button" class="btn btn-danger" id="profileLogoutBtn">${esc(t("common.logout"))}</button>
    </div>`;

  view.querySelector("#profileAvatarBtn").addEventListener("click", () => openAvatarModal());
  view.querySelector("#profileEditForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveProfileNickname();
  });
  view.querySelector("#profileLogoutBtn").addEventListener("click", () => {
    closeModal(profileModal);
    logout();
  });
}

function openProfile(){
  if (!currentUser()) { showToast(t("toast.needLogin")); return; }
  renderProfileModal();
  openModal(profileModal);
}

async function saveProfileNickname(){
  const input = document.getElementById("profileNickname");
  if (!input) return;
  const nickname = input.value.trim();
  if (!nickname) { showToast(t("profile.nicknameRequired")); return; }
  if (nickname.length > 64) { showToast(t("profile.nicknameTooLong")); return; }
  try {
    const me = await api("/auth/me", { method: "PATCH", body: JSON.stringify({ nickname }) });
    data.currentUser = {
      id: me.id,
      nickname: me.nickname || me.full_name,
      email: me.email,
      name: me.full_name,
      avatar: me.avatar || "",
    };
    data.isAdmin = me.is_staff;
    localStorage.setItem("darb_user", JSON.stringify(data.currentUser));
    renderProfile();
    renderNav();
    renderProfileModal();
    showToast(t("profile.saved"));
  } catch (err) {
    showToast(err.message || t("toast.needBackend"));
  }
}

/* =========================================================
   Auth — login / register / logout (server-backed)
   ========================================================= */
function openAuth(tab){
  openModal(authModal);
  setAuthTab(tab);
  authModal.querySelector("form").reset?.();
}

function setAuthTab(tab){
  document.querySelectorAll(".tab-row > .tab").forEach(x => x.classList.toggle("active", x.dataset.tab === tab));
  document.getElementById("loginForm").hidden = tab !== "login";
  document.getElementById("registerForm").hidden = tab !== "register";
  const adminSection = document.getElementById("adminSection");
  if (adminSection) {
    adminSection.hidden = tab !== "adminApply";
    if (tab === "adminApply") setAdminSubTab("apply");
  }
}

function setAdminSubTab(sub){
  document.querySelectorAll("#adminSection .tab").forEach(x => x.classList.toggle("active", x.dataset.atab === sub));
  document.getElementById("adminApplyForm").hidden = sub !== "apply";
  document.getElementById("adminRegisterForm").hidden = sub !== "register";
  document.getElementById("adminLoginForm").hidden = sub !== "login";
  ["aaHint", "arHint", "alHint"].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = true; });
}

document.querySelectorAll(".tab-row > .tab").forEach(x => x.addEventListener("click", () => setAuthTab(x.dataset.tab)));
document.querySelectorAll("#adminSection .tab").forEach(x => x.addEventListener("click", () => setAdminSubTab(x.dataset.atab)));

async function refreshSession(){
  if (!data.sessionUserId) return;
  try {
    // If the stored access token is expired, silently renew it via the
    // refresh token before asking the backend who we are.
    if (accessToken && refreshToken && isTokenExpired(accessToken)) {
      try { await refreshAccessToken(); } catch (e) { /* fall through to /auth/me */ }
    }
    const me = await api("/auth/me");
    data.isAdmin = me.is_staff;
    data.role = me.role || (me.is_staff ? "admin" : "user");
    data.permissions = me.permissions || [];
    // Persist role/permissions so the boot restore keeps the Owner/admin state
    // even before /me resolves on the next page load.
    data.currentUser = {
      id: me.id,
      nickname: me.nickname || me.full_name,
      email: me.email,
      name: me.full_name,
      avatar: me.avatar || "",
      role: data.role,
      permissions: data.permissions,
      is_staff: data.isAdmin,
    };
    localStorage.setItem("darb_user", JSON.stringify(data.currentUser));
    renderNav();
    renderProfile();
    if (profileModal && !profileModal.hidden) renderProfileModal();
  } catch (e) {
    // Only a genuine auth failure (the /me call 401'd and refresh failed)
    // ends the session. A transient network error must NOT log the user out.
    if (e && (e.status === 401 || e.status === 403)) {
      clearSession();
    }
    // Otherwise keep the cached user + tokens; the next successful /me recovers.
  }
}

/* Decode the JWT payload (no signature check — we only read `exp` to decide
   whether to refresh early; the backend still validates the token). */
function isTokenExpired(token){
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 <= Date.now();
  } catch (e) {
    return true;
  }
}

async function loadMyData(){
  if (!currentUser()) return;
  try {
    const [saved, applied] = await Promise.all([
      api("/saved"),
      api("/applied"),
    ]);
    data.saved = saved.map(s => ({ opportunityId: s.opportunity_id }));
    data.applied = applied.map(s => ({ opportunityId: s.opportunity_id, date: s.created_at }));
  } catch (e) { /* not fatal */ }
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; }
  try {
    const res = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setSession(res.user, res.tokens);
    closeModal(authModal);
    await Promise.all([loadMyData(), refreshOpportunities()]);
    renderNav(); render(); renderReminder(); renderProfile();
    showToast(`${t("auth.loginBtn")}, ${displayName(res.user)}!`);
    if (res.user.admin_application_status === "pending") {
      showToast(t("admin.applyPending"));
    } else if (res.user.admin_application_status === "rejected") {
      showToast(t("admin.applyRejected"));
    }
    routeAfterLogin();
  } catch (err) {
    showToast(err.message || t("toast.wrongCreds"));
  } finally {
    if (btn) { btn.disabled = false; }
  }
});

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const password = document.getElementById("regPassword").value;
  const nickname = document.getElementById("regNickname")?.value.trim() || name.split(/\s+/)[0];
  if (!name || !email || password.length < 8) { showToast(t("toast.regInvalid")); return; }
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; }
  try {
    await api("/auth/register", { method: "POST", body: JSON.stringify({ email, password, full_name: name, nickname }) });
    const res = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setSession(res.user, res.tokens);
    closeModal(authModal);
    renderNav(); render(); renderProfile();
    showToast(`DARB ${displayName(res.user)}!`);
    openProfile();
  } catch (err) {
    showToast(err.message || t("toast.regTaken"));
  } finally {
    if (btn) { btn.disabled = false; }
  }
});

/* Admin section — apply (no account), register (post-approval), login. */
const adminApplyForm = document.getElementById("adminApplyForm");

adminApplyForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("aaName").value.trim();
  const email = document.getElementById("aaEmail").value.trim().toLowerCase();
  const organization = document.getElementById("aaOrganization")?.value.trim() || "";
  const website = document.getElementById("aaWebsite")?.value.trim() || "";
  const position = document.getElementById("aaPosition")?.value.trim() || "";
  const reason = document.getElementById("aaReason")?.value.trim() || "";
  if (!name || !email || !reason) {
    showToast(t("auth.adminApplyInvalid"));
    return;
  }
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; }
  const hint = document.getElementById("aaHint");
  try {
    await api("/auth/admin-apply", {
      method: "POST",
      body: JSON.stringify({ email, full_name: name, organization, website, position, reason }),
    });
    if (hint) {
      hint.hidden = false;
      hint.textContent = t("admin.applySubmitted");
    }
    e.target.reset();
    showToast(t("admin.applySubmitted"));
  } catch (err) {
    if (hint) {
      hint.hidden = false;
      hint.textContent = err.status === 409 ? t("toast.adminExists") : (err.message || t("toast.needBackend"));
    }
    showToast(err.status === 409 ? t("toast.adminExists") : (err.message || t("toast.needBackend")));
  } finally {
    if (btn) { btn.disabled = false; }
  }
});

/* Admin register — only works after the application has been approved. */
const adminRegisterForm = document.getElementById("adminRegisterForm");

adminRegisterForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("arName").value.trim();
  const email = document.getElementById("arEmail").value.trim().toLowerCase();
  const password = document.getElementById("arPassword").value;
  if (!name || !email || password.length < 8) {
    showToast(t("auth.adminApplyInvalid"));
    return;
  }
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; }
  const hint = document.getElementById("arHint");
  try {
    const user = await api("/auth/admin-register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name: name }),
    });
    if (hint) {
      hint.hidden = false;
      hint.textContent = t("admin.registerSuccess");
    }
    e.target.reset();
    showToast(t("admin.registerSuccess"));
    // Auto-login the new admin.
    const res = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setSession(res.user, res.tokens);
    closeModal(authModal);
    renderNav(); render(); renderProfile();
    routeAfterLogin();
  } catch (err) {
    if (hint) {
      hint.hidden = false;
      hint.textContent = err.status === 403 ? t("admin.applyNotApproved") : (err.status === 409 ? t("toast.adminExists") : (err.message || t("toast.needBackend")));
    }
    showToast(err.status === 403 ? t("admin.applyNotApproved") : (err.status === 409 ? t("toast.adminExists") : (err.message || t("toast.needBackend"))));
  } finally {
    if (btn) { btn.disabled = false; }
  }
});

/* Admin login — same backend auth as the personal login. */
const adminLoginForm = document.getElementById("adminLoginForm");

adminLoginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("alEmail").value.trim().toLowerCase();
  const password = document.getElementById("alPassword").value;
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; }
  const hint = document.getElementById("alHint");
  try {
    const res = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setSession(res.user, res.tokens);
    closeModal(authModal);
    await Promise.all([loadMyData(), refreshOpportunities()]);
    renderNav(); render(); renderReminder(); renderProfile();
    showToast(`${t("auth.loginBtn")}, ${displayName(res.user)}!`);
    routeAfterLogin();
  } catch (err) {
    if (hint) {
      hint.hidden = false;
      hint.textContent = err.message || t("toast.wrongCreds");
    }
    showToast(err.message || t("toast.wrongCreds"));
  } finally {
    if (btn) { btn.disabled = false; }
  }
});

function logout(){
  clearSession();
  data.saved = [];
  data.applied = [];
  accountMenuOpen = false;
  renderNav(); render(); renderReminder(); renderProfile();
  showToast(t("toast.loggedOut"));
}

/* =========================================================
   Saved / Applied toggles (server-backed)
   ========================================================= */
async function toggleSave(oppId){
  const u = currentUser();
  if (!u) { showToast(t("toast.needLogin")); openModal(authModal); return; }
  const idx = data.saved.findIndex(s => s.opportunityId === oppId);
  try {
    if (idx >= 0) {
      await api(`/saved/${oppId}`, { method: "DELETE" });
      data.saved.splice(idx, 1);
      showToast(t("toast.removedSaved"));
    } else {
      await api("/saved", { method: "POST", body: JSON.stringify({ opportunity_id: oppId }) });
      data.saved.push({ opportunityId: oppId });
      showToast(t("toast.saved"));
    }
    render(); renderReminder(); renderProfile(); renderRecs();
  } catch (err) {
    showToast(err.message || t("toast.needBackend"));
  }
}

async function toggleApplied(oppId){
  const u = currentUser();
  if (!u) { showToast(t("toast.needLogin")); openModal(authModal); return; }
  const idx = data.applied.findIndex(s => s.opportunityId === oppId);
  try {
    if (idx >= 0) {
      await api(`/applied/${oppId}`, { method: "DELETE" });
      data.applied.splice(idx, 1);
      showToast(t("toast.unapplied"));
    } else {
      await api("/applied", { method: "POST", body: JSON.stringify({ opportunity_id: oppId }) });
      data.applied.push({ opportunityId: oppId, date: new Date().toISOString() });
      showToast(t("toast.applied"));
    }
    render(); renderProfile(); renderRecs();
  } catch (err) {
    showToast(err.message || t("toast.needBackend"));
  }
}

/* =========================================================
   Gamification: points + badges + avatar
   ========================================================= */
const AVATARS = ["🙂","😎","🚀","🌟","🐱","🐶","🦁","🐼","🐯","🦊","🐸","🐙","🌈","🔥","⚡","🎯","🎨","🎮","📚","🏆"];
const VIEWS_KEY = "darb_views"; // opportunity ids the user opened (local)

/* Points are computed from real activity (no fake grind):
   save=5, apply=10, story=15, view=1, closing-soon save=+5 */
function myStats(){
  const u = currentUser();
  const views = new Set(JSON.parse(localStorage.getItem(VIEWS_KEY) || "[]"));
  const saved = data.saved.length;
  const applied = data.applied.length;
  const stories = data.stories.filter(s => s.userId === u?.id || s.mine).length;
  const closingSaved = data.saved.filter(s => {
    const o = data.opportunities.find(x => x.id === s.opportunityId);
    return o && closingSoon(o);
  }).length;

  const points = saved * 5 + applied * 10 + stories * 15 + views.size + closingSaved * 5;

  const badges = [];
  if (saved >= 1) badges.push({ key:"firstSave", emoji:"🔖", unlocked:true });
  if (applied >= 1) badges.push({ key:"firstApplied", emoji:"✅", unlocked:true });
  if (stories >= 1) badges.push({ key:"firstStory", emoji:"📖", unlocked:true });
  if (applied >= 3) badges.push({ key:"deadlineMaster", emoji:"⏰", unlocked:true });
  if (closingSaved >= 1) badges.push({ key:"closingSoonSave", emoji:"⚡", unlocked:true });
  if (views.size >= 10) badges.push({ key:"explorer", emoji:"🧭", unlocked:true });
  return { points, saved, applied, stories, closingSaved, views: views.size, badges };
}

function renderProfile(){
  const bar = document.getElementById("profileBar");
  const u = currentUser();
  if (!u) { bar.hidden = true; return; }
  bar.hidden = false;

  const avatar = (data.currentUser && data.currentUser.avatar) || "🙂";
  document.getElementById("avatarBtn").textContent = avatar;
  document.getElementById("profileName").textContent = displayName({ ...(data.currentUser || {}), name: data.currentUser?.name || data.currentUser?.email || "" });
  const stats = myStats();
  document.getElementById("profilePoints").textContent = t("profile.points", { n: stats.points });

  const row = document.getElementById("badgeRow");
  row.innerHTML = stats.badges.map(b =>
    `<span class="badge-chip unlocked" title="${t("badge." + b.key + "Desc")}"><span class="emoji">${b.emoji}</span>${t("badge." + b.key)}</span>`
  ).join("") || `<span class="badge-chip">${t("profile.noBadges")}</span>`;
  renderNav();
}

/* Avatar picker — used by the profile bar avatar button and the account chip. */
const avatarModalEl = document.getElementById("avatarModal");
function openAvatarModal(){
  const grid = document.getElementById("avatarGrid");
  const current = (data.currentUser && data.currentUser.avatar) || "🙂";
  grid.innerHTML = AVATARS.map(a =>
    `<button type="button" data-avatar="${a}" class="${a === current ? "selected" : ""}">${a}</button>`
  ).join("");
  grid.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      grid.querySelectorAll("button").forEach(x => x.classList.remove("selected"));
      b.classList.add("selected");
      const chosen = b.dataset.avatar;
      api("/auth/me", { method: "PATCH", body: JSON.stringify({ avatar: chosen }) })
        .then(me => {
          data.currentUser = { ...(data.currentUser || {}), avatar: me.avatar };
          data.isAdmin = me.is_staff;
          localStorage.setItem("darb_user", JSON.stringify(data.currentUser));
          renderProfile();
          renderNav();
          if (profileModal && !profileModal.hidden) renderProfileModal();
          showToast(t("toast.oppUpdated") === "Opportunity updated." ? "Avatar updated!" : "تم تحديث الصورة!");
        })
        .catch(err => showToast(err.message || t("toast.needBackend")));
    });
  });
  openModal(avatarModalEl);
}
document.getElementById("avatarBtn").addEventListener("click", openAvatarModal);

/* Record a view for the Explorer badge + recommendations */
function recordView(oppId){
  const views = new Set(JSON.parse(localStorage.getItem(VIEWS_KEY) || "[]"));
  views.add(oppId);
  localStorage.setItem(VIEWS_KEY, JSON.stringify([...views]));
  if (currentUser()) renderProfile();
}

/* =========================================================
   Recommendations: "Made for you" + "Closing this week"
   ========================================================= */
function miniCardHTML(o){
  const cat = catInfo(o.category);
  return `
    <article class="card" data-opp-id="${o.id}">
      <div class="card-actions">
        <span class="badge" style="background:${cat.color}">${cat.label}</span>
      </div>
      <h3>${esc(o.title)}</h3>
      <p class="desc">${esc((o.desc || "").slice(0, 80))}…</p>
      <div class="card-footer">
        <span class="deadline ${isClosed(o) ? "closed" : ""}">${deadlineLabel(o)}</span>
        <span class="apply-link">${t("card.details")} ${icon.arrow}</span>
      </div>
    </article>`;
}

function renderRecs(){
  const section = document.getElementById("recsSection");
  if (!data.opportunities.length) { section.hidden = true; return; }
  const open = data.opportunities.filter(o => !isClosed(o));

  // "Made for you": rank by how many of your viewed/saved/applied categories match.
  const views = new Set(JSON.parse(localStorage.getItem(VIEWS_KEY) || "[]"));
  const likedIds = new Set([...data.saved.map(s => s.opportunityId), ...data.applied.map(s => s.opportunityId), ...views]);
  const catCount = {};
  likedIds.forEach(id => {
    const o = data.opportunities.find(x => x.id === id);
    if (o) catCount[o.category] = (catCount[o.category] || 0) + 1;
  });
  const made = open
    .filter(o => !likedIds.has(o.id))
    .map(o => ({ o, score: (catCount[o.category] || 0) + (views.has(o.id) ? 1 : 0) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(x => x.o);

  // "Closing this week": deadlines within 7 days (already have a helper).
  const closing = open.filter(o => closingSoon(o)).slice(0, 8);

  const madeBox = document.getElementById("recsMade");
  const closingBox = document.getElementById("recsClosing");
  const show = made.length > 0 || closing.length > 0;
  section.hidden = !show;
  if (!show) return;

  madeBox.innerHTML = made.length
    ? made.map(miniCardHTML).join("")
    : `<p class="modal-sub">${t("recs.none")}</p>`;
  closingBox.innerHTML = closing.length
    ? closing.map(miniCardHTML).join("")
    : `<p class="modal-sub">${t("recs.none")}</p>`;

  document.querySelectorAll("[data-opp-id]").forEach(card => {
    card.addEventListener("click", () => openDetail(Number(card.dataset.oppId)));
  });
}
async function loadStoriesFor(oppId){
  const res = await api(`/stories/opportunity/${oppId}`, { auth: false });
  data.stories = res.stories.map(s => ({
    id: s.id,
    userId: null, // not exposed by the API (privacy)
    opportunityId: s.opportunity_id,
    text: s.experience,
    date: s.created_at,
    helpful: s.helpful || [],
    flags: s.flags || [],
    authorName: s.author_name,
  }));
  data.myStory = res.my_story ? { id: res.my_story.id, text: res.my_story.experience } : null;
}

async function openDetail(oppId){
  const o = data.opportunities.find(x => x.id === oppId);
  if (!o) return;
  recordView(o.id); // feeds the Explorer badge + "Made for you"
  const cat = catInfo(o.category);
  const closed = isClosed(o);
  const u = currentUser();
  const saved = isSavedByUser(o.id);
  const applied = isAppliedByUser(o.id);

  await loadStoriesFor(o.id);
  // Best stories first: sort by helpful count, then newest.
  const stories = [...data.stories].sort((a, b) =>
    ((b.helpful || []).length - (a.helpful || []).length) || (new Date(b.date) - new Date(a.date))
  );
  const myStory = data.myStory;

  const storyHTML = stories.length
    ? stories.map(s => {
        const mine = myStory && s.id === myStory.id;
        const helpfulCount = (s.helpful || []).length;
        const iHelped = u && (s.helpful || []).includes(u.id);
        return `
          <div class="story-card ${mine ? "story-mine" : ""}">
            <div class="story-head">
              <span class="story-author">${esc(s.authorName)}${mine ? ` ${t("story.you")}` : ""}</span>
              <span class="story-date">${formatDeadline(s.date ? s.date.split("T")[0] : "")}</span>
            </div>
            <div class="story-text">${esc(s.text)}</div>
            <div class="story-foot">
              <button class="story-react ${iHelped ? "active" : ""}" data-story-react="${s.id}">
                ${icon.thumb}${t("story.helpful")}${helpfulCount ? ` (${helpfulCount})` : ""}
              </button>
              <button class="story-report" data-story-report="${s.id}">${t("story.report")}</button>
            </div>
          </div>`;
      }).join("")
    : `<p class="modal-sub">${t("detail.storiesEmpty")}</p>`;

  detailContent.innerHTML = `
    <div class="detail-head">
      <div>
        <span class="badge" style="background:${cat.color}">${cat.label}</span>
        ${closed ? `<span class="badge closed">${t("card.closed")}</span>` : closingSoon(o) ? `<span class="badge closing-soon">${t("card.closingSoon")}</span>` : ""}
        <h1 class="detail-title">${esc(o.title)}</h1>
      </div>
    </div>
    <p class="detail-desc">${esc(o.desc)}</p>
    <div class="detail-meta">
      <span class="meta-chip">${icon.pin} ${esc(o.location)}</span>
      <span class="meta-chip">${icon.clock} ${esc(o.duration)}</span>
      <span class="meta-chip">${icon.cash} ${o.paid ? t("filter.fundingCharged") : t("filter.fundingFree")}</span>
      <span class="meta-chip">${icon.cert} ${o.certificate ? t("filter.certYes") : t("filter.certNo")}</span>
      <span class="meta-chip">${icon.age} ${o.age === "all" ? t("filter.ageAll") : o.age}</span>
      <span class="meta-chip">${closed ? t("card.closed") : `${t("card.closes")} ${formatDeadline(o.deadline)}`}</span>
    </div>
    <div class="detail-actions">
      <a class="btn btn-primary" href="${esc(o.link)}" target="_blank" rel="noopener noreferrer" data-apply-link>${t("detail.apply")} ${icon.arrow}</a>
      <button class="btn btn-outline" id="detailShareBtn">${icon.bookmark}${t("detail.share")}</button>
      <button class="btn btn-outline save-btn ${saved ? "saved" : ""}" id="detailSaveBtn">
        ${icon.bookmark}${saved ? t("detail.saved") : t("detail.save")}
      </button>
      <button class="btn btn-outline save-btn ${applied ? "applied" : ""}" id="detailAppliedBtn">
        ${icon.check}${applied ? t("detail.unmarkApplied") : t("detail.markApplied")}
      </button>
    </div>

    <h2 class="stories-title">${t("detail.stories")}</h2>
    ${storyHTML}

    <div class="story-form">
      ${u ? `
        <textarea id="storyText" rows="3" maxlength="2000" placeholder="${t("detail.storyPh")}">${myStory ? esc(myStory.text) : ""}</textarea>
        <div class="story-actions">
          <button class="btn btn-primary btn-small" id="storySubmitBtn">${myStory ? t("detail.updateStory") : t("detail.postStory")}</button>
          ${myStory ? `<button class="btn btn-danger btn-small" id="storyDeleteBtn">${t("detail.deleteStory")}</button>` : ""}
        </div>
      ` : `
        <p class="modal-sub">${t("detail.loginToShare")}</p>
      `}
    </div>
  `;

  // Apply click tracking
  const applyLink = detailContent.querySelector("[data-apply-link]");
  applyLink.addEventListener("click", () => {
    api(`/opportunities/${o.id}/click`, { method: "POST" }).catch(() => {});
  });

  // Share link — copies a URL that reopens this opportunity on load.
  const shareBtn = detailContent.querySelector("#detailShareBtn");
  shareBtn.addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}?opp=${o.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      // Fallback for older browsers / non-secure contexts.
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    showToast(t("toast.linkCopied"));
  });

  detailContent.querySelector("#detailSaveBtn").addEventListener("click", async () => { await toggleSave(o.id); openDetail(o.id); });
  detailContent.querySelector("#detailAppliedBtn").addEventListener("click", async () => { await toggleApplied(o.id); openDetail(o.id); });

  // story reactions (helpful)
  detailContent.querySelectorAll("[data-story-react]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const uid = u ? u.id : null;
      if (!uid) { showToast(t("toast.needLogin")); openModal(authModal); return; }
      try {
        await api(`/stories/${btn.dataset.storyReact}/helpful`, { method: "POST" });
        openDetail(o.id);
      } catch (err) { showToast(err.message || t("toast.needBackend")); }
    });
  });

  // story report/flag
  detailContent.querySelectorAll("[data-story-report]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const uid = u ? u.id : null;
      if (!uid) { showToast(t("toast.needLogin")); openModal(authModal); return; }
      try {
        await api(`/stories/${btn.dataset.storyReport}/flag`, { method: "POST" });
        showToast(t("story.reported"));
      } catch (err) { showToast(err.message || t("toast.needBackend")); }
    });
  });

  const submitBtn = detailContent.querySelector("#storySubmitBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const text = detailContent.querySelector("#storyText").value.trim();
      if (!text) { showToast(t("toast.storyNeedsText")); return; }
      try {
        if (myStory) {
          await api(`/stories/${myStory.id}`, { method: "PUT", body: JSON.stringify({ experience: text }) });
          showToast(t("toast.storyUpdated"));
        } else {
          await api("/stories", { method: "POST", body: JSON.stringify({ opportunity_id: o.id, experience: text }) });
          showToast(t("toast.storyPosted"));
        }
        openDetail(o.id);
      } catch (err) { showToast(err.message || t("toast.needBackend")); }
    });
  }
  const delBtn = detailContent.querySelector("#storyDeleteBtn");
  if (delBtn) {
    delBtn.addEventListener("click", async () => {
      try {
        await api(`/stories/${myStory.id}`, { method: "DELETE" });
        showToast(t("toast.storyDeleted"));
        openDetail(o.id);
      } catch (err) { showToast(err.message || t("toast.needBackend")); }
    });
  }

  openModal(detailModal);
}

/* =========================================================
   Admin panel (server-backed)
   ========================================================= */
async function openAdmin(){
  if (!isAdmin()) { showToast(t("toast.adminRequired")); return; }
  openModal(adminModal);
  fillAdminForm();
  await renderDashboard();
  await renderAdminList();
  await renderMyOpportunities();
  await renderAnalytics();
  await renderFlags();
  if (isOwner()) {
    await renderApplications();
    await renderAdmins();
    await renderUsers();
    await renderOrganizations();
  }
  updateAdminTabs();
}

/* Show owner-only admin tabs (Applications/Admins/Users/Organizations) only
   for the owner; hide them for regular admins. Cosmetic — the backend 403s. */
function updateAdminTabs(){
  const ownerTabs = ["applications", "admins", "users", "organizations"];
  document.querySelectorAll(".admin-tab").forEach(tab => {
    if (ownerTabs.includes(tab.dataset.atab)) {
      tab.style.display = isOwner() ? "" : "none";
    }
  });
}

function fillAdminForm(){
  const catSelect = document.getElementById("afCategory");
  catSelect.innerHTML = CATEGORIES.map(c => `<option value="${c.key}">${c.label}</option>`).join("");
}

function resetAdminForm(){
  document.getElementById("adminForm").reset();
  document.getElementById("afId").value = "";
  document.getElementById("afSubmit").textContent = t("admin.form.add");
  document.getElementById("afCancel").hidden = true;
}

/* Dashboard — the authenticated admin's stats + their own opportunities. */
async function renderDashboard(){
  const box = document.getElementById("dashboardContent");
  box.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const d = await api("/opportunities/dashboard");
    const name = data.currentUser?.name || data.currentUser?.nickname || "";
    box.innerHTML = `
      <p class="modal-sub">${esc(t("admin.dashboardWelcome", { name: name || "" }))}</p>
      <div class="dash-stats">
        <div class="dash-stat"><span class="count">${d.total}</span><span>${esc(t("admin.dashTotal"))}</span></div>
        <div class="dash-stat visible"><span class="count">${d.visible}</span><span>${esc(t("admin.dashVisible"))}</span></div>
        <div class="dash-stat hidden"><span class="count">${d.hidden}</span><span>${esc(t("admin.dashHidden"))}</span></div>
        <div class="dash-stat expired"><span class="count">${d.expired}</span><span>${esc(t("admin.dashExpired"))}</span></div>
      </div>
      <div class="admin-list" id="dashboardList"></div>`;
    const list = document.getElementById("dashboardList");
    if (!d.items.length) {
      list.innerHTML = `<p class="modal-sub">${esc(t("admin.myOpps.empty"))}</p>`;
    } else {
      d.items.forEach(o => {
        const opp = mapOpp(o);
        list.appendChild(renderOppItem(opp, true, true));
      });
    }
  } catch (err) {
    box.innerHTML = `<p class="modal-sub">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* My opportunities — owner-scoped management list (all statuses). */
async function renderMyOpportunities(){
  const box = document.getElementById("myOppsContent");
  box.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const mine = await api("/opportunities/mine");
    box.innerHTML = "";
    if (!mine.length) {
      box.innerHTML = `<p class="modal-sub">${esc(t("admin.myOpps.empty"))}</p>`;
      return;
    }
    mine.forEach(o => {
      const opp = mapOpp(o);
      box.appendChild(renderOppItem(opp, true, false));
    });
  } catch (err) {
    box.innerHTML = `<p class="modal-sub">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* Build one admin opportunity row with status + permission-aware actions.
   The backend enforces the same rules — this only mirrors them in the UI. */
function renderOppItem(opp, withStatus, withActions){
  const item = document.createElement("div");
  const isMine = opp.created_by === currentUser()?.id;
  const canEdit = isOwner() || hasPerm("edit_any_opportunity") || (isMine && hasPerm("edit_own_opportunity"));
  const canDelete = isOwner() || hasPerm("delete_any_opportunity") || (isMine && hasPerm("delete_own_opportunity"));
  const status = oppStatus(opp);
  item.className = "admin-item" + (isClosed(opp) ? " inactive" : "");
  item.innerHTML = `
    <div class="admin-item-info">
      <h4>${esc(opp.title)}
        ${withStatus ? `<span class="status-badge ${status}">${esc(t("admin.status." + status))}</span>` : ""}
        ${isClosed(opp) ? `<span class="badge closed">${t("card.closed")}</span>` : ""}
      </h4>
      <p>${esc(opp.category)} · ${esc(opp.location)} · ${opp.paid ? t("filter.fundingCharged") : t("filter.fundingFree")}${opp.organizationName ? ` · ${esc(opp.organizationName)}` : ""}</p>
      ${opp.createdByName ? `<p class="modal-hint">${esc(t("admin.addedBy", { name: opp.createdByName }))}</p>` : ""}
    </div>
    <div class="admin-item-actions">
      ${withActions && canEdit ? `<button class="btn btn-outline btn-small" data-act="edit">${data.lang === "ar" ? "تعديل" : "Edit"}</button>` : ""}
      ${withActions && canDelete ? `<button class="btn btn-danger btn-small" data-act="del">${data.lang === "ar" ? "حذف" : "Delete"}</button>` : ""}
    </div>`;
  if (withActions && canEdit) {
    item.querySelector('[data-act="edit"]').addEventListener("click", () => editOpportunity(opp));
  }
  if (withActions && canDelete) {
    item.querySelector('[data-act="del"]').addEventListener("click", () => deleteOpportunity(opp.id));
  }
  return item;
}

/* Visible / Hidden / Expired badge value for an opportunity. */
function oppStatus(opp){
  if (opp.status === "hidden") return "hidden";
  if (opp.status === "archived") return "hidden";
  if (opp.status === "draft") return "hidden";
  if (opp.deadline && new Date(opp.deadline + "T23:59:59") < new Date()) return "expired";
  return "visible";
}

async function renderAdminList(){
  const list = document.getElementById("adminList");
  list.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const all = await api("/opportunities/all");
    list.innerHTML = "";
    all.forEach(o => {
      const opp = mapOpp(o);
      list.appendChild(renderOppItem(opp, true, true));
    });
  } catch (err) {
    list.innerHTML = `<p class="modal-sub">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

function editOpportunity(o){
  document.getElementById("afId").value = o.id;
  document.getElementById("afTitle").value = o.title;
  document.getElementById("afDesc").value = o.desc;
  document.getElementById("afCategory").value = o.category;
  document.getElementById("afLocation").value = o.location;
  document.getElementById("afMode").value = o.mode;
  document.getElementById("afDuration").value = o.duration;
  document.getElementById("afFunding").value = o.paid ? "paid" : "free";
  document.getElementById("afAge").value = o.age || "all";
  document.getElementById("afDeadline").value = o.deadline || "";
  document.getElementById("afLink").value = o.link;
  document.getElementById("afCertificate").checked = !!o.certificate;
  document.getElementById("afSubmit").textContent = data.lang === "ar" ? "حفظ التغييرات" : "Save changes";
  document.getElementById("afCancel").hidden = false;
  document.getElementById("adminForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

document.getElementById("afCancel").addEventListener("click", resetAdminForm);

document.getElementById("adminForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("afId").value;
  const payload = {
    category: document.getElementById("afCategory").value,
    title: document.getElementById("afTitle").value.trim(),
    description: document.getElementById("afDesc").value.trim(),
    location: document.getElementById("afLocation").value.trim(),
    mode: document.getElementById("afMode").value,
    duration: document.getElementById("afDuration").value.trim(),
    funding: document.getElementById("afFunding").value,
    age: document.getElementById("afAge").value,
    deadline: document.getElementById("afDeadline").value || null,
    apply_url: document.getElementById("afLink").value.trim(),
    certificate: document.getElementById("afCertificate").checked,
  };
  if (!payload.title || !payload.description || !payload.apply_url) { showToast(t("toast.oppRequired")); return; }
  try {
    if (id) {
      await api(`/opportunities/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      showToast(t("toast.oppUpdated"));
    } else {
      await api("/opportunities", { method: "POST", body: JSON.stringify(payload) });
      showToast(t("toast.oppAdded"));
    }
    resetAdminForm();
    await Promise.all([renderAdminList(), refreshOpportunities()]);
    render();
  } catch (err) { showToast(err.message || t("toast.needBackend")); }
});

async function deleteOpportunity(id){
  const o = data.opportunities.find(x => x.id === id);
  if (!o) return;
  if (!confirm(t("toast.deleteConfirm", { title: o.title }))) return;
  try {
    await api(`/opportunities/${id}`, { method: "DELETE" });
    showToast(t("toast.oppDeleted"));
    await Promise.all([renderAdminList(), refreshOpportunities()]);
    render();
  } catch (err) { showToast(err.message || t("toast.needBackend")); }
}

/* Admin tabs */
document.querySelectorAll(".admin-tab").forEach(x => {
  x.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach(y => y.classList.toggle("active", y === x));
    document.querySelectorAll(".admin-pane").forEach(p => { p.hidden = p.dataset.apane !== x.dataset.atab; });
  });
});

/* CSV import — parse in the browser, send rows to the API */
document.getElementById("csvImportBtn").addEventListener("click", async () => {
  const raw = document.getElementById("csvInput").value.trim();
  const result = document.getElementById("csvResult");
  if (!raw) { showToast(t("toast.csvBad")); return; }
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) { showToast(t("toast.csvBad")); return; }

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const idx = name => headers.indexOf(name);

  const rows = [];
  let errors = 0;
  const existingTitles = new Set(data.opportunities.map(o => o.title.trim().toLowerCase()));
  let skippedDup = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map(c => c.trim());
    const get = name => (idx(name) >= 0 ? cells[idx(name)] ?? "" : "");
    const title = get("title");
    const category = get("category");
    const link = get("link");
    if (!title || !category || !link) { errors++; continue; }
    // Duplicate detection: skip rows whose title already exists.
    if (existingTitles.has(title.trim().toLowerCase())) { skippedDup++; continue; }
    existingTitles.add(title.trim().toLowerCase());
    rows.push({
      title,
      description: get("description") || "",
      category,
      location: get("location") || "Online",
      mode: ["online","in-person","hybrid"].includes(get("mode")) ? get("mode") : "online",
      duration: get("duration") || "",
      funding: get("funding").toLowerCase() === "paid" ? "paid" : "free",
      age: ["13-15","15-18","+18","all"].includes(get("age")) ? get("age") : "all",
      deadline: get("deadline") || null,
      apply_url: link,
      certificate: get("certificate").toLowerCase() === "yes",
    });
  }
  try {
    const res = await api("/opportunities/import", { method: "POST", body: JSON.stringify({ rows }) });
    document.getElementById("csvInput").value = "";
    showToast(t("toast.csvImported", { n: res.imported }));
    const parts = [];
    if (errors) parts.push(`${errors} skipped (missing fields)`);
    if (skippedDup) parts.push(`${skippedDup} skipped (duplicates)`);
    result.textContent = parts.join(" · ");
    await Promise.all([renderAdminList(), refreshOpportunities()]);
    render();
  } catch (err) {
    showToast(err.message || t("toast.csvBad"));
  }
});

/* Analytics — from the server */
async function renderAnalytics(){
  const box = document.getElementById("analyticsContent");
  box.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const a = await api("/analytics");
    const row = (label, value) => `<div class="analytics-row"><span>${esc(label)}</span><span class="count">${value}</span></div>`;
    const empty = `<p class="modal-sub">${t("admin.analytics.empty")}</p>`;
    const savedRows = (a.most_saved || []).map(x => row(x.title, x.count)).join("");
    const appliedRows = (a.most_applied || []).map(x => row(x.title, x.count)).join("");
    const clickRows = (a.most_clicked || []).map(x => row(x.title, x.count)).join("");
    const adminRows = (a.per_admin || []).map(x => row(x.admin_name || "?", `${x.added_count} added (${x.active_count} open)`)).join("");
    box.innerHTML = `
      <h3 class="analytics-block">${t("admin.analytics.title")}</h3>
      <div class="analytics-block"><h3>${t("admin.analytics.mostSaved")}</h3>${savedRows || empty}</div>
      <div class="analytics-block"><h3>${t("admin.analytics.mostApplied")}</h3>${appliedRows || empty}</div>
      <div class="analytics-block"><h3>${t("admin.analytics.mostClicked")}</h3>${clickRows || empty}</div>
      <div class="analytics-block"><h3>${t("admin.analytics.perAdmin")}</h3>${adminRows || empty}</div>
    `;
  } catch (err) {
    box.innerHTML = `<p class="modal-sub">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* Flagged stories — from the server */
async function renderFlags(){
  const box = document.getElementById("flagsContent");
  box.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const flagged = await api("/stories/flagged");
    if (!flagged.length) { box.innerHTML = `<p class="modal-sub">${t("admin.flags.empty")}</p>`; return; }
    box.innerHTML = flagged.map(s => {
      const opp = data.opportunities.find(o => o.id === s.opportunity_id);
      return `
        <div class="flag-item">
          <div class="story-head">
            <span class="story-author">${esc(s.author_name)}</span>
            <span class="flag-count">${t("story.report")} × ${(s.flags || []).length}</span>
          </div>
          <div class="story-text">${esc(s.experience)}</div>
          <p class="modal-hint">${esc(opp ? opp.title : "")}</p>
          <div class="flag-actions">
            <button class="btn btn-outline btn-small" data-flag-keep="${s.id}">${t("admin.flags.keep")}</button>
            <button class="btn btn-danger btn-small" data-flag-del="${s.id}">${t("admin.flags.remove")}</button>
          </div>
        </div>`;
    }).join("");

    box.querySelectorAll("[data-flag-keep]").forEach(b => {
      b.addEventListener("click", async () => {
        try {
          await api(`/stories/${b.dataset.flagKeep}/clear-flags`, { method: "POST" });
          showToast(t("admin.flags.kept"));
          await renderFlags();
        } catch (err) { showToast(err.message || t("toast.needBackend")); }
      });
    });
    box.querySelectorAll("[data-flag-del]").forEach(b => {
      b.addEventListener("click", async () => {
        try {
          await api(`/stories/${b.dataset.flagDel}`, { method: "DELETE" });
          showToast(t("admin.flags.removed"));
          await renderFlags();
        } catch (err) { showToast(err.message || t("toast.needBackend")); }
      });
    });
  } catch (err) {
    box.innerHTML = `<p class="modal-sub">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* Admins tab — list existing admins + create new ones */
async function renderAdmins(){
  const box = document.getElementById("adminUsersList");
  box.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const admins = await api("/auth/admins");
    box.innerHTML = "";
    if (!admins.length) {
      box.innerHTML = `<p class="modal-sub">${t("admin.admins.empty")}</p>`;
      return;
    }
    admins.forEach(a => {
      const item = document.createElement("div");
      item.className = "admin-item";
      item.innerHTML = `
        <div class="admin-item-info">
          <h4>${esc(a.nickname || a.full_name || a.email)}</h4>
          <p>${esc(a.email)} · ${esc(a.full_name || "")}</p>
        </div>
        <div class="admin-item-actions">
          <span class="badge" style="background:var(--primary)">${t("auth.loginBtn") === "Log in" ? "Admin" : "مشرف"}</span>
        </div>`;
      box.appendChild(item);
    });
  } catch (err) {
    box.innerHTML = `<p class="modal-sub">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* Users tab — all registered accounts (OWNER). */
async function renderUsers(){
  const box = document.getElementById("usersContent");
  box.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const users = await api("/auth/users");
    box.innerHTML = "";
    if (!users.length) {
      box.innerHTML = `<p class="modal-sub">No users yet.</p>`;
      return;
    }
    users.forEach(u => {
      const item = document.createElement("div");
      item.className = "admin-item";
      const roleLabel = u.role === "owner" ? "OWNER" : (u.role === "admin" ? t("profile.roleAdmin") : t("profile.roleUser"));
      item.innerHTML = `
        <div class="admin-item-info">
          <h4>${esc(u.full_name || u.email)}</h4>
          <p>${esc(u.email)}</p>
        </div>
        <div class="admin-item-actions">
          <span class="badge" style="background:${u.role === "owner" ? "var(--secondary)" : "var(--primary)"}">${esc(roleLabel)}</span>
        </div>`;
      box.appendChild(item);
    });
  } catch (err) {
    box.innerHTML = `<p class="modal-sub">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

/* Organizations tab — NGOs (OWNER). */
async function renderOrganizations(){
  const box = document.getElementById("organizationsContent");
  box.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const orgs = await api("/auth/organizations");
    box.innerHTML = "";
    if (!orgs.length) {
      box.innerHTML = `<p class="modal-sub">No organizations yet.</p>`;
      return;
    }
    orgs.forEach(o => {
      const item = document.createElement("div");
      item.className = "admin-item";
      item.innerHTML = `
        <div class="admin-item-info">
          <h4>${esc(o.name)}</h4>
          ${o.website ? `<p>${esc(o.website)}</p>` : ""}
        </div>`;
      box.appendChild(item);
    });
  } catch (err) {
    box.innerHTML = `<p class="modal-sub">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}
async function renderApplications(){
  const box = document.getElementById("applicationsContent");
  box.innerHTML = `<p class="modal-sub">${t("common.loading")}</p>`;
  try {
    const apps = await api("/auth/admin-applications");
    box.innerHTML = "";
    if (!apps.length) {
      box.innerHTML = `<p class="modal-sub">${t("admin.applications.empty")}</p>`;
      return;
    }
    apps.forEach(a => {
      const item = document.createElement("div");
      item.className = "admin-item";
      item.innerHTML = `
        <div class="admin-item-info">
          <h4>${esc(a.full_name || a.email)}</h4>
          <p>${esc(a.email)}${a.organization ? ` · ${esc(a.organization)}` : ""}</p>
          ${a.reason ? `<p class="modal-hint">${esc(a.reason)}</p>` : ""}
        </div>
        <div class="admin-item-actions">
          <button class="btn btn-primary btn-small" data-aa="approve">${esc(t("admin.approve"))}</button>
          <button class="btn btn-danger btn-small" data-aa="reject">${esc(t("admin.reject"))}</button>
        </div>`;
      item.querySelector('[data-aa="approve"]').addEventListener("click", () => reviewApplication(a.id, "approve"));
      item.querySelector('[data-aa="reject"]').addEventListener("click", () => reviewApplication(a.id, "reject"));
      box.appendChild(item);
    });
  } catch (err) {
    box.innerHTML = `<p class="modal-sub">${esc(err.message || t("toast.needBackend"))}</p>`;
  }
}

async function reviewApplication(appId, action){
  try {
    await api(`/auth/admin-applications/${appId}/${action}`, { method: "POST" });
    showToast(action === "approve" ? t("admin.approved") : t("admin.rejected"));
    await renderApplications();
  } catch (err) {
    showToast(err.message || t("toast.needBackend"));
  }
}

/* Admins are created via the application flow (or by the operator); the
   Admins tab only lists existing admin accounts. */

/* =========================================================
   Language toggle + privacy
   ========================================================= */
langToggle.addEventListener("click", () => {
  data.lang = data.lang === "ar" ? "en" : "ar";
  saveLang();
  applyI18n();
  langToggle.textContent = data.lang === "ar" ? "English" : "العربية";
  renderNav(); render(); renderReminder();
});

privacyBtn.addEventListener("click", () => {
  document.getElementById("privacyBody").innerHTML = `
    <h3>${t("privacy.title")}</h3>
    <p>${t("privacy.p1")}</p>
    <p>${t("privacy.p2")}</p>
    <p>${t("privacy.p3")}</p>
    <p>${t("privacy.p4")}</p>
    <p>${t("privacy.p5")}</p>
  `;
  openModal(privacyModal);
});

/* =========================================================
   Wire up the remaining controls
   ========================================================= */
searchInput.addEventListener("input", render);
searchBtn.addEventListener("click", render);
/* Nav search mirrors the hero search field. */
navSearchInput.addEventListener("input", () => {
  searchInput.value = navSearchInput.value;
  render();
});
searchInput.addEventListener("input", () => {
  navSearchInput.value = searchInput.value;
});
modeFilter.addEventListener("change", render);
fundingFilter.addEventListener("change", render);
ageFilter.addEventListener("change", render);
certFilter.addEventListener("change", render);
locationFilter.addEventListener("change", render);
durationFilter.addEventListener("change", render);
sortFilter.addEventListener("change", render);
clearFiltersBtn.addEventListener("click", () => {
  searchInput.value = "";
  navSearchInput.value = "";
  activeCats.clear();
  document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
  modeFilter.value = "all";
  fundingFilter.value = "all";
  ageFilter.value = "all";
  certFilter.value = "all";
  locationFilter.value = "all";
  durationFilter.value = "all";
  sortFilter.value = "newest";
  render();
});

/* "Surprise me" in the hero — opens a random open opportunity. */
if (surpriseBtn2) {
  surpriseBtn2.addEventListener("click", () => {
    const open = data.opportunities.filter(o => !isClosed(o));
    if (!open.length) { showToast(t("empty.text")); return; }
    const pick = open[Math.floor(Math.random() * open.length)];
    openDetail(pick.id);
  });
}

/* Footer category list — clicking a category toggles its pill. */
if (footerCatsEl) {
  CATEGORIES.forEach(cat => {
    const li = document.createElement("li");
    li.textContent = cat.label;
    li.addEventListener("click", () => {
      document.querySelectorAll(".pill").forEach(p => {
        if (p.dataset.cat === cat.key && !p.classList.contains("active")) p.click();
      });
      document.getElementById("about").scrollIntoView({ behavior: "smooth" });
    });
    footerCatsEl.appendChild(li);
  });
}

document.querySelectorAll(".modal-close").forEach(b => {
  b.addEventListener("click", () => closeModal(document.getElementById(b.dataset.close)));
});
document.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", (e) => { if (e.target === m) closeModal(m); });
  // Basic a11y: return focus to the close button when the modal is dismissed.
  m.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal(m);
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal").forEach(m => { if (!m.hidden) closeModal(m); });
  }
});

if (!data.onboarded) onboarding.hidden = false;
onboardingClose.addEventListener("click", () => {
  onboarding.hidden = true;
  data.onboarded = true;
  saveOnboarded();
});

yearSpan.textContent = new Date().getFullYear();

/* =========================================================
   Enhancements: theme, surprise, loading, CSV export, share
   ========================================================= */
const themeToggle = document.getElementById("themeToggle");
const surpriseBtn = document.getElementById("surpriseBtn");
const loadingState = document.getElementById("loadingState");

/* Dark mode — persisted in localStorage, toggled via .dark on <html> */
function applyTheme(){
  const dark = localStorage.getItem("darb_theme") === "dark";
  if (document.documentElement && document.documentElement.classList) {
    document.documentElement.classList.toggle("dark", dark);
  }
  if (themeToggle) themeToggle.textContent = t(dark ? "theme.light" : "theme.dark");
}
themeToggle.addEventListener("click", () => {
  const dark = localStorage.getItem("darb_theme") !== "dark";
  localStorage.setItem("darb_theme", dark ? "dark" : "light");
  applyTheme();
});

/* Surprise me — open a random open opportunity */
surpriseBtn.addEventListener("click", () => {
  const open = data.opportunities.filter(o => !isClosed(o));
  if (!open.length) { showToast(t("empty.text")); return; }
  const pick = open[Math.floor(Math.random() * open.length)];
  openDetail(pick.id);
});

/* Loading state — show while booting */
function setLoading(on){
  if (loadingState) loadingState.classList.toggle("show", on);
  grid.hidden = on;
  emptyState.hidden = on;
}

/* CSV export — download all opportunities as a spreadsheet-friendly file */
document.getElementById("csvExportBtn").addEventListener("click", async () => {
  try {
    const all = await api("/opportunities/all");
    const header = "title,description,category,location,mode,duration,funding,age,deadline,link,certificate\n";
    const rows = all.map(o =>
      [o.title, o.description, o.category, o.location, o.mode, o.duration,
       o.funding, o.age, o.deadline || "", o.apply_url, o.certificate ? "yes" : "no"]
        .map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "darb-opportunities.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    showToast(err.message || t("toast.needBackend"));
  }
});

/* Shareable link: ?opp=<id> opens that opportunity on load */
function handleShareLink(){
  if (typeof location === "undefined" || typeof URLSearchParams === "undefined") return;
  try {
    const params = new URLSearchParams(location.search);
    const id = Number(params.get("opp"));
    if (id && data.opportunities.some(o => o.id === id)) {
      openDetail(id);
    }
  } catch (e) { /* ignore */ }
}

/* =========================================================
   PWA: service worker (offline support)
   ========================================================= */
/* Register the service worker (PWA offline). */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* =========================================================
   Boot — load opportunities from the API, then paint.
   ========================================================= */
async function refreshOpportunities(){
  try {
    const list = await api("/opportunities", { auth: false });
    data.opportunities = list.map(mapOpp);
    return true;
  } catch (e) {
    return false;
  }
}

(async function boot(){
  applyI18n();
  applyTheme();
  langToggle.textContent = data.lang === "ar" ? "English" : "العربية";
  setLoading(true);

  /* Restore the cached user snapshot first so the account chip renders
     immediately; refreshSession() then re-validates against the backend. */
  if (data.sessionUserId) {
    try {
      const cached = JSON.parse(localStorage.getItem("darb_user") || "null");
      if (cached && cached.id === data.sessionUserId) {
        data.currentUser = cached;
        data.isAdmin = !!cached.is_staff;
        data.role = cached.role || (cached.is_staff ? "admin" : "user");
        data.permissions = cached.permissions || [];
      }
    } catch (e) { /* ignore corrupt cache */ }
  }

  const ok = await refreshOpportunities();
  setLoading(false);
  if (!ok) {
    showToast(t("toast.needBackend"));
    grid.innerHTML = "";
    emptyState.classList.add("show");
    emptyState.querySelector("p").textContent = t("toast.needBackend");
  }

  if (data.sessionUserId) {
    try { await refreshSession(); } catch (e) {}
    try { await loadMyData(); } catch (e) {}
  }

  renderNav();
  render();
  renderReminder();
  renderProfile();
  renderRecs();
  handleShareLink();
})();