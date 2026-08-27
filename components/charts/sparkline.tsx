import { curveMonotoneX, line } from 'd3-shape';
import * as React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/**
 * A bare trend line, no axes. Built on react-native-svg rather than Skia so it
 * renders identically on iOS, Android and web without shipping a CanvasKit WASM
 * bundle to browsers.
 */
export function Sparkline({
  values,
  color,
  height = 40,
  width = 96,
  filled = true,
}: {
  values: number[];
  color: string;
  height?: number;
  width?: number;
  filled?: boolean;
}) {
  const { stroke, area } = React.useMemo(() => {
    if (values.length < 2) return { stroke: null, area: null };

    const min = Math.min(...values);
    const max = Math.max(...values);
    // A dead-flat series would divide by zero; give it a mid-height line.
    const span = max - min || 1;
    const pad = 2;

    const points: [number, number][] = values.map((v, i) => [
      (i / (values.length - 1)) * width,
      height - pad - ((v - min) / span) * (height - pad * 2),
    ]);

    const generator = line<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(curveMonotoneX);

    const strokePath = generator(points);
    const areaPath = strokePath ? `${strokePath} L ${width} ${height} L 0 ${height} Z` : null;

    return { stroke: strokePath, area: areaPath };
  }, [values, height, width]);

  if (!stroke) return <View style={{ width, height }} />;

  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <Svg width={width} height={height}>
      {filled && area ? (
        <>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.24} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <Path d={stroke} stroke={color} strokeWidth={1.75} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
