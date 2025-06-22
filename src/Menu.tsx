import React, { useContext } from 'react';
import * as d3 from 'd3';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography, Select, MenuItem, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GitHubIcon from '@mui/icons-material/GitHub';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CodeIcon from '@mui/icons-material/Code';
import { AppContext } from './Store';
import { noteColors } from './theme';
import { updateSelectedColor, updateSelectedAlignment, updateSelectedFontSize, updateSelectedLanguage } from './d3-ext';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import BrushIcon from '@mui/icons-material/Brush';

const Menu: React.FC = () => {
  const app = useContext(AppContext);
  const stickyColor = app?.stickyColor ?? noteColors[0];
  const setStickyColor = app?.setStickyColor ?? (() => {});
  const stickyAlign = app?.stickyAlign ?? 'center';
  const setStickyAlign = app?.setStickyAlign ?? (() => {});
  const stickySelected = app?.stickySelected ?? false;
  const codeSelected = app?.codeSelected ?? false;
  const addBoard = app?.addBoard ?? (() => {});
  const drawingMode = app?.drawingMode ?? false;
  const setDrawingMode = app?.setDrawingMode ?? (() => {});
  const brushWidth = app?.brushWidth ?? 'auto';
  const setBrushWidth = app?.setBrushWidth ?? (() => {});
  const [fontSize, setFontSize] = React.useState<string>('auto');
  const [codeLang, setCodeLang] = React.useState<string>('javascript');

  React.useEffect(() => {
    const handler = (e: any) => {
      const el: HTMLElement | null = e.detail;
      if (el && d3.select(el).classed('sticky-note')) {
        const data = d3.select(el).datum() as any;
        setFontSize(data.fontSize != null ? data.fontSize.toString() : 'auto');
      } else if (el && d3.select(el).classed('code-block')) {
        const data = d3.select(el).datum() as any;
        setCodeLang(data.language || 'javascript');
      } else {
        setFontSize('auto');
        setCodeLang('javascript');
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
                {Array.from({ length: 22 }, (_, i) => 6 + i * 2).map((s) => (
                  <MenuItem key={s} value={s.toString()}>{`${s}px`}</MenuItem>
                ))}
              </Select>
            </Box>
          </>
        )}
        <IconButton color="inherit" sx={{ mr: 1 }} onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }))}>
          <CodeIcon />
        </IconButton>
        {codeSelected && (
          <Box id="code-lang-select" sx={{ mr: 2 }}>
            <Select
              size="small"
              value={codeLang}
              onChange={(e) => {
                const lang = e.target.value as string;
                setCodeLang(lang);
                updateSelectedLanguage(lang);
              }}
            >
              <MenuItem value="javascript">JavaScript</MenuItem>
              <MenuItem value="python">Python</MenuItem>
              <MenuItem value="java">Java</MenuItem>
              <MenuItem value="cpp">C++</MenuItem>
              <MenuItem value="plaintext">Plain Text</MenuItem>
            </Select>
          </Box>
        )}
        <IconButton color={drawingMode ? 'secondary' : 'inherit'} onClick={() => setDrawingMode(!drawingMode)} sx={{ mr: 1 }}>
          <BrushIcon />
        </IconButton>
        {drawingMode && (
          <Box id="brush-width-select" sx={{ mr: 2 }}>
            <Select
              size="small"
              value={brushWidth.toString()}
              onChange={(e) => {
                const val = e.target.value as string;
                setBrushWidth(val === 'auto' ? 'auto' : parseInt(val));
              }}
            >
              <MenuItem value="auto">Auto</MenuItem>
              {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                <MenuItem key={n} value={n.toString()}>{`${n}px`}</MenuItem>
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
