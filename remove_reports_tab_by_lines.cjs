const fs = require('fs');

const adminPagePath = 'src/components/views/AdminPage.tsx';
let lines = fs.readFileSync(adminPagePath, 'utf8').split('\n');

// Remove 1005-1034 (0-indexed: 1004 to 1033)
// Wait, the line numbers might have changed! Let's check them.
// Let's do a reliable string search in the array of lines.
const line1005 = '      <div className="admin-content-section message-report-section">';
const uiStart = lines.findIndex(l => l.includes('className="admin-content-section message-report-section"'));

let uiEnd = -1;
if (uiStart !== -1) {
  for (let i = uiStart + 1; i < lines.length; i++) {
    if (lines[i].includes('      </div>') && lines[i - 1].includes('        </div>')) {
      if (lines[i - 2].includes('{reportsContent}')) {
        uiEnd = i;
        break;
      }
    }
  }
}

const rContentStart = lines.findIndex(l => l.includes('const reportsContent = useMemo('));
let rContentEnd = -1;
if (rContentStart !== -1) {
  for (let i = rContentStart; i < lines.length; i++) {
    if (lines[i].includes('}, [busyReportId, isReportsLoading, reportStatus, reports])')) {
      rContentEnd = i;
      break;
    }
  }
}

if (uiStart !== -1 && uiEnd !== -1 && rContentStart !== -1 && rContentEnd !== -1) {
  console.log(`Found reportsContent: ${rContentStart}-${rContentEnd}`);
  console.log(`Found ui: ${uiStart}-${uiEnd}`);
  
  // Splice backwards so indices don't shift
  lines.splice(uiStart, uiEnd - uiStart + 1, `      <AdminReportsTab 
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
      
  lines.splice(rContentStart, rContentEnd - rContentStart + 1);
  
  let newContent = `import { AdminReportsTab } from './admin/AdminReportsTab';\n` + lines.join('\n');
  fs.writeFileSync(adminPagePath, newContent);
  console.log('Removed reports tab successfully.');
} else {
  console.log('Could not find boundaries.', {uiStart, uiEnd, rContentStart, rContentEnd});
}
