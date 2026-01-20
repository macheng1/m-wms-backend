// src/common/services/base-import.service.ts
import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

/**
 * 导入错误详情
 */
export interface ImportError {
  /** 行号 */
  row: number;
  /** 名称/标识 */
  name: string;
  /** 错误原因 */
  reason: string;
}

/**
 * 导入结果DTO
 */
export interface ImportResult {
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failCount: number;
  /** 错误详情 */
  errors?: ImportError[];
}

/**
 * Excel 列定义
 */
export interface ExcelColumn {
  header: string;
  key: string;
  width: number;
}

/**
 * 数据验证配置
 */
export interface DataValidationConfig {
  /** 列索引（1-based） */
  columnIndex: number;
  /** 验证类型 */
  type: 'list' | 'whole' | 'decimal' | 'textLength';
  /** 允许空白 */
  allowBlank: boolean;
  /** 公式 */
  formulae: string[];
  /** 显示错误信息 */
  showErrorMessage?: boolean;
  /** 错误样式 */
  errorStyle?: 'error' | 'warning' | 'information';
  /** 错误标题 */
  errorTitle?: string;
  /** 错误内容 */
  error?: string;
}

/**
 * 通用导入服务基类
 * 封装Excel导入导出的公共逻辑
 */
export abstract class BaseImportService {
  /**
   * 验证上传的文件
   * @param file 上传的文件
   * @param allowedMimeTypes 允许的文件类型（可选）
   * @throws BadRequestException 文件验证失败
   */
  protected validateFile(
    file: Express.Multer.File,
    allowedMimeTypes?: string[],
  ): void {
    if (!file) {
      throw new BadRequestException('请选择要导入的文件');
    }

    const types = allowedMimeTypes || [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!types.includes(file.mimetype)) {
      throw new BadRequestException('文件格式不正确，请上传 Excel 文件');
    }
  }

  /**
   * 加载 Excel 工作簿
   * @param file 上传的文件
   * @returns Excel 工作簿和第一个工作表
   * @throws BadRequestException 加载失败
   */
  protected async loadWorkbook(
    file: Express.Multer.File,
  ): Promise<{ workbook: ExcelJS.Workbook; worksheet: ExcelJS.Worksheet }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Excel 文件为空或格式不正确');
    }

    return { workbook, worksheet };
  }

  /**
   * 生成通用 SKU 编码
   * 格式：SKU-{时间戳36进制}-{4位随机数}
   * @returns SKU 编码
   */
  protected generateSkuCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `SKU-${timestamp}-${random}`;
  }

  /**
   * 设置标题行样式
   * @param worksheet Excel 工作表
   * @param backgroundColor 背景色（ARGB格式，默认蓝色）
   */
  protected setHeaderStyle(
    worksheet: ExcelJS.Worksheet,
    backgroundColor: string = 'FF4472C4',
  ): void {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: backgroundColor },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 30;
  }

  /**
   * 设置说明区域样式（淡红色背景）
   * @param worksheet Excel 工作表
   * @param startRow 开始行号
   * @param endRow 结束行号
   * @param endColLetter 结束列字母（如 'E'）
   * @param titleRow 标题行号（可选，用于加粗）
   */
  protected setInstructionAreaStyle(
    worksheet: ExcelJS.Worksheet,
    startRow: number,
    endRow: number,
    endColLetter: string,
    titleRow?: number,
  ): void {
    for (let i = startRow; i <= endRow; i++) {
      worksheet.mergeCells(`A${i}:${endColLetter}${i}`);
      const row = worksheet.getRow(i);
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF0F0' }, // 淡红色背景
      };
      if (titleRow && i === titleRow) {
        row.font = { bold: true };
      }
    }
  }

  /**
   * 设置单元格边框
   * @param worksheet Excel 工作表
   * @param rowNumber 行号
   * @param startCol 开始列（1-based）
   * @param endCol 结束列（1-based）
   */
  protected setCellBorder(
    worksheet: ExcelJS.Worksheet,
    rowNumber: number,
    startCol: number,
    endCol: number,
  ): void {
    const row = worksheet.getRow(rowNumber);
    row.eachCell((cell, colNumber) => {
      if (colNumber >= startCol && colNumber <= endCol) {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    });
  }

  /**
   * 批量添加数据验证
   * @param worksheet Excel 工作表
   * @param configs 数据验证配置数组
   * @param startRow 开始行号（默认2）
   * @param endRow 结束行号（默认1000）
   */
  protected addDataValidations(
    worksheet: ExcelJS.Worksheet,
    configs: DataValidationConfig[],
    startRow: number = 2,
    endRow: number = 1000,
  ): void {
    for (let row = startRow; row <= endRow; row++) {
      for (const config of configs) {
        const cell = worksheet.getCell(row, config.columnIndex);
        cell.dataValidation = {
          type: config.type,
          allowBlank: config.allowBlank,
          formulae: config.formulae,
          showErrorMessage: config.showErrorMessage ?? true,
          errorStyle: config.errorStyle || 'error',
          errorTitle: config.errorTitle || '输入错误',
          error: config.error || '输入的值不符合要求',
        };
      }
    }
  }

  /**
   * 合并单元格区域
   * @param worksheet Excel 工作表
   * @param startRow 开始行号
   * @param endRow 结束行号
   * @param colLetter 列字母
   */
  protected mergeColumnCells(
    worksheet: ExcelJS.Worksheet,
    startRow: number,
    endRow: number,
    colLetter: string,
  ): void {
    for (let i = startRow; i <= endRow; i++) {
      worksheet.mergeCells(`A${i}:${colLetter}${i}`);
    }
  }

  /**
   * 生成 Excel Buffer
   * @param workbook Excel 工作簿
   * @returns Buffer
   */
  protected async generateBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
