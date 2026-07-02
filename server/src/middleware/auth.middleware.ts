import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (
  req: any,
  res: Response,
  next: NextFunction
) => {
  console.log("AUTH HEADER:", req.headers.authorization);
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

   // console.log("JWT_SECRET:", process.env.JWT_SECRET);
    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    req.user = {
      id: decoded.userId
    };

    next();
  } catch (error) {
  console.log("JWT ERROR:", error);

  return res.status(401).json({
    error: "Invalid token"
  });
}
};