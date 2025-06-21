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

1. Add ability to crop images through makeCroppable. Only images to be croppable. Crop must not be permanent. When cropping an already cropped element, I should be able to recover the previously cropped space. So, essentially the cropping should be done by masking. Area outside of mask should be semi transparent. Crop is triggered by 'c' hotkey.
2. Add pan and zoom option.
3. paste elements (text, images, youtube videos etc) at cursor location, not screen origin
4. resize proportionally by default
5. Provide undo and redo support for board changes.
6. Allow items to snap to a grid for precise alignment.
7. Add a dark and light theme toggle for the fretboard interface.
8. Images pasted at set size, should use data from clipboard (is it available?)
9. Controls are still affected by resizing
10. Drawing option
11. Arrows options
12. Themes

## TODO collaboration

1. Export the current board as an image.
2. Save and load board layouts from local storage.

## TODO music

1. Provide an option to toggle note names on or off.
2. Ability to create multiple boards. The buttons should be interacting with the 


## TODO bugs and technical

1. Refactor d3 extensions, to a folder with separate