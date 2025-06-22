import React from 'react';
import { Dialog, DialogTitle, DialogContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const shortcuts = [
  { key: 'Delete', action: 'Remove the selected item' },
  { key: 'c', action: 'Crop selected image' },
  { key: 'Ctrl+C', action: 'Copy selected element' },
  { key: 'Ctrl+V', action: 'Paste copied element at cursor' },
  { key: 'Ctrl+D', action: 'Duplicate the selected element' },
  { key: 'b', action: 'Toggle brush drawing mode' },
  { key: 'd', action: 'Toggle debug mode' },
  { key: 'r', action: 'Reset element rotation' },
  { key: '/ or ?', action: 'Open this help dialog' },
];

const HelpDialog: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true')) {
        return;
      }
      if (e.key === '/' || e.key === '?') {
        setOpen(true);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <IconButton aria-label="help" onClick={handleOpen} sx={{ position: 'fixed', bottom: 16, right: 16 }}>
        <HelpOutlineIcon fontSize="small" />
      </IconButton>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Keyboard Shortcuts</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Shortcut</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shortcuts.map((s) => (
                  <TableRow key={s.key}>
                    <TableCell>{s.key}</TableCell>
                    <TableCell>{s.action}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HelpDialog;
