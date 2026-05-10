import { DopplerHub } from '../src/index.js';

const api = new DopplerHub('YOUR_API_KEY', {
  baseUrl: 'http://localhost:3001/api/v1',
});

const job = await api.tools.ocr('./scan.pdf', 'ocr-docx', { language: 'eng' });
await job.wait();
await job.download('./scan.docx');
