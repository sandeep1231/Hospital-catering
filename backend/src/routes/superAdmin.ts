import { Router, Request, Response } from 'express';
import Vendor from '../models/vendor';
import Hospital from '../models/hospital';
import VendorHospital from '../models/vendorHospital';
import User from '../models/user';
import auth from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { createHospitalSchema } from '../schemas/hospital.schemas';

const router = Router();

// All routes require super-admin
router.use(auth, requireSuperAdmin());

// GET /stats — Platform overview
router.get('/stats', async (req: Request, res: Response) => {
  const [totalVendors, pendingVendors, approvedVendors, suspendedVendors,
    totalHospitals, totalAssignments, pendingRequests, totalUsers] = await Promise.all([
    Vendor.countDocuments(),
    Vendor.countDocuments({ status: 'pending' }),
    Vendor.countDocuments({ status: 'approved' }),
    Vendor.countDocuments({ status: 'suspended' }),
    Hospital.countDocuments(),
    VendorHospital.countDocuments({ status: 'approved' }),
    VendorHospital.countDocuments({ status: 'requested' }),
    User.countDocuments({ role: { $ne: 'super-admin' } })
  ]);

  res.json({
    totalVendors, pendingVendors, approvedVendors, suspendedVendors,
    totalHospitals, totalAssignments, pendingRequests, totalUsers
  });
});

// GET /hospitals — List all hospitals (no vendor scope)
router.get('/hospitals', async (req: Request, res: Response) => {
  const hospitals = await Hospital.find().sort({ name: 1 }).lean();

  // Attach assigned vendor info
  const assignments = await VendorHospital.find({ status: 'approved' })
    .populate('vendorId', 'name').lean();
  const assignmentMap: any = {};
  assignments.forEach((a: any) => {
    assignmentMap[String(a.hospitalId)] = a.vendorId;
  });

  const result = hospitals.map(h => ({
    ...h,
    assignedVendor: assignmentMap[String(h._id)] || null
  }));

  res.json(result);
});

// POST /hospitals — Create hospital
router.post('/hospitals', validate({ body: createHospitalSchema }), async (req: Request, res: Response) => {
  const { name, address } = req.body;
  const existing = await Hospital.findOne({ name });
  if (existing) return res.status(400).json({ message: 'hospital already exists' });
  const h = await Hospital.create({ name, address });
  res.status(201).json(h);
});

// GET /vendors/:id/users — List users belonging to a vendor
router.get('/vendors/:id/users', async (req: Request, res: Response) => {
  const users = await User.find({ vendorId: req.params.id })
    .select('name email role hospitalId createdAt')
    .sort({ createdAt: -1 }).lean();
  res.json(users);
});

export default router;
