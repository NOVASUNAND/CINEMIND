import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// 🚀 SIGN-UP (Register a new developer profile)
export const signUp = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All profile payload vectors are required." });
    }

    // Check if identity endpoint is already occupied
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Identity profile already index-registered." });
    }

    // Hash the password vector securely using Salt operations
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Commit profile to MongoDB
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword
    });

    // Sign the secure JWT Session token
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET || 'fallback_super_secret_key',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: { id: newUser._id, username: newUser.username, email: newUser.email }
    });
  } catch (error: any) {
    console.error("❌ Auth Registration Exception:", error);
    return res.status(500).json({ error: "Internal compilation pipeline failure during registration." });
  }
};

// 🚀 SIGN-IN (Authenticate session credentials)
export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing credential vectors." });
    }

    // Verify identity profile index target exists
   // Verify identity profile index target exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid signature credentials." });
    }  

// 🚀 FIXED: Explicit guard clause to verify the hashed password exists in the document
    if (!user.password) {
      return res.status(400).json({ error: "Authentication profile configuration corrupted." });
    }

// TypeScript now knows with 100% certainty that user.password is a string!
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid signature credentials." });
    }
    // Authorize persistent runtime session token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_super_secret_key',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error: any) {
    console.error("❌ Auth Authorization Exception:", error);
    return res.status(500).json({ error: "Internal compilation system fault during session lock." });
  }
};