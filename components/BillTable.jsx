import React from 'react';
import { Card, CardContent, Checkbox, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { lineKey, rupees } from '../utils/billing.util';

const KIND_LABELS = { doctor: 'Consultation', medicine: 'Medicine', lab: 'Lab test', room: 'Room', ipdDoctor: 'Inpatient doctor' };

/**
 * A patient's pending bill as tables, one card per appointment, with a checkbox for every item that can be
 * paid on its own: each medicine, each lab test, the consultation, and each room stay (in full - the
 * inpatient doctor's charge for that stay is paid with it, so that row follows the room's checkbox).
 * Shared by the patient's own Bills page and every biller desk.
 *
 * Controlled: `selected` is a Set of selection keys (see utils/billing.util.js) and `onChange` gets the new Set.
 *
 * @param {object[]} lines - flat bill lines (utils/billing.util.js)
 * @param {Set<string>} selected
 * @param {(next: Set<string>) => void} onChange
 */
export default function BillTable({ lines, selected, onChange }) {
  // one card per appointment, in the order the lines arrive
  const groups = [];
  const byAid = new Map();
  for (const line of lines) {
    let group = byAid.get(line.aid);
    if (!group) {
      group = { aid: line.aid, dname: line.dname, lines: [] };
      byAid.set(line.aid, group);
      groups.push(group);
    }
    group.lines.push(line);
  }

  const toggle = (keys, on) => {
    const next = new Set(selected);
    for (const key of keys) {
      if (on) next.add(key);
      else next.delete(key);
    }
    onChange(next);
  };

  return (
    <Stack spacing={2}>
      {groups.map((g) => {
        const keys = [...new Set(g.lines.map(lineKey))];
        const ticked = keys.filter((k) => selected.has(k)).length;
        const subtotal = g.lines.filter((l) => selected.has(lineKey(l))).reduce((sum, l) => sum + l.price, 0);
        return (
          <Card key={g.aid} variant="outlined">
            <CardContent sx={{ pb: '12px !important' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {g.dname ? `Dr. ${g.dname}` : 'Appointment'}
                </Typography>
                <Chip size="small" label={`Selected: ${rupees(subtotal)}`} color={ticked > 0 ? 'primary' : 'default'} variant="outlined" />
              </Stack>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={ticked === keys.length}
                          indeterminate={ticked > 0 && ticked < keys.length}
                          onChange={(e) => toggle(keys, e.target.checked)}
                          slotProps={{ input: { 'aria-label': 'Select every item of this appointment' } }}
                        />
                      </TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Units</TableCell>
                      <TableCell align="right">Price / unit</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {g.lines.map((l) => {
                      const key = lineKey(l);
                      const follower = l.kind === 'ipdDoctor'; // ticked / unticked with its room, never on its own
                      return (
                        <TableRow key={`${key}-${l.kind}`} hover selected={selected.has(key)}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={selected.has(key)}
                              disabled={follower}
                              onChange={(e) => toggle([key], e.target.checked)}
                              slotProps={{ input: { 'aria-label': `Pay ${l.name}` } }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{l.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {KIND_LABELS[l.kind]}
                              {l.note ? ` · ${l.note}` : ''}
                              {follower ? ' · paid with the room' : ''}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{l.units ?? '-'}</TableCell>
                          <TableCell align="right">{l.unitPrice != null ? rupees(l.unitPrice) : '-'}</TableCell>
                          <TableCell align="right">{rupees(l.price)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
