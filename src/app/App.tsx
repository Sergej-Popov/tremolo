import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';

import { Providers } from './providers/AppProviders';
import {
  HelpDialog,
  Menu,
  SnackbarProvider,
  pages as editorPages,
} from '@features/editor/ui';
import theme from '@shared/theme';

import './App.css';

const { MainPage, SecondPage } = editorPages;
function App() {
  const getBasename = () => {
    return window.location.pathname;
  };

  useEffect(() => {
    const disableContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    window.addEventListener('contextmenu', disableContextMenu);
    return () => {
      window.removeEventListener('contextmenu', disableContextMenu);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <Providers>
          <Router basename={getBasename()}>
            <Box sx={{ flexGrow: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Menu />
              <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/second" element={<SecondPage />} />
              </Routes>
              <HelpDialog />
            </Box>
          </Router>
        </Providers>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
