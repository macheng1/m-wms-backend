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
      `src/uploadsImg/${file.originalname}`,
    );
    console.log('ossUrl=======', ossUrl);
    // 判断是否存在此文件夹
    // const uploadDir =
    //   !!process.env.UPLOAD_DIR && process.env.UPLOAD_DIR !== ''
    //     ? process.env.UPLOAD_DIR
    //     : join(__dirname, '../../..', 'static/upload');

    // await ensureDir(uploadDir);
    // const currentSign = encryptFileMD5(file.buffer);
    // const arr = file.originalname.split('.');
    // const fileType = arr[arr.length - 1];
    // const fileName = currentSign + '.' + fileType;

    // const uploadPath = uploadDir + '/' + fileName + '';
    // await outputFile(uploadPath, file.buffer);

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
            `src/uploadsImg/${file.originalname}`,
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
