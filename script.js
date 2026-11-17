/* Camping Peloponeso — reserva por WhatsApp, clima de Orense, galería, entradas */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = (id) => document.getElementById(id);
  const WA = '5492983541183';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Tarifas: completar cuando el camping pase los precios ----------
     null = todavía no confirmado → en pantalla se ve "Lorem ipsum" y el mensaje pide la tarifa. */
  const TARIFAS = {
    carpa:   { adulto: null, menor: null },
    casilla: { unidad: null, persona: null },
    dormi:   { noche: null },
    dia:     { adulto: null, menor: null },
    auto: null,
  };

  /* ---------- Menú móvil ---------- */
  const toggle = document.querySelector('.nav__toggle');
  const menu = $('menu');
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
    toggle.textContent = open ? 'Cerrar' : 'Menú';
  });
  menu.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') { menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menú'; }
  });

  /* ---------- Entradas escalonadas ---------- */
  const rv = [...document.querySelectorAll('.rv')];
  const groups = new Map();
  rv.forEach((el) => {
    const sec = el.closest('section, footer') || document.body;
    const i = groups.get(sec) || 0; groups.set(sec, i + 1);
    el.style.setProperty('--d', `${Math.min(i, 5) * 80}ms`);
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach((el) => io.observe(el));
  } else rv.forEach((el) => el.classList.add('is-in'));

  /* ---------- El nombre pesa: escala con el scroll ---------- */
  const word = document.querySelector('[data-scale]');
  const fab = document.querySelector('.wa-fab');
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY, h = window.innerHeight;
    if (word && !reduce) {
      const p = Math.min(Math.max(y / h, 0), 1);
      word.style.transform = `scale(${1 - p * 0.07}) translateY(${p * -10}px)`;
    }
    if (fab) {
      const est = $('estadia').getBoundingClientRect();
      const inPlanner = est.top < h * 0.6 && est.bottom > h * 0.4;
      fab.classList.toggle('is-on', y > h * 0.8 && !inPlanner);
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Galería que se arrastra ---------- */
  const track = document.querySelector('.gal__track');
  if (track) {
    let down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; track.classList.add('is-drag');
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx; if (Math.abs(dx) > 3) moved = true;
      track.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => { down = false; track.classList.remove('is-drag'); });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') track.scrollBy({ left: 320, behavior: 'smooth' });
      if (e.key === 'ArrowLeft') track.scrollBy({ left: -320, behavior: 'smooth' });
    });
  }

  /* ---------- Hoy en el balneario (Open-Meteo, sin clave) ---------- */
  const LAT = -38.8046, LON = -59.7348;
  const hhmm = (iso) => iso ? iso.slice(11, 16) : '—';
  const card = (deg) => ['norte', 'noreste', 'este', 'sudeste', 'sur', 'sudoeste', 'oeste', 'noroeste'][Math.round(deg / 45) % 8];
  const fc = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}`
    + '&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&daily=sunset,temperature_2m_max'
    + '&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=1';
  const sea = `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT - 0.02}&longitude=${LON}&current=sea_surface_temperature,wave_height&timezone=America%2FArgentina%2FBuenos_Aires`;
  Promise.allSettled([fetch(fc).then((r) => r.json()), fetch(sea).then((r) => r.json())]).then(([a, b]) => {
    if (a.status !== 'fulfilled' || !a.value.current) { $('w-verdict').textContent = 'No pudimos traer el pronóstico. Escribinos y te contamos cómo está el día.'; return; }
    const c = a.value.current, d = a.value.daily;
    const ws = Math.round(c.wind_speed_10m), t = Math.round(c.temperature_2m), max = Math.round(d.temperature_2m_max[0]);
    const sunset = hhmm(d.sunset[0]);
    $('w-temp').textContent = `${t} °C`;
    $('w-wind').textContent = ws < 4 ? 'Calma' : `${ws} km/h del ${card(c.wind_direction_10m)}`;
    $('w-sunset').textContent = `${sunset} h`;
    let seaT = null;
    if (b.status === 'fulfilled' && b.value.current && b.value.current.sea_surface_temperature != null) {
      seaT = Math.round(b.value.current.sea_surface_temperature);
      $('w-sea').textContent = `${seaT} °C`;
    } else $('w-sea').textContent = 'sin dato';
    const code = c.weather_code, rain = code >= 51 && code < 95, storm = code >= 95;
    let v;
    if (storm) v = 'Hay tormenta por la costa. Día de quincho y mate bajo techo.';
    else if (rain) v = 'Está lloviendo en Orense. El pinar frena el agua y el quincho está techado.';
    else if (ws >= 35) v = `Sopla fuerte (${ws} km/h). En la playa vuela la arena; bajo los pinos casi no se siente.`;
    else if (max >= 27) v = `Día de playa: llega a ${max} °C. El sol se pone a las ${sunset}, quedate a verlo.`;
    else v = `Hoy máxima de ${max} °C. El atardecer, a las ${sunset}, se ve desde la orilla.`;
    $('w-verdict').textContent = v;
  });

  /* ---------- Armá tu estadía → WhatsApp ---------- */
  const form = $('planner');
  if (!form) return;
  const fin = $('f-in'), fout = $('f-out'), nightsEl = $('f-nights');
  const ad = $('f-ad'), me = $('f-me'), auto = $('f-auto');
  const lines = $('t-lines'), total = $('t-total'), note = $('t-note'), send = $('t-send');
  const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const fmt = (dt) => `${DIAS[dt.getDay()]} ${dt.getDate()}/${dt.getMonth() + 1}`;
  const money = (n) => '$ ' + Math.round(n).toLocaleString('es-AR');

  // Fechas por defecto: primer sábado de enero que viene (o en 3 días si ya es temporada)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let start;
  const m = today.getMonth();
  if (m >= 2 && m <= 10) start = new Date(today.getFullYear() + 1, 0, 2);
  else { start = new Date(today); start.setDate(start.getDate() + 3); }
  while (start.getDay() !== 6) start.setDate(start.getDate() + 1);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  fin.min = iso(today); fin.value = iso(start); fout.value = iso(end); fout.min = iso(start);

  form.querySelectorAll('.stepper').forEach((s) => {
    const out = s.querySelector('output'), min = +s.dataset.min, max = +s.dataset.max;
    s.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      out.value = out.textContent = String(Math.min(max, Math.max(min, +out.textContent + +b.dataset.step)));
      update();
    }));
  });
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (e) => { e.preventDefault(); window.open(send.href, '_blank', 'noopener'); });

  function update() {
    const tipo = form.querySelector('input[name="tipo"]:checked').value;
    const nA = +ad.textContent, nM = +me.textContent, car = auto.checked;
    const extras = [...form.querySelectorAll('input[name="extra"]:checked')].map((i) => i.value);
    const dia = tipo === 'dia';
    $('field-out').hidden = dia;
    if (fin.value) fout.min = fin.value;

    let nights = 0, dIn = fin.value ? parse(fin.value) : null, dOut = fout.value ? parse(fout.value) : null;
    if (!dia && dIn && dOut) nights = Math.round((dOut - dIn) / 864e5);
    if (!dia && dIn && dOut && nights <= 0) { nightsEl.textContent = 'La salida tiene que ser después de la llegada.'; }
    else nightsEl.textContent = dia ? (dIn ? `Un día de camping, el ${fmt(dIn)}.` : '') : (nights ? `${nights} ${nights === 1 ? 'noche' : 'noches'}` : '');

    const gente = `${nA} ${nA === 1 ? 'adulto' : 'adultos'}${nM ? ` y ${nM} ${nM === 1 ? 'menor' : 'menores'}` : ''}`;
    const nombre = { carpa: 'Carpa', casilla: 'Casilla o motorhome', dormi: 'Dormí', dia: 'Día de camping' }[tipo];
    const L = [];
    const n = Math.max(nights, 0);
    let sum = 0, known = true;
    const add = (txt, unit, qty) => { L.push(txt); if (unit == null) known = false; else sum += unit * qty; };
    if (dia) {
      add(`${nombre} · ${gente}`, TARIFAS.dia.adulto, nA);
      if (nM) { if (TARIFAS.dia.menor == null) known = false; else sum += TARIFAS.dia.menor * nM; }
    } else if (tipo === 'carpa') {
      add(`${nombre} · ${gente} · ${n} ${n === 1 ? 'noche' : 'noches'}`, TARIFAS.carpa.adulto, nA * n);
      if (nM) { if (TARIFAS.carpa.menor == null) known = false; else sum += TARIFAS.carpa.menor * nM * n; }
    } else if (tipo === 'casilla') {
      add(`${nombre} · ${gente} · ${n} ${n === 1 ? 'noche' : 'noches'}`, TARIFAS.casilla.unidad, n);
      if (TARIFAS.casilla.persona == null) known = false; else sum += TARIFAS.casilla.persona * (nA + nM) * n;
    } else {
      add(`${nombre} · ${gente} · ${n} ${n === 1 ? 'noche' : 'noches'}`, TARIFAS.dormi.noche, n);
    }
    if (car && tipo !== 'casilla') add('Auto en el camping', TARIFAS.auto, dia ? 1 : n);
    if (dIn) L.unshift(dia ? `El ${fmt(dIn)}` : (dOut && n > 0 ? `Del ${fmt(dIn)} al ${fmt(dOut)}` : `Llegada ${fmt(dIn)}`));
    if (extras.length) L.push(`Al llegar: ${extras.join(', ')} (se paga en la proveeduría)`);
    lines.innerHTML = L.map((x) => `<li>${x}</li>`).join('');
    total.textContent = known && (dia || n > 0) ? money(sum) : 'Lorem ipsum';
    note.textContent = known ? 'Estimado según tarifas de la temporada. El lugar lo confirma el camping.' : 'Las tarifas de esta temporada las confirma el camping por WhatsApp.';

    const fechas = dia ? `para ir el ${dIn ? fmt(dIn) : '(día a definir)'}` : (dIn && dOut && n > 0 ? `del ${fmt(dIn)} al ${fmt(dOut)} (${n} ${n === 1 ? 'noche' : 'noches'})` : 'en fechas a definir');
    const como = { carpa: 'con carpa', casilla: 'con casilla/motorhome', dormi: 'para un dormí', dia: 'por el día' }[tipo];
    let msg = `Hola! Quiero consultar lugar en el Peloponeso ${fechas}. Somos ${gente}, ${como}${car && tipo !== 'casilla' ? ', con auto' : ''}.`;
    if (extras.length) msg += ` Si se puede, que nos esperen con ${extras.join(', ')}.`;
    msg += known ? ' Tienen lugar?' : ' Tienen lugar? Cuál sería la tarifa?';
    send.href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  }
  update();

  /* ---------- Compartir ---------- */
  const share = $('share');
  if (share) share.addEventListener('click', async () => {
    const data = { title: 'Camping Peloponeso · Balneario Orense', url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(location.href); share.textContent = 'Link copiado'; }
    } catch (_) { /* cancelado */ }
  });
})();
