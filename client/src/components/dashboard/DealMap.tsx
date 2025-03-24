import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Deal } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';

// Import Leaflet CSS at the component level to ensure it's loaded
// when the component is rendered
import 'leaflet/dist/leaflet.css';

// Fix marker icon issues in React Leaflet
// Direct icon settings without prototype modification to avoid TypeScript errors
// Create a global custom icon for Leaflet to use instead of trying to modify default

// Custom marker icon for deals
const dealIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

// Custom marker icon for user location
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

interface DealMapProps {
  deals: (Deal & { business: any })[];
  isLoading: boolean;
  onSelect: (dealId: number) => void;
}

export default function DealMap({ deals, isLoading, onSelect }: DealMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]); // Default to San Francisco
  
  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting user location:', error);
        }
      );
    }
  }, []);

  if (isLoading) {
    return <MapSkeleton />;
  }

  return (
    <Card className="overflow-hidden pb-16">
      <CardContent className="p-0">
        <div className="h-[70vh]">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {deals.map((deal) => (
              <DealMarker 
                key={deal.id} 
                deal={deal} 
                onSelect={() => onSelect(deal.id)} 
              />
            ))}
            
            {userLocation && (
              <Marker position={userLocation} icon={userIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}
            
            <MapController center={mapCenter} />
            
            <div className="leaflet-bottom leaflet-right" style={{ zIndex: 1000 }}>
              <div className="leaflet-control leaflet-bar m-4">
                <Button 
                  size="icon" 
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={() => {
                    if (userLocation) {
                      setMapCenter(userLocation);
                    } else {
                      // Ask for location permission if not available
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          const { latitude, longitude } = position.coords;
                          setUserLocation([latitude, longitude]);
                          setMapCenter([latitude, longitude]);
                        }
                      );
                    }
                  }}
                >
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface DealMarkerProps {
  deal: Deal & { business: any };
  onSelect: () => void;
}

function DealMarker({ deal, onSelect }: DealMarkerProps) {
  const { business } = deal;
  
  // Guard against missing location data or invalid coordinates
  if (!business || !business.latitude || !business.longitude) {
    console.log(`Deal "${deal.title}" is missing location data`);
    return null;
  }
  
  // Validate that latitude and longitude are valid numbers
  const lat = parseFloat(business.latitude.toString());
  const lng = parseFloat(business.longitude.toString());
  
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.log(`Deal "${deal.title}" has invalid location data: (${lat}, ${lng})`);
    return null;
  }
  
  return (
    <Marker 
      position={[lat, lng]} 
      icon={dealIcon}
    >
      <Popup>
        <div className="w-60">
          <div className="aspect-video relative mb-2 overflow-hidden rounded">
            <img 
              src={deal.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3'} 
              alt={deal.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                {deal.discount}
              </Badge>
            </div>
          </div>
          
          <h3 className="font-semibold text-base mb-1">{deal.title}</h3>
          <p className="text-sm text-muted-foreground mb-1">
            {business.businessName}
          </p>
          <p className="text-xs text-muted-foreground mb-2 flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            {business.address}
          </p>
          
          <Button 
            size="sm" 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            View Deal
          </Button>
        </div>
      </Popup>
    </Marker>
  );
}

interface MapControllerProps {
  center: [number, number];
}

function MapController({ center }: MapControllerProps) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

function MapSkeleton() {
  return (
    <Card className="overflow-hidden pb-16">
      <Skeleton className="h-[70vh] w-full" />
    </Card>
  );
}