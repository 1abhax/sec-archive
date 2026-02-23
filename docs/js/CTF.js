const USER   = "1abhax";
const REPO   = "sec-archive";
const BRANCH = "main";

const CACHE_PREFIX = "sec_v1:";

/* ===== Public API ===== */
export async function loadCTFEvent(eventName) {
  const content = document.getElementById("content");
  const toc     = document.getElementById("tocContent");
  if (!content || !toc) return;

  content.innerHTML = `<h2>${esc(eventName)}</h2><p class="muted">Loading...</p>`;
  toc.innerHTML     = `<h3>Challenges</h3><p class="muted">Loading...</p>`;

  try {
    const readmes = await collectReadmes(eventName);

    if (!readmes.length) {
      content.innerHTML = `<h2>${esc(eventName)}</h2><p>No README found.</p>`;
      toc.innerHTML     = `<h3>Challenges</h3><p class="muted">No entries.</p>`;
      return;
    }

    renderChallengeList(readmes);
    await loadFile(readmes[0].path);

  } catch (err) {
    console.error("loadCTFEvent error:", err);
    content.innerHTML = `<h2>${esc(eventName)}</h2><p>Load failed. Try again later.</p>`;
    toc.innerHTML     = `<h3>Challenges</h3><p class="muted">Error.</p>`;
  }
}

/* ===== Collect READMEs ===== */
async function collectReadmes(eventName) {
  const result     = [];
  const categories = await fetchDirCached(`CTF/${eventName}`);

  if (!Array.isArray(categories)) return result;

  for (const cat of categories) {
    if (!cat || cat.type !== "dir") continue;

    const challenges = await fetchDirCached(cat.path);
    if (!Array.isArray(challenges)) continue;

    for (const chall of challenges) {
      if (!chall || chall.type !== "dir") continue;

      const files = await fetchDirCached(chall.path);
      if (!Array.isArray(files)) continue;

      const readme = files.find(
        (f) => f.type === "file" && (f.name || "").toLowerCase() === "readme.md"
      );
      if (!readme) continue;

      result.push({
        category:  (cat.name || "").toLowerCase(),
        challenge: chall.name || "",
        path:      readme.path,
      });
    }
  }

  result.sort((a, b) => {
    const c = a.category.localeCompare(b.category);
    return c !== 0 ? c : a.challenge.localeCompare(b.challenge);
  });

  return result;
}

/* ===== Fetch with sessionStorage cache ===== */
async function fetchDirCached(path) {
  const key = CACHE_PREFIX + "dir:" + path;

  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch (_) { /* ignore */ }

  const url = `https://api.github.com/repos/${USER}/${REPO}/contents/${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!res.ok) {
    console.warn("fetchDir failed:", path, res.status);
    return [];
  }

  const json = await res.json();

  try { sessionStorage.setItem(key, JSON.stringify(json)); }
  catch (_) { /* storage full — ignore */ }

  return json;
}

async function fetchTextCached(rawUrl) {
  const key = CACHE_PREFIX + "raw:" + rawUrl;

  try {
    const cached = sessionStorage.getItem(key);
    if (cached != null) return cached;
  } catch (_) { /* ignore */ }

  const res = await fetch(rawUrl);
  if (!res.ok) throw new Error(`Failed: ${rawUrl}`);

  const text = await res.text();

  try { sessionStorage.setItem(key, text); }
  catch (_) { /* ignore */ }

  return text;
}

/* ===== UI: challenge list ===== */
function renderChallengeList(readmes) {
  const toc = document.getElementById("tocContent");
  if (!toc) return;
  toc.innerHTML = "";

  readmes.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "challenge-item";
    div.textContent = `${item.category} / ${item.challenge}`;

    div.addEventListener("click", async () => {
      toc.querySelectorAll(".challenge-item.active").forEach((el) =>
        el.classList.remove("active")
      );
      div.classList.add("active");

      try { await loadFile(item.path); }
      catch (e) { console.error(e); }
    });

    if (idx === 0) div.classList.add("active");
    toc.appendChild(div);
  });
}

/* ===== Load & render single README ===== */
async function loadFile(path) {
  const content = document.getElementById("content");
  if (!content) return;

  content.innerHTML = `<p class="muted">Loading README...</p>`;

  const rawUrl = `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/${path}`;

  try {
    const md = await fetchTextCached(rawUrl);

    if (window.marked) {
      marked.setOptions({ gfm: true, breaks: false });
    }

    content.innerHTML = window.marked
      ? marked.parse(md)
      : `<pre>${esc(md)}</pre>`;

    fixRelativeAssetPaths(path);
    hardenLinks();

    // 載入後滾到頂
    content.scrollTop = 0;

  } catch (err) {
    console.error(err);
    content.innerHTML = `<p>Failed to load: ${esc(path)}</p>`;
  }
}

/* ===== Fix relative paths ===== */
function fixRelativeAssetPaths(readmePath) {
  const baseDir = readmePath.replace(/README\.md$/i, "");
  const prefix  = `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/${baseDir}`;

  document.querySelectorAll("#content img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (!src || isAbsUrl(src) || src.startsWith("data:")) return;
    img.setAttribute("src", prefix + src);
  });

  document.querySelectorAll("#content a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (!href || isAbsUrl(href) || href.startsWith("#") || href.startsWith("mailto:")) return;
    a.setAttribute("href", prefix + href);
  });
}

/* ===== Harden external links ===== */
function hardenLinks() {
  document.querySelectorAll("#content a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (isAbsUrl(href)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
  });
}

/* ===== Utils ===== */
function isAbsUrl(u) {
  return /^https?:\/\//i.test(u);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]
  );
}