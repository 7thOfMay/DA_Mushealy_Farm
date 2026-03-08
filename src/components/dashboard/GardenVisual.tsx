"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Garden, GardenSensorSummary } from "@/types";

interface Props {
  garden: Garden;
  summary: GardenSensorSummary;
  pumpOn: boolean;
}

type Zone = "sun" | "air" | "plants" | "soil" | "pump" | null;

interface TooltipData {
  title: string;
  emoji: string;
  rows: { label: string; value: string; status?: "ok" | "warn" | "alert" }[];
  note?: string;
}

function getTooltip(zone: Zone, garden: Garden, s: GardenSensorSummary, pumpOn: boolean): TooltipData | null {
  if (!zone) return null;
  const tempStatus: "ok"|"warn"|"alert" = s.temperature > 35 ? "alert" : s.temperature > 30 ? "warn" : "ok";
  const soilStatus: "ok"|"warn" = (s.humiditySoil < 45 || s.humiditySoil > 85) ? "warn" : "ok";
  const airStatus: "ok"|"warn"  = s.humidityAir < 50 ? "warn" : "ok";
  const lightK = (s.light / 1000).toFixed(1);

  switch (zone) {
    case "sun": return {
      title: "Môi trường & Ánh sáng", emoji: "☀️",
      rows: [
        { label: "Nhiệt độ",  value: `${s.temperature} °C`,  status: tempStatus },
        { label: "Ánh sáng",  value: `${lightK}k lux` },
      ],
      note: tempStatus !== "ok" ? "⚠ Nhiệt độ vượt ngưỡng tối ưu (30°C)" : "✓ Nhiệt độ trong ngưỡng tốt",
    };
    case "air": return {
      title: "Độ ẩm không khí", emoji: "🌬️",
      rows: [{ label: "Độ ẩm KK", value: `${s.humidityAir} %`, status: airStatus }],
      note: airStatus === "warn" ? "⚠ Độ ẩm thấp, cân nhắc phun sương" : "✓ Độ ẩm không khí ổn định",
    };
    case "plants": return {
      title: garden.plantLabel,
      emoji: garden.plantType === "CA_CHUA" ? "🍅" : garden.plantType === "CAI_XANH" ? "🥬" : "🌵",
      rows: [
        { label: "Diện tích",   value: garden.area ?? "—" },
        { label: "Trạng thái", value: garden.status === "OK" ? "Bình thường" : "Cảnh báo", status: garden.status === "OK" ? "ok" : "warn" },
      ],
      note: garden.description,
    };
    case "soil": return {
      title: "Đất & Độ ẩm", emoji: "🌱",
      rows: [{ label: "Độ ẩm đất", value: `${s.humiditySoil} %`, status: soilStatus }],
      note: s.humiditySoil < 45 ? "⚠ Đất khô — cần tưới ngay" : s.humiditySoil > 85 ? "⚠ Đất quá ẩm — dừng tưới" : "✓ Độ ẩm đất lý tưởng (45–85%)",
    };
    case "pump": return {
      title: "Máy bơm tưới", emoji: "⚙️",
      rows: [{ label: "Hoạt động", value: pumpOn ? "Đang chạy" : "Đã tắt", status: pumpOn ? "ok" : "warn" }],
      note: pumpOn ? "Đang tưới theo lịch tự động" : "Máy bơm không hoạt động",
    };
    default: return null;
  }
}

// Tooltip card position anchors per zone
const TOOLTIP_POS: Record<NonNullable<Zone>, { top: string; left?: string; right?: string }> = {
  sun:    { top: "3%",  right: "3%" },
  air:    { top: "3%",  left: "2%"  },
  plants: { top: "30%", left: "18%" },
  soil:   { top: "auto", left: "20%" },
  pump:   { top: "auto", left: "2%"  },
};

// ── Plant shapes: isometric rows ─────────────────────────────────────────────
// Plants arranged in 2 rows to create depth illusion
// Back row smaller + lighter, front row larger + darker
function PlantShapes({ type, color }: { type: string; color: string }) {
  const cols = 5;
  const rows = 2;
  const result: React.ReactNode[] = [];

  for (let row = 0; row < rows; row++) {
    const scale = row === 0 ? 0.72 : 1.0;            // back row smaller
    const opacity = row === 0 ? 0.7 : 1.0;           // back row faded
    const baseY = row === 0 ? 108 : 138;             // back higher, front lower
    const spacing = row === 0 ? 76 : 72;
    const startX = row === 0 ? 35 : 25;

    for (let col = 0; col < cols; col++) {
      const x = startX + col * spacing + row * 6;   // slight stagger per row
      const k = row * cols + col;

      if (type === "CA_CHUA") {
        result.push(
          <g key={k} transform={`translate(${x},${baseY}) scale(${scale})`} opacity={opacity}>
            {/* Shadow ellipse on ground */}
            <ellipse cx="0" cy="4" rx="9" ry="3" fill="#3D280A" opacity="0.18"/>
            {/* Main stem */}
            <line x1="0" y1="2" x2="0" y2="-52" stroke="#4A7A30" strokeWidth="2.5"/>
            {/* Branch left */}
            <line x1="0" y1="-22" x2="-16" y2="-36" stroke="#4A7A30" strokeWidth="1.8"/>
            {/* Branch right */}
            <line x1="0" y1="-22" x2="16" y2="-36" stroke="#4A7A30" strokeWidth="1.8"/>
            {/* Top branch */}
            <line x1="0" y1="-40" x2="-10" y2="-50" stroke="#4A7A30" strokeWidth="1.4"/>
            <line x1="0" y1="-40" x2="10" y2="-50" stroke="#4A7A30" strokeWidth="1.4"/>
            {/* Leaf left */}
            <ellipse cx="-20" cy="-38" rx="11" ry="6.5" fill="#52B788" transform="rotate(-35,-20,-38)"/>
            <line x1="-20" y1="-43" x2="-20" y2="-33" stroke="#2D6A4F" strokeWidth="0.8" opacity="0.5"/>
            {/* Leaf right */}
            <ellipse cx="20" cy="-38" rx="11" ry="6.5" fill="#52B788" transform="rotate(35,20,-38)"/>
            <line x1="20" y1="-43" x2="20" y2="-33" stroke="#2D6A4F" strokeWidth="0.8" opacity="0.5"/>
            {/* Top leaves */}
            <ellipse cx="-12" cy="-52" rx="8" ry="5" fill="#40916C" transform="rotate(-30,-12,-52)"/>
            <ellipse cx="12" cy="-52" rx="8" ry="5" fill="#40916C" transform="rotate(30,12,-52)"/>
            {/* Fruit 1 - main visible */}
            <circle cx="-11" cy="-42" r="8.5" fill={color} opacity="0.9"/>
            {/* Fruit 2 - side */}
            <circle cx="11" cy="-40" r="7.5" fill={color} opacity="0.8"/>
            {/* Fruit 3 top small */}
            <circle cx="0" cy="-54" r="5.5" fill={color} opacity="0.75"/>
            {/* Stem cap on fruits */}
            <path d="M-11,-33 q-2,-2 0,-4 q2,-2 0,-4" stroke="#2D6A4F" strokeWidth="1" fill="none"/>
            {/* Fruit highlight */}
            <circle cx="-15" cy="-46" r="2.5" fill="white" opacity="0.3"/>
            <circle cx="7" cy="-44" r="2" fill="white" opacity="0.25"/>
          </g>
        );
      } else if (type === "NHA_DAM") {
        result.push(
          <g key={k} transform={`translate(${x},${baseY}) scale(${scale})`} opacity={opacity}>
            <ellipse cx="0" cy="4" rx="10" ry="3" fill="#3D280A" opacity="0.15"/>
            {/* Outer leaves spread wide */}
            <polygon points="0,2 -22,-18 -18,-14 -14,-36" fill="#2D6A4F"/>
            <polygon points="0,2 22,-18 18,-14 14,-36" fill="#2D6A4F"/>
            {/* Mid leaves */}
            <polygon points="0,2 -14,-30 -10,-26 -6,-44" fill="#40916C"/>
            <polygon points="0,2 14,-30 10,-26 6,-44" fill="#40916C"/>
            {/* Inner leaves */}
            <polygon points="0,2 -6,-44 0,-40 6,-44" fill="#52B788"/>
            {/* White dots (aloe texture) */}
            <circle cx="-10" cy="-26" r="1.5" fill="white" opacity="0.5"/>
            <circle cx="10" cy="-24" r="1.5" fill="white" opacity="0.5"/>
            <circle cx="-5" cy="-36" r="1" fill="white" opacity="0.4"/>
            <circle cx="5" cy="-34" r="1" fill="white" opacity="0.4"/>
          </g>
        );
      } else {
        // CAI_XANH
        result.push(
          <g key={k} transform={`translate(${x},${baseY}) scale(${scale})`} opacity={opacity}>
            <ellipse cx="0" cy="4" rx="11" ry="3.5" fill="#3D280A" opacity="0.18"/>
            {/* Stem */}
            <line x1="0" y1="2" x2="0" y2="-8" stroke="#4A7A30" strokeWidth="2.5"/>
            {/* Main leaf body */}
            <ellipse cx="0" cy="-28" rx="17" ry="22" fill="#52B788"/>
            {/* Outer side leaves */}
            <ellipse cx="-17" cy="-22" rx="10" ry="5.5" fill="#40916C" transform="rotate(-40,-17,-22)"/>
            <ellipse cx="17" cy="-22" rx="10" ry="5.5" fill="#40916C" transform="rotate(40,17,-22)"/>
            {/* Bottom side leaves */}
            <ellipse cx="-12" cy="-10" rx="8" ry="4" fill="#2D6A4F" transform="rotate(-55,-12,-10)"/>
            <ellipse cx="12" cy="-10" rx="8" ry="4" fill="#2D6A4F" transform="rotate(55,12,-10)"/>
            {/* Vein */}
            <line x1="0" y1="-6" x2="0" y2="-48" stroke="#1B4332" strokeWidth="1.2" opacity="0.35"/>
            <line x1="-8" y1="-24" x2="8" y2="-32" stroke="#1B4332" strokeWidth="0.7" opacity="0.25"/>
            <line x1="-7" y1="-30" x2="7" y2="-36" stroke="#1B4332" strokeWidth="0.7" opacity="0.2"/>
            {/* Highlight */}
            <ellipse cx="-5" cy="-36" rx="6" ry="4" fill="white" opacity="0.14" transform="rotate(-20,-5,-36)"/>
          </g>
        );
      }
    }
  }
  return <>{result}</>;
}

// ── Soil with perspective stripes ──────────────────────────────────────────────
function SoilLayer({ humiditySoil, color }: { humiditySoil: number; color: string }) {
  const moistOpacity = Math.min(0.08 + (humiditySoil / 100) * 0.32, 0.4);
  return (
    <>
      {/* Main soil trapezoid — wider at front for perspective */}
      <polygon points="0,145 440,145 440,240 0,240" fill="#7D5A3C"/>
      {/* Slight gradient layer for depth — darker at back */}
      <polygon points="0,145 440,145 440,174 0,174" fill="#6B4A2E" opacity="0.7"/>
      {/* Soil row lines — perspective converging toward top */}
      {[0.15, 0.38, 0.62, 0.85].map((t, i) => {
        const y = 145 + t * 95;
        const inset = (1 - t) * 26; // edge lines converge inward at top
        return <line key={i} x1={inset} y1={y} x2={440 - inset} y2={y}
          stroke="#5A3E28" strokeWidth="1" opacity={0.25 + t * 0.15}/>;
      })}
      {/* Vertical furrow lines — perspective */}
      {[0.1,0.24,0.38,0.52,0.66,0.8,0.9].map((t, i) => {
        const xTop = 20 + t * 400;
        const xBot = t * 440;
        return <line key={i} x1={xTop} y1={145} x2={xBot} y2={240}
          stroke="#5A3E28" strokeWidth="0.8" opacity="0.18"/>;
      })}
      {/* Moisture tint overlay */}
      <polygon points="0,145 440,145 440,240 0,240"  fill={color} opacity={moistOpacity}/>
      {/* Ground line + grass tufts */}
      <line x1="0" y1="145" x2="440" y2="145" stroke="#40916C" strokeWidth="2.5"/>
      {[12,40,72,105,140,178,215,252,288,325,360,395,428].map((x,i) => (
        <g key={i} transform={`translate(${x},145)`}>
          <line x1="-3" y1="0" x2="-6" y2="-9" stroke="#52B788" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="0"  y1="0" x2="0"  y2="-12" stroke="#40916C" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="3"  y1="0" x2="6"  y2="-9"  stroke="#52B788" strokeWidth="1.8" strokeLinecap="round"/>
        </g>
      ))}
      {/* Moisture droplets in soil */}
      {humiditySoil > 35 && [55,130,205,280,355].map((x, i) => (
        <g key={i} opacity={Math.min(0.35 + humiditySoil/200, 0.8)}>
          <ellipse cx={x + (i%2)*8} cy={170 + (i%3)*18} rx="3" ry="4.5" fill={color}/>
          <ellipse cx={x + (i%2)*8 - 1} cy={167 + (i%3)*18} rx="1.5" ry="1" fill="white" opacity="0.5"/>
        </g>
      ))}
      {/* Moisture bar at bottom */}
      <rect x="110" y="224" width="220" height="9" rx="4.5" fill="black" opacity="0.2"/>
      <rect x="110" y="224" width={220 * humiditySoil / 100} height="9" rx="4.5"
        fill={humiditySoil < 45 ? "#F97316" : humiditySoil > 85 ? "#3B82F6" : "#22C55E"}
        opacity="0.85"/>
      <text x="338" y="232" textAnchor="start" fontSize="9" fontWeight="700" fill="white">{humiditySoil}%</text>
      <text x="220" y="232" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.65)">ĐỘ ẨM ĐẤT</text>
    </>
  );
}

export function GardenVisual({ garden, summary, pumpOn }: Props) {
  const [active, setActive] = useState<Zone>(null);
  // useCallback so setActive reference is stable
  const enter = useCallback((z: Zone) => setActive(z), []);
  // Only clear when leaving the ENTIRE outer wrapper — fixes the "flicker" bug
  const leaveAll = useCallback(() => setActive(null), []);

  const tooltip = getTooltip(active, garden, summary, pumpOn);
  const tipPos  = active ? TOOLTIP_POS[active] : null;

  const skyA = summary.light > 15000 ? "#4A90D9" : summary.light > 8000 ? "#74B8E8" : "#9FC8DC";
  const skyB = summary.light > 15000 ? "#B8DDF7" : "#D0EAF0";

  return (
    <div
      className="relative w-full select-none overflow-hidden"
      style={{ aspectRatio: "440/240" }}
      onMouseLeave={leaveAll}   /* ← single leave handler on outer container */
    >
      <svg
        viewBox="0 0 440 240"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="block rounded-b-[10px]"
      >
        <defs>
          <linearGradient id={`sky-${garden.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyA}/>
            <stop offset="100%" stopColor={skyB}/>
          </linearGradient>
          <radialGradient id={`sun-${garden.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="#FFF9C4"/>
            <stop offset="55%" stopColor="#F7C948"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
          </radialGradient>
          <filter id={`glow-${garden.id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={`shadow-${garden.id}`} x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.2"/>
          </filter>
        </defs>

        {/* ══ LAYER 0: SKY ══════════════════════════════════════════════ */}
        <rect x="0" y="0" width="440" height="145" fill={`url(#sky-${garden.id})`}/>

        {/* ══ LAYER 1: DISTANT HILLS (depth) ═══════════════════════════ */}
        <g opacity="0.45" pointerEvents="none">
          <ellipse cx="55"  cy="128" rx="80"  ry="28" fill="#5C8E5C"/>
          <ellipse cx="185" cy="133" rx="115" ry="24" fill="#4E7A4E"/>
          <ellipse cx="350" cy="126" rx="95"  ry="30" fill="#5C8E5C"/>
          <ellipse cx="430" cy="131" rx="60"  ry="22" fill="#4E7A4E"/>
        </g>

        {/* ══ LAYER 2: BACKGROUND TREES ════════════════════════════════ */}
        <g opacity="0.62" pointerEvents="none">
          {[22,72,118,278,330,382,428].map((x,i) => {
            const h = 52 + (i%3)*8;
            const w = 20 + (i%2)*7;
            return (
              <g key={i} transform={`translate(${x},${140-h})`}>
                <rect x="-3" y={h-10} width="6" height="12" fill="#5A3210" rx="1"/>
                <ellipse cx="0" cy={h*0.42} rx={w*0.68} ry={w*0.52} fill="#2D6A4F"/>
                <ellipse cx="0" cy={h*0.28} rx={w*0.52} ry={w*0.4}  fill="#3A7D44"/>
                <ellipse cx="-3" cy={h*0.18} rx={w*0.32} ry={w*0.26} fill="#52B788" opacity="0.7"/>
              </g>
            );
          })}
        </g>

        {/* ══ LAYER 3: SUN (hover zone) ════════════════════════════════ */}
        <g onMouseEnter={() => enter("sun")} style={{ cursor: "crosshair" }}>
          <circle cx="390" cy="46" r="54" fill={`url(#sun-${garden.id})`}
            opacity={Math.min(0.3 + summary.light/40000, 0.75)}/>
          <circle cx="390" cy="46" r="26" fill="#F7C948"
            filter={`url(#glow-${garden.id})`}
            opacity={active==="sun" ? 1 : 0.9}/>
          <circle cx="390" cy="46" r="20" fill="#FFF176"/>
          {[0,40,80,120,160,200,240,280,320].map(a => {
            const r=Math.PI*a/180;
            return <line key={a}
              x1={390+Math.cos(r)*23} y1={46+Math.sin(r)*23}
              x2={390+Math.cos(r)*35} y2={46+Math.sin(r)*35}
              stroke="#F7C948" strokeWidth="2.5" strokeLinecap="round"/>;
          })}
          <text x="390" y="44" textAnchor="middle" fontSize="9" fontWeight="800" fill="#92400E">{summary.temperature}°C</text>
          <text x="390" y="56" textAnchor="middle" fontSize="7.5" fill="#92400E" opacity="0.8">{(summary.light/1000).toFixed(1)}k lux</text>
          {active==="sun" && <circle cx="390" cy="46" r="34" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5 3" opacity="0.8"/>}
          {/* hit area */}
          <rect x="340" y="4" width="96" height="88" fill="transparent"/>
        </g>

        {/* ══ LAYER 4: CLOUDS (hover zone) ════════════════════════════ */}
        <g onMouseEnter={() => enter("air")} style={{ cursor: "crosshair" }}
           opacity={active==="air" ? 1 : 0.85}>
          {/* Cloud 1 */}
          <ellipse cx="88"  cy="48"  rx="44" ry="18" fill="white" opacity="0.92"/>
          <ellipse cx="64"  cy="54"  rx="28" ry="15" fill="white" opacity="0.92"/>
          <ellipse cx="115" cy="54"  rx="30" ry="14" fill="white" opacity="0.92"/>
          {/* Cloud 2 lighter */}
          <ellipse cx="224" cy="38"  rx="32" ry="14" fill="white" opacity="0.65"/>
          <ellipse cx="204" cy="44"  rx="22" ry="11" fill="white" opacity="0.65"/>
          <ellipse cx="246" cy="43"  rx="22" ry="11" fill="white" opacity="0.65"/>
          {/* Humidity label */}
          <text x="88" y="53" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1A6FA8">{summary.humidityAir}%</text>
          <text x="88" y="64" textAnchor="middle" fontSize="7" fill="#2563EB">độ ẩm KK</text>
          {/* Rain droplets if very humid */}
          {summary.humidityAir > 55 && [148,168,188].map((x,i)=>(
            <g key={i} opacity="0.7">
              <ellipse cx={x} cy={72+(i*9)} rx="2.5" ry="4" fill="#60A5FA"/>
              <ellipse cx={x-1} cy={70+(i*9)} rx="1.2" ry="0.9" fill="white" opacity="0.55"/>
            </g>
          ))}
          {active==="air" && <rect x="12" y="16" width="285" height="72" fill="white" opacity="0.08" rx="8"/>}
          {/* hit area */}
          <rect x="6" y="16" width="290" height="76" fill="transparent"/>
        </g>

        {/* ══ LAYER 5: PLANTS (hover zone) ════════════════════════════ */}
        <g onMouseEnter={() => enter("plants")} style={{ cursor: "crosshair" }}>
          <PlantShapes type={garden.plantType} color={garden.color}/>
          {active==="plants" && <rect x="0" y="80" width="440" height="66" fill="white" opacity="0.07" rx="4"/>}
          {/* hit area */}
          <rect x="0" y="80" width="440" height="66" fill="transparent"/>
        </g>

        {/* ══ LAYER 6: SOIL (hover zone) ══════════════════════════════ */}
        <g onMouseEnter={() => enter("soil")} style={{ cursor: "crosshair" }}>
          <SoilLayer humiditySoil={summary.humiditySoil} color={garden.color}/>
          {active==="soil" && <polygon points="0,145 440,145 440,240 0,240" fill="white" opacity="0.05"/>}
          {/* hit area — excludes pump corner */}
          <rect x="110" y="145" width="330" height="95" fill="transparent"/>
        </g>

        {/* ══ LAYER 7: PUMP WIDGET (hover zone) ══════════════════════ */}
        <g onMouseEnter={() => enter("pump")} style={{ cursor: "crosshair" }}>
          {/* Panel background */}
          <rect x="4" y="158" width="100" height="50" rx="8"
            fill={pumpOn ? "#1B4332" : "#4A3728"}
            opacity={active==="pump" ? 1 : 0.88}
            filter={`url(#shadow-${garden.id})`}/>
          {/* Icon circle */}
          <circle cx="24" cy="183" r="11"
            fill={pumpOn ? "#40916C" : "#7D5A3C"}/>
          <text x="24" y="187" textAnchor="middle" fontSize="11">{pumpOn ? "💧" : "🔴"}</text>
          {/* Status text */}
          <text x="62" y="177" textAnchor="middle" fontSize="8" fontWeight="700" fill="rgba(255,255,255,0.7)" letterSpacing="0.5">MÁY BƠM</text>
          <text x="62" y="191" textAnchor="middle" fontSize="10" fontWeight="800"
            fill={pumpOn ? "#52B788" : "#F87171"}>{pumpOn ? "ĐANG CHẠY" : "TẮT"}</text>
          {/* Water droplets if running */}
          {pumpOn && [106,118,130,142].map((x,i)=>(
            <ellipse key={i} cx={x} cy={184-i*2} rx="2.5" ry="3.5"
              fill="#60A5FA" opacity={0.9-i*0.18}/>
          ))}
          {pumpOn && <line x1="104" y1="183" x2="145" y2="183"
            stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6"/>}
          {/* highlight ring */}
          {active==="pump" && <rect x="4" y="158" width="100" height="50" rx="8" fill="white" opacity="0.1"/>}
          {/* hit area */}
          <rect x="2" y="154" width="145" height="60" fill="transparent"/>
        </g>

        {/* ══ ALWAYS-ON ZONE HINTS (when nothing active) ══════════════ */}
        {!active && (
          <g pointerEvents="none" opacity="0.8">
            <rect x="348" y="82" width="84" height="14" rx="5" fill="black" opacity="0.2"/>
            <text x="390" y="92" textAnchor="middle" fontSize="8" fill="white">☀ xem chỉ số</text>
            <rect x="22" y="80" width="82" height="13" rx="4" fill="black" opacity="0.18"/>
            <text x="63" y="90" textAnchor="middle" fontSize="7.5" fill="white">☁ độ ẩm KK</text>
          </g>
        )}
      </svg>

      {/* ══ HTML TOOLTIP CARD — stays visible while inside container ══ */}
      {tooltip && tipPos && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            top:   tipPos.top   !== "auto" ? tipPos.top   : undefined,
            bottom: tipPos.top  === "auto" ? "8px"        : undefined,
            left:  tipPos.left  ? tipPos.left  : undefined,
            right: tipPos.right ? tipPos.right : undefined,
            maxWidth: "190px",
            minWidth: "155px",
          }}
        >
          <div className="bg-white border border-[#D1E8DC] rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.18)] p-3">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#EEF4F0]">
              <span className="text-[1.1rem] leading-none">{tooltip.emoji}</span>
              <p className="text-[0.8125rem] font-bold text-[#1A2E1F] leading-tight">{tooltip.title}</p>
            </div>
            {/* Rows */}
            <div className="space-y-1.5">
              {tooltip.rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4">
                  <span className="text-[0.6875rem] text-[#5C7A6A]">{row.label}</span>
                  <span className={cn(
                    "text-[0.8125rem] font-bold",
                    row.status === "alert" ? "text-[#C0392B]" :
                    row.status === "warn"  ? "text-[#E67E22]" : "text-[#1B4332]"
                  )} style={{ fontFamily: "'DM Mono', monospace" }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            {/* Note */}
            {tooltip.note && (
              <p className="text-[0.625rem] text-[#5C7A6A] mt-2 pt-2 border-t border-[#EEF4F0] leading-[1.5]">
                {tooltip.note}
              </p>
            )}
            {/* Zone tag */}
            <div className="mt-2 flex justify-end">
              <span className="text-[0.5rem] uppercase tracking-widest text-[#5C7A6A]/50 bg-[#F4F8F5] px-1.5 py-0.5 rounded-full">
                {active === "sun" ? "Khí hậu" : active === "air" ? "Không khí" :
                 active === "plants" ? "Cây trồng" : active === "soil" ? "Đất" : "Thiết bị"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hint pill when idle */}
      {!active && (
        <div className="absolute bottom-2 right-3 pointer-events-none">
          <p className="text-[0.5625rem] text-white/65 bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
            Di chuột để xem thông số
          </p>
        </div>
      )}
    </div>
  );
}
