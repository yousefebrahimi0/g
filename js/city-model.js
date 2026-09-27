/* =====================================================================
   GreenRah pitch: illustrative city model
   ---------------------------------------------------------------------
   A simplified street grid with real sun geometry for Lisbon in July.
   Used by the Solution, Heat Smart, Accessible and Title slides.

   Nothing here is GreenRah production data. The streets are invented;
   only the sun angles are real. Shade per route is computed from the
   building shadows below, so "which route is cooler" is honest for this
   drawing, and no percentage is ever shown on screen.
   ===================================================================== */
(function (root) {
  'use strict';

  var W = 1000;
  var H = 620;
  var COLS = [70, 250, 430, 610, 790, 930]; // vertical street centre lines
  var ROWS = [70, 230, 390, 550];           // horizontal street centre lines
  // Narrow side streets, plus two wide sunny main roads: the east boulevard
  // (last column) and the riverside avenue (last row).
  var COL_W = [18, 18, 18, 18, 18, 50];
  var ROW_W = [18, 18, 18, 50];
  var STREET = 18;
  var PARK_CELL = { col: 2, row: 0 };       // a garden block, trees only
  var RIVER_Y = 585;                         // the river runs along the bottom

  /* ---------- small geometry helpers ---------- */

  function rand(seed) {
    // deterministic pseudo random in [0, 1)
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function cross(o, a, b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  }

  function convexHull(points) {
    var pts = points.slice().sort(function (p, q) {
      return p[0] === q[0] ? p[1] - q[1] : p[0] - q[0];
    });
    if (pts.length < 3) return pts;
    var lower = [];
    var upper = [];
    var i;
    for (i = 0; i < pts.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop();
      lower.push(pts[i]);
    }
    for (i = pts.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
      upper.push(pts[i]);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }

  function insideConvex(poly, p) {
    // poly is counter clockwise (from convexHull, in a y-down space it is CW, sign is consistent)
    var sign = 0;
    for (var i = 0; i < poly.length; i++) {
      var c = cross(poly[i], poly[(i + 1) % poly.length], p);
      if (c === 0) continue;
      var s = c > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
    return true;
  }

  function area(poly) {
    var s = 0;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i];
      var q = poly[(i + 1) % poly.length];
      s += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(s) / 2;
  }

  /* ---------- the city ---------- */

  function buildCity() {
    var buildings = [];
    var trees = [];
    var seed = 1;
    for (var c = 0; c < COLS.length - 1; c++) {
      for (var r = 0; r < ROWS.length - 1; r++) {
        var x0 = COLS[c] + COL_W[c] / 2;
        var x1 = COLS[c + 1] - COL_W[c + 1] / 2;
        var y0 = ROWS[r] + ROW_W[r] / 2;
        var y1 = ROWS[r + 1] - ROW_W[r + 1] / 2;
        if (c === PARK_CELL.col && r === PARK_CELL.row) {
          for (var t = 0; t < 14; t++) {
            trees.push({
              x: x0 + 14 + rand(t * 3.1) * (x1 - x0 - 28),
              y: y0 + 14 + rand(t * 7.7) * (y1 - y0 - 28),
              r: 9 + rand(t * 1.9) * 6,
              h: 8
            });
          }
          continue;
        }
        // split each block into 2 x 2 buildings with a small gap
        var mx = (x0 + x1) / 2 + (rand(seed++) - 0.5) * 30;
        var my = (y0 + y1) / 2 + (rand(seed++) - 0.5) * 30;
        var parts = [
          [x0, y0, mx - 2, my - 2],
          [mx + 2, y0, x1, my - 2],
          [x0, my + 2, mx - 2, y1],
          [mx + 2, my + 2, x1, y1]
        ];
        for (var k = 0; k < parts.length; k++) {
          var p = parts[k];
          var rect = [[p[0], p[1]], [p[2], p[1]], [p[2], p[3]], [p[0], p[3]]];
          var h = 16 + Math.round(rand(seed++) * 18);
          if (area(rect) > 140) buildings.push({ poly: rect, h: h });
        }
      }
    }
    return { buildings: buildings, trees: trees };
  }

  var CITY = buildCity();

  /* ---------- routes (polylines on street centre lines) ---------- */

  var START = [70, 550];
  var END = [930, 70];
  // The fastest walk follows the two wide main roads (fewest crossings).
  // Cooler candidates use the narrow side streets.
  var ROUTES = {
    fastest: { pts: [START, [930, 550], END], width: 50 },
    north: { pts: [START, [70, 70], END], width: STREET },
    inner: { pts: [START, [70, 390], [610, 390], [610, 70], END], width: STREET },
    mid: { pts: [START, [250, 550], [250, 230], [790, 230], [790, 70], END], width: STREET }
  };
  var COOLER_CANDIDATES = ['north', 'inner', 'mid'];

  // Accessible story: stairs and a steep block sit on the cooler route at
  // 16:30; the gentler path avoids both and still keeps some shade.
  var STAIRS = [
    { a: [250, 470], b: [250, 400] }
  ];
  var STEEP = [
    { a: [470, 230], b: [610, 230] }
  ];
  var ACCESSIBLE = { pts: [START, [430, 550], [430, 390], [790, 390], [790, 70], END], width: STREET };

  /* ---------- sun: real angles for Lisbon, 15 July ---------- */

  var LAT = 38.72 * Math.PI / 180;
  var LON = -9.14;
  var TZ = 1; // WEST, UTC+1 in summer
  var DOY = 196;

  function sunAt(clockHours) {
    var decl = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + DOY) / 365);
    var B = 2 * Math.PI * (DOY - 81) / 364;
    var eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    var solar = clockHours - TZ + LON / 15 + eot / 60;
    var Hr = (15 * (solar - 12)) * Math.PI / 180;
    var sinEl = Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(Hr);
    var el = Math.asin(sinEl);
    var az = Math.atan2(Math.sin(Hr), Math.cos(Hr) * Math.sin(LAT) - Math.tan(decl) * Math.cos(LAT)) + Math.PI;
    return { elevation: el * 180 / Math.PI, azimuth: az * 180 / Math.PI };
  }

  function shadowVector(sun, h) {
    var el = Math.max(sun.elevation, 4) * Math.PI / 180;
    var len = Math.min(h / Math.tan(el), 420);
    var az = sun.azimuth * Math.PI / 180;
    // x east, y south (SVG); shadow points away from the sun
    return [-Math.sin(az) * len, Math.cos(az) * len];
  }

  function circlePoly(x, y, r) {
    var out = [];
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * Math.PI * 2;
      out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    return out;
  }

  /** A plain block grid (used for the title background). */
  function gridBuildings(o) {
    var out = [];
    var seed = o.seed || 7;
    for (var y = o.y0; y < o.y1; y += o.cellH) {
      for (var x = o.x0; x < o.x1; x += o.cellW) {
        var bx0 = x + o.street / 2;
        var bx1 = x + o.cellW - o.street / 2;
        var by0 = y + o.street / 2;
        var by1 = y + o.cellH - o.street / 2;
        var mx = (bx0 + bx1) / 2 + (rand(seed++) - 0.5) * o.cellW * 0.25;
        [[bx0, by0, mx - 3, by1], [mx + 3, by0, bx1, by1]].forEach(function (p) {
          out.push({
            poly: [[p[0], p[1]], [p[2], p[1]], [p[2], p[3]], [p[0], p[3]]],
            h: o.hMin + Math.round(rand(seed++) * (o.hMax - o.hMin))
          });
        });
      }
    }
    return out;
  }

  function shadowsAt(clockHours, buildings, trees) {
    var sun = sunAt(clockHours);
    if (sun.elevation <= 0) return { sun: sun, polys: [] };
    var polys = [];
    (buildings || CITY.buildings).forEach(function (b) {
      var v = shadowVector(sun, b.h);
      var moved = b.poly.map(function (p) { return [p[0] + v[0], p[1] + v[1]]; });
      polys.push(convexHull(b.poly.concat(moved)));
    });
    (trees || (buildings ? [] : CITY.trees)).forEach(function (t) {
      var v = shadowVector(sun, t.h);
      var c = circlePoly(t.x, t.y, t.r);
      var moved = c.map(function (p) { return [p[0] + v[0], p[1] + v[1]]; });
      polys.push(convexHull(c.concat(moved)));
    });
    return { sun: sun, polys: polys };
  }

  function inShade(polys, p) {
    for (var i = 0; i < polys.length; i++) {
      if (insideConvex(polys[i], p)) return true;
    }
    return false;
  }

  function routeShade(route, polys) {
    var hit = 0;
    var total = 0;
    var lateral = [-route.width * 0.32, 0, route.width * 0.32];
    for (var i = 0; i < route.pts.length - 1; i++) {
      var a = route.pts[i];
      var b = route.pts[i + 1];
      var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      var n = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
      var steps = Math.max(1, Math.round(len / 8));
      for (var s = 0; s <= steps; s++) {
        var t = s / steps;
        var base = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        for (var l = 0; l < lateral.length; l++) {
          total++;
          if (inShade(polys, [base[0] + n[0] * lateral[l], base[1] + n[1] * lateral[l]])) hit++;
        }
      }
    }
    return total ? hit / total : 0;
  }

  /** Which cooler candidate has the most shade at this clock time. */
  function coolerAt(clockHours) {
    var sh = shadowsAt(clockHours);
    var best = null;
    var bestScore = -1;
    var scores = {};
    COOLER_CANDIDATES.forEach(function (id) {
      var s = routeShade(ROUTES[id], sh.polys);
      scores[id] = s;
      if (s > bestScore + 1e-9) { bestScore = s; best = id; }
    });
    scores.fastest = routeShade(ROUTES.fastest, sh.polys);
    return { id: best, scores: scores, sun: sh.sun };
  }

  /* ---------- SVG helpers ---------- */

  function polyPoints(poly) {
    return poly.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
  }

  function pathD(pts) {
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
  }

  function formatClock(h) {
    var hh = Math.floor(h);
    var mm = Math.round((h - hh) * 60);
    if (mm === 60) { hh += 1; mm = 0; }
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }

  var api = {
    W: W, H: H, COLS: COLS, ROWS: ROWS, COL_W: COL_W, ROW_W: ROW_W, STREET: STREET, RIVER_Y: RIVER_Y,
    city: CITY, routes: ROUTES, candidates: COOLER_CANDIDATES,
    start: START, end: END, stairs: STAIRS, steep: STEEP, accessible: ACCESSIBLE,
    sunAt: sunAt, shadowsAt: shadowsAt, coolerAt: coolerAt, routeShade: routeShade, gridBuildings: gridBuildings,
    polyPoints: polyPoints, pathD: pathD, formatClock: formatClock
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GRCity = api;
})(typeof window !== 'undefined' ? window : this);
