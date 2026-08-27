import { scaleLinear } from 'd3-scale';
import { curveMonotoneX, line } from 'd3-shape';
import * as React from 'react';
import { View, type LayoutChangeEvent, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { FONT_FAMILY } from '@/lib/fonts';

export type ChartSeries = {
  id: string;
  label: string;
  color: string;
  points: { x: number; y: number }[];
};

const PADDING = { top: 12, bottom: 26, left: 8, right: 64 };
const GRID_LINES = 4;

/**
 * Multi-series time chart.
 *
 * Two RTL choices worth stating: the **time axis still runs left → right**,
 * because that is the convention on every Iranian financial site (TGJU, TSETMC)
 * and mirroring it would misread as a falling market; but the **value axis sits
 * on the right**, which is the leading edge in an RTL layout.
 *
 * Every SVG label uses `textAnchor="middle"`. `start`/`end` resolve against the
 * inherited text direction on web but not on native, so avoiding them entirely
 * is what keeps the three platforms pixel-consistent.
 */
export function LineChart({
  series,
  height = 200,
  formatY,
  formatX,
  gridColor,
  labelColor,
  crosshairColor,
  onActiveIndexChange,
}: {
  series: ChartSeries[];
  height?: number;
  formatY: (value: number) => string;
  formatX: (value: number) => string;
  gridColor: string;
  labelColor: string;
  crosshairColor: string;
  onActiveIndexChange?: (index: number | null) => void;
}) {
  const [width, setWidth] = React.useState(0);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const geometry = React.useMemo(() => {
    const populated = series.filter((s) => s.points.length > 1);
    if (width <= 0 || populated.length === 0) return null;

    const allX = populated.flatMap((s) => s.points.map((p) => p.x));
    const allY = populated.flatMap((s) => s.points.map((p) => p.y));

    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);

    // Breathing room so the extremes are not welded to the frame.
    const yPad = (maxY - minY || maxY || 1) * 0.08;

    const x = scaleLinear()
      .domain([minX, maxX])
      .range([PADDING.left, width - PADDING.right]);
    const y = scaleLinear()
      .domain([minY - yPad, maxY + yPad])
      .range([height - PADDING.bottom, PADDING.top]);

    const generator = line<{ x: number; y: number }>()
      .x((d) => x(d.x))
      .y((d) => y(d.y))
      .curve(curveMonotoneX);

    return {
      x,
      y,
      minX,
      maxX,
      paths: populated.map((s) => ({ ...s, d: generator(s.points) })),
      ticks: y.ticks(GRID_LINES),
      // All series share one time base, so the longest one drives the crosshair.
      spine: populated.reduce((a, b) => (a.points.length >= b.points.length ? a : b)).points,
    };
  }, [series, width, height]);

  const updateActive = React.useCallback(
    (event: GestureResponderEvent) => {
      if (!geometry) return;
      const { locationX } = event.nativeEvent;
      const plotWidth = width - PADDING.right - PADDING.left;
      const ratio = Math.min(1, Math.max(0, (locationX - PADDING.left) / plotWidth));
      const index = Math.round(ratio * (geometry.spine.length - 1));
      setActiveIndex(index);
      onActiveIndexChange?.(index);
    },
    [geometry, width, onActiveIndexChange]
  );

  const clearActive = React.useCallback(() => {
    setActiveIndex(null);
    onActiveIndexChange?.(null);
  }, [onActiveIndexChange]);

  return (
    <View
      onLayout={onLayout}
      style={{ height }}
      // RN's built-in responder system rather than gesture-handler: it is the
      // one touch API that behaves the same on native and on react-native-web.
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={updateActive}
      onResponderMove={updateActive}
      onResponderRelease={clearActive}
      onResponderTerminate={clearActive}>
      {geometry && width > 0 ? (
        <Svg width={width} height={height}>
          {/* Horizontal grid with the value scale on the right */}
          <G>
            {geometry.ticks.map((tick) => (
              <G key={tick}>
                <Line
                  x1={PADDING.left}
                  x2={width - PADDING.right}
                  y1={geometry.y(tick)}
                  y2={geometry.y(tick)}
                  stroke={gridColor}
                  strokeWidth={1}
                />
                <SvgText
                  x={width - PADDING.right / 2}
                  y={geometry.y(tick) + 4}
                  fontFamily={FONT_FAMILY.medium}
                  fontSize={10}
                  fill={labelColor}
                  textAnchor="middle">
                  {formatY(tick)}
                </SvgText>
              </G>
            ))}
          </G>

          {/* Time axis: first, middle and last only — denser ticks collide in
              Persian, whose month names are long. */}
          {[0, 0.5, 1].map((ratio) => {
            const value = geometry.minX + (geometry.maxX - geometry.minX) * ratio;
            const cx = geometry.x(value);
            const clamped = Math.min(width - PADDING.right - 24, Math.max(28, cx));
            return (
              <SvgText
                key={ratio}
                x={clamped}
                y={height - 8}
                fontFamily={FONT_FAMILY.medium}
                fontSize={10}
                fill={labelColor}
                textAnchor="middle">
                {formatX(value)}
              </SvgText>
            );
          })}

          {geometry.paths.map((s) =>
            s.d ? (
              <Path
                key={s.id}
                d={s.d}
                stroke={s.color}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null
          )}

          {activeIndex !== null && geometry.spine[activeIndex] ? (
            <G>
              <Line
                x1={geometry.x(geometry.spine[activeIndex].x)}
                x2={geometry.x(geometry.spine[activeIndex].x)}
                y1={PADDING.top}
                y2={height - PADDING.bottom}
                stroke={crosshairColor}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {geometry.paths.map((s) => {
                const point = s.points[Math.min(activeIndex, s.points.length - 1)];
                if (!point) return null;
                return (
                  <Circle
                    key={`dot-${s.id}`}
                    cx={geometry.x(point.x)}
                    cy={geometry.y(point.y)}
                    r={4}
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                );
              })}
            </G>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
