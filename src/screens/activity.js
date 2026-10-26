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
  let trackerUnsub = null;
  let isSim = false;
  let mapTileStyle = 'dark'; // 'dark' | 'standard'
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
          <span class="eyebrow">Penjejak Aktiviti Strava · OpenStreetMap</span>
          <h1 class="page-title">Larian & Laluan</h1>
        </div>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <span class="badge ok" title="Peta sumber terbuka — 100% percuma tanpa sebarang API key">${icons.pin} OpenStreetMap</span>
          ${
            stats.status === 'idle'
              ? `<label class="chip ${isSim ? 'active' : ''}" id="sim-toggle-btn" style="cursor:pointer">
                  <input type="checkbox" id="sim-checkbox" class="hidden" ${isSim ? 'checked' : ''} />
                  <span>Mod Simulasi</span>
                </label>`
              : ''
          }
        </div>
      </div>

      <!-- Kad Permintaan Kebenaran Lokasi (Jika belum dibenarkan atau ditolak) -->
      ${
        perm === 'denied'
          ? `<div class="card" style="border-left:4px solid var(--danger);margin-bottom:12px;background:#150a0a">
              <div class="row between" style="gap:10px">
                <div style="flex:1">
                  <b style="color:var(--danger)">Akses Lokasi Ditolak</b>
                  <p class="small muted" style="margin-top:2px;line-height:1.4">
                    Pelayar menyekat akses GPS. Sila benarkan kebenaran lokasi pada ikon mangga/tetapan pelayar untuk mengesan laluan larian anda.
                  </p>
                </div>
                <button type="button" class="btn btn-sm btn-secondary" id="btn-request-location-manual">
                  ${icons.crosshair}
                  <span>Cuba Lagi</span>
                </button>
              </div>
            </div>`
          : !liveLoc && perm !== 'granted'
          ? `<div class="card" style="border-left:4px solid var(--deku);margin-bottom:12px">
              <div class="row between" style="gap:10px">
                <div style="flex:1">
                  <b>Kesan Lokasi GPS Semasa</b>
                  <p class="small muted" style="margin-top:2px;line-height:1.4">
                    Tekan butang ini untuk membenarkan akses lokasi dan mengesan kedudukan anda di atas peta.
                  </p>
                </div>
                <button type="button" class="btn btn-sm btn-primary" id="btn-request-location-manual">
                  ${icons.crosshair}
                  <span>Kesan Lokasi Saya</span>
                </button>
              </div>
            </div>`
          : ''
      }

      <!-- Pemilih Gaya OpenStreetMap (Tanpa API Key) -->
      <div class="row between" style="margin-bottom:8px">
        <span class="xs muted">Lapisan Peta OpenStreetMap (Percuma):</span>
        <div class="segmented" id="osm-layer-tabs" style="width:230px;height:34px;padding:2px">
          <button type="button" data-layer="dark" class="${mapTileStyle === 'dark' ? 'active' : ''}" style="height:28px;font-size:12px">OSM Gelap</button>
          <button type="button" data-layer="standard" class="${mapTileStyle === 'standard' ? 'active' : ''}" style="height:28px;font-size:12px">OSM Standard</button>
        </div>
      </div>

      <!-- Kad Utama: Peta OpenStreetMap & HUD Terapung Ala Strava -->
      <div class="strava-map-container" style="margin-bottom:16px">
        <div id="strava-map"></div>

        <!-- Floating Recenter Button (Lokasi Saya) -->
        <button type="button" class="strava-recenter-btn" id="btn-recenter-map" title="Pusatkan ke lokasi semasa saya" aria-label="Pusatkan peta ke lokasi GPS">
          ${icons.crosshair}
        </button>

        <!-- Floating HUD Atas Peta -->
        <div class="strava-floating-hud">
          <div class="strava-hud-pill">
            <span class="badge ${stats.status === 'running' ? 'live' : stats.status === 'paused' ? 'warn' : 'ok'}">
              ${stats.status === 'running' ? 'MEREKOD' : stats.status === 'paused' ? 'DIJEDA' : 'SEDIA'}
            </span>
            <span class="num">${stats.status === 'running' ? metLabel(stats.speedKmh) : liveLoc ? `GPS ±${liveLoc.accuracy}m` : 'Mencari GPS...'}</span>
          </div>
          <div class="strava-hud-pill num">
            ${stats.speedKmh.toFixed(1)} km/j
          </div>
        </div>
      </div>

      <!-- Metrik Strava Utama (4 Kolum) -->
      <div class="grid grid-2 md-grid-4" style="margin-bottom:16px">
        <div class="stat">
          <span>Jarak Larian</span>
          <b class="num" id="hud-dist">${stats.distanceKm.toFixed(2)}<small>km</small></b>
        </div>
        <div class="stat">
          <span>Masa Berlalu</span>
          <b class="num" id="hud-time">${formatDuration(stats.elapsedSec)}</b>
        </div>
        <div class="stat">
          <span>Pace Purata</span>
          <b class="num" id="hud-pace">${formatPace(stats.pace)}<small>/km</small></b>
        </div>
        <div class="stat">
          <span>Bakar MET</span>
          <b class="num" id="hud-kcal" style="color:var(--ok)">${Math.round(stats.kcal)}<small>kcal</small></b>
        </div>
      </div>

      <div class="grid grid-2" style="margin-bottom:16px">
        <div class="stat">
          <span>Elevasi (Mendaki)</span>
          <b class="num" id="hud-elev">+${Math.round(stats.elevGain)}<small>m</small></b>
        </div>
        <div class="stat">
          <span>Langkah Anggaran</span>
          <b class="num" id="hud-steps">${stats.steps}<small>step</small></b>
        </div>
      </div>

      <!-- Butang Kawalan Aktiviti -->
      <div class="card flat" style="padding:14px;background:#0d0d0e;margin-bottom:20px">
        ${
          stats.status === 'idle'
            ? `<button type="button" class="btn btn-primary btn-lg btn-block" id="btn-start-run">
                ${icons.play}
                <span>Mula Sesi Larian</span>
              </button>`
            : stats.status === 'running'
            ? `<div class="grid grid-2">
                <button type="button" class="btn btn-secondary btn-lg" id="btn-pause-run">
                  ${icons.pause}
                  <span>Jeda</span>
                </button>
                <button type="button" class="btn btn-primary btn-lg" id="btn-finish-run">
                  ${icons.stop}
                  <span>Tamat & Simpan</span>
                </button>
              </div>`
            : `<div class="grid grid-3">
                <button type="button" class="btn btn-secondary" id="btn-resume-run">
                  ${icons.play}
                  <span>Sambung</span>
                </button>
                <button type="button" class="btn btn-primary" id="btn-finish-run">
                  ${icons.check}
                  <span>Tamat</span>
                </button>
                <button type="button" class="btn btn-danger" id="btn-discard-run">
                  ${icons.trash}
                  <span>Batal</span>
                </button>
              </div>`
        }
      </div>

      <!-- Sejarah Aktiviti Lepas (Disimpan dalam Sistem) -->
      <div class="card">
        <div class="card-title row between">
          <span>Sejarah Larian Anda</span>
          <span class="muted">${history.length} sesi tersimpan</span>
        </div>

        <div class="list">
          ${
            history.length === 0
              ? `<div class="empty">
                  ${icons.run}
                  <p>Tiada rekod larian tersimpan dalam sistem.</p>
                  <span class="small muted">Tekan "Mula Sesi Larian" untuk merekod jarak, masa, pace dan laluan GPS anda!</span>
                </div>`
              : history
                  .map(
                    (act) => `
                <div class="list-item" data-id="${act.id}" style="cursor:pointer;${inspectingActivityId === act.id ? 'border:1px solid #3897f0;background:#141b24' : ''}" title="Tekan untuk lihat laluan di peta">
                  <div class="thumb" style="width:80px;height:54px;background:#0d0d0e;border:1px solid var(--border);padding:3px;border-radius:6px">
                    ${routeThumbSVG(act.segments, { w: 80, h: 54, stroke: 2.2 })}
                  </div>
                  <div class="li-main">
                    <div class="li-title">${esc(act.type || 'Larian')} ${act.simulated ? '<span class="badge">Simulasi</span>' : ''}</div>
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
                  <button class="btn btn-icon btn-ghost btn-sm del-history-btn" data-id="${act.id}" title="Padam rekod" aria-label="Padam rekod" style="color:var(--danger)">
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

    if (mapTileStyle === 'standard') {
      // OpenStreetMap Standard Tiles (Percuma, tanpa sebarang API key)
      tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      }).addTo(map);
    } else {
      // OpenStreetMap Dark Theme Tiles (CartoDB Dark Matter berkuasakan OpenStreetMap)
      tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; CARTO',
      }).addTo(map);
    }
  }

  function updateMapGraphics(stats) {
    if (!map || !polylineLayer || !markerLayer) return;

    // Jika sedang meninjau larian arkib lama dan sesi larian tidak aktif, kekalkan paparan arkib
    if (inspectingActivityId && stats.status === 'idle') return;

    polylineLayer.clearLayers();
    markerLayer.clearLayers();

    // Garisan warna Strava
    const lineColor = mapTileStyle === 'standard' ? '#ff5a1a' : '#ffffff';

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

    // 2. Lukis penanda Mula jika sudah ada titik pertama
    if (stats.points && stats.points.length > 0) {
      const firstPt = stats.points[0];
      const startIcon = L.divIcon({
        html: '<div class="start-pin-marker">M</div>',
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([firstPt.lat, firstPt.lng], { icon: startIcon }).addTo(markerLayer);
    }

    // 3. Titik Lokasi Semasa Pengguna (Live GPS Pulsing Dot)
    const curPos = stats.points.length
      ? stats.points[stats.points.length - 1]
      : stats.liveLocation;

    if (curPos) {
      // Penanda denyutan langsung radar ala Strava / Google Maps
      const liveIcon = L.divIcon({
        html: '<div class="live-gps-dot"><div class="core"></div></div>',
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([curPos.lat, curPos.lng], { icon: liveIcon, zIndexOffset: 1000 }).addTo(markerLayer);

      // Lingkaran ketepatan GPS (accuracy circle)
      if (curPos.accuracy && curPos.accuracy > 0 && curPos.accuracy < 200) {
        L.circle([curPos.lat, curPos.lng], {
          radius: curPos.accuracy,
          color: '#3897f0',
          fillColor: '#3897f0',
          fillOpacity: 0.12,
          weight: 1,
        }).addTo(markerLayer);
      }

      // Pusat automatik sekali semasa pengesanan pertama
      if (!hasCenteredInitialGPS && stats.status === 'idle') {
        hasCenteredInitialGPS = true;
        map.setView([curPos.lat, curPos.lng], 16, { animate: true });
      }

      // Pan peta mengikut pergerakan semasa sesi larian aktif
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
      // Penanda Mula
      const startPt = allCoords[0];
      const startIcon = L.divIcon({
        html: '<div class="start-pin-marker">M</div>',
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(startPt, { icon: startIcon }).addTo(markerLayer);

      // Penanda Tamat
      const endPt = allCoords[allCoords.length - 1];
      const endIcon = L.divIcon({
        html: '<div class="finish-pin-marker">T</div>',
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(endPt, { icon: endIcon }).addTo(markerLayer);

      // Zum peta supaya muat keseluruhan laluan
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }

  function bindEvents() {
    // Tukar gaya lapisan peta OpenStreetMap
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
        toast(`Peta ditukar: OpenStreetMap ${mapTileStyle === 'standard' ? 'Standard' : 'Gelap'}`, 'info');
      });
    });

    // Butang Minta Kebenaran Lokasi Manual
    container.querySelector('#btn-request-location-manual')?.addEventListener('click', async () => {
      try {
        toast('Mengesan kedudukan GPS anda...', 'info');
        const pos = await tracker.detectLiveLocation();
        toast(`Lokasi dikesan: ±${pos.accuracy}m ketepatan.`, 'success');
        if (map) {
          map.setView([pos.lat, pos.lng], 16, { animate: true });
        }
        render();
      } catch (err) {
        toast(err.message || 'Gagal mengesan lokasi GPS.', 'error');
        render();
      }
    });

    // Butang Floating Recenter Map (Lokasi Saya)
    container.querySelector('#btn-recenter-map')?.addEventListener('click', async () => {
      const stats = tracker.getStats();
      let pos = stats.liveLocation;
      if (!pos) {
        try {
          toast('Mengesan GPS...', 'info');
          pos = await tracker.detectLiveLocation();
        } catch (e) {
          toast('GPS tidak aktif. Sila benarkan kebenaran lokasi.', 'error');
          return;
        }
      }
      if (pos && map) {
        inspectingActivityId = null; // batalkan mod arkib jika ada
        map.setView([pos.lat, pos.lng], 16, { animate: true });
        updateMapGraphics(tracker.getStats());
        toast('Peta dipusatkan ke kedudukan anda.', 'info');
      }
    });

    // Toggle Simulasi
    container.querySelector('#sim-checkbox')?.addEventListener('change', (e) => {
      isSim = e.target.checked;
      render();
    });

    // Mula Sesi Larian
    container.querySelector('#btn-start-run')?.addEventListener('click', async () => {
      inspectingActivityId = null;
      // Jika peranti belum ada lokasi dan bukan simulasi, minta lokasi
      if (!isSim && !tracker.getLiveLocation()) {
        try {
          await tracker.detectLiveLocation();
        } catch {
          // teruskan jika pengguna tetap ingin mula
        }
      }
      tracker.start({ simulate: isSim });
      toast('Sesi larian bermula! Penjejakan Strava aktif.', 'success');
      render();
    });

    // Jeda Sesi Larian
    container.querySelector('#btn-pause-run')?.addEventListener('click', () => {
      tracker.pause();
      render();
    });

    // Sambung Sesi Larian
    container.querySelector('#btn-resume-run')?.addEventListener('click', () => {
      tracker.resume();
      render();
    });

    // Tamat & Simpan Sesi Larian
    container.querySelector('#btn-finish-run')?.addEventListener('click', async () => {
      const ok = await confirmSheet({
        title: 'Tamatkan Sesi Larian?',
        message: 'Laluan, jarak, pace dan kalori dibakar akan disimpan ke dalam sistem dan ditolak daripada baki kalori harian anda.',
        confirmText: 'Tamat & Simpan',
      });
      if (ok) {
        const result = tracker.finish();
        const saved = store.addActivity(result);
        toast(`Larian berjaya disimpan: ${result.distanceKm.toFixed(2)} km · Pace ${formatPace(result.pace)}/km · ${result.kcal} kcal dibakar!`, 'success');
        onActivityFinished(saved);
        render();
      }
    });

    // Batal Sesi Larian
    container.querySelector('#btn-discard-run')?.addEventListener('click', async () => {
      const ok = await confirmSheet({
        title: 'Batal Sesi Larian?',
        message: 'Semua rekod jarak dan laluan larian ini akan dibuang.',
        confirmText: 'Batal & Buang',
        danger: true,
      });
      if (ok) {
        tracker.discard();
        toast('Sesi larian dibatalkan.', 'info');
        render();
      }
    });

    // Padam Rekod Aktiviti Sejarah
    container.querySelectorAll('.del-history-btn').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.id;
        if (inspectingActivityId === id) inspectingActivityId = null;
        store.deleteActivity(id);
        toast('Rekod larian dipadam.', 'info');
        render();
      });
    });

    // Tekan item aktiviti sejarah untuk memaparkan laluannya di atas peta
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
          toast(`Memaparkan laluan: ${act.distanceKm.toFixed(2)} km (${fmtTime(act.startedAt)})`, 'info');
          // Skrol ke peta secara lancar jika di skrin telefon
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
