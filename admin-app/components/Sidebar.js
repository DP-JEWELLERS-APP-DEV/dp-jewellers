'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Box,
  Badge,
} from '@mui/material';
import {
  Dashboard,
  AttachMoney,
  Inventory,
  ShoppingCart,
  People,
  Logout,
  AdminPanelSettings,
  Support,
  Store,
  ViewCarousel,
  PendingActions,
  History,
  Collections,
} from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { auth } from '@/lib/firebase';

const functions = getFunctions(app, 'asia-south1');

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard', roles: ['super_admin', 'admin', 'editor'] },
  { text: 'Pricing', icon: <AttachMoney />, path: '/dashboard/pricing', roles: ['super_admin', 'admin'], permission: 'manageRates' },
  { text: 'Products', icon: <Inventory />, path: '/dashboard/products', roles: ['super_admin', 'admin', 'editor'], permission: 'manageProducts' },
  { text: 'Orders', icon: <ShoppingCart />, path: '/dashboard/orders', roles: ['super_admin', 'admin'], permission: 'manageOrders' },
  { text: 'Banners', icon: <ViewCarousel />, path: '/dashboard/banners', roles: ['super_admin', 'admin'], permission: 'managePromotions' },
  { text: 'Collections', icon: <Collections />, path: '/dashboard/collections', roles: ['super_admin', 'admin'], permission: 'managePromotions' },
  { text: 'Approvals', icon: <PendingActions />, path: '/dashboard/approvals', roles: ['super_admin'] },
  { text: 'Stores', icon: <Store />, path: '/dashboard/stores', roles: ['super_admin'] },
  { text: 'Users', icon: <People />, path: '/dashboard/users', roles: ['super_admin'], permission: 'manageUsers' },
  { text: 'Manage Admins', icon: <AdminPanelSettings />, path: '/dashboard/admins', roles: ['super_admin'] },
  { text: 'Activity Log', icon: <History />, path: '/dashboard/activity-log', roles: ['super_admin'] },
  { text: 'Support', icon: <Support />, path: '/dashboard/support', roles: ['super_admin', 'admin', 'editor'] },
];

export default function Sidebar({ mobileOpen, handleDrawerToggle, adminData }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (adminData?.role === 'super_admin') {
      const fetchCount = async () => {
        try {
          const fn = httpsCallable(functions, 'getPendingApprovalCount');
          const result = await fn();
          setPendingCount(result.data.count || 0);
        } catch (err) {
          console.error('Error fetching pending approval count:', err);
        }
      };
      fetchCount();
      const interval = setInterval(fetchCount, 60000);
      return () => clearInterval(interval);
    }
  }, [adminData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Filter menu items based on admin role and permissions
  const getVisibleMenuItems = () => {
    if (!adminData) return menuItems; // Show all if no admin data yet (loading state)

    const role = adminData.role || 'editor';
    const permissions = adminData.permissions || {};

    return menuItems.filter(item => {
      // Super admin sees everything
      if (role === 'super_admin') return true;

      // Check if role is explicitly allowed
      if (item.roles && item.roles.includes(role)) {
        // If item has permission requirement, check it
        if (item.permission) {
          return permissions[item.permission] === true;
        }
        return true;
      }

      return false;
    });
  };

  const visibleMenuItems = getVisibleMenuItems();

  const renderIcon = (item) => {
    if (item.text === 'Approvals' && pendingCount > 0) {
      return (
        <Badge badgeContent={pendingCount} color="error" max={99}>
          {item.icon}
        </Badge>
      );
    }
    return item.icon;
  };

  const drawer = (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#1E1B4B', minHeight: '100%' }}>
      {/* ── Logo Area ── */}
      <div style={{ padding: '24px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            background: '#fff', borderRadius: 8, padding: '8px 10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Image src="/dp-logo-02.png" alt="DP Jewellers" width={110} height={42} priority />
          </div>
        </div>
        <div style={{ paddingLeft: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 2 }}>
            Admin Panel
          </div>
          {adminData && (
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 500, textTransform: 'capitalize' }}>
              {adminData.role?.replace('_', ' ') || 'Admin'}
            </div>
          )}
        </div>
      </div>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2 }} />

      {/* ── Navigation ── */}
      <List className="flex-1" sx={{ px: 2, py: 0, overflowY: 'auto' }}>
        {visibleMenuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <Link href={item.path} style={{ width: '100%', textDecoration: 'none' }}>
                <ListItemButton
                  selected={isActive}
                  sx={{
                    borderRadius: 2,
                    py: 1.2,
                    px: 2,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                    background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      '& .menu-icon': { color: '#C9A84C' }
                    },
                    '&.Mui-selected': {
                      background: 'rgba(255,255,255,0.1)',
                      '&:hover': { background: 'rgba(255,255,255,0.15)' },
                    },
                  }}
                >
                  <ListItemIcon
                    className="menu-icon"
                    sx={{
                      minWidth: 40,
                      color: isActive ? '#C9A84C' : 'inherit',
                      transition: 'color 0.2s',
                      '& svg': { fontSize: 22 }
                    }}
                  >
                    {renderIcon(item)}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 500,
                      letterSpacing: 0.2,
                    }}
                  />
                </ListItemButton>
              </Link>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mt: 2 }} />

      {/* ── Footer / Logout ── */}
      <div style={{ padding: '16px' }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            py: 1.2, px: 2,
            color: 'rgba(255,255,255,0.7)',
            transition: 'all 0.2s',
            '&:hover': { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit', '& svg': { fontSize: 22 } }}>
            <Logout />
          </ListItemIcon>
          <ListItemText
            primary="Sign out"
            primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
          />
        </ListItemButton>
      </div>
    </div>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
}
