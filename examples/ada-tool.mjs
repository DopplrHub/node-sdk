import { DopplerHub } from '../src/index.js';

const api = new DopplerHub('YOUR_API_KEY', {
  baseUrl: 'http://localhost:3001/api/v1',
});

const report = await api.tools.ada('./brochure.pdf');
await report.download('./brochure-ada-report.pdf');
