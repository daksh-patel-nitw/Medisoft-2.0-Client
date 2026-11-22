// Dose times: the label the doctor sees -> the code the API stores
// (MedicineTimeToDB on the server). The API takes the LABELS; the codes only
// come back in past prescriptions.
export const MEDICINE_TIMES = [
  'Before Breakfast',
  'After Breakfast',
  'Before Lunch',
  'After Lunch',
  'Noon Snacks',
  'Once In Day',
  'Before Dinner',
  'After Dinner',
  'Before Sleep',
];

const CODE_TO_LABEL = {
  BB: 'Before Breakfast',
  AB: 'After Breakfast',
  BL: 'Before Lunch',
  AL: 'After Lunch',
  S: 'Noon Snacks',
  O: 'Once In Day',
  BD: 'Before Dinner',
  AD: 'After Dinner',
  BS: 'Before Sleep',
};

/** "BB, AL" (as stored) -> ['Before Breakfast', 'After Lunch'] */
export const decodeMedicineTimes = (stored) =>
  String(stored || '')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
    .map((code) => CODE_TO_LABEL[code] ?? code);

export const MAX_DAYS = 365;

/**
 * How many units of a medicine to prescribe. Medicines whose type counts free
 * quantity (freeQuantity 'Y', e.g. tablets) are worked out from the course:
 * days x doses per day. Every other type is one pack, so the quantity stays 1.
 */
export const computeQuantity = (medicine, days, timesCount) => {
  if (medicine?.t?.freeQuantity !== 'Y') return 1;
  return Math.max(0, Number(days) || 0) * timesCount;
};

export const formatDate = (value) =>
  value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-';
