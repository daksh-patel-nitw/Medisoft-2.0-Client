import React, { useEffect, useState, useCallback } from 'react';
// import Grid from '@mui/material/Grid2';
// import { 
//   TableRow, 
//   TableCell, 
//   Button, 
//   Card, 
//   CardContent, 
//   Tab, 
//   Tabs,
//   TableContainer,
//   Table,
//   TableHead,
//   TableBody,
//   Autocomplete,
//   TextField,
//   Typography,
//   Box
// } from '@mui/material';
// import { toast } from 'react-toastify';
// // NOTE: Make sure this path points to your actual service file
// import pharmacyServices from '../../services/pharmacyServices'; 

// // ==========================================
// // COMPONENT 1: Co-located Autocomplete
// // ==========================================
// const SearchAutocomplete = ({ name, label, handleSearch, arr, value = '' }) => {
//   return (
//     <Autocomplete
//       freeSolo
//       // Added fallback to empty array and fixed the "lenght" typo
//       options={arr?.length > 0 ? arr.map((option) => option[name]) : []}
//       onChange={(event, newValue) => handleSearch(newValue, name)}
//       value={value}
//       renderInput={(params) => (
//         <TextField
//           {...params}
//           label={`Search by ${label}`}
//           margin="normal"
//           variant="outlined"
//           size="small"
//         />
//       )}
//     />
//   );
// };

// // ==========================================
// // MAIN PAGE COMPONENT
// // ==========================================
// export default function PharmacyBillingPage() {
//   // Expecting medicines to be an array of two arrays: [ [Remaining], [Done] ]
//   const [medicines, setMedicines] = useState([[], []]); 
//   const [filteredMedicines, setFilteredMedicines] = useState([]);
  
//   const [fval, setFval] = useState({ pid: '', pname: '' });
//   const [value, setValue] = useState(0); // Tab Index
  
//   const [clickedButtons, setClickedButtons] = useState([]);
//   const [billed, setBill] = useState([]);
//   const [total, setTotal] = useState(0);

//   // Fetch initial data
//   useEffect(() => {
//     const fetchMedicine = async () => {
//       try {
//         const response = await pharmacyServices.fetchAllMedicines();
//         // Ensure the response is actually [ [], [] ] format
//         setMedicines(response.data || [[], []]); 
//       } catch (error) {
//         console.error(error);
//         toast.error("Failed to load pending bills.");
//       }
//     };
//     fetchMedicine();
//   }, []);

//   // Update filtered list when search values or main data changes
//   useEffect(() => {
//     const currentTabMedicines = medicines[value] || [];
//     setFilteredMedicines(
//       currentTabMedicines.filter((m) => 
//         m.name?.toLowerCase().includes(fval.pid.toLowerCase()) || 
//         m.name?.toLowerCase().includes(fval.pname.toLowerCase())
//       )
//     );
//   }, [fval, medicines, value]);

//   // Update Total whenever billed items change
//   useEffect(() => {
//     if (billed && billed.length > 0) {
//       const calculatedTotal = billed.reduce((acc, m) => acc + (m.price * m.quantity), 0);
//       setTotal(calculatedTotal.toFixed(2));
//     } else {
//       setTotal(0);
//     }
//   }, [billed]);

//   // Search Handler
//   const handleSearch = (newValue, name) => {
//     const currentTabMedicines = medicines[value] || [];
//     if (newValue) {
//       setFilteredMedicines(
//         currentTabMedicines.filter((m) => m[name]?.toLowerCase().includes(newValue.toLowerCase()))
//       );
//       setFval({ ...fval, [name]: newValue });
//     } else {
//       setFilteredMedicines(currentTabMedicines); // Reset to all if cleared
//       setFval({ ...fval, [name]: '' });
//     }
//   };

//   // Tab Change Handler
//   const handleChange = (event, newValue) => {
//     setValue(newValue);
//     setFval({ pid: '', pname: '' });
//     setFilteredMedicines(medicines[newValue] || []);
//   };

//   // Button States
//   const isButtonDisabled = (m) => clickedButtons.includes(m._id);

//   const handleClick = (m) => {
//     setBill([...billed, m]);
//     setClickedButtons((prev) => [...prev, m._id]);
//   };

//   // Print & Bill Logic
//   const handleBill = () => {
//     if (billed.length === 0) return;

//     let tableHTML = "<table style='width: 100%; border-collapse: collapse; text-align: left;'>";
//     tableHTML += "<tr><th style='border: 1px solid black; padding: 8px;'>Description</th><th style='border: 1px solid black; padding: 8px;'>Price</th><th style='border: 1px solid black; padding: 8px;'>Quantity</th><th style='border: 1px solid black; padding: 8px;'>Total</th></tr>";

//     billed.forEach(item => {
//       const itemTotal = (item.price * item.quantity).toFixed(2);
//       tableHTML += `<tr><td style='border: 1px solid black; padding: 8px;'>${item.mname}</td><td style='border: 1px solid black; padding: 8px;'>₹${item.price}</td><td style='border: 1px solid black; padding: 8px;'>${item.quantity}</td><td style='border: 1px solid black; padding: 8px;'>₹${itemTotal}</td></tr>`;
//     });

//     tableHTML += `</table><h2>Total Amount: ₹${total}</h2>`;

//     // Open Print Window
//     const newWindow = window.open("", "", "height=600,width=800");
//     newWindow.document.write("<html><head><title>Pharmacy Invoice</title></head><body>");
//     newWindow.document.write("<h1>Pharmacy Invoice</h1>");
//     newWindow.document.write(tableHTML);
//     newWindow.document.write("</body></html>");
//     newWindow.document.close();
//     newWindow.focus();
//     newWindow.addEventListener("afterprint", () => {
//       newWindow.close();
//     });
//     newWindow.print();

//     // API Call to finalize
//     const updatedPayload = [...billed, tableHTML, total];
//     pharmacyServices.finishMedOpd(updatedPayload)
//       .then(response => {
//         toast.success("Billing completed successfully!");
//       })
//       .catch(error => {
//         console.error(error);
//         toast.error("Error saving bill to database.");
//       });

//     // Move billed items from Remaining (index 0) to Done (index 1)
//     setMedicines([
//       (medicines[0] || []).filter((item) => !billed.some(b => b._id === item._id)), 
//       [...(medicines[1] || []), ...billed]
//     ]);
    
//     // Reset States
//     setFilteredMedicines([]);
//     setBill([]);
//     setClickedButtons([]);
//     setTotal(0);
//   };

//   const columns = ["Patient Id", "Appointment Date", "Medicine Name", "Units Req.", "Unit", "Price (₹)", "Amount", "Action"];

//   return (
//     <Box>
//       <Typography variant="h4" fontWeight="bold" gutterBottom>
//         Pharmacy POS & Billing
//       </Typography>

//       <Card sx={{ mt: 3, boxShadow: 3, minHeight: '75vh' }}>
//         <CardContent>
//           <Tabs
//             value={value}
//             indicatorColor="primary"
//             textColor="primary"
//             onChange={handleChange}
//             sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
//           >
//             <Tab label="Pending Prescriptions" />
//             <Tab label="Completed Bills" />
//           </Tabs>

//           <Grid container spacing={3} alignItems="center">
//             {/* Search Fields */}
//             <Grid size={{ xs: 12, md: 4 }}>
//               <SearchAutocomplete 
//                 name="pid" 
//                 label="Patient ID" 
//                 handleSearch={handleSearch} 
//                 arr={medicines[value] || []} 
//                 value={fval.pid} 
//               />
//             </Grid>
//             <Grid size={{ xs: 12, md: 4 }}>
//               <SearchAutocomplete 
//                 name="pname" 
//                 label="Patient Name" 
//                 handleSearch={handleSearch} 
//                 arr={medicines[value] || []} 
//                 value={fval.pname} 
//               />
//             </Grid>

//             {/* Total and Billing Actions (Only show on Pending Tab) */}
//             {value === 0 && (
//               <Grid container size={{ xs: 12, md: 4 }} alignItems="center" justifyContent="flex-end" spacing={2}>
//                 <Grid>
//                   <Typography variant="h5" fontWeight="bold" color={total > 0 ? 'success.main' : 'text.primary'}>
//                     Total: ₹{total}
//                   </Typography>
//                 </Grid>
                
//                 {billed.length > 0 && (
//                   <Grid>
//                     <Box sx={{ display: 'flex', gap: 1 }}>
//                       <Button variant="contained" color="primary" onClick={handleBill}>
//                         Print & Bill
//                       </Button>
//                       <Button 
//                         variant="outlined" 
//                         color="error" 
//                         onClick={() => { setBill([]); setClickedButtons([]); }}
//                       >
//                         Clear
//                       </Button>
//                     </Box>
//                   </Grid>
//                 )}
//               </Grid>
//             )}

//             {/* Inlined Table */}
//             <Grid size={{ xs: 12 }}>
//               <TableContainer sx={{ maxHeight: '60vh' }}>
//                 <Table stickyHeader size="small">
//                   <TableHead>
//                     <TableRow>
//                       {columns.map((element, index) => (
//                         // Hide the last two columns if we are on the "Done" tab
//                         (value === 1 && (element === "Amount" || element === "Action")) ? null : (
//                           <TableCell key={index} sx={{ backgroundColor: '#2c3e50', color: 'white', fontWeight: 'bold' }}>
//                             {element}
//                           </TableCell>
//                         )
//                       ))}
//                     </TableRow>
//                   </TableHead>
//                   <TableBody>
//                     {(filteredMedicines.length > 0 ? filteredMedicines : (medicines[value] || [])).map((m) => (
//                       <TableRow key={m._id || m.pid} hover>
//                         <TableCell>{m.pid}</TableCell>
//                         <TableCell>
//                           {new Date(m.createdAt).toLocaleDateString('en', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}
//                         </TableCell>
//                         <TableCell>{m.mname}</TableCell>
//                         <TableCell>{m.quantity}</TableCell>
//                         <TableCell>{m.unit}</TableCell>
//                         <TableCell>₹{m.price}</TableCell>
                        
//                         {/* Only show these cells on the Pending Tab */}
//                         {value === 0 && (
//                           <>
//                             <TableCell>₹{(m.price * m.quantity).toFixed(2)}</TableCell>
//                             <TableCell>
//                               <Button
//                                 disabled={isButtonDisabled(m)}
//                                 variant="contained"
//                                 color={isButtonDisabled(m) ? "success" : "primary"}
//                                 size="small"
//                                 onClick={() => handleClick(m)}
//                               >
//                                 {isButtonDisabled(m) ? "Added" : "Add to Bill"}
//                               </Button>
//                             </TableCell>
//                           </>
//                         )}
//                       </TableRow>
//                     ))}
//                     {medicines[value]?.length === 0 && (
//                       <TableRow>
//                         <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
//                           <Typography color="text.secondary">
//                             {value === 0 ? "No pending prescriptions to bill." : "No completed bills found."}
//                           </Typography>
//                         </TableCell>
//                       </TableRow>
//                     )}
//                   </TableBody>
//                 </Table>
//               </TableContainer>
//             </Grid>

//           </Grid>
//         </CardContent>
//       </Card>
//     </Box>
//   );
// }

export default function PharmacyBillingPage () {
  return <h1>Dispense Medicines - Coming Soon!</h1>;
};

// // NEXT.JS SECURITY GATE
PharmacyBillingPage.layout = 'dashboard';
PharmacyBillingPage.allowedRoles = ['admin', 'pharmacist'];
