import prisma from '@/app/configs/db.configs';

export const getStatsService = async () => {
  try {
    const [totalUser, totalEvents] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
    ]);

    return {
      totalUser,
      totalEvents,
      totalEarning: 68420.0, // Dummy data
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get stats service');
  }
};

const months = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

export const getUserActivityService = async ({ year }: { year: number }) => {
  try {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      select: {
        createdAt: true,
      },
    });

    const graphMap: Record<string, number> = {};
    months.forEach((m) => (graphMap[m] = 0));

    users.forEach((user) => {
      const monthIndex = user.createdAt.getMonth();
      const monthName = months[monthIndex];
      if (monthName) {
        graphMap[monthName] += 1;
      }
    });

    const graph = months.map((m) => ({ [m]: graphMap[m] ?? 0 }));

    return {
      years: [year],
      graph,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get user activity service');
  }
};

export const getEarningsService = async ({ year }: { year: number }) => {
  try {
    // Generate dummy earnings data
    const dummyGraphMap: Record<string, number> = {
      january: 20,
      february: 35,
      march: 50,
      april: 30,
      may: 10,
      june: 25,
      july: 65,
      august: 30,
      september: 10,
      october: 25,
      november: 160,
      december: 210,
    };

    const graph = months.map((m) => ({ [m]: dummyGraphMap[m] ?? 0 }));

    return {
      years: [year],
      graph,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get earnings service');
  }
};
