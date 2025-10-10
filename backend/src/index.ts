import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import dietPlanRoutes from './routes/dietPlans';
import menuRoutes from './routes/menuItems';
import orderRoutes from './routes/orders';
import userRoutes from './routes/users';
import setupAgenda from './jobs/orderGenerator';
import { seedDemo } from './utils/seed';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/diet-plans', dietPlanRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 4000;

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/catering';

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedDemo();
    // start agenda
    setupAgenda(mongoUri);
    app.listen(PORT, () => console.log(`Server started on ${PORT}`));
  })
  .catch(err => console.error(err));
