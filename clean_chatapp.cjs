const fs = require('fs');
let c = fs.readFileSync('src/components/views/ChatApp.tsx', 'utf8');

c = c.replace(/useQuery,\s*/, '');
c = c.replace(/const queryClient = useQueryClient\(\)\r?\n/, '');
c = c.replace(/import \{\r?\n\s*fetchFriends,\r?\n\s*fetchIncomingRequests,\r?\n\} from '\.\.\/\.\.\/services\/api\/contactApi'\r?\n/, '');

fs.writeFileSync('src/components/views/ChatApp.tsx', c);
console.log('Success');
