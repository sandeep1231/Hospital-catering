import { Router, Request, Response } from 'express';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import DietAssignment from '../models/dietAssignment';
import Patient from '../models/patient';
import dayjs from 'dayjs';
import { istStartOfDayUTCForDate, addIstDaysUTC, istStartOfDayUTCFromYMD, istEndOfDayUTCFromYMD } from '../utils/time';

const router = Router();

// Create a diet assignment for a patient (admin, diet-supervisor)
router.post('/', auth, requireRole('admin','diet-supervisor'), async (req: Request, res: Response) => {
  try {
    const { patientId, date, fromTime, toTime, diet, note, price } = req.body || {};
    if (!patientId || !date || !diet) return res.status(400).json({ message: 'patientId, date and diet are required' });
    const hid = (req as any).user?.hospitalId;
    const patient = await Patient.findOne({ _id: patientId, ...(hid ? { hospitalId: hid } : {}) });
    if (!patient) return res.status(404).json({ message: 'patient not found' });
  // normalize to IST start of day to avoid duplicates/mismatches
  const d = istStartOfDayUTCFromYMD(String(date));
    if (isNaN(d.getTime())) return res.status(400).json({ message: 'invalid date' });

    // prevent adding assignments after discharge
    if (patient.dischargeDate) {
      const discharge = new Date(patient.dischargeDate);
      if (d > discharge) return res.status(400).json({ message: 'cannot assign diet after discharge' });
    }

    // if price not provided, try to fill from DietType.defaultPrice
    let finalPrice = Number(price ?? 0);
    if (!price) {
      try {
        const DietType = require('../models/dietType').default;
        const dt = await DietType.findOne({ name: diet, ...(hid ? { hospitalId: hid } : {}) }).lean();
        if (dt && typeof dt.defaultPrice === 'number') finalPrice = dt.defaultPrice || 0;
      } catch (e) { /* ignore */ }
    }

    const created = await DietAssignment.create({ patientId, hospitalId: hid, date: d, fromTime, toTime, diet, note, status: 'pending', price: finalPrice });
  // audit log
  try { await require('../models/auditLog').default.create({ entity: 'DietAssignment', entityId: created._id, action: 'create', userId: (req as any).user?.id || null, details: created }); } catch (e) { console.error('audit error', e); }
  res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'failed to create assignment' });
  }
});

// List patient diet assignments (auth)
router.get('/patient/:patientId', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const patientId = req.params.patientId;
  const list = await DietAssignment.find({ patientId, ...(hid ? { hospitalId: hid } : {}) }).sort({ date: 1, createdAt: 1 });
  res.json(list);
});

// Mark delivered (dietician, diet-supervisor, or admin)
router.post('/:id/deliver', auth, requireRole('admin','diet-supervisor','dietician'), async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
    const id = req.params.id;
  const updated = await DietAssignment.findOneAndUpdate({ _id: id, ...(hid ? { hospitalId: hid } : {}) }, { status: 'delivered', deliveredAt: new Date(), deliveredBy: (req as any).user?.id }, { new: true });
  if (!updated) return res.status(404).json({ message: 'not found' });
  // audit log
  try { await require('../models/auditLog').default.create({ entity: 'DietAssignment', entityId: updated._id, action: 'deliver', userId: (req as any).user?.id || null, details: updated }); } catch (e) { console.error('audit error', e); }
  res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'failed to mark delivered' });
  }
});

// Update assignment (admin, diet-supervisor)
router.put('/:id', auth, requireRole('admin','diet-supervisor'), async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
    const id = req.params.id;
    const { date, fromTime, toTime, diet, note, price, status } = req.body || {};
    const body: any = {};
  if (date) { const d = istStartOfDayUTCFromYMD(String(date)); if (!isNaN(d.getTime())) body.date = d; }
    if (fromTime !== undefined) body.fromTime = String(fromTime || '');
    if (toTime !== undefined) body.toTime = String(toTime || '');
    if (diet) {
      const allowedDiets = ['Normal Diet','Liquid Diet','Protein Diet','Other'];
      if (!allowedDiets.includes(diet)) return res.status(400).json({ message: 'diet is invalid' });
      body.diet = String(diet);
    }
    if (note !== undefined) body.note = String(note || '');
    if (price !== undefined) { const p = Number(price); if (!Number.isNaN(p) && p >= 0) body.price = p; }
    if (status) body.status = status;

  const updated = await DietAssignment.findOneAndUpdate({ _id: id, ...(hid ? { hospitalId: hid } : {}) }, body, { new: true });
  if (!updated) return res.status(404).json({ message: 'not found' });
  // audit log
  try { await require('../models/auditLog').default.create({ entity: 'DietAssignment', entityId: updated._id, action: 'update', userId: (req as any).user?.id || null, details: updated }); } catch (e) { console.error('audit error', e); }
  res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'failed to update assignment' });
  }
});

// Delete assignment (admin, diet-supervisor) - only if status is pending
router.delete('/:id', auth, requireRole('admin','diet-supervisor'), async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
    const id = req.params.id;
    const found = await DietAssignment.findOne({ _id: id, ...(hid ? { hospitalId: hid } : {}) });
    if (!found) return res.status(404).json({ message: 'not found' });
    if (found.status !== 'pending') return res.status(400).json({ message: 'only pending assignments can be deleted' });
    await DietAssignment.deleteOne({ _id: id });
    try { await require('../models/auditLog').default.create({ entity: 'DietAssignment', entityId: id, action: 'delete', userId: (req as any).user?.id || null, details: { _id: id } }); } catch (e) { console.error('audit error', e); }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'failed to delete assignment' });
  }
});

export default router;

// Bulk create diet assignments for a range (admin, diet-supervisor)
router.post('/bulk', auth, requireRole('admin','diet-supervisor'), async (req: Request, res: Response) => {
  try {
    const { patientId, startDate, days, untilDischarge, diet, note, overwriteExisting } = req.body || {};
    if (!patientId || !startDate || !diet) return res.status(400).json({ message: 'patientId, startDate and diet are required' });
    const hid = (req as any).user?.hospitalId;
    const patient = await Patient.findOne({ _id: patientId, ...(hid ? { hospitalId: hid } : {}) });
    if (!patient) return res.status(404).json({ message: 'patient not found' });
  const start = istStartOfDayUTCFromYMD(String(startDate));
  if (isNaN(start.getTime())) return res.status(400).json({ message: 'invalid startDate' });

    let end: Date | null = null;
    if (untilDischarge && patient.dischargeDate) {
  end = istStartOfDayUTCForDate(new Date(patient.dischargeDate));
    } else if (Number.isInteger(days) && days > 0) {
  end = addIstDaysUTC(start, days - 1);
    } else {
      return res.status(400).json({ message: 'provide days>0 or set untilDischarge with patient.dischargeDate' });
    }

    // Cap end at discharge date if present
    if (patient.dischargeDate) {
      const dch = istStartOfDayUTCForDate(new Date(patient.dischargeDate));
      if (end > dch) end = dch;
    }

    // load default price for the diet
    let defaultPrice = 0;
    try {
      const DietType = require('../models/dietType').default;
      const dt = await DietType.findOne({ name: diet, ...(hid ? { hospitalId: hid } : {}) }).lean();
      if (dt && typeof dt.defaultPrice === 'number') defaultPrice = dt.defaultPrice || 0;
    } catch {}

    const results: any[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const startDay = start;
    const endDay = end!;
    for (let t = startDay.getTime(); t <= endDay.getTime(); t += dayMs) {
      const day = new Date(t);
      // Always create a new assignment even if one exists for that day
      const created = await DietAssignment.create({ patientId, hospitalId: hid, date: day, diet, note, status: 'pending', price: defaultPrice });
      results.push({ date: day, action: 'created', id: created._id });
    }

    res.json({ count: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'bulk operation failed' });
  }
});

// Change diet from a given start date until end date/discharge (admin, diet-supervisor)
router.post('/change', auth, requireRole('admin','diet-supervisor'), async (req: Request, res: Response) => {
  try {
    const { patientId, startDate, endDate, untilDischarge, newDiet, note } = req.body || {};
    if (!patientId || !startDate || !newDiet) return res.status(400).json({ message: 'patientId, startDate and newDiet are required' });
    const hid = (req as any).user?.hospitalId;
    const patient = await Patient.findOne({ _id: patientId, ...(hid ? { hospitalId: hid } : {}) });
    if (!patient) return res.status(404).json({ message: 'patient not found' });
  const start = istStartOfDayUTCFromYMD(String(startDate));
  if (isNaN(start.getTime())) return res.status(400).json({ message: 'invalid startDate' });
    let end: Date | null = null;
    if (untilDischarge && patient.dischargeDate) {
  end = istStartOfDayUTCForDate(new Date(patient.dischargeDate));
    } else if (endDate) {
  const e = istStartOfDayUTCFromYMD(String(endDate)); if (isNaN(e.getTime())) return res.status(400).json({ message: 'invalid endDate' }); end = e;
    } else {
      // Default end = start when not provided and not untilDischarge
      end = new Date(start);
    }
    if (patient.dischargeDate) {
      const dch = istStartOfDayUTCForDate(new Date(patient.dischargeDate));
      if (end > dch) end = dch;
    }

    // resolve new price from DietType
    let price = 0;
    try {
      const DietType = require('../models/dietType').default;
      const dt = await DietType.findOne({ name: newDiet, ...(hid ? { hospitalId: hid } : {}) }).lean();
      if (dt && typeof dt.defaultPrice === 'number') price = dt.defaultPrice || 0;
    } catch {}

    const results: any[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const startDay = start;
    const endDay = end!;
    for (let t = startDay.getTime(); t <= endDay.getTime(); t += dayMs) {
      const day = new Date(t);
      // Always create a new assignment for change action
      const created = await DietAssignment.create({ patientId, hospitalId: hid, date: day, diet: newDiet, note, status: 'pending', price });
      results.push({ date: day, action: 'created', id: created._id });
    }

    res.json({ count: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'change operation failed' });
  }
});

// Generate today's assignments for all eligible patients (admin, diet-supervisor)
router.post('/generate-today', auth, requireRole('admin','diet-supervisor'), async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
  const { start } = { start: istStartOfDayUTCForDate(new Date()) };
  const end = new Date(start.getTime() + 24*60*60*1000 - 1);
    // find all patients in this hospital with a current diet, not discharged before today
    const cond: any = { ...(hid ? { hospitalId: hid } : {}), status: { $ne: 'discharged' } };
    const patients = await Patient.find(cond).lean();

    // prefetch diet prices
    let priceMap: Record<string, number> = {};
    try {
      const DietType = require('../models/dietType').default;
      const diets = await DietType.find({ ...(hid ? { hospitalId: hid } : {}) }).lean();
      for (const d of diets) priceMap[d.name] = d.defaultPrice || 0;
    } catch {}

    const results: any[] = [];
    for (const p of patients) {
      if (!p.diet) { results.push({ patientId: p._id, action: 'skipped', reason: 'no diet' }); continue; }
      // if patient has dischargeDate in the past, skip
      if (p.dischargeDate && new Date(p.dischargeDate) < start) { results.push({ patientId: p._id, action: 'skipped', reason: 'discharged' }); continue; }
  const existing = await DietAssignment.findOne({ patientId: p._id, date: { $gte: start, $lte: end }, ...(hid ? { hospitalId: hid } : {}) });
      if (existing) { results.push({ patientId: p._id, action: 'skipped', reason: 'exists' }); continue; }
      const created = await DietAssignment.create({ patientId: p._id, hospitalId: hid, date: start, diet: p.diet, note: p.dietNote || '', status: 'pending', price: priceMap[p.diet] || 0 });
      results.push({ patientId: p._id, action: 'created', id: created._id });
    }
    res.json({ count: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'generate-today failed' });
  }
});
