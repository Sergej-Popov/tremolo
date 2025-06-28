import React, { useContext } from 'react';
import * as d3 from 'd3';
import { AppBar, Toolbar, IconButton, Typography, Select, MenuItem, Box, ToggleButtonGroup, ToggleButton, Drawer, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GitHubIcon from '@mui/icons-material/GitHub';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditNoteIcon from '@mui/icons-material/EditNote';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
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
  const boardSelected = app?.boardSelected ?? false;
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
  const brushColor = app?.brushColor ?? defaultLineColor;
  const setBrushColor = app?.setBrushColor ?? (() => {});
  const pushHistory = app?.pushHistory ?? (() => {});
  const getSnapshot = app?.getSnapshot ?? (() => []);
  const undo = app?.undo ?? (() => {});
  const redo = app?.redo ?? (() => {});
  const canUndo = app?.canUndo ?? false;
  const canRedo = app?.canRedo ?? false;
  const [fontSize, setFontSize] = React.useState<string>('auto');
  const [codeSize, setCodeSize] = React.useState<number>(codeFontSize);
  const [lineStyle, setLineStyle] = React.useState<'direct' | 'arc' | 'corner'>('arc');
  const [lineColor, setLineColor] = React.useState<string>(defaultLineColor);
  const [lineStartConn, setLineStartConn] = React.useState<'circle' | 'arrow' | 'triangle' | 'none'>('triangle');
  const [lineEndConn, setLineEndConn] = React.useState<'circle' | 'arrow' | 'triangle' | 'none'>('triangle');
  const [lineSelected, setLineSelected] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

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
    <>
    <AppBar position="static" style={{ marginBottom: "15px" }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ mr: 2 }}>
            Tremolo
          </Typography>
          <IconButton size="large" color="inherit" onClick={() => window.dispatchEvent(new Event('createboard'))} sx={{ mr: 1 }}>
            <MusicNoteIcon />
          </IconButton>
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
          <IconButton color="inherit" onClick={undo} disabled={!canUndo} sx={{ mr: 1 }}>
            <UndoIcon />
          </IconButton>
          <IconButton color="inherit" onClick={redo} disabled={!canRedo} sx={{ mr: 1 }}>
            <RedoIcon />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {boardSelected && (
          <IconButton
            color="inherit"
            id="board-edit-button"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new Event('editnotes'));
            }}
            sx={{ mr: 1 }}
          >
            <EditNoteIcon />
          </IconButton>
        )}
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
                  pushHistory(getSnapshot(), 'sticky', 'style');
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
                  pushHistory(getSnapshot(), 'sticky', 'style');
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
                  pushHistory(getSnapshot(), 'sticky', 'style');
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
                  pushHistory(getSnapshot(), 'line', 'style');
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
                  pushHistory(getSnapshot(), 'line', 'style');
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
                  pushHistory(getSnapshot(), 'line', 'style');
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
                  pushHistory(getSnapshot(), 'line', 'style');
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
                  pushHistory(getSnapshot(), 'code', 'style');
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
                  pushHistory(getSnapshot(), 'code', 'style');
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
                  pushHistory(getSnapshot(), 'code', 'style');
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
        {drawingMode && (
          <Box id="brush-color-select" sx={{ mr: 2 }}>
            <Select
              size="small"
              value={brushColor}
              onChange={(e) => {
                const c = e.target.value as string;
                setBrushColor(c);
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
        </Box>
        <IconButton
          target="_blank"
          href="https://github.com/Sergej-Popov/tremolo"
          size="large"
          sx={{ ml: 1 }}
        >
          <GitHubIcon fontSize="large" />
        </IconButton>
      </Toolbar>
    </AppBar>
    <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
      <Box sx={{ width: 200, p: 2 }}>
        <Button startIcon={<SaveIcon />} onClick={() => window.dispatchEvent(new Event('savefile'))} fullWidth sx={{ mb: 1 }}>
          Save File
        </Button>
        <Button startIcon={<FolderOpenIcon />} component="label" fullWidth sx={{ mb: 1 }}>
          Open File
          <input type="file" hidden ref={fileInput} onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const data = JSON.parse(reader.result as string);
                window.dispatchEvent(new CustomEvent('loadboard', { detail: { items: data } }));
              } catch {
                /* ignore */
              }
            };
            reader.readAsText(file);
          }} />
        </Button>
        <Button startIcon={<LibraryMusicIcon />} component="label" fullWidth sx={{ mb: 1 }}>
          Open Lyrics
          <input type="file" hidden accept=".lrc" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              window.dispatchEvent(new CustomEvent('loadlyrics', { detail: reader.result as string }));
            };
            reader.readAsText(file);
          }} />
        </Button>
        <Button startIcon={<DeleteForeverIcon />} onClick={() => {
          window.dispatchEvent(new Event('clearboard'));
        }} fullWidth sx={{ mb: 1 }}>
          Clear Board
        </Button>
        <Button startIcon={<FileDownloadIcon />} onClick={() => window.dispatchEvent(new Event('exportimage'))} fullWidth>
          Export
        </Button>
      </Box>
    </Drawer>
    </>
  );
};

export default Menu;
