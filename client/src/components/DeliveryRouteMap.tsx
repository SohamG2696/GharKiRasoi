// client/src/components/DeliveryRouteMap.tsx - Live Route & Delivery Movement Tracker
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { OrderStatus } from '../types';

interface DeliveryRouteMapProps {
  kitchenLat?: number;
  kitchenLng?: number;
  kitchenName?: string;
  customerLat?: number;
  customerLng?: number;
  customerAddress?: string;
  orderStatus: OrderStatus;
  riderName?: string | null;
}

export const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({
  kitchenLat = 28.6295,
  kitchenLng = 77.3660,
  kitchenName = 'Home Kitchen',
  customerLat = 28.6280,
  customerLng = 77.3649,
  customerAddress = 'Delivery Location',
  orderStatus,
  riderName = 'Vikram Singh'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Midpoint between kitchen and customer
    const midLat = (kitchenLat + customerLat) / 2;
    const midLng = (kitchenLng + customerLng) / 2;

    const map = L.map(mapContainerRef.current).setView([midLat, midLng], 15);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // 1. Kitchen Marker
    const kitchenIcon = L.divIcon({
      className: 'kitchen-route-pin',
      html: `
        <div style="background-color: #ea580c; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); font-size: 15px;">
          🍛
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34]
    });

    L.marker([kitchenLat, kitchenLng], { icon: kitchenIcon })
      .addTo(map)
      .bindPopup(`<strong>${kitchenName}</strong><br/><span style="font-size: 11px;">Food Prepared Here</span>`);

    // 2. Customer Marker
    const customerIcon = L.divIcon({
      className: 'customer-route-pin',
      html: `
        <div style="background-color: #15803d; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); font-size: 15px;">
          📍
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34]
    });

    L.marker([customerLat, customerLng], { icon: customerIcon })
      .addTo(map)
      .bindPopup(`<strong>Delivery Destination</strong><br/><span style="font-size: 11px;">${customerAddress}</span>`);

    // 3. Polyline Route
    const routeCoords: [number, number][] = [
      [kitchenLat, kitchenLng],
      [kitchenLat - 0.0006, kitchenLng + 0.0004],
      [customerLat + 0.0008, customerLng - 0.0002],
      [customerLat, customerLng]
    ];

    L.polyline(routeCoords, {
      color: '#ea580c',
      weight: 4,
      opacity: 0.7,
      dashArray: '8, 8'
    }).addTo(map);

    // 4. Rider Position based on order status
    let riderLat = kitchenLat;
    let riderLng = kitchenLng;

    if (orderStatus === 'OUT_FOR_DELIVERY') {
      riderLat = midLat;
      riderLng = midLng;
    } else if (orderStatus === 'DELIVERED') {
      riderLat = customerLat;
      riderLng = customerLng;
    }

    if (['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(orderStatus)) {
      const riderIcon = L.divIcon({
        className: 'rider-live-pin',
        html: `
          <div style="background-color: #0284c7; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 6px 12px rgba(2, 132, 199, 0.5); font-size: 16px; animation: bounce 1.5s infinite;">
            🚴
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });

      L.marker([riderLat, riderLng], { icon: riderIcon })
        .addTo(map)
        .bindPopup(`<strong>Delivery Partner ${riderName}</strong><br/><span style="font-size: 11px;">Status: ${orderStatus.replace(/_/g, ' ')}</span>`)
        .openPopup();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [kitchenLat, kitchenLng, kitchenName, customerLat, customerLng, customerAddress, orderStatus, riderName]);

  return (
    <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-stone-200/90 shadow-inner relative z-10 my-4">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
