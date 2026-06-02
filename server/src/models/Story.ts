import mongoose, { Schema, Document } from 'mongoose';


export interface IStory extends Document {
  user: mongoose.Types.ObjectId;
  imageUrl: string;
  filename: string;
  normalCaption: string;
  advancedCaption: string;
  narrative: string;
  executionMode: string;
  createdAt: Date;
}

// 2. Define the Schema
const StorySchema: Schema = new Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  imageUrl: { type: String, required: false },
  filename: { type: String, required: true },
  normalCaption: { type: String, required: true },
  advancedCaption: { type: String, required: true },
  narrative: { type: String, required: true },
  executionMode: { type: String, default: "CLOUD_PRIMARY" },
  createdAt: { type: Date, default: Date.now }
});

// 3. Export the Model with the Interface applied
export default mongoose.model<IStory>('Story', StorySchema);