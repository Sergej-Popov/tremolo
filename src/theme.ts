import { createTheme } from '@mui/material/styles';
import { noteColors, defaultLineColor } from './constants/theme';

const theme = createTheme({
    palette: {
        primary: {
            main: "#5d1f4f",
        },
    },
});

export { noteColors, defaultLineColor };

export default theme;
