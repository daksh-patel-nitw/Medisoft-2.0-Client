import * as React from 'react';
import { styled, createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/router';
import useDrawerStore from '../store/useDrawerStore';
import { sidebarMenus } from '../utils/sidebarConfig';
import {
  Box, Drawer as MuiDrawer, AppBar as MuiAppBar, Toolbar, List, CssBaseline,
  Typography, Divider, IconButton, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Tooltip, useMediaQuery
} from '@mui/material';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import * as Icons from '@mui/icons-material';
import useRefreshStore from '../store/useRefreshStore';
import { apis } from '../services/commonServices';

// ==========================================
// 1. DEFINE YOUR ROLE-BASED THEME COLORS
// ==========================================
const roleThemes = {
  admin: { primary: '#1976d2', secondary: '#dc004e' },        // Classic Blue / Pink
  laboratorist: { primary: '#009688', secondary: '#ff9800' }, // Teal / Orange
  nurse: { primary: '#e91e63', secondary: '#00bcd4' },        // Pink / Cyan
  pharmacist: { primary: '#4caf50', secondary: '#ffc107' },   // Green / Amber
  reception1: { primary: '#3f51b5', secondary: '#f44336' },   // Indigo / Red
  reception2: { primary: '#673ab7', secondary: '#00e5ff' },   // Deep Purple / Cyan
  biller: { primary: '#795548', secondary: '#8bc34a' },       // Brown / Light Green
  doctor: { primary: '#00bcd4', secondary: '#ff5722' },       // Cyan / Deep Orange
  patient: { primary: '#607d8b', secondary: '#ffeb3b' },      // Blue Grey / Yellow
  default: { primary: '#1976d2', secondary: '#dc004e' }       // Fallback
};

const drawerWidth = 240;

// ... [Keep your openedMixin, closedMixin, DrawerHeader, AppBar, and Drawer styled components exactly the same here] ...

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
      marginLeft: drawerWidth,
      width: `calc(100% - ${drawerWidth}px)`,
      transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  })
);

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  })
);

export default function DashboardLayout({ children, currentUser }) {
  const baseTheme = useTheme();
  const router = useRouter();
  const { isOpen, toggleDrawer } = useDrawerStore();

  const isSmallScreen = useMediaQuery(baseTheme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Safely grab the menu based on user role
  const menuItems = currentUser ? sidebarMenus[currentUser.role] : [];

  // ==========================================
  // 2. DYNAMICALLY GENERATE THE THEME
  // ==========================================
  const roleKey = currentUser?.role?.toLowerCase() || 'default';
  const currentColors = roleThemes[roleKey] || roleThemes.default;

  const dynamicTheme = React.useMemo(() => createTheme({
    palette: {
      primary: { main: currentColors.primary },
      secondary: { main: currentColors.secondary },
      background: { default: '#f4f6f8' }
    },
  }), [currentColors]);

  const handleDrawerToggle = () => {
    isSmallScreen ? setMobileOpen(!mobileOpen) : toggleDrawer();
  };

  const handleListItemClick = (path) => {
    router.push(path);
    if (isSmallScreen) setMobileOpen(false);
  };

  // ==========================================
  // 3. REFRESH LOGIC (See explanation below)
  // ==========================================
  const triggerRefresh = useRefreshStore((state) => state.triggerRefresh);
  const isGlobalRefreshing = useRefreshStore((state) => state.isGlobalRefreshing);
  const refreshPage = () => {
    triggerRefresh();
  };

  // ==========================================
  // 4. LOGOUT LOGIC
  // ==========================================
  const handleLogout = async () => {
    localStorage.clear();
    await apis.getRequest('/auth/logout');
    router.replace('/auth/login');
  };

  const drawerContent = (
    <>
      <DrawerHeader>
        <IconButton onClick={handleDrawerToggle}>
          {dynamicTheme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </DrawerHeader>
      <Divider />
      <List>
        {menuItems?.map((item) => {
          const IconComponent = Icons[item.icon];
          return (
            <ListItem key={item.label} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                sx={{ minHeight: 48, justifyContent: isOpen ? 'initial' : 'center', px: 2.5 }}
                onClick={() => handleListItemClick(item.path)}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
                  {IconComponent ? <IconComponent color="primary" /> : <Icons.HelpOutline />}
                </ListItemIcon>
                <ListItemText primary={item.label} sx={{ opacity: isOpen ? 1 : 0 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </>
  );

  return (
    // Wrap the entire dashboard in the new dynamic theme
    <ThemeProvider theme={dynamicTheme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="fixed" open={!isSmallScreen && isOpen}>
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ marginRight: 2, ...(isOpen && !isSmallScreen && { display: 'none' }) }}
            >
              <MenuIcon />
            </IconButton>

            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              MediSoft Dashboard
            </Typography>

            {/* Action Buttons */}
            <Tooltip title="Refresh Data">
              {/* The button disables and spins its icon while refreshing */}
              <IconButton
                color="inherit"
                onClick={triggerRefresh}
                disabled={isGlobalRefreshing}
                sx={{
                  mr: 1,
                  animation: isGlobalRefreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Logout">
              <IconButton color="inherit" onClick={handleLogout}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>

          </Toolbar>
        </AppBar>

        {/* Mobile Drawer */}
        {isSmallScreen && (
          <MuiDrawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': { width: drawerWidth } }}
          >
            {drawerContent}
          </MuiDrawer>
        )}

        {/* Desktop Drawer */}
        {!isSmallScreen && (
          <Drawer variant="permanent" open={isOpen}>
            {drawerContent}
          </Drawer>
        )}

        <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
          <DrawerHeader />
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}