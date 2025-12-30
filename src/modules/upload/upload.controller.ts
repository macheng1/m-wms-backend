import { UploadService } from './upload.service';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Body, Controller, HttpCode, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';

import multer = require('multer');
@ApiTags('上传图片')
@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('fileList')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('file', 6, {
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          console.log('TCL: UploadController -> constructor -> file', file);
          cb(null, 'src/uploadsImg/');
        },
        filename: (req, file, cb) => {
          cb(null, `${file.originalname}`);
        },
      }),
    }),
  )
  @HttpCode(200)
  async uploadMultiple(@UploadedFiles() file: Array<Express.Multer.File>, @Body() body) {
    return this.uploadService.uploadMultiple(file);
  }
}
