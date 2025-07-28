import request from 'supertest';
import app from '@/app';
import { seedBasicTestData } from '@/tests/utils/testSeeder';
import { cleanTestData } from '@/tests/utils/cleanup';

describe('🧪 Teams API', () => {
  beforeAll(async () => {
    await cleanTestData();
    await seedBasicTestData();
  });

  afterAll(async () => {
    await cleanTestData();
  });

  it('should fetch all teams successfully', async () => {
    const res = await request(app).get('/api/save-game-teams');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const team = res.body[0];
    expect(team).toHaveProperty('id');
    expect(team).toHaveProperty('name');
    expect(team).toHaveProperty('division');
  });

  it('should fetch a team by ID', async () => {
    const allRes = await request(app).get('/api/save-game-teams');
    expect(allRes.status).toBe(200);
    expect(Array.isArray(allRes.body)).toBe(true);
    expect(allRes.body.length).toBeGreaterThan(0);

    const teamId = allRes.body[0].id;
    const oneRes = await request(app).get(`/api/save-game-teams/${teamId}`);

    expect(oneRes.status).toBe(200);
    expect(oneRes.body).toHaveProperty('id', teamId);
    expect(oneRes.body).toHaveProperty('name');
    expect(oneRes.body).toHaveProperty('division');
  });
});
