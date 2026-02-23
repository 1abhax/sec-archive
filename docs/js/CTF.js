// CTF.js

const USER = "1abhax";
const REPO = "sec-archive";
const BRANCH = "main";

export async function loadCTFEvent(eventName) {
  const content = document.getElementById("content");
  const toc = document.getElementById("toc");

  content.innerHTML = `<h2>${eventName}</h2><p>Loading...</p>`;
  toc.innerHTML = "";

  const readmes = [];
  await scanDirectory(`CTF/${eventName}`, readmes);

  renderChallengeList(readmes);
}

async function scanDirectory(path, result) {
  const res = await fetch(
    `https://api.github.com/repos/${USER}/${REPO}/contents/${path}`
  );

  const data = await res.json();

  for (const item of data) {
    if (item.type === "dir") {
      await scanDirectory(item.path, result);
    }

    if (
      item.type === "file" &&
      item.name.toLowerCase() === "readme.md"
    ) {
      result.push(item.path);
    }
  }
}

function renderChallengeList(readmes) {
  const content = document.getElementById("content");

  content.innerHTML = "<h2>Challenges</h2>";

  readmes.forEach(path => {
    const parts = path.split("/");

    // CTF / LACTF / Web / challenge / README.md
    const category = parts[2];
    const challenge = parts[3];

    const div = document.createElement("div");
    div.className = "timeline-item";
    div.innerHTML = `<h3>${category} / ${challenge}</h3>`;

    div.onclick = () => loadFile(path);

    content.appendChild(div);
  });
}

async function loadFile(path) {
  const content = document.getElementById("content");

  const res = await fetch(
    `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/${path}`
  );

  const text = await res.text();

  content.innerHTML = marked.parse(text);

  generateTOC();
}

function generateTOC() {
  const toc = document.getElementById("toc");
  toc.innerHTML = "<h3>目錄</h3>";

  const headings = document.querySelectorAll("#content h2, #content h3");

  headings.forEach((heading, index) => {
    const id = "section-" + index;
    heading.id = id;

    const div = document.createElement("div");
    div.className = "toc-item";
    div.textContent = heading.textContent;

    div.onclick = () => {
      document.getElementById(id).scrollIntoView({
        behavior: "smooth"
      });
    };

    toc.appendChild(div);
  });
}