import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

interface Park {
  _id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

const ParkMap: React.FC = () => {
  const [parks, setParks] = useState<Park[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParks = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/parks`);
        setParks(response.data);
      } catch (err) {
        console.error('Error fetching parks:', err);
        setError('Failed to load park data. Please try again later.');
      }
    };

    fetchParks();
  }, []);

  return (
    <div className="w-full h-screen">
      {error ? (
        <div className="text-center text-red-500 mt-4">{error}</div>
      ) : (
        <MapContainer center={[37.7749, -122.4194]} zoom={6} className="w-full h-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {parks.map((park) => (
            <Marker key={park._id} position={[park.coordinates.lat, park.coordinates.lng]}>
              <Popup>
                <h3>{park.name}</h3>
                <p>{park.description}</p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
};

export default ParkMap;