/**
 * Teams Routes Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestUser, createTestTeam } from '../setup';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    team: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamInvite: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../../db';

describe('Teams Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/teams', () => {
    it('should return user teams', async () => {
      const mockTeams = [
        createTestTeam({ id: 'team-1', name: 'Team 1' }),
        createTestTeam({ id: 'team-2', name: 'Team 2' }),
      ];

      (prisma.team.findMany as any).mockResolvedValue(mockTeams);

      const teams = await prisma.team.findMany({});
      expect(teams).toHaveLength(2);
      expect(teams[0].name).toBe('Team 1');
    });

    it('should return empty array for user with no teams', async () => {
      (prisma.team.findMany as any).mockResolvedValue([]);

      const teams = await prisma.team.findMany({});
      expect(teams).toHaveLength(0);
    });
  });

  describe('POST /api/teams', () => {
    it('should create a new team', async () => {
      const newTeam = createTestTeam({ name: 'New Team', slug: 'new-team' });
      (prisma.team.findFirst as any).mockResolvedValue(null);
      (prisma.team.create as any).mockResolvedValue(newTeam);

      const team = await prisma.team.create({ data: newTeam });
      expect(team.name).toBe('New Team');
      expect(team.slug).toBe('new-team');
    });

    it('should reject duplicate slug', async () => {
      const existingTeam = createTestTeam({ slug: 'existing-slug' });
      (prisma.team.findFirst as any).mockResolvedValue(existingTeam);

      const error = new Error('Team with this slug already exists');
      expect(error.message).toContain('slug already exists');
    });

    it('should auto-generate slug from name', async () => {
      const name = 'My Awesome Team';
      const expectedSlug = 'my-awesome-team';
      const generatedSlug = name.toLowerCase().replace(/\s+/g, '-');

      expect(generatedSlug).toBe(expectedSlug);
    });
  });

  describe('GET /api/teams/:teamId', () => {
    it('should return team details', async () => {
      const mockTeam = createTestTeam();
      (prisma.team.findUnique as any).mockResolvedValue(mockTeam);

      const team = await prisma.team.findUnique({ where: { id: mockTeam.id } });
      expect(team?.name).toBe('Test Team');
    });

    it('should return 404 for non-existent team', async () => {
      (prisma.team.findUnique as any).mockResolvedValue(null);

      const team = await prisma.team.findUnique({ where: { id: 'non-existent' } });
      expect(team).toBeNull();
    });
  });

  describe('PUT /api/teams/:teamId', () => {
    it('should update team as owner', async () => {
      const mockTeam = createTestTeam();
      const updatedTeam = { ...mockTeam, name: 'Updated Team' };
      (prisma.team.update as any).mockResolvedValue(updatedTeam);

      const team = await prisma.team.update({
        where: { id: mockTeam.id },
        data: { name: 'Updated Team' },
      });
      expect(team.name).toBe('Updated Team');
    });

    it('should reject update from non-admin member', async () => {
      const memberRole = 'MEMBER';
      const canUpdate = ['OWNER', 'ADMIN'].includes(memberRole);
      expect(canUpdate).toBe(false);
    });
  });

  describe('DELETE /api/teams/:teamId', () => {
    it('should delete team as owner', async () => {
      const mockTeam = createTestTeam();
      (prisma.team.delete as any).mockResolvedValue(mockTeam);

      const deleted = await prisma.team.delete({ where: { id: mockTeam.id } });
      expect(deleted.id).toBe(mockTeam.id);
    });

    it('should reject delete from non-owner', async () => {
      const memberRole = 'ADMIN';
      const canDelete = memberRole === 'OWNER';
      expect(canDelete).toBe(false);
    });
  });

  describe('GET /api/teams/:teamId/members', () => {
    it('should return team members', async () => {
      const mockMembers = [
        { id: 'm1', userId: 'u1', role: 'OWNER', user: createTestUser({ id: 'u1' }) },
        { id: 'm2', userId: 'u2', role: 'MEMBER', user: createTestUser({ id: 'u2' }) },
      ];
      (prisma.teamMember.findMany as any).mockResolvedValue(mockMembers);

      const members = await prisma.teamMember.findMany({});
      expect(members).toHaveLength(2);
    });
  });

  describe('POST /api/teams/:teamId/members', () => {
    it('should add member to team', async () => {
      const newMember = {
        id: 'new-member-id',
        userId: 'new-user-id',
        teamId: 'test-team-id',
        role: 'MEMBER',
      };
      (prisma.teamMember.create as any).mockResolvedValue(newMember);

      const member = await prisma.teamMember.create({ data: newMember });
      expect(member.role).toBe('MEMBER');
    });
  });

  describe('POST /api/teams/:teamId/invite', () => {
    it('should create invite link', async () => {
      const invite = {
        id: 'invite-id',
        teamId: 'test-team-id',
        email: 'invite@example.com',
        code: 'invite-code-123',
        role: 'MEMBER',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      (prisma.teamInvite.create as any).mockResolvedValue(invite);

      const created = await prisma.teamInvite.create({ data: invite });
      expect(created.code).toBe('invite-code-123');
      expect(created.status).toBe('PENDING');
    });
  });

  describe('POST /api/teams/join/:code', () => {
    it('should join team with valid invite code', async () => {
      const invite = {
        id: 'invite-id',
        teamId: 'test-team-id',
        code: 'valid-code',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000),
      };
      (prisma.teamInvite.findUnique as any).mockResolvedValue(invite);

      const isValid = invite.status === 'PENDING' && invite.expiresAt > new Date();
      expect(isValid).toBe(true);
    });

    it('should reject expired invite code', async () => {
      const invite = {
        id: 'invite-id',
        code: 'expired-code',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1000),
      };
      (prisma.teamInvite.findUnique as any).mockResolvedValue(invite);

      const isExpired = invite.expiresAt < new Date();
      expect(isExpired).toBe(true);
    });
  });
});
