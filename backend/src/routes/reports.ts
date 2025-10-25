import { Router, Request, Response } from 'express';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import Patient from '../models/patient';
import Hospital from '../models/hospital';
import dayjs from 'dayjs';
import DietAssignment from '../models/dietAssignment';
import mongoose from 'mongoose';

const router = Router();


// Diet supervisor daily view: list all patients with today's assigned diets
router.get('/diet-supervisor/today', auth, requireRole('admin','diet-supervisor','dietician'), async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const qDate = String((req.query.date as string) || '');
  const roomType = (req.query.roomType as string) || '';
  const roomNo = (req.query.roomNo as string) || '';

  let baseDay = dayjs();
  if (qDate) {
    const d = dayjs(qDate);
    if (d.isValid()) baseDay = d;
  }
  const start = baseDay.startOf('day').toDate();
  const end = baseDay.endOf('day').toDate();

  const assignments = await DietAssignment.find({ date: { $gte: start, $lte: end }, ...(hid ? { hospitalId: hid } : {}) })
    .populate('patientId')
    .sort({ date: 1, createdAt: 1 });

  const rows = assignments
    .filter(a => {
      const p: any = a.patientId;
      if (!p) return false;
      if (roomType && String(p.roomType || '') !== roomType) return false;
      if (roomNo && String(p.roomNo || '') !== roomNo) return false;
      return true;
    })
    .map(a => ({
      id: a._id,
      date: a.date,
      patientId: (a.patientId as any)?._id,
      patientName: (a.patientId as any)?.name,
      phone: (a.patientId as any)?.phone || '',
      roomType: (a.patientId as any)?.roomType || '',
      roomNo: (a.patientId as any)?.roomNo || '',
      bed: (a.patientId as any)?.bed,
      diet: a.diet,
      note: a.note,
      status: a.status,
      fromTime: a.fromTime,
      toTime: a.toTime
    }));
  res.json(rows);
});

// Vendor Business Summary by custom date range
// Returns patients whose inDate and dischargeDate are both within the [from, to] range,
// along with the total bill amount computed as the sum of DietAssignment.price within
// their stay (from inDate to dischargeDate) scoped to the same hospital.
router.get('/vendor/business-range', auth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
    const hidObj = (hid && mongoose.Types.ObjectId.isValid(hid)) ? new mongoose.Types.ObjectId(hid) : null;
    // Build timezone string like "+05:30" from server local timezone to align date-only comparisons
    const tzMin = -new Date().getTimezoneOffset();
    const sign = tzMin >= 0 ? '+' : '-';
    const abs = Math.abs(tzMin);
    const hh = String(Math.trunc(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    const tz = `${sign}${hh}:${mm}`;
    const fromStr = String(req.query.from || '').trim();
    const toStr = String(req.query.to || '').trim();

    if (!fromStr || !toStr) return res.status(400).json({ error: 'from and to are required (YYYY-MM-DD)' });
    const fromDay = dayjs(fromStr);
    const toDay = dayjs(toStr);
    if (!fromDay.isValid() || !toDay.isValid()) return res.status(400).json({ error: 'Invalid from/to date' });
    const start = fromDay.startOf('day').toDate();
    const end = toDay.endOf('day').toDate();

    // Patients admitted and discharged fully within the window and both dates exist
    const matchPatients: any = {
      inDate: { $gte: start, $lte: end },
      dischargeDate: { $gte: start, $lte: end }
    };
    if (hidObj) matchPatients.hospitalId = hidObj;

    // Aggregate to compute bill per patient by summing DietAssignments during their stay
    const rows = await Patient.aggregate([
      { $match: matchPatients },
      // Compute ISO date strings to compare day-wise using server local timezone
      { $addFields: { inStr: { $dateToString: { format: '%Y-%m-%d', date: '$inDate', timezone: tz } }, outStr: { $dateToString: { format: '%Y-%m-%d', date: '$dischargeDate', timezone: tz } } } },
      {
        $lookup: {
          from: 'dietassignments',
          let: { pid: '$_id', inStr: '$inStr', outStr: '$outStr' },
          pipeline: [
            { $addFields: { dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: tz } } } },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$patientId', '$$pid'] },
                    { $gte: ['$dateStr', '$$inStr'] },
                    { $lte: ['$dateStr', '$$outStr'] }
                  ]
                }
              }
            },
            // only delivered assignments count toward billing
            { $match: { status: 'delivered' } },
            // join diettypes to fetch defaultPrice for fallback (case-insensitive, trimmed)
            {
              $lookup: {
                from: 'diettypes',
                let: { dn: '$diet' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: [ { $toLower: { $trim: { input: '$name' } } }, { $toLower: { $trim: { input: '$$dn' } } } ] },
                          ...(hidObj ? [{ $eq: ['$hospitalId', hidObj] }] : [])
                        ]
                      }
                    }
                  },
                  { $project: { _id: 0, defaultPrice: { $ifNull: ['$defaultPrice', 0] } } }
                ],
                as: 'dtHosp'
              }
            },
            {
              $lookup: {
                from: 'diettypes',
                let: { dn: '$diet' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [ { $toLower: { $trim: { input: '$name' } } }, { $toLower: { $trim: { input: '$$dn' } } } ]
                      }
                    }
                  },
                  { $project: { _id: 0, defaultPrice: { $ifNull: ['$defaultPrice', 0] } } }
                ],
                as: 'dtAny'
              }
            },
            {
              $lookup: {
                from: 'diettypes',
                let: { dn: { $toLower: { $trim: { input: '$diet' } } } },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $gte: [
                          { $indexOfCP: [ { $toLower: { $trim: { input: '$name' } } }, '$$dn' ] },
                          0
                        ]
                      }
                    }
                  },
                  { $project: { _id: 0, defaultPrice: { $ifNull: ['$defaultPrice', 0] } } }
                ],
                as: 'dtFuzzy'
              }
            },
            { $addFields: { defaultPrice: { $ifNull: [ { $arrayElemAt: ['$dtHosp.defaultPrice', 0] }, { $arrayElemAt: ['$dtAny.defaultPrice', 0] }, { $arrayElemAt: ['$dtFuzzy.defaultPrice', 0] }, 0 ] } } },
            // optional: ensure a minimum non-zero to detect if matching failed entirely (can be removed later)
            { $addFields: { defaultPrice: { $cond: [ { $lte: ['$defaultPrice', 0] }, 0, '$defaultPrice' ] } } },
            // Always use DietType.defaultPrice for totals
            { $addFields: { priceUsed: '$defaultPrice' } },
            { $group: { _id: null, total: { $sum: '$priceUsed' }, count: { $sum: 1 } } }
          ],
          as: 'bill'
        }
      },
      { $unwind: { path: '$bill', preserveNullAndEmptyArrays: true } },
      { $addFields: { billAmount: { $ifNull: ['$bill.total', 0] }, deliveredCount: { $ifNull: ['$bill.count', 0] } } },
      { $project: { _id: 0, name: 1, phone: 1, inDate: 1, dischargeDate: 1, billAmount: 1, deliveredCount: 1 } },
      { $sort: { inDate: 1, name: 1 } }
    ]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load vendor business range' });
  }
});

export default router;
