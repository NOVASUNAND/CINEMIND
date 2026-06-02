import { Request } from 'express';

// 🚀 FIXED: We removed the explicit _id property declaration from here
export interface IUser {
  username: string;
  email: string;
  password?: string;
  createdAt: Date;
}

export interface IJwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}