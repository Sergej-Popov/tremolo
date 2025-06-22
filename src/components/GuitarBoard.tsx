import React, { useEffect, useRef, useState, useContext, useCallback } from 'react';
import * as d3 from 'd3';
import { debugTooltip, makeDraggable, makeResizable, makeCroppable, applyTransform, hideTooltip, adjustStickyFont, addDebugCross, updateDebugCross } from '../d3-ext';

import { noteString, stringNames, calculateNote, ScaleOrChordShape } from '../music-theory';
import { chords, scales } from '../repertoire';
import { Button, Slider, Drawer, Box, Typography, IconButton } from '@mui/material';
import { AppContext } from '../Store';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

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

interface NoteDatum { string: noteString, fret: number }

interface PastedImageDatum { src: string, width: number, height: number }

interface PastedVideoDatum { url: string, videoId: string }

interface StickyNoteDatum { text: string, align: 'left' | 'center' | 'right' }

const stickyWidth = 150;
const stickyHeight = 100;

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
  const setStickySelected = app?.setStickySelected ?? (() => {});
  const svgRef = useRef<SVGSVGElement | null>(null);
  const workspaceRef = useRef<SVGGElement | null>(null);
  const boardRef = useRef<SVGGElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const zoomRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const cursorRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [selectedBounds, setSelectedBounds] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [zoomValue, setZoomValue] = useState(1);

  const boards = app?.boards ?? [0];
  const [selectedBoard, setSelectedBoard] = useState<number>(boards[0]);
  const fretRangesRef = useRef<Record<number, number[]>>({ 0: [1, fretCount] });
  
  const [fretRange, setFretRange] = useState<number[]>([1, fretCount]);

  useEffect(() => {
    const newest = boards[boards.length - 1];
    if (!(newest in fretRangesRef.current)) {
      fretRangesRef.current[newest] = [1, fretCount];
      setSelectedBoard(newest);
    }
  }, [boards]);

  const changeFretRange = (_: Event, newValue: number | number[]) => {
    const range = Array.isArray(newValue) ? newValue : [newValue, newValue];
    fretRangesRef.current[selectedBoard] = range;
    setFretRange(range);
  };


  const addNote = (string: noteString, fret: number, options: { fadeNonNatural: boolean } = { fadeNonNatural: false }) => {

    const x = fret * fretWidth - fretWidth / 2;
    const y = (6 - stringNames.indexOf(string) - 1) * stringHeight + edgeOffset;
    const noteLetter = calculateNote(string, fret);
    const fillColor = noteLetter.includes('#') && options.fadeNonNatural ? '#444444' : theme.notes[noteLetter];

    const g = d3.select(boardRef.current);
    const note = g.append('g')
      .attr('class', 'note')
      .datum<NoteDatum>({ string, fret });

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
      .attr('class', 'non-selectable');

    return note;
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
      .datum<PastedImageDatum & { transform: any }>({ src, width, height, transform: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 } });

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
      .datum<PastedVideoDatum & { transform: any }>({ url, videoId, transform: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 } });

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
      .datum<StickyNoteDatum & { width: number, height: number, transform: any }>({
        text,
        align: stickyAlign,
        width: stickyWidth,
        height: stickyHeight,
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
      if (node) adjustStickyFont(node);
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
      if (node) adjustStickyFont(node);
    });

    applyTransform(group, { translateX: pos.x, translateY: pos.y, scaleX: 1, scaleY: 1, rotate: 0 });

    group.call(makeDraggable);
    group.call(makeResizable, {
      rotatable: true,
      onResizeEnd: (el) => {
        const divNode = el.select<HTMLDivElement>('foreignObject > .sticky-text').node();
        if (divNode) adjustStickyFont(divNode);
      }
    });

    if (debug) {
      addDebugCross(group);
    }

    group.dispatch('click');

    return group;
  }, [stickyColor]);


  function fillAllNotes() {
    d3.select(boardRef.current).selectAll('.note').remove();

    for (const string of stringNames) {
      for (let a = 0; a <= fretCount; a++) {
        addNote(string, a, { fadeNonNatural: true });
      }
    }

    fitFretBoard();
  }

  const drawBoard = () => {

    const g = d3.select(boardRef.current);

    g.selectAll('.string').remove();
    g.selectAll('.fret').remove();
    g.selectAll('.background').remove();

    const x1 = fretWidth * (Math.min(...fretRange) - 1)
    const x2 = fretWidth * (Math.max(...fretRange) - 1)
    const fretRangeCount = Math.max(...fretRange) - Math.min(...fretRange) + 1;

    g.selectAll('.string')
      .data(stringNames)
      .join('line')
      .attr('class', 'string')
      .attr('x1', x1)
      .attr('y1', (_, index) => index * fretBoardHeight / 5 + edgeOffset)
      .attr('x2', x2)
      .attr('y2', (_, index) => index * fretBoardHeight / 5 + edgeOffset)
      .attr('stroke', 'black')
      // .attr('stroke-width', (_, index) => Math.ceil((index + 1) / 2) + 1); // old logic, 3 thickneses 2, 3, 4. But odd values have fuzzy lines
      .attr('stroke-width', (_, index) => index < 3 ? 2 : 4)
      .lower()
      .call(debugTooltip);

    g.selectAll('.fret')
      .data(new Array(fretRangeCount).fill(null))
      .join('line')
      .attr('class', 'fret')
      .attr('x1', (_, index) => index * fretWidth + x1)
      .attr('y1', + edgeOffset)
      .attr('x2', (_, index) => index * fretWidth + x1)
      .attr('y2', fretBoardHeight + edgeOffset)
      .attr('stroke', 'black')
      .attr('stroke-dasharray', '5')
      .insert('line', ':first-child')
      .lower()
      .call(debugTooltip)

    g.insert('rect', ':first-child')
      .attr('class', 'background')
      .attr('x', x1)
      .attr('y', edgeOffset)
      .attr('width', (fretRangeCount - 1) * fretWidth)
      .attr('height', fretBoardHeight)
      .attr('fill', 'white');
  }

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
    setStickySelected(false);
    const handler = (e: Event) => {
      const node = (e as CustomEvent).detail as Node | null;
      if (!node) {
        setStickySelected(false);
        setSelectedBounds(null);
      } else {
        const sel = d3.select(node);
        setStickySelected(sel.classed('sticky-note'));
        const bbox = (node as SVGGraphicsElement).getBBox();
        const data: any = sel.datum() || {};
        const t = data.transform || { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1 };
        setSelectedBounds({ x: t.translateX, y: t.translateY, width: bbox.width * t.scaleX, height: bbox.height * t.scaleY });
      }
    };
    window.addEventListener('stickyselectionchange', handler);
    return () => window.removeEventListener('stickyselectionchange', handler);
  }, [setStickySelected]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active.classList.contains('sticky-text') && active.getAttribute('contentEditable') === 'true') {
        return; // let the browser handle paste inside editable sticky
      }
      const text = event.clipboardData?.getData('text/plain');
      if (text) {
        const trimmed = text.trim();
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

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    updateCursor(event.clientX, event.clientY);
  };

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    let workspace = svg.select<SVGGElement>('.workspace');
    if (workspace.empty()) {
      workspace = svg.append('g').attr('class', 'workspace');
      workspace.append('g').attr('class', 'pasted-images');
      workspace.append('g').attr('class', 'embedded-videos');
      workspace.append('g').attr('class', 'sticky-notes');
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

    boards.forEach((id) => {
      let b = workspace.select<SVGGElement>(`.guitar-board-${id}`);
      if (b.empty()) {
        b = workspace.append('g')
          .attr('class', `guitar-board guitar-board-${id}`)
          .datum<{ transform: any }>({ transform: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 } });
        b.call(makeDraggable);
        b.call(makeResizable, { rotatable: true });
        if (debug) {
          addDebugCross(b);
        }
        b.on('click.board', () => setSelectedBoard(id));
        b.on('dblclick.board', () => { setSelectedBoard(id); setShowPanel(true); });
      }
    });

    boardRef.current = workspace.select<SVGGElement>(`.guitar-board-${selectedBoard}`).node() || null;
    setFretRange(fretRangesRef.current[selectedBoard] ?? [1, fretCount]);
    drawBoard();
  }, [boards, selectedBoard]);

  useEffect(() => {
    d3.select('#global-debug-cross').style('display', debug ? 'block' : 'none');
    d3.selectAll('.component-debug-cross').style('display', debug ? 'block' : 'none');
  }, [debug]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .filter(event => event.type !== 'dblclick')
      .scaleExtent([0.1, 10])
      .on('start', hideTooltip)
      .on('zoom', (event) => {
        d3.select(svgRef.current).select('.workspace').attr('transform', event.transform.toString());
        zoomRef.current = event.transform;
        setZoomValue(event.transform.k);
      });

    svg.call(zoom as any);
    zoomBehaviorRef.current = zoom;
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      if (boardRef.current?.contains(target) || controlsRef.current?.contains(target)) {
        return;
      }
      setShowPanel(false);
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
              Debugging: {`(${cursorPos.x.toFixed(1)}, ${cursorPos.y.toFixed(1)})`}
              {selectedBounds && ` | sel: ${selectedBounds.x.toFixed(1)}, ${selectedBounds.y.toFixed(1)}, ${selectedBounds.width.toFixed(1)}, ${selectedBounds.height.toFixed(1)}`}
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

