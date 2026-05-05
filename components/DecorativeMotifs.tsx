type MotifProps = {
  className?: string;
};

const ribbonPaths = [
  'M32 650 C152 548 92 420 228 324 C344 242 230 126 382 -30',
  'M58 656 C176 552 118 426 250 330 C362 248 260 136 410 -24',
  'M86 662 C198 560 146 434 274 338 C384 254 292 146 440 -16',
  'M116 668 C222 568 176 444 300 348 C410 264 326 158 472 -8',
  'M148 674 C248 578 208 456 328 360 C438 276 360 172 504 2',
  'M182 680 C276 590 244 470 358 374 C470 290 396 188 538 14',
  'M218 686 C306 604 282 486 392 390 C504 306 432 206 574 28',
];

const contourPaths = [
  'M-92 244 C86 86 294 118 420 238 C546 358 706 242 812 338',
  'M-58 292 C118 152 288 164 398 270 C522 390 678 300 792 382',
  'M-20 342 C148 220 288 214 378 306 C488 418 632 362 760 438',
  'M28 394 C182 286 300 270 368 344 C462 446 588 428 728 500',
  'M84 452 C212 362 318 336 374 392 C450 470 556 500 700 570',
  'M142 512 C248 444 344 408 398 452 C468 510 552 570 680 650',
  'M-70 760 C86 616 226 704 318 582 C404 468 512 568 602 438',
  'M-20 812 C116 700 248 768 336 646 C420 530 508 650 640 520',
  'M38 858 C152 778 278 826 370 718 C454 620 526 724 680 610',
];

const archTiles = [
  { x: 0, y: 0, rotate: 0 },
  { x: 120, y: 0, rotate: 90 },
  { x: 240, y: 0, rotate: 180 },
  { x: 360, y: 0, rotate: 0 },
  { x: 480, y: 0, rotate: 270 },
  { x: 0, y: 120, rotate: 180 },
  { x: 120, y: 120, rotate: 0 },
  { x: 240, y: 120, rotate: 270 },
  { x: 360, y: 120, rotate: 90 },
  { x: 480, y: 120, rotate: 180 },
  { x: 0, y: 240, rotate: 90 },
  { x: 120, y: 240, rotate: 270 },
  { x: 240, y: 240, rotate: 0 },
  { x: 360, y: 240, rotate: 180 },
  { x: 480, y: 240, rotate: 90 },
];

export function FlowRibbon({ className = '' }: MotifProps) {
  return (
    <div className={className} aria-hidden="true">
      <style>{`
        @keyframes ck-flow-float {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-3deg); }
          50% { transform: translate3d(-22px, 18px, 0) rotate(2deg); }
        }
        @keyframes ck-flow-draw {
          0% { stroke-dashoffset: 760; opacity: 0.08; }
          45% { opacity: 0.78; }
          100% { stroke-dashoffset: 0; opacity: 0.42; }
        }
        .ck-flow-float {
          animation: ck-flow-float 22s ease-in-out infinite;
          transform-origin: center;
        }
        .ck-flow-line {
          stroke-dasharray: 760;
          animation: ck-flow-draw 12s ease-in-out infinite alternate;
          vector-effect: non-scaling-stroke;
        }
      `}</style>
      <svg viewBox="0 0 620 700" fill="none" className="ck-flow-float h-full w-full">
        <g stroke="currentColor" strokeLinecap="round">
          {ribbonPaths.map((path, index) => (
            <path
              key={path}
              className="ck-flow-line"
              d={path}
              strokeWidth={index === 3 ? 1.5 : 1}
              style={{ animationDelay: `${index * 0.22}s` }}
            />
          ))}
          <path
            className="ck-flow-line"
            d="M412 -38 C500 120 418 220 492 340 C560 450 508 552 594 704"
            strokeWidth="0.8"
            opacity="0.55"
            style={{ animationDelay: '1.8s' }}
          />
        </g>
      </svg>
    </div>
  );
}

export function ContourField({ className = '' }: MotifProps) {
  return (
    <div className={className} aria-hidden="true">
      <style>{`
        @keyframes ck-contour-drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-34px, 24px, 0) scale(1.04); }
        }
        @keyframes ck-contour-pulse {
          0%, 100% { opacity: 0.34; }
          50% { opacity: 0.82; }
        }
        .ck-contour-drift {
          animation: ck-contour-drift 32s ease-in-out infinite;
          transform-origin: center;
        }
        .ck-contour-line {
          animation: ck-contour-pulse 13s ease-in-out infinite;
          vector-effect: non-scaling-stroke;
        }
      `}</style>
      <svg viewBox="0 0 760 920" fill="none" className="ck-contour-drift h-full w-full">
        <g stroke="currentColor" strokeLinecap="round">
          {contourPaths.map((path, index) => (
            <path
              key={path}
              className="ck-contour-line"
              d={path}
              strokeWidth={index % 3 === 0 ? 1.25 : 0.9}
              style={{ animationDelay: `${index * 0.31}s` }}
            />
          ))}
          <ellipse className="ck-contour-line" cx="528" cy="690" rx="92" ry="158" transform="rotate(28 528 690)" strokeWidth="1" />
          <ellipse className="ck-contour-line" cx="528" cy="690" rx="58" ry="108" transform="rotate(28 528 690)" strokeWidth="0.9" style={{ animationDelay: '1.7s' }} />
        </g>
      </svg>
    </div>
  );
}

export function GeoArchPattern({ className = '' }: MotifProps) {
  return (
    <div className={className} aria-hidden="true">
      <style>{`
        @keyframes ck-geo-pan {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.52; }
          50% { transform: translate3d(22px, -16px, 0); opacity: 0.9; }
        }
        @keyframes ck-geo-draw {
          from { stroke-dashoffset: 280; }
          to { stroke-dashoffset: 0; }
        }
        .ck-geo-pan {
          animation: ck-geo-pan 12s ease-in-out infinite;
        }
        .ck-geo-line {
          stroke-dasharray: 280;
          animation: ck-geo-draw 8s ease-in-out infinite alternate;
          vector-effect: non-scaling-stroke;
        }
      `}</style>
      <svg viewBox="0 0 620 390" fill="none" className="ck-geo-pan h-full w-full">
        <g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
          {archTiles.map((tile, index) => (
            <g key={`${tile.x}-${tile.y}-${tile.rotate}`} transform={`translate(${tile.x} ${tile.y}) rotate(${tile.rotate} 60 60)`}>
              <path className="ck-geo-line" d="M0 120V0H120" style={{ animationDelay: `${index * 0.08}s` }} />
              <path className="ck-geo-line" d="M22 120V22H120" style={{ animationDelay: `${index * 0.1}s` }} />
              <path className="ck-geo-line" d="M0 96C53 96 96 53 96 0" style={{ animationDelay: `${index * 0.12}s` }} />
              <path className="ck-geo-line" d="M58 120C58 86 86 58 120 58" style={{ animationDelay: `${index * 0.14}s` }} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export function FloralMark({ className = '' }: MotifProps) {
  return (
    <div className={className} aria-hidden="true">
      <style>{`
        @keyframes ck-floral-breathe {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.5; }
          50% { transform: scale(1.06) rotate(5deg); opacity: 1; }
        }
        @keyframes ck-floral-draw {
          0% { stroke-dashoffset: 190; }
          100% { stroke-dashoffset: 0; }
        }
        .ck-floral-breathe {
          animation: ck-floral-breathe 15s ease-in-out infinite;
          transform-origin: center;
        }
        .ck-floral-line {
          stroke-dasharray: 190;
          animation: ck-floral-draw 10s ease-in-out infinite alternate;
          vector-effect: non-scaling-stroke;
        }
      `}</style>
      <svg viewBox="0 0 180 180" fill="none" className="ck-floral-breathe h-full w-full">
        <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path className="ck-floral-line" d="M90 22C118 46 118 68 90 90C62 68 62 46 90 22Z" strokeWidth="1.8" />
          <path className="ck-floral-line" d="M158 90C134 118 112 118 90 90C112 62 134 62 158 90Z" strokeWidth="1.8" style={{ animationDelay: '0.4s' }} />
          <path className="ck-floral-line" d="M90 158C62 134 62 112 90 90C118 112 118 134 90 158Z" strokeWidth="1.8" style={{ animationDelay: '0.8s' }} />
          <path className="ck-floral-line" d="M22 90C46 62 68 62 90 90C68 118 46 118 22 90Z" strokeWidth="1.8" style={{ animationDelay: '1.2s' }} />
          <path className="ck-floral-line" d="M54 54C78 50 88 64 90 90C64 88 50 78 54 54Z" strokeWidth="1.3" style={{ animationDelay: '1.6s' }} />
          <path className="ck-floral-line" d="M126 54C130 78 116 88 90 90C92 64 102 50 126 54Z" strokeWidth="1.3" style={{ animationDelay: '2s' }} />
          <path className="ck-floral-line" d="M126 126C102 130 92 116 90 90C116 92 130 102 126 126Z" strokeWidth="1.3" style={{ animationDelay: '2.4s' }} />
          <path className="ck-floral-line" d="M54 126C50 102 64 92 90 90C88 116 78 130 54 126Z" strokeWidth="1.3" style={{ animationDelay: '2.8s' }} />
          <circle cx="90" cy="90" r="5" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}
