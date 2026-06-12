import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { OssService } from '../aliyun/oss/oss.service';

const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_PATH_PREFIXES = ['avatar', 'product', 'tenant', 'portal', 'miniapp', 'image'];
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.xls',
  '.xlsx',
  '.dwg',
  '.zip',
]);

@Injectable()
export class UploadService {
  @Inject(OssService)
  private ossService: OssService;
  /**
   * 上传
   */
  async upload(file: Express.Multer.File, uploadPath = 'image') {
    this.validateFile(file);
    const safePath = this.normalizeUploadPath(uploadPath);
    const ossUrl = await this.ossService.putOssFile(
      this.buildOssKey(file.originalname, safePath),
      file.buffer,
    );

    return {
      url: ossUrl,
    };
  }
  /**
   * 多文件上传
   */
  async uploadMultiple(files: Array<Express.Multer.File>, uploadPath = 'image') {
    files.forEach((file) => this.validateFile(file));
    const safePath = this.normalizeUploadPath(uploadPath);

    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const ossUrl = await this.ossService.putOssFile(
            this.buildOssKey(file.originalname, safePath),
            file.buffer,
          );
          return {
            filename: file.originalname,
            url: ossUrl,
            success: true,
          };
        } catch (error) {
          return {
            filename: file.originalname,
            error: error.message,
            success: false,
          };
        }
      }),
    );
    return results;
  }

  private buildOssKey(originalName: string, uploadPath = 'image') {
    const safePath = this.normalizeUploadPath(uploadPath);
    const safeName = this.normalizeFilename(originalName);
    const timestamp = Date.now();
    return `/${safePath}/${timestamp}-${safeName}`;
  }

  private normalizeUploadPath(uploadPath = 'image') {
    const rawPath = String(uploadPath || 'image').trim();
    if (!rawPath) return 'image';

    if (
      rawPath.startsWith('/') ||
      rawPath.includes('\\') ||
      rawPath.includes('//') ||
      rawPath.split('/').some((segment) => segment === '.' || segment === '..') ||
      !/^[a-zA-Z0-9/_-]+$/.test(rawPath)
    ) {
      throw new BadRequestException('上传目录不允许');
    }

    const path = rawPath.replace(/\/+$/g, '');

    const root = path.split('/')[0] || 'image';
    if (!ALLOWED_UPLOAD_PATH_PREFIXES.includes(root)) {
      throw new BadRequestException('上传目录不允许');
    }

    return path || 'image';
  }

  private normalizeFilename(filename: string) {
    const name = String(filename || 'file')
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '');

    return name || 'file';
  }

  private validateFile(file: Express.Multer.File) {
    if (!file?.buffer || !file.originalname) {
      throw new BadRequestException('上传文件无效');
    }
    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      throw new BadRequestException('文件大小不能超过 5MB');
    }

    const filename = this.normalizeFilename(file.originalname);
    const extension = filename.includes('.') ? `.${filename.split('.').pop()?.toLowerCase()}` : '';
    if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
      throw new BadRequestException('文件扩展名不允许');
    }
  }
}
