import { Global, Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { OssModule } from '../aliyun/oss/oos.module';

@Global()
@Module({
  controllers: [UploadController],
  providers: [UploadService],
  imports: [OssModule],
  exports: [UploadService],
})
export class UploadModule {}
