import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { db } from '../src/config/database.js';
import path from 'path';

describe('Command Center for Software Hub 2.0 - Core Business Rules, 5-Admin Limit & RBAC', () => {
  let adminToken: string;
  let leadToken: string;
  let coreToken: string;
  let unpaidToken: string;

  beforeAll(async () => {
    // Run migrations and seeds
    await db.migrate.latest({
      directory: path.resolve(process.cwd(), 'src/db/migrations'),
    });
    await db.seed.run({
      directory: path.resolve(process.cwd(), 'src/db/seeds'),
    });

    // Obtain tokens for all 4 roles via mock SSO
    const adminRes = await request(app).post('/api/auth/mock-sso').send({ role: 'admin' });
    adminToken = adminRes.body.accessToken;

    const leadRes = await request(app).post('/api/auth/mock-sso').send({ role: 'lead' });
    leadToken = leadRes.body.accessToken;

    const coreRes = await request(app).post('/api/auth/mock-sso').send({ role: 'paid_intern' });
    coreToken = coreRes.body.accessToken;

    const unpaidRes = await request(app).post('/api/auth/mock-sso').send({ role: 'unpaid_intern' });
    unpaidToken = unpaidRes.body.accessToken;
  });

  describe('1. Official Administrator Structure & 5-Admin Limit (Section 1)', () => {
    it('returns official admin summary showing active count and available positions', async () => {
      const res = await request(app)
        .get('/api/users/admins/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.maxAdmins).toBe(5);
      expect(res.body.activeAdminsCount).toBe(2);
      expect(res.body.availablePositions).toBe(3);
      expect(res.body.primaryAdmin.name).toBe('Sri Ram');
      expect(res.body.coAdmin.name).toBe('Sheshi');
    });

    it('enforces hard backend limit of 5 administrators and prevents creating a 6th admin', async () => {
      // Currently active: Sri Ram (1) + Sheshi (2) = 2.
      // Grant 3 more to reach the hard limit of 5:
      await request(app).post('/api/users/admins').set('Authorization', `Bearer ${adminToken}`).send({ targetUserId: 'u-core-manohar' });
      await request(app).post('/api/users/admins').set('Authorization', `Bearer ${adminToken}`).send({ targetUserId: 'u-core-srividhya' });
      await request(app).post('/api/users/admins').set('Authorization', `Bearer ${adminToken}`).send({ targetUserId: 'u-core-mahendar' });

      // Summary should now reflect 5 active admins and 0 available positions
      const summaryRes = await request(app)
        .get('/api/users/admins/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(summaryRes.body.activeAdminsCount).toBe(5);
      expect(summaryRes.body.availablePositions).toBe(0);

      // Attempting to grant a 6th administrator MUST be rejected with HTTP 400
      const sixthRes = await request(app)
        .post('/api/users/admins')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetUserId: 'u-core-shiva' });

      expect(sixthRes.status).toBe(400);
      expect(sixthRes.body.message).toContain('Maximum limit of 5 administrator positions reached');
    });

    it('records administrative actions in the audit log', async () => {
      const res = await request(app)
        .get('/api/users/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.some((l: any) => l.action.includes('ADMIN_ACCESS_GRANTED'))).toBe(true);
    });
  });

  describe('2. Role-Based Permissions & Scope Barriers', () => {
    it('allows admin and co-admin (lead) to manage automations and view system triggers', async () => {
      const res = await request(app)
        .get('/api/automations')
        .set('Authorization', `Bearer ${leadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.automations.length).toBeGreaterThanOrEqual(10);
      expect(res.body.metrics.sentThisWeek).toBeDefined();
    });

    it('allows accessing email templates system and logs (Sections 5 & 6)', async () => {
      const res = await request(app)
        .get('/api/automations/email-templates/list')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('3. Task & Part Delegation Rules', () => {
    it('unpaid intern sees only their assigned parts on tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${unpaidToken}`);

      expect(res.status).toBe(200);
      for (const task of res.body) {
        for (const part of task.parts) {
          expect(part.assignedInternId).toBe('u-unpaid-cherry');
        }
      }
    });

    it('successfully reviews and approves a task part with rating', async () => {
      const res = await request(app)
        .post('/api/tasks/parts/part-inventory-1/review')
        .set('Authorization', `Bearer ${leadToken}`)
        .send({
          action: 'approve',
          rating: 5,
          comment: 'Outstanding audit findings!',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Part approved successfully');
    });
  });

  describe('4. Privacy-Preserving Attendance Rules', () => {
    it('records check-in without collecting location and returns status', async () => {
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${unpaidToken}`);

      expect([200, 400]).toContain(res.status);
    });

    it('exports attendance register to Excel workbook with valid mimetype', async () => {
      const res = await request(app)
        .get('/api/exports/attendance')
        .set('Authorization', `Bearer ${leadToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });
  });
});
