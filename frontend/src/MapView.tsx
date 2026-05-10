import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const getMarkerColor = (score: number, isClosed: boolean) => {
  if (isClosed) return 'red';
  if (score >= 80) return 'green';
  if (score >= 50) return 'orange';
  return 'red';
};

const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 20px;
      height: 20px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

interface Props {
  locations: any[];
}

const MapView: React.FC<Props> = ({ locations }) => {
  const validLocations = locations.filter(loc => loc.latitude && loc.longitude);

  return (
    <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', height: '380px' }}>
      <MapContainer
        center={[49.2660, -123.2510]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validLocations.map((loc, index) => (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={createColoredIcon(getMarkerColor(loc.score, loc.is_closed))}
          >
            <Popup>
              <strong>#{index + 1} {loc.name}</strong><br />
              {loc.building}<br />
              Score: {loc.score}<br />
              {loc.is_closed ? '🔴 Currently Closed' : '🟢 Open'}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;