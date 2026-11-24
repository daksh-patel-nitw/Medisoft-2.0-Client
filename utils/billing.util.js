import { useMemo, useState } from 'react';
import { formatDate } from './prescription.util';

// One flat "bill line" shape is used by the patient's bills page and the biller desk, so both share the same
// table and the same selection logic:
//
//   { kind: 'doctor' | 'medicine' | 'lab' | 'room' | 'ipdDoctor',
//     id?        - what paying the line sends (appointment / medicine / lab / room-stay id)
//     roomId?    - ipdDoctor only: the room stay it is settled with
//     aid, dname - the appointment it belongs to and its doctor
//     name, note?, units?, unitPrice?, price }
//
// Which lines are ticked is a Set of "selection keys" (see lineKey).

export const rupees = (value) => `₹${Number(value || 0).toFixed(2)}`;

const KEY_PREFIX = { doctor: 'a', medicine: 'm', lab: 'l', room: 'r' };

/** The selection key of a line. An inpatient-doctor line shares its room's key: paying the room pays both. */
export const lineKey = (line) => (line.kind === 'ipdDoctor' ? `r:${line.roomId}` : `${KEY_PREFIX[line.kind]}:${line.id}`);

/** Every selectable key of these lines (each room appears once, however many lines it covers). */
export const allKeys = (lines) => [...new Set(lines.map(lineKey))];

export const selectedLines = (lines, selected) => lines.filter((line) => selected.has(lineKey(line)));

export const selectedTotal = (lines, selected) => selectedLines(lines, selected).reduce((sum, line) => sum + line.price, 0);

/** { aids, medicines, lab, room } with ONLY the ticked ids (empty lists left out) - what the API is sent. */
export function selectionPayload(lines, selected) {
  const out = { aids: [], medicines: [], lab: [], room: [] };
  const lists = { doctor: 'aids', medicine: 'medicines', lab: 'lab', room: 'room' };
  for (const line of selectedLines(lines, selected)) {
    if (line.kind !== 'ipdDoctor') out[lists[line.kind]].push(String(line.id));
  }
  return Object.fromEntries(Object.entries(out).filter(([, ids]) => ids.length > 0));
}

/**
 * The biller's pending bill - { <aid>: { dname, doctor_price, medicines[], lab[], room[] } } from
 * POST /payment/bills/pending - as flat lines, keeping only the slices a desk handles:
 * 'ba' doctor consultation, 'bm' medicines, 'bl' lab tests, 'bi' IPD (rooms + the inpatient doctor).
 */
export function linesFromBuckets(data, slices) {
  const has = (slice) => slices.includes(slice);
  const lines = [];

  for (const [aid, b] of Object.entries(data || {})) {
    const base = { aid, dname: b.dname };
    const isIpd = Array.isArray(b.room) && b.room.length > 0;

    // OPD: a flat consultation fee settled through the appointment itself. (An IPD appointment's doctor fee is
    // derived from each room stay, so it has no id of its own and appears below with the room.)
    if (!isIpd && has('ba') && b.doctor_price != null) {
      lines.push({ ...base, kind: 'doctor', id: aid, name: 'Consultation', price: Number(b.doctor_price) });
    }
    if (has('bm')) {
      for (const m of b.medicines ?? []) {
        const units = Number(m.quantity) > 0 ? Number(m.quantity) : 1;
        lines.push({ ...base, kind: 'medicine', id: String(m._id), name: m.mname, note: formatDate(m.createdAt), units, unitPrice: Number(m.price) / units, price: Number(m.price) });
      }
    }
    if (has('bl')) {
      for (const l of b.lab ?? []) {
        lines.push({ ...base, kind: 'lab', id: String(l._id), name: l.tname, note: formatDate(l.createdAt), price: Number(l.price) });
      }
    }
    if (has('bi')) {
      for (const r of b.room ?? []) {
        lines.push({
          ...base,
          kind: 'room',
          id: String(r.id),
          name: `Room ${r.rn ?? ''}${r.rc ? ` (${r.rc})` : ''}`,
          note: r.discharged_at ? `Discharged ${formatDate(r.discharged_at)}` : undefined,
          units: r.total_billed_days,
          unitPrice: Number(r.price_per_day),
          price: Number(r.total_price),
        });
        if (Number(r.doctor_charge) > 0) {
          lines.push({
            ...base,
            kind: 'ipdDoctor',
            roomId: String(r.id),
            name: 'Inpatient doctor',
            units: r.total_billed_days,
            unitPrice: Number(r.doctor_charge) / r.total_billed_days,
            price: Number(r.doctor_charge),
          });
        }
      }
    }
  }
  return lines;
}

/**
 * Which items of a bill are ticked. Everything starts ticked (pay it all); the user unticks what they are
 * not paying now. `payload` is the ids of the ticked items, `total` their sum (what the pay button shows).
 */
export function useBillSelection(lines) {
  const [unchecked, setUnchecked] = useState(() => new Set());
  const keys = useMemo(() => allKeys(lines), [lines]);
  const selected = useMemo(() => new Set(keys.filter((k) => !unchecked.has(k))), [keys, unchecked]);
  const setSelected = (next) => setUnchecked(new Set(keys.filter((k) => !next.has(k))));
  const total = useMemo(() => selectedTotal(lines, selected), [lines, selected]);
  const payload = useMemo(() => selectionPayload(lines, selected), [lines, selected]);
  return { selected, setSelected, total, payload, count: Object.values(payload).reduce((n, ids) => n + ids.length, 0) };
}
