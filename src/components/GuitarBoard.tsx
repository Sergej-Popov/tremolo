import React, { useEffect, useRef, useState, useContext, useCallback } from 'react';
import * as d3 from 'd3';
import { debugTooltip, makeDraggable, makeResizable, makeCroppable, applyTransform, hideTooltip, adjustStickyFont, addDebugCross, updateDebugCross, setZoomTransform, setSvgRoot, getSelectedElementData, ElementCopy, generateId, updateSelectedCodeLang, updateSelectedCodeTheme, highlightCode, linePath, ensureConnectHandles, removeConnectHandles, updateSelectedLineStyle, updateSelectedLineColor, updateSelectedStartConnectionStyle, updateSelectedEndConnectionStyle, applyLineAppearance } from '../d3-ext';

import { noteString, stringNames, calculateNote, ScaleOrChordShape } from '../music-theory';
import { chords, scales } from '../repertoire';
import { noteColors, defaultLineColor } from '../theme';
import { Button, Slider, Drawer, Box, Typography, IconButton, Checkbox, FormControlLabel } from '@mui/material';
import { AppContext } from '../Store';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { exportBoardPng } from '../exportPng';

const edgeOffset = 20;
const boardWidth = 500;
const boardHeight = 200;

const fretCount = 12;
const fretBoardWidth = boardWidth;
const fretBoardHeight = boardHeight - (2 * edgeOffset);
const stringHeight = fretBoardHeight / 5;
const noteRadius = stringHeight / 2 - 1;
const noteFontSize = 16;
const fretWidth = fretBoardWidth / (fretCount - 1);


const theme = {
  notes: {
    "A": "#8CB369",
    "A#": "#8CB369",
    "B": "#F4E285",
    "C": "#F4A259",
    "C#": "#F4A259",
    "D": "#5B8E7D",
    "D#": "#5B8E7D",
    "E": "#BC4B51",
    "F": "#168AAD",
    "F#": "#168AAD",
    "G": "#FF9B85",
    "G#": "#FF9B85",
  }
}

interface NoteDatum { id: string; type: 'note'; string: noteString; fret: number }

interface PastedImageDatum { id: string; type: 'image'; src: string; width: number; height: number }

interface PastedVideoDatum { id: string; type: 'video'; url: string; videoId: string }

interface StickyNoteDatum { id: string; type: 'sticky'; text: string; align: 'left' | 'center' | 'right' }

interface CodeBlockDatum { id: string; type: 'code'; code: string; lang: string; theme: string; fontSize: number }

const stickyWidth = 225;
const stickyHeight = 150;
const codeWidth = 300;
const codeHeight = 160;

const videoWidth = 480;
const videoHeight = 270;
const videoPadding = 10;

const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;

function extractVideoId(url: string): string | null {
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
}

const GuitarBoard: React.FC = () => {
  const app = useContext(AppContext);
  const stickyColor = app?.stickyColor ?? '#fef68a';
  const stickyAlign = app?.stickyAlign ?? 'center';
  const debug = app?.debug ?? false;
  const addBoard = app?.addBoard ?? (() => {});
  const setBoards = app?.setBoards ?? (() => {});
  const setBoardSelected = app?.setBoardSelected ?? (() => {});
  const setStickySelected = app?.setStickySelected ?? (() => {});
  const setCodeSelected = app?.setCodeSelected ?? (() => {});
  const codeLanguage = app?.codeLanguage ?? 'typescript';
  const codeTheme = app?.codeTheme ?? 'github-dark';
  const codeFontSize = app?.codeFontSize ?? 14;
  const drawingMode = app?.drawingMode ?? false;
  const brushWidth = app?.brushWidth ?? 'auto';
  const svgRef = useRef<SVGSVGElement | null>(null);
  const workspaceRef = useRef<SVGGElement | null>(null);
  const boardRef = useRef<SVGGElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showNoteNames, setShowNoteNames] = useState(true);
  const showNoteNamesRef = useRef(true);
  const zoomRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const cursorRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [selectedBounds, setSelectedBounds] = useState<{ x: number, y: number, width: number, height: number, rotate: number } | null>(null);
  const [zoomValue, setZoomValue] = useState(1);
  const [croppableSelected, setCroppableSelected] = useState(false);
  const drawingSel = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastMid = useRef<{ x: number; y: number } | null>(null);
  const lastStroke = useRef<number>(typeof brushWidth === 'number' ? brushWidth : 4);

  const updateNoteNameVisibility = useCallback(() => {
    if (boardRef.current) {
      d3.select(boardRef.current)
        .selectAll<SVGTextElement, unknown>('.note text')
        .style('display', showNoteNamesRef.current ? 'block' : 'none');
    }
  }, []);

  useEffect(() => {
    showNoteNamesRef.current = showNoteNames;
    updateNoteNameVisibility();
  }, [showNoteNames, updateNoteNameVisibility]);

  const boards = app?.boards ?? [0];
  const boardsRef = useRef<number[]>(boards);
  const [selectedBoard, setSelectedBoard] = useState<number>(boards[0]);
  const fretRangesRef = useRef<Record<number, number[]>>({ 0: [1, fretCount] });
  
  const [fretRange, setFretRange] = useState<number[]>([1, fretCount]);

  useEffect(() => {
    const newest = boards[boards.length - 1];
    if (!(newest in fretRangesRef.current)) {
      fretRangesRef.current[newest] = [1, fretCount];
      setSelectedBoard(newest);
    }
    boardsRef.current = boards;
  }, [boards]);

  const changeFretRange = (_: Event, newValue: number | number[]) => {
    const range = Array.isArray(newValue) ? newValue : [newValue, newValue];
    fretRangesRef.current[selectedBoard] = range;
    setFretRange(range);
  };


  const addNoteToBoard = (
    board: d3.Selection<SVGGElement, any, any, any>,
    string: noteString,
    fret: number,
    options: { fadeNonNatural: boolean } = { fadeNonNatural: false }
  ) => {
    const x = fret * fretWidth - fretWidth / 2;
    const y = (6 - stringNames.indexOf(string) - 1) * stringHeight + edgeOffset;
    const noteLetter = calculateNote(string, fret);
    const fillColor = noteLetter.includes('#') && options.fadeNonNatural ? '#444444' : theme.notes[noteLetter];

    const note = board.append('g')
      .attr('class', 'note')
      .datum<NoteDatum>({ id: generateId(), type: 'note', string, fret });

    note.append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', noteRadius)
      .attr('fill', fillColor)
      .attr('stroke-width', 0)
      .attr('stroke', 'black');

    note.append("text")
      .text(noteLetter)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', noteFontSize)
      .attr('font-family', 'Segoe UI')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .attr('dx', x)
      .attr('dy', y + 2)
      .attr('class', 'non-selectable')
      .style('display', showNoteNamesRef.current ? 'block' : 'none');

    return note;
  };

  const addNote = (string: noteString, fret: number, options: { fadeNonNatural: boolean } = { fadeNonNatural: false }) => {
    return addNoteToBoard(d3.select(boardRef.current), string, fret, options);
  }

  const addShape = (shape: ScaleOrChordShape) => {

    d3.select(boardRef.current).selectAll('.note').remove();

    for (const [string, fret] of shape.notes) {
      addNote(string, fret);
    }

    fitFretBoard();
  }

  const addImage = (src: string, pos: { x: number, y: number }, width: number, height: number) => {
    const svg = d3.select(svgRef.current);
    const imagesLayer = svg.select<SVGGElement>('.pasted-images');

    const group = imagesLayer.append('g')
      .attr('class', 'pasted-image')
      .datum<PastedImageDatum & { transform: any }>({ id: generateId(), type: 'image', src, width, height, transform: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 } });

    group.append('image')
      .attr('href', src)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height);

    applyTransform(group, { translateX: pos.x, translateY: pos.y, scaleX: 1, scaleY: 1, rotate: 0 });

    group.call(makeDraggable);
    group.call(makeResizable, { rotatable: true });
    group.call(makeCroppable);

    if (debug) {
      addDebugCross(group);
    }

    group.dispatch('click');

    return group;
  }

  const addVideo = (url: string, pos: { x: number, y: number }) => {
    const videoId = extractVideoId(url);
    if (!videoId) return null;

    const svg = d3.select(svgRef.current);
    const videosLayer = svg.select<SVGGElement>('.embedded-videos');

    const group = videosLayer.append('g')
      .attr('class', 'embedded-video')
      .datum<PastedVideoDatum & { width: number, height: number, transform: any }>({
        id: generateId(),
        type: 'video',
        url,
        videoId,
        width: videoWidth + videoPadding * 2,
        height: videoHeight + videoPadding * 2,
        transform: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
      });

    group.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', videoWidth + videoPadding * 2)
      .attr('height', videoHeight + videoPadding * 2)
      .attr('fill', 'transparent');

    const fo = group.append('foreignObject')
      .attr('x', videoPadding)
      .attr('y', videoPadding)
      .attr('width', videoWidth)
      .attr('height', videoHeight);

    fo.append('xhtml:iframe')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('src', `https://www.youtube.com/embed/${videoId}`)
      .attr('frameBorder', '0')
      .attr('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture')
      .attr('allowFullScreen', 'true');

    applyTransform(group, { translateX: pos.x, translateY: pos.y, scaleX: 1, scaleY: 1, rotate: 0 });

    group.call(makeDraggable);
    group.call(makeResizable, { lockAspectRatio: true, rotatable: true });

    if (debug) {
      addDebugCross(group);
    }

    group.dispatch('click');

    return group;
  }


  const addSticky = useCallback((text: string, pos: { x: number, y: number }) => {
    const svg = d3.select(svgRef.current);
    const notesLayer = svg.select<SVGGElement>('.sticky-notes');

    const group = notesLayer.append('g')
      .attr('class', 'sticky-note')
      .datum<StickyNoteDatum & { width: number, height: number, transform: any, fontSize: number | null }>({
        id: generateId(),
        type: 'sticky',
        text,
        align: stickyAlign,
        width: stickyWidth,
        height: stickyHeight,
        fontSize: null,
        transform: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
      })
      .style('filter', 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))');

    group.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', stickyWidth)
      .attr('height', stickyHeight)
      .attr('fill', stickyColor);

    const fo = group.append('foreignObject')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', stickyWidth)
      .attr('height', stickyHeight);

    const div = fo.append('xhtml:div')
      .classed('sticky-text', true)
      .classed('view-mode', true)
      .style('width', '100%')
      .style('height', '100%')
      .style('box-sizing', 'border-box')
      .style('font-family', 'Segoe UI')
      .style('font-size', '12px')
      .style('padding', '12px')
      .style('text-align', stickyAlign)
      .style('overflow', 'hidden')
      .style('white-space', 'pre-wrap')
      .style('word-break', 'break-word')
      .text(text);

    setTimeout(() => {
      const node = div.node() as HTMLDivElement | null;
      if (node) adjustStickyFont(node, null);
    }, 0);

    group.on('dblclick', () => {
      div
        .attr('contentEditable', 'true')
        .classed('view-mode', false)
        .classed('edit-mode', true)
        .on('mousedown.edit', (event: MouseEvent) => event.stopPropagation())
        .on('paste.edit', (event: ClipboardEvent) => {
          event.preventDefault();
          const plain = event.clipboardData?.getData('text/plain') || '';
          document.execCommand('insertText', false, plain);
        });

      setTimeout(() => {
        (div.node() as HTMLDivElement)?.focus();
      }, 0);
    });

    div.on('blur', () => {
      const data = group.datum() as StickyNoteDatum & { transform: any };
      data.text = div.text();
      div
        .attr('contentEditable', 'false')
        .classed('edit-mode', false)
        .classed('view-mode', true)
        .on('mousedown.edit', null)
        .on('paste.edit', null);

      const node = div.node() as HTMLDivElement | null;
      if (node) {
        const data = group.datum() as any;
        adjustStickyFont(node, data.fontSize);
      }
    });

    applyTransform(group, { translateX: pos.x, translateY: pos.y, scaleX: 1, scaleY: 1, rotate: 0 });

    group.call(makeDraggable);
    group.call(makeResizable, {
      rotatable: true,
      onResizeEnd: (el) => {
        const divNode = el.select<HTMLDivElement>('foreignObject > .sticky-text').node();
        if (divNode) {
          const data = el.datum() as any;
          adjustStickyFont(divNode, data.fontSize);
        }
      }
    });

    if (debug) {
      addDebugCross(group);
    }

    group.dispatch('click');

    return group;
  }, [stickyColor]);

  const addCodeBlock = useCallback((code: string, lang: string, theme: string, pos: { x: number, y: number }, size: number = codeFontSize) => {
    const svg = d3.select(svgRef.current);
    const layer = svg.select<SVGGElement>('.code-blocks');

    const group = layer.append('g')
      .attr('class', 'code-block')
      .datum<CodeBlockDatum & { width: number; height: number; transform: any }>({
        id: generateId(),
        type: 'code',
        code,
        lang,
        theme,
        fontSize: size,
        width: codeWidth,
        height: codeHeight,
        transform: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
      });

    group.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', codeWidth)
      .attr('height', codeHeight)
      .attr('stroke', '#333')
      .attr('stroke-width', 1);

    const fo = group.append('foreignObject')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', codeWidth)
      .attr('height', codeHeight);

    const pre = fo.append('xhtml:pre')
      .style('margin', '0')
      .style('padding', '8px')
      .style('height', '100%')
      .style('overflow', 'auto')
      .style('font-family', 'monospace')
      .style('font-size', `${size}px`);

    highlightCode(code, lang, theme).then(res => {
      pre.style('background-color', res.background)
        .style('font-size', `${size}px`)
        .html(res.html);
    });

    group.on('dblclick', () => {
      pre
        .attr('contentEditable', 'true')
        .classed('edit-mode', true)
        .style('color', theme === 'github-dark' ? '#fff' : '#000')
        .on('mousedown.edit', (event: MouseEvent) => event.stopPropagation())
        .on('keydown.edit', (event: KeyboardEvent) => {
          if (event.ctrlKey && event.key === 'Enter') {
            (pre.node() as HTMLElement).blur();
            event.preventDefault();
          }
          event.stopPropagation();
        })
        .on('keyup.edit', (event: KeyboardEvent) => event.stopPropagation());
      setTimeout(() => { (pre.node() as HTMLElement)?.focus(); }, 0);
    });

    pre.on('blur', () => {
      const data = group.datum() as CodeBlockDatum & { transform: any };
      data.code = (pre.node() as HTMLElement).innerText;
      pre
        .attr('contentEditable', 'false')
        .classed('edit-mode', false)
        .on('mousedown.edit', null)
        .on('keydown.edit', null)
        .on('keyup.edit', null);
      highlightCode(data.code, data.lang, data.theme).then(res => {
        pre.style('background-color', res.background)
          .style('font-size', `${data.fontSize}px`)
          .html(res.html);
      });
      pre.style('color', null);
      window.getSelection()?.removeAllRanges();
    });

    applyTransform(group, { translateX: pos.x, translateY: pos.y, scaleX: 1, scaleY: 1, rotate: 0 });

    group.call(makeDraggable);
    group.call(makeResizable, { rotatable: true });

    if (debug) addDebugCross(group);

    group.dispatch('click');
    return group;
  }, [codeLanguage, codeTheme]);

  interface ConnectionInfo { elementId: string; position: string }

  const findClosestHandle = (x: number, y: number) => {
    const handles = d3.select(svgRef.current).selectAll<SVGCircleElement, any>('.connect-handle');
    let best: { x: number, y: number, elementId: string, position: string } | null = null;
    handles.each(function () {
      const h = d3.select(this);
      const hx = parseFloat(h.attr('data-abs-x') || '0');
      const hy = parseFloat(h.attr('data-abs-y') || '0');
      const dist = Math.hypot(hx - x, hy - y);
      if (dist < 10 && (!best || dist < Math.hypot(best.x - x, best.y - y))) {
        best = { x: hx, y: hy, elementId: h.attr('data-parent') || '', position: h.attr('data-pos') || '' };
      }
    });
    return best;
  };

  const showTempHandles = () => {
    const workspace = d3.select(workspaceRef.current);
    workspace.selectAll<SVGGElement, any>('g')
      .filter(function () { return !d3.select(this).classed('line-element'); })
      .each(function () { ensureConnectHandles(d3.select(this)); });
  };

  const hideTempHandles = () => {
    const workspace = d3.select(workspaceRef.current);
    workspace.selectAll<SVGGElement, any>('g')
      .filter(function () { return d3.select(this).select('.selection-outline').empty(); })
      .each(function () { removeConnectHandles(d3.select(this)); });
  };

  const addLine = useCallback((start: { x: number, y: number }, end?: { x: number, y: number }, startConn?: ConnectionInfo, endConn?: ConnectionInfo) => {
    const svg = d3.select(svgRef.current);
    const layer = svg.select<SVGGElement>('.lines');
    const group = layer.append('g')
      .attr('class', 'line-element')
      .datum<{ id: string; type: 'line'; x1: number; y1: number; x2: number; y2: number; style: 'direct' | 'arc' | 'corner'; color: string; startStyle: 'circle' | 'arrow' | 'triangle' | 'none'; endStyle: 'circle' | 'arrow' | 'triangle' | 'none'; startConn?: ConnectionInfo; endConn?: ConnectionInfo }>({
        id: generateId(),
        type: 'line',
        x1: start.x,
        y1: start.y,
        x2: end ? end.x : start.x + 100,
        y2: end ? end.y : start.y,
        style: 'arc',
        color: defaultLineColor,
        startStyle: 'triangle',
        endStyle: 'triangle',
        startConn,
        endConn,
      });
    const path = group.append('path')
      .attr('d', linePath(group.datum()))
      .attr('stroke', defaultLineColor)
      .attr('fill', 'none')
      .attr('stroke-width', 2);
    applyLineAppearance(group as any);
    group.append('circle')
      .attr('class', 'line-handle start')
      .attr('r', 4)
      .attr('cx', start.x)
      .attr('cy', start.y)
      .call(d3.drag<SVGCircleElement, unknown>()
        .on('start', showTempHandles)
        .on('drag', function (event) {
          const g = d3.select(this.parentNode as SVGGElement);
          const d = g.datum() as any;
          const { x, y } = toWorkspace(event.sourceEvent.clientX, event.sourceEvent.clientY);
          d.startConn = undefined;
          d.x1 = x;
          d.y1 = y;
          const snap = findClosestHandle(x, y);
          if (snap) {
            d.x1 = snap.x;
            d.y1 = snap.y;
            d.startConn = { elementId: snap.elementId, position: snap.position };
          }
          g.select('path').attr('d', linePath(d));
          d3.select(this).attr('cx', d.x1).attr('cy', d.y1);
        })
        .on('end', function () {
          hideTempHandles();
        }));
    group.append('circle')
      .attr('class', 'line-handle end')
      .attr('r', 4)
      .attr('cx', end ? end.x : start.x + 100)
      .attr('cy', end ? end.y : start.y)
      .call(d3.drag<SVGCircleElement, unknown>()
        .on('start', showTempHandles)
        .on('drag', function (event) {
          const g = d3.select(this.parentNode as SVGGElement);
          const d = g.datum() as any;
          const { x, y } = toWorkspace(event.sourceEvent.clientX, event.sourceEvent.clientY);
          d.endConn = undefined;
          d.x2 = x;
          d.y2 = y;
          const snap = findClosestHandle(x, y);
          if (snap) {
            d.x2 = snap.x;
            d.y2 = snap.y;
            d.endConn = { elementId: snap.elementId, position: snap.position };
          }
          g.select('path').attr('d', linePath(d));
          d3.select(this).attr('cx', d.x2).attr('cy', d.y2);
        })
        .on('end', function () {
          hideTempHandles();
        }));
    group.call(makeResizable);
    group.dispatch('click');
    updateSelectedLineColor(defaultLineColor);
    updateSelectedStartConnectionStyle('circle');
    updateSelectedEndConnectionStyle('circle');
    return group;
  }, []);

  const duplicateElement = (info: ElementCopy) => {
    const pos = cursorRef.current;
    if (info.type === 'image') {
      const g = addImage(info.data.src, pos, info.data.width, info.data.height);
      const d = g.datum() as any;
      applyTransform(g, { ...info.data.transform, translateX: pos.x, translateY: pos.y });
      if (info.data.crop) {
        d.crop = { ...info.data.crop };
        g.select('.clip-rect')
          .attr('x', info.data.crop.x)
          .attr('y', info.data.crop.y)
          .attr('width', info.data.crop.width)
          .attr('height', info.data.crop.height);
      }
    } else if (info.type === 'video') {
      const g = addVideo(info.data.url, pos);
      if (g) {
        applyTransform(g, { ...info.data.transform, translateX: pos.x, translateY: pos.y });
      }
    } else if (info.type === 'sticky') {
      const g = addSticky(info.data.text, pos);
      const d = g.datum() as any;
      d.width = info.data.width;
      d.height = info.data.height;
      d.align = info.data.align;
      d.fontSize = info.data.fontSize ?? null;
      g.select('rect').attr('width', info.data.width).attr('height', info.data.height);
      g.select('foreignObject').attr('width', info.data.width).attr('height', info.data.height);
      const div = g.select<HTMLDivElement>('foreignObject > .sticky-text')
        .style('text-align', info.data.align)
        .node();
      if (div) adjustStickyFont(div, d.fontSize);
      applyTransform(g, { ...info.data.transform, translateX: pos.x, translateY: pos.y });
    } else if (info.type === 'code') {
      const g = addCodeBlock(info.data.code, info.data.lang, info.data.theme, pos, info.data.fontSize);
      const pre = g.select<HTMLPreElement>('foreignObject > pre').node();
      if (pre) {
        highlightCode(info.data.code, info.data.lang, info.data.theme).then(res => {
          pre.innerHTML = res.html;
          pre.style.backgroundColor = res.background;
          pre.style.fontSize = `${info.data.fontSize}px`;
        });
      }
      applyTransform(g, { ...info.data.transform, translateX: pos.x, translateY: pos.y });
    } else if (info.type === 'board') {
      const newId = boardsRef.current.length ? Math.max(...boardsRef.current) + 1 : 0;
      addBoard();
      const apply = () => {
        const workspace = d3.select(workspaceRef.current);
        const g = workspace.select<SVGGElement>(`.guitar-board-${newId}`);
        if (g.empty()) {
          requestAnimationFrame(apply);
          return;
        }
        applyTransform(g, { ...info.data.transform, translateX: pos.x, translateY: pos.y });
        if (Array.isArray(info.data.notes)) {
          info.data.notes.forEach((n: any) => addNoteToBoard(g, n.string, n.fret));
        }
      };
      apply();
    } else if (info.type === 'drawing') {
      const svg = d3.select(svgRef.current);
      const layer = svg.select<SVGGElement>('.drawings');
      const g = layer.append('g')
        .attr('class', 'drawing')
        .datum<{ id: string; type: 'drawing'; width: number; height: number; transform: any; lines: any[] }>({
          id: generateId(),
          type: 'drawing',
          width: info.data.width,
          height: info.data.height,
          transform: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
          lines: info.data.lines.map((ln: any) => ({ ...ln }))
        });
      info.data.lines.forEach((ln: any) => {
        g.append('path')
          .attr('d', `M ${ln.x1} ${ln.y1} Q ${ln.cx} ${ln.cy} ${ln.x2} ${ln.y2}`)
          .attr('stroke', 'black')
          .attr('fill', 'none')
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-width', ln.stroke);
      });
      applyTransform(g, { ...info.data.transform, translateX: pos.x, translateY: pos.y });
      g.call(makeDraggable);
      g.call(makeResizable, { rotatable: true });
      if (debug) addDebugCross(g);
    }
  };

  const serializeWorkspace = (): ElementCopy[] => {
    const svg = d3.select(svgRef.current);
    const workspace = svg.select<SVGGElement>('.workspace');
    const items: ElementCopy[] = [];
    workspace.selectAll<SVGGElement, any>('g').each(function () {
      const el = d3.select(this);
      const data = { ...(el.datum() as any) };
      if (!data || !data.type) return;
      const info: ElementCopy = { type: data.type, data: { ...data } };
      if (info.type === 'board') {
        info.data.notes = el.selectAll('.note').data().map((n: any) => ({ string: n.string, fret: n.fret }));
      }
      items.push(info);
    });
    return items;
  };

  const loadWorkspace = (items: ElementCopy[]) => {
    localStorage.setItem('tremoloBoard', JSON.stringify(items));
    window.location.reload();
  };


  function fillAllNotes() {
    d3.select(boardRef.current).selectAll('.note').remove();

    for (const string of stringNames) {
      for (let a = 0; a <= fretCount; a++) {
        addNote(string, a, { fadeNonNatural: true });
      }
    }

    fitFretBoard();
  }

  const drawBoard = (
    boardSel: d3.Selection<SVGGElement, any, any, any> | null = d3.select(boardRef.current),
    range: number[] = fretRange
  ) => {
    if (!boardSel) return;

    boardSel.selectAll('.string').remove();
    boardSel.selectAll('.fret').remove();
    boardSel.selectAll('.background').remove();

    const x1 = fretWidth * (Math.min(...range) - 1);
    const x2 = fretWidth * (Math.max(...range) - 1);
    const fretRangeCount = Math.max(...range) - Math.min(...range) + 1;

    boardSel
      .selectAll('.string')
      .data(stringNames)
      .join('line')
      .attr('class', 'string')
      .attr('x1', x1)
      .attr('y1', (_, index) => index * fretBoardHeight / 5 + edgeOffset)
      .attr('x2', x2)
      .attr('y2', (_, index) => index * fretBoardHeight / 5 + edgeOffset)
      .attr('stroke', 'black')
      .attr('stroke-width', (_, index) => (index < 3 ? 2 : 4))
      .lower()
      .call(debugTooltip);

    boardSel
      .selectAll('.fret')
      .data(new Array(fretRangeCount).fill(null))
      .join('line')
      .attr('class', 'fret')
      .attr('x1', (_, index) => index * fretWidth + x1)
      .attr('y1', edgeOffset)
      .attr('x2', (_, index) => index * fretWidth + x1)
      .attr('y2', fretBoardHeight + edgeOffset)
      .attr('stroke', 'black')
      .attr('stroke-dasharray', '5')
      .insert('line', ':first-child')
      .lower()
      .call(debugTooltip);

    boardSel
      .insert('rect', ':first-child')
      .attr('class', 'background')
      .attr('x', x1)
      .attr('y', edgeOffset)
      .attr('width', (fretRangeCount - 1) * fretWidth)
      .attr('height', fretBoardHeight)
      .attr('fill', 'white');

    updateNoteNameVisibility();
  };

  const fitFretBoard = () => {
    const notes = d3.select(boardRef.current).selectAll('.note').data() as NoteDatum[];
    let min = notes.reduce((acc, note) => (acc < note.fret ? acc : note.fret), fretCount);
    let max = notes.reduce((acc, note) => (acc > note.fret ? acc : note.fret), 0) + 1;

    min = min > 1 ? min - 1 : min;
    max = max < fretCount ? max + 1 : max;

    const range = [min, max];
    fretRangesRef.current[selectedBoard] = range;
    setFretRange(range);
  }

  useEffect(() => {
    drawBoard();
  }, [drawBoard, fretRange, selectedBoard]);

  useEffect(() => {
    const handle = (e: MouseEvent) => updateCursor(e.clientX, e.clientY);
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  useEffect(() => {
    const handler = () => addCodeBlock('', codeLanguage, codeTheme, cursorRef.current, codeFontSize);
    window.addEventListener('createcodeblock', handler as EventListener);
    return () => window.removeEventListener('createcodeblock', handler as EventListener);
  }, [addCodeBlock, codeLanguage, codeTheme, codeFontSize]);

  useEffect(() => {
    const handler = () => addLine(cursorRef.current);
    window.addEventListener('createline', handler as EventListener);
    return () => window.removeEventListener('createline', handler as EventListener);
  }, [addLine]);

  const activeLine = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);

  useEffect(() => {
    const start = (e: CustomEvent) => {
      const { x, y, elementId, position } = e.detail;
      showTempHandles();
      activeLine.current = addLine({ x, y }, { x, y }, { elementId, position });
    };
    const drag = (e: CustomEvent) => {
      if (!activeLine.current) return;
      const { x, y } = e.detail;
      const d = activeLine.current.datum() as any;
      d.endConn = undefined;
      d.x2 = x;
      d.y2 = y;
      const snap = findClosestHandle(x, y);
      if (snap) {
        d.x2 = snap.x;
        d.y2 = snap.y;
        d.endConn = { elementId: snap.elementId, position: snap.position };
      }
      activeLine.current.select('path').attr('d', linePath(d));
      activeLine.current.select('circle.end').attr('cx', d.x2).attr('cy', d.y2);
    };
    const end = (e: CustomEvent) => {
      drag(e);
      if (activeLine.current) {
        activeLine.current.call(makeResizable);
        activeLine.current = null;
      }
      hideTempHandles();
    };
    window.addEventListener('lineconnectstart', start as EventListener);
    window.addEventListener('lineconnectdrag', drag as EventListener);
    window.addEventListener('lineconnectend', end as EventListener);
    return () => {
      window.removeEventListener('lineconnectstart', start as EventListener);
      window.removeEventListener('lineconnectdrag', drag as EventListener);
      window.removeEventListener('lineconnectend', end as EventListener);
    };
  }, [addLine]);

  useEffect(() => {
    const handler = () => addSticky('', cursorRef.current);
    window.addEventListener('createsticky', handler as EventListener);
    return () => window.removeEventListener('createsticky', handler as EventListener);
  }, [addSticky]);

  useEffect(() => {
    const handler = () => {
      setBoardSelected(true);
      setShowPanel(true);
    };
    window.addEventListener('editnotes', handler as EventListener);
    return () => window.removeEventListener('editnotes', handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (svgRef.current) {
        exportBoardPng(svgRef.current);
      }
    };
    window.addEventListener('exportimage', handler as EventListener);
    return () => window.removeEventListener('exportimage', handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = () => {
      const data = serializeWorkspace();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'tremolo-board.json';
      a.click();
    };
    window.addEventListener('savefile', handler as EventListener);
    return () => window.removeEventListener('savefile', handler as EventListener);
  }, []);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true')) return;
      if (e.key === 'c' && !e.ctrlKey && !croppableSelected) {
        window.dispatchEvent(new Event('createcodeblock'));
        e.preventDefault();
        e.stopImmediatePropagation();
      } else if (e.key === 'n' && !e.ctrlKey) {
        window.dispatchEvent(new Event('createsticky'));
        e.preventDefault();
        e.stopImmediatePropagation();
      } else if (e.key === 'l' && !e.ctrlKey) {
        window.dispatchEvent(new Event('createline'));
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', handle, true);
    return () => window.removeEventListener('keydown', handle, true);
  }, [croppableSelected, codeLanguage, codeTheme]);

  useEffect(() => {
    if (zoomBehaviorRef.current && svgRef.current) {
      zoomBehaviorRef.current.filter(event => {
        if (event.type === 'dblclick') return false;
        const e = event as any;
        if (e.ctrlKey) return false;
        if (drawingMode) return false;
        const target = e.target as Element;
        return target === svgRef.current || target === workspaceRef.current;
      });
    }
    if (workspaceRef.current) {
      d3.select(workspaceRef.current).style('pointer-events', drawingMode ? 'none' : 'all');
    }
  }, [drawingMode]);

  useEffect(() => {
    setStickySelected(false);
    setCodeSelected(false);
    const handler = (e: Event) => {
      const node = (e as CustomEvent).detail as Node | null;
      if (!node) {
        setStickySelected(false);
        setCodeSelected(false);
        setCroppableSelected(false);
        setSelectedBounds(null);
      } else {
        const sel = d3.select(node);
        setStickySelected(sel.classed('sticky-note'));
        setCodeSelected(sel.classed('code-block'));
        setCroppableSelected(sel.classed('croppable'));
        const bbox = (node as SVGGraphicsElement).getBBox();
        const data: any = sel.datum() || {};
        const width = (data.width ?? bbox.width) * (data.transform?.scaleX ?? 1);
        const height = (data.height ?? bbox.height) * (data.transform?.scaleY ?? 1);
        const t = data.transform || { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 };
        setSelectedBounds({ x: t.translateX, y: t.translateY, width, height, rotate: t.rotate ?? 0 });
      }
    };
    window.addEventListener('stickyselectionchange', handler);
    return () => window.removeEventListener('stickyselectionchange', handler);
  }, [setStickySelected, setCodeSelected]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        active.getAttribute('contentEditable') === 'true' &&
        (active.classList.contains('sticky-text') || active.classList.contains('edit-mode'))
      ) {
        return; // allow paste in editable fields
      }
      const text = event.clipboardData?.getData('text/plain');
      if (text) {
        const trimmed = text.trim();
        if (trimmed.startsWith('tremolo:')) {
          try {
            const info = JSON.parse(trimmed.slice('tremolo:'.length));
            duplicateElement(info);
            event.preventDefault();
            return;
          } catch (err) {
            console.error('Failed to parse tremolo data:', trimmed, err);
          }
        }
        const id = extractVideoId(trimmed);
        if (id) {
          addVideo(trimmed, cursorRef.current);
          event.preventDefault();
          return;
        }

        if (trimmed.length > 0) {
          addSticky(trimmed, cursorRef.current);
          event.preventDefault();
          return;
        }
      }

      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            addImage(url, cursorRef.current, img.width, img.height);
          };
          img.src = url;
          event.preventDefault();
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [addSticky]);

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        active.getAttribute('contentEditable') === 'true' &&
        (active.classList.contains('sticky-text') || active.classList.contains('edit-mode'))
      ) {
        return;
      }
      const info = getSelectedElementData();
      if (info) {
        e.preventDefault();
        e.clipboardData?.setData('text/plain', `tremolo:${JSON.stringify(info)}`);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        const info = getSelectedElementData();
        if (info) {
          duplicateElement(info);
          e.preventDefault();
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        if (svgRef.current) {
          exportBoardPng(svgRef.current);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('copy', handleCopy);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const updateCursor = (clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPoint = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    const [x, y] = zoomRef.current.invert([svgPoint.x, svgPoint.y]);
    cursorRef.current = { x, y };
    setCursorPos(cursorRef.current);
  };

  const toWorkspace = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPoint = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    const [x, y] = zoomRef.current.invert([svgPoint.x, svgPoint.y]);
    return { x, y };
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    updateCursor(event.clientX, event.clientY);
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingMode) return;
    event.stopPropagation();
    const { x, y } = toWorkspace(event.clientX, event.clientY);
    const svg = d3.select(svgRef.current);
    const layer = svg.select<SVGGElement>('.drawings');
    const g = layer.append('g')
      .attr('class', 'drawing')
      .datum<{ id: string; type: 'drawing'; width: number; height: number; transform: any; lines: any[] }>({
        id: generateId(),
        type: 'drawing',
        width: 0,
        height: 0,
        transform: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
        lines: [],
      });
    drawingSel.current = g;
    drawing.current = true;
    lastPoint.current = { x, y, time: performance.now() };
    lastMid.current = { x, y };
    lastStroke.current = typeof brushWidth === 'number' ? brushWidth : 4;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing.current || !drawingSel.current) return;
    const prev = lastPoint.current;
    const midPrev = lastMid.current;
    if (!prev || !midPrev) return;
    const { x, y } = toWorkspace(event.clientX, event.clientY);
    const smoothing = 0.2;
    const sx = prev.x + (x - prev.x) * smoothing;
    const sy = prev.y + (y - prev.y) * smoothing;
    const now = performance.now();
    const dt = now - prev.time;
    const dist = Math.hypot(sx - prev.x, sy - prev.y);
    const speed = dt > 0 ? dist / dt : 0;
    const minStroke = 1;
    const maxStroke = 6;
    let stroke: number;
    if (brushWidth === 'auto') {
      const t = Math.min(speed / 0.3, 1);
      const target = minStroke + (maxStroke - minStroke) * Math.pow(1 - t, 2);
      stroke = lastStroke.current * 0.7 + target * 0.3;
    } else {
      stroke = brushWidth;
    }
    lastStroke.current = stroke;
    const midX = (prev.x + sx) / 2;
    const midY = (prev.y + sy) / 2;
    drawingSel.current.append('path')
      .attr('d', `M ${midPrev.x} ${midPrev.y} Q ${prev.x} ${prev.y} ${midX} ${midY}`)
      .attr('stroke', 'black')
      .attr('fill', 'none')
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-width', stroke);
    const data: any = drawingSel.current.datum();
    data.lines.push({ x1: midPrev.x, y1: midPrev.y, cx: prev.x, cy: prev.y, x2: midX, y2: midY, stroke });
    lastMid.current = { x: midX, y: midY };
    lastPoint.current = { x: sx, y: sy, time: now };
  };

  const finishDrawing = () => {
    if (!drawing.current || !drawingSel.current) return;
    const g = drawingSel.current;
    const bbox = (g.node() as SVGGraphicsElement).getBBox();
    const data: any = g.datum();
    data.width = bbox.width;
    data.height = bbox.height;
    data.lines = data.lines.map((ln: any) => ({
      x1: ln.x1 - bbox.x,
      y1: ln.y1 - bbox.y,
      cx: ln.cx - bbox.x,
      cy: ln.cy - bbox.y,
      x2: ln.x2 - bbox.x,
      y2: ln.y2 - bbox.y,
      stroke: ln.stroke,
    }));
    applyTransform(g, { translateX: bbox.x, translateY: bbox.y, scaleX: 1, scaleY: 1, rotate: 0 });
    g.selectAll<SVGPathElement, any>('path').each(function (d: any, i: number) {
      const ln = data.lines[i];
      d3.select(this).attr('d', `M ${ln.x1} ${ln.y1} Q ${ln.cx} ${ln.cy} ${ln.x2} ${ln.y2}`);
    });
    g.call(makeDraggable);
    g.call(makeResizable, { rotatable: true });
    if (debug) addDebugCross(g);
    drawing.current = false;
    drawingSel.current = null;
    lastPoint.current = null;
    lastMid.current = null;
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing.current) return;
    finishDrawing();
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    let workspace = svg.select<SVGGElement>('.workspace');
    if (workspace.empty()) {
      workspace = svg.append('g').attr('class', 'workspace');
      workspace.append('g').attr('class', 'pasted-images');
      workspace.append('g').attr('class', 'embedded-videos');
      workspace.append('g').attr('class', 'sticky-notes');
      workspace.append('g').attr('class', 'code-blocks');
      workspace.append('g').attr('class', 'lines');
      workspace.append('g').attr('class', 'drawings');
      if (debug) {
        workspace.append('text')
          .attr('id', 'global-debug-cross')
          .attr('x', 0)
          .attr('y', 0)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', 40)
          .attr('class', 'debug-cross-global')
          .style('pointer-events', 'none')
          .text('+');
      }
    }
    workspaceRef.current = workspace.node();
    setSvgRoot(svgRef.current, workspaceRef.current);

    boards.forEach((id) => {
      let b = workspace.select<SVGGElement>(`.guitar-board-${id}`);
      if (b.empty()) {
        b = workspace
          .append('g')
          .attr('class', `guitar-board guitar-board-${id}`)
          .datum<{ id: string; type: 'board'; transform: any }>({
            id: generateId(),
            type: 'board',
            transform: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
          });
        b.call(makeDraggable);
        b.call(makeResizable, { rotatable: true });
        if (debug) {
          addDebugCross(b);
        }
        b.on('click.board', () => { setSelectedBoard(id); setBoardSelected(true); });
        b.on('dblclick.board', () => {
          setSelectedBoard(id);
          setShowPanel(true);
          setBoardSelected(true);
        });
        drawBoard(b, fretRangesRef.current[id] ?? [1, fretCount]);
      }
    });

    boardRef.current = workspace.select<SVGGElement>(`.guitar-board-${selectedBoard}`).node() || null;
    setFretRange(fretRangesRef.current[selectedBoard] ?? [1, fretCount]);
    drawBoard();
    updateNoteNameVisibility();
  }, [boards, selectedBoard]);

  useEffect(() => {
    const workspace = d3.select(workspaceRef.current);
    if (!workspace.empty()) {
      let cross = workspace.select('#global-debug-cross');
      if (debug && cross.empty()) {
        cross = workspace.append('text')
          .attr('id', 'global-debug-cross')
          .attr('x', 0)
          .attr('y', 0)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', 40)
          .attr('class', 'debug-cross-global')
          .style('pointer-events', 'none')
          .text('+');
      }
      cross.style('display', debug ? 'block' : 'none');
      d3.selectAll('.component-debug-cross').style('display', debug ? 'block' : 'none');
    }
  }, [debug]);

  useEffect(() => {
    const saved = localStorage.getItem('tremoloBoard');
    if (saved) {
      try {
        const items: ElementCopy[] = JSON.parse(saved);
        items.forEach((info) => {
          cursorRef.current = {
            x: info.data.transform?.translateX ?? 0,
            y: info.data.transform?.translateY ?? 0,
          };
          duplicateElement(info);
        });
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const save = () => {
      const data = serializeWorkspace();
      localStorage.setItem('tremoloBoard', JSON.stringify(data));
    };
    const id = setInterval(save, 2000);
    window.addEventListener('beforeunload', save);
    return () => {
      clearInterval(id);
      window.removeEventListener('beforeunload', save);
    };
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .filter(event => {
        if (event.type === 'dblclick') return false;
        const e = event as any;
        if (e.ctrlKey) return false;
        if (drawingMode) return false;
        const target = e.target as Element;
        return target === svgRef.current || target === workspaceRef.current;
      })
      .scaleExtent([0.1, 10])
      .on('start', hideTooltip)
      .on('zoom', (event) => {
        d3.select(svgRef.current).select('.workspace').attr('transform', event.transform.toString());
        zoomRef.current = event.transform;
        setZoomTransform(event.transform);
        setZoomValue(event.transform.k);
      });

    svg.call(zoom as any);
    zoomBehaviorRef.current = zoom;
    setZoomTransform(d3.zoomIdentity);
    setSvgRoot(svgRef.current, workspaceRef.current);
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        boardRef.current?.contains(target) ||
        controlsRef.current?.contains(target) ||
        (target as HTMLElement).closest('#board-edit-button')
      ) {
        return;
      }
      setShowPanel(false);
      setBoardSelected(false);
    };
    window.addEventListener('click', handle);
    return () => window.removeEventListener('click', handle);
  }, []);

  return (
    <>
      <div id="tooltip"></div>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onMouseMove={handleMouseMove}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        ></svg>
        <Box sx={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 1, display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ px: 1 }}>{zoomValue.toFixed(2)}x</Typography>
          <IconButton size="small" onClick={() => {
            if (zoomBehaviorRef.current && svgRef.current) {
              d3.select(svgRef.current).transition().call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
              setZoomValue(1);
            }
          }}>
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Box>
        {debug && (
          <Box sx={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 1, px: 1 }}>
            <Typography variant="body2">
              Debugging: {`x:${cursorPos.x.toFixed(1)} y:${cursorPos.y.toFixed(1)}`}
              {selectedBounds &&
                ` | sel: x:${selectedBounds.x.toFixed(1)}, y:${selectedBounds.y.toFixed(1)}, w:${selectedBounds.width.toFixed(1)}, h:${selectedBounds.height.toFixed(1)}, a:${selectedBounds.rotate.toFixed(1)}`}
            </Typography>
          </Box>
        )}
        <Drawer
          anchor="bottom"
          open={showPanel}
          onClose={() => setShowPanel(false)}
          hideBackdrop
          ModalProps={{ keepMounted: true }}
          PaperProps={{ id: 'board-controls', ref: controlsRef, sx: { p: 2 } }}
        >
            <div>
              <Slider
                style={{ maxWidth: '180px' }}
                getAriaLabel={() => 'Frets'}
                value={fretRange}
                onChange={changeFretRange}
                valueLabelDisplay="auto"
                step={1}
                marks
                min={1}
                max={fretCount}
              />
            </div>
            <div>
              <FormControlLabel control={<Checkbox checked={showNoteNames} onChange={() => setShowNoteNames(!showNoteNames)} />} label="Show Note Names" />
            </div>
            <div>
              {chords.map((chord) => (
                <Button
                  onClick={() => addShape(chord)}
                  key={chord.name}
                  variant="contained"
                  color="primary"
                >
                  {chord.name}
                </Button>
              ))}
            </div>
            <div>
              {scales.map((scale) => (
                <Button
                  onClick={() => addShape(scale)}
                  key={scale.name}
                  variant="contained"
                  color="primary"
                >
                  {scale.name}
                </Button>
              ))}
            </div>
            <div>
              <Button onClick={fillAllNotes} variant="contained" color="primary">
                All Notes
              </Button>
            </div>
        </Drawer>
      </div>
    </>
  );
};

export default GuitarBoard;

