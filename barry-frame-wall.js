/**
 * Barry Framing - Full-viewport "through the frame" custom element
 * Wix Studio tag: barry-frame-wall
 *
 * Optional attributes:
 *   data-interval-ms   Background cut speed (default 55)
 *   data-pool-size     Public-domain works to pull (default 320)
 *   data-reveal-ms     When hours/location appear (default 2500)
 *   data-sound-ms      When tools begin 1-2-3 reveal (default 2500)
 *   data-logo-src      Flat logo mark
 *   data-cube-src      Cube-face logo (asteroid-show easter egg)
 *   data-frame-src     Ornate frame PNG
 *   data-tagline       Under-frame line
 *   data-share-url     URL baked into share text
 */
(() => {
  if (customElements.get("barry-frame-wall")) return;

  const IIIF = "https://www.artic.edu/iiif/2";
  const ARTIC = "https://api.artic.edu/api/v1/artworks/search";

  const DEFAULT_LOGO =
    "https://static.wixstatic.com/media/6c593b_1dd7c8d52ee54b78975d0cbd5c2b93d6~mv2.png";
  const DEFAULT_CUBE =
    "https://static.wixstatic.com/media/c626e3_a87ba9854a214f1ebca74c1df6652024.png";
  const DEFAULT_FRAME =
    "https://static.wixstatic.com/media/6c593b_919ab52667c14c13986ae27bd9111023~mv2.png";
  const DEFAULT_SHARE = "https://www.barryframing.com";

  /** Public-domain / openly streamable elegant piano - Archive.org (CORS *) */
  const MUSIC = [
    {
      title: "Gymnopedie No. 1",
      by: "Erik Satie",
      src: "https://archive.org/download/GymnopedieN1/ErikSatie-GymnopedieNo1-Piano.mp3",
    },
    {
      title: "Profondo Blu",
      by: "Fabrizio Paterlini",
      src: "https://archive.org/download/ca315_fp/01_Profondo_Blu.mp3",
    },
    {
      title: "Viandanze",
      by: "Fabrizio Paterlini",
      src: "https://archive.org/download/ca315_fp/02_Viandanze.mp3",
    },
    {
      title: "Lontana, dolcemente sospesa",
      by: "Fabrizio Paterlini",
      src: "https://archive.org/download/ca315_fp/03_Lontana_dolcemente_sospesa.mp3",
    },
  ];

  const FALLBACK_IDS = [
    "7b7a6f39-1cd8-ea2f-9811-18b0e23edac0",
    "2d484387-2509-5e8e-2c43-22f9981972eb",
    "f8fd76e9-c396-5678-36ed-6a348c904d27",
    "b55d836c-ee20-59f8-1f0c-a95e09905361",
    "3c27b499-af56-f0d5-93b5-a7f2f1ad5813",
    "6644829f-f292-c5c4-a73c-0356a6fdbf0d",
    "a34d9d72-c4ec-0750-389e-a01215c9aab0",
    "48b2de88-ba73-8e19-f448-d1cef4a1c847",
    "3a34f988-f779-2e96-1786-8945b6b9c87d",
    "47c5bcb8-62ef-e5d7-55e7-f5121f409a30",
    "3a608f55-d76e-fa96-d0b1-0789fbc48f1e",
    "e204d686-0e19-c10c-cf72-1000aae5be4a",
    "52ac8996-3460-cf71-cb42-5c4d0aa29b74",
    "1753b638-d4fb-8e45-3db9-92dde7f053da",
    "18092196-50ae-3ff1-9205-1b3110e966c3",
    "defb4004-b500-218d-3d9b-9a02423f097d",
    "c95d58bf-fe9e-e5bb-2c71-ab8bad984759",
    "a38e2828-ec6f-ece1-a30f-70243449197b",
    "c8ee825f-bc8c-c76b-1f05-5d692d9a6b47",
    "78c80988-6524-cec7-c661-a4c0a706d06f",
    "8534685d-1102-e1e3-e194-94f6e925e8b0",
    "3b885ae0-4d46-5fe4-d70a-00474827f02c",
    "a45e5f55-d02b-ce98-8bab-3af549684f58",
    "b0effb1c-ff23-bbaa-f809-9fd94e31c1a0",
    "d7df2633-3b40-f570-c906-211503a37cde",
    "47fd1564-93f5-f30b-7786-013421133b4a",
    "95be2572-b53d-8e7b-abc9-10eb48d4fa5d",
    "237c25a2-6051-a8e7-1610-a01938d4deab",
    "d4ca6321-8656-3d3f-a362-2ee297b2b813",
  ];

  const QUERIES = [
    "painting",
    "portrait",
    "landscape",
    "still life",
    "print",
    "etching",
    "impressionist",
    "renaissance",
    "modern",
    "abstract",
    "drawing",
    "photograph",
  ];

  /**
   * Stay ladder - glance -> gratitude -> tools -> absurd devotion.
   * unlock: optional side-effect when this tier fires
   */
  const REWARDS = [
    {
      at: 120,
      line: "Still watching. Good eye.",
      note: "None of these are for sale - we frame the ones that matter to you.",
      unlock: "clock",
    },
    {
      at: 500,
      line: "Five hundred through the frame.",
      note: "Jerseys. Kids' art. Heirlooms. Neon. We've framed nearly everything.",
    },
    {
      at: 1200,
      line: "You're not in a hurry. Neither are we.",
      note: "Custom framing on Broadway - built to last, measured twice.",
      unlock: "share",
    },
    {
      at: 4000,
      line: "Four thousand. Most people left at forty.",
      note: "Tue-Thu 10-5 - Fri-Sat 12-5 - Closed Sun & Mon",
    },
    {
      at: 9000,
      line: "Nine thousand frames of mind.",
      note: "5951 Broadway St, San Antonio - we'd be grateful to frame yours.",
    },
    {
      at: 15000,
      line: "You're family now.",
      note: "Call 210.826.4035 or write amanda@ or jack@barryframing.com - ask us anything.",
    },
    {
      at: 25000,
      line: "Twenty-five thousand. The cube remembers you.",
      note: "Tap the Barry mark - flat world, or the spinning one.",
      unlock: "cube",
    },
    {
      at: 40000,
      line: "Forty thousand. The wall blinked first.",
      note: "If you're still here, you're the kind of person we love framing for.",
    },
    {
      at: 75000,
      line: "Seventy-five thousand quiet yeses.",
      note: "Bring us the weird one. The sacred one. The one in the closet.",
    },
    {
      at: 100000,
      line: "One hundred thousand through the frame.",
      note: "That's not a score. That's a conversation we haven't had yet.",
    },
    {
      at: 150000,
      line: "A hundred and fifty thousand.",
      note: "Somewhere a mat board is clearing its throat for you.",
    },
    {
      at: 250000,
      line: "A quarter million. Seriously.",
      note: "Tell Amanda you saw the deep end. She'll know.",
    },
    {
      at: 500000,
      line: "Half a million ghosts of other people's walls.",
      note: "We save the best silence for people like you.",
    },
    {
      at: 1000000,
      line: "One million. You win nothing. You understand everything.",
      note: "Come by Broadway. The coffee's average. The care isn't.",
    },
  ];

  const CSS = `
    /* Fixed full-bleed: escapes Wix max-width / padded section wrappers
       that otherwise leave black side columns. */
    :host {
      display: block;
      position: fixed;
      inset: 0;
      width: 100vw;
      width: 100dvw;
      height: 100vh;
      height: 100dvh;
      height: 100svh;
      margin: 0;
      padding: 0;
      overflow: hidden;
      color: #f4f1ea;
      background: #050506;
      font-family: Syne, system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      contain: layout paint;
      z-index: 9999;
      --barry-red: #9e1b2f;
    }

    *, *::before, *::after { box-sizing: border-box; }

    .stage {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #050506;
    }

    .bg { position: absolute; inset: 0; z-index: 0; }

    .bg-layer {
      position: absolute;
      inset: 0;
      background-color: #0a0a0c;
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;
      opacity: 0;
      will-change: opacity;
      transform: translateZ(0);
      backface-visibility: hidden;
    }

    .bg-layer.is-on { opacity: 1; }

    .veil {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      background:
        radial-gradient(ellipse 58% 52% at 50% 46%, rgba(5,5,6,0.1) 0%, rgba(5,5,6,0.58) 70%, rgba(5,5,6,0.9) 100%),
        linear-gradient(180deg, rgba(5,5,6,0.5) 0%, transparent 24%, transparent 76%, rgba(5,5,6,0.65) 100%);
    }

    .noise {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      opacity: 0.04;
      mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    .compose {
      position: absolute;
      inset: 0;
      z-index: 3;
      display: grid;
      place-items: center;
      padding: var(--pad, 4vmin);
      pointer-events: none;
    }

    .stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--stack-gap, 1.6vmin);
      width: var(--stack-w, min(92vw, 520px));
      max-height: 100%;
      transform: translateY(var(--nudge-y, 0px));
      animation: rise-in 1.15s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    @keyframes rise-in {
      from { opacity: 0; transform: translateY(calc(var(--nudge-y, 0px) + 16px)) scale(0.985); }
      to { opacity: 1; transform: translateY(var(--nudge-y, 0px)) scale(1); }
    }

    .brand-lockup {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.55rem;
      pointer-events: none;
    }

    .brand-lockup.is-toggleable {
      pointer-events: auto;
      cursor: pointer;
    }

    .brand-mark {
      position: relative;
      width: var(--logo-size, 72px);
      height: var(--logo-size, 72px);
      display: grid;
      place-items: center;
    }

    .logo {
      width: var(--logo-size, 72px);
      height: var(--logo-size, 72px);
      object-fit: contain;
      filter: drop-shadow(0 4px 18px rgba(0,0,0,0.55));
      animation: logo-glow 4.2s ease-in-out infinite;
      transition: opacity 0.6s ease, transform 0.6s ease;
    }

    .brand-mark.is-cube .logo {
      opacity: 0;
      transform: scale(0.85);
      pointer-events: none;
    }

    @keyframes logo-glow {
      0%, 100% { filter: drop-shadow(0 4px 14px rgba(158,27,47,0.25)); transform: scale(1); }
      50% { filter: drop-shadow(0 6px 28px rgba(158,27,47,0.55)); transform: scale(1.03); }
    }

    .cube-stage {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.6s ease;
      perspective: 600px;
    }

    .brand-mark.is-cube .cube-stage {
      opacity: 1;
    }

    .cube {
      width: 70%;
      height: 70%;
      position: relative;
      transform-style: preserve-3d;
      animation: cube-spin 10s linear infinite;
      --cube-z: calc(var(--logo-size, 72px) * 0.35);
    }

    @keyframes cube-spin {
      from { transform: rotateX(-18deg) rotateY(0deg); }
      to { transform: rotateX(-18deg) rotateY(360deg); }
    }

    .cube-face {
      position: absolute;
      inset: 0;
      background-color: #1a0508;
      background-image: var(--cube-face);
      background-size: 92%;
      background-repeat: no-repeat;
      background-position: center;
      backface-visibility: hidden;
      box-shadow: inset 0 0 18px rgba(255,255,255,0.08);
      filter: drop-shadow(0 0 10px rgba(158,27,47,0.35));
    }

    .cube-face.front  { transform: rotateY(0deg) translateZ(var(--cube-z)); }
    .cube-face.back   { transform: rotateY(180deg) translateZ(var(--cube-z)); }
    .cube-face.right  { transform: rotateY(90deg) translateZ(var(--cube-z)); }
    .cube-face.left   { transform: rotateY(-90deg) translateZ(var(--cube-z)); }
    .cube-face.top    { transform: rotateX(90deg) translateZ(var(--cube-z)); }
    .cube-face.bottom { transform: rotateX(-90deg) translateZ(var(--cube-z)); }

    .wordmark {
      margin: 0;
      font-weight: 700;
      font-size: var(--brand-size, clamp(1rem, 3.2vmin, 1.55rem));
      letter-spacing: 0.22em;
      line-height: 1;
      text-transform: uppercase;
      color: #f7f3ea;
      text-shadow: 0 2px 18px rgba(0,0,0,0.55);
    }

    .frame-wrap {
      position: relative;
      width: var(--frame-w, 42vmin);
      height: var(--frame-h, 42vmin);
      flex: 0 0 auto;
      animation: frame-float 5.5s ease-in-out infinite;
      filter: drop-shadow(0 22px 44px rgba(0,0,0,0.6));
    }

    @keyframes frame-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    .opening {
      position: absolute;
      inset: 23.5%;
      overflow: hidden;
      background: #111;
      border-radius: 1px;
    }

    .opening-art {
      position: absolute;
      inset: 0;
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;
      opacity: 0;
      transition: opacity 0.85s ease;
      transform: scale(1.03);
    }

    .opening-art.is-on { opacity: 1; }

    .frame-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;
      user-select: none;
    }

    .meta {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.45rem;
      text-align: center;
      max-width: 100%;
      min-height: 4.8em;
    }

    .tagline {
      margin: 0;
      font-size: var(--tag-size, clamp(0.72rem, 1.7vmin, 0.98rem));
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(244,241,234,0.82);
      transition: opacity 0.7s ease;
    }

    .meter {
      display: inline-flex;
      align-items: baseline;
      gap: 0.4rem;
      font-variant-numeric: tabular-nums;
      color: rgba(244,241,234,0.55);
      font-size: var(--meter-size, clamp(0.65rem, 1.45vmin, 0.85rem));
      letter-spacing: 0.14em;
      text-transform: uppercase;
      transition: opacity 0.7s ease;
    }

    .meter strong {
      font-family: Newsreader, Georgia, serif;
      font-weight: 600;
      font-size: 1.4em;
      letter-spacing: 0.04em;
      color: #f0d7a8;
    }

    .meta.is-whispering .tagline,
    .meta.is-whispering .meter {
      opacity: 0 !important;
    }

    .whisper {
      position: absolute;
      left: 50%;
      top: 0;
      transform: translate(-50%, 6px);
      z-index: 2;
      width: min(92vw, 380px);
      text-align: center;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.85s ease, transform 0.85s ease, visibility 0.85s;
    }

    .whisper.is-on {
      opacity: 1 !important;
      visibility: visible;
      transform: translate(-50%, 0);
    }

    .whisper-line {
      margin: 0 0 0.35rem;
      font-family: Newsreader, Georgia, serif;
      font-size: clamp(0.95rem, 2.15vmin, 1.2rem);
      font-weight: 500;
      letter-spacing: 0.02em;
      color: #f7f3ea;
      text-shadow: 0 2px 18px rgba(0,0,0,0.7);
    }

    .whisper-note {
      margin: 0;
      font-size: clamp(0.66rem, 1.4vmin, 0.8rem);
      font-weight: 500;
      letter-spacing: 0.05em;
      line-height: 1.45;
      color: rgba(244,241,234,0.68);
      text-shadow: 0 1px 12px rgba(0,0,0,0.6);
    }

    .practical {
      position: absolute;
      top: max(0.75rem, env(safe-area-inset-top, 0px));
      left: max(0.75rem, env(safe-area-inset-left, 0px));
      z-index: 6;
      /* Stay left of the centered logo/frame */
      max-width: min(34vw, 220px);
      padding: 0.15rem 0.1rem;
      opacity: 0;
      transform: translateY(-6px);
      pointer-events: none;
      transition: opacity 1.2s ease, transform 1.2s ease;
      text-shadow: 0 2px 14px rgba(0,0,0,0.75);
    }

    .practical.is-on {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .practical .name {
      margin: 0 0 0.15rem;
      font-weight: 700;
      font-size: clamp(0.98rem, 0.95vw, 1.6rem);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .practical .line {
      margin: 0;
      font-size: clamp(0.84rem, 0.8vw, 1.35rem);
      line-height: 1.45;
      color: rgba(244,241,234,0.88);
      font-weight: 500;
    }

    .practical .muted {
      color: rgba(244,241,234,0.55);
      font-style: italic;
      font-family: Newsreader, Georgia, serif;
      font-weight: 400;
    }

    .practical a {
      color: inherit;
      text-decoration: none;
      pointer-events: auto;
    }

    .practical a:hover { color: #f0d7a8; }

    .practical .hours {
      margin-top: 0.55rem;
      padding-top: 0.55rem;
      border-top: 1px solid rgba(255,255,255,0.14);
    }

    /* One contact slot - role + full email on a single line */
    .email-swap {
      position: relative;
      margin-top: 0.55rem;
      min-height: 2.55em;
      overflow: visible;
    }

    .email-card {
      position: absolute;
      left: 0;
      top: 0;
      width: max-content;
      max-width: none;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
      opacity: 0;
      transform: translateY(5px);
      transition: opacity 1.1s ease, transform 1.1s ease;
      pointer-events: none;
    }

    .email-card.is-on {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .email-card .role {
      margin: 0;
      font-size: 0.68em;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 600;
      color: #c4233a;
    }

    .email-card a {
      margin: 0;
      color: inherit;
      text-decoration: none;
      white-space: nowrap;
      line-height: 1.25;
      font-variant-ligatures: none;
    }

    .email-card a:hover { color: #f0d7a8; }

    /* Stay tools - bottom-right; track title stays over the icons only */
    .tools {
      position: absolute;
      right: max(1rem, env(safe-area-inset-right, 0px));
      bottom: max(1.15rem, env(safe-area-inset-bottom, 0px));
      z-index: 7;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.55rem;
      pointer-events: none;
    }

    .now-playing {
      max-width: min(42vw, 180px);
      text-align: right;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.55s ease, transform 0.55s ease;
      pointer-events: none;
    }

    .now-playing.is-on {
      opacity: 1;
      transform: translateY(0);
    }

    .now-playing .np-title {
      margin: 0;
      font-family: Newsreader, Georgia, serif;
      font-size: 1rem;
      color: rgba(244,241,234,0.92);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 2px 16px rgba(0,0,0,0.7);
    }

    .now-playing .np-by {
      margin: 0.22rem 0 0;
      font-size: 0.66rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(244,241,234,0.52);
    }

    .tool-cluster {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      pointer-events: none;
    }

    .tool-slot {
      display: grid;
      place-items: center;
    }

    .tool-btn {
      appearance: none;
      -webkit-appearance: none;
      border: 1px solid rgba(244,241,234,0.28);
      background: rgba(8,8,10,0.55);
      color: rgba(244,241,234,0.92);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      width: 3.15rem;
      height: 3.15rem;
      min-width: 50px;
      min-height: 50px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      cursor: pointer;
      pointer-events: auto;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      opacity: 0;
      transform: translateY(12px) scale(0.9);
      transition:
        opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
        border-color 0.2s ease,
        background 0.2s ease,
        color 0.2s ease,
        box-shadow 0.2s ease;
      padding: 0;
    }

    .tool-btn.is-available {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .tool-btn:hover {
      border-color: rgba(240,215,168,0.55);
      color: #f0d7a8;
    }

    .tool-btn:active {
      transform: scale(0.96);
    }

    .tool-btn.is-active {
      border-color: #c4233a;
      background: #9e1b2f;
      color: #fff7f5;
      box-shadow: 0 0 0 2px rgba(158,27,47,0.35), 0 8px 22px rgba(158,27,47,0.35);
    }

    .tool-btn.is-loading {
      border-color: rgba(240,215,168,0.55);
      color: #f0d7a8;
    }

    .tool-btn svg {
      width: 1.35rem;
      height: 1.35rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* Time sits left of the triad - never shifts button centering */
    .clock-readout {
      position: absolute;
      right: calc(100% + 0.7rem);
      top: 50%;
      transform: translateY(-50%) translateX(6px);
      font-family: Newsreader, Georgia, serif;
      font-variant-numeric: tabular-nums;
      font-size: 0.9rem;
      letter-spacing: 0.08em;
      color: rgba(244,241,234,0.82);
      text-shadow: 0 2px 12px rgba(0,0,0,0.65);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.4s ease, transform 0.4s ease;
      white-space: nowrap;
    }

    .clock-readout.is-on {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }

    .share-toast {
      position: absolute;
      right: max(0.85rem, env(safe-area-inset-right, 0px));
      bottom: max(4.2rem, calc(env(safe-area-inset-bottom, 0px) + 3.6rem));
      z-index: 8;
      margin: 0;
      padding: 0.45rem 0.75rem;
      border: 1px solid rgba(244,241,234,0.16);
      background: rgba(8,8,10,0.55);
      backdrop-filter: blur(10px);
      font-size: 0.68rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(244,241,234,0.75);
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.45s ease, transform 0.45s ease;
      pointer-events: none;
    }

    .share-toast.is-on {
      opacity: 1;
      transform: translateY(0);
    }

    .status {
      position: absolute;
      left: 50%;
      bottom: max(1rem, env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%);
      z-index: 4;
      margin: 0;
      font-size: 0.62rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: rgba(244,241,234,0.32);
      white-space: nowrap;
      pointer-events: none;
    }

    /* Tablet */
    @media (max-width: 1024px) {
      .practical {
        max-width: min(32vw, 200px);
      }
      .practical .name { font-size: 0.95rem; }
      .practical .line { font-size: 0.85rem; line-height: 1.45; }
      .tool-btn {
        width: 3rem;
        height: 3rem;
        min-width: 48px;
        min-height: 48px;
      }
    }

    /*
      Phones: hours stay TOP-LEFT (never share the bottom band with
      tagline/counter). Meta gets reserved bottom padding so tools
      and copy cannot collide.
    */
    @media (max-width: 720px) {
      .compose {
        /* Clear tools + now-playing so whispers never collide with track title */
        padding-bottom: max(9.4rem, calc(env(safe-area-inset-bottom, 0px) + 8.2rem));
        /* Extra top room so logo/frame clear the hours column */
        padding-top: max(7.7rem, calc(env(safe-area-inset-top, 0px) + 6.3rem));
      }
      .practical {
        top: max(0.55rem, env(safe-area-inset-top, 0px));
        bottom: auto;
        left: max(0.65rem, env(safe-area-inset-left, 0px));
        right: auto;
        max-width: min(50vw, 196px);
        overflow: visible;
      }
      .practical .name { font-size: 0.9rem; }
      .practical .line { font-size: 0.82rem; line-height: 1.4; }
      .practical .hours {
        margin-top: 0.35rem;
        padding-top: 0.35rem;
      }
      .email-swap { min-height: 2.55em; }
      .email-card .role { font-size: 0.64em; }
      .email-card a { font-size: 0.98em; }
      .meta {
        min-height: 3.6em;
        max-width: min(88vw, 320px);
      }
      .wordmark { letter-spacing: 0.14em; }
      .tools {
        right: max(0.7rem, env(safe-area-inset-right, 0px));
        bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
        gap: 0.4rem;
      }
      .tool-btn {
        width: 3.25rem;
        height: 3.25rem;
        min-width: 52px;
        min-height: 52px;
      }
      .tool-btn svg {
        width: 1.45rem;
        height: 1.45rem;
      }
      .now-playing { max-width: min(38vw, 148px); }
      .now-playing .np-title { font-size: 0.72rem; }
      .now-playing .np-by { font-size: 0.56rem; }
      .status { display: none; }
      .share-toast {
        bottom: max(3.6rem, calc(env(safe-area-inset-bottom, 0px) + 3rem));
        max-width: min(62vw, 200px);
        font-size: 0.58rem;
      }
      .whisper {
        width: min(72vw, 260px);
      }
      .whisper-note {
        max-width: min(70vw, 240px);
        margin-left: auto;
        margin-right: auto;
      }
    }

    @media (max-width: 420px) {
      .practical {
        max-width: min(62vw, 236px);
        overflow: visible;
      }
      .practical .line { font-size: 0.8rem; line-height: 1.4; }
      .email-card a { font-size: 0.94em; }
      .compose {
        padding-top: max(8.1rem, calc(env(safe-area-inset-top, 0px) + 6.7rem));
      }
      .clock-readout {
        font-size: 0.78rem;
        min-width: 3.4rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .stack, .logo, .frame-wrap, .cube { animation: none !important; }
      .opening-art, .whisper, .practical, .tool-btn { transition: none !important; }
    }
  `;

  class BarryFrameWall extends HTMLElement {
    constructor() {
      super();
      this._root = this.attachShadow({ mode: "open" });
      this._pool = [];
      this._ready = [];
      this._readyUrls = new Map(); // key -> url when fully decoded (sync cuts)
      this._bgIndex = 0;
      this._featIndex = 0;
      this._activeBg = 0;
      this._activeFeat = 0;
      this._flashed = 0;
      this._raf = 0;
      this._featTimer = 0;
      this._revealTimer = 0;
      this._soundTimer = 0;
      this._whisperTimer = 0;
      this._toastTimer = 0;
      this._clockTimer = 0;
      this._emailTimer = 0;
      this._emailHoldTimer = 0;
      this._emailIdx = 0;
      this._lastCut = 0;
      this._running = false;
      this._ro = null;
      this._prefetching = false;
      this._cutting = false;
      this._rewardIdx = 0;
      this._startedAt = 0;
      this._warmCount = 0;
      this._clockOn = false;
      this._musicOn = false;
      this._trackIdx = 0;
      this._audio = null;
      this._cubeUnlocked = false;
      this._cubeMode = false;
      this._shareUnlocked = false;
      this._clockUnlocked = false;
      this._soundGestureAt = 0;
    }

    static get observedAttributes() {
      return [
        "data-interval-ms",
        "data-pool-size",
        "data-reveal-ms",
        "data-sound-ms",
        "data-logo-src",
        "data-cube-src",
        "data-frame-src",
        "data-tagline",
        "data-share-url",
      ];
    }

    connectedCallback() {
      ensureFonts();
      this._render();
      this._bindRefs();
      this._bindUi();
      this._layout();
      this._ro = new ResizeObserver(() => this._layout());
      this._ro.observe(this);
      window.addEventListener("resize", this._onOrient);
      window.addEventListener("orientationchange", this._onOrient);
      this._startedAt = performance.now();
      this._boot();
      this._scheduleReveal();
      this._scheduleSoundUnlock();
      this._clockTimer = window.setInterval(() => this._tickClock(), 250);
    }

    disconnectedCallback() {
      this._stop();
      this._stopMusic(true);
      if (this._ro) this._ro.disconnect();
      window.removeEventListener("resize", this._onOrient);
      window.removeEventListener("orientationchange", this._onOrient);
      if (this._revealTimer) clearTimeout(this._revealTimer);
      if (this._soundTimer) clearTimeout(this._soundTimer);
      if (this._whisperTimer) clearTimeout(this._whisperTimer);
      if (this._toastTimer) clearTimeout(this._toastTimer);
      if (this._clockTimer) clearInterval(this._clockTimer);
      if (this._emailTimer) clearInterval(this._emailTimer);
      if (this._emailHoldTimer) clearTimeout(this._emailHoldTimer);
    }

    attributeChangedCallback(name) {
      if (!this.isConnected) return;
      if (name === "data-tagline" && this.$tag) {
        this.$tag.textContent =
          this.getAttribute("data-tagline") || "We've framed nearly everything.";
      }
      if (name === "data-logo-src" && this.$logo) {
        this.$logo.src = this.getAttribute("data-logo-src") || DEFAULT_LOGO;
      }
      if (name === "data-frame-src" && this.$frameImg) {
        this.$frameImg.src = this.getAttribute("data-frame-src") || DEFAULT_FRAME;
      }
      if (name === "data-cube-src") {
        const url = this.getAttribute("data-cube-src") || DEFAULT_CUBE;
        this._root.host.style.setProperty("--cube-face", `url("${url}")`);
        this.$stage?.style.setProperty("--cube-face", `url("${url}")`);
      }
    }

    _onOrient = () => {
      requestAnimationFrame(() => this._layout());
    };

    get intervalMs() {
      const n = Number(this.getAttribute("data-interval-ms"));
      return Number.isFinite(n) && n >= 16 ? n : 55;
    }

    get poolSize() {
      const n = Number(this.getAttribute("data-pool-size"));
      return Number.isFinite(n) && n >= 40 ? Math.min(n, 600) : 320;
    }

    get revealMs() {
      const n = Number(this.getAttribute("data-reveal-ms"));
      return Number.isFinite(n) && n >= 500 ? n : 2500;
    }

    get soundMs() {
      const n = Number(this.getAttribute("data-sound-ms"));
      return Number.isFinite(n) && n >= 500 ? n : 2500;
    }

    get shareUrl() {
      return this.getAttribute("data-share-url") || DEFAULT_SHARE;
    }

    _render() {
      const tag =
        this.getAttribute("data-tagline") || "We've framed nearly everything.";
      const logo = this.getAttribute("data-logo-src") || DEFAULT_LOGO;
      const cube = this.getAttribute("data-cube-src") || DEFAULT_CUBE;
      const frame = this.getAttribute("data-frame-src") || DEFAULT_FRAME;

      this._root.innerHTML = `
        <style>${CSS}</style>
        <div class="stage" part="stage" style="--cube-face: url('${escapeAttr(cube)}')">
          <div class="bg" aria-hidden="true">
            <div class="bg-layer" data-bg="0"></div>
            <div class="bg-layer" data-bg="1"></div>
          </div>
          <div class="veil" aria-hidden="true"></div>
          <div class="noise" aria-hidden="true"></div>

          <aside class="practical" data-practical aria-label="Hours and location">
            <p class="name">Barry Framing</p>
            <p class="line muted">Custom framing - San Antonio</p>
            <p class="line">5951 Broadway St</p>
            <p class="line">San Antonio, TX 78209</p>
            <p class="line"><a href="tel:2108264035">210.826.4035</a></p>
            <div class="hours">
              <p class="line">Tue-Thu 10-5</p>
              <p class="line">Fri-Sat 12-5</p>
              <p class="line muted">Closed Sun &amp; Mon</p>
            </div>
            <div class="email-swap" data-email-swap>
              <div class="email-card is-manager is-on" data-email>
                <p class="role">Manager</p>
                <a href="mailto:amanda@barryframing.com">amanda@barryframing.com</a>
              </div>
              <div class="email-card" data-email>
                <p class="role">Partner</p>
                <a href="mailto:jack@barryframing.com">jack@barryframing.com</a>
              </div>
            </div>
          </aside>

          <div class="compose">
            <div class="stack">
              <div class="brand-lockup" data-brand-lockup title="">
                <div class="brand-mark" data-brand-mark>
                  <img class="logo" data-logo src="${escapeAttr(logo)}" alt="Barry Framing" />
                  <div class="cube-stage" aria-hidden="true">
                    <div class="cube">
                      <div class="cube-face front"></div>
                      <div class="cube-face back"></div>
                      <div class="cube-face right"></div>
                      <div class="cube-face left"></div>
                      <div class="cube-face top"></div>
                      <div class="cube-face bottom"></div>
                    </div>
                  </div>
                </div>
                <h1 class="wordmark">Barry Framing</h1>
              </div>
              <div class="frame-wrap" aria-hidden="true">
                <div class="opening">
                  <div class="opening-art" data-feat="0"></div>
                  <div class="opening-art" data-feat="1"></div>
                </div>
                <img class="frame-img" data-frame src="${escapeAttr(frame)}" alt="" />
              </div>
              <div class="meta" data-meta>
                <p class="tagline" data-tag>${escapeHtml(tag)}</p>
                <div class="meter" aria-live="polite">
                  <strong data-count>0</strong>
                  <span>through the frame</span>
                </div>
                <div class="whisper" data-whisper aria-live="polite">
                  <p class="whisper-line" data-whisper-line></p>
                  <p class="whisper-note" data-whisper-note></p>
                </div>
              </div>
            </div>
          </div>

          <div class="tools">
            <div class="now-playing" data-now-playing>
              <p class="np-title" data-np-title></p>
              <p class="np-by" data-np-by></p>
            </div>
            <div class="tool-cluster">
              <div class="clock-readout" data-clock-readout>0:00</div>
              <button type="button" class="tool-btn" data-btn-sound aria-label="Play elegant music" title="Sound">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4"/><path d="M8 7v10"/><path d="M12 5v14"/><path d="M16 8v8"/><path d="M20 10v4"/></svg>
              </button>
              <button type="button" class="tool-btn" data-btn-clock aria-label="Show time spent" title="Time spent">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg>
              </button>
              <button type="button" class="tool-btn" data-btn-share aria-label="Share this strange visit" title="Share">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 13.1 15.7 17.2"/><path d="M15.8 6.8 8.3 10.8"/></svg>
              </button>
            </div>
          </div>

          <p class="share-toast" data-share-toast>Copied - send it to someone curious</p>
          <p class="status" data-status></p>
        </div>
      `;
    }

    _bindRefs() {
      this.$bg = [
        this._root.querySelector('[data-bg="0"]'),
        this._root.querySelector('[data-bg="1"]'),
      ];
      this.$feat = [
        this._root.querySelector('[data-feat="0"]'),
        this._root.querySelector('[data-feat="1"]'),
      ];
      this.$logo = this._root.querySelector("[data-logo]");
      this.$frameImg = this._root.querySelector("[data-frame]");
      this.$tag = this._root.querySelector("[data-tag]");
      this.$count = this._root.querySelector("[data-count]");
      this.$status = this._root.querySelector("[data-status]");
      this.$stack = this._root.querySelector(".stack");
      this.$stage = this._root.querySelector(".stage");
      this.$practical = this._root.querySelector("[data-practical]");
      this.$emails = [...this._root.querySelectorAll("[data-email]")];
      this.$meta = this._root.querySelector("[data-meta]");
      this.$whisper = this._root.querySelector("[data-whisper]");
      this.$whisperLine = this._root.querySelector("[data-whisper-line]");
      this.$whisperNote = this._root.querySelector("[data-whisper-note]");
      this.$brandLockup = this._root.querySelector("[data-brand-lockup]");
      this.$brandMark = this._root.querySelector("[data-brand-mark]");
      this.$btnClock = this._root.querySelector("[data-btn-clock]");
      this.$btnSound = this._root.querySelector("[data-btn-sound]");
      this.$btnShare = this._root.querySelector("[data-btn-share]");
      this.$clockOut = this._root.querySelector("[data-clock-readout]");
      this.$nowPlaying = this._root.querySelector("[data-now-playing]");
      this.$npTitle = this._root.querySelector("[data-np-title]");
      this.$npBy = this._root.querySelector("[data-np-by]");
      this.$shareToast = this._root.querySelector("[data-share-toast]");
    }

    _bindUi() {
      // One handler + short lock so pointer + click do not double-toggle
      this.$btnSound?.addEventListener("pointerup", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        this._onSoundGesture();
      });
      this.$btnSound?.addEventListener("click", (e) => {
        e.preventDefault();
        this._onSoundGesture();
      });
      this.$btnClock?.addEventListener("click", () => this._toggleClock());
      this.$btnShare?.addEventListener("click", () => this._shareVisit());
      this.$brandLockup?.addEventListener("click", () => this._toggleCube());
    }

    _onSoundGesture() {
      const now = performance.now();
      if (this._soundGestureAt && now - this._soundGestureAt < 450) return;
      this._soundGestureAt = now;
      this._toggleMusic();
    }

    _layout() {
      // Always size to the real viewport - Wix wrappers can be narrower
      const w = window.innerWidth || this.clientWidth;
      const h = window.innerHeight || this.clientHeight;
      if (!w || !h || !this.$stack) return;

      const short = Math.min(w, h);
      const isPhone = w <= 720;
      const isTablet = w > 720 && w <= 1024;
      const pad = Math.max(10, Math.round(short * (isPhone ? 0.035 : 0.042)));
      const safeBottom = isPhone ? 56 : 40;
      const availW = Math.max(160, w - pad * 2);
      const availH = Math.max(220, h - pad * 2 - safeBottom);

      const logoSize = clamp(
        short * (isPhone ? 0.095 : 0.11),
        isPhone ? 44 : 52,
        isPhone ? 72 : 96
      );
      const brandH = logoSize + clamp(short * 0.045, 16, 32);
      const metaH = clamp(short * (isPhone ? 0.12 : 0.1), 40, 72);
      const gaps = clamp(short * 0.04, 10, 24) * 2;
      const frameBudgetH = availH - brandH - metaH - gaps;
      const frameBudgetW =
        availW * (isPhone ? 0.78 : isTablet ? 0.58 : 0.48);

      let frame = Math.min(frameBudgetW, frameBudgetH);
      frame = clamp(frame, Math.min(140, availW * 0.7), Math.min(560, availW));
      if (frame > frameBudgetH) frame = frameBudgetH;

      const stackW = Math.min(availW, Math.max(frame * 1.05, short * 0.5));
      const brandSize = clamp(short * (isPhone ? 0.032 : 0.028), 12, 22);
      const tagSize = clamp(short * 0.017, 10, 16);
      const meterSize = clamp(short * 0.014, 9, 14);
      const stackGap = clamp(short * 0.018, 6, 18);
      /* Keep tools fixed; only the logo/frame stack shifts down a few px */
      const nudgeY = isPhone
        ? 10
        : h > w
          ? 8
          : 6;

      this.$stage.style.setProperty("--pad", `${pad}px`);
      this.$stack.style.setProperty("--stack-w", `${Math.round(stackW)}px`);
      this.$stack.style.setProperty("--frame-w", `${Math.round(frame)}px`);
      this.$stack.style.setProperty("--frame-h", `${Math.round(frame)}px`);
      this.$stack.style.setProperty("--logo-size", `${Math.round(logoSize)}px`);
      this.$stack.style.setProperty("--brand-size", `${brandSize}px`);
      this.$stack.style.setProperty("--tag-size", `${tagSize}px`);
      this.$stack.style.setProperty("--meter-size", `${meterSize}px`);
      this.$stack.style.setProperty("--stack-gap", `${stackGap}px`);
      this.$stack.style.setProperty("--nudge-y", `${nudgeY}px`);
    }

    _scheduleReveal() {
      if (this._revealTimer) clearTimeout(this._revealTimer);
      this._revealTimer = window.setTimeout(() => {
        this.$practical?.classList.add("is-on");
        // Amanda holds first; only then begin the slow Partner handoff
        this._startEmailSwap();
      }, this.revealMs);
    }

    _startEmailSwap() {
      if (this._emailTimer) clearInterval(this._emailTimer);
      if (this._emailHoldTimer) clearTimeout(this._emailHoldTimer);
      if (!this.$emails || this.$emails.length < 2) return;

      // Reset to Amanda / Manager and linger before the first swap
      this._emailIdx = 0;
      this.$emails.forEach((el, i) => {
        el.classList.toggle("is-on", i === 0);
      });

      const holdMs = 6500;
      const fadeMs = 1100;

      const swap = () => {
        if (!this.$emails.length) return;
        const leaving = this.$emails[this._emailIdx];
        leaving?.classList.remove("is-on");
        this._emailIdx = (this._emailIdx + 1) % this.$emails.length;
        // Let the fade-out breathe before the next name arrives
        this._emailHoldTimer = window.setTimeout(() => {
          this.$emails[this._emailIdx]?.classList.add("is-on");
        }, Math.round(fadeMs * 0.45));
      };

      this._emailTimer = window.setInterval(swap, holdMs);
    }

    _scheduleSoundUnlock() {
      if (this._soundTimer) clearTimeout(this._soundTimer);
      this._soundTimer = window.setTimeout(() => {
        this._revealToolsStaggered();
      }, this.soundMs);
    }

    /** Sound -> clock -> share, one soft beat apart */
    _revealToolsStaggered() {
      const beat = 240;
      const steps = [
        () => {
          this.$btnSound?.classList.add("is-available");
          this._preloadMusic();
        },
        () => {
          this._clockUnlocked = true;
          this.$btnClock?.classList.add("is-available");
        },
        () => {
          this._shareUnlocked = true;
          this.$btnShare?.classList.add("is-available");
        },
      ];
      steps.forEach((fn, i) => {
        window.setTimeout(fn, i * beat);
      });
      window.setTimeout(() => {
        this._showWhisper(
          "There's music, if you want it.",
          "Sound, time, share - tap when you're ready."
        );
      }, beat * 2 + 280);
    }

    async _boot() {
      this._pool = FALLBACK_IDS.slice();
      this._setStatus("Opening the archive...");
      // Prime hard before any cuts - jitter comes from cutting while decoding
      await this._prime(20);
      this._showFeatured();
      this._start();

      const ids = await this._fetchPool(this.poolSize);
      if (ids.length) {
        this._pool = ids;
        this._bgIndex = 0;
        this._featIndex = 0;
        this._setStatus("");
        await this._prime(40);
        this._warmPool();
      } else {
        this._setStatus("");
        this._warmPool();
      }
    }

    /** Mobile uses smaller IIIF width so decode stays smooth */
    _bgWidth() {
      return window.innerWidth <= 720 ? 843 : 1686;
    }

    async _fetchPool(target) {
      const seen = new Set();
      const out = [];
      const pagesNeeded = Math.ceil(target / 40);
      const jobs = [];

      for (let i = 0; i < pagesNeeded; i++) {
        const q = QUERIES[i % QUERIES.length];
        const page = 1 + Math.floor(i / QUERIES.length);
        jobs.push(this._fetchPage(q, page, 40));
      }

      const pages = await Promise.all(jobs);
      for (const list of pages) {
        for (const id of list) {
          if (!id || seen.has(id)) continue;
          seen.add(id);
          out.push(id);
          if (out.length >= target) return shuffle(out);
        }
      }

      if (out.length < target) {
        const extra = await this._fetchPage("", 1, 100, true);
        for (const id of extra) {
          if (!id || seen.has(id)) continue;
          seen.add(id);
          out.push(id);
          if (out.length >= target) break;
        }
      }

      return shuffle(out);
    }

    async _fetchPage(q, page, limit, publicOnly = false) {
      try {
        const must = [{ term: { is_public_domain: true } }];
        if (q && !publicOnly) {
          must.push({
            multi_match: {
              query: q,
              fields: [
                "title",
                "artist_title",
                "style_titles",
                "classification_titles",
              ],
            },
          });
        }
        const body = {
          query: { bool: { must } },
          fields: ["id", "image_id", "title", "artist_title", "is_public_domain"],
          limit,
          page,
        };
        const res = await fetch(ARTIC, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) return [];
        const json = await res.json();
        const rows = Array.isArray(json.data) ? json.data : [];
        return rows
          .filter((r) => r && r.image_id && r.is_public_domain !== false)
          .map((r) => r.image_id);
      } catch {
        return [];
      }
    }

    _url(id, width) {
      return `${IIIF}/${id}/full/${width},/0/default.jpg`;
    }

    async _prime(n) {
      const width = this._bgWidth();
      const slice = this._pool.slice(0, Math.min(n, this._pool.length));
      await Promise.all(slice.map((id) => this._ensureDecoded(id, width)));
    }

    async _warmPool() {
      if (this._prefetching) return;
      this._prefetching = true;
      const width = this._bgWidth();
      for (let i = 0; i < this._pool.length; i++) {
        if (!this.isConnected) break;
        await this._ensureDecoded(this._pool[i], width);
        // Also warm the alternate size lightly for featured openings
        if (i % 3 === 0) await this._ensureDecoded(this._pool[i], 843);
        if (i % 4 === 0) await wait(0);
      }
      this._prefetching = false;
    }

    _ensureDecoded(id, width) {
      const key = `${id}@${width}`;
      if (this._readyUrls.has(key)) {
        return Promise.resolve({
          id,
          width,
          url: this._readyUrls.get(key),
          ok: true,
        });
      }
      const hit = this._ready.find((x) => x.key === key);
      if (hit) return hit.promise;

      const promise = new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.referrerPolicy = "no-referrer";
        img.onload = async () => {
          try {
            if (img.decode) await img.decode();
          } catch {
            /* ignore */
          }
          this._readyUrls.set(key, img.src);
          this._warmCount = this._readyUrls.size;
          resolve({ id, width, url: img.src, ok: true });
        };
        img.onerror = () => resolve({ id, width, url: "", ok: false });
        img.src = this._url(id, width);
      });

      this._ready.push({ key, promise });
      if (this._ready.length > 900) this._ready.splice(0, 250);
      return promise;
    }

    _cutInterval(now) {
      const reduced =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return 1200;
      // Ramp: slow until the buffer is warm, then full hyperfast
      if (this._warmCount < 16) return 160;
      if (this._warmCount < 40) return 90;
      return this.intervalMs;
    }

    _start() {
      if (this._running) return;
      this._running = true;
      this._lastCut = performance.now();
      const tick = (now) => {
        if (!this._running) return;
        if (now - this._lastCut >= this._cutInterval(now)) {
          this._lastCut = now;
          this._cutBackground();
        }
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
      this._featTimer = window.setInterval(() => this._showFeatured(), 3600);
    }

    _stop() {
      this._running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._featTimer) clearInterval(this._featTimer);
      this._raf = 0;
      this._featTimer = 0;
    }

    _cutBackground() {
      if (!this._pool.length || this._cutting) return;
      this._cutting = true;
      try {
        const width = this._bgWidth();
        // Sync-only path: never await on the cut clock (await = jitter)
        for (let tries = 0; tries < 24; tries++) {
          const id = this._pool[this._bgIndex % this._pool.length];
          this._bgIndex++;
          const key = `${id}@${width}`;
          const url = this._readyUrls.get(key);
          if (!url) {
            this._ensureDecoded(id, width);
            continue;
          }

          const next = 1 - this._activeBg;
          const layer = this.$bg[next];
          const prev = this.$bg[this._activeBg];
          layer.style.backgroundImage = `url("${url}")`;
          // Force paint of hidden layer before flip
          void layer.offsetWidth;
          layer.classList.add("is-on");
          prev.classList.remove("is-on");
          this._activeBg = next;
          this._flashed++;
          if (this.$count) {
            this.$count.textContent = String(this._flashed);
          }
          this._checkRewards();

          // Prefetch a few ahead so the ring stays full
          for (let a = 0; a < 4; a++) {
            const ahead = this._pool[(this._bgIndex + a) % this._pool.length];
            if (ahead) this._ensureDecoded(ahead, width);
          }
          return;
        }
      } finally {
        this._cutting = false;
      }
    }

    async _showFeatured() {
      if (!this._pool.length || !this.$feat) return;
      const id = this._pool[(this._featIndex * 7) % this._pool.length];
      this._featIndex++;
      const result = await this._ensureDecoded(id, 843);
      if (!result.ok || !result.url) return;
      const next = 1 - this._activeFeat;
      this.$feat[next].style.backgroundImage = `url("${result.url}")`;
      this.$feat[next].classList.add("is-on");
      this.$feat[this._activeFeat].classList.remove("is-on");
      this._activeFeat = next;
    }

    _checkRewards() {
      while (this._rewardIdx < REWARDS.length) {
        const next = REWARDS[this._rewardIdx];
        if (this._flashed < next.at) break;
        this._rewardIdx++;
        this._showWhisper(next.line, next.note);
        this._applyUnlock(next.unlock);
        if (next.at >= 4000) this.$practical?.classList.add("is-on");
      }
    }

    _applyUnlock(kind) {
      if (!kind) return;
      if (kind === "clock") {
        this._clockUnlocked = true;
        this.$btnClock?.classList.add("is-available");
      }
      if (kind === "share") {
        this._shareUnlocked = true;
        this.$btnShare?.classList.add("is-available");
      }
      if (kind === "cube") {
        this._cubeUnlocked = true;
        this.$brandLockup?.classList.add("is-toggleable");
        this.$brandLockup?.setAttribute(
          "title",
          "Tap to switch between the mark and the cube"
        );
        // Auto-enter cube once - the payoff moment
        if (!this._cubeMode) this._setCubeMode(true);
      }
    }

    _showWhisper(line, note) {
      if (!this.$whisper) return;
      if (this._whisperTimer) clearTimeout(this._whisperTimer);
      this.$whisperLine.textContent = line;
      this.$whisperNote.textContent = note;
      this.$whisper.classList.remove("is-on");
      this.$meta?.classList.remove("is-whispering");
      void this.$whisper.offsetWidth;
      this.$whisper.classList.add("is-on");
      this.$meta?.classList.add("is-whispering");
      this._whisperTimer = window.setTimeout(() => {
        this.$whisper.classList.remove("is-on");
        this.$meta?.classList.remove("is-whispering");
      }, 5600);
    }

    _elapsedMs() {
      return Math.max(0, performance.now() - this._startedAt);
    }

    _formatElapsed(ms) {
      const total = Math.floor(ms / 1000);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      if (h > 0) {
        return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
      return `${m}:${String(s).padStart(2, "0")}`;
    }

    _formatElapsedWords(ms) {
      const total = Math.floor(ms / 1000);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      if (h > 0) {
        return `${h} hour${h === 1 ? "" : "s"} ${m} minute${m === 1 ? "" : "s"}`;
      }
      if (m > 0) {
        return `${m} minute${m === 1 ? "" : "s"}`;
      }
      return `${s} second${s === 1 ? "" : "s"}`;
    }

    _tickClock() {
      if (!this.$clockOut || !this._clockOn) return;
      this.$clockOut.textContent = this._formatElapsed(this._elapsedMs());
    }

    _toggleClock() {
      if (!this._clockUnlocked) return;
      this._clockOn = !this._clockOn;
      this.$btnClock?.classList.toggle("is-active", this._clockOn);
      this.$clockOut?.classList.toggle("is-on", this._clockOn);
      this._tickClock();
    }

    _toggleCube() {
      if (!this._cubeUnlocked) return;
      this._setCubeMode(!this._cubeMode);
    }

    _setCubeMode(on) {
      this._cubeMode = on;
      this.$brandMark?.classList.toggle("is-cube", on);
    }

    _ensureAudio() {
      if (this._audio) return this._audio;
      const audio = new Audio();
      audio.preload = "auto";
      audio.loop = false;
      audio.volume = 0.45;
      audio.playsInline = true;
      audio.setAttribute("playsinline", "");
      audio.setAttribute("webkit-playsinline", "");
      audio.crossOrigin = "anonymous";
      audio.addEventListener("ended", () => {
        this._trackIdx = (this._trackIdx + 1) % MUSIC.length;
        this._loadTrack(this._trackIdx, true);
        if (this._musicOn) {
          this._audio.play().catch(() => {
            this._advanceTrackAndRetry();
          });
        }
      });
      audio.addEventListener("error", () => {
        if (this._musicOn || this.$btnSound?.classList.contains("is-loading")) {
          this._advanceTrackAndRetry();
        }
      });
      this._audio = audio;
      return audio;
    }

    _preloadMusic() {
      try {
        const audio = this._ensureAudio();
        this._loadTrack(this._trackIdx, false);
        // Kick the network so the first tap is ready to play
        audio.load();
      } catch {
        /* ignore */
      }
    }

    async _toggleMusic() {
      if (!this.$btnSound?.classList.contains("is-available")) return;
      if (this._musicOn) {
        this._stopMusic(false);
        return;
      }
      await this._playMusic();
    }

    async _playMusic() {
      const audio = this._ensureAudio();
      this.$btnSound?.classList.add("is-loading");
      // Optimistic red so the tap always feels heard
      this.$btnSound?.classList.add("is-active");
      this._loadTrack(this._trackIdx, false);

      const tryPlay = async () => {
        await audio.play();
        this._musicOn = true;
        this.$btnSound?.classList.remove("is-loading");
        this.$btnSound?.classList.add("is-active");
        this.$nowPlaying?.classList.add("is-on");
      };

      try {
        if (audio.readyState >= 2) {
          await tryPlay();
          return;
        }
        // Wait briefly for preload, still inside the gesture turn when possible
        await new Promise((resolve, reject) => {
          const onReady = () => {
            cleanup();
            resolve();
          };
          const onErr = () => {
            cleanup();
            reject(new Error("audio error"));
          };
          const cleanup = () => {
            audio.removeEventListener("canplay", onReady);
            audio.removeEventListener("canplaythrough", onReady);
            audio.removeEventListener("error", onErr);
            clearTimeout(timer);
          };
          const timer = setTimeout(onReady, 1200);
          audio.addEventListener("canplay", onReady, { once: true });
          audio.addEventListener("canplaythrough", onReady, { once: true });
          audio.addEventListener("error", onErr, { once: true });
          try {
            audio.load();
          } catch {
            /* ignore */
          }
        });
        await tryPlay();
      } catch {
        // One automatic track hop before we ask them to tap again
        const hopped = await this._advanceTrackAndRetry();
        if (!hopped) {
          this.$btnSound?.classList.remove("is-loading");
          this.$btnSound?.classList.remove("is-active");
          this._showWhisper(
            "Piano is still waking up.",
            "Tap the red sound button one more time."
          );
        }
      }
    }

    async _advanceTrackAndRetry() {
      for (let i = 0; i < MUSIC.length; i++) {
        this._trackIdx = (this._trackIdx + 1) % MUSIC.length;
        this._loadTrack(this._trackIdx, true);
        try {
          await this._audio.play();
          this._musicOn = true;
          this.$btnSound?.classList.remove("is-loading");
          this.$btnSound?.classList.add("is-active");
          this.$nowPlaying?.classList.add("is-on");
          return true;
        } catch {
          /* try next */
        }
      }
      this._stopMusic(false);
      return false;
    }

    _loadTrack(idx, forceReload) {
      const track = MUSIC[idx % MUSIC.length];
      if (!this._audio || !track) return;
      const nextSrc = track.src;
      if (forceReload || this._audio.src !== nextSrc) {
        this._audio.src = nextSrc;
      }
      if (this.$npTitle) this.$npTitle.textContent = track.title;
      if (this.$npBy) this.$npBy.textContent = track.by;
    }

    _stopMusic(destroy) {
      this._musicOn = false;
      this.$btnSound?.classList.remove("is-active");
      this.$btnSound?.classList.remove("is-loading");
      this.$nowPlaying?.classList.remove("is-on");
      if (this._audio) {
        try {
          this._audio.pause();
        } catch {
          /* ignore */
        }
        if (destroy) {
          this._audio.src = "";
          this._audio = null;
        }
      }
    }

    _buildShareText() {
      const n = this._flashed.toLocaleString("en-US");
      const time = this._formatElapsedWords(this._elapsedMs());
      return [
        "Something strange is happening inside a frame in San Antonio.",
        `I stayed for ${time}. ${n} things went through it.`,
        "I still don't know how to explain it.",
        this.shareUrl,
      ].join("\n");
    }

    async _shareVisit() {
      if (!this._shareUnlocked) return;
      const text = this._buildShareText();
      const title = "Through the frame - Barry Framing";

      try {
        if (navigator.share) {
          // text already ends with the URL. Passing url separately makes
          // iOS Messages put the link before AND after the body.
          await navigator.share({ title, text });
          this._flashToast("Shared - curiosity travels");
          return;
        }
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          this._flashToast("Copied - send it to someone curious");
          return;
        }
      } catch {
        /* fall through */
      }

      // Last resort
      window.prompt("Copy this and send it to someone curious:", text);
    }

    _flashToast(msg) {
      if (!this.$shareToast) return;
      this.$shareToast.textContent = msg;
      this.$shareToast.classList.add("is-on");
      if (this._toastTimer) clearTimeout(this._toastTimer);
      this._toastTimer = window.setTimeout(() => {
        this.$shareToast.classList.remove("is-on");
      }, 2600);
    }

    _setStatus(msg) {
      if (this.$status) this.$status.textContent = msg || "";
    }
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function ensureFonts() {
    if (document.getElementById("barry-frame-wall-fonts")) return;
    const link = document.createElement("link");
    link.id = "barry-frame-wall-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Newsreader:opsz,ital,wght@6..72,400;6..72,500;6..72,600&family=Syne:wght@500;600;700;800&display=swap";
    document.head.appendChild(link);
  }

  customElements.define("barry-frame-wall", BarryFrameWall);
})();
