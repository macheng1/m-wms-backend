import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AttributesController } from './attributes.controller';
import { AttributesService } from '../service/attributes.service';

describe('AttributesController (e2e)', () => {
  let app: INestApplication;
  const mockService = {
    findPage: jest.fn().mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 }),
    save: jest.fn().mockResolvedValue({ id: '1' }),
    update: jest.fn().mockResolvedValue({ id: '1' }),
    getDetail: jest.fn().mockResolvedValue({ id: '1', name: '材质', code: 'ATTR_CZ_1234' }),
    delete: jest.fn().mockResolvedValue({ message: '已移入回收站' }),
    updateStatus: jest.fn().mockResolvedValue({ message: '已启用' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AttributesController],
      providers: [{ provide: AttributesService, useValue: mockService }],
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

  it('/attributes/page (GET)', () => {
    return request(app.getHttpServer())
      .get('/attributes/page')
      .set('user', JSON.stringify({ tenantId: 't1' }))
      .expect(200)
      .expect({ list: [], total: 0, page: 1, pageSize: 20 });
  });

  it('/attributes/save (POST)', () => {
    return request(app.getHttpServer())
      .post('/attributes/save')
      .send({ name: '材质', code: 'ATTR_CZ_1234', type: 'select' })
      .set('user', JSON.stringify({ tenantId: 't1' }))
      .expect(201)
      .expect({ id: '1' });
  });

  it('/attributes/update (POST)', () => {
    return request(app.getHttpServer())
      .post('/attributes/update')
      .send({ id: '1', name: '材质', code: 'ATTR_CZ_1234', type: 'select' })
      .set('user', JSON.stringify({ tenantId: 't1' }))
      .expect(201)
      .expect({ id: '1' });
  });

  it('/attributes/detail (GET)', () => {
    return request(app.getHttpServer())
      .get('/attributes/detail?id=1')
      .set('user', JSON.stringify({ tenantId: 't1' }))
      .expect(200)
      .expect({ id: '1', name: '材质', code: 'ATTR_CZ_1234' });
  });

  it('/attributes/delete (POST)', () => {
    return request(app.getHttpServer())
      .post('/attributes/delete')
      .send({ id: '1' })
      .set('user', JSON.stringify({ tenantId: 't1' }))
      .expect(201)
      .expect({ message: '已移入回收站' });
  });

  it('/attributes/status (POST)', () => {
    return request(app.getHttpServer())
      .post('/attributes/status')
      .send({ id: '1', isActive: 1 })
      .set('user', JSON.stringify({ tenantId: 't1' }))
      .expect(201)
      .expect({ message: '已启用' });
  });

  afterAll(async () => {
    await app.close();
  });
});
