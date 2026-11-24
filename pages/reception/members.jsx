import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Tab, Tabs } from '@mui/material';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import DataTable from '../../components/DataTable';
import SearchField from '../../components/SearchField';
import MemberEditDialog from '../../components/MemberEditDialog';
import { PAGE_ACCESS } from '../../utils/pageAccess';
import { toDateInput } from '../../utils/memberValidation';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50];
// The API's search takes letters, digits and spaces (name, id or mobile).
const SEARCH_PATTERN = /^[\p{L}\p{M}\p{N}\s]*$/u;
const SEARCH_DEBOUNCE_MS = 400;
const GENDERS = { M: 'Male', F: 'Female', O: 'Other' };

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name', render: (m) => [m.fname, m.middlename, m.lname].filter(Boolean).join(' ') },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'dob', label: 'Date of birth', render: (m) => toDateInput(m.dob) },
  { key: 'gender', label: 'Gender', render: (m) => GENDERS[m.gender] ?? m.gender },
  { key: 'city', label: 'City' },
];

const TABS = {
  pat: { label: 'Patients' },
  emp: { label: 'Employees' },
};

/** One list of members (patients or employees) with search, paging and an Edit action. */
function MembersTab({ mtype }) {
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState(''); // the debounced, validated text actually sent
  const [page, setPage] = useState(0); // 0-based for the table; the API is 1-based
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], total: 0 });
  const [editing, setEditing] = useState(null);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  const searchError = !SEARCH_PATTERN.test(searchText);

  // Debounce typing; invalid text is never sent.
  useEffect(() => {
    if (searchError) return undefined;
    const timer = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText, searchError]);

  // `loading` is derived from which request the rows belong to, so nothing sets state synchronously in the effect.
  const requestKey = `${mtype}|${page}|${rowsPerPage}|${search}|${reloadKey}|${refreshTick}`;
  const loading = result.key !== requestKey;

  // GET /reception/members?mtype=&query=&page=&limit= -> { items: [{ id, mtype, fname, ... }], total }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data = null;
      try {
        data = await apis.getRequest('/reception/members', { mtype, query: search || undefined, page: page + 1, limit: rowsPerPage });
      } catch (error) {
        // already toasted by the http client
      }
      if (!cancelled) {
        setResult((prev) => ({ key: requestKey, items: data?.items ?? prev.items, total: data?.total ?? prev.total }));
        finishRefresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestKey, mtype, search, page, rowsPerPage, finishRefresh]);

  // PUT /reception/members { mtype, id, ...changedFields }
  const save = async (payload) => {
    try {
      await apis.putRequest('/reception/members', payload);
      setEditing(null);
      setReloadKey((k) => k + 1);
      return true;
    } catch (error) {
      return false;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* pt: room for the field's floating label */}
      <Box sx={{ pt: 1, mb: 2, maxWidth: 400 }}>
        <SearchField
          label="Search by name, ID or mobile"
          value={searchText}
          onChange={setSearchText}
          error={searchError}
          helperText={searchError ? 'Letters and numbers only' : undefined}
        />
      </Box>

      <DataTable
        columns={COLUMNS}
        rows={result.items}
        getRowKey={(m) => m.id}
        loading={loading}
        emptyMessage="No members found."
        actionsLabel="Action"
        fillHeight
        renderActions={(row) => (
          <Button variant="outlined" size="small" onClick={() => setEditing(row)}>
            Edit
          </Button>
        )}
        pagination={{
          count: result.total,
          page,
          rowsPerPage,
          rowsPerPageOptions: ROWS_PER_PAGE_OPTIONS,
          onPageChange: (e, newPage) => setPage(newPage),
          onRowsPerPageChange: (e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          },
        }}
      />

      {/* mounted only while open so it starts from the row's current values */}
      {editing && <MemberEditDialog row={editing} onSave={save} onCancel={() => setEditing(null)} />}
    </Box>
  );
}

// Reception corrects a patient's or an employee's details (e.g. a wrong date of birth, gender or name).
export default function MembersPage() {
  const [mtype, setMtype] = useState('pat');

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 1100, boxShadow: 3, height: '100%', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
        <Tabs value={mtype} onChange={(e, next) => setMtype(next)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}>
          {Object.entries(TABS).map(([value, { label }]) => (
            <Tab key={value} value={value} label={label} />
          ))}
        </Tabs>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {/* keyed by tab so each starts with its own search and page */}
          <MembersTab key={mtype} mtype={mtype} />
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
MembersPage.layout = 'dashboard';
MembersPage.requiredPermissions = PAGE_ACCESS.receptionMembers;
