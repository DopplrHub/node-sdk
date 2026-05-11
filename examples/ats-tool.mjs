import { DopplrHub } from '../src/index.js';

const api = new DopplrHub('YOUR_API_KEY', {
  baseUrl: 'https://api.dopplrhub.com/api/v1',
});

const result = await api.tools.ats(
  './resume.pdf',
  'Senior Node.js engineer with API design experience',
  { industry: 'technology' },
);
await result.download('./resume-optimized.docx');
