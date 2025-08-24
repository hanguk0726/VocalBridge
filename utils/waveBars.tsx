import React, { useMemo } from "react";
import Svg, { Rect } from "react-native-svg";

type Props = {
  envelope: number[];
  width: number;
  height: number;
  bars?: number;
  barGap?: number;
  barColor?: string;
};

export default function WaveBars({
  envelope = [],
  width,
  height,
  bars = 40,
  barGap = 4,
  barColor = "#FF00FF",
}: Props) {
  const barCount = Math.max(1, Math.min(200, bars));
  const totalGap = barGap * (barCount - 1);
  const barWidth = (width - totalGap) / barCount;

  // 크기 재조정 (리샘플링)
  const values = useMemo(() => {
    if (!envelope.length) return new Array(barCount).fill(0);
    if (envelope.length === barCount) return envelope.slice();
    const out = new Array(barCount);
    for (let i = 0; i < barCount; i++) {
      const t = (i * (envelope.length - 1)) / (barCount - 1);
      const i0 = Math.floor(t);
      const i1 = Math.min(envelope.length - 1, i0 + 1);
      out[i] = envelope[i0] + (envelope[i1] - envelope[i0]) * (t - i0);
    }
    return out;
  }, [envelope, barCount]);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {values.map((v, i) => {
        const barHeight = Math.max(1, v * height * 0.9);
        const x = i * (barWidth + barGap);
        const y = (height - barHeight) / 2;
        return (
          <Rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill={barColor}
            rx={2}
            ry={2}
          />
        );
      })}
    </Svg>
  );
}

export function waveBarColor(lang: string): string {
  switch (lang) {
    case "en":
      return "#f97316";
    case "ko":
      return "#00a896";
    default:
      return "#d83a54";
  }
}
