# Tremolo

A practice tool for generating guitar chord shapes and scales. The fretboard and pasted elements can be dragged or resized to help build custom practice layouts.

## Demo
Deployed with GitHub Pages  
https://sergej-popov.github.io/tremolo/

## Features
- Drag and resize the guitar board.
- Hold **Ctrl** while dragging to snap elements to a 10 px grid. A grid overlay appears while snapping or in debug mode. Hold **Shift** to constrain movement to one axis. Rotating with **Ctrl** snaps to 15° steps.
- Add multiple guitar boards in the same workspace.
- Paste images that can be positioned and resized.
- Paste YouTube links to embed videos while preserving aspect ratio.
- Paste text to create sticky notes that can be dragged, resized and rotated. Double-click a sticky note to edit its text.
- Sticky note text wraps and shrinks automatically; if it still overflows at the minimum size, a thin scrollbar appears.
- Scrollbars have a transparent track and respond to the mouse wheel when hovering over a sticky note.
- Pasting text always inserts plain text. When editing a sticky note the paste goes into the note instead of creating a new one.
- Select a pasted object and press **Delete** to remove it.
- Use the brush tool to draw smooth strokes that get thicker as you draw slower. A dropdown lets you set a fixed stroke width instead of pressure. Drawings can be moved, resized and rotated.
- Quickly add predefined chords or scales or display all notes.
- Choose sticky note colour from the palette in the header when a sticky note is selected.
- Change sticky note text alignment using the header buttons when a note is selected.
- Set a fixed font size for a sticky note from the header dropdown or choose "Auto" for automatic sizing (6–48px in even steps).
- When brush mode is active a dropdown sets stroke thickness, or choose "Auto" for pressure-based width.
- Toggle debug mode with **d** to show extra info, crosses over elements, and a debug panel with coordinates and rotation angles.

## Hotkeys
- **Delete** – remove the selected item.
- **c** – crop selected image (or double-click an image to toggle cropping).
- **Ctrl+C** – copy selected element to the clipboard.
- **Ctrl+V** – paste copied element at the cursor location.
- **Ctrl+D** – duplicate the selected element at the cursor.
- **b** – toggle the brush drawing mode.

## TODO general

1. [Large] Provide undo and redo support for board changes.
2. Connectiing lines
3. Add a dark and light theme toggle for the fretboard interface.
4. Draw style themes
5. Tool pannel
6. Contextual menu panel

## TODO collaboration

1. Export the current board as an image.
2. Save and load board layouts from local storage.

## TODO music

1. Provide an option to toggle note names on or off.

## TODO bugs and technical

1. Refactor d3 extensions, to a folder with separate files.
