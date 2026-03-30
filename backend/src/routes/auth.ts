import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import Hospital from '../models/hospital';
import Vendor from '../models/vendor';
import VendorHospital from '../models/vendorHospital';
import auth from '../middleware/auth';
import { validate } from '../middleware/validate';
import { preLoginSchema, loginSchema } from '../schemas/auth.schemas';

const router = Router();

// Pre-login: validate credentials and return vendor info + available hospitals
router.post('/pre-login', validate({ body: preLoginSchema }), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const u = await User.findOne({ email });
  if (!u) return res.status(401).json({ message: 'invalid' });
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).json({ message: 'invalid' });

  // Super-admin: no vendor/hospital needed
  if (u.role === 'super-admin') {
    return res.json({ role: u.role, vendorName: null, vendorStatus: null, hospitals: [] });
  }

  let vendorName: string | null = null;
  let vendorStatus: string | null = null;
  let hospitals: any[] = [];
  let revokedHospitals: any[] = [];

  if (u.vendorId) {
    const vendor = await Vendor.findById(u.vendorId).lean();
    vendorName = vendor?.name || null;
    vendorStatus = vendor?.status || null;
    if (vendor?.status !== 'approved') {
      return res.json({ role: u.role, vendorName, vendorStatus, hospitals: [] });
    }
    const assignments = await VendorHospital.find({ vendorId: u.vendorId, status: { $in: ['approved', 'revoked'] } })
      .populate('hospitalId', 'name address').lean();
    hospitals = assignments
      .filter((a: any) => a.hospitalId && a.status === 'approved')
      .map((a: any) => a.hospitalId);
    // Include revoked hospitals with an inactive flag
    revokedHospitals = assignments
      .filter((a: any) => a.hospitalId && a.status === 'revoked')
      .map((a: any) => ({ ...a.hospitalId, inactive: true }));
  } else {
    // Legacy user without vendor
    hospitals = await Hospital.find().select('name address').sort({ name: 1 }).lean();
  }

  res.json({ role: u.role, vendorName, vendorStatus, hospitals: [...hospitals, ...revokedHospitals] });
});

router.post('/login', validate({ body: loginSchema }), async (req: Request, res: Response) => {
  const { email, password, hospitalId } = req.body;
  const u = await User.findOne({ email });
  if (!u) return res.status(401).json({ message: 'invalid' });
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).json({ message: 'invalid' });

  // Super-admin: skip hospital entirely
  if (u.role === 'super-admin') {
    const token = jwt.sign(
      { id: u._id, role: u.role, name: u.name, hospitalId: null, vendorId: null },
      process.env.JWT_SECRET!, { expiresIn: '8h' }
    );
    return res.json({ token, role: u.role });
  }

  // Vendor-scoped users: validate vendor is approved
  if (u.vendorId) {
    const vendor = await Vendor.findById(u.vendorId);
    if (!vendor || vendor.status !== 'approved') {
      return res.status(403).json({ message: 'Your vendor account is not approved yet' });
    }
  }

  let hid = u.hospitalId;
  let readOnly = false;
  if (hospitalId) {
    // If user has a vendor, validate the hospital is approved or revoked for their vendor
    if (u.vendorId) {
      const assignment = await VendorHospital.findOne({
        vendorId: u.vendorId, hospitalId, status: { $in: ['approved', 'revoked'] }
      });
      if (!assignment) return res.status(403).json({ message: 'Hospital not assigned to your vendor' });
      if (assignment.status === 'revoked') readOnly = true;
    }
    const exists = await Hospital.findById(hospitalId);
    if (!exists) return res.status(400).json({ message: 'invalid hospital' });
    hid = hospitalId;
  } else if (u.vendorId) {
    // Vendor user with no hospital selected — allow login with null hospitalId
    hid = null as any;
  }
  // backfill hospitalId for legacy users (no vendor) without hospital assigned
  if (!hid && !u.vendorId) {
    const def = await Hospital.findOne();
    if (def) hid = def._id as any;
    if (!def) {
      const created = await Hospital.create({ name: 'General Hospital', address: '123 Main St' });
      hid = created._id as any;
    }
    if (!u.hospitalId) { u.hospitalId = hid as any; await u.save(); }
  }
  const token = jwt.sign(
    { id: u._id, role: u.role, name: u.name, hospitalId: hid, vendorId: u.vendorId || null, readOnly },
    process.env.JWT_SECRET!, { expiresIn: '8h' }
  );
  res.json({ token, role: u.role });
});

// Get hospitals available for the logged-in user's vendor (for hospital picker)
router.get('/my-hospitals', auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role === 'super-admin') {
    const hospitals = await Hospital.find().select('name address').sort({ name: 1 }).lean();
    return res.json(hospitals);
  }
  // For vendor users, show approved + revoked hospitals
  const u = await User.findById(user.id);
  if (u?.vendorId) {
    const assignments = await VendorHospital.find({ vendorId: u.vendorId, status: { $in: ['approved', 'revoked'] } })
      .populate('hospitalId', 'name address').lean();
    const hospitals = assignments
      .filter((a: any) => a.hospitalId)
      .map((a: any) => ({ ...a.hospitalId, inactive: a.status === 'revoked' }));
    return res.json(hospitals);
  }
  // Legacy users without vendor: show all hospitals
  const hospitals = await Hospital.find().select('name address').sort({ name: 1 }).lean();
  res.json(hospitals);
});

export default router;
