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
- **c** – crop selected image (planned).

## TODO
1. Add ability to crop images through makeCroppable. Only images to be croppable. Crop must not be permanent. When cropping an already cropped element, I should be able to recover the previously cropped space. So, essentially the cropping should be done by masking. Area outside of mask should be semi transparent. Crop is triggered by 'c' hotkey.
2. ~~Add an ability to paste text. When text is pasted, it should be draggable and editable. Text should not be resizable. However when Up and Down arrow keys are pressed, the text font size should increase or decrease.~~ Implemented as sticky notes that can be rotated and resized.
3. Export the current board as an image.
4. Save and load board layouts from local storage.
5. Provide an option to toggle note names on or off.
6. Provide undo and redo support for board changes.
7. Allow items to snap to a grid for precise alignment.
8. Add a dark and light theme toggle for the fretboard interface.
