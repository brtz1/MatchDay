console.log('Loading teams.test.ts');

import request from 'supertest';
import app from '../src/app';

describe('Teams API', () => {
  it('should get all teams', async () => {
    const res = await request(app).get('/api/teams');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  it('should create a new team', async () => {
    const res = await request(app)
      .post('/api/teams')
      .send({
        name: 'Test United',
        country: 'Testland',
        budget: 5000000,
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body.name).toBe('Test United');
  });
});