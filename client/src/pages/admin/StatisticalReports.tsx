import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  SelectChangeEvent
} from '@mui/material';
import { auth } from '../../firebase';
import { getIdToken } from 'firebase/auth';

// Report types
const REPORT_TYPES = {
  CALL_VOLUME: 'Call Volume',
  ASSESSMENT_SPEED: 'Average Assessment Speed',
  DISPATCH_TIME: 'Average Dispatch Time',
  RESOLUTION_TIME: 'Average Resolution Time',
  CONFIRM_TURNAROUND: 'Average Confirm Turnaround Time'
};

interface ReportParams {
  startDate: string;
  endDate: string;
  reportType: string;
  emergencyType?: string;
}

interface ReportResult {
  title: string;
  data: any;
  type: string;
}

// Interface for call volume data
interface CallVolumeData {
  totalCalls: number;
  breakdownByType: Record<string, number>;
}

// Interface for time-based report data
interface TimeReportData {
  averageTime: number;
  unit: string;
  breakdownByType?: Record<string, number>;
}

export default function StatisticalReports() {
  const [reportParams, setReportParams] = useState<ReportParams>({
    startDate: '',
    endDate: '',
    reportType: REPORT_TYPES.CALL_VOLUME,
    emergencyType: 'ALL'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);

  // Handler for text field input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name) {
      setReportParams(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handler for select input changes
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    if (name) {
      setReportParams(prev => ({ ...prev, [name]: value }));
    }
  };

  // Generate the report
  const generateReport = async () => {
    // Validate inputs
    if (!reportParams.startDate || !reportParams.endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getIdToken(auth.currentUser!);
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reportParams)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }

      setReportResult({
        title: reportParams.reportType,
        data: data,
        type: reportParams.reportType
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render the report result based on type
  const renderReportResult = () => {
    if (!reportResult) return null;

    switch (reportResult.type) {
      case REPORT_TYPES.CALL_VOLUME:
        return renderCallVolumeReport();
      case REPORT_TYPES.ASSESSMENT_SPEED:
      case REPORT_TYPES.DISPATCH_TIME:
      case REPORT_TYPES.RESOLUTION_TIME:
      case REPORT_TYPES.CONFIRM_TURNAROUND:
        return renderTimeReport();
      default:
        return (
          <Alert severity="info">Report type not recognized</Alert>
        );
    }
  };

  // Render call volume report
  const renderCallVolumeReport = () => {
    if (!reportResult || !reportResult.data) return null;
    
    const { totalCalls, breakdownByType } = reportResult.data as CallVolumeData;
    
    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Call Volume Report ({reportParams.startDate} to {reportParams.endDate})
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 2 }}>
            Total Calls: <strong>{totalCalls}</strong>
          </Typography>
          
          {breakdownByType && (
            <>
              <Typography variant="subtitle1" sx={{ mt: 2 }}>Breakdown by Emergency Type</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Emergency Type</TableCell>
                      <TableCell align="right">Number of Calls</TableCell>
                      <TableCell align="right">Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(breakdownByType).map(([type, count]) => (
                      <TableRow key={type}>
                        <TableCell>{type}</TableCell>
                        <TableCell align="right">{count}</TableCell>
                        <TableCell align="right">
                          {((Number(count) / totalCalls) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render time-based reports (assessment speed, dispatch time, etc.)
  const renderTimeReport = () => {
    if (!reportResult || !reportResult.data) return null;
    
    const { averageTime, unit, breakdownByType } = reportResult.data as TimeReportData;
    
    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {reportResult.title} ({reportParams.startDate} to {reportParams.endDate})
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 2 }}>
            Average Time: <strong>{averageTime.toFixed(2)} {unit}</strong>
          </Typography>
          
          {breakdownByType && (
            <>
              <Typography variant="subtitle1" sx={{ mt: 2 }}>Breakdown by Emergency Type</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Emergency Type</TableCell>
                      <TableCell align="right">Average Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(breakdownByType).map(([type, time]) => (
                      <TableRow key={type}>
                        <TableCell>{type}</TableCell>
                        <TableCell align="right">{Number(time).toFixed(2)} {unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Generate Statistical Reports
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              name="startDate"
              label="Start Date"
              type="date"
              value={reportParams.startDate}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              name="endDate"
              label="End Date"
              type="date"
              value={reportParams.endDate}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                name="reportType"
                value={reportParams.reportType}
                label="Report Type"
                onChange={handleSelectChange}
              >
                {Object.entries(REPORT_TYPES).map(([key, label]) => (
                  <MenuItem key={key} value={label}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {reportParams.reportType === REPORT_TYPES.CALL_VOLUME && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Emergency Type</InputLabel>
                <Select
                  name="emergencyType"
                  value={reportParams.emergencyType || 'ALL'}
                  label="Emergency Type"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  <MenuItem value="POLICE">Police</MenuItem>
                  <MenuItem value="FIRE">Fire</MenuItem>
                  <MenuItem value="EMS">EMS</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
          
          <Grid size={{ xs: 12 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={generateReport}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Generate Report
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {renderReportResult()}
    </Box>
  );
} 