import mongoose from 'mongoose';
import { enableMockDb } from './mockDb';

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.warn('MONGO_URI not specified. Falling back to Mock Database.');
    enableMockDb();
    return;
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB. Falling back to Mock Database.', error);
    enableMockDb();
  }
};

