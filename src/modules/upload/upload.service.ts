import { Inject, Injectable } from '@nestjs/common';

import { OssService } from '../aliyun/oss/oss.service';

@Injectable()
export class UploadService {
  @Inject(OssService)
  private ossService: OssService;
  /**
   * 上传
   */
  async upload(file) {
    console.log('file=======', file);
    const ossUrl = await this.ossService.putOssFile(
      `/image/${file.originalname}`,
      file.buffer,
    );
    console.log('ossUrl=======', ossUrl);

    return {
      url: ossUrl,
    };
  }
  /**
   * 多文件上传
   */
  async uploadMultiple(files: Array<Express.Multer.File>) {
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const ossUrl = await this.ossService.putOssFile(
            `/image/${file.originalname}`,
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
    console.log('TCL: UploadService -> uploadMultiple -> results', results);
    return results;
  }
}
