const fs = require("fs");
const path = require("path");

const PROJECTS_DIR = path.join(__dirname, "projects");

function parseDetails(raw) {
  const props = {};
  raw.split("\n").forEach(function (line) {
    const t = line.trim();
    if (!t) return;
    const i = t.indexOf("=");
    if (i === -1) return;
    props[t.slice(0, i).trim().toLowerCase()] = t.slice(i + 1).trim();
  });
  return props;
}

function walkDir(dir, base) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.sort(function (a, b) {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });
  entries.forEach(function (entry) {
    if (entry.name === "details.txt") return;
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).split(path.sep).join("/");
    if (entry.isDirectory()) {
      results.push({
        name: entry.name,
        path: rel,
        type: "dir",
        children: walkDir(full, base),
      });
    } else {
      results.push({ name: entry.name, path: rel, type: "file" });
    }
  });
  return results;
}

function countFiles(tree) {
  var n = 0;
  tree.forEach(function (node) {
    if (node.type === "file") n++;
    else if (node.children) n += countFiles(node.children);
  });
  return n;
}

if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);

var manifest = [];

fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
  .filter(function (d) { return d.isDirectory(); })
  .forEach(function (folder) {
    var fp = path.join(PROJECTS_DIR, folder.name);
    var dets = { name: folder.name, desc: "", license: "MIT", category: "General" };
    var dp = path.join(fp, "details.txt");
    if (fs.existsSync(dp)) Object.assign(dets, parseDetails(fs.readFileSync(dp, "utf-8")));
    var readme = "";
    var rp = path.join(fp, "README.md");
    if (fs.existsSync(rp)) readme = fs.readFileSync(rp, "utf-8");
    var tree = walkDir(fp, fp);
    manifest.push({
      slug: folder.name,
      name: dets.name,
      desc: dets.desc,
      license: dets.license,
      category: dets.category,
      readme: readme,
      tree: tree,
      files: countFiles(tree),
    });
  });

fs.writeFileSync(path.join(__dirname, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("built " + manifest.length + " projects");