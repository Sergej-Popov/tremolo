import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography, Select, MenuItem, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GitHubIcon from '@mui/icons-material/GitHub';
import { AppContext } from './Store';
import { noteColors } from './theme';
import { updateSelectedColor } from './d3-ext';

const Menu: React.FC = () => {
  const app = useContext(AppContext);
  const stickyColor = app?.stickyColor ?? noteColors[0];
  const setStickyColor = app?.setStickyColor ?? (() => {});
  const stickySelected = app?.stickySelected ?? false;

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
        {stickySelected && (
          <Box id="sticky-color-select" sx={{ mr: 2 }}>
            <Select
              size="small"
              value={stickyColor}
              onChange={(e) => {
                const color = e.target.value as string;
                setStickyColor(color);
                updateSelectedColor(color);
              }}
            >
              {noteColors.map((c) => (
                <MenuItem value={c} key={c}>
                  <Box sx={{ width: 20, height: 20, backgroundColor: c }} />
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}
        <IconButton target='_blank' href='https://github.com/Sergej-Popov/tremolo' >
          <GitHubIcon fontSize='large' />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Menu;
