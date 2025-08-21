import request from 'supertest';
import express, { Express } from 'express';

// Mock storage to always fail login verification
jest.mock('../server/storage', () => ({
  storage: {
    verifyLogin: jest.fn().mockResolvedValue(null),
    getUserByPhone: jest.fn(),
    updateUser: jest.fn(),
  }
}));

// Bypass CSRF protection for testing
jest.mock('../server/middleware/csrfMiddleware', () => ({
  verifyCsrf: (_req: any, _res: any, next: any) => next(),
}));

// Import after mocks are set up
import { authRoutes } from '../server/routes/auth.routes';

describe('Auth rate limiting', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    authRoutes(app);
  });

  it('throttles excessive login attempts', async () => {
    const loginPayload = { email: 'test@example.com', password: 'wrongpassword' };

    // First 5 attempts should be processed (and fail with 401 or similar)
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/v1/auth/login').send(loginPayload);
    }

    // Sixth attempt should hit rate limiter
    const res = await request(app).post('/api/v1/auth/login').send(loginPayload);
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/Too many authentication attempts/i);
  });
});
