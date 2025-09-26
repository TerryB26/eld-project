import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ELDAlert } from './ELDAlert';
import DriverDashboard from './DriverDashboard';
import DutyStatusChanger from './DutyStatusChanger';
import AddDriverForm from './AddDriverForm';
import RouteMap from './RouteMap';
import DailyLogSheet from './DailyLogSheet';
import './App.css';

function App() {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tripData, setTripData] = useState({
    pickup_location: '',
    dropoff_location: '',
    current_location: '',
    estimated_hours: ''
  });
  const [tripPlan, setTripPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddDriverForm, setShowAddDriverForm] = useState(false);
  const [hosStatus, setHosStatus] = useState(null);
  const [logEntries, setLogEntries] = useState([]);

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const response = await axios.get('http://localhost:6800/api/drivers/');
        setDrivers(response.data);
        if (response.data.length > 0 && !selectedDriverId) {
          setSelectedDriverId(response.data[0].id);
        }
      } catch (error) {
        console.error('Error fetching drivers:', error);
        ELDAlert.networkError();
      }
    };
    loadDrivers();
  }, [selectedDriverId]);

  const fetchHosData = useCallback(async () => {
    if (!selectedDriverId) return;
    try {
      const response = await axios.get(`http://localhost:6800/api/drivers/${selectedDriverId}/hos-status/`);
      setHosStatus(response.data);
    } catch (error) {
      console.error('Error fetching HOS status:', error);
    }
  }, [selectedDriverId]);

  const fetchLogEntries = useCallback(async () => {
    if (!selectedDriverId) return;
    try {
      const response = await axios.get(`http://localhost:6800/api/drivers/${selectedDriverId}/logbook/`);
      setLogEntries(response.data.log_entries || []);
    } catch (error) {
      console.error('Error fetching log entries:', error);
    }
  }, [selectedDriverId]);

  // Fetch HOS status and log entries when driver changes
  useEffect(() => {
    if (selectedDriverId) {
      fetchHosData();
      fetchLogEntries();
    }
  }, [selectedDriverId, fetchHosData, fetchLogEntries]);



  const handleDriverAdded = (newDriver) => {
    setDrivers([...drivers, newDriver]);
    setSelectedDriverId(newDriver.id);
    setShowAddDriverForm(false);
  };

  const handleCancelAddDriver = () => {
    setShowAddDriverForm(false);
  };

  const handleTripPlanning = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:6800/api/trips/plan/', {
        driver_id: selectedDriverId,
        ...tripData,
        estimated_hours: parseFloat(tripData.estimated_hours)
      });
      
      setTripPlan(response.data);
    } catch (error) {
      console.error('Error planning trip:', error);
      ELDAlert.error('Trip Planning Failed', 'Failed to plan trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (statusData) => {
    // Refresh dashboard when status changes
    if (activeTab === 'dashboard') {
      // The DriverDashboard component will automatically refresh due to its polling
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🚛 Electronic Logging Device (ELD)</h1>
          <div className="header-controls">
            <select 
              value={selectedDriverId || ''} 
              onChange={(e) => setSelectedDriverId(parseInt(e.target.value))}
              className="driver-select"
            >
              <option value="">Select Driver</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} - {driver.license_number}
                </option>
              ))}
            </select>
            <button onClick={() => setShowAddDriverForm(true)} className="create-driver-btn">
              + Add Driver
            </button>
          </div>
        </div>
        
        <nav className="app-nav">
          <button 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 HOS Dashboard
          </button>
          <button 
            className={`nav-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            🔄 Change Status
          </button>
          <button 
            className={`nav-btn ${activeTab === 'trip' ? 'active' : ''}`}
            onClick={() => setActiveTab('trip')}
          >
            🗺️ Trip Planning
          </button>
          <button 
            className={`nav-btn ${activeTab === 'logsheet' ? 'active' : ''}`}
            onClick={() => setActiveTab('logsheet')}
          >
            📋 Daily Log Sheet
          </button>
        </nav>
      </header>

      <main className="app-main">
        {!selectedDriverId ? (
          <div className="no-driver-selected">
            <h2>No Driver Selected</h2>
            <p>Please select a driver from the dropdown or create a new one.</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DriverDashboard 
                driverId={selectedDriverId} 
                onDriverChange={setSelectedDriverId}
              />
            )}

            {activeTab === 'status' && (
              <div className="status-tab">
                <DutyStatusChanger 
                  driverId={selectedDriverId} 
                  onStatusChange={handleStatusChange}
                />
              </div>
            )}

            {activeTab === 'trip' && (
              <div className="trip-tab">
                <h2>Trip Planning & Route Information</h2>
                <div className="trip-planning-container">
                  <form onSubmit={handleTripPlanning} className="trip-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Current Location</label>
                        <input
                          type="text"
                          value={tripData.current_location}
                          onChange={(e) => setTripData({...tripData, current_location: e.target.value})}
                          placeholder="Where are you now?"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Estimated Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          value={tripData.estimated_hours}
                          onChange={(e) => setTripData({...tripData, estimated_hours: e.target.value})}
                          placeholder="Expected drive time"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Pickup Location</label>
                        <input
                          type="text"
                          value={tripData.pickup_location}
                          onChange={(e) => setTripData({...tripData, pickup_location: e.target.value})}
                          placeholder="Where to pick up?"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Dropoff Location</label>
                        <input
                          type="text"
                          value={tripData.dropoff_location}
                          onChange={(e) => setTripData({...tripData, dropoff_location: e.target.value})}
                          placeholder="Where to deliver?"
                          required
                        />
                      </div>
                    </div>
                    
                    <button type="submit" disabled={loading} className="plan-trip-btn">
                      {loading ? 'Planning Trip...' : 'Plan Trip & Check HOS Compliance'}
                    </button>
                  </form>

                  {tripPlan && (
                    <div className="trip-results">
                      <div className="trip-results-layout">
                        {/* Left Column - Trip Details */}
                        <div className="trip-details-column">
                          <div className={`trip-status ${tripPlan.can_complete_trip ? 'approved' : 'denied'}`}>
                            <h3>
                              {tripPlan.can_complete_trip ? 
                                '✅ Trip Approved - HOS Compliant' : 
                                '❌ Trip Denied - HOS Violation Risk'
                              }
                            </h3>
                            
                            {!tripPlan.can_complete_trip && (
                              <div className="denial-reasons">
                                <h4>Reasons:</h4>
                                <ul>
                                  {tripPlan.reasons?.map((reason, index) => (
                                    <li key={index}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {tripPlan.route && (
                            <div className="route-info">
                              <h4>Route Information</h4>
                              <div className="route-details">
                                <p><strong>Total Distance:</strong> {tripPlan.route.total_distance_miles} miles</p>
                                <p><strong>Estimated Drive Time:</strong> {tripPlan.route.estimated_driving_time} hours</p>
                                
                                <div className="waypoints">
                                  <h5>Route Waypoints:</h5>
                                  <ol>
                                    {tripPlan.route.waypoints?.map((point, index) => (
                                      <li key={index}>
                                        <strong>{point.name}:</strong> {point.address}
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              </div>
                            </div>
                          )}

                          {tripPlan.hos_status && (
                            <div className="trip-hos-summary">
                              <h4>Current HOS Status Summary</h4>
                              <div className="hos-quick-stats">
                                <div className="stat">
                                  <span className="label">Drive Time Remaining:</span>
                                  <span className="value">{tripPlan.hos_status.remaining_drive_time?.toFixed(1)}h</span>
                                </div>
                                <div className="stat">
                                  <span className="label">Duty Time Remaining:</span>
                                  <span className="value">{tripPlan.hos_status.remaining_duty_time?.toFixed(1)}h</span>
                                </div>
                                <div className="stat">
                                  <span className="label">70-Hour Remaining:</span>
                                  <span className="value">{tripPlan.hos_status.remaining_70_hour?.toFixed(1)}h</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column - Route Map */}
                        {tripPlan && tripPlan.route && (
                          <div className="trip-map-column">
                            <RouteMap 
                              mapData={{
                                locations: tripPlan.route.waypoints?.map((waypoint, index) => ({
                                  coords: [waypoint.lat, waypoint.lng],
                                  name: waypoint.address || waypoint.name,
                                  type: waypoint.name === 'Rest Stop' || waypoint.address === 'Highway Rest Area' ? 'rest' :
                                        waypoint.name === 'Current Location' ? 'current' :
                                        waypoint.name === 'Dropoff Location' ? 'dropoff' :
                                        waypoint.name === 'Pickup Location' ? 'pickup' :
                                        index === 0 ? 'current' : 
                                        index === tripPlan.route.waypoints.length - 1 ? 'dropoff' : 
                                        'pickup'
                                })) || [],
                                restStops: []
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'logsheet' && (
              <div className="logsheet-tab">
                <DailyLogSheet
                  driverId={selectedDriverId}
                  date={new Date().toLocaleDateString()}
                  logEntries={logEntries}
                  hosStatus={hosStatus}
                  tripInfo={tripData}
                />
              </div>
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>ELD System - Interstate Truck Driver's Guide to Hours of Service Compliance</p>
        <p>🔴 Driving | 🟡 On Duty | 🔵 Sleeper Berth | 🟢 Off Duty</p>
      </footer>

      {/* Add Driver Form Modal */}
      {showAddDriverForm && (
        <AddDriverForm
          onDriverAdded={handleDriverAdded}
          onCancel={handleCancelAddDriver}
        />
      )}
    </div>
  );
}

export default App;
