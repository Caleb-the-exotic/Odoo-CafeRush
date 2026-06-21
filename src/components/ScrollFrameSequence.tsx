import { useEffect, useRef, useState } from "react";

const FRAME_COUNT = 270;
const FRAME_VERSION = "1";
const framePath = (i: number) =>
  `/frames/ezgif-frame-${String(i + 1).padStart(3, "0")}.jpg?v=${FRAME_VERSION}`;

/**
 * Compact scroll-driven image sequence.
 * A small rectangle that scrubs through all 270 frames based on its own
 * position in the viewport — no tall runway needed, so it fits inline below
 * a heading. It slides in from the left the first time it enters view.
 */
export default function ScrollFrameSequence() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Preload all frames
  useEffect(() => {
    let mounted = true;
    const imgs: HTMLImageElement[] = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = framePath(i);
      img.onload = () => {
        if (!mounted) return;
        if (i === 0) drawFrame(0);
      };
      imgs[i] = img;
    }
    imagesRef.current = imgs;
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    // cover-fit the image into the canvas
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = w / h;
    let dw = w, dh = h, dx = 0, dy = 0;
    if (ir > cr) {
      dh = h;
      dw = h * ir;
      dx = (w - dw) / 2;
    } else {
      dw = w;
      dh = w / ir;
      dy = (h - dh) / 2;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  // Reveal-on-enter + scroll scrubbing based on viewport position
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setRevealed(true);
      },
      { threshold: 0.2 },
    );
    io.observe(wrap);

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const rect = wrap.getBoundingClientRect();
        const vh = window.innerHeight;
        // progress: 0 as the box enters from the bottom, 1 as it exits the top
        const total = vh + rect.height;
        const scrolled = vh - rect.top;
        const progress = Math.min(Math.max(scrolled / total, 0), 1);
        const idx = Math.min(
          FRAME_COUNT - 1,
          Math.max(0, Math.round(progress * (FRAME_COUNT - 1))),
        );
        if (idx !== frameRef.current) {
          frameRef.current = idx;
          drawFrame(idx);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrapRef}
      className={[
        "mt-8 w-full max-w-sm",
        "transition-all duration-700 ease-out will-change-transform",
        revealed ? "translate-x-0 opacity-100" : "-translate-x-12 opacity-0",
      ].join(" ")}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-ink/10 bg-ink/5 shadow-lg shadow-ink/10">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>
    </div>
  );
}
