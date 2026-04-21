import { getReputationTier, getTierColor } from '@/lib/workers/reputation'

interface Props {
  score:    number
  isBanned: boolean
  size?:    'sm' | 'md' | 'lg'
}

export function ReputationBadge({ score, isBanned, size = 'md' }: Props) {
  const tier  = getReputationTier(score, isBanned)
  const color = getTierColor(tier)

  const textSize  = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'
  const barHeight = size === 'sm' ? 'h-1'         : size === 'lg' ? 'h-2.5'   : 'h-1.5'
  const scoreSize = size === 'sm' ? 'text-sm'     : size === 'lg' ? 'text-2xl' : 'text-base'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className={`font-black ${scoreSize}`} style={{ color }}>{score}</span>
        <span
          className={`${textSize} font-bold px-2 py-0.5 rounded-full border`}
          style={{ color, borderColor: color + '40', background: color + '12' }}
        >
          {tier}
        </span>
      </div>
      <div className={`w-full ${barHeight} rounded-full bg-brand-muted overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  )
}
