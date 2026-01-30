'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocket } from '@/contexts/LocketContext';

// Fix for custom icons in Leaflet with Next.js
const createIcon = (color: string) => {
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

interface MapMarker {
    id: string;
    pos: [number, number];
    title: string;
    date: string;
}

export default function JourneyMap() {
    const { currentLocket } = useLocket();
    const [isMounted, setIsMounted] = useState(false);
    const [markers, setMarkers] = useState<MapMarker[]>([]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        async function fetchLocations() {
            if (!currentLocket) return;
            try {
                const { getCurrentUserToken } = await import('@/lib/firebase/auth');
                const token = await getCurrentUserToken();
                const res = await fetch(`/api/memory-groups?locketId=${currentLocket.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const groups = data.memoryGroups || [];
                    // Extract locations from media items that have coordinates
                    const locationMarkers: MapMarker[] = [];
                    groups.forEach((group: any) => {
                        const media = group.media_items || [];
                        media.forEach((item: any) => {
                            if (item.latitude && item.longitude) {
                                locationMarkers.push({
                                    id: item.id,
                                    pos: [item.latitude, item.longitude],
                                    title: item.place_name || group.title || 'Memory',
                                    date: new Date(item.date_taken || group.created_at).toLocaleDateString()
                                });
                            }
                        });
                    });
                    setMarkers(locationMarkers);
                }
            } catch (e) {
                console.error('Failed to fetch map locations:', e);
            }
        }
        if (currentLocket) fetchLocations();
    }, [currentLocket]);

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
                scrollWheelZoom={true}
                className="w-full h-full"
                style={{ background: '#FDF6F7' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {markers.map((marker) => {
                    const icon = createIcon('#e11d48');
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

            {markers.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 pointer-events-none">
                    <p className="text-muted-foreground text-sm text-center px-4">
                        Add locations to your memories to see them on the map
                    </p>
                </div>
            )}
        </div>
    );
}
