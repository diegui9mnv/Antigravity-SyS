import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Clock3, Filter, MapPinned, Search } from 'lucide-react';
import { Button } from '../components/ui';
import { getObras, type Obra } from '../lib/api/obras';
import { getVisitasConCoordenadas, type VisitaConCoordenadas } from '../lib/api/eventos';

declare global {
    interface Window {
        L?: any;
    }
}

type MarkerData = {
    id: string;
    obraId: string;
    obraDenominacion: string;
    obraMunicipio: string;
    titulo: string;
    ubicacion: string;
    coordenadasRaw: string;
    lat: number;
    lng: number;
    timestamp: number;
    fechaLabel: string;
};

const DEFAULT_CENTER: [number, number] = [40.4168, -3.7038];
const DEFAULT_ZOOM = 6;
const LEAFLET_CSS_ID = 'leaflet-css-cdn';
const LEAFLET_JS_ID = 'leaflet-js-cdn';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

const parseCoordinates = (value: string | null | undefined): { lat: number; lng: number } | null => {
    if (!value) return null;
    const numbers = value
        .replace(';', ',')
        .match(/-?\d+(?:[.,]\d+)?/g);

    if (!numbers || numbers.length < 2) return null;

    const lat = Number(numbers[0].replace(',', '.'));
    const lng = Number(numbers[1].replace(',', '.'));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

    return { lat, lng };
};

const toTimestamp = (visita: VisitaConCoordenadas): number => {
    const raw = visita.fecha_hora || visita.fecha_planificada || visita.created_at;
    if (!raw) return 0;
    const parsed = new Date(raw).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
};

const formatDate = (visita: VisitaConCoordenadas): string => {
    const raw = visita.fecha_hora || visita.fecha_planificada || visita.created_at;
    if (!raw) return 'Sin fecha';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

const escapeHtml = (text: string): string => (
    text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
);

export default function ProjectsLocation() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedObraId = searchParams.get('obraId');
    const mapElementRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const markerLayerRef = useRef<any>(null);

    const [isLeafletReady, setIsLeafletReady] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [obras, setObras] = useState<Obra[]>([]);
    const [visitas, setVisitas] = useState<VisitaConCoordenadas[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedObraIds, setSelectedObraIds] = useState<string[]>([]);
    const [mapMode, setMapMode] = useState<'selected' | 'latest'>('selected');

    useEffect(() => {
        let cancelled = false;
        const onScriptLoaded = () => {
            if (!cancelled) setIsLeafletReady(true);
        };
        const onScriptError = () => {
            if (!cancelled) {
                setLoadError('No se pudo cargar el motor del mapa (Leaflet).');
                setIsLeafletReady(false);
            }
        };

        if (window.L) {
            onScriptLoaded();
            return () => {
                cancelled = true;
            };
        }

        if (!document.getElementById(LEAFLET_CSS_ID)) {
            const css = document.createElement('link');
            css.id = LEAFLET_CSS_ID;
            css.rel = 'stylesheet';
            css.href = LEAFLET_CSS_URL;
            css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
            css.crossOrigin = '';
            document.head.appendChild(css);
        }

        const existingScript = document.getElementById(LEAFLET_JS_ID) as HTMLScriptElement | null;
        if (existingScript) {
            existingScript.addEventListener('load', onScriptLoaded);
            existingScript.addEventListener('error', onScriptError);
            return () => {
                cancelled = true;
                existingScript.removeEventListener('load', onScriptLoaded);
                existingScript.removeEventListener('error', onScriptError);
            };
        }

        const script = document.createElement('script');
        script.id = LEAFLET_JS_ID;
        script.src = LEAFLET_JS_URL;
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.async = true;
        script.addEventListener('load', onScriptLoaded);
        script.addEventListener('error', onScriptError);
        document.body.appendChild(script);

        return () => {
            cancelled = true;
            script.removeEventListener('load', onScriptLoaded);
            script.removeEventListener('error', onScriptError);
        };
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setIsLoadingData(true);
            setLoadError(null);
            try {
                const [obrasData, visitasData] = await Promise.all([getObras(), getVisitasConCoordenadas()]);
                setObras(obrasData);
                setVisitas(visitasData);
            } catch (err) {
                console.error(err);
                setLoadError('No se pudieron cargar las obras y visitas para el mapa.');
            } finally {
                setIsLoadingData(false);
            }
        };
        loadData();
    }, []);

    const obraById = useMemo(() => {
        const map = new Map<string, Obra>();
        obras.forEach((obra) => map.set(obra.id, obra));
        return map;
    }, [obras]);

    const allMarkers = useMemo<MarkerData[]>(() => (
        visitas
            .map((visita) => {
                const coords = parseCoordinates(visita.coordenadas);
                if (!coords) return null;

                const obra = obraById.get(visita.obra_id);
                const denominacion = obra?.denominacion || 'Obra sin denominación';
                const municipio = obra?.municipio || '';

                return {
                    id: visita.id,
                    obraId: visita.obra_id,
                    obraDenominacion: denominacion,
                    obraMunicipio: municipio,
                    titulo: visita.titulo || 'Visita sin título',
                    ubicacion: visita.ubicacion || '',
                    coordenadasRaw: visita.coordenadas || `${coords.lat}, ${coords.lng}`,
                    lat: coords.lat,
                    lng: coords.lng,
                    timestamp: toTimestamp(visita),
                    fechaLabel: formatDate(visita),
                };
            })
            .filter((marker): marker is MarkerData => marker !== null)
    ), [visitas, obraById]);

    const filteredObras = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return obras;
        return obras.filter((obra) => (
            (obra.denominacion || '').toLowerCase().includes(term)
            || (obra.municipio || '').toLowerCase().includes(term)
            || (obra.expediente || '').toLowerCase().includes(term)
        ));
    }, [obras, searchTerm]);

    useEffect(() => {
        if (!preselectedObraId || obras.length === 0) return;
        if (!obras.some((obra) => obra.id === preselectedObraId)) return;
        setMapMode('selected');
        setSelectedObraIds([preselectedObraId]);
    }, [preselectedObraId, obras]);

    const visibleMarkers = useMemo(() => {
        if (mapMode === 'latest') {
            const latestByObra = new Map<string, MarkerData>();
            allMarkers.forEach((marker) => {
                const current = latestByObra.get(marker.obraId);
                if (!current || marker.timestamp > current.timestamp) {
                    latestByObra.set(marker.obraId, marker);
                }
            });
            return Array.from(latestByObra.values()).sort((a, b) => b.timestamp - a.timestamp);
        }
        if (selectedObraIds.length === 0) return [];
        const selected = new Set(selectedObraIds);
        return allMarkers.filter((marker) => selected.has(marker.obraId));
    }, [allMarkers, mapMode, selectedObraIds]);

    useEffect(() => {
        if (!isLeafletReady || !mapElementRef.current || mapRef.current || !window.L) return;

        const map = window.L.map(mapElementRef.current, {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            zoomControl: true,
        });

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        mapRef.current = map;
        markerLayerRef.current = window.L.layerGroup().addTo(map);

        setTimeout(() => map.invalidateSize(), 0);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerLayerRef.current = null;
            }
        };
    }, [isLeafletReady]);

    useEffect(() => {
        if (!mapRef.current || !markerLayerRef.current || !window.L) return;

        const layer = markerLayerRef.current;
        layer.clearLayers();

        if (visibleMarkers.length === 0) {
            mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
            return;
        }

        visibleMarkers.forEach((marker) => {
            const markerColor = mapMode === 'latest' ? '#ef4444' : '#0077b6';
            const leafletMarker = window.L.circleMarker([marker.lat, marker.lng], {
                radius: 7,
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.9,
                weight: 2,
            });

            const tooltipHtml = [
                `<strong>${escapeHtml(marker.obraDenominacion)}</strong>`,
                `Visita: ${escapeHtml(marker.titulo)}`,
                `Fecha: ${escapeHtml(marker.fechaLabel)}`,
                marker.ubicacion ? `Ubicación: ${escapeHtml(marker.ubicacion)}` : '',
                `Coordenadas: ${escapeHtml(marker.coordenadasRaw)}`,
            ].filter(Boolean).join('<br />');

            leafletMarker.bindTooltip(tooltipHtml, {
                direction: 'top',
                sticky: true,
                opacity: 0.95,
            });
            leafletMarker.addTo(layer);
        });

        if (visibleMarkers.length === 1) {
            const only = visibleMarkers[0];
            mapRef.current.setView([only.lat, only.lng], 15);
            return;
        }

        const bounds = window.L.latLngBounds(visibleMarkers.map((m) => [m.lat, m.lng]));
        mapRef.current.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
    }, [visibleMarkers, mapMode]);

    const toggleObraSelection = (obraId: string, checked: boolean) => {
        setMapMode('selected');
        setSelectedObraIds((prev) => {
            if (checked) {
                if (prev.includes(obraId)) return prev;
                return [...prev, obraId];
            }
            return prev.filter((id) => id !== obraId);
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex justify-between items-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Localización de Obras</h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                        Visualiza las coordenadas de visitas por obra o la última visita de cada obra.
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/')}>
                    <ArrowLeft size={16} />
                    Volver a Gestión de Obras
                </Button>
            </div>

            <div
                className="projects-location-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: '320px minmax(0, 1fr)',
                    gap: '1rem',
                    alignItems: 'start',
                }}
            >
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={16} />
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Filtros de mapa</h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <Button
                                variant={mapMode === 'selected' ? 'primary' : 'outline'}
                                onClick={() => setMapMode('selected')}
                            >
                                <Building2 size={16} />
                                Obras
                            </Button>
                            <Button
                                variant={mapMode === 'latest' ? 'primary' : 'outline'}
                                onClick={() => setMapMode('latest')}
                            >
                                <Clock3 size={16} />
                                Últimas visitas
                            </Button>
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="input-label">Buscar obra</label>
                            <div style={{ position: 'relative' }}>
                                <Search
                                    size={16}
                                    style={{
                                        position: 'absolute',
                                        left: '0.75rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text-muted)',
                                    }}
                                />
                                <input
                                    className="input-field"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Denominación, municipio o expediente..."
                                    style={{ width: '100%', paddingLeft: '2.25rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {filteredObras.length} obra(s) visibles
                            </p>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                                onClick={() => setSelectedObraIds([])}
                            >
                                Limpiar selección
                            </button>
                        </div>

                        <div
                            style={{
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                maxHeight: '55vh',
                                overflowY: 'auto',
                                backgroundColor: 'white',
                            }}
                        >
                            {filteredObras.length === 0 ? (
                                <p style={{ margin: 0, padding: '0.75rem', color: 'var(--text-muted)' }}>
                                    No hay obras que coincidan con el filtro.
                                </p>
                            ) : (
                                filteredObras.map((obra) => (
                                    <label
                                        key={obra.id}
                                        style={{
                                            display: 'flex',
                                            gap: '0.5rem',
                                            alignItems: 'flex-start',
                                            padding: '0.65rem 0.75rem',
                                            borderBottom: '1px solid var(--border-color)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedObraIds.includes(obra.id)}
                                            onChange={(e) => toggleObraSelection(obra.id, e.target.checked)}
                                            style={{ marginTop: '0.2rem', accentColor: 'var(--color-primary)' }}
                                        />
                                        <div style={{ minWidth: 0 }}>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontWeight: 600,
                                                    color: 'var(--color-primary-dark)',
                                                    lineHeight: 1.3,
                                                }}
                                            >
                                                {obra.denominacion}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                {obra.municipio || 'Sin municipio'} {obra.expediente ? `• ${obra.expediente}` : ''}
                                            </p>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="card" style={{ minHeight: '72vh' }}>
                    <div
                        className="card-header"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            flexWrap: 'wrap',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPinned size={16} />
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Mapa de visitas</h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Mostrando {visibleMarkers.length} punto(s)
                        </p>
                    </div>

                    <div className="card-body" style={{ height: 'calc(72vh - 84px)', position: 'relative', padding: '0.75rem' }}>
                        {loadError && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: '0.75rem',
                                    zIndex: 3,
                                    backgroundColor: 'rgba(255,255,255,0.95)',
                                    border: '1px solid #fecaca',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    color: '#b91c1c',
                                    padding: '1rem',
                                }}
                            >
                                {loadError}
                            </div>
                        )}

                        {!loadError && (isLoadingData || !isLeafletReady) && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: '0.75rem',
                                    zIndex: 2,
                                    backgroundColor: 'rgba(255,255,255,0.92)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                Cargando mapa y datos...
                            </div>
                        )}

                        {!loadError && isLeafletReady && !isLoadingData && visibleMarkers.length === 0 && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: '0.75rem',
                                    zIndex: 1,
                                    backgroundColor: 'rgba(255,255,255,0.68)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    pointerEvents: 'none',
                                    padding: '1rem',
                                }}
                            >
                                Selecciona una o varias obras en el panel izquierdo, o pulsa "Últimas visitas".
                            </div>
                        )}

                        <div
                            ref={mapElementRef}
                            style={{
                                width: '100%',
                                height: '100%',
                                minHeight: '420px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                overflow: 'hidden',
                            }}
                        />
                    </div>
                </div>
            </div>

            <style>{`
                @media (max-width: 1050px) {
                    .projects-location-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
