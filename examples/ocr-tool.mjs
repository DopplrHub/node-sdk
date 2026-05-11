import { DopplrHub  } from '../src/index.js';

const api = new DopplrHub ('YOUR_API_KEY', {
  baseUrl: 'https://api.dopplrhub.com/api/v1',
});

const job = await api.tools.ocr('./scan.pdf', 'ocr-docx', { language: 'eng' });
await job.wait();
await job.download('./scan.docx');
