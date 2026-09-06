/**
 * NWA Panoramic Animated Weather Scenery Engine
 * Renders rich stylized illustrated landscape scenes with dynamic atmospheric physics
 * for EVERY weather condition:
 * - Thunderstorm (with volumetric purple storm light beams, branching lightning bolts, puddles, heavy rain)
 * - Heavy Downpour
 * - Rain & Drizzle
 * - Radiant Sunny Day (with rotating sun rays, butterflies, dandelion seeds)
 * - Starry Night (with crescent moon, twinkling stars, shooting meteors, fireflies)
 * - Partly Cloudy (with 2.5D drifting cumulus clouds, god rays)
 * - Overcast (with rolling cloud banks & blowing wind leaves)
 * - Snowfall & Blizzard (with snowy mushroom roof, chimney smoke, drifting snowflakes)
 * - Atmospheric Fog & Mist (with layered drifting mist waves)
 * - Extreme Heatwave (with heat shimmer waves & ember motes)
 * - Hailstorm (with bouncing ice pellets & impact bursts)
 */
(function () {
  "use strict";

  // Canvas instances
  let bannerCanvas = null, bannerCtx = null;
  let heroCanvas = null, heroCtx = null;
  let animFrameId = null;

  // State
  let currentScene = "thunder";
  let userOverrideScene = null; // null for auto-sync with live weather
  let lastWmoCode = null;
  let lastTemp = 28;
  let frameCount = 0;
  let lightningState = { active: false, alpha: 0, bolts: [], flashAlpha: 0 };
  let shootingStars = [];
  let fireflies = [];
  let rainDrops = [];
  let snowFlakes = [];
  let hailPellets = [];
  let hailImpacts = [];
  let puddles = [];
  let clouds = [];
  let fogBanks = [];
  let leaves = [];
  let butterflies = [];
  let sunRays = [];
  let chimneyPuffs = [];
  let emberParticles = [];

  /* ─── WMO CODE TO SCENE MAPPING ─── */
  function codeToScene(code, temperature, isNight) {
    code = parseInt(code) || 0;
    temperature = Number(temperature) || 28;

    // Check night conditions
    if (isNight && (code === 0 || code === 1)) return "night";
    if (code === 0) return temperature >= 38 ? "heatwave" : "sunny";
    if (code === 1) return isNight ? "night" : "sunny";
    if (code === 2) return isNight ? "night" : "partlyCloudy";
    if (code === 3) return "overcast";
    if (code === 45 || code === 48) return "fog";
    if (code >= 51 && code <= 57) return "rain";
    if (code === 61 || code === 80) return "rain";
    if (code === 63 || code === 81) return "rain";
    if (code === 65 || code === 82) return "heavyRain";
    if (code >= 66 && code <= 67) return "snow";
    if (code >= 71 && code <= 77) return "snow";
    if (code >= 85 && code <= 86) return "snow";
    if (code === 95) return "thunder";
    if (code === 96 || code === 99) return "hail";
    return "sunny";
  }

  /* ─── SCENE COLOR PALETTES & THEMES ─── */
  const SCENE_PALETTES = {
    thunder: {
      name: "Thunderstorm Active",
      desc: "Violent electric storm with branching lightning bolts, volumetric purple storm beams & heavy downpour",
      skyTop: "#17122b", skyMid: "#2e1065", skyBot: "#0f172a",
      hillFar: "#241442", hillMid: "#1e1338", hillNear: "#180f2d",
      ground: "#130a24",
      capBase: "#a855f7", capSpots: "#e9d5ff",
      houseBase: "#f5d0fe", windowGlow: "#fef08a",
      hasRain: true, rainHeavy: true, hasLightning: true, hasStormBeams: true,
      windSpeed: 2.2, puddleCount: 5,
      treeColor: "#090514", flowerColors: ["#f43f5e", "#d946ef", "#818cf8", "#38bdf8"]
    },
    heavyRain: {
      name: "Heavy Torrential Downpour",
      desc: "Intense tropical rainfall with churning storm clouds, deep water puddles & wet ground sheen",
      skyTop: "#081b2e", skyMid: "#0f2e4e", skyBot: "#081524",
      hillFar: "#0b253f", hillMid: "#081d33", hillNear: "#061525",
      ground: "#040e1a",
      capBase: "#2563eb", capSpots: "#93c5fd",
      houseBase: "#bfdbfe", windowGlow: "#fef3c7",
      hasRain: true, rainHeavy: true, hasLightning: false, hasStormBeams: false,
      windSpeed: 1.8, puddleCount: 6,
      treeColor: "#030a13", flowerColors: ["#38bdf8", "#60a5fa", "#818cf8"]
    },
    rain: {
      name: "Rainfall & Showers",
      desc: "Continuous rainfall with dynamic water ripples in puddles & soft ambient mist",
      skyTop: "#1e293b", skyMid: "#334155", skyBot: "#1e293b",
      hillFar: "#243447", hillMid: "#1e2d3d", hillNear: "#172330",
      ground: "#101923",
      capBase: "#0284c7", capSpots: "#bae6fd",
      houseBase: "#e0f2fe", windowGlow: "#fef08a",
      hasRain: true, rainHeavy: false, hasLightning: false, hasStormBeams: false,
      windSpeed: 1.0, puddleCount: 4,
      treeColor: "#0d151c", flowerColors: ["#38bdf8", "#ec4899", "#a855f7"]
    },
    sunny: {
      name: "Radiant Sunny Meadow",
      desc: "Bright golden sunshine with rotating solar rays, fluttering butterflies & floating dandelion seeds",
      skyTop: "#0284c7", skyMid: "#38bdf8", skyBot: "#bae6fd",
      hillFar: "#166534", hillMid: "#15803d", hillNear: "#16a34a",
      ground: "#14532d",
      capBase: "#e11d48", capSpots: "#ffffff",
      houseBase: "#fef08a", windowGlow: "#fef9c3",
      hasSun: true, hasButterflies: true, hasDandelions: true,
      windSpeed: 0.5, puddleCount: 1,
      treeColor: "#052e16", flowerColors: ["#f43f5e", "#fbbf24", "#ec4899", "#ffffff"]
    },
    night: {
      name: "Enchanted Starry Night",
      desc: "Cosmic night sky with glowing crescent moon, twinkling stars, shooting meteors & glowing fireflies",
      skyTop: "#020617", skyMid: "#090d24", skyBot: "#171a3d",
      hillFar: "#101633", hillMid: "#0c1129", hillNear: "#080c1f",
      ground: "#050714",
      capBase: "#7c3aed", capSpots: "#c4b5fd",
      houseBase: "#ddd6fe", windowGlow: "#fde047",
      hasMoon: true, hasStars: true, hasFireflies: true, hasMeteors: true,
      windSpeed: 0.4, puddleCount: 2,
      treeColor: "#02040a", flowerColors: ["#c084fc", "#818cf8", "#38bdf8", "#f472b6"]
    },
    partlyCloudy: {
      name: "Partly Cloudy Skies",
      desc: "Drifting stylized cumulus cloud puffs with sunbeams breaking through onto rolling green hills",
      skyTop: "#0284c7", skyMid: "#60a5fa", skyBot: "#bfdbfe",
      hillFar: "#1e5b38", hillMid: "#15803d", hillNear: "#16a34a",
      ground: "#14532d",
      capBase: "#f43f5e", capSpots: "#ffffff",
      houseBase: "#fed7aa", windowGlow: "#fef08a",
      hasSun: true, hasClouds: true, hasGodRays: true,
      windSpeed: 0.8, puddleCount: 1,
      treeColor: "#063219", flowerColors: ["#fbbf24", "#f43f5e", "#a855f7", "#38bdf8"]
    },
    overcast: {
      name: "Overcast & Rolling Winds",
      desc: "Dense blanket of gray clouds with dynamic wind streaks and rustling autumn leaves",
      skyTop: "#334155", skyMid: "#475569", skyBot: "#64748b",
      hillFar: "#303e4d", hillMid: "#253340", hillNear: "#1c2732",
      ground: "#141d26",
      capBase: "#7c3aed", capSpots: "#ddd6fe",
      houseBase: "#cbd5e1", windowGlow: "#fef08a",
      hasClouds: true, hasLeaves: true,
      windSpeed: 1.5, puddleCount: 3,
      treeColor: "#0f161d", flowerColors: ["#94a3b8", "#a855f7", "#ec4899"]
    },
    fog: {
      name: "Atmospheric Mist & Fog",
      desc: "Layers of dense ethereal fog drifting between hills with soft diffused window halo",
      skyTop: "#475569", skyMid: "#64748b", skyBot: "#94a3b8",
      hillFar: "#526375", hillMid: "#415060", hillNear: "#323f4c",
      ground: "#232d37",
      capBase: "#8b5cf6", capSpots: "#ede9fe",
      houseBase: "#e2e8f0", windowGlow: "#fde047",
      hasFog: true,
      windSpeed: 0.3, puddleCount: 2,
      treeColor: "#1a2129", flowerColors: ["#cbd5e1", "#c084fc", "#93c5fd"]
    },
    snow: {
      name: "Winter Blizzard & Snowfall",
      desc: "Drifting crystalline snowflakes, snow-capped mushroom cottage & curling chimney smoke",
      skyTop: "#0f172a", skyMid: "#1e293b", skyBot: "#334155",
      hillFar: "#64748b", hillMid: "#94a3b8", hillNear: "#cbd5e1",
      ground: "#e2e8f0",
      capBase: "#38bdf8", capSpots: "#ffffff",
      houseBase: "#f8fafc", windowGlow: "#fde047",
      hasSnow: true, hasSnowRoof: true, hasChimney: true,
      windSpeed: 0.7, puddleCount: 0,
      treeColor: "#0f172a", flowerColors: ["#38bdf8", "#bae6fd", "#e0f2fe"]
    },
    heatwave: {
      name: "Extreme Heat Shimmer",
      desc: "Scorching blazing sun with radiant heat distortion waves & floating glowing embers",
      skyTop: "#7f1d1d", skyMid: "#c2410c", skyBot: "#f59e0b",
      hillFar: "#7c2d12", hillMid: "#9a3412", hillNear: "#b45309",
      ground: "#451a03",
      capBase: "#ea580c", capSpots: "#fed7aa",
      houseBase: "#fef08a", windowGlow: "#fffbeb",
      hasSun: true, hasHeatwave: true, hasEmbers: true,
      windSpeed: 0.6, puddleCount: 0,
      treeColor: "#291002", flowerColors: ["#ea580c", "#f59e0b", "#ef4444"]
    },
    hail: {
      name: "Hailstorm & Ice Bounces",
      desc: "Violent squall with bouncing ice pellets ricocheting off the cottage roof & ground impacts",
      skyTop: "#082f49", skyMid: "#0f172a", skyBot: "#164e63",
      hillFar: "#0e3a53", hillMid: "#0b2b3e", hillNear: "#08202f",
      ground: "#051620",
      capBase: "#0284c7", capSpots: "#e0f2fe",
      houseBase: "#bae6fd", windowGlow: "#fde047",
      hasHail: true, hasClouds: true,
      windSpeed: 2.0, puddleCount: 4,
      treeColor: "#030e15", flowerColors: ["#38bdf8", "#7dd3fc", "#e0f2fe"]
    }
  };

  /* ─── INITIALIZE PARTICLE SYSTEMS ─── */
  function initParticlePools() {
    // Stars
    shootingStars = [];
    fireflies = [];
    for (let i = 0; i < 24; i++) {
      fireflies.push({
        x: Math.random() * 1000,
        y: 100 + Math.random() * 120,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2,
        size: 1.5 + Math.random() * 2
      });
    }

    // Rain
    rainDrops = [];
    for (let i = 0; i < 200; i++) {
      rainDrops.push({
        x: Math.random() * 1400 - 200,
        y: Math.random() * 300 - 300,
        len: 18 + Math.random() * 25,
        speed: 14 + Math.random() * 8,
        alpha: 0.3 + Math.random() * 0.6,
        width: 1.2 + Math.random() * 0.8
      });
    }

    // Snow
    snowFlakes = [];
    for (let i = 0; i < 140; i++) {
      snowFlakes.push({
        x: Math.random() * 1200 - 100,
        y: Math.random() * 300 - 300,
        r: 1.2 + Math.random() * 3.2,
        speed: 0.8 + Math.random() * 1.8,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
        alpha: 0.4 + Math.random() * 0.5
      });
    }

    // Hail
    hailPellets = [];
    for (let i = 0; i < 60; i++) {
      hailPellets.push({
        x: Math.random() * 1200 - 100,
        y: Math.random() * 300 - 300,
        r: 2.2 + Math.random() * 2.8,
        vy: 14 + Math.random() * 8,
        vx: -2.5 - Math.random() * 1.5,
        alpha: 0.8
      });
    }
    hailImpacts = [];

    // Clouds
    clouds = [];
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: -200 + i * 260,
        y: 15 + Math.random() * 45,
        speed: 0.15 + (i % 3) * 0.12,
        scale: 0.65 + Math.random() * 0.5,
        alpha: 0.25 + Math.random() * 0.35
      });
    }

    // Fog banks
    fogBanks = [];
    for (let i = 0; i < 8; i++) {
      fogBanks.push({
        x: -200 + i * 180,
        y: 60 + Math.random() * 100,
        w: 200 + Math.random() * 200,
        h: 40 + Math.random() * 50,
        speed: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Leaves
    leaves = [];
    for (let i = 0; i < 18; i++) {
      leaves.push({
        x: Math.random() * 1200,
        y: 40 + Math.random() * 140,
        vx: 1.5 + Math.random() * 2.5,
        vy: 0.5 + Math.random() * 1.0,
        rot: Math.random() * Math.PI * 2,
        vRot: 0.04 + Math.random() * 0.06,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? "#ea580c" : "#ca8a04"
      });
    }

    // Butterflies & dandelions
    butterflies = [];
    for (let i = 0; i < 4; i++) {
      butterflies.push({
        x: 100 + Math.random() * 800,
        y: 110 + Math.random() * 70,
        baseX: 100 + Math.random() * 800,
        baseY: 110 + Math.random() * 70,
        wingPhase: Math.random() * Math.PI * 2,
        color: ["#f43f5e", "#38bdf8", "#fbbf24", "#c084fc"][i % 4]
      });
    }

    // Sun rays
    sunRays = [];
    for (let i = 0; i < 12; i++) {
      sunRays.push({
        angle: (i / 12) * Math.PI * 2,
        len: 45 + Math.random() * 30,
        pulsePhase: (i / 12) * Math.PI * 2
      });
    }

    // Embers
    emberParticles = [];
    for (let i = 0; i < 30; i++) {
      emberParticles.push({
        x: Math.random() * 1000,
        y: 140 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -0.6 - Math.random() * 1.0,
        alpha: 0.3 + Math.random() * 0.7,
        size: 1.2 + Math.random() * 2.2
      });
    }

    // Puddle ripples
    puddles = [];
  }

  /* ─── CANVAS MOUNTING & RESIZING ─── */
  function setupCanvases() {
    const bannerEl = document.getElementById("sceneryAnimCanvas");
    if (bannerEl) {
      bannerCanvas = bannerEl;
      bannerCtx = bannerCanvas.getContext("2d");
    }

    // Check hero card overlay
    const heroCard = document.querySelector(".hero-weather-card");
    if (heroCard) {
      let heroOverlay = document.getElementById("nwaWeatherAnimOverlay");
      if (!heroOverlay) {
        heroOverlay = document.createElement("div");
        heroOverlay.id = "nwaWeatherAnimOverlay";
        heroOverlay.style.cssText = "position:absolute;inset:0;z-index:0;border-radius:inherit;overflow:hidden;pointer-events:none;";
        heroCard.style.position = "relative";
        heroCard.style.overflow = "hidden";
        heroCard.insertBefore(heroOverlay, heroCard.firstChild);
        Array.from(heroCard.children).forEach(c => {
          if (c !== heroOverlay) { c.style.position = "relative"; c.style.zIndex = "1"; }
        });
      }
      if (!heroCanvas && heroOverlay) {
        heroCanvas = document.createElement("canvas");
        heroCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;opacity:0.65;";
        heroOverlay.appendChild(heroCanvas);
        heroCtx = heroCanvas.getContext("2d");
      }
    }

    resizeAllCanvases();
  }

  function resizeAllCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (bannerCanvas && bannerCanvas.parentElement) {
      const w = bannerCanvas.parentElement.offsetWidth || 900;
      const h = bannerCanvas.parentElement.offsetHeight || 190;
      bannerCanvas.width = Math.round(w * dpr);
      bannerCanvas.height = Math.round(h * dpr);
      bannerCanvas.style.width = w + "px";
      bannerCanvas.style.height = h + "px";
      if (bannerCtx) bannerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (heroCanvas && heroCanvas.parentElement) {
      const w = heroCanvas.parentElement.offsetWidth || 500;
      const h = heroCanvas.parentElement.offsetHeight || 260;
      heroCanvas.width = Math.round(w * dpr);
      heroCanvas.height = Math.round(h * dpr);
      heroCanvas.style.width = w + "px";
      heroCanvas.style.height = h + "px";
      if (heroCtx) heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  /* ─── PROCEDURAL LIGHTNING GENERATOR ─── */
  function generateLightningBolt(startX, startY, endX, endY, depth = 0) {
    const segments = [];
    const dist = Math.hypot(endX - startX, endY - startY);
    if (dist < 12 || depth > 4) {
      return [{ x1: startX, y1: startY, x2: endX, y2: endY }];
    }

    const midX = (startX + endX) / 2 + (Math.random() - 0.5) * (dist * 0.35);
    const midY = (startY + endY) / 2 + (Math.random() - 0.5) * (dist * 0.15);

    segments.push(...generateLightningBolt(startX, startY, midX, midY, depth + 1));
    segments.push(...generateLightningBolt(midX, midY, endX, endY, depth + 1));

    // Secondary fork branching
    if (Math.random() < 0.4 && depth < 3) {
      const forkEndX = midX + (Math.random() - 0.5) * 80;
      const forkEndY = midY + 25 + Math.random() * 45;
      segments.push(...generateLightningBolt(midX, midY, forkEndX, forkEndY, depth + 2));
    }

    return segments;
  }

  function triggerLightningStrike(width, height) {
    const startX = width * 0.2 + Math.random() * (width * 0.6);
    const startY = 0;
    const endX = startX + (Math.random() - 0.5) * (width * 0.3);
    const endY = height * 0.65 + Math.random() * (height * 0.2);

    lightningState.bolts = generateLightningBolt(startX, startY, endX, endY);
    lightningState.alpha = 1.0;
    lightningState.flashAlpha = 0.45;
  }

  /* ─── SCENERY DRAWING ROUTINES ─── */

  // 1. Sky & Atmospheric Gradient
  function drawSky(ctx, W, H, p) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, p.skyTop);
    skyGrad.addColorStop(0.55, p.skyMid);
    skyGrad.addColorStop(1, p.skyBot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // 2. Stars, Crescent Moon & Meteors
  function drawNightSky(ctx, W, H, p) {
    if (!p.hasStars && !p.hasMoon) return;

    // Twinkling stars
    ctx.save();
    for (let i = 0; i < 45; i++) {
      const sx = ((i * 137.5) % W);
      const sy = ((i * 83.3) % (H * 0.6));
      const twinkle = 0.35 + 0.65 * Math.sin(frameCount * 0.04 + i * 2.1);
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 5 === 0) ? 1.6 : 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Star cross sparkle on big stars
      if (i % 9 === 0 && twinkle > 0.8) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${twinkle * 0.5})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(sx - 3, sy); ctx.lineTo(sx + 3, sy);
        ctx.moveTo(sx, sy - 3); ctx.lineTo(sx, sy + 3);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Shooting stars
    if (p.hasMeteors) {
      if (Math.random() < 0.015 && shootingStars.length < 2) {
        shootingStars.push({
          x: Math.random() * W * 0.7,
          y: Math.random() * H * 0.3,
          vx: 8 + Math.random() * 6,
          vy: 4 + Math.random() * 3,
          len: 40 + Math.random() * 40,
          alpha: 1.0
        });
      }

      ctx.save();
      shootingStars.forEach(s => {
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= 0.03;
        if (s.alpha > 0) {
          const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * (s.len / 10), s.y - s.vy * (s.len / 10));
          grad.addColorStop(0, `rgba(255, 255, 255, ${s.alpha})`);
          grad.addColorStop(0.3, `rgba(192, 132, 252, ${s.alpha * 0.7})`);
          grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * (s.len / 10), s.y - s.vy * (s.len / 10));
          ctx.stroke();
        }
      });
      shootingStars = shootingStars.filter(s => s.alpha > 0);
      ctx.restore();
    }

    // Glowing Crescent Moon
    if (p.hasMoon) {
      const mx = W * 0.85, my = H * 0.28, mr = 18;
      ctx.save();
      // Moon Halo
      const halo = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.5);
      halo.addColorStop(0, "rgba(254, 240, 138, 0.25)");
      halo.addColorStop(1, "rgba(254, 240, 138, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mx, my, mr * 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Crescent shape
      ctx.fillStyle = "#fef08a";
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();

      // Cutout inner shadow to make crisp crescent
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(mx - mr * 0.55, my - mr * 0.2, mr * 0.92, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }
  }

  // 3. Volumetric Storm Light Beams (as in user screenshot!)
  function drawVolumetricStormBeams(ctx, W, H, p) {
    if (!p.hasStormBeams) return;

    ctx.save();
    // Diagonal purple/magenta luminous bands cutting across the sky
    const beamCount = 6;
    for (let i = 0; i < beamCount; i++) {
      const offset = (frameCount * 0.3 + i * (W / beamCount)) % (W * 1.5) - W * 0.3;
      const beamWidth = 45 + (i % 3) * 25;

      const beamGrad = ctx.createLinearGradient(offset + 100, 0, offset - 100, H);
      beamGrad.addColorStop(0, "rgba(192, 132, 252, 0.18)");
      beamGrad.addColorStop(0.5, "rgba(168, 85, 247, 0.11)");
      beamGrad.addColorStop(1, "rgba(147, 51, 234, 0.0)");

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(offset + 80, 0);
      ctx.lineTo(offset + 80 + beamWidth, 0);
      ctx.lineTo(offset - 120 + beamWidth, H);
      ctx.lineTo(offset - 120, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Sun & Golden God Rays
  function drawSunAndGodRays(ctx, W, H, p) {
    if (!p.hasSun) return;

    const sx = W * 0.82, sy = H * 0.26;
    const sr = p.hasHeatwave ? 28 : 22;

    ctx.save();
    // Corona Flare
    const corona = ctx.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 4.2);
    corona.addColorStop(0, p.hasHeatwave ? "rgba(239, 68, 68, 0.35)" : "rgba(251, 191, 36, 0.32)");
    corona.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Rotating Sun Rays
    sunRays.forEach(ray => {
      ray.angle += 0.003;
      ray.pulsePhase += 0.03;
      const rayLen = ray.len + Math.sin(ray.pulsePhase) * 10;
      const x1 = sx + Math.cos(ray.angle) * (sr * 1.3);
      const y1 = sy + Math.sin(ray.angle) * (sr * 1.3);
      const x2 = sx + Math.cos(ray.angle) * (sr * 1.3 + rayLen);
      const y2 = sy + Math.sin(ray.angle) * (sr * 1.3 + rayLen);

      ctx.strokeStyle = p.hasHeatwave ? "rgba(249, 115, 22, 0.45)" : "rgba(251, 191, 36, 0.45)";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Sun Orb Core
    const sunGrad = ctx.createRadialGradient(sx - 4, sy - 4, 3, sx, sy, sr);
    sunGrad.addColorStop(0, "#ffffff");
    sunGrad.addColorStop(0.5, p.hasHeatwave ? "#f97316" : "#fbbf24");
    sunGrad.addColorStop(1, p.hasHeatwave ? "#dc2626" : "#d97706");
    ctx.fillStyle = sunGrad;
    ctx.shadowColor = p.hasHeatwave ? "#ef4444" : "#f59e0b";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // God Rays breaking through clouds
    if (p.hasGodRays) {
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const rayAngle = 0.55 + i * 0.22;
        const raySpread = 0.12;
        const rLen = H * 1.4;

        const rayGrad = ctx.createRadialGradient(sx, sy, sr, sx + Math.cos(rayAngle) * rLen, sy + Math.sin(rayAngle) * rLen, rLen);
        rayGrad.addColorStop(0, "rgba(254, 243, 199, 0.22)");
        rayGrad.addColorStop(1, "rgba(254, 243, 199, 0)");

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(rayAngle - raySpread) * rLen, sy + Math.sin(rayAngle - raySpread) * rLen);
        ctx.lineTo(sx + Math.cos(rayAngle + raySpread) * rLen, sy + Math.sin(rayAngle + raySpread) * rLen);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 5. Stylized Fluffy Clouds
  function drawClouds(ctx, W, H, p) {
    if (!p.hasClouds && p.windSpeed < 1.2 && !p.hasRain) return;

    ctx.save();
    clouds.forEach(c => {
      c.x += c.speed;
      if (c.x > W + 220) c.x = -220;

      const scale = c.scale;
      const alpha = c.alpha;
      const puffs = [
        { dx: 0, dy: 0, r: 36 },
        { dx: 32, dy: -10, r: 28 },
        { dx: -30, dy: -6, r: 25 },
        { dx: 58, dy: 6, r: 20 },
        { dx: -54, dy: 8, r: 18 }
      ];

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.hasRain ? "rgba(30, 41, 59, 0.75)" : "rgba(241, 245, 249, 0.85)";
      ctx.beginPath();
      puffs.forEach(pf => {
        ctx.moveTo(c.x + (pf.dx + pf.r) * scale, c.y + pf.dy * scale);
        ctx.arc(c.x + pf.dx * scale, c.y + pf.dy * scale, pf.r * scale, 0, Math.PI * 2);
      });
      ctx.fill();
    });
    ctx.restore();
  }

  // 6. Branching Lightning Bolts & Flash
  function drawLightning(ctx, W, H, p) {
    if (!p.hasLightning) return;

    // Periodic randomized lightning triggers
    if (Math.random() < 0.016 && lightningState.alpha <= 0) {
      triggerLightningStrike(W, H);
    }

    if (lightningState.alpha > 0) {
      // Screen Flash
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${lightningState.flashAlpha * 0.4})`;
      ctx.fillRect(0, 0, W, H);

      // Outer Purple Glow Bolt
      ctx.strokeStyle = `rgba(216, 180, 254, ${lightningState.alpha * 0.9})`;
      ctx.lineWidth = 4.5;
      ctx.shadowColor = "#c084fc";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      lightningState.bolts.forEach(seg => {
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
      });
      ctx.stroke();

      // Inner White Core Bolt
      ctx.strokeStyle = `rgba(255, 255, 255, ${lightningState.alpha})`;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      lightningState.bolts.forEach(seg => {
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
      });
      ctx.stroke();

      ctx.restore();

      lightningState.alpha -= 0.07;
      lightningState.flashAlpha -= 0.05;
    }
  }

  // 7. Layered Rolling Hills Landscape
  function drawLandscapeHills(ctx, W, H, p) {
    const horizon = H * 0.62;

    // Distant Hill Layer
    ctx.save();
    ctx.fillStyle = p.hillFar;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, horizon - 20);
    ctx.bezierCurveTo(W * 0.25, horizon - 45, W * 0.45, horizon - 15, W * 0.7, horizon - 35);
    ctx.bezierCurveTo(W * 0.85, horizon - 50, W * 0.95, horizon - 25, W, horizon - 30);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Midground Hill Layer
    ctx.fillStyle = p.hillMid;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, horizon + 5);
    ctx.bezierCurveTo(W * 0.3, horizon + 25, W * 0.6, horizon - 10, W, horizon + 15);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Foreground Meadow / Soil
    ctx.fillStyle = p.ground;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, horizon + 30);
    ctx.bezierCurveTo(W * 0.35, horizon + 20, W * 0.75, horizon + 35, W, horizon + 25);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 8. Water Puddles & Dynamic Expanding Ripple Waves
  function drawPuddlesAndRipples(ctx, W, H, p) {
    if (p.puddleCount <= 0) return;

    ctx.save();
    const puddleDefs = [
      { x: W * 0.12, y: H * 0.86, rx: 42, ry: 7 },
      { x: W * 0.32, y: H * 0.92, rx: 65, ry: 9 },
      { x: W * 0.58, y: H * 0.88, rx: 50, ry: 8 },
      { x: W * 0.82, y: H * 0.91, rx: 70, ry: 10 },
      { x: W * 0.92, y: H * 0.85, rx: 35, ry: 6 }
    ];

    const count = Math.min(p.puddleCount, puddleDefs.length);
    for (let i = 0; i < count; i++) {
      const pd = puddleDefs[i];

      // Puddle Water Surface Reflection
      const pGrad = ctx.createLinearGradient(pd.x, pd.y - pd.ry, pd.x, pd.y + pd.ry);
      pGrad.addColorStop(0, p.hasRain ? "rgba(30, 58, 138, 0.45)" : "rgba(56, 189, 248, 0.35)");
      pGrad.addColorStop(1, p.hasRain ? "rgba(15, 23, 42, 0.65)" : "rgba(3, 105, 161, 0.45)");

      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.ellipse(pd.x, pd.y, pd.rx, pd.ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Trigger new ripple in puddle
      if ((p.hasRain || p.hasHail) && Math.random() < 0.08) {
        puddles.push({
          x: pd.x + (Math.random() - 0.5) * (pd.rx * 1.5),
          y: pd.y + (Math.random() - 0.5) * (pd.ry * 1.5),
          rx: 2,
          ry: 1,
          alpha: 0.7,
          color: p.hasHail ? "#bae6fd" : "#93c5fd"
        });
      }
    }

    // Draw active ripple rings
    puddles.forEach(rp => {
      rp.rx += 0.8;
      rp.ry += 0.35;
      rp.alpha -= 0.022;

      if (rp.alpha > 0) {
        ctx.strokeStyle = `rgba(147, 197, 253, ${rp.alpha})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.rx, rp.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    puddles = puddles.filter(rp => rp.alpha > 0);
    ctx.restore();
  }

  // 9. Whimsical Mushroom Cottage (Faithfully modeled after user screenshot!)
  function drawMushroomCottage(ctx, cx, cy, scale, p) {
    ctx.save();
    const houseW = 48 * scale;
    const houseH = 50 * scale;
    const capW = 75 * scale;
    const capH = 58 * scale;

    // Cozy Window Light Spill onto the Ground
    const lightSpill = ctx.createRadialGradient(cx + 8 * scale, cy - 8 * scale, 4 * scale, cx + 8 * scale, cy + 15 * scale, 55 * scale);
    lightSpill.addColorStop(0, "rgba(254, 240, 138, 0.35)");
    lightSpill.addColorStop(0.6, "rgba(253, 224, 71, 0.12)");
    lightSpill.addColorStop(1, "rgba(254, 240, 138, 0)");
    ctx.fillStyle = lightSpill;
    ctx.beginPath();
    ctx.ellipse(cx + 10 * scale, cy + 18 * scale, 48 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cottage Body (Stem / Base)
    ctx.fillStyle = p.houseBase;
    ctx.beginPath();
    ctx.moveTo(cx - houseW * 0.45, cy - houseH * 0.4);
    ctx.quadraticCurveTo(cx - houseW * 0.55, cy + houseH * 0.5, cx - houseW * 0.42, cy + houseH * 0.5);
    ctx.lineTo(cx + houseW * 0.42, cy + houseH * 0.5);
    ctx.quadraticCurveTo(cx + houseW * 0.55, cy + houseH * 0.5, cx + houseW * 0.45, cy - houseH * 0.4);
    ctx.closePath();
    ctx.fill();

    // Arched Wooden Door
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.arc(cx - 12 * scale, cy + 10 * scale, 7 * scale, Math.PI, 0);
    ctx.lineTo(cx - 5 * scale, cy + 24 * scale);
    ctx.lineTo(cx - 19 * scale, cy + 24 * scale);
    ctx.closePath();
    ctx.fill();

    // Doorway nightlight
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(cx - 12 * scale, cy + 9 * scale, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Window with Warm Light & Pane Cross
    const winX = cx + 11 * scale;
    const winY = cy + 11 * scale;
    const winR = 10 * scale;

    ctx.fillStyle = p.windowGlow;
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(winX, winY, winR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Window Pane Frames
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.6 * scale;
    ctx.beginPath();
    ctx.arc(winX, winY, winR, 0, Math.PI * 2);
    ctx.moveTo(winX - winR, winY); ctx.lineTo(winX + winR, winY);
    ctx.moveTo(winX, winY - winR); ctx.lineTo(winX, winY + winR);
    ctx.stroke();

    // Cute silhouette inside window
    ctx.fillStyle = "#713f12";
    ctx.beginPath();
    ctx.arc(winX - 2 * scale, winY + 3 * scale, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Mushroom Roof Cap (Curved organic dome)
    const capTopY = cy - houseH * 0.4 - capH * 0.85;
    ctx.fillStyle = p.capBase;
    ctx.beginPath();
    ctx.moveTo(cx - capW * 0.52, cy - houseH * 0.32);
    ctx.bezierCurveTo(cx - capW * 0.6, capTopY + capH * 0.2, cx - capW * 0.25, capTopY, cx, capTopY);
    ctx.bezierCurveTo(cx + capW * 0.25, capTopY, cx + capW * 0.6, capTopY + capH * 0.2, cx + capW * 0.52, cy - houseH * 0.32);
    ctx.quadraticCurveTo(cx, cy - houseH * 0.24, cx - capW * 0.52, cy - houseH * 0.32);
    ctx.closePath();
    ctx.fill();

    // Stylized Spots on Mushroom Cap
    ctx.fillStyle = p.capSpots;
    const spotList = [
      { x: cx - 18 * scale, y: cy - 42 * scale, r: 8 * scale },
      { x: cx + 16 * scale, y: cy - 46 * scale, r: 10 * scale },
      { x: cx - 2 * scale, y: cy - 58 * scale, r: 6.5 * scale },
      { x: cx - 28 * scale, y: cy - 30 * scale, r: 5 * scale },
      { x: cx + 28 * scale, y: cy - 32 * scale, r: 5.5 * scale }
    ];
    spotList.forEach(sp => {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Snow Cap on Top of Mushroom Roof (For Winter / Snow Scene)
    if (p.hasSnowRoof) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(cx - capW * 0.42, cy - houseH * 0.35 - capH * 0.45);
      ctx.bezierCurveTo(cx - capW * 0.2, capTopY - 2 * scale, cx + capW * 0.2, capTopY - 2 * scale, cx + capW * 0.42, cy - houseH * 0.35 - capH * 0.45);
      ctx.quadraticCurveTo(cx + capW * 0.2, cy - houseH * 0.35 - capH * 0.3, cx, cy - houseH * 0.35 - capH * 0.35);
      ctx.quadraticCurveTo(cx - capW * 0.2, cy - houseH * 0.35 - capH * 0.3, cx - capW * 0.42, cy - houseH * 0.35 - capH * 0.45);
      ctx.closePath();
      ctx.fill();
    }

    // Chimney & Puffs
    if (p.hasChimney) {
      const chimX = cx + 22 * scale;
      const chimY = cy - 48 * scale;

      ctx.fillStyle = "#78350f";
      ctx.fillRect(chimX - 4 * scale, chimY - 14 * scale, 8 * scale, 14 * scale);

      // Smoke curls
      if (Math.random() < 0.08) {
        chimneyPuffs.push({
          x: chimX,
          y: chimY - 14 * scale,
          r: 2.5 * scale,
          alpha: 0.7
        });
      }
    }

    ctx.restore();
  }

  // 10. Organic Trees, Wildflowers, and Swaying Foliage
  function drawFloraAndTrees(ctx, W, H, p) {
    const wind = Math.sin(frameCount * 0.04) * (p.windSpeed * 4);
    const horizon = H * 0.68;

    ctx.save();
    ctx.fillStyle = p.treeColor;

    // Tree 1: Left Spooky/Organic Forked Tree (matches user image!)
    const t1X = W * 0.12, t1Y = horizon + 22;
    ctx.beginPath();
    ctx.moveTo(t1X - 6, t1Y);
    ctx.lineTo(t1X + 6, t1Y);
    ctx.lineTo(t1X + 3 + wind * 0.3, t1Y - 45);
    // Left fork branch
    ctx.lineTo(t1X - 18 + wind, t1Y - 80);
    ctx.lineTo(t1X - 13 + wind, t1Y - 82);
    ctx.lineTo(t1X + 1 + wind * 0.4, t1Y - 48);
    // Right fork branch
    ctx.lineTo(t1X + 15 + wind * 1.1, t1Y - 88);
    ctx.lineTo(t1X + 19 + wind * 1.1, t1Y - 86);
    ctx.lineTo(t1X + 4 + wind * 0.3, t1Y - 42);
    ctx.closePath();
    ctx.fill();

    // Tree 2: Center-Right Bare/Foliage Tree (matches user image!)
    const t2X = W * 0.39, t2Y = horizon + 26;
    ctx.beginPath();
    ctx.moveTo(t2X - 5, t2Y);
    ctx.lineTo(t2X + 5, t2Y);
    ctx.lineTo(t2X + 2 + wind * 0.4, t2Y - 50);
    ctx.lineTo(t2X - 12 + wind * 0.9, t2Y - 85);
    ctx.lineTo(t2X - 8 + wind * 0.9, t2Y - 86);
    ctx.lineTo(t2X + 2 + wind * 0.4, t2Y - 52);
    ctx.lineTo(t2X + 16 + wind * 1.2, t2Y - 92);
    ctx.lineTo(t2X + 20 + wind * 1.2, t2Y - 90);
    ctx.lineTo(t2X + 4 + wind * 0.3, t2Y - 46);
    ctx.closePath();
    ctx.fill();

    // Tree 3: Right background tree & fence silhouettes (matches user image!)
    const t3X = W * 0.88, t3Y = horizon + 20;
    ctx.beginPath();
    ctx.moveTo(t3X - 3, t3Y);
    ctx.lineTo(t3X + 3, t3Y);
    ctx.lineTo(t3X + 1 + wind * 0.3, t3Y - 35);
    ctx.lineTo(t3X + 10 + wind * 0.7, t3Y - 55);
    ctx.lineTo(t3X + 13 + wind * 0.7, t3Y - 54);
    ctx.lineTo(t3X + 2 + wind * 0.3, t3Y - 34);
    ctx.lineTo(t3X - 8 + wind * 0.6, t3Y - 52);
    ctx.closePath();
    ctx.fill();

    // Little wooden fence posts
    for (let f = 0; f < 5; f++) {
      const fx = W * 0.82 + f * 12;
      ctx.fillRect(fx, horizon + 12, 2.5, 14);
    }
    ctx.fillRect(W * 0.81, horizon + 16, 55, 2);

    // Scattered Wildflower Dots & Grass Tufts (Pink, Magenta, Violet, Yellow, Cyan)
    const flowerXList = [
      0.08, 0.15, 0.19, 0.26, 0.34, 0.44, 0.48, 0.52, 0.65, 0.71, 0.77, 0.86, 0.94
    ];
    flowerXList.forEach((fxFrac, idx) => {
      const fx = W * fxFrac;
      const fy = horizon + 24 + ((idx * 7) % 18);
      const color = p.flowerColors[idx % p.flowerColors.length];

      // Grass tuft
      ctx.strokeStyle = p.ground;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 5);
      ctx.lineTo(fx - 3 + wind * 0.2, fy - 4);
      ctx.moveTo(fx, fy + 5);
      ctx.lineTo(fx + 3 + wind * 0.2, fy - 3);
      ctx.stroke();

      // Flower petal dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(fx + wind * 0.15, fy - 4, 2.0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  // 11. Falling Rain & Splashes
  function drawRainParticles(ctx, W, H, p) {
    if (!p.hasRain) return;

    ctx.save();
    const count = p.rainHeavy ? 180 : 80;
    const angleRad = -0.45; // Angled storm rain matching user image

    for (let i = 0; i < count; i++) {
      const drop = rainDrops[i];
      drop.x += Math.sin(angleRad) * drop.speed;
      drop.y += Math.cos(angleRad) * drop.speed;

      if (drop.y > H + 20) {
        drop.y = -drop.len - Math.random() * 40;
        drop.x = Math.random() * (W + 300) - 100;
      }

      ctx.strokeStyle = `rgba(224, 231, 255, ${drop.alpha})`;
      ctx.lineWidth = drop.width;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + Math.sin(angleRad) * drop.len, drop.y + Math.cos(angleRad) * drop.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 12. Snowfall Blizzard
  function drawSnowParticles(ctx, W, H, p) {
    if (!p.hasSnow) return;

    ctx.save();
    snowFlakes.forEach(sf => {
      sf.wobble += sf.wobbleSpeed;
      sf.x += Math.sin(sf.wobble) * 0.7 + p.windSpeed * 0.5;
      sf.y += sf.speed;

      if (sf.y > H + 10) {
        sf.y = -sf.r - Math.random() * 30;
        sf.x = Math.random() * (W + 200) - 100;
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${sf.alpha})`;
      ctx.shadowColor = "#e0f2fe";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(sf.x, sf.y, sf.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Chimney smoke puffs
    chimneyPuffs.forEach(cp => {
      cp.y -= 0.6;
      cp.x += 0.4 + Math.sin(cp.y * 0.05) * 0.5;
      cp.r += 0.15;
      cp.alpha -= 0.012;

      if (cp.alpha > 0) {
        ctx.fillStyle = `rgba(226, 232, 240, ${cp.alpha})`;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, cp.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    chimneyPuffs = chimneyPuffs.filter(cp => cp.alpha > 0);
  }

  // 13. Bouncing Hailstones & Impacts
  function drawHailParticles(ctx, W, H, p) {
    if (!p.hasHail) return;

    ctx.save();
    hailPellets.forEach(hp => {
      hp.x += hp.vx;
      hp.y += hp.vy;

      // Hit ground or roof
      if (hp.y >= H * 0.85) {
        // Spawn bounce shatter burst
        for (let b = 0; b < 3; b++) {
          hailImpacts.push({
            x: hp.x,
            y: hp.y,
            vx: (Math.random() - 0.5) * 3,
            vy: -2 - Math.random() * 3,
            r: hp.r * 0.6,
            alpha: 0.8
          });
        }
        hp.y = -hp.r - Math.random() * 40;
        hp.x = Math.random() * (W + 200) - 100;
      }

      ctx.fillStyle = "#e0f2fe";
      ctx.strokeStyle = "#bae6fd";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, hp.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Animate impact bounces
    hailImpacts.forEach(hi => {
      hi.x += hi.vx;
      hi.y += hi.vy;
      hi.vy += 0.3; // gravity
      hi.alpha -= 0.05;

      if (hi.alpha > 0) {
        ctx.fillStyle = `rgba(224, 242, 254, ${hi.alpha})`;
        ctx.beginPath();
        ctx.arc(hi.x, hi.y, hi.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    hailImpacts = hailImpacts.filter(hi => hi.alpha > 0);
    ctx.restore();
  }

  // 14. Ethereal Drifting Mist & Fog Waves
  function drawFogWaves(ctx, W, H, p) {
    if (!p.hasFog) return;

    ctx.save();
    fogBanks.forEach(fb => {
      fb.x += fb.speed;
      fb.phase += 0.02;
      if (fb.x > W + fb.w) fb.x = -fb.w;

      const alpha = 0.18 + Math.sin(fb.phase) * 0.08;
      const grad = ctx.createRadialGradient(fb.x, fb.y, 10, fb.x, fb.y, fb.w * 0.5);
      grad.addColorStop(0, `rgba(226, 232, 240, ${alpha})`);
      grad.addColorStop(1, `rgba(226, 232, 240, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(fb.x, fb.y, fb.w * 0.5, fb.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // 15. Heatwave Distortion Shimmer & Embers
  function drawHeatwaveShimmer(ctx, W, H, p) {
    if (!p.hasHeatwave) return;

    ctx.save();
    // Shimmering wavy sine heat lines
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 6; i++) {
      const yLine = H * 0.55 + i * 14;
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, yLine);
      for (let x = 0; x <= W; x += 15) {
        const wave = Math.sin(x * 0.05 + frameCount * 0.06 + i) * 6;
        ctx.lineTo(x, yLine + wave);
      }
      ctx.stroke();
    }

    // Floating embers
    emberParticles.forEach(ep => {
      ep.x += ep.vx;
      ep.y += ep.vy;
      if (ep.y < H * 0.3) {
        ep.y = H * 0.85 + Math.random() * 20;
        ep.x = Math.random() * W;
      }
      ctx.fillStyle = `rgba(249, 115, 22, ${ep.alpha})`;
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // 16. Bioluminescent Fireflies
  function drawFireflies(ctx, W, H, p) {
    if (!p.hasFireflies) return;

    ctx.save();
    fireflies.forEach(ff => {
      ff.x += ff.vx + Math.sin(frameCount * 0.03 + ff.phase) * 0.4;
      ff.y += ff.vy + Math.cos(frameCount * 0.03 + ff.phase) * 0.3;

      if (ff.x < 0) ff.x = W;
      if (ff.x > W) ff.x = 0;
      if (ff.y < H * 0.4) ff.y = H * 0.85;
      if (ff.y > H * 0.95) ff.y = H * 0.5;

      const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(frameCount * 0.08 + ff.phase));
      ctx.fillStyle = `rgba(163, 230, 53, ${pulse})`;
      ctx.shadowColor = "#a3e635";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ff.x, ff.y, ff.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // 17. Butterflies & Rustling Leaves
  function drawButterfliesAndLeaves(ctx, W, H, p) {
    if (p.hasButterflies) {
      ctx.save();
      butterflies.forEach(bf => {
        bf.wingPhase += 0.22;
        bf.x = bf.baseX + Math.sin(frameCount * 0.02 + bf.wingPhase) * 35;
        bf.y = bf.baseY + Math.cos(frameCount * 0.03 + bf.wingPhase) * 20;

        const wingW = Math.abs(Math.sin(bf.wingPhase)) * 4 + 1;
        ctx.fillStyle = bf.color;
        ctx.beginPath();
        // Left wing
        ctx.ellipse(bf.x - 3, bf.y, wingW, 3.5, -0.3, 0, Math.PI * 2);
        // Right wing
        ctx.ellipse(bf.x + 3, bf.y, wingW, 3.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    if (p.hasLeaves) {
      ctx.save();
      leaves.forEach(lf => {
        lf.x += lf.vx;
        lf.y += lf.vy + Math.sin(lf.x * 0.03) * 0.5;
        lf.rot += lf.vRot;
        if (lf.x > W + 20) { lf.x = -20; lf.y = 40 + Math.random() * (H * 0.5); }

        ctx.translate(lf.x, lf.y);
        ctx.rotate(lf.rot);
        ctx.fillStyle = lf.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, lf.size, lf.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // reapply DPR transform
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx.scale(dpr, dpr);
      });
      ctx.restore();
    }
  }

  /* ─── MASTER SCENE RENDER LOOP ─── */
  function renderSceneOnCanvas(ctx, canvas, sceneKey) {
    if (!ctx || !canvas) return;

    const W = canvas.offsetWidth || 900;
    const H = canvas.offsetHeight || 190;
    const p = SCENE_PALETTES[sceneKey] || SCENE_PALETTES.thunder;

    ctx.clearRect(0, 0, W, H);

    // 1. Sky
    drawSky(ctx, W, H, p);

    // 2. Cosmic elements (stars, crescent moon, meteors)
    drawNightSky(ctx, W, H, p);

    // 3. Volumetric Storm Beams (user screenshot aesthetic)
    drawVolumetricStormBeams(ctx, W, H, p);

    // 4. Sun & God Rays
    drawSunAndGodRays(ctx, W, H, p);

    // 5. Fluffy / Storm Clouds
    drawClouds(ctx, W, H, p);

    // 6. Branching Lightning
    drawLightning(ctx, W, H, p);

    // 7. Layered Rolling Hills
    drawLandscapeHills(ctx, W, H, p);

    // 8. Water Puddles & Ripples
    drawPuddlesAndRipples(ctx, W, H, p);

    // 9. Whimsical Mushroom Cottage (Positioned at 25% width for perfect framing)
    const cottageX = W * 0.23;
    const cottageY = H * 0.76;
    const cottageScale = Math.min(Math.max(H / 200, 0.75), 1.15);
    drawMushroomCottage(ctx, cottageX, cottageY, cottageScale, p);

    // 10. Trees & Wildflowers
    drawFloraAndTrees(ctx, W, H, p);

    // 11. Weather Particles
    drawRainParticles(ctx, W, H, p);
    drawSnowParticles(ctx, W, H, p);
    drawHailParticles(ctx, W, H, p);
    drawFogWaves(ctx, W, H, p);
    drawHeatwaveShimmer(ctx, W, H, p);
    drawFireflies(ctx, W, H, p);
    drawButterfliesAndLeaves(ctx, W, H, p);
  }

  function animationLoop() {
    frameCount++;
    const activeScene = userOverrideScene || currentScene;

    if (bannerCtx && bannerCanvas) {
      renderSceneOnCanvas(bannerCtx, bannerCanvas, activeScene);
    }
    if (heroCtx && heroCanvas) {
      renderSceneOnCanvas(heroCtx, heroCanvas, activeScene);
    }

    animFrameId = requestAnimationFrame(animationLoop);
  }

  /* ─── UI CONTROLS & PILL SYNC ─── */
  function updateBannerInfo(sceneKey) {
    const p = SCENE_PALETTES[sceneKey] || SCENE_PALETTES.thunder;
    const titleEl = document.getElementById("sceneryConditionTitle");
    const descEl = document.getElementById("scenerySubtitle");
    const modeEl = document.getElementById("sceneryModeText");

    if (titleEl) titleEl.textContent = p.name;
    if (descEl) descEl.textContent = p.desc;
    if (modeEl) {
      modeEl.textContent = userOverrideScene
        ? `Manual Preview Mode (${sceneKey.toUpperCase()})`
        : "Live Weather Dynamic Landscape";
    }

    // Highlight active control pill
    const pills = document.querySelectorAll(".scene-pill-btn");
    pills.forEach(pill => {
      const s = pill.getAttribute("data-scene");
      if (userOverrideScene) {
        pill.classList.toggle("active", s === userOverrideScene);
      } else {
        pill.classList.toggle("active", s === "auto");
      }
    });
  }

  function setupScenePillListeners() {
    const controls = document.getElementById("sceneryControls");
    if (!controls) return;

    controls.addEventListener("click", e => {
      const btn = e.target.closest(".scene-pill-btn");
      if (!btn) return;

      const selected = btn.getAttribute("data-scene");
      if (selected === "auto") {
        userOverrideScene = null;
      } else if (SCENE_PALETTES[selected]) {
        userOverrideScene = selected;
      }

      updateBannerInfo(userOverrideScene || currentScene);
    });
  }

  /* ─── PUBLIC API ─── */
  function update(weathercode, temperature, precipitation) {
    temperature = Number(temperature) || 28;
    lastTemp = temperature;
    lastWmoCode = weathercode;

    // Determine day / night by IST clock
    const now = new Date();
    const utcHours = now.getUTCHours();
    const istHours = (utcHours + 5.5) % 24;
    const isNight = istHours < 6 || istHours >= 19;

    currentScene = codeToScene(weathercode, temperature, isNight);

    setupCanvases();
    updateBannerInfo(userOverrideScene || currentScene);
  }

  /* ─── INITIALIZATION ─── */
  function init() {
    initParticlePools();
    setupCanvases();
    setupScenePillListeners();

    window.addEventListener("resize", resizeAllCanvases);

    // Pause on hidden tab
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      } else if (!document.hidden && !animFrameId) {
        animationLoop();
      }
    });

    // Start loop
    if (!animFrameId) {
      animationLoop();
    }
  }

  // Inject sleek styles for Scenery Banner
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    .weather-scenery-banner-wrap {
      width: 100%;
      margin: 0.75rem 0 1.25rem 0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08);
      position: relative;
    }
    .weather-scenery-banner {
      width: 100%;
      height: 195px;
      position: relative;
      background: #0f172a;
      overflow: hidden;
      display: flex;
      align-items: flex-end;
    }
    .scenery-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      pointer-events: none;
    }
    .scenery-overlay-content {
      position: relative;
      z-index: 2;
      width: 100%;
      padding: 0.9rem 1.25rem;
      background: linear-gradient(0deg, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.45) 50%, rgba(15, 23, 42, 0) 100%);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 0.75rem;
      pointer-events: auto;
    }
    .scenery-info-left {
      max-width: 500px;
    }
    .scenery-live-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #38bdf8;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      padding: 0.2rem 0.55rem;
      border-radius: 20px;
      border: 1px solid rgba(56, 189, 248, 0.25);
      margin-bottom: 0.25rem;
    }
    .scenery-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0.15rem 0;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
      letter-spacing: -0.01em;
    }
    .scenery-desc {
      font-size: 0.78rem;
      color: rgba(226, 232, 240, 0.85);
      margin: 0;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 480px;
    }
    .scenery-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    .scenery-ctrl-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #94a3b8;
      margin-right: 0.2rem;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .scene-pill-btn {
      background: rgba(30, 41, 59, 0.75);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #e2e8f0;
      font-size: 0.74rem;
      font-weight: 600;
      padding: 0.28rem 0.6rem;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .scene-pill-btn:hover {
      background: rgba(56, 189, 248, 0.25);
      border-color: #38bdf8;
      color: #ffffff;
      transform: translateY(-1px);
    }
    .scene-pill-btn.active {
      background: #0284c7;
      border-color: #38bdf8;
      color: #ffffff;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
    }
    @media (max-width: 768px) {
      .weather-scenery-banner {
        height: 155px;
      }
      .scenery-overlay-content {
        padding: 0.6rem 0.8rem;
      }
      .scenery-title {
        font-size: 0.98rem;
      }
      .scenery-desc {
        display: none;
      }
      .scenery-controls {
        overflow-x: auto;
        padding-bottom: 2px;
        max-width: 100%;
        flex-wrap: nowrap;
      }
      .scene-pill-btn {
        font-size: 0.68rem;
        padding: 0.2rem 0.45rem;
        white-space: nowrap;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // Auto-boot on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.NWAWeatherAnim = {
    update: update,
    setScene: function (s) {
      userOverrideScene = s;
      updateBannerInfo(s);
    }
  };
})();
