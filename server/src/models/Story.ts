import mongoose, { Schema, Document } from 'mongoose';


export interface IStory extends Document {
  imageUrl: string;
  filename: string;
  normalCaption: string;
  advancedCaption: string;
  narrative: string;
  createdAt: Date;
}

// 2. Define the Schema
const StorySchema: Schema = new Schema({
  imageUrl: { type: String, required: false },
  filename: { type: String, required: true },
  normalCaption: { type: String, required: true },
  advancedCaption: { type: String, required: true },
  narrative: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// 3. Export the Model with the Interface applied
export default mongoose.model<IStory>('Story', StorySchema);