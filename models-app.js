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

  var nav = document.querySelector("nav");
  var last = 0;
  lenis.on("scroll", function (e) {
    if (e.scroll > 60 && e.scroll > last) nav.classList.add("hide");
    else nav.classList.remove("hide");
    last = e.scroll;
  });

  // ── State ──────────────────────────────────────────────────
  var allModels = [];
  var activeFilter = "All";
  var searchQuery = "";

  // ── Active viewer state ───────────────────────────────────
  var viewerState = {
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    animFrameId: null,
    mixer: null,
    clock: null,
  };

  // ── Fetch data ────────────────────────────────────────────
  fetch("models.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      allModels = data;
      buildFilters();
      render();
      gsap.to(".ph h1", { opacity: 1, y: 0, duration: 0.9, delay: 0.15, ease: "power3.out" });
      gsap.to(".ph p",  { opacity: 1, y: 0, duration: 0.8, delay: 0.28, ease: "power3.out" });
    })
    .catch(function () {
      document.getElementById("m-empty").style.display = "flex";
    });

  // ── Filters ───────────────────────────────────────────────
  function buildFilters() {
    var sources = ["All"];
    allModels.forEach(function (m) {
      var label = sourceLabel(m.source);
      if (sources.indexOf(label) === -1) sources.push(label);
    });

    var container = document.getElementById("m-filters");
    sources.forEach(function (s) {
      var btn = document.createElement("button");
      btn.className = "fbtn" + (s === "All" ? " on" : "");
      btn.textContent = s;
      btn.addEventListener("click", function () {
        activeFilter = s;
        container.querySelectorAll(".fbtn").forEach(function (b) { b.classList.remove("on"); });
        btn.classList.add("on");
        render();
      });
      container.appendChild(btn);
    });
  }

  // ── Search ─────────────────────────────────────────────────
  document.getElementById("m-search").addEventListener("input", function (e) {
    searchQuery = e.target.value.toLowerCase().trim();
    render();
  });

  // ── Render grid ───────────────────────────────────────────
  function render() {
    var grid   = document.getElementById("m-grid");
    var empty  = document.getElementById("m-empty");
    grid.innerHTML = "";

    var filtered = allModels.filter(function (m) {
      var matchFilter = activeFilter === "All" || sourceLabel(m.source) === activeFilter;
      var matchSearch = !searchQuery ||
        m.name.toLowerCase().indexOf(searchQuery) !== -1 ||
        (m.author || "").toLowerCase().indexOf(searchQuery) !== -1 ||
        (m.tags || []).join(" ").toLowerCase().indexOf(searchQuery) !== -1;
      return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
      empty.style.display = "flex";
      return;
    }
    empty.style.display = "none";

    filtered.forEach(function (model, idx) {
      var card = buildCard(model);
      grid.appendChild(card);
      gsap.to(card, {
        opacity: 1,
        y: 0,
        duration: 0.55,
        delay: idx * 0.06,
        ease: "power3.out",
      });
    });
  }

  // ── Build card ────────────────────────────────────────────
  function buildCard(model) {
    var card = document.createElement("div");
    card.className = "m-card";

    // Thumbnail
    var thumb = document.createElement("div");
    thumb.className = "m-thumb";

    var placeholder = document.createElement("div");
    placeholder.className = "m-thumb-placeholder";

    var hasGlb = model.downloadUrl && model.downloadUrl.toLowerCase().endsWith(".glb");

    if (hasGlb) {
      // Mini canvas preview
      placeholder.innerHTML = "";
      var miniCanvas = document.createElement("canvas");
      miniCanvas.className = "m-thumb-canvas";
      miniCanvas.width = 320;
      miniCanvas.height = 200;
      placeholder.appendChild(miniCanvas);
      thumb.appendChild(placeholder);

      // Lazy-load mini renderer when card enters view
      var miniLoaded = false;
      var miniState = { renderer: null, animId: null };

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !miniLoaded) {
            miniLoaded = true;
            observer.disconnect();
            loadMiniGlb(miniCanvas, model.downloadUrl, miniState);
          }
          // Pause when offscreen to save GPU
          if (!entry.isIntersecting && miniState.renderer) {
            cancelAnimationFrame(miniState.animId);
          } else if (entry.isIntersecting && miniState.renderer) {
            miniLoop(miniState);
          }
        });
      }, { threshold: 0.1 });

      observer.observe(card);
    } else {
      placeholder.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
        '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>' +
        '<polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>' +
        '</svg>';
      thumb.appendChild(placeholder);
    }

    // Play overlay
    var overlay = document.createElement("div");
    overlay.className = "m-play-overlay";
    overlay.innerHTML =
      '<div class="m-play-btn">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
      '</div>';
    thumb.appendChild(overlay);

    // Body
    var body = document.createElement("div");
    body.className = "m-card-body";

    var name = document.createElement("div");
    name.className = "m-card-name";
    name.textContent = model.name || "Untitled Model";

    var author = document.createElement("div");
    author.className = "m-card-author";
    author.textContent = model.author ? "by " + model.author : "";

    var tagsEl = document.createElement("div");
    tagsEl.className = "m-card-tags";
    if (model.tags && model.tags.length) {
      model.tags.slice(0, 3).forEach(function (tag) {
        var t = document.createElement("span");
        t.className = "m-tag";
        t.textContent = tag;
        tagsEl.appendChild(t);
      });
    }

    var actions = document.createElement("div");
    actions.className = "m-card-actions";

    if (model.sourceUrl) {
      var srcBtn = document.createElement("a");
      srcBtn.className = "m-source-btn";
      srcBtn.href = model.sourceUrl;
      srcBtn.target = "_blank";
      srcBtn.rel = "noopener noreferrer";
      srcBtn.innerHTML = sourceIcon(model.source) + "<span>" + sourceLabel(model.source) + "</span>";
      actions.appendChild(srcBtn);
    }

    if (model.downloadUrl) {
      var dlBtn = document.createElement("a");
      dlBtn.className = "m-dl-btn";
      dlBtn.href = model.downloadUrl;
      var fname = model.downloadUrl.split("/").pop();
      dlBtn.setAttribute("download", fname);
      dlBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>' +
        '<polyline points="7 10 12 15 17 10"/>' +
        '<line x1="12" y1="15" x2="12" y2="3"/>' +
        '</svg>' +
        '<span>Download</span>';
      actions.appendChild(dlBtn);
    } else if (model.license) {
      var lic = document.createElement("span");
      lic.className = "m-license";
      lic.textContent = model.license;
      actions.appendChild(lic);
    }

    body.appendChild(name);
    if (model.author) body.appendChild(author);
    if (model.tags && model.tags.length) body.appendChild(tagsEl);
    body.appendChild(actions);

    card.appendChild(thumb);
    card.appendChild(body);

    card.addEventListener("click", function (e) {
      if (e.target.closest(".m-source-btn") || e.target.closest(".m-dl-btn")) return;
      openModal(model);
    });

    return card;
  }

  // ── Mini GLB preview renderer (card thumbnails) ───────────
  function loadMiniGlb(canvas, url, state) {
    var w = canvas.offsetWidth || 320;
    var h = canvas.offsetHeight || 200;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);

    // Lights
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    var dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 6, 4);
    scene.add(dirLight);
    var fillLight = new THREE.DirectionalLight(0xa0a0cc, 0.4);
    fillLight.position.set(-4, -2, -3);
    scene.add(fillLight);

    state.renderer = renderer;
    state.scene = scene;
    state.camera = camera;
    state.mixer = null;
    state.clock = new THREE.Clock();
    state.angle = 0;
    state.model = null;

    var loader = new THREE.GLTFLoader();
    loader.load(
      url,
      function (gltf) {
        var model = gltf.scene;

        // Fit model into view
        var box = new THREE.Box3().setFromObject(model);
        var size = box.getSize(new THREE.Vector3());
        var center = box.getCenter(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z);
        var scale = 2.0 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));

        scene.add(model);
        state.model = model;

        // Camera position
        camera.position.set(0, size.y * scale * 0.3, maxDim * scale * 1.8);
        camera.lookAt(0, 0, 0);

        if (gltf.animations && gltf.animations.length) {
          state.mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach(function (clip) {
            state.mixer.clipAction(clip).play();
          });
        }

        miniLoop(state);
      },
      null,
      function () {
        // On error show fallback icon inside canvas
        var ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "rgba(10,10,14,0.8)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "rgba(80,80,100,0.5)";
          ctx.font = "14px monospace";
          ctx.textAlign = "center";
          ctx.fillText("preview unavailable", canvas.width / 2, canvas.height / 2);
        }
      }
    );
  }

  function miniLoop(state) {
    if (!state.renderer) return;
    state.animId = requestAnimationFrame(function () { miniLoop(state); });
    var delta = state.clock.getDelta();
    if (state.mixer) state.mixer.update(delta);
    if (state.model) {
      state.angle += delta * 0.5;
      state.model.rotation.y = state.angle;
    }
    state.renderer.render(state.scene, state.camera);
  }

  // ── Modal ─────────────────────────────────────────────────
  var modal       = document.getElementById("m-modal");
  var modalTitle  = document.getElementById("m-modal-title");
  var modalEmbed  = document.getElementById("m-modal-embed");
  var modalFooter = document.getElementById("m-modal-footer");
  var modalClose  = document.getElementById("m-modal-close");
  var modalBack   = document.getElementById("m-modal-backdrop");

  modalClose.addEventListener("click", closeModal);
  modalBack.addEventListener("click", closeModal);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  function openModal(model) {
    modalTitle.textContent = model.name || "3D Model";
    modalEmbed.innerHTML = "";
    modalFooter.innerHTML = "";

    var hasGlb = model.downloadUrl && model.downloadUrl.toLowerCase().endsWith(".glb");

    if (hasGlb) {
      // Build full interactive viewer
      buildModalViewer(model.downloadUrl);
    } else if (model.embedUrl) {
      var iframe = document.createElement("iframe");
      iframe.src = model.embedUrl;
      iframe.allowFullscreen = true;
      iframe.setAttribute("allow", "autoplay; fullscreen; xr-spatial-tracking");
      modalEmbed.appendChild(iframe);
    } else {
      modalEmbed.innerHTML =
        '<div class="m-modal-embed-placeholder">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
        '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>' +
        '</svg>' +
        '<span>no preview available</span>' +
        '</div>';
    }

    // Footer
    var meta = document.createElement("div");
    meta.className = "m-modal-meta";
    meta.innerHTML =
      "<div class='m-modal-meta-name'>" + esc(model.name || "Untitled") + "</div>" +
      "<div class='m-modal-meta-sub'>" +
      (model.author ? "by " + esc(model.author) + "  ·  " : "") +
      esc(model.license || "") +
      "</div>";

    var acts = document.createElement("div");
    acts.className = "m-modal-actions";

    if (model.sourceUrl) {
      var srcBtn = document.createElement("a");
      srcBtn.className = "m-source-btn";
      srcBtn.href = model.sourceUrl;
      srcBtn.target = "_blank";
      srcBtn.rel = "noopener noreferrer";
      srcBtn.innerHTML = sourceIcon(model.source) + "<span>View on " + sourceLabel(model.source) + "</span>";
      acts.appendChild(srcBtn);
    }

    if (model.downloadUrl) {
      var dlBtn = document.createElement("a");
      dlBtn.className = "m-dl-btn";
      dlBtn.href = model.downloadUrl;
      var fname = model.downloadUrl.split("/").pop();
      dlBtn.setAttribute("download", fname);
      dlBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>' +
        '<polyline points="7 10 12 15 17 10"/>' +
        '<line x1="12" y1="15" x2="12" y2="3"/>' +
        '</svg>' +
        '<span>Download</span>';
      acts.appendChild(dlBtn);
    }

    modalFooter.appendChild(meta);
    modalFooter.appendChild(acts);

    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  // ── Full modal GLB viewer with orbit controls ─────────────
  function buildModalViewer(url) {
    destroyViewer();

    // Loading state
    var loadingEl = document.createElement("div");
    loadingEl.className = "m-viewer-loading";
    loadingEl.innerHTML =
      '<div class="m-viewer-spinner"></div>' +
      '<span>loading model...</span>';
    modalEmbed.appendChild(loadingEl);

    var canvas = document.createElement("canvas");
    canvas.className = "m-viewer-canvas";
    modalEmbed.appendChild(canvas);
    canvas.style.opacity = "0";

    var w = modalEmbed.offsetWidth || 860;
    var h = modalEmbed.offsetHeight || (w * 9 / 16);

    // Renderer
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    // Scene
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0e);

    // Subtle env fog
    scene.fog = new THREE.Fog(0x0a0a0e, 20, 60);

    // Camera
    var camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);

    // Lights
    var ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    var keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 10, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 100;
    scene.add(keyLight);

    var fillLight = new THREE.DirectionalLight(0x8888cc, 0.5);
    fillLight.position.set(-6, 2, -4);
    scene.add(fillLight);

    var rimLight = new THREE.DirectionalLight(0xaaaaee, 0.3);
    rimLight.position.set(0, -4, -8);
    scene.add(rimLight);

    // Ground grid
    var gridHelper = new THREE.GridHelper(10, 20, 0x1a1a2e, 0x14141e);
    scene.add(gridHelper);

    // Orbit controls — manual implementation (no dep)
    var orbitState = {
      isDragging: false,
      lastX: 0, lastY: 0,
      spherical: { theta: 0, phi: Math.PI / 3, radius: 5 },
      target: new THREE.Vector3(0, 0, 0),
      autoRotate: true,
      autoRotateSpeed: 0.4,
    };

    function updateCamera() {
      var s = orbitState.spherical;
      camera.position.x = orbitState.target.x + s.radius * Math.sin(s.phi) * Math.sin(s.theta);
      camera.position.y = orbitState.target.y + s.radius * Math.cos(s.phi);
      camera.position.z = orbitState.target.z + s.radius * Math.sin(s.phi) * Math.cos(s.theta);
      camera.lookAt(orbitState.target);
    }

    // Pointer events
    canvas.addEventListener("pointerdown", function (e) {
      orbitState.isDragging = true;
      orbitState.autoRotate = false;
      orbitState.lastX = e.clientX;
      orbitState.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", function (e) {
      if (!orbitState.isDragging) return;
      var dx = e.clientX - orbitState.lastX;
      var dy = e.clientY - orbitState.lastY;
      orbitState.lastX = e.clientX;
      orbitState.lastY = e.clientY;
      orbitState.spherical.theta -= dx * 0.008;
      orbitState.spherical.phi   -= dy * 0.008;
      orbitState.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orbitState.spherical.phi));
    });

    canvas.addEventListener("pointerup", function () {
      orbitState.isDragging = false;
    });

    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      orbitState.autoRotate = false;
      orbitState.spherical.radius += e.deltaY * 0.01;
      orbitState.spherical.radius = Math.max(0.5, Math.min(50, orbitState.spherical.radius));
    }, { passive: false });

    // Touch pinch zoom
    var lastTouchDist = null;
    canvas.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    });
    canvas.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2 && lastTouchDist !== null) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var delta = lastTouchDist - dist;
        orbitState.spherical.radius += delta * 0.05;
        orbitState.spherical.radius = Math.max(0.5, Math.min(50, orbitState.spherical.radius));
        lastTouchDist = dist;
      }
    });

    // Controls hint
    var hint = document.createElement("div");
    hint.className = "m-viewer-hint";
    hint.textContent = "drag to rotate  ·  scroll to zoom";
    modalEmbed.appendChild(hint);

    // Load GLB
    var loader = new THREE.GLTFLoader();
    loader.load(
      url,
      function (gltf) {
        var model = gltf.scene;

        // Fit to view
        var box = new THREE.Box3().setFromObject(model);
        var size = box.getSize(new THREE.Vector3());
        var center = box.getCenter(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z);
        var targetSize = 3.0;
        var scale = targetSize / maxDim;
        model.scale.setScalar(scale);

        var scaledCenter = center.clone().multiplyScalar(scale);
        model.position.sub(scaledCenter);

        // Sit on grid
        var scaledMin = box.min.y * scale;
        if (scaledMin < 0) model.position.y -= scaledMin;

        model.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);

        // Fit camera
        orbitState.spherical.radius = targetSize * 2.2;
        orbitState.target.set(0, (size.y * scale) * 0.4, 0);

        // Animations
        var mixer = null;
        if (gltf.animations && gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach(function (clip) {
            mixer.clipAction(clip).play();
          });
        }

        viewerState.mixer = mixer;
        viewerState.model = model;

        // Fade in canvas
        loadingEl.style.opacity = "0";
        setTimeout(function () { loadingEl.remove(); }, 300);
        gsap.to(canvas, { opacity: 1, duration: 0.5, ease: "power2.out" });
      },
      function (xhr) {
        // Progress
        if (xhr.total > 0) {
          var pct = Math.round(xhr.loaded / xhr.total * 100);
          var span = loadingEl.querySelector("span");
          if (span) span.textContent = "loading... " + pct + "%";
        }
      },
      function (err) {
        console.error("GLB load error:", err);
        loadingEl.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;color:#444">' +
          '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' +
          '</svg>' +
          '<span>failed to load model</span>';
      }
    );

    var clock = new THREE.Clock();

    function loop() {
      viewerState.animFrameId = requestAnimationFrame(loop);
      var delta = clock.getDelta();
      if (viewerState.mixer) viewerState.mixer.update(delta);
      if (orbitState.autoRotate && !orbitState.isDragging) {
        orbitState.spherical.theta += delta * orbitState.autoRotateSpeed;
      }
      updateCamera();
      renderer.render(scene, camera);
    }

    loop();

    // Handle resize
    viewerState.onResize = function () {
      if (!modal.classList.contains("open")) return;
      var nw = modalEmbed.offsetWidth;
      var nh = modalEmbed.offsetHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", viewerState.onResize);

    viewerState.renderer = renderer;
    viewerState.scene    = scene;
    viewerState.camera   = camera;
    viewerState.clock    = clock;
  }

  function destroyViewer() {
    if (viewerState.animFrameId) {
      cancelAnimationFrame(viewerState.animFrameId);
      viewerState.animFrameId = null;
    }
    if (viewerState.renderer) {
      viewerState.renderer.dispose();
      viewerState.renderer = null;
    }
    if (viewerState.onResize) {
      window.removeEventListener("resize", viewerState.onResize);
      viewerState.onResize = null;
    }
    viewerState.mixer  = null;
    viewerState.model  = null;
    viewerState.scene  = null;
    viewerState.camera = null;
  }

  function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    destroyViewer();
    setTimeout(function () {
      modalEmbed.innerHTML = "";
    }, 350);
  }

  // ── Helpers ───────────────────────────────────────────────
  function sourceLabel(src) {
    if (!src) return "Other";
    var s = src.toLowerCase();
    if (s === "sketchfab") return "Sketchfab";
    if (s === "polypizza" || s === "poly pizza") return "Poly Pizza";
    return src.charAt(0).toUpperCase() + src.slice(1);
  }

  function sourceIcon(src) {
    var s = (src || "").toLowerCase();
    if (s === "sketchfab") {
      return '<svg viewBox="0 0 24 24" fill="currentColor" class="src-sketchfab">' +
        '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13v6l5-3-5-3z"/>' +
        '</svg>';
    }
    if (s === "polypizza" || s === "poly pizza") {
      return '<svg viewBox="0 0 24 24" fill="currentColor" class="src-polypizza">' +
        '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>' +
        '</svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="src-other">' +
      '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>' +
      '<path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>' +
      '</svg>';
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }
})();
