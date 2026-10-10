const { Project } = require('ts-morph');
const fs = require('fs');

async function main() {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath('src/components/views/AdminPage.tsx');

  const adminUtilsCode = [];
  const adminChartsCode = [];

  // Functions to move to AdminUtils.ts
  const utilsFns = [
    'getErrorMessage',
    'formatNumber',
    'formatLastLogin',
    'formatReportTime',
    'getReportStatusLabel',
    'getStatusLabel',
    'getGenderLabel',
    'getRoleLabel',
    'getUserStatusFilterLabel',
    'getGenderFilterLabel'
  ];

  utilsFns.forEach(name => {
    const fn = sourceFile.getFunction(name);
    if (fn) {
      adminUtilsCode.push('export ' + fn.getText());
      fn.remove();
    }
  });

  // Functions to move to AdminCharts.tsx
  const chartFns = [
    'formatChartLabel',
    'TrendLineChart',
    'DistributionChart'
  ];

  chartFns.forEach(name => {
    const fn = sourceFile.getFunction(name);
    if (fn) {
      adminChartsCode.push('export ' + fn.getText());
      fn.remove();
    }
  });

  // Save changes
  await sourceFile.save();

  // Write AdminUtils.ts
  fs.writeFileSync('src/components/views/admin/AdminUtils.ts', 
`import { AdminUserRole, AdminUserStatus, MessageReportStatus } from '../../../services/api/adminApi';

${adminUtilsCode.join('\n\n')}
`);

  // Write AdminCharts.tsx
  fs.writeFileSync('src/components/views/admin/AdminCharts.tsx', 
`import { Area, AreaChart, Cell, Legend, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AdminChartPoint } from '../../../services/api/adminApi';
import { formatNumber } from './AdminUtils';

${adminChartsCode.join('\n\n')}
`);

  console.log('Successfully extracted utils and charts.');
}

main().catch(console.error);
