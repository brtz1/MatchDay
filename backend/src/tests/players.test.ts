import request from 'supertest';
import app from '../app'; // ✅ alias must be configured in jest.config.js

describe('🧪 Players API', () => {
  it('should fetch all players successfully', async () => {
    const res = await request(app).get('/api/players');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should create a new player', async () => {
    const playerData = {
      name: 'Test Player',
      nationality: 'Brazil',
      position: 'MF',
      rating: 70,
      behavior: 3,
      salary: 5000,
    };

    const res = await request(app).post('/api/players').send(playerData);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(playerData.name);
    expect(res.body.position).toBe(playerData.position);
  });
});
