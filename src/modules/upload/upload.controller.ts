import { UploadService } from './upload.service';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Body, Controller, HttpCode, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';

import multer = require('multer');
import { Public } from '@/common/decorators/public.decorator';
@ApiTags('上传图片')
@Controller('upload')
@Public()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}
  @Post('fileList')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '文件列表',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('file', 6, {
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, 'src/uploadsImg/');
        },
        filename: (req, file, cb) => {
          cb(null, `${file.originalname}`);
        },
      }),
    }),
  )
  @HttpCode(200)
  async uploadMultiple(@UploadedFiles() files: Array<Express.Multer.File>, @Body() body) {
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error('No files uploaded');
    }
    return this.uploadService.uploadMultiple(files);
  }
}
