import { UploadService } from './upload.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';

import multer = require('multer');
import { memoryStorageConfig } from '@/common/config/multer.config';
import { AuditLogService } from '@/common/audit/audit-log.service';

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

@ApiTags('上传图片')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('fileList')
  @ApiOperation({ summary: '批量上传文件' })
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
        path: {
          type: 'string',
          description: '上传目录，例如 avatar、product、tenant/logo、portal、miniapp/banner',
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('file', 6, {
      storage: memoryStorageConfig,
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 6,
      },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
          return callback(new BadRequestException('不支持的文件类型'), false);
        }
        callback(null, true);
      },
    }),
  )
  @HttpCode(200)
  async uploadMultiple(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body,
    @Req() req,
  ) {
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new BadRequestException('请上传文件');
    }
    const result = await this.uploadService.uploadMultiple(files, body?.path);
    const requestAudit = this.auditLogService.fromRequest(req);
    await this.auditLogService.record({
      ...requestAudit,
      module: 'upload',
      action: 'file.upload',
      targetType: 'oss-file',
      description: `上传文件 ${files.length} 个`,
      afterData: {
        path: body?.path || 'image',
        files: result.map((item) => ({
          filename: item.filename,
          url: item.url,
          success: item.success,
        })),
      },
    });
    return result;
  }
}
