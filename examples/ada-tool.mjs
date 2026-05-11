import { DopplrHub  } from '../src/index.js';

const api = new DopplrHub ('YOUR_API_KEY', {
  baseUrl: 'https://api.dopplrhub.com/api/v1',
});

const report = await api.tools.ada('./brochure.pdf');
await report.download('./brochure-ada-report.pdf');
