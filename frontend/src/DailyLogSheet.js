import React, { useState, useRef, useEffect } from 'react';
import './DailyLogSheet.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const DailyLogSheet = ({ driverId, date, logEntries, hosStatus, tripInfo }) => {
  const [currentLog, setCurrentLog] = useState({
    date: date || new Date().toLocaleDateString(),
    driver: '',
    codriver: '',
    carrier: '',
    mainOffice: '',
    homeTerminal: '',
    vehicleNumber: '',
    trailerNumber: '',
    totalMiles: '',
    totalMileage: ''
  });

  const canvasRef = useRef(null);
  const sheetRef = useRef(null);

  useEffect(() => {
    if (logEntries && logEntries.length > 0) {
      drawLogEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logEntries]);

  const drawLogEntries = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Set up grid
    drawTimeGrid(ctx, canvasWidth, canvasHeight);
    
    // Draw log entries
    if (logEntries && logEntries.length > 0) {
      drawDutyStatusLines(ctx, canvasWidth, canvasHeight);
    }
  };

  const drawTimeGrid = (ctx, width, height) => {
    const startY = 20;
    const rowHeight = (height - 40) / 4; // 4 duty status rows
    const hourWidth = (width - 60) / 24; // 24 hours

    // Set styles
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#333';

    // Draw horizontal lines for duty status rows
    const dutyStatuses = ['1. Off Duty', '2. Sleeper Berth', '3. Driving', '4. On Duty (not driving)'];
    
    for (let i = 0; i <= 4; i++) {
      const y = startY + (i * rowHeight);
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();

      // Label duty status
      if (i < 4) {
        ctx.fillText(dutyStatuses[i], 5, y + rowHeight / 2 + 4);
      }
    }

    // Draw vertical lines for hours
    for (let hour = 0; hour <= 24; hour++) {
      const x = 60 + (hour * hourWidth);
      
      // Major hour lines
      if (hour % 2 === 0) {
        ctx.lineWidth = hour === 0 || hour === 12 || hour === 24 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, height - 20);
        ctx.stroke();

        // Hour labels
        const displayHour = hour === 0 ? 'Mid.' : hour === 12 ? 'Noon' : 
                           hour > 12 ? (hour - 12) : hour;
        ctx.fillText(displayHour, x - 10, 15);
        if (hour !== 0 && hour !== 12) {
          ctx.fillText(hour > 12 ? 'P.M.' : 'A.M.', x - 12, height - 5);
        }
      }
      
      // Minor 15-minute marks
      ctx.lineWidth = 0.5;
      for (let quarter = 1; quarter < 4; quarter++) {
        const quarterX = x + (quarter * hourWidth / 4);
        if (quarterX < width - 10) {
          ctx.beginPath();
          ctx.moveTo(quarterX, startY);
          ctx.lineTo(quarterX, startY + 5);
          ctx.stroke();
        }
      }
    }
  };

  const drawDutyStatusLines = (ctx, width, height) => {
    const startY = 20;
    const rowHeight = (height - 40) / 4;
    const hourWidth = (width - 60) / 24;
    
    ctx.lineWidth = 3;
    
    logEntries.forEach(entry => {
      const startTime = new Date(entry.start_time);
      const endTime = entry.end_time ? new Date(entry.end_time) : new Date();
      
      // Convert times to hours from midnight
      const startHour = startTime.getHours() + startTime.getMinutes() / 60;
      const endHour = endTime.getHours() + endTime.getMinutes() / 60;
      
      // Determine which row based on duty status
      let rowIndex;
      switch (entry.duty_status) {
        case 'OFF': rowIndex = 0; ctx.strokeStyle = '#00aa00'; break;
        case 'SB': rowIndex = 1; ctx.strokeStyle = '#0088ff'; break;
        case 'DR': rowIndex = 2; ctx.strokeStyle = '#ff4444'; break;
        case 'ON': rowIndex = 3; ctx.strokeStyle = '#ffaa00'; break;
        default: return;
      }
      
      const y = startY + (rowIndex * rowHeight) + (rowHeight / 2);
      const startX = 60 + (startHour * hourWidth);
      const endX = 60 + (endHour * hourWidth);
      
      // Draw status line
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(Math.min(endX, width - 10), y);
      ctx.stroke();
      
      // Add location annotation
      if (entry.location) {
        ctx.font = '10px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText(entry.location.substring(0, 20), startX, y - 8);
      }
    });
  };

  const handleInputChange = (field, value) => {
    setCurrentLog(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateTotals = () => {
    if (!hosStatus) return { onDutyHours: 0, offDutyHours: 0, drivingHours: 0 };
    
    return {
      onDutyHours: hosStatus.hours_on_duty_today || 0,
      drivingHours: hosStatus.hours_driven_today || 0,
      offDutyHours: 24 - (hosStatus.hours_on_duty_today || 0)
    };
  };

  const totals = calculateTotals();

  // Export PDF handler (multi-page support)
  const handleExportPDF = async () => {
    const element = sheetRef.current;
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

      const filename = `daily_log_${currentLog.date || new Date().toISOString().slice(0,10)}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('Export to PDF failed. See console for details.');
    }
  };

  return (
    <div className="daily-log-wrapper" style={{display: 'flex', gap: '16px', alignItems: 'flex-start'}}>
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

      <div className="daily-log-sheet" ref={sheetRef}>
        <div className="log-header">
          <h2>Driver's Daily Log</h2>
          <div className="log-subheader">
            <span>(24 hours)</span>
            <div className="date-section">
              <span>Date: </span>
              <input 
                type="date" 
                value={currentLog.date} 
                onChange={(e) => handleInputChange('date', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="log-info-section">
          <div className="log-row">
            <div className="log-field">
              <label>From:</label>
              <input 
                type="text" 
                value={tripInfo?.current_location || ''} 
                onChange={(e) => handleInputChange('from', e.target.value)}
              />
            </div>
            <div className="log-field">
              <label>To:</label>
              <input 
                type="text" 
                value={tripInfo?.dropoff_location || ''} 
                onChange={(e) => handleInputChange('to', e.target.value)}
              />
            </div>
          </div>

          <div className="log-row">
            <div className="mileage-section">
              <div className="mileage-box">
                <label>Total Miles Driving Today</label>
                <input 
                  type="number" 
                  value={currentLog.totalMiles}
                  onChange={(e) => handleInputChange('totalMiles', e.target.value)}
                />
              </div>
              <div className="mileage-box">
                <label>Total Mileage Today</label>
                <input 
                  type="number" 
                  value={currentLog.totalMileage}
                  onChange={(e) => handleInputChange('totalMileage', e.target.value)}
                />
              </div>
            </div>
            
            <div className="company-info">
              <div className="log-field">
                <label>Name of Carrier or Coriers</label>
                <input 
                  type="text" 
                  value={currentLog.carrier}
                  onChange={(e) => handleInputChange('carrier', e.target.value)}
                />
              </div>
              <div className="log-field">
                <label>Main Office Address</label>
                <input 
                  type="text" 
                  value={currentLog.mainOffice}
                  onChange={(e) => handleInputChange('mainOffice', e.target.value)}
                />
              </div>
              <div className="log-field">
                <label>Home Terminal Address</label>
                <input 
                  type="text" 
                  value={currentLog.homeTerminal}
                  onChange={(e) => handleInputChange('homeTerminal', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="vehicle-info">
            <label>Truck/Tractor and Trailer Numbers or License Plate(s)/State (show each unit)</label>
            <input 
              type="text" 
              value={currentLog.vehicleNumber}
              onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
              placeholder="Vehicle #123, Trailer #456, License ABC-123/GA"
            />
          </div>
        </div>

        <div className="log-grid-section">
          <canvas 
            ref={canvasRef}
            width={800}
            height={300}
            className="log-canvas"
          />
        </div>

        <div className="log-totals-section">
          <h3>Recap</h3>
          <div className="totals-grid">
            <div className="total-column">
              <h4>Complete at end of day</h4>
              <div className="total-row">
                <span>On duty hours:</span>
                <span>{totals.onDutyHours.toFixed(1)}</span>
              </div>
              <div className="total-row">
                <span>Off duty hours:</span>
                <span>{totals.offDutyHours.toFixed(1)}</span>
              </div>
              <div className="total-row">
                <span>Driving hours:</span>
                <span>{totals.drivingHours.toFixed(1)}</span>
              </div>
            </div>

            <div className="total-column">
              <h4>70 Hours / 8 Days</h4>
              <div className="total-row">
                <span>A. Total hours on duty last 7 days:</span>
                <span>{(hosStatus?.hours_in_8_day_period - hosStatus?.hours_on_duty_today || 0).toFixed(1)}</span>
              </div>
              <div className="total-row">
                <span>B. Total hours available tomorrow:</span>
                <span>{hosStatus?.remaining_70_hour || 0}</span>
              </div>
              <div className="total-row">
                <span>C. Total hours on duty last 7 days including today:</span>
                <span>{hosStatus?.hours_in_8_day_period || 0}</span>
              </div>
            </div>

            <div className="total-column">
              <h4>60 Hours / 7 Days</h4>
              <div className="total-row">
                <span>A. Total hours on duty last 6 days:</span>
                <span>N/A</span>
              </div>
              <div className="total-row">
                <span>B. Total hours available tomorrow:</span>
                <span>N/A</span>
              </div>
              <div className="total-row">
                <span>C. Total hours on duty last 7 days including today:</span>
                <span>N/A</span>
              </div>
            </div>

            <div className="signature-section">
              <div className="signature-box">
                <label>If you took 34 consecutive hours off duty, have 70/80 hours available</label>
                <input type="checkbox" />
              </div>
              <div className="signature-line">
                <label>Driver's Signature:</label>
                <div className="signature-input"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="remarks-section">
          <h4>Remarks</h4>
          <textarea 
            placeholder="Enter remarks about locations, times, and duty status changes..."
            rows="4"
          />
        </div>

        <div className="shipping-docs-section">
          <h4>Shipping Documents:</h4>
          <div className="doc-field">
            <label>DL or Manifest No.:</label>
            <input type="text" />
          </div>
          <div className="doc-field">
            <label>Shipper & Commodity:</label>
            <input type="text" />
          </div>
          <p className="instructions">
            Enter name of place you reported and where released from work and when and where each change of duty occurred. 
            Use time standard of home terminal.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DailyLogSheet;
