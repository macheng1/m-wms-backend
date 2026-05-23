import { Inject, Injectable } from '@nestjs/common';

import { OssService } from '../aliyun/oss/oss.service';

@Injectable()
export class UploadService {
  @Inject(OssService)
  private ossService: OssService;
  /**
   * 上传
   */
  async upload(file, uploadPath = 'image') {
    console.log('file=======', file);
    const ossUrl = await this.ossService.putOssFile(this.buildOssKey(file.originalname, uploadPath), file.buffer);
    console.log('ossUrl=======', ossUrl);

    return {
      url: ossUrl,
    };
  }
  /**
   * 多文件上传
   */
  async uploadMultiple(files: Array<Express.Multer.File>, uploadPath = 'image') {
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const ossUrl = await this.ossService.putOssFile(this.buildOssKey(file.originalname, uploadPath), file.buffer);
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
    console.log('TCL: UploadService -> uploadMultiple -> results', results);
    return results;
  }

  private buildOssKey(originalName: string, uploadPath = 'image') {
    const safePath = this.normalizeUploadPath(uploadPath);
    const safeName = this.normalizeFilename(originalName);
    const timestamp = Date.now();
    return `/${safePath}/${timestamp}-${safeName}`;
  }

  private normalizeUploadPath(uploadPath = 'image') {
    const path = String(uploadPath || 'image')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\.\./g, '')
      .replace(/[^a-zA-Z0-9/_-]/g, '');

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
}
