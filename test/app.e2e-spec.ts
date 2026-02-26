import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { UserRole } from '../src/users/entities/user.entity';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exeption.filter';
import { DataSource } from 'typeorm';

describe('App E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let workerToken: string;
  let adminUserId: string;
  let workerUserId: string;
  let taskId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    // Clear database before tests
    if (dataSource && dataSource.isInitialized) {
      await dataSource.query('DELETE FROM "task"');
      await dataSource.query('DELETE FROM "user"');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================
  // AUTHENTICATION E2E TESTS
  // ============================================

  describe('Authentication Flow (POST /api/auth)', () => {
    describe('Sign Up - POST /api/auth/signup', () => {
      it('should register a new admin user', () => {
        return request(app.getHttpServer())
          .post('/api/auth/signup')
          .send({
            username: 'admin_user',
            password: 'AdminPass123!',
            role: UserRole.ADMIN,
          })
          .expect(201);
      });

      it('should register a new worker user', () => {
        return request(app.getHttpServer())
          .post('/api/auth/signup')
          .send({
            username: 'worker_user',
            password: 'WorkerPass123!',
            role: UserRole.WORKER,
          })
          .expect(201);
      });

      it('should fail with weak password', () => {
        return request(app.getHttpServer())
          .post('/api/auth/signup')
          .send({
            username: 'test_user',
            password: '123',
            role: UserRole.WORKER,
          })
          .expect(400);
      });

      it('should fail with short username', () => {
        return request(app.getHttpServer())
          .post('/api/auth/signup')
          .send({
            username: 'ab',
            password: 'ValidPass123!',
            role: UserRole.WORKER,
          })
          .expect(400);
      });

      it('should fail on duplicate username', () => {
        return request(app.getHttpServer())
          .post('/api/auth/signup')
          .send({
            username: 'admin_user',
            password: 'AnotherPass123!',
            role: UserRole.WORKER,
          })
          .expect(409);
      });
    });

    describe('Sign In - POST /api/auth/signin', () => {
      it('should successfully login admin user', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/signin')
          .send({
            username: 'admin_user',
            password: 'AdminPass123!',
          })
          .expect(200);

        expect(response.body.data.accessToken).toBeDefined();
        adminToken = response.body.data.accessToken;
      });

      it('should successfully login worker user', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/signin')
          .send({
            username: 'worker_user',
            password: 'WorkerPass123!',
          })
          .expect(200);

        expect(response.body.data.accessToken).toBeDefined();
        workerToken = response.body.data.accessToken;
      });

      it('should fail with wrong password', () => {
        return request(app.getHttpServer())
          .post('/api/auth/signin')
          .send({
            username: 'admin_user',
            password: 'WrongPassword123!',
          })
          .expect(401);
      });

      it('should fail with non-existent user', () => {
        return request(app.getHttpServer())
          .post('/api/auth/signin')
          .send({
            username: 'nonexistent_user',
            password: 'SomePassword123!',
          })
          .expect(401);
      });
    });
  });

  // ============================================
  // USERS E2E TESTS
  // ============================================

  describe('Users Management (GET /api/users)', () => {
    describe('Get Current User - GET /api/users/me', () => {
      it('should return current user profile with valid token (Admin)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/users/me')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('username', 'admin_user');
        expect(response.body.data).toHaveProperty('role', UserRole.ADMIN);
        adminUserId = response.body.data.id;
      });

      it('should return current user profile with valid token (Worker)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/users/me')
          .set('Authorization', `Bearer ${workerToken}`)
          .expect(200);

        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('username', 'worker_user');
        expect(response.body.data).toHaveProperty('role', UserRole.WORKER);
        workerUserId = response.body.data.id;
      });

      it('should fail without authorization token', () => {
        return request(app.getHttpServer()).get('/api/users/me').expect(401);
      });

      it('should fail with invalid token', () => {
        return request(app.getHttpServer())
          .get('/api/users/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });

    describe('Get All Users - GET /api/users', () => {
      it('should allow ADMIN to view all users', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      });

      it('should deny WORKER to view all users', () => {
        return request(app.getHttpServer())
          .get('/api/users')
          .set('Authorization', `Bearer ${workerToken}`)
          .expect(403);
      });
    });

    describe('Get User by ID - GET /api/users/:id', () => {
      it('should allow ADMIN to view specific user', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/users/${workerUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.data.id).toBe(workerUserId);
        expect(response.body.data.username).toBe('worker_user');
      });

      it('should deny WORKER to view other users', () => {
        return request(app.getHttpServer())
          .get(`/api/users/${adminUserId}`)
          .set('Authorization', `Bearer ${workerToken}`)
          .expect(403);
      });

      it('should return 404 for non-existent user', () => {
        return request(app.getHttpServer())
          .get('/api/users/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });

    describe('Update User Role - PATCH /api/users/:id/role', () => {
      it('should allow ADMIN to update user role', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/users/${workerUserId}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: UserRole.ADMIN })
          .expect(200);

        expect(response.body.data.role).toBe(UserRole.ADMIN);

        // Revert the role back to WORKER for subsequent tests
        await request(app.getHttpServer())
          .patch(`/api/users/${workerUserId}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: UserRole.WORKER })
          .expect(200);
      });

      it('should deny WORKER to update user roles', async () => {
        // Create a separate worker user for this test
        await request(app.getHttpServer())
          .post('/api/auth/signup')
          .send({
            username: 'test_worker_update',
            password: 'TestPass123!',
            role: UserRole.WORKER,
          })
          .expect(201);

        const loginResponse = await request(app.getHttpServer())
          .post('/api/auth/signin')
          .send({
            username: 'test_worker_update',
            password: 'TestPass123!',
          })
          .expect(200);

        const testWorkerToken = loginResponse.body.data.accessToken;

        const meResponse = await request(app.getHttpServer())
          .get('/api/users/me')
          .set('Authorization', `Bearer ${testWorkerToken}`)
          .expect(200);

        const testWorkerId = meResponse.body.data.id;

        return request(app.getHttpServer())
          .patch(`/api/users/${testWorkerId}/role`)
          .set('Authorization', `Bearer ${testWorkerToken}`)
          .send({ role: UserRole.WORKER })
          .expect(403);
      });

      it('should fail with invalid role value', () => {
        return request(app.getHttpServer())
          .patch(`/api/users/${workerUserId}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'INVALID_ROLE' })
          .expect(400);
      });
    });
  });

  // ============================================
  // TASKS E2E TESTS
  // ============================================

  describe('Task Management (GET/POST /api/tasks)', () => {
    describe('Get Tasks - GET /api/tasks', () => {
      it('should allow authenticated users to fetch tasks', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/tasks')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should deny unauthenticated requests', () => {
        return request(app.getHttpServer()).get('/api/tasks').expect(401);
      });

      it('should return only assigned tasks for WORKER', async () => {
        // First create a task as admin
        const createResponse = await request(app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Worker Task',
            description: 'Task for worker',
          })
          .expect(201);

        const newTaskId = createResponse.body.data.id;

        // Assign to worker
        await request(app.getHttpServer())
          .patch(`/api/tasks/${newTaskId}/assign`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ userId: workerUserId })
          .expect(200);

        // Worker should see the task
        const workerTasksResponse = await request(app.getHttpServer())
          .get('/api/tasks')
          .set('Authorization', `Bearer ${workerToken}`)
          .expect(200);

        const assignedTask = workerTasksResponse.body.data.find(
          (t) => t.id === newTaskId,
        );
        expect(assignedTask).toBeDefined();
      });
    });

    describe('Create Task - POST /api/tasks', () => {
      it('should allow ADMIN to create task', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'New Task',
            description: 'Task Description',
          })
          .expect(201);

        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('title', 'New Task');
        expect(response.body.data).toHaveProperty(
          'description',
          'Task Description',
        );
        expect(response.body.data).toHaveProperty('status', 'OPEN');
        taskId = response.body.data.id;
      });

      it('should deny WORKER to create task', () => {
        return request(app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${workerToken}`)
          .send({
            title: 'Worker Task',
            description: 'Should fail',
          })
          .expect(403);
      });

      it('should fail with missing required fields', () => {
        return request(app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Incomplete Task',
            // Missing description
          })
          .expect(400);
      });
    });

    describe('Assign Task - PATCH /api/tasks/:id/assign', () => {
      it('should allow ADMIN to assign task to user', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/tasks/${taskId}/assign`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ userId: workerUserId })
          .expect(200);

        expect(response.body.data.assignee.id).toBe(workerUserId);
      });

      it('should deny WORKER to assign tasks', () => {
        return request(app.getHttpServer())
          .patch(`/api/tasks/${taskId}/assign`)
          .set('Authorization', `Bearer ${workerToken}`)
          .send({ userId: workerUserId })
          .expect(403);
      });

      it('should fail with invalid user ID', () => {
        return request(app.getHttpServer())
          .patch(`/api/tasks/${taskId}/assign`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ userId: 'invalid-uuid' })
          .expect(400);
      });

      it('should fail with non-existent user', () => {
        return request(app.getHttpServer())
          .patch(`/api/tasks/${taskId}/assign`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ userId: '00000000-0000-0000-0000-000000000000' })
          .expect(404);
      });

      it('should fail with non-existent task', () => {
        return request(app.getHttpServer())
          .patch('/api/tasks/00000000-0000-0000-0000-000000000000/assign')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ userId: workerUserId })
          .expect(404);
      });
    });

    describe('Delete Task - DELETE /api/tasks/:id', () => {
      it('should allow ADMIN to delete task', async () => {
        // Create a task to delete
        const createResponse = await request(app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Task to Delete',
            description: 'Will be deleted',
          })
          .expect(201);

        const taskToDeleteId = createResponse.body.data.id;

        // Delete the task
        await request(app.getHttpServer())
          .delete(`/api/tasks/${taskToDeleteId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(204);
      });

      it('should deny WORKER to delete task', () => {
        return request(app.getHttpServer())
          .delete(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${workerToken}`)
          .expect(403);
      });

      it('should fail with non-existent task ID', () => {
        return request(app.getHttpServer())
          .delete('/api/tasks/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });
  });

  // ============================================
  // AUTHORIZATION & ERROR HANDLING TESTS
  // ============================================

  describe('Authorization & Security', () => {
    it('should deny access without Bearer token', () => {
      return request(app.getHttpServer()).get('/api/users/me').expect(401);
    });

    it('should deny access with expired token', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', 'Bearer expired.jwt.token')
        .expect(401);
    });

    it('should deny access with malformed authorization header', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', 'InvalidScheme token')
        .expect(401);
    });
  });

  // ============================================
  // RESPONSE FORMAT TESTS
  // ============================================

  describe('Response Format Validation', () => {
    it('should return response with correct format on success', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.statusCode).toBe(200);
      expect(response.body.message).toBe('Success');
    });

    it('should return response with correct format on error', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send({
          username: 'admin_user',
          password: 'WrongPassword',
        });

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toBeNull();
    });
  });
});
