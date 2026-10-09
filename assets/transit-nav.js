// Transit menu: the top bar is a transit light curve that starts at the edge of a small star.
// Each section is a point on the curve; the planet marks where you are. On the home page it follows
// your scrolling; on project pages it sits on "Projects". It is not part of the letter animation.
(() => {
  const nav = document.querySelector('.topnav.transit');
  if (!nav) return;
  const curve = nav.querySelector('.tn-curve'), svg = nav.querySelector('.tn-lc');
  const links = [...curve.querySelectorAll('a[data-x]')].map(a => ({ a, x: +a.dataset.x, id: (a.getAttribute('href').split('#')[1] || '') }));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const INGRESS = [0.18, 0.28], EGRESS = [0.72, 0.82];
  const SMALL = () => curve.clientWidth < 560;
  let R = 45, FLAT = 64, DIP = 30;   // star radius, height of the out-of-transit line, depth of the dip (px)

  // the transit shape: flat, a smooth ingress, a slightly limb-darkened bottom, a smooth egress
  function dip(u) {
    if (u <= INGRESS[0] || u >= EGRESS[1]) return 0;
    if (u >= INGRESS[1] && u <= EGRESS[0]) return 0.9 + 0.1 * Math.sin(Math.PI * (u - INGRESS[1]) / (EGRESS[0] - INGRESS[1]));
    const f = u < INGRESS[1] ? (u - INGRESS[0]) / (INGRESS[1] - INGRESS[0]) : (EGRESS[1] - u) / (EGRESS[1] - EGRESS[0]);
    return 0.9 * f * f * (3 - 2 * f);
  }
  let W = 0, x0 = 0, x1 = 0;
  const planetR = () => Math.round(R * 0.2);
  const X = u => x0 + u * (x1 - x0), Y = u => FLAT + DIP * dip(u);
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  let dot, onStar;

  function draw() {
    W = curve.clientWidth;
    if (SMALL()) { R = 30; FLAT = 52; DIP = 22; } else { R = 45; FLAT = 64; DIP = 30; }
    x0 = 2 * R; x1 = W - 4;   // the line begins exactly at the star's edge
    svg.setAttribute('viewBox', `0 0 ${W} ${curve.clientHeight}`);
    svg.replaceChildren();
    const defs = el('defs', {});
    const grad = el('radialGradient', { id: 'tn-limb', cx: '0.5', cy: '0.5', r: '0.5' });
    [['0', '#fff1c2'], ['0.7', '#f0b43a'], ['1', '#d6761c']].forEach(([o, c]) => grad.appendChild(el('stop', { offset: o, 'stop-color': c })));
    const clip = el('clipPath', { id: 'tn-disc' }); clip.appendChild(el('circle', { cx: R, cy: FLAT, r: R }));
    defs.append(grad, clip);
    svg.appendChild(defs);
    // a faint guide from each label down to its point on the curve
    links.forEach(l => svg.appendChild(el('line', { x1: X(l.x), x2: X(l.x), y1: 28, y2: Y(l.x) - 8, class: 'tn-tick' })));
    let d = '';
    for (let i = 0; i <= 240; i++) { const u = i / 240; d += (i ? ' L' : 'M') + X(u).toFixed(1) + ' ' + Y(u).toFixed(2); }
    svg.appendChild(el('path', { d, class: 'tn-line' }));
    svg.appendChild(el('circle', { cx: R, cy: FLAT, r: R, fill: 'url(#tn-limb)' }));
    // the planet crossing the star's face, in step with the dip
    const g = el('g', { 'clip-path': 'url(#tn-disc)' });
    // the spot on the star is the same planet as the dot on the curve: same size, same colour
    const PR = planetR();
    onStar = el('circle', { cy: FLAT, r: PR, class: 'tn-planet' });
    g.appendChild(onStar); svg.appendChild(g);
    dot = el('circle', { r: PR, class: 'tn-dot' });
    svg.appendChild(dot);
    links.forEach(l => { l.a.style.left = X(l.x) + 'px'; });
    // use the short labels when the long ones would bump into each other
    nav.classList.remove('tn-short');
    const boxes = links.map(l => l.a.getBoundingClientRect());
    if (boxes.some((b, i) => i && b.left < boxes[i - 1].right + 6)) nav.classList.add('tn-short');
    place();
  }

  let u = links[0].x, target = u, raf = 0;
  function place() {
    if (!dot) return;
    dot.setAttribute('cx', X(u).toFixed(1)); dot.setAttribute('cy', Y(u).toFixed(2));
    // the planet crosses the star's face in step with the dip: over the limb during ingress and egress,
    // fully on the disc along the bottom
    const pr = planetR(), inner = 0.4 * R, outer = 1.6 * R;
    let px = null;
    if (u > INGRESS[0] && u < INGRESS[1]) px = -pr + (inner + pr) * (u - INGRESS[0]) / (INGRESS[1] - INGRESS[0]);
    else if (u >= INGRESS[1] && u <= EGRESS[0]) px = inner + (outer - inner) * (u - INGRESS[1]) / (EGRESS[0] - INGRESS[1]);
    else if (u > EGRESS[0] && u < EGRESS[1]) px = outer + (2 * R + pr - outer) * (u - EGRESS[0]) / (EGRESS[1] - EGRESS[0]);
    onStar.style.display = px === null ? 'none' : '';
    if (px !== null) onStar.setAttribute('cx', px.toFixed(1));
    // the label nearest the planet is the current one
    let best = links[0];
    for (const l of links) if (Math.abs(l.x - u) < Math.abs(best.x - u)) best = l;
    links.forEach(l => { if (l === best) l.a.setAttribute('aria-current', 'location'); else l.a.removeAttribute('aria-current'); });
  }
  function glide() {
    cancelAnimationFrame(raf);
    if (reduce) { u = target; place(); return; }
    const step = () => {
      u += (target - u) * 0.18;
      if (Math.abs(target - u) < 0.0008) u = target;
      place();
      if (u !== target) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  const fixed = nav.dataset.current;
  if (fixed) {
    // project pages: the planet rests on the section this page belongs to
    const l = links.find(l => l.id === fixed);
    if (l) u = target = l.x;
  } else {
    // home page: scrolling through the sections moves the planet along the transit
    const sections = links.map(l => ({ ...l, s: document.getElementById(l.id) })).filter(l => l.s);
    const spy = () => {
      const off = nav.getBoundingClientRect().bottom + 12;
      const tops = sections.map(l => l.s.getBoundingClientRect().top + scrollY - off);
      const y = scrollY, end = document.documentElement.scrollHeight - innerHeight - 2;
      let t = sections[0].x;
      if (y >= end) t = sections[sections.length - 1].x;
      else for (let i = 0; i < sections.length; i++) {
        const a = tops[i], b = i + 1 < sections.length ? Math.min(tops[i + 1], end) : end;
        if (y >= a - 1) t = i + 1 < sections.length && b > a ? sections[i].x + (sections[i + 1].x - sections[i].x) * Math.min(1, Math.max(0, (y - a) / (b - a))) : sections[i].x;
      }
      if (Math.abs(t - target) > 0.0005) { target = t; glide(); }
    };
    addEventListener('scroll', spy, { passive: true });
    addEventListener('load', spy);
    spy(); u = target;
    // clicking a label glides there instead of jumping
    sections.forEach(l => l.a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      l.s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', '#' + l.id);
    }));
  }
  addEventListener('resize', draw);
  draw();
})();
