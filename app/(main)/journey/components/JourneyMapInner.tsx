'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

// Fix for custom icons in Leaflet with Next.js
const createIcon = (color: string) => {
    // Dynamically require leaflet only on client side
    if (typeof window === 'undefined') return null;
    try {
        const L = require('leaflet');
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
    } catch (e) {
        return null;
    }
};

const MARKERS = [
    { id: 1, pos: [40.7128, -74.0060] as [number, number], title: "New York", date: "Oct 2023" },
    { id: 2, pos: [48.8566, 2.3522] as [number, number], title: "Paris", date: "Mar 2024" },
    { id: 3, pos: [35.6762, 139.6503] as [number, number], title: "Tokyo", date: "planned" },
];

const PATH = [
    [40.7128, -74.0060], // NY
    [48.8566, 2.3522],   // Paris
    [35.6762, 139.6503], // Tokyo
] as [number, number][];

export default function JourneyMap() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <div className="w-full h-[300px] md:h-[600px] rounded-2xl bg-rose-50 flex items-center justify-center text-muted-foreground animate-pulse border border-rose-100">
                <span className="sr-only">Loading Map...</span>
            </div>
        );
    }

    return (
        <div className="w-full h-[300px] md:h-[600px] rounded-2xl overflow-hidden shadow-sm border border-rose-100 relative z-0">
            <MapContainer
                center={[30, 0]}
                zoom={2}
                scrollWheelZoom={false}
                className="w-full h-full"
                style={{ background: '#FDF6F7' }} // Blush background
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" // Light themed map
                />

                {/* Connection Line */}
                <Polyline
                    positions={PATH}
                    pathOptions={{ color: '#BA4A68', weight: 2, opacity: 0.6, dashArray: '5, 10' }}
                />

                {MARKERS.map((marker) => {
                    const icon = createIcon('#BA4A68');
                    if (!icon) return null;

                    return (
                        <Marker
                            key={marker.id}
                            position={marker.pos}
                            icon={icon}
                        >
                            <Popup className="font-body">
                                <div className="text-center">
                                    <strong className="block text-primary font-heading">{marker.title}</strong>
                                    <span className="text-xs text-muted-foreground">{marker.date}</span>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
