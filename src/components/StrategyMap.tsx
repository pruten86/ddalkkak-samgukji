import { useMemo } from 'react';
import { ALL_CITY_IDS, FACTIONS } from '../game/data';
import { getCombatForecast } from '../game/engine';
import type {
  CityBurstEffect,
  CityId,
  CityState,
  CommandMode,
  ForecastLevel,
  MarchArrowEffect,
  MarchRatio,
  PlayableFactionId,
} from '../game/types';

interface StrategyMapProps {
  cities: Record<CityId, CityState>;
  playerFaction: PlayableFactionId;
  selectedCityId: CityId | null;
  commandMode: CommandMode;
  marchRatio: MarchRatio;
  marchArrows: MarchArrowEffect[];
  cityBursts: CityBurstEffect[];
  shakeMap: boolean;
  onSelectCity: (cityId: CityId) => void;
}

const FORECAST_STYLES: Record<ForecastLevel, { bg: string; text: string; stroke: string }> = {
  우세: { bg: '#1e6b43', text: '#ffffff', stroke: '#124229' },
  박빙: { bg: '#b4690e', text: '#ffffff', stroke: '#6e3d05' },
  열세: { bg: '#a82921', text: '#ffffff', stroke: '#661510' },
};

// Layered East Asian sumi-e ink-wash mountain silhouettes positioned cleanly away from city nodes
const MOUNTAIN_RANGES = [
  // Qinling (진령산맥 - west of Luoyang / north of Hanzhong)
  {
    back: 'M122,256 Q152,218 182,240 Q206,210 236,248 Q254,235 270,256 Z',
    front: 'M102,272 Q134,234 166,258 Q192,232 222,264 Q240,252 256,272 Z',
    ridge: 'M135,244 Q158,236 178,252 M194,242 Q212,246 226,260',
  },
  // Western Shu Alps (촉도 서부 산맥)
  {
    back: 'M28,364 Q58,308 88,342 Q112,312 138,358 Z',
    front: 'M36,442 Q68,396 102,428 Q134,402 168,446 Z',
    ridge: 'M60,322 Q78,334 94,352 M72,412 Q94,422 114,436',
  },
  // Taihang Mountains (태항산맥 - northwest of Ye & Luoyang)
  {
    back: 'M330,148 Q366,102 402,132 Q434,94 470,136 Q492,120 512,148 Z',
    front: 'M356,154 Q392,118 424,142 Q452,114 486,154 Z',
    ridge: 'M390,126 Q412,134 428,148 M450,122 Q468,134 480,148',
  },
  // Yan Mountains (연산산맥 - north of Beiping)
  {
    back: 'M534,64 Q568,28 602,52 Q634,26 672,58 Q696,42 716,64 Z',
    front: 'M554,70 Q584,42 616,60 Q646,40 682,70 Z',
    ridge: 'M586,46 Q604,54 620,64',
  },
  // Dabie Mountains (대별산맥 - between Xiangyang & Hefei)
  {
    back: 'M434,316 Q458,286 484,306 Q506,288 528,316 Z',
    front: 'M446,322 Q470,298 494,314 Q512,302 532,322 Z',
    ridge: 'M468,304 Q484,310 496,318',
  },
  // Nanling & Wuyi Mountains (남령·무이산맥 - south of Jiangling/Changsha/Kuaiji)
  {
    back: 'M208,476 Q244,432 280,462 Q314,434 350,476 Z',
    front: 'M228,484 Q260,448 294,474 Q322,452 356,484 Z',
    ridge: 'M260,454 Q278,464 294,478',
  },
  {
    back: 'M512,486 Q546,446 578,472 Q606,448 636,486 Z',
    front: 'M530,492 Q560,462 590,482 Q614,466 640,492 Z',
    ridge: 'M560,468 Q576,476 590,486',
  },
];

// Subtle static hanji mulberry fiber lines (zero runtime filter overhead)
const HANJI_FIBERS = [
  'M42,38 Q56,34 68,40',
  'M210,55 Q225,52 242,58',
  'M480,36 Q498,40 512,35',
  'M128,195 Q142,190 156,196',
  'M695,210 Q708,215 722,208',
  'M84,488 Q102,484 118,492',
  'M368,518 Q388,514 406,520',
  'M612,512 Q632,508 648,515',
  'M312,285 Q324,282 336,287',
  'M590,262 Q604,265 616,260',
];

export function StrategyMap({
  cities,
  playerFaction,
  selectedCityId,
  commandMode,
  marchRatio,
  marchArrows,
  cityBursts,
  shakeMap,
  onSelectCity,
}: StrategyMapProps) {
  // Unique undirected road edges
  const roads = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ from: CityState; to: CityState; key: string }> = [];
    for (const id of ALL_CITY_IDS) {
      const c = cities[id];
      for (const adjId of c.adjacent) {
        const key = id < adjId ? `${id}-${adjId}` : `${adjId}-${id}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({ from: c, to: cities[adjId], key });
        }
      }
    }
    return list;
  }, [cities]);

  const selectedCity = selectedCityId ? cities[selectedCityId] : null;

  // Determine valid targets for current command mode
  const validTargets = useMemo(() => {
    const map = new Map<
      CityId,
      { kind: 'attack' | 'transport' | 'fire'; forecast?: ForecastLevel }
    >();
    if (!selectedCity || selectedCity.owner !== playerFaction) return map;
    if (commandMode === 'idle') return map;

    for (const adjId of selectedCity.adjacent) {
      const target = cities[adjId];
      if (commandMode === 'march') {
        if (target.owner === playerFaction) {
          map.set(adjId, { kind: 'transport' });
        } else {
          map.set(adjId, {
            kind: 'attack',
            forecast: getCombatForecast(selectedCity, target, marchRatio),
          });
        }
      } else if (commandMode === 'fire' && target.owner !== playerFaction) {
        map.set(adjId, { kind: 'fire' });
      }
    }
    return map;
  }, [selectedCity, playerFaction, commandMode, cities, marchRatio]);

  return (
    <div
      data-testid="strategy-map-container"
      className={`relative w-full overflow-hidden rounded-lg border border-[#bda884] bg-[#f4ead5] shadow-sm ${
        shakeMap ? 'animate-map-shake' : ''
      }`}
    >
      <svg
        viewBox="0 0 800 550"
        className="block h-auto w-full select-none"
        role="img"
        aria-label="삼국지 15개 성지 전략 고지도"
        data-testid="strategy-map-svg"
      >
        <defs>
          {/* Parchment radial vignette */}
          <radialGradient id="parchment-grad" cx="50%" cy="48%" r="68%">
            <stop offset="0%" stopColor="#f8f1e1" />
            <stop offset="70%" stopColor="#efe2c6" />
            <stop offset="100%" stopColor="#dfd0b0" />
          </radialGradient>

          {/* Ink-wash mountain gradients */}
          <linearGradient id="mountain-back" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6b6152" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#8c7d65" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="mountain-front" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#544b3e" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#7c6e58" stopOpacity="0.06" />
          </linearGradient>

          {/* River wash gradients */}
          <linearGradient id="yellow-river-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9c8a5e" stopOpacity="0.48" />
            <stop offset="50%" stopColor="#897b52" stopOpacity="0.64" />
            <stop offset="100%" stopColor="#69858c" stopOpacity="0.54" />
          </linearGradient>

          <linearGradient id="yangtze-river-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5d838e" stopOpacity="0.48" />
            <stop offset="55%" stopColor="#4c7585" stopOpacity="0.64" />
            <stop offset="100%" stopColor="#3f697d" stopOpacity="0.56" />
          </linearGradient>

          {/* Eastern Sea coastal wash */}
          <linearGradient id="east-sea-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b8c9c7" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#7d9ba1" stopOpacity="0.34" />
          </linearGradient>

          {/* Arrowhead marker */}
          <marker
            id="march-arrowhead"
            markerWidth="9"
            markerHeight="9"
            refX="7"
            refY="4.5"
            orient="auto"
          >
            <path d="M1,1 L8,4.5 L1,8 L2.6,4.5 Z" fill="#231f1a" />
          </marker>
        </defs>

        {/* Base Hanji Parchment Layer */}
        <rect x="0" y="0" width="800" height="550" fill="url(#parchment-grad)" />

        {/* Subtle hand-crafted mulberry fiber flecks */}
        <g stroke="#b69f78" strokeWidth="0.9" fill="none" opacity="0.35" aria-hidden="true">
          {HANJI_FIBERS.map((d, i) => (
            <path key={i} d={d} strokeLinecap="round" />
          ))}
        </g>

        {/* Subtle Eastern Sea (동해) coastal tint */}
        <path
          d="M720,0 L800,0 L800,550 L735,550 C755,470 760,390 735,315 C715,250 742,160 725,95 C715,50 720,20 720,0 Z"
          fill="url(#east-sea-grad)"
        />
        {/* Delicate cartographic sea wave arcs */}
        <g stroke="#6c878d" strokeWidth="1" fill="none" opacity="0.38">
          <path d="M748,145 Q756,140 764,145 T780,145" />
          <path d="M754,154 Q762,149 770,154 T786,154" />
          <path d="M745,285 Q753,280 761,285 T777,285" />
          <path d="M750,410 Q758,405 766,410 T782,410" />
        </g>

        {/* Antique Cartography Scroll Frame */}
        <rect
          x="10"
          y="10"
          width="780"
          height="530"
          fill="none"
          stroke="#9e8a67"
          strokeWidth="1.4"
          opacity="0.65"
        />
        <rect
          x="15"
          y="15"
          width="770"
          height="520"
          fill="none"
          stroke="#b39f7c"
          strokeWidth="0.7"
          strokeDasharray="4 4"
          opacity="0.5"
        />

        {/* Traditional Cartographic Compass Emblem (top-left quiet corner) */}
        <g transform="translate(64, 66)" opacity="0.6" aria-hidden="true">
          <circle cx="0" cy="0" r="24" fill="none" stroke="#857358" strokeWidth="1" />
          <circle cx="0" cy="0" r="19" fill="none" stroke="#857358" strokeWidth="0.6" strokeDasharray="2 2" />
          <polygon points="0,-18 4,-4 0,-7 -4,-4" fill="#8b2e24" />
          <polygon points="0,18 4,4 0,7 -4,4" fill="#6b5c47" />
          <polygon points="18,0 4,4 7,0 4,-4" fill="#6b5c47" />
          <polygon points="-18,0 -4,4 -7,0 -4,-4" fill="#6b5c47" />
          <text
            x="0"
            y="-28"
            textAnchor="middle"
            fontSize="10"
            fontFamily="'Noto Serif KR', serif"
            fill="#695840"
            fontWeight="700"
          >
            北
          </text>
        </g>

        {/* Layered Sumi-e Ink-Wash Mountain Silhouettes */}
        <g aria-hidden="true">
          {MOUNTAIN_RANGES.map((m, idx) => (
            <g key={idx}>
              <path d={m.back} fill="url(#mountain-back)" />
              <path d={m.front} fill="url(#mountain-front)" />
              <path
                d={m.ridge}
                fill="none"
                stroke="#5b4e3d"
                strokeWidth="1.1"
                strokeLinecap="round"
                opacity="0.32"
              />
            </g>
          ))}
        </g>

        {/* Yellow River (황하) */}
        <g aria-hidden="true">
          <path
            d="M40,165 C105,150 155,105 225,108 C285,112 312,175 365,180 C432,186 486,162 565,172 C628,180 688,158 758,136"
            fill="none"
            stroke="url(#yellow-river-grad)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M40,165 C105,150 155,105 225,108 C285,112 312,175 365,180 C432,186 486,162 565,172 C628,180 688,158 758,136"
            fill="none"
            stroke="#f5ecd8"
            strokeWidth="1.4"
            strokeDasharray="10 12"
            opacity="0.45"
          />
          <text
            x="165"
            y="100"
            fontSize="12"
            fontFamily="'Noto Serif KR', serif"
            fontWeight="700"
            fill="#7a6845"
            opacity="0.82"
          >
            황하
          </text>
        </g>

        {/* Yangtze River (장강) */}
        <g aria-hidden="true">
          <path
            d="M48,430 C115,436 190,425 256,392 C328,358 378,368 446,374 C518,380 582,366 645,356 C698,348 738,340 778,334"
            fill="none"
            stroke="url(#yangtze-river-grad)"
            strokeWidth="13.5"
            strokeLinecap="round"
          />
          <path
            d="M48,430 C115,436 190,425 256,392 C328,358 378,368 446,374 C518,380 582,366 645,356 C698,348 738,340 778,334"
            fill="none"
            stroke="#f5ecd8"
            strokeWidth="1.5"
            strokeDasharray="12 14"
            opacity="0.48"
          />
          <text
            x="248"
            y="374"
            fontSize="12"
            fontFamily="'Noto Serif KR', serif"
            fontWeight="700"
            fill="#3f6573"
            opacity="0.85"
          >
            장강
          </text>
        </g>

        {/* Strategic Courier Roads connecting 15 Cities */}
        <g>
          {roads.map(({ from, to, key }) => {
            const isHighlighted =
              selectedCityId &&
              ((from.id === selectedCityId && validTargets.has(to.id)) ||
                (to.id === selectedCityId && validTargets.has(from.id)));

            const highlightColor =
              commandMode === 'fire' ? '#d9480f' : '#9c6b17';

            return (
              <g key={key}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isHighlighted ? highlightColor : '#83725a'}
                  strokeWidth={isHighlighted ? 3.2 : 1.9}
                  strokeDasharray={isHighlighted ? '7 4' : '5 5'}
                  strokeOpacity={isHighlighted ? 0.92 : 0.56}
                  strokeLinecap="round"
                  className={isHighlighted ? 'animate-march-dash' : undefined}
                />
              </g>
            );
          })}
        </g>

        {/* Animated March / AI Movement Arrows */}
        <g pointerEvents="none">
          {marchArrows.map((arrow) => {
            const from = cities[arrow.fromId];
            const to = cities[arrow.toId];
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2 - 22;
            const fColor = FACTIONS[arrow.faction].color;
            return (
              <g key={arrow.id}>
                <path
                  d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                  fill="none"
                  stroke="#faf3e3"
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                <path
                  d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                  fill="none"
                  stroke={fColor}
                  strokeWidth="4"
                  strokeDasharray="9 5"
                  strokeLinecap="round"
                  className="animate-march-dash"
                  markerEnd="url(#march-arrowhead)"
                />
                {/* Moving Troop Count Tag at Apex */}
                <g transform={`translate(${mx}, ${my - 4})`}>
                  <rect
                    x="-22"
                    y="-10"
                    width="44"
                    height="19"
                    rx="4"
                    fill={fColor}
                    stroke="#faf3e3"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="700"
                    className="tabular-nums"
                  >
                    {arrow.kind === 'attack' ? `⚔${arrow.troops}` : `→${arrow.troops}`}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* 15 Interactive City Nodes */}
        <g>
          {ALL_CITY_IDS.map((id) => {
            const city = cities[id];
            const faction = FACTIONS[city.owner];
            const isSelected = selectedCityId === id;
            const targetMeta = validTargets.get(id);
            const isImperial = city.isImperial;
            const radius = isImperial ? 21 : 18.5;

            const ariaLabel = `${city.name} (${faction.shortName}, 병력 ${city.troops}${
              isImperial ? ', 황성' : ''
            }${targetMeta?.forecast ? `, 예상 ${targetMeta.forecast}` : ''})`;

            return (
              <g
                key={id}
                transform={`translate(${city.x}, ${city.y})`}
                role="button"
                tabIndex={0}
                aria-label={ariaLabel}
                data-testid={`city-node-${id}`}
                onClick={() => onSelectCity(id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectCity(id);
                  }
                }}
                className="cursor-pointer focus:outline-none"
              >
                {/* Invisible generous hit area for mobile finger tap */}
                <circle cx="0" cy="0" r="28" fill="transparent" />

                {/* Selection or Target Pulsing Halo */}
                {isSelected && (
                  <circle
                    cx="0"
                    cy="0"
                    r={radius + 6}
                    fill="none"
                    stroke="#231f1a"
                    strokeWidth="2.6"
                    strokeDasharray="4 3"
                  />
                )}

                {targetMeta && (
                  <circle
                    cx="0"
                    cy="0"
                    r={radius + 6}
                    fill="none"
                    stroke={
                      targetMeta.kind === 'fire'
                        ? '#e8590c'
                        : targetMeta.kind === 'transport'
                          ? '#2e7d4f'
                          : '#c92a2a'
                    }
                    strokeWidth="2.8"
                    className="animate-ring-pulse"
                  />
                )}

                {/* Imperial Luoyang Outer Gold Ring & Crest */}
                {isImperial && (
                  <>
                    <circle
                      cx="0"
                      cy="0"
                      r={radius + 4}
                      fill="#f5e6b3"
                      stroke="#b8860b"
                      strokeWidth="2"
                    />
                    <polygon
                      points="-8,-22 0,-30 8,-22"
                      fill="#d4a017"
                      stroke="#785609"
                      strokeWidth="1.2"
                    />
                  </>
                )}

                {/* Lightweight soft ink shadow under badge (zero SVG filter cost) */}
                <circle cx="0" cy="2.5" r={radius + 0.5} fill="#2a2117" opacity="0.22" />

                {/* Main Fortress Badge */}
                <circle
                  cx="0"
                  cy="0"
                  r={radius}
                  fill={faction.color}
                  stroke={isImperial ? '#f7dc88' : '#faf3e3'}
                  strokeWidth={isImperial ? 2.4 : 2.2}
                />

                {/* Subtle inner fortress ring */}
                <circle
                  cx="0"
                  cy="0"
                  r={radius - 3.5}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.75"
                  strokeOpacity="0.4"
                />

                {/* Troop Count inside Node */}
                <text
                  x="0"
                  y="5"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="14"
                  fontWeight="700"
                  className="tabular-nums"
                  style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.38)', strokeWidth: '2px' }}
                >
                  {city.troops}
                </text>

                {/* City Name Label below node — high contrast parchment halo */}
                <text
                  x="0"
                  y={isImperial ? 37 : 34}
                  textAnchor="middle"
                  fill="#1f1a14"
                  fontSize="14"
                  fontWeight="700"
                  fontFamily="'Noto Serif KR', serif"
                  style={{
                    paintOrder: 'stroke',
                    stroke: '#f6edd9',
                    strokeWidth: '4.8px',
                    strokeLinejoin: 'round',
                  }}
                >
                  {city.name}
                  {isImperial ? '★' : ''}
                </text>

                {/* Combat Forecast Badge or Action Target Tag above node */}
                {targetMeta && (
                  <g transform={`translate(0, ${isImperial ? -38 : -31})`}>
                    {targetMeta.kind === 'attack' && targetMeta.forecast && (
                      <>
                        <rect
                          x="-20"
                          y="-10"
                          width="40"
                          height="18"
                          rx="3"
                          fill={FORECAST_STYLES[targetMeta.forecast].bg}
                          stroke={FORECAST_STYLES[targetMeta.forecast].stroke}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="2.5"
                          textAnchor="middle"
                          fill={FORECAST_STYLES[targetMeta.forecast].text}
                          fontSize="10.5"
                          fontWeight="700"
                        >
                          {targetMeta.forecast}
                        </text>
                      </>
                    )}
                    {targetMeta.kind === 'transport' && (
                      <>
                        <rect
                          x="-20"
                          y="-10"
                          width="40"
                          height="18"
                          rx="3"
                          fill="#24633e"
                          stroke="#143d25"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="2.5"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10.5"
                          fontWeight="700"
                        >
                          수송
                        </text>
                      </>
                    )}
                    {targetMeta.kind === 'fire' && (
                      <>
                        <rect
                          x="-20"
                          y="-10"
                          width="40"
                          height="18"
                          rx="3"
                          fill="#d9480f"
                          stroke="#7d2506"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="2.5"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10.5"
                          fontWeight="700"
                        >
                          화공
                        </text>
                      </>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Visual Effects Layer: Fire Bursts, Clash Sparks, Floating Text */}
        <g pointerEvents="none">
          {cityBursts.map((burst) => {
            const city = cities[burst.cityId];
            const isGreatFire = burst.kind === 'fire' && burst.fireGrade === 'great';
            const isMinorFire = burst.kind === 'fire' && burst.fireGrade === 'minor';

            return (
              <g key={burst.id} transform={`translate(${city.x}, ${city.y})`}>
                {(burst.kind === 'fire' || burst.kind === 'lubu') && (
                  <g
                    className="animate-flame-burst"
                    transform={
                      isGreatFire ? 'scale(1.22)' : isMinorFire ? 'scale(0.84)' : undefined
                    }
                  >
                    {isGreatFire && (
                      <>
                        <circle cx="0" cy="0" r="42" fill="#f59e0b" opacity="0.28" />
                        <circle
                          cx="0"
                          cy="0"
                          r="36"
                          fill="none"
                          stroke="#fde047"
                          strokeWidth="2.4"
                          strokeDasharray="6 4"
                          opacity="0.88"
                        />
                        {/* Left & right roaring blaze tongues for 대화재 */}
                        <path
                          d="M-16,-24 C-10,-12 -6,-4 -9,9 C-12,18 -20,20 -24,14 C-28,6 -24,-10 -16,-24 Z"
                          fill="#dc2626"
                          opacity="0.88"
                        />
                        <path
                          d="M16,-24 C24,-10 28,6 24,14 C20,20 12,18 9,9 C6,-4 10,-12 16,-24 Z"
                          fill="#dc2626"
                          opacity="0.88"
                        />
                      </>
                    )}
                    <circle
                      cx="0"
                      cy="0"
                      r={isGreatFire ? 36 : 34}
                      fill={
                        burst.kind === 'lubu'
                          ? '#7b1fa2'
                          : isGreatFire
                            ? '#dc2626'
                            : isMinorFire
                              ? '#e07a24'
                              : '#ff6b00'
                      }
                      opacity={isGreatFire ? 0.42 : isMinorFire ? 0.24 : 0.32}
                    />
                    <path
                      d="M0,-32 C10,-18 22,-12 18,4 C15,16 6,22 0,24 C-8,22 -17,14 -18,2 C-20,-10 -8,-18 0,-32 Z"
                      fill={
                        burst.kind === 'lubu'
                          ? '#b5179e'
                          : isGreatFire
                            ? '#b91c1c'
                            : isMinorFire
                              ? '#d96b27'
                              : '#f94144'
                      }
                      opacity="0.92"
                    />
                    <path
                      d="M0,-22 C7,-11 12,-5 10,5 C8,12 4,16 0,18 C-5,16 -10,11 -10,3 C-11,-5 -5,-12 0,-22 Z"
                      fill={isGreatFire ? '#fde047' : '#ffb703'}
                      opacity="0.96"
                    />
                    {isGreatFire && (
                      <g fill="#fef08a" stroke="#b45309" strokeWidth="0.8">
                        <circle cx="-26" cy="-24" r="3" />
                        <circle cx="27" cy="-20" r="2.8" />
                        <circle cx="0" cy="-39" r="3.4" />
                        <circle cx="-22" cy="18" r="2.4" />
                        <circle cx="23" cy="16" r="2.5" />
                      </g>
                    )}
                  </g>
                )}

                {(burst.kind === 'clash' || burst.kind === 'capture') && (
                  <g className="animate-flame-burst">
                    <circle cx="0" cy="0" r="28" fill={burst.color} opacity="0.28" />
                    <path
                      d="M-16,-16 L16,16 M16,-16 L-16,16"
                      stroke="#fff7e6"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </g>
                )}

                <g className="animate-float-up">
                  <text
                    x="0"
                    y={burst.subLabel ? -32 : -24}
                    textAnchor="middle"
                    fill={burst.color}
                    fontSize={isGreatFire ? '16.5' : '14.5'}
                    fontWeight="900"
                    style={{
                      paintOrder: 'stroke',
                      stroke: isGreatFire ? '#fef3c7' : '#fffaf0',
                      strokeWidth: isGreatFire ? '4.8px' : '4px',
                      strokeLinejoin: 'round',
                    }}
                  >
                    {burst.label}
                  </text>
                  {burst.subLabel && (
                    <text
                      x="0"
                      y="-16"
                      textAnchor="middle"
                      fill={isGreatFire ? '#7f1d1d' : '#4a3520'}
                      fontSize="11.5"
                      fontWeight="800"
                      style={{
                        paintOrder: 'stroke',
                        stroke: '#fffaf0',
                        strokeWidth: '3.4px',
                        strokeLinejoin: 'round',
                      }}
                    >
                      {burst.subLabel}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
