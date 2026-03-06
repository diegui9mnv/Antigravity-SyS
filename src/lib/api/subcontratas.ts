import { supabase } from '../supabase';

export interface LibroSubcontrataEntry {
    id: string;
    obra_id: string;
    subcontrata_id: string | null;
    comitente_id: string | null;
    nivel: number;
    orden_comitente: string | null;
    created_at?: string;
}

export const getLibroSubcontratas = async (obraId: string): Promise<LibroSubcontrataEntry[]> => {
    const { data, error } = await supabase
        .from('libro_subcontratas')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: true }); // By default sort by creation

    if (error) {
        console.error('Error fetching libro subcontratas:', error);
        throw error;
    }
    return data || [];
};

export const createLibroEntry = async (entry: Omit<LibroSubcontrataEntry, 'id' | 'created_at'>): Promise<LibroSubcontrataEntry> => {
    const payload = {
        obra_id: entry.obra_id,
        subcontrata_id: entry.subcontrata_id,
        comitente_id: entry.comitente_id,
        nivel: entry.nivel,
        orden_comitente: entry.orden_comitente ?? null,
    };

    const { data, error } = await supabase
        .from('libro_subcontratas')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error('Error creating libro entry:', error);
        throw error;
    }
    return data;
};

export const updateLibroEntry = async (id: string, updates: Partial<LibroSubcontrataEntry>): Promise<void> => {
    const { error } = await supabase
        .from('libro_subcontratas')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error(`Error updating libro entry ${id}:`, error);
        throw error;
    }
};

export const deleteLibroEntry = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('libro_subcontratas')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(`Error deleting libro entry ${id}:`, error);
        throw error;
    }
};
