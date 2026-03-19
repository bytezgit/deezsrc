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

  var tl = gsap.timeline({ delay: 0.3 });

  tl.to(".w", {
    opacity: 1,
    y: 0,
    rotateX: 0,
    duration: 1.1,
    stagger: 0.1,
    ease: "power4.out",
  });

  tl.to(".hero-p", {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: "power3.out",
  }, "-=0.5");

  tl.to(".scroll-hint", {
    opacity: 0.7,
    duration: 0.8,
  }, "-=0.3");

  gsap.utils.toArray(".s-label").forEach(function (el) {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  gsap.utils.toArray(".person").forEach(function (el, i) {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.9, delay: i * 0.14, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  gsap.utils.toArray(".about-card").forEach(function (el, i) {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.8, delay: i * 0.1, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  gsap.to(".divider", {
    scaleX: 1,
    opacity: 1,
    duration: 1,
    ease: "power2.out",
    scrollTrigger: { trigger: ".divider", start: "top 90%" },
  });

  gsap.to(".cta-s h2", {
    opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
    scrollTrigger: { trigger: ".cta-s h2", start: "top 85%" },
  });

  gsap.to(".btn", {
    opacity: 1, y: 0, duration: 0.8, delay: 0.14, ease: "power3.out",
    scrollTrigger: { trigger: ".btn", start: "top 90%" },
  });

  gsap.to(".hero-glow", {
    y: -40,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: 1,
    },
  });

  gsap.to(".hero h1", {
    y: -30,
    opacity: 0.3,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "60% top",
      end: "bottom top",
      scrub: 1,
    },
  });

  document.querySelectorAll(".person, .about-card, .prow").forEach(function (el) {
    el.addEventListener("mousemove", function (e) {
      var rect = el.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(el, {
        rotateY: x * 4,
        rotateX: -y * 4,
        duration: 0.4,
        ease: "power2.out",
        transformPerspective: 800,
      });
    });

    el.addEventListener("mouseleave", function () {
      gsap.to(el, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.6,
        ease: "power2.out",
      });
    });
  });

  var nav = document.querySelector("nav");
  var last = 0;
  lenis.on("scroll", function (e) {
    if (e.scroll > 60 && e.scroll > last) nav.classList.add("hide");
    else nav.classList.remove("hide");
    last = e.scroll;
  });
})();