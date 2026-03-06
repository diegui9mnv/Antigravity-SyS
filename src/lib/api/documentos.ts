import { supabase } from '../supabase';

export interface DocumentoMetaData {
    id: string;
    obra_id: string;
    category_id: string;
    file_name: string;
    file_path: string | null;
    file_size: number | null;
    file_type: string | null;
    upload_date: string | null;
    fecha_real: string | null;
    estado: string;
}

export const getDocumentos = async (obraId: string, categoryId: string): Promise<DocumentoMetaData[]> => {
    const { data, error } = await supabase
        .from('obras_archivos')
        .select('*')
        .eq('obra_id', obraId)
        .eq('category_id', categoryId)
        .order('upload_date', { ascending: false });

    if (error) {
        console.error('Error fetching documentos:', error);
        throw error;
    }
    return data || [];
};

export const getTodosDocumentos = async (obraId: string): Promise<DocumentoMetaData[]> => {
    const { data, error } = await supabase
        .from('obras_archivos')
        .select('*')
        .eq('obra_id', obraId)
        .order('upload_date', { ascending: false });

    if (error) {
        console.error('Error fetching all documentos:', error);
        throw error;
    }
    return data || [];
};

export const uploadDocumento = async (
    obraId: string,
    categoryId: string,
    file: File,
    estado: string = 'Actual',
    fechaReal?: string
): Promise<DocumentoMetaData> => {
    // 1. Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const filePath = `${obraId}/${categoryId}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file);

    if (uploadError) {
        console.error('Error uploading file to storage:', uploadError);
        console.error('Bucket: documentos, Path:', filePath);
        throw uploadError;
    }

    // 2. Insert metadata into database
    const metadata = {
        obra_id: obraId,
        category_id: categoryId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        fecha_real: fechaReal || new Date().toISOString().split('T')[0],
        estado: estado
    };

    const { data, error: dbError } = await supabase
        .from('obras_archivos')
        .insert(metadata)
        .select()
        .single();

    if (dbError) {
        console.error('Error saving document metadata:', dbError);
        // Idealmente, borraríamos el archivo de storage aquí si falla la BD
        throw dbError;
    }

    return data;
};

export const updateDocumentoMetadata = async (id: string, updates: Partial<DocumentoMetaData>): Promise<void> => {
    const { error } = await supabase
        .from('obras_archivos')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error(`Error updating document ${id}:`, error);
        throw error;
    }
};

export const deleteDocumento = async (id: string, filePath: string | null): Promise<void> => {
    // 1. Delete from database
    const { error: dbError } = await supabase
        .from('obras_archivos')
        .delete()
        .eq('id', id);

    if (dbError) {
        console.error(`Error deleting document metadata ${id}:`, dbError);
        throw dbError;
    }

    // 2. Delete from storage if it has a physical file
    if (filePath) {
        const { error: storageError } = await supabase.storage
            .from('documentos')
            .remove([filePath]);

        if (storageError) {
            console.error(`Error deleting physical file ${filePath}:`, storageError);
            // We don't throw here to not crash the UI if the DB was already deleted
        }
    }
};

// Utilidad para obtener la URL pública de un archivo
export const getDocumentoUrl = (filePath: string): string => {
    const { data } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

    return data.publicUrl;
};
