/* ============================================================================
   SILVANO · Tomás Jofré — main.js
   Vanilla JS + GSAP/ScrollTrigger + Lenis.

   Orden:
    0  Helpers y estado
    1  Lenis (smooth scroll) + puente con ScrollTrigger
    2  Split text
    3  Header (hide/show + estado stuck) y nav mobile
    4  Cursor custom + hover magnético
    5  Hero (video, título, zoom-out con scrub)
    6  Historia (timeline pinneada)
    7  Contador animado
    8  Menú (scroll horizontal pinneado / carrusel mobile)
    9  Reveals genéricos (split, clip-path, parallax)
   10  Slider de reseñas
   11  Galería (filtros + lightbox)
   12  Varios (año del footer, refresh final)

   Regla general: todo lo animado usa transform/opacity.
   Si el usuario pidió menos movimiento, se cancelan pins, parallax y autoplays.
   ========================================================================== */

(function () {
  'use strict';

  /* ==========================================================================
     0. HELPERS Y ESTADO
     ====================================================================== */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motionQuery.matches;

  // Puntero fino = mouse/trackpad. Sirve para cursor custom y hover magnético.
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------------------------------------------------------------------
     Ajustes a mano
     --------------------------------------------------------------------- */

  // Cursor custom (el puntito con el aro). Apagado: molesta mas de lo que suma.
  // Poner en true para recuperarlo; el markup y el CSS siguen en su lugar.
  const CURSOR_CUSTOM = false;

  // Cuanto scroll dura cada hito de la timeline, en alturas de pantalla.
  // 1 = una pantalla entera por hito (se siente trabado). Subir o bajar a gusto.
  const HISTORIA_PASO = { desktop: 0.6, mobile: 0.45 };

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const nf = new Intl.NumberFormat('es-AR');

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    // Evita saltos raros al recalcular en mobile cuando aparece/desaparece la barra del browser
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ==========================================================================
     1. LENIS + PUENTE CON SCROLLTRIGGER
     Con reduced-motion no se instancia: queda el scroll nativo.
     ====================================================================== */
  let lenis = null;

  function initSmoothScroll() {
    if (reduced() || typeof window.Lenis === 'undefined') return;

    lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      gestureOrientation: 'vertical'
    });

    if (hasGSAP) {
      // Lenis manda: ScrollTrigger se actualiza en cada frame de scroll
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  // Anclas internas: las maneja Lenis para respetar el header fijo
  function initAnchors() {
    const headerOffset = () => {
      const h = $('[data-header]');
      return h ? -(h.offsetHeight + 8) : -72;
    };

    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;

        e.preventDefault();
        closeNav();

        if (lenis) {
          lenis.scrollTo(target, { offset: headerOffset(), duration: 1.15 });
        } else {
          const y = target.getBoundingClientRect().top + window.scrollY + headerOffset();
          window.scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' });
        }
        // Mantiene la accesibilidad del salto: el destino recibe foco
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  }

  /* ==========================================================================
     2. SPLIT TEXT
     Envuelve cada palabra en <span class="word"><span class="word__in">.
     La máscara vive en CSS; acá solo generamos el markup.
     ====================================================================== */
  function splitWords(el) {
    if (!el || el.dataset.split === 'done') return [];
    const text = el.textContent.trim();
    el.dataset.split = 'done';
    el.textContent = '';

    const parts = text.split(/\s+/);
    const inners = [];

    parts.forEach((word, i) => {
      const outer = document.createElement('span');
      outer.className = 'word';
      const inner = document.createElement('span');
      inner.className = 'word__in';
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < parts.length - 1) el.appendChild(document.createTextNode(' '));
      inners.push(inner);
    });

    return inners;
  }

  /* ==========================================================================
     3. HEADER + NAV MOBILE
     ====================================================================== */
  const header = $('[data-header]');
  const navEl = $('#nav');
  const navToggle = $('.nav-toggle');

  function closeNav() {
    if (!navEl || !navToggle) return;
    navEl.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menú de navegación');
    if (lenis) lenis.start();
  }

  function initHeader() {
    if (!header) return;

    let lastY = window.scrollY;

    const onScroll = (y) => {
      const scrollY = Math.max(0, y);

      // Fondo papel a partir de un poco de scroll
      header.classList.toggle('is-stuck', scrollY > 40);

      // Se esconde al bajar, aparece al subir. No se esconde con el nav abierto.
      const goingDown = scrollY > lastY;
      const pastHero = scrollY > window.innerHeight * 0.55;
      const navOpen = navEl && navEl.classList.contains('is-open');

      if (!navOpen && pastHero && goingDown && scrollY - lastY > 4) {
        header.classList.add('is-hidden');
      } else if (!goingDown || !pastHero) {
        header.classList.remove('is-hidden');
      }

      lastY = scrollY;
    };

    if (lenis) {
      lenis.on('scroll', ({ scroll }) => onScroll(scroll));
    } else {
      window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
    }
    onScroll(window.scrollY);

    // --- Nav mobile ---
    if (navToggle && navEl) {
      navToggle.addEventListener('click', () => {
        const open = navEl.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
        header.classList.remove('is-hidden');
        if (lenis) { open ? lenis.stop() : lenis.start(); }
      });

      // Escape cierra; click afuera cierra
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navEl.classList.contains('is-open')) {
          closeNav();
          navToggle.focus();
        }
      });
      document.addEventListener('click', (e) => {
        if (!navEl.classList.contains('is-open')) return;
        if (navEl.contains(e.target) || navToggle.contains(e.target)) return;
        closeNav();
      });
    }
  }

  /* ==========================================================================
     4. CURSOR CUSTOM + HOVER MAGNÉTICO
     Solo desktop con puntero fino y sin reduced-motion.
     ====================================================================== */
  function initCursor() {
    if (!CURSOR_CUSTOM) return;
    if (!hasGSAP || reduced() || !finePointer.matches) return;

    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    if (!cursor || !dot || !ring) return;

    document.body.classList.add('has-custom-cursor');

    const setDotX = gsap.quickSetter(dot, 'x', 'px');
    const setDotY = gsap.quickSetter(dot, 'y', 'px');
    // El aro sigue al puntero con retardo: da la sensación de inercia
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      setDotX(e.clientX);
      setDotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    }, { passive: true });

    // Crece sobre elementos interactivos
    const interactive = 'a, button, [role="button"], input, .galeria__btn';
    document.addEventListener('pointerover', (e) => {
      if (e.target.closest && e.target.closest(interactive)) document.body.classList.add('cursor-hover');
    });
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest && e.target.closest(interactive)) document.body.classList.remove('cursor-hover');
    });

    // Se aclara sobre las secciones oscuras
    $$('.hero, .historia, .cta, .footer').forEach((section) => {
      section.addEventListener('pointerenter', () => document.body.classList.add('cursor-dark'));
      section.addEventListener('pointerleave', () => document.body.classList.remove('cursor-dark'));
    });

    // El cursor se esconde si el mouse sale de la ventana
    document.addEventListener('mouseleave', () => gsap.to(cursor, { opacity: 0, duration: 0.2 }));
    document.addEventListener('mouseenter', () => gsap.to(cursor, { opacity: 1, duration: 0.2 }));
  }

  function initMagnetic() {
    if (!hasGSAP || reduced() || !finePointer.matches) return;

    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
      const strength = 0.28; // desplazamiento máximo relativo al tamaño del botón

      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
      el.addEventListener('blur', () => { xTo(0); yTo(0); });
    });
  }

  /* ==========================================================================
     5. HERO
     - El video arranca solo cuando el hero está visible (preload="none").
     - Título palabra por palabra al cargar.
     - Al scrollear: zoom-out del video (scale 1.14 -> 1) y texto que sube y se va.
     ====================================================================== */
  function initHeroVideo() {
    const video = $('[data-hero-video]');
    if (!video) return;

    // El brief pide desactivar el video con prefers-reduced-motion, y el CSS
    // ademas lo oculta. Se avisa por consola porque, si el sistema tiene esa
    // preferencia activada, el hero se ve estatico y no es obvio por que.
    if (reduced()) {
      video.removeAttribute('autoplay');
      video.pause();
      console.info('[Silvano] prefers-reduced-motion está activado en este sistema: ' +
                   'el video del hero queda desactivado a propósito y se muestra el poster.');
      return;
    }

    // Los errores no se silencian: si el video no arranca, hay que poder verlo.
    video.addEventListener('error', () => {
      const codes = { 1: 'ABORTED', 2: 'NETWORK', 3: 'DECODE', 4: 'SRC_NOT_SUPPORTED' };
      const err = video.error;
      console.warn('[Silvano] el video del hero falló:',
                   err ? (codes[err.code] || err.code) : 'motivo desconocido',
                   err && err.message ? err.message : '');
    });

    let desbloqueoPendiente = false;

    const intentarPlay = () => {
      const p = video.play();
      if (!p || typeof p.catch !== 'function') return;
      p.catch((err) => {
        // NotAllowedError = política de autoplay. Se reintenta en el primer
        // gesto del usuario, que es lo único que el navegador acepta.
        console.warn('[Silvano] no se pudo reproducir el video del hero:', err.name, err.message);
        if (desbloqueoPendiente) return;
        desbloqueoPendiente = true;
        const desbloquear = () => {
          video.play().catch(() => {});
          window.removeEventListener('pointerdown', desbloquear);
          window.removeEventListener('keydown', desbloquear);
          window.removeEventListener('touchstart', desbloquear);
        };
        window.addEventListener('pointerdown', desbloquear, { once: true });
        window.addEventListener('keydown', desbloquear, { once: true });
        window.addEventListener('touchstart', desbloquear, { once: true });
      });
    };

    const arrancar = () => {
      if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) video.load();
      intentarPlay();
    };

    // Solo reproduce mientras el hero está en pantalla: ahorra batería y CPU
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) arrancar();
          else if (!video.paused) video.pause();
        });
      }, { threshold: 0.01 });
      io.observe(video);
    } else {
      arrancar();
    }
  }

  function initHeroAnimation() {
    const hero = $('.hero');
    if (!hero || !hasGSAP) return;

    const title = $('.hero__title');
    const fades = $$('[data-hero-fade]', hero);

    if (reduced()) return;

    // --- Entrada ---
    const words = splitWords(title);
    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (words.length) {
      gsap.set(words, { yPercent: 115 });
      intro.to(words, { yPercent: 0, duration: 1.05, stagger: 0.055 }, 0.15);
    }
    gsap.set(fades, { opacity: 0, y: 24 });
    intro.to(fades, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, 0.5);

    // --- Scroll: zoom-out del media + salida del contenido ---
    const media = $('[data-hero-media]');
    if (media) {
      gsap.to(media, {
        scale: 1,
        yPercent: 6,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      });
    }

    gsap.to('.hero__content', {
      yPercent: -28,
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: '25% top',
        end: 'bottom top',
        scrub: true
      }
    });
  }

  /* ==========================================================================
     6. HISTORIA — timeline pinneada
     Un solo ScrollTrigger: pin + progreso. El onUpdate mapea el progreso
     a un índice de hito y cambia clases (el crossfade lo hace el CSS).
     ====================================================================== */
  function initHistoria() {
    const section = $('[data-historia]');
    const stage = $('[data-historia-stage]');
    if (!section || !stage) return;

    const slides = $$('.historia__slide', section);
    const bgs = $$('.historia__bg-item', section);
    const markers = $$('.historia__marker', section);
    const bar = $('[data-historia-progress]');
    const total = slides.length;
    if (!total) return;

    if (!hasGSAP || reduced()) {
      // Estático: todos los hitos visibles, sin pin ni crossfade
      slides.forEach((s) => s.classList.add('is-active'));
      if (bar) bar.style.transform = 'scaleX(1)';
      return;
    }

    let current = -1;
    const setStep = (i) => {
      if (i === current) return;
      current = i;
      slides.forEach((el, idx) => el.classList.toggle('is-active', idx === i));
      bgs.forEach((el, idx) => el.classList.toggle('is-active', idx === i));
      markers.forEach((el, idx) => el.classList.toggle('is-active', idx === i));
    };
    setStep(0);

    const setBar = bar ? gsap.quickSetter(bar, 'scaleX') : null;

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      // El pin dura lo que dura leer los hitos, no una pantalla entera por hito:
      // con una pantalla cada uno la seccion se siente trabada.
      end: () => {
        const paso = window.innerWidth >= 900 ? HISTORIA_PASO.desktop : HISTORIA_PASO.mobile;
        return '+=' + window.innerHeight * total * paso;
      },
      pin: stage,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        if (setBar) setBar(p);
        setStep(clamp(Math.floor(p * total), 0, total - 1));
      }
    });

    // Cierre: la frase entra palabra por palabra
    const closing = $('.historia__closing-text');
    if (closing) {
      const words = splitWords(closing);
      gsap.set(words, { yPercent: 115 });
      gsap.to(words, {
        yPercent: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.05,
        scrollTrigger: { trigger: closing, start: 'top 82%', once: true }
      });
    }
  }

  /* ==========================================================================
     7. CONTADOR
     ====================================================================== */
  function initCounter() {
    const el = $('[data-counter]');
    if (!el) return;

    const to = Number(el.dataset.counterTo || 0);

    if (!hasGSAP || reduced()) {
      el.textContent = nf.format(to);
      return;
    }

    const obj = { v: 0 };
    el.textContent = '0';

    gsap.to(obj, {
      v: to,
      duration: 2.2,
      ease: 'power2.out',
      onUpdate: () => { el.textContent = nf.format(Math.round(obj.v)); },
      scrollTrigger: { trigger: el, start: 'top 80%', once: true }
    });
  }

  /* ==========================================================================
     8. MENÚ — scroll horizontal pinneado (desktop) / carrusel (mobile)
     ====================================================================== */
  function initMenu() {
    const pin = $('[data-menu-pin]');
    const viewport = $('[data-menu-viewport]');
    const track = $('[data-menu-track]');
    if (!pin || !viewport || !track) return;

    if (!hasGSAP || reduced()) return; // el CSS ya deja el carrusel/grid usable

    const mm = gsap.matchMedia();

    // --- Desktop: pin + traslación horizontal ---
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      // Distancia = ancho del track menos el ancho útil del viewport (sin paddings)
      const gutter = () => parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
      const distance = () => Math.max(0, track.scrollWidth - (viewport.clientWidth - gutter() * 2));

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => '+=' + (distance() + window.innerHeight * 0.4),
          pin: true,
          pinSpacing: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      // Los números grandes se mueven un poco menos: parallax dentro de la escena
      const nums = gsap.utils.toArray('.menu__num', track);
      const numTween = gsap.to(nums, {
        xPercent: 18,
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => '+=' + (distance() + window.innerHeight * 0.4),
          scrub: 1,
          invalidateOnRefresh: true
        }
      });

      return () => {
        tween.scrollTrigger && tween.scrollTrigger.kill();
        numTween.scrollTrigger && numTween.scrollTrigger.kill();
        tween.kill();
        numTween.kill();
        gsap.set(track, { x: 0 });
        gsap.set(nums, { xPercent: 0 });
      };
    });

    // --- Mobile: entrada suave de cada tarjeta, el swipe lo hace el browser ---
    mm.add('(max-width: 899px)', () => {
      const cards = gsap.utils.toArray('.menu__card', track);
      const tween = gsap.from(cards, {
        opacity: 0,
        y: 28,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: viewport, start: 'top 85%', once: true }
      });
      return () => {
        tween.scrollTrigger && tween.scrollTrigger.kill();
        tween.kill();
        gsap.set(cards, { clearProps: 'all' });
      };
    });

    // El viewport es focuseable: flechas para navegar sin mouse ni gestos
    viewport.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const card = $('.menu__card', track);
      if (!card) return;
      const step = card.getBoundingClientRect().width + 16;
      viewport.scrollBy({ left: e.key === 'ArrowRight' ? step : -step, behavior: 'smooth' });
    });
  }

  /* ==========================================================================
     9. REVEALS GENÉRICOS
     Split en títulos, clip-path en imágenes, parallax suave.
     ====================================================================== */
  function initReveals() {
    if (!hasGSAP || reduced()) return;

    // --- Títulos con split (todos menos el hero, que ya se animó) ---
    $$('.js-split').forEach((el) => {
      if (el.classList.contains('hero__title')) return;
      if (el.classList.contains('historia__closing-text')) return; // lo maneja initHistoria
      const words = splitWords(el);
      if (!words.length) return;
      gsap.set(words, { yPercent: 115 });
      gsap.to(words, {
        yPercent: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.045,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });

    // --- Bloques que suben al entrar ---
    const blocks = [
      '.contador__inner > *',
      '.resenas__stat',
      '.resenas__source',
      '.slider',
      '.galeria__filters',
      '.info-list__row',
      '.llegar__lead',
      '.llegar__warn',
      '.llegar__actions',
      '.menu__foot-box',
      '.cta__text',
      '.cta__inner .btn'
    ];
    blocks.forEach((sel) => {
      const els = gsap.utils.toArray(sel);
      if (!els.length) return;
      gsap.from(els, {
        opacity: 0,
        y: 24,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.07,
        scrollTrigger: { trigger: els[0].parentElement || els[0], start: 'top 85%', once: true }
      });
    });

    // --- Clip-path reveal en imágenes ---
    $$('.menu__media, .llegar__map, .galeria__item').forEach((el) => {
      gsap.fromTo(el,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        }
      );
    });

    // --- Parallax suave en fotos y fondos ---
    $$('.menu__media img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: img.closest('.menu__card') || img, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    const ctaBg = $('[data-cta-bg]');
    if (ctaBg) {
      gsap.fromTo(ctaBg, { yPercent: -8, scale: 1.08 }, {
        yPercent: 8,
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    }
  }

  /* ==========================================================================
     10. SLIDER DE RESEÑAS
     ====================================================================== */
  function initSlider() {
    const root = $('[data-slider]');
    if (!root) return;

    const track = $('[data-slider-track]', root);
    const slides = $$('.slider__slide', root);
    const dotsWrap = $('[data-slider-dots]', root);
    const prev = $('[data-slider-prev]', root);
    const next = $('[data-slider-next]', root);
    if (!track || slides.length === 0) return;

    let index = 0;
    let timer = null;

    // Cuántos slides se ven a la vez (1 en mobile, 2 en desktop): sale del CSS
    const perView = () => {
      const w = slides[0].getBoundingClientRect().width;
      const vw = track.parentElement.getBoundingClientRect().width;
      return Math.max(1, Math.round(vw / Math.max(1, w)));
    };
    const maxIndex = () => Math.max(0, slides.length - perView());

    // Dots: uno por posición alcanzable. Se reconstruyen si cambia el ancho,
    // porque perView pasa de 1 (mobile) a 2 (desktop).
    const dots = [];
    function buildDots() {
      if (!dotsWrap) return;
      const count = maxIndex() + 1;
      if (dots.length === count) return;
      dotsWrap.innerHTML = '';
      dots.length = 0;
      const single = perView() === 1;
      for (let i = 0; i < count; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'slider__dot';
        b.setAttribute('aria-label', single
          ? 'Ir al testimonio ' + (i + 1)
          : 'Ir al grupo de testimonios ' + (i + 1));
        b.addEventListener('click', () => { go(i); restart(); });
        dotsWrap.appendChild(b);
        dots.push(b);
      }
    }

    function go(i) {
      index = clamp(i, 0, maxIndex());
      const shift = index * 100 / perView();
      track.style.transform = 'translate3d(-' + shift + '%, 0, 0)';
      dots.forEach((d, di) => {
        const active = di === index;
        d.classList.toggle('is-active', active);
        d.setAttribute('aria-current', active ? 'true' : 'false');
      });
      slides.forEach((s, si) => {
        // Los slides fuera de vista no reciben foco por tab
        s.toggleAttribute('inert', si < index || si >= index + perView());
      });
    }

    const nextSlide = () => go(index >= maxIndex() ? 0 : index + 1);
    const prevSlide = () => go(index <= 0 ? maxIndex() : index - 1);

    if (next) next.addEventListener('click', () => { nextSlide(); restart(); });
    if (prev) prev.addEventListener('click', () => { prevSlide(); restart(); });

    // Teclado
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { nextSlide(); restart(); }
      if (e.key === 'ArrowLeft') { prevSlide(); restart(); }
    });

    // Swipe
    let startX = 0, startY = 0, dragging = false;
    root.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dragging = true;
    }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
        dx < 0 ? nextSlide() : prevSlide();
        restart();
      }
    }, { passive: true });

    // Autoplay: nunca con reduced-motion, y se pausa con hover/foco
    function start() {
      if (reduced() || maxIndex() === 0) return;
      stop();
      timer = window.setInterval(nextSlide, 6500);
    }
    function stop() { if (timer) { window.clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    root.addEventListener('pointerenter', stop);
    root.addEventListener('pointerleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

    window.addEventListener('resize', () => { buildDots(); go(index); });
    buildDots();
    go(0);
    start();
  }

  /* ==========================================================================
     11. GALERÍA — filtros + lightbox
     ====================================================================== */
  function initGallery() {
    const grid = $('[data-gallery-grid]');
    if (!grid) return;

    const items = $$('.galeria__item', grid);
    const chips = $$('.galeria__filters .chip');

    /* ---------- Filtros ---------- */
    function setVisible(cat) {
      items.forEach((item) => {
        const show = cat === 'all' || item.dataset.cat === cat;
        item.hidden = !show;
      });
    }

    function applyFilter(cat) {
      const visibleBefore = items.filter((i) => !i.hidden);

      if (!hasGSAP || reduced()) {
        setVisible(cat);
        return;
      }

      // Salida -> reordeno visibilidad -> entrada escalonada
      gsap.to(visibleBefore, {
        opacity: 0,
        y: 10,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => {
          setVisible(cat);
          const visibleAfter = items.filter((i) => !i.hidden);
          gsap.fromTo(visibleAfter,
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05, clearProps: 'transform' }
          );
          ScrollTrigger.refresh();
        }
      });
    }

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => {
          const active = c === chip;
          c.classList.toggle('is-active', active);
          c.setAttribute('aria-pressed', String(active));
        });
        applyFilter(chip.dataset.filter);
      });
    });

    /* ---------- Lightbox ---------- */
    const box = $('[data-lightbox]');
    if (!box) return;

    const boxImg = $('[data-lightbox-img]', box);
    const boxCaption = $('[data-lightbox-caption]', box);
    const btnPrev = $('[data-lightbox-prev]', box);
    const btnNext = $('[data-lightbox-next]', box);
    const closeEls = $$('[data-lightbox-close]', box);
    const dialog = $('.lightbox__dialog', box);

    let group = [];      // botones visibles al momento de abrir
    let pos = 0;
    let lastFocused = null;

    function render() {
      const btn = group[pos];
      if (!btn) return;
      const img = $('img', btn);
      boxImg.src = btn.dataset.full || (img ? img.src : '');
      boxImg.alt = img ? img.alt : '';
      boxCaption.textContent = btn.dataset.caption || (img ? img.alt : '');
      const multi = group.length > 1;
      btnPrev.hidden = !multi;
      btnNext.hidden = !multi;
    }

    function open(btn) {
      group = items.filter((i) => !i.hidden).map((i) => $('.galeria__btn', i)).filter(Boolean);
      pos = Math.max(0, group.indexOf(btn));
      lastFocused = document.activeElement;

      box.hidden = false;
      render();
      requestAnimationFrame(() => box.classList.add('is-open'));

      if (lenis) lenis.stop();
      document.body.style.overflow = 'hidden';
      closeEls[0] && closeEls[0].focus();
    }

    function close() {
      box.classList.remove('is-open');
      if (lenis) lenis.start();
      document.body.style.overflow = '';
      const done = () => { box.hidden = true; boxImg.src = ''; };
      reduced() ? done() : window.setTimeout(done, 240);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    const step = (d) => { pos = (pos + d + group.length) % group.length; render(); };

    $$('.galeria__btn', grid).forEach((btn) => {
      btn.addEventListener('click', () => open(btn));
    });

    closeEls.forEach((el) => el.addEventListener('click', close));
    btnNext.addEventListener('click', () => step(1));
    btnPrev.addEventListener('click', () => step(-1));

    document.addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);

      // Foco atrapado dentro del diálogo
      if (e.key === 'Tab' && dialog) {
        const focusables = $$('button:not([hidden])', dialog);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ==========================================================================
     12. VARIOS
     ====================================================================== */
  function initMisc() {
    const year = $('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());

    // Mientras falten assets reales, una imagen que no carga se muestra como
    // bloque de papel en vez del icono de imagen rota. Inofensivo en producción.
    $$('img').forEach((img) => {
      const flag = () => {
        img.classList.add('is-missing');
        const holder = img.closest('.menu__media, .galeria__btn, .historia__bg-item, .cta__bg');
        if (holder) holder.classList.add('has-missing-img');
      };
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) flag();
      img.addEventListener('error', flag, { once: true });
    });

    // Las imágenes que cargan tarde cambian la altura: recalculamos triggers
    if (hasGSAP) {
      window.addEventListener('load', () => ScrollTrigger.refresh());
      $$('img[loading="lazy"]').forEach((img) => {
        img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
      });
    }
  }

  /* ==========================================================================
     BOOT
     ====================================================================== */
  function boot() {
    initSmoothScroll();
    initAnchors();
    initHeader();
    initCursor();
    initMagnetic();
    initHeroVideo();
    initHeroAnimation();
    initHistoria();
    initCounter();
    initMenu();
    initReveals();
    initSlider();
    initGallery();
    initMisc();

    if (hasGSAP) ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  // Si el usuario cambia su preferencia de movimiento, recargamos el estado:
  // es la forma más segura de desarmar pins y parallax sin dejar restos.
  const onMotionChange = () => window.location.reload();
  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', onMotionChange);
  } else if (typeof motionQuery.addListener === 'function') {
    motionQuery.addListener(onMotionChange); // Safari viejo
  }
})();
