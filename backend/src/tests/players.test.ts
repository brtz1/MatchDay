import request from 'supertest';
import app from '@/app';
import { seedBasicTestData } from '@/tests/utils/testSeeder';
import { cleanTestData } from '@/tests/utils/cleanup';

describe('🧪 Players API', () => {
  let teamId: number;

  beforeAll(async () => {
    await cleanTestData();
    const { team1 } = await seedBasicTestData();
    teamId = team1.id;
  });

  it('should block direct player creation (not allowed in-game)', async () => {
    const playerData = {
      name: 'Test Player',
      nationality: 'Brazil',
      position: 'MF',
      behavior: 3,
      rating: 65,
      salary: 1200,
      teamId,
    };

    const res = await request(app).post('/api/players').send(playerData);
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });
});
