// src/modules/auth/services/system-seed.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../users/entities/user.entity';
import { Permission } from './permission.entity';
import { flattenPermissions } from '@/common/constants/permissions.constant';
import { Dictionary } from '@/modules/system/entities/dictionary.entity';
import { Unit } from '@/modules/unit/entities/unit.entity';
import { UnitCategory } from '@/common/constants/unit.constant';
import { Category } from '@/modules/product/entities/category.entity';
import { Attribute } from '@/modules/product/entities/attribute.entity';

@Injectable()
export class SystemSeedService implements OnModuleInit {
  private readonly logger = new Logger(SystemSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Dictionary)
    private readonly dictRepo: Repository<Dictionary>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Attribute)
    private readonly attributeRepo: Repository<Attribute>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // 等待 TypeORM 同步完成
    await this.dataSource.synchronize(false);
    await this.initPermissions();
    // await this.initPlatformAdmin();
    await this.initIndustryDicts();
  }
  /**
   * 初始化行业分类字典（仅首次插入）
   */
  private async initIndustryDicts() {
    const industryDicts = [
      {
        type: 'INDUSTRY',
        label: '金属制品业 (不锈钢、引出棒、紧固件)',
        value: 'C33',
        sort: 1,
        isActive: 1,
      },
      {
        type: 'INDUSTRY',
        label: '电气机械和器材制造 (电热元件、电加热管)',
        value: 'C38',
        sort: 2,
        isActive: 1,
      },
      {
        type: 'INDUSTRY',
        label: '通用设备制造业 (数控机床、机械零部件)',
        value: 'C34',
        sort: 3,
        isActive: 1,
      },
      {
        type: 'INDUSTRY',
        label: '专用设备制造业 (化工机械、食品机械)',
        value: 'C35',
        sort: 4,
        isActive: 1,
      },
      {
        type: 'INDUSTRY',
        label: '黑色金属冶炼和压延加工 (不锈钢型材)',
        value: 'C32',
        sort: 5,
        isActive: 1,
      },
      {
        type: 'INDUSTRY',
        label: '专业技术服务业 (工业设计、技术研发)',
        value: 'M74',
        sort: 6,
        isActive: 1,
      },
      {
        type: 'INDUSTRY',
        label: '批发业 (钢材贸易、物料分销)',
        value: 'F51',
        sort: 7,
        isActive: 1,
      },
      { type: 'INDUSTRY', label: '其他行业', value: 'OTHER', sort: 8, isActive: 1 },
    ];
    for (const dict of industryDicts) {
      const exist = await this.dictRepo.findOne({ where: { type: dict.type, value: dict.value } });
      if (!exist) {
        await this.dictRepo.save(this.dictRepo.create(dict));
        this.logger.log(`插入行业字典: ${dict.label}`);
      }
    }
    this.logger.log('行业分类字典初始化/同步完成');
  }

  /**
   * 初始化权限表，自动同步 PERMISSION_CONFIG
   */
  private async initPermissions() {
    const all = flattenPermissions();
    for (const item of all) {
      let exist = await this.permissionRepo.findOne({ where: { code: item.code } });
      if (!exist) {
        exist = this.permissionRepo.create({
          code: item.code,
          name: item.name,
          description: item.description || '',
          type: item.isMenu ? 'MENU' : 'API',
          parentId: 0, // 如有 parentCode 可自行扩展
        });
        await this.permissionRepo.save(exist);
        this.logger.log(`插入权限: ${item.code} - ${item.name}`);
      } else {
        // 可选：自动更新 name/desc/type
        exist.name = item.name;
        exist.description = item.description || '';
        exist.type = item.isMenu ? 'MENU' : 'API';
        await this.permissionRepo.save(exist);
        this.logger.log(`更新权限: ${item.code} - ${item.name}`);
      }
    }
    this.logger.log('权限表初始化/同步完成');
  }

  private async initPlatformAdmin() {
    const rootUsername = 'platform_admin'; // 你可以自定义上帝账号

    // 1. 检查是否已经存在
    let exists = await this.userRepo.findOne({
      where: { username: rootUsername },
    });

    // 如果存在但 isPlatformAdmin 不正确，删除重建
    if (exists && exists.isPlatformAdmin !== 1) {
      this.logger.warn(
        `⚠️ 检测到 ${rootUsername} 的 isPlatformAdmin 值异常 (${exists.isPlatformAdmin})，正在重新创建...`,
      );
      await this.userRepo.delete({ username: rootUsername });
      exists = null;
    }

    if (!exists) {
      this.logger.log('--- 🛡️ 正在初始化平台超级管理员 ---');

      const hashedPassword = await bcrypt.hash('Admin123456', 10); // 初始密码

      const superAdmin = this.userRepo.create({
        username: rootUsername,
        password: hashedPassword,
        realName: '默认',
        isPlatformAdmin: 1, // 标记为平台级
        tenantId: null, // 平台级管理员不属于任何租户
        isActive: 1,
      });

      const saved = await this.userRepo.save(superAdmin);
      this.logger.log(`✅ 平台管理员初始化成功: ${rootUsername} / Admin123456`);
      this.logger.log(
        `🔍 验证 isPlatformAdmin 值: ${saved.isPlatformAdmin} (类型: ${typeof saved.isPlatformAdmin})`,
      );
      this.logger.warn('请务必在首次登录后修改初始密码！');
    }
  }

  /**
   * 单位基础数据配置
   */
  private readonly BASE_UNITS = [
    // ===== 计数单位 =====
    {
      name: '个',
      code: 'PCS',
      category: UnitCategory.COUNT,
      baseRatio: 1,
      baseUnitCode: 'PCS',
      symbol: '个',
      sortOrder: 1,
    },
    {
      name: '件',
      code: 'PC',
      category: UnitCategory.COUNT,
      baseRatio: 1,
      baseUnitCode: 'PC',
      symbol: '件',
      sortOrder: 2,
    },
    {
      name: '箱',
      code: 'BOX',
      category: UnitCategory.COUNT,
      baseRatio: 1,
      baseUnitCode: 'BOX',
      symbol: '箱',
      sortOrder: 3,
    },
    {
      name: '包',
      code: 'PKG',
      category: UnitCategory.COUNT,
      baseRatio: 1,
      baseUnitCode: 'PKG',
      symbol: '包',
      sortOrder: 4,
    },
    {
      name: '套',
      code: 'SET',
      category: UnitCategory.COUNT,
      baseRatio: 1,
      baseUnitCode: 'SET',
      symbol: '套',
      sortOrder: 5,
    },
    {
      name: '组',
      code: 'GRP',
      category: UnitCategory.COUNT,
      baseRatio: 1,
      baseUnitCode: 'GRP',
      symbol: '组',
      sortOrder: 6,
    },
    {
      name: '对',
      code: 'PAIR',
      category: UnitCategory.COUNT,
      baseRatio: 1,
      baseUnitCode: 'PAIR',
      symbol: '对',
      sortOrder: 7,
    },
    {
      name: '打',
      code: 'DOZ',
      category: UnitCategory.COUNT,
      baseRatio: 12,
      baseUnitCode: 'PCS',
      symbol: '打',
      description: '1打 = 12个',
      sortOrder: 8,
    },

    // ===== 重量单位 =====
    {
      name: '千克',
      code: 'KG',
      category: UnitCategory.WEIGHT,
      baseRatio: 1,
      baseUnitCode: 'KG',
      symbol: 'kg',
      sortOrder: 11,
    },
    {
      name: '克',
      code: 'G',
      category: UnitCategory.WEIGHT,
      baseRatio: 0.001,
      baseUnitCode: 'KG',
      symbol: 'g',
      description: '1克 = 0.001千克',
      sortOrder: 12,
    },
    {
      name: '吨',
      code: 'T',
      category: UnitCategory.WEIGHT,
      baseRatio: 1000,
      baseUnitCode: 'KG',
      symbol: 't',
      description: '1吨 = 1000千克',
      sortOrder: 13,
    },
    {
      name: '毫克',
      code: 'MG',
      category: UnitCategory.WEIGHT,
      baseRatio: 0.000001,
      baseUnitCode: 'KG',
      symbol: 'mg',
      description: '1毫克 = 0.000001千克',
      sortOrder: 14,
    },
    {
      name: '斤',
      code: 'JIN',
      category: UnitCategory.WEIGHT,
      baseRatio: 0.5,
      baseUnitCode: 'KG',
      symbol: '斤',
      description: '1斤 = 0.5千克',
      sortOrder: 15,
    },

    // ===== 长度单位 =====
    {
      name: '米',
      code: 'M',
      category: UnitCategory.LENGTH,
      baseRatio: 1,
      baseUnitCode: 'M',
      symbol: 'm',
      sortOrder: 21,
    },
    {
      name: '厘米',
      code: 'CM',
      category: UnitCategory.LENGTH,
      baseRatio: 0.01,
      baseUnitCode: 'M',
      symbol: 'cm',
      description: '1厘米 = 0.01米',
      sortOrder: 22,
    },
    {
      name: '毫米',
      code: 'MM',
      category: UnitCategory.LENGTH,
      baseRatio: 0.001,
      baseUnitCode: 'M',
      symbol: 'mm',
      description: '1毫米 = 0.001米',
      sortOrder: 23,
    },
    {
      name: '千米',
      code: 'KM',
      category: UnitCategory.LENGTH,
      baseRatio: 1000,
      baseUnitCode: 'M',
      symbol: 'km',
      description: '1千米 = 1000米',
      sortOrder: 24,
    },
    {
      name: '英寸',
      code: 'IN',
      category: UnitCategory.LENGTH,
      baseRatio: 0.0254,
      baseUnitCode: 'M',
      symbol: 'in',
      description: '1英寸 = 0.0254米',
      sortOrder: 25,
    },

    // ===== 体积单位 =====
    {
      name: '升',
      code: 'L',
      category: UnitCategory.VOLUME,
      baseRatio: 1,
      baseUnitCode: 'L',
      symbol: 'L',
      sortOrder: 31,
    },
    {
      name: '毫升',
      code: 'ML',
      category: UnitCategory.VOLUME,
      baseRatio: 0.001,
      baseUnitCode: 'L',
      symbol: 'ml',
      description: '1毫升 = 0.001升',
      sortOrder: 32,
    },
    {
      name: '立方米',
      code: 'M3',
      category: UnitCategory.VOLUME,
      baseRatio: 1000,
      baseUnitCode: 'L',
      symbol: 'm³',
      description: '1立方米 = 1000升',
      sortOrder: 33,
    },
    {
      name: '立方厘米',
      code: 'CM3',
      category: UnitCategory.VOLUME,
      baseRatio: 0.001,
      baseUnitCode: 'L',
      symbol: 'cm³',
      description: '1立方厘米 = 0.001升',
      sortOrder: 34,
    },

    // ===== 面积单位 =====
    {
      name: '平方米',
      code: 'M2',
      category: UnitCategory.AREA,
      baseRatio: 1,
      baseUnitCode: 'M2',
      symbol: 'm²',
      sortOrder: 41,
    },
    {
      name: '平方厘米',
      code: 'CM2',
      category: UnitCategory.AREA,
      baseRatio: 0.0001,
      baseUnitCode: 'M2',
      symbol: 'cm²',
      description: '1平方厘米 = 0.0001平方米',
      sortOrder: 42,
    },
    {
      name: '平方千米',
      code: 'KM2',
      category: UnitCategory.AREA,
      baseRatio: 1000000,
      baseUnitCode: 'M2',
      symbol: 'km²',
      description: '1平方千米 = 1000000平方米',
      sortOrder: 43,
    },
    {
      name: '亩',
      code: 'MU',
      category: UnitCategory.AREA,
      baseRatio: 666.67,
      baseUnitCode: 'M2',
      symbol: '亩',
      description: '1亩 ≈ 666.67平方米',
      sortOrder: 44,
    },

    // ===== 时间单位 =====
    {
      name: '小时',
      code: 'H',
      category: UnitCategory.TIME,
      baseRatio: 1,
      baseUnitCode: 'H',
      symbol: 'h',
      sortOrder: 51,
    },
    {
      name: '天',
      code: 'D',
      category: UnitCategory.TIME,
      baseRatio: 24,
      baseUnitCode: 'H',
      symbol: '天',
      description: '1天 = 24小时',
      sortOrder: 52,
    },
    {
      name: '分钟',
      code: 'MIN',
      category: UnitCategory.TIME,
      baseRatio: 0.01667,
      baseUnitCode: 'H',
      symbol: 'min',
      description: '1分钟 ≈ 0.01667小时',
      sortOrder: 53,
    },
    {
      name: '月',
      code: 'MON',
      category: UnitCategory.TIME,
      baseRatio: 720,
      baseUnitCode: 'H',
      symbol: '月',
      description: '1月 ≈ 720小时（30天）',
      sortOrder: 54,
    },
  ];

  /**
   * 初始化基础单位数据（租户级别）
   */
  async initBaseUnits(tenantId: string) {
    for (const unitData of this.BASE_UNITS) {
      try {
        const exist = await this.unitRepo.findOne({
          where: { code: unitData.code, tenantId },
          withDeleted: true,
        });

        if (exist) {
          if (exist.deletedAt) {
            exist.deletedAt = null;
          }
          exist.name = unitData.name;
          exist.category = unitData.category;
          exist.baseRatio = unitData.baseRatio;
          exist.baseUnitCode = unitData.baseUnitCode;
          exist.symbol = unitData.symbol;
          exist.description = unitData.description;
          exist.sortOrder = unitData.sortOrder;
          exist.isActive = 1;
          await this.unitRepo.save(exist);
          this.logger.log(`[租户:${tenantId}] 更新单位: ${unitData.name} (${unitData.code})`);
        } else {
          const unit = this.unitRepo.create({
            ...unitData,
            tenantId,
            isActive: 1,
          });
          await this.unitRepo.save(unit);
          this.logger.log(`[租户:${tenantId}] 插入单位: ${unitData.name} (${unitData.code})`);
        }
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
          this.logger.warn(`[租户:${tenantId}] 单位 ${unitData.code} 已存在，跳过`);
        } else {
          this.logger.error(
            `[租户:${tenantId}] 处理单位 ${unitData.code} 时出错: ${error.message}`,
          );
        }
      }
    }
    this.logger.log(`[租户:${tenantId}] 基础单位数据初始化/同步完成`);
  }

  /**
   * 产品类目基础配置
   */
  private readonly BASE_CATEGORIES = [
    { name: '引出棒', code: 'LEAD_ROD' },
    { name: '电热管', code: 'HEATING_TUBE' },
    { name: '绝缘件', code: 'INSULATOR' },
    { name: '包装箱', code: 'PACKAGING_BOX' },
    { name: '紧固件', code: 'FASTENER' },
    { name: '不锈钢型材', code: 'STAINLESS_STEEL' },
    { name: '其他', code: 'OTHER' },
  ];

  /**
   * 初始化产品类目数据（租户级别）
   */
  async initProductCategories(tenantId: string) {
    for (const categoryData of this.BASE_CATEGORIES) {
      const exist = await this.categoryRepo.findOne({
        where: { code: categoryData.code, tenantId },
        withDeleted: true,
      });

      if (exist) {
        if (exist.deletedAt) {
          exist.deletedAt = null;
        }
        exist.name = categoryData.name;
        exist.isActive = 1;
        await this.categoryRepo.save(exist);
        this.logger.log(`[租户:${tenantId}] 更新类目: ${categoryData.name} (${categoryData.code})`);
      } else {
        const category = this.categoryRepo.create({
          ...categoryData,
          tenantId,
          isActive: 1,
        });
        await this.categoryRepo.save(category);
        this.logger.log(`[租户:${tenantId}] 插入类目: ${categoryData.name} (${categoryData.code})`);
      }
    }
    this.logger.log(`[租户:${tenantId}] 产品类目数据初始化/同步完成`);
  }

  /**
   * 产品属性基础配置
   */
  private readonly BASE_ATTRIBUTES = [
    // ===== 材质相关 =====
    {
      name: '材质',
      code: 'ATTR_CZ',
      type: 'select',
      unit: null,
      options: [
        { value: '304', sort: 1 },
        { value: '304L', sort: 2 },
        { value: '316', sort: 3 },
        { value: '316L', sort: 4 },
        { value: '321', sort: 5 },
        { value: '201', sort: 6 },
        { value: '202', sort: 7 },
        { value: '430', sort: 8 },
        { value: '碳钢', sort: 9 },
        { value: '铜', sort: 10 },
        { value: '铝', sort: 11 },
      ],
    },
    // ===== 直径相关 =====
    {
      name: '直径',
      code: 'ATTR_ZJ',
      type: 'number',
      unit: 'mm',
      options: [],
    },
    // ===== 长度相关 =====
    {
      name: '长度',
      code: 'ATTR_CC',
      type: 'number',
      unit: 'mm',
      options: [],
    },
    // ===== 厚度相关 =====
    {
      name: '厚度',
      code: 'ATTR_HD',
      type: 'number',
      unit: 'mm',
      options: [],
    },
    // ===== 宽度相关 =====
    {
      name: '宽度',
      code: 'ATTR_KD',
      type: 'number',
      unit: 'mm',
      options: [],
    },
    // ===== 功率相关 =====
    {
      name: '功率',
      code: 'ATTR_GL',
      type: 'number',
      unit: 'W',
      options: [],
    },
    // ===== 电压相关 =====
    {
      name: '电压',
      code: 'ATTR_DY',
      type: 'select',
      unit: 'V',
      options: [
        { value: '220V', sort: 1 },
        { value: '380V', sort: 2 },
        { value: '24V', sort: 3 },
        { value: '12V', sort: 4 },
        { value: '36V', sort: 5 },
        { value: '110V', sort: 6 },
      ],
    },
    // ===== 螺纹规格 =====
    {
      name: '螺纹规格',
      code: 'ATTR_LWGG',
      type: 'select',
      unit: null,
      options: [
        { value: 'M6', sort: 1 },
        { value: 'M8', sort: 2 },
        { value: 'M10', sort: 3 },
        { value: 'M12', sort: 4 },
        { value: 'M14', sort: 5 },
        { value: 'M16', sort: 6 },
        { value: 'M18', sort: 7 },
        { value: 'M20', sort: 8 },
        { value: '1/4"', sort: 9 },
        { value: '3/8"', sort: 10 },
        { value: '1/2"', sort: 11 },
        { value: '3/4"', sort: 12 },
      ],
    },
    // ===== 表面处理 =====
    {
      name: '表面处理',
      code: 'ATTR_BMCL',
      type: 'select',
      unit: null,
      options: [
        { value: '抛光', sort: 1 },
        { value: '酸洗', sort: 2 },
        { value: '电解', sort: 3 },
        { value: '镀锌', sort: 4 },
        { value: '喷塑', sort: 5 },
        { value: '不处理', sort: 6 },
      ],
    },
    // ===== 颜色 =====
    {
      name: '颜色',
      code: 'ATTR_YS',
      type: 'select',
      unit: null,
      options: [
        { value: '银色', sort: 1 },
        { value: '金色', sort: 2 },
        { value: '黑色', sort: 3 },
        { value: '白色', sort: 4 },
        { value: '红色', sort: 5 },
        { value: '蓝色', sort: 6 },
        { value: '绿色', sort: 7 },
        { value: '黄色', sort: 8 },
      ],
    },
    // ===== 型号 =====
    {
      name: '型号',
      code: 'ATTR_XH',
      type: 'input',
      unit: null,
      options: [],
    },
    // ===== 品牌 =====
    {
      name: '品牌',
      code: 'ATTR_PP',
      type: 'input',
      unit: null,
      options: [],
    },
  ];

  /**
   * 初始化产品属性数据（租户级别）
   */
  async initProductAttributes(tenantId: string) {
    for (const attrData of this.BASE_ATTRIBUTES) {
      const exist = await this.attributeRepo.findOne({
        where: { code: attrData.code, tenantId },
        relations: ['options'],
        withDeleted: true,
      });

      if (exist) {
        // 恢复软删除的记录
        if (exist.deletedAt) {
          exist.deletedAt = null;
        }
        exist.name = attrData.name;
        exist.type = attrData.type;
        exist.unit = attrData.unit;
        exist.isActive = 1;

        // 同步选项数据
        if (attrData.options && attrData.options.length > 0) {
          exist.options = exist.options || [];
          const existingOptions = exist.options;

          for (const optData of attrData.options) {
            const optExist = existingOptions.find((o) => o.value === optData.value);
            if (!optExist) {
              const newOption = {
                value: optData.value,
                sort: optData.sort,
                isActive: 1,
                attributeId: exist.id,
                tenantId,
                id: undefined,
                createdAt: undefined,
                updatedAt: undefined,
                attribute: undefined,
              };
              exist.options.push(newOption as any);
              this.logger.log(
                `  [租户:${tenantId}] 添加属性选项: ${attrData.name} - ${optData.value}`,
              );
            } else {
              optExist.sort = optData.sort;
              optExist.isActive = 1;
            }
          }
        }

        await this.attributeRepo.save(exist);
        this.logger.log(`[租户:${tenantId}] 更新属性: ${attrData.name} (${attrData.code})`);
      } else {
        const attribute = this.attributeRepo.create({
          name: attrData.name,
          code: attrData.code,
          type: attrData.type,
          unit: attrData.unit,
          tenantId,
          isActive: 1,
          options: [],
        });

        // 添加选项
        if (attrData.options && attrData.options.length > 0) {
          for (const optData of attrData.options) {
            attribute.options.push({
              value: optData.value,
              sort: optData.sort,
              isActive: 1,
              tenantId,
              attribute: attribute as any,
            } as any);
          }
        }

        await this.attributeRepo.save(attribute);
        this.logger.log(
          `[租户:${tenantId}] 插入属性: ${attrData.name} (${attrData.code})${attrData.options?.length ? ` - ${attrData.options.length}个选项` : ''}`,
        );
      }
    }
    this.logger.log(`[租户:${tenantId}] 产品属性数据初始化/同步完成`);
  }
}
