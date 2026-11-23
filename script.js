/* =====================================================================
   Amy's portfolio: the story engine
   Plain JS handles the basics; D3 (loaded in index.html) powers the
   story thread, hero blob + sparkles, skill map, typing, and springs.
   If someone prefers reduced motion, everything shows without movement.
   ===================================================================== */
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) root.classList.add("reduce");
  const hasD3 = typeof window.d3 !== "undefined";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Footer year
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Mobile menu ---------- */
  const toggle = $(".nav-toggle");
  const links = $(".nav-links");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });
  $$("a", links).forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", false);
    })
  );

  /* ---------- Text splitting (letters for the hero, words for headings) ---------- */
  function splitChars(el) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const ch of child.textContent) {
            if (ch === " ") { frag.appendChild(document.createTextNode(" ")); continue; }
            const s = document.createElement("span");
            s.className = "char";
            s.textContent = ch;
            s.setAttribute("aria-hidden", "true");
            s.style.setProperty("--i", i++);
            frag.appendChild(s);
          }
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(el);
  }

  function splitWords(el) {
    let i = 0;
    const wrap = (content) => {
      const w = document.createElement("span");
      w.className = "w";
      const inner = document.createElement("span");
      inner.style.setProperty("--i", i++);
      if (typeof content === "string") inner.textContent = content;
      else inner.appendChild(content);
      w.appendChild(inner);
      return w;
    };
    Array.from(el.childNodes).forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          frag.appendChild(/^\s+$/.test(part) ? document.createTextNode(" ") : wrap(part));
        });
        el.replaceChild(frag, child);
      } else if (child.nodeType === 1) {
        const marker = document.createTextNode("");
        el.replaceChild(marker, child);
        el.replaceChild(wrap(child), marker);
      }
    });
  }

  if (!reduce) {
    splitChars($(".hero-title"));
    $$('[data-reveal="words"]').forEach(splitWords);
  }

  /* ---------- Chat bubbles: typing dots, then the message types out ---------- */
  function prepBubble(b) {
    const text = b.textContent.trim();
    b.dataset.full = text;
    b.textContent = "";
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = text;
    const vis = document.createElement("span");
    vis.className = "typed";
    vis.setAttribute("aria-hidden", "true");
    vis.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    b.append(sr, vis);
  }

  function typeBubble(b) {
    if (!b || b.dataset.done) return;
    b.dataset.done = "1";
    const vis = $(".typed", b);
    const chars = Array.from(b.dataset.full);
    setTimeout(() => {
      vis.textContent = "";
      const txt = document.createElement("span");
      const caret = document.createElement("span");
      caret.className = "caret";
      vis.append(txt, caret);
      const done = () => setTimeout(() => caret.remove(), 700);
      if (!hasD3) { txt.textContent = chars.join(""); done(); return; }
      d3.select(txt)
        .transition()
        .duration(chars.length * 28)
        .ease(d3.easeLinear)
        .tween("text", () => (t) => { txt.textContent = chars.slice(0, Math.round(t * chars.length)).join(""); })
        .on("end", done);
    }, 900);
  }

  if (!reduce) $$("[data-type]").forEach(prepBubble);

  /* ---------- Count-up numbers ---------- */
  function countUp(el) {
    if (!hasD3 || reduce) return;
    const to = +el.dataset.to;
    if (!isFinite(to)) return;
    const pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
    d3.select(el)
      .transition()
      .duration(1500)
      .ease(d3.easeCubicOut)
      .tween("text", () => {
        const i = d3.interpolateRound(0, to);
        return (t) => { el.textContent = pre + i(t) + suf; };
      });
  }

  /* ---------- Scroll reveals (staggered with a little delay per item) ---------- */
  $$("[data-stagger]").forEach((group) =>
    $$(":scope > [data-reveal]", group).forEach((el, i) => { el.style.transitionDelay = `${i * 110}ms`; })
  );

  function onReveal(el) {
    if (el.matches(".bubble-wrap")) typeBubble($("[data-type]", el));
    $$(".count", el).forEach(countUp);
    if (el.matches(".count")) countUp(el);
  }

  const revealEls = $$("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add("in");
          io.unobserve(el);
          onReveal(el);
          setTimeout(() => { el.style.transitionDelay = ""; }, 1800);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Nav: highlight the chapter on screen ---------- */
  const navAnchors = $$(".nav-links a");
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navAnchors.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  $$("section[id]").forEach((s) => navObserver.observe(s));

  /* ---------- Story thread + progress bar + timeline (all scroll-linked) ---------- */
  const main = $("main");
  const threadSvg = $(".story-thread");
  const threadLine = $(".thread-line");
  const threadDot = $(".thread-dot");
  const progressBar = $(".progress span");
  const tlWrap = $(".timeline-wrap");
  const tlProg = $(".timeline-progress");
  const tlItems = $$(".timeline li");
  let threadLen = 0;
  let anchors = [];

  function buildThread() {
    if (!hasD3) { threadSvg.style.display = "none"; return; }
    const mainRect = main.getBoundingClientRect();
    const tx = parseFloat(getComputedStyle(root).getPropertyValue("--thread-x")) || 36;
    anchors = $$(".thread-anchor")
      .filter((el) => el.offsetParent !== null)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { el, y: r.top - mainRect.top + r.height / 2 };
      })
      .sort((a, b) => a.y - b.y);
    if (anchors.length < 2) return;

    // Gently wiggle between anchors so it feels hand-drawn
    const pts = [];
    anchors.forEach((a, i) => {
      pts.push([tx, a.y]);
      const next = anchors[i + 1];
      if (next) pts.push([tx + (i % 2 ? -12 : 12), (a.y + next.y) / 2]);
    });
    const d = d3.line().curve(d3.curveMonotoneY)(pts);
    $$("path", threadSvg).forEach((p) => p.setAttribute("d", d));
    threadLen = threadLine.getTotalLength();
    threadLine.style.strokeDasharray = `${threadLen} ${threadLen}`;
    updateScroll();
  }

  function lengthAtY(path, len, y) {
    let lo = 0, hi = len;
    if (path.getPointAtLength(0).y >= y) return 0;
    for (let k = 0; k < 22; k++) {
      const mid = (lo + hi) / 2;
      if (path.getPointAtLength(mid).y < y) lo = mid; else hi = mid;
    }
    return lo;
  }

  function updateScroll() {
    const sy = window.scrollY, vh = window.innerHeight;
    const docH = root.scrollHeight;
    progressBar.style.transform = `scaleX(${clamp(sy / Math.max(1, docH - vh), 0, 1)})`;

    if (threadLen) {
      const mainTop = main.getBoundingClientRect().top + sy;
      const target = sy + vh * 0.62 - mainTop;
      const drawn = reduce ? threadLen : lengthAtY(threadLine, threadLen, target);
      threadLine.style.strokeDashoffset = threadLen - drawn;
      const p = threadLine.getPointAtLength(drawn);
      threadDot.setAttribute("cx", p.x);
      threadDot.setAttribute("cy", p.y);
      threadDot.style.opacity = drawn > 1 ? 1 : 0;
      anchors.forEach((a) => a.el.classList.toggle("reached", reduce || a.y <= target + 2));
    }

    if (tlWrap) {
      const r = tlWrap.getBoundingClientRect();
      const h = reduce ? r.height : clamp(vh * 0.62 - r.top, 0, r.height);
      tlProg.style.height = `${h}px`;
      tlItems.forEach((li) => li.classList.toggle("reached", li.getBoundingClientRect().top - r.top + 12 <= h));
    }
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; updateScroll(); });
  }, { passive: true });

  // Rebuild the thread whenever the page changes size (fonts, Instagram embeds, typing…)
  let rebuildQueued = false;
  const queueRebuild = () => {
    if (rebuildQueued) return;
    rebuildQueued = true;
    requestAnimationFrame(() => { rebuildQueued = false; buildThread(); });
  };
  if ("ResizeObserver" in window) new ResizeObserver(queueRebuild).observe(main);
  window.addEventListener("resize", queueRebuild);
  if (document.fonts) document.fonts.ready.then(queueRebuild);
  buildThread();
  updateScroll();

  /* ---------- Hero: parallax, morphing blob, sparkles, draggable chips ---------- */
  const hero = $(".hero");
  if (!reduce) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", (((e.clientX - r.left) / r.width) - 0.5) * 2);
      hero.style.setProperty("--my", (((e.clientY - r.top) / r.height) - 0.5) * 2);
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--mx", 0);
      hero.style.setProperty("--my", 0);
    });
  }

  function starPath(r) {
    const k = r * 0.28;
    return `M0,${-r} Q${k},${-k} ${r},0 Q${k},${k} 0,${r} Q${-k},${k} ${-r},0 Q${-k},${-k} 0,${-r}Z`;
  }

  if (hasD3) {
    // Soft blob behind the photo that slowly changes shape
    const N = 8;
    const phases = d3.range(N).map(() => Math.random() * Math.PI * 2);
    const speeds = d3.range(N).map(() => 0.35 + Math.random() * 0.45);
    const radial = d3.lineRadial().curve(d3.curveBasisClosed).angle((d, i) => (i / N) * 2 * Math.PI).radius((d) => d);
    const blob = d3.select(".blob-path");
    const drawBlob = (s) => blob.attr("d", radial(d3.range(N).map((i) => 215 + 24 * Math.sin(s * speeds[i] + phases[i]))));
    drawBlob(0);

    // Drifting sparkles that scatter away from the cursor
    const sv = d3.select(".sparkles");
    let W = 0, H = 0;
    const size = () => { const r = sv.node().getBoundingClientRect(); W = r.width; H = r.height; };
    size();
    window.addEventListener("resize", size);
    const parts = d3.range(30).map((i) => ({
      x: Math.random() * W, y: Math.random() * H, r: 1.5 + Math.random() * 3,
      vy: 0.15 + Math.random() * 0.35, ph: Math.random() * 6.28, star: i % 5 === 0, ox: 0, oy: 0,
    }));
    const g = sv.selectAll("g").data(parts).join("g");
    g.filter((d) => d.star).append("path").attr("d", (d) => starPath(d.r * 2.4)).attr("fill", "#e48aae");
    g.filter((d) => !d.star).append("circle").attr("r", (d) => d.r).attr("fill", (d, i) => (i % 3 ? "#f6b8cf" : "#d9b8f0"));

    let mouse = null;
    hero.addEventListener("pointermove", (e) => {
      const r = sv.node().getBoundingClientRect();
      mouse = [e.clientX - r.left, e.clientY - r.top];
    });
    hero.addEventListener("pointerleave", () => { mouse = null; });

    if (reduce) {
      g.attr("transform", (d) => `translate(${d.x},${d.y})`).attr("opacity", 0.6);
    } else {
      let heroVisible = true;
      new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);
      d3.timer((ms) => {
        if (!heroVisible) return;
        const s = ms / 1000;
        drawBlob(s);
        parts.forEach((p) => {
          p.y -= p.vy;
          if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
          let tx = 0, ty = 0;
          if (mouse) {
            const dx = p.x - mouse[0], dy = p.y - mouse[1], dist = Math.hypot(dx, dy);
            if (dist < 120 && dist > 0) {
              const f = ((120 - dist) / 120) * 30;
              tx = (dx / dist) * f; ty = (dy / dist) * f;
            }
          }
          p.ox += (tx - p.ox) * 0.1;
          p.oy += (ty - p.oy) * 0.1;
        });
        g.attr("transform", (p) => `translate(${p.x + Math.sin(s * 0.6 + p.ph) * 8 + p.ox},${p.y + p.oy})`)
          .attr("opacity", (p) => 0.35 + 0.45 * Math.abs(Math.sin(s * 0.9 + p.ph)));
      });
    }
  }

  // Chips: click to jump to that chapter; drag them and they spring back
  $$(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const f = chip.dataset.filter;
      if (f) applyFilter(f);
      const target = document.getElementById(chip.dataset.go);
      if (target) target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
    if (!hasD3 || reduce) return;
    let dx = 0, dy = 0;
    d3.select(chip).call(
      d3.drag()
        .clickDistance(5)
        .on("start", () => {
          d3.select(chip).interrupt();
          chip.classList.add("dragging");
          dx = parseFloat(chip.style.getPropertyValue("--dx")) || 0;
          dy = parseFloat(chip.style.getPropertyValue("--dy")) || 0;
        })
        .on("drag", (e) => {
          dx += e.dx; dy += e.dy;
          chip.style.setProperty("--dx", `${dx}px`);
          chip.style.setProperty("--dy", `${dy}px`);
        })
        .on("end", () => {
          const sx = dx, sy = dy;
          d3.select(chip)
            .transition()
            .duration(1100)
            .ease(d3.easeElasticOut.amplitude(1).period(0.35))
            .styleTween("--dx", () => (t) => `${sx * (1 - t)}px`)
            .styleTween("--dy", () => (t) => `${sy * (1 - t)}px`)
            .on("end", () => chip.classList.remove("dragging"));
        })
    );
  });

  /* ---------- Skills: interactive force graph ---------- */
  function skillGraph() {
    const el = $("#skill-graph");
    if (!el || !hasD3) return;

    // HUBS: the three areas. SKILLS: each skill lists the area(s) it belongs to:
    // "cs" = Computer Science, "econ" = Economics, "design" = Design & Communications.
    // A skill in two areas floats between them.
    const HUBS = [
      { id: "cs", lines: ["Computer", "Science"] },
      { id: "econ", lines: ["Economics"] },
      { id: "design", lines: ["Design &", "Comms"] },
    ];
    const SKILLS = [
      ["Python", ["cs"]], ["JavaScript", ["cs"]], ["HTML / CSS", ["cs"]], ["SQL", ["cs"]], ["Git", ["cs"]],
      ["Economic Analysis", ["econ"]], ["Excel", ["econ"]],
      ["Graphic Design", ["design"]], ["Canva", ["design"]], ["Figma", ["design"]],
      ["Instagram Content", ["design"]], ["Copywriting", ["design"]], ["Event Promotion", ["design"]],
      ["Data Analysis", ["cs", "econ"]], ["Statistics", ["cs", "econ"]],
      ["Web Design", ["cs", "design"]],
      ["Market Research", ["econ", "design"]], ["Marketing", ["econ", "design"]],
    ];
    const nodes = [
      ...HUBS.map((h) => ({ ...h, hub: true, g: h.id })),
      ...SKILLS.map(([id, groups], i) => ({ id, groups, g: groups.length > 1 ? "multi" : groups[0], ph: i * 1.7 })),
    ];
    const links = [];
    SKILLS.forEach(([id, groups]) => groups.forEach((hub) => links.push({ source: hub, target: id })));
    const adj = new Map(nodes.map((n) => [n.id, new Set([n.id])]));
    links.forEach((l) => { adj.get(l.source).add(l.target); adj.get(l.target).add(l.source); });

    const svg = d3.select(el).append("svg");
    const grad = svg.append("defs").append("linearGradient").attr("id", "bridgeGrad").attr("x1", 0).attr("x2", 1);
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#c93f74");
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#8a4fb8");

    const link = svg.append("g").selectAll("line").data(links).join("line").attr("class", "link");
    const node = svg.append("g").selectAll("g").data(nodes).join("g")
      .attr("class", (d) => `node g-${d.g}${d.hub ? " hub" : ""}`);
    const inner = node.append("g").attr("class", "inner");
    inner.filter((d) => d.hub).append("circle").attr("r", 56);
    inner.filter((d) => !d.hub).append("rect");
    inner.append("text").attr("text-anchor", "middle").each(function (d) {
      const t = d3.select(this);
      const lines = d.lines || [d.id];
      lines.forEach((ln, i) =>
        t.append("tspan").attr("x", 0).attr("dy", i === 0 ? `${0.35 - (lines.length - 1) * 0.55}em` : "1.1em").text(ln)
      );
    });
    el.insertAdjacentHTML("beforeend", '<span class="graph-hint">drag the bubbles ✦</span>');

    const measure = () => {
      inner.filter((d) => !d.hub).each(function (d) {
        const w = d3.select(this).select("text").node().getComputedTextLength() + 30;
        d.w = w; d.h = 34;
        d3.select(this).select("rect").attr("x", -w / 2).attr("y", -17).attr("width", w).attr("height", 34).attr("rx", 17);
      });
      nodes.filter((d) => d.hub).forEach((d) => { d.w = d.h = 116; });
    };

    let W = el.clientWidth, H = el.clientHeight, narrow = W < 600;
    // Where each area's hub sits (a triangle on desktop, stacked on phones)
    const hubPos = () => (narrow
      ? { cs: [W * 0.5, H * 0.12], econ: [W * 0.27, H * 0.88], design: [W * 0.73, H * 0.88] }
      : { cs: [W * 0.17, H * 0.5], design: [W * 0.83, H * 0.23], econ: [W * 0.83, H * 0.78] });
    let HP = hubPos();
    const home = (d) => {
      if (d.hub) return HP[d.id];
      const pts = d.groups.map((g) => HP[g]);
      const x = d3.mean(pts, (p) => p[0]), y = d3.mean(pts, (p) => p[1]);
      if (pts.length > 1) return [x, y];
      // single-area skills orbit their hub, nudged a little toward the center
      return [x + (W / 2 - x) * 0.25, y + (H / 2 - y) * 0.25];
    };
    measure();
    nodes.forEach((d) => {
      const [hx, hy] = home(d);
      d.x = hx + (Math.random() - 0.5) * 100;
      d.y = hy + (Math.random() - 0.5) * 100;
    });

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance((l) => (l.target.g === "multi" ? 140 : 100)).strength(0.3))
      .force("charge", d3.forceManyBody().strength((d) => (d.hub ? -500 : -140)))
      .force("collide", d3.forceCollide().iterations(3))
      .alphaDecay(0.02)
      .stop();
    if (!reduce) {
      // A tiny drifting force so the bubbles "breathe"
      sim.force("breathe", () => {
        const s = performance.now() / 1000;
        nodes.forEach((n) => {
          if (n.hub || n.fx != null) return;
          n.vx += Math.sin(s * 0.8 + n.ph) * 0.03;
          n.vy += Math.cos(s * 0.7 + n.ph) * 0.03;
        });
      });
    }

    function layout() {
      W = el.clientWidth; H = el.clientHeight; narrow = W < 600; HP = hubPos();
      sim
        .force("x", d3.forceX((d) => home(d)[0]).strength((d) => (d.hub ? 0.6 : d.g === "multi" ? 0.25 : 0.08)))
        .force("y", d3.forceY((d) => home(d)[1]).strength((d) => (d.hub ? 0.6 : d.g === "multi" ? 0.25 : 0.08)));
      sim.force("collide").radius((d) => (d.hub ? 64 : (narrow ? d.w * 0.42 : d.w * 0.5) + 4));
    }
    layout();

    const render = () => {
      nodes.forEach((d) => {
        d.x = clamp(d.x, d.w / 2 + 6, W - d.w / 2 - 6);
        d.y = clamp(d.y, d.h / 2 + 6, H - d.h / 2 - 6);
      });
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
      link.attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
    };
    sim.on("tick", render);

    // Hover: light up a skill and everything it connects to
    node
      .on("pointerenter", (e, d) => {
        const near = adj.get(d.id);
        const touches = (l) => l.source.id === d.id || l.target.id === d.id;
        node.classed("dim", (n) => !near.has(n.id));
        link.classed("hot", touches).classed("dim", (l) => !touches(l));
      })
      .on("pointerleave", () => {
        node.classed("dim", false);
        link.classed("hot", false).classed("dim", false);
      });

    // Drag any bubble around
    node.call(
      d3.drag()
        .on("start", function (e, d) {
          if (!e.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
          d3.select(this).raise();
        })
        .on("drag", (e, d) => {
          d.fx = clamp(e.x, d.w / 2, W - d.w / 2);
          d.fy = clamp(e.y, d.h / 2, H - d.h / 2);
        })
        .on("end", (e, d) => {
          if (!e.active) sim.alphaTarget(reduce ? 0 : 0.015);
          d.fx = null; d.fy = null;
        })
    );

    if (reduce) {
      sim.tick(300);
      render();
      return;
    }

    // Bubbles pop in when the chapter scrolls into view, and pause when off screen
    inner.attr("transform", "scale(0)");
    link.attr("opacity", 0);
    let started = false;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!started) {
          started = true;
          sim.alpha(1).alphaTarget(0.015).restart();
          inner.transition()
            .delay((d, i) => (d.hub ? 0 : 250 + i * 45))
            .duration(700)
            .ease(d3.easeBackOut.overshoot(1.8))
            .attr("transform", "scale(1)");
          link.transition().delay(700).duration(900).attr("opacity", 1);
        } else sim.restart();
      } else if (started) sim.stop();
    }, { threshold: 0.2 }).observe(el);

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => { layout(); if (started) sim.alpha(0.5).restart(); else render(); }).observe(el);
    }
  }
  skillGraph();

  /* ---------- Projects: animated filter + 3D tilt on hover ---------- */
  const filterButtons = $$(".filter-btn");
  const projects = $$(".project");

  function applyFilter(f) {
    filterButtons.forEach((b) => b.classList.toggle("active", b.dataset.filter === f));
    let shown = 0;
    projects.forEach((p) => {
      const show = f === "all" || p.dataset.category === f;
      if (!hasD3 || reduce) { p.classList.toggle("hidden", !show); return; }
      const sel = d3.select(p).interrupt().style("transition", "transform .2s ease-out, box-shadow .3s");
      if (show) {
        const wasHidden = p.classList.contains("hidden");
        p.classList.remove("hidden");
        p.classList.add("in");
        if (wasHidden) {
          sel.style("opacity", 0).style("scale", "0.85")
            .transition().delay(shown * 80).duration(550).ease(d3.easeBackOut)
            .style("opacity", 1).style("scale", "1");
        }
        shown++;
      } else if (!p.classList.contains("hidden")) {
        sel.transition().duration(220).style("opacity", 0).style("scale", "0.85")
          .on("end", () => p.classList.add("hidden"));
      }
    });
  }
  filterButtons.forEach((btn) => btn.addEventListener("click", () => applyFilter(btn.dataset.filter)));

  if (!reduce && window.matchMedia("(hover: hover)").matches) {
    projects.forEach((p) => {
      p.addEventListener("pointermove", (e) => {
        const r = p.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        p.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 10}deg) translateY(-4px)`;
      });
      p.addEventListener("pointerleave", () => { p.style.transform = ""; });
    });
  }

  /* ---------- Contact: little hearts float up from "Email me" ---------- */
  const heartBtn = $(".heart-btn");
  if (heartBtn && hasD3 && !reduce) {
    let last = 0;
    const spawn = () => {
      const now = performance.now();
      if (now - last < 110) return;
      last = now;
      d3.select(heartBtn).append("span")
        .attr("class", "float-heart")
        .attr("aria-hidden", "true")
        .text(Math.random() < 0.5 ? "♡" : "♥")
        .style("left", `${15 + Math.random() * 70}%`)
        .style("top", "-4px")
        .style("opacity", 1)
        .transition()
        .duration(1200 + Math.random() * 500)
        .ease(d3.easeCubicOut)
        .style("top", `${-50 - Math.random() * 40}px`)
        .style("opacity", 0)
        .style("transform", `translateX(${(Math.random() - 0.5) * 40}px) rotate(${(Math.random() - 0.5) * 40}deg)`)
        .remove();
    };
    heartBtn.addEventListener("pointerenter", spawn);
    heartBtn.addEventListener("pointermove", spawn);
  }

  /* ---------- Instagram carousels: arrows scroll one "page" of posts ---------- */
  $$(".carousel").forEach((carousel) => {
    const track = $(".carousel-track", carousel);
    const prev = $(".prev", carousel);
    const next = $(".next", carousel);
    const update = () => {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    prev.addEventListener("click", () => track.scrollBy({ left: -track.clientWidth * 0.8 }));
    next.addEventListener("click", () => track.scrollBy({ left: track.clientWidth * 0.8 }));
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });
})();
