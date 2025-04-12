import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const stateCoordinates: { [key: string]: [number, number] } = {
  AL: [32.806671, -86.79113], // Alabama
  AK: [61.370716, -152.404419], // Alaska
  AZ: [34.048927, -111.093735], // Arizona
  AR: [34.969704, -92.373123], // Arkansas
  CA: [36.778259, -119.417931], // California
  CO: [39.550051, -105.782066], // Colorado
  CT: [41.603222, -73.087749], // Connecticut
  DE: [38.910832, -75.52767], // Delaware
  FL: [27.994402, -81.760254], // Florida
  GA: [32.165623, -82.900078], // Georgia
  HI: [19.896767, -155.582779], // Hawaii
  ID: [44.068203, -114.742043], // Idaho
  IL: [40.633125, -89.398529], // Illinois
  IN: [40.267194, -86.134902], // Indiana
  IA: [41.878003, -93.097702], // Iowa
  KS: [39.011902, -98.484246], // Kansas
  KY: [37.839333, -84.270018], // Kentucky
  LA: [30.984298, -91.962333], // Louisiana
  ME: [45.253783, -69.445469], // Maine
  MD: [39.045753, -76.641273], // Maryland
  MA: [42.407211, -71.382439], // Massachusetts
  MI: [44.314844, -85.602364], // Michigan
  MN: [46.729553, -94.6859], // Minnesota
  MS: [32.354668, -89.398529], // Mississippi
  MO: [37.964253, -91.831833], // Missouri
  MT: [46.879682, -110.362566], // Montana
  NE: [41.492537, -99.901813], // Nebraska
  NV: [38.80261, -116.419389], // Nevada
  NH: [43.193852, -71.572395], // New Hampshire
  NJ: [40.058324, -74.405661], // New Jersey
  NM: [34.51994, -105.87009], // New Mexico
  NY: [43.299428, -74.217933], // New York
  NC: [35.759573, -79.0193], // North Carolina
  ND: [47.551493, -101.002012], // North Dakota
  OH: [40.417287, -82.907123], // Ohio
  OK: [35.007752, -97.092877], // Oklahoma
  OR: [43.804133, -120.554201], // Oregon
  PA: [41.203322, -77.194525], // Pennsylvania
  RI: [41.580095, -71.477429], // Rhode Island
  SC: [33.836081, -81.163725], // South Carolina
  SD: [43.969515, -99.901813], // South Dakota
  TN: [35.517491, -86.580447], // Tennessee
  TX: [31.968599, -99.901813], // Texas
  UT: [39.32098, -111.093731], // Utah
  VT: [44.558803, -72.577841], // Vermont
  VA: [37.431573, -78.656894], // Virginia
  WA: [47.751076, -120.740135], // Washington
  WV: [38.597626, -80.454903], // West Virginia
  WI: [43.78444, -88.787868], // Wisconsin
  WY: [43.075968, -107.290284], // Wyoming
};

interface ParkMapProps {
  stateCode: string;
}

const MapZoomHandler: React.FC<{ stateCode: string }> = ({ stateCode }) => {
  const map = useMap();

  useEffect(() => {
    if (stateCode && stateCoordinates[stateCode]) {
      const [lat, lng] = stateCoordinates[stateCode];
      map.setView([lat, lng], 6);
    } else {
      map.setView([37.0902, -95.7129], 4);
    }
  }, [stateCode, map]);

  return null;
};

const ParkMap: React.FC<ParkMapProps> = ({ stateCode }) => {
  return (
    <div className="w-full h-[500px]">
      <MapContainer
        center={[37.0902, -95.7129]}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapZoomHandler stateCode={stateCode} />
        {Object.entries(stateCoordinates).map(([state, [lat, lng]]) => (
          <Marker key={state} position={[lat, lng]}>
            <Popup>{state}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default ParkMap;
