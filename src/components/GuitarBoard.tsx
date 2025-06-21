import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { debugTooltip, makeDraggable, makeResizable } from '../d3-ext';

import { noteString, stringNames, calculateNote, ScaleOrChordShape } from '../music-theory';
import { chords, scales } from '../repertoire';
import { Button, Slider } from '@mui/material';

const edgeOffset = 20;
const svgWidth = 500;
const svgHeight = 200

const fretCount = 12;
const fretBoardWidth = svgWidth;
const fretBoardHeight = svgHeight - (2 * edgeOffset);
const stringHeight = fretBoardHeight / 5;
const noteRadius = stringHeight / 2 - 3;
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

interface PastedImageDatum { src: string }

const GuitarBoard: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [fretRange, setFretRange] = useState<number[]>([1, fretCount]);

  const changeFretRange = (_: Event, newValue: number | number[]) => {
    setFretRange(Array.isArray(newValue) ? newValue : [newValue, newValue]);
  };


  const addNote = (string: noteString, fret: number, options: { fadeNonNatural: boolean } = { fadeNonNatural: false }) => {

    const x = fret * fretWidth - fretWidth / 2;
    const y = (6 - stringNames.indexOf(string) - 1) * stringHeight + edgeOffset;
    const noteLetter = calculateNote(string, fret);
    const fillColor = noteLetter.includes('#') && options.fadeNonNatural ? '#444444' : theme.notes[noteLetter];

    const svg = d3.select(svgRef.current);

    const g = svg.select('.guitar-board');
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

    d3.select(svgRef.current).selectAll('.note').remove();

    for (const [string, fret] of shape.notes) {
      addNote(string, fret);
    }

    fitFretBoard();
  }

  const addImage = (src: string) => {
    const svg = d3.select(svgRef.current);
    const imagesLayer = svg.select<SVGGElement>('.pasted-images');

    const group = imagesLayer.append('g')
      .attr('class', 'pasted-image')
      .datum<PastedImageDatum>({ src });

    group.append('image')
      .attr('href', src)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 100)
      .attr('height', 100);

    group.call(makeDraggable);
    group.call(makeResizable);

    return group;
  }


  function fillAllNotes() {
    d3.select(svgRef.current).selectAll('.note').remove();

    for (const string of stringNames) {
      for (let a = 0; a <= fretCount; a++) {
        addNote(string, a, { fadeNonNatural: true });
      }
    }

    fitFretBoard();
  }

  const drawBoard = () => {

    const svg = d3.select(svgRef.current);

    const g = svg.select('.guitar-board');

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
    const notes = d3.select(svgRef.current).selectAll('.note').data() as NoteDatum[];
    let min = notes.reduce((acc, note) => (acc < note.fret ? acc : note.fret), fretCount);
    let max = notes.reduce((acc, note) => (acc > note.fret ? acc : note.fret), 0) + 1;

    console.log({ notes, min, max });
    min = min > 1 ? min - 1 : min;
    max = max < fretCount ? max + 1 : max;
    console.log({ notes, min, max });

    setFretRange([min, max]);
  }

  useEffect(() => {
    drawBoard();
  }, [drawBoard, fretRange]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          const url = URL.createObjectURL(file);
          addImage(url);
          event.preventDefault();
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    let board = svg.select<SVGGElement>('.guitar-board');
    if (!board.empty()) return;

    board = svg.append('g').attr('class', 'guitar-board');
    svg.append('g').attr('class', 'pasted-images');

    board.call(makeDraggable);
    board.call(makeResizable);

    drawBoard();

  }, []);

  return (
    <>
      <div id="tooltip"></div>
      <svg ref={svgRef} width={svgWidth * 3} height={svgHeight * 2}></svg>

      <div>
        <Slider
          style={{ maxWidth: '300px' }}
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
          <Button onClick={() => addShape(chord)} key={chord.name} variant="contained" color="primary">
            {chord.name}
          </Button>
        ))}
      </div>
      <div>
        {scales.map((scale) => (
          <Button onClick={() => addShape(scale)} key={scale.name} variant="contained" color="primary">
            {scale.name}
          </Button>
        ))}
      </div>
      <div>
        <Button onClick={fillAllNotes} variant="contained" color="primary">
          All Notes
        </Button>
      </div>
    </>
  );
};

export default GuitarBoard;

