// MARK: - Map Manager
// Leaflet.js に依存する地図制御ロジック

import { state } from './state.js';

// MARK: Init Map
export function initMap() {
    state.map = L.map('map', { 
        zoomControl: false, 
        tap: false 
    }).setView([35.03, 135.76], 13);

    L.control.zoom({ position: 'topleft' }).addTo(state.map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO'
    }).addTo(state.map);

    state.allMarkersGroup = L.layerGroup().addTo(state.map);
}

// MARK: Update Markers
export function updateMarkersForDetail(stops, onClickCallback) {
    state.allMarkersGroup.clearLayers();
    state.markers = [];
    
    const latLngs = [];

    stops.forEach(stop => {
        const marker = L.circleMarker([stop.lat, stop.lon], { 
            color: '#2c2c2c',       
            fillColor: '#ffffff',   
            fillOpacity: 1,         
            weight: 3,              
            radius: 6               
        });
        
        marker.stopId = stop.id;
        
        marker.on('click', () => {
            onClickCallback(stop.id);
        });

        state.allMarkersGroup.addLayer(marker);
        state.markers.push(marker);
        latLngs.push([stop.lat, stop.lon]);
    });

    if (latLngs.length > 0) {
        state.map.fitBounds(latLngs, { padding: [80, 80] });
    }
}

// MARK: Highlight Marker (Exclusive)
// 特定のマーカーを黒丸にし、それ以外を白丸に戻す（詳細画面での選択時など）
export function highlightMarker(targetStopId) {
    state.markers.forEach(m => {
        if (m.stopId === targetStopId) {
            m.setStyle({ 
                color: '#2c2c2c',      
                fillColor: '#2c2c2c', 
                fillOpacity: 1 
            });
            m.bringToFront(); 
        } else {
            m.setStyle({ 
                color: '#2c2c2c', 
                fillColor: '#ffffff', 
                fillOpacity: 1 
            });
        }
    });
}

// MARK: Set Marker Active (Additive)
// ★追加: 特定のマーカーを黒丸にする（他を白に戻さない）
// 「すべて」表示の時に、バスがあるのりばを次々と黒くしていくために使用
export function setMarkerActive(targetStopId) {
    const marker = state.markers.find(m => m.stopId === targetStopId);
    if (marker) {
        marker.setStyle({ 
            color: '#2c2c2c',      
            fillColor: '#2c2c2c', 
            fillOpacity: 1 
        });
        marker.bringToFront();
    }
}

// MARK: Reset Markers Style
export function resetMarkersStyle() {
    state.markers.forEach(m => {
        m.setStyle({ 
            color: '#2c2c2c', 
            fillColor: '#ffffff', 
            fillOpacity: 1 
        });
    });
}

// MARK: Route Drawing
export function drawRoutePolyline(shapeId) {
    if (state.currentPolyline) {
        state.map.removeLayer(state.currentPolyline);
        state.currentPolyline = null;
    }

    if (shapeId && typeof window.SHAPES_DATA !== 'undefined' && window.SHAPES_DATA[shapeId]) {
        const latlngs = window.SHAPES_DATA[shapeId];
        state.currentPolyline = L.polyline.antPath(latlngs, {
            "delay": 2000, 
            "dashArray": [15, 80], 
            "weight": 6,
            "color": "#2c2c2c", 
            "pulseColor": "#ffffff",
            "paused": false, 
            "reverse": false, 
            "hardwareAccelerated": true
        }).addTo(state.map);
        
        state.map.fitBounds(state.currentPolyline.getBounds(), { padding: [50, 50] });
    }
}

export function clearRoutePolyline() {
    if (state.currentPolyline) {
        state.map.removeLayer(state.currentPolyline);
        state.currentPolyline = null;
    }
}

// MARK: Map Actions
export function zoomToStop(stopId) {
    const stopInfo = state.stopIdMap[stopId];
    if (stopInfo) {
        state.map.flyTo([stopInfo.lat, stopInfo.lon], 18, {
            animate: true,
            duration: 1.0
        });
    }
}

export function resetMapView() {
    state.map.setView([35.03, 135.76], 13);
}

export function invalidateMapSize() {
    if (state.map) {
        state.map.invalidateSize();
    }
}
