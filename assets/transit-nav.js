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
  const R = 11, FLAT = 33, DIP = 11;   // star radius, height of the out-of-transit line, depth of the dip (px)

  // the transit shape: flat, a smooth ingress, a slightly limb-darkened bottom, a smooth egress
  function dip(u) {
    if (u <= INGRESS[0] || u >= EGRESS[1]) return 0;
    if (u >= INGRESS[1] && u <= EGRESS[0]) return 0.9 + 0.1 * Math.sin(Math.PI * (u - INGRESS[1]) / (EGRESS[0] - INGRESS[1]));
    const f = u < INGRESS[1] ? (u - INGRESS[0]) / (INGRESS[1] - INGRESS[0]) : (EGRESS[1] - u) / (EGRESS[1] - EGRESS[0]);
    return 0.9 * f * f * (3 - 2 * f);
  }
  let W = 0, x0 = 0, x1 = 0;
  const X = u => x0 + u * (x1 - x0), Y = u => FLAT + DIP * dip(u);
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  let dot, onStar;

  function draw() {
    W = curve.clientWidth;
    x0 = 2 * R; x1 = W - 6;   // the line begins exactly at the star's edge
    svg.setAttribute('viewBox', `0 0 ${W} 50`);
    svg.replaceChildren();
    const defs = el('defs', {});
    const grad = el('radialGradient', { id: 'tn-limb', cx: '0.5', cy: '0.5', r: '0.5' });
    [['0', '#fff1c2'], ['0.7', '#f0b43a'], ['1', '#d6761c']].forEach(([o, c]) => grad.appendChild(el('stop', { offset: o, 'stop-color': c })));
    const clip = el('clipPath', { id: 'tn-disc' }); clip.appendChild(el('circle', { cx: R, cy: FLAT, r: R }));
    defs.append(grad, clip);
    svg.appendChild(defs);
    // a few scattered measurements in the line's colour
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 38; i++) {
      const u = 0.02 + rnd() * 0.96;
      svg.appendChild(el('circle', { cx: X(u).toFixed(1), cy: (Y(u) + (rnd() - 0.5) * 9).toFixed(1), r: 1.3, class: 'tn-pt' }));
    }
    let d = '';
    for (let i = 0; i <= 240; i++) { const u = i / 240; d += (i ? ' L' : 'M') + X(u).toFixed(1) + ' ' + Y(u).toFixed(2); }
    svg.appendChild(el('path', { d, class: 'tn-line' }));
    svg.appendChild(el('circle', { cx: R, cy: FLAT, r: R, fill: 'url(#tn-limb)' }));
    // the planet crossing the star's face, in step with the dip
    const g = el('g', { 'clip-path': 'url(#tn-disc)' });
    onStar = el('circle', { cy: FLAT + 1, r: 3.6, class: 'tn-planet' });
    g.appendChild(onStar); svg.appendChild(g);
    dot = el('circle', { r: 4.6, class: 'tn-dot' });
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
    const across = (u - INGRESS[0]) / (EGRESS[1] - INGRESS[0]);
    onStar.setAttribute('cx', (-4 + across * (2 * R + 8)).toFixed(1));
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
