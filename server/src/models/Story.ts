import mongoose, { Schema, Document } from 'mongoose';




// 1. Updated TypeScript Interface with the missing analytics fields
export interface IStory extends Document {
  user: mongoose.Types.ObjectId;
  imageUrl: string;
  filename: string;
  normalCaption: string;
  advancedCaption: string;
  narrative: string;
  executionMode: string;
  executionModeHistory: string[];      
  totalGenerationAttempts: number;    
  generationLatencyMs: number;        
  selfCorrected: boolean;             
  retryCount: number;                 
  createdAt: Date;
}

// 2. Updated Mongoose Schema
const StorySchema: Schema = new Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  imageUrl: { type: String, required: false },
  filename: { type: String, required: true },
  normalCaption: { type: String, required: true },
  advancedCaption: { type: String, required: true },
  narrative: { type: String, required: true },
  executionMode: { type: String, default: "CLOUD_PRIMARY" },
  executionModeHistory: { type: [String], default: [] },       
  totalGenerationAttempts: { type: Number, default: 1 },       
  generationLatencyMs: { type: Number, default: 0 },           
  selfCorrected: { type: Boolean, default: false },            
  retryCount: { type: Number, default: 0 },                    
  createdAt: { type: Date, default: Date.now }
});

// 3. Export the Model with the Interface applied
export default mongoose.model<IStory>('Story', StorySchema);