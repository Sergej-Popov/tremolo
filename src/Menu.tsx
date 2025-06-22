import React, { useContext } from 'react';
import * as d3 from 'd3';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography, Select, MenuItem, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GitHubIcon from '@mui/icons-material/GitHub';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { AppContext } from './Store';
import { noteColors } from './theme';
import { updateSelectedColor, updateSelectedAlignment, updateSelectedFontSize } from './d3-ext';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';

const Menu: React.FC = () => {
  const app = useContext(AppContext);
  const stickyColor = app?.stickyColor ?? noteColors[0];
  const setStickyColor = app?.setStickyColor ?? (() => {});
  const stickyAlign = app?.stickyAlign ?? 'center';
  const setStickyAlign = app?.setStickyAlign ?? (() => {});
  const stickySelected = app?.stickySelected ?? false;
  const addBoard = app?.addBoard ?? (() => {});
  const [fontSize, setFontSize] = React.useState<string>('auto');

  React.useEffect(() => {
    const handler = (e: any) => {
      const el: HTMLElement | null = e.detail;
      if (el && d3.select(el).classed('sticky-note')) {
        const data = d3.select(el).datum() as any;
        setFontSize(data.fontSize != null ? data.fontSize.toString() : 'auto');
      } else {
        setFontSize('auto');
      }
    };
    window.addEventListener('stickyselectionchange', handler as EventListener);
    return () => window.removeEventListener('stickyselectionchange', handler as EventListener);
  }, []);

  return (
    <AppBar position="static" style={{ marginBottom: "15px" }}>
      <Toolbar>
        <IconButton size="large" color="inherit" onClick={addBoard} sx={{ mr: 1, ml: 1 }}>
          <MusicNoteIcon />
        </IconButton>
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
          <>
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
            <ToggleButtonGroup
              id="sticky-align-controls"
              size="small"
              exclusive
              value={stickyAlign}
              onChange={(_, val) => {
                if (val) {
                  setStickyAlign(val);
                  updateSelectedAlignment(val);
                }
              }}
              sx={{ mr: 2 }}
            >
              <ToggleButton value="left">
                <FormatAlignLeftIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="center">
                <FormatAlignCenterIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="right">
                <FormatAlignRightIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
            <Box id="sticky-font-select" sx={{ mr: 2 }}>
              <Select
                size="small"
                value={fontSize}
                displayEmpty
                onChange={(e) => {
                  const val = e.target.value as string;
                  setFontSize(val);
                  updateSelectedFontSize(val === 'auto' ? 'auto' : parseInt(val));
                }}
              >
                <MenuItem value="auto">Auto</MenuItem>
                {Array.from({ length: 16 }, (_, i) => 6 + i * 2).map((s) => (
                  <MenuItem key={s} value={s.toString()}>{`${s}px`}</MenuItem>
                ))}
              </Select>
            </Box>
          </>
        )}
        <IconButton target='_blank' href='https://github.com/Sergej-Popov/tremolo' >
          <GitHubIcon fontSize='large' />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Menu;
