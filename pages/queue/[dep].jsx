import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Grid from '@mui/material/Grid2';
import { Box, Typography, Paper } from '@mui/material';
import { apis } from '../../services/commonServices';

export default function QueueScreenPage() {
  const router = useRouter();
  const { dep } = router.query; // Grabs the department from the URL
  
  const [doc, setDoc] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Prevent fetching until Next.js has parsed the URL
    if (!router.isReady || !dep) return;

    const fetchData = async () => {
      try {
        const res = await apis.noTokengetRequest(`/appointment/queuescreen/${dep}`);
        if (res) {
          setDoc(res);
        }
      } catch (err) {
        console.error("Queue Screen Error:", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData(); // Initial fetch
    
    // Auto-refresh every 10 seconds for the TV monitor
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [dep, router.isReady]);

  return (
    <Box
      sx={{
        backgroundColor: '#f7f5b5', // Light yellow waiting room vibe
        backgroundImage: 'url(/mirrored-squares.png)', // Make sure this is in your /public folder!
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* MODERN CSS "MARQUEE" TICKER */}
      <Box 
        sx={{ 
          backgroundColor: '#673AB7', 
          color: 'white', 
          py: 1.5, 
          overflow: 'hidden', 
          whiteSpace: 'nowrap',
          boxShadow: 3,
          zIndex: 10
        }}
      >
        <Typography 
          variant="h4" 
          fontWeight="bold"
          sx={{
            display: 'inline-block',
            animation: 'marquee 15s linear infinite',
            '@keyframes marquee': {
              '0%': { transform: 'translateX(100vw)' },
              '100%': { transform: 'translateX(-100%)' }
            }
          }}
        >
          {dep ? dep.toUpperCase() : 'LOADING'} DEPARTMENT &emsp;&emsp; | &emsp;&emsp; MEDISOFT HMS SYSTEM
        </Typography>
      </Box>

      {/* QUEUE CONTENT */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {isLoading ? (
          <Typography variant="h3" align="center" mt={10}>Loading Queue...</Typography>
        ) : doc.length === 0 ? (
          <Typography variant="h3" align="center" mt={10}>No Patients in Queue</Typography>
        ) : (
          <Grid container spacing={3} sx={{ height: '100%' }}>
            
            {doc.map((doctor) => (
              // Using flex "grow" ensures columns distribute evenly whether there are 2, 3, or 5 doctors
              <Grid size="grow" key={doctor.eid} sx={{ minWidth: '300px' }}>
                <Paper 
                  elevation={4} 
                  sx={{ 
                    p: 2, 
                    height: '100%', 
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    borderTop: '8px solid #673AB7'
                  }}
                >
                  <Typography variant="h4" align="center" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                    Dr. {doctor.doctorName}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {doctor.appointments?.map((val) => {
                      const isCurrent = val.status === 'progress';
                      
                      return (
                        <Box
                          key={val.pid}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            // High-contrast neon cyan for current patient, dark grey for waiting
                            backgroundColor: isCurrent ? '#00FFCA' : '#393646',
                            color: isCurrent ? '#000' : '#fff',
                            boxShadow: isCurrent ? '0px 0px 15px rgba(0, 255, 202, 0.6)' : 1,
                            transform: isCurrent ? 'scale(1.02)' : 'scale(1)',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <Typography variant={isCurrent ? "h4" : "h5"} fontWeight="bold">
                            {val.pname}
                          </Typography>
                          <Typography variant={isCurrent ? "h4" : "h6"}>
                            {val.pid}
                          </Typography>
                        </Box>
                      );
                    })}
                    
                    {(!doctor.appointments || doctor.appointments.length === 0) && (
                      <Typography variant="h6" align="center" color="textSecondary" sx={{ mt: 2 }}>
                        No waiting patients
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}

          </Grid>
        )}
      </Box>
    </Box>
  );
}

// NEXT.JS MAGIC: Tell _app.jsx NOT to render the sidebar for this specific page
QueueScreenPage.layout = 'none';