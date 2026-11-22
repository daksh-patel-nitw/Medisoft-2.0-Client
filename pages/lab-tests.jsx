import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ScienceIcon from '@mui/icons-material/Science';
import DataTable from '../components/DataTable';
import { apis } from '../services/commonServices';

const COLUMNS = [{ key: 'name', label: 'Test Name' }];
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

// Public, unauthenticated catalog page - names only, same /public/labtests
// endpoint used for the landing page's teaser chip list.
export default function LabTestsCatalogPage() {
  const [loading, setLoading] = useState(true);
  const [labTests, setLabTests] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await apis.noTokengetRequest('/public/labtests');
        setLabTests(data || []);
      } catch (error) {
        setLabTests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const pagedRows = useMemo(
    () => labTests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [labTests, page, rowsPerPage],
  );

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: '#f5f5f5' }}>
      <AppBar position="sticky" sx={{ backgroundColor: 'white', color: 'primary.main' }}>
        <Toolbar>
          <ScienceIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Lab Test Catalog
          </Typography>
          <Link href="/" passHref>
            <Button color="inherit" startIcon={<ArrowBackIcon />}>
              Back to Home
            </Button>
          </Link>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Available Lab Tests
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          {labTests.length} test{labTests.length === 1 ? '' : 's'} available.
        </Typography>

        <DataTable
          columns={COLUMNS}
          rows={pagedRows}
          getRowKey={(row, index) => `${row.name}-${index}`}
          loading={loading}
          emptyMessage="No lab tests listed yet."
          pagination={{
            page,
            rowsPerPage,
            count: labTests.length,
            onPageChange: (_event, newPage) => setPage(newPage),
            onRowsPerPageChange: (event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            },
            rowsPerPageOptions: ROWS_PER_PAGE_OPTIONS,
          }}
        />
      </Container>
    </Box>
  );
}
