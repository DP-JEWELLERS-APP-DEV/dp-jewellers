'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Sidebar from '@/components/Sidebar';
import { AppBar, Toolbar, IconButton, Typography, Box, Alert } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';

const drawerWidth = 260;

// Define route permissions
const routePermissions = {
  '/dashboard': { roles: ['super_admin', 'admin', 'editor'] },
  '/dashboard/pricing': { roles: ['super_admin', 'admin'], permission: 'manageRates' },
  '/dashboard/products': { roles: ['super_admin', 'admin', 'editor'], permission: 'manageProducts' },
  '/dashboard/orders': { roles: ['super_admin', 'admin'], permission: 'manageOrders' },
  '/dashboard/banners': { roles: ['super_admin', 'admin'], permission: 'managePromotions' },
  '/dashboard/approvals': { roles: ['super_admin'] },
  '/dashboard/stores': { roles: ['super_admin'] },
  '/dashboard/users': { roles: ['super_admin'], permission: 'manageUsers' },
  '/dashboard/admins': { roles: ['super_admin'] },
  '/dashboard/activity-log': { roles: ['super_admin'] },
  '/dashboard/support': { roles: ['super_admin', 'admin', 'editor'] },
};

export default function DashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
      } else {
        // Fetch admin data
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          if (adminDoc.exists() && adminDoc.data().isActive) {
            setAdminData(adminDoc.data());
          } else {
            // Not an admin, redirect to login
            await auth.signOut();
            router.push('/login');
            return;
          }
        } catch (error) {
          console.error('Error fetching admin data:', error);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Check route access whenever pathname or adminData changes
  useEffect(() => {
    if (!adminData || loading) return;

    const checkAccess = () => {
      const routeConfig = routePermissions[pathname];
      if (!routeConfig) {
        // Route not defined, allow access (for sub-routes)
        setAccessDenied(false);
        return;
      }

      const role = adminData.role || 'editor';
      const permissions = adminData.permissions || {};

      // Super admin has access to everything
      if (role === 'super_admin') {
        setAccessDenied(false);
        return;
      }

      // Check if role is allowed
      if (routeConfig.roles && routeConfig.roles.includes(role)) {
        // If route has permission requirement, check it
        if (routeConfig.permission) {
          if (permissions[routeConfig.permission] === true) {
            setAccessDenied(false);
            return;
          }
        } else {
          setAccessDenied(false);
          return;
        }
      }

      // Access denied - redirect to dashboard
      setAccessDenied(true);
      router.push('/dashboard');
    };

    checkAccess();
  }, [pathname, adminData, loading, router]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="text-primary text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FFFDF2' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'white',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: '#1E1B4B' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ color: '#1E1B4B' }}>
            Admin Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} adminData={adminData} />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        {accessDenied && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You do not have permission to access that page. Redirecting to dashboard.
          </Alert>
        )}
        {children}
      </Box>
    </Box>
  );
}
