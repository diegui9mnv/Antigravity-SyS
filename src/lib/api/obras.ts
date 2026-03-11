import { supabase } from '../supabase';

export interface Obra {
    id: string;
    denominacion: string;
    municipio: string | null;
    expediente: string | null;
    pem: number | null;
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
    contratista_ids?: string[];
    coordinador_sys_ids?: string[];
    created_at?: string;
}

const STORAGE_REMOVE_BATCH_SIZE = 100;

const chunkItems = <T,>(items: T[], size: number): T[][] => {
    if (items.length === 0) return [];
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};

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
    const obras = data || [];
    if (obras.length === 0) return [];

    const obraIds = obras.map((o: any) => o.id);

    const [contratistasResult, coordinadoresResult] = await Promise.all([
        supabase
            .from('obras_contratistas')
            .select('obra_id, empresa_id')
            .in('obra_id', obraIds),
        supabase
            .from('obras_coordinadores')
            .select('obra_id, persona_id')
            .in('obra_id', obraIds)
    ]);

    if (contratistasResult.error) {
        console.error('Error fetching obras_contratistas:', contratistasResult.error);
        throw contratistasResult.error;
    }
    if (coordinadoresResult.error) {
        console.error('Error fetching obras_coordinadores:', coordinadoresResult.error);
        throw coordinadoresResult.error;
    }

    const contratistasByObra = (contratistasResult.data || []).reduce((acc: Record<string, string[]>, row: any) => {
        if (!acc[row.obra_id]) acc[row.obra_id] = [];
        acc[row.obra_id].push(row.empresa_id);
        return acc;
    }, {});

    const coordinadoresByObra = (coordinadoresResult.data || []).reduce((acc: Record<string, string[]>, row: any) => {
        if (!acc[row.obra_id]) acc[row.obra_id] = [];
        acc[row.obra_id].push(row.persona_id);
        return acc;
    }, {});

    return obras.map((obra: any) => ({
        ...obra,
        contratista_ids: contratistasByObra[obra.id] || [],
        coordinador_sys_ids: coordinadoresByObra[obra.id] || [],
    }));
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
    const { data: obraFiles, error: filesError } = await supabase
        .from('obras_archivos')
        .select('file_path')
        .eq('obra_id', id);

    if (filesError) {
        console.error(`Error loading files before deleting obra ${id}:`, filesError);
        throw filesError;
    }

    const filePaths = (obraFiles || [])
        .map((row: any) => row.file_path)
        .filter((path: any): path is string => typeof path === 'string' && path.length > 0);

    for (const batch of chunkItems(filePaths, STORAGE_REMOVE_BATCH_SIZE)) {
        const { error: removeError } = await supabase.storage
            .from('documentos')
            .remove(batch);

        if (removeError) {
            console.error(`Error removing storage files for obra ${id}:`, removeError);
            throw removeError;
        }
    }

    const cleanupResponses = await Promise.all([
        supabase.from('obras_eventos').delete().eq('obra_id', id),
        supabase.from('libro_subcontratas').delete().eq('obra_id', id),
        supabase.from('obras_archivos').delete().eq('obra_id', id),
        supabase.from('obras_contratistas').delete().eq('obra_id', id),
        supabase.from('obras_promotores').delete().eq('obra_id', id),
        supabase.from('obras_coordinadores').delete().eq('obra_id', id),
        supabase.from('obras_directores').delete().eq('obra_id', id),
        supabase.from('obras_jefes').delete().eq('obra_id', id)
    ]);

    const cleanupError = cleanupResponses.find((res: any) => res.error)?.error;
    if (cleanupError) {
        console.error(`Error cleaning related data for obra ${id}:`, cleanupError);
        throw cleanupError;
    }

    const { error: obraError } = await supabase
        .from('obras')
        .delete()
        .eq('id', id);

    if (obraError) {
        console.error(`Error deleting obra ${id}:`, obraError);
        throw obraError;
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
