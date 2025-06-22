import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Box, CssBaseline, ThemeProvider } from "@mui/material";

import HelpDialog from "./HelpDialog";


import MainPage from "./pages/MainPage";
import SecondPage from "./pages/SecondPage";

import { SnackbarProvider } from "./SnackbarProvider";
import { AppProvider } from "./Store";

import Menu from "./Menu";

import './App.css'
import theme from "./theme";
function App() {
  const getBasename = () => {
    return window.location.pathname;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <AppProvider>
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
        </AppProvider>
      </SnackbarProvider>
    </ThemeProvider>
  )
}

export default App
