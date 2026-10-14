/**
 * designTab charts — SVG, responsive (ResizeObserver), animated, dark-mode
 * aware (theme tokens), with hover/keyboard tooltips and a screen-reader
 * data table. Colours default to the active discipline accent + neutrals.
 */
export { AreaChart, type AreaChartProps, type AreaSeries } from './AreaChart'
export { BarChart, type BarChartProps, type BarSeries } from './BarChart'
export { DonutChart, type DonutChartProps, type DonutDatum } from './DonutChart'
export { Sparkline, type SparklineProps } from './Sparkline'
export { PipelineBar, type PipelineBarProps, type PipelineSegment } from './PipelineBar'
export { Heatmap, type HeatmapProps } from './Heatmap'
export { CHART_COLORS, ChartLegend, ChartTooltip, TooltipRow, TooltipTitle, compactNumber, niceTicks, monotonePath, type LegendItem } from './shared'
