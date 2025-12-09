import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth';

export class AreaController {
  static async getAreas(req: AuthRequest, res: Response) {
    try {
      const areas = await prisma.area.findMany({
        orderBy: { name: 'asc' }
      });

      res.json(areas);
    } catch (error) {
      console.error('Error obteniendo áreas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}