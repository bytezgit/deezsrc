(function () {
  var lenis = new Lenis({
    duration: 1.2,
    easing: function (t) {
      return Math.min(1, 1.001 - Math.pow(2, -10 * t));
    },
    smoothWheel: true,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (time) {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  var scrollY = 0;
  lenis.on("scroll", function (e) {
    scrollY = e.scroll;
  });

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 8;

  var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById("canvas-container").appendChild(renderer.domElement);

  var particleCount = 150;
  var positions = new Float32Array(particleCount * 3);
  var sizes = new Float32Array(particleCount);
  var phases = new Float32Array(particleCount);

  for (var i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    sizes[i] = Math.random() * 2 + 1;
    phases[i] = Math.random() * Math.PI * 2;
  }

  var particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  particleGeo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

  var particleMat = new THREE.ShaderMaterial({
    vertexShader: Shaders.particleVertex,
    fragmentShader: Shaders.particleFragment,
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  var particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    var elapsed = clock.getElapsedTime();
    particleMat.uniforms.uTime.value = elapsed;
    particleMat.uniforms.uScroll.value = scrollY;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  var manifest = [];
  var activeFilter = "All";

  fetch("manifest.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      manifest = data;
      buildFilters();
      renderGrid();
      animateEntrance();
    });

  function buildFilters() {
    var categories = ["All"];
    manifest.forEach(function (p) {
      if (categories.indexOf(p.category) === -1) {
        categories.push(p.category);
      }
    });

    var container = document.getElementById("category-filters");
    categories.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.className = "filter-btn" + (cat === "All" ? " active" : "");
      btn.textContent = cat;
      btn.addEventListener("click", function () {
        activeFilter = cat;
        container.querySelectorAll(".filter-btn").forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        renderGrid();
      });
      container.appendChild(btn);
    });
  }

  function renderGrid() {
    var grid = document.getElementById("projects-grid");
    grid.innerHTML = "";

    var filtered = manifest.filter(function (p) {
      return activeFilter === "All" || p.category === activeFilter;
    });

    filtered.forEach(function (project, idx) {
      var card = document.createElement("div");
      card.className = "project-card";
      card.style.opacity = "0";
      card.style.transform = "translateY(30px)";

      card.innerHTML =
        '<div class="project-card-accent"></div>' +
        '<div class="project-card-name">' + escapeHtml(project.name) + "</div>" +
        '<div class="project-card-desc">' + escapeHtml(project.desc) + "</div>" +
        '<div class="project-card-meta">' +
        '<span class="project-meta-tag">' + escapeHtml(project.category) + "</span>" +
        '<span class="project-meta-tag">' + escapeHtml(project.license) + "</span>" +
        "</div>";

      card.addEventListener("click", function () {
        openProjectDetail(project);
      });

      grid.appendChild(card);

      gsap.to(card, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        delay: idx * 0.08,
        ease: "power3.out",
      });
    });
  }

  function animateEntrance() {
    gsap.to(".projects-title", {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out",
      delay: 0.2,
    });

    gsap.to(".projects-sub", {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power3.out",
      delay: 0.35,
    });
  }

  var overlay = document.getElementById("project-detail-overlay");
  var closeBtn = document.getElementById("detail-close");

  closeBtn.addEventListener("click", closeDetail);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      closeDetail();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDetail();
  });

  function closeDetail() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  function openProjectDetail(project) {
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";

    var header = document.getElementById("detail-header");
    header.innerHTML =
      "<h2>" + escapeHtml(project.name) + "</h2>" +
      "<p>" + escapeHtml(project.desc) + "</p>" +
      '<div class="detail-header-meta">' +
      '<span class="project-meta-tag">' + escapeHtml(project.category) + "</span>" +
      '<span class="project-meta-tag">' + escapeHtml(project.license) + "</span>" +
      '<a class="download-btn" href="projects/' + encodeURIComponent(project.slug) + '" download>' +
      "<span>Download</span>" +
      "</a>" +
      "</div>";

    var readmePanel = document.getElementById("tab-readme");
    if (project.readme) {
      readmePanel.innerHTML = marked.parse(project.readme);
      readmePanel.querySelectorAll("pre code").forEach(function (block) {
        hljs.highlightElement(block);
      });
    } else {
      readmePanel.innerHTML = '<p style="color:var(--text-muted)">No README provided.</p>';
    }

    buildFileTree(project);
    switchTab("readme");

    document.querySelectorAll(".detail-tab").forEach(function (tab) {
      tab.onclick = function () {
        switchTab(tab.dataset.tab);
      };
    });
  }

  function switchTab(name) {
    document.querySelectorAll(".detail-tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.tab === name);
    });
    document.querySelectorAll(".tab-panel").forEach(function (p) {
      p.classList.remove("active");
    });
    document.getElementById("tab-" + name).classList.add("active");
  }

  function buildFileTree(project) {
    var treeContainer = document.getElementById("file-tree");
    var viewer = document.getElementById("file-viewer");
    treeContainer.innerHTML = "";
    viewer.innerHTML = '<div class="file-viewer-placeholder">Select a file to view</div>';

    renderTreeNodes(project.tree, treeContainer, 0, project.slug);
  }

  function renderTreeNodes(nodes, container, depth, slug) {
    nodes.forEach(function (node) {
      if (node.path === slug + "/details.txt") return;

      var item = document.createElement("div");

      if (node.type === "dir") {
        var dirRow = document.createElement("div");
        dirRow.className = "tree-item";
        dirRow.style.paddingLeft = 16 + depth * 16 + "px";

        dirRow.innerHTML =
          '<svg class="tree-dir-toggle" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2l4 4-4 4"/></svg>' +
          '<svg class="tree-item-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2c-.33-.44-.85-.7-1.4-.7z"/></svg>' +
          "<span>" + escapeHtml(node.path.split("/").pop()) + "</span>";

        var childContainer = document.createElement("div");
        childContainer.className = "tree-children";

        dirRow.addEventListener("click", function () {
          var toggle = dirRow.querySelector(".tree-dir-toggle");
          toggle.classList.toggle("collapsed");
          childContainer.classList.toggle("collapsed");
        });

        item.appendChild(dirRow);
        renderTreeNodes(node.children, childContainer, depth + 1, slug);
        item.appendChild(childContainer);
      } else {
        item.className = "tree-item";
        item.style.paddingLeft = 16 + depth * 16 + "px";

        item.innerHTML =
          '<svg class="tree-item-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M3.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V6H9.75A1.75 1.75 0 018 4.25V1.5zm5.75.56v2.19c0 .138.112.25.25.25h2.19zM2 1.75C2 .784 2.784 0 3.75 0h5.086c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v8.086A1.75 1.75 0 0112.25 15h-8.5A1.75 1.75 0 012 13.25z"/></svg>' +
          "<span>" + escapeHtml(node.path.split("/").pop()) + "</span>";

        (function (filePath) {
          item.addEventListener("click", function () {
            document.querySelectorAll(".tree-item.active").forEach(function (el) {
              el.classList.remove("active");
            });
            item.classList.add("active");
            loadFile(filePath);
          });
        })(node.path);
      }

      container.appendChild(item);
    });
  }

  function loadFile(filePath) {
    var viewer = document.getElementById("file-viewer");
    var fileName = filePath.split("/").pop();
    var ext = fileName.split(".").pop().toLowerCase();

    fetch("projects/" + filePath)
      .then(function (r) {
        if (!r.ok) throw new Error("Not found");
        return r.text();
      })
      .then(function (content) {
        var langClass = getLanguageClass(ext);

        viewer.innerHTML =
          '<div class="file-viewer-header">' +
          "<span>" + escapeHtml(fileName) + "</span>" +
          '<a class="download-btn" href="projects/' + encodeURIComponent(filePath) + '" download="' + escapeHtml(fileName) + '">Download file</a>' +
          "</div>" +
          "<pre><code class=\"" + langClass + "\"></code></pre>";

        var codeEl = viewer.querySelector("code");
        codeEl.textContent = content;
        hljs.highlightElement(codeEl);
      })
      .catch(function () {
        viewer.innerHTML = '<div class="file-viewer-placeholder">Could not load file</div>';
      });
  }

  function getLanguageClass(ext) {
    var map = {
      js: "language-javascript",
      ts: "language-typescript",
      py: "language-python",
      rb: "language-ruby",
      rs: "language-rust",
      go: "language-go",
      java: "language-java",
      c: "language-c",
      cpp: "language-cpp",
      h: "language-c",
      hpp: "language-cpp",
      cs: "language-csharp",
      php: "language-php",
      swift: "language-swift",
      kt: "language-kotlin",
      lua: "language-lua",
      sh: "language-bash",
      bash: "language-bash",
      zsh: "language-bash",
      html: "language-html",
      css: "language-css",
      scss: "language-scss",
      json: "language-json",
      yaml: "language-yaml",
      yml: "language-yaml",
      toml: "language-toml",
      xml: "language-xml",
      sql: "language-sql",
      md: "language-markdown",
      dockerfile: "language-dockerfile",
      makefile: "language-makefile",
      cmake: "language-cmake",
      r: "language-r",
      dart: "language-dart",
      zig: "language-zig",
      nix: "language-nix",
      vim: "language-vim",
      txt: "language-plaintext",
    };
    return map[ext] || "language-plaintext";
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  var lastScroll = 0;
  var nav = document.getElementById("nav");

  lenis.on("scroll", function (e) {
    if (e.scroll > 100 && e.scroll > lastScroll) {
      nav.style.transform = "translateY(-100%)";
    } else {
      nav.style.transform = "translateY(0)";
    }
    lastScroll = e.scroll;
  });
})();