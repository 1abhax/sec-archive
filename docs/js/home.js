async function init() {
  const res = await fetch("data/tree.json");
  const data = await res.json();

  const allItems = [];

  data.sections.forEach(section => {
    section.items.forEach(item => {
      allItems.push({
        tag: section.tag,
        title: item.title,
        path: item.path,
        date: item.date
      });
    });
  });

  allItems.sort((a,b) => new Date(b.date) - new Date(a.date));

  const timeline = document.getElementById("timeline");

  allItems.forEach(item => {
    const div = document.createElement("div");
    div.className = "timeline-item";
    div.innerHTML = `
      <div class="tag">${item.tag}</div>
      <h3>${item.title}</h3>
      <small>${item.date}</small>
    `;
    div.onclick = () => {
      window.location.href = `archive.html?path=${encodeURIComponent(item.path)}`;
    };
    timeline.appendChild(div);
  });
}
const backgrounds = [
  "assets/bg/bg1.jpg"
];

document.body.style.backgroundImage =
  `url(${backgrounds[Math.floor(Math.random()*backgrounds.length)]})`;
init();