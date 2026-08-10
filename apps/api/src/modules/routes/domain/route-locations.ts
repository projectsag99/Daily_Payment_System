export const ROUTE_COUNTRIES = [
  { code: "CO", name: "Colombia" },
  { code: "UY", name: "Uruguay" },
  { code: "AR", name: "Argentina" },
  { code: "EC", name: "Ecuador" },
  { code: "PE", name: "Perú" },
  { code: "MX", name: "México" },
  { code: "CL", name: "Chile" },
  { code: "VE", name: "Venezuela" },
  { code: "PA", name: "Panamá" },
  { code: "CR", name: "Costa Rica" },
  { code: "BO", name: "Bolivia" },
  { code: "PY", name: "Paraguay" },
] as const;

export type RouteCountryCode = (typeof ROUTE_COUNTRIES)[number]["code"];

export const ROUTE_COUNTRY_CODES: RouteCountryCode[] = ROUTE_COUNTRIES.map(
  (country) => country.code,
);

export const ROUTE_CITIES_BY_COUNTRY: Record<
  RouteCountryCode,
  readonly string[]
> = {
  CO: [
    "Bogotá",
    "Medellín",
    "Cali",
    "Barranquilla",
    "Cartagena",
    "Bucaramanga",
    "Pereira",
    "Manizales",
    "Cúcuta",
    "Ibagué",
  ],
  UY: [
    "Montevideo",
    "Salto",
    "Paysandú",
    "Las Piedras",
    "Rivera",
    "Maldonado",
    "Fray Bentos",
    "Mercedes",
    "Artigas",
    "Durazno",
  ],
  AR: [
    "Buenos Aires",
    "Córdoba",
    "Rosario",
    "Mendoza",
    "La Plata",
    "Mar del Plata",
    "Salta",
    "Santa Fe",
    "San Juan",
    "Tucumán",
  ],
  EC: [
    "Quito",
    "Guayaquil",
    "Cuenca",
    "Santo Domingo",
    "Machala",
    "Manta",
    "Portoviejo",
    "Ambato",
    "Loja",
    "Esmeraldas",
  ],
  PE: [
    "Lima",
    "Arequipa",
    "Trujillo",
    "Chiclayo",
    "Piura",
    "Cusco",
    "Iquitos",
    "Huancayo",
    "Tacna",
    "Juliaca",
  ],
  MX: [
    "Ciudad de México",
    "Guadalajara",
    "Monterrey",
    "Puebla",
    "Tijuana",
    "León",
    "Mérida",
    "Querétaro",
    "San Luis Potosí",
    "Aguascalientes",
  ],
  CL: [
    "Santiago",
    "Valparaíso",
    "Concepción",
    "La Serena",
    "Antofagasta",
    "Temuco",
    "Rancagua",
    "Talca",
    "Arica",
    "Puerto Montt",
  ],
  VE: [
    "Caracas",
    "Maracaibo",
    "Valencia",
    "Barquisimeto",
    "Maracay",
    "Ciudad Guayana",
    "San Cristóbal",
    "Maturín",
    "Barcelona",
    "Cumaná",
  ],
  PA: [
    "Ciudad de Panamá",
    "San Miguelito",
    "Colón",
    "David",
    "La Chorrera",
    "Santiago",
    "Chitré",
    "Penonomé",
    "Aguadulce",
    "Arraiján",
  ],
  CR: [
    "San José",
    "Alajuela",
    "Cartago",
    "Heredia",
    "Liberia",
    "Puntarenas",
    "Limón",
    "San Isidro",
    "Quesada",
    "Desamparados",
  ],
  BO: [
    "La Paz",
    "Santa Cruz de la Sierra",
    "Cochabamba",
    "Sucre",
    "Oruro",
    "Tarija",
    "Potosí",
    "Trinidad",
    "Cobija",
    "Riberalta",
  ],
  PY: [
    "Asunción",
    "Ciudad del Este",
    "San Lorenzo",
    "Luque",
    "Capiatá",
    "Lambaré",
    "Fernando de la Mora",
    "Encarnación",
    "Caaguazú",
    "Villarrica",
  ],
};

export function isValidRouteCountryCode(value: string): value is RouteCountryCode {
  return (ROUTE_COUNTRY_CODES as readonly string[]).includes(value);
}

export function isValidRouteCity(country: RouteCountryCode, city: string): boolean {
  return ROUTE_CITIES_BY_COUNTRY[country].includes(city);
}

export function getRouteCountryName(code: string): string | null {
  return ROUTE_COUNTRIES.find((country) => country.code === code)?.name ?? null;
}
