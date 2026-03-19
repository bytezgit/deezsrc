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

  var data = [];
  var filter = "All";

  fetch("manifest.json")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      data = d;
      buildFilters();
      render();
      gsap.to(".ph h1", { opacity: 1, y: 0, duration: 0.9, delay: 0.15, ease: "power3.out" });
      gsap.to(".ph p", { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: "power3.out" });
    });

  function buildFilters() {
    var cats = ["All"];
    data.forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
    var el = document.getElementById("filters");
    cats.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "fbtn" + (c === "All" ? " on" : "");
      b.textContent = c;
      b.onclick = function () {
        filter = c;
        el.querySelectorAll(".fbtn").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        render();
      };
      el.appendChild(b);
    });
  }

  function render() {
    var el = document.getElementById("plist");
    el.innerHTML = "";
    var arr = data.filter(function (p) { return filter === "All" || p.category === filter; });
    arr.forEach(function (p, i) {
      var a = document.createElement("a");
      a.className = "prow";
      a.href = "source.html?p=" + encodeURIComponent(p.slug);
      a.innerHTML =
        "<div><div class='prow-name'>" + esc(p.name) + "</div><div class='prow-desc'>" + esc(p.desc) + "</div></div>" +
        "<div class='prow-m'>" + esc(p.category) + "</div>" +
        "<div class='prow-m'>" + p.files + " files</div>" +
        "<div class='prow-arr'><svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M5 12h14M12 5l7 7-7 7'/></svg></div>";
      el.appendChild(a);
      gsap.to(a, { opacity: 1, y: 0, duration: 0.6, delay: i * 0.05, ease: "power3.out" });

      a.addEventListener("mousemove", function (e) {
        var rect = a.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(a, { rotateY: x * 3, rotateX: -y * 3, duration: 0.3, ease: "power2.out", transformPerspective: 900 });
      });

      a.addEventListener("mouseleave", function () {
        gsap.to(a, { rotateY: 0, rotateX: 0, duration: 0.5, ease: "power2.out" });
      });
    });
  }

  function esc(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

  var nav = document.querySelector("nav");
  var last = 0;
  lenis.on("scroll", function (e) {
    if (e.scroll > 60 && e.scroll > last) nav.classList.add("hide");
    else nav.classList.remove("hide");
    last = e.scroll;
  });
})();