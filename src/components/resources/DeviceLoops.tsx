import { useEffect, useRef, useState, type ReactElement } from "react";
import { LOOPS_CAPTION, RELEASE_LOOPS } from "../../content/site/releases";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

type Loop = (typeof RELEASE_LOOPS)[keyof typeof RELEASE_LOOPS];

/**
 * A short looping capture of the real dashboard. Plays muted and inline, only while on screen, and stops on "Pause".
 * With reduced motion the visitor gets the still poster instead, and the video is never downloaded.
 */
function LoopScreen({ loop, paused }: { loop: Loop; paused: boolean }): ReactElement {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // the property, so autoplay is allowed everywhere
    if (paused) {
      v.pause();
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      void v.play().catch(() => {});
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.15 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [paused, reduce]);

  if (reduce) {
    return <img src={`${loop.base}.webp`} alt={loop.label} width={loop.width} height={loop.height} decoding="async" />;
  }
  return (
    <video ref={ref} autoPlay muted loop playsInline preload="metadata" width={loop.width} height={loop.height} aria-label={loop.label}>
      <source src={`${loop.base}.webm`} type="video/webm" />
      <source src={`${loop.base}.mp4`} type="video/mp4" />
    </video>
  );
}

/** A laptop and a phone (CSS frames, no images) playing the 1.3 captures. */
export function DeviceLoops(): ReactElement {
  const reduce = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  return (
    <figure className="zrs-stage">
      <div className="zrs-stage__devices">
        <div className="zrs-laptop">
          <div className="zrs-laptop__lid">
            <div className="zrs-laptop__screen">
              <LoopScreen loop={RELEASE_LOOPS.laptop} paused={paused} />
            </div>
          </div>
          <div className="zrs-laptop__base" aria-hidden="true" />
        </div>
        <div className="zrs-phone">
          <div className="zrs-phone__screen">
            <LoopScreen loop={RELEASE_LOOPS.phone} paused={paused} />
          </div>
        </div>
      </div>
      <figcaption className="zrs-stage__caption">
        <span>{LOOPS_CAPTION}</span>
        {reduce ? null : (
          <button type="button" className="zrs-stage__toggle" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
            {paused ? "Play the videos" : "Pause the videos"}
          </button>
        )}
      </figcaption>
    </figure>
  );
}
