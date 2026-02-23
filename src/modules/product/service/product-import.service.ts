// src/modules/product/service/product-import.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Product } from '../product.entity';
import { Category } from '../entities/category.entity';
import { Attribute } from '../entities/attribute.entity';
import { ImportProductResultDto } from '../entities/dto/import-product.dto';
import { BaseImportService } from '@/common/services/base-import.service';

/**
 * 产品导入导出服务
 * 继承通用导入基类，提供产品导入模板生成和数据导入功能
 */
@Injectable()
export class ProductImportService extends BaseImportService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {
    super();
  }

  /**
   * 生成导入模板 Excel 文件
   * @param categoryCode 类目编码，如果提供则生成该类目的专属模板（属性展开为独立列）
   * @param tenantId 租户ID
   * @returns Excel 文件 Buffer
   */
  async generateTemplate(categoryCode?: string, tenantId?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    if (categoryCode) {
      return await this.generateCategoryTemplate(workbook, categoryCode, tenantId);
    }

    return await this.generateGenericTemplate(workbook, tenantId);
  }

  /**
   * 生成通用导入模板（支持所有类目，属性列为通用列）
   * @param workbook Excel 工作簿
   * @param tenantId 租户ID
   * @returns Excel 文件 Buffer
   */
  private async generateGenericTemplate(
    workbook: ExcelJS.Workbook,
    tenantId?: string,
  ): Promise<Buffer> {
    const categoryWhere: any = {};
    if (tenantId) {
      categoryWhere.tenantId = tenantId;
    }

    const categories = await this.categoryRepo.find({
      where: categoryWhere,
      relations: ['attributes', 'attributes.options'],
      order: { name: 'ASC' },
    });

    // 创建工作表（先创建主工作表，再创建数据工作表）
    const worksheet = workbook.addWorksheet('产品导入');
    const dataSheet = workbook.addWorksheet('数据');
    dataSheet.state = 'veryHidden';

    // 构建类目数据映射
    const categoryList: string[] = [];
    const categoryAttributesMap: Record<string, string[]> = {};

    for (const category of categories) {
      categoryList.push(`${category.name}|${category.code}`);
      const attrNames = category.attributes?.map((a) => a.name) || [];
      categoryAttributesMap[category.code] = attrNames;
    }

    // 在数据表中写入类目和属性数据
    dataSheet.getColumn('A').values = ['', '类目列表', ...categoryList];
    const categoryEndRow = categoryList.length + 2;

    let currentRow = categoryEndRow + 2;
    for (const [code, attrs] of Object.entries(categoryAttributesMap)) {
      dataSheet.getCell(`B${currentRow}`).value = `${code}属性`;
      if (attrs.length > 0) {
        attrs.forEach((attr, idx) => {
          dataSheet.getCell(`B${currentRow + 1 + idx}`).value = attr;
        });
        currentRow += attrs.length + 2;
      } else {
        dataSheet.getCell(`B${currentRow + 1}`).value = '(无属性)';
        currentRow += 3;
      }
    }

    // 设置列定义
    worksheet.columns = [
      { header: '产品名称*', key: 'name', width: 20 },
      { header: '类目*', key: 'categoryCode', width: 15 },
      { header: '产品编码', key: 'code', width: 18 },
      { header: '产品图片', key: 'images', width: 50 },
      { header: '单位', key: 'unit', width: 10 },
      { header: '安全库存', key: 'safetyStock', width: 12 },
      { header: '状态', key: 'isActive', width: 8 },
      { header: '属性1', key: 'attr1', width: 15 },
      { header: '属性1值', key: 'attr1Value', width: 15 },
      { header: '属性2', key: 'attr2', width: 15 },
      { header: '属性2值', key: 'attr2Value', width: 15 },
      { header: '属性3', key: 'attr3', width: 15 },
      { header: '属性3值', key: 'attr3Value', width: 15 },
      { header: '属性4', key: 'attr4', width: 15 },
      { header: '属性4值', key: 'attr4Value', width: 15 },
      { header: '属性5', key: 'attr5', width: 15 },
      { header: '属性5值', key: 'attr5Value', width: 15 },
      { header: '属性6', key: 'attr6', width: 15 },
      { header: '属性6值', key: 'attr6Value', width: 15 },
      { header: '属性7', key: 'attr7', width: 15 },
      { header: '属性7值', key: 'attr7Value', width: 15 },
      { header: '属性8', key: 'attr8', width: 15 },
      { header: '属性8值', key: 'attr8Value', width: 15 },
      { header: '属性9', key: 'attr9', width: 15 },
      { header: '属性9值', key: 'attr9Value', width: 15 },
      { header: '属性10', key: 'attr10', width: 15 },
      { header: '属性10值', key: 'attr10Value', width: 15 },
    ];

    // 设置标题行样式（使用基类方法）
    this.setHeaderStyle(worksheet);

    // 为属性列添加不同颜色的背景
    const attrColors = [
      'FFF2F2F2', 'FFE6F2FF', 'FFF2FFF2', 'FFFFF2F2', 'FFF0F0F0',
      'FFE6E6FA', 'FFF0E68C', 'FFDDA0DD', 'FF98FB98', 'FFAFEEEE'
    ];
    for (let i = 0; i < 10; i++) {
      const attrColIndex = 8 + i * 2;
      const valColIndex = 9 + i * 2;
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.getCell(attrColIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: attrColors[i] },
        };
        row.getCell(valColIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: attrColors[i] },
        };
      });
    }

    // 添加使用说明区域
    const infoStartRow = worksheet.rowCount + 1;
    worksheet.addRow([]);
    worksheet.addRow(['使用说明：']);
    worksheet.addRow(['1. 类目列：从下拉列表中选择类目']);
    worksheet.addRow(['2. 属性列：选择类目后，查看下方的【类目属性对照表】，选择对应的属性']);
    worksheet.addRow(['3. 属性值列：填写对应属性的值（下拉选择类型只能填写对照表中列出的可选值）']);
    worksheet.addRow(['4. 可以填写多个属性（最多10个），不用的属性列可以留空']);
    worksheet.addRow(['5. 产品编码、图片可以留空']);
    worksheet.addRow(['6. 状态：1启用/0禁用']);

    const infoEndRow = worksheet.rowCount;
    const endColLetter = 'AA';
    this.setInstructionAreaStyle(worksheet, infoStartRow, infoEndRow, endColLetter, infoStartRow + 1);

    // 添加类目属性对照表
    const refStartRow = worksheet.rowCount + 1;
    worksheet.addRow([]);
    worksheet.addRow(['【类目属性对照表】请查看下方，了解每个类目有哪些属性及其可选值']);
    worksheet.addRow(['类目', '属性名', '类型', '可选值/说明']);

    for (const category of categories) {
      const attrs = category.attributes || [];
      if (attrs.length === 0) {
        worksheet.addRow([`${category.name} (${category.code})`, '(无属性)', '', '']);
      } else {
        attrs.forEach((attr, idx) => {
          const categoryCell = idx === 0 ? `${category.name} (${category.code})` : '';
          let typeDisplay = '';
          let optionsDisplay = '';
          if (attr.type === 'select') {
            typeDisplay = '下拉选择';
            const options = attr.options?.map((o) => o.value) || [];
            optionsDisplay = options.length > 0 ? options.join('、') : '(未配置选项)';
          } else if (attr.type === 'number') {
            typeDisplay = '数字';
            optionsDisplay = '请填写数字';
          } else {
            typeDisplay = '文本';
            optionsDisplay = '请填写文本';
          }
          worksheet.addRow([categoryCell, attr.name, typeDisplay, optionsDisplay]);
        });
      }
    }

    const refEndRow = worksheet.rowCount;
    for (let row = refStartRow; row <= refEndRow; row++) {
      const r = worksheet.getRow(row);
      r.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF0F0' },
      };
      if (row === refStartRow + 1) {
        r.font = { bold: true, size: 12 };
        r.alignment = { horizontal: 'center' };
        worksheet.mergeCells(`A${row}:${endColLetter}${row}`);
      } else if (row === refStartRow + 2) {
        r.eachCell((cell, colNumber) => {
          if (colNumber <= 4) {
            cell.font = { bold: true };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFD0D0' },
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          }
        });
      } else {
        r.eachCell((cell, colNumber) => {
          if (colNumber <= 4) {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          }
        });
      }
    }

    // 添加示例数据
    worksheet.addRow(['示例：']);
    worksheet.addRow([
      '产品名称*', '类目*', '产品编码', '产品图片', '单位', '安全库存', '状态',
      '属性1', '属性1值', '属性2', '属性2值', '属性3', '属性3值', '属性4', '属性4值', '属性5', '属性5值',
      '属性6', '属性6值', '属性7', '属性7值', '属性8', '属性8值', '属性9', '属性9值', '属性10', '属性10值',
    ]);

    const sampleCategory = categories.find((c) => c.attributes && c.attributes.length > 0);
    if (sampleCategory && sampleCategory.attributes) {
      const attrs = sampleCategory.attributes.slice(0, 10);
      const sampleValues: any[] = [
        `${sampleCategory.name}示例1`,
        `${sampleCategory.name}|${sampleCategory.code}`,
        '', '', '个', '100', '1',
      ];
      for (let i = 0; i < 10; i++) {
        if (attrs[i]) {
          sampleValues.push(attrs[i].name);
          if (attrs[i].type === 'select' && attrs[i].options && attrs[i].options.length > 0) {
            sampleValues.push(attrs[i].options[0].value);
          } else if (attrs[i].type === 'number') {
            sampleValues.push('10');
          } else {
            sampleValues.push('示例值');
          }
        } else {
          sampleValues.push('', '');
        }
      }
      worksheet.addRow(sampleValues);
    }

    // 添加数据验证（使用基类方法）
    const allAttrNames = new Set<string>();
    for (const category of categories) {
      category.attributes?.forEach((attr) => allAttrNames.add(attr.name));
    }
    const allAttrsArray = Array.from(allAttrNames);

    for (let row = 12; row <= 1000; row++) {
      // 类目下拉验证
      const categoryCell = worksheet.getCell(row, 2);
      categoryCell.dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['数据!$A$3:$A$' + categoryEndRow],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: '请选择类目',
        error: '请从下拉列表中选择一个类目',
      };

      // 状态下拉验证
      const statusCell = worksheet.getCell(row, 7);
      statusCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"1,0"'],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: '输入错误',
        error: '请选择 1 或 0',
      };

      // 属性名列下拉验证
      for (let i = 0; i < 10; i++) {
        const attrCell = worksheet.getCell(row, 8 + i * 2);
        attrCell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${allAttrsArray.join(',')}"`],
          showErrorMessage: false,
        };
      }
    }

    // 生成 Buffer（使用基类方法）
    return await this.generateBuffer(workbook);
  }

  /**
   * 生成类目专属导入模板
   */
  private async generateCategoryTemplate(
    workbook: ExcelJS.Workbook,
    categoryCode: string,
    tenantId?: string,
  ): Promise<Buffer> {
    const category = await this.categoryRepo.findOne({
      where: { code: categoryCode, ...(tenantId && { tenantId }) },
      relations: ['attributes', 'attributes.options'],
    });

    if (!category) {
      throw new BadRequestException(`类目编码 ${categoryCode} 不存在`);
    }

    const worksheet = workbook.addWorksheet(`${category.name}-导入模板`);

    const baseColumns = [
      { header: '产品名称*', key: 'name', width: 25 },
      { header: '产品编码', key: 'code', width: 20 },
      { header: '产品图片', key: 'images', width: 60 },
      { header: '单位', key: 'unit', width: 12 },
      { header: '安全库存', key: 'safetyStock', width: 12 },
      { header: '状态', key: 'isActive', width: 10 },
    ];

    const attributeColumns: Array<{ header: string; key: string; width: number; attribute: Attribute }> = [];
    for (const attr of category.attributes || []) {
      const header = attr.unit ? `${attr.name}(${attr.unit})` : attr.name;
      attributeColumns.push({
        header: `${header}${attr.type === 'select' ? '*' : ''}`,
        key: attr.code,
        width: 18,
        attribute: attr,
      });
    }

    worksheet.columns = [...baseColumns, ...attributeColumns];
    this.setHeaderStyle(worksheet);

    const endCol = String.fromCharCode(65 + baseColumns.length + attributeColumns.length - 1);

    worksheet.addRow([]);
    worksheet.addRow([`【${category.name}】产品导入模板`]);
    worksheet.mergeCells(`A2:${endCol}2`);
    const categoryRow = worksheet.getRow(2);
    categoryRow.font = { bold: true, size: 14 };
    categoryRow.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow(['说明：']);
    const descRowNum = worksheet.rowCount;
    worksheet.addRow(['1. 带 * 号的属性列必须填写（下拉选择类型必填）']);
    worksheet.addRow(['2. 产品编码不填则自动生成']);
    worksheet.addRow(['3. 安全库存填写数字，不填默认为 0']);
    worksheet.addRow(['4. 状态：1启用/0禁用，不填默认为 1']);
    worksheet.addRow(['5. 下拉选择类型的属性只能填写已配置的选项值']);
    worksheet.addRow(['6. 示例数据见下方']);
    worksheet.addRow(['']);

    for (let i = descRowNum; i <= worksheet.rowCount; i++) {
      worksheet.mergeCells(`A${i}:${endCol}${i}`);
    }

    const exampleHeaderRow = worksheet.rowCount + 1;
    const exampleHeaders = [
      '示例产品名称', '产品编码(选填)', '产品图片(URL)', '单位', '安全库存', '状态',
    ];
    for (const attrCol of attributeColumns) {
      exampleHeaders.push(`${attrCol.attribute.name}${attrCol.attribute.type === 'select' ? '(从下拉选择)' : ''}`);
    }
    worksheet.addRow(exampleHeaders);

    for (let rowIdx = 0; rowIdx < 3; rowIdx++) {
      const rowData: any[] = [
        `${category.name}示例${rowIdx + 1}`, '',
        rowIdx === 0 ? 'http://oss.example.com/product.jpg' : '',
        '个', 100 * (rowIdx + 1), '1',
      ];

      for (const attrCol of attributeColumns) {
        const attr = attrCol.attribute;
        let exampleValue = '';
        if (attr.type === 'select') {
          exampleValue = attr.options && attr.options.length > 0 ? attr.options[0].value : '(请先配置选项)';
        } else if (attr.type === 'number') {
          exampleValue = String(10 * (rowIdx + 1));
        } else {
          exampleValue = attr.name === '备注' ? '可选填备注信息' : `示例${rowIdx + 1}`;
        }
        rowData.push(exampleValue);
      }
      worksheet.addRow(rowData);
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      }
    });

    const statusColIdx = baseColumns.length;
    for (let i = exampleHeaderRow + 1; i <= 1000; i++) {
      const cell = worksheet.getCell(i, statusColIdx);
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"1,0"'],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: '输入错误',
        error: '请选择 1 或 0',
      };
    }

    for (let i = 0; i < attributeColumns.length; i++) {
      const attrCol = attributeColumns[i];
      if (attrCol.attribute.type === 'select' && attrCol.attribute.options) {
        const options = attrCol.attribute.options.map((o) => o.value);
        if (options.length > 0) {
          const colIdx = baseColumns.length + i + 1;
          for (let row = exampleHeaderRow + 1; row <= 1000; row++) {
            const cell = worksheet.getCell(row, colIdx);
            cell.dataValidation = {
              type: 'list',
              allowBlank: false,
              formulae: [`"${options.join(',')}"`],
              showErrorMessage: true,
              errorStyle: 'error',
              errorTitle: '输入错误',
              error: `请选择：${options.join('、')}`,
            };
          }
        }
      }
    }

    return await this.generateBuffer(workbook);
  }

  /**
   * 解析并导入产品数据
   * @param file 上传的 Excel 文件
   * @param tenantId 租户ID
   * @returns 导入结果
   */
  async import(file: Express.Multer.File, tenantId: string): Promise<ImportProductResultDto> {
    console.log('=== 产品导入开始 ===');

    // 验证文件（使用基类方法）
    this.validateFile(file);

    // 加载工作簿（使用基类方法）
    const { worksheet } = await this.loadWorkbook(file);

    console.log('工作表名称:', worksheet.name);
    console.log('工作表行数:', worksheet.rowCount);

    // 检查模板格式
    const headerRow = worksheet.getRow(1);
    const cell8 = headerRow.getCell(8).text?.trim();
    console.log('第8列标题:', cell8);

    if (cell8 !== '属性1') {
      throw new BadRequestException('模板格式不正确，请下载最新模板');
    }

    return await this.importProducts(worksheet, tenantId);
  }

  /**
   * 导入产品数据
   */
  private async importProducts(
    worksheet: ExcelJS.Worksheet,
    tenantId: string,
  ): Promise<ImportProductResultDto> {
    console.log('=== 开始解析导入数据 ===');
    const result: ImportProductResultDto = {
      successCount: 0,
      failCount: 0,
      errors: [],
    };

    const dataRows: Array<{
      rowNumber: number;
      name: string;
      categoryCode: string;
      code: string;
      images: string;
      unit: string;
      safetyStock: string;
      isActive: string;
      attributes: Array<{ name: string; value: string }>;
    }> = [];

    // 动态确定数据开始行（跳过表头、使用说明、类目属性对照表、示例数据）
    const dataStartRow = this.findDataStartRow(worksheet);
    console.log('数据开始行:', dataStartRow);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < dataStartRow) return;

      const firstCell = row.getCell(1).text?.trim();
      if (!firstCell) return;

      const name = row.getCell(1).text?.trim();
      const categoryValue = row.getCell(2).text?.trim();
      const code = row.getCell(3).text?.trim();
      const images = row.getCell(4).text?.trim();
      const unit = row.getCell(5).text?.trim();
      const safetyStock = row.getCell(6).text?.trim();
      const isActive = row.getCell(7).text?.trim();

      if (!name && !categoryValue) return;

      const attributes: Array<{ name: string; value: string }> = [];
      for (let i = 0; i < 10; i++) {
        const attrName = row.getCell(8 + i * 2).text?.trim();
        const attrValue = row.getCell(9 + i * 2).text?.trim();
        if (attrName && attrValue) {
          attributes.push({ name: attrName, value: attrValue });
        }
      }

      let categoryCode = categoryValue;
      if (categoryValue.includes('|')) {
        categoryCode = categoryValue.split('|')[1]?.trim() || categoryValue;
      }

      dataRows.push({
        rowNumber,
        name,
        categoryCode,
        code,
        images,
        unit,
        safetyStock,
        isActive,
        attributes,
      });
    });

    console.log('解析到的数据行数:', dataRows.length);

    for (const dataRow of dataRows) {
      try {
        console.log(`处理第${dataRow.rowNumber}行:`, dataRow.name);
        await this.validateAndSaveProduct(dataRow, tenantId);
        result.successCount++;
        console.log(`第${dataRow.rowNumber}行导入成功`);
      } catch (error) {
        console.error(`第${dataRow.rowNumber}行导入失败:`, error.message);
        result.failCount++;
        result.errors!.push({
          row: dataRow.rowNumber,
          name: dataRow.name || '(空名称)',
          reason: error.message,
        });
      }
    }

    console.log('=== 导入完成 ===');
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
   * 验证并保存单条产品数据
   */
  private async validateAndSaveProduct(
    dataRow: {
      name: string;
      categoryCode: string;
      code: string;
      images: string;
      unit: string;
      safetyStock: string;
      isActive: string;
      attributes: Array<{ name: string; value: string }>;
    },
    tenantId: string,
  ): Promise<void> {
    const { name, categoryCode, code, images, unit, safetyStock, isActive, attributes } = dataRow;

    if (!name) {
      throw new Error('产品名称不能为空');
    }
    if (!categoryCode) {
      throw new Error('类目不能为空');
    }

    const category = await this.categoryRepo.findOne({
      where: { code: categoryCode, tenantId },
      relations: ['attributes', 'attributes.options'],
    });
    if (!category) {
      throw new Error(`类目编码 ${categoryCode} 不存在`);
    }

    const specsObj: Record<string, any> = {};

    for (const attr of attributes) {
      const { name: attrName, value: attrValue } = attr;

      const attribute = category.attributes?.find((a) => a.name === attrName);
      if (!attribute) {
        throw new Error(`类目 ${category.name} 未绑定属性"${attrName}"，请先在类目中绑定该属性`);
      }

      if (attribute.type === 'select') {
        const validOptions = attribute.options?.map((o) => o.value) || [];
        if (!validOptions.includes(attrValue)) {
          throw new Error(
            `属性"${attrName}"的值"${attrValue}"不在可选列表中，可选值：${validOptions.join('、')}`,
          );
        }
      } else if (attribute.type === 'number') {
        if (isNaN(Number(attrValue))) {
          throw new Error(`属性"${attrName}"的值"${attrValue}"必须为数字`);
        }
      }

      specsObj[attribute.name] = attrValue;
    }

    let productCode = code;
    if (!productCode) {
      // 生成通用SKU（使用基类方法）
      productCode = this.generateSkuCode();
    }

    const exists = await this.productRepo.findOne({ where: { code: productCode, tenantId } });
    if (exists) {
      throw new Error(`产品编码 ${productCode} 已存在`);
    }

    let status = 1;
    if (isActive && isActive !== '') {
      status = isActive === '1' ? 1 : 0;
    }

    let stock = 0;
    if (safetyStock && safetyStock !== '') {
      stock = Number(safetyStock);
      if (isNaN(stock)) {
        throw new Error('安全库存必须为数字');
      }
    }

    let imagesList: string[] = [];
    if (images) {
      imagesList = images
        .split(',')
        .map((url) => url.trim())
        .filter((url) => url !== '');
    }

    const product = this.productRepo.create({
      name,
      code: productCode,
      categoryId: category.id,
      unit: unit || null,
      safetyStock: stock,
      isActive: status,
      specs: Object.keys(specsObj).length > 0 ? specsObj : null,
      images: imagesList,
      tenantId,
    });

    await this.productRepo.save(product);
  }
}
