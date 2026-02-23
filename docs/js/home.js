// home.js

function init() {
  const timeline = document.getElementById("timeline");

  const updates = [
    {
      tag: "#CTF",
      title: "Initial setup",
      date: "2026-02-23"
    }
  ];

  updates.forEach(item => {
    const div = document.createElement("div");
    div.className = "timeline-item";
    div.innerHTML = `
      <div class="tag">${item.tag}</div>
      <h3>${item.title}</h3>
      <small>${item.date}</small>
    `;
    timeline.appendChild(div);
  });
}

init();