/* =====================================================================
   Silvano: interacciones
   GSAP + ScrollTrigger + Flip + Lenis. Todo degrada bien si el CDN falla
   o si la persona prefiere movimiento reducido.
   ===================================================================== */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const WA_NUMBER = '5492324453130';
  const nf = new Intl.NumberFormat('es-AR');

  $$('[data-current-year]').forEach(el => (el.textContent = new Date().getFullYear()));

  /* -------------------------------------------------------------------
     Hora de Argentina: base para "abierto ahora" y para la reserva
     ------------------------------------------------------------------- */
  function nowInAR() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
    }).formatToParts(new Date()).reduce((o, p) => ((o[p.type] = p.value), o), {});
    // Fecha "local AR" guardada en UTC para operar sin corrimientos
    return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute));
  }
  // Minutos desde la medianoche. Domingo = 0.
  const SCHEDULE = {
    5: [[720, 960], [1230, 1380]],
    6: [[720, 960], [1230, 1380]],
    0: [[720, 1080]]
  };
  const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const fmtTime = m => (m % 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` : `${m / 60}`) + ' h';

  function openStatus() {
    const now = nowInAR();
    const dow = now.getUTCDay();
    const t = now.getUTCHours() * 60 + now.getUTCMinutes();
    for (const [a, b] of SCHEDULE[dow] || []) {
      if (t >= a && t < b) return { open: true, text: `Abierto hasta las ${fmtTime(b)}` };
    }
    for (let i = 0; i < 8; i++) {
      const d = (dow + i) % 7;
      const slot = (SCHEDULE[d] || []).find(([a]) => i > 0 || a > t);
      if (slot) {
        const when = i === 0 ? 'hoy' : i === 1 ? 'mañana' : `el ${DAY_NAMES[d]}`;
        return { open: false, text: `Cerrado. Abre ${when} a las ${fmtTime(slot[0])}` };
      }
    }
    return { open: false, text: 'Viernes a domingo' };
  }
  const statusEl = $('[data-status]');
  if (statusEl) {
    const paint = () => {
      const s = openStatus();
      statusEl.classList.toggle('is-open', s.open);
      $('[data-status-text]', statusEl).textContent = s.text;
    };
    paint();
    setInterval(paint, 60000);
  }

  /* -------------------------------------------------------------------
     Reserva: arma el mensaje de WhatsApp
     ------------------------------------------------------------------- */
  const form = $('[data-booking]');
  if (form) {
    const state = { people: 2, day: null, shift: 'al mediodía' };
    const peopleEl = $('[data-people]', form);
    const platesEl = $('[data-plates]', form);
    const daysEl = $('[data-days]', form);
    const shiftBtns = $$('[data-shift]', form);
    const shiftHelp = $('[data-shift-help]', form);
    const preview = $('[data-preview]', form);
    const link = $('[data-wa-link]', form);

    // Próximos días de apertura (incluye hoy si todavía queda algún turno)
    const now = nowInAR();
    const t = now.getUTCHours() * 60 + now.getUTCMinutes();
    const days = [];
    for (let i = 0; i < 9 && days.length < 3; i++) {
      const d = new Date(now.getTime() + i * 864e5);
      const dow = d.getUTCDay();
      const slots = SCHEDULE[dow];
      if (!slots) continue;
      if (i === 0 && !slots.some(([, b]) => t < b - 30)) continue;
      const short = `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
      days.push({
        dow, i,
        label: i === 0 ? 'Hoy' : `${DAY_NAMES[dow].slice(0, 3).replace(/^./, c => c.toUpperCase())} ${short}`,
        text: i === 0 ? 'hoy' : `el ${DAY_NAMES[dow]} ${short}`,
        slots
      });
    }
    days.forEach((d, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = d.label;
      b.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');
      b.addEventListener('click', () => { state.day = d; render(); });
      daysEl.appendChild(b);
    });
    state.day = days[0];

    form.addEventListener('click', e => {
      const step = e.target.closest('[data-step]');
      if (step) {
        state.people = Math.min(30, Math.max(1, state.people + Number(step.dataset.step)));
        render();
      }
      const sh = e.target.closest('[data-shift]');
      if (sh && !sh.disabled) { state.shift = sh.dataset.shift; render(); }
    });

    function render() {
      peopleEl.textContent = state.people;
      $$('[data-step="-1"]', form)[0].disabled = state.people <= 1;
      $$('[data-step="1"]', form)[0].disabled = state.people >= 30;

      // Un raviol por persona
      const want = Math.min(state.people, 30);
      while (platesEl.children.length < want) {
        platesEl.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 40 40"><use href="#i-ravioli"/></svg>');
      }
      while (platesEl.children.length > want) platesEl.lastElementChild.remove();

      $$('.chip', daysEl).forEach((b, i) => b.setAttribute('aria-pressed', String(days[i] === state.day)));

      // Turnos disponibles según el día
      const d = state.day;
      const hasNight = d && d.slots.length > 1;
      const noonGone = d && d.i === 0 && t >= d.slots[0][1] - 30;
      shiftBtns.forEach(b => {
        const isNight = b.dataset.shift === 'a la noche';
        b.disabled = isNight ? !hasNight : noonGone;
      });
      if (!hasNight) state.shift = 'al mediodía';
      if (noonGone) state.shift = 'a la noche';
      shiftBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.shift === state.shift)));
      shiftHelp.textContent = hasNight
        ? 'Ese día hay mediodía (12 a 16 h) y noche (20:30 a 23 h).'
        : 'Los domingos y feriados abrimos solo de 12 a 18 h.';

      const who = state.people === 1 ? '1 persona' : `${state.people} personas`;
      const msg = `¡Hola! Quiero reservar para ${who} ${d ? d.text : ''} ${state.shift}.`.replace(/\s+/g, ' ');
      preview.textContent = msg;
      link.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    }
    render();

    link.addEventListener('click', () => {
      const original = link.innerHTML;
      link.innerHTML = '<svg width="22" height="22" aria-hidden="true"><use href="#i-whatsapp"/></svg>Abrimos WhatsApp con tu mensaje';
      setTimeout(() => (link.innerHTML = original), 3500);
    });
  }

  /* -------------------------------------------------------------------
     Menú mobile
     ------------------------------------------------------------------- */
  const burger = $('[data-burger]');
  const nav = $('#nav');
  const setNav = open => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    nav.classList.toggle('is-open', open);
  };
  burger?.addEventListener('click', () => setNav(burger.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); burger.focus(); } });

  /* -------------------------------------------------------------------
     Opiniones: carrusel con botones, puntos y arrastre
     ------------------------------------------------------------------- */
  const notes = $('[data-notes]');
  if (notes) {
    const track = $('[data-notes-track]', notes);
    const items = $$('.note', track);
    const dots = $('[data-notes-dots]', notes);
    const prev = $('[data-notes-prev]', notes);
    const next = $('[data-notes-next]', notes);
    items.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Ver opinión ${i + 1} de ${items.length}`);
      b.addEventListener('click', () => go(i));
      dots.appendChild(b);
    });
    const step = () => items[1].offsetLeft - items[0].offsetLeft;
    const index = () => Math.round(track.scrollLeft / step());
    const go = i => track.scrollTo({ left: Math.max(0, Math.min(items.length - 1, i)) * step(), behavior: reduced ? 'auto' : 'smooth' });
    const sync = () => {
      const i = index();
      const max = track.scrollWidth - track.clientWidth - 4;
      $$('button', dots).forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max;
    };
    prev.addEventListener('click', () => go(index() - 1));
    next.addEventListener('click', () => go(index() + 1));
    track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    window.addEventListener('resize', sync);
    sync();

    // Arrastrar con el mouse
    let down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
      track.style.scrollSnapType = 'none'; track.style.cursor = 'grabbing';
    });
    window.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false; track.style.cursor = '';
      const i = index();
      track.style.scrollSnapType = '';
      go(i);
    });
    track.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    track.style.cursor = 'grab';
  }

  /* -------------------------------------------------------------------
     Galería: filtros (con Flip si está) + lightbox
     ------------------------------------------------------------------- */
  const gallery = $('[data-gallery]');
  if (gallery) {
    const tiles = $$('.tile', gallery);
    $$('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
      const cat = btn.dataset.filter;
      $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      const state = hasGSAP && window.Flip && !reduced ? Flip.getState(tiles) : null;
      tiles.forEach(t => t.classList.toggle('is-hidden', cat !== 'all' && t.dataset.cat !== cat));
      if (state) {
        Flip.from(state, {
          duration: .7, ease: 'power3.inOut', absolute: true, nested: true,
          onEnter: els => gsap.fromTo(els, { opacity: 0, scale: .85 }, { opacity: 1, scale: 1, duration: .5, delay: .2 }),
          onLeave: els => gsap.to(els, { opacity: 0, scale: .85, duration: .35 }),
          onComplete: () => { gsap.set(tiles, { clearProps: 'all' }); ScrollTrigger.refresh(); }
        });
      } else if (hasGSAP) {
        ScrollTrigger.refresh();
      }
    }));

    // Lightbox
    const lb = $('[data-lightbox]');
    const lbImg = $('[data-lightbox-img]', lb);
    const lbCap = $('[data-lightbox-caption]', lb);
    let current = 0, lastFocus = null;
    const visible = () => tiles.filter(t => !t.classList.contains('is-hidden'));
    const show = i => {
      const list = visible();
      current = (i + list.length) % list.length;
      const btn = $('button', list[current]);
      const img = $('img', btn);
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = btn.dataset.caption;
      if (hasGSAP && !reduced) gsap.fromTo(lbImg, { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .45, ease: 'power2.out' });
    };
    const open = tile => {
      lastFocus = document.activeElement;
      lb.hidden = false;
      document.documentElement.style.overflow = 'hidden';
      window.__lenis?.stop();
      show(visible().indexOf(tile));
      $('.lightbox__close', lb).focus();
    };
    const close = () => {
      lb.hidden = true;
      document.documentElement.style.overflow = '';
      window.__lenis?.start();
      lastFocus?.focus();
    };
    tiles.forEach(t => $('button', t).addEventListener('click', () => open(t)));
    $$('[data-lightbox-close]', lb).forEach(b => b.addEventListener('click', close));
    $('[data-lightbox-prev]', lb).addEventListener('click', () => show(current - 1));
    $('[data-lightbox-next]', lb).addEventListener('click', () => show(current + 1));
    document.addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
      if (e.key === 'Tab') { // foco atrapado dentro del diálogo
        const f = $$('button', lb).filter(b => b.offsetParent);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // Swipe en el lightbox
    let sx = null;
    lb.addEventListener('touchstart', e => (sx = e.touches[0].clientX), { passive: true });
    lb.addEventListener('touchend', e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }

  /* -------------------------------------------------------------------
     Mesada de ravioles: tablero + contador
     ------------------------------------------------------------------- */
  const board = $('[data-board]');
  const CELLS = 120; // cada raviol del tablero vale 15
  const cells = [];
  const manual = new Set();
  if (board) {
    for (let i = 0; i < CELLS; i++) {
      const c = document.createElement('span');
      c.className = 'cell';
      c.innerHTML = '<svg viewBox="0 0 40 40"><use href="#i-ravioli"/></svg>';
      board.appendChild(c);
      cells.push(c);
    }
    // Cerrar ravioles con el dedo o el mouse
    const pinch = e => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el && el.closest('.cell');
      if (!cell) return;
      const i = cells.indexOf(cell);
      if (i < 0 || manual.has(i)) return;
      manual.add(i);
      cell.classList.add('on');
    };
    board.addEventListener('pointermove', pinch);
    board.addEventListener('pointerdown', pinch);
  }
  const countEl = $('[data-ravioli-count]');
  const setRavioli = p => {
    const n = Math.round(p * CELLS);
    cells.forEach((c, i) => c.classList.toggle('on', i < n || manual.has(i)));
    if (countEl) countEl.textContent = nf.format(Math.round(p * 1800));
  };

  /* -------------------------------------------------------------------
     Surtidor: ruedas del año
     ------------------------------------------------------------------- */
  const odo = $('[data-odometer]');
  const odoLabel = $('[data-odometer-label]');
  const strips = odo ? $$('.wheel__strip', odo) : [];
  strips.forEach(s => (s.innerHTML = [...'0123456789'].map(d => `<span>${d}</span>`).join('')));
  const setYear = y => {
    const isToday = y === 'hoy';
    const digits = String(isToday ? new Date().getFullYear() : y).padStart(4, '0');
    strips.forEach((s, i) => (s.style.transform = `translateY(${-Number(digits[i]) * 1.3}em)`));
    if (odoLabel) odoLabel.textContent = isToday ? 'Hoy' : y === '0000' ? 'Año' : `Año ${y}`;
  };

  /* -------------------------------------------------------------------
     Sin GSAP o con movimiento reducido: estados finales y listo
     ------------------------------------------------------------------- */
  // Línea dentada como el borde de un raviol (progreso del menú)
  let zig = 'M0 6';
  for (let i = 1; i <= 100; i++) zig += ` L${i * 10 - 5} 1 L${i * 10} 6`;
  $('[data-cutter-path]')?.setAttribute('d', zig);

  const header = $('[data-header]');
  const waFloat = $('[data-wa-float]');

  if (!hasGSAP || reduced) {
    document.documentElement.classList.remove('js'); // secciones con su propio color
    setRavioli(1);
    setYear('hoy');
    $$('.event').forEach(e => e.classList.add('is-past'));
    if (reduced) $('[data-hero-video]')?.pause();
    const onScroll = () => {
      header.classList.toggle('is-solid', window.scrollY > 40);
      waFloat.classList.toggle('is-visible', window.scrollY > window.innerHeight * .8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    // Contador de ruta y textos rellenos, ya completos
    const rm = $('[data-route-min]'); if (rm) rm.textContent = '15';
    // El header toma el color de la sección que está debajo
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) document.body.dataset.theme = en.target.dataset.themeSection;
    }), { rootMargin: '-45% 0px -54% 0px' });
    $$('[data-theme-section]').forEach(s => io.observe(s));
    return;
  }

  /* ===================================================================
     A partir de acá: movimiento con GSAP
     =================================================================== */
  gsap.registerPlugin(ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(Flip);

  // Scroll suave con Lenis, sincronizado con ScrollTrigger
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Anclas internas
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    setNav(false);
    if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -8, duration: 1.4 });
    else target.scrollIntoView();
    history.replaceState(null, '', id);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }));

  /* ---------- Partir texto en palabras ---------- */
  function splitWords(el, cls = 'word') {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(w => `<span class="${cls}" aria-hidden="true"><span>${w}</span></span>`).join(' ');
    return $$(`.${cls} > span`, el);
  }

  /* ---------- Progreso, header y botón flotante ---------- */
  gsap.to('[data-progress]', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-solid', y > 40);
    if (Math.abs(y - lastY) > 4) {
      header.classList.toggle('is-hidden', y > lastY && y > window.innerHeight && !nav.classList.contains('is-open'));
      lastY = y;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  ScrollTrigger.create({
    trigger: '[data-hero]', start: 'bottom 40%', endTrigger: '#reservar', end: 'top 70%',
    onToggle: self => waFloat.classList.toggle('is-visible', self.isActive)
  });

  // Enlace activo en la navegación
  $$('.nav a').forEach(a => {
    const sec = $(a.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: self => a.setAttribute('aria-current', String(self.isActive))
    });
  });

  /* ---------- El fondo de la página cambia de color por sección ---------- */
  const setTheme = t => (document.body.dataset.theme = t);
  ScrollTrigger.create({ trigger: '[data-hero]', start: 'top top', end: 'bottom 50%', onEnterBack: () => setTheme('night') });
  $$('[data-theme-section]').forEach(sec => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onEnter: () => setTheme(sec.dataset.themeSection),
      onEnterBack: () => setTheme(sec.dataset.themeSection)
    });
  });

  /* ---------- Hero: entrada orquestada ---------- */
  const heroWords = splitWords($('.hero__title'));
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro
    .fromTo('[data-hero-video]', { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1.12, duration: 1.8, ease: 'expo.out' })
    .from('[data-sign]', { scale: 0, rotate: -160, duration: 1.4, ease: 'back.out(1.6)' }, '-=.9')
    .from(heroWords, { yPercent: 110, duration: 1.1, stagger: .06 }, '-=1')
    .from('[data-hero-fade]', { y: 16, opacity: 0, duration: .8, stagger: .12 }, '-=.7')
    .from(header, { yPercent: -100, duration: .8, clearProps: 'transform' }, '-=.9');

  // Hero: al bajar, el video se recorta como una foto y el texto se va
  const heroTl = gsap.timeline({
    scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true }
  });
  heroTl
    .fromTo('[data-hero-media]', { clipPath: 'inset(0% 0% 0% 0% round 0px)' }, { clipPath: 'inset(6% 5% 14% 5% round 28px)', ease: 'none' }, 0)
    .to('[data-hero-video]', { yPercent: 8, ease: 'none' }, 0)
    .to('.hero__inner', { yPercent: -18, opacity: 0, ease: 'power1.in' }, 0)
    .to('[data-sign]', { rotate: 120, scale: .6, ease: 'none' }, 0);

  /* ---------- Marquesina: velocidad y sentido según el scroll ---------- */
  const mTrack = $('[data-marquee-track]');
  if (mTrack) {
    mTrack.innerHTML += mTrack.innerHTML; // copia para el loop
    let x = 0, dir = 1, boost = 0;
    const half = () => mTrack.scrollWidth / 2;
    ScrollTrigger.create({
      trigger: '[data-marquee]', start: 'top bottom', end: 'bottom top',
      onUpdate: self => { dir = self.direction; boost = Math.min(Math.abs(self.getVelocity()) / 120, 18); }
    });
    gsap.ticker.add((t, dt) => {
      boost *= .92;
      x -= (0.6 + boost) * dir * (dt / 16.7);
      const w = half();
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      mTrack.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  /* ---------- Menú: scroll horizontal pinneado + ruedita de cortar ---------- */
  const menu = $('#menu');
  const menuTrack = $('[data-menu-track]');
  const menuView = $('[data-menu-viewport]');
  const cutterPathBase = $('[data-cutter-path]');
  const wheel = $('[data-cutter-wheel]');
  const cutPath = cutterPathBase.cloneNode();
  cutPath.classList.add('cut');
  cutterPathBase.after(cutPath);
  const setCutter = p => {
    const line = wheel.parentElement.clientWidth - 40;
    gsap.set(wheel, { x: p * line, rotate: p * 900 });
    cutPath.style.clipPath = `inset(0 ${100 - p * 100}% 0 0)`;
  };
  setCutter(0);

  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    menu.classList.add('is-pinned');
    const dist = () => menuTrack.scrollWidth - menuView.clientWidth + parseFloat(getComputedStyle(menuView).paddingLeft) * 2;
    const tween = gsap.to(menuTrack, {
      x: () => -Math.max(0, dist()),
      ease: 'none',
      scrollTrigger: {
        trigger: menu, pin: '[data-menu-pin]', start: 'top top',
        end: () => '+=' + Math.max(dist(), window.innerHeight * .6),
        scrub: .8, invalidateOnRefresh: true, refreshPriority: 1,
        onUpdate: self => setCutter(self.progress)
      }
    });
    // Parallax de cada foto dentro del recorrido horizontal
    $$('.dish', menuTrack).forEach(d => {
      gsap.fromTo($('img', d), { xPercent: -8 }, {
        xPercent: 8, ease: 'none',
        scrollTrigger: { trigger: d, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
      });
      gsap.from($('.dish__num', d), {
        yPercent: 60, opacity: 0, ease: 'back.out(2)', duration: .8,
        scrollTrigger: { trigger: d, containerAnimation: tween, start: 'left 85%', toggleActions: 'play none none reverse' }
      });
    });
    return () => menu.classList.remove('is-pinned');
  });
  mm.add('(max-width: 899px)', () => {
    const onS = () => {
      const max = menuView.scrollWidth - menuView.clientWidth;
      setCutter(max > 0 ? menuView.scrollLeft / max : 0);
    };
    menuView.addEventListener('scroll', onS, { passive: true });
    onS();
    gsap.from('.dish', { x: 80, opacity: 0, stagger: .1, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: menuView, start: 'top 80%' } });
    return () => menuView.removeEventListener('scroll', onS);
  });
  // Flechas del teclado en el carrusel del menú
  menuView.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const st = ScrollTrigger.getAll().find(s => s.pin && s.trigger === menu);
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    if (st && lenis) {
      const stepPx = (st.end - st.start) / 3;
      lenis.scrollTo(Math.min(st.end, Math.max(st.start, window.scrollY + delta * stepPx)), { duration: .9 });
    } else {
      menuView.scrollBy({ left: delta * 320, behavior: 'smooth' });
    }
  });

  // Etiqueta de precio que se "pega" al entrar
  gsap.from('.price', {
    scale: 1.6, rotate: 12, opacity: 0, duration: .9, ease: 'back.out(2.2)',
    scrollTrigger: { trigger: '.price', start: 'top 85%' }
  });

  /* ---------- Reseñas ---------- */
  const quote = $('[data-fill-text]');
  if (quote) {
    const fw = splitWords(quote, 'fw-wrap');
    fw.forEach(s => s.classList.add('fw'));
    ScrollTrigger.create({
      trigger: quote, start: 'top 85%', end: 'bottom 45%', scrub: true,
      onUpdate: self => {
        const n = Math.round(self.progress * fw.length);
        fw.forEach((w, i) => w.classList.toggle('on', i < n));
      }
    });
  }
  $$('[data-count]').forEach(el => {
    const to = parseFloat(el.dataset.count);
    const dec = Number(el.dataset.decimals || 0);
    const obj = { v: 0 };
    el.textContent = '0';
    gsap.to(obj, {
      v: to, duration: 2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: () => (el.textContent = obj.v.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec }))
    });
  });
  gsap.from('.stars path, .stars use', { scale: 0, transformOrigin: '50% 50%', stagger: .08, duration: .5, ease: 'back.out(3)', scrollTrigger: { trigger: '.stars', start: 'top 90%' } });
  // Las notas se reparten como cartas
  gsap.from('.note', {
    x: 160, y: 40, rotate: 10, opacity: 0, duration: 1, stagger: .12, ease: 'expo.out',
    scrollTrigger: { trigger: '[data-notes]', start: 'top 85%' }
  });

  /* ---------- 1.800 raviolones ---------- */
  setRavioli(0);
  ScrollTrigger.create({
    trigger: '[data-counter-section]', start: 'top 65%', end: 'bottom 75%', scrub: true,
    onUpdate: self => setRavioli(self.progress)
  });

  // Harina en el aire: se aparta del puntero
  const canvas = $('[data-flour]');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const sec = canvas.parentElement;
    let w = 0, h = 0, dpr = 1, running = false, mx = -999, my = -999;
    const motes = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + .4, s: Math.random() * .25 + .05, vx: 0, vy: 0, a: Math.random() * .5 + .15 }));
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = sec.clientWidth; h = sec.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const frame = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        let px = m.x * w, py = m.y * h;
        const dx = px - mx, dy = py - my, d2 = dx * dx + dy * dy;
        if (d2 < 14000) { const f = (14000 - d2) / 14000; m.vx += dx * f * .004; m.vy += dy * f * .004; }
        m.vx *= .94; m.vy *= .94;
        px += m.vx; py += m.vy - m.s;
        if (py < -5) py = h + 5;
        if (px < -5) px = w + 5; if (px > w + 5) px = -5;
        m.x = px / w; m.y = py / h;
        ctx.globalAlpha = m.a;
        ctx.fillStyle = '#F2ECE2';
        ctx.beginPath(); ctx.arc(px, py, m.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(frame);
    };
    sec.addEventListener('pointermove', e => { const r = sec.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    sec.addEventListener('pointerleave', () => { mx = my = -999; });
    window.addEventListener('resize', size);
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !running) { size(); running = true; frame(); }
      else if (!en.isIntersecting) running = false;
    }).observe(sec);
  }

  /* ---------- Historia ---------- */
  setYear('0000');
  gsap.to('[data-story-bg]', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '#historia', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('[data-rail-fill]', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '[data-timeline]', start: 'top 60%', end: 'bottom 60%', scrub: true } });
  const events = $$('.event');
  events.forEach((ev, i) => {
    ScrollTrigger.create({
      trigger: ev, start: 'top 60%', end: 'bottom 60%',
      onToggle: self => {
        if (!self.isActive) return;
        events.forEach((e, k) => { e.classList.toggle('is-active', k === i); e.classList.toggle('is-past', k < i); });
        setYear(ev.dataset.year);
      }
    });
  });
  ScrollTrigger.create({
    trigger: '[data-timeline]', start: 'top 60%',
    onLeaveBack: () => { events.forEach(e => e.classList.remove('is-active', 'is-past')); setYear('0000'); }
  });
  gsap.from('.pump', { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.pump', start: 'top 90%' } });
  const coda = $('.story__coda');
  if (coda) {
    const cw = splitWords(coda);
    gsap.from(cw, { yPercent: 110, stagger: .05, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: coda, start: 'top 80%' } });
  }

  /* ---------- Galería: las fotos se destapan ---------- */
  ScrollTrigger.batch('.tile', {
    start: 'top 92%', once: true,
    onEnter: batch => gsap.fromTo(batch,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, stagger: .1, ease: 'expo.inOut', clearProps: 'clipPath' })
  });

  /* ---------- Cómo llegar: la ruta se dibuja ---------- */
  const routePath = $('[data-route-path]');
  if (routePath) {
    const L = routePath.getTotalLength();
    const lane = routePath.cloneNode();
    lane.removeAttribute('data-route-path');
    lane.setAttribute('class', 'route__lane');
    $('.route__road').after(lane);
    routePath.style.strokeDasharray = `${L} ${L}`;
    const pin = $('[data-route-pin]');
    const minEl = $('[data-route-min]');
    const drawRoute = p => {
      routePath.style.strokeDashoffset = String(L * (1 - p));
      const pt = routePath.getPointAtLength(L * p);
      pin.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
      minEl.textContent = Math.round(p * 15);
    };
    drawRoute(0);
    ScrollTrigger.create({
      trigger: '.route', start: 'top 85%', end: 'bottom 35%', scrub: .6,
      onUpdate: self => drawRoute(self.progress)
    });
  }

  /* ---------- Reserva ---------- */
  gsap.fromTo('[data-book-bg]', { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '#reservar', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  const bookTitle = $('.book__title');
  if (bookTitle) {
    const bw = splitWords(bookTitle);
    gsap.from(bw, { yPercent: 110, rotate: 6, stagger: .07, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: bookTitle, start: 'top 80%' } });
  }
  gsap.from('.ticket', { y: 120, rotate: 4, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.ticket', start: 'top 90%' } });

  /* ---------- Footer: la frase se desliza ---------- */
  gsap.fromTo('[data-footer-big]', { xPercent: 15 }, { xPercent: -45, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* ---------- Títulos de sección: subida de palabras ---------- */
  $$('#menu-title, #historia-title, #galeria-title, #llegar-title').forEach(h => {
    const ws = splitWords(h);
    gsap.from(ws, { yPercent: 110, stagger: .05, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%' } });
  });

  /* ---------- Botones magnéticos ---------- */
  if (finePointer) {
    $$('[data-magnetic]').forEach(btn => {
      const xTo = gsap.quickTo(btn, 'x', { duration: .5, ease: 'power3.out' });
      const yTo = gsap.quickTo(btn, 'y', { duration: .5, ease: 'power3.out' });
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .25);
        yTo((e.clientY - r.top - r.height / 2) * .35);
      });
      btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  // Recalcular cuando cargan fuentes e imágenes
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
