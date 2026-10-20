// client/src/components/KitchenMap.tsx - Interactive Map for Kitchen Discovery
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import type { Kitchen } from '../types';

interface KitchenMapProps {
  kitchens: Kitchen[];
  userLat?: number;
  userLng?: number;
  userLocationName?: string;
}

export const KitchenMap: React.FC<KitchenMapProps> = ({
  kitchens,
  userLat = 28.6280,
  userLng = 77.3649,
  userLocationName = 'Sector 62, Noida'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing map if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Map centered on user location
    const map = L.map(mapContainerRef.current).setView([userLat, userLng], 14);
    mapInstanceRef.current = map;

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Delivery radius circle (3.5 km)
    L.circle([userLat, userLng], {
      color: '#ea580c',
      fillColor: '#f97316',
      fillOpacity: 0.1,
      radius: 3500
    }).addTo(map);

    // User Location Marker
    const userIcon = L.divIcon({
      className: 'custom-user-pin',
      html: `
        <div style="background-color: #2563eb; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-weight: bold; font-size: 14px;">
          📍
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    L.marker([userLat, userLng], { icon: userIcon })
      .addTo(map)
      .bindPopup(`<strong>Your Delivery Location</strong><br/><span style="font-size: 11px; color: #555;">${userLocationName}</span>`);

    // Kitchen Markers
    kitchens.forEach((k) => {
      const lat = k.latitude || userLat + 0.005;
      const lng = k.longitude || userLng + 0.005;

      const kitchenIcon = L.divIcon({
        className: 'custom-kitchen-pin',
        html: `
          <div style="background-color: #ea580c; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 6px 12px rgba(234, 88, 12, 0.4); font-size: 16px;">
            🍛
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });

      const popupHtml = `
        <div style="font-family: inherit; width: 200px; padding: 2px;">
          <img src="${k.bannerUrl}" alt="${k.name}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />
          <div style="font-size: 13px; font-weight: bold; color: #1c1917;">${k.name}</div>
          <div style="font-size: 11px; color: #ea580c; font-weight: 600;">Chef ${k.cookName}</div>
          <div style="font-size: 10px; color: #78716c; margin-top: 2px;">⭐ ${k.rating} • ${k.prepTimeMinutes} mins • ${k.distanceKm || 1.8} km</div>
          <div style="font-size: 11px; font-weight: bold; color: #15803d; margin: 4px 0;">Meals from ₹${k.startingPrice}</div>
          <button id="view-kitchen-${k.id}" style="width: 100%; background-color: #ea580c; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; margin-top: 4px;">
            View Menu →
          </button>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: kitchenIcon }).addTo(map);
      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-kitchen-${k.id}`);
        if (btn) {
          btn.onclick = () => {
            navigate(`/kitchen/${k.id}`);
          };
        }
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [kitchens, userLat, userLng, userLocationName, navigate]);

  return (
    <div className="w-full h-96 sm:h-[480px] rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm relative z-10">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
