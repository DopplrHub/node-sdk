import { DopplerHub } from '../src/index.js';

const api = new DopplerHub('YOUR_API_KEY', {
  baseUrl: 'http://localhost:3001/api/v1',
});

const rates = await api.utilities.currencyRates('USD');
console.log(Object.entries(rates.rates).slice(0, 5));

await (await api.tools.ocr('./input.pdf', 'ocr-docx', { language: 'eng' }))
  .wait()
  .then((job) => job.download('./input.docx'));

await (await api.tools.pdf('./input.pdf', 'compress', { level: 'screen' }))
  .wait()
  .then((job) => job.download('./input-compressed.pdf'));

await (await api.tools.image('./image.png', 'resize', {
  width: 1920,
  height: 1080,
  fit: 'cover',
  outputFormat: 'webp',
}))
  .wait()
  .then((job) => job.download('./image.webp'));

await (await api.tools.video('./clip.mp4', 'trim', {
  startTime: '00:00:03',
  endTime: '00:00:12',
  outputFormat: 'mp4',
}))
  .wait()
  .then((job) => job.download('./clip-trimmed.mp4'));

await api.tools.ada('./brochure.pdf')
  .then((report) => report.download('./brochure-ada-report.pdf'));

await api.tools.ats('./resume.pdf', 'Senior Node.js engineer with API design experience', {
  industry: 'technology',
}).then((result) => result.download('./resume-optimized.docx'));