(() => {
  "use strict";

  const content = window.SITE_CONTENT;
  if (!content || typeof content !== "object") return;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = motionQuery.matches;
  let letterOpened = false;
  let typingRun = 0;

  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node && typeof value === "string") node.textContent = value;
  };

  const setMeta = (selector, value) => {
    const node = document.querySelector(selector);
    if (node && typeof value === "string") node.setAttribute("content", value);
  };

  document.title = content.pageTitle || document.title;
  setMeta('meta[name="description"]', content.description);
  setMeta('meta[property="og:title"]', content.pageTitle);
  setMeta('meta[property="og:description"]', content.description);

  [
    "occasion", "recipientName", "heroEyebrow", "heroSubtitle",
    "galleryEyebrow", "galleryHeading", "letterDate", "salutation",
    "signature", "footerText"
  ].forEach((key) => setText(`[data-content="${key}"]`, content[key]));

  const fallbackPhotos = [1, 2, 3, 4].map((number) =>
    `assets/placeholders/photo-${number}.svg`
  );

  document.querySelectorAll(".polaroid").forEach((card, index) => {
    const photo = Array.isArray(content.photos) ? content.photos[index] : null;
    const image = card.querySelector("img");
    const caption = card.querySelector(".photo-caption");
    const date = card.querySelector(".photo-date");
    const fallback = fallbackPhotos[index] || fallbackPhotos[0];

    if (!image) return;
    image.addEventListener("error", () => {
      if (!image.src.endsWith(fallback)) image.src = fallback;
    });
    image.src = photo && typeof photo.src === "string" && photo.src.trim() ? photo.src : fallback;
    image.alt = photo && typeof photo.alt === "string" ? photo.alt : `Photo placeholder ${index + 1}`;
    if (caption && photo && typeof photo.caption === "string") caption.textContent = photo.caption;
    if (date && photo && typeof photo.date === "string") date.textContent = photo.date;
  });

  const paragraphText = Array.isArray(content.letterParagraphs)
    ? content.letterParagraphs.filter((item) => typeof item === "string")
    : [];
  const letterBody = document.querySelector("#letter-body");
  const accessibleLetter = document.querySelector("#letter-accessible");

  if (letterBody) {
    letterBody.textContent = "";
    letterBody.setAttribute("aria-hidden", "true");
    paragraphText.forEach((text) => {
      const paragraph = document.createElement("p");
      paragraph.dataset.fullText = text;
      letterBody.append(paragraph);
    });
  }

  if (accessibleLetter) {
    accessibleLetter.textContent = "";
    paragraphText.forEach((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      accessibleLetter.append(paragraph);
    });
  }

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  const showCompleteLetter = () => {
    typingRun += 1;
    if (!letterBody) return;
    letterBody.querySelectorAll("p").forEach((paragraph) => {
      paragraph.textContent = paragraph.dataset.fullText || "";
      paragraph.classList.remove("is-typing");
      paragraph.classList.add("is-complete");
    });
  };

  const typeLetter = async () => {
    if (!letterBody || reduceMotion) {
      showCompleteLetter();
      return;
    }
    const run = ++typingRun;
    for (const paragraph of letterBody.querySelectorAll("p")) {
      const characters = Array.from(paragraph.dataset.fullText || "");
      paragraph.textContent = "";
      paragraph.classList.add("is-typing");
      for (const character of characters) {
        if (run !== typingRun || reduceMotion) {
          showCompleteLetter();
          return;
        }
        paragraph.textContent += character;
        await wait(19);
      }
      paragraph.classList.remove("is-typing");
      paragraph.classList.add("is-complete");
      await wait(180);
    }
  };

  const openButton = document.querySelector("#letter-open");
  const letterPaper = document.querySelector("#letter-paper");

  const openLetter = (celebrate = true) => {
    if (letterOpened || !letterPaper) return;
    letterOpened = true;
    letterPaper.classList.add("is-open");
    if (openButton) {
      openButton.setAttribute("aria-expanded", "true");
      openButton.hidden = true;
    }
    if (reduceMotion) showCompleteLetter();
    else typeLetter();
    if (celebrate && !reduceMotion) launchConfetti();
  };

  if (openButton) openButton.addEventListener("click", () => openLetter(true));

  const revealNodes = Array.from(document.querySelectorAll(".reveal"));
  let revealObserver = null;

  const setupReveals = () => {
    if (revealObserver) revealObserver.disconnect();
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealNodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.12 });
    revealNodes.forEach((node) => revealObserver.observe(node));
  };

  const player = document.querySelector("#music-player");
  const musicButton = document.querySelector("#music-button");
  const audio = document.querySelector("#background-music");
  const musicBars = document.querySelector("#music-bars");
  const musicFile = content.music && typeof content.music.file === "string"
    ? content.music.file.trim()
    : "";

  const updateMusicState = (playing) => {
    if (!musicButton) return;
    musicButton.setAttribute("aria-pressed", String(playing));
    musicButton.setAttribute("aria-label", playing ? "Pause background music" : "Play background music");
    const icon = musicButton.querySelector(".music-icon");
    if (icon) icon.textContent = playing ? "Ⅱ" : "♪";
    if (musicBars) musicBars.classList.toggle("is-playing", playing);
  };

  if (musicFile && player && audio && musicButton) {
    audio.src = musicFile;
    player.hidden = false;
    setText("#music-title", content.music.title || "Background music");
    musicButton.addEventListener("click", async () => {
      if (audio.paused) {
        try {
          await audio.play();
          updateMusicState(true);
        } catch {
          updateMusicState(false);
        }
      } else {
        audio.pause();
        updateMusicState(false);
      }
    });
    audio.addEventListener("pause", () => updateMusicState(false));
    audio.addEventListener("ended", () => updateMusicState(false));
    audio.addEventListener("error", () => updateMusicState(false));
  }

  const canvas = document.querySelector("#celebration-canvas");
  const context = canvas ? canvas.getContext("2d") : null;
  let petals = [];
  let confetti = [];
  let animationFrame = 0;
  let previousTime = 0;
  let resizeFrame = 0;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let pixelRatio = 1;

  const clampCount = (value, fallback, maximum) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(maximum, Math.round(numeric))) : fallback;
  };

  const petalColors = content.petals && Array.isArray(content.petals.colors) && content.petals.colors.length
    ? content.petals.colors.slice(0, 8)
    : ["#ed9fb1", "#f5bdc9"];
  const confettiColors = content.confetti && Array.isArray(content.confetti.colors) && content.confetti.colors.length
    ? content.confetti.colors.slice(0, 10)
    : ["#bc6f83", "#d99856", "#7f9b76"];

  const makePetal = (randomY = true) => ({
    x: Math.random() * viewportWidth,
    y: randomY ? Math.random() * viewportHeight : -20,
    size: 5 + Math.random() * 8,
    speed: 12 + Math.random() * 24,
    drift: -10 + Math.random() * 20,
    rotation: Math.random() * Math.PI * 2,
    spin: -1 + Math.random() * 2,
    color: petalColors[Math.floor(Math.random() * petalColors.length)]
  });

  const sizeCanvas = () => {
    if (!canvas || !context) return;
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewportWidth * pixelRatio);
    canvas.height = Math.round(viewportHeight * pixelRatio);
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const enabled = content.petals && content.petals.enabled !== false;
    const wanted = enabled ? clampCount(content.petals.count, 24, 60) : 0;
    petals = Array.from({ length: wanted }, (_, index) => petals[index] || makePetal(true));
  };

  const drawPetal = (petal) => {
    context.save();
    context.translate(petal.x, petal.y);
    context.rotate(petal.rotation);
    context.fillStyle = petal.color;
    context.globalAlpha = 0.72;
    context.beginPath();
    context.ellipse(0, 0, petal.size * 0.55, petal.size, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const drawConfetti = (piece) => {
    context.save();
    context.translate(piece.x, piece.y);
    context.rotate(piece.rotation);
    context.fillStyle = piece.color;
    context.globalAlpha = Math.max(0, piece.life / piece.maxLife);
    context.fillRect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * 0.65);
    context.restore();
  };

  const animate = (time) => {
    if (!context || reduceMotion || document.hidden) return;
    const delta = Math.min((time - previousTime) / 1000 || 0, 0.04);
    previousTime = time;
    context.clearRect(0, 0, viewportWidth, viewportHeight);

    petals.forEach((petal) => {
      petal.y += petal.speed * delta;
      petal.x += (petal.drift + Math.sin(petal.y / 45) * 7) * delta;
      petal.rotation += petal.spin * delta;
      if (petal.y > viewportHeight + 20 || petal.x < -30 || petal.x > viewportWidth + 30) {
        Object.assign(petal, makePetal(false));
      }
      drawPetal(petal);
    });

    confetti.forEach((piece) => {
      piece.vy += 620 * delta;
      piece.x += piece.vx * delta;
      piece.y += piece.vy * delta;
      piece.rotation += piece.spin * delta;
      piece.life -= delta;
      drawConfetti(piece);
    });
    confetti = confetti.filter((piece) => piece.life > 0 && piece.y < viewportHeight + 30);
    animationFrame = window.requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    if (!context || reduceMotion || document.hidden || animationFrame) return;
    previousTime = performance.now();
    animationFrame = window.requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    if (context) context.clearRect(0, 0, viewportWidth, viewportHeight);
  };

  function launchConfetti() {
    if (reduceMotion || !context || !content.confetti || content.confetti.enabled === false) return;
    const count = clampCount(content.confetti.count, 90, 180);
    const maxLife = 2.6;
    const originX = viewportWidth / 2;
    const originY = Math.min(viewportHeight * 0.72, viewportHeight - 80);
    confetti = Array.from({ length: count }, () => ({
      x: originX + (Math.random() - 0.5) * 80,
      y: originY,
      vx: (Math.random() - 0.5) * 520,
      vy: -250 - Math.random() * 430,
      size: 5 + Math.random() * 7,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 11,
      life: maxLife,
      maxLife,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)]
    }));
    startAnimation();
  }

  const handleMotionChange = (event) => {
    reduceMotion = event.matches;
    setupReveals();
    if (reduceMotion) {
      stopAnimation();
      openLetter(false);
      showCompleteLetter();
    } else {
      sizeCanvas();
      startAnimation();
    }
  };

  motionQuery.addEventListener("change", handleMotionChange);
  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(sizeCanvas);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAnimation();
    else startAnimation();
  });

  setupReveals();
  sizeCanvas();
  if (reduceMotion) openLetter(false);
  else startAnimation();
})();
