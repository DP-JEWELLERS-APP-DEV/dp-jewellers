'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
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
  Menu as MenuIcon,
} from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Pricing', icon: <AttachMoney />, path: '/dashboard/pricing' },
  { text: 'Products', icon: <Inventory />, path: '/dashboard/products' },
  { text: 'Orders', icon: <ShoppingCart />, path: '/dashboard/orders' },
  { text: 'Users', icon: <People />, path: '/dashboard/users' },
];

export default function Sidebar({ mobileOpen, handleDrawerToggle }) {
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

  const drawer = (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#1E1B4B' }}>
      <div className="p-6">
        <Typography
          variant="h5"
          className="font-bold text-white text-center"
        >
          DP Jewellers
        </Typography>
        <Typography
          variant="caption"
          className="text-gray-300 text-center block mt-1"
        >
          Admin Panel
        </Typography>
      </div>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />

      <List className="flex-1 px-3 py-4">
        {menuItems.map((item) => (
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
