export const clubPlans = [
  {
    name: 'Pro',
    price: '$50.000',
    period: '/mes',
    description: 'Ideal para clubes medianos con múltiples necesidades.',
    featured: true,
    features: ['Turnos y reservas', 'Control de stock', 'App para jugadores', 'Torneos y rankings', 'Estadísticas avanzadas', 'Roles y permisos', 'POS para cantina', 'Arqueo de caja y movimientos'],
  },
  {
    name: 'Elite',
    price: '$100.000',
    period: '/mes',
    description: 'Solución completa para grandes complejos deportivos.',
    featured: false,
    features: ['Todo lo de Pro', 'Multi-sede', 'Reportes avanzados', 'Soporte prioritario', 'Gerente de cuenta dedicado'],
  },
];

export const customPlan = { name: 'Personalizado', price: 'A convenir' };

export const planGuarantee = {
  title: '14 días de prueba bonificados en todos los planes',
  text: 'Te asistimos con la configuración inicial y carga de canchas en menos de 24 horas. Sin costos ocultos.',
};
