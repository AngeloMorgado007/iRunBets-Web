import { savePricingPlansToFirebase } from './firebase';

export interface PricingPlan {
  id: 'site' | 'basic' | 'pro' | 'basic_max' | 'pro_max' | 'tipster';
  name: string;
  desc: string;
  price: number;
  yearlyPrice: number;
  oldPrice: number;
  oldYearlyPrice: number;
  badge: string;
  group: number; // 1 = Web, 2 = Cross-Platform
  features: {
    web: boolean;
    ev: boolean;
    radar: boolean;
    cloud: boolean;
    mobile: boolean;
    tipsterPanel?: boolean;
  };
  customFeatures?: string[];
  inhibited?: boolean;
}

export const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: 'site',
    name: 'Subscrição do Site',
    desc: 'Acesso exclusivo aos canais e robôs web diretamente no browser sem compromissos. Com limitações de infraestrutura local.',
    price: 0.00,
    yearlyPrice: 0.00,
    oldPrice: 0.00,
    oldYearlyPrice: 0.00,
    badge: 'WEB ONLY / FREE',
    group: 1,
    features: {
      web: true,
      ev: true,
      radar: true,
      cloud: false,
      mobile: false,
    }
  },
  {
    id: 'pro',
    name: 'Plano Pro',
    desc: 'Tudo o que precisa com canais em nuvem, cálculo de odds inteligente, alertas dedicados e exportação total de dados/histórico para Excel.',
    price: 7.99,
    yearlyPrice: 76.70,
    oldPrice: 14.99,
    oldYearlyPrice: 143.90,
    badge: 'NUVEM & EXCEL',
    group: 1,
    features: {
      web: true,
      ev: true,
      radar: true,
      cloud: true,
      mobile: false,
    }
  },
  {
    id: 'pro_max',
    name: 'Pro MAX',
    desc: 'O pináculo de acessibilité. Todos os recursos Pro completos, nuvem em tempo real e acesso total às aplicações móveis nativas prontas para iOS & Android.',
    price: 14.99,
    yearlyPrice: 143.90,
    oldPrice: 19.99,
    oldYearlyPrice: 191.90,
    badge: 'PRO MAX UNLIMITED',
    group: 2,
    features: {
      web: true,
      ev: true,
      radar: true,
      cloud: true,
      mobile: true,
    }
  },
  {
    id: 'tipster',
    name: 'Subscrição do Tipster',
    desc: 'Torne-se um de nós! Painel de Tipster Oficial Verificado, publicação de prognósticos com auto-tracking, estatísticas públicas auditadas e integração total móvel iOS & Android.',
    price: 29.99,
    yearlyPrice: 287.90,
    oldPrice: 39.99,
    oldYearlyPrice: 383.90,
    badge: 'TIPSTER ELITE',
    group: 2,
    features: {
      web: true,
      ev: true,
      radar: true,
      cloud: true,
      mobile: true,
      tipsterPanel: true,
    }
  }
];

// Load plans from local storage or fallback to defaults
export const getCustomizablePlans = (): PricingPlan[] => {
  try {
    const raw = localStorage.getItem('irunbets_vip_plans_config');
    if (raw) {
      const parsed = JSON.parse(raw) as PricingPlan[];
      if (parsed && parsed.length > 0) {
        // Migration check: if any plan still uses old pricing structures, clear stale localStorage config to force brand new pricing
        const hasStalePricing = parsed.some(p => 
          (p.id === 'pro' && p.price === 14.90) || 
          (p.id === 'pro_max' && p.price === 19.90) || 
          (p.id === 'site' && p.features.ev === false)
        );
        if (hasStalePricing) {
          localStorage.removeItem('irunbets_vip_plans_config');
          return DEFAULT_PLANS;
        }

        // Ensure all default plans exist in stored config and have modern yearly pricing properties without losing other custom settings
        const merged = DEFAULT_PLANS.map(def => {
          const matched = parsed.find(p => p.id === def.id);
          if (matched) {
            // Plano Free (id: site) must always stay free (€0)
            const price = def.id === 'site' ? 0.00 : (typeof matched.price === 'number' ? matched.price : def.price);
            const yearlyPrice = def.id === 'site' ? 0.00 : (typeof matched.yearlyPrice === 'number' && matched.yearlyPrice > 0 ? matched.yearlyPrice : def.yearlyPrice);
            return {
              ...def,
              ...matched,
              price,
              yearlyPrice,
              oldYearlyPrice: (typeof matched.oldYearlyPrice === 'number' && matched.oldYearlyPrice > 0) ? matched.oldYearlyPrice : def.oldYearlyPrice,
              customFeatures: matched.customFeatures || []
            };
          }
          return def;
        });
        return merged;
      }
    }
  } catch (err) {
    console.error('Error loading plans config:', err);
  }
  return DEFAULT_PLANS;
};

// Save edited plans to local storage and sync across session
export const saveCustomizablePlans = (plans: PricingPlan[]) => {
  try {
    localStorage.setItem('irunbets_vip_plans_config', JSON.stringify(plans));
    savePricingPlansToFirebase(plans);
    // Trigger window event for reactivity in active screens
    window.dispatchEvent(new Event('irunbets_plans_updated'));
  } catch (err) {
    console.error('Error saving plans config:', err);
  }
};

// Map status name to pricing amount for upgrade calculations
export const getPriceByStatusName = (status: string, currentPlans: PricingPlan[] = getCustomizablePlans()): number => {
  const norm = status.toLowerCase();
  const isYearly = norm.includes('anual') || norm.includes('yearly') || norm.includes('ano');

  if (norm.includes('pro max') || norm.includes('pro_max')) {
    const p = currentPlans.find(plan => plan.id === 'pro_max');
    return p ? (isYearly ? p.yearlyPrice : p.price) : (isYearly ? 191.04 : 19.90);
  }
  if (norm.includes('site') || norm.includes('free') || norm.includes('gratuito')) {
    const p = currentPlans.find(plan => plan.id === 'site');
    return p ? (isYearly ? p.yearlyPrice : p.price) : 0;
  }
  if (norm.includes('pro')) {
    const p = currentPlans.find(plan => plan.id === 'pro');
    return p ? (isYearly ? p.yearlyPrice : p.price) : (isYearly ? 143.04 : 14.90);
  }
  if (norm.includes('tipster')) {
    const p = currentPlans.find(plan => plan.id === 'tipster');
    return p ? (isYearly ? p.yearlyPrice : p.price) : (isYearly ? 287.04 : 29.90);
  }
  return 0; // fallback default
};

// Map a specific plan ID to full standard status labels displayed in Admin
export const getStatusLabelFromPlanId = (planId: 'site' | 'basic' | 'pro' | 'basic_max' | 'pro_max' | 'tipster', plans: PricingPlan[] = getCustomizablePlans()): string => {
  const plan = plans.find(p => p.id === planId) || DEFAULT_PLANS.find(p => p.id === planId as any);
  if (!plan) return 'Gratuito';
  if (planId === 'site' || plan.price === 0) return `${plan.name} (Gratuito)`;
  return `${plan.name} (${plan.price.toFixed(2)}€)`;
};
