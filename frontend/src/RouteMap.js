import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import RoutingMachine from './RoutingMachine';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Modern custom icons using SVG data URLs for crisp display
const createSvgIcon = (color, symbol, bgColor = '#ffffff') => {
  const svgIcon = `
    <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <path d="M16 0C7.2 0 0 7.2 0 16c0 16 16 24 16 24s16-8 16-24C32 7.2 24.8 0 16 0z" 
            fill="${color}" stroke="${bgColor}" stroke-width="2" filter="url(#shadow)"/>
      <circle cx="16" cy="16" r="8" fill="${bgColor}"/>
      <text x="16" y="21" text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="14" font-weight="bold" fill="${color}">${symbol}</text>
    </svg>
  `;
  return L.divIcon({
    html: svgIcon,
    className: 'custom-svg-icon',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40]
  });
};

// Modern icon definitions with better visual hierarchy
const currentLocationIcon = createSvgIcon('#10B981', '📍');
const pickupIcon = createSvgIcon('#3B82F6', '📦');
const dropoffIcon = createSvgIcon('#EF4444', '🎯');
const restStopIcon = createSvgIcon('#F59E0B', '⛽');

const getMarkerIcon = (type) => {
  switch (type) {
    case 'current': return currentLocationIcon;
    case 'pickup': return pickupIcon;
    case 'dropoff': return dropoffIcon;
    case 'rest':
    case 'fuel': return restStopIcon;
    default: return null;
  }
};

const MapLegend = () => {
  const types = [
    { type: 'current', label: 'Current Location', color: '#10B981', symbol: '📍', description: 'Your current position' },
    { type: 'pickup', label: 'Pickup Point', color: '#3B82F6', symbol: '📦', description: 'Cargo pickup location' },
    { type: 'dropoff', label: 'Delivery Point', color: '#EF4444', symbol: '🎯', description: 'Cargo delivery destination' },
    { type: 'rest', label: 'Rest/Fuel Stop', color: '#F59E0B', symbol: '⛽', description: 'Rest area or fuel station' }
  ];

  return (
    <div className="map-legend-modern">
      <div className="legend-header">
        <h3>🗺️ Route Legend</h3>
        <p>Track your journey with visual markers</p>
      </div>
      <div className="legend-grid">
        {types.map(({ type, label, color, symbol, description }) => (
          <div key={type} className="legend-card">
            <div className="legend-icon" style={{ backgroundColor: color }}>
              <span className="legend-symbol">{symbol}</span>
            </div>
            <div className="legend-content">
              <h4>{label}</h4>
              <p>{description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="route-info">
        <div className="route-line"></div>
        <span>Route Path</span>
      </div>
    </div>
  );
};

const RouteMap = ({ mapData }) => {
  const [mapInstance, setMapInstance] = React.useState(null);
  const [satelliteView, setSatelliteView] = React.useState(false);

  if (!mapData || !mapData.locations || mapData.locations.length === 0) {
    return (
      <div className="routemap-container-modern" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '450px', 
        backgroundColor: '#f8fafc',
        color: '#64748b',
        fontSize: '16px',
        fontWeight: '500'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <div>No trip data available</div>
          <div style={{ fontSize: '14px', marginTop: '8px', opacity: '0.7' }}>
            Add locations to view your route
          </div>
        </div>
      </div>
    );
  }

  // Create bounds from all locations with some padding
  const bounds = mapData.locations.map(loc => loc.coords);

  const handleCenterMap = () => {
    if (mapInstance && bounds.length > 0) {
      mapInstance.fitBounds(bounds, { padding: [30, 30] });
    }
  };

  const toggleSatelliteView = () => {
    setSatelliteView(!satelliteView);
  };

  const handleZoomIn = () => {
    if (mapInstance) {
      mapInstance.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstance) {
      mapInstance.zoomOut();
    }
  };
  
  return (
    <div className="routemap-wrapper-column">
      <div className="map-header-compact">
        <h3>🚛 Route Map</h3>
        <div className="map-controls">
          <button 
            className="map-control-btn" 
            title="Center Map"
            onClick={handleCenterMap}
          >
            <span>🎯</span>
          </button>
          <button 
            className="map-control-btn" 
            title={satelliteView ? "Street View" : "Satellite View"}
            onClick={toggleSatelliteView}
          >
            <span>{satelliteView ? "�️" : "�🛰️"}</span>
          </button>
        </div>
      </div>
      
      <div className="routemap-container-column">
        <MapContainer 
          bounds={bounds} 
          boundsOptions={{ padding: [20, 20] }}
          style={{ height: '100%', width: '100%', borderRadius: '16px' }}
          zoomControl={false}
          scrollWheelZoom={true}
          attributionControl={false}
          whenCreated={setMapInstance}
        >
          {/* Dynamic tile layer based on view mode */}
          <TileLayer
            url={satelliteView 
              ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            }
            attribution={satelliteView
              ? '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.digitalglobe.com/">DigitalGlobe</a>'
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }
          />
          
          {mapData.locations.length > 0 && (
            <RoutingMachine waypoints={mapData.locations.map(loc => ({
              lat: loc.coords[0],
              lng: loc.coords[1],
              name: loc.name,
              type: loc.type
            }))} />
          )}
          
          {mapData.restStops && mapData.restStops.map((stop, index) => (
            <Marker 
              key={`stop-${index}`} 
              position={stop.coords} 
              icon={getMarkerIcon(stop.type)}
            >
              <Popup className="custom-popup">
                <div className="popup-content">
                  <h3>{stop.name}</h3>
                  {stop.reason && (
                    <p className="popup-reason">{stop.reason}</p>
                  )}
                  <div className="popup-type">{stop.type}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Custom zoom controls */}
        <div className="custom-zoom-controls">
          <button 
            className="zoom-btn zoom-in" 
            title="Zoom In"
            onClick={handleZoomIn}
          >
            +
          </button>
          <button 
            className="zoom-btn zoom-out" 
            title="Zoom Out"
            onClick={handleZoomOut}
          >
            −
          </button>
        </div>
      </div>
      
      <MapLegend />
    </div>
  );
};

export default RouteMap;
