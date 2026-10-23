/* TG Core — site interactions */
(() => {
  "use strict";

  // Where "Submit your company" sends its data, first match wins:
  //  1. APPS_SCRIPT_URL — Google Sheet row + Gmail alert + client confirmation
  //     + Calendar follow-up. Setup steps: google-apps-script.gs
  //  2. WEB3FORMS_KEY — email only (free key from web3forms.com)
  //  3. neither — opens the visitor's email app with everything pre-filled
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwpFD-BQHje51Yi3xFT90hxSUfo0Iw8hM6jHGHZpWrqCK-57V7GJZ8N5TEPcKMNTFfH/exec";
  const WEB3FORMS_KEY = "";
  const CONTACT_EMAIL = "tgcore.webstudio@gmail.com";
  // Google Calendar booking page (Calendar → Create → Appointment schedule →
  // Open booking page → copy link). Empty hides every "Book a call" button.
  const BOOKING_URL = "https://calendar.app.google/KaLRVUvpBsqBP8R16";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
  };

  /* ---------------------------------------------------------------------
     Loader
     --------------------------------------------------------------------- */
  const loader = $("#loader");
  const loaderPct = $("#loaderPct");
  const loaderBar = $("#loaderBar");
  const loadStart = performance.now();
  const minLoad = reduceMotion ? 200 : 1400;
  let assetProgress = 0;
  let finished = false;

  function tickLoader() {
    if (finished) return;
    const timeP = clamp((performance.now() - loadStart) / minLoad, 0, 1);
    const p = Math.min(timeP, 0.15 + assetProgress * 0.85);
    loaderPct.textContent = String(Math.round(p * 100)).padStart(3, "0");
    loaderBar.style.transform = `scaleX(${p})`;
    requestAnimationFrame(tickLoader);
  }
  requestAnimationFrame(tickLoader);

  function finishLoading() {
    if (finished) return;
    const wait = Math.max(0, minLoad - (performance.now() - loadStart));
    setTimeout(() => {
      finished = true;
      loaderPct.textContent = "100";
      loaderBar.style.transform = "scaleX(1)";
      setTimeout(() => {
        loader.classList.add("is-done");
        setTimeout(() => loader.remove(), 800); // leave no stray text outside the page landmarks
        document.body.classList.remove("is-loading");
        document.body.classList.add("is-ready");
        $$(".scramble").forEach((el, i) => setTimeout(() => scramble(el), i * 140));
      }, 250);
    }, wait);
  }
  setTimeout(() => { assetProgress = 1; finishLoading(); }, 6000); // safety net

  /* ---------------------------------------------------------------------
     Text scramble
     --------------------------------------------------------------------- */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\";
  function scramble(el) {
    const final = el.dataset.text || el.textContent;
    if (reduceMotion) { el.textContent = final; return; }
    const dur = 900;
    const t0 = performance.now();
    const frame = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const settled = Math.floor(p * final.length);
      let out = "";
      for (let i = 0; i < final.length; i++) {
        out += i < settled || final[i] === " " ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = final;
    };
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------------
     3D globe
     --------------------------------------------------------------------- */
  const HOME = { name: "Tempe, AZ", lat: 33.4255, lon: -111.94 };
  const CITIES = [
    { name: "Los Angeles", lat: 34.05, lon: -118.24 },
    { name: "New York", lat: 40.71, lon: -74.0 },
    { name: "Toronto", lat: 43.65, lon: -79.38 },
    { name: "Mexico City", lat: 19.43, lon: -99.13 },
    { name: "São Paulo", lat: -23.55, lon: -46.63 },
    { name: "London", lat: 51.5, lon: -0.12 },
    { name: "Paris", lat: 48.85, lon: 2.35 },
    { name: "Dubai", lat: 25.2, lon: 55.27 },
    { name: "Tokyo", lat: 35.68, lon: 139.69 },
    { name: "Sydney", lat: -33.86, lon: 151.2 },
  ];

  function initGlobe() {
    const canvas = $("#globe");
    const hero = $(".hero");
    const labelsEl = $("#globeLabels");
    const THREE = window.THREE;
    let renderer;
    try {
      if (!THREE) throw new Error("three missing");
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      hero.classList.add("no-webgl");
      assetProgress = 1;
      finishLoading();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const R = 1;

    const tilt = new THREE.Group();
    const spin = new THREE.Group();
    tilt.add(spin);
    scene.add(tilt);

    // Lighting — lit from the upper-left like a satellite photo, dark side to the right
    scene.add(new THREE.AmbientLight(0x2a3f66, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 1.35);
    sun.position.set(-4, 2.5, 3.5);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x6fb2ff, 0.6);
    rim.position.set(4, -1, -2);
    scene.add(rim);

    const manager = new THREE.LoadingManager();
    manager.onProgress = (_u, loaded, total) => { assetProgress = loaded / total; };
    manager.onLoad = () => { assetProgress = 1; finishLoading(); };
    const tl = new THREE.TextureLoader(manager);
    tl.setCrossOrigin("anonymous");
    const TEX = "https://unpkg.com/three-globe@2.31.0/example/img/";

    const earthMat = new THREE.MeshPhongMaterial({ color: 0x0e2a52, specular: 0x15284a, shininess: 10 });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 96), earthMat);
    spin.add(earth);

    tl.load(TEX + "earth-blue-marble.jpg", (t) => {
      earthMat.map = t;
      earthMat.color.set(0xa9bdd9); // slight navy grade to match the crest
      earthMat.needsUpdate = true;
    });
    tl.load(TEX + "earth-topology.png", (t) => { earthMat.bumpMap = t; earthMat.bumpScale = 0.025; earthMat.needsUpdate = true; });
    tl.load(TEX + "earth-water.png", (t) => {
      earthMat.specularMap = t;
      earthMat.needsUpdate = true;
      buildDots(t.image);
    });

    // Atmosphere glow
    const atmoVert = "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }";
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: atmoVert,
        fragmentShader: "varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 3.6); gl_FragColor = vec4(0.36,0.6,1.0,1.0) * i * 0.75; }",
        side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      })
    );
    atmo.scale.setScalar(1.13);
    tilt.add(atmo);
    const fresnel = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.002, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: atmoVert,
        fragmentShader: "varying vec3 vN; void main(){ float i = pow(1.0 - dot(vN, vec3(0.0,0.0,1.0)), 3.5); gl_FragColor = vec4(0.45,0.72,1.0,1.0) * i * 0.6; }",
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      })
    );
    tilt.add(fresnel);

    // Lat/lon → position, matching three.js sphere UVs
    function ll(lat, lon, r = R) {
      const phi = ((lon + 180) * Math.PI) / 180;
      const theta = ((90 - lat) * Math.PI) / 180;
      return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
    }

    // Pixel dot-matrix over land (the reference's signature look)
    function buildDots(img) {
      try {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        const pos = [];
        const step = 1.35;
        for (let lat = -58; lat <= 78; lat += step) {
          const lonStep = step / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
          for (let lon = -180; lon < 180; lon += lonStep) {
            const x = Math.floor(((lon + 180) / 360) * c.width);
            const y = Math.floor(((90 - lat) / 180) * c.height);
            if (data[(y * c.width + x) * 4] < 90) { const v = ll(lat, lon, R * 1.006); pos.push(v.x, v.y, v.z); }
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        const dots = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.0115, color: 0xd6e6ff, transparent: true, opacity: 0.72, depthWrite: false }));
        spin.add(dots);
      } catch { /* tainted canvas — skip dots, globe still renders */ }
    }

    // Home marker + pulse ring
    const homePos = ll(HOME.lat, HOME.lon, R * 1.008);
    const ringGeo = new THREE.RingGeometry(0.018, 0.026, 40);
    const pulses = [0, 1].map((i) => {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      m.position.copy(homePos);
      m.lookAt(homePos.clone().multiplyScalar(2));
      m.userData.offset = i * 0.5;
      spin.add(m);
      return m;
    });
    const homeDot = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    homeDot.position.copy(homePos);
    spin.add(homeDot);

    // Arcs from Tempe to the world
    const arcMat = () => new THREE.LineBasicMaterial({ color: 0x9cc8ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const SEG = 90;
    const arcs = CITIES.map((city, i) => {
      const a = ll(HOME.lat, HOME.lon), b = ll(city.lat, city.lon);
      const dist = a.distanceTo(b);
      const alt = R + 0.04 + dist * 0.18;
      const dir = (t) => a.clone().lerp(b, t).normalize();
      const curve = new THREE.CubicBezierCurve3(a.clone().multiplyScalar(1.006), dir(0.25).multiplyScalar(alt), dir(0.75).multiplyScalar(alt), b.clone().multiplyScalar(1.006));
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(SEG));
      const line = new THREE.Line(geo, arcMat());
      spin.add(line);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
      spin.add(head);
      const cityDot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 10), new THREE.MeshBasicMaterial({ color: 0x9cc8ff }));
      cityDot.position.copy(b.clone().multiplyScalar(1.006));
      spin.add(cityDot);
      return { curve, geo, line, head, offset: i * 0.37, dur: 3.6 + (i % 3) * 0.6 };
    });

    // HTML labels
    const labelData = [{ ...HOME, home: true }, ...CITIES].map((c) => {
      const el = document.createElement("span");
      el.className = "glabel" + (c.home ? " glabel--home" : "");
      el.textContent = c.home ? "TG Core · Tempe, AZ" : c.name;
      labelsEl.appendChild(el);
      return { el, pos: ll(c.lat, c.lon, R * 1.01) };
    });

    // Orientation: Tempe facing the viewer, north tilted in
    const baseSpin = 0.38;
    const baseTilt = 0.42;
    let spinY = baseSpin - 0.9; // start rotated away, sweeps in on load
    let vel = 0;
    let dragging = false;
    let lastX = 0;
    let mouseX = 0, mouseY = 0, tiltX = baseTilt;
    let scrollP = 0;
    let running = true;

    canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      vel = dx * 0.0055;
      spinY += vel;
    });
    const endDrag = () => { dragging = false; };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    window.addEventListener("pointermove", (e) => {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    let W = 0, H = 0, baseY = 0;
    function resize() {
      W = hero.clientWidth; H = hero.clientHeight;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      const halfFov = Math.tan(((camera.fov / 2) * Math.PI) / 180);
      const mobile = W < 768;
      const zH = (2 * R) / ((mobile ? 0.5 : 0.62) * 2 * halfFov);
      const zW = (2 * R) / ((mobile ? 0.8 : 0.6) * 2 * halfFov * camera.aspect);
      camera.position.z = Math.max(zH, zW);
      baseY = mobile ? 0.75 : 0.12;
      labelsEl.classList.toggle("is-compact", mobile);
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) requestAnimationFrame(loop); }).observe(hero);
    window.addEventListener("scroll", () => { scrollP = clamp(window.scrollY / (H || 1), 0, 1); }, { passive: true });

    const v = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const clock = new THREE.Clock();

    function loop() {
      if (!running) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      if (!dragging) {
        // ease the intro sweep toward home, then drift slowly
        if (t < 3 && !reduceMotion) spinY += (baseSpin - spinY) * 0.035;
        vel *= 0.94;
        spinY += vel + (reduceMotion ? 0 : dt * 0.045);
      }
      spin.rotation.y = spinY;
      tiltX += (baseTilt + mouseY * 0.12 - tiltX) * 0.05;
      tilt.rotation.x = tiltX;
      tilt.rotation.z = -mouseX * 0.05;
      tilt.position.y = baseY + scrollP * 0.9;
      tilt.scale.setScalar(1 + scrollP * 0.25);
      canvas.style.opacity = String(1 - scrollP * 0.7);

      pulses.forEach((m) => {
        const p = ((t * 0.6 + m.userData.offset) % 1);
        m.scale.setScalar(1 + p * 3.2);
        m.material.opacity = (1 - p) * 0.9;
      });

      arcs.forEach((a) => {
        if (reduceMotion) { a.geo.setDrawRange(0, SEG + 1); a.head.visible = false; return; }
        const p = ((t + a.offset * a.dur) % a.dur) / a.dur;
        const grow = clamp(p / 0.55, 0, 1);
        const fade = clamp((p - 0.55) / 0.45, 0, 1);
        const easeGrow = 1 - Math.pow(1 - grow, 3);
        const end = Math.floor(easeGrow * SEG) + 1;
        const start = Math.floor(fade * fade * SEG);
        a.geo.setDrawRange(start, Math.max(0, end - start));
        a.line.material.opacity = 0.85 * (1 - fade * 0.6);
        a.head.visible = grow < 1;
        a.head.position.copy(a.curve.getPoint(easeGrow));
      });

      renderer.render(scene, camera);

      // project labels
      labelData.forEach((l) => {
        v.copy(l.pos);
        spin.localToWorld(v);
        camDir.copy(camera.position).sub(v).normalize();
        const facing = v.clone().sub(tilt.getWorldPosition(new THREE.Vector3())).normalize().dot(camDir);
        v.project(camera);
        const x = ((v.x + 1) / 2) * W;
        const y = ((1 - v.y) / 2) * H;
        l.el.style.transform = `translate(${x + 8}px, ${y - 7}px)`;
        l.el.style.opacity = facing > 0.25 ? String(clamp((facing - 0.25) * 3, 0, 1) * (1 - scrollP)) : "0";
      });

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener("DOMContentLoaded", initGlobe);

  /* ---------------------------------------------------------------------
     Arizona clock (no DST in Arizona)
     --------------------------------------------------------------------- */
  const azTime = $("#azTime");
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tickClock = () => { azTime.textContent = fmt.format(new Date()); };
  tickClock();
  setInterval(tickClock, 1000);
  $("#year").textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------------
     Header, menu, progress, active nav
     --------------------------------------------------------------------- */
  const header = $("#header");
  const progress = $("#scrollProgress");
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    header.classList.toggle("is-scrolled", y > 40);
    const hide = y > lastY && y > 600 && !document.body.classList.contains("menu-open") && !header.contains(document.activeElement);
    header.classList.toggle("is-hidden", hide);
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const menu = $("#menu");
  const menuBtn = $("#menuBtn");
  function setMenu(open) {
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
    header.classList.remove("is-hidden");
    if (open) setTimeout(() => $(".menu__links a", menu).focus(), 300);
  }
  menuBtn.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); }
  });

  const navLinks = $$(".header__nav a");
  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["services", "work", "journey", "pricing", "start"].forEach((id) => { const s = document.getElementById(id); if (s) sectionObs.observe(s); });

  /* ---------------------------------------------------------------------
     Cursor, magnetic buttons, spotlight, tilt
     --------------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    const cursor = $(".cursor");
    const dot = $(".cursor__dot");
    const ring = $(".cursor__ring");
    let cx = -100, cy = -100, rx = -100, ry = -100;
    window.addEventListener("pointermove", (e) => { cx = e.clientX; cy = e.clientY; }, { passive: true });
    (function follow() {
      rx += (cx - rx) * 0.18; ry += (cy - ry) * 0.18;
      dot.style.transform = `translate(${cx}px, ${cy}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    })();
    document.addEventListener("pointerover", (e) => {
      cursor.classList.toggle("is-hover", !!e.target.closest("a, button, summary, .chip, select"));
      cursor.classList.toggle("is-drag", !!e.target.closest("#globe"));
    });

    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.22}px, ${y * 0.3}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });

    $$(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${-py * 6}deg) rotateY(${px * 7}deg) translateY(-4px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  $$(".spot").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ---------------------------------------------------------------------
     Reveals, counters, rings, split bar, process steps
     --------------------------------------------------------------------- */
  function countUp(el, target, suffix = "", dur = 1800) {
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const e = 1 - Math.pow(2, -10 * p);
      el.textContent = Math.round(target * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add("is-in");
      const num = $(".counter__num", el);
      if (num && num.dataset.count) countUp(num, +num.dataset.count, num.dataset.suffix || "");
      $$(".ring", el).forEach((ring, i) => {
        const val = +ring.dataset.value;
        setTimeout(() => {
          $(".ring__fg", ring).style.strokeDashoffset = String(264 * (1 - val / 100));
          countUp($(".ring__val", ring), val, "", 1600);
        }, i * 150);
      });
      if (el.querySelector("#growthChart")) drawGrowth();
      revealObs.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 70}ms`;
    revealObs.observe(el);
  });

  const stepObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("is-on"); });
  }, { threshold: 0.6 });
  $$(".step").forEach((s) => stepObs.observe(s));

  /* ---------------------------------------------------------------------
     Growth chart
     --------------------------------------------------------------------- */
  // Projects delivered per year. Edit these numbers (and add a year each January).
  const GROWTH = [[2024, 6], [2025, 14], [2026, 24]];
  const svgNS = "http://www.w3.org/2000/svg";
  const chart = $("#growthChart");
  const tip = $("#growthTip");
  let chartDrawn = false;
  (function buildGrowth() {
    const w = 600, h = 280, pl = 36, pr = 18, pt = 28, pb = 34, max = Math.max(10, Math.ceil(Math.max(...GROWTH.map((d) => d[1])) / 10) * 10);
    const x = (i) => pl + (i * (w - pl - pr)) / (GROWTH.length - 1);
    const y = (v) => pt + (1 - v / max) * (h - pt - pb);
    const el = (tag, attrs, parent = chart) => {
      const n = document.createElementNS(svgNS, tag);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
      parent.appendChild(n);
      return n;
    };
    const defs = el("defs", {});
    const grad = el("linearGradient", { id: "areaGrad", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: "0%", "stop-color": "#6fb2ff", "stop-opacity": 0.35 }, grad);
    el("stop", { offset: "100%", "stop-color": "#6fb2ff", "stop-opacity": 0 }, grad);
    Array.from({ length: max / 10 + 1 }, (_, k) => k * 10).forEach((g) => {
      el("line", { class: "grid", x1: pl, x2: w - pr, y1: y(g), y2: y(g) });
      el("text", { class: "axis", x: pl - 10, y: y(g) + 4, "text-anchor": "end" }).textContent = g;
    });
    GROWTH.forEach(([yr], i) => { el("text", { class: "axis", x: x(i), y: h - 8, "text-anchor": "middle" }).textContent = yr; });
    let d = `M${x(0)},${y(GROWTH[0][1])}`;
    for (let i = 1; i < GROWTH.length; i++) {
      const mx = (x(i - 1) + x(i)) / 2;
      d += ` C${mx},${y(GROWTH[i - 1][1])} ${mx},${y(GROWTH[i][1])} ${x(i)},${y(GROWTH[i][1])}`;
    }
    el("path", { class: "area", d: `${d} L${x(GROWTH.length - 1)},${y(0)} L${x(0)},${y(0)} Z` });
    const line = el("path", { class: "line", d });
    chart.dataset.len = "1";
    chart._line = line;
    GROWTH.forEach(([yr, val], i) => {
      el("text", { class: "val", x: x(i), y: y(val) - 14, "text-anchor": "middle" }).textContent = val;
      const c = el("circle", { class: "pt", cx: x(i), cy: y(val), r: 5 });
      const li = document.createElement("li");
      li.textContent = `${yr}: ${val} projects delivered`;
      $("#growthData").appendChild(li);
      const show = () => {
        const box = chart.getBoundingClientRect();
        tip.textContent = `${yr}: ${val} projects`;
        tip.style.left = `${(x(i) / w) * box.width}px`;
        tip.style.top = `${(y(val) / h) * box.height}px`;
        tip.classList.add("is-on");
      };
      const hide = () => tip.classList.remove("is-on");
      c.addEventListener("pointerenter", show);
      c.addEventListener("pointerleave", hide);
    });
  })();
  function drawGrowth() {
    if (chartDrawn) return;
    chartDrawn = true;
    const line = chart._line;
    const len = line.getTotalLength();
    line.style.strokeDasharray = len;
    line.style.strokeDashoffset = reduceMotion ? 0 : len;
    line.getBoundingClientRect();
    line.style.transition = "stroke-dashoffset 1.8s cubic-bezier(.16,1,.3,1)";
    line.style.strokeDashoffset = 0;
    chart.classList.add("is-drawn");
  }

  /* ---------------------------------------------------------------------
     Manifesto word-by-word light-up + timeline fill
     --------------------------------------------------------------------- */
  const KEY = /^(progress|hard|work|passion|legacy|remembered|love|perform)/i;
  const manifesto = $(".reveal-words");
  const words = manifesto.textContent.trim().split(/\s+/);
  manifesto.textContent = "";
  const wordEls = words.map((w) => {
    const s = document.createElement("span");
    s.className = "w" + (KEY.test(w) ? " is-key" : "");
    s.textContent = w + " ";
    manifesto.appendChild(s);
    return s;
  });

  const timeline = $("#timeline");
  const timelineFill = $("#timelineFill");
  function onScrollFx() {
    const vh = window.innerHeight;
    const mr = manifesto.getBoundingClientRect();
    const mp = reduceMotion ? 1 : clamp((vh * 0.85 - mr.top) / (mr.height + vh * 0.3), 0, 1);
    const on = Math.round(mp * wordEls.length);
    wordEls.forEach((w, i) => w.classList.toggle("is-on", i < on));

    const tr = timeline.getBoundingClientRect();
    const tp = clamp((vh * 0.6 - tr.top) / tr.height, 0, 1);
    timelineFill.style.transform = `scaleY(${tp})`;
  }
  window.addEventListener("scroll", onScrollFx, { passive: true });
  onScrollFx();

  /* ---------------------------------------------------------------------
     Intake form — multi-step, validated on blur, autosaved
     --------------------------------------------------------------------- */
  const form = $("#intake");
  const fsteps = $$(".fstep", form);
  const STEP_NAMES = ["About you", "Your company", "Your project"];
  const prevBtn = $("#prevBtn"), nextBtn = $("#nextBtn"), submitBtn = $("#submitBtn");
  const DRAFT_KEY = "tgcore-intake-draft";
  let cur = 0;

  const rules = {
    name: (v) => (v.trim().length < 2 ? "Please enter your full name." : ""),
    email: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "Enter a valid email, like name@company.com." : ""),
    phone: (v) => (v.trim() && v.replace(/\D/g, "").length < 10 ? "Phone should have at least 10 digits, or leave it blank." : ""),
    company: (v) => (!v.trim() ? "Please enter your company name." : ""),
    industry: (v) => (!v ? "Choose the industry closest to yours." : ""),
    website: (v) => {
      if (!v.trim()) return "";
      try { new URL(/^https?:\/\//i.test(v) ? v : "https://" + v); return /\./.test(v) ? "" : "Enter a full web address, like yoursite.com."; }
      catch { return "Enter a full web address, like yoursite.com."; }
    },
    goals: (v) => (v.trim().length < 15 ? "Tell us a bit more (at least a sentence) so we can prepare." : ""),
  };

  function validate(input) {
    const rule = rules[input.name];
    if (!rule) return true;
    const msg = rule(input.value);
    const field = input.closest(".field");
    const err = field.querySelector(".err");
    field.classList.toggle("has-error", !!msg);
    input.setAttribute("aria-invalid", String(!!msg));
    if (err) err.textContent = msg;
    return !msg;
  }

  $$("input, select, textarea", form).forEach((input) => {
    input.addEventListener("blur", () => { if (input.value || input.getAttribute("aria-invalid") === "true") validate(input); });
    input.addEventListener("input", () => { if (input.getAttribute("aria-invalid") === "true") validate(input); saveDraft(); });
    input.addEventListener("change", saveDraft);
  });

  function showStep(i, focus = true) {
    cur = i;
    fsteps.forEach((s, j) => s.classList.toggle("is-active", j === i));
    $("#formBar").style.width = `${((i + 1) / fsteps.length) * 100}%`;
    $("#stepLabel").textContent = `Step ${i + 1} of ${fsteps.length}: ${STEP_NAMES[i]}`;
    prevBtn.hidden = i === 0;
    nextBtn.hidden = i === fsteps.length - 1;
    submitBtn.hidden = i !== fsteps.length - 1;
    if (focus) { const first = $("input, select, textarea", fsteps[i]); if (first) first.focus({ preventScroll: true }); }
  }

  function validateStep(i) {
    const inputs = $$("input[name], select[name], textarea[name]", fsteps[i]).filter((el) => rules[el.name]);
    const bad = inputs.filter((el) => !validate(el));
    if (bad.length) bad[0].focus();
    return !bad.length;
  }

  nextBtn.addEventListener("click", () => { if (validateStep(cur)) showStep(cur + 1); });
  prevBtn.addEventListener("click", () => showStep(cur - 1));

  function collect() {
    const fd = new FormData(form);
    const data = {};
    for (const [k, v] of fd.entries()) data[k] = data[k] ? `${data[k]}, ${v}` : v;
    return data;
  }
  function saveDraft() { store.set(DRAFT_KEY, collect()); }
  (function restoreDraft() {
    const d = store.get(DRAFT_KEY);
    if (!d) return;
    Object.entries(d).forEach(([k, v]) => {
      const els = $$(`[name="${k}"]`, form);
      els.forEach((el) => {
        if (el.type === "checkbox" || el.type === "radio") el.checked = String(v).split(", ").includes(el.value);
        else el.value = v;
      });
    });
  })();

  $$("[data-plan]").forEach((b) => b.addEventListener("click", () => { $("#f-plan").value = b.dataset.plan; saveDraft(); }));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateStep(cur)) return;
    // Pressing Enter before the last step acts like Continue, never sends early
    if (cur < fsteps.length - 1) { showStep(cur + 1); return; }
    const data = collect();
    submitBtn.classList.add("is-loading");
    submitBtn.disabled = true;
    let ok = true;
    let viaEmailApp = false;
    try {
      if (APPS_SCRIPT_URL) {
        // text/plain keeps this a "simple" request, so Apps Script needs no CORS preflight
        const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(data) });
        ok = (await res.json()).ok;
      } else if (WEB3FORMS_KEY) {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject: `New company submission: ${data.company}`, from_name: "TG Core website", ...data }),
        });
        ok = (await res.json()).success;
      } else {
        viaEmailApp = true;
        const body = Object.entries({
          Name: data.name, Email: data.email, Phone: data.phone, Company: data.company, Industry: data.industry,
          Website: data.website, Location: data.location, Services: data.services, Budget: data.budget, Package: data.plan, Goals: data.goals,
        }).map(([k, v]) => `${k}: ${v || "—"}`).join("\n");
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Company submission: " + data.company)}&body=${encodeURIComponent(body)}`;
      }
    } catch { ok = false; }
    submitBtn.classList.remove("is-loading");
    submitBtn.disabled = false;
    if (!ok) {
      toast("Couldn't send right now. Please try again or email " + CONTACT_EMAIL);
      return;
    }
    store.del(DRAFT_KEY);
    $("#successMsg").textContent = viaEmailApp
      ? "Your email app opened with your details filled in — just press send and we'll reply within 1–2 business days."
      : "Thank you! The TG Core team will review your company and reply within 1–2 business days.";
    form.hidden = true;
    const ok$ = $("#formSuccess");
    ok$.hidden = false;
    ok$.focus();
  });

  $("#resetForm").addEventListener("click", () => {
    form.reset();
    $$(".field", form).forEach((f) => f.classList.remove("has-error"));
    $$("[aria-invalid]", form).forEach((el) => el.removeAttribute("aria-invalid"));
    $$(".err", form).forEach((el) => (el.textContent = ""));
    $("#formSuccess").hidden = true;
    form.hidden = false;
    showStep(0);
  });
  showStep(0, false);

  /* ---------------------------------------------------------------------
     Book a call
     --------------------------------------------------------------------- */
  if (/^https:\/\//.test(BOOKING_URL)) {
    $$("[data-booking]").forEach((a) => {
      a.href = BOOKING_URL;
      a.target = "_blank";
      a.rel = "noopener";
      const note = document.createElement("span");
      note.className = "sr-only";
      note.textContent = " (opens Google Calendar in a new tab)";
      a.appendChild(note);
      a.hidden = false;
    });
    $$("[data-booking-wrap]").forEach((el) => { el.hidden = false; });
  }

  /* ---------------------------------------------------------------------
     Floating contact panel
     --------------------------------------------------------------------- */
  const chat = $("#chat"), chatBtn = $("#chatBtn"), chatPanel = $("#chatPanel");
  const chatForm = $("#chatForm"), chatDone = $("#chatDone"), chatSend = $("#chatSend");
  function setChat(open) {
    chatPanel.hidden = !open;
    chatBtn.setAttribute("aria-expanded", String(open));
    if (open) (chatForm.hidden ? chatDone : $("#c-name")).focus();
  }
  chatBtn.addEventListener("click", () => setChat(chatPanel.hidden));
  $$(".chat__q", chatPanel).forEach((a) => a.addEventListener("click", () => setChat(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !chatPanel.hidden) { setChat(false); chatBtn.focus(); } });
  document.addEventListener("pointerdown", (e) => { if (!chatPanel.hidden && !chat.contains(e.target)) setChat(false); });

  // Website messages land in the TG Core inbox (same delivery chain as the intake form)
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  const chatRules = {
    name: (v) => (v.trim().length < 2 ? "Please enter your name." : ""),
    contact: (v) => (isEmail(v) || v.replace(/\D/g, "").length >= 10 ? "" : "Enter an email or a phone number so we can reply."),
    message: (v) => (v.trim().length < 2 ? "Write a short message." : ""),
  };
  function checkChat(input) {
    const msg = chatRules[input.name](input.value);
    input.closest(".field").classList.toggle("has-error", !!msg);
    input.setAttribute("aria-invalid", String(!!msg));
    input.closest(".field").querySelector(".err").textContent = msg;
    return !msg;
  }
  $$("input[name]:not(.hp), textarea", chatForm).forEach((input) => {
    input.addEventListener("blur", () => { if (input.value) checkChat(input); });
    input.addEventListener("input", () => { if (input.getAttribute("aria-invalid") === "true") checkChat(input); });
  });

  async function deliverMessage(data) {
    if (APPS_SCRIPT_URL) {
      const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ type: "message", ...data }) });
      return (await res.json()).ok ? "sent" : "failed";
    }
    if (WEB3FORMS_KEY) {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject: `Website message from ${data.name}`, from_name: "TG Core website", ...data }),
      });
      return (await res.json()).success ? "sent" : "failed";
    }
    const body = `${data.message}\n\n— ${data.name}\n${data.contact}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Website message from " + data.name)}&body=${encodeURIComponent(body)}`;
    return "mailto";
  }

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inputs = $$("input[name]:not(.hp), textarea", chatForm);
    const bad = inputs.filter((el) => !checkChat(el));
    if (bad.length) { bad[0].focus(); return; }
    const data = Object.fromEntries(new FormData(chatForm).entries());
    chatSend.classList.add("is-loading");
    chatSend.disabled = true;
    let result;
    try { result = await deliverMessage(data); } catch { result = "failed"; }
    chatSend.classList.remove("is-loading");
    chatSend.disabled = false;
    if (result === "failed") {
      toast("Message didn't send. Please try again or text +1 (480) 667-0415");
      return;
    }
    $("#chatDoneMsg").textContent = result === "mailto"
      ? "Your email app opened with your message — just press send."
      : `Thanks, ${data.name.split(" ")[0]}! We'll reply to ${data.contact.trim()} soon.`;
    chatForm.reset();
    chatForm.hidden = true;
    chatDone.hidden = false;
    chatDone.focus();
  });
  $("#chatAgain").addEventListener("click", () => {
    chatDone.hidden = true;
    chatForm.hidden = false;
    $("#c-name").focus();
  });

  /* ---------------------------------------------------------------------
     Keep keyboard focus clear of the fixed header and floating button
     --------------------------------------------------------------------- */
  document.addEventListener("focusin", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement) || el.closest("#header, #menu, #chat")) return;
    const r = el.getBoundingClientRect();
    const top = header.classList.contains("is-hidden") ? 0 : header.getBoundingClientRect().bottom;
    const bottom = window.innerHeight - 88;
    if (r.top < top + 12) window.scrollBy({ top: r.top - top - 24, behavior: "auto" });
    else if (r.bottom > bottom) window.scrollBy({ top: r.bottom - bottom + 24, behavior: "auto" });
  });

  /* ---------------------------------------------------------------------
     Copy email + toast
     --------------------------------------------------------------------- */
  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("is-on"), 3500);
  }
  $("#copyEmail").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(CONTACT_EMAIL); toast("Email copied to clipboard"); }
    catch { toast(CONTACT_EMAIL); }
  });
})();
