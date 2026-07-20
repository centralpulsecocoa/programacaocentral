// Lista centralizada de todos os perfis disponíveis
// Atualize aqui quando novos perfis forem criados
export const AVAILABLE_PROFILES = [
  { value: 'admin', label: 'Administrador', icon: '👑' },
  { value: 'supervisor', label: 'Supervisor', icon: '🎯' },
  { value: 'gerente_originacao', label: 'Gerente Originação', icon: '📊' },
  { value: 'gerente_sustentabilidade', label: 'Gerente Sustentabilidade', icon: '🌱' },
  { value: 'tecnico_agricola', label: 'Técnico Agrícola', icon: '🌾' },
  { value: 'analista_qualidade', label: 'Analista Qualidade', icon: '🔬' },
  { value: 'classificador', label: 'Classificador', icon: '🧪' },
  { value: 'qualidade', label: 'Qualidade', icon: '✅' },
  { value: 'comprador', label: 'Comprador', icon: '🛍️' },
  { value: 'operador', label: 'Operador', icon: '⚙️' },
  { value: 'op_balanca', label: 'Op. Balança', icon: '⚖️' },
  { value: 'controladoria', label: 'Controladoria', icon: '💰' },
  { value: 'producao', label: 'Produção', icon: '🏭' },
  { value: 'originacao', label: 'Originação', icon: '📦' },
  { value: 'motorista', label: 'Motorista', icon: '🚗' },
  { value: 'transportadora', label: 'Transportadora', icon: '🚚' }
];

export const getProfileLabel = (profile) => {
  const profileData = AVAILABLE_PROFILES.find(p => p.value === profile);
  return profileData?.label || profile;
};