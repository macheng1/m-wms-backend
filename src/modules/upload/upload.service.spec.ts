import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;

  const file = {
    originalname: 'logo.png',
    buffer: Buffer.from('test'),
    size: 4,
  } as Express.Multer.File;

  beforeEach(() => {
    service = new UploadService();
    (service as any).ossService = {
      putOssFile: jest.fn(async (key: string) => `https://oss.example.com${key}`),
    };
  });

  it('rejects path traversal upload directories', async () => {
    await expect(service.upload(file, 'tenant/../../secret')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects absolute upload directories', async () => {
    await expect(service.upload(file, '/etc')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows whitelisted business upload directories', async () => {
    const result = await service.upload(file, 'tenant/logo');

    expect(result.url).toContain('/tenant/logo/');
  });
});
