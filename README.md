# DopplrHub Node SDK

A Node.js SDK for the current DopplrHub public API, including generic conversions, tools, and utility endpoints.

## Install

```bash
npm install @dopplr-hub/sdk
```

For this local scaffold:

```bash
cd D:\AudioConverter\sdk\node
```

## Local file conversion

The starter sample in `examples/convert-local-file.mjs` now covers both a basic conversion flow and tool usage, including a queued PDF tool job and an immediate ADA analysis download.

```js
import { DopplrHub } from '@dopplr-hub/sdk';

const api = new DopplrHub('YOUR_API_KEY', {
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

const pdfJob = await api.tools.pdfCompress('./packet.pdf', 'screen');
await pdfJob.wait();
await pdfJob.download('./packet-compressed.pdf');

const imageJob = await api.tools.imageResize('./hero.png', {
  width: 1920,
  height: 1080,
  fit: 'cover',
  outputFormat: 'webp',
});
await imageJob.wait();
await imageJob.download('./hero.webp');

const videoJob = await api.tools.videoTrim('./clip.mp4', {
  startTime: 3,
  endTime: 12,
  outputFormat: 'mp4',
});
await videoJob.wait();
await videoJob.download('./clip-trimmed.mp4');

const archiveJob = await api.tools.archive(['./a.txt', './b.txt'], 'zip', { archiveName: 'documents' });
await archiveJob.wait();
await archiveJob.download('./documents.zip');

const socialJob = await api.tools.socialResize('./hero.png', 'instagram', ['post-square', 'story'], {
  outputFormat: 'jpg',
});
await socialJob.wait();
await socialJob.download('./hero-instagram.zip');

await api.tools.ada('./brochure.pdf').then((report) => report.download('./brochure-ada-report.pdf'));

const atsResult = await api.tools.ats('./resume.pdf', 'Senior Node.js engineer with API design experience', {
  industry: 'technology',
});
await atsResult.download('./resume-optimized.docx');

const reexported = await api.tools.atsReexport(report, 'modern', { downloadAs: 'resume-modern.docx' });
await reexported.download('./resume-modern.docx');
```

Tool coverage in the Node SDK:

- `api.tools.ocr()` for scanned-document OCR output jobs
- `api.tools.pdf()` / `api.tools.pdfMerge()` / `api.tools.pdfSplit()` / `api.tools.pdfCompress()` / `api.tools.pdfRotate()` / `api.tools.pdfProtect()` / `api.tools.pdfUnlock()` / `api.tools.pdfFlatten()` / `api.tools.pdfResize()` / `api.tools.pdfCrop()` / `api.tools.pdfOrganize()` / `api.tools.pdfExtractImages()` / `api.tools.pdfRemovePages()` / `api.tools.pdfExtractPages()` for PDF workflows
- `api.tools.image()` / `api.tools.imageResize()` / `api.tools.imageCrop()` / `api.tools.imageRotate()` / `api.tools.imageFlip()` / `api.tools.imageUpscale()` for image operations
- `api.tools.video()` / `api.tools.videoTrim()` / `api.tools.videoExtract()` / `api.tools.videoCrop()` for video workflows
- `api.tools.archive()` for creating ZIP, 7Z, TAR, TGZ, and TBZ2 archives from multiple uploaded files
- `api.tools.socialResize()` for resizing images into platform-specific dimensions (Facebook, Instagram, Twitter, TikTok, WhatsApp, LinkedIn, YouTube, Pinterest); returns a ZIP when multiple sizes are selected
- `api.tools.ada()` for accessibility analysis with downloadable PDF reports
- `api.tools.ats()` for resume scoring and optimized DOCX export
- `api.tools.atsReexport()` for re-exporting a previous ATS result with a different template

## Utilities

```js
const formats = await api.utilities.supportedFormats();
const rates = await api.utilities.currencyRates('USD');
await api.utilities.batchDownload(['JOB_ID_1', 'JOB_ID_2'], './converted_files.zip');
```

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

`startFromURL()` currently downloads the remote resource first, then uploads it into DopplrHub.
It does not perform headless browser webpage rendering.
