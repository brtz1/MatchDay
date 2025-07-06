console.log('Loading matches.test.ts');

import request from 'supertest';
import app from '../src/app';

describe('Matches API', () => {
  it('should simulate a match between two teams', async () => {
    // get two existing teams
    const teamsRes = await request(app).get('/api/teams');
    const teams = teamsRes.body;

    expect(teams.length).toBeGreaterThanOrEqual(2);

    const homeTeamId = teams[0].id;
    const awayTeamId = teams[1].id;

    // get one referee
    const refereesRes = await request(app).get('/api/referees');
    const referees = refereesRes.body;

    expect(referees.length).toBeGreaterThan(0);

    const refereeId = referees[0].id;

    // simulate the match
    const res = await request(app)
      .post('/api/matches')
      .send({
        homeTeamId,
        awayTeamId,
        refereeId
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.homeScore).toBeDefined();
    expect(res.body.awayScore).toBeDefined();
  });
});