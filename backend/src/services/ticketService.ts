// src/services/ticketService.ts
import { prisma } from '../app';
import { EmailService } from './emailService';

export class TicketService {
  static async createTicket(data: {
    title: string;
    description: string;
    creatorId: number;
    areaId: number;
    assignedToId?: number;
  }) {
    return await prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        creatorId: data.creatorId,
        areaId: data.areaId,
        assignedToId: data.assignedToId,
        lastActivityAt: new Date()
      },
      include: {
        creator: true,
        assignedTo: true,
        area: true
      }
    });
  }

  static async addComment(ticketId: number, userId: number, content: string) {
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        lastActivityAt: new Date(),
        comments: {
          create: {
            content,
            userId
          }
        }
      },
      include: {
        comments: {
          include: {
            user: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Verificar alertas por inactividad
    await this.checkInactivityAlerts(ticketId);

    return ticket;
  }

  static async checkInactivityAlerts(ticketId: number) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!ticket) return;

    const lastActivity = ticket.lastActivityAt;
    const now = new Date();
    const daysInactive = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysInactive >= 3 && daysInactive < 6) {
      // Alerta amarilla - enviar email
      await EmailService.sendInactivityAlert(ticket, 'yellow');
    } else if (daysInactive >= 6) {
      // Alerta roja - enviar email
      await EmailService.sendInactivityAlert(ticket, 'red');
    }
  }

  static async getTicketsForUser(userId: number, userRole: string, userAreaId: number) {
    const baseInclude = {
      creator: true,
      assignedTo: true,
      area: true,
      comments: {
        include: {
          user: true
        },
        orderBy: { createdAt: 'asc' }
      },
      transfers: {
        include: {
          fromArea: true,
          toArea: true,
          requestedBy: true,
          approvedBy: true
        }
      },
      history: {
        include: {
          user: true
        },
        orderBy: { createdAt: 'asc' }
      }
    };

    switch (userRole) {
      case 'USER':
        return await prisma.ticket.findMany({
          where: {
            OR: [
              { creatorId: userId },
              { assignedToId: userId }
            ],
            status: { not: 'CERRADO' }
          },
          include: baseInclude,
          orderBy: { updatedAt: 'desc' }
        });

      case 'MANAGER':
        return await prisma.ticket.findMany({
          where: {
            areaId: userAreaId,
            status: { not: 'CERRADO' }
          },
          include: baseInclude,
          orderBy: { updatedAt: 'desc' }
        });

      case 'ADMIN':
        return await prisma.ticket.findMany({
          where: {
            areaId: userAreaId
          },
          include: baseInclude,
          orderBy: { updatedAt: 'desc' }
        });

      case 'SUPERADMIN':
        return await prisma.ticket.findMany({
          include: baseInclude,
          orderBy: { updatedAt: 'desc' }
        });

      default:
        return [];
    }
  }

  static async closeTicket(ticketId: number, userId: number) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    if (ticket.creatorId !== userId) {
      throw new Error('Solo el creador puede cerrar el ticket');
    }

    return await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'CERRADO',
        closedAt: new Date()
      }
    });
  }
}