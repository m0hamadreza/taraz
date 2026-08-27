import { arc, pie } from 'd3-shape';
import * as React from 'react';
import Svg, { G, Path } from 'react-native-svg';

export type DonutSlice = {
  id: string;
  value: number;
  color: string;
};

/**
 * Allocation ring. Slices are drawn in the order given — the caller has already
 * sorted them — with a small gap so adjacent colours stay distinguishable
 * without needing a stroke.
 */
export function DonutChart({
  slices,
  size = 132,
  thickness = 16,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
}) {
  const arcs = React.useMemo(() => {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    if (total <= 0) return [];

    const radius = size / 2;
    const layout = pie<DonutSlice>()
      .value((d) => d.value)
      .sort(null)
      .padAngle(slices.length > 1 ? 0.02 : 0);

    const generator = arc<ReturnType<typeof layout>[number]>()
      .innerRadius(radius - thickness)
      .outerRadius(radius)
      .cornerRadius(3);

    return layout(slices).map((entry) => ({
      id: entry.data.id,
      color: entry.data.color,
      d: generator(entry) ?? '',
    }));
  }, [slices, size, thickness]);

  return (
    <Svg width={size} height={size}>
      <G x={size / 2} y={size / 2}>
        {arcs.map((a) => (
          <Path key={a.id} d={a.d} fill={a.color} />
        ))}
      </G>
    </Svg>
  );
}
