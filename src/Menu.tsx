import React, { useContext } from 'react';
import * as d3 from 'd3';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography, Select, MenuItem, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GitHubIcon from '@mui/icons-material/GitHub';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { AppContext } from './Store';
import { noteColors, defaultLineColor } from './theme';
import { updateSelectedColor, updateSelectedAlignment, updateSelectedFontSize, updateSelectedCodeLang, updateSelectedCodeTheme, updateSelectedCodeFontSize, updateSelectedLineStyle, updateSelectedLineColor, updateSelectedStartConnectionStyle, updateSelectedEndConnectionStyle, highlightLangs, highlightThemes } from './d3-ext';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import BrushIcon from '@mui/icons-material/Brush';
import CodeIcon from '@mui/icons-material/Code';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SaveIcon from '@mui/icons-material/Save';
const codeLanguages = highlightLangs as readonly string[];
const codeThemes = highlightThemes as readonly string[];

const Menu: React.FC = () => {
  const app = useContext(AppContext);
  const stickyColor = app?.stickyColor ?? noteColors[0];
  const setStickyColor = app?.setStickyColor ?? (() => {});
  const stickyAlign = app?.stickyAlign ?? 'center';
  const setStickyAlign = app?.setStickyAlign ?? (() => {});
  const stickySelected = app?.stickySelected ?? false;
  const codeSelected = app?.codeSelected ?? false;
  const codeLanguage = app?.codeLanguage ?? 'typescript';
  const setCodeLanguage = app?.setCodeLanguage ?? (() => {});
  const codeTheme = app?.codeTheme ?? 'github-dark';
  const setCodeTheme = app?.setCodeTheme ?? (() => {});
  const codeFontSize = app?.codeFontSize ?? 14;
  const setCodeFontSize = app?.setCodeFontSize ?? (() => {});
  const addBoard = app?.addBoard ?? (() => {});
  const drawingMode = app?.drawingMode ?? false;
  const setDrawingMode = app?.setDrawingMode ?? (() => {});
  const brushWidth = app?.brushWidth ?? 'auto';
  const setBrushWidth = app?.setBrushWidth ?? (() => {});
  const [fontSize, setFontSize] = React.useState<string>('auto');
  const [codeSize, setCodeSize] = React.useState<number>(codeFontSize);
  const [lineStyle, setLineStyle] = React.useState<'direct' | 'arc' | 'corner'>('arc');
  const [lineColor, setLineColor] = React.useState<string>(defaultLineColor);
  const [lineStartConn, setLineStartConn] = React.useState<'circle' | 'arrow' | 'triangle' | 'none'>('triangle');
  const [lineEndConn, setLineEndConn] = React.useState<'circle' | 'arrow' | 'triangle' | 'none'>('triangle');
  const [lineSelected, setLineSelected] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: any) => {
      const el: HTMLElement | null = e.detail;
      if (el && d3.select(el).classed('sticky-note')) {
        const data = d3.select(el).datum() as any;
        setFontSize(data.fontSize != null ? data.fontSize.toString() : 'auto');
      } else {
        setFontSize('auto');
      }
      if (!el || !d3.select(el).classed('code-block')) {
        setCodeSize(codeFontSize);
      }
      if (el && d3.select(el).classed('code-block')) {
        const data = d3.select(el).datum() as any;
        setCodeLanguage(data.lang ?? 'typescript');
        setCodeTheme(data.theme ?? 'github-dark');
        setCodeFontSize(data.fontSize ?? codeFontSize);
        setCodeSize(data.fontSize ?? codeFontSize);
      }
    };
    window.addEventListener('stickyselectionchange', handler as EventListener);
    return () => window.removeEventListener('stickyselectionchange', handler as EventListener);
  }, []);

  React.useEffect(() => {
    const handler = (e: any) => {
      const el: HTMLElement | null = e.detail;
      if (el && d3.select(el).classed('line-element')) {
        const data = d3.select(el).datum() as any;
        setLineSelected(true);
        setLineStyle(data.style ?? 'arc');
        setLineColor(data.color ?? defaultLineColor);
        setLineStartConn(data.startStyle ?? 'triangle');
        setLineEndConn(data.endStyle ?? 'triangle');
      } else {
        setLineSelected(false);
      }
    };
    window.addEventListener('lineselectionchange', handler as EventListener);
    return () => window.removeEventListener('lineselectionchange', handler as EventListener);
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
        <IconButton color={drawingMode ? 'secondary' : 'inherit'} onClick={() => setDrawingMode(!drawingMode)} sx={{ mr: 1 }}>
          <BrushIcon />
        </IconButton>
        <IconButton color="inherit" onClick={() => window.dispatchEvent(new Event('createline'))} sx={{ mr: 1 }}>
          <ShowChartIcon />
        </IconButton>
        <IconButton color="inherit" onClick={() => window.dispatchEvent(new Event('createsticky'))} sx={{ mr: 1 }}>
          <StickyNote2Icon />
        </IconButton>
        <IconButton color="inherit" onClick={() => window.dispatchEvent(new Event('createcodeblock'))} sx={{ mr: 1 }}>
          <CodeIcon />
        </IconButton>
        {lineSelected && (
          <>
            <Box id="line-color-select" sx={{ mr: 2 }}>
              <Select
                size="small"
                value={lineColor}
                onChange={(e) => {
                  const c = e.target.value as string;
                  setLineColor(c);
                  updateSelectedLineColor(c);
                }}
              >
                {noteColors.map((c) => (
                  <MenuItem value={c} key={c}>
                    <Box sx={{ width: 20, height: 20, backgroundColor: c }} />
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <Box id="line-start-select" sx={{ mr: 2 }}>
              <Select
                size="small"
                value={lineStartConn}
                onChange={(e) => {
                  const s = e.target.value as 'circle' | 'arrow' | 'triangle' | 'none';
                  setLineStartConn(s);
                  updateSelectedStartConnectionStyle(s);
                }}
              >
                <MenuItem value="circle">Start Circle</MenuItem>
                <MenuItem value="arrow">Start Arrow</MenuItem>
                <MenuItem value="triangle">Start Triangle</MenuItem>
                <MenuItem value="none">Start None</MenuItem>
              </Select>
            </Box>
            <Box id="line-end-select" sx={{ mr: 2 }}>
              <Select
                size="small"
                value={lineEndConn}
                onChange={(e) => {
                  const s = e.target.value as 'circle' | 'arrow' | 'triangle' | 'none';
                  setLineEndConn(s);
                  updateSelectedEndConnectionStyle(s);
                }}
              >
                <MenuItem value="circle">End Circle</MenuItem>
                <MenuItem value="arrow">End Arrow</MenuItem>
                <MenuItem value="triangle">End Triangle</MenuItem>
                <MenuItem value="none">End None</MenuItem>
              </Select>
            </Box>
            <Box id="line-style-select" sx={{ mr: 2 }}>
              <Select
                size="small"
                value={lineStyle}
                onChange={(e) => {
                  const val = e.target.value as 'direct' | 'arc' | 'corner';
                  setLineStyle(val);
                  updateSelectedLineStyle(val);
                }}
              >
                <MenuItem value="direct">Direct</MenuItem>
                <MenuItem value="arc">Arc</MenuItem>
                <MenuItem value="corner">Corner</MenuItem>
              </Select>
            </Box>
          </>
        )}
        {codeSelected && (
          <>
            <Box id="code-lang-select" sx={{ mr: 2 }}>
              <Select
                size="small"
                value={codeLanguage}
                onChange={(e) => {
                  const val = e.target.value as string;
                  setCodeLanguage(val);
                  updateSelectedCodeLang(val);
                }}
              >
                {codeLanguages.map((l) => (
                  <MenuItem key={l} value={l}>{l}</MenuItem>
                ))}
              </Select>
            </Box>
            <Box id="code-theme-select" sx={{ mr: 2 }}>
              <Select
                size="small"
                value={codeTheme}
                onChange={(e) => {
                  const val = e.target.value as string;
                  setCodeTheme(val);
                  updateSelectedCodeTheme(val);
                }}
              >
                {codeThemes.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </Box>
            <Box id="code-font-select" sx={{ mr: 2 }}>
              <Select
                size="small"
                value={codeSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value as string);
                  setCodeSize(val);
                  setCodeFontSize(val);
                  updateSelectedCodeFontSize(val);
                }}
              >
                {Array.from({ length: 22 }, (_, i) => 6 + i * 2).map((s) => (
                  <MenuItem key={s} value={s}>{`${s}px`}</MenuItem>
                ))}
              </Select>
            </Box>
          </>
        )}
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
        <IconButton color="inherit" onClick={() => window.dispatchEvent(new Event('exportimage'))} sx={{ mr: 1 }}>
          <SaveIcon fontSize='large' />
        </IconButton>
        <IconButton target='_blank' href='https://github.com/Sergej-Popov/tremolo' >
          <GitHubIcon fontSize='large' />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Menu;
