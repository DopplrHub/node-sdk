# DopplrHub  Node SDK

A Node.js SDK for the current DopplrHub  public API, including generic conversions, tools, and utility endpoints.

## Install

```bash
npm install @dopplrhub/sdk
```

For this local scaffold:

```bash
cd D:\AudioConverter\sdk\node
```

## Local file conversion

The starter sample in `examples/convert-local-file.mjs` now covers both a basic conversion flow and tool usage, including a queued PDF tool job and an immediate ADA analysis download.

```js
import { DopplrHub  } from '@dopplrhub/sdk';

const api = new DopplrHub ('YOUR_API_KEY', {
  baseUrl: 'https://api.dopplrhub.com/api/v1',
});

await (await api.start('./input.pdf', 'jpg'))
  .wait()
  .then((job) => job.download('./input.jpg'))
  .then((job) => job.delete());
```

## Remote file conversion

The starter sample in `examples/convert-remote-file.mjs` now covers both remote-file conversion and remote tool usage, including OCR and ATS flows against hosted documents.

```js
await (await api.startFromURL('https://example.com/sample.pdf', 'png'))
  .wait()
  .then((job) => job.download('./sample.png'))
  .then((job) => job.delete());
```

## Tools

```js
const ocrJob = await api.tools.ocr('./scan.pdf', 'ocr-docx', { language: 'eng' });
await ocrJob.wait();
await ocrJob.download('./scan.docx');

const pdfJob = await api.tools.pdf('./packet.pdf', 'compress', { level: 'screen' });
await pdfJob.wait();
await pdfJob.download('./packet-compressed.pdf');

const imageJob = await api.tools.image('./hero.png', 'resize', {
  width: 1920,
  height: 1080,
  fit: 'cover',
  outputFormat: 'webp',
});
await imageJob.wait();
await imageJob.download('./hero.webp');

const videoJob = await api.tools.video('./clip.mp4', 'trim', {
  startTime: '00:00:03',
  endTime: '00:00:12',
  outputFormat: 'mp4',
});
await videoJob.wait();
await videoJob.download('./clip-trimmed.mp4');

await api.tools.ada('./brochure.pdf').then((report) => report.download('./brochure-ada-report.pdf'));

await api.tools
  .ats('./resume.pdf', 'Senior Node.js engineer with API design experience', {
    industry: 'technology',
  })
  .then((result) => result.download('./resume-optimized.docx'));

const rates = await api.utilities.currencyRates('USD');
```

Tool coverage in the Node SDK:

- `api.tools.ocr()` for scanned-document OCR output jobs
- `api.tools.pdf()` for merge, split, compress, protect, unlock, rotate, watermark, and related PDF workflows
- `api.tools.image()` for resize, crop, rotate, flip, optimize, and format-conversion operations
- `api.tools.video()` for trim, crop, and clip-oriented video workflows
- `api.tools.ada()` for accessibility analysis with downloadable PDF reports
- `api.tools.ats()` for resume scoring and optimized DOCX export

## Examples

- `examples/convert-local-file.mjs`
- `examples/convert-remote-file.mjs`
- `examples/ocr-tool.mjs`
- `examples/pdf-tool.mjs`
- `examples/image-tool.mjs`
- `examples/video-tool.mjs`
- `examples/ada-tool.mjs`
- `examples/ats-tool.mjs`
- `examples/tools-and-utilities.mjs`

## Important behavior note

`startFromURL()` currently downloads the remote resource first, then uploads it into DopplrHub .
It does not perform headless browser webpage rendering.
