import { DopplrHub } from '../src/index.js';

const api = new DopplrHub('YOUR_API_KEY', {
  baseUrl: 'https://api.dopplrhub.com/api/v1',
});

const job = await api.tools.videoTrim('./clip.mp4', {
  startTime: 3,
  endTime: 12,
  outputFormat: 'mp4',
});
await job.wait();
await job.download('./clip-trimmed.mp4');
