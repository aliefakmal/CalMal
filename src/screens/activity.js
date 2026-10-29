// Skrin Penjejak Aktiviti Bergaya Strava — Lokasi Langsung, Peta OpenStreetMap, Polyline & Metrik Strava
import L from 'leaflet';
import * as tracker from '../services/gpsTracker.js';
import { store } from '../services/store.js';
import { icons } from '../components/icons.js';
import { toast, confirmSheet, routeThumbSVG, openSheet } from '../components/ui.js';
import { formatPace, formatDuration, metLabel, metForSpeed } from '../utils/calc.js';
import { onActivityFinished } from '../services/companionService.js';
import { esc, fmtTime, todayKey } from '../utils/helpers.js';
import { dayRoutes, lastNDays } from '../utils/dayRoutes.js';

const DAY_COLORS = ['#ff5a1a', '#3ddc97', '#38bdf8', '#a78bfa', '#fbbf24'];
import { t, getLang } from '../utils/i18n.js';

export function renderActivity(container) {
  let map = null;
  let polylineLayer = null;
  let markerLayer = null;
  let accuracyCircle = null;
  let tileLayer = null;
  let isSim = false;
  let inspectingActivityId = null; // ID aktiviti sejarah yang sedang dipaparkan di peta
  // Daily path map: a date key; mutually exclusive with inspectingActivityId.
  let selectedDay = location.hash.includes('day=today') ? todayKey() : null;
  let hasCenteredInitialGPS = false;
  let trackerUnsub = null;
  let mapTileStyle = 'standard';

  function render() {
    const stats = tracker.getStats();
    const history = store.state.activities;
    const liveLoc = stats.liveLocation;
    const perm = stats.permissionStatus;
    const isEn = getLang() === 'en';

    container.innerHTML = `
      <div class="page-head row between" style="align-items:center">
        <div>
          <span class="eyebrow">${t('act_eyebrow')}</span>
          <h1 class="page-title">${t('act_title')}</h1>
        </div>
        ${
          stats.status === 'idle'
            ? `<div class="row" style="gap:8px;align-items:center">
                <label class="chip ${isSim ? 'active' : ''}" id="sim-toggle-btn" style="cursor:pointer;margin:0">
                  <input type="checkbox" id="sim-checkbox" class="hidden" ${isSim ? 'checked' : ''} />
                  <span>${isEn ? 'Simulation Mode' : 'Mod Simulasi'}</span>
                </label>
              </div>`
            : ''
        }
      </div>

      <!-- Location Permission Request Card -->
      ${
        perm === 'denied'
          ? `<div class="card" style="border-left:4px solid var(--danger);margin-bottom:12px;background:#150a0a">
              <div class="row between" style="gap:10px">
                <div style="flex:1">
                  <b style="color:var(--danger)">${isEn ? 'Location Access Denied' : 'Akses Lokasi Ditolak'}</b>
                  <p class="small muted" style="margin-top:2px;line-height:1.4">
                    ${isEn ? 'Browser blocked GPS access. Please allow location permissions in your browser site settings.' : 'Pelayar menyekat akses GPS. Sila benarkan kebenaran lokasi dalam tetapan pelayar anda.'}
                  </p>
                </div>
                <button type="button" class="btn btn-sm btn-secondary" id="btn-request-location-manual">
                  ${icons.crosshair}
                  <span>${isEn ? 'Retry' : 'Cuba Semula'}</span>
                </button>
              </div>
            </div>`
          : !liveLoc && perm !== 'granted'
          ? `<div class="card" style="border-left:4px solid var(--deku);margin-bottom:12px">
              <div class="row between" style="gap:10px">
                <div style="flex:1">
                  <b>${isEn ? 'Detect Live GPS Location' : 'Kesan Lokasi GPS Langsung'}</b>
                  <p class="small muted" style="margin-top:2px;line-height:1.4">
                    ${isEn ? 'Enable location access to pinpoint your position on the map.' : 'Benarkan akses lokasi untuk mengesan kedudukan anda di atas peta.'}
                  </p>
                </div>
                <button type="button" class="btn btn-sm btn-primary" id="btn-request-location-manual">
                  ${icons.crosshair}
                  <span>${isEn ? 'Detect Location' : 'Kesan Lokasi'}</span>
                </button>
              </div>
            </div>`
          : ''
      }

      <!-- Main Map & Floating Strava HUD -->
      <div class="strava-map-container" style="margin-bottom:16px">
        <div id="strava-map"></div>

        <!-- Floating Recenter Button -->
        <button type="button" class="strava-recenter-btn" id="btn-recenter-map" title="${isEn ? 'Recenter to my current location' : 'Pusatkan ke lokasi saya'}" aria-label="Recenter map to GPS location">
          ${icons.crosshair}
        </button>

        <!-- Floating HUD Overlay -->
        <div class="strava-floating-hud">
          <div class="strava-hud-pill">
            <span class="badge ${stats.status === 'running' ? 'live' : stats.status === 'paused' ? 'warn' : 'ok'}">
              ${stats.status === 'running' ? (isEn ? 'RECORDING' : 'MERAKAM') : stats.status === 'paused' ? (isEn ? 'PAUSED' : 'DIJEDA') : (isEn ? 'READY' : 'SEDIA')}
            </span>
            <span class="num">${stats.status === 'running' ? metLabel(stats.speedKmh) : liveLoc ? `GPS ±${liveLoc.accuracy}m` : (isEn ? 'Acquiring GPS...' : 'Mengesan GPS...')}</span>
          </div>
          <div class="strava-hud-pill num">
            ${stats.speedKmh.toFixed(1)} km/h
          </div>
        </div>
      </div>

      ${stats.status === 'idle' ? dayStripHTML(history) : ''}

      <!-- Primary Strava Metrics (4 Columns) -->
      <div class="grid grid-2 md-grid-4" style="margin-bottom:16px">
        <div class="stat">
          <span>${t('act_distance')}</span>
          <b class="num" id="hud-dist">${stats.distanceKm.toFixed(2)}<small>km</small></b>
        </div>
        <div class="stat">
          <span>${t('act_duration')}</span>
          <b class="num" id="hud-time">${formatDuration(stats.elapsedSec)}</b>
        </div>
        <div class="stat">
          <span>${t('act_pace')}</span>
          <b class="num" id="hud-pace">${formatPace(stats.pace)}<small>/km</small></b>
        </div>
        <div class="stat">
          <span>${t('act_calories')}</span>
          <b class="num" id="hud-kcal" style="color:var(--ok)">${Math.round(stats.kcal)}<small>kcal</small></b>
        </div>
      </div>

      <div class="grid grid-2" style="margin-bottom:16px">
        <div class="stat">
          <span>${isEn ? 'Elevation Gain' : 'Kenaikan Ketinggian'}</span>
          <b class="num" id="hud-elev">+${Math.round(stats.elevGain)}<small>m</small></b>
        </div>
        <div class="stat">
          <span>${isEn ? 'Est. Steps' : 'Anggaran Langkah'}</span>
          <b class="num" id="hud-steps">${stats.steps}<small>${isEn ? 'step' : 'langkah'}</small></b>
        </div>
      </div>

      <!-- Activity Control Buttons -->
      <div class="card flat" style="padding:14px;background:#0d0d0e;margin-bottom:20px">
        ${
          stats.status === 'idle'
            ? `<button type="button" class="btn btn-primary btn-lg btn-block" id="btn-start-run">
                ${icons.play}
                <span>${t('act_start')}</span>
              </button>`
            : stats.status === 'running'
            ? `<div class="grid grid-2">
                <button type="button" class="btn btn-secondary btn-lg" id="btn-pause-run">
                  ${icons.pause}
                  <span>${t('act_pause')}</span>
                </button>
                <button type="button" class="btn btn-primary btn-lg" id="btn-finish-run">
                  ${icons.stop}
                  <span>${t('act_finish')}</span>
                </button>
              </div>`
            : `<div class="grid grid-3">
                <button type="button" class="btn btn-secondary" id="btn-resume-run">
                  ${icons.play}
                  <span>${t('act_resume')}</span>
                </button>
                <button type="button" class="btn btn-primary" id="btn-finish-run">
                  ${icons.check}
                  <span>${t('act_finish')}</span>
                </button>
                <button type="button" class="btn btn-danger" id="btn-discard-run">
                  ${icons.trash}
                  <span>${t('act_discard')}</span>
                </button>
              </div>`
        }
      </div>

      <!-- Past Activity History -->
      <div class="card">
        <div class="card-title row between">
          <span>${t('act_history')}</span>
          <span class="muted">${history.length} ${isEn ? 'sessions saved' : 'sesi disimpan'}</span>
        </div>

        <div class="list">
          ${
            history.length === 0
              ? `<div class="empty">
                  ${icons.run}
                  <p>${t('act_no_runs')}</p>
                  <span class="small muted">${isEn ? 'Tap "Start Run Session" to track your distance, time, pace, and live GPS route!' : 'Tekan "Mula Lari / Jalan" untuk menjejak jarak, masa, pace dan laluan GPS anda!'}</span>
                </div>`
              : history
                  .map(
                    (act) => `
                <div class="list-item" data-id="${act.id}" style="cursor:pointer;${inspectingActivityId === act.id ? 'border:1px solid #3897f0;background:#141b24' : ''}" title="${isEn ? 'Tap to preview route on map' : 'Sentuh untuk lihat laluan di peta'}">
                  <div class="thumb" style="width:80px;height:54px;background:#0d0d0e;border:1px solid var(--border);padding:3px;border-radius:6px">
                    ${routeThumbSVG(act.segments, { w: 80, h: 54, stroke: 2.2 })}
                  </div>
                  <div class="li-main">
                    <div class="li-title">${esc(act.type || 'Run')} ${act.simulated ? `<span class="badge">${isEn ? 'Simulated' : 'Simulasi'}</span>` : ''}</div>
                    <div class="li-sub">
                      <span class="num">${act.distanceKm.toFixed(2)} km</span> · 
                      <span class="num">${formatDuration(act.durationSec)}</span> · 
                      <span class="num">${formatPace(act.pace)} /km</span>
                    </div>
                  </div>
                  <div class="li-end">
                    <b class="num" style="color:var(--ok)">-${act.kcal} <span class="xs muted">kcal</span></b>
                    <small>${fmtTime(act.startedAt)}</small>
                  </div>
                  <button class="btn btn-icon btn-ghost btn-sm del-history-btn" data-id="${act.id}" title="${t('delete')}" aria-label="Delete record" style="color:var(--danger)">
                    ${icons.trash}
                  </button>
                </div>`
                  )
                  .join('')
          }
        </div>
      </div>

      <div class="center" style="margin-top:14px">
        <button type="button" class="btn btn-ghost btn-xs" id="btn-show-activity-sources" style="color:var(--text-muted);font-size:11px">
          ${isEn ? 'Sources & Attributions' : 'Sumber & Rujukan'}
        </button>
      </div>
    `;

    bindEvents();
    initMap();
  }

  function dayStripHTML(history) {
    const locale = getLang() === 'ms' ? 'ms-MY' : 'en-GB';
    const chips = lastNDays(7)
      .map((key) => {
        const [y, m, d] = key.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const has = history.some((a) => a.date === key);
        return `<button type="button" class="day-chip ${has ? 'has-data' : ''} ${selectedDay === key ? 'active' : ''}" data-day="${key}" aria-pressed="${selectedDay === key}">
            <span>${date.toLocaleDateString(locale, { weekday: 'short' })}</span>
            <b class="num">${d}</b>
            <i class="day-dot"></i>
          </button>`;
      })
      .join('');

    let summary = '';
    if (selectedDay) {
      const r = dayRoutes(history, selectedDay);
      summary = r.sessions.length
        ? `<div class="day-summary">
            <div class="stat"><span>${t('day_sessions')}</span><b class="num">${r.sessions.length}</b></div>
            <div class="stat"><span>km</span><b class="num">${r.km.toFixed(2)}</b></div>
            <div class="stat"><span>${t('day_steps')}</span><b class="num">${r.steps}</b></div>
            <div class="stat"><span>kcal</span><b class="num" style="color:var(--ok)">${r.kcal}</b></div>
            <div class="stat"><span>${t('act_duration')}</span><b class="num">${formatDuration(r.sec)}</b></div>
          </div>`
        : `<p class="small muted" style="margin:0">${t('day_empty')}</p>`;
    }

    return `
      <div class="card stack" style="margin-bottom:16px;gap:12px">
        <div class="card-title row between" style="margin:0">
          <span>${t('day_path')}</span>
          ${selectedDay ? `<button type="button" class="btn btn-sm btn-ghost" id="btn-day-live">${icons.crosshair}<span>${t('day_live')}</span></button>` : ''}
        </div>
        <div class="day-strip" role="group" aria-label="${t('day_path')}">${chips}</div>
        ${summary}
      </div>`;
  }

  function drawDayRoutes(date) {
    if (!map || !polylineLayer || !markerLayer) return;
    polylineLayer.clearLayers();
    markerLayer.clearLayers();
    const r = dayRoutes(store.state.activities, date);
    const pin = (label, color, at) =>
      L.marker(at, {
        icon: L.divIcon({ html: `<div class="day-pin" style="background:${color}">${label}</div>`, className: '', iconSize: [22, 22], iconAnchor: [11, 11] }),
      }).addTo(markerLayer);

    // Oldest session first so colours follow the order of the day.
    [...r.sessions].sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0)).forEach((act, i) => {
      const color = DAY_COLORS[i % DAY_COLORS.length];
      const segs = (act.segments || []).filter((s) => s.length > 1);
      segs.forEach((seg) => L.polyline(seg, { color, weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(polylineLayer));
      if (segs.length) {
        pin('S', color, segs[0][0]);
        const last = segs[segs.length - 1];
        pin('F', color, last[last.length - 1]);
      }
    });
    if (r.coords.length) map.fitBounds(L.latLngBounds(r.coords), { padding: [40, 40], maxZoom: 17 });
  }

  function initMap() {
    const mapEl = container.querySelector('#strava-map');
    if (!mapEl) return;

    if (map) {
      map.remove();
      map = null;
    }

    const stats = tracker.getStats();
    const liveLoc = stats.liveLocation;
    const lastPt = stats.points[stats.points.length - 1];

    // Gunakan koordinat GPS sebenar pengguna jika dikesan, atau fallback Kuala Lumpur
    const center = lastPt
      ? [lastPt.lat, lastPt.lng]
      : liveLoc
      ? [liveLoc.lat, liveLoc.lng]
      : [3.1579, 101.7116];

    const zoomLevel = liveLoc || lastPt ? 16 : 14;

    map = L.map(mapEl, {
      center,
      zoom: zoomLevel,
      zoomControl: false,
      attributionControl: true,
    });

    applyTileLayer();

    // Group layer untuk laluan polyline Strava & penanda
    polylineLayer = L.layerGroup().addTo(map);
    markerLayer = L.layerGroup().addTo(map);

    if (selectedDay && stats.status === 'idle') {
      drawDayRoutes(selectedDay);
      return;
    }

    // Jika sedang meneliti aktiviti sejarah lepas, lukis laluannya
    if (inspectingActivityId) {
      const act = store.state.activities.find((a) => a.id === inspectingActivityId);
      if (act) {
        drawHistoryRoute(act);
        return;
      }
    }

    updateMapGraphics(stats);
  }

  function applyTileLayer() {
    if (!map) return;
    if (tileLayer) map.removeLayer(tileLayer);

    // OpenStreetMap Standard Tiles (100% Free, No API Key Required)
    tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    }).addTo(map);
  }

  function updateMapGraphics(stats) {
    if (!map || !polylineLayer || !markerLayer) return;

    // Jika sedang meninjau larian arkib lama dan sesi larian tidak aktif, kekalkan paparan arkib
    if ((inspectingActivityId || selectedDay) && stats.status === 'idle') return;

    polylineLayer.clearLayers();
    markerLayer.clearLayers();

    // Garisan warna Strava vibrant orange
    const lineColor = '#ff5a1a';

    // 1. Lukis garisan Polyline jika ada segmen larian
    if (stats.segments && stats.segments.length) {
      stats.segments.forEach((seg) => {
        if (seg.length > 1) {
          const latlngs = seg.map((p) => [p.lat, p.lng]);
          L.polyline(latlngs, {
            color: lineColor,
            weight: 5.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(polylineLayer);
        }
      });
    }

    // 2. Start marker if points exist
    if (stats.points && stats.points.length > 0) {
      const firstPt = stats.points[0];
      const startIcon = L.divIcon({
        html: '<div class="start-pin-marker">S</div>',
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([firstPt.lat, firstPt.lng], { icon: startIcon }).addTo(markerLayer);
    }

    // 3. User Current Position (Live GPS Pulsing Dot)
    const curPos = stats.points.length
      ? stats.points[stats.points.length - 1]
      : stats.liveLocation;

    if (curPos) {
      // Strava/Google Maps radar pulsing marker
      const liveIcon = L.divIcon({
        html: '<div class="live-gps-dot"><div class="core"></div></div>',
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([curPos.lat, curPos.lng], { icon: liveIcon, zIndexOffset: 1000 }).addTo(markerLayer);

      // GPS accuracy circle
      if (curPos.accuracy && curPos.accuracy > 0 && curPos.accuracy < 200) {
        L.circle([curPos.lat, curPos.lng], {
          radius: curPos.accuracy,
          color: '#3897f0',
          fillColor: '#3897f0',
          fillOpacity: 0.12,
          weight: 1,
        }).addTo(markerLayer);
      }

      // Initial auto-center on first fix
      if (!hasCenteredInitialGPS && stats.status === 'idle') {
        hasCenteredInitialGPS = true;
        map.setView([curPos.lat, curPos.lng], 16, { animate: true });
      }

      // Smooth pan following runner during active session
      if (stats.status === 'running') {
        map.panTo([curPos.lat, curPos.lng], { animate: true, duration: 0.6 });
      }
    }
  }

  function drawHistoryRoute(act) {
    if (!map || !polylineLayer || !markerLayer) return;
    polylineLayer.clearLayers();
    markerLayer.clearLayers();

    const lineColor = mapTileStyle === 'standard' ? '#ff5a1a' : '#3ddc97';
    const allCoords = [];

    (act.segments || []).forEach((seg) => {
      if (seg.length > 1) {
        const latlngs = seg.map((p) => [p[0], p[1]]);
        allCoords.push(...latlngs);
        L.polyline(latlngs, {
          color: lineColor,
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(polylineLayer);
      }
    });

    if (allCoords.length > 0) {
      // Start Marker
      const startPt = allCoords[0];
      const startIcon = L.divIcon({
        html: '<div class="start-pin-marker">S</div>',
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(startPt, { icon: startIcon }).addTo(markerLayer);

      // Finish Marker
      const endPt = allCoords[allCoords.length - 1];
      const endIcon = L.divIcon({
        html: '<div class="finish-pin-marker">F</div>',
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(endPt, { icon: endIcon }).addTo(markerLayer);

      // Fit map bounds to entire route
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }

  function bindEvents() {
    // Switch OpenStreetMap Layer Style
    container.querySelectorAll('#osm-layer-tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        mapTileStyle = btn.dataset.layer;
        container.querySelectorAll('#osm-layer-tabs button').forEach((b) => b.classList.toggle('active', b === btn));
        applyTileLayer();
        if (selectedDay) {
          drawDayRoutes(selectedDay);
        } else if (inspectingActivityId) {
          const act = store.state.activities.find((a) => a.id === inspectingActivityId);
          if (act) drawHistoryRoute(act);
        } else {
          updateMapGraphics(tracker.getStats());
        }
        toast(`Map layer switched: OpenStreetMap ${mapTileStyle === 'standard' ? 'Standard' : 'Dark'}`, 'info');
      });
    });

    // Manual Location Permission Button
    container.querySelector('#btn-request-location-manual')?.addEventListener('click', async () => {
      try {
        toast('Detecting your GPS location...', 'info');
        const pos = await tracker.detectLiveLocation();
        toast(`Location detected: ±${pos.accuracy}m accuracy.`, 'success');
        if (map) {
          map.setView([pos.lat, pos.lng], 16, { animate: true });
        }
        render();
      } catch (err) {
        toast(err.message || 'Failed to detect GPS location.', 'error');
        render();
      }
    });

    // Floating Recenter Map Button
    container.querySelector('#btn-recenter-map')?.addEventListener('click', async () => {
      const stats = tracker.getStats();
      let pos = stats.liveLocation;
      if (!pos) {
        try {
          toast('Detecting GPS...', 'info');
          pos = await tracker.detectLiveLocation();
        } catch (e) {
          toast('GPS inactive. Please enable location permission.', 'error');
          return;
        }
      }
      if (pos && map) {
        inspectingActivityId = null;
        if (selectedDay) {
          selectedDay = null;
          render();
          return;
        }
        map.setView([pos.lat, pos.lng], 16, { animate: true });
        updateMapGraphics(tracker.getStats());
        toast('Map recentered to your position.', 'info');
      }
    });

    // Toggle Simulation
    container.querySelector('#sim-checkbox')?.addEventListener('change', (e) => {
      isSim = e.target.checked;
      render();
    });

    // Start Run Session
    container.querySelectorAll('.day-chip').forEach((b) => {
      b.addEventListener('click', () => {
        selectedDay = selectedDay === b.dataset.day ? null : b.dataset.day;
        inspectingActivityId = null;
        render();
      });
    });

    container.querySelector('#btn-day-live')?.addEventListener('click', () => {
      selectedDay = null;
      render();
    });

    container.querySelector('#btn-start-run')?.addEventListener('click', async () => {
      inspectingActivityId = null;
      selectedDay = null;
      if (!isSim && !tracker.getLiveLocation()) {
        try {
          await tracker.detectLiveLocation();
        } catch {
          // continue anyway
        }
      }
      tracker.start({ simulate: isSim });
      toast('Run session started! Strava tracking active.', 'success');
      render();
    });

    // Pause Run Session
    container.querySelector('#btn-pause-run')?.addEventListener('click', () => {
      tracker.pause();
      render();
    });

    // Resume Run Session
    container.querySelector('#btn-resume-run')?.addEventListener('click', () => {
      tracker.resume();
      render();
    });

    // Finish & Save Run Session
    container.querySelector('#btn-finish-run')?.addEventListener('click', async () => {
      const ok = await confirmSheet({
        title: 'Finish Run Session?',
        message: 'Your route, distance, pace, and calories burned will be saved and credited to your daily calorie balance.',
        confirmText: 'Finish & Save',
      });
      if (ok) {
        const result = tracker.finish();
        const saved = store.addActivity(result);
        toast(`Run saved: ${result.distanceKm.toFixed(2)} km · Pace ${formatPace(result.pace)}/km · ${result.kcal} kcal burned!`, 'success');
        onActivityFinished(saved);
        render();
      }
    });

    // Discard Run Session
    container.querySelector('#btn-discard-run')?.addEventListener('click', async () => {
      const ok = await confirmSheet({
        title: 'Discard Run Session?',
        message: 'All distance and route records for this session will be discarded.',
        confirmText: 'Discard Session',
        danger: true,
      });
      if (ok) {
        tracker.discard();
        toast('Run session discarded.', 'info');
        render();
      }
    });

    // Delete History Activity Record
    container.querySelectorAll('.del-history-btn').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.id;
        if (inspectingActivityId === id) inspectingActivityId = null;
        store.deleteActivity(id);
        toast('Run record deleted.', 'info');
        render();
      });
    });

    // Click history item to preview route on map
    container.querySelectorAll('.list-item[data-id]').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const act = store.state.activities.find((a) => a.id === id);
        if (act) {
          inspectingActivityId = id;
          if (selectedDay) {
            selectedDay = null;
            render();
            return;
          }
          drawHistoryRoute(act);
          container.querySelectorAll('.list-item[data-id]').forEach((el) => {
            el.style.border = el.dataset.id === id ? '1px solid #3897f0' : '';
            el.style.background = el.dataset.id === id ? '#141b24' : '';
          });
          toast(`Showing route: ${act.distanceKm.toFixed(2)} km (${fmtTime(act.startedAt)})`, 'info');
          container.querySelector('.strava-map-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });

    // Sources Modal Trigger
    container.querySelector('#btn-show-activity-sources')?.addEventListener('click', () => {
      openSheet(`
        <div class="sheet-head row between" style="margin-bottom:12px">
          <div>
            <span class="eyebrow">References & Methodology</span>
            <h3 style="margin:2px 0 0;font-size:18px;font-weight:800">Activity Sources</h3>
          </div>
          <button type="button" class="btn btn-icon btn-ghost btn-sm" data-close aria-label="Close">
            ${icons.close}
          </button>
        </div>

        <div class="stack" style="gap:12px;font-size:13px">
          <div class="card flat" style="padding:12px;background:var(--surface-2);border-radius:10px">
            <b style="color:#fff">OpenStreetMap (OSM)</b>
            <p class="small muted" style="margin-top:4px;line-height:1.4">
              Map cartography and vector geometries are provided by OpenStreetMap contributors under the Open Database License (ODbL).
            </p>
          </div>

          <div class="card flat" style="padding:12px;background:var(--surface-2);border-radius:10px">
            <b style="color:#fff">Compendium of Physical Activities</b>
            <p class="small muted" style="margin-top:4px;line-height:1.4">
              Calorie expenditure is calculated using Metabolic Equivalent of Task (MET) based on velocity: Walking (3.5 MET), Brisk Walk (5.0 MET), Jogging (8.3 MET), and Fast Running (11.0 MET). Formula: MET × 3.5 × Weight (kg) / 200 × Minutes.
            </p>
          </div>

          <div class="card flat" style="padding:12px;background:var(--surface-2);border-radius:10px">
            <b style="color:#fff">Haversine Geodesic Distance</b>
            <p class="small muted" style="margin-top:4px;line-height:1.4">
              Pace and route distance are determined using the great-circle Haversine formula across successive high-accuracy GPS coordinates.
            </p>
          </div>
        </div>
      `);
    });
  }

  // Permulaan: Kesan kebenaran dan lokasi langsung pengguna serta-merta
  tracker.startIdleLocationWatch();
  tracker.detectLiveLocation().catch(() => {
    // Dikendalikan oleh status permission
  });

  render();

  // Kemas kini angka masa nyata daripada tracker
  trackerUnsub = tracker.subscribe((st) => {
    const dDist = container.querySelector('#hud-dist');
    const dTime = container.querySelector('#hud-time');
    const dPace = container.querySelector('#hud-pace');
    const dKcal = container.querySelector('#hud-kcal');
    const dElev = container.querySelector('#hud-elev');
    const dSteps = container.querySelector('#hud-steps');

    if (dDist) dDist.innerHTML = `${st.distanceKm.toFixed(2)}<small>km</small>`;
    if (dTime) dTime.textContent = formatDuration(st.elapsedSec);
    if (dPace) dPace.innerHTML = `${formatPace(st.pace)}<small>/km</small>`;
    if (dKcal) dKcal.innerHTML = `${Math.round(st.kcal)}<small>kcal</small>`;
    if (dElev) dElev.innerHTML = `+${Math.round(st.elevGain)}<small>m</small>`;
    if (dSteps) dSteps.innerHTML = `${st.steps}<small>step</small>`;

    if ((!inspectingActivityId && !selectedDay) || st.status !== 'idle') {
      updateMapGraphics(st);
    }
  });

  return () => {
    trackerUnsub?.();
    tracker.stopIdleLocationWatch();
    if (map) {
      map.remove();
      map = null;
    }
  };
}

