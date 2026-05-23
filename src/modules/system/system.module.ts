import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DictionariesController } from './controller/dictionaries.controller';
import { DepartmentsController } from './controller/departments.controller';
import { PostsController } from './controller/posts.controller';
import { DictionariesService } from './service/dictionaries.service';
import { DepartmentsService } from './service/departments.service';
import { PostsService } from './service/posts.service';
import { Dictionary } from './entities/dictionary.entity';
import { Department } from './entities/department.entity';
import { Post } from './entities/post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dictionary, Department, Post])],
  controllers: [DictionariesController, DepartmentsController, PostsController],
  providers: [DictionariesService, DepartmentsService, PostsService],
  exports: [DictionariesService, DepartmentsService, PostsService],
})
export class SystemModule {}
