const fs = require('fs');
const { Project } = require('ts-morph');

async function main() {
  const project = new Project();
  
  // Fix AdminUtils.ts
  const utilsFile = project.addSourceFileAtPath('src/components/views/admin/AdminUtils.ts');
  const utilsText = utilsFile.getText();
  
  const newUtilsText = utilsText.replace(
    `import { AdminUserRole, AdminUserStatus, MessageReportStatus } from '../../../services/api/adminApi';`,
    `import type { AdminUserRole, AdminUserStatus, MessageReportStatus } from '../../../services/api/adminApi';\n\nexport const USER_GENDERS = ['all', 'male', 'female', 'other', 'prefer_not_to_say', 'unknown'] as const;\nexport type UserGenderFilter = typeof USER_GENDERS[number];`
  );
  
  utilsFile.replaceWithText(newUtilsText);
  await utilsFile.save();

  // Fix AdminPage.tsx
  const pageFile = project.addSourceFileAtPath('src/components/views/AdminPage.tsx');
  
  // Remove USER_GENDERS definition from AdminPage.tsx
  const gendersDecl = pageFile.getVariableStatement('USER_GENDERS');
  if (gendersDecl) gendersDecl.remove();
  const genderType = pageFile.getTypeAlias('UserGenderFilter');
  if (genderType) genderType.remove();

  // Add imports
  pageFile.addImportDeclaration({
    namedImports: ['TrendLineChart', 'DistributionChart'],
    moduleSpecifier: './admin/AdminCharts'
  });

  pageFile.addImportDeclaration({
    namedImports: [
      'getErrorMessage',
      'formatNumber',
      'formatLastLogin',
      'formatReportTime',
      'getReportStatusLabel',
      'getStatusLabel',
      'getGenderLabel',
      'getRoleLabel',
      'getUserStatusFilterLabel',
      'getGenderFilterLabel',
      'USER_GENDERS',
      { name: 'UserGenderFilter', isTypeOnly: true }
    ],
    moduleSpecifier: './admin/AdminUtils'
  });

  await pageFile.save();

  console.log('Fixed imports.');
}

main().catch(console.error);
