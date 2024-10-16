import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

const Menu: React.FC = () => {
  const navigate = useNavigate();

  const logOut = () => {
    navigate('/');
  };

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
        <Button color="inherit" onClick={logOut}>
          Log out
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Menu;
