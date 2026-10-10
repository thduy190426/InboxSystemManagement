const fs = require('fs');

const adminPagePath = 'src/components/views/AdminPage.tsx';
let content = fs.readFileSync(adminPagePath, 'utf8');

// Find tableContent start and end
const rContentStartStr = '  const reportsContent = useMemo(() => {';
const rContentEndStr = '  }, [busyReportId, isReportsLoading, reportStatus, reports])';

const s1 = content.indexOf(rContentStartStr);
const e1 = content.indexOf(rContentEndStr, s1);

if (s1 !== -1 && e1 !== -1) {
  const reportsContentJSX = content.substring(s1, e1 + rContentEndStr.length) + '\n';
  content = content.replace(reportsContentJSX, '');
}

const uiStartStr = '      <div className="admin-content-section message-report-section">';
const uiEndStr = '        <div className="message-report-list">\n          {reportsContent}\n        </div>\n      </div>';

const s2 = content.indexOf(uiStartStr);
const e2 = content.indexOf(uiEndStr, s2);

if (s2 !== -1 && e2 !== -1) {
  const uiJSX = content.substring(s2, e2 + uiEndStr.length);
  content = content.replace(uiJSX, `<AdminReportsTab 
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
}

content = `import { AdminReportsTab } from './admin/AdminReportsTab';\n` + content;
fs.writeFileSync(adminPagePath, content);
console.log('Removed reports tab.');
