import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access Denied. Missing or malformed Auth Token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback_jwt_secret_token_123456';
    const verified = jwt.verify(token, jwtSecret) as { id: string; email: string };
    
    req.user = verified;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or Expired Security Token' });
  }
};
