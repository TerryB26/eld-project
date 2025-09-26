import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { ELDAlert } from './ELDAlert';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './DriverDashboard.css';

const DriverDashboard = ({ driverId, onDriverChange }) => {
  const [hosStatus, setHosStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dashboardRef = useRef(null);

  const fetchHosStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:6800/api/drivers/${driverId}/hos-status/`);
      setHosStatus(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch HOS status');
      console.error('Error fetching HOS status:', err);
      
      // Show detailed error with ELDAlert
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        ELDAlert.networkError();
      }
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    if (driverId) {
      fetchHosStatus();
      // Set up polling every 30 seconds
      const interval = setInterval(fetchHosStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [driverId, fetchHosStatus]);

  const formatHours = (hours) => {
    return `${Math.floor(hours)}:${Math.round((hours % 1) * 60).toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DR': return '#ff4444'; // Driving - Red
      case 'ON': return '#ffaa00'; // On Duty - Orange
      case 'SB': return '#0088ff'; // Sleeper Berth - Blue
      case 'OFF': return '#00aa00'; // Off Duty - Green
      default: return '#666666';
    }
  };

  // Export Dashboard to PDF
  const handleExportPDF = async () => {
    const element = dashboardRef.current;
    if (!element) return;

    try {
      // Capture at a higher scale for clarity
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Canvas size in pixels
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // Ratio to convert canvas px to PDF pt
      const pxToPt = pdfWidth / canvasWidth;
      const imgHeightPt = canvasHeight * pxToPt;

      // If content fits on one page, just add it
      if (imgHeightPt <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeightPt);
      } else {
        // Multi-page: slice canvas vertically into page-sized chunks
        let remainingHeight = canvasHeight;
        let position = 0; // px
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');

        // Height in pixels per PDF page
        const pageHeightPx = Math.floor(pdfHeight / pxToPt);

        pageCanvas.width = canvasWidth;
        pageCanvas.height = pageHeightPx;

        while (remainingHeight > 0) {
          // Clear and draw slice
          pageCtx.clearRect(0, 0, canvasWidth, pageHeightPx);
          pageCtx.drawImage(canvas, 0, position, canvasWidth, pageHeightPx, 0, 0, canvasWidth, pageHeightPx);

          const pageData = pageCanvas.toDataURL('image/png');

          if (position === 0) {
            pdf.addImage(pageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          } else {
            pdf.addPage();
            pdf.addImage(pageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          }

          position += pageHeightPx;
          remainingHeight -= pageHeightPx;
        }
      }

      const filename = `hos_dashboard_${new Date().toISOString().slice(0,10)}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('Export to PDF failed. See console for details.');
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'DR': return 'Driving';
      case 'ON': return 'On Duty';
      case 'SB': return 'Sleeper Berth';
      case 'OFF': return 'Off Duty';
      default: return 'Unknown';
    }
  };

  if (loading) return <div className="loading">Loading HOS status...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!hosStatus) return <div className="no-data">No HOS data available</div>;

  return (
    <div className="dashboard-wrapper" style={{display: 'flex', gap: '16px', alignItems: 'flex-start'}}>
      <div className="export-controls" style={{minWidth: 140}}>
        <button onClick={handleExportPDF} className="export-pdf-btn">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{marginRight: '8px'}}
          >
            <path 
              d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <polyline 
              points="14,2 14,8 20,8" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <line 
              x1="16" 
              y1="13" 
              x2="8" 
              y2="13" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <line 
              x1="16" 
              y1="17" 
              x2="8" 
              y2="17" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <polyline 
              points="10,9 9,9 8,9" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          Export PDF
        </button>
      </div>

      <div className="driver-dashboard" ref={dashboardRef}>
        <div className="dashboard-header">
        <h2>Hours of Service Dashboard</h2>
        <div className="current-status" style={{ backgroundColor: getStatusColor(hosStatus.current_duty_status) }}>
          {getStatusText(hosStatus.current_duty_status)}
        </div>
      </div>

      <div className="hos-grid">
        <div className="hos-card">
          <div className="card-title">Drive Time</div>
          <div className="card-main">
            <span className="time-value">{formatHours(hosStatus.hours_driven_today)}</span>
            <span className="time-limit">/ 11:00</span>
          </div>
          <div className="card-subtitle">
            Remaining: {formatHours(hosStatus.remaining_drive_time)}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${(hosStatus.hours_driven_today / 11) * 100}%`,
                backgroundColor: hosStatus.hours_driven_today > 10 ? '#ff4444' : '#00aa00'
              }}
            />
          </div>
        </div>

        <div className="hos-card">
          <div className="card-title">Duty Time</div>
          <div className="card-main">
            <span className="time-value">{formatHours(hosStatus.hours_on_duty_today)}</span>
            <span className="time-limit">/ 14:00</span>
          </div>
          <div className="card-subtitle">
            Remaining: {formatHours(hosStatus.remaining_duty_time)}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${(hosStatus.hours_on_duty_today / 14) * 100}%`,
                backgroundColor: hosStatus.hours_on_duty_today > 12 ? '#ff4444' : '#00aa00'
              }}
            />
          </div>
        </div>

        <div className="hos-card">
          <div className="card-title">8-Day Hours</div>
          <div className="card-main">
            <span className="time-value">{formatHours(hosStatus.hours_in_8_day_period)}</span>
            <span className="time-limit">/ 70:00</span>
          </div>
          <div className="card-subtitle">
            Remaining: {formatHours(hosStatus.remaining_70_hour)}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${(hosStatus.hours_in_8_day_period / 70) * 100}%`,
                backgroundColor: hosStatus.hours_in_8_day_period > 60 ? '#ff4444' : '#00aa00'
              }}
            />
          </div>
        </div>

        <div className="hos-card">
          <div className="card-title">Time Since Break</div>
          <div className="card-main">
            <span className="time-value">{formatHours(hosStatus.time_since_last_break)}</span>
            <span className="time-limit">/ 8:00</span>
          </div>
          <div className="card-subtitle">
            {hosStatus.needs_30_min_break ? 'Break Required!' : 'Break OK'}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${(hosStatus.time_since_last_break / 8) * 100}%`,
                backgroundColor: hosStatus.needs_30_min_break ? '#ff4444' : '#00aa00'
              }}
            />
          </div>
        </div>
      </div>

      {/* Warnings Section */}
      {hosStatus.warnings && hosStatus.warnings.length > 0 && (
        <div className="warnings-section">
          <h3>⚠️ Warnings</h3>
          <ul className="warnings-list">
            {hosStatus.warnings.map((warning, index) => (
              <li key={index} className="warning-item">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Violations Section */}
      {hosStatus.violations && hosStatus.violations.length > 0 && (
        <div className="violations-section">
          <h3>🚫 Violations</h3>
          <ul className="violations-list">
            {hosStatus.violations.map((violation, index) => (
              <li key={index} className="violation-item">
                <strong>{violation.violation_type}:</strong> {violation.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Drive Status Indicator */}
      <div className={`drive-status ${hosStatus.can_drive ? 'can-drive' : 'cannot-drive'}`}>
        <div className="drive-status-text">
          {hosStatus.can_drive ? '✅ Can Drive' : '🛑 Cannot Drive'}
        </div>
        {!hosStatus.can_drive && (
          <div className="drive-status-reason">
            Check violations and warnings above
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default DriverDashboard;
