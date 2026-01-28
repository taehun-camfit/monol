/**
 * Teams Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import {
  requireAuth,
  requireTeamMember,
  requireTeamAdmin,
  requireTeamOwner,
  type AuthenticatedRequest,
} from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ConflictError } from '../middleware/error.js';

export const teamsRouter = Router();

// ============================================================================
// Schemas
// ============================================================================

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: z.record(z.any()).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['VIEWER', 'MEMBER', 'ADMIN']).default('MEMBER'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['VIEWER', 'MEMBER', 'ADMIN']),
});

// ============================================================================
// Helpers
// ============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/teams - List user's teams
 */
teamsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: req.user!.id,
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
            rules: true,
          },
        },
        members: {
          where: { userId: req.user!.id },
          select: { role: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = teams.map((team) => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      avatarUrl: team.avatarUrl,
      memberCount: team._count.members,
      ruleCount: team._count.rules,
      myRole: team.members[0]?.role,
      createdAt: team.createdAt,
    }));

    res.json({ teams: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/teams - Create team
 */
teamsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = createTeamSchema.parse(req.body);
    let slug = generateSlug(data.name);

    // Ensure unique slug
    const existing = await prisma.team.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const team = await prisma.team.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        ownerId: req.user!.id,
        members: {
          create: {
            userId: req.user!.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        _count: {
          select: { members: true, rules: true },
        },
      },
    });

    res.status(201).json({
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      memberCount: team._count.members,
      ruleCount: team._count.rules,
      myRole: 'OWNER',
      createdAt: team.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/teams/:teamId - Get team details
 */
teamsRouter.get('/:teamId', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.teamId },
      include: {
        owner: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: {
          select: { members: true, rules: true, proposals: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundError('Team');
    }

    res.json({
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      avatarUrl: team.avatarUrl,
      settings: team.settings,
      owner: team.owner,
      memberCount: team._count.members,
      ruleCount: team._count.rules,
      proposalCount: team._count.proposals,
      myRole: req.teamMembership?.role,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/teams/:teamId - Update team
 */
teamsRouter.patch('/:teamId', requireAuth, requireTeamAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = updateTeamSchema.parse(req.body);

    const team = await prisma.team.update({
      where: { id: req.params.teamId },
      data: {
        name: data.name,
        description: data.description,
        settings: data.settings,
      },
    });

    res.json(team);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/teams/:teamId - Delete team
 */
teamsRouter.delete('/:teamId', requireAuth, requireTeamOwner, async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.team.delete({
      where: { id: req.params.teamId },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Members
// ============================================================================

/**
 * GET /api/teams/:teamId/members - List team members
 */
teamsRouter.get('/:teamId/members', requireAuth, requireTeamMember, async (req: AuthenticatedRequest, res, next) => {
  try {
    const members = await prisma.teamMember.findMany({
      where: { teamId: req.params.teamId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
      orderBy: [
        { role: 'desc' },
        { joinedAt: 'asc' },
      ],
    });

    const result = members.map((m) => ({
      id: m.id,
      user: m.user,
      role: m.role,
      points: m.points,
      joinedAt: m.joinedAt,
    }));

    res.json({ members: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/teams/:teamId/members/invite - Invite member
 */
teamsRouter.post('/:teamId/members/invite', requireAuth, requireTeamAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = inviteMemberSchema.parse(req.body);
    const teamId = req.params.teamId;

    // Check if user already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      const existingMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: existingUser.id,
            teamId,
          },
        },
      });

      if (existingMember) {
        throw new ConflictError('User is already a team member');
      }
    }

    // Check for existing invite
    const existingInvite = await prisma.teamInvite.findFirst({
      where: {
        teamId,
        email: data.email,
        status: 'PENDING',
      },
    });

    if (existingInvite) {
      throw new ConflictError('Invite already pending for this email');
    }

    // Create invite
    const invite = await prisma.teamInvite.create({
      data: {
        teamId,
        email: data.email,
        role: data.role,
        code: generateInviteCode(),
        inviterId: req.user!.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(201).json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      code: invite.code,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/teams/:teamId/members/join - Join team with invite code
 */
teamsRouter.post('/:teamId/members/join', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { code } = req.body;
    const teamId = req.params.teamId;

    if (!code) {
      throw new BadRequestError('Invite code required');
    }

    // Find invite
    const invite = await prisma.teamInvite.findFirst({
      where: {
        teamId,
        code,
        status: 'PENDING',
        email: req.user!.email,
      },
    });

    if (!invite) {
      throw new NotFoundError('Valid invite');
    }

    if (invite.expiresAt < new Date()) {
      await prisma.teamInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestError('Invite has expired');
    }

    // Add member
    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: req.user!.id,
        role: invite.role,
      },
      include: {
        team: {
          select: { name: true, slug: true },
        },
      },
    });

    // Mark invite as accepted
    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    });

    res.json({
      success: true,
      team: member.team,
      role: member.role,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/teams/:teamId/members/:memberId - Update member role
 */
teamsRouter.patch('/:teamId/members/:memberId', requireAuth, requireTeamAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = updateMemberRoleSchema.parse(req.body);
    const { teamId, memberId } = req.params;

    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.teamId !== teamId) {
      throw new NotFoundError('Member');
    }

    // Can't change owner's role
    if (member.role === 'OWNER') {
      throw new BadRequestError('Cannot change owner role');
    }

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role: data.role },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/teams/:teamId/members/:memberId - Remove member
 */
teamsRouter.delete('/:teamId/members/:memberId', requireAuth, requireTeamAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { teamId, memberId } = req.params;

    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.teamId !== teamId) {
      throw new NotFoundError('Member');
    }

    // Can't remove owner
    if (member.role === 'OWNER') {
      throw new BadRequestError('Cannot remove team owner');
    }

    await prisma.teamMember.delete({
      where: { id: memberId },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/teams/:teamId/leave - Leave team
 */
teamsRouter.post('/:teamId/leave', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = req.params.teamId;

    const member = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: req.user!.id,
          teamId,
        },
      },
    });

    if (!member) {
      throw new NotFoundError('Membership');
    }

    // Owner can't leave (must transfer ownership first)
    if (member.role === 'OWNER') {
      throw new BadRequestError('Owner cannot leave. Transfer ownership first.');
    }

    await prisma.teamMember.delete({
      where: { id: member.id },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default teamsRouter;
