import { Router, Request, Response } from 'express';
import VendorHospital from '../models/vendorHospital';
import Hospital from '../models/hospital';
import User from '../models/user';
import auth from '../middleware/auth';
import { requireRole, requireSuperAdmin } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { vendorHospitalRequestSchema } from '../schemas/vendorHospital.schemas';

const router = Router();

// VENDOR-ADMIN: Request hospital assignment
router.post('/request', auth, requireRole('admin'), validate({ body: vendorHospitalRequestSchema }), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const u = await User.findById(user.id);
  if (!u?.vendorId) return res.status(400).json({ message: 'No vendor associated with your account' });

  const { hospitalId } = req.body;

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

  // Check if another vendor is already approved for this hospital
  const existingApproved = await VendorHospital.findOne({
    hospitalId, status: 'approved', vendorId: { $ne: u.vendorId }
  });
  if (existingApproved) return res.status(400).json({ message: 'Another vendor is already assigned to this hospital' });

  // Check if this vendor already has a request for this hospital
  const existingRequest = await VendorHospital.findOne({ vendorId: u.vendorId, hospitalId });
  if (existingRequest) {
    // Allow re-request if previously rejected or revoked
    if (existingRequest.status === 'rejected' || existingRequest.status === 'revoked') {
      existingRequest.status = 'requested';
      existingRequest.requestedAt = new Date();
      existingRequest.approvedAt = undefined;
      existingRequest.approvedBy = undefined;
      await existingRequest.save();
      return res.status(201).json(existingRequest);
    }
    return res.status(400).json({ message: 'Request already exists for this hospital' });
  }

  const record = await VendorHospital.create({
    vendorId: u.vendorId,
    hospitalId,
    status: 'requested'
  });
  res.status(201).json(record);
});

// VENDOR USER: List hospitals for logged-in user's vendor
router.get('/my-hospitals', auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const u = await User.findById(user.id);
  if (!u?.vendorId) {
    // Legacy user without vendor — return all hospitals
    const hospitals = await Hospital.find().select('name address').sort({ name: 1 }).lean();
    return res.json(hospitals.map(h => ({ hospitalId: h, status: 'approved' })));
  }

  const assignments = await VendorHospital.find({ vendorId: u.vendorId })
    .populate('hospitalId', 'name address').lean();
  res.json(assignments);
});

// SUPER-ADMIN: List all vendor-hospital assignments
router.get('/', auth, requireSuperAdmin(), async (req: Request, res: Response) => {
  const { status, vendorId, hospitalId } = req.query as any;
  const cond: any = {};
  if (status) cond.status = status;
  if (vendorId) cond.vendorId = vendorId;
  if (hospitalId) cond.hospitalId = hospitalId;

  const assignments = await VendorHospital.find(cond)
    .populate('vendorId', 'name contactEmail status')
    .populate('hospitalId', 'name address')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 }).lean();
  res.json(assignments);
});

// SUPER-ADMIN: Approve a vendor-hospital assignment
router.patch('/:id/approve', auth, requireSuperAdmin(), async (req: Request, res: Response) => {
  const assignment = await VendorHospital.findById(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

  // Verify no other vendor is already approved for this hospital
  const existingApproved = await VendorHospital.findOne({
    hospitalId: assignment.hospitalId,
    status: 'approved',
    _id: { $ne: assignment._id }
  });
  if (existingApproved) return res.status(400).json({ message: 'Another vendor is already approved for this hospital' });

  assignment.status = 'approved';
  assignment.approvedAt = new Date();
  assignment.approvedBy = (req as any).user.id;
  await assignment.save();
  res.json(assignment);
});

// SUPER-ADMIN: Reject a vendor-hospital assignment
router.patch('/:id/reject', auth, requireSuperAdmin(), async (req: Request, res: Response) => {
  const assignment = await VendorHospital.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected' },
    { new: true }
  );
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  res.json(assignment);
});

// SUPER-ADMIN: Revoke a vendor-hospital assignment
router.patch('/:id/revoke', auth, requireSuperAdmin(), async (req: Request, res: Response) => {
  const assignment = await VendorHospital.findById(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  if (assignment.status !== 'approved') return res.status(400).json({ message: 'Only approved assignments can be revoked' });
  assignment.status = 'revoked';
  await assignment.save();
  res.json(assignment);
});

export default router;
