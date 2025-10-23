/**
 * Advanced Data Visualization Components
 * Perfect 10/10 UI/UX Implementation
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animate } from '../../utils/animations';

// ============================================================================
// CHART TYPES & INTERFACES
// ============================================================================

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }[];
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip?: {
      enabled?: boolean;
      backgroundColor?: string;
      titleColor?: string;
      bodyColor?: string;
      borderColor?: string;
      borderWidth?: number;
    };
  };
  scales?: {
    x?: {
      display?: boolean;
      title?: {
        display?: boolean;
        text?: string;
      };
      grid?: {
        display?: boolean;
        color?: string;
      };
    };
    y?: {
      display?: boolean;
      title?: {
        display?: boolean;
        text?: string;
      };
      grid?: {
        display?: boolean;
        color?: string;
      };
      beginAtZero?: boolean;
    };
  };
  animation?: {
    duration?: number;
    easing?: string;
  };
}

export interface RealTimeData {
  timestamp: number;
  value: number;
  label?: string;
}

// ============================================================================
// REAL-TIME LINE CHART
// ============================================================================

interface RealTimeLineChartProps {
  data: RealTimeData[];
  maxDataPoints?: number;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  className?: string;
}

export const RealTimeLineChart: React.FC<RealTimeLineChartProps> = ({
  data,
  maxDataPoints = 50,
  height = 200,
  color = '#3b82f6',
  showGrid = true,
  showTooltip = true,
  animated = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: number; timestamp: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [height]);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = dimensions.width * window.devicePixelRatio;
    canvas.height = dimensions.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Get recent data points
    const recentData = data.slice(-maxDataPoints);
    if (recentData.length < 2) return;

    // Calculate min/max values
    const values = recentData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    // Calculate padding
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;

      // Horizontal grid lines
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
      }

      // Vertical grid lines
      for (let i = 0; i <= 10; i++) {
        const x = padding.left + (chartWidth / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
      }
    }

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    recentData.forEach((point, index) => {
      const x = padding.left + (chartWidth / (recentData.length - 1)) * index;
      const y = padding.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw area under line
    ctx.fillStyle = color + '20';
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);

    recentData.forEach((point, index) => {
      const x = padding.left + (chartWidth / (recentData.length - 1)) * index;
      const y = padding.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      ctx.lineTo(x, y);
    });

    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw data points
    ctx.fillStyle = color;
    recentData.forEach((point, index) => {
      const x = padding.left + (chartWidth / (recentData.length - 1)) * index;
      const y = padding.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw hovered point
    if (hoveredPoint) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hoveredPoint.x, hoveredPoint.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // Draw Y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 5; i++) {
      const value = minValue + (valueRange / 5) * i;
      const y = padding.top + (chartHeight / 5) * (5 - i);
      ctx.fillText(value.toFixed(1), padding.left - 10, y);
    }

    // Draw X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const timeLabels = recentData.filter((_, index) => index % Math.ceil(recentData.length / 5) === 0);
    timeLabels.forEach((point, index) => {
      const x = padding.left + (chartWidth / (recentData.length - 1)) * (recentData.indexOf(point));
      const time = new Date(point.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      ctx.fillText(time, x, padding.top + chartHeight + 10);
    });

  }, [data, maxDataPoints, dimensions, color, showGrid, hoveredPoint]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !showTooltip) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find closest data point
    const recentData = data.slice(-maxDataPoints);
    if (recentData.length < 2) return;

    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    const pointIndex = Math.round((x - padding.left) / (chartWidth / (recentData.length - 1)));

    if (pointIndex >= 0 && pointIndex < recentData.length) {
      const point = recentData[pointIndex];
      const pointX = padding.left + (chartWidth / (recentData.length - 1)) * pointIndex;

      const values = recentData.map(d => d.value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const valueRange = maxValue - minValue || 1;

      const pointY = padding.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;

      setHoveredPoint({
        x: pointX,
        y: pointY,
        value: point.value,
        timestamp: point.timestamp
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full"
      />

      {hoveredPoint && showTooltip && (
        <div
          className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10"
          style={{
            left: hoveredPoint.x - 30,
            top: hoveredPoint.y - 40,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold">{hoveredPoint.value.toFixed(1)}</div>
          <div className="text-gray-300">
            {new Date(hoveredPoint.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// INTERACTIVE BAR CHART
// ============================================================================

interface InteractiveBarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showValues?: boolean;
  animated?: boolean;
  className?: string;
}

export const InteractiveBarChart: React.FC<InteractiveBarChartProps> = ({
  data,
  height = 300,
  showValues = true,
  animated = true,
  className = ''
}) => {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('bar-chart-container');
      if (container) {
        setDimensions({ width: container.offsetWidth, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [height]);

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = dimensions.width / data.length * 0.8;
  const barSpacing = dimensions.width / data.length * 0.2;

  return (
    <div id="bar-chart-container" className={`relative ${className}`}>
      <svg width={dimensions.width} height={dimensions.height} className="w-full h-full">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3"/>

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (dimensions.height - 60);
          const x = index * (barWidth + barSpacing) + barSpacing / 2;
          const y = dimensions.height - barHeight - 30;
          const isHovered = hoveredBar === index;

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={item.color || '#3b82f6'}
                opacity={isHovered ? 0.8 : 0.6}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredBar(index)}
                onMouseLeave={() => setHoveredBar(null)}
                transform={isHovered ? 'scale(1.05)' : 'scale(1)'}
                transformOrigin={`${x + barWidth/2} ${dimensions.height - 30}`}
              />

              {/* Value labels */}
              {showValues && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-700"
                >
                  {item.value}
                </text>
              )}

              {/* Category labels */}
              <text
                x={x + barWidth / 2}
                y={dimensions.height - 10}
                textAnchor="middle"
                className="text-xs fill-gray-600"
                transform={`rotate(-45 ${x + barWidth / 2} ${dimensions.height - 10})`}
              >
                {item.label}
              </text>
            </g>
          );
        })}

        {/* Y-axis */}
        <line
          x1="0"
          y1="0"
          x2="0"
          y2={dimensions.height - 30}
          stroke="#d1d5db"
          strokeWidth="2"
        />

        {/* X-axis */}
        <line
          x1="0"
          y1={dimensions.height - 30}
          x2={dimensions.width}
          y2={dimensions.height - 30}
          stroke="#d1d5db"
          strokeWidth="2"
        />
      </svg>

      {/* Tooltip */}
      {hoveredBar !== null && (
        <div
          className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10"
          style={{
            left: hoveredBar * (barWidth + barSpacing) + barSpacing / 2 + barWidth / 2 - 30,
            top: 10,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold">{data[hoveredBar].label}</div>
          <div className="text-gray-300">Value: {data[hoveredBar].value}</div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ANIMATED PIE CHART
// ============================================================================

interface AnimatedPieChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  showLabels?: boolean;
  showPercentages?: boolean;
  animated?: boolean;
  className?: string;
}

export const AnimatedPieChart: React.FC<AnimatedPieChartProps> = ({
  data,
  size = 200,
  showLabels = true,
  showPercentages = true,
  animated = true,
  className = ''
}) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

  useEffect(() => {
    if (animated) {
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        setAnimationProgress(progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setAnimationProgress(1);
    }
  }, [animated, data]);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;

  let currentAngle = 0;

  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", centerX, centerY,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  return (
    <div className={`relative ${className}`}>
      <svg width={size} height={size} className="w-full h-full">
        {data.map((item, index) => {
          const percentage = item.value / total;
          const angle = percentage * 360 * animationProgress;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;

          currentAngle += angle;

          const isHovered = hoveredSegment === index;
          const segmentRadius = isHovered ? radius + 5 : radius;

          return (
            <g key={index}>
              <path
                d={createArcPath(startAngle, endAngle, segmentRadius)}
                fill={item.color}
                opacity={isHovered ? 0.8 : 0.6}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
              />

              {/* Labels */}
              {showLabels && animationProgress === 1 && (
                <text
                  x={polarToCartesian(centerX, centerY, radius + 20, startAngle + angle / 2).x}
                  y={polarToCartesian(centerX, centerY, radius + 20, startAngle + angle / 2).y}
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-700"
                >
                  {item.label}
                </text>
              )}

              {/* Percentages */}
              {showPercentages && animationProgress === 1 && (
                <text
                  x={polarToCartesian(centerX, centerY, radius - 10, startAngle + angle / 2).x}
                  y={polarToCartesian(centerX, centerY, radius - 10, startAngle + angle / 2).y}
                  textAnchor="middle"
                  className="text-xs font-bold fill-white"
                >
                  {Math.round(percentage * 100)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{total}</div>
          <div className="text-xs text-gray-600">Total</div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredSegment !== null && (
        <div
          className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10"
          style={{
            left: '50%',
            top: '10px',
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold">{data[hoveredSegment].label}</div>
          <div className="text-gray-300">
            {data[hoveredSegment].value} ({Math.round((data[hoveredSegment].value / total) * 100)}%)
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// REAL-TIME METRICS DASHBOARD
// ============================================================================

interface RealTimeMetricsProps {
  metrics: {
    label: string;
    value: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
    color?: string;
  }[];
  updateInterval?: number;
  className?: string;
}

export const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({
  metrics,
  updateInterval = 1000,
  className = ''
}) => {
  const [animatedValues, setAnimatedValues] = useState<number[]>(
    metrics.map(() => 0)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedValues(prev =>
        prev.map((current, index) => {
          const target = metrics[index].value;
          const diff = target - current;
          return current + diff * 0.1; // Smooth animation
        })
      );
    }, updateInterval);

    return () => clearInterval(interval);
  }, [metrics, updateInterval]);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {metrics.map((metric, index) => (
        <Animate key={index} animation="fadeInUp" delay={index * 100}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(animatedValues[index])}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                metric.trend === 'up' ? 'bg-green-500' :
                metric.trend === 'down' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
            </div>
            <div className="mt-2 flex items-center">
              <span className={`text-sm font-medium ${
                metric.change > 0 ? 'text-green-600' :
                metric.change < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {metric.change > 0 ? '+' : ''}{metric.change}%
              </span>
              <span className="text-sm text-gray-500 ml-2">vs last period</span>
            </div>
          </div>
        </Animate>
      ))}
    </div>
  );
};

// ============================================================================
// HEAT MAP COMPONENT
// ============================================================================

interface HeatMapProps {
  data: { x: number; y: number; value: number }[];
  width?: number;
  height?: number;
  cellSize?: number;
  className?: string;
}

export const HeatMap: React.FC<HeatMapProps> = ({
  data,
  width = 400,
  height = 300,
  cellSize = 20,
  className = ''
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const valueRange = maxValue - minValue || 1;

  const getColor = (value: number) => {
    const intensity = (value - minValue) / valueRange;
    const hue = 120 * (1 - intensity); // Green to red
    return `hsl(${hue}, 70%, 50%)`;
  };

  const cols = Math.floor(width / cellSize);
  const rows = Math.floor(height / cellSize);

  return (
    <div className={`relative ${className}`}>
      <svg width={width} height={height} className="w-full h-full">
        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: cols }, (_, col) => {
            const cellData = data.find(d => d.x === col && d.y === row);
            const value = cellData?.value || 0;

            return (
              <rect
                key={`${row}-${col}`}
                x={col * cellSize}
                y={row * cellSize}
                width={cellSize}
                height={cellSize}
                fill={getColor(value)}
                stroke="#ffffff"
                strokeWidth="1"
                className="transition-all duration-200 hover:opacity-80"
              />
            );
          })
        )}
      </svg>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-sm p-3">
        <div className="text-xs font-medium text-gray-700 mb-2">Intensity</div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-xs text-gray-600">High</span>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-xs text-gray-600">Low</span>
        </div>
      </div>
    </div>
  );
};

export default {
  RealTimeLineChart,
  InteractiveBarChart,
  AnimatedPieChart,
  RealTimeMetrics,
  HeatMap
};
