/**
 * NWA (National Weather Analytics) - Cinematic Atmospheric Weather Video Engine
 * High-performance, realistic multi-layered environmental weather animation engine.
 * Features:
 * - Dual-layer cinematic cross-fade engine with image preloading (zero flicker/flash)
 * - Ultra-crisp High-DPI canvas rendering with subpixel anti-aliasing
 * - Realistic environmental particle physics: Rain with surface ripples,
 *   Thunderstorm with branching lightning & sky illumination, Snow with crystalline drift,
 *   Atmospheric lake mist with Gaussian soft banks, Volumetric crepuscular sunbeams & solar motes,
 *   Starry night with sparkling stars, meteors & fireflies, and 3D tumbling autumn leaves.
 * - Accurate meteorological mapping for all WMO codes, precipitation, wind speed, and day/night.
 */
(function () {
  "use strict";

  const SCENE_IMAGES = {
    clear: "images/weather/clear.jpg",
    sunny: "images/weather/sunny.jpg",
    partly_cloudy: "images/weather/partly_cloudy.jpg",
    cloudy: "images/weather/cloudy.jpg",
    overcast: "images/weather/overcast.jpg",
    rain: "images/weather/rain.jpg",
    heavy_rain: "images/weather/heavy_rain.jpg",
    thunderstorm: "images/weather/thunderstorm.jpg",
    snow: "images/weather/snow.jpg",
    sleet: "images/weather/sleet.jpg",
    fog: "images/weather/fog.jpg",
    windy: "images/weather/windy.jpg"
  };

  let canvas = null;
  let ctx = null;
  let animId = null;
  let currentScene = "sunny";
  let activeSceneOverride = null; // null for live weather sync
  let activeLayer = "A";
  let currentLoadedImage = "";
  let frame = 0;
  let lastWeatherState = { code: 0, temp: 28, precip: 0, wind: 10, isDay: true };

  // Particle layers
  let rainDrops = [];
  let splashes = [];
  let snowFlakes = [];
  let mistBanks = [];
  let sunRays = [];
  let sunMotes = [];
  let stars = [];
  let shootingStars = [];
  let fireflies = [];
  let leaves = [];
  let windGusts = [];
  let lightning = {
    active: false,
    flashAlpha: 0,
    timer: 140,
    bolts: [],
    subFlashTimer: 0
  };

  function isNightTime() {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const istHours = (utcHours + 5.5) % 24;
    return istHours < 6.0 || istHours >= 18.5;
  }

  /**
   * Determine scene from meteorological conditions
   */
  function determineScene(code, temp, precip, wind, isDay) {
    code = parseInt(code, 10);
    if (isNaN(code)) code = 0;
    temp = Number(temp) || 28;
    precip = Number(precip) || 0;
    wind = Number(wind) || 10;
    if (isDay === undefined || isDay === null) {
      isDay = !isNightTime();
    }

    // 1. Thunderstorms with lightning (WMO 95, 96, 99)
    if (code === 95 || code === 96 || code === 99) return "thunderstorm";

    // 2. Heavy torrential downpour (WMO 65, 82, or precipitation >= 6mm)
    if (code === 65 || code === 82 || precip >= 6.0) return "heavy_rain";

    // 3. Freezing rain / sleet (WMO 56, 57, 66, 67 or near-freezing rain)
    if (code === 56 || code === 57 || code === 66 || code === 67 || (temp <= 1.5 && precip > 0 && precip < 4.0)) return "sleet";

    // 4. Snowfall & Blizzard (WMO 71, 73, 75, 77, 85, 86 or subzero precipitation)
    if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86 || (temp <= 0 && precip >= 0.1)) return "snow";

    // 5. Rain, Showers & Drizzle (WMO 51, 53, 55, 61, 63, 80, 81 or precipitation > 0.3mm)
    if ((code >= 51 && code <= 63) || code === 80 || code === 81 || precip > 0.3) return "rain";

    // 6. Fog, Mist, Haze (WMO 45, 48)
    if (code === 45 || code === 48) return "fog";

    // 7. High wind conditions (wind >= 28 km/h without active rain)
    if (wind >= 28) return "windy";

    // 8. Overcast skies (WMO 3)
    if (code === 3) return "overcast";

    // 9. Partly cloudy (WMO 2)
    if (code === 2) return "partly_cloudy";

    // 10. Mainly clear (WMO 1)
    if (code === 1) return isDay ? "partly_cloudy" : "clear";

    // 11. Clear sky (WMO 0)
    return isDay ? "sunny" : "clear";
  }

  /**
   * Dual-layer smooth image cross-fader with preloading
   */
  function setBackdropImage(scene) {
    const bgA = document.getElementById("heroCinematicBgA") || document.getElementById("heroCinematicBg");
    const bgB = document.getElementById("heroCinematicBgB");
    if (!bgA) return;

    const imgUrl = SCENE_IMAGES[scene] || SCENE_IMAGES.sunny;
    if (currentLoadedImage === imgUrl) return;

    if (!bgB) {
      // Single element mode
      bgA.style.backgroundImage = `url("${imgUrl}")`;
      bgA.classList.add("active");
      currentLoadedImage = imgUrl;
      return;
    }

    const currentEl = activeLayer === "A" ? bgA : bgB;
    const nextEl = activeLayer === "A" ? bgB : bgA;

    // Preload image before applying to guarantee seamless cross-fade
    const preloader = new Image();
    const applyFade = () => {
      nextEl.style.backgroundImage = `url("${imgUrl}")`;
      nextEl.classList.add("active");
      currentEl.classList.remove("active");
      activeLayer = activeLayer === "A" ? "B" : "A";
      currentLoadedImage = imgUrl;
    };

    preloader.onload = applyFade;
    preloader.onerror = applyFade;
    preloader.src = imgUrl;
  }

  /**
   * High-DPI Canvas Initializer
   */
  function resizeCanvas() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = parent.offsetWidth || 650;
    const h = parent.offsetHeight || 165;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }
    initParticles(w, h);
  }

  /**
   * Initialize environmental physics particle systems
   */
  function initParticles(w, h) {
    // 1. Rain (Multi-depth parallax)
    rainDrops = [];
    const isHeavy = currentScene === "heavy_rain" || currentScene === "thunderstorm";
    const totalDrops = isHeavy ? 85 : 45;

    for (let i = 0; i < totalDrops; i++) {
      const layer = i % 3;
      rainDrops.push({
        x: Math.random() * (w + 120) - 60,
        y: Math.random() * h,
        len: layer === 0 ? 22 + Math.random() * 12 : layer === 1 ? 14 + Math.random() * 8 : 10 + Math.random() * 5,
        speed: layer === 0 ? 15 + Math.random() * 5 : layer === 1 ? 11 + Math.random() * 4 : 8 + Math.random() * 3,
        alpha: layer === 0 ? 0.72 : layer === 1 ? 0.42 : 0.22,
        thick: layer === 0 ? 1.6 : layer === 1 ? 1.1 : 0.75,
        layer: layer
      });
    }

    // 2. Snowflakes (Soft crystalline motes)
    snowFlakes = [];
    for (let i = 0; i < 50; i++) {
      const isFore = i < 12;
      snowFlakes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: isFore ? 2.5 + Math.random() * 1.8 : 1.1 + Math.random() * 1.4,
        speedY: isFore ? 1.1 + Math.random() * 1.3 : 0.5 + Math.random() * 0.9,
        speedX: (Math.random() - 0.5) * 0.6,
        alpha: isFore ? 0.85 : 0.45 + Math.random() * 0.35,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03
      });
    }

    // 3. Volumetric Mist Banks
    mistBanks = [];
    for (let i = 0; i < 5; i++) {
      mistBanks.push({
        x: Math.random() * w,
        y: h * 0.45 + (Math.random() - 0.5) * (h * 0.4),
        rx: 140 + Math.random() * 180,
        ry: 28 + Math.random() * 36,
        speed: 0.18 + Math.random() * 0.24,
        alpha: 0.12 + Math.random() * 0.12
      });
    }

    // 4. Stars & Fireflies
    stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * (h * 0.65),
        r: 0.6 + Math.random() * 1.5,
        baseAlpha: 0.3 + Math.random() * 0.65,
        blinkSpeed: 0.025 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.25 ? "#93c5fd" : Math.random() < 0.5 ? "#fef08a" : "#f8fafc"
      });
    }

    fireflies = [];
    for (let i = 0; i < 12; i++) {
      fireflies.push({
        x: Math.random() * w,
        y: h * 0.5 + Math.random() * (h * 0.45),
        r: 1.8 + Math.random() * 1.4,
        alpha: 0.4 + Math.random() * 0.5,
        glowPhase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.4,
        driftY: (Math.random() - 0.5) * 0.3
      });
    }

    // 5. Sunbeams & Rising Solar Motes
    sunRays = [];
    for (let i = 0; i < 9; i++) {
      sunRays.push({
        angle: (i * Math.PI) / 4.8,
        length: Math.max(w, h) * 0.95,
        width: 0.22,
        speed: 0.0012
      });
    }

    sunMotes = [];
    for (let i = 0; i < 20; i++) {
      sunMotes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1 + Math.random() * 2,
        speedY: -(0.2 + Math.random() * 0.35),
        speedX: (Math.random() - 0.5) * 0.25,
        alpha: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      });
    }

    // 6. Windy Leaves & Gust Streamlines
    leaves = [];
    const leafColors = ["#ea580c", "#f97316", "#eab308", "#ca8a04", "#b45309"];
    for (let i = 0; i < 20; i++) {
      leaves.push({
        x: Math.random() * (w + 80) - 40,
        y: Math.random() * h,
        size: 5 + Math.random() * 6.5,
        speedX: 2.2 + Math.random() * 3.5,
        speedY: 0.2 + Math.random() * 1.3,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.14,
        flip: Math.random() * Math.PI,
        color: leafColors[Math.floor(Math.random() * leafColors.length)]
      });
    }

    windGusts = [];
    for (let i = 0; i < 4; i++) {
      windGusts.push({
        x: Math.random() * (w + 200) - 100,
        y: Math.random() * (h * 0.75),
        len: 80 + Math.random() * 110,
        speed: 3.8 + Math.random() * 2.8,
        alpha: 0.14 + Math.random() * 0.18
      });
    }

    splashes = [];
    shootingStars = [];
  }

  /* ─── ATMOSPHERIC RENDERERS ─── */

  function renderRain(w, h, angle) {
    ctx.lineCap = "round";
    rainDrops.forEach((d) => {
      ctx.strokeStyle = d.layer === 0 ? "#e2e8f0" : "#cbd5e1";
      ctx.globalAlpha = d.alpha;
      ctx.lineWidth = d.thick;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - angle * d.len, d.y + d.len);
      ctx.stroke();

      d.y += d.speed;
      d.x -= angle * d.speed;

      if (d.y > h - 4) {
        if (Math.random() < 0.32) {
          splashes.push({
            x: d.x,
            y: h - 3 - Math.random() * 5,
            r: 1,
            maxR: 3.5 + Math.random() * 4,
            alpha: 0.65
          });
        }
        d.y = -d.len - Math.random() * 25;
        d.x = Math.random() * (w + 100);
      }
    });

    // Splashes & Ripple Rings
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r, s.r * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();

      s.r += 0.55;
      s.alpha -= 0.065;
      if (s.alpha <= 0) splashes.splice(i, 1);
    }

    // Water surface reflection shimmer
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(0, h - 8, w, 8);
    ctx.restore();
  }

  function createBranchedBolt(startX, startY, endX, endY, depth) {
    if (depth > 3) return [{ x1: startX, y1: startY, x2: endX, y2: endY }];
    const segments = [];
    const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 38;
    const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 14;
    segments.push(...createBranchedBolt(startX, startY, midX, midY, depth + 1));
    segments.push(...createBranchedBolt(midX, midY, endX, endY, depth + 1));

    if (Math.random() < 0.52 && depth < 2) {
      const forkX = midX + (Math.random() - 0.5) * 65;
      const forkY = midY + 16 + Math.random() * 28;
      segments.push(...createBranchedBolt(midX, midY, forkX, forkY, depth + 2));
    }
    return segments;
  }

  function renderLightning(w, h) {
    lightning.timer--;
    if (lightning.timer <= 0) {
      lightning.active = true;
      lightning.flashAlpha = 0.78;
      lightning.subFlashTimer = 3;
      lightning.timer = 180 + Math.floor(Math.random() * 200);

      const startX = w * (0.28 + Math.random() * 0.44);
      const endX = startX + (Math.random() - 0.5) * 80;
      lightning.bolts = createBranchedBolt(startX, 0, endX, h * 0.85, 0);
    }

    if (lightning.active) {
      // Atmospheric sky glow
      ctx.globalAlpha = lightning.flashAlpha * 0.65;
      ctx.fillStyle = "rgba(224, 242, 254, 0.45)";
      ctx.fillRect(0, 0, w, h);

      // Branching bolts with cyan glow halo
      ctx.shadowColor = "rgba(56, 189, 248, 0.85)";
      ctx.shadowBlur = 14;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      lightning.bolts.forEach((seg) => {
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Multi-flash decay
      if (lightning.subFlashTimer > 0) {
        lightning.subFlashTimer--;
        if (lightning.subFlashTimer === 1) {
          lightning.flashAlpha = 0.88;
        }
      } else {
        lightning.flashAlpha -= 0.085;
      }

      if (lightning.flashAlpha <= 0) {
        lightning.active = false;
        lightning.flashAlpha = 0;
      }
    }
  }

  function renderSnow(w, h) {
    snowFlakes.forEach((f) => {
      f.wobble += f.wobbleSpeed;
      f.x += f.speedX + Math.sin(f.wobble) * 0.75;
      f.y += f.speedY;

      if (f.y > h + 6) {
        f.y = -6;
        f.x = Math.random() * w;
      }
      if (f.x > w + 6) f.x = -6;
      if (f.x < -6) f.x = w + 6;

      ctx.save();
      ctx.globalAlpha = f.alpha;
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.7, "rgba(241, 245, 249, 0.85)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function renderMist(w, h) {
    mistBanks.forEach((m) => {
      m.x += m.speed;
      if (m.x - m.rx > w) {
        m.x = -m.rx;
      }

      ctx.save();
      ctx.globalAlpha = m.alpha;
      const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.rx);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
      grad.addColorStop(0.65, "rgba(226, 232, 240, 0.22)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.rx, m.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function renderSunbeams(w, h) {
    const originX = w * 0.5;
    const originY = 6;

    // 1. Crepuscular Sun Rays
    ctx.save();
    sunRays.forEach((r, idx) => {
      r.angle += r.speed;
      ctx.globalAlpha = 0.075 + Math.sin(frame * 0.02 + idx) * 0.035;
      const grad = ctx.createRadialGradient(originX, originY, 8, originX, originY, r.length);
      grad.addColorStop(0, "rgba(253, 224, 71, 0.38)");
      grad.addColorStop(0.42, "rgba(251, 191, 36, 0.12)");
      grad.addColorStop(1, "rgba(245, 158, 11, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.arc(originX, originY, r.length, r.angle, r.angle + r.width);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();

    // 2. Rising Solar Motes
    sunMotes.forEach((m) => {
      m.y += m.speedY;
      m.x += m.speedX + Math.sin(frame * 0.02 + m.phase) * 0.22;
      if (m.y < -5) {
        m.y = h + 5;
        m.x = Math.random() * w;
      }
      const alpha = m.alpha + Math.sin(frame * 0.03 + m.phase) * 0.15;
      ctx.save();
      ctx.globalAlpha = Math.max(0.05, Math.min(0.75, alpha));
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function renderStarsAndNight(w, h) {
    // 1. Twinkling Stars
    stars.forEach((s) => {
      const alpha = s.baseAlpha + Math.sin(frame * s.blinkSpeed + s.phase) * 0.32;
      ctx.save();
      ctx.globalAlpha = Math.max(0.12, Math.min(1, alpha));
      ctx.fillStyle = s.hue;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 2. Shooting Stars (Meteors)
    if (frame % 260 === 0 && Math.random() < 0.8) {
      shootingStars.push({
        x: Math.random() * (w * 0.75),
        y: Math.random() * (h * 0.35),
        len: 45 + Math.random() * 55,
        speed: 10 + Math.random() * 5,
        alpha: 0.95
      });
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ms = shootingStars[i];
      ctx.save();
      ctx.globalAlpha = ms.alpha;
      const grad = ctx.createLinearGradient(ms.x, ms.y, ms.x - ms.len * 0.7, ms.y - ms.len * 0.35);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.3, "rgba(147, 197, 253, 0.7)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(ms.x, ms.y);
      ctx.lineTo(ms.x - ms.len * 0.7, ms.y - ms.len * 0.35);
      ctx.stroke();
      ctx.restore();

      ms.x += ms.speed * 0.7;
      ms.y += ms.speed * 0.35;
      ms.alpha -= 0.045;
      if (ms.alpha <= 0) shootingStars.splice(i, 1);
    }

    // 3. Bioluminescent Fireflies
    fireflies.forEach((f) => {
      f.x += f.driftX;
      f.y += f.driftY;
      if (Math.random() < 0.04) {
        f.driftX = (Math.random() - 0.5) * 0.5;
        f.driftY = (Math.random() - 0.5) * 0.35;
      }
      if (f.x < 0) f.x = w;
      if (f.x > w) f.x = 0;

      f.glowPhase += 0.035;
      const pulse = 0.35 + Math.sin(f.glowPhase) * 0.35;

      ctx.save();
      ctx.globalAlpha = pulse;
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 2.8);
      grad.addColorStop(0, "rgba(190, 242, 100, 0.95)");
      grad.addColorStop(0.4, "rgba(163, 230, 53, 0.45)");
      grad.addColorStop(1, "rgba(163, 230, 53, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function renderWindyLeaves(w, h) {
    // 1. Wind Gust Streamlines
    windGusts.forEach((g) => {
      ctx.save();
      ctx.globalAlpha = g.alpha;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.bezierCurveTo(g.x + g.len * 0.4, g.y - 10, g.x + g.len * 0.7, g.y + 10, g.x + g.len, g.y);
      ctx.stroke();
      ctx.restore();

      g.x += g.speed;
      if (g.x > w + 120) {
        g.x = -g.len - 30;
        g.y = Math.random() * (h * 0.75);
      }
    });

    // 2. 3D Tumbling Autumn Leaves
    leaves.forEach((l) => {
      l.x += l.speedX;
      l.y += l.speedY;
      l.rot += l.rotSpeed;
      l.flip += 0.075;

      if (l.x > w + 25) {
        l.x = -25;
        l.y = Math.random() * (h - 15);
      }
      if (l.y > h + 15) l.y = -15;

      const scaleX = Math.cos(l.flip);
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.scale(scaleX, 1);
      ctx.fillStyle = l.color;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.size, l.size * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stem vein
      ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(-l.size * 0.75, 0);
      ctx.lineTo(l.size * 0.75, 0);
      ctx.stroke();
      ctx.restore();
    });
  }

  /* ─── MAIN ANIMATION LOOP ─── */

  function render() {
    if (!ctx || !canvas) return;
    const w = canvas.clientWidth || 650;
    const h = canvas.clientHeight || 165;

    frame++;
    ctx.clearRect(0, 0, w, h);

    const activeScene = activeSceneOverride || currentScene;

    switch (activeScene) {
      case "thunderstorm":
        renderRain(w, h, 0.22);
        renderLightning(w, h);
        break;

      case "heavy_rain":
        renderRain(w, h, 0.26);
        break;

      case "rain":
        renderRain(w, h, 0.14);
        break;

      case "snow":
      case "sleet":
        renderSnow(w, h);
        if (activeScene === "sleet") renderRain(w, h, 0.15);
        break;

      case "fog":
        renderMist(w, h);
        break;

      case "windy":
        renderWindyLeaves(w, h);
        break;

      case "sunny":
        renderSunbeams(w, h);
        break;

      case "clear":
        renderStarsAndNight(w, h);
        break;

      case "partly_cloudy":
      case "overcast":
      case "cloudy":
        renderMist(w, h);
        break;

      default:
        break;
    }

    animId = requestAnimationFrame(render);
  }

  function start() {
    canvas = document.getElementById("heroCinematicCanvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    resizeCanvas();
    window.removeEventListener("resize", resizeCanvas);
    window.addEventListener("resize", resizeCanvas);

    setBackdropImage(activeSceneOverride || currentScene);

    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(render);
  }

  /**
   * Main weather state synchronization method
   */
  function update(code, temp, precip, wind, isDay) {
    lastWeatherState = { code, temp, precip, wind, isDay };
    currentScene = determineScene(code, temp, precip, wind, isDay);

    console.info(`[NWA Weather Scene] WMO:${code} | Temp:${temp}°C | Precip:${precip}mm | Wind:${wind}km/h | Day:${isDay} => Scene: "${currentScene}"`);

    if (!activeSceneOverride) {
      setBackdropImage(currentScene);
    }

    if (!canvas) {
      start();
    } else {
      initParticles(canvas.clientWidth || 650, canvas.clientHeight || 165);
    }
  }

  function setScene(sceneName) {
    if (sceneName === "auto") {
      activeSceneOverride = null;
      setBackdropImage(currentScene);
    } else if (SCENE_IMAGES[sceneName]) {
      activeSceneOverride = sceneName;
      setBackdropImage(sceneName);
    }

    if (canvas) {
      initParticles(canvas.clientWidth || 650, canvas.clientHeight || 165);
    }
  }

  // Export Global API
  window.NWAWeatherAnim = {
    update: update,
    setScene: setScene,
    getCurrentScene: function () {
      return currentScene;
    },
    getAvailableScenes: function () {
      return Object.keys(SCENE_IMAGES);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
