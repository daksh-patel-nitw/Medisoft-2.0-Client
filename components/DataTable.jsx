import {
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';

/**
 * Shared table shell for every page's list view: themed header, consistent
 * empty/loading states, and an optional actions column. Purely presentational
 * - callers own data fetching, filtering, and (for `pagination`) slicing,
 * same contract as RolesCard/RoleFormDialog (data + callbacks in via props).
 *
 * @param {{key, label, align?, minWidth?, render?(row)}[]} columns
 * @param {object[]} rows - rows to render as-is (already filtered/sliced by the caller)
 * @param {(row, index) => string|number} [getRowKey]
 * @param {boolean} [loading]
 * @param {string} [emptyMessage]
 * @param {(row) => React.ReactNode} [renderActions] - adds a trailing actions column when given
 * @param {string} [actionsLabel]
 * @param {boolean} [stickyHeader]
 * @param {string|number} [maxHeight] - cap for the scrolling body (ignored when `fillHeight`)
 * @param {boolean} [fillHeight] - stretch to fill the parent (which must be a flex column with a fixed
 *   height): the rows scroll in the space left and the pagination stays pinned at the bottom
 * @param {{page, rowsPerPage, count, onPageChange, onRowsPerPageChange, rowsPerPageOptions?}} [pagination]
 *   Fully controlled, like MUI's own TablePagination - omit entirely for an unpaginated table.
 */
export default function DataTable({
  columns,
  rows,
  getRowKey = (row, index) => row.id ?? row._id ?? index,
  loading = false,
  emptyMessage = 'No records found.',
  renderActions,
  actionsLabel = 'Actions',
  stickyHeader = true,
  maxHeight = '60vh',
  fillHeight = false,
  pagination,
}) {
  const columnCount = columns.length + (renderActions ? 1 : 0);
  const skeletonRowCount = pagination?.rowsPerPage ?? 5;
  const headerCellSx = {
    backgroundColor: 'primary.main',
    color: 'primary.contrastText',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };

  return (
    <Paper
      variant="outlined"
      sx={{ width: '100%', ...(fillHeight && { flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }) }}
    >
      <TableContainer sx={fillHeight ? { flexGrow: 1, minHeight: 0 } : { maxHeight }}>
        <Table size="small" stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} align={col.align} sx={{ ...headerCellSx, minWidth: col.minWidth }}>
                  {col.label}
                </TableCell>
              ))}
              {renderActions && (
                <TableCell align="right" sx={headerCellSx}>
                  {actionsLabel}
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {Array.from({ length: columnCount }).map((__, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={getRowKey(row, index)} hover>
                  {columns.map((col) => (
                    <TableCell key={col.key} align={col.align}>
                      {col.render ? col.render(row) : row[col.key]}
                    </TableCell>
                  ))}
                  {renderActions && <TableCell align="right">{renderActions(row)}</TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination && (
        <TablePagination
          component="div"
          count={pagination.count}
          page={pagination.page}
          rowsPerPage={pagination.rowsPerPage}
          onPageChange={pagination.onPageChange}
          onRowsPerPageChange={pagination.onRowsPerPageChange}
          rowsPerPageOptions={pagination.rowsPerPageOptions ?? [5, 10, 25]}
          sx={fillHeight ? { flexShrink: 0, borderTop: 1, borderColor: 'divider' } : undefined}
        />
      )}
    </Paper>
  );
}
