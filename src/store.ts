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

export const CONTACT_TYPES = [
  "Contratista",
  "Jefe de obra",
  "Director de obra",
  "Técnico PRL",
  "Director ejecución de obra",
  "Recurso preventivo",
  "Dirección de envío",
  "Coordinador SyS Suplente",
  "Coordinador SyS"
];

export const typologiesTree = {
  "Edificación": {
    "Sanitarias": [
      "Hospital",
      "Centro de especialidades",
      "Centro de salud y consultorio",
      "Centro de salud mental",
      "Centro de infecciones de transmisión sexual",
      "Centro de diálisis",
      "Centro de transfusión sanguínea"
    ],
    "Residencias geriátricas": [
      "Residencias geriátricas",
      "Centro de día"
    ],
    "Culturales": [
      "Museo",
      "Teatro",
      "Biblioteca",
      "Centro cultural",
      "Cine"
    ],
    "Transportes": [
      "Estación de autobuses"
    ],
    "Administrativas": [
      "Centro de penitenciario",
      "Ayuntamiento",
      "Juzgado",
      "Tanatorio",
      "Comisaria"
    ],
    "Docentes": [
      "Colegio",
      "Instituto",
      "Universidad",
      "Guardería"
    ],
    "Deportivas": [
      "Polideportivo",
      "Pista deportiva",
      "Campo de fútbol",
      "Piscina",
      "Rocódromo",
      "Gimnasio",
      "Pista de tenis",
      "Frontón",
      "Pista de padel",
      "Pabellón"
    ],
    "Hoteles": [],
    "Oficinas": [],
    "Viviendas": [
      "Viviendas unifamiliares",
      "Edificio de viviendas",
      "V.P.O.",
      "Complejo residencial",
      "Viviendas adosadas"
    ],
    "Centro de ocio": [
      "Centro comercial",
      "Parque de atracciones"
    ],
    "Aparcamientos": [],
    "Industriales": [
      "Fábrica",
      "Nave industrial"
    ]
  },
  "Obra civil": {
    "Varias": [
      "Autovía",
      "Autopista",
      "Carretera nacional",
      "Carretera comarcal",
      "Camino",
      "Túnel",
      "Puente/viaducto",
      "Pasarela",
      "Carretera provincial"
    ],
    "Aeroportuarias": [
      "Terminal",
      "Torre de control",
      "Plataforma",
      "CLH(Centro Logístico Hidrocarburos)",
      "Aparcamiento aeropuerto",
      "Hangar",
      "Helipuerto",
      "Central eléctrica"
    ],
    "Hidráulicas": [
      "Central hidroeléctrica",
      "Depuradora",
      "Colector",
      "Centro de tratamiento de residuos",
      "Canal",
      "Depósito"
    ],
    "Marítimas": [
      "Astillero",
      "Bocana",
      "Dique",
      "Muelle",
      "Dársena",
      "Terminal"
    ],
    "Ferroviarias": [
      "Túnel",
      "Puente/Viaducto",
      "Plataforma AVE",
      "Línea ferrocarril",
      "Línea metro",
      "Estación de ferrocarril",
      "Estación de metro"
    ],
    "Urbanizaciones": [],
    "Energías renovables": [
      "Parques solares",
      "Parques eólicos"
    ]
  }
};

export const mockEmpresas = [
  { id: "emp-001", razonSocial: "Constructora ABC S.A.", direccion: "Calle Alta 123", telefono: "600123456", correo: "contacto@abc.com" },
  { id: "emp-002", razonSocial: "Promociones y Desarrollos DEF", direccion: "Av. Principal 45", telefono: "600987654", correo: "info@def.com" }
];

export const mockPersonas = [
  { id: "per-001", nombre: "Juan", apellidos: "Pérez", tipo: "Jefe de obra", empresaId: "emp-001" },
  { id: "per-002", nombre: "María", apellidos: "García", tipo: "Coordinador SyS", empresaId: "emp-002" }
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
  },
  {
    id: "informes-main",
    name: "Informes",
    type: "folder",
    children: [
      { id: "inf-mensual", name: "Mensual", type: "category" },
      { id: "inf-trimestral", name: "Trimestral", type: "category" },
      { id: "inf-extraordinario", name: "Extraordinario", type: "category" }
    ]
  },
  {
    id: "siniestralidad",
    name: "Siniestralidad",
    type: "folder",
    children: [
      { id: "sin-accidentes", name: "Accidentes", type: "category" },
      { id: "sin-estadisticas", name: "Estadísticas", type: "category" }
    ]
  },
  {
    id: "comunicados",
    name: "Comunicados",
    type: "folder",
    children: [
      { id: "com-entrada", name: "Entrada", type: "category" },
      { id: "com-salida", name: "Salida", type: "category" }
    ]
  },
  {
    id: "gestion-contrato",
    name: "Gestión del contrato",
    type: "folder",
    children: [
      { id: "ges-certificaciones", name: "Certificaciones", type: "category" },
      { id: "ges-informe-global", name: "Informe global", type: "category" },
      { id: "ges-procedimientos", name: "Procedimientos y formatos", type: "category" },
      { id: "ges-tabla-seg", name: "Tabla de seguimiento", type: "category" }
    ]
  },
  {
    id: "cat-contactos",
    name: "Contactos",
    type: "category"
  },
  {
    id: "fol-contratistas",
    name: "Contratistas",
    type: "folder",
    children: [
      { id: "cat-contratista", name: "Contratista", type: "category" },
      { id: "cat-subcontratista", name: "Subcontratista", type: "category" },
      { id: "cat-libro-subcontrata", name: "Libro de Subcontrata / Autónomo", type: "category" }
    ]
  },
  {
    id: "fol-visitas-reuniones",
    name: "Visitas, Reuniones y Anotaciones LI",
    type: "folder",
    children: [
      { id: "cat-reuniones", name: "Reuniones", type: "category" },
      { id: "cat-visitas", name: "Visitas", type: "category" },
      { id: "cat-li", name: "Anotaciones LI", type: "category" }
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
  if (!localStorage.getItem('empresas')) {
    localStorage.setItem('empresas', JSON.stringify(mockEmpresas));
  }
  if (!localStorage.getItem('personas')) {
    localStorage.setItem('personas', JSON.stringify(mockPersonas));
  }

  // Custom module data tables { obraId: [RowObject] }
  if (!localStorage.getItem('libro_subcontrata')) localStorage.setItem('libro_subcontrata', JSON.stringify({}));
  if (!localStorage.getItem('reuniones')) localStorage.setItem('reuniones', JSON.stringify({}));
  if (!localStorage.getItem('visitas')) localStorage.setItem('visitas', JSON.stringify({}));
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

export const getEmpresas = () => JSON.parse(localStorage.getItem('empresas') || '[]');
export const getEmpresa = (id: string) => getEmpresas().find((e: any) => e.id === id);
export const saveEmpresa = (empresa: any) => {
  const empresas = getEmpresas();
  empresas.push(empresa);
  localStorage.setItem('empresas', JSON.stringify(empresas));
};
export const updateEmpresa = (id: string, updatedData: any) => {
  const empresas = getEmpresas();
  const index = empresas.findIndex((e: any) => e.id === id);
  if (index !== -1) {
    empresas[index] = { ...empresas[index], ...updatedData };
    localStorage.setItem('empresas', JSON.stringify(empresas));
  }
};
export const deleteEmpresa = (id: string) => {
  const empresas = getEmpresas().filter((e: any) => e.id !== id);
  localStorage.setItem('empresas', JSON.stringify(empresas));
};

export const getPersonas = () => JSON.parse(localStorage.getItem('personas') || '[]');
export const getPersona = (id: string) => getPersonas().find((p: any) => p.id === id);
export const savePersona = (persona: any) => {
  const personas = getPersonas();
  personas.push(persona);
  localStorage.setItem('personas', JSON.stringify(personas));
};
export const updatePersona = (id: string, updatedData: any) => {
  const personas = getPersonas();
  const index = personas.findIndex((p: any) => p.id === id);
  if (index !== -1) {
    personas[index] = { ...personas[index], ...updatedData };
    localStorage.setItem('personas', JSON.stringify(personas));
  }
};
export const deletePersona = (id: string) => {
  const personas = getPersonas().filter((p: any) => p.id !== id);
  localStorage.setItem('personas', JSON.stringify(personas));
};

export const getContactosBase = () => {
  return {
    empresas: getEmpresas(),
    personas: getPersonas()
  };
};

// Helper to recursively find a node by ID
export const findNodeById = (nodes: any[], id: string): any => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Helper to get all leaf category IDs under a node
export const getLeafCategoryIds = (node: any): string[] => {
  if (node.type === 'category') return [node.id];
  let ids: string[] = [];
  if (node.children) {
    for (const child of node.children) {
      ids = ids.concat(getLeafCategoryIds(child));
    }
  }
  return ids;
};

export const getFiles = (obraId: string, categoryOrFolderId: string) => {
  const filesStore = JSON.parse(localStorage.getItem('files') || '{}');
  if (!filesStore[obraId]) return [];

  const node = findNodeById(fileStructureTemplate, categoryOrFolderId);
  if (!node) return filesStore[obraId][categoryOrFolderId] || [];

  const leafIds = getLeafCategoryIds(node);
  let allFiles: any[] = [];
  leafIds.forEach(id => {
    if (filesStore[obraId][id]) {
      const filesWithCategory = filesStore[obraId][id].map((f: any) => ({
        ...f,
        categoryId: id,
        categoryName: findNodeById(fileStructureTemplate, id)?.name || id
      }));
      allFiles = allFiles.concat(filesWithCategory);
    }
  });

  // Sort files by upload date DESC by default
  return allFiles.sort((a, b) => new Date(b.fechaSubida || b.uploadDate).getTime() - new Date(a.fechaSubida || a.uploadDate).getTime());
};

export const addFile = (obraId: string, categoryId: string, file: any) => {
  const files = JSON.parse(localStorage.getItem('files') || '{}');
  if (!files[obraId]) files[obraId] = {};
  if (!files[obraId][categoryId]) files[obraId][categoryId] = [];

  files[obraId][categoryId].push(file);
  localStorage.setItem('files', JSON.stringify(files));
};

export const updateFile = (obraId: string, categoryId: string, fileId: string, updatedProps: any) => {
  const files = JSON.parse(localStorage.getItem('files') || '{}');
  if (!files[obraId] || !files[obraId][categoryId]) return;

  const index = files[obraId][categoryId].findIndex((f: any) => f.id === fileId);
  if (index !== -1) {
    files[obraId][categoryId][index] = { ...files[obraId][categoryId][index], ...updatedProps };
    localStorage.setItem('files', JSON.stringify(files));
  }
};

export const deleteFile = (obraId: string, categoryId: string, fileId: string) => {
  const files = JSON.parse(localStorage.getItem('files') || '{}');
  if (!files[obraId] || !files[obraId][categoryId]) return;

  files[obraId][categoryId] = files[obraId][categoryId].filter((f: any) => f.id !== fileId);
  localStorage.setItem('files', JSON.stringify(files));
};

// --- Custom Modules CRUD ---
const genericGetRecords = (storeKey: string, obraId: string) => {
  const store = JSON.parse(localStorage.getItem(storeKey) || '{}');
  return store[obraId] || [];
};

const genericSaveRecord = (storeKey: string, obraId: string, record: any) => {
  const store = JSON.parse(localStorage.getItem(storeKey) || '{}');
  if (!store[obraId]) store[obraId] = [];
  store[obraId].push({ ...record, fallbackId: record.id || `${storeKey}-${Date.now()}` });
  localStorage.setItem(storeKey, JSON.stringify(store));
};

export const genericUpdateRecord = (storeKey: string, obraId: string, recordId: string, updatedProps: any) => {
  const store = JSON.parse(localStorage.getItem(storeKey) || '{}');
  if (!store[obraId]) return;
  const idx = store[obraId].findIndex((r: any) => (r.id || r.fallbackId) === recordId);
  if (idx > -1) {
    store[obraId][idx] = { ...store[obraId][idx], ...updatedProps };
    localStorage.setItem(storeKey, JSON.stringify(store));
  }
};

const genericDeleteRecord = (storeKey: string, obraId: string, recordId: string) => {
  const store = JSON.parse(localStorage.getItem(storeKey) || '{}');
  if (!store[obraId]) return;
  store[obraId] = store[obraId].filter((r: any) => (r.id || r.fallbackId) !== recordId);
  localStorage.setItem(storeKey, JSON.stringify(store));
};

// Libro Subcontrata
export const getLibroSubcontratas = (obraId: string) => genericGetRecords('libro_subcontrata', obraId);
export const saveLibroSubcontrata = (obraId: string, record: any) => genericSaveRecord('libro_subcontrata', obraId, record);
export const deleteLibroSubcontrata = (obraId: string, recordId: string) => genericDeleteRecord('libro_subcontrata', obraId, recordId);

// Reuniones
export const getReuniones = (obraId: string) => genericGetRecords('reuniones', obraId);
export const saveReunion = (obraId: string, record: any) => genericSaveRecord('reuniones', obraId, record);
export const updateReunion = (obraId: string, recordId: string, data: any) => genericUpdateRecord('reuniones', obraId, recordId, data);
export const deleteReunion = (obraId: string, recordId: string) => genericDeleteRecord('reuniones', obraId, recordId);

// Visitas
export const getVisitas = (obraId: string) => genericGetRecords('visitas', obraId);
export const saveVisita = (obraId: string, record: any) => genericSaveRecord('visitas', obraId, record);
export const updateVisita = (obraId: string, recordId: string, data: any) => genericUpdateRecord('visitas', obraId, recordId, data);
export const deleteVisita = (obraId: string, recordId: string) => genericDeleteRecord('visitas', obraId, recordId);
