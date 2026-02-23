// src/modules/product/service/attribute-import.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Attribute } from '../entities/attribute.entity';
import { AttributeOption } from '../entities/attribute-option.entity';
import { ImportResultDto } from '../entities/dto/import-attribute.dto';
import { BaseImportService, ImportResult } from '@/common/services/base-import.service';
import pinyin from 'pinyin';

/**
 * 属性导入服务
 * 继承通用导入基类，处理属性特定的导入逻辑
 */
@Injectable()
export class AttributeImportService extends BaseImportService {
  constructor(
    @InjectRepository(Attribute)
    private readonly attributeRepo: Repository<Attribute>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  /**
   * 生成属性编码
   * 规则：ATTR_简拼_4位大写随机码
   * @param name 属性名称
   * @returns 属性编码
   */
  private generateAttributeCode(name: string): string {
    const initials =
      pinyin(name, { style: pinyin.STYLE_FIRST_LETTER })
        .map((arr) => arr[0].toUpperCase())
        .join('') || 'X';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, '0');
    return `ATTR_${initials}_${random}`;
  }

  /**
   * 生成导入模板 Excel 文件
   * @returns Excel 文件 Buffer
   */
  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('属性导入');

    // 设置列定义
    worksheet.columns = [
      { header: '属性名称*', key: 'name', width: 20 },
      { header: '属性类型*', key: 'type', width: 15 },
      { header: '单位', key: 'unit', width: 12 },
      { header: '状态', key: 'isActive', width: 10 },
      { header: '属性选项值', key: 'options', width: 50 },
    ] as ExcelJS.Column[];

    // 设置标题行样式（使用基类方法）
    this.setHeaderStyle(worksheet);

    const endColLetter = 'E';

    // 添加使用说明区域
    const infoStartRow = worksheet.rowCount + 1;
    worksheet.addRow([]);
    worksheet.addRow(['使用说明：']);
    worksheet.addRow(['1. 属性类型：select（下拉选择）、input（手工输入）、number（数字录入）']);
    worksheet.addRow(['2. select 类型必须填写属性选项值，多个选项用英文逗号分隔']);
    worksheet.addRow(['3. 状态：1启用/0禁用，不填默认为 1']);
    worksheet.addRow(['4. 单位可以留空']);

    const infoEndRow = worksheet.rowCount;
    this.setInstructionAreaStyle(worksheet, infoStartRow, infoEndRow, endColLetter, infoStartRow + 1);

    // 添加示例数据
    worksheet.addRow([]);
    worksheet.addRow(['示例：']);
    worksheet.addRow([
      '属性名称*', '属性类型*', '单位', '状态', '属性选项值',
    ]);
    worksheet.addRow(['材质', 'select', '', '1', '304不锈钢,316不锈钢,镀锌钢板']);
    worksheet.addRow(['直径', 'select', 'mm', '1', '12.5,16,20,25']);
    worksheet.addRow(['长度', 'number', 'm', '1', '']);
    worksheet.addRow(['备注', 'input', '', '1', '']);

    // 为示例区域添加边框和样式
    const exampleStartRow = infoEndRow + 3; // "示例："行
    const exampleDataStartRow = exampleStartRow + 1; // 表头行
    const exampleDataEndRow = worksheet.rowCount;

    for (let row = exampleDataStartRow; row <= exampleDataEndRow; row++) {
      const r = worksheet.getRow(row);
      r.eachCell((cell, colNumber) => {
        if (colNumber <= 5) {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        }
      });
      if (row === exampleDataStartRow) {
        r.font = { bold: true };
        r.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' },
        };
      }
    }

    // 添加数据验证（属性类型和状态下拉）
    for (let row = exampleDataStartRow + 1; row <= 1000; row++) {
      // 属性类型下拉验证
      const typeCell = worksheet.getCell(row, 2);
      typeCell.dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"select,input,number"'],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: '输入错误',
        error: '请选择 select、input 或 number',
      };

      // 状态下拉验证
      const statusCell = worksheet.getCell(row, 4);
      statusCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"1,0"'],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: '输入错误',
        error: '请选择 1 或 0',
      };
    }

    // 生成 Buffer（使用基类方法）
    return await this.generateBuffer(workbook);
  }

  /**
   * 解析并导入属性数据
   * @param file 上传的 Excel 文件
   * @param tenantId 租户ID
   * @returns 导入结果
   */
  async import(file: Express.Multer.File, tenantId: string): Promise<ImportResultDto> {
    console.log('=== 属性导入开始 ===');

    // 验证文件（使用基类方法）
    this.validateFile(file);

    // 加载工作簿（使用基类方法）
    const { worksheet } = await this.loadWorkbook(file);

    const result: ImportResult = {
      successCount: 0,
      failCount: 0,
      errors: [],
    };

    // 动态确定数据开始行（跳过表头、使用说明、示例数据）
    const dataStartRow = this.findDataStartRow(worksheet);
    console.log('数据开始行:', dataStartRow);

    // 解析数据行
    const dataRows: Array<{
      rowNumber: number;
      name: string;
      type: string;
      unit: string;
      isActive: string;
      options: string;
    }> = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < dataStartRow) return;

      const name = row.getCell(1).text?.trim();
      const type = row.getCell(2).text?.trim();
      const unit = row.getCell(3).text?.trim();
      const isActive = row.getCell(4).text?.trim();
      const options = row.getCell(5).text?.trim();

      // 跳过空行
      if (!name && !type) return;

      dataRows.push({
        rowNumber,
        name,
        type,
        unit,
        isActive,
        options,
      });
    });

    console.log('解析到的数据行数:', dataRows.length);

    // 批量处理数据
    for (const dataRow of dataRows) {
      try {
        await this.validateAndSave(dataRow, tenantId);
        result.successCount++;
      } catch (error) {
        result.failCount++;
        result.errors!.push({
          row: dataRow.rowNumber,
          name: dataRow.name || '(空名称)',
          reason: error.message,
        });
      }
    }

    console.log('=== 属性导入完成 ===');
    console.log('成功:', result.successCount, '失败:', result.failCount);

    return result;
  }

  /**
   * 动态查找数据开始行
   * 找到"示例："标记后，从第2行开始就是数据（表头行的下一行）
   * @returns 实际数据开始行号
   */
  private findDataStartRow(worksheet: ExcelJS.Worksheet): number {
    let dataStartRow = 2; // 默认从第2行开始

    worksheet.eachRow((row, rowNumber) => {
      const firstCell = row.getCell(1).text?.trim();

      // 找到"示例："标记
      if (firstCell === '示例：') {
        // 从表头行的下一行开始（示例数据行/用户数据行）
        dataStartRow = rowNumber + 2;
        return;
      }
    });

    console.log('计算得到的数据开始行:', dataStartRow);
    return dataStartRow;
  }

  /**
   * 验证并保存单条数据
   * @param dataRow 数据行
   * @param tenantId 租户ID
   * @throws 验证失败时抛出错误
   */
  private async validateAndSave(
    dataRow: {
      name: string;
      type: string;
      unit: string;
      isActive: string;
      options: string;
    },
    tenantId: string,
  ): Promise<void> {
    const { name, type, unit, isActive, options } = dataRow;

    // 验证必填字段
    if (!name) {
      throw new Error('属性名称不能为空');
    }
    if (!type) {
      throw new Error('属性类型不能为空');
    }

    // 验证属性类型
    const validTypes = ['select', 'input', 'number'];
    if (!validTypes.includes(type)) {
      throw new Error(`属性类型只能是：${validTypes.join('、')}`);
    }

    // 验证状态
    let status = 1;
    if (isActive && isActive !== '') {
      status = isActive === '1' ? 1 : 0;
    }

    // 验证选项
    let optionList: string[] = [];
    if (type === 'select') {
      if (!options) {
        throw new Error('下拉选择类型必须填写属性选项值');
      }
      optionList = options
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v !== '');
      if (optionList.length === 0) {
        throw new Error('属性选项值不能为空');
      }
    }

    // 生成编码
    const code = this.generateAttributeCode(name);

    // 检查编码是否重复
    const exists = await this.attributeRepo.findOne({ where: { code, tenantId } });
    if (exists) {
      throw new Error('属性编码已存在（可能是名称重复导致）');
    }

    // 保存数据
    await this.dataSource.transaction(async (manager) => {
      const entity = manager.create(Attribute, {
        name,
        code,
        type,
        unit: unit || null,
        isActive: status,
        tenantId,
      });
      const savedAttribute = await manager.save(entity);

      if (type === 'select') {
        const newOptions = optionList.map((value, index) =>
          manager.create(AttributeOption, {
            value,
            sort: index,
            isActive: 1,
            attributeId: savedAttribute.id,
            tenantId,
          }),
        );
        await manager.save(AttributeOption, newOptions);
      }
    });
  }
}
