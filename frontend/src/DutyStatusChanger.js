import React, { useState } from 'react';
import axios from 'axios';
import { ELDAlert } from './ELDAlert';

const DutyStatusChanger = ({ driverId, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('');
  const [odometer, setOdometer] = useState('');
  const [remarks, setRemarks] = useState('');

  const statusOptions = [
    { value: 'OFF', label: '🟢 Off Duty', color: '#28a745' },
    { value: 'SB', label: '🔵 Sleeper Berth', color: '#007bff' },
    { value: 'DR', label: '🔴 Driving', color: '#dc3545' },
    { value: 'ON', label: '🟡 On Duty (Not Driving)', color: '#ffc107' }
  ];

  const handleStatusChange = async (newStatus) => {
    if (!location.trim()) {
      ELDAlert.warning('Location Required', 'Please enter your current location');
      return;
    }

    // Show confirmation dialog
    const result = await ELDAlert.statusChangeConfirm(newStatus, location.trim());
    if (!result.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`http://localhost:6800/api/drivers/${driverId}/duty-status/`, {
        duty_status: newStatus,
        location: location.trim(),
        odometer: parseInt(odometer) || 0,
        remarks: remarks.trim()
      });

      // Clear the form
      setLocation('');
      setOdometer('');
      setRemarks('');

      // Notify parent component
      if (onStatusChange) {
        onStatusChange(response.data);
      }

      ELDAlert.success(
        'Status Changed!', 
        `Status changed to ${statusOptions.find(s => s.value === newStatus)?.label}`
      );
    } catch (error) {
      console.error('Error changing duty status:', error);
      if (error.code === 'ERR_NETWORK') {
        ELDAlert.networkError();
      } else {
        ELDAlert.error('Status Change Failed', 'Failed to change duty status. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="duty-status-changer">
      <h3>Change Duty Status</h3>
      
      <div className="form-group">
        <label htmlFor="location">Current Location *</label>
        <input
          type="text"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter your current location"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="odometer">Odometer Reading</label>
        <input
          type="number"
          id="odometer"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          placeholder="Enter odometer reading (miles)"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="remarks">Remarks</label>
        <textarea
          id="remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Optional remarks or notes"
          disabled={loading}
          rows="3"
        />
      </div>

      <div className="status-buttons">
        {statusOptions.map((status) => (
          <button
            key={status.value}
            className="status-button"
            style={{ borderColor: status.color }}
            onClick={() => handleStatusChange(status.value)}
            disabled={loading}
          >
            {status.label}
          </button>
        ))}
      </div>

      {loading && <div className="loading-message">Updating status...</div>}
    </div>
  );
};

export default DutyStatusChanger;
