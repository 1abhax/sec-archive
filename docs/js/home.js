async function init() {
  const timeline = document.getElementById("timeline");
  if (!timeline) return;

  timeline.innerHTML = `<p class="muted">Loading timeline...</p>`;

  try {
    const res = await fetch("./data/order_CTF.json");
    if (!res.ok) throw new Error("Failed to load order_CTF.json");

    const data = await res.json();
    const list = Array.isArray(data.ctf_order) ? data.ctf_order : [];

    if (!list.length) {
      timeline.innerHTML = `<p class="muted">No CTF events yet.</p>`;
      return;
    }

    timeline.innerHTML = "";

    list.forEach((name) => {
      const div = document.createElement("div");
      div.className = "timeline-item";

      div.innerHTML = `
        <div class="tag">#CTF</div>
        <h3>${escapeHTML(name)}</h3>
      `;

      div.addEventListener("click", () => {
        window.location.href =
          `archive.html?major=CTF&event=${encodeURIComponent(name)}`;
      });

      timeline.appendChild(div);
    });

  } catch (e) {
    console.error(e);
    timeline.innerHTML = `<p class="muted">Failed to load timeline.</p>`;
  }
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]
  );
}

init();