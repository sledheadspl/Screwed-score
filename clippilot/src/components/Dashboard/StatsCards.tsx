import { BarChart3, Clapperboard, TrendingUp, Users } from "lucide-react";

interface StatCard {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon: React.ReactNode;
  color: string;
}

interface StatsCardsProps {
  clipsToday: number;
  totalViews: number;
  followersGained: number;
  queueSize: number;
}

export default function StatsCards({
  clipsToday,
  totalViews,
  followersGained,
  queueSize,
}: StatsCardsProps) {
  const stats: StatCard[] = [
    {
      label: "Clips Today",
      value: clipsToday,
      icon: <Clapperboard size={18} />,
      color: "text-brand-400",
    },
    {
      label: "Total Views",
      value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews,
      delta: "+12%",
      deltaPositive: true,
      icon: <BarChart3 size={18} />,
      color: "text-green-400",
    },
    {
      label: "Followers Gained",
      value: followersGained,
      delta: "+8%",
      deltaPositive: true,
      icon: <Users size={18} />,
      color: "text-purple-400",
    },
    {
      label: "Queue Size",
      value: queueSize,
      icon: <TrendingUp size={18} />,
      color: "text-yellow-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">
              {stat.label}
            </span>
            <span className={stat.color}>{stat.icon}</span>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{stat.value}</p>
          {stat.delta && (
            <p
              className={`text-xs mt-1 font-medium ${
                stat.deltaPositive ? "text-green-400" : "text-red-400"
              }`}
            >
              {stat.delta} this week
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
