# Tremolo

A practice tool for generating guitar chord shapes and scales. The fretboard and pasted elements can be dragged or resized to help build custom practice layouts.

## Demo
Deployed with GitHub Pages  
https://sergej-popov.github.io/tremolo/

## Features
- Drag and resize the guitar board.
- Paste images that can be positioned and resized.
- Paste YouTube links to embed videos while preserving aspect ratio.
- Paste text to create sticky notes that can be dragged, resized and rotated. Double-click a sticky note to edit its text.
- Select a pasted object and press **Delete** to remove it.
- Quickly add predefined chords or scales or display all notes.

## Hotkeys
- **Delete** – remove the selected item.
- **c** – crop selected image (or double-click an image to toggle cropping).

## Instruction for Copilot, GPT, Codex and other LLM Agents
* Remove items from TODO list when completing tasks.
* Don't run linter.

## TODO general

1. [Large] Provide undo and redo support for board changes.
2. Allow items to snap to a grid for precise alignment.
3. Images pasted at set size, should use data from clipboard (is it available?)
4. Controls are still affected by resizing
5.  Drawing pen tool
6.  Connectiing lines
7. Add a dark and light theme toggle for the fretboard interface.
8. Draw style themes
9. Tool pannel
10. Contextual menu panel

## TODO collaboration

1. Export the current board as an image.
2. Save and load board layouts from local storage.

## TODO music

1. Provide an option to toggle note names on or off.
2. Ability to create multiple boards. The buttons should be interacting with the 


## TODO bugs and technical

1. Refactor d3 extensions, to a folder with separate