# Tremolo

A practice tool for generating guitar chord shapes and scales. The fretboard and pasted elements can be dragged or resized to help build custom practice layouts.

## Demo
Deployed with GitHub Pages  
https://sergej-popov.github.io/tremolo/

## Features
- Drag and resize the guitar board.
- Hold **Ctrl** while dragging to snap elements to a 10 px grid. A grid overlay appears while snapping or in debug mode. Hold **Shift** to constrain movement to one axis. Rotating with **Ctrl** snaps to 15° steps.
- Hold **Ctrl** while resizing to snap dimensions to the grid, with the overlay visible while snapping.
- Add multiple guitar boards in the same workspace.
- Paste images that can be positioned and resized.
- Paste YouTube links to embed videos while preserving aspect ratio.
- Paste links to audio files to add playback controls.
- Load `.lrc` files from the side menu to display timestamped lyrics in a Markdown code block that can sync with connected videos.
- Paste text to create sticky notes that can be dragged, resized and rotated. Double-click a sticky note to edit its text, or press **n** or use the toolbar button to insert an empty note.
- Sticky note text wraps and shrinks automatically; if it still overflows at the minimum size, a thin scrollbar appears.
- Scrollbars have a transparent track and respond to the mouse wheel when hovering over a sticky note.
- Pasting text always inserts plain text. When editing a sticky note the paste goes into the note instead of creating a new one.
- Select a pasted object and press **Delete** to remove it.
- Insert code blocks with syntax highlighting. When a code block is selected dropdowns in the header change its language, theme and font size. Only GitHub light and dark themes are available.
- Toolbar buttons add items at the cursor unless the cursor is outside the workspace, in which case they appear in the centre of the screen.
- Use the brush tool to draw very smooth strokes that get thicker as you draw slower. A dropdown lets you set a fixed stroke width instead of pressure. Drawings can be moved, resized and rotated.
- Draw lines with straight, arched or cornered style. New lines start arched with triangle connectors and snap to subtle connectors at each element's side, remaining attached when those elements move.
- Change a line's colour from the sticky note palette (now including black) and set the start and end connection style independently: circle, arrow, filled triangle or none. Lines default to black.
- Quickly add predefined chords or scales or display all notes.
- Click the **edit icon** when a board is selected to open its editor.
- Show or hide note names from the board controls.
- Choose sticky note colour from the palette in the header when a sticky note is selected.
- Change sticky note text alignment using the header buttons when a note is selected.
- Set a fixed font size for a sticky note from the header dropdown or choose "Auto" for automatic sizing (6–48px in even steps).
- When brush mode is active a dropdown sets stroke thickness, or choose "Auto" for pressure-based width.
- When brush mode is active a dropdown also lets you pick a stroke colour from the sticky note palette.
- Toggle debug mode with **Ctrl+Shift+D** (**Cmd+Shift+D** on macOS) to show extra info, crosses over elements, and a debug panel with coordinates, rotation angles and undo history.
- Connected lyric blocks keep their connector lines glowing and poll the YouTube player every 500 ms while playing to highlight the current lyric. A debug readout of video time appears next to the zoom reset button.
- Press **/** or **?** or use the floating question icon to see a help dialog with all shortcuts.
- Click the **export icon** or press **Ctrl+S** to export the current board as a **PNG** image at eight times the screen resolution with 40 px padding around the visible area.
- Board state, including lines, fret ranges, zoom level and sticky note settings, is saved automatically in the browser and restored on reload.
- Use the side menu to save the board to a file or open a previously saved file.
- Pasted images are stored as data URLs so saved boards load correctly from file.
- Use **Clear Board** in the side menu to reset the workspace.
- Undo and redo board changes with **Ctrl+Z** (**Cmd+Z** on macOS) and **Ctrl+Shift+Z** (**Cmd+Shift+Z**) or the toolbar buttons.
- Style tweaks like colour, alignment and font size are also undoable.

## Hotkeys

### General
- **Delete** – remove the selected item.
- **Ctrl+C** – copy selected element to the clipboard.
- **Ctrl+V** – paste copied element at the cursor location.
- **Ctrl+D** – duplicate the selected element at the cursor.
- **r** – reset element rotation.
- **/** or **?** – open the help dialog.
- **Ctrl+S** – export the board as an extra-high-resolution PNG image.
- **Ctrl+Z** / **Cmd+Z** – undo the last change.
- **Ctrl+Shift+Z** / **Cmd+Shift+Z** – redo the last undone change.

### Tools
- **b** – toggle the brush drawing mode.
- **n** – insert a sticky note.
- **c** – insert a code block.
- **l** – insert a line.
- **g** – insert a guitar board.

### Images
- **c** – crop selected image (or double-click an image to toggle cropping).

## TODO general

2. Add a dark and light theme toggle for the fretboard interface.
3. Draw style themes
4. Tool pannel
5. Contextual menu panel

## TODO music

## TODO bugs and technical

1. Refactor d3 extensions, to a folder with separate files.
