import { DopplrHub  } from '../src/index.js';

const api = new DopplrHub ('YOUR_API_KEY', {
  baseUrl: 'https://api.dopplrhub.com/api/v1',
});

await (await api.startFromURL('https://example.com/sample.pdf', 'png'))
  .wait()
  .then((job) => job.download('./sample.png'))
  .then((job) => job.delete());

const ocrJob = await api.tools.ocr('https://example.com/scanned-contract.pdf', 'ocr-docx', {
  language: 'eng',
});
await ocrJob.wait();
await ocrJob.download('./scanned-contract.docx');
await ocrJob.delete();

await api.tools
  .ats(
    'https://example.com/resume.pdf',
    'Senior Node.js engineer with API design and automation experience',
    { industry: 'technology' },
  )
  .then((result) => result.download('./resume-optimized.docx'));