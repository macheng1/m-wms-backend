// src/modules/product/service/product-import.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import * as JSZip from 'jszip';
import * as path from 'path';
import { Product } from '../product.entity';
import { Category } from '../entities/category.entity';
import { ImportProductResultDto } from '../entities/dto/import-product.dto';
import { BaseImportService } from '@/common/services/base-import.service';
import { OssService } from '@/modules/aliyun/oss/oss.service';
import { Unit } from '@/modules/unit/entities/unit.entity';

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
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    private readonly ossService: OssService,
  ) {
    super();
  }

  /**
   * 生成导入模板 Excel 文件
   * @param categoryCode 类目编码，如果提供则生成仅包含该类目的通用模板
   * @param tenantId 租户ID
   * @returns Excel 文件 Buffer
   */
  async generateTemplate(categoryCode?: string, tenantId?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    return await this.generateGenericTemplate(workbook, tenantId, categoryCode);
  }

  /**
   * 生成通用导入模板（支持所有类目，属性列为通用列）
   * @param workbook Excel 工作簿
   * @param tenantId 租户ID
   * @param categoryCode 类目编码，如果提供则模板中的类目数据只包含该类目
   * @returns Excel 文件 Buffer
   */
  private async generateGenericTemplate(
    workbook: ExcelJS.Workbook,
    tenantId?: string,
    categoryCode?: string,
  ): Promise<Buffer> {
    const categories = await this.categoryRepo.find({
      where: this.buildReadableCategoryWhere(tenantId, categoryCode),
      relations: ['attributes', 'attributes.options'],
      order: { name: 'ASC' },
    });

    if (categoryCode && categories.length === 0) {
      throw new BadRequestException(`类目编码 ${categoryCode} 不存在`);
    }

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
      { header: '产品图片1', key: 'image1', width: 24 },
      { header: '产品图片2', key: 'image2', width: 24 },
      { header: '产品图片3', key: 'image3', width: 24 },
      { header: '产品图片4', key: 'image4', width: 24 },
      { header: '产品图片5', key: 'image5', width: 24 },
      { header: '库存主单位*', key: 'unit', width: 14 },
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
      'FFF2F2F2',
      'FFE6F2FF',
      'FFF2FFF2',
      'FFFFF2F2',
      'FFF0F0F0',
      'FFE6E6FA',
      'FFF0E68C',
      'FFDDA0DD',
      'FF98FB98',
      'FFAFEEEE',
    ];
    for (let i = 0; i < 10; i++) {
      const attrColIndex = 11 + i * 2;
      const valColIndex = 12 + i * 2;
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
    worksheet.addRow(['5. 产品图片可以留空，最多5张；每张图片请填写或插入到一个独立的产品图片单元格']);
    worksheet.addRow(['6. 产品编码由系统自动生成']);
    worksheet.addRow(['7. 库存主单位：填写单位编码、名称或符号，如 PCS、个、箱']);
    worksheet.addRow(['8. 状态：是启用/否禁用，不填默认为是']);

    const infoEndRow = worksheet.rowCount;
    const endColLetter = 'AD';
    this.setInstructionAreaStyle(
      worksheet,
      infoStartRow,
      infoEndRow,
      endColLetter,
      infoStartRow + 1,
    );

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
      '产品名称*',
      '类目*',
      '产品图片1',
      '产品图片2',
      '产品图片3',
      '产品图片4',
      '产品图片5',
      '库存主单位*',
      '安全库存',
      '状态',
      '属性1',
      '属性1值',
      '属性2',
      '属性2值',
      '属性3',
      '属性3值',
      '属性4',
      '属性4值',
      '属性5',
      '属性5值',
      '属性6',
      '属性6值',
      '属性7',
      '属性7值',
      '属性8',
      '属性8值',
      '属性9',
      '属性9值',
      '属性10',
      '属性10值',
    ]);

    const sampleCategory = categories.find((c) => c.attributes && c.attributes.length > 0);
    if (sampleCategory && sampleCategory.attributes) {
      const attrs = sampleCategory.attributes.slice(0, 10);
      const sampleValues: any[] = [
        `${sampleCategory.name}示例1`,
        `${sampleCategory.name}|${sampleCategory.code}`,
        '',
        '',
        '',
        '',
        '',
        '个',
        '100',
        '是',
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
      const statusCell = worksheet.getCell(row, 10);
      statusCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"是,否"'],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: '输入错误',
        error: '请选择 是 或 否',
      };

      // 属性名列下拉验证
      for (let i = 0; i < 10; i++) {
        const attrCell = worksheet.getCell(row, 11 + i * 2);
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

  private buildReadableCategoryWhere(tenantId?: string, categoryCode?: string) {
    const baseWhere = categoryCode ? { code: categoryCode } : {};
    if (!tenantId) {
      return { ...baseWhere, tenantId: IsNull() };
    }

    return [{ ...baseWhere, tenantId }, { ...baseWhere, tenantId: IsNull() }];
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
    const attrStartColumn = this.findColumnIndex(worksheet, ['属性1'], 0, 20);
    console.log('属性1列:', attrStartColumn);

    if (!attrStartColumn) {
      throw new BadRequestException('模板格式不正确，请下载最新模板');
    }

    return await this.importProducts(worksheet, tenantId, file.buffer);
  }

  /**
   * 导入产品数据
   */
  private async importProducts(
    worksheet: ExcelJS.Worksheet,
    tenantId: string,
    fileBuffer: Buffer,
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
      images: string[];
      embeddedImageUrls: string[];
      unit: string;
      safetyStock: string;
      isActive: string;
      attributes: Array<{ name: string; value: string }>;
    }> = [];

    try {
      // 动态确定数据开始行（跳过表头、使用说明、类目属性对照表、示例数据）
      const dataStartRow = this.findDataStartRow(worksheet);
      console.log('数据开始行:', dataStartRow);
      const imageColumns = this.findImageColumns(worksheet, dataStartRow);
      const codeColumn = this.findColumnIndex(worksheet, ['产品编码'], 0, dataStartRow);
      const unitColumn = this.findColumnIndex(
        worksheet,
        ['库存主单位*', '库存主单位'],
        8,
        dataStartRow,
      );
      const safetyStockColumn = this.findColumnIndex(worksheet, ['安全库存'], 9, dataStartRow);
      const statusColumn = this.findColumnIndex(worksheet, ['状态'], 10, dataStartRow);
      const attrStartColumn = this.findColumnIndex(worksheet, ['属性1'], 11, dataStartRow);
      console.log('产品图片列:', imageColumns);
      const embeddedImageMap = await this.uploadEmbeddedImages(worksheet, imageColumns, dataStartRow);
      const wpsImageMap = await this.uploadWpsCellImages(fileBuffer);

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber < dataStartRow) return;

        const firstCell = row.getCell(1).text?.trim();
        if (!firstCell) return;

        const name = row.getCell(1).text?.trim();
        const categoryValue = row.getCell(2).text?.trim();
        const code = codeColumn > 0 ? row.getCell(codeColumn).text?.trim() : '';
        const images = imageColumns.map((column) => row.getCell(column).text?.trim()).filter(Boolean);
        const unit = row.getCell(unitColumn).text?.trim();
        const safetyStock = row.getCell(safetyStockColumn).text?.trim();
        const isActive = row.getCell(statusColumn).text?.trim();

        if (!name && !categoryValue) return;

        const attributes: Array<{ name: string; value: string }> = [];
        for (let i = 0; i < 10; i++) {
          const attrName = row.getCell(attrStartColumn + i * 2).text?.trim();
          const attrValue = row.getCell(attrStartColumn + 1 + i * 2).text?.trim();
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
          embeddedImageUrls: [
            ...(embeddedImageMap.get(rowNumber) || []),
            ...this.getWpsImageUrls(images, wpsImageMap),
          ],
          unit,
          safetyStock,
          isActive,
          attributes,
        });
      });
    } catch (error) {
      console.error('产品导入解析阶段异常:', error instanceof Error ? error.stack : error);
      throw error;
    }

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
   * 查找模板中的列号，兼容通用模板和类目专属模板。
   */
  private findColumnIndex(
    worksheet: ExcelJS.Worksheet,
    headerNames: string[],
    fallback: number,
    maxRow?: number,
  ): number {
    let columnIndex = fallback;
    const endRow = Math.max(1, maxRow ? maxRow - 1 : worksheet.rowCount);

    for (let rowNumber = 1; rowNumber <= endRow; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      row.eachCell((cell, colNumber) => {
        const text = String(cell.value ?? '').trim();
        if (text && headerNames.includes(text)) {
          columnIndex = colNumber;
        }
      });
    }

    return columnIndex;
  }

  private findImageColumns(worksheet: ExcelJS.Worksheet, dataStartRow: number): number[] {
    const imageColumns: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const column = this.findColumnIndex(worksheet, [`产品图片${i}`], 0, dataStartRow);
      if (column > 0) imageColumns.push(column);
    }

    if (imageColumns.length > 0) {
      return imageColumns;
    }

    const legacyColumn = this.findColumnIndex(
      worksheet,
      ['产品图片', '产品图片(URL)', '产品图片(最多5张)'],
      3,
      dataStartRow,
    );
    return [legacyColumn];
  }

  private isInImageColumns(startCol: number, endCol: number, imageColumns: number[]): boolean {
    return imageColumns.some((column) => startCol <= column && endCol >= column);
  }

  /**
   * 验证并保存单条产品数据
   */
  private async validateAndSaveProduct(
    dataRow: {
      name: string;
      categoryCode: string;
      code: string;
      images: string[];
      embeddedImageUrls?: string[];
      unit: string;
      safetyStock: string;
      isActive: string;
      attributes: Array<{ name: string; value: string }>;
    },
    tenantId: string,
  ): Promise<void> {
    const {
      name,
      categoryCode,
      code,
      images,
      embeddedImageUrls = [],
      unit,
      safetyStock,
      isActive,
      attributes,
    } = dataRow;

    if (!name) {
      throw new Error('产品名称不能为空');
    }
    if (!categoryCode) {
      throw new Error('类目不能为空');
    }
    if (!unit) {
      throw new Error('库存主单位不能为空');
    }

    const category = await this.categoryRepo.findOne({
      where: this.buildReadableCategoryWhere(tenantId, categoryCode),
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

    const inventoryUnit = await this.findUnitByText(unit, tenantId);
    if (!inventoryUnit) {
      throw new Error(`库存主单位 ${unit} 不存在或未启用`);
    }

    const status = this.parseImportStatus(isActive);

    let stock = 0;
    if (safetyStock && safetyStock !== '') {
      stock = Number(safetyStock);
      if (isNaN(stock)) {
        throw new Error('安全库存必须为数字');
      }
    }

    let imagesList = this.parseImageUrls(images);
    imagesList = [...imagesList, ...embeddedImageUrls];
    if (imagesList.length > 5) {
      throw new Error('产品图片最多只能上传5张');
    }

    const product = this.productRepo.create({
      name,
      code: productCode,
      categoryId: category.id,
      unitId: inventoryUnit.id,
      unit: inventoryUnit.symbol || inventoryUnit.name || inventoryUnit.code,
      safetyStock: stock,
      isActive: status,
      specs: Object.keys(specsObj).length > 0 ? specsObj : null,
      images: imagesList,
      tenantId,
    });

    await this.productRepo.save(product);
  }

  private async findUnitByText(value: string, tenantId: string) {
    const keyword = value.trim();
    if (!keyword) return null;

    const units = await this.unitRepo.find({
      where: [
        { id: keyword, tenantId, isActive: 1 },
        { id: keyword, tenantId: IsNull(), isActive: 1 },
        { code: keyword, tenantId, isActive: 1 },
        { code: keyword, tenantId: IsNull(), isActive: 1 },
        { name: keyword, tenantId, isActive: 1 },
        { name: keyword, tenantId: IsNull(), isActive: 1 },
        { symbol: keyword, tenantId, isActive: 1 },
        { symbol: keyword, tenantId: IsNull(), isActive: 1 },
      ],
      order: { tenantId: 'DESC', sortOrder: 'ASC', createdAt: 'ASC' },
    });

    return units[0] || null;
  }

  private parseImportStatus(value?: string): number {
    const status = value?.trim();
    if (!status) return 1;

    if (['是', '启用', '1', 'true', 'TRUE'].includes(status)) {
      return 1;
    }
    if (['否', '禁用', '0', 'false', 'FALSE'].includes(status)) {
      return 0;
    }

    throw new Error('状态只能选择 是 或 否');
  }

  private async uploadEmbeddedImages(
    worksheet: ExcelJS.Worksheet,
    imageColumns = [3],
    dataStartRow = 2,
  ): Promise<Map<number, string[]>> {
    const result = new Map<number, string[]>();
    const images = worksheet.getImages?.() || [];
    const workbook = (worksheet as any).workbook;
    console.log('Excel内嵌图片数量:', images.length);

    for (const image of images as any[]) {
      const range = image.range || {};
      const start = range.tl || range.ext?.tl || {};
      const end = range.br || range.ext?.br || start;
      const startRow = Math.floor((start.nativeRow ?? start.row ?? 0) + 1);
      const startCol = Math.floor((start.nativeCol ?? start.col ?? 0) + 1);
      const endCol = Math.floor((end.nativeCol ?? end.col ?? startCol - 1) + 1);

      // 只处理锚定在“产品图片”列且位于数据区的图片，避免把说明区图片误导入。
      if (!this.isInImageColumns(startCol, endCol, imageColumns) || startRow < dataStartRow)
        continue;

      const media = workbook?.getImage?.(image.imageId);
      if (!media?.buffer) continue;

      const extension = media.extension || 'png';
      const fileName = `product-import-${Date.now()}-${image.imageId}.${extension}`;
      let ossUrl: string;
      try {
        ossUrl = await this.ossService.putOssFile(`/product/import/${fileName}`, media.buffer);
      } catch (error) {
        console.error(
          `第${startRow}行产品图片上传失败:`,
          error instanceof Error ? error.message : error,
        );
        continue;
      }

      if (!ossUrl) {
        console.error(`第${startRow}行产品图片上传失败: OSS未返回图片地址`);
        continue;
      }

      if (!result.has(startRow)) result.set(startRow, []);
      result.get(startRow).push(ossUrl);
    }

    return result;
  }

  private parseImageUrls(images: string[] = []): string[] {
    return images.flatMap((image) => {
      if (!image || this.extractWpsDispImgIds(image).length > 0) {
        return [];
      }

      return image
        .split(',')
        .map((url) => url.trim())
        .filter((url) => url !== '');
    });
  }

  private getWpsImageUrls(images: string[] = [], wpsImageMap: Map<string, string>): string[] {
    const ids = images.flatMap((image) => this.extractWpsDispImgIds(image));
    if (ids.length === 0) return [];

    return ids.map((id) => wpsImageMap.get(id)).filter((url): url is string => Boolean(url));
  }

  private extractWpsDispImgIds(value?: string): string[] {
    if (!value || !value.includes('DISPIMG')) return [];

    const ids = new Set<string>();
    const matches = value.matchAll(/ID_[A-Za-z0-9]+/g);
    for (const match of matches) {
      ids.add(match[0]);
    }
    return Array.from(ids);
  }

  private async uploadWpsCellImages(fileBuffer: Buffer): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    try {
      const zip = await JSZip.loadAsync(fileBuffer);
      const files = Object.keys(zip.files);
      const xmlFileNames = files.filter((name) => name.endsWith('.xml'));
      const relFileNames = files.filter((name) => name.endsWith('.rels'));

      const relTargetMap = await this.parseXlsxRelTargets(zip, relFileNames);
      const wpsImageTargetMap = await this.parseWpsImageTargets(zip, xmlFileNames, relTargetMap);

      console.log('WPS单元格图片数量:', wpsImageTargetMap.size);

      for (const [imageId, imagePath] of wpsImageTargetMap.entries()) {
        const file = zip.file(imagePath);
        if (!file) continue;

        const buffer = await file.async('nodebuffer');
        const extension = path.extname(imagePath).replace('.', '') || 'png';
        const fileName = `product-import-wps-${Date.now()}-${imageId}.${extension}`;

        try {
          const ossUrl = await this.ossService.putOssFile(`/product/import/${fileName}`, buffer);
          if (ossUrl) result.set(imageId, ossUrl);
        } catch (error) {
          console.error(
            `WPS单元格图片 ${imageId} 上传失败:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    } catch (error) {
      console.error('WPS单元格图片解析失败:', error instanceof Error ? error.message : error);
    }

    return result;
  }

  private async parseXlsxRelTargets(
    zip: JSZip,
    relFileNames: string[],
  ): Promise<Map<string, Map<string, string>>> {
    const result = new Map<string, Map<string, string>>();

    for (const relFileName of relFileNames) {
      const file = zip.file(relFileName);
      if (!file) continue;

      const xml = await file.async('string');
      const sourceXmlPath = this.getRelSourceXmlPath(relFileName);
      const sourceDir = path.posix.dirname(sourceXmlPath);
      const targetMap = new Map<string, string>();
      const relMatches = xml.matchAll(
        /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*>/g,
      );

      for (const match of relMatches) {
        const [, relId, target] = match;
        targetMap.set(relId, path.posix.normalize(path.posix.join(sourceDir, target)));
      }

      result.set(sourceXmlPath, targetMap);
    }

    return result;
  }

  private async parseWpsImageTargets(
    zip: JSZip,
    xmlFileNames: string[],
    relTargetMap: Map<string, Map<string, string>>,
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    for (const xmlFileName of xmlFileNames) {
      const file = zip.file(xmlFileName);
      if (!file) continue;

      const xml = await file.async('string');
      if (!xml.includes('ID_') || !xml.includes('embed')) continue;

      const relationships = relTargetMap.get(xmlFileName);
      if (!relationships) continue;

      const picBlocks = xml.match(/<[^>]*pic\b[\s\S]*?<\/[^>]*pic>/g) || [xml];
      for (const block of picBlocks) {
        const imageId = block.match(/ID_[A-Za-z0-9]+/)?.[0];
        const relId = block.match(/\b(?:r:)?embed="([^"]+)"/)?.[1];
        const imagePath = relId ? relationships.get(relId) : undefined;

        if (imageId && imagePath && imagePath.startsWith('xl/media/')) {
          result.set(imageId, imagePath);
        }
      }
    }

    return result;
  }

  private getRelSourceXmlPath(relFileName: string): string {
    return relFileName.replace('/_rels/', '/').replace(/\.rels$/, '');
  }
}
