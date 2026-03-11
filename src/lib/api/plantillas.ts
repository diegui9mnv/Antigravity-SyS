import { supabase } from '../supabase';

export interface PlantillaItem {
    id: string;
    categoryId: string;
    name: string;
    size: number;
    type: string;
    data: string; // data URL
    dateAdded: string;
}

const TABLE_NAME = 'plantillas';
const LOCAL_STORAGE_KEY = 'plantillas';

const isMissingTableError = (error: any): boolean => {
    const code = String(error?.code || '');
    const message = String(error?.message || '').toLowerCase();
    return (
        code === 'PGRST204' ||
        code === 'PGRST205' ||
        code === '42P01' ||
        message.includes('plantillas') ||
        message.includes('relation') ||
        message.includes('schema cache')
    );
};

const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsDataURL(file);
    });

const normalizePlantilla = (source: any, fallbackCategoryId: string): PlantillaItem => ({
    id: String(source?.id || `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    categoryId: String(source?.category_id || source?.categoryId || fallbackCategoryId),
    name: String(source?.name || source?.file_name || ''),
    size: Number(source?.size ?? source?.file_size ?? 0),
    type: String(source?.type || source?.file_type || 'application/octet-stream'),
    data: String(source?.data_url || source?.data || ''),
    dateAdded: String(source?.date_added || source?.dateAdded || new Date().toISOString()),
});

const getLocalStore = (): Record<string, any[]> => {
    if (typeof localStorage === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
};

const setLocalStore = (store: Record<string, any[]>) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
};

const getLocalPlantillasByCategory = (categoryId: string): PlantillaItem[] => {
    const store = getLocalStore();
    const rows = Array.isArray(store[categoryId]) ? store[categoryId] : [];
    return rows.map((row: any) => normalizePlantilla(row, categoryId));
};

const saveLocalPlantilla = (categoryId: string, plantilla: PlantillaItem): PlantillaItem => {
    const store = getLocalStore();
    if (!Array.isArray(store[categoryId])) store[categoryId] = [];
    store[categoryId].push({
        id: plantilla.id,
        name: plantilla.name,
        size: plantilla.size,
        type: plantilla.type,
        data: plantilla.data,
        dateAdded: plantilla.dateAdded,
    });
    setLocalStore(store);
    return plantilla;
};

const deleteLocalPlantilla = (categoryId: string, plantillaId: string): void => {
    const store = getLocalStore();
    if (!Array.isArray(store[categoryId])) return;
    store[categoryId] = store[categoryId].filter((row: any) => String(row?.id) !== String(plantillaId));
    setLocalStore(store);
};

export const getPlantillasByCategory = async (categoryId: string): Promise<PlantillaItem[]> => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('category_id', categoryId)
        .order('date_added', { ascending: false });

    if (error) {
        if (isMissingTableError(error)) {
            return getLocalPlantillasByCategory(categoryId);
        }
        console.error('Error fetching plantillas:', error);
        throw error;
    }

    return (data || [])
        .map((row: any) => normalizePlantilla(row, categoryId))
        .filter((row: PlantillaItem) => !!row.data);
};

export const savePlantilla = async (categoryId: string, file: File): Promise<PlantillaItem> => {
    const dataUrl = await fileToDataUrl(file);
    const payload = {
        category_id: categoryId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        data_url: dataUrl,
        date_added: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(payload)
        .select('*')
        .single();

    if (error) {
        if (isMissingTableError(error)) {
            return saveLocalPlantilla(
                categoryId,
                normalizePlantilla(
                    {
                        ...payload,
                        id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    },
                    categoryId
                )
            );
        }
        console.error('Error saving plantilla:', error);
        throw error;
    }

    return normalizePlantilla(data, categoryId);
};

export const deletePlantilla = async (categoryId: string, plantillaId: string): Promise<void> => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', plantillaId);

    if (error) {
        if (isMissingTableError(error)) {
            deleteLocalPlantilla(categoryId, plantillaId);
            return;
        }
        console.error('Error deleting plantilla:', error);
        throw error;
    }
};

export const plantillaToFile = async (plantilla: PlantillaItem): Promise<File> => {
    if (!plantilla?.data) {
        throw new Error('La plantilla no contiene datos para generar el archivo.');
    }
    const response = await fetch(plantilla.data);
    const blob = await response.blob();
    return new File([blob], plantilla.name || 'plantilla', {
        type: plantilla.type || blob.type || 'application/octet-stream',
    });
};

