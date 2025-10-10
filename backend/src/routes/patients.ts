import { Router, Request, Response } from 'express';
import Patient from '../models/patient';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import AuditLog from '../models/auditLog';

const router = Router();

router.get('/', auth, async (req: Request, res: Response) => {
  const patients = await Patient.find().limit(100);
  res.json(patients);
});

router.get('/:id', auth, async (req: Request, res: Response) => {
  const p = await Patient.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'not found' });
  res.json(p);
});

function validatePatientInput(body: any) {
  const errors: { field?: string; message: string }[] = [];
  const cleaned: any = {};

  if (!body || typeof body !== 'object') { errors.push({ message: 'Invalid payload' }); return { valid: false, errors }; }

  // name
  if (!body.name || String(body.name).trim().length === 0) errors.push({ field: 'name', message: 'name is required' }); else cleaned.name = String(body.name).trim();

  // phone (optional)
  if (body.phone) {
    const phone = String(body.phone).trim();
    const phoneRe = /^[0-9+()\-\s]{5,20}$/;
    if (!phoneRe.test(phone)) errors.push({ field: 'phone', message: 'phone format is invalid' }); else cleaned.phone = phone;
  }

  // inDate
  if (body.inDate) {
    const d = new Date(body.inDate);
    if (isNaN(d.getTime())) errors.push({ field: 'inDate', message: 'inDate is invalid' }); else cleaned.inDate = d;
  }

  // inTime
  if (body.inTime) {
    const t = String(body.inTime).trim();
    const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRe.test(t)) errors.push({ field: 'inTime', message: 'inTime must be HH:MM' }); else cleaned.inTime = t;
  }

  // roomType, bed, diet
  if (body.roomType) cleaned.roomType = String(body.roomType);
  if (body.bed) cleaned.bed = String(body.bed);
  if (body.diet) cleaned.diet = String(body.diet);

  // status
  if (body.status) {
    const allowed = ['in_patient','discharged','outpatient'];
    if (!allowed.includes(body.status)) errors.push({ field: 'status', message: 'status is invalid' }); else cleaned.status = body.status;
  }

  // transactionType
  if (body.transactionType) {
    const allowedT = ['cash','card','insurance'];
    if (!allowedT.includes(body.transactionType)) errors.push({ field: 'transactionType', message: 'transactionType is invalid' }); else cleaned.transactionType = body.transactionType;
  }

  // age
  if (body.age !== undefined && body.age !== null && body.age !== '') {
    const age = Number(body.age);
    if (Number.isNaN(age) || age < 0 || age > 150) errors.push({ field: 'age', message: 'age is invalid' }); else cleaned.age = age;
  }

  // sex
  if (body.sex) {
    const allowedS = ['male','female','other'];
    if (!allowedS.includes(body.sex)) errors.push({ field: 'sex', message: 'sex is invalid' }); else cleaned.sex = body.sex;
  }

  // bills
  if (body.totalBill !== undefined) {
    const tb = Number(body.totalBill);
    if (Number.isNaN(tb) || tb < 0) errors.push({ field: 'totalBill', message: 'totalBill is invalid' }); else cleaned.totalBill = tb;
  }
  if (body.dailyBill !== undefined) {
    const db = Number(body.dailyBill);
    if (Number.isNaN(db) || db < 0) errors.push({ field: 'dailyBill', message: 'dailyBill is invalid' }); else cleaned.dailyBill = db;
  }

  // recurringDetails - allow object or JSON string
  if (body.recurringDetails) {
    if (typeof body.recurringDetails === 'string') {
      try { cleaned.recurringDetails = JSON.parse(body.recurringDetails); } catch (e) { cleaned.recurringDetails = body.recurringDetails; }
    } else cleaned.recurringDetails = body.recurringDetails;
  }

  if (body.feedback) cleaned.feedback = String(body.feedback);
  if (body.allergies) cleaned.allergies = Array.isArray(body.allergies) ? body.allergies.map(String) : [String(body.allergies)];
  if (body.notes) cleaned.notes = String(body.notes);

  return { valid: errors.length === 0, errors, cleaned };
}

// POST /api/patients (create)
router.post('/', auth, requireRole('admin','dietician'), async (req: Request, res: Response) => {
  const { valid, errors, cleaned } = validatePatientInput(req.body);
  if (!valid) return res.status(400).json({ errors });
  try {
    const p = new Patient(cleaned);
    await p.save();
    // audit
    try { await AuditLog.create({ entity: 'Patient', entityId: p._id, action: 'create', userId: (req as any).user?.id || null, details: cleaned }); } catch (e) { console.error('audit error', e); }
    res.status(201).json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'failed to create patient' });
  }
});

// update patient
router.put('/:id', auth, requireRole('admin','dietician'), async (req: Request, res: Response) => {
  // validate input similarly to creation
  const { valid, errors, cleaned } = validatePatientInput(req.body);
  if (!valid) return res.status(400).json({ errors });

  try {
    const updated = await Patient.findByIdAndUpdate(req.params.id, cleaned, { new: true });
    if (!updated) return res.status(404).json({ message: 'not found' });
    // write audit
    try { await AuditLog.create({ entity: 'Patient', entityId: updated._id, action: 'update', userId: (req as any).user?.id || null, details: cleaned }); } catch (e) { console.error('audit error', e); }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'failed to update patient' });
  }
});

export default router;
