import { DopplrHub } from '../src/index.js';

const api = new DopplrHub('YOUR_API_KEY', {
  baseUrl: 'https://api.dopplrhub.com/api/v1',
});

await (await api.start('./input.pdf', 'jpg'))
  .wait()
  .then((job) => job.download('./input.jpg'))
  .then((job) => job.delete());

const pdfJob = await api.tools.pdfCompress('./packet.pdf', 'screen');
await pdfJob.wait();
await pdfJob.download('./packet-compressed.pdf');
await pdfJob.delete();

await api.tools
  .ada('./brochure.pdf')
  .then((report) => report.download('./brochure-ada-report.pdf'));