/* Eignasíða: motion + overlays + gallery + enquiry. Values from MOTION.md (ERA Residence: slater 3006-3022). */
(() => {
  'use strict';
  const d = document, html = d.documentElement;
  const G = window.gsap, ST = window.ScrollTrigger;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DESK = () => innerWidth >= 992;
  const FINE = matchMedia('(pointer: fine)').matches;
  const MOTION = !!(G && ST && !RM);
  const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const pad = n => String(n).padStart(2, '0');
  const DUR = { s: .4, m: .8, l: 1.2 }, STAG = .1, DELAY = .3;

  if (!MOTION) html.classList.remove('motion');
  // the listing's open house disappears by itself once it is over (Iceland is UTC all year)
  for (const el of document.querySelectorAll('[data-until]')) if (Date.now() > Date.parse(el.dataset.until + 'Z')) el.hidden = true;
  if (G) {
    G.registerPlugin(...[ST, window.SplitText, window.CustomEase].filter(Boolean));
    if (window.CustomEase) {
      CustomEase.create('Out', '0.25,1,0.5,1');
      CustomEase.create('In', '0.5,0,0.75,0');
      CustomEase.create('InOut', '0.75,0,0.25,1');
    }
  }
  const E = { out: window.CustomEase ? 'Out' : 'power3.out', in: window.CustomEase ? 'In' : 'power2.in', inout: window.CustomEase ? 'InOut' : 'power3.inOut' };

  /* ---------- smooth scroll (fine pointers, desktop only; phones keep native scroll) ---------- */
  let lenis = null;
  if (MOTION && FINE && DESK() && window.Lenis) {
    lenis = new Lenis({ duration: 1.2, smoothWheel: true, touchMultiplier: 2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', ST.update);
    G.ticker.add(t => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  window.__ep = { get lenis() { return lenis; } };
  let locks = 0, savedY = 0;
  const PIN = !FINE || !DESK();             // touch screens: pin the body (iOS pans the page under a focused field)
  const lock = () => {
    if (locks++) return;
    savedY = scrollY; lenis?.stop(); html.style.overflow = 'hidden';
    if (PIN) Object.assign(d.body.style, { position: 'fixed', top: `-${savedY}px`, left: '0', right: '0', width: '100%' });
  };
  const unlock = () => {
    if (--locks > 0) return; locks = 0;
    if (PIN) { Object.assign(d.body.style, { position: '', top: '', left: '', right: '', width: '' }); }
    html.style.overflow = '';
    if (lenis) { lenis.scrollTo(savedY, { immediate: true, force: true }); lenis.start(); } else window.scrollTo(0, savedY);
  };
  // D2: on phones the sheet lives inside the visual viewport, so with the keyboard up it shrinks and scrolls to Submit
  const vv = window.visualViewport;
  const fitSheet = () => {
    const enqEl = d.querySelector('[data-enquiry]');
    if (!vv || !enqEl || enqEl.hidden || DESK()) return;
    enqEl.style.setProperty('--vvh', vv.height + 'px'); enqEl.style.setProperty('--vvt', vv.offsetTop + 'px');
  };
  vv?.addEventListener('resize', fitSheet); vv?.addEventListener('scroll', fitSheet);
  $$('a[href="#top"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); lenis ? lenis.scrollTo(0) : scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); }));

  /* ---------- fit the hero title to the column ---------- */
  function fit() {
    $$('[data-fit]').forEach(el => {
      const span = el.firstElementChild; if (!span) return;
      el.style.fontSize = '';
      // data-fit="shrink": keep the CSS size unless the line is wider than the element itself (desktop only;
      // phones let long titles wrap); plain data-fit: grow or shrink to the parent's content width
      const shrink = el.dataset.fit === 'shrink';
      if (shrink && !DESK()) { span.style.whiteSpace = 'normal'; return; }
      span.style.whiteSpace = '';
      const pcs = getComputedStyle(el.parentElement);
      const max = shrink ? el.clientWidth : (el.parentElement.clientWidth - parseFloat(pcs.paddingLeft) - parseFloat(pcs.paddingRight)) * (DESK() ? .94 : .98);
      const cur = parseFloat(getComputedStyle(el).fontSize);
      const w = span.getBoundingClientRect().width;
      if (w > 0) el.style.fontSize = (shrink ? Math.min(cur, cur * max / w) : Math.min(cur * max / w, 250)) + 'px';
    });
  }

  /* ---------- split display words into chars (words kept whole so lines never break mid-word) ---------- */
  function split(el) {
    if (el._chars) return el._chars;
    if (window.SplitText) {
      const s = new SplitText(el.matches('[data-chars-hero]') ? el.firstElementChild : el, { type: 'words,chars', wordsClass: 'w', charsClass: 'c', tag: 'span' });
      el._chars = s.chars;
    } else el._chars = [];
    return el._chars;
  }

  /* ---------- ground under the header + rail ---------- */
  function grounds() {
    const label = $('[data-rail-label]');
    $$('[data-bg]').forEach(sec => {
      ST.create({
        trigger: sec, start: () => `top top+=${(parseFloat(getComputedStyle(html).getPropertyValue('--head')) || 72) / 2}`,
        end: () => `bottom top+=${(parseFloat(getComputedStyle(html).getPropertyValue('--head')) || 72) / 2}`,
        onToggle: self => { if (self.isActive) { html.dataset.ground = sec.dataset.bg; if (label && sec.dataset.label) label.textContent = sec.dataset.label; } }
      });
    });
    const fill = $('[data-rail-fill]');
    if (fill) G.to(fill, { scaleY: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
  }
  function groundsStatic() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) html.dataset.ground = e.target.dataset.bg; }), { rootMargin: '-36px 0px -99% 0px' });
    $$('[data-bg]').forEach(s => io.observe(s));
  }

  /* ---------- page motion ---------- */
  function heroIn() {
    const media = $('[data-hero-media]'), title = $('[data-chars-hero]');
    const chars = split(title);
    const tl = G.timeline({ defaults: { ease: E.out } });
    tl.fromTo(media, { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1, duration: 1.5, ease: E.inout }, 0)
      .fromTo(chars, { opacity: 0, rotateX: 90, x: DESK() ? '10rem' : '4rem' }, { opacity: 1, rotateX: 0, x: 0, duration: DUR.l, stagger: .04 }, DELAY)
      .fromTo([...$$('.ep-hero [data-ctn]'), $('.ep-head')], { opacity: 0, y: DESK() ? '3.333rem' : '2rem' }, { opacity: 1, y: 0, duration: DUR.l, stagger: STAG, clearProps: 'transform' }, DELAY + .3);
  }
  function scrollMotion() {
    const wrap = $('.ep-hero-wrap');
    G.timeline({ scrollTrigger: { trigger: wrap, start: 'top top', end: 'bottom bottom', scrub: true } })
      .fromTo('[data-hero-media]', { scale: 1 }, { scale: 1.35, ease: 'none' }, 0)
      .fromTo('[data-hero-text]', { y: 0, opacity: 1 }, { y: DESK() ? '-30vh' : '-12vh', opacity: .15, ease: 'none' }, 0);
    // gable rises and flattens as the section reaches the top
    const intro = $('[data-gable]');
    if (intro) G.fromTo(intro, { '--gable': DESK() ? '9vw' : '14vw' }, { '--gable': '0vw', ease: 'none', scrollTrigger: { trigger: intro, start: 'top bottom', end: 'top 12%', scrub: true } });

    // display titles: chars turn into place (ERA animateTextA)
    $$('[data-chars]').forEach(el => {
      const chars = split(el);
      G.set(chars, { opacity: 0, rotateX: 90, x: DESK() ? '10rem' : '4rem' });
      ST.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => G.to(chars, { opacity: 1, rotateX: 0, x: 0, duration: DUR.l, ease: E.out, stagger: { each: .035 }, overwrite: true }) });
    });
    // blocks (ERA animateCtn)
    const ctn = $$('[data-ctn]').filter(el => !el.closest('.ep-hero'));
    G.set(ctn, { opacity: 0, y: DESK() ? '3.333rem' : '2rem' });
    ST.batch(ctn, { start: 'top 88%', once: true, onEnter: els => G.to(els, { opacity: 1, y: 0, duration: DUR.l, ease: E.out, stagger: STAG, delay: .05, overwrite: true }) });
    // rules (ERA animateLine)
    $$('[data-line]').forEach(el => ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => G.fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.l, ease: E.out }) }));
    // highlights lines
    const hl = $$('[data-hl]');
    G.set(hl, { opacity: 0, y: 16, clipPath: 'inset(0% 0% 100% 0%)' });
    ST.batch(hl, { start: 'top 88%', once: true, onEnter: els => G.to(els, { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.l, ease: E.out, stagger: STAG }) });
    // framed photos drift inside their clip (ERA yPercent ±15; ±11 keeps a 130% image covering the frame)
    $$('[data-parallax]').forEach(fr => {
      const im = $('img', fr), k = (DESK() ? 11 : 6) * (Number(fr.dataset.drift) || 1);
      G.fromTo(im, { yPercent: -k }, { yPercent: k, ease: 'none', scrollTrigger: { trigger: fr, start: 'top bottom', end: 'bottom top', scrub: .5 } });
    });
    // details photo opens out under its word
    $$('[data-clip]').forEach(fr => ST.create({ trigger: fr, start: 'top 85%', once: true, onEnter: () => G.fromTo(fr, { clipPath: 'inset(22% 8% 0% 8%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: E.out }) }));
    // the day line: the gold dot walks morning → evening with the scroll; every stop stays readable
    const day = $('[data-day]');
    if (day) {
      const stops = $$('[data-stop]', day);
      ST.create({ trigger: day, start: 'top 72%', end: 'bottom 38%', scrub: .5, onUpdate: self => {
        day.style.setProperty('--p', self.progress.toFixed(4));
        const on = Math.min(stops.length - 1, Math.floor(self.progress * stops.length));
        stops.forEach((s, i) => s.classList.toggle('is-on', i === on));
      } });
    }
    // map draws in
    const map = $('[data-map]');
    if (map) {
      const lines = $$('.m-major path, .m-road path, .m-path path', map), blds = $$('.m-bld path', map);
      G.set(lines, { strokeDashoffset: 1 }); G.set(blds, { opacity: 0 }); G.set(['.m-pin', '.m-pin-label', '.m-home', '.m-labels'], { opacity: 0 });
      ST.create({ trigger: map, start: 'top 75%', once: true, onEnter: () => {
        G.timeline({ defaults: { ease: E.out } })
          .to(lines, { strokeDashoffset: 0, duration: 1.6, stagger: { amount: .6 } }, 0)
          .to(blds, { opacity: 1, duration: DUR.m, stagger: { amount: .8, from: 'center' } }, .2)
          .to('.m-labels', { opacity: 1, duration: DUR.m }, .9)
          .fromTo('.m-home', { opacity: 0 }, { opacity: 1, duration: DUR.m }, 1)
          .fromTo('.m-pin', { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: DUR.l, ease: 'back.out(1.6)' }, 1.1)
          .fromTo('.m-pin__ring', { scale: .3, opacity: 1, transformOrigin: '50% 50%' }, { scale: 1.6, opacity: 0, duration: 1.6, ease: 'power2.out', repeat: 1 }, 1.2)
          .set('.m-pin__ring', { scale: 1, opacity: .8 })
          .fromTo('.m-pin-label', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: DUR.l }, 1.3);
      } });
    }
    // closing band settles
    const band = $('[data-band-media]');
    if (band) G.fromTo(band, { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: band.parentElement, start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  async function start() {
    fit();
    if (!MOTION) { groundsStatic(); return; }
    try { await Promise.race([d.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
    fit();
    const hero = $('.ep-hero__img');
    try { await Promise.race([hero.decode(), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
    grounds();
    scrollMotion();
    html.classList.add('ready');
    heroIn();
    ST.refresh();
  }
  // map scale bar: metres to pixels for the crop actually shown (viewBox units are metres, slice scaling)
  const scale = () => $$('[data-scale]').forEach(el => { const fr = el.parentElement, k = Math.max(fr.clientWidth / el.dataset.w, fr.clientHeight / el.dataset.h); el.style.setProperty('--bar', (el.dataset.scale * k).toFixed(1) + 'px'); });
  scale();
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { fit(); scale(); ST?.refresh(); }, 120); });
  start();

  /* ---------- focus helpers (focus-guard: pointer opens onto the container, keyboard onto the first control) ---------- */
  const others = () => [$('main'), $('.ep-head'), $('.ep-foot'), $('.ep-rail'), $('.ep-skip')].filter(Boolean);
  const setInert = on => others().forEach(el => { el.inert = on; });
  function trap(container, e) {
    if (e.key !== 'Tab') return;
    const f = $$('a[href],button:not([disabled]),input:not([type=hidden]):not([tabindex="-1"]),textarea', container).filter(x => x.offsetParent !== null && !x.closest('[hidden]'));
    if (!f.length) return;
    const first = f[0], last = f.at(-1);
    if (e.shiftKey && (d.activeElement === first || d.activeElement === container)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- enquiry card (ERA "Book a call": flips in, flips away) ---------- */
  const enq = $('[data-enquiry]'), card = $('[data-enquiry-card]'), scrim = $('.ep-enq__scrim'), form = $('[data-enquiry-form]'), done = $('[data-enquiry-done]'), err = $('[data-enquiry-err]');
  let enqOpen = false, enqTrigger = null;
  function openEnquiry(e) {
    if (enqOpen) return;
    enqOpen = true; enqTrigger = e?.currentTarget || null;
    if (!done.hidden) { done.hidden = true; form.hidden = false; form.reset(); G?.set([form], { clearProps: 'all' }); }
    err.textContent = ''; $$('[aria-invalid]', form).forEach(x => x.removeAttribute('aria-invalid'));
    enq.hidden = false; lock(); setInert(true); fitSheet();
    const viaKey = e && e.detail === 0;
    if (G && !RM) {
      if (DESK()) G.fromTo(card, { scale: 0, rotateX: -90, yPercent: -100, rotate: -25, transformPerspective: 1000 }, { scale: 1, rotateX: 0, yPercent: 0, rotate: 0, duration: DUR.l, ease: E.out, overwrite: true });
      else G.fromTo(card, { yPercent: 100 }, { yPercent: 0, duration: DUR.m, ease: E.out, overwrite: true });
      G.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: DUR.l, ease: E.out, overwrite: true });
    } else if (G) { G.fromTo([card, scrim], { opacity: 0 }, { opacity: 1, duration: .2, overwrite: true }); }
    (viaKey ? $('input[name=nafn]', form) : card).focus({ preventScroll: true });
  }
  function closeEnquiry() {
    if (!enqOpen) return;
    enqOpen = false;
    const fin = () => { if (enqOpen) return; enq.hidden = true; G?.set(card, { clearProps: 'transform,opacity' }); };
    if (G && !RM) {
      if (DESK()) G.to(card, { rotateX: 90, yPercent: 200, rotate: 25, duration: DUR.m, ease: E.in, overwrite: true, onComplete: fin });
      else G.to(card, { yPercent: 100, duration: DUR.s, ease: E.in, overwrite: true, onComplete: fin });
      G.to(scrim, { opacity: 0, duration: DUR.m, ease: E.in, overwrite: true });
    } else if (G) G.to([card, scrim], { opacity: 0, duration: .2, overwrite: true, onComplete: fin });
    else fin();
    setInert(false); unlock();
    enqTrigger?.focus({ preventScroll: true });
  }
  $$('[data-enquiry-open]').forEach(b => b.addEventListener('click', openEnquiry));
  $$('[data-enquiry-close]').forEach(b => b.addEventListener('click', closeEnquiry));
  enq.addEventListener('keydown', e => { if (e.key === 'Escape') closeEnquiry(); else trap(card, e); });

  const MSG = { nafn: 'Vantar nafn.', netfang: 'Vantar gilt netfang.', simi: 'Vantar símanúmer.' };
  // a field the person has started fixing loses its error at once; the message lists only what is still missing
  form.addEventListener('input', e => {
    if (!e.target.hasAttribute('aria-invalid')) return;
    e.target.removeAttribute('aria-invalid');
    err.textContent = $$('[aria-invalid]', form).map(i => MSG[i.name]).join(' ');
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const bad = [];
    if (!data.nafn.trim()) bad.push('nafn');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.netfang.trim())) bad.push('netfang');
    if ((data.simi.match(/\d/g) || []).length < 7) bad.push('simi');
    $$('input', form).forEach(i => bad.includes(i.name) ? i.setAttribute('aria-invalid', 'true') : i.removeAttribute('aria-invalid'));
    if (bad.length) { err.textContent = bad.map(k => MSG[k]).join(' '); $(`[name=${bad[0]}]`, form).focus(); return; }
    err.textContent = '';
    const btn = $('button[type=submit]', form), lbl = $('.ep-btn__label', btn), was = lbl.textContent; btn.disabled = true; lbl.textContent = 'Sendi…';
    let ok = true;
    if (form.dataset.mode === 'live' && !data.vefsida) {
      try {
        const r = await fetch(form.dataset.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
        ok = r.ok;
      } catch (x) { ok = false; }
    } else await new Promise(r => setTimeout(r, 500));
    btn.disabled = false; lbl.textContent = was;
    if (!ok) { err.textContent = 'Ekki tókst að senda fyrirspurnina. Reyndu aftur eftir smá stund.'; return; }
    const show = () => { form.hidden = true; done.hidden = false; done.focus({ preventScroll: true }); if (G && !RM) G.fromTo(done, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: DUR.m, ease: E.out }); };
    if (G && !RM) G.to(form, { opacity: 0, y: -12, duration: DUR.s, ease: E.in, onComplete: show }); else show();
  });

  /* ---------- gallery stage + rail ---------- */
  const GAL = window.EP_GALLERY || [], ALT = window.EP_ALT || [];
  const stage = $('[data-gal-stage]'), stageImg = $('[data-gal-img]'), cur = $('[data-gal-cur]'), rail = $('[data-rail]');
  const thumbs = $$('[data-thumb]');
  let gi = 0, busy = false;
  const isPlan = g => g.h / g.w > .8;
  const preload = i => { const g = GAL[(i + GAL.length) % GAL.length]; if (g) { const im = new Image(); im.src = g.mid; } };
  function paintStage(i) {
    const g = GAL[i];
    stageImg.srcset = `${g.mid} 1280w, ${g.src} 2000w`; stageImg.src = g.mid; stageImg.alt = ALT[i] || '';
    stageImg.width = g.w; stageImg.height = g.h;
    stage.classList.toggle('is-plan', isPlan(g));
    cur.textContent = pad(i + 1);
    thumbs.forEach((t, k) => t.setAttribute('aria-current', k === i ? 'true' : 'false'));
    const th = thumbs[i]?.parentElement;
    if (th && rail) { const left = th.offsetLeft - (rail.clientWidth - th.clientWidth) / 2; rail.scrollTo({ left, behavior: RM ? 'auto' : 'smooth' }); }
    preload(i + 1); preload(i - 1);
  }
  // gt = target index, updated on every input; a new input mid-swap retargets from where the image is (no dropped clicks)
  let gt = 0;
  function go(i, dir) {
    i = (i + GAL.length) % GAL.length;
    if (i === gt) return;
    dir = dir || (i > gt ? 1 : -1);
    gt = i;
    cur.textContent = pad(i + 1);
    if (!G || RM) { gi = i; paintStage(i); return; }
    G.killTweensOf(stageImg);
    G.to(stageImg, { xPercent: dir > 0 ? -125 : 125, duration: DUR.s, ease: E.in, onComplete: () => {
      gi = gt; paintStage(gt);
      G.fromTo(stageImg, { xPercent: dir > 0 ? 125 : -125 }, { xPercent: 0, duration: DUR.m, ease: E.out });
    } });
  }
  if (GAL.length) {
    thumbs.forEach((t, k) => { t.setAttribute('aria-current', k === 0 ? 'true' : 'false'); t.addEventListener('click', () => { if (!railMoved) go(k); }); });
    $$('[data-gal-step]').forEach(b => b.addEventListener('click', () => go(gt + Number(b.dataset.galStep), Number(b.dataset.galStep))));
    // swipe on the stage; a real tap still opens the lightbox
    let sx = null, moved = false;
    const openBtn = $('[data-gal-open]');
    openBtn.addEventListener('pointerdown', e => { sx = e.clientX; moved = false; });
    openBtn.addEventListener('pointermove', e => { if (sx !== null && Math.abs(e.clientX - sx) > 10) moved = true; });
    openBtn.addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 40) go(gt + (e.clientX < sx ? 1 : -1), e.clientX < sx ? 1 : -1); sx = null; });
    openBtn.addEventListener('click', e => { if (moved) { moved = false; e.preventDefault(); return; } openLb(gt, e); });
  }
  // mouse drag on the rail (touch and trackpads scroll it natively)
  let railMoved = false;
  if (rail) {
    let down = null;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = { x: e.clientX, l: rail.scrollLeft }; railMoved = false; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 5) { railMoved = true; rail.classList.add('is-drag'); } rail.scrollLeft = down.l - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = null; rail.classList.remove('is-drag'); setTimeout(() => { railMoved = false; }, 0); });
    rail.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return; e.stopPropagation(); }, { passive: true });
    rail.setAttribute('data-lenis-prevent-wheel', '');
  }

  /* ---------- lightbox (ERA: fade + scale in, slide out/in on step, progress bar) ---------- */
  const lb = $('[data-lightbox]'), lbImg = $('[data-lb-img]'), lbCur = $('[data-lb-cur]'), lbBar = $('[data-lb-bar]'), lbStage = $('[data-lb-stage]');
  let li = 0, lbOpen = false, lbTrigger = null, lbBusy = false;
  function paintLb(i) {
    const g = GAL[i]; lbImg.src = g.src; lbImg.alt = ALT[i] || ''; lbCur.textContent = pad(i + 1);
    lbStage.classList.toggle('is-plan', isPlan(g));
    if (G && !RM) G.to(lbBar, { width: ((i + 1) / GAL.length * 100) + '%', duration: DUR.s, ease: E.out }); else lbBar.style.width = ((i + 1) / GAL.length * 100) + '%';
    const n = new Image(); n.src = GAL[(i + 1) % GAL.length].src;
  }
  function openLb(i, e) {
    if (lbOpen) return; lbOpen = true; lbTrigger = e?.currentTarget || null; li = lt = i;
    paintLb(i); lb.hidden = false; lock(); setInert(true);
    if (G && !RM) { G.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: DUR.m, ease: E.out, overwrite: true }); G.fromTo(lbImg, { opacity: 0, scale: .5, xPercent: 0 }, { opacity: 1, scale: 1, duration: DUR.m, ease: E.out, overwrite: true }); }
    (e && e.detail === 0 ? $('[data-lb-close]') : lb).focus({ preventScroll: true });
  }
  function closeLb() {
    if (!lbOpen) return; lbOpen = false;
    const fin = () => { if (!lbOpen) lb.hidden = true; };
    if (G && !RM) G.to(lb, { opacity: 0, duration: DUR.s, ease: E.in, overwrite: true, onComplete: fin }); else fin();
    setInert(false); unlock();
    if (GAL.length && lt !== gt) { gt = gi = lt; paintStage(lt); }
    lbTrigger?.focus({ preventScroll: true });
  }
  // lt = target index; like the stage, each input retargets (ERA timings: out .4 In, in .8 Out)
  let lt = 0;
  function stepLb(dir) {
    lt = (lt + dir + GAL.length) % GAL.length;
    lbCur.textContent = pad(lt + 1);
    if (!G || RM) { li = lt; paintLb(li); return; }
    G.killTweensOf(lbImg, 'xPercent');
    G.to(lbImg, { xPercent: dir > 0 ? -125 : 125, duration: DUR.s, ease: E.in, onComplete: () => {
      li = lt; paintLb(li);
      G.fromTo(lbImg, { xPercent: dir > 0 ? 125 : -125 }, { xPercent: 0, duration: DUR.m, ease: E.out });
    } });
  }
  $('[data-lb-close]').addEventListener('click', closeLb);
  $$('[data-lb-step]').forEach(b => b.addEventListener('click', () => stepLb(Number(b.dataset.lbStep))));
  $$('[data-open-index]').forEach(b => b.addEventListener('click', e => openLb(Number(b.dataset.openIndex), e)));
  lb.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowRight') stepLb(1);
    else if (e.key === 'ArrowLeft') stepLb(-1);
    else trap(lb, e);
  });
  let lx = null;
  lbStage.addEventListener('pointerdown', e => { lx = e.clientX; });
  lbStage.addEventListener('pointerup', e => { if (lx !== null && Math.abs(e.clientX - lx) > 40) stepLb(e.clientX < lx ? 1 : -1); lx = null; });
  lbStage.addEventListener('click', e => { if (e.target === lbStage) closeLb(); });
})();
