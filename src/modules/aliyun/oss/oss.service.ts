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
      // 让 ali-oss 生成的所有地址（put 返回 url、签名 url）默认走 https
      secure: true,
    });
  }

  /** 兜底：把 OSS 返回地址里的 http:// 统一强制为 https://，避免存量再次出现 http 图片 */
  private toHttps(url: string): string {
    return typeof url === 'string' ? url.replace(/^http:\/\//i, 'https://') : url;
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
  public async putOssFile(ossPath: string, localPathOrBuffer: string | Buffer): Promise<string> {
    let res: any;
    try {
      res = await this.client.put(ossPath, localPathOrBuffer);
      console.log('res=====>', res);
      // 将文件设置为公共可读
      await this.client.putACL(ossPath, 'public-read');
    } catch (error) {
      console.log(error);
    }
    return this.toHttps(res?.url);
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
    return this.toHttps(result);
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
