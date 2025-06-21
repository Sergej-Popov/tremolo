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

## TODO general

1. Add pan and zoom option.
2. paste elements (text, images, youtube videos etc) at cursor location, not screen origin
3. resize proportionally by default
4. [Large] Provide undo and redo support for board changes.
5. Allow items to snap to a grid for precise alignment.
6. Images pasted at set size, should use data from clipboard (is it available?)
7. Controls are still affected by resizing
8.  Drawing pen tool
9.  Connectiing lines
10. Add a dark and light theme toggle for the fretboard interface.
11. Draw style themes
12. Tool pannel
13. Contextual menu panel

## TODO collaboration

1. Export the current board as an image.
2. Save and load board layouts from local storage.

## TODO music

1. Provide an option to toggle note names on or off.
2. Ability to create multiple boards. The buttons should be interacting with the 


## TODO bugs and technical

1. Refactor d3 extensions, to a folder with separate