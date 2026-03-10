import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Search } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Badge, Button } from '../components/ui';
import { getObras, type Obra } from '../lib/api/obras';
import { getDocumentosByObraIds, type DocumentoMetaData } from '../lib/api/documentos';

type Filters = {
    denominacion: string;
    municipio: string;
    expediente: string;
    cebe: string;
    estado: string;
};

type TemplateRowData = {
    planPrograma: string;
    municipio: string;
    nombreObra: string;
    estadoObra: string;
    fechaPropuestaCss: string;
    designacionCss: string;
    entradaPss1: string;
    entradaPss2: string;
    entradaPss3: string;
    infModPss1: string;
    infModPss2: string;
    infModPss3: string;
    entradaProyPli: string;
    estudio: string;
    infFavorable: string;
    aperturaCt: string;
    lSub: string;
    decretoAprobacion: string;
    fechaJefeObra: string;
    fechaRecursoPrev: string;
    lcaoPer: string;
    lcaoMaq: string;
    rea: string;
    entradaAnexosPss: string;
    lInc: string;
    fechaComienzo: string;
    fechaFin: string;
    actaRecepcion: string;
    actaReplanteo: string;
};

const TEMPLATE_URL = '/templates/tabla-global-seguimiento.xlsx';
const SHEET_PATH = 'xl/worksheets/sheet1.xml';
const SHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const DATA_START_ROW = 5;
const DATA_END_ROW = 68;
const MAX_TEMPLATE_ROWS = DATA_END_ROW - DATA_START_ROW + 1;
const MIN_HEIGHT = 20;
const CHARS_PER_LINE = 60;
const HEIGHT_PER_LINE = 5;
const MAX_HEIGHT = 1000;

const COLUMN = {
    PLAN_PROGRAMA: 'D',
    MUNICIPIO: 'E',
    NOMBRE_OBRA: 'F',
    ESTADO_OBRA: 'N',
    FECHA_PROPUESTA_CSS: 'O',
    DESIGNACION_CSS: 'P',
    ENTRADA_PROY_PLI: 'Q',
    ESTUDIO: 'R',
    ENTRADA_PSS_1: 'S',
    INF_MOD_PSS_1: 'T',
    ENTRADA_PSS_2: 'U',
    INF_MOD_PSS_2: 'V',
    ENTRADA_PSS_3: 'W',
    INF_MOD_PSS_3: 'X',
    ENTRADA_ANEXOS_PSS: 'Y',
    INF_FAVORABLE: 'Z',
    DECRETO_APROBACION: 'AA',
    L_INC: 'AB',
    ACTA_REPLANTEO: 'AC',
    FECHA_COMIENZO: 'AD',
    APERTURA_CT: 'AE',
    REA: 'AF',
    L_SUB: 'AG',
    FECHA_JEFE_OBRA: 'AH',
    FECHA_RECURSO_PREV: 'AI',
    LCAO_PER: 'AJ',
    LCAO_MAQ: 'AK',
    ACTA_RECEPCION: 'AL',
    FECHA_FIN: 'AM',
} as const;

const CATEGORY_ALIASES = {
    propuestaCss: ['propuesta'],
    designacionCss: ['designacion'],
    entradaPss: ['cat-pss-anexos', 'pss-anexos', 'entrada-pss-dgp'],
    infModPss: ['inf-mod', 'inf-mod-pss-dgp'],
    entradaProyPli: ['completo', 'presupuesto', 'memoria', 'planos', 'entrada-proy-pli'],
    estudio: ['ess-ebss-cat', 'estudio'],
    infFavorable: ['inf-fav', 'inf-favorable'],
    aperturaCt: ['apertura', 'apertura-ct'],
    lSub: ['libro', 'l-sub', 'cat-libro-subcontrata'],
    decretoAprobacion: ['cat-acta-aprobacion', 'decreto-aprobacion-pss-dgp'],
    lInc: ['l-inc', 'cat-l-inc', 'libro-incidencias'],
    fechaJefeObra: ['cat-jefe-obra', 'jefe-obra', 'fecha-jefe-obra'],
    fechaRecursoPrev: ['cat-recurso-prev', 'recurso-prev', 'fecha-recurso-prev'],
    lcaoPer: ['cat-lcao-per', 'lcao-per'],
    lcaoMaq: ['cat-lcao-maq', 'lcao-maq'],
    rea: ['cat-rea', 'rea'],
    actaRecepcion: ['acta-rec', 'acta-recepcion'],
    actaReplanteo: ['acta-rep-cat', 'acta-replanteo'],
} as const;

const normalizeObraStatus = (status: string | null | undefined): 'solicitud' | 'preparacion' | 'completada' => {
    const value = (status || '').trim().toLowerCase();
    if (value === 'completada') return 'completada';
    if (value === 'preparacion' || value === 'preparación' || value === 'en curso') return 'preparacion';
    return 'solicitud';
};

const formatObraStatus = (status: string | null | undefined): string => {
    const normalized = normalizeObraStatus(status);
    if (normalized === 'preparacion') return 'Preparación';
    if (normalized === 'completada') return 'Completada';
    return 'Solicitud';
};

const badgeStatusForObra = (status: string | null | undefined): 'solicitud' | 'en curso' | 'completada' => {
    const normalized = normalizeObraStatus(status);
    return normalized === 'preparacion' ? 'en curso' : normalized;
};

const normalizeCategoryId = (value: string | null | undefined): string => (
    (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
);

const parseDocDate = (doc: DocumentoMetaData): Date | null => {
    const raw = doc.fecha_real || doc.upload_date;
    if (!raw) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const formatDate = (date: Date): string => date.toLocaleDateString('es-ES');

const formatObraDate = (raw: string | null | undefined): string => {
    if (!raw) return '';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return formatDate(parsed);
};

const getDatesByAliases = (docs: DocumentoMetaData[], aliases: readonly string[]): Date[] => {
    const aliasSet = new Set(aliases.map(normalizeCategoryId));
    const unique = new Map<string, Date>();

    docs.forEach((doc) => {
        const normalizedCat = normalizeCategoryId(doc.category_id);
        if (!aliasSet.has(normalizedCat)) return;
        const parsed = parseDocDate(doc);
        if (!parsed) return;
        unique.set(toDateKey(parsed), parsed);
    });

    return Array.from(unique.values()).sort((a, b) => a.getTime() - b.getTime());
};

const getOldestAt = (dates: Date[], idx: number): string => (dates[idx] ? formatDate(dates[idx]) : '');

const getLatest = (dates: Date[]): string => {
    if (dates.length === 0) return '';
    return formatDate(dates[dates.length - 1]);
};

const getAllAsText = (dates: Date[]): string => dates.map(formatDate).join(' | ');

const buildTemplateRowData = (obra: Obra, docs: DocumentoMetaData[]): TemplateRowData => {
    const propuestaDates = getDatesByAliases(docs, CATEGORY_ALIASES.propuestaCss);
    const designacionDates = getDatesByAliases(docs, CATEGORY_ALIASES.designacionCss);
    const entradaPssDates = getDatesByAliases(docs, CATEGORY_ALIASES.entradaPss);
    const infModPssDates = getDatesByAliases(docs, CATEGORY_ALIASES.infModPss);

    return {
        planPrograma: obra.expediente || '',
        municipio: obra.municipio || '',
        nombreObra: obra.denominacion || '',
        estadoObra: formatObraStatus(obra.estado),
        fechaPropuestaCss: getAllAsText(propuestaDates),
        designacionCss: getAllAsText(designacionDates),
        entradaPss1: getOldestAt(entradaPssDates, 0),
        entradaPss2: getOldestAt(entradaPssDates, 1),
        entradaPss3: getOldestAt(entradaPssDates, 2),
        infModPss1: getOldestAt(infModPssDates, 0),
        infModPss2: getOldestAt(infModPssDates, 1),
        infModPss3: getOldestAt(infModPssDates, 2),
        entradaProyPli: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.entradaProyPli)),
        estudio: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.estudio)),
        infFavorable: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.infFavorable)),
        aperturaCt: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.aperturaCt)),
        lSub: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.lSub)),
        decretoAprobacion: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.decretoAprobacion)),
        fechaJefeObra: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.fechaJefeObra)),
        fechaRecursoPrev: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.fechaRecursoPrev)),
        lcaoPer: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.lcaoPer)),
        lcaoMaq: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.lcaoMaq)),
        rea: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.rea)),
        entradaAnexosPss: getLatest(entradaPssDates),
        lInc: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.lInc)),
        fechaComienzo: formatObraDate(obra.fecha_inicio),
        fechaFin: formatObraDate(obra.fecha_fin),
        actaRecepcion: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.actaRecepcion)),
        actaReplanteo: getLatest(getDatesByAliases(docs, CATEGORY_ALIASES.actaReplanteo)),
    };
};

const findRowElement = (sheetData: Element, rowNumber: number): Element | null => {
    const rows = Array.from(sheetData.getElementsByTagNameNS(SHEET_NS, 'row'));
    return rows.find((row) => Number(row.getAttribute('r')) === rowNumber) || null;
};

const findCellElement = (rowElement: Element, cellRef: string): Element | null => {
    const cells = Array.from(rowElement.getElementsByTagNameNS(SHEET_NS, 'c'));
    return cells.find((cell) => cell.getAttribute('r') === cellRef) || null;
};

const setCellTextValue = (doc: XMLDocument, rowElement: Element, cellRef: string, value: string) => {
    const cell = findCellElement(rowElement, cellRef);
    if (!cell) return;

    while (cell.firstChild) {
        cell.removeChild(cell.firstChild);
    }

    if (!value) {
        cell.removeAttribute('t');
        return;
    }

    cell.setAttribute('t', 'inlineStr');
    const isElement = doc.createElementNS(SHEET_NS, 'is');
    const tElement = doc.createElementNS(SHEET_NS, 't');
    tElement.textContent = value;
    isElement.appendChild(tElement);
    cell.appendChild(isElement);
};

const applyRowHeightFromValues = (rowElement: Element, values: string[]) => {
    const maxTextLength = values.reduce((max, value) => Math.max(max, (value || '').length), 0);
    if (maxTextLength === 0) return;

    const estimatedLines = Math.max(1, Math.ceil(maxTextLength / CHARS_PER_LINE));
    let newHeight = estimatedLines * HEIGHT_PER_LINE;
    if (newHeight < MIN_HEIGHT) newHeight = MIN_HEIGHT;
    if (newHeight > MAX_HEIGHT) newHeight = MAX_HEIGHT;

    const currentHeight = Number(rowElement.getAttribute('ht') || 0);
    if (!Number.isFinite(currentHeight) || newHeight > currentHeight) {
        rowElement.setAttribute('ht', String(newHeight));
        rowElement.setAttribute('customHeight', '1');
    }
};

const writeTemplateRow = (doc: XMLDocument, rowElement: Element, data: TemplateRowData | null) => {
    const value = data || {
        planPrograma: '', municipio: '', nombreObra: '', estadoObra: '',
        fechaPropuestaCss: '', designacionCss: '', entradaPss1: '', entradaPss2: '', entradaPss3: '',
        infModPss1: '', infModPss2: '', infModPss3: '', entradaProyPli: '', estudio: '', infFavorable: '',
        aperturaCt: '', lSub: '', decretoAprobacion: '', fechaJefeObra: '', fechaRecursoPrev: '', lcaoPer: '',
        lcaoMaq: '', rea: '', entradaAnexosPss: '', lInc: '', fechaComienzo: '', fechaFin: '',
        actaRecepcion: '', actaReplanteo: '',
    };

    const rowNumber = Number(rowElement.getAttribute('r'));
    setCellTextValue(doc, rowElement, `${COLUMN.PLAN_PROGRAMA}${rowNumber}`, value.planPrograma);
    setCellTextValue(doc, rowElement, `${COLUMN.MUNICIPIO}${rowNumber}`, value.municipio);
    setCellTextValue(doc, rowElement, `${COLUMN.NOMBRE_OBRA}${rowNumber}`, value.nombreObra);
    setCellTextValue(doc, rowElement, `${COLUMN.ESTADO_OBRA}${rowNumber}`, value.estadoObra);
    setCellTextValue(doc, rowElement, `${COLUMN.FECHA_PROPUESTA_CSS}${rowNumber}`, value.fechaPropuestaCss);
    setCellTextValue(doc, rowElement, `${COLUMN.DESIGNACION_CSS}${rowNumber}`, value.designacionCss);
    setCellTextValue(doc, rowElement, `${COLUMN.ENTRADA_PSS_1}${rowNumber}`, value.entradaPss1);
    setCellTextValue(doc, rowElement, `${COLUMN.ENTRADA_PSS_2}${rowNumber}`, value.entradaPss2);
    setCellTextValue(doc, rowElement, `${COLUMN.ENTRADA_PSS_3}${rowNumber}`, value.entradaPss3);
    setCellTextValue(doc, rowElement, `${COLUMN.INF_MOD_PSS_1}${rowNumber}`, value.infModPss1);
    setCellTextValue(doc, rowElement, `${COLUMN.INF_MOD_PSS_2}${rowNumber}`, value.infModPss2);
    setCellTextValue(doc, rowElement, `${COLUMN.INF_MOD_PSS_3}${rowNumber}`, value.infModPss3);
    setCellTextValue(doc, rowElement, `${COLUMN.ENTRADA_ANEXOS_PSS}${rowNumber}`, value.entradaAnexosPss);
    setCellTextValue(doc, rowElement, `${COLUMN.ENTRADA_PROY_PLI}${rowNumber}`, value.entradaProyPli);
    setCellTextValue(doc, rowElement, `${COLUMN.ESTUDIO}${rowNumber}`, value.estudio);
    setCellTextValue(doc, rowElement, `${COLUMN.INF_FAVORABLE}${rowNumber}`, value.infFavorable);
    setCellTextValue(doc, rowElement, `${COLUMN.L_INC}${rowNumber}`, value.lInc);
    setCellTextValue(doc, rowElement, `${COLUMN.APERTURA_CT}${rowNumber}`, value.aperturaCt);
    setCellTextValue(doc, rowElement, `${COLUMN.FECHA_COMIENZO}${rowNumber}`, value.fechaComienzo);
    setCellTextValue(doc, rowElement, `${COLUMN.L_SUB}${rowNumber}`, value.lSub);
    setCellTextValue(doc, rowElement, `${COLUMN.DECRETO_APROBACION}${rowNumber}`, value.decretoAprobacion);
    setCellTextValue(doc, rowElement, `${COLUMN.FECHA_JEFE_OBRA}${rowNumber}`, value.fechaJefeObra);
    setCellTextValue(doc, rowElement, `${COLUMN.FECHA_RECURSO_PREV}${rowNumber}`, value.fechaRecursoPrev);
    setCellTextValue(doc, rowElement, `${COLUMN.LCAO_PER}${rowNumber}`, value.lcaoPer);
    setCellTextValue(doc, rowElement, `${COLUMN.LCAO_MAQ}${rowNumber}`, value.lcaoMaq);
    setCellTextValue(doc, rowElement, `${COLUMN.REA}${rowNumber}`, value.rea);
    setCellTextValue(doc, rowElement, `${COLUMN.ACTA_RECEPCION}${rowNumber}`, value.actaRecepcion);
    setCellTextValue(doc, rowElement, `${COLUMN.ACTA_REPLANTEO}${rowNumber}`, value.actaReplanteo);
    setCellTextValue(doc, rowElement, `${COLUMN.FECHA_FIN}${rowNumber}`, value.fechaFin);

    applyRowHeightFromValues(rowElement, [
        value.planPrograma,
        value.municipio,
        value.nombreObra,
        value.estadoObra,
        value.fechaPropuestaCss,
        value.designacionCss,
        value.entradaPss1,
        value.entradaPss2,
        value.entradaPss3,
        value.infModPss1,
        value.infModPss2,
        value.infModPss3,
        value.entradaAnexosPss,
        value.entradaProyPli,
        value.estudio,
        value.infFavorable,
        value.decretoAprobacion,
        value.lInc,
        value.fechaComienzo,
        value.aperturaCt,
        value.rea,
        value.lSub,
        value.fechaJefeObra,
        value.fechaRecursoPrev,
        value.lcaoPer,
        value.lcaoMaq,
        value.actaRecepcion,
        value.actaReplanteo,
        value.fechaFin,
    ]);
};

const buildWorkbookFromTemplate = async (templateBuffer: ArrayBuffer, rowsData: TemplateRowData[]): Promise<Blob> => {
    const zip = await JSZip.loadAsync(templateBuffer);
    const sheetFile = zip.file(SHEET_PATH);
    if (!sheetFile) {
        throw new Error('No se encontró la hoja principal en la plantilla.');
    }

    const sheetXml = await sheetFile.async('string');
    const parser = new DOMParser();
    const sheetDoc = parser.parseFromString(sheetXml, 'application/xml');
    const sheetData = sheetDoc.getElementsByTagNameNS(SHEET_NS, 'sheetData')[0];
    if (!sheetData) {
        throw new Error('No se encontró sheetData en la plantilla.');
    }

    for (let rowNumber = DATA_START_ROW; rowNumber <= DATA_END_ROW; rowNumber += 1) {
        const rowElement = findRowElement(sheetData, rowNumber);
        if (!rowElement) continue;
        const idx = rowNumber - DATA_START_ROW;
        writeTemplateRow(sheetDoc, rowElement, rowsData[idx] || null);
    }

    const serializer = new XMLSerializer();
    zip.file(SHEET_PATH, serializer.serializeToString(sheetDoc));

    return zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
};

export default function ProjectsExcelTracking() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraIds, setSelectedObraIds] = useState<string[]>([]);
    const [filters, setFilters] = useState<Filters>({
        denominacion: '',
        municipio: '',
        expediente: '',
        cebe: '',
        estado: '',
    });

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const data = await getObras();
                data.sort((a: any, b: any) => (a.denominacion || '').localeCompare(b.denominacion || '', 'es'));
                setObras(data);
            } catch (error) {
                console.error(error);
                alert('No se pudieron cargar las obras.');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const filteredObras = useMemo(() => (
        obras.filter((obra) => (
            (obra.denominacion || '').toLowerCase().includes(filters.denominacion.toLowerCase())
            && (obra.municipio || '').toLowerCase().includes(filters.municipio.toLowerCase())
            && (obra.expediente || '').toLowerCase().includes(filters.expediente.toLowerCase())
            && (obra.cebe || '').toLowerCase().includes(filters.cebe.toLowerCase())
            && (filters.estado === '' || normalizeObraStatus(obra.estado) === filters.estado)
        ))
    ), [obras, filters]);

    const selectedSet = useMemo(() => new Set(selectedObraIds), [selectedObraIds]);
    const selectedObras = useMemo(
        () => obras.filter((obra) => selectedSet.has(obra.id)),
        [obras, selectedSet]
    );

    const allFilteredSelected = filteredObras.length > 0 && filteredObras.every((obra) => selectedSet.has(obra.id));

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const toggleOne = (obraId: string) => {
        setSelectedObraIds((prev) => (
            prev.includes(obraId)
                ? prev.filter((id) => id !== obraId)
                : [...prev, obraId]
        ));
    };

    const toggleFiltered = () => {
        setSelectedObraIds((prev) => {
            const next = new Set(prev);
            if (allFilteredSelected) {
                filteredObras.forEach((obra) => next.delete(obra.id));
            } else {
                filteredObras.forEach((obra) => next.add(obra.id));
            }
            return Array.from(next);
        });
    };

    const handleGenerateExcel = async () => {
        if (selectedObras.length === 0) {
            alert('Selecciona al menos una obra.');
            return;
        }

        setIsGenerating(true);
        try {
            const obrasForExport = selectedObras.slice(0, MAX_TEMPLATE_ROWS);
            if (selectedObras.length > MAX_TEMPLATE_ROWS) {
                alert(`La plantilla admite ${MAX_TEMPLATE_ROWS} filas. Se exportarán las primeras ${MAX_TEMPLATE_ROWS} obras seleccionadas.`);
            }

            const selectedIds = obrasForExport.map((obra) => obra.id);
            const [templateBuffer, docs] = await Promise.all([
                fetch(TEMPLATE_URL).then(async (res) => {
                    if (!res.ok) throw new Error('No se pudo cargar la plantilla de seguimiento.');
                    return res.arrayBuffer();
                }),
                getDocumentosByObraIds(selectedIds),
            ]);

            const docsByObra = new Map<string, DocumentoMetaData[]>();
            docs.forEach((doc) => {
                const list = docsByObra.get(doc.obra_id) || [];
                list.push(doc);
                docsByObra.set(doc.obra_id, list);
            });

            const rowsData = obrasForExport.map((obra) => buildTemplateRowData(obra, docsByObra.get(obra.id) || []));
            const blob = await buildWorkbookFromTemplate(templateBuffer, rowsData);

            const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
            saveAs(blob, `tabla_global_seguimiento_${stamp}.xlsx`);
        } catch (error) {
            console.error(error);
            alert('No se pudo generar el Excel desde la plantilla.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ marginBottom: '0.35rem' }}>Documentos de Seguimiento Excel</h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                        Genera el archivo exactamente sobre la plantilla oficial de seguimiento.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Button variant="outline" onClick={() => navigate('/')}>
                        <ArrowLeft size={16} />
                        Volver a Gestion de Obras
                    </Button>
                    <Button onClick={handleGenerateExcel} disabled={selectedObras.length === 0 || isGenerating}>
                        <Download size={16} />
                        {isGenerating ? 'Generando...' : `Generar Excel (${selectedObras.length})`}
                    </Button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ flex: '1 1 220px', marginBottom: 0 }}>
                        <label className="input-label">Denominacion</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input name="denominacion" value={filters.denominacion} onChange={handleFilterChange} className="input-field" placeholder="Buscar..." style={{ width: '100%', paddingLeft: '2.25rem' }} />
                        </div>
                    </div>
                    <div className="input-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
                        <label className="input-label">Municipio</label>
                        <input name="municipio" value={filters.municipio} onChange={handleFilterChange} className="input-field" placeholder="Ej. Madrid" style={{ width: '100%' }} />
                    </div>
                    <div className="input-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
                        <label className="input-label">Expediente</label>
                        <input name="expediente" value={filters.expediente} onChange={handleFilterChange} className="input-field" placeholder="Ej. EXP-..." style={{ width: '100%' }} />
                    </div>
                    <div className="input-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                        <label className="input-label">CEBE</label>
                        <input name="cebe" value={filters.cebe} onChange={handleFilterChange} className="input-field" placeholder="Filtrar..." style={{ width: '100%' }} />
                    </div>
                    <div className="input-group" style={{ flex: '1 1 160px', marginBottom: 0 }}>
                        <label className="input-label">Estado</label>
                        <select name="estado" value={filters.estado} onChange={handleFilterChange} className="input-field" style={{ backgroundColor: 'white', width: '100%' }}>
                            <option value="">Todos</option>
                            <option value="solicitud">Solicitud</option>
                            <option value="preparacion">Preparacion</option>
                            <option value="completada">Completada</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <FileSpreadsheet size={16} />
                        {filteredObras.length} obras visibles
                    </div>
                    <Button variant="outline" onClick={toggleFiltered} disabled={filteredObras.length === 0}>
                        {allFilteredSelected ? 'Quitar seleccion visibles' : 'Seleccionar visibles'}
                    </Button>
                </div>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ width: '48px', textAlign: 'center' }}>Sel.</th>
                            <th>Denominacion</th>
                            <th>Municipio</th>
                            <th>Exp./CEBE</th>
                            <th>Estado</th>
                            <th>Fechas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    Cargando obras...
                                </td>
                            </tr>
                        ) : filteredObras.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    No hay obras para los filtros indicados.
                                </td>
                            </tr>
                        ) : (
                            filteredObras.map((obra) => {
                                const checked = selectedSet.has(obra.id);
                                return (
                                    <tr key={obra.id}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleOne(obra.id)}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td style={{ fontWeight: 500, color: 'var(--color-primary-dark)' }}>{obra.denominacion}</td>
                                        <td>{obra.municipio || '-'}</td>
                                        <td>
                                            <div>{obra.expediente || '-'}</div>
                                            {obra.cebe && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CEBE: {obra.cebe}</div>}
                                        </td>
                                        <td><Badge status={badgeStatusForObra(obra.estado)}>{formatObraStatus(obra.estado)}</Badge></td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {obra.fecha_inicio || '-'} <br /> {obra.fecha_fin || '-'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
