import request from 'supertest';
import app from '../app'; // ✅ requires `@` alias set in jest.config.js

describe('🧪 Matches API', () => {
  let homeTeamId: number;
  let awayTeamId: number;
  let refereeId: number;

  beforeAll(async () => {
    // Fetch at least two teams
    const teamsRes = await request(app).get('/api/teams');
    expect(teamsRes.status).toBe(200);

    const teams = teamsRes.body;
    expect(Array.isArray(teams)).toBe(true);
    expect(teams.length).toBeGreaterThanOrEqual(2);

    homeTeamId = teams[0].id;
    awayTeamId = teams[1].id;

    // Fetch at least one referee
    const refsRes = await request(app).get('/api/referees');
    expect(refsRes.status).toBe(200);

    const referees = refsRes.body;
    expect(Array.isArray(referees)).toBe(true);
    expect(referees.length).toBeGreaterThan(0);

    refereeId = referees[0].id;
  });

  it('should simulate a match between two teams and return scores', async () => {
    const response = await request(app).post('/api/matches').send({
      homeTeamId,
      awayTeamId,
      refereeId,
    });

    // Validate response
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('homeScore');
    expect(response.body).toHaveProperty('awayScore');
  });
});
