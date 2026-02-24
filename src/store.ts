export const mockObras = [
  {
    id: "ob-001",
    denominacion: "Reforma de Plaza Mayor",
    municipio: "Madrid",
    expediente: "EXP-2023-01",
    estado: "en curso",
    codigoObra: "OBR-MAD-001",
    fechaInicio: "2023-05-10",
    fechaFin: "2024-05-10",
  },
  {
    id: "ob-002",
    denominacion: "Construcción Polideportivo Norte",
    municipio: "Zaragoza",
    expediente: "EXP-2023-45",
    estado: "solicitud",
    codigoObra: "OBR-ZAR-045",
    fechaInicio: "2024-01-15",
    fechaFin: "2025-06-30",
  },
  {
    id: "ob-003",
    denominacion: "Rehabilitación Fachada Histórica",
    municipio: "Barcelona",
    expediente: "EXP-2022-88",
    estado: "completada",
    codigoObra: "OBR-BCN-088",
    fechaInicio: "2022-03-01",
    fechaFin: "2023-02-28",
  }
];

export const fileStructureTemplate = [
  {
    id: "doc-reg",
    name: "Documentación Reglamentaria",
    type: "folder",
    children: [
      {
        id: "nom-css",
        name: "Nombramiento CSS",
        type: "folder",
        children: [
          { id: "propuesta", name: "Propuesta", type: "category" },
          { id: "designacion", name: "Designacion", type: "category" }
        ]
      },
      {
        id: "proyecto",
        name: "Proyecto",
        type: "folder",
        children: [
          { id: "completo", name: "Completo", type: "category" },
          { id: "presupuesto", name: "Presupuesto", type: "category" },
          { id: "memoria", name: "Memoria", type: "category" },
          { id: "planos", name: "Planos", type: "category" }
        ]
      },
      {
        id: "ess-ebss",
        name: "ESS/EBSS",
        type: "folder",
        children: [
          { id: "ess-ebss-cat", name: "ESS/EBSS", type: "category" }
        ]
      },
      {
        id: "apertura-ct",
        name: "Apertura CT",
        type: "folder",
        children: [
          { id: "apertura", name: "Apertura", type: "category" }
        ]
      },
      {
        id: "libro-sub",
        name: "Libro Subcontratación",
        type: "folder",
        children: [
          { id: "libro", name: "Libro Subcontratación", type: "category" }
        ]
      },
      {
        id: "acta-rep",
        name: "Acta de replanteo",
        type: "folder",
        children: [
          { id: "acta-rep-cat", name: "Acta de replanteo", type: "category" }
        ]
      },
      {
        id: "fin-obra",
        name: "Fin de obra",
        type: "folder",
        children: [
          { id: "acta-rec", name: "Acta de recepción", type: "category" },
          { id: "cert-fin", name: "Certificado final", type: "category" }
        ]
      },
      {
        id: "todos-reg",
        name: "Todos",
        type: "folder",
        children: [
          { id: "todos-reg-cat", name: "Todos", type: "category" }
        ]
      }
    ]
  },
  {
    id: "pss-dgp",
    name: "PSS/DGP",
    type: "folder",
    children: [
      {
        id: "pss-anexos",
        name: "PSS/DGP y Anexos",
        type: "folder",
        children: [
          { id: "pss-anexos-cat", name: "PSS/DGP y Anexos", type: "category" }
        ]
      },
      {
        id: "informes",
        name: "Informes",
        type: "folder",
        children: [
          { id: "inf-mod", name: "Informe modificaciones", type: "category" },
          { id: "inf-fav", name: "Informe favorable", type: "category" }
        ]
      },
      {
        id: "acta-aprob",
        name: "Acta de aprobación",
        type: "folder",
        children: [
          { id: "acta-aprob-cat", name: "Acta de aprobación", type: "category" }
        ]
      },
      {
        id: "todos-pss",
        name: "Todos",
        type: "folder",
        children: [
          { id: "todos-pss-cat", name: "Todos", type: "category" }
        ]
      }
    ]
  }
];

// Helper to initialize store in localStorage
export const initStore = () => {
  if (!localStorage.getItem('obras')) {
    localStorage.setItem('obras', JSON.stringify(mockObras));
  }
  if (!localStorage.getItem('files')) {
    localStorage.setItem('files', JSON.stringify({})); // { obraId: { categoryId: [FileRecord] } }
  }
};

export const getObras = () => JSON.parse(localStorage.getItem('obras') || '[]');
export const getObra = (id: string) => getObras().find((o: any) => o.id === id);
export const saveObra = (obra: any) => {
  const obras = getObras();
  obras.push(obra);
  localStorage.setItem('obras', JSON.stringify(obras));
};
export const updateObra = (id: string, updatedData: any) => {
  const obras = getObras();
  const index = obras.findIndex((o: any) => o.id === id);
  if (index !== -1) {
    obras[index] = { ...obras[index], ...updatedData };
    localStorage.setItem('obras', JSON.stringify(obras));
  }
};
export const deleteObra = (id: string) => {
  const obras = getObras().filter((o: any) => o.id !== id);
  localStorage.setItem('obras', JSON.stringify(obras));
};

export const getFiles = (obraId: string, categoryId: string) => {
  const files = JSON.parse(localStorage.getItem('files') || '{}');
  if (!files[obraId]) return [];
  return files[obraId][categoryId] || [];
};

export const addFile = (obraId: string, categoryId: string, file: any) => {
  const files = JSON.parse(localStorage.getItem('files') || '{}');
  if (!files[obraId]) files[obraId] = {};
  if (!files[obraId][categoryId]) files[obraId][categoryId] = [];

  files[obraId][categoryId].push(file);
  localStorage.setItem('files', JSON.stringify(files));
};
