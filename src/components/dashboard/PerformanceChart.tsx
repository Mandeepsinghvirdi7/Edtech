
import { useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarController,
  LineController,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { ChartDataPoint } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarController,
  LineController,
  ChartDataLabels
);

interface PerformanceChartProps {
  data: ChartDataPoint[];
  title: string;
  currentDrive?: string;
}

export function PerformanceChart({ data, title, currentDrive }: PerformanceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const totalTarget = useMemo(() => data.reduce((sum, d) => sum + d.target, 0), [data]);
  const totalClosedPoints = useMemo(() => data.reduce((sum, d) => sum + d.closedPoints, 0), [data]);

  // Calculate points to achieve 100% from October to current month
  const pointsToAchieve100 = useMemo(() => {
    // Find October index
    const octoberIndex = data.findIndex(d => d.label === 'OCT');
    if (octoberIndex === -1) return totalTarget - totalClosedPoints;

    // Sum from October to the end
    const relevantData = data.slice(octoberIndex);
    const totalTargetFromOct = relevantData.reduce((sum, d) => sum + d.target, 0);
    const totalClosedFromOct = relevantData.reduce((sum, d) => sum + d.closedPoints, 0);

    return Math.max(0, totalTargetFromOct - totalClosedFromOct);
  }, [data, totalTarget, totalClosedPoints]);
  const overallAchievement = useMemo(() => {
    if (totalTarget === 0) return 0;
    return Math.round((totalClosedPoints / totalTarget) * 100);
  }, [totalClosedPoints, totalTarget]);

  // Calculate dynamic max for y1 axis (Achievement %) with 10% buffer
  const y1Max = useMemo(() => {
    const maxAchievement = Math.max(...data.map(d => d.achievement), 0);
    return Math.max(100, Math.ceil(maxAchievement * 1.1));
  }, [data]);

  // Calculate dynamic max for left y-axis (bars) with 10% buffer
  const yMax = useMemo(() => {
    const maxLeft = Math.max(
      ...data.map(d => Math.max(d.target, d.admissions, d.closedPoints)),
      0
    );
    // Add 10% buffer and round up; ensure a sensible minimum
    return Math.max(10, Math.ceil(maxLeft * 1.1));
  }, [data]);

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Target',
        data: data.map(d => d.target),
        backgroundColor: 'hsl(199, 89%, 48%)',
        borderColor: 'hsl(199, 89%, 48%)',
        borderWidth: 1,
        borderRadius: 6,
        yAxisID: 'y',
        minBarLength: 1, // Ensure bars are visible even with 0 values
      },
      {
        type: 'bar' as const,
        label: 'Admissions',
        data: data.map(d => d.admissions),
        backgroundColor: 'hsl(142, 71%, 45%)',
        borderColor: 'hsl(142, 71%, 45%)',
        borderWidth: 1,
        borderRadius: 6,
        yAxisID: 'y',
        minBarLength: 1, // Ensure bars are visible even with 0 values
      },
      {
        // New bar dataset for "Closed Points"
        type: 'bar' as const,
        label: 'Closed Points',
        data: data.map(d => d.closedPoints), // Using achievement data for closed points
        backgroundColor: 'hsl(263, 70%, 58%)', // Matching the line color, but opaque
        borderColor: 'hsl(263, 70%, 58%)',
        borderWidth: 1,
        borderRadius: 6,
        yAxisID: 'y', // Should be on the same axis as Achievement %
        minBarLength: 1, // Ensure bars are visible even with 0 values
      },
      {
        type: 'line' as const,
        label: 'Achievement %',
        data: data.map(d => d.achievement),
        borderColor: 'hsl(263, 70%, 58%)',
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y1',
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: 'hsl(215, 20%, 65%)',
          usePointStyle: true,
          padding: 20,
          font: { size: 12, family: 'Inter' },
        },
      },
      tooltip: {
        backgroundColor: 'hsl(222, 47%, 14%)',
        titleColor: 'hsl(210, 40%, 98%)',
        bodyColor: 'hsl(215, 20%, 65%)',
        borderColor: 'hsl(217, 33%, 22%)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 14, weight: 'bold' as const, family: 'Inter' },
        bodyFont: { size: 12, family: 'Inter' },
      },
      datalabels: {
        display: (context: any) => {
          // Show labels for all datasets (bars and line)
          return true;
        },
        color: (context: any) => {
          // Auto-detect dataset color and set text color for readability
          const dataset = context.dataset;
          if (dataset.type === 'line') {
            // For line datasets, use white text on dark background
            return 'white';
          }
          const backgroundColor = dataset.backgroundColor;
          // Check if it's a dark color (purple/blue/navy)
          if (backgroundColor.includes('hsl(199') || backgroundColor.includes('hsl(142') || backgroundColor.includes('hsl(263')) {
            return 'white'; // White text for dark bars
          }
          return 'black'; // Black text for light bars
        },
        font: {
          weight: 'bold' as const,
          size: 11,
          family: 'Inter',
        },
        anchor: (context: any) => {
          // For line datasets, position above the point
          return context.dataset.type === 'line' ? 'end' : 'center';
        },
        align: (context: any) => {
          // For line datasets, align above the point
          return context.dataset.type === 'line' ? 'top' : 'center';
        },
        formatter: (value: number, context: any) => {
          // For line datasets (Achievement %), show as percentage
          if (context.dataset.type === 'line') {
            return `${value}%`;
          }
          // For bar datasets, show formatted number
          return value.toLocaleString();
        },
        clip: false, // Allow labels to extend beyond chart bounds for visibility
        backgroundColor: (context: any) => {
          // Add background for line labels to improve visibility
          if (context.dataset.type === 'line') {
            return 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black background
          }
          return 'transparent';
        },
        borderRadius: 3,
        padding: 4,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'hsla(217, 33%, 22%, 0.5)',
        },
        ticks: {
          color: 'hsl(215, 20%, 65%)',
          font: { size: 11, family: 'Inter', weight: 300 as any },
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        max: yMax,
        grid: {
          color: 'hsla(217, 33%, 22%, 0.5)',
        },
        ticks: {
          color: 'hsl(215, 20%, 65%)',
          font: { size: 11, family: 'Inter', weight: 300 as any },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        min: 0,
        max: y1Max,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'hsl(263, 70%, 58%)',
          font: { size: 11, family: 'Inter', weight: 300 as any },
          callback: (value: number | string) => `${value}%`,
        },
      },
    },
  };

  const handleDownload = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: 'hsl(222, 47%, 11%)',
      });
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_chart.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="chart-container"
      ref={chartRef}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground font-bold">Overall Achievement: {overallAchievement}%</p>
          <p className="text-sm text-muted-foreground">Points to achieve 100% {currentDrive ? `(${currentDrive})` : ''}: {pointsToAchieve100.toLocaleString()}</p>
        </div>
        <button
          onClick={handleDownload}
          className="btn-ghost flex items-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
      <div className={`h-[60vh] max-h-[900px] bg-white p-4 rounded overflow-hidden w-full`}>
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </motion.div>
  );
}
