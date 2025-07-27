import request from 'supertest';
import app from '../app'; // ✅ alias must be configured in jest.config.js

describe('🧪 Teams API', () => {
  it('should fetch all teams successfully', async () => {
    const res = await request(app).get('/api/teams');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('name');
  });

  it('should fetch a team by ID', async () => {
    // First fetch all teams to get a valid ID
    const resAll = await request(app).get('/api/teams');
    expect(resAll.status).toBe(200);

    const teams = resAll.body;
    const teamId = teams[0].id;

    const resOne = await request(app).get(`/api/teams/${teamId}`);
    expect(resOne.status).toBe(200);
    expect(resOne.body).toHaveProperty('id', teamId);
    expect(resOne.body).toHaveProperty('name');
  });
});
