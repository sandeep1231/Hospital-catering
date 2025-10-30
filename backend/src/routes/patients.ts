import { Router, Request, Response } from 'express';
import Patient from '../models/patient';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import AuditLog from '../models/auditLog';
import DietAssignment from '../models/dietAssignment';
import { istStartOfDayUTCForDate } from '../utils/time';

const router = Router();

router.get('/', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const q = (req.query?.q ? String(req.query.q) : '').trim();
  const cond: any = hid ? { hospitalId: hid } : {};
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(safe, 'i');
    cond.$or = [{ name: re }, { phone: re }];
  }
  // optional roomType / roomNo filters (case-insensitive exact match)
  const roomTypeParam = (req.query?.roomType ? String(req.query.roomType) : '').trim();
  if (roomTypeParam) {
    const safeRT = roomTypeParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cond.roomType = new RegExp('^' + safeRT + '$', 'i');
  }
  const roomNoParam = (req.query?.roomNo ? String(req.query.roomNo) : '').trim();
  if (roomNoParam) {
    const safeRN = roomNoParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cond.roomNo = new RegExp('^' + safeRN + '$', 'i');
  }
  // optional patient status filter
  const statusFilter = (req.query?.status ? String(req.query.status) : '').trim();
  const allowedStatuses = ['in_patient','discharged','outpatient'];
  if (statusFilter && allowedStatuses.includes(statusFilter)) cond.status = statusFilter;

  const dietStatusFilter = (req.query?.dietStatus ? String(req.query.dietStatus) : '').trim();
  let finalCond = { ...cond } as any;

  // pagination params (opt-in). If page/pageSize are provided, return paged response
  const pageParam = req.query?.page ? parseInt(String(req.query.page), 10) : undefined;
  const pageSizeParam = req.query?.pageSize ? parseInt(String(req.query.pageSize), 10) : undefined;
  const wantsPaged = Number.isInteger(pageParam as any) || Number.isInteger(pageSizeParam as any);
  const page = Math.max(1, pageParam || 1);
  const pageSize = Math.min(100, Math.max(1, pageSizeParam || 20));

  // If filtering by today's diet assignment status, first find patient ids that match
  if (dietStatusFilter && ['pending','delivered','cancelled'].includes(dietStatusFilter)) {
    const prelim = await Patient.find(cond).select('_id').lean();
    const ids = prelim.map(p => p._id);
    if (ids.length === 0) {
      return wantsPaged ? res.json({ items: [], total: 0, page, pageSize }) : res.json([]);
    }
    const aCond: any = { patientId: { $in: ids } };
    if (hid) aCond.hospitalId = hid;
    aCond.status = dietStatusFilter;
    const matched = await DietAssignment.find(aCond).select('patientId').lean();
    const allowedIds = Array.from(new Set(matched.map(m => String(m.patientId))));
    if (allowedIds.length === 0) {
      return wantsPaged ? res.json({ items: [], total: 0, page, pageSize }) : res.json([]);
    }
    finalCond._id = { $in: allowedIds };
  }

  // If paged mode requested
  if (wantsPaged) {
  const total = await Patient.countDocuments(finalCond);
    const patients = await Patient.find(finalCond)
      .sort({ inDate: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // Attach diet history (recent up to 12)
    try {
      const ids = patients.map(p => p._id);
      if (ids.length) {
        const aCond: any = { patientId: { $in: ids } };
        if (hid) aCond.hospitalId = hid;
        const all = await DietAssignment.find(aCond)
          .select('patientId status diet date')
          .sort({ date: -1, createdAt: -1 })
          .lean();
        const histMap = new Map<string, any[]>();
        for (const a of all) {
          const k = String(a.patientId);
          if (!histMap.has(k)) histMap.set(k, []);
          const arr = histMap.get(k)!;
          if (arr.length < 12) {
            arr.push({ date: a.date, status: a.status, diet: a.diet });
          }
        }
        for (const p of patients as any[]) {
          (p as any).dietHistory = histMap.get(String(p._id)) || [];
        }
      }
    } catch (e) { /* non-fatal */ }

    return res.json({ items: patients, total, page, pageSize });
  }

  // Legacy non-paged response (limit to prevent overload)
  const limit = q ? 50 : 100;
  const patients = await Patient.find(finalCond).sort({ inDate: -1, createdAt: -1 }).limit(limit).lean();
  try {
    const ids = patients.map(p => p._id);
    if (ids.length) {
      const aCond: any = { patientId: { $in: ids } };
      if (hid) aCond.hospitalId = hid;
      const all = await DietAssignment.find(aCond)
        .select('patientId status diet date')
        .sort({ date: -1, createdAt: -1 })
        .lean();
      const histMap = new Map<string, any[]>();
      for (const a of all) {
        const k = String(a.patientId);
        if (!histMap.has(k)) histMap.set(k, []);
        const arr = histMap.get(k)!;
        if (arr.length < 12) {
          arr.push({ date: a.date, status: a.status, diet: a.diet });
        }
      }
      for (const p of patients as any[]) {
        (p as any).dietHistory = histMap.get(String(p._id)) || [];
      }
    }
  } catch (e) { /* non-fatal */ }

  return res.json(patients);
});

// GET /api/patients/meta - returns distinct room types and room numbers
router.get('/meta', auth, async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
    const base = hid ? { hospitalId: hid } : {};
    const types = await Patient.distinct('roomType', base);
    const numbers = await Patient.distinct('roomNo', base);
    // filter out null/empty values and sort naturally
    const roomTypes = (types || []).filter(Boolean).map(String).filter(v => v.trim().length).sort((a,b)=>a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const roomNos = (numbers || []).filter(Boolean).map(String).filter(v => v.trim().length).sort((a,b)=>{
      const an = parseInt(a, 10); const bn = parseInt(b, 10);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
    res.json({ roomTypes, roomNos });
  } catch (e) {
    console.error('meta error', e);
    res.json({ roomTypes: [], roomNos: [] });
  }
});

// GET /api/patients/meta/room-nos?roomType=TYPE - distinct room numbers for a specific room type
router.get('/meta/room-nos', auth, async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
    const roomTypeParam = (req.query?.roomType ? String(req.query.roomType) : '').trim();
    const base: any = hid ? { hospitalId: hid } : {};
    if (roomTypeParam) {
      base.roomType = new RegExp('^' + roomTypeParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
    }
    const numbers = await Patient.distinct('roomNo', base);
    const roomNos = (numbers || []).filter(Boolean).map(String).filter(v => v.trim().length).sort((a,b)=>{
      const an = parseInt(a, 10); const bn = parseInt(b, 10);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
    res.json({ roomNos });
  } catch (e) {
    console.error('room-nos meta error', e);
    res.json({ roomNos: [] });
  }
});

router.get('/:id', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const p = await Patient.findOne({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}) });
  if (!p) return res.status(404).json({ message: 'not found' });
  res.json(p);
});

// PUT /api/patients/:id/feedback - update only feedback (admin, diet-supervisor, dietician)
router.put('/:id/feedback', auth, requireRole('admin','diet-supervisor','dietician'), async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
    const p = await Patient.findOne({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}) });
    if (!p) return res.status(404).json({ message: 'not found' });
    const feedback = req.body && typeof req.body.feedback === 'string' ? String(req.body.feedback) : '';
    p.feedback = feedback;
    await p.save();
    try { await AuditLog.create({ entity: 'Patient', entityId: p._id, action: 'update-feedback', userId: (req as any).user?.id || null, details: { feedback } }); } catch {}
    res.json({ _id: p._id, feedback: p.feedback });
  } catch (e) {
    console.error('feedback update failed', e);
    res.status(500).json({ message: 'failed to update feedback' });
  }
});

function validatePatientInput(body: any) {
  const errors: { field?: string; message: string }[] = [];
  const cleaned: any = {};

  if (!body || typeof body !== 'object') { errors.push({ message: 'Invalid payload' }); return { valid: false, errors, cleaned: {} }; }

  if (!body.name || String(body.name).trim().length === 0) errors.push({ field: 'name', message: 'name is required' }); else cleaned.name = String(body.name).trim();

  if (body.code !== undefined) {
    const c = String(body.code).trim();
    if (c.length === 0) errors.push({ field: 'code', message: 'code cannot be empty' }); else cleaned.code = c;
  }

  if (body.phone) {
    const phone = String(body.phone).trim();
    const phoneRe = /^[0-9+()\-\s]{5,20}$/;
    if (!phoneRe.test(phone)) errors.push({ field: 'phone', message: 'phone format is invalid' }); else cleaned.phone = phone;
  }

  if (body.inDate) {
    const d = new Date(body.inDate);
    if (isNaN(d.getTime())) errors.push({ field: 'inDate', message: 'inDate is invalid' }); else cleaned.inDate = d;
  }

  if (body.inTime) {
    const t = String(body.inTime).trim();
    const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRe.test(t)) errors.push({ field: 'inTime', message: 'inTime must be HH:MM' }); else cleaned.inTime = t;
  }

  if (body.roomType) cleaned.roomType = String(body.roomType);
  // Make roomType and bed mandatory
  if (body.roomType === undefined || String(body.roomType).trim().length === 0) {
    errors.push({ field: 'roomType', message: 'roomType is required' });
  } else {
    cleaned.roomType = String(body.roomType).trim();
  }
  if (body.bed === undefined || String(body.bed).trim().length === 0) {
    errors.push({ field: 'bed', message: 'bed is required' });
  } else {
    cleaned.bed = String(body.bed).trim();
  }
  if (body.roomNo !== undefined) cleaned.roomNo = String(body.roomNo).trim();
  if (body.diet) {
    const allowedDiets = ['Normal Diet','Liquid Diet','Protein Diet','Other'];
    const d = String(body.diet);
    if (!allowedDiets.includes(d)) errors.push({ field: 'diet', message: 'diet is invalid' }); else cleaned.diet = d;
  }
  if (body.dietNote !== undefined) cleaned.dietNote = String(body.dietNote || '');

  if (body.status) {
    const allowed = ['in_patient','discharged','outpatient'];
    if (!allowed.includes(body.status)) errors.push({ field: 'status', message: 'status is invalid' }); else cleaned.status = body.status;
  }

  if (body.transactionType) {
    const allowedT = ['cash','card','insurance'];
    if (!allowedT.includes(body.transactionType)) errors.push({ field: 'transactionType', message: 'transactionType is invalid' }); else cleaned.transactionType = body.transactionType;
  }

  if (body.age !== undefined && body.age !== null && body.age !== '') {
    const age = Number(body.age);
    if (Number.isNaN(age) || age < 0 || age > 150) errors.push({ field: 'age', message: 'age is invalid' }); else cleaned.age = age;
  }

  if (body.sex) {
    const allowedS = ['male','female','other'];
    if (!allowedS.includes(body.sex)) errors.push({ field: 'sex', message: 'sex is invalid' }); else cleaned.sex = body.sex;
  }

  // removed totalBill and dailyBill

  if (body.dischargeDate) {
    const dd = new Date(body.dischargeDate);
    if (isNaN(dd.getTime())) errors.push({ field: 'dischargeDate', message: 'dischargeDate is invalid' }); else cleaned.dischargeDate = dd;
  }
  if (body.dischargeTime) {
    const dt = String(body.dischargeTime).trim();
    const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRe.test(dt)) errors.push({ field: 'dischargeTime', message: 'dischargeTime must be HH:MM' }); else cleaned.dischargeTime = dt;
  }

  if (body.feedback) cleaned.feedback = String(body.feedback);
  if (body.allergies) cleaned.allergies = Array.isArray(body.allergies) ? body.allergies.map(String) : [String(body.allergies)];
  if (body.notes) cleaned.notes = String(body.notes);

  return { valid: errors.length === 0, errors, cleaned };
}

// POST /api/patients (create) - admin, diet-supervisor
router.post('/', auth, requireRole('admin','diet-supervisor'), async (req: Request, res: Response) => {
  const { valid, errors, cleaned } = validatePatientInput(req.body);
  if (!valid) return res.status(400).json({ errors });
  try {
    const hid = (req as any).user?.hospitalId;
    const p = new Patient({ ...cleaned, hospitalId: hid });
    await p.save();
    // audit
    try { await AuditLog.create({ entity: 'Patient', entityId: p._id, action: 'create', userId: (req as any).user?.id || null, details: cleaned }); } catch (e) { console.error('audit error', e); }

    // auto-create first diet assignment if diet is set
    if (cleaned.diet) {
      const DietAssignment = require('../models/dietAssignment').default;
      let priceForAssign = 0;
      try {
        const DietType = require('../models/dietType').default;
        const dt = await DietType.findOne({ name: cleaned.diet, ...(hid ? { hospitalId: hid } : {}) }).lean();
        if (dt && typeof dt.defaultPrice === 'number') priceForAssign = dt.defaultPrice || 0;
      } catch (e) { /* ignore */ }

  const day = istStartOfDayUTCForDate(cleaned.inDate ? new Date(cleaned.inDate) : new Date());
      const assign = {
        patientId: p._id,
        hospitalId: hid,
        date: day,
        diet: cleaned.diet,
        note: cleaned.dietNote || '',
        status: 'pending',
        price: priceForAssign
      };
      try {
        const da = await DietAssignment.create(assign);
        try { await AuditLog.create({ entity: 'DietAssignment', entityId: da._id, action: 'create', userId: (req as any).user?.id || null, details: assign }); } catch (e) { console.error('audit error', e); }
      } catch (e) { console.error('diet assignment create error', e); }
    }

    res.status(201).json(p);
  } catch (err: any) {
    if (err?.code === 11000 && err?.keyPattern?.code) return res.status(400).json({ errors: [{ field: 'code', message: 'code already exists' }] });
    console.error(err);
    res.status(500).json({ message: 'failed to create patient' });
  }
});

// PUT /api/patients/:id (update) - admin, diet-supervisor only
router.put('/:id', auth, requireRole('admin','diet-supervisor'), async (req: Request, res: Response) => {
  const { valid, errors, cleaned } = validatePatientInput(req.body);
  if (!valid) return res.status(400).json({ errors });

  try {
    const hid = (req as any).user?.hospitalId;
    const existing = await Patient.findOne({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}) });
    if (!existing) return res.status(404).json({ message: 'not found' });

    const role = (req as any).user?.role;
    if (existing.dischargeDate && role !== 'admin') {
      return res.status(403).json({ message: 'patient is discharged; only admin can edit' });
    }

    const updated = await Patient.findOneAndUpdate({ _id: existing._id }, cleaned, { new: true, runValidators: true, context: 'query' });
    // write audit
    try { await AuditLog.create({ entity: 'Patient', entityId: updated!._id, action: 'update', userId: (req as any).user?.id || null, details: cleaned }); } catch (e) { console.error('audit error', e); }

    // If diet changed in detail form, modify the latest assignment instead of creating a new one
    try {
      if (cleaned.diet && cleaned.diet !== existing.diet) {
        const DietAssignment = require('../models/dietAssignment').default;
        const latest = await DietAssignment.findOne({ patientId: existing._id, ...(hid ? { hospitalId: hid } : {}) })
          .sort({ date: -1, createdAt: -1 });
        if (latest) {
          // resolve price for the updated diet
          let priceForAssign = 0;
          try {
            const DietType = require('../models/dietType').default;
            const dt = await DietType.findOne({ name: cleaned.diet, ...(hid ? { hospitalId: hid } : {}) }).lean();
            if (dt && typeof dt.defaultPrice === 'number') priceForAssign = dt.defaultPrice || 0;
          } catch (e) {}
          latest.diet = cleaned.diet;
          if (cleaned.dietNote !== undefined) latest.note = cleaned.dietNote || '';
          latest.price = priceForAssign;
          await latest.save();
          try { await AuditLog.create({ entity: 'DietAssignment', entityId: latest._id, action: 'update', userId: (req as any).user?.id || null, details: { diet: cleaned.diet, note: cleaned.dietNote, price: priceForAssign } }); } catch {}
        }
      }
    } catch (e) { console.error('modify latest assignment on diet change failed', e); }
    res.json(updated);
  } catch (err: any) {
    if (err?.code === 11000 && err?.keyPattern?.code) return res.status(400).json({ errors: [{ field: 'code', message: 'code already exists' }] });
    console.error(err);
    res.status(500).json({ message: 'failed to update patient' });
  }
});

export default router;

// DELETE /api/patients/:id (admin only)
router.delete('/:id', auth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
    const p = await Patient.findOne({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}) });
    if (!p) return res.status(404).json({ message: 'not found' });
    // delete related diet assignments (hospital scoped)
    await DietAssignment.deleteMany({ patientId: p._id, ...(hid ? { hospitalId: hid } : {}) });
    await Patient.deleteOne({ _id: p._id });
    try { await AuditLog.create({ entity: 'Patient', entityId: p._id, action: 'delete', userId: (req as any).user?.id || null, details: { name: p.name } }); } catch {}
    res.json({});
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'failed to delete' });
  }
});
