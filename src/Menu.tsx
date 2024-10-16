import React from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GitHubIcon from '@mui/icons-material/GitHub';

const Menu: React.FC = () => {

  return (
    <AppBar position="static" style={{ marginBottom: "15px" }}>
      <Toolbar>
        <Link to="/second">
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        </Link>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Tremolo
        </Typography>
        <IconButton target='_blank' href='https://github.com/Sergej-Popov/tremolo' >
          <GitHubIcon fontSize='large' />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Menu;
