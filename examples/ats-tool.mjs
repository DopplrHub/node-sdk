import { DopplerHub } from '../src/index.js';

const api = new DopplerHub('YOUR_API_KEY', {
  baseUrl: 'http://localhost:3001/api/v1',
});

const result = await api.tools.ats(
  './resume.pdf',
  'Senior Node.js engineer with API design experience',
  { industry: 'technology' },
);
await result.download('./resume-optimized.docx');
