/* =====================================================================
   GreenRah pitch: presentation engine
   ---------------------------------------------------------------------
   Vanilla JS. No network requests. Reads copy from js/content.js.

   Sections
     1. Setup and small utilities
     2. Shared visual builders (icons, city map, Europe map, Lisbon grid, QR)
     3. Slide renderers (one per slide id) and their controllers
     4. Deck: slide state, fragments, controllers
     5. Main window: scaling, HUD, keyboard, click, swipe, hash, overlays
     6. Presenter window
     7. Print support
     8. Boot
   ===================================================================== */
(function () {
  'use strict';

  /* =================================================================
     1. SETUP AND UTILITIES
     ================================================================= */

  var C = window.GR_CONTENT;
  var ICONS = window.GR_ICONS || {};
  var GEO = window.GR_GEO;
  var City = window.GRCity;
  var W = 1920;
  var H = 1080;
  var ASSETS = {
    logoOnDark: 'assets/greenrah-logo-light.png',
    logoOnLight: 'assets/greenrah-logo-dark.png'
  };
  var root = document.documentElement;
  var params = new URLSearchParams(location.search);
  var IS_PRESENTER = params.has('presenter');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isPlaceholder(v) { return typeof v === 'string' && v.trim().charAt(0) === '['; }

  /** Resolve {ph:key} to its raw value (no markup). */
  function resolve(s) {
    return String(s == null ? '' : s).replace(/\{ph:([\w-]+)\}/g, function (_, k) {
      return C.placeholders[k] != null ? C.placeholders[k] : '[ADD: ' + k + ']';
    });
  }

  /** Copy formatter: escapes HTML, renders {ph:key} and [[accent]]. */
  function fmt(s) {
    var out = esc(s);
    out = out.replace(/\{ph:([\w-]+)\}/g, function (_, k) {
      var v = C.placeholders[k] != null ? C.placeholders[k] : '[ADD: ' + k + ']';
      return isPlaceholder(v) ? '<span class="ph">' + esc(v) + '</span>' : esc(v);
    });
    out = out.replace(/\[\[(.+?)\]\]/g, '<span class="accent">$1</span>');
    return out;
  }

  /** Placeholder-aware text for a raw value (used for stats). */
  function phText(v) {
    return isPlaceholder(v) ? '<span class="ph">' + esc(v) + '</span>' : esc(v);
  }

  function icon(name, cls) {
    return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      (ICONS[name] || '') + '</svg>';
  }

  /** Icon nested inside another SVG, centred at (x, y). */
  function svgIcon(name, x, y, size, cls) {
    return '<svg class="i ' + (cls || '') + '" x="' + (x - size / 2) + '" y="' + (y - size / 2) + '" width="' + size +
      '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  function byId(id) {
    for (var i = 0; i < C.slides.length; i++) if (C.slides[i].id === id) return C.slides[i];
    return {};
  }

  function reduced() { return root.classList.contains('reduce-motion'); }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /** requestAnimationFrame tween. Returns a cancel function. */
  function tween(from, to, ms, onUpdate, onDone) {
    if (reduced() || ms <= 0) {
      onUpdate(to);
      if (onDone) onDone();
      return function () {};
    }
    var start = null;
    var raf = 0;
    var cancelled = false;
    function frame(ts) {
      if (cancelled) return;
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / ms);
      onUpdate(from + (to - from) * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(frame);
      else if (onDone) onDone();
    }
    raf = requestAnimationFrame(frame);
    return function () { cancelled = true; cancelAnimationFrame(raf); };
  }

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { /* storage can be blocked on file:// */ }
    return null;
  }

  function logo(cls) {
    return '<span class="logo ' + (cls || '') + '" role="img" aria-label="GreenRah">' +
      '<img class="logo-on-dark" src="' + ASSETS.logoOnDark + '" alt="" draggable="false">' +
      '<img class="logo-on-light" src="' + ASSETS.logoOnLight + '" alt="" draggable="false"></span>';
  }

  function head(s, extraCls) {
    return '<header class="slide-head ' + (extraCls || '') + '">' +
      (s.kicker ? '<p class="kicker">' + fmt(s.kicker) + '</p>' : '') +
      '<h2 class="title">' + fmt(s.title) + '</h2>' +
      (s.body ? '<p class="body">' + fmt(s.body) + '</p>' : '') +
      '</header>';
  }

  function fmtCount(n) {
    return Number(n).toLocaleString('en-GB');
  }

  function countUpIn(el) {
    var nodes = el.querySelectorAll('[data-count]');
    Array.prototype.forEach.call(nodes, function (n) {
      var target = parseFloat(n.getAttribute('data-count'));
      var dec = parseInt(n.getAttribute('data-decimals') || '0', 10);
      tween(0, target, 1100, function (v) {
        n.textContent = v.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      });
    });
  }

  /* =================================================================
     2. SHARED VISUAL BUILDERS
     ================================================================= */

  function shadowD(time, buildings) {
    var sh = City.shadowsAt(time, buildings);
    return sh.polys.map(function (p) {
      return 'M' + p.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + 'Z';
    }).join('');
  }

  function segD(seg) { return 'M' + seg.a[0] + ' ' + seg.a[1] + 'L' + seg.b[0] + ' ' + seg.b[1]; }

  function routePath(pts, cls, extra) {
    var d = City.pathD(pts);
    return '<path class="route-casing ' + cls + '-casing" d="' + d + '"/>' +
      '<path class="route ' + cls + '" d="' + d + '" pathLength="1" ' + (extra || '') + '/>';
  }

  /**
   * Stylised city map (top down, north up).
   * o.time        clock hours for shadows
   * o.fast        draw the fastest route
   * o.cool        id of the cooler route to draw, or 'all' for every candidate
   * o.heat        draw a hot overlay on the fastest route (problem slide)
   * o.access      draw stairs, steep segment and the gentler path
   * o.markers     draw start / end markers
   * o.labels      {start, end}
   */
  function cityMap(o) {
    var out = [];
    var P = City.COLS[2] + City.STREET / 2;
    var cellW = City.COLS[3] - City.COLS[2] - City.STREET;
    var cellH = City.ROWS[1] - City.ROWS[0] - City.STREET;
    out.push('<svg class="city" viewBox="0 0 ' + City.W + ' ' + City.H + '" aria-hidden="true" focusable="false">');
    out.push('<rect class="city-ground" x="-400" y="-400" width="' + (City.W + 800) + '" height="' + (City.H + 800) + '"/>');
    out.push('<rect class="city-river" x="-400" y="' + City.RIVER_Y + '" width="' + (City.W + 800) + '" height="400"/>');
    out.push('<rect class="city-park" x="' + P + '" y="' + (City.ROWS[0] + City.STREET / 2) + '" width="' + cellW + '" height="' + cellH + '" rx="10"/>');
    out.push('<path class="city-shadows" d="' + shadowD(o.time) + '"/>');
    out.push('<g class="city-blocks">');
    City.city.buildings.forEach(function (b) {
      out.push('<polygon class="' + toneOf(b.h) + '" points="' + City.polyPoints(b.poly) + '"/>');
    });
    out.push('</g><g class="city-trees">');
    City.city.trees.forEach(function (t) {
      out.push('<circle cx="' + t.x.toFixed(1) + '" cy="' + t.y.toFixed(1) + '" r="' + t.r.toFixed(1) + '"/>');
    });
    out.push('</g>');

    out.push('<g class="city-routes">');
    if (o.fast) out.push(routePath(City.routes.fastest.pts, 'route--fast'));
    if (o.heat) out.push('<path class="route route--heat" d="' + City.pathD(City.routes.fastest.pts) + '"/>');
    if (o.cool === 'all') {
      City.candidates.forEach(function (id) {
        out.push('<g class="route-cand" data-route="' + id + '">' + routePath(City.routes[id].pts, 'route--cool') + '</g>');
      });
    } else if (o.cool) {
      out.push(routePath(City.routes[o.cool].pts, 'route--cool'));
    }
    if (o.access) out.push(routePath(City.accessible.pts, 'route--access'));
    out.push('</g>');

    if (o.access) {
      out.push('<g class="access-flags">');
      City.stairs.forEach(function (s) {
        out.push('<path class="flag-seg flag-seg--stairs" d="' + segD(s) + '"/>');
      });
      City.steep.forEach(function (s) {
        out.push('<path class="flag-seg flag-seg--steep" d="' + segD(s) + '"/>');
      });
      out.push('</g><g class="access-badges">');
      City.stairs.forEach(function (s) {
        var x = (s.a[0] + s.b[0]) / 2;
        var y = (s.a[1] + s.b[1]) / 2;
        out.push('<g class="badge badge--stairs"><rect x="' + (x - 26) + '" y="' + (y - 26) + '" width="52" height="52" rx="14"/>' +
          svgIcon('stairs', x, y, 30) + '</g>');
      });
      City.steep.forEach(function (s) {
        var x = (s.a[0] + s.b[0]) / 2;
        var y = (s.a[1] + s.b[1]) / 2;
        out.push('<g class="badge badge--steep"><rect x="' + (x - 26) + '" y="' + (y - 26) + '" width="52" height="52" rx="14"/>' +
          svgIcon('mountain', x, y, 30) + '</g>');
      });
      out.push('</g>');
    }

    if (o.markers) {
      var L = o.labels || {};
      out.push('<g class="marker marker--start"><circle cx="' + City.start[0] + '" cy="' + City.start[1] + '" r="15"/>' +
        '<text x="' + (City.start[0] + 26) + '" y="' + (City.start[1] - 22) + '">' + esc(L.start || '') + '</text></g>');
      out.push('<g class="marker marker--end"><circle cx="' + City.end[0] + '" cy="' + City.end[1] + '" r="15"/>' +
        '<text x="' + (City.end[0] - 26) + '" y="' + (City.end[1] + 44) + '" text-anchor="end">' + esc(L.end || '') + '</text></g>');
    }
    out.push('</svg>');
    return out.join('');
  }

  /** Taller buildings read slightly lighter, so the flat map has some depth. */
  function toneOf(h) { return h < 22 ? 'b1' : h < 28 ? 'b2' : 'b3'; }

  /** Full-stage background city for the title slide (its own finer grid). */
  var BG_BUILDINGS = City.gridBuildings({ x0: -40, y0: -30, x1: 1960, y1: 1110, cellW: 190, cellH: 150, street: 26, hMin: 18, hMax: 44, seed: 11 });
  function titleCity(time) {
    return '<svg class="city city--bg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<rect class="city-ground" width="1920" height="1080"/>' +
      '<path class="city-shadows" d="' + shadowD(time, BG_BUILDINGS) + '"/>' +
      '<g class="city-blocks">' + BG_BUILDINGS.map(function (b) {
        return '<polygon class="' + toneOf(b.h * 0.8) + '" points="' + City.polyPoints(b.poly) + '"/>';
      }).join('') + '</g></svg>';
  }

  /** Small top-down sun dial: north up, sun dot at its azimuth, closer to centre when high. */
  function sunDial(cls) {
    var path = [];
    for (var t = 6.6; t <= 21.2; t += 0.2) {
      var s = City.sunAt(t);
      if (s.elevation < 0) continue;
      var p = dialPoint(s);
      path.push(p[0].toFixed(1) + ' ' + p[1].toFixed(1));
    }
    return '<svg class="sundial ' + (cls || '') + '" viewBox="0 0 200 200" aria-hidden="true">' +
      '<circle class="dial-ring" cx="100" cy="100" r="84"/>' +
      '<path class="dial-path" d="M' + path.join('L') + '"/>' +
      '<text class="dial-n" x="100" y="11" text-anchor="middle">N</text>' +
      '<circle class="dial-centre" cx="100" cy="100" r="5"/>' +
      '<g class="dial-sun"><circle r="13"/></g></svg>';
  }

  function dialPoint(sun) {
    var r = 84 * (1 - Math.max(0, sun.elevation) / 90);
    var az = sun.azimuth * Math.PI / 180;
    return [100 + Math.sin(az) * r, 100 - Math.cos(az) * r];
  }

  function setDial(svg, time) {
    if (!svg) return;
    var sun = City.sunAt(time);
    var p = dialPoint(sun);
    var g = svg.querySelector('.dial-sun');
    if (g) g.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')');
    svg.classList.toggle('is-night', sun.elevation <= 0);
  }

  function europeMap(lisbonLabel) {
    var E = GEO.europe;
    var lx = E.lisbon[0];
    var ly = E.lisbon[1];
    return '<svg class="europe" viewBox="0 0 ' + E.width + ' ' + E.height + '" role="img" aria-label="Map of Europe. EU countries and Great Britain highlighted.">' +
      '<g class="eu-other">' + E.other.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</g>' +
      '<g class="eu-covered">' + E.covered.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</g>' +
      '<g class="eu-pin"><circle class="eu-pin-pulse" cx="' + lx + '" cy="' + ly + '" r="14"/>' +
      '<circle class="eu-pin-dot" cx="' + lx + '" cy="' + ly + '" r="11"/>' +
      '<text x="' + (lx + 22) + '" y="' + (ly + 44) + '">' + esc(lisbonLabel) + '</text></g></svg>';
  }

  function lisbonGrid() {
    var L = GEO.lisbon;
    var s = L.cell;
    var cells = L.cells.map(function (c) {
      var delay = Math.round((c[0] + c[1]) * 22);
      var k = Math.max(0, Math.min(1, (c[2] - 0.32) / 0.6));
      var op = (0.06 + 0.9 * Math.pow(k, 1.6)).toFixed(2);
      return '<rect x="' + (c[0] * s + 1.5) + '" y="' + (c[1] * s + 1.5) + '" width="' + (s - 3) + '" height="' + (s - 3) +
        '" rx="5" fill-opacity="' + op + '" style="transition-delay:' + delay + 'ms"/>';
    }).join('');
    return '<svg class="lisbon" viewBox="0 0 ' + L.width + ' ' + L.height + '" aria-hidden="true">' +
      '<g class="lx-cells">' + cells + '</g>' +
      '<g class="lx-parishes">' + L.parishes.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</g></svg>';
  }

  function qrSvg(text) {
    if (typeof window.qrcode !== 'function') return '';
    var qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount();
    var q = 3;
    var bands = 6;
    var groups = [];
    for (var b = 0; b < bands; b++) groups.push('');
    for (var r = 0; r < n; r++) {
      var band = Math.min(bands - 1, Math.floor(r / n * bands));
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) groups[band] += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z';
      }
    }
    return '<svg class="qr" viewBox="0 0 ' + (n + q * 2) + ' ' + (n + q * 2) + '" role="img" aria-label="QR code to ' + esc(text) + '" shape-rendering="crispEdges">' +
      '<rect class="qr-bg" width="' + (n + q * 2) + '" height="' + (n + q * 2) + '" rx="2"/>' +
      groups.map(function (d, i) { return '<path class="qr-band" style="transition-delay:' + (i * 90) + 'ms" d="' + d + '"/>'; }).join('') +
      '</svg>';
  }

  /* =================================================================
     3. SLIDE RENDERERS
     Each returns { html, steps?, ctrl? }.
     ctrl(el, deck) returns { enter(step), step(step, dir), leave(), final() }.
     Fragments: any element with class "frag" and data-step="n".
     ================================================================= */

  var R = {};

  /* 1. Title ---------------------------------------------------------- */
  R.title = function (s) {
    return {
      html:
        '<div class="title-bg" aria-hidden="true">' + titleCity(16.5) + '</div>' +
        '<div class="title-content">' +
          logo('title-logo') +
          '<h1 class="title-tag">' + fmt(s.title) + '</h1>' +
          '<p class="title-body">' + fmt(s.body) + '</p>' +
          '<p class="title-footer">' + fmt(s.footer) + '</p>' +
        '</div>' +
        '<div class="title-sun" aria-hidden="true">' + sunDial() +
          '<p class="title-clock"><span class="clock-time">16:30</span><span class="clock-label">' + fmt(s.sunLabel) + '</span></p></div>',
      ctrl: function (el) {
        var path = el.querySelector('.city-shadows');
        var dial = el.querySelector('.sundial');
        var clock = el.querySelector('.clock-time');
        var raf = 0;
        var t0 = 0;
        var lastDraw = 0;
        var FROM = 7.5;
        var TO = 20;
        var PERIOD = 70000; // ms for a full morning-to-evening-and-back cycle
        function draw(time) {
          path.setAttribute('d', shadowD(time, BG_BUILDINGS));
          setDial(dial, time);
          clock.textContent = City.formatClock(time);
        }
        function loop(ts) {
          if (!t0) t0 = ts;
          if (ts - lastDraw > 40) { // ~25 fps is plenty for slow shadows
            var ph = ((ts - t0) % PERIOD) / PERIOD;
            var k = 0.5 - 0.5 * Math.cos(ph * Math.PI * 2); // smooth ping-pong
            draw(FROM + (TO - FROM) * k);
            lastDraw = ts;
          }
          raf = requestAnimationFrame(loop);
        }
        return {
          enter: function () {
            if (reduced()) { draw(16.5); return; }
            t0 = 0;
            raf = requestAnimationFrame(loop);
          },
          leave: function () { cancelAnimationFrame(raf); },
          final: function () { cancelAnimationFrame(raf); draw(16.5); }
        };
      }
    };
  };

  /* 2. Problem ------------------------------------------------------- */
  R.problem = function (s) {
    return {
      html:
        '<div class="split">' +
          '<div class="split-text">' + head(s) +
            '<div class="heat-meter" aria-hidden="true"><div class="heat-meter-top">' + icon('temperature') +
            '<span>' + fmt(s.heatLabel) + '</span></div><div class="heat-bar"><i></i></div></div>' +
          '</div>' +
          '<figure class="map-card">' + cityMap({ time: 9, fast: true, heat: true, markers: true, labels: { start: '', end: '' } }) +
            '<figcaption class="map-chip map-chip--clock">' + icon('clock') + '<span class="clock-time">09:00</span><span class="clock-label">' + fmt(s.clockLabel) + '</span></figcaption>' +
            '<div class="map-legend"><span class="lg lg--fast"><i></i>' + fmt(s.routeLabel) + '</span></div>' +
          '</figure>' +
        '</div>',
      ctrl: function (el) {
        var shadows = el.querySelector('.city-shadows');
        var heat = el.querySelector('.route--heat');
        var clock = el.querySelector('.clock-time');
        var bar = el.querySelector('.heat-bar i');
        var cancel = function () {};
        function draw(time) {
          var p = (time - 9) / 5;
          shadows.setAttribute('d', shadowD(time));
          heat.style.opacity = p.toFixed(3);
          bar.style.transform = 'scaleX(' + Math.max(0.04, p).toFixed(3) + ')';
          clock.textContent = City.formatClock(time);
        }
        return {
          enter: function () {
            cancel();
            draw(9);
            var start = setTimeout(function () {
              cancel = tween(9, 14, 5200, draw);
            }, reduced() ? 0 : 700);
            var prev = cancel;
            cancel = function () { clearTimeout(start); prev(); };
          },
          leave: function () { cancel(); },
          final: function () { cancel(); draw(14); }
        };
      }
    };
  };

  /* 3. Why now ------------------------------------------------------- */
  R.whynow = function (s) {
    var cards = s.cards.map(function (c, i) {
      var st = C.stats[c.stat] || {};
      var hasStat = st.value != null && st.source;
      var statHtml = hasStat
        ? '<p class="stat-num">' + esc(st.prefix || '') + '<span data-count="' + st.value + '" data-decimals="' +
            ((String(st.value).split('.')[1] || '').length) + '">' + fmtCount(st.value) + '</span>' + esc(st.suffix || '') + '</p>' +
          '<p class="stat-label">' + esc(st.label || '') + '</p><p class="stat-source">' + esc(st.source) + '</p>'
        : '<p class="stat-ph">' + phText(st.placeholder || '[ADD: stat + source]') + '</p>';
      return '<article class="card why-card stagger" style="--i:' + i + '">' +
        '<span class="icon-badge">' + icon(c.icon) + '</span>' +
        '<h3 class="card-title">' + fmt(c.title) + '</h3>' +
        '<p class="card-text">' + fmt(c.text) + '</p>' +
        '<div class="why-stat">' + statHtml + '</div></article>';
    }).join('');
    return {
      html: head(s) + '<div class="why-grid">' + cards + '</div>',
      ctrl: function (el) {
        return { enter: function () { countUpIn(el); } };
      }
    };
  };

  /* 4. Solution ------------------------------------------------------ */
  R.solution = function (s) {
    var cool = City.coolerAt(s.time).id;
    return {
      steps: 1,
      html:
        '<div class="split">' +
          '<div class="split-text">' + head(s) + '</div>' +
          '<figure class="map-card">' +
            cityMap({ time: s.time, fast: true, cool: cool, markers: true, labels: { start: s.start, end: s.end } }) +
            '<span class="map-chip map-chip--note">' + icon('info-circle') + fmt(C.meta.illustration) + ' · ' + City.formatClock(s.time) + '</span>' +
            '<div class="map-legend">' +
              '<span class="lg lg--fast"><i></i>' + fmt(s.legendFast) + '</span>' +
              '<span class="lg lg--cool frag frag--fade" data-step="1"><i></i>' + fmt(s.legendCool) + '</span>' +
              '<span class="lg lg--shade"><i></i>' + fmt(byId('heatsmart').legendShade) + '</span>' +
            '</div>' +
          '</figure>' +
        '</div>'
    };
  };

  /* 5. Thermal Comfort Engine ---------------------------------------- */
  R.engine = function (s) {
    // Diagram coordinates in a 1680 x 580 box
    var cardW = 560;
    var cardH = 96;
    var gap = 25;
    var ex = 1010;
    var ey = 290;
    var er = 135;
    var outX = 1250;
    var outW = 430;
    var outY = [150, 318];
    var outH = 112;
    var html = '<div class="engine">';
    html += '<svg class="engine-links" viewBox="0 0 1680 580" aria-hidden="true">';
    s.signals.forEach(function (sig, i) {
      var y = i * (cardH + gap) + cardH / 2;
      var d = 'M' + cardW + ' ' + y + ' C ' + (cardW + 220) + ' ' + y + ', ' + (ex - er - 170) + ' ' + ey + ', ' + (ex - er) + ' ' + ey;
      html += '<g class="frag frag--fade" data-step="' + (i + 1) + '"><path class="link" d="' + d + '"/><path class="link-flow" d="' + d + '"/></g>';
    });
    outY.forEach(function (oy) {
      var y = oy + outH / 2;
      var d = 'M' + (ex + er) + ' ' + ey + ' C ' + (ex + er + 70) + ' ' + ey + ', ' + (outX - 70) + ' ' + y + ', ' + outX + ' ' + y;
      html += '<g class="frag frag--fade" data-step="6"><path class="link link--out" d="' + d + '"/><path class="link-flow link-flow--out" d="' + d + '"/></g>';
    });
    html += '</svg>';
    s.signals.forEach(function (sig, i) {
      html += '<div class="sig card frag" data-step="' + (i + 1) + '" style="top:' + (i * (cardH + gap)) + 'px;width:' + cardW + 'px;height:' + cardH + 'px">' +
        '<span class="sig-num">' + (i + 1) + '</span><span class="icon-badge icon-badge--sm">' + icon(sig.icon) + '</span>' +
        '<span class="sig-text"><strong>' + fmt(sig.title) + '</strong><small>' + fmt(sig.text) + '</small></span></div>';
    });
    html += '<div class="engine-core" style="left:' + (ex - er) + 'px;top:' + (ey - er) + 'px;width:' + (er * 2) + 'px;height:' + (er * 2) + 'px">' +
      '<span class="engine-ring"></span>' + icon('engine', 'engine-icon') + '<strong>' + fmt(s.engine.title) + '</strong></div>';
    html += '<p class="engine-caption frag" data-step="6" style="left:' + (ex - 230) + 'px;top:' + (ey + er + 20) + 'px">' +
      '<span class="sig-num">6</span>' + fmt(s.engine.text) + '</p>';
    s.outputs.forEach(function (o, i) {
      html += '<div class="out card frag" data-step="6" style="left:' + outX + 'px;top:' + outY[i] + 'px;width:' + outW + 'px;height:' + outH + 'px">' +
        '<span class="icon-badge icon-badge--sm icon-badge--solid">' + icon(o.icon) + '</span><strong>' + fmt(o.title) + '</strong></div>';
    });
    html += '<p class="engine-footer frag" data-step="6" style="left:' + outX + 'px;top:' + (outY[1] + outH + 40) + 'px;width:' + outW + 'px">' + fmt(s.footer) + '</p>';
    html += '</div>';
    return { html: head(s, 'slide-head--row') + html };
  };

  /* 6. Heat Smart ---------------------------------------------------- */
  var uid = 0;
  R.heatsmart = function (s) {
    var t0 = s.presets[0].time;
    var sid = 'hs-slider-' + (++uid);
    var presets = s.presets.map(function (p, i) {
      return '<button type="button" class="pill preset" data-step-target="' + i + '" data-time="' + p.time + '">' +
        esc(p.label) + ' <small>' + City.formatClock(p.time) + '</small></button>';
    }).join('');
    return {
      steps: s.presets.length - 1,
      html:
        '<div class="split">' +
          '<div class="split-text">' + head(s) +
            '<div class="time-card card" data-no-nav>' +
              '<div class="time-top">' + sunDial('sundial--hs') +
                '<div class="time-read"><span class="time-big">' + City.formatClock(t0) + '</span><span class="time-phrase"></span></div></div>' +
              '<label class="time-label" for="' + sid + '">' + fmt(s.sliderLabel) + '</label>' +
              '<input id="' + sid + '" class="time-slider" type="range" min="420" max="1230" step="5" value="' + Math.round(t0 * 60) + '">' +
              '<div class="presets">' + presets + '</div>' +
            '</div>' +
          '</div>' +
          '<figure class="map-card">' +
            cityMap({ time: t0, fast: true, cool: 'all', markers: true, labels: { start: byId('solution').start, end: byId('solution').end } }) +
            '<span class="map-chip map-chip--note">' + icon('info-circle') + fmt(C.meta.illustration) + '</span>' +
            '<div class="map-legend">' +
              '<span class="lg lg--cool"><i></i>' + fmt(s.legendCool) + '</span>' +
              '<span class="lg lg--fast"><i></i>' + fmt(s.legendFast) + '</span>' +
              '<span class="lg lg--shade"><i></i>' + fmt(s.legendShade) + '</span>' +
            '</div>' +
            '<figcaption class="map-caption">' + fmt(s.caption) + '</figcaption>' +
          '</figure>' +
        '</div>',
      ctrl: function (el) {
        var shadows = el.querySelector('.city-shadows');
        var slider = el.querySelector('.time-slider');
        var big = el.querySelector('.time-big');
        var phrase = el.querySelector('.time-phrase');
        var dial = el.querySelector('.sundial');
        var cands = el.querySelectorAll('.route-cand');
        var presetBtns = el.querySelectorAll('.preset');
        var current = t0;
        var rec = null;
        var cancel = function () {};

        function phraseFor(time) {
          var p = s.sunPhrases;
          if (time < 11.5) return p.morning;
          if (time < 15) return p.midday;
          if (time < 19) return p.afternoon;
          return p.evening;
        }

        function draw(time) {
          current = time;
          shadows.setAttribute('d', shadowD(time));
          big.textContent = City.formatClock(time);
          phrase.textContent = phraseFor(time);
          setDial(dial, time);
          slider.value = Math.round(time * 60);
          var res = City.coolerAt(time);
          // hysteresis: only switch when another street is clearly shadier
          if (!rec || (res.id !== rec && res.scores[res.id] > (res.scores[rec] || 0) + 0.02)) rec = res.id;
          Array.prototype.forEach.call(cands, function (g) {
            g.classList.toggle('is-rec', g.getAttribute('data-route') === rec);
          });
          Array.prototype.forEach.call(presetBtns, function (b) {
            b.classList.toggle('is-active', Math.abs(parseFloat(b.getAttribute('data-time')) - time) < 0.05);
          });
        }

        function goTime(time, instant) {
          cancel();
          if (instant) { rec = null; draw(time); return; }
          cancel = tween(current, time, 1100, draw);
        }

        slider.addEventListener('input', function () {
          cancel();
          draw(parseInt(slider.value, 10) / 60);
        });
        // release focus after dragging so clicker / arrow keys go back to the deck
        slider.addEventListener('pointerup', function () { slider.blur(); });
        slider.addEventListener('change', function () { if (!slider.matches(':focus-visible')) slider.blur(); });
        Array.prototype.forEach.call(presetBtns, function (b) {
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            goTime(parseFloat(b.getAttribute('data-time')));
            if (e.detail) b.blur();
          });
        });

        return {
          enter: function (step) { goTime(s.presets[step].time, true); },
          step: function (step) { goTime(s.presets[step].time); },
          leave: function () { cancel(); },
          final: function () { goTime(s.presets[s.presets.length - 1].time, true); }
        };
      }
    };
  };

  /* 7. Accessible ---------------------------------------------------- */
  R.accessible = function (s) {
    var time = byId('solution').time;
    var cool = City.coolerAt(time).id;
    return {
      steps: 2,
      html:
        '<div class="split">' +
          '<div class="split-text">' + head(s) +
            '<ul class="legend-list">' +
              '<li class="lg lg--stairs frag" data-step="1"><span class="icon-badge icon-badge--sm icon-badge--hot">' + icon('stairs') + '</span>' + fmt(s.legendStairs) + '</li>' +
              '<li class="lg lg--steep frag" data-step="1"><span class="icon-badge icon-badge--sm icon-badge--hot">' + icon('mountain') + '</span>' + fmt(s.legendSteep) + '</li>' +
              '<li class="lg lg--access frag" data-step="2"><span class="icon-badge icon-badge--sm icon-badge--access">' + icon('wheelchair') + '</span>' + fmt(s.legendAccess) + '</li>' +
            '</ul>' +
          '</div>' +
          '<figure class="map-card">' +
            cityMap({ time: time, fast: true, cool: cool, access: true, markers: true, labels: { start: byId('solution').start, end: byId('solution').end } }) +
            '<div class="mode-tabs" aria-hidden="true"><span class="mode-tab mode-tab--heat">' + icon('sun') + fmt(s.tabHeat) + '</span>' +
              '<span class="mode-tab mode-tab--access">' + icon('wheelchair') + fmt(s.tabAccess) + '</span></div>' +
            '<figcaption class="map-caption">' + fmt(s.caption) + '</figcaption>' +
          '</figure>' +
        '</div>'
    };
  };

  /* 8. Planning ------------------------------------------------------ */
  R.planning = function (s) {
    var tiles = s.features.map(function (f, i) {
      return '<article class="card tile stagger" style="--i:' + i + '"><span class="icon-badge">' + icon(f.icon) + '</span>' +
        '<h3 class="card-title">' + fmt(f.title) + '</h3><p class="card-text">' + fmt(f.text) + '</p></article>';
    }).join('');
    return { html: head(s) + '<div class="tile-grid">' + tiles + '</div>' };
  };

  /* 9. Web and Android ----------------------------------------------- */
  R.platforms = function (s) {
    var chips = s.chips.map(function (c, i) {
      return '<li class="platform stagger" style="--i:' + (i + 2) + '"><span class="icon-badge icon-badge--sm' + (c.live ? '' : ' icon-badge--muted') + '">' + icon(c.icon) + '</span>' +
        '<span class="platform-text"><strong>' + fmt(c.label) + '</strong>' + (c.note ? '<small>' + fmt(c.note) + '</small>' : '') + '</span>' +
        '<span class="status ' + (c.live ? 'status--live' : 'status--planned') + '">' + fmt(c.status) + '</span></li>';
    }).join('');
    return {
      html:
        '<div class="platforms">' +
          '<div class="devices">' +
            '<div class="laptop"><div class="laptop-screen"><img src="' + esc(s.screenWeb) + '" alt="' + esc(s.screenWebAlt) + '" draggable="false"></div><div class="laptop-base"></div></div>' +
            '<div class="phone"><div class="phone-screen"><img src="' + esc(s.screenPhone) + '" alt="' + esc(s.screenPhoneAlt) + '" draggable="false"></div></div>' +
            '<p class="map-caption devices-caption">' + fmt(s.caption) + '</p>' +
          '</div>' +
          '<div class="platforms-text">' + head(s) + '<ul class="platform-list">' + chips + '</ul></div>' +
        '</div>'
    };
  };

  /* 10. Who it is for ------------------------------------------------- */
  R.audience = function (s) {
    var cards = s.personas.map(function (p, i) {
      return '<article class="card persona stagger" style="--i:' + i + '"><span class="icon-badge">' + icon(p.icon) + '</span>' +
        '<h3 class="card-title">' + fmt(p.title) + '</h3><p class="card-text">' + fmt(p.text) + '</p></article>';
    }).join('');
    return {
      steps: 1,
      html:
        '<div class="audience">' +
          '<div class="audience-left">' + head(s) + '<div class="persona-grid">' + cards + '</div></div>' +
          '<figure class="map-card europe-card frag" data-step="1">' +
            '<h3 class="map-title">' + fmt(s.mapTitle) + '</h3>' + europeMap(s.lisbonLabel) +
            '<div class="map-legend"><span class="lg lg--covered"><i></i>' + fmt(s.mapLegend) + '</span></div>' +
          '</figure>' +
        '</div>'
    };
  };

  /* 11. Why GreenRah is different ------------------------------------ */
  R.different = function (s) {
    function cell(v, col) {
      if (v === 'yes') return '<span class="mark mark--yes' + (col === 0 ? ' mark--brand' : '') + '">' + icon('check') + '<span class="sr-only">Yes</span></span>';
      if (v === 'no') return '<span class="mark mark--no">' + icon('x') + '<span class="sr-only">No</span></span>';
      return '<span class="mark mark--info">' + fmt(v) + '</span>';
    }
    var headRow = '<tr><th scope="col"><span class="sr-only">Feature</span></th>' + s.columns.map(function (c, i) {
      return '<th scope="col" class="' + (i === 0 ? 'col-brand' : '') + '">' + fmt(c) + '</th>';
    }).join('') + '</tr>';
    var rows = s.rows.map(function (r, i) {
      return '<tr class="frag" data-step="' + (i + 1) + '"><th scope="row">' + fmt(r.label) + '</th>' +
        r.values.map(function (v, j) { return '<td class="' + (j === 0 ? 'col-brand' : '') + '">' + cell(v, j) + '</td>'; }).join('') + '</tr>';
    }).join('');
    return {
      html: head(s) +
        '<div class="compare-wrap"><span class="compare-highlight" aria-hidden="true"></span><table class="compare"><thead>' + headRow + '</thead><tbody>' + rows + '</tbody></table></div>' +
        '<p class="footnote">' + fmt(s.footnote) + '</p>'
    };
  };

  /* 12. Traction ----------------------------------------------------- */
  R.traction = function (s) {
    var facts = s.facts.map(function (f, i) {
      var val = f.count != null ? '<span data-count="' + f.count + '">' + f.count + '</span>' : fmt(f.value);
      return '<article class="card fact stagger" style="--i:' + i + '"><span class="icon-badge icon-badge--sm">' + icon(f.icon) + '</span>' +
        '<p class="fact-value">' + val + '</p><p class="fact-label">' + fmt(f.label) + '</p></article>';
    }).join('');
    var coverage = s.coverage.map(function (m) {
      return '<article class="card coverage-item"><span class="icon-badge">' + icon(m.icon) + '</span>' +
        '<p class="coverage-value"><span data-count="' + m.count + '">' + fmtCount(m.count) + '</span>' + esc(m.suffix || '') + '</p>' +
        '<p class="fact-label">' + fmt(m.label) + '</p></article>';
    }).join('');
    return {
      steps: 1,
      html: head(s) +
        '<div class="fact-grid">' + facts + '</div>' +
        '<div class="coverage frag" data-step="1"><p class="card-kicker">' + icon('world') + fmt(s.coverageTitle) + '</p>' +
          '<div class="coverage-grid">' + coverage + '</div></div>' +
        '<p class="event frag" data-step="1">' + icon('flag') + fmt(s.event) + '</p>',
      ctrl: function (el) {
        return {
          enter: function () { countUpIn(el.querySelector('.fact-grid')); },
          step: function (st) { if (st === 1) countUpIn(el.querySelector('.coverage-grid')); }
        };
      }
    };
  };

  /* 13. For cities --------------------------------------------------- */
  R.cities = function (s) {
    var insights = s.insights.map(function (u, i) {
      return '<li class="insight stagger" style="--i:' + i + '">' + icon(u.icon) + '<span>' + fmt(u.text) + '</span></li>';
    }).join('');
    var chips = s.useCases.map(function (u, i) {
      return '<li class="use-case frag" data-step="1" style="transition-delay:' + (i * 90) + 'ms">' + icon(u.icon) + fmt(u.label) + '</li>';
    }).join('');
    return {
      steps: 1,
      html:
        '<div class="split split--wide-map">' +
          '<div class="split-text">' + head(s) + '<ul class="insights">' + insights + '</ul><ul class="use-cases">' + chips + '</ul></div>' +
          '<figure class="map-card lisbon-card">' + lisbonGrid() +
            '<span class="map-chip map-chip--note">' + icon('info-circle') + fmt(C.meta.illustration) + '</span>' +
            '<div class="map-legend"><span class="lg-scale"><span>' + fmt(s.legendLow) + '</span><i></i><span>' + fmt(s.legendHigh) + '</span></span></div>' +
            '<figcaption class="map-caption">' + fmt(s.caption) + '</figcaption>' +
          '</figure>' +
        '</div>'
    };
  };

  /* 14. Business model and roadmap ----------------------------------- */
  R.model = function (s) {
    var plans = s.plans.map(function (p, i) {
      return '<article class="card plan stagger' + (i === 0 ? ' plan--free' : '') + '" style="--i:' + i + '">' +
        '<div class="plan-top"><span class="icon-badge icon-badge--sm">' + icon(p.icon) + '</span>' +
        '<span class="status ' + (p.live ? 'status--live' : 'status--planned') + '">' + fmt(p.status) + '</span></div>' +
        '<p class="plan-price">' + fmt(p.price) + '</p><h3 class="card-title">' + fmt(p.name) + '</h3><p class="card-text">' + fmt(p.text) + '</p></article>';
    }).join('');
    var n = s.timeline.length;
    var ms = s.timeline.map(function (m, i) {
      return '<li class="milestone' + (i === 0 ? ' milestone--now' : '') + '" style="left:' + (i / (n - 1) * 100) + '%;transition-delay:' + (250 + i * 160) + 'ms">' +
        '<span class="ms-dot"></span><span class="ms-label">' + fmt(m.label) + '</span><strong>' + fmt(m.title) + '</strong><small>' + fmt(m.when) + '</small></li>';
    }).join('');
    return {
      steps: 1,
      html: head(s) + '<div class="plan-grid">' + plans + '</div>' +
        '<div class="timeline frag frag--fade" data-step="1"><span class="tl-line"><i></i></span><ol>' + ms + '</ol></div>'
    };
  };

  /* 15. Team, ask, contact ------------------------------------------- */
  R.contact = function (s) {
    var team = s.team.map(function (m) {
      var face = m.photo
        ? '<span class="avatar avatar--photo"><img src="' + esc(m.photo) + '" alt="' + esc(m.name) + '" draggable="false"></span>'
        : '<span class="avatar">' + esc(m.initials) + '</span>';
      return '<div class="person">' + face + '<span><strong>' + fmt(m.name) + '</strong><small>' + fmt(m.role) + '</small></span></div>';
    }).join('');
    return {
      steps: 1,
      html: head(s) +
        '<div class="contact-grid">' +
          '<article class="card contact-card stagger" style="--i:0"><p class="card-kicker">' + icon('users') + 'Team</p>' + team + '</article>' +
          '<article class="card contact-card stagger" style="--i:1"><p class="card-kicker">' + icon('rocket') + fmt(s.askTitle) + '</p>' +
            '<p class="ask">' + fmt(s.ask) + '</p><p class="card-text">' + fmt(s.useOfFunds) + '</p>' +
            '<p class="card-kicker card-kicker--gap">' + icon('heart-handshake') + fmt(s.partnersTitle) + '</p><p class="card-text">' + fmt(s.partners) + '</p></article>' +
          '<article class="card contact-card contact-card--qr stagger" style="--i:2">' +
            '<div class="qr-wrap">' + qrSvg(C.meta.qrUrl || C.meta.appUrl) + '</div>' +
            '<div class="contact-lines"><p class="qr-label">' + fmt(s.qrLabel) + '</p>' +
              '<p class="contact-line">' + icon('world-www') + fmt(C.meta.website) + '</p>' +
              '<p class="contact-line">' + icon('mail') + fmt(s.email) + '</p>' +
              '<p class="legal">' + fmt(C.meta.legal) + ' · ' + fmt(C.meta.registry) + ' · ' + fmt(C.meta.country) + '</p></div>' +
          '</article>' +
        '</div>' +
        '<p class="closing frag" data-step="1">' + fmt(s.closing) + '</p>'
    };
  };

  /* =================================================================
     4. DECK
     ================================================================= */

  function Deck(stage, opts) {
    this.stage = stage;
    this.opts = opts || {};
    this.index = -1;
    this.step = 0;
    this.items = [];
    this.onChange = null;
    this.build();
  }

  Deck.prototype.build = function () {
    var self = this;
    var html = '';
    var defs = C.slides.map(function (s, i) {
      var r = R[s.id] ? R[s.id](s) : { html: head(s) };
      html += '<section class="slide slide--' + s.id + ' is-future" data-index="' + i + '" aria-roledescription="slide" aria-label="' +
        esc((i + 1) + ' of ' + C.slides.length + ': ' + resolve(s.title).replace(/\[\[|\]\]/g, '')) + '" inert>' + r.html + '</section>';
      return r;
    });
    this.stage.insertAdjacentHTML('afterbegin', '<div class="slides">' + html + '</div>');
    var els = this.stage.querySelectorAll('.slide');
    defs.forEach(function (r, i) {
      var el = els[i];
      var frags = Array.prototype.slice.call(el.querySelectorAll('.frag[data-step]'));
      var max = 0;
      frags.forEach(function (f) { max = Math.max(max, parseInt(f.getAttribute('data-step'), 10)); });
      var steps = r.steps != null ? Math.max(r.steps, max) : max;
      var ctrl = r.ctrl ? r.ctrl(el, self) : null;
      self.items.push({ el: el, frags: frags, steps: steps, ctrl: ctrl || {} });
    });
  };

  Deck.prototype.count = function () { return this.items.length; };

  Deck.prototype.applyStep = function (item, step) {
    item.frags.forEach(function (f) {
      f.classList.toggle('is-shown', parseInt(f.getAttribute('data-step'), 10) <= step);
    });
    for (var k = 1; k <= 9; k++) item.el.classList.toggle('s' + k, k <= step);
  };

  Deck.prototype.go = function (index, step, silent) {
    var n = this.items.length;
    index = Math.max(0, Math.min(n - 1, index | 0));
    var item = this.items[index];
    step = step === 'last' ? item.steps : Math.max(0, Math.min(item.steps, step | 0));
    var prevIndex = this.index;
    var prevStep = this.step;
    if (index === prevIndex && step === prevStep) return;

    if (index !== prevIndex) {
      var old = this.items[prevIndex];
      if (old && old.ctrl.leave) old.ctrl.leave();
      this.items.forEach(function (it, i) {
        it.el.classList.toggle('is-active', i === index);
        it.el.classList.toggle('is-past', i < index);
        it.el.classList.toggle('is-future', i > index);
        if (i === index) { it.el.removeAttribute('inert'); it.el.removeAttribute('aria-hidden'); }
        else { it.el.setAttribute('inert', ''); it.el.setAttribute('aria-hidden', 'true'); }
      });
      this.index = index;
      this.step = step;
      this.applyStep(item, step);
      if (item.ctrl.enter) item.ctrl.enter(step);
    } else {
      this.step = step;
      this.applyStep(item, step);
      if (item.ctrl.step) item.ctrl.step(step, step > prevStep ? 1 : -1);
    }
    this.stage.setAttribute('data-slide', C.slides[index].id);
    if (this.onChange && !silent) this.onChange(index, step);
  };

  Deck.prototype.target = function (dir) {
    var item = this.items[this.index];
    if (dir > 0) {
      if (this.step < item.steps) return [this.index, this.step + 1];
      if (this.index < this.items.length - 1) return [this.index + 1, 0];
      return null;
    }
    if (this.step > 0) return [this.index, this.step - 1];
    if (this.index > 0) return [this.index - 1, this.items[this.index - 1].steps];
    return null;
  };

  Deck.prototype.next = function () { var t = this.target(1); if (t) this.go(t[0], t[1]); };
  Deck.prototype.prev = function () { var t = this.target(-1); if (t) this.go(t[0], t[1]); };

  /** Put every slide in its final state (print / PDF). */
  Deck.prototype.showAll = function () {
    var self = this;
    this.items.forEach(function (it) {
      if (it.ctrl.leave) it.ctrl.leave();
      it.el.classList.add('is-active');
      it.el.classList.remove('is-past', 'is-future');
      self.applyStep(it, it.steps);
      if (it.ctrl.final) it.ctrl.final();
    });
  };

  Deck.prototype.restore = function () {
    var i = this.index;
    var s = this.step;
    this.items.forEach(function (it) { it.el.classList.remove('is-active'); });
    this.index = -1;
    this.go(i, s, true);
  };

  /* Sync between main and presenter windows ---------------------------- */

  var Sync = (function () {
    var id = Math.random().toString(36).slice(2);
    var seq = 0;
    var handlers = [];
    var peers = [];
    var seen = {};
    var bc = null;
    function receive(m) {
      if (!m || !m.__gr || m.src === id) return;
      var key = m.src + ':' + m.seq;
      if (seen[key]) return;
      seen[key] = 1;
      handlers.forEach(function (h) { h(m); });
    }
    try {
      bc = new BroadcastChannel('greenrah-pitch');
      bc.onmessage = function (e) { receive(e.data); };
    } catch (e) { bc = null; }
    window.addEventListener('message', function (e) { receive(e.data); });
    function send(m) {
      m.__gr = 1; m.src = id; m.seq = ++seq;
      if (bc) { try { bc.postMessage(m); } catch (e) { /* ignore */ } }
      // postMessage fallback for browsers where file:// pages do not share a BroadcastChannel
      peers.forEach(function (w) { try { if (w && !w.closed) w.postMessage(m, '*'); } catch (e) { /* ignore */ } });
      if (window.opener) { try { window.opener.postMessage(m, '*'); } catch (e) { /* ignore */ } }
    }
    return {
      send: send,
      on: function (h) { handlers.push(h); },
      addPeer: function (w) { if (peers.indexOf(w) < 0) peers.push(w); }
    };
  })();

  /* Theme and motion ---------------------------------------------------- */

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    store('gr-theme', t);
  }
  function toggleTheme() {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    return next;
  }
  function applyMotion(reduce) {
    root.classList.toggle('reduce-motion', !!reduce);
  }

  function initPrefs() {
    applyTheme(store('gr-theme') || 'dark');
    var saved = store('gr-motion');
    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    applyMotion(saved ? saved === 'reduce' : !!(mq && mq.matches));
  }

  /* =================================================================
     5. MAIN WINDOW
     ================================================================= */

  function initMain() {
    var viewport = document.getElementById('viewport');
    var stage = document.getElementById('stage');
    var deck = new Deck(stage);
    var n = deck.count();
    var ui = C.ui;

    /* HUD (inside the 16:9 stage) */
    stage.insertAdjacentHTML('beforeend',
      '<div class="hud" aria-hidden="true">' + logo('hud-logo') +
      '<span class="hud-count"><b class="hud-cur">1</b> / ' + n + '</span>' +
      '<span class="hud-progress"><i></i></span></div>' +
      '<div class="toast" role="status" aria-live="polite"></div>' +
      '<div class="jump" aria-hidden="true"></div>');
    var hudCur = stage.querySelector('.hud-cur');
    var hudBar = stage.querySelector('.hud-progress i');
    var toastEl = stage.querySelector('.toast');
    var jumpEl = stage.querySelector('.jump');
    var announcer = document.getElementById('announcer');
    var toastTimer = 0;

    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 1600);
    }

    /* Scale the 1920x1080 stage to fit with letterboxing */
    function fit() {
      var s = Math.min(window.innerWidth / W, window.innerHeight / H);
      stage.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
    }
    window.addEventListener('resize', fit);
    fit();

    /* State change: HUD, hash, announcer, presenter sync */
    deck.onChange = function (index, step) {
      hudCur.textContent = index + 1;
      hudBar.style.transform = 'scaleX(' + ((index + 1) / n) + ')';
      var hash = '#/' + (index + 1);
      if (location.hash !== hash) {
        try { history.replaceState(null, '', hash); } catch (e) { location.hash = hash; }
      }
      if (announcer.getAttribute('data-index') !== String(index)) {
        announcer.setAttribute('data-index', String(index));
        announcer.textContent = 'Slide ' + (index + 1) + ' of ' + n + '. ' + resolve(C.slides[index].title).replace(/\[\[|\]\]/g, '');
      }
      Sync.send({ type: 'state', index: index, step: step });
    };

    function fromHash() {
      var m = /#\/(\d+)/.exec(location.hash);
      return m ? Math.max(0, Math.min(n - 1, parseInt(m[1], 10) - 1)) : 0;
    }
    window.addEventListener('hashchange', function () {
      var i = fromHash();
      if (i !== deck.index) deck.go(i, 0);
    });

    /* Overlays: overview, help, blackout */
    var overlay = null; // 'overview' | 'help' | 'black'
    var overviewEl = null;
    var helpEl = null;
    var blackEl = document.getElementById('blackout');
    var ovSel = 0;

    function buildOverview() {
      var thumbs = C.slides.map(function (s, i) {
        var r = R[s.id] ? R[s.id](s) : { html: head(s) };
        var cls = 'slide slide--' + s.id + ' is-active show-all';
        for (var k = 1; k <= 9; k++) cls += ' s' + k;
        // a div, not a <button>: slides can contain buttons, and buttons cannot nest
        return '<div class="thumb" role="button" tabindex="0" data-index="' + i + '" aria-label="Slide ' + (i + 1) + ': ' +
          esc(resolve(s.title).replace(/\[\[|\]\]/g, '')) + '"><span class="thumb-frame"><span class="thumb-inner">' +
          '<section class="' + cls + '" inert>' + r.html + '</section></span></span><span class="thumb-num">' + (i + 1) + '</span></div>';
      }).join('');
      stage.insertAdjacentHTML('beforeend', '<div class="overlay overview" role="dialog" aria-modal="true" aria-label="All slides" hidden>' +
        '<div class="overview-grid">' + thumbs + '</div></div>');
      overviewEl = stage.querySelector('.overview');
      Array.prototype.forEach.call(overviewEl.querySelectorAll('.frag'), function (f) { f.classList.add('is-shown'); });
      overviewEl.addEventListener('click', function (e) {
        var b = e.target.closest('.thumb');
        e.stopPropagation();
        if (!b) return;
        closeOverlay();
        deck.go(parseInt(b.getAttribute('data-index'), 10), 0);
      });
    }

    function markSel() {
      Array.prototype.forEach.call(overviewEl.querySelectorAll('.thumb'), function (t, i) {
        t.classList.toggle('is-current', i === ovSel);
        if (i === ovSel) t.focus({ preventScroll: true });
      });
    }

    function buildHelp() {
      var rows = ui.shortcuts.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('');
      stage.insertAdjacentHTML('beforeend', '<div class="overlay help" role="dialog" aria-modal="true" aria-label="' + esc(ui.helpTitle) + '" hidden>' +
        '<div class="help-card card"><h2 class="help-title">' + icon('keyboard') + esc(ui.helpTitle) + '</h2><table>' + rows + '</table></div></div>');
      helpEl = stage.querySelector('.help');
      helpEl.addEventListener('click', function (e) { e.stopPropagation(); closeOverlay(); });
    }

    function openOverlay(kind) {
      closeOverlay();
      overlay = kind;
      if (kind === 'overview') {
        if (!overviewEl) buildOverview();
        overviewEl.hidden = false;
        ovSel = deck.index;
        markSel();
      } else if (kind === 'help') {
        if (!helpEl) buildHelp();
        helpEl.hidden = false;
      } else if (kind === 'black') {
        blackEl.hidden = false;
      }
      root.classList.add('has-overlay');
    }
    function closeOverlay() {
      if (overviewEl) overviewEl.hidden = true;
      if (helpEl) helpEl.hidden = true;
      blackEl.hidden = true;
      overlay = null;
      root.classList.remove('has-overlay');
    }

    /* Fullscreen */
    function toggleFullscreen() {
      var d = document;
      var fs = d.fullscreenElement || d.webkitFullscreenElement;
      if (fs) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else {
        var el = d.documentElement;
        var req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) { try { var p = req.call(el); if (p && p.catch) p.catch(function () {}); } catch (e) { /* ignore */ } }
      }
    }

    /* Presenter window */
    var presenterWin = null;
    function openPresenter() {
      var base = location.href.split('#')[0];
      var url = base + (base.indexOf('?') >= 0 ? '&' : '?') + 'presenter=1#/' + (deck.index + 1);
      presenterWin = window.open(url, 'greenrah-presenter', 'popup,width=1280,height=800');
      if (!presenterWin) { toast(ui.popupBlocked); return; }
      Sync.addPeer(presenterWin);
    }
    Sync.on(function (m) {
      if (m.type === 'hello') Sync.send({ type: 'state', index: deck.index, step: deck.step });
      else if (m.type === 'goto') deck.go(m.index, m.step);
    });

    /* Keyboard */
    var jumpBuf = '';
    var jumpTimer = 0;
    function setJump(v) {
      jumpBuf = v;
      jumpEl.textContent = v ? 'Go to ' + v : '';
      jumpEl.classList.toggle('is-on', !!v);
      clearTimeout(jumpTimer);
      if (v) jumpTimer = setTimeout(function () { setJump(''); }, 2500);
    }

    function toggleMotion() {
      var on = !root.classList.contains('reduce-motion');
      applyMotion(on);
      store('gr-motion', on ? 'reduce' : 'full');
      toast(on ? ui.motionOn : ui.motionOff);
    }

    var actions = {
      next: function () { deck.next(); },
      prev: function () { deck.prev(); },
      first: function () { deck.go(0, 0); },
      last: function () { deck.go(n - 1, 0); },
      overview: function () { overlay === 'overview' ? closeOverlay() : openOverlay('overview'); },
      help: function () { overlay === 'help' ? closeOverlay() : openOverlay('help'); },
      black: function () { overlay === 'black' ? closeOverlay() : openOverlay('black'); },
      theme: function () { toast(toggleTheme() === 'dark' ? ui.themeDark : ui.themeLight); },
      motion: toggleMotion,
      fullscreen: toggleFullscreen,
      presenter: openPresenter
    };

    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      var tag = t && t.tagName;
      var isRange = tag === 'INPUT' && t.type === 'range';
      if ((tag === 'INPUT' && !isRange) || tag === 'TEXTAREA' || tag === 'SELECT') return;
      var k = e.key;

      if (overlay === 'overview') {
        var cols = 5;
        if (k === 'ArrowRight') ovSel = Math.min(n - 1, ovSel + 1);
        else if (k === 'ArrowLeft') ovSel = Math.max(0, ovSel - 1);
        else if (k === 'ArrowDown') ovSel = Math.min(n - 1, ovSel + cols);
        else if (k === 'ArrowUp') ovSel = Math.max(0, ovSel - cols);
        else if (k === 'Enter' || k === ' ') { closeOverlay(); deck.go(ovSel, 0); e.preventDefault(); return; }
        else if (k === 'Escape' || k === 'o' || k === 'O') { closeOverlay(); e.preventDefault(); return; }
        else return;
        markSel();
        e.preventDefault();
        return;
      }
      if (overlay && (k === 'Escape' || (overlay === 'help' && (k === 'h' || k === 'H' || k === '?')) || (overlay === 'black' && (k === 'b' || k === 'B' || k === '.')))) {
        closeOverlay(); e.preventDefault(); return;
      }
      if (overlay === 'black' || overlay === 'help') {
        // any navigation key also closes the black screen / help and continues
        closeOverlay();
      }

      if (isRange && /^(Arrow(Left|Right|Up|Down)|Home|End)$/.test(k)) return; // let the slider move

      if (/^[0-9]$/.test(k)) { setJump(jumpBuf + k); e.preventDefault(); return; }

      switch (k) {
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Spacebar':
          actions.next(); break;
        case 'Enter':
          if (jumpBuf) { deck.go(parseInt(jumpBuf, 10) - 1, 0); setJump(''); }
          else if (tag === 'BUTTON' || tag === 'A') return;
          else actions.next();
          break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
          actions.prev(); break;
        case 'Home': actions.first(); break;
        case 'End': actions.last(); break;
        case 'o': case 'O': actions.overview(); break;
        case 'f': case 'F': actions.fullscreen(); break;
        case 't': case 'T': actions.theme(); break;
        case 'm': case 'M': actions.motion(); break;
        case 's': case 'S': actions.presenter(); break;
        case 'h': case 'H': case '?': actions.help(); break;
        case 'b': case 'B': case '.': actions.black(); break;
        case 'Escape': setJump(''); break;
        default: return;
      }
      e.preventDefault();
    });

    /* Toolbar (mouse / touch users) */
    var bar = document.getElementById('toolbar');
    bar.innerHTML = [
      ['prev', 'chevron-left', 'Previous'], ['next', 'chevron-right', 'Next'], ['overview', 'layout-grid', 'Overview (O)'],
      ['theme', 'contrast', 'Theme (T)'], ['motion', 'eye-off', 'Reduce motion (M)'], ['presenter', 'presentation', 'Presenter view (S)'],
      ['fullscreen', 'maximize', 'Fullscreen (F)'], ['help', 'help', 'Shortcuts (H)']
    ].map(function (b) {
      return '<button type="button" class="tool" data-action="' + b[0] + '" aria-label="' + b[2] + '" title="' + b[2] + '">' + icon(b[1]) + '</button>';
    }).join('');
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-action]');
      if (!b) return;
      e.stopPropagation();
      actions[b.getAttribute('data-action')]();
      if (e.detail) b.blur();
    });

    /* Click left / right side, and touch swipe */
    var suppressClick = false;
    var touch = null;
    viewport.addEventListener('click', function (e) {
      if (suppressClick) { suppressClick = false; return; }
      if (overlay === 'black') { closeOverlay(); return; }
      if (overlay) return;
      if (e.target.closest('a, button, input, label, select, textarea, [data-no-nav]')) return;
      var sel = window.getSelection && window.getSelection();
      if (sel && String(sel).length) return;
      if (e.clientX < window.innerWidth * 0.3) deck.prev(); else deck.next();
    });
    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch') return;
      touch = { x: e.clientX, y: e.clientY, t: Date.now() };
    });
    viewport.addEventListener('pointerup', function (e) {
      if (!touch || e.pointerType !== 'touch') return;
      var dx = e.clientX - touch.x;
      var dy = e.clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && !e.target.closest('input, [data-no-nav]')) {
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 450);
        if (dx < 0) deck.next(); else deck.prev();
      }
    });

    /* Cursor and toolbar auto-hide after 2 s */
    var idleTimer = 0;
    function wake() {
      root.classList.remove('is-idle');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { root.classList.add('is-idle'); }, 2000);
    }
    document.addEventListener('mousemove', wake);
    document.addEventListener('pointerdown', wake);
    wake();

    /* Print: every slide in final state, light theme via CSS */
    initPrint(deck);

    deck.go(fromHash(), 0);
  }

  /* =================================================================
     6. PRESENTER WINDOW
     ================================================================= */

  function initPresenter() {
    var ui = C.ui;
    document.title = ui.presenterTitle + ' · ' + C.meta.brand;
    root.classList.add('is-presenter');
    var app = document.getElementById('viewport');
    app.className = 'pv';
    app.innerHTML =
      '<header class="pv-bar">' + logo('pv-logo') + '<span class="pv-title">' + esc(ui.presenterTitle) + '</span>' +
        '<span class="pv-count"></span>' +
        '<span class="pv-timer" aria-label="Elapsed time">00:00</span>' +
        '<button type="button" class="tool pv-play" aria-label="Start or pause timer">' + icon('player-play') + '</button>' +
        '<button type="button" class="tool pv-reset" aria-label="Reset timer">' + icon('refresh') + '</button>' +
        '<span class="pv-clock" aria-label="Clock"></span></header>' +
      '<main class="pv-main">' +
        '<section class="pv-current"><div class="pv-frame"><div class="stage pv-stage"></div></div>' +
          '<div class="pv-nav"><button type="button" class="btn pv-prev">' + icon('chevron-left') + 'Previous</button>' +
          '<span class="pv-steps"></span>' +
          '<button type="button" class="btn btn--primary pv-next-btn">Next' + icon('chevron-right') + '</button></div></section>' +
        '<aside class="pv-side">' +
          '<div class="pv-next"><h2 class="pv-h">' + esc(ui.presenterNext) + '</h2><div class="pv-frame"><div class="stage pv-stage"></div></div></div>' +
          '<div class="pv-notes"><h2 class="pv-h">' + esc(ui.presenterNotes) +
            '<span class="pv-font"><button type="button" class="tool pv-smaller" aria-label="Smaller notes">A-</button>' +
            '<button type="button" class="tool pv-bigger" aria-label="Bigger notes">A+</button></span></h2>' +
            '<div class="pv-notes-text" aria-live="polite"></div></div>' +
        '</aside></main>';
    document.getElementById('toolbar').remove();

    var stages = app.querySelectorAll('.pv-stage');
    var cur = new Deck(stages[0], { preview: true });
    var nxt = new Deck(stages[1], { preview: true });
    var n = cur.count();
    var countEl = app.querySelector('.pv-count');
    var stepsEl = app.querySelector('.pv-steps');
    var notesEl = app.querySelector('.pv-notes-text');
    var nextFrame = app.querySelectorAll('.pv-frame')[1];
    var notesSize = parseInt(store('gr-notes-size') || '26', 10);

    function fitFrames() {
      Array.prototype.forEach.call(app.querySelectorAll('.pv-frame'), function (f) {
        var st = f.querySelector('.pv-stage');
        st.style.transform = 'scale(' + (f.clientWidth / W) + ')';
      });
    }
    window.addEventListener('resize', fitFrames);

    function show(index, step) {
      cur.go(index, step, true);
      if (index + 1 < n) { nextFrame.classList.remove('is-end'); nxt.go(index + 1, 0, true); }
      else nextFrame.classList.add('is-end');
      countEl.textContent = (index + 1) + ' / ' + n;
      var left = cur.items[index].steps - step;
      stepsEl.textContent = left > 0 ? left + ' ' + ui.presenterStepsLeft : (index + 1 < n ? '' : ui.presenterEnd);
      notesEl.textContent = C.slides[index].notes || '';
    }

    function goto(t) {
      if (!t) return;
      if (!timer.started) timer.start();
      show(t[0], t[1]);
      Sync.send({ type: 'goto', index: t[0], step: t[1] });
    }

    /* Timer */
    var timer = {
      started: false, running: false, base: 0, acc: 0,
      start: function () { this.started = true; this.running = true; this.base = Date.now(); paint(); },
      pause: function () { if (this.running) { this.acc += Date.now() - this.base; this.running = false; } paint(); },
      toggle: function () { if (this.running) this.pause(); else { this.started = true; this.running = true; this.base = Date.now(); } paint(); },
      reset: function () { this.acc = 0; this.base = Date.now(); paint(); },
      elapsed: function () { return this.acc + (this.running ? Date.now() - this.base : 0); }
    };
    var timerEl = app.querySelector('.pv-timer');
    var clockEl = app.querySelector('.pv-clock');
    var playBtn = app.querySelector('.pv-play');
    function paint() {
      var s = Math.floor(timer.elapsed() / 1000);
      var hh = Math.floor(s / 3600);
      var mm = Math.floor((s % 3600) / 60);
      var ss = s % 60;
      timerEl.textContent = (hh ? hh + ':' : '') + (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
      var d = new Date();
      clockEl.textContent = (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
      playBtn.innerHTML = icon(timer.running ? 'player-pause' : 'player-play');
      timerEl.classList.toggle('is-paused', timer.started && !timer.running);
    }
    setInterval(paint, 500);
    playBtn.addEventListener('click', function () { timer.toggle(); });
    app.querySelector('.pv-reset').addEventListener('click', function () { timer.reset(); });

    function setNotes(px) {
      notesSize = Math.max(18, Math.min(44, px));
      notesEl.style.fontSize = notesSize + 'px';
      store('gr-notes-size', String(notesSize));
    }
    app.querySelector('.pv-smaller').addEventListener('click', function () { setNotes(notesSize - 2); });
    app.querySelector('.pv-bigger').addEventListener('click', function () { setNotes(notesSize + 2); });
    app.querySelector('.pv-prev').addEventListener('click', function () { goto(cur.target(-1)); });
    app.querySelector('.pv-next-btn').addEventListener('click', function () { goto(cur.target(1)); });

    var jumpBuf = '';
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key;
      if (/^[0-9]$/.test(k)) { jumpBuf += k; e.preventDefault(); return; }
      switch (k) {
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': goto(cur.target(1)); break;
        case 'Enter':
          if (jumpBuf) { var i = Math.max(0, Math.min(n - 1, parseInt(jumpBuf, 10) - 1)); goto([i, 0]); jumpBuf = ''; }
          else if (e.target.tagName === 'BUTTON') return;
          else goto(cur.target(1));
          break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': goto(cur.target(-1)); break;
        case 'Home': goto([0, 0]); break;
        case 'End': goto([n - 1, 0]); break;
        case 't': case 'T': toggleTheme(); break;
        case 'Escape': jumpBuf = ''; break;
        default: return;
      }
      e.preventDefault();
    });

    Sync.on(function (m) {
      if (m.type !== 'state') return;
      if (!timer.started && (m.index !== cur.index || m.step !== cur.step)) timer.start();
      show(m.index, m.step);
    });

    var m = /#\/(\d+)/.exec(location.hash);
    setNotes(notesSize);
    fitFrames();
    show(m ? Math.max(0, Math.min(n - 1, parseInt(m[1], 10) - 1)) : 0, 0);
    Sync.send({ type: 'hello' });
    paint();
  }

  /* =================================================================
     7. PRINT
     ================================================================= */

  function initPrint(deck) {
    var printing = false;
    function before() {
      if (printing) return;
      printing = true;
      root.classList.add('is-printing');
      deck.showAll();
    }
    function after() {
      if (!printing) return;
      printing = false;
      root.classList.remove('is-printing');
      deck.restore();
    }
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    if (window.matchMedia) {
      var mq = window.matchMedia('print');
      var fn = function (e) { if (e.matches) before(); else after(); };
      if (mq.addEventListener) mq.addEventListener('change', fn);
      else if (mq.addListener) mq.addListener(fn);
    }
  }

  /* =================================================================
     8. BOOT
     ================================================================= */

  initPrefs();
  if (IS_PRESENTER) initPresenter();
  else initMain();
})();
