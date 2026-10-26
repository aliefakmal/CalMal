// Skrin Penjejak Aktiviti Bergaya Strava (pelan §3.4) — Lokasi Langsung, Peta OpenStreetMap, Polyline & Metrik Strava
import L from 'leaflet';
import * as tracker from '../services/gpsTracker.js';
import { store } from '../services/store.js';
import { icons } from '../components/icons.js';
import { toast, confirmSheet, routeThumbSVG } from '../components/ui.js';
import { formatPace, formatDuration, metLabel, metForSpeed } from '../utils/calc.js';
import { onActivityFinished } from '../services/companionService.js';
import { esc, fmtTime } from '../utils/helpers.js';

export function renderActivity(container) {
  let map = null;
  let polylineLayer = null;
  let markerLayer = null;
  let accuracyCircle = null;
  let tileLayer = null;
  let isSim = false;
  let inspectingActivityId = null; // ID aktiviti sejarah yang sedang dipaparkan di peta
  let hasCenteredInitialGPS = false;

  function render() {
    const stats = tracker.getStats();
    const history = store.state.activities;
    const liveLoc = stats.liveLocation;
    const perm = stats.permissionStatus;

    container.innerHTML = `
      <div class="page-head">
        <div>
          <span class="eyebrow">Strava-Style Activity Tracker · OpenStreetMap</span>
          <h1 class="page-title">Runs & Routes</h1>
        </div>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <span class="badge ok" title="Open source maps — 100% free with no API key required">${icons.pin} OpenStreetMap</span>
          ${
            stats.status === 'idle'
              ? `<label class="chip ${isSim ? 'active' : ''}" id="sim-toggle-btn" style="cursor:pointer">
                  <input type="checkbox" id="sim-checkbox" class="hidden" ${isSim ? 'checked' : ''} />
                  <span>Simulation Mode</span>
                </label>`
              : ''
          }
        </div>
      </div>

      <!-- Location Permission Request Card -->
      ${
        perm === 'denied'
          ? `<div class="card" style="border-left:4px solid var(--danger);margin-bottom:12px;background:#150a0a">
              <div class="row between" style="gap:10px">
                <div style="flex:1">
                  <b style="color:var(--danger)">Location Access Denied</b>
                  <p class="small muted" style="margin-top:2px;line-height:1.4">
                    Browser blocked GPS access. Please allow location permissions in your browser site settings to track your running routes.
                  </p>
                </div>
                <button type="button" class="btn btn-sm btn-secondary" id="btn-request-location-manual">
                  ${icons.crosshair}
                  <span>Retry</span>
                </button>
              </div>
            </div>`
          : !liveLoc && perm !== 'granted'
          ? `<div class="card" style="border-left:4px solid var(--deku);margin-bottom:12px">
              <div class="row between" style="gap:10px">
                <div style="flex:1">
                  <b>Detect Live GPS Location</b>
                  <p class="small muted" style="margin-top:2px;line-height:1.4">
                    Tap to enable location access and pinpoint your real-time position on the map.
                  </p>
                </div>
                <button type="button" class="btn btn-sm btn-primary" id="btn-request-location-manual">
                  ${icons.crosshair}
                  <span>Detect My Location</span>
                </button>
              </div>
            </div>`
          : ''
      }

      <!-- OpenStreetMap Free Live GPS Map Engine (No API Key Required) -->
      <div class="row between" style="margin-bottom:8px">
        <span class="xs muted">GPS Map Engine:</span>
        <span class="badge ok" style="font-size:11px">${icons.pin} OpenStreetMap (Free · No API Key)</span>
      </div>

      <!-- Main Map & Floating Strava HUD -->
      <div class="strava-map-container" style="margin-bottom:16px">
        <div id="strava-map"></div>

        <!-- Floating Recenter Button -->
        <button type="button" class="strava-recenter-btn" id="btn-recenter-map" title="Recenter to my current location" aria-label="Recenter map to GPS location">
          ${icons.crosshair}
        </button>

        <!-- Floating HUD Overlay -->
        <div class="strava-floating-hud">
          <div class="strava-hud-pill">
            <span class="badge ${stats.status === 'running' ? 'live' : stats.status === 'paused' ? 'warn' : 'ok'}">
              ${stats.status === 'running' ? 'RECORDING' : stats.status === 'paused' ? 'PAUSED' : 'READY'}
            </span>
            <span class="num">${stats.status === 'running' ? metLabel(stats.speedKmh) : liveLoc ? `GPS ±${liveLoc.accuracy}m` : 'Acquiring GPS...'}</span>
          </div>
          <div class="strava-hud-pill num">
            ${stats.speedKmh.toFixed(1)} km/h
          </div>
        </div>
      </div>

      <!-- Primary Strava Metrics (4 Columns) -->
      <div class="grid grid-2 md-grid-4" style="margin-bottom:16px">
        <div class="stat">
          <span>Distance</span>
          <b class="num" id="hud-dist">${stats.distanceKm.toFixed(2)}<small>km</small></b>
        </div>
        <div class="stat">
          <span>Elapsed Time</span>
          <b class="num" id="hud-time">${formatDuration(stats.elapsedSec)}</b>
        </div>
        <div class="stat">
          <span>Avg Pace</span>
          <b class="num" id="hud-pace">${formatPace(stats.pace)}<small>/km</small></b>
        </div>
        <div class="stat">
          <span>MET Burn</span>
          <b class="num" id="hud-kcal" style="color:var(--ok)">${Math.round(stats.kcal)}<small>kcal</small></b>
        </div>
      </div>

      <div class="grid grid-2" style="margin-bottom:16px">
        <div class="stat">
          <span>Elevation Gain</span>
          <b class="num" id="hud-elev">+${Math.round(stats.elevGain)}<small>m</small></b>
        </div>
        <div class="stat">
          <span>Est. Steps</span>
          <b class="num" id="hud-steps">${stats.steps}<small>step</small></b>
        </div>
      </div>

      <!-- Activity Control Buttons -->
      <div class="card flat" style="padding:14px;background:#0d0d0e;margin-bottom:20px">
        ${
          stats.status === 'idle'
            ? `<button type="button" class="btn btn-primary btn-lg btn-block" id="btn-start-run">
                ${icons.play}
                <span>Start Run Session</span>
              </button>`
            : stats.status === 'running'
            ? `<div class="grid grid-2">
                <button type="button" class="btn btn-secondary btn-lg" id="btn-pause-run">
                  ${icons.pause}
                  <span>Pause</span>
                </button>
                <button type="button" class="btn btn-primary btn-lg" id="btn-finish-run">
                  ${icons.stop}
                  <span>Finish & Save</span>
                </button>
              </div>`
            : `<div class="grid grid-3">
                <button type="button" class="btn btn-secondary" id="btn-resume-run">
                  ${icons.play}
                  <span>Resume</span>
                </button>
                <button type="button" class="btn btn-primary" id="btn-finish-run">
                  ${icons.check}
                  <span>Finish</span>
                </button>
                <button type="button" class="btn btn-danger" id="btn-discard-run">
                  ${icons.trash}
                  <span>Discard</span>
                </button>
              </div>`
        }
      </div>

      <!-- Past Activity History -->
      <div class="card">
        <div class="card-title row between">
          <span>Your Run History</span>
          <span class="muted">${history.length} sessions saved</span>
        </div>

        <div class="list">
          ${
            history.length === 0
              ? `<div class="empty">
                  ${icons.run}
                  <p>No running records saved yet.</p>
                  <span class="small muted">Tap "Start Run Session" to track your distance, time, pace, and live GPS route!</span>
                </div>`
              : history
                  .map(
                    (act) => `
                <div class="list-item" data-id="${act.id}" style="cursor:pointer;${inspectingActivityId === act.id ? 'border:1px solid #3897f0;background:#141b24' : ''}" title="Tap to preview route on map">
                  <div class="thumb" style="width:80px;height:54px;background:#0d0d0e;border:1px solid var(--border);padding:3px;border-radius:6px">
                    ${routeThumbSVG(act.segments, { w: 80, h: 54, stroke: 2.2 })}
                  </div>
                  <div class="li-main">
                    <div class="li-title">${esc(act.type || 'Run')} ${act.simulated ? '<span class="badge">Simulated</span>' : ''}</div>
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
                  <button class="btn btn-icon btn-ghost btn-sm del-history-btn" data-id="${act.id}" title="Delete record" aria-label="Delete record" style="color:var(--danger)">
                    ${icons.trash}
                  </button>
                </div>`
                  )
                  .join('')
          }
        </div>
      </div>
    `;

    bindEvents();
    initMap();
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
    if (inspectingActivityId && stats.status === 'idle') return;

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
        if (inspectingActivityId) {
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
    container.querySelector('#btn-start-run')?.addEventListener('click', async () => {
      inspectingActivityId = null;
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

    if (!inspectingActivityId || st.status !== 'idle') {
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
