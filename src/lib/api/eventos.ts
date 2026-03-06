import { supabase } from '../supabase';

export interface ObraEvento {
    id: string;
    obra_id: string;
    tipo: 'visita' | 'reunion';
    titulo: string;
    fecha_planificada: string;
    fecha_fin: string;
    frecuencia: string | null;
    estado: string;
    coordinador_id: string | null;
    created_at?: string;

    // Expanded Report Fields
    introduccion?: string | null;
    asistentes?: string | null;
    es_reunion_puntual?: boolean;
    orden_del_dia?: string | null;
    desarrollo_reunion?: string | null;
    ubicacion?: string | null;
    tipo_obra?: string | null;
    recurso_preventivo?: string | null;
    n_trabajadores?: string | null;
    trabajos_en_curso?: string | null;
    subcontratas?: string | null;
    unidades_ejecucion?: string | null;
    epis?: string | null;
    medios_auxiliares?: string | null;
    instalacion_electrica?: string | null;
    condiciones_ambientales?: string | null;
    organizacion_obra?: string | null;
    observaciones?: string | null;
    accidentes?: string | null;
    recordatorio?: string | null;
    planificacion_trabajos?: string | null;
    coordenadas?: string | null;
    fecha_hora?: string | null;
    fotos?: any[];
    firmas?: any[];
    adjuntos?: any[];
    acta_generada?: boolean;
    acta_generada_at?: string | null;
}

export interface VisitaConCoordenadas {
    id: string;
    obra_id: string;
    titulo: string;
    fecha_planificada: string | null;
    fecha_hora: string | null;
    ubicacion: string | null;
    coordenadas: string | null;
    estado: string;
    created_at?: string;
}

export const getEventos = async (obraId: string, tipo: 'visita' | 'reunion'): Promise<ObraEvento[]> => {
    const { data, error } = await supabase
        .from('obras_eventos')
        .select('*')
        .eq('obra_id', obraId)
        .eq('tipo', tipo)
        .order('fecha_planificada', { ascending: false });

    if (error) {
        console.error(`Error fetching eventos (${tipo}):`, error);
        throw error;
    }
    return data || [];
};

export const getVisitasConCoordenadas = async (): Promise<VisitaConCoordenadas[]> => {
    const { data, error } = await supabase
        .from('obras_eventos')
        .select('id, obra_id, titulo, fecha_planificada, fecha_hora, ubicacion, coordenadas, estado, created_at')
        .eq('tipo', 'visita')
        .not('coordenadas', 'is', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching visitas con coordenadas:', error);
        throw error;
    }
    return data || [];
};

export const createEvento = async (evento: Omit<ObraEvento, 'id' | 'created_at'>): Promise<ObraEvento> => {
    const { data, error } = await supabase
        .from('obras_eventos')
        .insert(evento)
        .select()
        .single();

    if (error) {
        console.error('Error creating evento:', error);
        throw error;
    }
    return data;
};

export const updateEvento = async (id: string, updates: Partial<ObraEvento>): Promise<void> => {
    const { error } = await supabase
        .from('obras_eventos')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error(`Error updating evento ${id}:`, error);
        throw error;
    }
};

export const deleteEvento = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('obras_eventos')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(`Error deleting evento ${id}:`, error);
        throw error;
    }
};
