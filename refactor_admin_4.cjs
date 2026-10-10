const fs = require('fs');

const adminPagePath = 'src/components/views/AdminPage.tsx';
let content = fs.readFileSync(adminPagePath, 'utf8');

const reportsContentRegex = /const reportsContent = useMemo\(\(\) => \{[\s\S]*?\}, \[busyReportId, isReportsLoading, reportStatus, reports\]\)\n/m;
const reportsContentMatch = content.match(reportsContentRegex);

const reportsUIRegex = /<div className="admin-content-section message-report-section">[\s\S]*?<div className="message-report-list">\s*\{reportsContent\}\s*<\/div>\s*<\/div>/m;
const reportsUIMatch = content.match(reportsUIRegex);

if (reportsContentMatch && reportsUIMatch) {
  const reportsContentJSX = reportsContentMatch[0];
  const reportsUIJSX = reportsUIMatch[0];

  const adminReportsTabComponent = `import { useMemo } from 'react';
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
  handleUpdateReportStatus: (report: MessageReport, status: MessageReportStatus) => Promise<void>;
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
  ${reportsContentJSX}

  return (
    ${reportsUIJSX.replace(/\{reportsContent\}/, '{reportsContent}')}
  );
}
`;

  fs.writeFileSync('src/components/views/admin/AdminReportsTab.tsx', adminReportsTabComponent);

  content = content.replace(reportsContentJSX, '');
  content = content.replace(reportsUIJSX, `<AdminReportsTab 
        reports={reports}
        isReportsLoading={isReportsLoading}
        reportStatus={reportStatus}
        setReportStatus={setReportStatus}
        handleExportReports={handleExportReports}
        refreshReports={refreshReports}
        busyReportId={busyReportId}
        handleUpdateReportStatus={handleUpdateReportStatus}
        t={t}
      />`);

  // add import 
  content = `import { AdminReportsTab } from './admin/AdminReportsTab';\n` + content;
  fs.writeFileSync(adminPagePath, content);
  console.log('AdminReportsTab created.');
}
