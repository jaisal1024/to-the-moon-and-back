import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export default function LoadingSpinner() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', m: 2 }}>
      <CircularProgress color="secondary" size={20} />
    </Box>
  );
}
