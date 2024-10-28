import "server-only";
import { teamCache } from "@/lib/cache/team";
import { TOtherTeam, TTeamRole, TUserTeam } from "@/modules/ee/teams/team-list/types/teams";
import { Prisma, TeamRole } from "@prisma/client";
import { cache as reactCache } from "react";
import { z } from "zod";
import { prisma } from "@formbricks/database";
import { cache } from "@formbricks/lib/cache";
import { userCache } from "@formbricks/lib/user/cache";
import { validateInputs } from "@formbricks/lib/utils/validate";
import { ZId } from "@formbricks/types/common";
import { DatabaseError, InvalidInputError, ResourceNotFoundError } from "@formbricks/types/errors";

const getUserTeams = reactCache(
  (userId: string, organizationId: string): Promise<TUserTeam[]> =>
    cache(
      async () => {
        validateInputs([userId, z.string()], [organizationId, ZId]);
        try {
          const teams = await prisma.team.findMany({
            where: {
              organizationId,
              teamMembers: {
                some: {
                  userId,
                },
              },
            },
            select: {
              id: true,
              name: true,
              teamMembers: {
                select: {
                  role: true,
                },
              },
              _count: {
                select: {
                  teamMembers: true,
                },
              },
            },
          });

          const userTeams = teams.map((team) => ({
            id: team.id,
            name: team.name,
            userRole: team.teamMembers[0].role,
            memberCount: team._count.teamMembers,
          }));

          return userTeams;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            throw new DatabaseError(error.message);
          }

          throw error;
        }
      },
      [`getUserTeams-${userId}`],
      {
        tags: [
          teamCache.tag.byUserId(userId),
          userCache.tag.byId(userId),
          teamCache.tag.byOrganizationId(organizationId),
        ],
      }
    )()
);

const getOtherTeams = reactCache(
  (userId: string, organizationId: string): Promise<TOtherTeam[]> =>
    cache(
      async () => {
        validateInputs([userId, z.string()], [organizationId, ZId]);
        try {
          const teams = await prisma.team.findMany({
            where: {
              organizationId,
              teamMembers: {
                none: {
                  userId,
                },
              },
            },
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  teamMembers: true,
                },
              },
            },
          });

          const otherTeams = teams.map((team) => ({
            id: team.id,
            name: team.name,
            memberCount: team._count.teamMembers,
          }));

          return otherTeams;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            throw new DatabaseError(error.message);
          }

          throw error;
        }
      },
      [`getOtherTeams-${userId}`],
      {
        tags: [
          teamCache.tag.byUserId(userId),
          userCache.tag.byId(userId),
          teamCache.tag.byOrganizationId(organizationId),
        ],
      }
    )()
);

export const getTeams = reactCache(
  (userId: string, organizationId: string): Promise<{ userTeams: TUserTeam[]; otherTeams: TOtherTeam[] }> =>
    cache(
      async () => {
        const [userTeams, otherTeams] = await Promise.all([
          getUserTeams(userId, organizationId),
          getOtherTeams(userId, organizationId),
        ]);

        return { userTeams, otherTeams };
      },
      [`teams-getTeams-${userId}`],
      {
        tags: [
          teamCache.tag.byUserId(userId),
          userCache.tag.byId(userId),
          teamCache.tag.byOrganizationId(organizationId),
        ],
      }
    )()
);

export const leaveTeam = async (userId: string, teamId: string): Promise<boolean> => {
  validateInputs([userId, z.string()], [teamId, ZId]);
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        organizationId: true,
        productTeams: {
          select: {
            productId: true,
          },
        },
      },
    });

    if (!team) {
      throw new ResourceNotFoundError("Team", teamId);
    }

    const deletedMembership = await prisma.teamMembership.delete({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!deletedMembership) {
      throw new ResourceNotFoundError("Membership", null);
    }

    teamCache.revalidate({ id: teamId, userId });

    for (const productTeam of team.productTeams) {
      teamCache.revalidate({ productId: productTeam.productId });
    }

    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
};

export const joinTeam = async (userId: string, teamId: string): Promise<TTeamRole> => {
  validateInputs([userId, z.string()], [teamId, ZId]);
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        organizationId: true,
        productTeams: {
          select: {
            productId: true,
          },
        },
      },
    });
    if (!team) {
      throw new ResourceNotFoundError("Team", teamId);
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: team.organizationId,
        },
      },
      select: {
        organizationRole: true,
      },
    });

    if (!membership) {
      throw new ResourceNotFoundError("Membership", null);
    }

    let role: TeamRole = "contributor";

    if (membership.organizationRole === "owner" || membership.organizationRole === "manager") {
      role = "admin";
    }

    const createdMembership = await prisma.teamMembership.create({
      data: {
        teamId,
        userId,
        role,
      },
    });

    if (!createdMembership) {
      throw new DatabaseError("Failed to create team membership");
    }

    teamCache.revalidate({ id: teamId, userId });

    for (const productTeam of team.productTeams) {
      teamCache.revalidate({ productId: productTeam.productId });
    }

    return createdMembership.role;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
};

export const createTeam = async (organizationId: string, name: string): Promise<string> => {
  validateInputs([organizationId, ZId], [name, z.string()]);
  try {
    const doesTeamExist = await prisma.team.findFirst({
      where: {
        name,
        organizationId,
      },
    });

    if (doesTeamExist) {
      throw new InvalidInputError("Team name already exists");
    }

    if (name.length < 1) {
      throw new InvalidInputError("Team name must be at least 1 character long");
    }

    const team = await prisma.team.create({
      data: {
        name,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    teamCache.revalidate({ organizationId });

    return team.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
};
