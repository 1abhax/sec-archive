// ==========================================
// CTF Writeups Site (Level 2 - Stable)
// - Home: event cards (no sidebar)
// - Event: sidebar tree rendered once per event (no rebuild on file click)
// - File preview: md/text/json/image/pdf(embed)/zip(download)
// - Tooltip: custom hover message
// - TOC: optional (no "On this page" title)
// ==========================================

let CFG = {};
let ORDER = {};

const cacheDir = new Map();     // path -> contents[]
const cacheItem = new Map();    // file path -> item metadata
const sidebarState = {
  currentEventRoot: null,
  rendered: false,
};

const state = {
  view: "home",
  eventName: null,
  currentFilePath: null,
  tocEnabled: true,
  theme: "light",
  search: "",
};

window.addEventListener("load", init);

async function init() {
  bindUI();
  restorePrefs();

  await loadConfig();
  await loadOrder();

  document.getElementById("repoLink").href = `https://github.com/${CFG.user}/${CFG.repo}`;
  applyBackground();

  await renderHome();
  await route();

  window.addEventListener("hashchange", route);
}

// ---------------- UI ----------------
function bindUI() {
  document.getElementById("homeBtn").addEventListener("click", () => { location.hash = "#/"; });

  document.getElementById("toggleTheme").addEventListener("click", () => {
    state.theme = document.body.classList.contains("dark") ? "light" : "dark";
    document.body.classList.toggle("dark", state.theme === "dark");
    localStorage.setItem("theme", state.theme);
  });

  document.getElementById("toggleToc").addEventListener("click", () => {
    state.tocEnabled = !state.tocEnabled;
    localStorage.setItem("toc_enabled", state.tocEnabled ? "1" : "0");
    updateTocVisibility();
  });

  const searchBox = document.getElementById("searchBox");
  const clearSearch = document.getElementById("clearSearch");

  searchBox.addEventListener("input", () => {
    state.search = (searchBox.value || "").trim().toLowerCase();
    filterTree(state.search);
  });

  clearSearch.addEventListener("click", () => {
    searchBox.value = "";
    state.search = "";
    filterTree("");
    searchBox.focus();
  });

  // Tooltip (single instance)
  const tip = document.getElementById("tooltip");
  window.addEventListener("scroll", () => hideTooltip()); // avoid stuck tooltip
  window.addEventListener("blur", () => hideTooltip());
  tip.addEventListener("mouseenter", () => hideTooltip());
}

function restorePrefs() {
  state.theme = localStorage.getItem("theme") || "light";
  document.body.classList.toggle("dark", state.theme === "dark");

  state.tocEnabled = (localStorage.getItem("toc_enabled") ?? "1") === "1";
  updateTocVisibility();
}

function updateTocVisibility() {
  const toc = document.getElementById("toc");
  toc.classList.toggle("hidden", !state.tocEnabled || state.view !== "event");
}

function setView(view) {
  state.view = view;
  document.getElementById("homeView").classList.toggle("hidden", view !== "home");
  document.getElementById("eventView").classList.toggle("hidden", view !== "event");
  updateTocVisibility();
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 1200);
}

function setCrumbs(parts) {
  const el = document.getElementById("crumbs");
  el.innerHTML = "";
  if (!parts || !parts.length) return;

  parts.forEach((p, idx) => {
    if (idx > 0) {
      const sep = document.createElement("span");
      sep.className = "sep";
      sep.textContent = "/";
      el.appendChild(sep);
    }
    if (p.href) {
      const a = document.createElement("a");
      a.href = p.href;
      a.textContent = p.text;
      el.appendChild(a);
    } else {
      const s = document.createElement("span");
      s.textContent = p.text;
      el.appendChild(s);
    }
  });
}

// ---------------- Config / Order / Background ----------------
async function loadConfig() {
  const res = await fetch("data/config.json");
  if (!res.ok) throw new Error(`Failed to load config.json: ${res.status}`);
  CFG = await res.json();
}

async function loadOrder() {
  try {
    const res = await fetch("data/order.json");
    ORDER = await res.json();
  } catch {
    ORDER = {};
  }
}

function applyBackground() {
  const bg = document.getElementById("bg");
  const list = Array.isArray(CFG.backgrounds) ? CFG.backgrounds : [];
  if (!list.length) return;
  const pick = list[Math.floor(Math.random() * list.length)];
  bg.style.backgroundImage = `url("${pick}")`;
  bg.style.backgroundSize = "cover";
  bg.style.backgroundPosition = "center";
}

// ---------------- Routing ----------------
async function route() {
  const h = location.hash || "#/";
  const parts = h.replace(/^#\/?/, "").split("/").filter(Boolean);

  // Home
  if (parts.length === 0) {
    setView("home");
    setCrumbs([]);
    return;
  }

  // Expect: event/<name>[/file/<path>]
  if (parts[0] !== "event") {
    setView("home");
    setCrumbs([]);
    return;
  }

  const eventName = decodeURIComponent(parts[1] || "");
  if (!eventName) {
    setView("home");
    setCrumbs([]);
    return;
  }

  setView("event");

  const eventRoot = `${CFG.content_dir}/${eventName}`;
  const eventChanged = (state.eventName !== eventName);

  state.eventName = eventName;
  document.getElementById("sidebarTitle").textContent = eventName;

  // Build sidebar ONLY when event changes (key requirement)
  if (eventChanged || sidebarState.currentEventRoot !== eventRoot || !sidebarState.rendered) {
    await renderEventSidebar(eventRoot);
    sidebarState.currentEventRoot = eventRoot;
    sidebarState.rendered = true;
  }

  // Base crumbs
  setCrumbs([
    { text: "Home", href: "#/" },
    { text: eventName, href: `#/event/${encodeURIComponent(eventName)}` }
  ]);

  // file route
  if (parts[2] === "file") {
    const filePath = decodeURIComponent(parts.slice(3).join("/") || "");
    if (filePath) {
      await openFile(filePath);
      markActiveNode(filePath);
      return;
    }
  }

  // default event landing
  showEventLanding(eventName);
}

// ---------------- GitHub helpers ----------------
function githubContentsUrl(path) {
  return `https://api.github.com/repos/${CFG.user}/${CFG.repo}/contents/${path}?ref=${CFG.branch}`;
}

function rawUrl(path) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${CFG.user}/${CFG.repo}/${CFG.branch}/${encoded}`;
}

async function fetchDir(path) {
  if (cacheDir.has(path)) return cacheDir.get(path);
  const res = await fetch(githubContentsUrl(path), { cache: "force-cache" });
  if (!res.ok) throw new Error(`Unable to read dir "${path}": HTTP ${res.status}`);
  const items = await res.json();
  cacheDir.set(path, items);
  return items;
}

function sortItems(path, items) {
  const list = ORDER.order?.[path] || [];
  const map = new Map();
  list.forEach((name, i) => map.set(name, i));

  return items.slice().sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;

    const ia = map.has(a.name) ? map.get(a.name) : 9999;
    const ib = map.has(b.name) ? map.get(b.name) : 9999;
    if (ia !== ib) return ia - ib;

    return a.name.localeCompare(b.name);
  });
}

// ---------------- Home ----------------
async function renderHome() {
  setView("home");
  setCrumbs([]);

  const meta = document.getElementById("homeMeta");
  meta.textContent = `Repo: ${CFG.user}/${CFG.repo} · branch: ${CFG.branch} · root: ${CFG.content_dir}`;

  const grid = document.getElementById("eventGrid");
  grid.innerHTML = "";

  const items = await fetchDir(CFG.content_dir);
  const dirs = sortItems(CFG.content_dir, items).filter(x => x.type === "dir");

  dirs.forEach(dir => {
    const tile = document.createElement("div");
    tile.className = "card tile";
    tile.innerHTML = `
      <div class="tile-pill">event</div>
      <div class="tile-title">${escapeHtml(dir.name)}</div>
      <div class="tile-sub">點擊進入分類與題目</div>
    `;
    tile.addEventListener("click", () => {
      location.hash = `#/event/${encodeURIComponent(dir.name)}`;
    });
    grid.appendChild(tile);
  });
}

function showEventLanding(eventName) {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="welcome">
      <div class="welcome-title">${escapeHtml(eventName)}</div>
      <div class="welcome-subtitle">請從左側選擇分類或檔案。點檔案只更新中間頁面。</div>
    </div>
  `;
  clearToc();
}

// ---------------- Sidebar ----------------
async function renderEventSidebar(eventRootPath) {
  const tree = document.getElementById("tree");
  tree.innerHTML = "";

  // reset search UI only when entering event
  const searchBox = document.getElementById("searchBox");
  searchBox.value = "";
  state.search = "";

  // Root node
  const root = createNode({ type: "dir", name: state.eventName, path: eventRootPath }, { isRoot: true });
  tree.appendChild(root.node);
  tree.appendChild(root.children);

  // auto open root
  root.children.style.display = "block";
  await expandDirInto(eventRootPath, root.children);
}

async function expandDirInto(path, container) {
  // If already expanded and filled, do nothing (avoid re-render)
  if (container.dataset.loaded === "1") return;

  container.dataset.loaded = "1";
  container.innerHTML = `<div class="welcome-subtitle">Loading…</div>`;

  let items;
  try {
    items = await fetchDir(path);
  } catch (e) {
    container.innerHTML = `<div class="welcome-subtitle">❌ ${escapeHtml(String(e.message || e))}</div>`;
    return;
  }

  container.innerHTML = "";
  const sorted = sortItems(path, items);

  sorted.forEach(item => {
    const n = createNode(item);
    container.appendChild(n.node);
    container.appendChild(n.children);
  });

  filterTree(state.search);
}

function createNode(item, opts = {}) {
  const node = document.createElement("div");
  node.className = "node";
  node.dataset.path = item.path;
  node.dataset.type = item.type;
  node.dataset.name = (item.name || "").toLowerCase();

  const left = document.createElement("div");
  left.className = "name";
  left.textContent = `${iconFor(item.name, item.type)} ${item.name}`;

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = badgeFor(item.name, item.type);

  node.appendChild(left);
  node.appendChild(badge);

  const children = document.createElement("div");
  children.className = "children";
  children.dataset.path = item.path;

  // Custom tooltip
  const tipText = makeTipText(item);
  node.addEventListener("mouseenter", (ev) => showTooltip(tipText, ev));
  node.addEventListener("mousemove", (ev) => moveTooltip(ev));
  node.addEventListener("mouseleave", () => hideTooltip());

  if (item.type === "dir") {
    node.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      const open = children.style.display === "block";
      children.style.display = open ? "none" : "block";

      if (!open) {
        await expandDirInto(item.path, children);
      }
      markActiveNode(item.path);
    });
  } else {
    node.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      await openFile(item.path);              // only update middle
      markActiveNode(item.path);              // update active style
      location.hash = `#/event/${encodeURIComponent(state.eventName)}/file/${encodeURIComponent(item.path)}`;
    });
  }

  if (opts.isRoot) node.classList.add("active");
  return { node, children };
}

function filterTree(q) {
  q = (q || "").trim().toLowerCase();
  const tree = document.getElementById("tree");
  if (!tree) return;

  const nodes = tree.querySelectorAll(".node");
  const children = tree.querySelectorAll(".children");

  if (!q) {
    nodes.forEach(n => n.style.display = "flex");
    return;
  }

  nodes.forEach(n => n.style.display = "none");
  children.forEach(c => c.style.display = "none");

  nodes.forEach(n => {
    const name = n.dataset.name || "";
    const path = (n.dataset.path || "").toLowerCase();
    if (name.includes(q) || path.includes(q)) {
      n.style.display = "flex";
      let p = n.parentElement;
      while (p && p.id !== "tree") {
        if (p.classList.contains("children")) {
          p.style.display = "block";
          const parentNode = p.previousElementSibling;
          if (parentNode && parentNode.classList.contains("node")) parentNode.style.display = "flex";
        }
        p = p.parentElement;
      }
    }
  });
}

function markActiveNode(path) {
  document.querySelectorAll(".node").forEach(n => n.classList.remove("active"));
  const t = document.querySelector(`.node[data-path="${cssEscape(path)}"]`);
  if (t) t.classList.add("active");
}

// ---------------- File open / render ----------------
async function openFile(path) {
  state.currentFilePath = path;

  // crumbs
  const eventRoot = `${CFG.content_dir}/${state.eventName}`;
  const rel = path.startsWith(eventRoot + "/") ? path.slice(eventRoot.length + 1) : path;
  const segs = rel.split("/");

  setCrumbs([
    { text: "Home", href: "#/" },
    { text: state.eventName, href: `#/event/${encodeURIComponent(state.eventName)}` },
    ...segs.slice(0, -1).map((s, i) => ({ text: s })),
    { text: segs[segs.length - 1] }
  ]);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="welcome">
      <div class="welcome-title">Loading…</div>
      <div class="welcome-subtitle">${escapeHtml(path)}</div>
    </div>
  `;
  clearToc();

  const item = await getItemFromParent(path);
  const name = item?.name || path.split("/").pop();

  const kind = fileKindByName(name);
  const head = renderFileHead({
    name,
    path,
    type: kind.kind,
    ext: kind.ext,
    size: item?.size ?? 0,
    downloadUrl: item?.download_url || rawUrl(path),
  });

  if (kind.kind === "markdown") return renderMarkdownFile(path, head);
  if (kind.kind === "json") return renderJsonFile(path, head);
  if (kind.kind === "text") return renderTextFile(path, head);
  if (kind.kind === "image") return renderImageFile(path, head);
  if (kind.kind === "pdf") return renderPdfFile(path, head);
  if (kind.kind === "zip") return renderDownloadOnly(head, "此檔案無法預覽，請下載。");

  return renderDownloadOnly(head, "此檔案類型無法預覽，請下載或使用 raw 連結。", rawUrl(path));
}

async function getItemFromParent(path) {
  if (cacheItem.has(path)) return cacheItem.get(path);

  const parts = path.split("/");
  const name = parts.pop();
  const parent = parts.join("/");

  try {
    const items = await fetchDir(parent);
    const found = items.find(x => x.name === name);
    if (found) cacheItem.set(path, found);
    return found || null;
  } catch {
    return null;
  }
}

function renderFileHead({ name, path, type, ext, size, downloadUrl }) {
  const wrap = document.createElement("div");
  wrap.className = "file-head";

  const left = document.createElement("div");
  left.innerHTML = `
    <div class="title">file ${escapeHtml(name)}</div>
    <div class="meta">
Type: ${escapeHtml(type)}${ext ? " (" + escapeHtml(ext) + ")" : ""}
Size: ${formatBytes(size)}
Path: ${escapeHtml(path)}
    </div>
  `;

  const actions = document.createElement("div");
  actions.className = "file-actions";

  const dl = document.createElement("a");
  dl.className = "btn";
  dl.href = downloadUrl;
  dl.target = "_blank";
  dl.rel = "noreferrer";
  dl.textContent = "Download";

  actions.appendChild(dl);
  wrap.appendChild(left);
  wrap.appendChild(actions);

  return wrap;
}

async function renderMarkdownFile(path, headEl) {
  setTocMeta(path);

  let md;
  try {
    const res = await fetch(rawUrl(path), { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    md = await res.text();
  } catch (e) {
    return renderError(headEl, `無法載入 Markdown：${String(e.message || e)}`);
  }

  marked.setOptions({ gfm: true, breaks: false });
  const html = marked.parse(md);

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  const body = document.createElement("div");
  body.className = "markdown-content";
  body.innerHTML = html;
  content.appendChild(body);

  if (state.tocEnabled) buildTOC();
  addCopyButtonsToCodeBlocks(content);

  toast("Loaded");
}

async function renderTextFile(path, headEl) {
  clearToc();

  let text;
  try {
    const res = await fetch(rawUrl(path), { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (e) {
    return renderError(headEl, `無法載入文字檔：${String(e.message || e)}`);
  }

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.className = "text-view";
  code.textContent = text;
  pre.appendChild(code);
  content.appendChild(pre);

  addCopyButtonsToCodeBlocks(content);
  toast("Loaded");
}

async function renderJsonFile(path, headEl) {
  clearToc();

  let text;
  try {
    const res = await fetch(rawUrl(path), { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (e) {
    return renderError(headEl, `無法載入 JSON：${String(e.message || e)}`);
  }

  let pretty = text;
  try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch {}

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.className = "text-view";
  code.textContent = pretty;
  pre.appendChild(code);
  content.appendChild(pre);

  addCopyButtonsToCodeBlocks(content);
  toast("Loaded");
}

async function renderImageFile(path, headEl) {
  clearToc();

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  const img = document.createElement("img");
  img.className = "img-view";
  img.src = rawUrl(path);
  img.alt = path.split("/").pop();

  content.appendChild(img);
  toast("Loaded");
}

async function renderPdfFile(path, headEl) {
  clearToc();

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  const frame = document.createElement("iframe");
  frame.style.width = "100%";
  frame.style.height = "72vh";
  frame.style.border = "1px solid var(--border)";
  frame.style.borderRadius = "16px";
  frame.style.background = "rgba(255,255,255,0.55)";
  frame.src = rawUrl(path);

  const hint = document.createElement("div");
  hint.className = "welcome-subtitle";
  hint.style.marginTop = "12px";
  hint.textContent = "若 PDF 無法嵌入顯示，請直接 Download 下載。";

  content.appendChild(frame);
  content.appendChild(hint);

  toast("Loaded");
}

function renderDownloadOnly(headEl, msg, raw) {
  clearToc();

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  const box = document.createElement("div");
  box.className = "welcome";
  box.innerHTML = `
    <div class="welcome-title">Download only</div>
    <div class="welcome-subtitle">${escapeHtml(msg)}</div>
  `;
  if (raw) {
    const p = document.createElement("div");
    p.className = "welcome-subtitle";
    p.style.marginTop = "10px";
    p.innerHTML = `Raw: <a href="${raw}" target="_blank" rel="noreferrer">${escapeHtml(raw)}</a>`;
    box.appendChild(p);
  }

  content.appendChild(box);
  toast("Ready");
}

function renderError(headEl, msg) {
  clearToc();

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  const box = document.createElement("div");
  box.className = "welcome";
  box.innerHTML = `
    <div class="welcome-title">Error</div>
    <div class="welcome-subtitle">${escapeHtml(msg)}</div>
  `;
  content.appendChild(box);
  toast("Error");
}

// ---------------- TOC ----------------
function setTocMeta(text) {
  const tocMeta = document.getElementById("tocMeta");
  tocMeta.textContent = text || "";
}

function clearToc() {
  setTocMeta("");
  document.getElementById("tocBody").innerHTML = "";
}

function buildTOC() {
  const tocBody = document.getElementById("tocBody");
  tocBody.innerHTML = "";

  const headings = document.querySelectorAll("#content .markdown-content h2, #content .markdown-content h3");
  if (!headings.length) {
    tocBody.innerHTML = `<div class="welcome-subtitle">No headings</div>`;
    return;
  }

  const links = [];
  headings.forEach(h => {
    const id = makeHeadingId(h.innerText);
    h.id = id;

    const a = document.createElement("a");
    a.href = "#";
    a.textContent = h.innerText;
    if (h.tagName.toLowerCase() === "h3") a.style.paddingLeft = "18px";

    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    });

    tocBody.appendChild(a);
    links.push({ id, a });
  });

  const obs = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length) setActive(visible[0].target.id);
  }, { rootMargin: "-20% 0px -70% 0px", threshold: [0, 1] });

  headings.forEach(h => obs.observe(h));
  setActive(headings[0].id);

  function setActive(id) {
    links.forEach(x => x.a.classList.toggle("active", x.id === id));
  }
}

// ---------------- Copy buttons ----------------
function addCopyButtonsToCodeBlocks(rootEl) {
  const pres = rootEl.querySelectorAll("pre");
  pres.forEach(pre => {
    if (pre.querySelector(".copy-btn")) return;

    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.textContent = "Copy";

    btn.addEventListener("click", async () => {
      const code = pre.querySelector("code");
      const text = code ? code.textContent : pre.textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied";
        toast("Copied");
        setTimeout(() => btn.textContent = "Copy", 900);
      } catch {
        toast("Copy failed");
      }
    });

    pre.appendChild(btn);
  });
}

// ---------------- Tooltip ----------------
function makeTipText(item) {
  if (item.type === "dir") {
    return `folder ${item.name}\n${item.path}\nClick to expand/collapse`;
  }
  const size = formatBytes(item.size || 0);
  return `file ${item.name}\n${item.path}\nSize: ${size}\nClick to open`;
}

function showTooltip(text, ev) {
  const tip = document.getElementById("tooltip");
  tip.textContent = text || "";
  tip.classList.remove("hidden");
  moveTooltip(ev);
}

function moveTooltip(ev) {
  const tip = document.getElementById("tooltip");
  if (tip.classList.contains("hidden")) return;

  const pad = 14;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // default near cursor
  let x = ev.clientX + 14;
  let y = ev.clientY + 14;

  // prevent overflow
  const rect = tip.getBoundingClientRect();
  if (x + rect.width + pad > vw) x = ev.clientX - rect.width - 14;
  if (y + rect.height + pad > vh) y = ev.clientY - rect.height - 14;

  tip.style.left = `${Math.max(pad, x)}px`;
  tip.style.top = `${Math.max(pad, y)}px`;
}

function hideTooltip() {
  const tip = document.getElementById("tooltip");
  tip.classList.add("hidden");
}

// ---------------- File type mapping ----------------
function fileKindByName(name) {
  const lower = (name || "").toLowerCase();
  const hasExt = lower.includes(".");
  const ext = hasExt ? lower.split(".").pop() : "";

  // no extension => text
  if (!hasExt) return { kind: "text", ext: "" };

  if (ext === "md") return { kind: "markdown", ext };
  if (ext === "json") return { kind: "json", ext };
  if (ext === "pdf") return { kind: "pdf", ext };
  if (ext === "zip") return { kind: "zip", ext };

  if (["png","jpg","jpeg","gif","webp","svg"].includes(ext)) return { kind: "image", ext };

  if (["py","js","ts","c","cpp","h","hpp","java","go","rs","sh","bash","zsh","txt","log","ini","conf","yaml","yml","toml","sql"].includes(ext)) {
    return { kind: "text", ext };
  }

  return { kind: "other", ext };
}

function iconFor(name, type) {
  if (type === "dir") return "📁";
  const lower = (name || "").toLowerCase();
  if (lower.endsWith(".md")) return "📝";
  if (lower.endsWith(".py")) return "🐍";
  if (lower.endsWith(".txt") || !lower.includes(".")) return "📄";
  if (lower.endsWith(".json")) return "🧩";
  if (lower.endsWith(".pdf")) return "📑";
  if (lower.endsWith(".zip")) return "📦";
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower)) return "🖼️";
  return "📄";
}

function badgeFor(name, type) {
  if (type === "dir") return "dir";
  const lower = (name || "").toLowerCase();
  if (!lower.includes(".")) return "text";
  return lower.split(".").pop();
}

// ---------------- Utils ----------------
function makeHeadingId(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "")
    .slice(0, 80) || "section";
}

function formatBytes(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num) || num <= 0) return "0 B";
  const units = ["B","KB","MB","GB"];
  let i = 0;
  let v = num;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replaceAll('"','\\"');
}