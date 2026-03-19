(function () {
  BG.init();

  var lenis = new Lenis({
    duration: 1.4,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
    wheelMultiplier: 0.8,
  });

  lenis.on("scroll", function (e) {
    ScrollTrigger.update();
    BG.setScroll(e.scroll);
  });

  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  var slug = new URLSearchParams(location.search).get("p");
  if (!slug) { location.href = "projects.html"; return; }

  var project = null;

  fetch("manifest.json")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      for (var i = 0; i < d.length; i++) {
        if (d[i].slug === slug) { project = d[i]; break; }
      }
      if (!project) { location.href = "projects.html"; return; }
      document.title = project.name + " — deezsrc";
      renderTop();
      renderReadme();
      renderTree();
      initTabs();
      initDownloadButton();
      gsap.from(".src-top", { opacity: 0, y: 20, duration: 0.7, delay: 0.15, ease: "power3.out" });
      gsap.from(".src-tabs", { opacity: 0, duration: 0.5, delay: 0.32, ease: "power3.out" });
      gsap.from(".src-body", { opacity: 0, duration: 0.6, delay: 0.45, ease: "power3.out" });
    });

  function renderTop() {
    document.getElementById("src-top").innerHTML =
      "<div class='src-bc'><a href='projects.html'>projects</a> <span class='bc-sep'>/</span> " + esc(slug) + "</div>" +
      "<div class='src-title'>" + esc(project.name) + "</div>" +
      "<div class='src-desc'>" + esc(project.desc) + "</div>" +
      "<div class='src-meta'>" +
      "<span class='tag'>" + esc(project.category) + "</span>" +
      "<span class='tag'>" + esc(project.license) + "</span>" +
      "<button class='dl-zip-btn' id='dl-zip-btn'>" +
      "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
      "<path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4'/>" +
      "<polyline points='7 10 12 15 17 10'/>" +
      "<line x1='12' y1='15' x2='12' y2='3'/>" +
      "</svg>" +
      "<span>Download ZIP</span>" +
      "</button>" +
      "</div>";
  }

  function initDownloadButton() {
    var btn = document.getElementById("dl-zip-btn");
    if (!btn) return;

    btn.addEventListener("click", function () {
      downloadProjectAsZip();
    });
  }

  function downloadProjectAsZip() {
    var btn = document.getElementById("dl-zip-btn");
    var originalContent = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = 
      "<svg class='spin' viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2'>" +
      "<path d='M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0l-2.83-2.83M9.76 9.76L6.93 6.93'/>" +
      "</svg>" +
      "<span>Creating ZIP...</span>";

    var zip = new JSZip();
    var files = getAllFiles(project.tree);
    var loaded = 0;
    var failed = 0;

    if (files.length === 0) {
      btn.disabled = false;
      btn.innerHTML = originalContent;
      alert("No files to download.");
      return;
    }

    var promises = files.map(function (filePath) {
      return fetch("projects/" + slug + "/" + filePath)
        .then(function (response) {
          if (!response.ok) throw new Error("Failed to fetch " + filePath);
          return response.blob();
        })
        .then(function (blob) {
          zip.file(filePath, blob);
          loaded++;
          updateProgress(loaded, files.length);
        })
        .catch(function (err) {
          console.warn("Could not fetch:", filePath, err);
          failed++;
        });
    });

    Promise.all(promises)
      .then(function () {
        if (loaded === 0) {
          throw new Error("No files were loaded");
        }
        
        btn.innerHTML = 
          "<svg class='spin' viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2'>" +
          "<path d='M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0l-2.83-2.83M9.76 9.76L6.93 6.93'/>" +
          "</svg>" +
          "<span>Compressing...</span>";

        return zip.generateAsync({ 
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 }
        });
      })
      .then(function (content) {
        var url = URL.createObjectURL(content);
        var a = document.createElement("a");
        a.href = url;
        a.download = slug + ".zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        btn.innerHTML = 
          "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
          "<polyline points='20 6 9 17 4 12'/>" +
          "</svg>" +
          "<span>Downloaded!</span>";
        btn.classList.add("success");

        setTimeout(function () {
          btn.disabled = false;
          btn.innerHTML = originalContent;
          btn.classList.remove("success");
        }, 2000);
      })
      .catch(function (err) {
        console.error("ZIP creation failed:", err);
        btn.innerHTML = 
          "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
          "<circle cx='12' cy='12' r='10'/>" +
          "<line x1='15' y1='9' x2='9' y2='15'/>" +
          "<line x1='9' y1='9' x2='15' y2='15'/>" +
          "</svg>" +
          "<span>Failed</span>";
        btn.classList.add("error");

        setTimeout(function () {
          btn.disabled = false;
          btn.innerHTML = originalContent;
          btn.classList.remove("error");
        }, 2000);
      });
  }

  function updateProgress(loaded, total) {
    var btn = document.getElementById("dl-zip-btn");
    var percent = Math.round((loaded / total) * 100);
    var span = btn.querySelector("span");
    if (span) {
      span.textContent = "Fetching... " + percent + "%";
    }
  }

  function getAllFiles(nodes, prefix) {
    prefix = prefix || "";
    var files = [];
    
    nodes.forEach(function (node) {
      if (node.type === "dir") {
        if (node.children && node.children.length) {
          files = files.concat(getAllFiles(node.children, prefix));
        }
      } else {
        files.push(node.path);
      }
    });
    
    return files;
  }

  function renderReadme() {
    var el = document.getElementById("readme-c");
    if (project.readme) {
      el.innerHTML = marked.parse(project.readme);
      el.querySelectorAll("pre code").forEach(function (b) { hljs.highlightElement(b); });
    } else {
      el.innerHTML = "<p style='color:var(--text-4)'>No README.</p>";
    }
  }

  function renderTree() {
    var root = document.getElementById("tree-root");
    root.innerHTML = "";
    buildNodes(project.tree, root, 0);
  }

  function buildNodes(nodes, container, depth) {
    nodes.forEach(function (node) {
      if (node.type === "dir") {
        var wrap = document.createElement("div");
        var row = document.createElement("div");
        row.className = "t-row";
        row.style.paddingLeft = (16 + depth * 14) + "px";

        var chev = makeSvg("M6 3l5 5-5 5", true);
        chev.classList.add("chev");
        var icon = makeSvg("M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2c-.33-.44-.85-.7-1.4-.7z", false);
        var label = document.createElement("span");
        label.textContent = node.name;

        row.appendChild(chev);
        row.appendChild(icon);
        row.appendChild(label);

        var kids = document.createElement("div");
        kids.className = "t-kids";

        chev.classList.add("shut");
        kids.classList.add("shut");

        row.addEventListener("click", function () {
          chev.classList.toggle("shut");
          kids.classList.toggle("shut");
        });

        wrap.appendChild(row);
        if (node.children && node.children.length) buildNodes(node.children, kids, depth + 1);
        wrap.appendChild(kids);
        container.appendChild(wrap);
      } else {
        var frow = document.createElement("div");
        frow.className = "t-row";
        frow.style.paddingLeft = (16 + depth * 14 + 20) + "px";

        var ficon = makeSvg("M3.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V6H9.75A1.75 1.75 0 018 4.25V1.5zm5.75.56v2.19c0 .138.112.25.25.25h2.19zM2 1.75C2 .784 2.784 0 3.75 0h5.086c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v8.086A1.75 1.75 0 0112.25 15h-8.5A1.75 1.75 0 012 13.25z", false);
        var flabel = document.createElement("span");
        flabel.textContent = node.name;

        frow.appendChild(ficon);
        frow.appendChild(flabel);

        (function (path) {
          frow.addEventListener("click", function () {
            document.querySelectorAll(".t-row.sel").forEach(function (r) { r.classList.remove("sel"); });
            frow.classList.add("sel");
            openFile(path);
          });
        })(node.path);

        container.appendChild(frow);
      }
    });
  }

  function openFile(fp) {
    var pane = document.getElementById("code-pane");
    var fname = fp.split("/").pop();
    var ext = fname.lastIndexOf(".") !== -1 ? fname.split(".").pop().toLowerCase() : "";

    fetch("projects/" + slug + "/" + fp)
      .then(function (r) {
        if (!r.ok) throw new Error();
        return r.text();
      })
      .then(function (txt) {
        pane.innerHTML =
          "<div class='code-head'><span>" + esc(fp) + "</span>" +
          "<a class='dl-btn' href='projects/" + encodeURIComponent(slug) + "/" + fp + "' download='" + esc(fname) + "'>download</a></div>" +
          "<div class='code-body'><pre><code class='" + lang(ext) + "'></code></pre></div>";
        var code = pane.querySelector("code");
        code.textContent = txt;
        hljs.highlightElement(code);
        gsap.from(pane, { opacity: 0, duration: 0.3, ease: "power2.out" });
      })
      .catch(function () {
        pane.innerHTML = "<div class='code-empty'><span>failed to load</span></div>";
      });
  }

  function initTabs() {
    var tabs = document.querySelectorAll(".stab");
    var panels = document.querySelectorAll(".panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("on"); });
        panels.forEach(function (p) { p.classList.remove("on"); });
        tab.classList.add("on");
        var target = document.getElementById(tab.dataset.p);
        target.classList.add("on");
        gsap.from(target, { opacity: 0, y: 8, duration: 0.35, ease: "power2.out" });
      });
    });
  }

  function makeSvg(d, stroke) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 16 16");
    s.setAttribute("width", "13");
    s.setAttribute("height", "13");
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    if (stroke) {
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", "currentColor");
      p.setAttribute("stroke-width", "1.5");
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("stroke-linejoin", "round");
    } else {
      p.setAttribute("fill", "currentColor");
    }
    s.appendChild(p);
    return s;
  }

  function lang(ext) {
    var m = {
      js: "javascript", ts: "typescript", jsx: "javascript", tsx: "typescript",
      py: "python", rb: "ruby", rs: "rust", go: "go", java: "java",
      c: "c", cpp: "cpp", h: "c", hpp: "cpp", cs: "csharp",
      php: "php", swift: "swift", kt: "kotlin", lua: "lua",
      sh: "bash", bash: "bash", zsh: "bash",
      html: "html", css: "css", scss: "scss", less: "less",
      json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
      xml: "xml", sql: "sql", md: "markdown",
      dart: "dart", zig: "zig", nix: "nix",
      txt: "plaintext", log: "plaintext", cfg: "ini", ini: "ini",
    };
    return "language-" + (m[ext] || "plaintext");
  }

  function esc(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
})();