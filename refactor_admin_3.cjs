const fs = require('fs');

// 1. Fix formatChartLabel
const adminChartsPath = 'src/components/views/admin/AdminCharts.tsx';
let chartsContent = fs.readFileSync(adminChartsPath, 'utf8');

const formatChartLabelRegex = /export function formatChartLabel[\s\S]*?^}/m;
const formatChartLabelMatch = chartsContent.match(formatChartLabelRegex);

if (formatChartLabelMatch) {
  const formatChartLabelCode = formatChartLabelMatch[0];
  chartsContent = chartsContent.replace(formatChartLabelCode, '');
  chartsContent = chartsContent.replace(/import \{ formatNumber \} from '\.\/AdminUtils';/, `import { formatNumber, formatChartLabel } from './AdminUtils';`);
  fs.writeFileSync(adminChartsPath, chartsContent);
  
  const adminUtilsPath = 'src/components/views/admin/AdminUtils.ts';
  let utilsContent = fs.readFileSync(adminUtilsPath, 'utf8');
  utilsContent += '\n\n' + formatChartLabelCode + '\n';
  fs.writeFileSync(adminUtilsPath, utilsContent);
}

// 2. Extract AdminDashboardTab
const adminPagePath = 'src/components/views/AdminPage.tsx';
let content = fs.readFileSync(adminPagePath, 'utf8');

const dashboardRegex = /(<div className="admin-dashboard-cards">[\s\S]*?)<ModerationPanel/m;
const dashboardMatch = content.match(dashboardRegex);

if (dashboardMatch) {
  const dashboardJSX = dashboardMatch[1];
  
  const dashboardComponent = `import { Activity, AlertCircle, Users, BarChart3, MessageSquare, PieChart } from 'lucide-react';
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
      ${dashboardJSX.trim()}
    </>
  );
}
`;
  
  fs.writeFileSync('src/components/views/admin/AdminDashboardTab.tsx', dashboardComponent);
  
  content = content.replace(dashboardJSX, `<AdminDashboardTab stats={stats} isStatsLoading={isStatsLoading} t={t} />\n\n      `);
  
  // Clean up unused imports in AdminPage.tsx
  content = content.replace(/import \{ TrendLineChart, DistributionChart \} from '\.\/admin\/AdminCharts';\n/, '');
  
  // Add AdminDashboardTab import
  content = `import { AdminDashboardTab } from './admin/AdminDashboardTab';\n` + content;
  
  fs.writeFileSync(adminPagePath, content);
  console.log('AdminDashboardTab created.');
}
