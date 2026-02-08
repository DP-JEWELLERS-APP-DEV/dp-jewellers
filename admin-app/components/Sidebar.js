'use client';

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
} from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard', roles: ['super_admin', 'admin', 'editor'] },
  { text: 'Pricing', icon: <AttachMoney />, path: '/dashboard/pricing', roles: ['super_admin'], permission: 'manageRates' },
  { text: 'Products', icon: <Inventory />, path: '/dashboard/products', roles: ['super_admin', 'admin', 'editor'], permission: 'manageProducts' },
  { text: 'Orders', icon: <ShoppingCart />, path: '/dashboard/orders', roles: ['super_admin', 'admin'], permission: 'manageOrders' },
  { text: 'Banners', icon: <ViewCarousel />, path: '/dashboard/banners', roles: ['super_admin', 'admin'], permission: 'managePromotions' },
  { text: 'Stores', icon: <Store />, path: '/dashboard/stores', roles: ['super_admin'] },
  { text: 'Users', icon: <People />, path: '/dashboard/users', roles: ['super_admin'], permission: 'manageUsers' },
  { text: 'Manage Admins', icon: <AdminPanelSettings />, path: '/dashboard/admins', roles: ['super_admin'] },
  { text: 'Support', icon: <Support />, path: '/dashboard/support', roles: ['super_admin', 'admin', 'editor'] },
];

export default function Sidebar({ mobileOpen, handleDrawerToggle, adminData }) {
  const pathname = usePathname();
  const router = useRouter();

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

  const drawer = (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#1E1B4B' }}>
      <div className="p-6">
        <div className="flex justify-center mb-3">
          <div className="bg-white rounded-md px-3 py-2 shadow-sm">
            <Image
              src="/dp-logo-02.png"
              alt="DP Jewellers"
              width={140}
              height={55}
              priority
            />
          </div>
        </div>
      
        <Typography
          variant="caption"
          className="text-gray-300 text-center block mt-1"
        >
          Admin Panel
        </Typography>
        {adminData && (
          <Typography
            variant="caption"
            className="text-gray-400 text-center block mt-1"
            sx={{ textTransform: 'capitalize' }}
          >
            {adminData.role?.replace('_', ' ') || 'Admin'}
          </Typography>
        )}
      </div>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />

      <List className="flex-1 px-3 py-4">
        {visibleMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding className="mb-2">
            <Link href={item.path} className="w-full">
              <ListItemButton
                selected={pathname === item.path}
                sx={{
                  borderRadius: 2,
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255, 255, 255, 0.16)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.24)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </Link>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />

      <div className="p-3">
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" />
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
