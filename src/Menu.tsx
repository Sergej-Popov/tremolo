import React, { useContext } from 'react';
import * as d3 from 'd3';
import { AppBar, Toolbar, IconButton, Typography, Select, MenuItem, Box, ToggleButtonGroup, ToggleButton, Drawer, Button, Tooltip, CircularProgress, Slider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GitHubIcon from '@mui/icons-material/GitHub';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import { AppContext } from './Store';
import type { FrameLineStyle } from './Store';
import { noteColors, defaultLineColor } from './theme';
import { updateSelectedColor, updateSelectedFrameColor, updateSelectedFrameLineStyle, updateSelectedAlignment, updateSelectedFontSize, updateSelectedCodeLang, updateSelectedCodeTheme, updateSelectedCodeFontSize, updateSelectedLineStyle, updateSelectedLineColor, updateSelectedStartConnectionStyle, updateSelectedEndConnectionStyle, highlightLangs, highlightThemes, removeBackgroundFromSelectedImage, restoreSelectedImageBackground, minBackgroundTolerance, maxBackgroundTolerance, defaultBackgroundTolerance, maxBackgroundFeather, defaultBackgroundFeather } from './d3-ext';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import BrushIcon from '@mui/icons-material/Brush';
import CodeIcon from '@mui/icons-material/Code';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditNoteIcon from '@mui/icons-material/EditNote';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FlipToFrontIcon from '@mui/icons-material/FlipToFront';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import ColorizeIcon from '@mui/icons-material/Colorize';
import PaletteIcon from '@mui/icons-material/Palette';
import type { SxProps, Theme } from '@mui/material/styles';

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }
}
const codeLanguages = highlightLangs as readonly string[];
const codeThemes = highlightThemes as readonly string[];
const frameColors = ['#ffffff', ...noteColors.filter((c) => c.toLowerCase() !== '#ffffff')];

const baseToolButtonSx: SxProps<Theme> = {
  color: '#fff',
  backgroundColor: 'rgba(255,255,255,0.12)',
  borderRadius: 1.5,
  mr: 1,
  transition: 'background-color 150ms ease, transform 150ms ease',
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: 'translateY(-1px)',
  },
  '&.Mui-disabled': {
    color: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: 'none',
  },
};

const activeToolButtonSx: SxProps<Theme> = {
  backgroundColor: 'rgba(255,255,255,0.28)',
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
};

const selectSx: SxProps<Theme> = {
  minWidth: 72,
  color: '#fff',
  '.MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.24)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#fff',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#fff',
  },
  '.MuiSelect-select': {
    padding: '6px 12px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
  '.MuiSvgIcon-root': {
    color: '#fff',
  },
};

const toggleGroupSx: SxProps<Theme> = {
  '& .MuiToggleButtonGroup-grouped': {
    borderColor: 'rgba(255,255,255,0.2) !important',
    color: '#fff',
    '&.Mui-selected': {
      backgroundColor: 'rgba(255,255,255,0.28)',
      color: '#fff',
      '&:hover': {
        backgroundColor: 'rgba(255,255,255,0.34)',
      },
    },
  },
};

const rightPanelSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  padding: '4px 12px',
  borderRadius: 12,
  backgroundColor: 'rgba(255,255,255,0.05)',
};

const sliderContainerSx: SxProps<Theme> = {
  minWidth: 140,
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
};

const sliderSx: SxProps<Theme> = {
  color: '#fff',
  '& .MuiSlider-track': {
    border: 'none',
  },
  '& .MuiSlider-thumb': {
    backgroundColor: '#fff',
  },
  '& .MuiSlider-rail': {
    opacity: 0.3,
  },
};

const Menu: React.FC = () => {
  const app = useContext(AppContext);
  const stickyColor = app?.stickyColor ?? noteColors[0];
  const setStickyColor = app?.setStickyColor ?? (() => {});
  const frameColor = app?.frameColor ?? '#ffffff';
  const setFrameColor = app?.setFrameColor ?? (() => {});
  const frameLineStyle = app?.frameLineStyle ?? 'solid';
  const setFrameLineStyle = app?.setFrameLineStyle ?? (() => {});
  const stickyAlign = app?.stickyAlign ?? 'center';
  const setStickyAlign = app?.setStickyAlign ?? (() => {});
  const stickySelected = app?.stickySelected ?? false;
  const frameSelected = app?.frameSelected ?? false;
  const codeSelected = app?.codeSelected ?? false;
  const imageSelected = app?.imageSelected ?? false;
  const imageBackgroundRemoved = app?.imageBackgroundRemoved ?? false;
  const setImageBackgroundRemoved = app?.setImageBackgroundRemoved ?? (() => {});
  const imageBackgroundTolerance = app?.imageBackgroundTolerance ?? null;
  const setImageBackgroundTolerance = app?.setImageBackgroundTolerance ?? (() => {});
  const imageBackgroundFeather = app?.imageBackgroundFeather ?? defaultBackgroundFeather;
  const setImageBackgroundFeather = app?.setImageBackgroundFeather ?? (() => {});
  const imageBackgroundColor = app?.imageBackgroundColor ?? null;
  const setImageBackgroundColor = app?.setImageBackgroundColor ?? (() => {});
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
  const frameMode = app?.frameMode ?? false;
  const setFrameMode = app?.setFrameMode ?? (() => {});
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
  const [imageProcessing, setImageProcessing] = React.useState<'remove' | 'restore' | null>(null);
  const reapplyTimeoutRef = React.useRef<number | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  const [canUseEyeDropper, setCanUseEyeDropper] = React.useState(false);

  const clearPendingReapply = React.useCallback(() => {
    if (reapplyTimeoutRef.current !== null) {
      window.clearTimeout(reapplyTimeoutRef.current);
      reapplyTimeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    setCanUseEyeDropper(typeof window !== 'undefined' && !!window.EyeDropper);
  }, [setCanUseEyeDropper]);

  const scheduleBackgroundReapply = React.useCallback(
    (overrides: { tolerance?: number | null; feather?: number; color?: string | null } = {}) => {
      if (!imageSelected || !imageBackgroundRemoved || imageProcessing !== null) return;
      clearPendingReapply();
      const targetTolerance =
        overrides.tolerance !== undefined ? overrides.tolerance : imageBackgroundTolerance;
      const targetFeather = overrides.feather ?? imageBackgroundFeather;
      const targetColor = overrides.color !== undefined ? overrides.color : imageBackgroundColor;
      reapplyTimeoutRef.current = window.setTimeout(async () => {
        reapplyTimeoutRef.current = null;
        setImageProcessing('remove');
        try {
          const changed = await removeBackgroundFromSelectedImage({
            tolerance: targetTolerance,
            feather: targetFeather,
            color: targetColor,
          });
          if (changed) {
            setImageBackgroundRemoved(true);
            setImageBackgroundTolerance(changed.tolerance);
            setImageBackgroundFeather(changed.feather);
            setImageBackgroundColor(changed.color ?? targetColor ?? null);
          }
        } finally {
          setImageProcessing(null);
        }
      }, 120);
    },
    [
      imageSelected,
      imageBackgroundRemoved,
      imageProcessing,
      imageBackgroundTolerance,
      imageBackgroundFeather,
      imageBackgroundColor,
      clearPendingReapply,
      setImageBackgroundRemoved,
      setImageBackgroundTolerance,
      setImageBackgroundFeather,
      setImageBackgroundColor,
    ],
  );

  const normalizeHex = React.useCallback((value: string | null) => {
    if (!value) return null;
    let hex = value.trim();
    if (!hex.startsWith('#')) return null;
    if (hex.length === 9 && /^#[0-9a-fA-F]{8}$/.test(hex)) {
      hex = `#${hex.slice(1, 7)}`;
    }
    if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
    }
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      return hex.toLowerCase();
    }
    return null;
  }, []);

  const applyBackgroundColor = React.useCallback(
    (value: string | null) => {
      const normalized = normalizeHex(value);
      if (normalized === imageBackgroundColor) return;
      setImageBackgroundColor(normalized);
      scheduleBackgroundReapply({ color: normalized });
    },
    [normalizeHex, imageBackgroundColor, setImageBackgroundColor, scheduleBackgroundReapply],
  );

  const toleranceValue = Math.round(
    Math.max(
      minBackgroundTolerance,
      Math.min(maxBackgroundTolerance, imageBackgroundTolerance ?? defaultBackgroundTolerance),
    ),
  );
  const featherSliderMax = Math.round(maxBackgroundFeather * 100);
  const featherValue = Math.round(
    Math.max(0, Math.min(maxBackgroundFeather, imageBackgroundFeather)) * 100,
  );
  const isAutoStrength = imageBackgroundTolerance == null;
  const featherIsDefault = Math.abs(imageBackgroundFeather - defaultBackgroundFeather) < 0.001;
  const colorIsAuto = !imageBackgroundColor;
  const autoResetDisabled = isAutoStrength && featherIsDefault && colorIsAuto;

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

  React.useEffect(() => {
    if (!imageSelected) {
      clearPendingReapply();
      if (imageProcessing !== null) {
        setImageProcessing(null);
      }
    }
  }, [imageProcessing, imageSelected, clearPendingReapply]);

  React.useEffect(() => {
    if (!imageBackgroundRemoved) {
      clearPendingReapply();
    }
  }, [imageBackgroundRemoved, clearPendingReapply]);

  React.useEffect(() => () => clearPendingReapply(), [clearPendingReapply]);

  return (
    <>
      <input
        ref={colorInputRef}
        type="color"
        value={imageBackgroundColor ?? '#ffffff'}
        onChange={(event) => applyBackgroundColor(event.target.value)}
        style={{ display: 'none' }}
        aria-label="Choose background color"
      />
      <AppBar
        position="static"
        color="transparent"
      sx={{
        marginBottom: '15px',
        backgroundColor: 'rgba(33, 15, 36, 0.92)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <Toolbar id="board-toolbar" sx={{ display: 'flex', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
          <Tooltip title="Main menu">
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setDrawerOpen(true)}
              sx={baseToolButtonSx}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" component="div" sx={{ mr: 1 }}>
            Tremolo
          </Typography>
          <Tooltip title={frameMode ? 'Exit frame mode' : 'Draw frame'}>
            <IconButton
              color="inherit"
              onClick={() => {
                const next = !frameMode;
                setFrameMode(next);
                if (next) {
                  setDrawingMode(false);
                }
              }}
              sx={[baseToolButtonSx, frameMode ? activeToolButtonSx : null]}
            >
              <CropSquareIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add guitar board">
            <IconButton
              size="large"
              color="inherit"
              onClick={() => window.dispatchEvent(new Event('createboard'))}
              sx={baseToolButtonSx}
            >
              <MusicNoteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={drawingMode ? 'Exit drawing mode' : 'Enter drawing mode'}>
            <IconButton
              color="inherit"
              onClick={() => {
                const next = !drawingMode;
                setDrawingMode(next);
                if (next) {
                  setFrameMode(false);
                }
              }}
              sx={[baseToolButtonSx, drawingMode ? activeToolButtonSx : null]}
            >
              <BrushIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Connect with a line">
            <IconButton color="inherit" onClick={() => window.dispatchEvent(new Event('createline'))} sx={baseToolButtonSx}>
              <ShowChartIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add sticky note">
            <IconButton color="inherit" onClick={() => window.dispatchEvent(new Event('createsticky'))} sx={baseToolButtonSx}>
              <StickyNote2Icon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add code block">
            <IconButton color="inherit" onClick={() => window.dispatchEvent(new Event('createcodeblock'))} sx={baseToolButtonSx}>
              <CodeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Undo">
            <IconButton color="inherit" onClick={undo} disabled={!canUndo} sx={baseToolButtonSx}>
              <UndoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Redo">
            <IconButton color="inherit" onClick={redo} disabled={!canRedo} sx={baseToolButtonSx}>
              <RedoIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={rightPanelSx}>
        {boardSelected && (
          <Tooltip title="Edit board notes">
            <IconButton
              color="inherit"
              id="board-edit-button"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new Event('editnotes'));
              }}
              sx={baseToolButtonSx}
            >
              <EditNoteIcon />
            </IconButton>
          </Tooltip>
        )}
        {frameSelected && (
          <Box id="frame-color-select" sx={{ mr: 2 }}>
            <Select
              size="small"
              value={frameColor}
              onChange={(e) => {
                const color = e.target.value as string;
                setFrameColor(color);
                updateSelectedFrameColor(color);
                pushHistory(getSnapshot(), 'frame', 'style');
              }}
              variant="outlined"
              sx={selectSx}
            >
              {frameColors.map((c) => (
                <MenuItem value={c} key={c}>
                  <Box sx={{ width: 20, height: 20, backgroundColor: c, border: '1px solid rgba(0,0,0,0.2)' }} />
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}
        {frameSelected && (
          <Box id="frame-line-style-select" sx={{ mr: 2 }}>
            <Select
              size="small"
              value={frameLineStyle}
              onChange={(e) => {
                const style = e.target.value as FrameLineStyle;
                if (style === frameLineStyle) return;
                setFrameLineStyle(style);
                updateSelectedFrameLineStyle(style);
                pushHistory(getSnapshot(), 'frame', 'style');
              }}
              variant="outlined"
              sx={selectSx}
            >
              <MenuItem value="solid">Solid</MenuItem>
              <MenuItem value="dashed">Dashed</MenuItem>
              <MenuItem value="dotted">Dotted</MenuItem>
            </Select>
          </Box>
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
                  variant="outlined"
                  sx={selectSx}
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
              sx={[{ mr: 2 }, toggleGroupSx]}
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
                variant="outlined"
                sx={selectSx}
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
                variant="outlined"
                sx={selectSx}
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
                variant="outlined"
                sx={selectSx}
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
                variant="outlined"
                sx={selectSx}
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
                variant="outlined"
                sx={selectSx}
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
                variant="outlined"
                sx={selectSx}
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
                variant="outlined"
                sx={selectSx}
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
                variant="outlined"
                sx={selectSx}
              >
                {Array.from({ length: 22 }, (_, i) => 6 + i * 2).map((s) => (
                  <MenuItem key={s} value={s}>{`${s}px`}</MenuItem>
                ))}
              </Select>
            </Box>
          </>
        )}
        {imageSelected && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={sliderContainerSx}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                  Strength: {isAutoStrength ? 'Auto' : toleranceValue}
                </Typography>
                <Slider
                  size="small"
                  min={minBackgroundTolerance}
                  max={maxBackgroundTolerance}
                  step={1}
                  value={toleranceValue}
                  onChange={(_, newValue) => {
                    if (Array.isArray(newValue)) return;
                    const next = Math.round(
                      Math.max(minBackgroundTolerance, Math.min(maxBackgroundTolerance, newValue)),
                    );
                    setImageBackgroundTolerance(next);
                    scheduleBackgroundReapply({ tolerance: next });
                  }}
                  sx={sliderSx}
                  disabled={imageProcessing !== null}
                  aria-label="Background removal strength"
                />
              </Box>
              <Box sx={sliderContainerSx}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                  Feather: {featherValue}%
                </Typography>
                <Slider
                  size="small"
                  min={0}
                  max={featherSliderMax}
                  step={5}
                  value={featherValue}
                  onChange={(_, newValue) => {
                    if (Array.isArray(newValue)) return;
                    const next = Math.max(0, Math.min(featherSliderMax, newValue));
                    setImageBackgroundFeather(next / 100);
                    scheduleBackgroundReapply({ feather: next / 100 });
                  }}
                  sx={sliderSx}
                  disabled={imageProcessing !== null}
                  aria-label="Edge feather amount"
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                  Background color: {imageBackgroundColor ? imageBackgroundColor.toUpperCase() : 'Auto'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 18,
                      borderRadius: '999px',
                      border: '1px solid rgba(255,255,255,0.4)',
                      backgroundColor: imageBackgroundColor ?? 'transparent',
                      backgroundImage: imageBackgroundColor
                        ? 'none'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)',
                      backgroundSize: '8px 8px',
                    }}
                  />
                  <Tooltip title="Choose background color">
                    <span>
                      <IconButton
                        color="inherit"
                        onClick={(event) => {
                          event.stopPropagation();
                          colorInputRef.current?.click();
                        }}
                        disabled={imageProcessing !== null}
                        sx={baseToolButtonSx}
                        aria-label="Choose background color"
                      >
                        <PaletteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip
                    title={
                      canUseEyeDropper
                        ? 'Sample background color from the screen'
                        : 'EyeDropper unavailable – opens the colour picker instead'
                    }
                  >
                    <span>
                      <IconButton
                        color="inherit"
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (!canUseEyeDropper || !window.EyeDropper) {
                            colorInputRef.current?.click();
                            return;
                          }
                          try {
                            const dropper = new window.EyeDropper();
                            const result = await dropper.open();
                            applyBackgroundColor(result?.sRGBHex ?? null);
                          } catch (err) {
                            if ((err as DOMException)?.name !== 'AbortError') {
                              console.error('Failed to sample color', err);
                            }
                          }
                        }}
                        disabled={imageProcessing !== null}
                        sx={baseToolButtonSx}
                        aria-label="Sample background color"
                      >
                        <ColorizeIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
              <Tooltip title="Reset to automatic strength and default feather">
                <span>
                  <IconButton
                    color="inherit"
                    onClick={() => {
                      setImageBackgroundTolerance(null);
                      setImageBackgroundFeather(defaultBackgroundFeather);
                      setImageBackgroundColor(null);
                      scheduleBackgroundReapply({
                        tolerance: null,
                        feather: defaultBackgroundFeather,
                        color: null,
                      });
                    }}
                    disabled={autoResetDisabled || imageProcessing !== null}
                    sx={baseToolButtonSx}
                    aria-label="Reset background removal settings"
                  >
                    <AutoModeIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
            <Tooltip title={imageBackgroundRemoved ? 'Background already removed' : 'Remove background'}>
              <span>
                <IconButton
                  color="inherit"
                  disabled={imageProcessing !== null || imageBackgroundRemoved}
                  onClick={async (event) => {
                    event.stopPropagation();
                    clearPendingReapply();
                    setImageProcessing('remove');
                    try {
                      const changed = await removeBackgroundFromSelectedImage({
                        tolerance: imageBackgroundTolerance,
                        feather: imageBackgroundFeather,
                        color: imageBackgroundColor,
                      });
                      if (changed) {
                        setImageBackgroundRemoved(true);
                        setImageBackgroundTolerance(changed.tolerance);
                        setImageBackgroundFeather(changed.feather);
                        setImageBackgroundColor(changed.color ?? imageBackgroundColor ?? null);
                        pushHistory(getSnapshot(), 'image', 'background-remove');
                      }
                    } finally {
                      setImageProcessing(null);
                    }
                  }}
                  sx={baseToolButtonSx}
                  aria-label="Remove background"
                >
                  {imageProcessing === 'remove' ? (
                    <CircularProgress size={20} sx={{ color: 'inherit' }} />
                  ) : (
                    <AutoFixHighIcon />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            {(imageBackgroundRemoved || imageProcessing === 'restore') && (
              <Tooltip title="Restore background">
                <span>
                  <IconButton
                    color="inherit"
                    disabled={imageProcessing !== null}
                    onClick={async (event) => {
                      event.stopPropagation();
                      clearPendingReapply();
                      setImageProcessing('restore');
                      try {
                        const restored = restoreSelectedImageBackground();
                        if (restored) {
                          setImageBackgroundRemoved(false);
                          pushHistory(getSnapshot(), 'image', 'background-restore');
                        }
                      } finally {
                        setImageProcessing(null);
                      }
                    }}
                    sx={baseToolButtonSx}
                    aria-label="Restore background"
                  >
                    {imageProcessing === 'restore' ? (
                      <CircularProgress size={20} sx={{ color: 'inherit' }} />
                    ) : (
                      <FlipToFrontIcon />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
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
              variant="outlined"
              sx={selectSx}
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
              variant="outlined"
              sx={selectSx}
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
        <Tooltip title="View on GitHub">
          <IconButton
            target="_blank"
            href="https://github.com/Sergej-Popov/tremolo"
            size="large"
            sx={[baseToolButtonSx, { ml: 1 }]}
          >
            <GitHubIcon fontSize="large" />
          </IconButton>
        </Tooltip>
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
