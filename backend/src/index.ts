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
import orderRoutes from './routes/orders';
import menuItemRoutes from './routes/menuItems';
import dietPlanRoutes from './routes/dietPlans';
import auditLogRoutes from './routes/auditLogs';
import notificationRoutes from './routes/notifications';
import vendorRoutes from './routes/vendors';
import vendorHospitalRoutes from './routes/vendorHospitals';
import superAdminRoutes from './routes/superAdmin';
import Hospital from './models/hospital';
import { fixIndexes } from './utils/fixIndexes';

dotenv.config();

// Force process timezone to IST to keep any implicit date ops consistent
process.env.TZ = 'Asia/Kolkata';

const app = express();
app.use(compression());
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
// Always allow local dev origins
['http://localhost:4200', 'http://localhost:4000'].forEach(o => {
  if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
});
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  maxAge: 86400,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/diet-assignments', dietAssignmentRoutes);
app.use('/api/diets', dietTypeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/diet-plans', dietPlanRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/vendor-hospitals', vendorHospitalRoutes);
app.use('/api/super-admin', superAdminRoutes);

const PORT = process.env.PORT || 4000;

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('FATAL: MONGO_URI is not set in environment. Set MONGO_URI in backend/.env to your MongoDB connection string.');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    // One-time index fixes/migrations
    await fixIndexes();
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
