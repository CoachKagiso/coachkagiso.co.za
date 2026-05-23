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

const SOURCE_TRIM_SECONDS = 0.85;
const SOURCE_DURATION_SECONDS = 35.18;
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
  align: "left" | "right" | "center";
  tone: "cream" | "ink" | "rose";
};

const captions: Caption[] = [
  {
    start: 0.85,
    end: 4.55,
    lines: ["I am making this video", "for future self"],
    highlight: "future self",
  },
  {
    start: 4.55,
    end: 8.75,
    lines: ["to remind her that", "time does heal"],
    highlight: "time does heal",
  },
  {
    start: 8.75,
    end: 12.85,
    lines: ["it gets better", "with time"],
    highlight: "better",
  },
  {
    start: 12.85,
    end: 16.1,
    lines: ["I'm super excited", "for this weekend"],
    highlight: "this weekend",
  },
  {
    start: 16.1,
    end: 20.9,
    lines: ["going to celebrate", "my birthday"],
    highlight: "birthday",
  },
  {
    start: 20.9,
    end: 27.2,
    lines: ["great company", "great conversations"],
    highlight: "great conversations",
  },
  {
    start: 27.2,
    end: 30.55,
    lines: ["reminding you, KG", "listen"],
    highlight: "KG",
  },
  {
    start: 30.55,
    end: 33.15,
    lines: ["life's not bad", "after all"],
    highlight: "not bad",
  },
];

const callouts: Callout[] = [
  {
    start: 1.1,
    end: 6.4,
    kicker: "Note to future KG",
    title: "Time does heal.",
    body: "Keep this one for the days that feel heavy.",
    align: "left",
    tone: "cream",
  },
  {
    start: 9.0,
    end: 13.4,
    kicker: "Reminder",
    title: "It gets better with time.",
    align: "right",
    tone: "ink",
  },
  {
    start: 14.4,
    end: 21.0,
    kicker: "Birthday weekend",
    title: "Joy is allowed.",
    body: "Great company. Great conversations.",
    align: "left",
    tone: "rose",
  },
  {
    start: 27.55,
    end: 33.25,
    kicker: "KG, listen",
    title: "Life's not bad after all.",
    align: "center",
    tone: "cream",
  },
];

const zoomCuts = [
  { start: 0, end: 4.7, scale: 1.02, x: 0, y: 0 },
  { start: 4.7, end: 9.1, scale: 1.075, x: -26, y: 8 },
  { start: 9.1, end: 14.0, scale: 1.045, x: 18, y: -4 },
  { start: 14.0, end: 20.9, scale: 1.09, x: -18, y: 12 },
  { start: 20.9, end: 27.45, scale: 1.055, x: 26, y: 0 },
  { start: 27.45, end: EDIT_DURATION_SECONDS, scale: 1.095, x: -20, y: 16 },
];

const shiftToEditSeconds = (sourceSeconds: number) =>
  Math.max(0, sourceSeconds - SOURCE_TRIM_SECONDS);

const secondsToFrame = (seconds: number, fps: number) =>
  Math.round(seconds * fps);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const useEntrance = (duration = 14) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, duration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, duration], [26, 0], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, duration], [0.96, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return { opacity, y, scale };
};

const VideoLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const activeCut =
    zoomCuts.find((cut) => seconds >= cut.start && seconds < cut.end) ??
    zoomCuts[zoomCuts.length - 1];
  const segmentProgress = clamp(
    (seconds - activeCut.start) / Math.max(0.1, activeCut.end - activeCut.start),
    0,
    1,
  );
  const drift = interpolate(segmentProgress, [0, 1], [0, 1], {
    easing: easeInOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const breathing = Math.sin((frame / fps) * Math.PI * 0.12) * 3;

  return (
    <AbsoluteFill style={{ backgroundColor: "#080706" }}>
      <Video
        src={staticFile("source.mp4")}
        trimBefore={secondsToFrame(SOURCE_TRIM_SECONDS, fps)}
        objectFit="cover"
        volume={(f) =>
          interpolate(
            f,
            [
              0,
              secondsToFrame(0.25, fps),
              secondsToFrame(EDIT_DURATION_SECONDS - 0.75, fps),
              secondsToFrame(EDIT_DURATION_SECONDS, fps),
            ],
            [0, 1, 1, 0.2],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          )
        }
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${activeCut.scale + drift * 0.01}) translate(${activeCut.x + breathing}px, ${activeCut.y}px)`,
          transformOrigin: "50% 45%",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(4, 3, 3, 0.44) 0%, rgba(4, 3, 3, 0.05) 24%, rgba(4, 3, 3, 0.03) 52%, rgba(4, 3, 3, 0.74) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 38%, rgba(255, 221, 182, 0.12), transparent 39%), radial-gradient(circle at 20% 100%, rgba(201, 173, 152, 0.18), transparent 42%)",
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};

const ProgressAccent: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 62,
          left: 64,
          right: 64,
          height: 5,
          borderRadius: 999,
          backgroundColor: "rgba(255, 248, 236, 0.22)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            borderRadius: 999,
            background:
              "linear-gradient(90deg, #f6dfc9 0%, #c9ad98 46%, #fff6e9 100%)",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 86,
          left: 64,
          color: "#fff8ec",
          fontFamily: "Arial, sans-serif",
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: 0,
          textShadow: "0 3px 14px rgba(0,0,0,0.42)",
          textTransform: "uppercase",
        }}
      >
        Future self note
      </div>
    </AbsoluteFill>
  );
};

const CalloutCard: React.FC<{ callout: Callout }> = ({ callout }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const enter = useEntrance(13);
  const total = secondsToFrame(
    shiftToEditSeconds(callout.end) - shiftToEditSeconds(callout.start),
    fps,
  );
  const exit = interpolate(frame, [total - 12, total], [1, 0], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const palette = {
    cream: {
      background: "rgba(255, 248, 236, 0.9)",
      color: "#19120f",
      accent: "#b86e54",
      border: "rgba(255,255,255,0.48)",
    },
    ink: {
      background: "rgba(16, 13, 12, 0.82)",
      color: "#fff8ec",
      accent: "#e5c6ac",
      border: "rgba(255,255,255,0.2)",
    },
    rose: {
      background: "rgba(201, 173, 152, 0.92)",
      color: "#17110f",
      accent: "#fff8ec",
      border: "rgba(255,255,255,0.34)",
    },
  }[callout.tone];
  const horizontal =
    callout.align === "left"
      ? { left: 60, right: "auto" }
      : callout.align === "right"
        ? { right: 60, left: "auto" }
        : { left: 76, right: 76 };
  const top = callout.align === "center" ? 520 : 218;

  return (
    <div
      style={{
        position: "absolute",
        top,
        ...horizontal,
        width: callout.align === "center" ? "auto" : 650,
        transform: `translateY(${enter.y}px) scale(${enter.scale}) rotate(${callout.align === "right" ? 1.2 : -1.1}deg)`,
        opacity: enter.opacity * exit,
        padding: "30px 34px",
        borderRadius: 24,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        boxShadow: "0 28px 80px rgba(0,0,0,0.32)",
      }}
    >
      <div
        style={{
          color: palette.accent,
          fontFamily: "Arial, sans-serif",
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: 0,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {callout.kicker}
      </div>
      <div
        style={{
          color: palette.color,
          fontFamily: "Georgia, serif",
          fontSize: callout.align === "center" ? 58 : 52,
          fontWeight: 800,
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
            fontSize: 27,
            fontWeight: 700,
            lineHeight: 1.14,
            letterSpacing: 0,
            marginTop: 20,
            opacity: 0.82,
          }}
        >
          {callout.body}
        </div>
      ) : null}
    </div>
  );
};

const CaptionBlock: React.FC<{ caption: Caption }> = ({ caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = useEntrance(9);
  const total = secondsToFrame(
    shiftToEditSeconds(caption.end) - shiftToEditSeconds(caption.start),
    fps,
  );
  const exit = interpolate(frame, [total - 8, total], [1, 0], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = interpolate(frame, [0, 8, 18], [0.96, 1.02, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 58,
        right: 58,
        bottom: 150,
        opacity: enter.opacity * exit,
        transform: `translateY(${enter.y}px) scale(${pulse})`,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          maxWidth: "100%",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 9,
          padding: "18px 22px 22px",
          borderRadius: 28,
          background:
            "linear-gradient(135deg, rgba(15, 11, 10, 0.82), rgba(15, 11, 10, 0.54))",
          boxShadow: "0 22px 62px rgba(0,0,0,0.36)",
          border: "1px solid rgba(255,255,255,0.16)",
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
                color: isHighlight ? "#fff2da" : "#ffffff",
                fontFamily: "Arial, sans-serif",
                fontSize: isHighlight ? 66 : 54,
                fontWeight: 900,
                lineHeight: 0.94,
                letterSpacing: 0,
                textShadow:
                  "0 3px 0 rgba(0,0,0,0.6), 0 10px 24px rgba(0,0,0,0.46)",
                padding: isHighlight ? "6px 14px 10px" : "0 8px",
                borderRadius: 18,
                background: isHighlight
                  ? "linear-gradient(90deg, rgba(184,110,84,0.98), rgba(201,173,152,0.94))"
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

const SparkMarks: React.FC = () => {
  const frame = useCurrentFrame();
  const twinkle = Math.sin(frame * 0.11);
  const marks = [
    { top: 372, left: 830, size: 60, delay: 0 },
    { top: 456, left: 778, size: 28, delay: 8 },
    { top: 1050, left: 86, size: 42, delay: 16 },
  ];

  return (
    <AbsoluteFill>
      {marks.map((mark) => {
        const opacity = interpolate(
          twinkle + Math.sin((frame - mark.delay) * 0.07),
          [-2, 2],
          [0.18, 0.72],
        );

        return (
          <div
            key={`${mark.top}-${mark.left}`}
            style={{
              position: "absolute",
              top: mark.top,
              left: mark.left,
              width: mark.size,
              height: mark.size,
              opacity,
              transform: `rotate(${45 + frame * 0.08}deg)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "46%",
                left: 0,
                right: 0,
                height: 5,
                borderRadius: 999,
                backgroundColor: "#fff0d6",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "46%",
                top: 0,
                bottom: 0,
                width: 5,
                borderRadius: 999,
                backgroundColor: "#fff0d6",
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const FinalNote: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = useEntrance(16);
  const heartBeat = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [0.985, 1.025],
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        background:
          "linear-gradient(180deg, rgba(7,5,5,0.08), rgba(7,5,5,0.76))",
        opacity: enter.opacity,
      }}
    >
      <div
        style={{
          width: "100%",
          padding: "54px 46px 58px",
          borderRadius: 32,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(12, 9, 8, 0.66)",
          boxShadow: "0 36px 100px rgba(0,0,0,0.42)",
          transform: `translateY(${enter.y}px) scale(${heartBeat})`,
        }}
      >
        <div
          style={{
            color: "#c9ad98",
            fontFamily: "Arial, sans-serif",
            fontSize: 25,
            fontWeight: 800,
            letterSpacing: 0,
            textTransform: "uppercase",
            marginBottom: 18,
          }}
        >
          Save this feeling
        </div>
        <div
          style={{
            color: "#fff8ec",
            fontFamily: "Georgia, serif",
            fontSize: 82,
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: 0,
          }}
        >
          Love you lots, K.
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
      <ProgressAccent />
      <SparkMarks />
      {callouts.map((callout) => (
        <Sequence
          key={`${callout.kicker}-${callout.title}`}
          from={secondsToFrame(shiftToEditSeconds(callout.start), fps)}
          durationInFrames={secondsToFrame(
            shiftToEditSeconds(callout.end) -
              shiftToEditSeconds(callout.start),
            fps,
          )}
          premountFor={fps}
        >
          <CalloutCard callout={callout} />
        </Sequence>
      ))}
      {captions.map((caption) => (
        <Sequence
          key={`${caption.start}-${caption.lines.join("-")}`}
          from={secondsToFrame(shiftToEditSeconds(caption.start), fps)}
          durationInFrames={secondsToFrame(
            shiftToEditSeconds(caption.end) - shiftToEditSeconds(caption.start),
            fps,
          )}
          premountFor={fps}
        >
          <CaptionBlock caption={caption} />
        </Sequence>
      ))}
      <Sequence
        from={secondsToFrame(shiftToEditSeconds(33.4), fps)}
        durationInFrames={secondsToFrame(1.78, fps)}
        premountFor={fps}
      >
        <FinalNote />
      </Sequence>
    </AbsoluteFill>
  );
};
