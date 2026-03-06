import { supabase } from '../supabase';

export interface Empresa {
    id: string;
    razon_social: string;
    direccion: string | null;
    telefono: string | null;
    correo: string | null;
    created_at?: string;
}

export interface Persona {
    id: string;
    nombre: string;
    apellidos: string | null;
    tipo: string | null;
    empresa_id: string | null;
    created_at?: string;
    empresa?: Empresa;
}

// EMPRESAS

export const getEmpresas = async (): Promise<Empresa[]> => {
    const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching empresas:', error);
        throw error;
    }
    return data || [];
};

export const getEmpresaById = async (id: string): Promise<Empresa | null> => {
    const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error(`Error fetching empresa ${id}:`, error);
        throw error;
    }
    return data;
};

export const createEmpresa = async (empresa: Omit<Empresa, 'id' | 'created_at'>): Promise<Empresa> => {
    const { data, error } = await supabase
        .from('empresas')
        .insert(empresa)
        .select()
        .single();

    if (error) {
        console.error('Error creating empresa:', error);
        throw error;
    }
    return data;
};

export const updateEmpresa = async (id: string, empresa: Partial<Omit<Empresa, 'id' | 'created_at'>>): Promise<Empresa> => {
    const { data, error } = await supabase
        .from('empresas')
        .update(empresa)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error(`Error updating empresa ${id}:`, error);
        throw error;
    }
    return data;
};

export const deleteEmpresa = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(`Error deleting empresa ${id}:`, error);
        throw error;
    }
};

// PERSONAS

export const getPersonas = async (): Promise<Persona[]> => {
    const { data, error } = await supabase
        .from('personas')
        .select(`
      *,
      empresa:empresas (
        id,
        razon_social
      )
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching personas:', error);
        throw error;
    }
    return data || [];
};

export const createPersona = async (persona: Omit<Persona, 'id' | 'created_at' | 'empresa'>): Promise<Persona> => {
    const { data, error } = await supabase
        .from('personas')
        .insert(persona)
        .select(`
      *,
      empresa:empresas (
        id,
        razon_social
      )
    `)
        .single();

    if (error) {
        console.error('Error creating persona:', error);
        throw error;
    }
    return data;
};

export const updatePersona = async (id: string, persona: Partial<Omit<Persona, 'id' | 'created_at' | 'empresa'>>): Promise<Persona> => {
    const { data, error } = await supabase
        .from('personas')
        .update(persona)
        .eq('id', id)
        .select(`
      *,
      empresa:empresas (
        id,
        razon_social
      )
    `)
        .single();

    if (error) {
        console.error(`Error updating persona ${id}:`, error);
        throw error;
    }
    return data;
};

export const deletePersona = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(`Error deleting persona ${id}:`, error);
        throw error;
    }
};
