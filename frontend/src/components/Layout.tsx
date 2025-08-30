import type { PropsWithChildren } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, IconButton, CssBaseline, useMediaQuery } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import { useState } from 'react'

export interface NavItem {
  label: string
  path: string
  icon?: React.ReactNode
}

interface LayoutProps {
  title?: string
  nav: NavItem[]
}

export default function Layout({ title = 'Dashboard', nav, children }: PropsWithChildren<LayoutProps>) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'))

  const drawerWidth = 240

  const drawer = (
    <Box role="navigation" sx={{ width: drawerWidth }}>
      <Toolbar />
      <List>
        {nav.map((item) => (
          <ListItemButton
            key={item.path}
            component={RouterLink}
            to={item.path}
            selected={location.pathname === item.path}
            onClick={() => setOpen(false)}
          >
            {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" color="inherit" sx={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(6px)' }}>
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ fontWeight: 700 }}> {title} </Typography>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer anchor="left" open={open} onClose={() => setOpen(false)}>
          {drawer}
        </Drawer>
      ) : (
        <Drawer variant="permanent" sx={{ width: drawerWidth, [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' } }}>
          {drawer}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, ml: { md: `${drawerWidth}px` } }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  )
}
