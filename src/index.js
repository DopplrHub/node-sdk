import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export class DopplrHubError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'DopplrHubError';
    this.status = status;
  }
}

export class UploadedFile {
  constructor(payload) {
    this.payload = payload;
  }

  get fileId() {
    return String(this.payload.fileId || '');
  }

  get inputKey() {
    return String(this.payload.inputKey || '');
  }

  get fileName() {
    return String(this.payload.fileName || 'input.bin');
  }

  get fileSize() {
    return this.payload.fileSize ?? null;
  }

  toJSON() {
    return { ...this.payload };
  }
}

class BaseResult {
  constructor(client, payload) {
    this.client = client;
    this.payload = payload;
  }

  toJSON() {
    return { ...this.payload };
  }
}

export class ConversionJob extends BaseResult {
  get jobId() {
    return String(this.payload.jobId || '');
  }

  get state() {
    return String(this.payload.state || this.payload.status || 'queued');
  }

  async refresh() {
    this.payload = {
      ...this.payload,
      ...(await this.client.getJob(this.jobId)),
    };
    return this;
  }

  async wait(timeoutSeconds = 900, pollSeconds = 2) {
    const deadline = Date.now() + Math.max(timeoutSeconds, 1) * 1000;

    while (Date.now() <= deadline) {
      await this.refresh();
      const state = this.state.toLowerCase();

      if (state === 'completed') return this;
      if (state === 'failed') {
        throw new DopplrHubError(String(this.payload.failedReason || 'Conversion failed.'));
      }

      await new Promise((resolve) => setTimeout(resolve, Math.max(pollSeconds, 1) * 1000));
    }

    throw new DopplrHubError(`Timed out waiting for conversion job ${this.jobId}`);
  }

  async download(targetPath = null) {
    if (this.state.toLowerCase() !== 'completed') {
      await this.refresh();
    }

    if (this.state.toLowerCase() !== 'completed') {
      throw new DopplrHubError(`Job ${this.jobId} is not completed.`);
    }

    const downloadUrl = String(this.payload.downloadUrl || '');
    if (!downloadUrl) {
      throw new DopplrHubError('Completed job did not include a downloadUrl.');
    }

    await this.client.downloadFile(downloadUrl, targetPath || this.#defaultDownloadPath());
    return this;
  }

  async delete() {
    await this.client.deleteJob(this.jobId);
    return this;
  }

  #defaultDownloadPath() {
    if (this.payload.outputKey) {
      return path.join('.', path.basename(String(this.payload.outputKey)));
    }

    const originalName = String(this.payload.originalName || 'output');
    const baseName = path.parse(originalName).name || 'output';
    const extension = this.client.extensionFromPayload(this.payload);
    return path.join('.', `${baseName}.${extension}`);
  }
}

export class ImmediateResult extends BaseResult {
  constructor(client, payload, downloadUrlField, downloadKeyField = null, defaultFileName = null) {
    super(client, payload);
    this.downloadUrlField = downloadUrlField;
    this.downloadKeyField = downloadKeyField;
    this.defaultFileName = defaultFileName;
  }

  async download(targetPath = null) {
    const downloadUrl = String(this.payload[this.downloadUrlField] || '');
    if (!downloadUrl) {
      throw new DopplrHubError('Response did not include a download URL.');
    }

    await this.client.downloadFile(downloadUrl, targetPath || this.#defaultDownloadPath());
    return this;
  }

  #defaultDownloadPath() {
    if (this.downloadKeyField && this.payload[this.downloadKeyField]) {
      return path.join('.', path.basename(String(this.payload[this.downloadKeyField])));
    }

    if (this.defaultFileName) {
      return path.join('.', this.defaultFileName);
    }

    const originalName = String(this.payload.originalName || 'download');
    return path.join('.', `${path.parse(originalName).name || 'download'}.bin`);
  }
}

export class UtilitiesClient {
  constructor(client) {
    this.client = client;
  }

  supportedFormats() {
    return this.client.requestJson('GET', '/upload/formats');
  }

  currencyRates(base = 'USD') {
    return this.client.requestJson('GET', `/tools/units/currency-rates?base=${encodeURIComponent(base.toUpperCase())}`);
  }

  async batchDownload(jobIds, targetPath) {
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      throw new DopplrHubError('jobIds must be a non-empty array.');
    }

    const response = await this.client.request('POST', '/jobs/batch-download', {
      headers: { Accept: 'application/zip' },
      json: { jobIds },
    });

    await this.client.ensureSuccess(response);
    await writeBinaryFile(targetPath, Buffer.from(await response.arrayBuffer()));
    return targetPath;
  }
}

export class ToolsClient {
  constructor(client) {
    this.client = client;
  }

  pdfMerge(sources, options = {}) {
    return this.pdf(sources, 'merge', options.params || {}, options);
  }

  pdfSplit(source, ranges = '', options = {}) {
    return this.pdf(source, 'split', { ranges }, options);
  }

  pdfCompress(source, quality = 'medium', options = {}) {
    return this.pdf(source, 'compress', { quality }, options);
  }

  pdfRotate(source, degrees = 90, pages = 'all', options = {}) {
    return this.pdf(source, 'rotate', { degrees, pages }, options);
  }

  pdfProtect(source, userPassword, options = {}) {
    return this.pdf(source, 'protect', {
      userPassword,
      ownerPassword: options.ownerPassword || '',
    }, options);
  }

  pdfUnlock(source, password, options = {}) {
    return this.pdf(source, 'unlock', { password }, options);
  }

  pdfFlatten(source, options = {}) {
    return this.pdf(source, 'flatten', {}, options);
  }

  pdfResize(source, params = {}, options = {}) {
    return this.pdf(source, 'resize', { width: params.width, height: params.height }, options);
  }

  pdfCrop(source, params = {}, options = {}) {
    return this.pdf(source, 'crop', {
      left: params.left || 0,
      top: params.top || 0,
      width: params.width,
      height: params.height,
    }, options);
  }

  pdfOrganize(source, pages = '', options = {}) {
    return this.pdf(source, 'organize', { pages }, options);
  }

  pdfExtractImages(source, options = {}) {
    return this.pdf(source, 'extract-images', {}, options);
  }

  pdfRemovePages(source, pages = '', options = {}) {
    return this.pdf(source, 'remove-pages', { pages }, options);
  }

  pdfExtractPages(source, ranges = '', options = {}) {
    return this.pdf(source, 'extract-pages', { ranges }, options);
  }

  async socialResize(source, platform, selectedSizeIds, options = {}) {
    const upload = await this.client.normalizeUpload(source, options);
    return this.client.submitJob('/tools/social-resize', {
      fileId: upload.fileId,
      inputKey: upload.inputKey,
      originalName: options.originalName || upload.fileName,
      platform,
      selectedSizeIds,
      outputFormat: options.outputFormat || 'jpg',
      offsets: options.offsets || {},
      fileSizeBytes: options.fileSizeBytes || null,
    });
  }

  imageResize(source, params = {}, options = {}) {
    return this.image(source, 'resize', {
      width: params.width,
      height: params.height,
      fit: params.fit || 'inside',
      outputFormat: params.outputFormat || 'jpg',
    }, options);
  }

  imageCrop(source, params = {}, options = {}) {
    return this.image(source, 'crop', {
      left: params.left || 0,
      top: params.top || 0,
      width: params.width,
      height: params.height,
      outputFormat: params.outputFormat || 'jpg',
    }, options);
  }

  imageRotate(source, angle = 90, options = {}) {
    return this.image(source, 'rotate', {
      angle,
      outputFormat: options.outputFormat || 'jpg',
    }, options);
  }

  imageFlip(source, direction = 'horizontal', options = {}) {
    return this.image(source, 'flip', {
      direction,
      outputFormat: options.outputFormat || 'jpg',
    }, options);
  }

  imageUpscale(source, params = {}, options = {}) {
    return this.image(source, 'upscale', {
      scale: params.scale || 2,
      width: params.width,
      height: params.height,
      outputFormat: params.outputFormat || 'jpg',
    }, options);
  }

  videoTrim(source, params = {}, options = {}) {
    return this.video(source, 'trim', {
      outputFormat: params.outputFormat || 'mp4',
      trim: {
        enabled: true,
        startTime: params.startTime || 0,
        endTime: params.endTime,
      },
    }, options);
  }

  videoExtract(source, params = {}, options = {}) {
    return this.video(source, 'extract', {
      outputFormat: params.outputFormat || 'mp4',
      trim: {
        enabled: true,
        startTime: params.startTime || 0,
        endTime: params.endTime,
      },
    }, options);
  }

  videoCrop(source, params = {}, options = {}) {
    return this.video(source, 'crop', {
      left: params.left || 0,
      top: params.top || 0,
      width: params.width,
      height: params.height,
      outputFormat: params.outputFormat || 'mp4',
    }, options);
  }

  async ocr(source, targetFormat = 'ocr-pdf', options = {}) {
    const upload = await this.client.normalizeUpload(source, options);
    return this.client.submitJob('/tools/ocr', {
      fileId: upload.fileId,
      inputKey: upload.inputKey,
      targetFormat,
      originalName: options.originalName || upload.fileName,
      language: options.language || 'eng',
    });
  }

  async pdf(source, operation, params = {}, options = {}) {
    const payload = { operation, params };

    if (operation === 'merge') {
      const mergeSources = Array.isArray(source) ? source : options.sources;
      if (!Array.isArray(mergeSources) || mergeSources.length === 0) {
        throw new DopplrHubError('PDF merge requires an array of sources.');
      }

      const uploads = await this.client.normalizeUploads(mergeSources);
      payload.fileId = uploads[0].fileId;
      payload.inputKeys = uploads.map((item) => item.inputKey);
      payload.inputKey = payload.inputKeys[0];
      payload.originalName = options.originalName || uploads[0].fileName;
    } else {
      const upload = await this.client.normalizeUpload(source, options);
      payload.fileId = upload.fileId;
      payload.inputKey = upload.inputKey;
      payload.originalName = options.originalName || upload.fileName;
    }

    return this.client.submitJob('/tools/pdf', payload);
  }

  async image(source, operation, params = {}, options = {}) {
    const upload = await this.client.normalizeUpload(source, options);
    return this.client.submitJob('/tools/image', {
      operation,
      fileId: upload.fileId,
      inputKey: upload.inputKey,
      originalName: options.originalName || upload.fileName,
      params,
    });
  }

  async video(source, operation, params = {}, options = {}) {
    const upload = await this.client.normalizeUpload(source, options);
    return this.client.submitJob('/tools/video', {
      operation,
      fileId: upload.fileId,
      inputKey: upload.inputKey,
      originalName: options.originalName || upload.fileName,
      params,
    });
  }

  async archive(sources, targetFormat = 'zip', options = {}) {
    const uploads = await this.client.normalizeUploads(sources);
    return this.client.submitJob('/tools/archive', {
      inputKeys: uploads.map((item) => item.inputKey),
      fileNames: uploads.map((item) => item.fileName),
      targetFormat,
      archiveName: options.archiveName || 'archive',
      inputPassword: options.inputPassword || '',
      outputPassword: options.outputPassword || '',
    });
  }

  async ada(source, options = {}) {
    const upload = await this.client.normalizeUpload(source, options);
    const response = await this.client.requestJson('POST', '/tools/ada/analyze', {
      json: filterNone({
        fileId: upload.fileId,
        inputKey: upload.inputKey,
        originalName: options.originalName || upload.fileName,
        contentType: options.contentType || null,
      }),
    });
    return new ImmediateResult(this.client, response, 'reportDownloadUrl', 'reportKey');
  }

  async ats(source, jobDescription, options = {}) {
    const upload = await this.client.normalizeUpload(source, options);
    const response = await this.client.requestJson('POST', '/tools/ats/analyze', {
      json: filterNone({
        fileId: upload.fileId,
        inputKey: upload.inputKey,
        originalName: options.originalName || upload.fileName,
        contentType: options.contentType || null,
        jobDescription,
        industry: options.industry || null,
        templateId: options.templateId || null,
      }),
    });
    return new ImmediateResult(this.client, response, 'optimizedResumeDownloadUrl', 'optimizedResumeKey');
  }

  async atsReexport(report, templateId, options = {}) {
    const response = await this.client.requestJson('POST', '/tools/ats/reexport', {
      json: filterNone({
        report,
        templateId,
        fileId: options.fileId || null,
        originalName: options.originalName || null,
      }),
    });
    return new ImmediateResult(this.client, response, 'optimizedResumeDownloadUrl', null, options.downloadAs || 'optimized-resume.docx');
  }
}

export class DopplrHub {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl || 'https://api.dopplrhub.com/api/v1').replace(/\/+$/, '');
    this.timeoutMs = (options.timeoutSeconds || 120) * 1000;
    this.tools = new ToolsClient(this);
    this.utilities = new UtilitiesClient(this);
  }

  async upload(filePath) {
    const absolutePath = path.resolve(filePath);
    const buffer = await readFile(absolutePath);
    const form = new FormData();
    form.append('file', new Blob([buffer]), path.basename(absolutePath));
    const response = await this.requestJson('POST', '/upload', { form });
    return new UploadedFile(response);
  }

  async importFromUrl(url, options = {}) {
    const fileName = options.fileName || detectRemoteFileName(url);
    const payload = { url, fileName };
    if (options.contentType) payload.contentType = options.contentType;
    if (options.authHeader) payload.authHeader = options.authHeader;
    return new UploadedFile(await this.requestJson('POST', '/upload/from-url', { json: payload }));
  }

  async start(filePath, targetFormat, options = {}) {
    return this.convert(await this.upload(filePath), targetFormat, options);
  }

  async startFromContents(contents, fileName, targetFormat) {
    const form = new FormData();
    const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
    form.append('file', new Blob([bytes]), fileName);
    const upload = new UploadedFile(await this.requestJson('POST', '/upload', { form }));
    return this.convert(upload, targetFormat, { originalName: fileName });
  }

  async startFromURL(url, targetFormat, options = {}) {
    return this.convert(await this.importFromUrl(url, options), targetFormat, {
      originalName: options.originalName || options.fileName || null,
      mediaType: options.mediaType || null,
      conversionSettings: options.conversionSettings || null,
    });
  }

  async convert(source, targetFormat, options = {}) {
    const upload = await this.normalizeUpload(source, options);
    return this.submitJob('/convert', {
      fileId: upload.fileId,
      inputKey: upload.inputKey,
      targetFormat,
      originalName: options.originalName || upload.fileName,
      mediaType: options.mediaType || null,
      conversionSettings: options.conversionSettings || null,
    });
  }

  getJob(jobId) {
    return this.requestJson('GET', `/jobs/${encodeURIComponent(jobId)}`);
  }

  async deleteJob(jobId) {
    await this.requestJson('DELETE', `/jobs/${encodeURIComponent(jobId)}`);
  }

  async downloadFile(url, targetPath) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new DopplrHubError(`Download failed with HTTP ${response.status}.`, response.status);
    }

    await writeBinaryFile(targetPath, Buffer.from(await response.arrayBuffer()));
    return targetPath;
  }

  extensionFromPayload(payload) {
    const outputKey = String(payload.outputKey || payload.reportKey || payload.optimizedResumeKey || '');
    if (outputKey) {
      const extension = path.extname(outputKey).replace('.', '').toLowerCase();
      if (extension) return extension;
    }

    return this.guessExtension(String(payload.targetFormat || 'bin'));
  }

  guessExtension(targetFormat) {
    const parts = String(targetFormat || '').trim().toLowerCase().split('-');
    return parts.at(-1) || 'bin';
  }

  async normalizeUpload(source, options = {}) {
    if (source instanceof UploadedFile) return source;
    if (source && typeof source === 'object' && source.fileId && source.inputKey) {
      return new UploadedFile(source);
    }
    if (typeof source === 'string' && /^https?:\/\//i.test(source)) {
      return this.importFromUrl(source, options);
    }
    if (typeof source === 'string') {
      return this.upload(source);
    }

    throw new DopplrHubError('Source must be a local file path, remote URL, UploadedFile, or upload response object.');
  }

  async normalizeUploads(sources) {
    if (!Array.isArray(sources) || sources.length === 0) {
      throw new DopplrHubError('At least one source is required.');
    }

    return Promise.all(sources.map((source) => this.normalizeUpload(source)));
  }

  async submitJob(endpoint, payload) {
    const filteredPayload = filterNone(payload);
    const response = await this.requestJson('POST', endpoint, { json: filteredPayload });
    if (!('originalName' in response) && filteredPayload.originalName) {
      response.originalName = filteredPayload.originalName;
    }
    return new ConversionJob(this, response);
  }

  async requestJson(method, requestPath, options = {}) {
    const response = await this.request(method, requestPath, options);
    await this.ensureSuccess(response);

    let data;
    try {
      data = await response.json();
    } catch {
      const text = await response.text();
      throw new DopplrHubError(`Expected JSON response for ${method} ${requestPath}, got: ${text.trim() || '[empty body]'}`);
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new DopplrHubError(`Expected JSON object for ${method} ${requestPath}.`);
    }

    return data;
  }

  request(method, requestPath, options = {}) {
    const url = `${this.baseUrl}/${String(requestPath).replace(/^\/+/, '')}`;
    const headers = new Headers(options.headers || {});
    headers.set('x-api-key', this.apiKey);

    const init = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    };

    if (options.json) {
      headers.set('Content-Type', 'application/json');
      init.body = JSON.stringify(options.json);
    } else if (options.form) {
      init.body = options.form;
      headers.delete('Content-Type');
    }

    return fetch(url, init);
  }

  async ensureSuccess(response) {
    if (response.ok) return;

    let body = null;
    try {
      body = await response.clone().json();
    } catch {
      body = null;
    }

    const message = body && typeof body.error === 'string' ? body.error : `HTTP ${response.status}`;
    throw new DopplrHubError(message, response.status);
  }
}

function filterNone(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== null && value !== undefined));
}

function detectRemoteFileName(url) {
  const parsed = new URL(url);
  const name = path.basename(parsed.pathname);
  return name || 'remote-input.bin';
}

async function writeBinaryFile(targetPath, bytes) {
  const outputPath = path.resolve(targetPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, bytes);
}
