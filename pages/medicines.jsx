import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import DataTable from '../components/DataTable';
import { apis } from '../services/commonServices';

const COLUMNS = [{ key: 'name', label: 'Medicine Name' }];
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

// Public, unauthenticated catalog page - names only, same /public/medicines
// endpoint used for the landing page's teaser chip list.
export default function MedicinesCatalogPage() {
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await apis.noTokengetRequest('/public/medicines');
        setMedicines(data || []);
      } catch (error) {
        setMedicines([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const pagedRows = useMemo(
    () => medicines.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [medicines, page, rowsPerPage],
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <AppBar position="sticky" sx={{ backgroundColor: 'white', color: 'primary.main' }}>
        <Toolbar>
          <LocalPharmacyIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Medicine Catalog
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
          Available Medicines
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          {medicines.length} medicine{medicines.length === 1 ? '' : 's'} in stock.
        </Typography>

        <DataTable
          columns={COLUMNS}
          rows={pagedRows}
          getRowKey={(row, index) => `${row.name}-${index}`}
          loading={loading}
          emptyMessage="No medicines listed yet."
          pagination={{
            page,
            rowsPerPage,
            count: medicines.length,
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
