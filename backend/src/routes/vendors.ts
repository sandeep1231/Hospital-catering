import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Vendor from '../models/vendor';
import User from '../models/user';
import VendorHospital from '../models/vendorHospital';
import auth from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/roles';

const router = Router();

// PUBLIC: Vendor self-registration
router.post('/register', async (req: Request, res: Response) => {
  const { vendorName, contactEmail, contactPhone, address, adminName, adminEmail, adminPassword } = req.body;
  if (!vendorName || !contactEmail || !adminName || !adminEmail || !adminPassword) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Check vendor name uniqueness
  const existingVendor = await Vendor.findOne({ name: vendorName });
  if (existingVendor) return res.status(400).json({ message: 'Vendor name already exists' });

  // Check admin email uniqueness
  const existingUser = await User.findOne({ email: adminEmail });
  if (existingUser) return res.status(400).json({ message: 'Email already exists' });

  // Create vendor
  const vendor = await Vendor.create({
    name: vendorName,
    contactEmail,
    contactPhone,
    address,
    status: 'pending'
  });

  // Create admin user for this vendor
  const hash = await bcrypt.hash(adminPassword, 10);
  const user = await User.create({
    name: adminName,
    email: adminEmail,
    passwordHash: hash,
    role: 'admin',
    vendorId: vendor._id
  });

  // Link createdBy back to the user
  vendor.createdBy = user._id as any;
  await vendor.save();

  res.status(201).json({
    message: 'Registration submitted for approval',
    vendor: { id: vendor._id, name: vendor.name, status: vendor.status },
    user: { id: user._id, name: user.name, email: user.email }
  });
});

// SUPER-ADMIN: List all vendors
router.get('/', auth, requireSuperAdmin(), async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query as any;
  const cond: any = {};
  if (status) cond.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [vendors, total] = await Promise.all([
    Vendor.find(cond).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Vendor.countDocuments(cond)
  ]);

  // Attach hospital count for each vendor
  const vendorIds = vendors.map(v => v._id);
  const hospitalCounts = await VendorHospital.aggregate([
    { $match: { vendorId: { $in: vendorIds }, status: 'approved' } },
    { $group: { _id: '$vendorId', count: { $sum: 1 } } }
  ]);
  const countMap: any = {};
  hospitalCounts.forEach((h: any) => { countMap[String(h._id)] = h.count; });

  const result = vendors.map(v => ({
    ...v,
    hospitalCount: countMap[String(v._id)] || 0
  }));

  res.json({ vendors: result, total, page: parseInt(page), limit: parseInt(limit) });
});

// SUPER-ADMIN: Get vendor detail
router.get('/:id', auth, requireSuperAdmin(), async (req: Request, res: Response) => {
  const vendor = await Vendor.findById(req.params.id).lean();
  if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

  const [hospitals, users] = await Promise.all([
    VendorHospital.find({ vendorId: vendor._id }).populate('hospitalId', 'name address').lean(),
    User.find({ vendorId: vendor._id }).select('name email role hospitalId createdAt').lean()
  ]);

  res.json({ vendor, hospitals, users });
});

// SUPER-ADMIN: Update vendor
router.put('/:id', auth, requireSuperAdmin(), async (req: Request, res: Response) => {
  const { name, contactEmail, contactPhone, address } = req.body;
  const updated = await Vendor.findByIdAndUpdate(
    req.params.id,
    { name, contactEmail, contactPhone, address },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: 'Vendor not found' });
  res.json(updated);
});

// SUPER-ADMIN: Change vendor status (approve/reject/suspend)
router.patch('/:id/status', auth, requireSuperAdmin(), async (req: Request, res: Response) => {
  const { status } = req.body;
  const allowed = ['pending', 'approved', 'rejected', 'suspended'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

  const vendor = await Vendor.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
  res.json(vendor);
});

export default router;
