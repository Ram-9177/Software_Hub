import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { db } from '../src/config/database.js';
import path from 'path';

describe('Team Creation, Duplicate Prevention & Chat Access Control', () => {
  let adminToken: string;
  let leadToken: string;
  let coreToken: string;
  let unpaidToken: string;

  let adminUserId: string;
  let leadUserId: string;
  let coreUserId: string;
  let unpaidUserId: string;
  let secondUnpaidUserId: string;

  let testTaskId: string;
  let testPartId: string;

  beforeAll(async () => {
    // Run migrations and seeds
    await db.migrate.latest({
       directory: path.resolve(process.cwd(), 'dist/db/migrations'),
       loadExtensions: ['.js'],
    });
    await db.seed.run({
       directory: path.resolve(process.cwd(), 'dist/db/seeds'),
       loadExtensions: ['.js'],
    });

    // Obtain tokens for all 4 roles via real institutional login
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'sriram@smru.edu.in',
      password: process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!@#',
    });
    adminToken = adminRes.body.accessToken;
    adminUserId = adminRes.body.user.id;

    const leadRes = await request(app).post('/api/auth/login').send({
      email: 'sheshitejs@gmail.com',
      password: process.env.SEED_COADMIN_PASSWORD || 'CoadminPass123!@#',
    });
    leadToken = leadRes.body.accessToken;
    leadUserId = leadRes.body.user.id;

    const coreRes = await request(app).post('/api/auth/login').send({
      email: 'gundasurya600@gmail.com',
      password: process.env.SEED_CORE_PASSWORD || 'CorePass123!@#',
    });
    coreToken = coreRes.body.accessToken;
    coreUserId = coreRes.body.user.id;

    const unpaidRes = await request(app).post('/api/auth/login').send({
      email: 'anaalia092@gmail.com',
      password: process.env.SEED_INTERN_PASSWORD || 'InternPass123!@#',
    });
    unpaidToken = unpaidRes.body.accessToken;
    unpaidUserId = unpaidRes.body.user.id;

    // Create a second unpaid intern for adding member and reassignment tests
    secondUnpaidUserId = `u-unpaid-second-${Date.now()}`;
    await db('users').insert({
      id: secondUnpaidUserId,
      name: 'Second Unpaid Intern',
      email: `second_unpaid_${Date.now()}@test.softwarehub2.org`,
      role: 'unpaid_intern',
      intern_type: 'unpaid',
      current_level: 1,
      status: 'active',
      token_version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create a task with part for reassignment tests
    testTaskId = `t-chat-test-${Date.now()}`;
    await db('tasks').insert({
      id: testTaskId,
      task_number: 'TSK-REASSIGN-01',
      title: 'Task for Reassignment',
      description: 'Testing part reassignment workflow',
      priority: 'medium',
      status: 'in_progress',
      due_date: new Date(Date.now() + 86400000),
      created_by: adminUserId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    testPartId = `p-reassign-${Date.now()}`;
    await db('task_parts').insert({
      id: testPartId,
      task_id: testTaskId,
      part_number: 1,
      total_parts: 1,
      title: 'Part to Reassign',
      assigned_intern_id: unpaidUserId,
      due_date: new Date(Date.now() + 86400000),
      status: 'in_progress',
      reviewer_id: leadUserId,
    });
  }, 30000);

  let createdTeamId: string;
  let createdChannelId: string;

  describe('1. Team Creation & Equal Permissions', () => {
    it('allows Admin to create a team with members, lead, and channels in an atomic transaction', async () => {
      const res = await request(app)
        .post('/api/chat/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Mobile App Alpha',
          description: 'React Native & iOS team',
          leadId: leadUserId,
          memberIds: [coreUserId],
        });

      expect(res.status).toBe(201);
      expect(res.body.teamId).toBeDefined();
      expect(res.body.channelId).toBeDefined();
      createdTeamId = res.body.teamId;
      createdChannelId = res.body.channelId;

      // Verify DB persistence
      const teamInDb = await db('teams').where({ id: createdTeamId }).first();
      expect(teamInDb).toBeDefined();
      expect(teamInDb.name).toBe('Mobile App Alpha');
      expect(teamInDb.lead_id).toBe(leadUserId);

      // Verify channel persistence
      const chanInDb = await db('chat_channels').where({ id: createdChannelId }).first();
      expect(chanInDb).toBeDefined();
      expect(chanInDb.team_id).toBe(createdTeamId);

      // Verify members persistence (creator, lead, and memberIds)
      const membersInDb = await db('team_members').where({ team_id: createdTeamId });
      const memberUids = membersInDb.map((m) => m.user_id);
      expect(memberUids).toContain(leadUserId);
      expect(memberUids).toContain(coreUserId);
      expect(memberUids).toContain(adminUserId);

      // Verify initial welcome message
      const welcomeMsg = await db('chat_messages').where({ channel_id: createdChannelId }).first();
      expect(welcomeMsg).toBeDefined();
      expect(Boolean(welcomeMsg.is_pinned)).toBe(true);
    });

    it('allows Co-admin (Lead) to create a team using equal operational permissions', async () => {
      const res = await request(app)
        .post('/api/chat/teams')
        .set('Authorization', `Bearer ${leadToken}`)
        .send({
          name: 'Security Squad',
          description: 'Penetration testing and auth team',
          leadId: leadUserId,
          memberIds: [coreUserId],
        });

      expect(res.status).toBe(201);
      expect(res.body.teamId).toBeDefined();
    });

    it('rejects unauthorized team creation by regular unpaid interns (HTTP 403)', async () => {
      const res = await request(app)
        .post('/api/chat/teams')
        .set('Authorization', `Bearer ${unpaidToken}`)
        .send({
          name: 'Unpaid Rogue Team',
          leadId: unpaidUserId,
          memberIds: [],
        });

      expect(res.status).toBe(403);
    });
  });

  describe('2. Duplicate Prevention & Validation', () => {
    it('prevents creating duplicate teams with the same name (HTTP 409)', async () => {
      const res = await request(app)
        .post('/api/chat/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Mobile App Alpha', // Same name as before
          leadId: leadUserId,
          memberIds: [],
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    it('prevents duplicate team membership addition (HTTP 409)', async () => {
      const res = await request(app)
        .post(`/api/chat/teams/${createdTeamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: coreUserId,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already a member');
    });

    it('successfully adds a new member when not already present', async () => {
      const res = await request(app)
        .post(`/api/chat/teams/${createdTeamId}/members`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({
          userId: secondUnpaidUserId,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('added to the team');

      const member = await db('team_members')
        .where({ team_id: createdTeamId, user_id: secondUnpaidUserId })
        .first();
      expect(member).toBeDefined();
    });

    it('blocks removing the Team Lead without reassigning leadership first', async () => {
      const res = await request(app)
        .delete(`/api/chat/teams/${createdTeamId}/members/${leadUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot remove the Team Lead');
    });
  });

  describe('3. Chat Access Control & Message Persistence', () => {
    it('blocks users who are not members of the channel from reading messages (HTTP 403)', async () => {
      // unpaidUserId is not a member of createdTeamId/createdChannelId
      const res = await request(app)
        .get(`/api/chat/channels/${createdChannelId}/messages`)
        .set('Authorization', `Bearer ${unpaidToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Permission denied');
    });

    it('allows channel members to view and persist messages', async () => {
      const postRes = await request(app)
        .post(`/api/chat/channels/${createdChannelId}/messages`)
        .set('Authorization', `Bearer ${coreToken}`)
        .field('text', 'Hello from Core Intern in our new team channel!');

      expect(postRes.status).toBe(201);
      expect(postRes.body.id).toBeDefined();

      const getRes = await request(app)
        .get(`/api/chat/channels/${createdChannelId}/messages`)
        .set('Authorization', `Bearer ${coreToken}`);

      expect(getRes.status).toBe(200);
      const texts = getRes.body.map((m: any) => m.text);
      expect(texts).toContain('Hello from Core Intern in our new team channel!');
    });
  });

  describe('4. Task Reassignment & Leave Management Workflows', () => {
    it('reassigns a task part and records updated assignee in database', async () => {
      const res = await request(app)
        .post(`/api/tasks/parts/${testPartId}/reassign`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({
          newAssigneeId: secondUnpaidUserId,
          reason: 'Load balancing for Part 1',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('reassigned to Second Unpaid Intern');

      const partInDb = await db('task_parts').where({ id: testPartId }).first();
      expect(partInDb.assigned_intern_id).toBe(secondUnpaidUserId);
    });

    it('submits leave request and allows Lead/Admin review', async () => {
      const submitRes = await request(app)
        .post('/api/attendance/leave')
        .set('Authorization', `Bearer ${unpaidToken}`)
        .send({
          startDate: '2026-10-25',
          endDate: '2026-10-26',
          reason: 'College exams',
        });

      expect(submitRes.status).toBe(201);
      const leaveId = submitRes.body.id;

      const listRes = await request(app)
        .get('/api/attendance/leave')
        .set('Authorization', `Bearer ${leadToken}`);

      expect(listRes.status).toBe(200);
      const found = listRes.body.find((l: any) => l.id === leaveId);
      expect(found).toBeDefined();
      expect(found.status).toBe('pending');

      const reviewRes = await request(app)
        .post(`/api/attendance/leave/${leaveId}/review`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({ action: 'approve' });

      expect(reviewRes.status).toBe(200);

      const leaveInDb = await db('leave_requests').where({ id: leaveId }).first();
      expect(leaveInDb.status).toBe('approved');
    });
  });
});
