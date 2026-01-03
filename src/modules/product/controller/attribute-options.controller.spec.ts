// 全局 mock JwtAuthGuard，避免依赖注入问题
jest.mock('@/common/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class {
    canActivate() {
      return true;
    }
  },
}));
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { OptionsController } from './attribute-options.controller';
import { OptionsService } from '../service/attributes-option.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

describe('OptionsController (e2e)', () => {
  let app: INestApplication;
  const mockService = {
    findPage: jest.fn().mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 }),
    save: jest.fn().mockResolvedValue({ id: '1' }),
    getDetail: jest.fn().mockResolvedValue({ id: '1', value: '304', sort: 1 }),
    delete: jest.fn().mockResolvedValue({ message: '已移入回收站' }),
    updateStatus: jest.fn().mockResolvedValue({ message: '已启用' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OptionsController],
      providers: [
        { provide: OptionsService, useValue: mockService },
        { provide: JwtAuthGuard, useValue: { canActivate: jest.fn().mockReturnValue(true) } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    // mock req.user
    app.use((req, res, next) => {
      try {
        const userHeader = req.headers['user'];
        if (userHeader) {
          req.user = JSON.parse(userHeader);
        }
      } catch {}
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  it('/options/page (GET)', () => {
    return request(app.getHttpServer())
      .get('/options/page')
      .set('user', JSON.stringify({ tenantId: 't1' }))
      .expect(200)
      .expect({ list: [], total: 0, page: 1, pageSize: 20 });
  });

  it('/options/save (POST)', () => {
    return request(app.getHttpServer())
      .post('/options/save')
      .send({ value: '304' })
      .set('user', JSON.stringify({ tenantId: 't1' }))
      .expect(201)
      .expect({ id: '1' });
  });

  it('/options/update (POST)', () => {
    return request(app.getHttpServer())
      .post('/options/update')
      .send({ id: '1', value: '304' })
      .set('user', JSON.stringify({ tenantId: 't1' }))
      .expect(201)
      .expect({ id: '1' });
  });

  it('/options/detail (GET)', () => {
    return request(app.getHttpServer())
      .get('/options/detail?id=1')
      .set('user', JSON.stringify({ tenantId: 't1' }))
      .expect(200)
      .expect({ id: '1', value: '304', sort: 1 });
  });

  it('/options/delete (POST)', () => {
    return request(app.getHttpServer())
      .post('/options/delete')
      .send({ id: '1' })
      .set('user', JSON.stringify({ tenantId: 't1' }))
      .expect(201)
      .expect({ message: '已移入回收站' });
  });

  it('/options/status (POST)', () => {
    return request(app.getHttpServer())
      .post('/options/status')
      .send({ id: '1', isActive: 1 })
      .set('user', JSON.stringify({ tenantId: 't1' }))
      .expect(201)
      .expect({ message: '已启用' });
  });

  afterAll(async () => {
    await app.close();
  });
});
