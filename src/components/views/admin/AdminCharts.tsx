import { Area, AreaChart, Cell, Legend, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AdminChartPoint } from '../../../services/api/adminApi';
import { formatNumber, formatChartLabel } from './AdminUtils';



export function TrendLineChart({
  data,
  isLoading,
  tone,
  t,
}: {
  data: AdminChartPoint[]
  isLoading: boolean
  tone: 'primary' | 'blue'
  t: any
}) {
  if (isLoading) {
    return <div className="admin-chart-placeholder">{t('chartLoading')}</div>
  }

  if (data.length === 0) {
    return <div className="admin-chart-placeholder">{t('chartNoData')}</div>
  }

  const color = tone === 'primary' ? '#14b8a6' : '#3b82f6'

  return (
    <div className="admin-trend-chart" style={{ height: '240px', width: '100%', marginTop: '24px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id={`color${tone}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--muted)', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)', borderRadius: '12px', color: 'var(--text)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
            itemStyle={{ color: color, fontWeight: 'bold' }}
            cursor={{ stroke: 'var(--line)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill={`url(#color${tone})`} 
            activeDot={{ r: 6, strokeWidth: 0, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DistributionChart({
  data,
  isLoading,
  tone,
  t,
}: {
  data: AdminChartPoint[]
  isLoading: boolean
  tone: 'primary' | 'orange' | 'blue'
  t: any
}) {
  const total = data.reduce((sum, point) => sum + point.value, 0)

  if (isLoading) {
    return <div className="admin-chart-placeholder">{t('dataLoading')}</div>
  }

  if (total === 0) {
    return <div className="admin-chart-placeholder">{t('chartNoData')}</div>
  }

  const COLORS = tone === 'primary' 
    ? ['#14b8a6', '#0f766e', '#042f2e', '#99f6e4', '#5eead4'] 
    : tone === 'orange'
    ? ['#f59e0b', '#b45309', '#78350f', '#fde68a', '#fcd34d']
    : ['#3b82f6', '#1d4ed8', '#1e3a8a', '#bfdbfe', '#93c5fd']

  const formattedData = data.map(d => ({ ...d, label: formatChartLabel(d.label, t) }))

  return (
    <div className="admin-distribution" style={{ height: '220px', width: '100%', marginTop: '16px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)', borderRadius: '12px', color: 'var(--text)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
            itemStyle={{ fontWeight: 'bold' }}
            formatter={(value: any) => [formatNumber(Number(value)), t('countLabel')]}
          />
          <Legend 
            wrapperStyle={{ fontSize: '13px', color: 'var(--muted)' }} 
            layout="vertical" 
            verticalAlign="middle" 
            align="right"
          />
          <Pie
            data={formattedData}
            cx="40%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
            nameKey="label"
            stroke="none"
          >
            {formattedData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
