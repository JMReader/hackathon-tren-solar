// Landing copy. Brand name is a working name: the team has not decided it yet.
export const BRAND = {
  name: "Tren Solar",
  tagline: "Tu talento puede llegar más lejos sin que tengas que irte.",
};

export const START_HREF = "/onboarding";

export const NAV_LINKS = [
  { label: "Producto", href: "#producto" },
  { label: "Para quién", href: "#para-quien" },
  { label: "Preguntas", href: "#preguntas" },
];

export const PLACES = [
  "San Salvador de Jujuy",
  "Purmamarca",
  "Tilcara",
  "Humahuaca",
  "Maimará",
  "La Quiaca",
  "Abra Pampa",
  "Palpalá",
  "Perico",
  "Susques",
  "Yavi",
  "Libertador",
];

export const SCATTERED = [
  { text: "Proyectos que nadie vio", x: "2%", y: "-8%", r: -6, d: 0 },
  { text: "CV de 2023", x: "84%", y: "-14%", r: 5, d: 1.2 },
  { text: "Audios sueltos de WhatsApp", x: "62%", y: "112%", r: -3, d: 0.6 },
  { text: "LinkedIn en blanco", x: "6%", y: "104%", r: 4, d: 2 },
  { text: "Portfolio a medias", x: "86%", y: "52%", r: -8, d: 1.6 },
  { text: "“¿Me tendré que ir?”", x: "-4%", y: "46%", r: 7, d: 2.6 },
  { text: "Cursos sin mostrar", x: "34%", y: "128%", r: -2, d: 0.9 },
  { text: "Changas sin registro", x: "44%", y: "-30%", r: 3, d: 2.2 },
];

export const STEPS = [
  {
    n: "01",
    label: "Grabá",
    title: "Contá lo que hiciste, como te salga.",
    body: "Grabá un audio o escribilo, y sumá una foto del proyecto. No hace falta saber venderte: para eso estamos.",
  },
  {
    n: "02",
    label: "Revisá",
    title: "Cada dato, con su cita.",
    body: "Separamos tu relato en hechos concretos y te mostramos de qué parte del audio sale cada uno. Corregís, borrás o agregás antes de aprobar.",
  },
  {
    n: "03",
    label: "Copiá",
    title: "Posts con tu voz, listos para LinkedIn y X.",
    body: "Un borrador por red, con el largo justo para cada una. Lo editás, lo copiás y lo publicás vos: nada sale sin tu OK.",
  },
  {
    n: "04",
    label: "Conectá",
    title: "Tu portfolio crece. Las oportunidades llegan.",
    body: "Cada logro aprobado actualiza tu portfolio y nos ayuda a sugerirte ofertas alineadas a lo que sabés hacer.",
  },
] as const;

export const FEATURES = [
  { key: "audio", title: "Audio a texto", body: "Hablá como hablás. Transcribimos tu audio y entendemos qué hiciste.", tint: "#7d7b4f" },
  { key: "facts", title: "Hechos con cita", body: "Cada afirmación muestra el fragmento del audio que la respalda.", tint: "#5c6378" },
  { key: "voice", title: "Tu voz", body: "Aprendemos tu estilo de tus posts o de una muestra de escritura.", tint: "#5f7c58" },
  { key: "social", title: "LinkedIn y X", body: "Un borrador por red, con su límite de caracteres y su tono.", tint: "#8a5a44" },
  { key: "portfolio", title: "Portfolio vivo", body: "Una página con tus logros aprobados, siempre al día.", tint: "#6c5577" },
  { key: "session", title: "Sin contraseña", body: "Empezás sin cuenta: una sesión anónima que dura 24 horas.", tint: "#4f6f73" },
] as const;

export const STATS = [
  { value: 1, suffix: "", label: "Audio para empezar" },
  { value: 2, suffix: "", label: "Redes: LinkedIn y X" },
  { value: 24, suffix: " h", label: "De sesión, sin contraseña" },
  { value: 0, suffix: "", label: "Mudanzas necesarias" },
];

export const ORIGIN = [
  { title: "Tu lugar", body: "Seguís en tu casa, con tu gente y tu comunidad." },
  { title: "Tu voz", body: "Contás tus logros con tus palabras; nosotros los ordenamos." },
  { title: "Tu evidencia", body: "Lo que publicás está respaldado por lo que hiciste." },
];

export const AUDIENCES = {
  jovenes: [
    {
      tag: "Estudiantes",
      title: "Tu primer proyecto ya cuenta.",
      body: "Trabajos prácticos, pasantías y lo que armaste en la facu o la escuela técnica.",
      items: ["Trabajos y proyectos", "Cursos y certificaciones", "Hackatones y voluntariados", "Tu primer portfolio"],
      variant: "day",
    },
    {
      tag: "Autodidactas",
      title: "Lo que aprendiste solo también.",
      body: "Tutoriales terminados, código propio y changas digitales que nadie te pidió mostrar.",
      items: ["Proyectos personales", "Código en GitHub", "Changas digitales", "Herramientas que dominás"],
      variant: "dusk",
      featured: true,
    },
    {
      tag: "Primer trabajo",
      title: "Lista para la próxima entrevista.",
      body: "Tus logros en el trabajo, ordenados y con evidencia, sin pasarte la noche escribiendo.",
      items: ["Logros con evidencia", "Clientes y entregas", "Posts para compartir", "Portfolio al día"],
      variant: "night",
    },
  ],
  instituciones: [
    {
      tag: "Escuelas",
      title: "Que tus egresados se vean.",
      body: "Escuelas técnicas, institutos y universidades que acompañan a sus cohortes.",
      items: ["Cohortes de egresados", "Portfolios por curso", "Seguimiento de logros"],
      variant: "day",
    },
    {
      tag: "Municipios",
      title: "Talento local, visible desde afuera.",
      body: "Programas de empleo y capacitación que quieren mostrar resultados concretos.",
      items: ["Programas de empleo", "Capacitaciones", "Mapa de habilidades"],
      variant: "dusk",
      featured: true,
    },
    {
      tag: "Empresas",
      title: "Talento joven, sin pedirle que se mude.",
      body: "Equipos que contratan remoto y buscan perfiles con evidencia, no solo un CV.",
      items: ["Perfiles con evidencia", "Trabajo remoto", "Búsqueda por habilidad"],
      variant: "night",
    },
  ],
} as const;

export const FAQ = [
  {
    q: `¿Qué es ${BRAND.name}?`,
    a: "Una plataforma que convierte un audio sobre lo que aprendiste o construiste en un portfolio, posts para LinkedIn y X y sugerencias de oportunidades.",
  },
  {
    q: "¿Necesito crear una cuenta?",
    a: "No. Empezás con una sesión anónima que dura 24 horas, sin contraseña.",
  },
  {
    q: "¿Publica algo sin mi permiso?",
    a: "Nunca. Revisás los hechos, aprobás y confirmás cada publicación. Si una red no da permiso para publicar, te dejamos el texto listo para copiar.",
  },
  {
    q: "¿Puede inventar cosas sobre mí?",
    a: "Cada hecho muestra la cita del audio de la que sale. Lo que no está respaldado no se afirma, y podés corregir todo antes de aprobar.",
  },
  {
    q: "¿Cómo sabe escribir como yo?",
    a: "Usa tu profesión, tus posts importados o una muestra de escritura. El estilo define el tono; nunca agrega hechos.",
  },
  {
    q: "¿Tengo que mudarme para conseguir oportunidades?",
    a: "Esa es justamente la idea: que no. Tu trabajo se ve desde donde estés.",
  },
];
