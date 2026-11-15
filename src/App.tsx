import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Play,
  RotateCcw,
  ShoppingBag,
  SlidersHorizontal,
  User,
} from 'lucide-react';
import {
  BALL_EDITIONS,
  EDITORIAL_SECTIONS,
  type BallEdition,
  type FinishId,
} from './data/editions';
import { BasketballStage, type DragState } from './three/BasketballStage';
import { HudOverlays } from './components/HudOverlays';
import { CartDrawer, type CartItem } from './components/CartDrawer';
import { ContactModal, PromoModal } from './components/Modals';

export default function App() {
  const [editionIdx, setEditionIdx] = useState(0);
  const currentEdition: BallEdition = BALL_EDITIONS[editionIdx];

  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollProgressRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 3D Studio Inspector Dock state
  const [controlsOpen, setControlsOpen] = useState(false);
  const [explodedFactor, setExplodedFactor] = useState(0);
  const [autoSpin, setAutoSpin] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);

  // Shopping bag & modals
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  // Contact Us inline section form state
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // Pointer drag & hover state for Three.js ball interaction
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    velX: 0,
    velY: 0,
  });
  const isHoveredRef = useRef(false);
  const pointerNdcRef = useRef({ x: 0, y: 0 });
  const [isDraggingUi, setIsDraggingUi] = useState(false);

  // Wheel step scroll state: Hero (0) -> About Us (1) -> Contact Us (6)
  const wheelLockUntilRef = useRef(0);
  const wheelAccumRef = useRef(0);
  const wheelResetTimerRef = useRef<number | null>(null);
  const wheelTargetSectionRef = useRef(0);

  // Scroll listener syncing continuous 3D choreography + section index
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const stageH = el.clientHeight || 1;
    const progress = el.scrollTop / stageH;
    scrollProgressRef.current = progress;
    setScrollProgress(progress);

    const nearest = Math.min(
      EDITORIAL_SECTIONS.length - 1,
      Math.max(0, Math.round(progress))
    );
    setActiveSection(nearest);
    if (Date.now() > wheelLockUntilRef.current) {
      wheelTargetSectionRef.current = nearest;
    }
  }, []);

  const scrollToSection = useCallback((index: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const clamped = Math.min(EDITORIAL_SECTIONS.length - 1, Math.max(0, index));
    wheelTargetSectionRef.current = clamped;
    const stageH = el.clientHeight || 1;
    el.scrollTo({
      top: clamped * stageH,
      behavior: 'smooth',
    });
  }, []);

  const stepPrimaryScroll = useCallback(
    (direction: 1 | -1) => {
      const current =
        Date.now() < wheelLockUntilRef.current
          ? wheelTargetSectionRef.current
          : activeSection;

      const target = Math.min(
        EDITORIAL_SECTIONS.length - 1,
        Math.max(0, current + direction)
      );
      if (target === current) return;

      wheelLockUntilRef.current = Date.now() + 650;
      scrollToSection(target);
    },
    [activeSection, scrollToSection]
  );

  // Keyboard shortcut 'H' for 3D Studio Controls + Arrow/Page scroll navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setControlsOpen((prev) => !prev);
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        stepPrimaryScroll(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        stepPrimaryScroll(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stepPrimaryScroll]);

  const handleStageWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (cartOpen || promoOpen || contactOpen) return;
      if (e.target instanceof HTMLTextAreaElement) return;

      const delta = e.deltaY;
      if (Math.abs(delta) < 4) return;

      wheelAccumRef.current += delta;
      if (wheelResetTimerRef.current !== null) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
      wheelResetTimerRef.current = window.setTimeout(() => {
        wheelAccumRef.current = 0;
      }, 140);

      if (Date.now() < wheelLockUntilRef.current) {
        wheelAccumRef.current = 0;
        return;
      }

      if (Math.abs(wheelAccumRef.current) >= 24) {
        const dir: 1 | -1 = wheelAccumRef.current > 0 ? 1 : -1;
        wheelAccumRef.current = 0;
        stepPrimaryScroll(dir);
      }
    },
    [cartOpen, promoOpen, contactOpen, stepPrimaryScroll]
  );

  // Pointer drag handlers on the stage
  const handleStagePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, [data-interactive="true"]')) {
      return;
    }
    dragStateRef.current.isDragging = true;
    dragStateRef.current.lastX = e.clientX;
    dragStateRef.current.lastY = e.clientY;
    dragStateRef.current.velX = 0;
    dragStateRef.current.velY = 0;
    setIsDraggingUi(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleStagePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerNdcRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdcRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    isHoveredRef.current = true;

    if (!dragStateRef.current.isDragging) return;
    const dx = e.clientX - dragStateRef.current.lastX;
    const dy = e.clientY - dragStateRef.current.lastY;
    dragStateRef.current.lastX = e.clientX;
    dragStateRef.current.lastY = e.clientY;

    // Tactile angular velocity impulse
    dragStateRef.current.velX = dx * 0.0085;
    dragStateRef.current.velY = dy * 0.0065;
  }, []);

  const handleStagePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current.isDragging) {
      dragStateRef.current.isDragging = false;
      setIsDraggingUi(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if not captured
      }
    }
  }, []);

  const handleStagePointerLeave = useCallback(() => {
    isHoveredRef.current = false;
    dragStateRef.current.isDragging = false;
    setIsDraggingUi(false);
  }, []);

  const handlePrevEdition = () => {
    setEditionIdx((prev) => (prev - 1 + BALL_EDITIONS.length) % BALL_EDITIONS.length);
  };

  const handleNextEdition = () => {
    setEditionIdx((prev) => (prev + 1) % BALL_EDITIONS.length);
  };

  const addEditionToCart = (edition: BallEdition) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.edition.id === edition.id);
      if (existing) {
        return prev.map((i) =>
          i.edition.id === edition.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { edition, quantity: 1 }];
    });
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 1100);
  };

  const updateCartQty = (id: FinishId, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.edition.id === id
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeCartItem = (id: FinishId) => {
    setCartItems((prev) => prev.filter((item) => item.edition.id !== id));
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    /* Permanent Vivid Signal Vermilion Outer Bezel */
    <div className="h-screen w-screen bg-[#F13507] p-3 md:p-5 overflow-hidden select-none">
      {/* Single Rounded Obsidian Stage */}
      <div
        className={`relative w-full h-full rounded-[22px] md:rounded-[28px] bg-[#000000] overflow-hidden ${
          isDraggingUi ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={
          {
            '--edition-accent': currentEdition.uiAccentHex,
            '--edition-accent-hover': currentEdition.uiAccentHoverHex,
            '--edition-accent-text': currentEdition.uiAccentTextHex,
          } as React.CSSProperties
        }
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerLeave={handleStagePointerLeave}
        onWheel={handleStageWheel}
      >
        {/* z-0: Monumental Watermark, Radial Spotlight & SVG Telemetry HUD */}
        <HudOverlays edition={currentEdition} scrollProgress={scrollProgress} />

        {/* z-10: Persistent Full-Stage Interactive Three.js WebGL Canvas */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <BasketballStage
            edition={currentEdition}
            scrollProgressRef={scrollProgressRef}
            explodedFactor={explodedFactor}
            autoSpin={autoSpin}
            resetSignal={resetSignal}
            dragStateRef={dragStateRef}
            isHoveredRef={isHoveredRef}
            pointerNdcRef={pointerNdcRef}
          />
        </div>

        {/* z-30: Minimal Transparent Top Chrome */}
        <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-10 py-5 md:py-7 pointer-events-none">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => scrollToSection(0)}
            className="pointer-events-auto flex items-center gap-2.5 text-left group cursor-pointer"
            aria-label="SLAM DUNK Home"
          >
            <svg
              viewBox="0 0 32 32"
              className="w-7 h-7 text-white shrink-0 transition-transform duration-200 group-hover:rotate-45"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="16" cy="16" r="13.5" stroke="currentColor" strokeWidth="2.2" />
              <path d="M2.5 16H29.5" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M10.5 4.2C14.2 9.2 14.2 22.8 10.5 27.8"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M21.5 4.2C17.8 9.2 17.8 22.8 21.5 27.8"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
            <span className="font-condensed font-bold text-[15px] leading-[0.88] tracking-[0.04em] uppercase text-white">
              SLAM
              <br />
              DUNK
            </span>
          </button>

          {/* 3 Centered Nav Links */}
          <nav className="pointer-events-auto hidden md:flex items-center gap-10 text-[12px] tracking-[0.02em]">
            <button
              type="button"
              onClick={() => scrollToSection(0)}
              className={`transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                activeSection === 0
                  ? 'text-[var(--edition-accent)] font-medium'
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              Products
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(1)}
              className={`transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                activeSection === 1
                  ? 'text-white font-medium'
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              About us
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(2)}
              className={`transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                activeSection === 2
                  ? 'text-[var(--edition-accent)] font-medium'
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              Contacts
            </button>
          </nav>

          {/* Minimal 1.5px Utility Icons */}
          <div className="pointer-events-auto flex items-center gap-5">
            <button
              type="button"
              onClick={() => setControlsOpen((prev) => !prev)}
              className={`transition-colors duration-200 cursor-pointer ${
                controlsOpen ? 'text-[var(--edition-accent)]' : 'text-[#A1A1AA] hover:text-white'
              }`}
              aria-label="Toggle 3D Studio Controls"
              title="3D Studio Controls (H)"
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="text-[#A1A1AA] hover:text-white transition-colors duration-200 cursor-pointer"
              aria-label="Account and Team Concierge"
            >
              <User className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative text-[#A1A1AA] hover:text-white transition-colors duration-200 cursor-pointer"
              aria-label="Open Equipment Bag"
            >
              <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.5} />
              {/* Static 6px Edition Accent Status Dot */}
              <span
                className={`absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-[var(--edition-accent)] transition-opacity duration-200 ${
                  totalCartCount > 0 ? 'opacity-100' : 'opacity-80'
                }`}
              />
            </button>
          </div>
        </header>

        {/* z-30: Right-Edge Vertical Monospace Progress Rail */}
        <aside
          className="hidden sm:flex flex-col items-center gap-3 absolute right-6 top-1/2 -translate-y-1/2 z-30 pointer-events-auto"
          aria-label="Section Progress"
        >
          <span className="w-[1px] h-8 bg-white/10" />
          <span className="writing-vertical-rl font-mono-tabular text-[10px] tracking-[0.22em] text-[var(--edition-accent)] py-1 transition-colors duration-200">
            {EDITORIAL_SECTIONS[activeSection].index} / 03
          </span>
          <div className="flex flex-col items-center gap-1.5 py-1">
            {EDITORIAL_SECTIONS.map((sec, idx) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(idx)}
                aria-label={`Jump to ${sec.label}`}
                title={`${sec.index} · ${sec.label}`}
                className="group py-0.5 px-1 cursor-pointer"
              >
                <span
                  className={`block h-[1px] transition-all duration-300 ${
                    idx === activeSection
                      ? 'w-4 bg-[var(--edition-accent)]'
                      : 'w-2 bg-white/20 group-hover:w-3 group-hover:bg-white/60'
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="w-[1px] h-8 bg-white/10" />
        </aside>

        {/* z-20: Scrollable 3-Section Editorial Container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative z-20 w-full h-full overflow-y-auto snap-y snap-mandatory no-scrollbar pointer-events-none scroll-smooth"
        >
          {/* ================= SECTION 01: HERO ================= */}
          <section
            id="hero"
            className="relative w-full h-full min-h-full snap-start px-6 md:px-12 pt-24 pb-6 md:pb-8 flex flex-col justify-between"
          >
            {/* Upper-Left Promotion Video Trigger */}
            <div className="mt-4 md:mt-8">
              <button
                type="button"
                onClick={() => setPromoOpen(true)}
                className="pointer-events-auto inline-flex items-center gap-3.5 group cursor-pointer"
              >
                <span className="w-11 h-11 rounded-full border border-white/22 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black group-hover:border-white transition-colors duration-200">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </span>
                <span className="text-left text-[11px] leading-[1.35] text-[#A1A1AA] group-hover:text-white transition-colors duration-200">
                  Promotion
                  <br />
                  video
                </span>
              </button>
            </div>

            {/* Centerpiece is purely the 3D Ball (z-10) over SPALDING watermark (z-0) */}
            <div className="flex-1 flex items-end justify-center pb-4">
              <p className="text-[9px] font-mono-tabular uppercase tracking-[0.28em] text-[#71717A]/80">
                {currentEdition.name} · DRAG BALL TO INSPECT IN 3D
              </p>
            </div>

            {/* Bottom 3-Column Dock */}
            <div className="grid grid-cols-3 items-end gap-4">
              {/* Left: Price + Size Spec */}
              <div className="pointer-events-auto">
                <div className="text-[28px] sm:text-[36px] md:text-[42px] font-light tracking-[-0.02em] text-[var(--edition-accent)] tabular-nums leading-none transition-colors duration-200">
                  {currentEdition.price}
                </div>
                <div className="mt-2.5 text-[9px] md:text-[10px] uppercase tracking-[0.22em] text-[#A1A1AA] whitespace-nowrap">
                  {currentEdition.sizeSpec}
                </div>
              </div>

              {/* Center: Edition-Themed Primary CTA */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => addEditionToCart(currentEdition)}
                  className="pointer-events-auto bg-[var(--edition-accent)] hover:bg-[var(--edition-accent-hover)] text-[var(--edition-accent-text)] rounded-[4px] px-5 sm:px-7 md:px-9 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors duration-200 cursor-pointer whitespace-nowrap"
                >
                  {addedFlash ? 'ADDED TO BAG' : 'ADD TO CART'}
                </button>
              </div>

              {/* Right: Prev / Next Circular Controls */}
              <div className="flex items-center justify-end gap-2.5 md:gap-3">
                <button
                  type="button"
                  onClick={handlePrevEdition}
                  className="pointer-events-auto w-10 h-10 md:w-11 md:h-11 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black hover:border-white transition-colors duration-200 cursor-pointer"
                  aria-label="Previous Basketball Edition"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={handleNextEdition}
                  className="pointer-events-auto w-10 h-10 md:w-11 md:h-11 rounded-full border border-white/20 bg-white text-black flex items-center justify-center hover:bg-[var(--edition-accent)] hover:text-[var(--edition-accent-text)] hover:border-[var(--edition-accent)] transition-colors duration-200 cursor-pointer"
                  aria-label="Next Basketball Edition"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </section>

          {/* ================= SECTION 02: ELITE CONTROL (ABOUT US) ================= */}
          <section
            id="elite-control"
            className="relative w-full h-full min-h-full snap-start px-6 md:px-14 pt-28 md:pt-32 pb-14 md:pb-16 flex items-center"
          >
            {/* Left Editorial Column Framed by Faint 1px Structural Hairlines */}
            <div className="relative max-w-[330px] border-x border-white/10 px-5 md:px-6 py-5">
              <h2
                className="font-display uppercase text-white leading-[0.94] tracking-[-0.02em] mb-5"
                style={{ fontSize: 'clamp(32px, 3.8vw, 48px)' }}
              >
                <span className="block mb-1.5">ELITE</span>
                <span>
                  CONTROL<span className="text-[var(--edition-accent)]">.</span>
                </span>
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[24px] md:text-[30px] font-light tracking-[-0.02em] text-white tabular-nums leading-none">
                      100%
                    </span>
                  </div>
                  <p className="mt-1.5 text-[9px] uppercase tracking-[0.22em] text-[#A1A1AA] font-medium">
                    FULL-GRAIN MICROFIBER
                  </p>
                  <p className="mt-1 text-[11px] leading-[1.5] text-[#71717A] max-w-[245px]">
                    Engineered moisture-wicking composite leather channels perspiration away on impact for unwavering palm command.
                  </p>
                </div>

                <div className="pt-3.5 border-t border-white/10">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[24px] md:text-[30px] font-light tracking-[-0.02em] text-white tabular-nums leading-none">
                      0.5
                    </span>
                    <span className="text-[13px] text-[#71717A] font-mono-tabular">
                      mm
                    </span>
                  </div>
                  <p className="mt-1.5 text-[9px] uppercase tracking-[0.22em] text-[#A1A1AA] font-medium">
                    PEBBLE ELEVATION
                  </p>
                  <p className="mt-1 text-[11px] leading-[1.5] text-[#71717A] max-w-[245px]">
                    Calibrated micro-pebble relief maximizes fingertip contact surface area across all eight stitched panels.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ================= SECTION 03: CONTACT US ================= */}
          <section
            id="contact-us"
            className="relative w-full h-full min-h-full snap-start pl-6 pr-12 md:pl-14 md:pr-16 pt-20 md:pt-24 pb-4 md:pb-6 flex items-center justify-end overflow-hidden"
          >
            <div className="pointer-events-auto w-full max-w-[360px] md:max-w-[400px] flex flex-col">
              <div className="w-full bg-[#040508]/95 border border-white/12 rounded-[4px] p-4 md:p-5">
                <div className="inline-block border border-white/22 rounded-sm px-2 py-0.5 mb-2">
                  <span className="text-[8px] uppercase tracking-[0.26em] text-[#A1A1AA]">
                    CONCIERGE &amp; TEAM ORDERS
                  </span>
                </div>

                <h2
                  className="font-display uppercase text-white leading-[0.88] tracking-[-0.02em] mb-2.5"
                  style={{ fontSize: 'clamp(24px, 2.8vw, 36px)' }}
                >
                  CONTACT US<span className="text-[var(--edition-accent)]">.</span>
                </h2>

                {contactSent ? (
                  <div className="py-6 text-center border-t border-white/10">
                    <div className="w-9 h-9 rounded-full bg-[var(--edition-accent)] mx-auto flex items-center justify-center mb-2.5">
                      <Check className="w-4 h-4 text-[var(--edition-accent-text)]" strokeWidth={2} />
                    </div>
                    <p className="font-condensed text-lg uppercase tracking-wider text-white">
                      Inquiry Received
                    </p>
                    <p className="mt-1 text-[11px] text-[#71717A]">
                      Our equipment specialist will respond within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!contactEmail.trim()) return;
                      setContactSent(true);
                      window.setTimeout(() => {
                        setContactSent(false);
                        setContactEmail('');
                        setContactMessage('');
                      }, 2200);
                    }}
                    className="space-y-2.5 border-t border-white/10 pt-3"
                  >
                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.22em] text-[#A1A1AA] mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="coach@club.org"
                        className="w-full bg-[#0A0A0C] border border-white/15 rounded-[4px] px-3 py-1.5 text-[11px] text-white placeholder:text-[#71717A] focus:outline-none focus:border-white/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.22em] text-[#A1A1AA] mb-1">
                        Specification / Quantity
                      </label>
                      <textarea
                        rows={2}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Arena team allocation, custom debossing, or press inquiry..."
                        className="w-full bg-[#0A0A0C] border border-white/15 rounded-[4px] px-3 py-1.5 text-[11px] text-white placeholder:text-[#71717A] focus:outline-none focus:border-white/50 resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-[var(--edition-accent)] hover:bg-[var(--edition-accent-hover)] text-[var(--edition-accent-text)] rounded-[4px] py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 cursor-pointer"
                    >
                      SEND INQUIRY
                    </button>
                  </form>
                )}
              </div>

              <footer className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[9px] uppercase tracking-[0.16em] text-[#71717A]">
                <span>studio@slamdunk-athletics.com</span>
                <span>&copy; 2026 SLAM DUNK ATHLETICS · ALL RIGHTS RESERVED</span>
              </footer>
            </div>
          </section>
        </div>

        {/* z-30: Collapsible 3D Studio Control Dock (Opened via Header Controls Icon or 'H') */}
        {controlsOpen && (
          <div
            data-interactive="true"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center max-w-[94vw]"
          >
            <div className="bg-[#0A0A0C] border border-white/15 rounded-[4px] px-4 py-3 flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {/* Edition / Finish Swatches */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono-tabular uppercase tracking-[0.2em] text-[#71717A]">
                  Finish
                </span>
                <div className="flex items-center gap-1.5">
                  {BALL_EDITIONS.map((ed, idx) => (
                    <button
                      key={ed.id}
                      type="button"
                      onClick={() => setEditionIdx(idx)}
                      title={ed.name}
                      aria-label={`Select ${ed.name} finish`}
                      className={`w-5 h-5 rounded-full border transition-transform duration-150 cursor-pointer ${
                        idx === editionIdx
                          ? 'border-white scale-110'
                          : 'border-white/25 hover:border-white/70'
                      }`}
                      style={{ backgroundColor: ed.swatchHex }}
                    />
                  ))}
                </div>
              </div>

              <span className="hidden sm:block w-[1px] h-4 bg-white/10" />

              {/* Exploded View Slider */}
              <div className="flex items-center gap-2.5">
                <label
                  htmlFor="exploded-slider"
                  className="text-[9px] font-mono-tabular uppercase tracking-[0.2em] text-[#71717A]"
                >
                  Explode
                </label>
                <input
                  id="exploded-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={explodedFactor}
                  onChange={(e) => setExplodedFactor(parseFloat(e.target.value))}
                  className="w-24 accent-[var(--edition-accent)] cursor-pointer"
                />
                <span className="w-8 text-[10px] font-mono-tabular text-white">
                  {Math.round(explodedFactor * 100)}%
                </span>
              </div>

              <span className="hidden sm:block w-[1px] h-4 bg-white/10" />

              {/* Auto-Spin, Reset & Hide Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoSpin((s) => !s)}
                  className={`px-2.5 py-1 rounded-[4px] border text-[9px] font-mono-tabular uppercase tracking-[0.18em] transition-colors cursor-pointer ${
                    autoSpin
                      ? 'bg-[var(--edition-accent)] border-[var(--edition-accent)] text-[var(--edition-accent-text)]'
                      : 'border-white/20 text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {autoSpin ? 'Spin: On' : 'Spin: Off'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExplodedFactor(0);
                    setResetSignal((n) => n + 1);
                  }}
                  className="px-2.5 py-1 rounded-[4px] border border-white/20 text-[9px] font-mono-tabular uppercase tracking-[0.18em] text-[#A1A1AA] hover:bg-white hover:text-black transition-colors flex items-center gap-1 cursor-pointer"
                  title="Reset 3D orientation"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={() => setControlsOpen(false)}
                  className="px-2 py-1 rounded-[4px] border border-white/20 text-[9px] font-mono-tabular uppercase tracking-[0.18em] text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                  aria-label="Hide 3D Controls"
                >
                  <ChevronDown className="w-3 h-3 text-[var(--edition-accent)]" />
                  <span>Hide</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drawers & Modals */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQty={updateCartQty}
        onRemove={removeCartItem}
        onAddEdition={addEditionToCart}
        onClearCart={() => setCartItems([])}
      />

      <PromoModal
        open={promoOpen}
        onClose={() => setPromoOpen(false)}
        edition={currentEdition}
      />

      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
      />
    </div>
  );
}
