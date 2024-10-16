import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Alert, Snackbar } from "@mui/material";

export type SnackSeverity = "error" | "info" | "success" | "warning";

const SnackbarContext = createContext<{
    openSnackbar: (message: string, severity?: SnackSeverity) => void;
}>({
    openSnackbar: () => {
        console.warn("No-Op: Snackbar is not initialized yet");
    },
});


export const SnackbarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [snackbar, setSnackbar] = useState<{ message: string; open: boolean, severity: SnackSeverity }>({
        message: '',
        open: false,
        severity: "info",
    });


    const openSnackbar = (message: string, severity: SnackSeverity = "info") => {
        setSnackbar({ message, open: true, severity: severity });
    };


    const closeSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <SnackbarContext.Provider value={{ openSnackbar }}>
            {children}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={10000}
                onClose={closeSnackbar}
            >
                <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </SnackbarContext.Provider>
    );
};

export const useSnackbar = () => {
    return useContext(SnackbarContext).openSnackbar;
};
