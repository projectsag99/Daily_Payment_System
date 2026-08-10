"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { GeoPoint } from "@/lib/constants/route-locations";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix default marker assets when bundled by Next.js.
const DefaultIcon = L.icon({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LocationMapProps {
  center: GeoPoint;
  value: GeoPoint | null;
  onChange: (location: GeoPoint) => void;
}

function RecenterMap({ center, value }: { center: GeoPoint; value: GeoPoint | null }) {
  const map = useMap();

  useEffect(() => {
    if (!value) {
      map.setView([center.lat, center.lng], 6);
    }
  }, [center.lat, center.lng, map, value]);

  return null;
}

function ZoomToValue({ value }: { value: GeoPoint | null }) {
  const map = useMap();

  useEffect(() => {
    if (value) {
      map.setView([value.lat, value.lng], 16, { animate: true });
    }
  }, [value, map]);

  return null;
}

function MapClickHandler({
  onChange,
}: {
  onChange: (location: GeoPoint) => void;
}) {
  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

export function LocationMap({ center, value, onChange }: LocationMapProps) {
  const markerPosition = value ?? center;

  return (
    <MapContainer
      center={[markerPosition.lat, markerPosition.lng]}
      zoom={value ? 16 : 6}
      scrollWheelZoom
      className="h-full w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap center={center} value={value} />
      <ZoomToValue value={value} />
      <MapClickHandler onChange={onChange} />
      {value && (
        <Marker
          draggable
          position={[value.lat, value.lng]}
          eventHandlers={{
            dragend(event) {
              const marker = event.target;
              const { lat, lng } = marker.getLatLng();
              onChange({ lat, lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
