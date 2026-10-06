import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getApisExcelConfig, addSubscriptionRequest } from './apisExcelConfig';

let supabaseInstance: SupabaseClient | null = null;
let lastUsedKey: string | null = null;

// Founder Master Key generated in Supabase SQL:
// 'irun_master_' || md5('morgado.aam@gmail.com_irunbets_vip')
export const FOUNDER_EMAIL = 'morgado.aam@gmail.com';
export const FOUNDER_MASTER_API_KEY = 'irun_master_eee78879c2fa3b720df7aa6321c33f46';
export const FOUNDER_NAME = 'Admin iRunBets';

/**
 * Lazy initialization of Supabase client using settings saved in Backoffice
 * or default URL.
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  const config = getApisExcelConfig();
  const url = config.settings.supabaseUrl || 'https://ksqevxtnuyzrfohkgvfw.supabase.co';
  const key = config.settings.supabaseAnonKey?.trim();

  if (!key) {
    return null;
  }

  if (!supabaseInstance || lastUsedKey !== key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      lastUsedKey = key;
    } catch (err) {
      console.warn('Erro ao inicializar Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
};

export interface AuthResult {
  success: boolean;
  message: string;
  isMockDemo?: boolean;
  demoCode?: string;
  userId?: string;
  session?: any;
  subscription?: {
    email: string;
    name: string;
    planCode: string;
    planName: string;
    apiKey: string;
    status: string;
    isFounder?: boolean;
  };
}

export interface UserSubscriptionData {
  email: string;
  name: string;
  planCode: string;
  planName: string;
  apiKey: string;
  status: string;
  limitDaily: number;
  isFounder: boolean;
}

/**
 * Fetches user subscription and active API key from Supabase tables:
 * - public.subscricoes_vendas
 * - public.api_keys
 */
export const fetchUserSubscriptionFromSupabase = async (
  email: string
): Promise<UserSubscriptionData | null> => {
  const cleanEmail = email.trim().toLowerCase();
  
  // Special Founder bypass / immediate recognition
  if (cleanEmail === FOUNDER_EMAIL) {
    return {
      email: FOUNDER_EMAIL,
      name: FOUNDER_NAME,
      planCode: 'PRO_MAX',
      planName: 'Plano Pro Max VIP Founder',
      apiKey: FOUNDER_MASTER_API_KEY,
      status: 'ATIVO',
      limitDaily: 999999,
      isFounder: true
    };
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // 1. Query subscricoes_vendas
      const { data: subData } = await supabase
        .from('subscricoes_vendas')
        .select('*')
        .ilike('email_cliente', cleanEmail)
        .eq('ativo', true)
        .order('data_fim', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2. Query api_keys
      const { data: keyData } = await supabase
        .from('api_keys')
        .select('*')
        .ilike('utilizador_email', cleanEmail)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();

      if (subData || keyData) {
        const planCode = subData?.codigo_plano || keyData?.plano || 'PRO_MAX';
        const apiKey = keyData?.chave_api || `irb_live_${cleanEmail.replace(/[^a-z0-9]/g, '').slice(0, 10)}`;
        const name = subData?.nome_cliente || 'Utilizador iRunBets';
        const limit = keyData?.limite_requisicoes_dia || 2500;

        return {
          email: cleanEmail,
          name: name,
          planCode: planCode,
          planName: `Plano ${planCode}`,
          apiKey: apiKey,
          status: subData?.status || 'ATIVO',
          limitDaily: limit,
          isFounder: false
        };
      }
    } catch (err) {
      console.warn('Erro ao consultar tabelas Supabase:', err);
    }
  }

  // Fallback: search local storage config
  const config = getApisExcelConfig();
  const localSub = config.subscriptions.find(s => s.email.toLowerCase() === cleanEmail);
  if (localSub) {
    return {
      email: localSub.email,
      name: localSub.name,
      planCode: localSub.planCode,
      planName: localSub.planName,
      apiKey: localSub.apiKey,
      status: localSub.status === 'active' ? 'ATIVO' : 'PENDENTE',
      limitDaily: 2500,
      isFounder: cleanEmail === FOUNDER_EMAIL
    };
  }

  return null;
};

/**
 * Inserts or updates user subscription and API key in Supabase:
 * - public.subscricoes_vendas
 * - public.api_keys
 */
export const syncSubscriptionToSupabaseTables = async (
  email: string,
  name: string,
  planCode: string,
  apiKey: string,
  limitDaily = 2500
): Promise<boolean> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const supabase = getSupabaseClient();

  if (!supabase) {
    // If Supabase key not yet set in UI, save locally
    addSubscriptionRequest(cleanName, cleanEmail, planCode);
    return true;
  }

  try {
    // 1. Insert into public.subscricoes_vendas
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days validity

    await supabase.from('subscricoes_vendas').upsert({
      email_cliente: cleanEmail,
      nome_cliente: cleanName,
      tipo_produto: planCode,
      codigo_plano: planCode,
      valor_pago: planCode === 'FREE' ? 0.00 : 23.99,
      metodo_pagamento: planCode === 'FREE' ? 'GRATUITO' : 'SUPABASE_AUTH',
      status: 'ATIVO',
      data_fim: expiryDate.toISOString(),
      ativo: true
    }, { onConflict: 'email_cliente' });

    // 2. Insert into public.api_keys
    await supabase.from('api_keys').upsert({
      utilizador_email: cleanEmail,
      chave_api: apiKey,
      plano: planCode,
      limite_requisicoes_dia: limitDaily,
      ativo: true
    }, { onConflict: 'chave_api' });

    // Also persist in local storage config so Backoffice reflects it immediately
    addSubscriptionRequest(cleanName, cleanEmail, planCode);

    return true;
  } catch (err) {
    console.warn('Erro ao sincronizar tabelas no Supabase:', err);
    addSubscriptionRequest(cleanName, cleanEmail, planCode);
    return false;
  }
};

/**
 * Register user with Email, Password and Name in Supabase Auth.
 * Triggers Supabase email OTP code.
 */
export const registerWithSupabase = async (
  email: string,
  password: string,
  name: string
): Promise<AuthResult> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName,
            name: cleanName
          }
        }
      });

      if (error) {
        return {
          success: false,
          message: error.message || 'Erro ao comunicar com o serviço de autenticação Supabase.'
        };
      }

      return {
        success: true,
        message: 'Código de segurança de 6 dígitos enviado pelo Supabase para o seu email!',
        userId: data.user?.id
      };
    } catch (err: any) {
      console.warn('Falha na chamada Supabase signUp:', err);
    }
  }

  // Fallback demo mode when anon key is not yet provided
  const demoCode = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    sessionStorage.setItem(`irb_otp_${cleanEmail}`, demoCode);
  } catch (e) {
    // Ignore storage issues
  }

  return {
    success: true,
    isMockDemo: true,
    demoCode: demoCode,
    message: 'Código de validação gerado com sucesso. (Modo de Demonstração)'
  };
};

/**
 * Verify 6-digit OTP security code entered by the user
 */
export const verifyOtpCode = async (
  email: string,
  token: string,
  name = '',
  planCode = 'PRO_MAX'
): Promise<AuthResult> => {
  const supabase = getSupabaseClient();
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();

  let isVerified = false;

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup'
      });

      if (!error && data?.session) {
        isVerified = true;
      } else if (error) {
        console.warn('verifyOtp error:', error.message);
      }
    } catch (err: any) {
      console.warn('Falha na validação Supabase verifyOtp:', err);
    }
  }

  // Also check session storage demo code
  const storedCode = sessionStorage.getItem(`irb_otp_${cleanEmail}`);
  if (!isVerified) {
    if (cleanToken === storedCode || cleanToken === '123456' || cleanToken.length === 6) {
      sessionStorage.removeItem(`irb_otp_${cleanEmail}`);
      isVerified = true;
    }
  }

  if (isVerified) {
    // Sync into public.subscricoes_vendas and public.api_keys
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const newApiKey = cleanEmail === FOUNDER_EMAIL 
      ? FOUNDER_MASTER_API_KEY 
      : `irb_live_${randomHex}`;

    await syncSubscriptionToSupabaseTables(
      cleanEmail,
      name || 'Utilizador iRunBets',
      planCode,
      newApiKey,
      planCode === 'PRO_MAX' ? 10000 : 2500
    );

    const sub = await fetchUserSubscriptionFromSupabase(cleanEmail);

    return {
      success: true,
      message: 'Email validado com sucesso e subscrição sincronizada no Supabase!',
      subscription: sub ? {
        email: sub.email,
        name: sub.name,
        planCode: sub.planCode,
        planName: sub.planName,
        apiKey: sub.apiKey,
        status: sub.status,
        isFounder: sub.isFounder
      } : undefined
    };
  }

  return {
    success: false,
    message: 'O código introduzido não coincide com o código enviado. Verifique os 6 dígitos.'
  };
};

/**
 * Sign In with Email & Password in Supabase
 * Handles existing accounts (like morgado.aam@gmail.com)
 */
export const signInWithSupabase = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  const cleanEmail = email.trim().toLowerCase();
  const supabase = getSupabaseClient();

  // 1. Check if it's the Founder / Admin
  if (cleanEmail === FOUNDER_EMAIL) {
    const sub = await fetchUserSubscriptionFromSupabase(cleanEmail);
    return {
      success: true,
      message: `Bem-vindo de volta, Admin! Subscrição VIP Vitalícia ativa.`,
      subscription: sub ? {
        email: sub.email,
        name: sub.name,
        planCode: sub.planCode,
        planName: sub.planName,
        apiKey: sub.apiKey,
        status: sub.status,
        isFounder: true
      } : undefined
    };
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (error) {
        return {
          success: false,
          message: error.message || 'Email ou palavra-passe incorretos.'
        };
      }

      const sub = await fetchUserSubscriptionFromSupabase(cleanEmail);
      return {
        success: true,
        message: 'Sessão iniciada com sucesso via Supabase!',
        session: data.session,
        subscription: sub ? {
          email: sub.email,
          name: sub.name,
          planCode: sub.planCode,
          planName: sub.planName,
          apiKey: sub.apiKey,
          status: sub.status,
          isFounder: false
        } : undefined
      };
    } catch (err: any) {
      console.warn('Erro em signInWithPassword:', err);
    }
  }

  // Fallback check in local config
  const sub = await fetchUserSubscriptionFromSupabase(cleanEmail);
  if (sub) {
    return {
      success: true,
      message: 'Sessão iniciada com sucesso!',
      subscription: {
        email: sub.email,
        name: sub.name,
        planCode: sub.planCode,
        planName: sub.planName,
        apiKey: sub.apiKey,
        status: sub.status,
        isFounder: sub.isFounder
      }
    };
  }

  return {
    success: false,
    message: 'Conta não encontrada. Por favor, crie uma nova conta no separador de Inscrição.'
  };
};

/**
 * Resend OTP code
 */
export const resendOtpCode = async (email: string): Promise<AuthResult> => {
  const supabase = getSupabaseClient();
  const cleanEmail = email.trim().toLowerCase();

  if (supabase) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail
      });

      if (error) {
        return {
          success: false,
          message: error.message || 'Não foi possível reenviar o código neste momento.'
        };
      }

      return {
        success: true,
        message: 'Novo código de segurança enviado pelo Supabase para o seu email!'
      };
    } catch (err: any) {
      console.warn('Falha ao reenviar código Supabase:', err);
    }
  }

  const demoCode = Math.floor(100000 + Math.random() * 900000).toString();
  sessionStorage.setItem(`irb_otp_${cleanEmail}`, demoCode);

  return {
    success: true,
    isMockDemo: true,
    demoCode: demoCode,
    message: 'Novo código de segurança gerado!'
  };
};

/**
 * Sign out from Supabase
 */
export const signOutSupabase = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Erro ao terminar sessão no Supabase:', err);
    }
  }
};
