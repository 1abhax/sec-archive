const USER = "1abhax";
const REPO = "sec-archive";
const BRANCH = "main";

export async function loadCTFEvent(eventName) {
  const content = document.getElementById("content");
  const toc = document.getElementById("toc");

  content.innerHTML = `<h2>${eventName}</h2><p>Loading...</p>`;
  toc.innerHTML = "";

  const readmes = await collectReadmes(eventName);

  if (!readmes.length) {
    content.innerHTML = "<h2>No README found</h2>";
    return;
  }

  renderRightPanel(readmes);
  loadFile(readmes[0].path);
}

async function collectReadmes(eventName) {
  const result = [];
  const categories = await fetchDir(`CTF/${eventName}`);

  for (const cat of categories) {
    if (cat.type !== "dir") continue;

    const challenges = await fetchDir(cat.path);

    for (const chall of challenges) {
      if (chall.type !== "dir") continue;

      const files = await fetchDir(chall.path);

      const readme = files.find(
        f => f.type === "file" && f.name.toLowerCase() === "readme.md"
      );

      if (readme) {
        result.push({
          category: cat.name.toLowerCase(),
          challenge: chall.name,
          path: readme.path
        });
      }
    }
  }

  return result;
}

async function fetchDir(path) {
  const res = await fetch(
    `https://api.github.com/repos/${USER}/${REPO}/contents/${path}`
  );
  return await res.json();
}

function renderRightPanel(readmes) {
  const toc = document.getElementById("toc");
  toc.innerHTML = "<h3>Challenges</h3>";

  readmes.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "challenge-item";
    div.textContent = `${item.category} / ${item.challenge}`;

    div.onclick = () => {
      document.querySelectorAll(".challenge-item")
        .forEach(el => el.classList.remove("active"));

      div.classList.add("active");
      loadFile(item.path);
    };

    if (index === 0) div.classList.add("active");

    toc.appendChild(div);
  });
}

async function loadFile(path) {
  const content = document.getElementById("content");

  const res = await fetch(
    `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/${path}`
  );

  const text = await res.text();
  content.innerHTML = marked.parse(text);

  fixImagePaths(path);
}

function fixImagePaths(path) {
  const base = path.replace("README.md", "");
  document.querySelectorAll("#content img").forEach(img => {
    if (!img.src.startsWith("http")) {
      img.src =
        `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/` +
        base +
        img.getAttribute("src");
    }
  });
}