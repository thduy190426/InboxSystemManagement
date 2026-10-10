import { useMemo } from 'react';
import { Flag, Loader2, Download, CheckCircle2, XCircle } from 'lucide-react';
import type { MessageReport, MessageReportStatus } from '../../../services/api/adminApi';
import { getReportStatusLabel, formatReportTime } from './AdminUtils';

type Props = {
  reports: MessageReport[];
  isReportsLoading: boolean;
  reportStatus: MessageReportStatus | 'all';
  setReportStatus: (status: MessageReportStatus | 'all') => void;
  handleExportReports: () => void;
  refreshReports: () => Promise<void>;
  busyReportId: string | null;
  handleUpdateReportStatus: (report: MessageReport, status: Exclude<MessageReportStatus, 'pending'>) => Promise<void>;
  t: any;
};

export function AdminReportsTab({
  reports,
  isReportsLoading,
  reportStatus,
  setReportStatus,
  handleExportReports,
  refreshReports,
  busyReportId,
  handleUpdateReportStatus,
  t
}: Props) {
  const reportsContent = useMemo(() => {
    if (isReportsLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <article className="message-report-row" key={`skeleton-${i}`}>
          <div className="message-report-main">
            <div className="message-report-topline">
              <div className="skeleton skeleton-text" style={{ width: '80px', height: '20px', borderRadius: '10px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '100px', height: '12px' }}></div>
            </div>
            <div className="skeleton skeleton-text" style={{ width: '120px', height: '16px', margin: '8px 0' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '100%', height: '16px', marginBottom: '8px' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '80%', height: '16px' }}></div>
          </div>
          <div className="message-report-actions">
            <div className="skeleton skeleton-text" style={{ width: '80px', height: '32px', borderRadius: '6px' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '80px', height: '32px', borderRadius: '6px' }}></div>
          </div>
        </article>
      ))
    }

    if (reports.length === 0) {
      return (
        <div className="admin-empty-row">
          {reportStatus === 'pending' ? t('noPendingReports') : t('noMatchingReports')}
        </div>
      )
    }

    return reports.map((report) => (
      <article className="message-report-row" key={report.id}>
        <div className="message-report-main">
          <div className="message-report-topline">
            <span className={`report-status-badge status-${report.status}`}>
              {getReportStatusLabel(report.status, t)}
            </span>
            <small>{formatReportTime(report.createdAt, t)}</small>
          </div>
          <strong>{report.reportedUser.name}</strong>
          <p>{report.messageText || `[${report.messageType}]`}</p>
          <small>
            {t('reportedBy', { reporter: report.reporter.name, conversation: report.conversationName })}
          </small>
        </div>
        <div className="message-report-actions">
          <button
            disabled={busyReportId === report.id || report.status === 'reviewed'}
            onClick={() => void handleUpdateReportStatus(report, 'reviewed')}
            type="button"
          >
            {busyReportId === report.id ? <Loader2 size={15} /> : <CheckCircle2 size={15} />}
            {t('actionReview')}
          </button>
          <button
            disabled={busyReportId === report.id || report.status === 'dismissed'}
            onClick={() => void handleUpdateReportStatus(report, 'dismissed')}
            type="button"
          >
            <XCircle size={15} />
            {t('actionDismiss')}
          </button>
        </div>
      </article>
    ))
  }, [busyReportId, isReportsLoading, reportStatus, reports, t, handleUpdateReportStatus])

  return (
    <div className="admin-content-section message-report-section">
      <div className="section-header">
        <h2>
          <Flag size={18} />
          {t('messageReportsSection')}
        </h2>
        <div className="report-toolbar">
          <select
            value={reportStatus}
            onChange={(event) => setReportStatus(event.target.value as MessageReportStatus | 'all')}
          >
            <option value="pending">{t('filterPending')}</option>
            <option value="reviewed">{t('filterReviewed')}</option>
            <option value="dismissed">{t('filterDismissed')}</option>
            <option value="all">{t('filterAll')}</option>
          </select>
          <button className="btn-secondary" disabled={isReportsLoading} onClick={handleExportReports} type="button" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-hover)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text)', cursor: 'pointer' }}>
            <Download size={15} />
            {t('exportCSVBtn')}
          </button>
          <button disabled={isReportsLoading} onClick={() => void refreshReports()} type="button">
            {isReportsLoading ? <Loader2 size={15} /> : <Flag size={15} />}
            {t('refreshBtn')}
          </button>
        </div>
      </div>
      <div className="message-report-list">
        {reportsContent}
      </div>
    </div>
  )
}
