import request from 'supertest';
import app from '../app.js';

// ---- TESTS ----

describe('POST /create-token', () => {
  it('should create a simple token successfully', async () => {
    const res = await request(app).post('/create-token').send({
      type: 'SIMPLE',
      name: 'TestCoin',
      symbol: 'TST',
      description: 'Testing coin',
      decimals: 6,
      totalSupply: 5400000,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.modules).toBeDefined();
    expect(res.body.dependencies).toBeDefined();
  });

  it('should fail if token type is invalid', async () => {
    const res = await request(app).post('/create-token').send({
      type: 'invalid_type',
      name: 'TestCoin',
      symbol: 'TST',
      description: 'Testing coin',
      decimals: 6,
      totalSupply: 5400000,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Invalid token type/);
  });

  it('should fail if symbol is too long', async () => {
    const res = await request(app).post('/create-token').send({
      type: 'SIMPLE',
      name: 'TestCoin',
      symbol: 'TOOLONG',
      description: 'Testing coin',
      decimals: 6,
      totalSupply: 5400000,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/symbol.*max 5 characters/);
  });

  it('should fail if name is missing', async () => {
    const res = await request(app).post('/create-token').send({
      type: 'SIMPLE',
      symbol: 'TST',
      description: 'Testing coin',
      decimals: 6,
      totalSupply: 5400000,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/name is required/);
  });
});
