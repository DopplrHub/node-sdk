import { DopplerHub } from '../src/index.js';

const api = new DopplerHub('YOUR_API_KEY', {
  baseUrl: 'https://api.dopplrhub.com/api/v1',
});

const job = await api.tools.pdfCompress('./packet.pdf', 'screen');
await job.wait();
await job.download('./packet-compressed.pdf');
