import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface SignalCardProps {
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: 'green' | 'red' | 'yellow' | 'blue';
  confidence?: number;
  tag?: string;
  description?: string;
  onClick?: () => void;
}

const badgeStyles = {
  green: 'bg-green-500/15 text-green-400 border-green-500/30',
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const IconMap = {
  green: TrendingUp,
  red: TrendingDown,
  yellow: AlertCircle,
  blue: AlertCircle,
};

export default function SignalCard({ title, subtitle, badge, badgeColor, confidence, tag, description, onClick }: SignalCardProps) {
  const Icon = IconMap[badgeColor];
  return (
    <div 
      onClick={onClick}
      className={`bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-blue-500/50 hover:bg-gray-800/60 transition-all ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-100 text-[15px]">{title}</h3>
            {tag && <span className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full uppercase tracking-wider">{tag}</span>}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <span className={`text-xs font-bold border px-2 py-1 rounded-lg flex items-center gap-1.5 ${badgeStyles[badgeColor]}`}>
          <Icon size={12} />
          {badge}
        </span>
      </div>
      {description && <p className="text-sm text-gray-400 leading-relaxed">{description}</p>}
      {confidence !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Signal Confidence</span>
            <span className="font-bold text-gray-300">{confidence}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${confidence > 70 ? 'bg-green-500' : confidence > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${confidence}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
