import { motion } from 'framer-motion';
import { Target, Users, TrendingUp, Percent, UserCheck, ArrowUp, ArrowDown } from 'lucide-react';
import { KPIData } from '@/types';

const iconMap: Record<string, typeof Target> = {
  target: Target,
  users: Users,
  'trending-up': TrendingUp,
  percent: Percent,
  'user-check': UserCheck,
};

interface KPICardProps {
  data: KPIData;
  index: number;
}

export function KPICard({ data, index }: KPICardProps) {
  const Icon = iconMap[data.icon] || Target;
  
  const formatValue = (value: number) => {
    if (data.label.includes('Avg') || data.label.includes('Achievement')) {
      return `${value}%`;
    }
    return value.toLocaleString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {data.change !== 0 && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            data.changeType === 'positive' ? 'text-success' : 
            data.changeType === 'negative' ? 'text-destructive' : 
            'text-muted-foreground'
          }`}>
            {data.changeType === 'positive' ? (
              <ArrowUp className="w-3 h-3" />
            ) : data.changeType === 'negative' ? (
              <ArrowDown className="w-3 h-3" />
            ) : null}
            <span>{Math.abs(data.change)}%</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-bold text-foreground mb-1">
          {formatValue(data.value)}
        </h3>
        <p className="text-sm text-muted-foreground">{data.label}</p>
      </div>
    </motion.div>
  );
}
