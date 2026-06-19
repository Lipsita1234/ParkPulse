'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ShieldAlert, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { renderToString } from 'react-dom/server';

// Fix default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface DigitalTwinMapProps {
  layerState: {
    heatmap: boolean;
    hotspots: boolean;
    riskZones: boolean;
  };
  heatmapData: any[];
  hotspotsData: any[];
  riskData: any[];
  timeOfDay: string; // 'All', 'Morning', 'Afternoon', 'Evening', 'Night'
}

const TIME_RANGES: Record<string, [number, number]> = {
  Morning: [6, 12],
  Afternoon: [12, 16],
  Evening: [16, 20],
  Night: [20, 6] // Special case: crosses midnight, but we'll use 20-23 and 0-5
};

const isHotspotActive = (peakHour: number, selectedTime: string) => {
  if (selectedTime === 'All') return true;
  const range = TIME_RANGES[selectedTime];
  if (!range) return true;
  if (selectedTime === 'Night') {
    return peakHour >= 20 || peakHour < 6;
  }
  return peakHour >= range[0] && peakHour < range[1];
};

const getRecommendation = (riskLevel: string) => {
  if (riskLevel === 'High') return 'Dispatch immediate patrol unit';
  if (riskLevel === 'Medium') return 'Increase camera monitoring';
  return 'Standard automated monitoring';
};

export default function DigitalTwinMap({ layerState, heatmapData, hotspotsData, riskData, timeOfDay }: DigitalTwinMapProps) {
  // Center of Bengaluru
  const center: [number, number] = [12.9716, 77.5946];

  const maxIntensity = heatmapData.length > 0 ? Math.max(...heatmapData.map((p) => p[2] || 1)) : 1;

  return (
    <MapContainer 
      center={center} 
      zoom={12} 
      style={{ width: '100%', height: '100%', zIndex: 1, background: '#0a0f1e' }}
      zoomControl={false}
      attributionControl={false}
    >
      {/* Dark CartoDB base layer */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OSM &copy; CARTO"
        maxZoom={19}
        subdomains="abcd"
      />

      {/* Heatmap Layer */}
      {layerState.heatmap && (
        <LayerGroup>
          {heatmapData.slice(0, 300).map((p, i) => {
            const intensity = (p[2] || 0.5) / maxIntensity;
            const radius = (20 + intensity * 30) * 15;
            const opacity = 0.1 + intensity * 0.4;
            const hue = Math.floor((1 - intensity) * 120);
            return (
              <Circle
                key={`heat-${i}`}
                center={[p[0], p[1]]}
                radius={radius}
                pathOptions={{
                  color: `hsl(${hue}, 90%, 55%)`,
                  fillColor: `hsl(${hue}, 90%, 50%)`,
                  fillOpacity: opacity,
                  weight: 0,
                }}
              />
            );
          })}
        </LayerGroup>
      )}

      {/* Risk Zones Layer */}
      {layerState.riskZones && (
        <LayerGroup>
          {riskData.slice(0, 200).map((p, i) => {
            if (p[2] <= 0.5) return null; // Only show high/medium
            const intensity = p[2];
            return (
              <Circle
                key={`risk-${i}`}
                center={[p[0], p[1]]}
                radius={300}
                pathOptions={{
                  color: `rgba(239,68,68,${intensity * 0.8})`,
                  fillColor: `rgba(239,68,68,${intensity * 0.25})`,
                  fillOpacity: 1,
                  weight: 1,
                }}
              />
            );
          })}
        </LayerGroup>
      )}

      {/* Hotspots Layer */}
      {layerState.hotspots && (
        <LayerGroup>
          {hotspotsData.map((h, i) => {
            if (!h.centroid_lat || !h.centroid_lon) return null;
            
            const riskColor = h.risk_level === 'High' ? '#ef4444' : h.risk_level === 'Medium' ? '#f97316' : '#22c55e';
            const isActive = isHotspotActive(h.peak_hour, timeOfDay);
            const pulseSize = (h.risk_level === 'High' ? 18 : h.risk_level === 'Medium' ? 14 : 10) * (isActive ? 1 : 0.7);
            const opacity = isActive ? 1 : 0.25;

            const iconHtml = `
              <div style="
                width: ${pulseSize}px; height: ${pulseSize}px;
                border-radius: 50%;
                background: ${riskColor};
                border: 2px solid rgba(255,255,255,0.8);
                box-shadow: 0 0 ${h.risk_level === 'High' ? 16 : 10}px ${riskColor};
                position: relative;
                opacity: ${opacity};
                transition: all 0.3s ease;
              ">
                ${isActive ? `
                <div style="
                  position: absolute; inset: -6px;
                  border-radius: 50%;
                  border: 2px solid ${riskColor}60;
                  animation: cluster-pulse 2s ease-out infinite;
                "></div>` : ''}
              </div>
            `;

            const icon = L.divIcon({
              className: '',
              html: iconHtml,
              iconSize: [pulseSize + 12, pulseSize + 12],
              iconAnchor: [(pulseSize + 12) / 2, (pulseSize + 12) / 2],
            });

            return (
              <Marker key={`hotspot-${h.cluster_id || i}`} position={[h.centroid_lat, h.centroid_lon]} icon={icon}>
                <Popup className="dark-popup">
                  <div style={{ background: '#0d1529', color: '#e2e8f0', borderRadius: 10, padding: 14, minWidth: 240, fontFamily: 'Inter, sans-serif' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#60a5fa' }}>
                      {h.location_name || h.location || 'Unknown location'}
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <span style={{ 
                        background: `${riskColor}20`, border: `1px solid ${riskColor}40`, 
                        color: riskColor, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 
                      }}>
                        {h.risk_level} RISK
                      </span>
                      <span style={{ 
                        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', 
                        color: '#60a5fa', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 
                      }}>
                        Score: {h.risk_score}
                      </span>
                    </div>

                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={12} color="#f87171" />
                        <span><strong>{h.violation_count || h.size || 0}</strong> Violations</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Activity size={12} color="#fbbf24" />
                        <span>Peak: <strong>{h.peak_hour}:00</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendingUp size={12} color="#34d399" />
                        <span>Primary: <strong>{h.dominant_vehicle || 'Mixed'}</strong></span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '8px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <ShieldAlert size={14} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: 10 }}>
                        <div style={{ color: '#34d399', fontWeight: 700, marginBottom: 2 }}>AI RECOMMENDATION</div>
                        <div style={{ color: '#d1fae5' }}>{getRecommendation(h.risk_level)}</div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </LayerGroup>
      )}
    </MapContainer>
  );
}
