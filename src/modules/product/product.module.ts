// src/modules/product/product.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// 规格与属性
import { OptionsController } from './controller/attribute-options.controller';
import { OptionsService } from './service/attributes-option.service';
import { AttributeOption } from './entities/attribute-option.entity';
import { Attribute } from './entities/attribute.entity';
import { AttributesController } from './controller/attributes.controller';
import { AttributesService } from './service/attributes.service';
import { AttributeImportService } from './service/attribute-import.service';
import { ProductImportService } from './service/product-import.service';

// --- 新增：类目相关导入 ---
import { Category } from './entities/category.entity';
import { CategoriesController } from './controller/categories.controller';
import { CategoriesService } from './service/categories.service';
import { Product } from './product.entity';
import { ProductsController } from './product.controller';
import { ProductsService } from './product.service';

@Module({
  imports: [
    // 1. 在 TypeOrmModule 中注册 Category 实体
    TypeOrmModule.forFeature([AttributeOption, Attribute, Category, Product]),
  ],
  controllers: [
    OptionsController,
    AttributesController,
    CategoriesController, // 2. 注册类目控制器
    ProductsController,
  ],
  providers: [
    OptionsService,
    AttributesService,
    AttributeImportService,
    CategoriesService, // 3. 注册类目服务
    ProductsService,
    ProductImportService,
  ],
  exports: [
    OptionsService,
    AttributesService,
    CategoriesService,
    ProductsService, // 4. 导出服务，方便其他模块（如库存、入库单）调用
  ],
})
export class ProductModule {}
