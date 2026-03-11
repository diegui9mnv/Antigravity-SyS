import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

try {
  const vfs =
    (pdfFonts as any).pdfMake?.vfs ||
    (pdfFonts as any).vfs ||
    (pdfFonts as any).default?.pdfMake?.vfs;
  if (vfs) {
    (pdfMake as any).vfs = vfs;
  }
} catch (e) {
  console.error('Error inicializando fuentes de pdfMake:', e);
}

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el logo de cabecera.'));
    reader.readAsDataURL(blob);
  });

const loadActaHeaderLogo = async (): Promise<string | null> => {
  const candidates = [
    '/cemosa-logo.png',
    '/cemosa-logo.jpg',
    '/cemosa-logo.jpeg',
    '/cemosa-logo.webp',
    '/cemosa-logo.svg',
    '/branding/cemosa-logo.png',
    '/branding/cemosa-logo.jpg',
    '/branding/cemosa-logo.jpeg',
    '/branding/cemosa-logo.webp',
    '/branding/cemosa-logo.svg',
  ];

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { cache: 'no-store' });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) continue;
      return await blobToDataUrl(blob);
    } catch {
      // Try next candidate
    }
  }

  return null;
};

const formatHeaderDate = (value: any): string => {
  if (!value) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
};

const buildActaHeaderTitle = (tipo: 'reunion' | 'visita'): string =>
  tipo === 'reunion'
    ? 'ACTA DE REUNION DE COORDINACION SEGURIDAD Y SALUD'
    : 'ACTA DE VISITA DE COORDINACION SEGURIDAD Y SALUD';

export const createActaPdfUrl = async (
  tipo: 'reunion' | 'visita',
  eventData: any,
  obra: any
): Promise<string> => {
  const logoDataUrl = await loadActaHeaderLogo();

  const docDefinition: any = {
    content: [],
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10], color: '#1e3a8a' },
      subheader: { fontSize: 14, bold: true, margin: [0, 15, 0, 5], color: '#2563eb' },
      label: { bold: true, color: '#4b5563' },
      text: { margin: [0, 0, 0, 10], fontSize: 11, lineHeight: 1.4 },
    },
  };

  const v = (camel: string, snake: string) => eventData?.[camel] ?? eventData?.[snake] ?? '';
  const expedienteValue = obra?.expediente || obra?.codigoObra || '-';
  const informeValue = eventData?.titulo || eventData?.title || '-';
  const fechaActual = formatHeaderDate(new Date());

  const normalizePhotoLayoutType = (value: any): 'foto' | 'libro_incidencias' | 'otros_documentos' => {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s-]+/g, '_');
    if (!normalized) return 'foto';
    if (
      normalized === 'libro_incidencias' ||
      normalized === 'libroincidencias' ||
      normalized === 'libro' ||
      normalized.includes('libro')
    ) {
      return 'libro_incidencias';
    }
    if (
      normalized === 'otros_documentos' ||
      normalized === 'otrosdocumentos' ||
      normalized === 'otros' ||
      normalized.includes('otro')
    ) {
      return 'otros_documentos';
    }
    return 'foto';
  };

  const normalizeFotos = (raw: any[]): Array<{ id: any; url: string; tipo: 'foto' | 'libro_incidencias' | 'otros_documentos'; descripcion: string }> => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((photo: any, index: number) => {
        const url = photo?.url || photo?.dataUrl || photo?.data_url || '';
        if (!url || !String(url).startsWith('data:image')) return null;
        return {
          id: photo?.id ?? index,
          url: String(url),
          tipo: normalizePhotoLayoutType(photo?.tipo ?? photo?.tipoFoto ?? photo?.layoutType ?? photo?.section),
          descripcion:
            typeof photo?.descripcion === 'string'
              ? photo.descripcion
              : typeof photo?.description === 'string'
                ? photo.description
                : '',
        };
      })
      .filter(Boolean) as Array<{ id: any; url: string; tipo: 'foto' | 'libro_incidencias' | 'otros_documentos'; descripcion: string }>;
  };

  docDefinition.content.push({
    table: {
      widths: [200, '*'],
      body: [[
        {
          stack: logoDataUrl
            ? [{
              image: logoDataUrl,
              fit: [160, 42],
              alignment: 'center',
              margin: [0, 2, 0, 0],
            }]
            : [
              { text: 'cemosa', color: '#2563eb', bold: true, fontSize: 28, margin: [0, 1, 0, 0] },
              { text: 'Ingenieria y Control', color: '#2563eb', italics: true, fontSize: 11, margin: [2, -2, 0, 0] },
            ],
          margin: [0, 2, 0, 2],
        },
        {
          stack: [
            {
              text: buildActaHeaderTitle(tipo),
              alignment: 'center',
              bold: true,
              fontSize: 10,
              margin: [0, 0, 0, 4],
            },
            {
              columns: [
                { width: 78, text: 'Expediente:', bold: true, fontSize: 9, alignment: 'right', margin: [0, 0, 4, 0], color: '#111827' },
                { text: String(expedienteValue), fontSize: 9, color: '#374151' },
              ],
              margin: [0, 0, 0, 0],
            },
            {
              columns: [
                { width: 78, text: 'Informe:', bold: true, fontSize: 9, alignment: 'right', margin: [0, 0, 4, 0], color: '#111827' },
                { text: String(informeValue), fontSize: 9, color: '#374151' },
              ],
              margin: [0, 0, 0, 0],
            },
            {
              columns: [
                { width: 78, text: 'Fecha actual:', bold: true, fontSize: 9, alignment: 'right', margin: [0, 0, 4, 0], color: '#111827' },
                { text: fechaActual, fontSize: 9, color: '#374151' },
              ],
              margin: [0, 0, 0, 0],
            },
          ],
          margin: [0, 2, 0, 2],
        },
      ]],
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === node.table.body.length ? 0.9 : 0),
      vLineWidth: () => 0,
      hLineColor: () => '#9ca3af',
    },
    margin: [6, 0, 6, 8],
  });
  docDefinition.content.push({
    text: obra?.denominacion || '',
    alignment: 'center',
    margin: [0, 0, 0, 10],
    color: '#6b7280',
    fontSize: 11,
  });

  const addField = (label: string, value: any) => {
    const stringValue = value !== undefined && value !== null ? String(value) : '';
    if (stringValue.trim() !== '') {
      docDefinition.content.push({ text: label, style: 'subheader' });
      docDefinition.content.push({ text: stringValue, style: 'text' });
    }
  };

  if (tipo === 'reunion') {
    addField('Introduccion', v('introduccion', 'introduccion'));
    addField('Asistentes', v('asistentes', 'asistentes'));
    addField('Desarrollo de la reunion', v('desarrolloReunion', 'desarrollo_reunion'));
    const esPuntual =
      v('esReunionPuntual', 'es_reunion_puntual') === true ||
      v('esReunionPuntual', 'es_reunion_puntual') === 'true';
    if (!esPuntual) {
      addField('Orden del Dia', v('ordenDelDia', 'orden_del_dia'));
    }
  } else {
    addField('Fecha y Hora', v('fechaHora', 'fecha_hora'));
    addField('Ubicacion', v('ubicacion', 'ubicacion'));
    addField('Tipo de Obra', v('tipoObra', 'tipo_obra'));
    addField('Recurso Preventivo', v('recursoPreventivo', 'recurso_preventivo'));
    addField('Numero de Trabajadores', v('nTrabajadores', 'n_trabajadores'));
    addField('Subcontratas / Autonomos', v('subcontratas', 'subcontratas'));
    addField('Trabajos en Curso', v('trabajosEnCurso', 'trabajos_en_curso'));
    addField('Unidades en Ejecucion', v('unidadesEjecucion', 'unidades_ejecucion'));
    addField('EPIs', v('epis', 'epis'));
    addField('Medios Auxiliares', v('mediosAuxiliares', 'medios_auxiliares'));
    addField('Instalacion Electrica', v('instalacionElectrica', 'instalacion_electrica'));
    addField('Condiciones Ambientales', v('condicionesAmbientales', 'condiciones_ambientales'));
    addField('Organizacion de la Obra', v('organizacionObra', 'organizacion_obra'));
    addField('Planificacion de Trabajos', v('planificacionTrabajos', 'planificacion_trabajos'));
    addField('Recordatorio SyS', v('recordatorio', 'recordatorio'));
    addField('Observaciones', v('observaciones', 'observaciones'));
    addField('Accidentes reportados', v('accidentes', 'accidentes'));
  }

  let forcePageBreakBeforeFirmas = false;
  const fotos = normalizeFotos(v('fotos', 'fotos'));
  if (fotos.length > 0) {
    const fotosNormales = fotos.filter((f) => f.tipo === 'foto');
    const fotosLibroIncidencias = fotos.filter((f) => f.tipo === 'libro_incidencias');
    const fotosOtrosDocumentos = fotos.filter((f) => f.tipo === 'otros_documentos');

    docDefinition.content.push({
      text: 'Reporte Fotografico',
      style: 'subheader',
      margin: [0, 20, 0, 10],
      pageBreak: 'before',
    });

    let hasPreviousPhotoSection = false;

    if (fotosNormales.length > 0) {
      docDefinition.content.push({
        text: 'Fotos',
        style: 'subheader',
        margin: [0, 5, 0, 8],
      });
      fotosNormales.forEach((photo) => {
        docDefinition.content.push({
          image: photo.url,
          fit: [500, 320],
          margin: [0, 6, 0, 4],
          alignment: 'left',
        });
        if (photo.descripcion?.trim()) {
          docDefinition.content.push({
            text: photo.descripcion.trim(),
            style: 'text',
            margin: [0, 0, 0, 10],
          });
        }
      });
      hasPreviousPhotoSection = true;
    }

    if (fotosLibroIncidencias.length > 0) {
      docDefinition.content.push({
        text: 'Libro de incidencias',
        style: 'subheader',
        margin: [0, 5, 0, 8],
        pageBreak: hasPreviousPhotoSection ? 'before' : undefined,
      });
      fotosLibroIncidencias.forEach((photo, index) => {
        const photoStack: any[] = [
          {
            image: photo.url,
            fit: [510, 620],
            margin: [0, 6, 0, 4],
            alignment: 'center',
          },
        ];
        if (photo.descripcion?.trim()) {
          photoStack.push({
            text: photo.descripcion.trim(),
            style: 'text',
            margin: [0, 0, 0, 10],
          });
        }
        // El título de sección ya puede forzar salto. Para no dejarlo solo en una página,
        // la primera imagen no añade salto adicional.
        const shouldBreakBeforePhoto = index > 0;
        docDefinition.content.push({
          stack: photoStack,
          unbreakable: true,
          pageBreak: shouldBreakBeforePhoto ? 'before' : undefined,
        });
      });
      forcePageBreakBeforeFirmas = true;
      hasPreviousPhotoSection = true;
    }

    if (fotosOtrosDocumentos.length > 0) {
      docDefinition.content.push({
        text: 'Otros documentos',
        style: 'subheader',
        margin: [0, 5, 0, 8],
        pageBreak: hasPreviousPhotoSection ? 'before' : undefined,
      });
      fotosOtrosDocumentos.forEach((photo) => {
        docDefinition.content.push({
          image: photo.url,
          fit: [500, 320],
          margin: [0, 6, 0, 4],
          alignment: 'left',
        });
        if (photo.descripcion?.trim()) {
          docDefinition.content.push({
            text: photo.descripcion.trim(),
            style: 'text',
            margin: [0, 0, 0, 10],
          });
        }
      });
    }
  }

  const firmas = v('firmas', 'firmas');
  if (Array.isArray(firmas) && firmas.length > 0) {
    docDefinition.content.push({
      text: tipo === 'reunion' ? 'Firmas de Asistentes' : 'Asistentes y Firmas',
      style: 'subheader',
      margin: [0, 30, 0, 10],
      pageBreak: forcePageBreakBeforeFirmas ? 'before' : undefined,
    });
    for (let i = 0; i < firmas.length; i += 3) {
      const columns = [];
      for (let j = 0; j < 3; j++) {
        const f = firmas[i + j];
        if (f?.url && String(f.url).startsWith('data:image')) {
          columns.push({
            stack: [
              { text: f.nombre || '', bold: true },
              { text: f.empresa || '', fontSize: 10, color: '#666', margin: [0, 2, 0, 5] },
              { image: f.url, width: 120, height: 60, margin: [0, 5, 0, 0] },
            ],
          });
        } else {
          columns.push({ text: '' });
        }
      }
      docDefinition.content.push({ columns });
    }
  }

  const pdfMakeLib = (pdfMake as any).createPdf ? pdfMake : (pdfMake as any).default;
  if (!pdfMakeLib || typeof pdfMakeLib.createPdf !== 'function') {
    throw new Error('pdfMake.createPdf no es una funcion.');
  }
  const blob = await pdfMakeLib.createPdf(docDefinition).getBlob();
  return URL.createObjectURL(blob);
};

export const createActaPdfBlob = async (
  tipo: 'reunion' | 'visita',
  eventData: any,
  obra: any
): Promise<Blob> => {
  const url = await createActaPdfUrl(tipo, eventData, obra);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('No se pudo obtener el PDF generado.');
    }
    return await response.blob();
  } finally {
    URL.revokeObjectURL(url);
  }
};
