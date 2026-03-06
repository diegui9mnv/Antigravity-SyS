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

export const createActaPdfUrl = async (
  tipo: 'reunion' | 'visita',
  eventData: any,
  obra: any
): Promise<string> => {
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

  docDefinition.content.push({
    text: `Acta de ${tipo === 'reunion' ? 'Reunion' : 'Visita'}`,
    style: 'header',
    alignment: 'center',
  });
  docDefinition.content.push({
    text: obra?.denominacion || '',
    alignment: 'center',
    margin: [0, 0, 0, 20],
    color: '#6b7280',
    fontSize: 14,
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

  const fotos = v('fotos', 'fotos');
  if (Array.isArray(fotos) && fotos.length > 0) {
    docDefinition.content.push({
      text: 'Reporte Fotografico',
      style: 'subheader',
      margin: [0, 20, 0, 10],
      pageBreak: 'before',
    });
    for (let i = 0; i < fotos.length; i += 2) {
      const col = [];
      const img1 = fotos[i]?.url;
      col.push(img1 && img1.startsWith('data:image') ? { image: img1, width: 240, margin: [0, 10, 10, 10] } : { text: '' });
      const img2 = fotos[i + 1]?.url;
      col.push(img2 && img2.startsWith('data:image') ? { image: img2, width: 240, margin: [0, 10, 0, 10] } : { text: '' });
      docDefinition.content.push({ columns: col });
    }
  }

  const firmas = v('firmas', 'firmas');
  if (Array.isArray(firmas) && firmas.length > 0) {
    docDefinition.content.push({
      text: tipo === 'reunion' ? 'Firmas de Asistentes' : 'Asistentes y Firmas',
      style: 'subheader',
      margin: [0, 30, 0, 10],
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

