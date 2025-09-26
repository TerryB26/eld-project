import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// Modern custom icons using SVG for routing machine
const createModernRoutingIcon = (color, symbol) => {
  const svgIcon = `
    <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-${color.replace('#', '')}" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <path d="M18 0C8.1 0 0 8.1 0 18c0 18 18 26 18 26s18-8 18-26C36 8.1 27.9 0 18 0z" 
            fill="${color}" stroke="#ffffff" stroke-width="3" filter="url(#shadow-${color.replace('#', '')})"/>
      <circle cx="18" cy="18" r="10" fill="#ffffff"/>
      <text x="18" y="24" text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="16" font-weight="bold" fill="${color}">${symbol}</text>
    </svg>
  `;
  return L.divIcon({
    html: svgIcon,
    className: 'modern-routing-icon',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44]
  });
};

const RoutingMachine = ({ waypoints }) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || !waypoints || waypoints.length < 2) {
      return;
    }

    // Clean up any existing routing control
    if (routingControlRef.current) {
      try {
        map.removeControl(routingControlRef.current);
      } catch (error) {
        console.log('Could not remove existing routing control:', error.message);
      }
      routingControlRef.current = null;
    }

    // Add a small delay to ensure map is fully initialized
    const timeoutId = setTimeout(() => {
      if (map && map._container) {
        try {
          routingControlRef.current = L.Routing.control({
            waypoints: waypoints.map(wp => L.latLng(wp.lat, wp.lng)),
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            show: false, // Hide the default turn-by-turn instructions panel
            lineOptions: {
              styles: [
                { color: '#ffffff', opacity: 0.8, weight: 8 },
                { color: '#3b82f6', opacity: 1.0, weight: 4 }
              ],
            },
            createMarker: (i, waypoint, n) => {
              // Use modern custom markers based on waypoint type
              let color, symbol;
              const waypointType = waypoints[i].type;
              
              if (waypointType === 'current') {
                color = '#10B981';
                symbol = '📍';
              } else if (waypointType === 'rest' || waypointType === 'fuel') {
                color = '#F59E0B';
                symbol = '⛽';
              } else if (waypointType === 'dropoff') {
                color = '#EF4444';
                symbol = '🎯';
              } else if (waypointType === 'pickup') {
                color = '#3B82F6';
                symbol = '📦';
              } else {
                // Fallback to position-based logic
                if (i === 0) {
                  color = '#10B981';
                  symbol = '📍';
                } else if (i === n - 1) {
                  color = '#EF4444';
                  symbol = '🎯';
                } else {
                  color = '#3B82F6';
                  symbol = '📦';
                }
              }

              const customIcon = createModernRoutingIcon(color, symbol);
              return L.marker(waypoint.latLng, {
                icon: customIcon,
                draggable: false,
              }).bindPopup(`
                <div class="routing-popup">
                  <h3>${waypoints[i].name}</h3>
                  <span class="waypoint-number">${waypointType === 'rest' || waypointType === 'fuel' ? 'Rest Stop' : `Stop ${i + 1} of ${n}`}</span>
                </div>
              `);
            },
          }).addTo(map);

          // Defensive: if routing machine creates pending XHR requests, keep references so we can abort them
          const rc = routingControlRef.current;
          // Some versions keep a `_router` with `_xhr` or `_pendingRequest` references; try to hook into those
          if (rc && rc._router && rc._router._routes && Array.isArray(rc._router._routes)) {
            // no-op placeholder: future enhancements
          }

          // Attach a safe _safeRemoveLines wrapper to prevent calls when map is gone
          if (rc && rc._container && rc._container._clearLines) {
            const originalClear = rc._container._clearLines;
            rc._container._clearLines = function() {
              if (map && map._container) {
                try {
                  return originalClear.apply(this, arguments);
                } catch (e) {
                  console.warn('Wrapped _clearLines error:', e && e.message);
                }
              } else {
                // map not available; skip
                return;
              }
            };
          }
        } catch (error) {
          console.error('Error adding routing control:', error);
        }
      }
    }, 100);

    // Cleanup function to remove the routing control when the component unmounts
    return () => {
      clearTimeout(timeoutId);

      // Attempt to abort any pending requests that the routing machine started
      try {
        const rc = routingControlRef.current;
        if (rc) {
          // common internal fields used by different versions of LRM
          if (rc._pendingRequest && rc._pendingRequest.abort) {
            try { rc._pendingRequest.abort(); } catch (e) { /* ignore */ }
          }
          if (rc._xhr && rc._xhr.abort) {
            try { rc._xhr.abort(); } catch (e) { /* ignore */ }
          }
          if (rc._router && rc._router._xhr && rc._router._xhr.abort) {
            try { rc._router._xhr.abort(); } catch (e) { /* ignore */ }
          }
          if (rc._router && Array.isArray(rc._router._pendingRequest)) {
            rc._router._pendingRequest.forEach(req => { try { req.abort && req.abort(); } catch (e) {} });
          }
        }
      } catch (e) {
        // swallow errors during cleanup
      }

      if (routingControlRef.current && map && map._container) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (error) {
          console.log('Could not remove routing control on cleanup:', error.message);
        }
      }
      routingControlRef.current = null;
    };
  }, [map, waypoints]);

  return null; // This component does not render anything itself
};

export default RoutingMachine;
