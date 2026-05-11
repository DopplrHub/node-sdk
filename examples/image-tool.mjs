import { DopplrHub  } from '../src/index.js';

const api = new DopplrHub ('YOUR_API_KEY', {
  baseUrl: 'https://api.dopplrhub.com/api/v1',
});

const job = await api.tools.imageResize('./hero.png', {
  width: 1920,
  height: 1080,
  fit: 'cover',
  outputFormat: 'webp',
});
await job.wait();
await job.download('./hero.webp');
