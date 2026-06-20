import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Not, In } from 'typeorm';

import { BusinessException } from '@/common/filters/business.exception';
import { Category } from './entities/category.entity';
import { QueryProductDto } from './entities/dto/query-product.dto';
import { SaveProductDto } from './entities/dto/save-product.dto';
import { Product } from './product.entity';
import { Unit } from '../unit/entities/unit.entity';
import { UnitConversion } from '../unit/entities/unit-conversion.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryTransaction } from '../inventory/entities/inventory-transaction.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Unit) private readonly unitRepo: Repository<Unit>,
    @InjectRepository(UnitConversion) private readonly unitConversionRepo: Repository<UnitConversion>,
    @InjectRepository(Inventory) private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryTransaction) private readonly inventoryTransactionRepo: Repository<InventoryTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 通用 SKU 生成策略：时间戳 + 4位随机数
   * 简短且唯一，不依赖类目和属性
   */
  private generateSkuCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase(); // 转为36进制并大写
    const random = Math.floor(1000 + Math.random() * 9000); // 4位随机数
    return `SKU-${timestamp}-${random}`;
  }

  private normalizeBarcode(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized.toUpperCase() : null;
  }

  /** 新增产品 */
  async save(dto: SaveProductDto, tenantId: string) {
    const category = await this.validateCategory(dto.categoryId, tenantId);
    const unit = await this.validateUnit(dto.unitId, tenantId);
    dto.specs = this.normalizeAndValidateSpecs(category, dto.specs || {});

    // 如果未传编码，则自动生成通用SKU
    if (!dto.code) {
      dto.code = this.generateSkuCode();
    }
    dto.barcode = this.normalizeBarcode(dto.barcode) || dto.code;

    const exists = await this.productRepo.findOne({ where: { code: dto.code, tenantId } });
    if (exists) throw new BusinessException(`产品编码 ${dto.code} 已存在`);

    const barcodeExists = await this.productRepo.findOne({
      where: { barcode: dto.barcode, tenantId },
    });
    if (barcodeExists) throw new BusinessException(`产品条形码 ${dto.barcode} 已存在`);

    const product = this.productRepo.create({
      ...dto,
      tenantId,
      unit: unit.symbol || unit.name || unit.code,
    });
    const saved = await this.productRepo.save(product);
    return this.getDetail(saved.id, tenantId);
  }

  /** 更新产品 */
  async update(dto: SaveProductDto, tenantId: string) {
    if (!dto.id) throw new BusinessException('缺少产品ID');

    const product = await this.productRepo.findOne({ where: { id: dto.id, tenantId } });
    if (!product) throw new BusinessException('产品不存在');
    const category = await this.validateCategory(dto.categoryId, tenantId);
    const unit = await this.validateUnit(dto.unitId, tenantId);
    dto.specs = this.normalizeAndValidateSpecs(category, dto.specs || {});

    const exists = await this.productRepo.findOne({
      where: { code: dto.code || product.code, tenantId, id: Not(dto.id) },
    });
    if (exists) throw new BusinessException(`产品编码 ${dto.code || product.code} 已存在`);

    dto.barcode = this.normalizeBarcode(dto.barcode) || product.barcode || dto.code || product.code;
    const barcodeExists = await this.productRepo.findOne({
      where: { barcode: dto.barcode, tenantId, id: Not(dto.id) },
    });
    if (barcodeExists) throw new BusinessException(`产品条形码 ${dto.barcode} 已存在`);

    if (product.unitId !== dto.unitId) {
      await this.assertProductUnitCanChange(product, tenantId);
    }

    dto.unit = unit.symbol || unit.name || unit.code;

    // 对称赋值
    Object.assign(product, dto);
    const updated = await this.productRepo.save(product);
    return this.getDetail(updated.id, tenantId);
  }

  /** 分页查询：支持类目联动筛选 */
  async findPage(query: QueryProductDto, tenantId: string) {
    const { page = 1, pageSize = 20, keyword, categoryId, isActive } = query;
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('c.attributes', 'attrs')
      .leftJoinAndSelect('p.inventoryUnit', 'unit')
      .where('p.tenantId = :tenantId', { tenantId });

    if (keyword) {
      qb.andWhere('(p.name LIKE :kw OR p.code LIKE :kw OR p.barcode LIKE :kw)', { kw: `%${keyword}%` });
    }
    if (categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId });
    }
    if (isActive !== undefined) {
      qb.andWhere('p.isActive = :isActive', { isActive });
    }

    const [list, total] = await qb
      .orderBy('p.createdAt', 'DESC') // 列表无排序字段，按时间倒序
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  // src/modules/product/service/products.service.ts

  /**
   * 获取产品详情 (对称结构优化)
   * 确保返回字段与 SaveProductDto 完全一致
   */
  async getDetail(id: string, tenantId: string) {
    // 1. 查询产品及必要关联
    const product = await this.productRepo.findOne({
      where: { id, tenantId },
      relations: ['category', 'inventoryUnit'], // 加载类目和库存主单位
    });

    if (!product) throw new BusinessException('产品不存在');

    // 2. 构建对称返回结构
    // 显式提取字段，确保 categoryId 以字符串形式存在于顶层
    const { category, inventoryUnit, ...baseInfo } = product;
    const [stockSummary, transactionCount, conversionRules] = await Promise.all([
      this.getProductStockSummary(product.code, tenantId),
      this.inventoryTransactionRepo.count({ where: { tenantId, sku: product.code } }),
      this.getUnitConversionRules(inventoryUnit?.code, tenantId),
    ]);

    const canChangeUnit = stockSummary.inventoryRows === 0 && transactionCount === 0;

    return {
      ...baseInfo,
      /**
       * 对称性处理：
       * 1. categoryId: 前端 Form 提交时需要字符串 ID，而不是整个对象
       * 2. specs: TypeORM 会自动处理 MySQL JSON 反序列化，此处已是对象
       * 3. images: 此处已是数组格式，方便 Upload 组件回显
       */
      categoryId: product.categoryId,
      // 如果之后需要在列表展示类目名称，可以保留 category 对象，但 categoryId 必须在顶层
      categoryName: category?.name,
      unitId: product.unitId,
      unitCode: inventoryUnit?.code,
      unitName: inventoryUnit?.name,
      unitSymbol: inventoryUnit?.symbol || inventoryUnit?.name || inventoryUnit?.code,
      inventoryUnit,
      stockSummary: {
        ...stockSummary,
        transactionRows: transactionCount,
        availableQuantity: stockSummary.quantity - stockSummary.lockedQuantity,
        unitId: product.unitId,
        unitCode: inventoryUnit?.code || null,
        unitName: inventoryUnit?.name || null,
        unitSymbol: inventoryUnit?.symbol || inventoryUnit?.name || inventoryUnit?.code || null,
      },
      canChangeUnit,
      unitChangeLockedReason: canChangeUnit ? null : '该产品已有库存或库存流水，不能修改库存主单位',
      conversionRules,
    };
  }

  async getByBarcode(barcode: string, tenantId: string) {
    const normalizedBarcode = this.normalizeBarcode(barcode);
    if (!normalizedBarcode) throw new BusinessException('条形码不能为空');
    const product = await this.productRepo.findOne({
      where: { barcode: normalizedBarcode, tenantId },
      relations: ['category', 'inventoryUnit'],
    });
    if (!product) throw new BusinessException(`条形码 ${normalizedBarcode} 对应的产品不存在`);
    return this.getDetail(product.id, tenantId);
  }

  async findPublicPage(query: QueryProductDto, tenantId: string) {
    const result = await this.findPage({ ...query, isActive: 1 }, tenantId);
    return {
      ...result,
      list: result.list.map((product) => this.toPublicProduct(product)),
    };
  }

  async getPublicDetail(id: string, tenantId: string) {
    const product = await this.getDetail(id, tenantId);
    if (product.isActive !== 1) {
      throw new BusinessException('产品暂未开放展示');
    }
    return this.toPublicProduct(product);
  }
  /**
   * 修改产品状态 (1:启用, 0:禁用)
   */
  async updateStatus(id: string, isActive: number, tenantId: string) {
    const product = await this.productRepo.findOne({ where: { id, tenantId } });
    if (!product) throw new BusinessException('产品不存在');

    await this.productRepo.update({ id, tenantId }, { isActive });
    return { message: '状态已更新' };
  }

  /**
   * 删除产品 (伪删除)
   * 使用 softRemove，TypeORM 会自动填充 deletedAt 字段
   */
  async delete(id: string, tenantId: string) {
    const product = await this.productRepo.findOne({ where: { id, tenantId } });
    if (!product) throw new BusinessException('产品不存在');

    // 执行软删除，保留业务轨迹
    await this.productRepo.softRemove(product);
    return { message: '产品已移入回收站' };
  }

  private async validateCategory(categoryId: string, tenantId: string) {
    const category = await this.categoryRepo.findOne({
      where: [
        { id: categoryId, tenantId },
        { id: categoryId, tenantId: IsNull() },
      ],
      relations: ['attributes', 'attributes.options'],
    });
    if (!category) throw new BusinessException('所选类目不存在或无权使用');
    if (category.isActive !== 1) throw new BusinessException('所选类目已禁用');
    return category;
  }

  private async validateUnit(unitId: string, tenantId: string) {
    const unit = await this.unitRepo.findOne({
      where: [
        { id: unitId, tenantId },
        { id: unitId, tenantId: IsNull() },
      ],
    });
    if (!unit) throw new BusinessException('所选库存主单位不存在或无权使用');
    if (unit.isActive !== 1) throw new BusinessException('所选库存主单位已禁用');
    return unit;
  }

  private async assertProductUnitCanChange(product: Product, tenantId: string) {
    const [inventoryRows, transactionRows] = await Promise.all([
      this.dataSource.query(
        'SELECT COUNT(*) AS total FROM inventory WHERE tenantId = ? AND sku = ?',
        [tenantId, product.code],
      ),
      this.dataSource.query(
        'SELECT COUNT(*) AS total FROM inventory_transactions WHERE tenantId = ? AND sku = ?',
        [tenantId, product.code],
      ),
    ]);

    if (
      Number(inventoryRows?.[0]?.total || 0) > 0 ||
      Number(transactionRows?.[0]?.total || 0) > 0
    ) {
      throw new BusinessException('该产品已有库存或库存流水，不能修改库存主单位');
    }
  }

  private async getProductStockSummary(sku: string, tenantId: string) {
    const row = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .where('inventory.tenantId = :tenantId', { tenantId })
      .andWhere('inventory.sku = :sku', { sku })
      .select('COUNT(inventory.id)', 'inventoryRows')
      .addSelect('COALESCE(SUM(inventory.quantity), 0)', 'quantity')
      .addSelect('COALESCE(SUM(inventory.lockedQuantity), 0)', 'lockedQuantity')
      .getRawOne<{
        inventoryRows: string;
        quantity: string;
        lockedQuantity: string;
      }>();

    return {
      inventoryRows: Number(row?.inventoryRows || 0),
      quantity: Number(row?.quantity || 0),
      lockedQuantity: Number(row?.lockedQuantity || 0),
    };
  }

  private async getUnitConversionRules(unitCode: string | undefined, tenantId: string) {
    if (!unitCode) return [];

    const rules = await this.unitConversionRepo.find({
      where: { tenantId, toUnitCode: unitCode },
      order: { createdAt: 'ASC' },
    });
    if (rules.length === 0) return [];

    const fromUnitCodes = rules.map((rule) => rule.fromUnitCode);
    const fromUnits = await this.unitRepo.find({
      where: [
        { tenantId, code: In(fromUnitCodes) },
        { tenantId: IsNull(), code: In(fromUnitCodes) },
      ],
    });
    const fromUnitMap = new Map(fromUnits.map((unit) => [unit.code, unit]));

    return rules.map((rule) => {
      const fromUnit = fromUnitMap.get(rule.fromUnitCode);
      return {
        id: rule.id,
        fromUnitCode: rule.fromUnitCode,
        fromUnitName: fromUnit?.name || rule.fromUnitCode,
        fromUnitSymbol: fromUnit?.symbol || fromUnit?.name || rule.fromUnitCode,
        toUnitCode: rule.toUnitCode,
        ratio: Number(rule.ratio),
      };
    });
  }

  private normalizeAndValidateSpecs(category: Category, specs: Record<string, any>) {
    const attributes = category.attributes || [];
    if (attributes.length === 0) return specs || {};

    const normalized: Record<string, any> = {};
    for (const attr of attributes) {
      const key = attr.code || attr.name;
      const rawValue = specs?.[key] ?? specs?.[attr.name];
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        throw new BusinessException(`请填写规格属性：${attr.name}`);
      }

      if (attr.type === 'select') {
        const options = (attr.options || [])
          .filter((option) => option.isActive === 1)
          .map((option) => option.value);
        if (options.length > 0 && !options.includes(String(rawValue))) {
          throw new BusinessException(`规格属性「${attr.name}」的值不在可选范围内`);
        }
        normalized[key] = String(rawValue);
      } else if (attr.type === 'number') {
        const value = Number(rawValue);
        if (Number.isNaN(value)) {
          throw new BusinessException(`规格属性「${attr.name}」必须是数字`);
        }
        normalized[key] = value;
      } else {
        normalized[key] = String(rawValue).trim();
      }
    }

    return normalized;
  }

  private toPublicProduct(product: any) {
    return {
      id: product.id,
      tenantId: product.tenantId,
      name: product.name,
      code: product.code,
      barcode: product.barcode || product.code,
      categoryId: product.categoryId,
      categoryName: product.categoryName || product.category?.name || null,
      unit: product.unit,
      unitId: product.unitId,
      unitCode: product.unitCode || product.inventoryUnit?.code || null,
      unitName: product.unitName || product.inventoryUnit?.name || null,
      unitSymbol: product.unitSymbol || product.inventoryUnit?.symbol || null,
      description: product.description || '',
      specs: product.specs || {},
      images: Array.isArray(product.images) ? product.images : [],
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * 获取产品下拉选择列表
   * 返回格式：{ label: string, value: string }[]
   */
  async selectList(tenantId: string, keyword?: string) {
    const query = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.inventoryUnit', 'inventoryUnit')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.isActive = :isActive', { isActive: 1 });

    if (keyword) {
      query.andWhere('(p.name LIKE :kw OR p.code LIKE :kw OR p.barcode LIKE :kw)', { kw: `%${keyword}%` });
    }

    const products = await query.orderBy('p.name', 'ASC').getMany();

    return products.map((p) => ({
      label: `${p.name} (${p.code})`,
      value: p.code, // 使用 code (SKU) 作为 value
      id: p.id,
      name: p.name,
      code: p.code,
      barcode: p.barcode || p.code,
      unitId: p.unitId,
      unitCode: p.inventoryUnit?.code || null,
      unitName: p.inventoryUnit?.name || null,
      unitSymbol: p.inventoryUnit?.symbol || p.inventoryUnit?.name || p.inventoryUnit?.code || null,
      unitCategory: p.inventoryUnit?.category || null,
    }));
  }
}
