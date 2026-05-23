import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const SOURCE_TRIM_SECONDS = 0.65;
const SOURCE_DURATION_SECONDS = 141.2;
const EDIT_DURATION_SECONDS = SOURCE_DURATION_SECONDS - SOURCE_TRIM_SECONDS;

type Caption = {
  start: number;
  end: number;
  lines: string[];
  highlight?: string;
};

type Callout = {
  start: number;
  end: number;
  kicker: string;
  title: string;
  body?: string;
  variant: "cream" | "navy" | "teal";
  x: "left" | "right" | "center";
  y: number;
};

const captions: Caption[] = [
  {
    start: 1.0,
    end: 8.7,
    lines: ["continuing the", "career clarity tips"],
    highlight: "career clarity",
  },
  {
    start: 8.7,
    end: 14.9,
    lines: ["a 3-part series", "on career planning"],
    highlight: "3-part series",
  },
  {
    start: 14.9,
    end: 23.5,
    lines: ["honest, real", "and raw"],
    highlight: "raw",
  },
  {
    start: 23.5,
    end: 30.6,
    lines: ["uncomfortable conversations", "with yourself"],
    highlight: "uncomfortable",
  },
  {
    start: 30.6,
    end: 38.4,
    lines: ["you can still make", "a difference"],
    highlight: "difference",
  },
  {
    start: 48.4,
    end: 58.5,
    lines: ["I feel stuck", "I don't know what to do"],
    highlight: "stuck",
  },
  {
    start: 58.5,
    end: 70.7,
    lines: ["you do know", "but risk feels heavy"],
    highlight: "risk",
  },
  {
    start: 70.7,
    end: 83.4,
    lines: ["comfortable can become", "the riskiest place"],
    highlight: "riskiest",
  },
  {
    start: 83.4,
    end: 99.3,
    lines: ["you want more", "take the risk anyway"],
    highlight: "more",
  },
  {
    start: 99.3,
    end: 105.9,
    lines: ["staying too long", "is also a risk"],
    highlight: "also a risk",
  },
  {
    start: 105.9,
    end: 119.0,
    lines: ["pivot", "or transition"],
    highlight: "pivot",
  },
  {
    start: 119.0,
    end: 126.1,
    lines: ["grow as an individual", "harness your personal brand"],
    highlight: "personal brand",
  },
  {
    start: 126.1,
    end: 132.0,
    lines: ["follow the series", "it's about to get real"],
    highlight: "get real",
  },
];

const callouts: Callout[] = [
  {
    start: 1.0,
    end: 11.7,
    kicker: "New series",
    title: "Career Planning",
    body: "3 parts. Honest. Practical. Direct.",
    variant: "cream",
    x: "left",
    y: 220,
  },
  {
    start: 15.1,
    end: 25.2,
    kicker: "The tone",
    title: "Honest. Real. Raw.",
    body: "For the conversations you keep postponing.",
    variant: "navy",
    x: "right",
    y: 245,
  },
  {
    start: 31.5,
    end: 43.2,
    kicker: "2026 check-in",
    title: "There is still time.",
    body: "A clear decision can change the direction of the year.",
    variant: "teal",
    x: "left",
    y: 210,
  },
  {
    start: 51.5,
    end: 64.2,
    kicker: "Client pattern",
    title: "I feel stuck.",
    body: "Same space. Same doubts. Same delay.",
    variant: "cream",
    x: "center",
    y: 280,
  },
  {
    start: 77.4,
    end: 92.7,
    kicker: "Hard truth",
    title: "Comfort is not always safety.",
    body: "Sometimes it is the risk you stopped noticing.",
    variant: "navy",
    x: "right",
    y: 255,
  },
  {
    start: 105.9,
    end: 126.6,
    kicker: "This series helps you",
    title: "Pivot. Transition. Build your brand.",
    body: "Choose the next move with less fog.",
    variant: "cream",
    x: "left",
    y: 210,
  },
];

const zoomCuts = [
  { start: 0, end: 12, scale: 1.03, x: 0, y: 8 },
  { start: 12, end: 25, scale: 1.08, x: -24, y: 10 },
  { start: 25, end: 39, scale: 1.045, x: 20, y: -4 },
  { start: 39, end: 54, scale: 1.09, x: -14, y: 12 },
  { start: 54, end: 72, scale: 1.055, x: 18, y: 0 },
  { start: 72, end: 92, scale: 1.095, x: -22, y: 14 },
  { start: 92, end: 113, scale: 1.055, x: 12, y: 4 },
  { start: 113, end: EDIT_DURATION_SECONDS, scale: 1.08, x: -16, y: 6 },
];

const shift = (seconds: number) => Math.max(0, seconds - SOURCE_TRIM_SECONDS);
const toFrame = (seconds: number, fps: number) => Math.round(seconds * fps);
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);

const useInOut = (totalFrames: number, inFrames = 14, outFrames = 12) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, inFrames], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(frame, [totalFrames - outFrames, totalFrames], [1, 0], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return {
    opacity: enter * exit,
    y: interpolate(enter, [0, 1], [28, 0]),
    scale: interpolate(enter, [0, 1], [0.965, 1]),
  };
};

const VideoLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const activeCut =
    zoomCuts.find((cut) => seconds >= cut.start && seconds < cut.end) ??
    zoomCuts[zoomCuts.length - 1];
  const progress = clamp(
    (seconds - activeCut.start) / Math.max(0.1, activeCut.end - activeCut.start),
    0,
    1,
  );
  const drift = interpolate(progress, [0, 1], [0, 1], {
    easing: easeInOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const breathing = Math.sin(seconds * Math.PI * 0.09) * 3.5;

  return (
    <AbsoluteFill style={{ backgroundColor: "#09131e" }}>
      <Video
        src={staticFile("source.mp4")}
        trimBefore={toFrame(SOURCE_TRIM_SECONDS, fps)}
        objectFit="cover"
        volume={(f) =>
          interpolate(
            f,
            [
              0,
              toFrame(0.3, fps),
              toFrame(EDIT_DURATION_SECONDS - 0.8, fps),
              toFrame(EDIT_DURATION_SECONDS, fps),
            ],
            [0, 1, 1, 0.28],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )
        }
        style={{
          width: "100%",
          height: "100%",
          filter: "saturate(1.08) contrast(1.05) brightness(0.96)",
          transform: `scale(${activeCut.scale + drift * 0.008}) translate(${activeCut.x + breathing}px, ${activeCut.y}px)`,
          transformOrigin: "50% 42%",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(9,19,30,0.62) 0%, rgba(9,19,30,0.06) 23%, rgba(9,19,30,0.03) 55%, rgba(9,19,30,0.82) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 14% 10%, rgba(201,173,152,0.26), transparent 32%), radial-gradient(circle at 92% 78%, rgba(34,116,122,0.20), transparent 36%)",
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};

const TopChrome: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 58,
          left: 58,
          right: 58,
          height: 6,
          borderRadius: 999,
          backgroundColor: "rgba(255,248,236,0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            borderRadius: 999,
            background:
              "linear-gradient(90deg, #c9ad98 0%, #fff8ec 48%, #22747a 100%)",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 88,
          left: 58,
          display: "flex",
          gap: 12,
          alignItems: "center",
          color: "#fff8ec",
          fontFamily: "Arial, sans-serif",
          fontSize: 24,
          fontWeight: 900,
          letterSpacing: 0,
          textTransform: "uppercase",
          textShadow: "0 5px 18px rgba(0,0,0,0.35)",
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: "#c9ad98",
            display: "inline-block",
          }}
        />
        Career Planning Series
      </div>
      <div
        style={{
          position: "absolute",
          top: 84,
          right: 58,
          color: "#fff8ec",
          fontFamily: "Arial, sans-serif",
          fontSize: 24,
          fontWeight: 900,
          letterSpacing: 0,
          padding: "7px 13px",
          borderRadius: 999,
          backgroundColor: "rgba(20,35,52,0.64)",
          border: "1px solid rgba(255,255,255,0.16)",
        }}
      >
        3 parts
      </div>
    </AbsoluteFill>
  );
};

const CalloutCard: React.FC<{ callout: Callout }> = ({ callout }) => {
  const { fps } = useVideoConfig();
  const totalFrames = toFrame(shift(callout.end) - shift(callout.start), fps);
  const anim = useInOut(totalFrames);
  const palette = {
    cream: {
      background: "rgba(255,248,236,0.92)",
      color: "#142334",
      accent: "#9b6b55",
      border: "rgba(255,255,255,0.48)",
    },
    navy: {
      background: "rgba(20,35,52,0.88)",
      color: "#fff8ec",
      accent: "#c9ad98",
      border: "rgba(255,255,255,0.18)",
    },
    teal: {
      background: "rgba(18,90,95,0.88)",
      color: "#fff8ec",
      accent: "#f1d4bc",
      border: "rgba(255,255,255,0.18)",
    },
  }[callout.variant];
  const horizontal =
    callout.x === "left"
      ? { left: 58, right: "auto" }
      : callout.x === "right"
        ? { right: 58, left: "auto" }
        : { left: 74, right: 74 };

  return (
    <div
      style={{
        position: "absolute",
        top: callout.y,
        ...horizontal,
        width: callout.x === "center" ? "auto" : 660,
        opacity: anim.opacity,
        transform: `translateY(${anim.y}px) scale(${anim.scale}) rotate(${callout.x === "right" ? 1.1 : -0.8}deg)`,
        padding: "30px 34px 34px",
        borderRadius: 28,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        boxShadow: "0 30px 90px rgba(0,0,0,0.34)",
      }}
    >
      <div
        style={{
          color: palette.accent,
          fontFamily: "Arial, sans-serif",
          fontSize: 23,
          fontWeight: 900,
          letterSpacing: 0,
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        {callout.kicker}
      </div>
      <div
        style={{
          color: palette.color,
          fontFamily: "Georgia, serif",
          fontSize: callout.title.length > 28 ? 47 : 58,
          fontWeight: 900,
          lineHeight: 0.98,
          letterSpacing: 0,
        }}
      >
        {callout.title}
      </div>
      {callout.body ? (
        <div
          style={{
            color: palette.color,
            fontFamily: "Arial, sans-serif",
            fontSize: 28,
            fontWeight: 800,
            lineHeight: 1.14,
            letterSpacing: 0,
            marginTop: 20,
            opacity: 0.84,
          }}
        >
          {callout.body}
        </div>
      ) : null}
    </div>
  );
};

const CaptionBlock: React.FC<{ caption: Caption }> = ({ caption }) => {
  const { fps } = useVideoConfig();
  const totalFrames = toFrame(shift(caption.end) - shift(caption.start), fps);
  const anim = useInOut(totalFrames, 9, 8);
  const frame = useCurrentFrame();
  const pop = interpolate(frame, [0, 8, 18], [0.965, 1.018, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 56,
        right: 56,
        bottom: 140,
        opacity: anim.opacity,
        transform: `translateY(${anim.y}px) scale(${pop})`,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          maxWidth: "100%",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 8,
          padding: "18px 20px 22px",
          borderRadius: 26,
          background:
            "linear-gradient(135deg, rgba(20,35,52,0.88), rgba(20,35,52,0.58))",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 24px 70px rgba(0,0,0,0.38)",
        }}
      >
        {caption.lines.map((line) => {
          const isHighlight = line
            .toLowerCase()
            .includes((caption.highlight ?? "").toLowerCase());

          return (
            <div
              key={line}
              style={{
                display: "inline-block",
                color: "#fff8ec",
                fontFamily: "Arial, sans-serif",
                fontSize: isHighlight ? 62 : 53,
                fontWeight: 950,
                lineHeight: 0.96,
                letterSpacing: 0,
                textShadow:
                  "0 3px 0 rgba(0,0,0,0.55), 0 11px 25px rgba(0,0,0,0.46)",
                padding: isHighlight ? "7px 13px 10px" : "0 8px",
                borderRadius: 17,
                background: isHighlight
                  ? "linear-gradient(90deg, rgba(201,173,152,0.98), rgba(34,116,122,0.92))"
                  : "transparent",
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SeriesRoadmap: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [
    { number: "01", title: "Face the stuckness", start: 43 },
    { number: "02", title: "Choose the risk", start: 71 },
    { number: "03", title: "Make the move", start: 106 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: 54,
        right: 54,
        top: 1260,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {items.map((item, index) => {
        const slide = interpolate(frame, [index * 8, index * 8 + 18], [30, 0], {
          easing: easeOut,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={item.number}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "18px 22px",
              borderRadius: 22,
              backgroundColor: "rgba(255,248,236,0.9)",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
              transform: `translateX(${slide}px)`,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#142334",
                color: "#fff8ec",
                fontFamily: "Arial, sans-serif",
                fontSize: 28,
                fontWeight: 950,
                letterSpacing: 0,
              }}
            >
              {item.number}
            </div>
            <div
              style={{
                color: "#142334",
                fontFamily: "Arial, sans-serif",
                fontSize: 31,
                fontWeight: 900,
                letterSpacing: 0,
              }}
            >
              {item.title}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DecisionMeter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = toFrame(25, fps);
  const anim = useInOut(totalFrames, 14, 14);
  const localSeconds = frame / fps;
  const fill = interpolate(localSeconds, [0, 18], [18, 86], {
    easing: easeInOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 58,
        right: 58,
        top: 1110,
        padding: "26px 28px 30px",
        borderRadius: 30,
        backgroundColor: "rgba(255,248,236,0.92)",
        boxShadow: "0 26px 80px rgba(0,0,0,0.32)",
        border: "1px solid rgba(255,255,255,0.32)",
        opacity: anim.opacity,
        transform: `translateY(${anim.y}px) scale(${anim.scale})`,
      }}
    >
      <div
        style={{
          color: "#9b6b55",
          fontFamily: "Arial, sans-serif",
          fontSize: 23,
          fontWeight: 950,
          letterSpacing: 0,
          textTransform: "uppercase",
          marginBottom: 20,
        }}
      >
        Decision meter
      </div>
      <div
        style={{
          height: 18,
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(34,116,122,0.25), rgba(201,173,152,0.42), rgba(184,83,64,0.44))",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${fill}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, #22747a, #b85340)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 14,
          color: "#142334",
          fontFamily: "Arial, sans-serif",
          fontSize: 25,
          fontWeight: 900,
          letterSpacing: 0,
        }}
      >
        <span>Familiar</span>
        <span>Riskier</span>
        <span>Growth</span>
      </div>
    </div>
  );
};

const ClosingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = toFrame(9, fps);
  const anim = useInOut(totalFrames, 18, 10);
  const glow = interpolate(Math.sin((frame / fps) * Math.PI * 1.5), [-1, 1], [
    0.25,
    0.54,
  ]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 72,
        opacity: anim.opacity,
        background:
          "linear-gradient(180deg, rgba(9,19,30,0.08), rgba(9,19,30,0.78))",
      }}
    >
      <div
        style={{
          width: "100%",
          padding: "52px 44px 58px",
          borderRadius: 34,
          backgroundColor: "rgba(20,35,52,0.86)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: `0 0 90px rgba(201,173,152,${glow})`,
          transform: `translateY(${anim.y}px) scale(${anim.scale})`,
        }}
      >
        <div
          style={{
            color: "#c9ad98",
            fontFamily: "Arial, sans-serif",
            fontSize: 26,
            fontWeight: 950,
            letterSpacing: 0,
            textTransform: "uppercase",
            marginBottom: 18,
          }}
        >
          Coming up next
        </div>
        <div
          style={{
            color: "#fff8ec",
            fontFamily: "Georgia, serif",
            fontSize: 76,
            fontWeight: 900,
            lineHeight: 0.96,
            letterSpacing: 0,
          }}
        >
          Career planning that gets real.
        </div>
        <div
          style={{
            color: "rgba(255,248,236,0.82)",
            fontFamily: "Arial, sans-serif",
            fontSize: 31,
            fontWeight: 800,
            lineHeight: 1.14,
            letterSpacing: 0,
            marginTop: 26,
          }}
        >
          Follow the 3-part series.
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <VideoLayer />
      <TopChrome />
      <Sequence
        from={toFrame(shift(42.8), fps)}
        durationInFrames={toFrame(26, fps)}
        premountFor={fps}
      >
        <SeriesRoadmap />
      </Sequence>
      <Sequence
        from={toFrame(shift(69.8), fps)}
        durationInFrames={toFrame(25, fps)}
        premountFor={fps}
      >
        <DecisionMeter />
      </Sequence>
      {callouts.map((callout) => (
        <Sequence
          key={`${callout.kicker}-${callout.title}`}
          from={toFrame(shift(callout.start), fps)}
          durationInFrames={toFrame(shift(callout.end) - shift(callout.start), fps)}
          premountFor={fps}
        >
          <CalloutCard callout={callout} />
        </Sequence>
      ))}
      {captions.map((caption) => (
        <Sequence
          key={`${caption.start}-${caption.lines.join("-")}`}
          from={toFrame(shift(caption.start), fps)}
          durationInFrames={toFrame(shift(caption.end) - shift(caption.start), fps)}
          premountFor={fps}
        >
          <CaptionBlock caption={caption} />
        </Sequence>
      ))}
      <Sequence
        from={toFrame(shift(133.8), fps)}
        durationInFrames={toFrame(7, fps)}
        premountFor={fps}
      >
        <ClosingCard />
      </Sequence>
    </AbsoluteFill>
  );
};
