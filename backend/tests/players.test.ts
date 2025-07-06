console.log('Loading players.test.ts');

import request from 'supertest';
import app from '../src/app';

describe('Players API', () => {
  it('should get all players', async () => {
    const res = await request(app).get('/api/players');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  it('should create a new player', async () => {
    const res = await request(app)
      .post('/api/players')
      .send({
        name: 'Test Player',
        age: 24,
        position: 'Midfielder',
        rating: 75,
        value: 1000000,
        salary: 50000
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body.name).toBe('Test Player');
  });
});