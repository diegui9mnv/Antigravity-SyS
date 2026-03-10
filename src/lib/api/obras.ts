import { supabase } from '../supabase';

export interface Obra {
    id: string;
    denominacion: string;
    municipio: string | null;
    expediente: string | null;
    estado: string;
    codigo_obra: string | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    cebe: string | null;
    tipologia_cat: string | null;
    tipologia_sub: string | null;
    tipologia_tipo: string | null;
    tipologia: string | null;
    duracion_num: number | null;
    duracion_unidad: string | null;
    created_at?: string;
}

export const updateObraAgentes = async (id: string, agentes: any[]): Promise<void> => {
    const { error } = await supabase
        .from('obras')
        .update({ agentes })
        .eq('id', id);

    if (error) {
        console.error(`Error updating obra colaboradores ${id}:`, error);
        throw error;
    }
};

export const updateObraFields = async (id: string, fields: Record<string, any>): Promise<void> => {
    const { error } = await supabase
        .from('obras')
        .update(fields)
        .eq('id', id);

    if (error) {
        console.error(`Error updating obra fields ${id}:`, error);
        throw error;
    }
};

export const getObras = async (): Promise<Obra[]> => {
    const { data, error } = await supabase
        .from('obras')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching obras:', error);
        throw error;
    }
    return data || [];
};

export const getObraById = async (id: string) => {
    const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error(`Error fetching obra ${id}:`, error);
        throw error;
    }
    return data;
};

// Obtenemos también las relaciones (agentes paralelos)
export const getObraWithRelations = async (id: string) => {
    const [
        obraResult,
        contratistasResult,
        promotoresResult,
        coordinadoresResult,
        directoresResult,
        jefesResult
    ] = await Promise.all([
        supabase.from('obras').select('*').eq('id', id).single(),
        supabase.from('obras_contratistas').select('empresa_id').eq('obra_id', id),
        supabase.from('obras_promotores').select('empresa_id').eq('obra_id', id),
        supabase.from('obras_coordinadores').select('persona_id').eq('obra_id', id),
        supabase.from('obras_directores').select('persona_id').eq('obra_id', id),
        supabase.from('obras_jefes').select('persona_id').eq('obra_id', id)
    ]);

    if (obraResult.error) throw obraResult.error;

    return {
        ...obraResult.data,
        contratista_ids: contratistasResult.data?.map(d => d.empresa_id) || [],
        promotor_ids: promotoresResult.data?.map(d => d.empresa_id) || [],
        coordinador_sys_ids: coordinadoresResult.data?.map(d => d.persona_id) || [],
        director_obra_ids: directoresResult.data?.map(d => d.persona_id) || [],
        jefe_obra_ids: jefesResult.data?.map(d => d.persona_id) || []
    };
};


export const createObra = async (obraData: any, relations: any): Promise<Obra> => {
    // 1. Insertar la obra
    const { data: newObra, error: insertError } = await supabase
        .from('obras')
        .insert(obraData)
        .select()
        .single();

    if (insertError) {
        console.error('Error creating obra:', insertError);
        throw insertError;
    }

    const obraId = newObra.id;

    // 2. Insertar relaciones (muchos a muchos)
    await updateObraRelations(obraId, relations);

    return newObra;
};

export const updateObra = async (id: string, obraData: any, relations: any): Promise<Obra> => {
    // 1. Actualizar la obra
    const { data: updatedObra, error: updateError } = await supabase
        .from('obras')
        .update(obraData)
        .eq('id', id)
        .select()
        .single();

    if (updateError) {
        console.error(`Error updating obra ${id}:`, updateError);
        throw updateError;
    }

    // 2. Actualizar relaciones (borrar las viejas e insertar nuevas)
    // Para simplificar, borramos todas las relaciones de esta obra y las volvemos a insertar
    await Promise.all([
        supabase.from('obras_contratistas').delete().eq('obra_id', id),
        supabase.from('obras_promotores').delete().eq('obra_id', id),
        supabase.from('obras_coordinadores').delete().eq('obra_id', id),
        supabase.from('obras_directores').delete().eq('obra_id', id),
        supabase.from('obras_jefes').delete().eq('obra_id', id)
    ]);

    await updateObraRelations(id, relations);

    return updatedObra;
};

export const deleteObra = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('obras')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(`Error deleting obra ${id}:`, error);
        throw error;
    }
};

// Función auxiliar para insertar las relaciones
const updateObraRelations = async (obraId: string, relations: any) => {
    const promises = [];

    if (relations.contratistaId && relations.contratistaId.length > 0) {
        const data = relations.contratistaId.map((empId: string) => ({ obra_id: obraId, empresa_id: empId }));
        promises.push(supabase.from('obras_contratistas').insert(data));
    }
    if (relations.promotorId && relations.promotorId.length > 0) {
        const data = relations.promotorId.map((empId: string) => ({ obra_id: obraId, empresa_id: empId }));
        promises.push(supabase.from('obras_promotores').insert(data));
    }
    if (relations.coordinadorSysId && relations.coordinadorSysId.length > 0) {
        const data = relations.coordinadorSysId.map((perId: string) => ({ obra_id: obraId, persona_id: perId }));
        promises.push(supabase.from('obras_coordinadores').insert(data));
    }
    if (relations.directorObraId && relations.directorObraId.length > 0) {
        const data = relations.directorObraId.map((perId: string) => ({ obra_id: obraId, persona_id: perId }));
        promises.push(supabase.from('obras_directores').insert(data));
    }
    if (relations.jefeObraId && relations.jefeObraId.length > 0) {
        const data = relations.jefeObraId.map((perId: string) => ({ obra_id: obraId, persona_id: perId }));
        promises.push(supabase.from('obras_jefes').insert(data));
    }

    await Promise.all(promises);
};
