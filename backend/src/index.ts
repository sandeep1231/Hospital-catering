import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import compression from 'compression';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import userRoutes from './routes/users';
import hospitalRoutes from './routes/hospitals';
import { seedDemo } from './utils/seed';
import reportRoutes from './routes/reports';
import dietAssignmentRoutes from './routes/dietAssignments';
import dietTypeRoutes from './routes/dietTypes';
import Hospital from './models/hospital';

dotenv.config();

const app = express();
app.use(compression());
app.use(cors({ origin: true, credentials: true, maxAge: 86400 }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/diet-assignments', dietAssignmentRoutes);
app.use('/api/diets', dietTypeRoutes);

const PORT = process.env.PORT || 4000;

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('FATAL: MONGO_URI is not set in environment. Set MONGO_URI in backend/.env to your MongoDB connection string.');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    // Ensure indexes exist (notably Hospitals name index for faster search/sort)
    try {
      await Hospital.syncIndexes();
      console.log('Hospital indexes synced');
    } catch (e) {
      console.warn('Failed to sync indexes:', e);
    }
    await seedDemo();
    app.listen(PORT, () => console.log(`Server started on ${PORT}`));
  })
  .catch(err => console.error(err));
