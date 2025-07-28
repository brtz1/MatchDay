import request from 'supertest';
import app from '@/app';
import { seedBasicTestData } from './utils/testSeeder';
import { cleanTestData } from './utils/cleanup';

describe('🧪 Matches API', () => {
  let homeTeamId: number;
  let awayTeamId: number;
  let refereeId: number;

  beforeAll(async () => {
    const { team1, team2, referee } = await seedBasicTestData();
    homeTeamId = team1.id;
    awayTeamId = team2.id;
    refereeId = referee.id;
  });

  afterAll(async () => {
    await cleanTestData();
  });

  it('should simulate a match between two teams and return scores', async () => {
    const matchDate = new Date().toISOString();

    const res = await request(app).post('/api/matches').send({
      homeTeamId,
      awayTeamId,
      refereeId,
      matchDate,
      matchdayType: 'LEAGUE',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('homeTeamId', homeTeamId);
    expect(res.body).toHaveProperty('awayTeamId', awayTeamId);
    expect(new Date(res.body.matchDate).toString()).not.toBe('Invalid Date');
  });
});
