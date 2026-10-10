import { Activity, AlertCircle, Users, BarChart3, MessageSquare, PieChart } from 'lucide-react';
import type { AdminStats } from '../../../services/api/adminApi';
import { TrendLineChart, DistributionChart } from './AdminCharts';
import { formatNumber } from './AdminUtils';

type Props = {
  stats: AdminStats;
  isStatsLoading: boolean;
  t: any;
};

export function AdminDashboardTab({ stats, isStatsLoading, t }: Props) {
  return (
    <>
      <div className="admin-dashboard-cards">
        <div className="stat-card">
          <div className="stat-icon users-icon"><Users size={24} /></div>
          <div className="stat-info">
            <h3>{t('totalUsersTitle')}</h3>
            <p className="stat-value">{isStatsLoading ? <div className="skeleton skeleton-text" style={{ width: '80px', height: '28px', marginTop: '4px' }}></div> : formatNumber(stats.totalUsers)}</p>
            <span className="stat-trend positive">{isStatsLoading ? <div className="skeleton skeleton-text" style={{ width: '120px', height: '14px', marginTop: '4px' }}></div> : t('suspendedCount', { count: formatNumber(stats.suspendedUsers) })}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active-icon"><Activity size={24} /></div>
          <div className="stat-info">
            <h3>{t('unlockedUsersTitle')}</h3>
            <p className="stat-value">{isStatsLoading ? <div className="skeleton skeleton-text" style={{ width: '80px', height: '28px', marginTop: '4px' }}></div> : formatNumber(stats.activeUsers)}</p>
            <span className="stat-trend">{isStatsLoading ? <div className="skeleton skeleton-text" style={{ width: '100px', height: '14px', marginTop: '4px' }}></div> : t('onlineCount', { count: formatNumber(stats.onlineUsers) })}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon alert-icon"><AlertCircle size={24} /></div>
          <div className="stat-info">
            <h3>{t('systemAlertsTitle')}</h3>
            <p className="stat-value">{isStatsLoading ? <div className="skeleton skeleton-text" style={{ width: '80px', height: '28px', marginTop: '4px' }}></div> : formatNumber(stats.alertCount)}</p>
            <span className="stat-trend negative">{isStatsLoading ? <div className="skeleton skeleton-text" style={{ width: '60px', height: '14px', marginTop: '4px' }}></div> : t('needsAction')}</span>
          </div>
        </div>
      </div>

      <div className="admin-chart-grid">
        <section className="admin-chart-panel admin-chart-panel-wide">
          <div className="admin-chart-header">
            <div>
              <h2>
                <BarChart3 size={18} />
                {t('newUsersLabel')}
              </h2>
              <p>{t('last7DaysLabel')}</p>
            </div>
            <strong>{formatNumber(stats.userGrowth.reduce((sum, point) => sum + point.value, 0))}</strong>
          </div>
          <TrendLineChart t={t} data={stats.userGrowth} isLoading={isStatsLoading} tone="primary" />
        </section>

        <section className="admin-chart-panel admin-chart-panel-wide">
          <div className="admin-chart-header">
            <div>
              <h2>
                <MessageSquare size={18} />
                {t('messageVolumeLabel')}
              </h2>
              <p>{t('last7DaysLabel')}</p>
            </div>
            <strong>{formatNumber(stats.messageVolume.reduce((sum, point) => sum + point.value, 0))}</strong>
          </div>
          <TrendLineChart t={t} data={stats.messageVolume} isLoading={isStatsLoading} tone="blue" />
        </section>

        <section className="admin-chart-panel">
          <div className="admin-chart-header">
            <div>
              <h2>
                <PieChart size={18} />
                {t('roleDistributionTitle')}
              </h2>
              <p>{t('userDistributionLabel')}</p>
            </div>
          </div>
          <DistributionChart t={t} data={stats.roleDistribution} isLoading={isStatsLoading} tone="primary" />
        </section>

        <section className="admin-chart-panel">
          <div className="admin-chart-header">
            <div>
              <h2>
                <AlertCircle size={18} />
                {t('reportStatusTitle')}
              </h2>
              <p>{t('allReportsLabel')}</p>
            </div>
          </div>
          <DistributionChart t={t} data={stats.reportStatusDistribution} isLoading={isStatsLoading} tone="orange" />
        </section>

        <section className="admin-chart-panel">
          <div className="admin-chart-header">
            <div>
              <h2>
                <Users size={18} />
                {t('conversationTypesTitle')}
              </h2>
              <p>{t('conversationTypesLabel')}</p>
            </div>
          </div>
          <DistributionChart t={t} data={stats.conversationDistribution} isLoading={isStatsLoading} tone="blue" />
        </section>
      </div>
    </>
  );
}
