import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import L from 'leaflet';
import { LatLng, MAP_BOUNDS } from '../geo';

export interface MarkerSpec {
  id: string;
  pos: LatLng;
  html: string;
  onClick?: () => void;
  z?: number;
}

export interface LineSpec {
  points: LatLng[];
  color: string;
  weight: number;
  opacity: number;
  dash?: string;
  round?: boolean;
}

export interface GeoMapHandle {
  fit: () => void;
}

interface Props {
  markers: MarkerSpec[];
  lines?: LineSpec[];
  className?: string;
  // 取景边距：左、上、右、下，用于避开叠加在地图上的面板
  padding?: [number, number, number, number];
}

// 基于 OpenStreetMap 标准底图的 Leaflet 容器，标记和线由调用方提供
export const GeoMap = forwardRef<GeoMapHandle, Props>(function GeoMap({ markers, lines = [], className = '', padding = [16, 16, 16, 16] }, ref) {
  const padRef = useRef(padding);
  padRef.current = padding;
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const lineLayer = useRef<L.LayerGroup | null>(null);

  const fit = () => {
    map.current?.invalidateSize();
    const p = padRef.current;
    map.current?.fitBounds(MAP_BOUNDS, { paddingTopLeft: [p[0], p[1]], paddingBottomRight: [p[2], p[3]] });
  };
  useImperativeHandle(ref, () => ({ fit }));

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomSnap: 0.25, zoomDelta: 0.5, zoomControl: false, attributionControl: true });
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(m);
    lineLayer.current = L.layerGroup().addTo(m);
    markerLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    map.current = m;
    let fitted = false;
    const ro = new ResizeObserver(() => {
      m.invalidateSize();
      if (!fitted && el.current && el.current.clientWidth > 0) {
        fitted = true;
        fit();
      }
    });
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = lineLayer.current;
    if (!layer) return;
    layer.clearLayers();
    lines.forEach((l) =>
      L.polyline(l.points, {
        color: l.color,
        weight: l.weight,
        opacity: l.opacity,
        dashArray: l.dash,
        lineCap: l.round ? 'round' : 'butt',
        lineJoin: 'round',
        interactive: false,
      }).addTo(layer),
    );
  });

  useEffect(() => {
    const layer = markerLayer.current;
    if (!layer) return;
    layer.clearLayers();
    markers.forEach((s) => {
      const mk = L.marker(s.pos, {
        icon: L.divIcon({ className: 'geo-icon', html: s.html, iconSize: [30, 30], iconAnchor: [15, 15] }),
        interactive: !!s.onClick,
        keyboard: false,
        zIndexOffset: s.z ?? 0,
      });
      if (s.onClick) {
        const cb = s.onClick;
        mk.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          cb();
        });
      }
      mk.addTo(layer);
    });
  });

  return <div ref={el} className={`isolate ${className}`} style={{ width: '100%', height: '100%' }} />;
});
