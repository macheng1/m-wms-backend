import * as OSS from 'ali-oss';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OssService {
  private client: any;
  public constructor() {
    this.client = new OSS({
      accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
      endpoint: process.env.ALIYUN_OSS_ENDPOINT,
      bucket: process.env.ALIYUN_OSS_BUCKET,
      region: process.env.ALIYUN_OSS_REGION,
    });
  }
  // 创建存储空间。
  private async putBucket() {
    try {
      const result = await this.client.putBucket('macheng123');
      console.log(result);
    } catch (err) {
      console.log(err);
    }
  }
  // 列举所有的存储空间
  private async listBuckets() {
    try {
      const result = await this.client.listBuckets();
      console.log(result);
    } catch (err) {
      console.log(err);
    }
  }
  // 上传文件到oss 并返回  图片oss 地址
  public async putOssFile(ossPath: string, localPath: string): Promise<string> {
    let res: any;
    try {
      res = await this.client.put(ossPath, localPath);
      console.log('res=====>', res);
      // 将文件设置为公共可读
      await this.client.putACL(ossPath, 'public-read');
    } catch (error) {
      console.log(error);
    }
    return res.url;
  }
  /**
   * 获取文件的url
   * @param filePath
   */
  public async getFileSignatureUrl(filePath: string): Promise<string> {
    if (filePath == null) {
      console.log('get file signature failed: file name can not be empty');
      return null;
    }
    let result = '';
    try {
      result = this.client.signatureUrl(filePath, { expires: 36000 });
    } catch (err) {
      console.log(err);
    }
    return result;
  }
  /**
   * 上传文件大小校验
   * @param localPath
   * @param ossPath
   * @param size
   */
  public async validateFile(ossPath: string, localPath: string, size: number): Promise<string> {
    if (size > 5 * 1024 * 1024) {
      return;
    } else {
      return await this.putOssFile(ossPath, localPath);
    }
  }
}
