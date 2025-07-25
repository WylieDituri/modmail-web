import { NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firestore';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-change-in-production';
const ADMINS = process.env.ADMINS?.split(',') || [];

export async function GET(request: Request) {
  try {
    // Get token from cookie
    const cookieHeader = request.headers.get('cookie');
    let token = null;
    
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
      );
      token = cookies['auth-token'];
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify JWT token and check admin status
    const decoded = verify(token, JWT_SECRET) as {
      userId: string;
      discordId: string;
      username: string;
      isModerator: boolean;
      isAdmin?: boolean;
    };

    // Double-check admin status
    if (!decoded.isAdmin && !ADMINS.includes(decoded.discordId)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all moderators from config
    const moderatorIds = await FirestoreService.getModeratorsConfig();

    // Get all users and filter for moderators
    const allUsers = await FirestoreService.getAllUsers();
    const moderatorUsers = allUsers.filter(user => 
      user.isModerator || moderatorIds.includes(user.discordId)
    );

    // Get all sessions
    const allSessions = await FirestoreService.getAllSessions();
    
    // Calculate basic stats
    const totalSessions = allSessions.length;
    const activeSessions = allSessions.filter(s => s.status === 'active').length;
    
    // Calculate sessions resolved today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = allSessions.filter(s => 
      s.status === 'closed' && s.closedAt && new Date(s.closedAt) >= today
    ).length;

    // Calculate overall satisfaction rate
    const ratedSessions = allSessions.filter(s => s.satisfactionRating);
    const positiveRatings = ratedSessions.filter(s => s.satisfactionRating === 'thumbs_up').length;
    const averageSatisfactionRate = ratedSessions.length > 0 
      ? (positiveRatings / ratedSessions.length) * 100 
      : 0;

    // Calculate average response and resolution times
    let totalResponseTime = 0;
    let totalResolutionTime = 0;
    let responseTimeCount = 0;
    let resolutionTimeCount = 0;

    allSessions.forEach(session => {
      // Response time: time from session creation to first moderator message
      const firstModMessage = session.messages.find(msg => msg.author?.isModerator);
      if (firstModMessage) {
        const responseTime = new Date(firstModMessage.timestamp).getTime() - new Date(session.createdAt).getTime();
        totalResponseTime += responseTime / (1000 * 60); // Convert to minutes
        responseTimeCount++;
      }

      // Resolution time: time from session creation to closure
      if (session.status === 'closed' && session.closedAt) {
        const resolutionTime = new Date(session.closedAt).getTime() - new Date(session.createdAt).getTime();
        totalResolutionTime += resolutionTime / (1000 * 60); // Convert to minutes
        resolutionTimeCount++;
      }
    });

    const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
    const averageResolutionTime = resolutionTimeCount > 0 ? totalResolutionTime / resolutionTimeCount : 0;

    // Daily session counts for the last 7 days
    const dailySessionCounts = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = allSessions.filter(s => {
        const sessionDate = new Date(s.createdAt);
        return sessionDate >= date && sessionDate < nextDate;
      }).length;
      
      dailySessionCounts.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }

    // Hourly distribution
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: allSessions.filter(s => new Date(s.createdAt).getHours() === hour).length
    }));

    // Calculate detailed moderator stats
    const moderatorStatsPromises = moderatorUsers.map(async (moderator) => {
      const moderatorSessions = allSessions.filter(s => s.assignedModerator === moderator.id);
      
      const totalSessions = moderatorSessions.length;
      const activeSessions = moderatorSessions.filter(s => s.status === 'active').length;
      const resolvedToday = moderatorSessions.filter(s => 
        s.status === 'closed' && s.closedAt && new Date(s.closedAt) >= today
      ).length;

      // Calculate satisfaction rate for this moderator
      const moderatorRatedSessions = moderatorSessions.filter(s => s.satisfactionRating);
      const moderatorPositive = moderatorRatedSessions.filter(s => s.satisfactionRating === 'thumbs_up').length;
      const satisfactionRate = moderatorRatedSessions.length > 0 
        ? (moderatorPositive / moderatorRatedSessions.length) * 100 
        : 0;

      // Calculate response and resolution times for this moderator
      let modResponseTime = 0;
      let modResolutionTime = 0;
      let modResponseCount = 0;
      let modResolutionCount = 0;

      moderatorSessions.forEach(session => {
        const firstModMessage = session.messages.find(msg => msg.author?.isModerator);
        if (firstModMessage) {
          const responseTime = new Date(firstModMessage.timestamp).getTime() - new Date(session.createdAt).getTime();
          modResponseTime += responseTime / (1000 * 60);
          modResponseCount++;
        }

        if (session.status === 'closed' && session.closedAt) {
          const resolutionTime = new Date(session.closedAt).getTime() - new Date(session.createdAt).getTime();
          modResolutionTime += resolutionTime / (1000 * 60);
          modResolutionCount++;
        }
      });

      const averageResponseTime = modResponseCount > 0 ? modResponseTime / modResponseCount : 0;
      const averageResolutionTime = modResolutionCount > 0 ? modResolutionTime / modResolutionCount : 0;

      // Weekly and monthly stats
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const sessionsThisWeek = moderatorSessions.filter(s => new Date(s.createdAt) >= oneWeekAgo).length;
      const sessionsThisMonth = moderatorSessions.filter(s => new Date(s.createdAt) >= oneMonthAgo).length;

      return {
        moderatorId: moderator.id,
        discordId: moderator.discordId,
        username: moderator.username,
        avatar: moderator.avatar,
        totalSessions,
        activeSessions,
        resolvedToday,
        satisfactionRate,
        averageResponseTime,
        averageResolutionTime,
        sessionsThisWeek,
        sessionsThisMonth,
        lastActive: new Date(), // TODO: Implement last active tracking
      };
    });

    const moderatorStats = await Promise.all(moderatorStatsPromises);

    // Get top 3 performers (by resolved sessions this week)
    const topPerformers = [...moderatorStats]
      .sort((a, b) => b.sessionsThisWeek - a.sessionsThisWeek)
      .slice(0, 3);

    const adminStats = {
      totalModerators: moderatorUsers.length,
      totalSessions,
      activeSessions,
      resolvedToday,
      averageSatisfactionRate,
      averageResponseTime,
      averageResolutionTime,
      dailySessionCounts,
      hourlyDistribution,
      topPerformers,
      moderatorStats,
    };

    return NextResponse.json(adminStats);

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
