import * as React from 'react';
import { styled, ThemeProvider, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/router';
import useDrawerStore from '../store/useDrawerStore';
import { getSidebarMenu, getStandaloneMenu, SIDEBAR_GROUPS } from '../utils/sidebarConfig';
import { createAppTheme, getThemeKeyForRole } from '../utils/themes.util';
import {
  Box, Drawer as MuiDrawer, AppBar as MuiAppBar, Toolbar, List, CssBaseline,
  Typography, Divider, IconButton, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Tooltip, useMediaQuery, Collapse, Breadcrumbs
} from '@mui/material';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import * as Icons from '@mui/icons-material';
import useRefreshStore from '../store/useRefreshStore';
import { apis } from '../services/commonServices';
import AppFooter from './AppFooter';

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

  // Built from the user's permission bits on every render pass (not stored):
  // it's a few bitwise checks, and rebuilding means it can never be stale.
  const menuGroups = getSidebarMenu(currentUser?.permissions);

  // "Main menu > Sub menu" for the current page, from the same config as the
  // sidebar (all groups, not the filtered menu, so it never depends on the
  // user's bits). Pages that aren't in the menu (e.g. /home) get no path.
  const breadcrumb = SIDEBAR_GROUPS.reduce((found, group) => {
    const child = group.children.find((c) => c.path === router.pathname);
    return found || (child ? [group.label, child.label] : null);
  }, null);

  // Which main menus the user has explicitly opened/closed. A main menu with
  // no explicit choice is open only if the current page is inside it, so
  // landing on /pharmacy/inventory shows Pharmacy expanded without any effect.
  const [groupToggles, setGroupToggles] = React.useState({});
  const isGroupExpanded = (group) =>
    groupToggles[group.label] ?? group.children.some((child) => child.path === router.pathname);

  const handleGroupClick = (group) => {
    // In the collapsed icon-only rail there's no room for sub-menus: open the drawer, then expand.
    if (!isSmallScreen && !isOpen) toggleDrawer();
    setGroupToggles((prev) => ({ ...prev, [group.label]: !isGroupExpanded(group) || (!isSmallScreen && !isOpen) }));
  };

  // ==========================================
  // 2. DYNAMICALLY GENERATE THE THEME
  // ==========================================
  const themeKey = getThemeKeyForRole(currentUser?.role);
  const dynamicTheme = React.useMemo(() => createAppTheme(themeKey), [themeKey]);

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
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);
  React.useEffect(() => {
    finishRefresh();
  }, [router.pathname, finishRefresh]);

  // ==========================================
  // 4. LOGOUT LOGIC
  // ==========================================
  const handleLogout = async () => {
    localStorage.clear();
    await apis.getRequest('/auth/logout');
    router.replace('/auth/login');
  };

  // The phone's slide-out menu always shows labels; only the desktop drawer has an icon-only (closed) state.
  const showLabels = isSmallScreen || isOpen;

  // With only ONE main menu there is nothing to group: its pages are listed directly. With several,
  // each main menu is a dropdown holding its pages.
  const flatItems = menuGroups.length === 1 ? menuGroups[0].children : null;

  // One page listed directly in the menu (no dropdown): the only main menu's pages, and the standalone entries.
  const directItem = (item) => {
    const ItemIcon = Icons[item.icon] || Icons.HelpOutline;
    return (
      <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
        <Tooltip title={showLabels ? '' : item.label} placement="right">
          <ListItemButton
            selected={router.pathname === item.path}
            sx={{ minHeight: 48, justifyContent: showLabels ? 'initial' : 'center', px: 2.5 }}
            onClick={() => handleListItemClick(item.path)}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: showLabels ? 3 : 'auto', justifyContent: 'center' }}>
              <ItemIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary={item.label} sx={{ opacity: showLabels ? 1 : 0 }} />
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
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
        {flatItems ? flatItems.map(directItem) : menuGroups.map((group) => {
          const GroupIcon = Icons[group.icon] || Icons.HelpOutline;
          const expanded = isGroupExpanded(group);
          return (
            <React.Fragment key={group.label}>
              <ListItem disablePadding sx={{ display: 'block' }}>
                <Tooltip title={showLabels ? '' : group.label} placement="right">
                  <ListItemButton
                    sx={{ minHeight: 48, justifyContent: showLabels ? 'initial' : 'center', px: 2.5 }}
                    onClick={() => handleGroupClick(group)}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mr: showLabels ? 3 : 'auto', justifyContent: 'center' }}>
                      <GroupIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={group.label} sx={{ opacity: showLabels ? 1 : 0 }} />
                    {showLabels && (expanded ? <ExpandLess /> : <ExpandMore />)}
                  </ListItemButton>
                </Tooltip>
              </ListItem>

              <Collapse in={showLabels && expanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {group.children.map((item) => {
                    const ItemIcon = Icons[item.icon] || Icons.HelpOutline;
                    return (
                      <ListItemButton
                        key={item.path}
                        selected={router.pathname === item.path}
                        sx={{ minHeight: 44, pl: 5, pr: 2.5 }}
                        onClick={() => handleListItemClick(item.path)}
                      >
                        <ListItemIcon sx={{ minWidth: 0, mr: 2, justifyContent: 'center' }}>
                          <ItemIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            </React.Fragment>
          );
        })}

        {getStandaloneMenu(currentUser?.permissions).map(directItem)}
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

        {/* Content column: page on top, footer strip at the end (below the page, or at the screen bottom when the page is short). */}
        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            // Exactly one screen tall (dvh = the visible height on phones with
            // collapsing address bars), so the browser window itself never
            // scrolls; a page taller than the space left scrolls inside <main>.
            height: '100vh',
            '@supports (height: 100dvh)': { height: '100dvh' },
            overflow: 'hidden',
            bgcolor: 'background.default',
          }}
        >
          <Box component="main" sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column' }}>
            <DrawerHeader />
            {breadcrumb && (
              <Breadcrumbs separator=">" aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Typography color="text.secondary">{breadcrumb[0]}</Typography>
                <Typography color="text.primary" fontWeight="bold">{breadcrumb[1]}</Typography>
              </Breadcrumbs>
            )}
            {/* Takes whatever height is left, so a page can fill it with height: 100% (no scrollbar when it fits). */}
            <Box sx={{ flex: '1 0 auto' }}>{children}</Box>
          </Box>
          <AppFooter />
        </Box>
      </Box>
    </ThemeProvider>
  );
}