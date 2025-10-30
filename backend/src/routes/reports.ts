import { Router, Request, Response } from 'express';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import Patient from '../models/patient';
import Hospital from '../models/hospital';
import dayjs from 'dayjs';
import DietAssignment from '../models/dietAssignment';
import mongoose from 'mongoose';
import { IST_TZ, toIstDayString, istStartOfDayUTCFromYMD, istEndOfDayUTCFromYMD, istStartOfDayUTCForDate } from '../utils/time';

const router = Router();


// Diet supervisor daily view: list all patients with today's assigned diets
router.get('/diet-supervisor/today', auth, requireRole('admin','diet-supervisor','dietician'), async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
    const hidObj = (hid && mongoose.Types.ObjectId.isValid(hid)) ? new mongoose.Types.ObjectId(hid) : null;
    const qDate = String((req.query.date as string) || '').trim();
    const roomType = (req.query.roomType as string) || '';
    const roomNo = (req.query.roomNo as string) || '';

    const tz = IST_TZ; // Always use IST for this deployment

    const sel = qDate && dayjs(qDate).isValid() ? qDate : toIstDayString(new Date());

    // Aggregate to strictly match DietAssignment.date by selection date string
    const pipeline: any[] = [
      { $addFields: { dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: tz } } } },
      { $match: { dateStr: sel, ...(hidObj ? { hospitalId: hidObj } : {}) } },
      { $sort: { date: 1, createdAt: 1 } },
      { $lookup: { from: 'patients', localField: 'patientId', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' }
    ];

    if (roomType) pipeline.push({ $match: { 'p.roomType': roomType } });
    if (roomNo) pipeline.push({ $match: { 'p.roomNo': roomNo } });

    pipeline.push({
      $project: {
        _id: 0,
        id: '$_id',
        date: '$date',
        patientId: '$p._id',
        patientName: '$p.name',
        phone: { $ifNull: ['$p.phone', ''] },
        roomType: { $ifNull: ['$p.roomType', ''] },
        roomNo: { $ifNull: ['$p.roomNo', ''] },
        bed: '$p.bed',
        diet: '$diet',
        note: '$note',
        status: '$status',
        fromTime: '$fromTime',
        toTime: '$toTime'
      }
    });

    const rows = await DietAssignment.aggregate(pipeline);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load diet supervisor list' });
  }
});

// Vendor Business Summary by custom date range
// Returns patients whose inDate and dischargeDate are both within the [from, to] range,
// along with the total bill amount computed as the sum of DietAssignment.price within
// their stay (from inDate to dischargeDate) scoped to the same hospital.
router.get('/vendor/business-range', auth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
    const hidObj = (hid && mongoose.Types.ObjectId.isValid(hid)) ? new mongoose.Types.ObjectId(hid) : null;
  const tz = IST_TZ; // Fixed IST
    const fromStr = String(req.query.from || '').trim();
    const toStr = String(req.query.to || '').trim();

    if (!fromStr || !toStr) return res.status(400).json({ error: 'from and to are required (YYYY-MM-DD)' });
    const fromDay = dayjs(fromStr);
    const toDay = dayjs(toStr);
    if (!fromDay.isValid() || !toDay.isValid()) return res.status(400).json({ error: 'Invalid from/to date' });
    // Compute IST day boundaries in UTC
    const start = istStartOfDayUTCFromYMD(fromStr);
    const end = istEndOfDayUTCFromYMD(toStr);

    // Only include patients whose inDate and dischargeDate are BOTH within the [from,to] window
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
                        // fuzzy: does the assignment diet contain the diet type name?
                        $gte: [
                          { $indexOfCP: [ '$$dn', { $toLower: { $trim: { input: '$name' } } } ] },
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

// Analytics for charts: diets over time, by room type, distribution, totals
router.get('/analytics', auth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
    const hidObj = (hid && mongoose.Types.ObjectId.isValid(hid)) ? new mongoose.Types.ObjectId(hid) : null;
    const tz = IST_TZ; // Fixed IST

    const fromStr = String(req.query.from || '').trim();
    const toStr = String(req.query.to || '').trim();
    const gran = String(req.query.granularity || 'daily'); // daily | weekly | monthly
    const now = dayjs();
  const fromDay = fromStr ? dayjs(fromStr) : now.subtract(30, 'day');
  const toDay = toStr ? dayjs(toStr) : now;
    if (!fromDay.isValid() || !toDay.isValid()) return res.status(400).json({ error: 'Invalid from/to date' });
  // Use IST day boundaries in UTC for base match
  const start = fromStr ? istStartOfDayUTCFromYMD(fromStr) : istStartOfDayUTCForDate(fromDay.toDate());
  const end = toStr ? istEndOfDayUTCFromYMD(toStr) : new Date(istStartOfDayUTCForDate(toDay.toDate()).getTime() + (24*60*60*1000) - 1);

    const baseMatch: any = { date: { $gte: start, $lte: end } };
    const statusParam = String(req.query.status || 'delivered').trim().toLowerCase();
    if (statusParam && statusParam !== 'all') {
      baseMatch.status = statusParam;
    }
    if (hidObj) baseMatch.hospitalId = hidObj;

    // Helper: bucket expression per granularity as a string field 'bucket'
    const bucketAddFields: any = gran === 'monthly'
      ? { bucket: { $dateToString: { format: '%Y-%m', date: '$date', timezone: tz } } }
      : gran === 'weekly'
        ? {
            // ISO year-week, e.g., 2025-W09
            bucket: {
              $let: {
                vars: { y: { $isoWeekYear: '$date' }, w: { $isoWeek: '$date' } },
                in: {
                  $concat: [
                    { $toString: '$$y' },
                    '-W',
                    {
                      $cond: [
                        { $lt: ['$$w', 10] },
                        { $concat: ['0', { $toString: '$$w' }] },
                        { $toString: '$$w' }
                      ]
                    }
                  ]
                }
              }
            }
          }
        : { bucket: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: tz } } };

    // Base lookups to resolve DietType.defaultPrice similar to business-range
    const priceLookups: any[] = [
      {
        $lookup: {
          from: 'diettypes',
          let: { dn: '$diet' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $toLower: { $trim: { input: '$name' } } }, { $toLower: { $trim: { input: '$$dn' } } }] },
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
                  $eq: [{ $toLower: { $trim: { input: '$name' } } }, { $toLower: { $trim: { input: '$$dn' } } }]
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
                    { $indexOfCP: ['$$dn', { $toLower: { $trim: { input: '$name' } } }] },
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
      { $addFields: { defaultPrice: { $ifNull: [{ $arrayElemAt: ['$dtHosp.defaultPrice', 0] }, { $arrayElemAt: ['$dtAny.defaultPrice', 0] }, { $arrayElemAt: ['$dtFuzzy.defaultPrice', 0] }, 0] } } },
      { $addFields: { defaultPrice: { $cond: [{ $lte: ['$defaultPrice', 0] }, 0, '$defaultPrice'] } } },
      { $addFields: { priceUsed: '$defaultPrice' } }
    ];

    // 1) Over time by diet
    const overTimeGroups = await DietAssignment.aggregate([
      { $match: baseMatch },
      { $addFields: bucketAddFields },
      ...priceLookups,
      { $group: { _id: { b: '$bucket', d: '$diet' }, count: { $sum: 1 }, revenue: { $sum: '$priceUsed' } } },
      { $project: { _id: 0, bucket: '$_id.b', diet: '$_id.d', count: 1, revenue: 1 } },
      { $sort: { bucket: 1 } }
    ]);

    // 2) By room type
    const byRoomTypeGroups = await DietAssignment.aggregate([
      { $match: baseMatch },
      { $lookup: { from: 'patients', localField: 'patientId', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $group: { _id: { r: { $ifNull: ['$p.roomType', 'Unknown'] }, d: '$diet' }, count: { $sum: 1 } } },
      { $project: { _id: 0, roomType: '$_id.r', diet: '$_id.d', count: 1 } },
      { $sort: { roomType: 1 } }
    ]);

    // 3) Diet distribution
    const dietDistribution = await DietAssignment.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$diet', count: { $sum: 1 } } },
      { $project: { _id: 0, diet: '$_id', count: 1 } },
      { $sort: { diet: 1 } }
    ]);

    // 4) Totals
    const totalsAgg = await DietAssignment.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          deliveredCount: { $sum: 1 },
          patients: { $addToSet: '$patientId' }
        }
      },
      { $project: { _id: 0, deliveredCount: 1, uniquePatients: { $size: '$patients' } } }
    ]);

    // 5) Payer mix (by patient.transactionType) with counts and revenue
    const payerMixAgg = await DietAssignment.aggregate([
      { $match: baseMatch },
      ...priceLookups,
      { $lookup: { from: 'patients', localField: 'patientId', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $addFields: { payer: { $ifNull: ['$p.transactionType', 'Unknown'] } } },
      { $group: { _id: '$payer', count: { $sum: 1 }, revenue: { $sum: '$priceUsed' } } },
      { $project: { _id: 0, payer: '$_id', count: 1, revenue: 1 } },
      { $sort: { payer: 1 } }
    ]);

    // Pivot overTime into chart datasets
    const labelSet = new Set<string>();
    const dietSet = new Set<string>();
    overTimeGroups.forEach((g: any) => { labelSet.add(g.bucket); dietSet.add(g.diet); });
    const labels = Array.from(labelSet).sort();
    const diets = Array.from(dietSet);
    const dataMap: Record<string, Record<string, { count: number; revenue: number }>> = {};
    labels.forEach(l => { dataMap[l] = {}; diets.forEach(d => { dataMap[l][d] = { count: 0, revenue: 0 }; }); });
    overTimeGroups.forEach((g: any) => { dataMap[g.bucket][g.diet] = { count: g.count, revenue: g.revenue }; });
    const datasets = diets.map(d => ({ label: d, data: labels.map(l => dataMap[l][d].count) }));
    const revenueSeries = labels.map(l => Object.values(dataMap[l]).reduce((s, v) => s + (v.revenue || 0), 0));
    const revenueTotal = revenueSeries.reduce((a, b) => a + b, 0);

    // Pivot by room type into stacked datasets per diet
  // Determine full list of room types for the hospital to ensure zero-value categories appear
  const distinctRoomTypes: string[] = await Patient.distinct('roomType', hidObj ? { hospitalId: hidObj } : {});
  const fullRoomTypes = Array.from(new Set([...(distinctRoomTypes || []).filter(rt => !!rt && String(rt).trim() !== ''), 'Unknown'])).sort();

  const roomDietSet = new Set<string>();
  byRoomTypeGroups.forEach((g: any) => { roomDietSet.add(g.diet); });
  const roomLabels = fullRoomTypes;
    const roomDiets = Array.from(roomDietSet);
    const roomMap: Record<string, Record<string, number>> = {};
    roomLabels.forEach(l => { roomMap[l] = {}; roomDiets.forEach(d => { roomMap[l][d] = 0; }); });
    byRoomTypeGroups.forEach((g: any) => { roomMap[g.roomType][g.diet] = g.count; });
    const roomDatasets = roomDiets.map(d => ({ label: d, data: roomLabels.map(l => roomMap[l][d]) }));

    // Diet distribution simple pie
    const dietDistLabels = dietDistribution.map((d: any) => d.diet);
    const dietDistData = dietDistribution.map((d: any) => d.count);

  // Payer mix shape
  const payerLabels = payerMixAgg.map((p: any) => p.payer || 'Unknown');
  const payerCounts = payerMixAgg.map((p: any) => p.count || 0);
  const payerRevenue = payerMixAgg.map((p: any) => p.revenue || 0);

    res.json({
      range: { from: fromDay.format('YYYY-MM-DD'), to: toDay.format('YYYY-MM-DD'), granularity: gran },
      overTime: { labels, datasets, revenue: revenueSeries },
      byRoomType: { labels: roomLabels, datasets: roomDatasets },
      dietDistribution: { labels: dietDistLabels, data: dietDistData },
      payerMix: { labels: payerLabels, counts: payerCounts, revenue: payerRevenue },
      totals: { deliveredCount: totalsAgg[0]?.deliveredCount || 0, uniquePatients: totalsAgg[0]?.uniquePatients || 0, revenueTotal }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});
