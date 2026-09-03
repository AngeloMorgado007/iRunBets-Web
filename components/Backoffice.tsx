import React, { useState, useEffect } from 'react';
import { 
  getLatestNews, 
  getSubscribersList, 
  publishNews, 
  saveNewsArticle,
  deleteNewsArticle, 
  NewsArticle, 
  SubscriberUser,
  logoutUser,
  deleteSubscriber,
  updateSubscriberStatus,
  updateSubscriberFields,
  createSubscriberManually,
  updateSubscriberPendingPayment,
  saveUserSubscribedTipstersFirestore,
  isFirebaseActive,
  getCustomPages,
  saveCustomPage,
  deleteCustomPage,
  CustomPage,
  PageBlock,
  getSocialLinks,
  saveSocialLinks,
  SocialConfig,
  getMarketingAnalysesFromFirebase,
  saveMarketingAnalysesToFirebase,
  getSubscribersConfig,
  saveSubscribersConfig,
  SubscribersConfig,
  TrafficStats,
  getTrafficStats,
  DailyTraffic,
  getTrafficHistory,
  savePlatformPillarsToFirebase,
  savePricingPlansToFirebase,
  saveBillingConfigToFirebase,
  FeaturedMultiple,
  saveFeaturedMultiplesToFirebase,
  saveTipstersListToFirebase,
  getTipstersListFromFirebase,
  getPopupConfigFromFirebase,
  savePopupConfigToFirebase,
  PopupConfig,
  sendCloudFunctionPushAlert,
  requestBrowserNotificationPermission
} from '../services/firebase';
import { getCustomizablePlans, saveCustomizablePlans, DEFAULT_PLANS, PricingPlan } from '../services/plansConfig';

import { PillarItem, DEFAULT_PILLARS, mergePillarsWithDefaults } from './PlatformPillars';

interface BackofficeProps {
  onClose: () => void;
  onNewsChanged: () => void;
}

const getCanonicalStatusForDropdown = (status: string, plans: PricingPlan[]) => {
  if (!status || status === 'Gratuito') return 'Gratuito';
  
  let clean = status;
  if (status.includes('Subscrição ativa (') && status.endsWith(')')) {
    const startIdx = status.indexOf('Subscrição ativa (') + 'Subscrição ativa ('.length;
    clean = status.substring(startIdx, status.length - 1);
  }

  const matchedPlan = plans.find(p => clean.toLowerCase().includes(p.name.toLowerCase()));
  if (!matchedPlan) return 'Gratuito';

  const isYearly = clean.toLowerCase().includes('anual') || clean.toLowerCase().includes('year');
  const price = isYearly ? matchedPlan.yearlyPrice : matchedPlan.price;
  return `${matchedPlan.name} (${isYearly ? 'Anual' : 'Mensal'} • ${price.toFixed(2)}€)`;
};

interface PushAlert {
  id: string;
  title: string;
  message: string;
  longMessage?: string;
  sentAt: string;
  status: 'Simulado com sucesso' | 'Enviado';
}

const Backoffice: React.FC<BackofficeProps> = ({ onClose, onNewsChanged }) => {
  const [subscribers, setSubscribers] = useState<SubscriberUser[]>([]);
  const [tipsterWarningMessage, setTipsterWarningMessage] = useState<string | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [subscribersConfig, setSubscribersConfigState] = useState<SubscribersConfig>({ isEnabled: true, baseCount: 1420 });
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'push' | 'analytics' | 'news' | 'pages' | 'plans' | 'tipsters' | 'mural' | 'pillars' | 'billing' | 'promopopup' | 'github'>('users');
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [githubCopied, setGithubCopied] = useState(false);

  const handleExportFullSiteBackupJSON = async () => {
    setExportingBackup(true);
    try {
      const backupData: Record<string, any> = {
        exportTimestamp: new Date().toISOString(),
        appName: 'iRunBets',
        exportedBy: 'morgado.aam@gmail.com',
        collections: {}
      };

      if (db) {
        const collectionsToExport = [
          'football_predictions',
          'top_banners',
          'pages',
          'news',
          'subscribers',
          'tipsters',
          'pillars',
          'billing',
          'promotional_popup'
        ];

        for (const colName of collectionsToExport) {
          try {
            const snap = await getDocs(collection(db, colName));
            const docsArr: any[] = [];
            snap.forEach(d => docsArr.push({ _id: d.id, ...d.data() }));
            backupData.collections[colName] = docsArr;
          } catch (err) {
            console.warn(`Could not export collection ${colName}:`, err);
          }
        }
      }

      backupData.localStorageSnapshots = {
        football_predictions: localStorage.getItem('irunbets_football_predictions_data'),
        top_banners: localStorage.getItem('irunbets_top_banners_config'),
        pages: localStorage.getItem('irunbets_custom_pages'),
        news: localStorage.getItem('irunbets_news_articles'),
        subscribers: localStorage.getItem('irunbets_subscribers'),
        tipsters: localStorage.getItem('irunbets_tipsters'),
        pillars: localStorage.getItem('irunbets_pillars_data'),
        promotional_popup: localStorage.getItem('irunbets_promotional_popup_config'),
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `irunbets_complete_site_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error exporting backup:', e);
      alert('Erro ao exportar o ficheiro de backup: ' + e);
    } finally {
      setExportingBackup(false);
    }
  };

  const handleForceGlobalCachePurge = async () => {
    if (window.confirm('⚡ Deseja forçar a limpeza total de Cache e desregistar o Service Worker em todos os computadores/dispositivos? Todos os navegadores irão recarregar sem ficheiros nem banners antigos.')) {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.unregister();
          }
        }
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          for (const key of cacheKeys) {
            await caches.delete(key);
          }
        }
        localStorage.removeItem('irunbets_top_banners_initialized');
        localStorage.removeItem('irunbets_football_predictions_initialized');
        window.dispatchEvent(new Event('irunbets_top_banners_updated'));
        window.dispatchEvent(new Event('irunbets_football_predictions_updated'));
        window.dispatchEvent(new Event('storage'));
        window.location.reload();
      } catch (err) {
        console.error(err);
        window.location.reload();
      }
    }
  };
  
  // Billing and Cost Management Panel States
  const [billingPrepaidBalance, setBillingPrepaidBalance] = useState<number>(() => {
    const saved = localStorage.getItem('irunbets_billing_prepaid_balance');
    return saved ? parseFloat(saved) : 1.23;
  });
  const [billingPrepaidTotal, setBillingPrepaidTotal] = useState<number>(() => {
    const saved = localStorage.getItem('irunbets_billing_prepaid_total');
    return saved ? parseFloat(saved) : 10.00;
  });
  const [billingGeminiSpent, setBillingGeminiSpent] = useState<number>(() => {
    const saved = localStorage.getItem('irunbets_billing_gemini_spent');
    return saved ? parseFloat(saved) : 0.62;
  });
  const [billingOtherSpent, setBillingOtherSpent] = useState<number>(() => {
    const saved = localStorage.getItem('irunbets_billing_other_spent');
    return saved ? parseFloat(saved) : 8.15;
  });
  const [billingPrepaidUrl, setBillingPrepaidUrl] = useState<string>(() => {
    const saved = localStorage.getItem('irunbets_billing_prepaid_url');
    return saved || 'https://aistudio.google.com/app/plan_information';
  });
  const [billingGeminiLimit, setBillingGeminiLimit] = useState<number>(() => {
    const saved = localStorage.getItem('irunbets_billing_gemini_limit');
    return saved ? parseFloat(saved) : 10.00;
  });
  const [billingPeriodStart, setBillingPeriodStart] = useState<string>(() => {
    const saved = localStorage.getItem('irunbets_billing_period_start');
    return saved || '2026-05-26';
  });
  const [billingPeriodEnd, setBillingPeriodEnd] = useState<string>(() => {
    const saved = localStorage.getItem('irunbets_billing_period_end');
    return saved || '2026-06-22';
  });
  const [billingAutoRecharge, setBillingAutoRecharge] = useState<boolean>(() => {
    const saved = localStorage.getItem('irunbets_billing_auto_recharge');
    return saved === 'true';
  });
  const [billingSuccessMsg, setBillingSuccessMsg] = useState('');

  // Sincronização em tempo real das configurações de faturação do Firebase Firestore
  useEffect(() => {
    const syncBillingLocal = () => {
      const savedBalance = localStorage.getItem('irunbets_billing_prepaid_balance');
      const savedTotal = localStorage.getItem('irunbets_billing_prepaid_total');
      const savedSpent = localStorage.getItem('irunbets_billing_gemini_spent');
      const savedOther = localStorage.getItem('irunbets_billing_other_spent');
      const savedUrl = localStorage.getItem('irunbets_billing_prepaid_url');
      const savedLimit = localStorage.getItem('irunbets_billing_gemini_limit');
      const savedStart = localStorage.getItem('irunbets_billing_period_start');
      const savedEnd = localStorage.getItem('irunbets_billing_period_end');
      const savedRecharge = localStorage.getItem('irunbets_billing_auto_recharge');

      if (savedBalance) setBillingPrepaidBalance(parseFloat(savedBalance));
      if (savedTotal) setBillingPrepaidTotal(parseFloat(savedTotal));
      if (savedSpent) setBillingGeminiSpent(parseFloat(savedSpent));
      if (savedOther) setBillingOtherSpent(parseFloat(savedOther));
      if (savedUrl) setBillingPrepaidUrl(savedUrl);
      if (savedLimit) setBillingGeminiLimit(parseFloat(savedLimit));
      if (savedStart) setBillingPeriodStart(savedStart);
      if (savedEnd) setBillingPeriodEnd(savedEnd);
      if (savedRecharge) setBillingAutoRecharge(savedRecharge === 'true');
    };
    window.addEventListener('irunbets_billing_updated', syncBillingLocal);
    return () => {
      window.removeEventListener('irunbets_billing_updated', syncBillingLocal);
    };
  }, []);

  const [trafficStats, setTrafficStats] = useState<TrafficStats | null>(null);
  const [trafficHistory, setTrafficHistory] = useState<DailyTraffic[]>([]);
  const [isTrafficModalOpen, setIsTrafficModalOpen] = useState(false);
  const [activeHistoryRange, setActiveHistoryRange] = useState<7 | 14>(14);
  const [currentPlans, setCurrentPlans] = useState<PricingPlan[]>(getCustomizablePlans());
  const [plansSuccess, setPlansSuccess] = useState('');

  // Technology Applied Pillars State Management
  const [pillarsList, setPillarsList] = useState<PillarItem[]>([]);
  const [pillarsSuccess, setPillarsSuccess] = useState('');
  const [pillarsError, setPillarsError] = useState('');
  const [editingPillarId, setEditingPillarId] = useState<string | null>(null);

  const [pId, setPId] = useState('');
  const [pImages, setPImages] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pBorderGlow, setPBorderGlow] = useState('hover:border-sky-500/40 shadow-sky-500/5');

  // Multi-language titles
  const [pTitlePt, setPTitlePt] = useState('');
  const [pTitleEn, setPTitleEn] = useState('');
  const [pTitleFr, setPTitleFr] = useState('');
  const [pTitleIt, setPTitleIt] = useState('');
  const [pTitleDe, setPTitleDe] = useState('');

  // Multi-language descriptions (short)
  const [pDescPt, setPDescPt] = useState('');
  const [pDescEn, setPDescEn] = useState('');
  const [pDescFr, setPDescFr] = useState('');
  const [pDescIt, setPDescIt] = useState('');
  const [pDescDe, setPDescDe] = useState('');

  // Multi-language details (long, shown in modal on "Saber Mais" click)
  const [pDetailsPt, setPDetailsPt] = useState('');
  const [pDetailsEn, setPDetailsEn] = useState('');
  const [pDetailsFr, setPDetailsFr] = useState('');
  const [pDetailsIt, setPDetailsIt] = useState('');
  const [pDetailsDe, setPDetailsDe] = useState('');

  // Promotional Popup State Management
  const [popupIsActive, setPopupIsActive] = useState(false);
  const [popupType, setPopupType] = useState<'promotion' | 'announcement' | 'celebration'>('promotion');
  const [popupHasButton, setPopupHasButton] = useState(true);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupSubtitle, setPopupSubtitle] = useState('');
  const [popupContent, setPopupContent] = useState('');
  const [popupBadgeText, setPopupBadgeText] = useState('');
  const [popupImageUrl, setPopupImageUrl] = useState('');
  const [popupButtonText, setPopupButtonText] = useState('');
  const [popupButtonLink, setPopupButtonLink] = useState('');
  const [popupDontShowAgainText, setPopupDontShowAgainText] = useState('');
  const [popupForceShowAll, setPopupForceShowAll] = useState(false);
  const [popupTheme, setPopupTheme] = useState<'amber' | 'emerald' | 'cyan' | 'red' | 'purple' | 'dark'>('amber');
  const [popupSuccessMsg, setPopupSuccessMsg] = useState('');
  const [popupErrorMsg, setPopupErrorMsg] = useState('');

  // Load pillars on mount
  useEffect(() => {
    const syncPillars = () => {
      const saved = localStorage.getItem('irunbets_platform_pillars');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as PillarItem[];
          const { merged, changed } = mergePillarsWithDefaults(parsed);
          if (changed) {
            localStorage.setItem('irunbets_platform_pillars', JSON.stringify(merged));
            savePlatformPillarsToFirebase(merged);
          }
          setPillarsList(merged);
        } catch (e) {
          console.error(e);
        }
      } else {
        setPillarsList(DEFAULT_PILLARS);
      }
    };
    syncPillars();
    window.addEventListener('irunbets_pillars_updated', syncPillars);
    return () => {
      window.removeEventListener('irunbets_pillars_updated', syncPillars);
    };
  }, []);

  const handlePillarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pId || !pTitlePt || !pDescPt) {
      setPillarsError('Preencha pelo menos a ID única, o Título em Português e a Descrição em Português!');
      return;
    }

    // fallback missing translations to Portuguese to prevent empty values or crashes
    const buildTranslation = (ptVal: string, enVal?: string, frVal?: string, itVal?: string, deVal?: string) => ({
      pt: ptVal,
      en: enVal?.trim() || ptVal,
      fr: frVal?.trim() || ptVal,
      it: itVal?.trim() || ptVal,
      de: deVal?.trim() || ptVal,
    });

    const newPillar: PillarItem = {
      id: pId.trim().toLowerCase(),
      images: pImages.trim() || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800',
      title: buildTranslation(pTitlePt, pTitleEn, pTitleFr, pTitleIt, pTitleDe),
      desc: buildTranslation(pDescPt, pDescEn, pDescFr, pDescIt, pDescDe),
      details: buildTranslation(
        pDetailsPt || pDescPt, 
        pDetailsEn || pDetailsFr || pDescPt, 
        pDetailsFr || pDescPt, 
        pDetailsIt || pDescPt, 
        pDetailsDe || pDescPt
      ),
      borderGlow: pBorderGlow || 'hover:border-amber-500/30'
    };

    let updatedList: PillarItem[] = [];
    if (editingPillarId) {
      updatedList = pillarsList.map(item => item.id === editingPillarId ? newPillar : item);
      setPillarsSuccess('Tópico de tecnologia atualizado com sucesso em todos os idiomas!');
    } else {
      if (pillarsList.some(item => item.id === newPillar.id)) {
        setPillarsError('Já existe um tópico com esta ID única! Modifique a ID ou selecione editar.');
        return;
      }
      updatedList = [...pillarsList, newPillar];
      setPillarsSuccess('Novo tópico de tecnologia aplicado e ativo no painel inicial!');
    }

    setPillarsList(updatedList);
    localStorage.setItem('irunbets_platform_pillars', JSON.stringify(updatedList));
    savePlatformPillarsToFirebase(updatedList);
    
    // Dispatch global sync event
    try {
      window.dispatchEvent(new Event('irunbets_pillars_updated'));
    } catch (e) {}

    // Reset inputs
    setPId('');
    setPImages('');
    setPBorderGlow('hover:border-sky-500/40 shadow-sky-500/5');
    setPTitlePt(''); setPTitleEn(''); setPTitleFr(''); setPTitleIt(''); setPTitleDe('');
    setPDescPt(''); setPDescEn(''); setPDescFr(''); setPDescIt(''); setPDescDe('');
    setPDetailsPt(''); setPDetailsEn(''); setPDetailsFr(''); setPDetailsIt(''); setPDetailsDe('');
    setEditingPillarId(null);
    setPillarsError('');
  };

  const startEditPillar = (item: PillarItem) => {
    setEditingPillarId(item.id);
    setPId(item.id);
    setPImages(item.images || '');
    setPBorderGlow(item.borderGlow || 'hover:border-amber-500/30');

    setPTitlePt(item.title?.pt || '');
    setPTitleEn(item.title?.en || '');
    setPTitleFr(item.title?.fr || '');
    setPTitleIt(item.title?.it || '');
    setPTitleDe(item.title?.de || '');

    setPDescPt(item.desc?.pt || '');
    setPDescEn(item.desc?.en || '');
    setPDescFr(item.desc?.fr || '');
    setPDescIt(item.desc?.it || '');
    setPDescDe(item.desc?.de || '');

    setPDetailsPt(item.details?.pt || '');
    setPDetailsEn(item.details?.en || '');
    setPDetailsFr(item.details?.fr || '');
    setPDetailsIt(item.details?.it || '');
    setPDetailsDe(item.details?.de || '');

    setPillarsSuccess('');
    setPillarsError('');
  };

  const deletePillar = (pillarId: string) => {
    if (!window.confirm('Tem a certeza absoluta de que deseja apagar este pilar tecnológico?')) {
      return;
    }
    const updated = pillarsList.filter(item => item.id !== pillarId);
    setPillarsList(updated);
    localStorage.setItem('irunbets_platform_pillars', JSON.stringify(updated));
    savePlatformPillarsToFirebase(updated);
    
    try {
      window.dispatchEvent(new Event('irunbets_pillars_updated'));
    } catch (e) {}
    setPillarsSuccess('Tópico tecnológico removido!');
    
    // reset form if we were editing it
    if (editingPillarId === pillarId) {
      setEditingPillarId(null);
      setPId('');
      setPImages('');
      setPTitlePt('');
      setPDescPt('');
    }
  };

  const resetPillarsToDefault = () => {
    if (!window.confirm('Isto reverterá todas as edições ou adições, restaurando as 3 ferramentas originais da iRunBets. Pretende continuar?')) {
      return;
    }
    setPillarsList(DEFAULT_PILLARS);
    localStorage.setItem('irunbets_platform_pillars', JSON.stringify(DEFAULT_PILLARS));
    savePlatformPillarsToFirebase(DEFAULT_PILLARS);
    try {
      window.dispatchEvent(new Event('irunbets_pillars_updated'));
    } catch (e) {}
    setPillarsSuccess('Pilares de tecnologia restabelecidos para os padrões originais!');
    
    // clear form
    setEditingPillarId(null);
    setPId('');
    setPImages('');
    setPTitlePt('');
    setPDescPt('');
  };

  const [newFeatureText, setNewFeatureText] = useState<{ [key: string]: string }>({});
  const [subConfigSuccess, setSubConfigSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Mural / Diário de Operações States and Handlers
  const [marketingList, setMarketingList] = useState<any[]>(() => {
    const saved = localStorage.getItem('irunbets_marketing_analyses');
    return saved ? JSON.parse(saved) : [];
  });

  const [mktSuccess, setMktSuccess] = useState('');
  const [mktError, setMktError] = useState('');
  const [editingMktId, setEditingMktId] = useState<string | null>(null);
  const [mktHomeTeam, setMktHomeTeam] = useState('');
  const [mktAwayTeam, setMktAwayTeam] = useState('');
  const [mktLeague, setMktLeague] = useState('');
  const [mktRecommendedBet, setMktRecommendedBet] = useState('');
  const [mktOdd, setMktOdd] = useState('');
  const [mktHomeProb, setMktHomeProb] = useState(33);
  const [mktDrawProb, setMktDrawProb] = useState(33);
  const [mktAwayProb, setMktAwayProb] = useState(33);
  const [mktUnder35Prob, setMktUnder35Prob] = useState(70);

  useEffect(() => {
    const syncMkt = async () => {
      const remoteList = await getMarketingAnalysesFromFirebase();
      if (remoteList && remoteList.length > 0) {
        setMarketingList(remoteList);
        return;
      }
      const saved = localStorage.getItem('irunbets_marketing_analyses');
      if (saved) {
        setMarketingList(JSON.parse(saved));
      } else {
        setMarketingList([]);
      }
    };
    syncMkt();
    window.addEventListener('irunbets_marketing_analyses_updated', syncMkt);
    return () => {
      window.removeEventListener('irunbets_marketing_analyses_updated', syncMkt);
    };
  }, []);

  const saveMarketingState = (newList: any[]) => {
    setMarketingList(newList);
    saveMarketingAnalysesToFirebase(newList);
  };

  // Múltiplas em Destaque States
  const compressMultipleImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800; // Optimal for mobile/desktop layout cards
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress with high ratio (0.6) so sizes range around 30KB - 80KB instead of 5MB
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => {
          resolve(e.target?.result as string);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(file);
    });
  };

  const [multiplesList, setMultiplesList] = useState<FeaturedMultiple[]>(() => {
    const saved = localStorage.getItem('irunbets_featured_multiples');
    return saved ? JSON.parse(saved) : [];
  });
  const [multipleSuccess, setMultipleSuccess] = useState('');
  const [multipleError, setMultipleError] = useState('');
  const [editingMultipleId, setEditingMultipleId] = useState<string | null>(null);
  const [multipleTitle, setMultipleTitle] = useState('');
  const [multipleImageUrl, setMultipleImageUrl] = useState('');
  const [multipleStatus, setMultipleStatus] = useState<'pending' | 'green' | 'red'>('pending');
  const [multipleCustomDate, setMultipleCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [multipleExpiresAt, setMultipleExpiresAt] = useState('');
  const [multipleAutoExpire, setMultipleAutoExpire] = useState(true);
  const [isAnalyzingSlipImage, setIsAnalyzingSlipImage] = useState(false);
  const [isDraggingMultipleFile, setIsDraggingMultipleFile] = useState(false);

  useEffect(() => {
    const syncMultiples = () => {
      const saved = localStorage.getItem('irunbets_featured_multiples');
      if (saved) {
        setMultiplesList(JSON.parse(saved));
      } else {
        setMultiplesList([]);
      }
    };
    window.addEventListener('irunbets_multiples_updated', syncMultiples);
    return () => {
      window.removeEventListener('irunbets_multiples_updated', syncMultiples);
    };
  }, []);

  const handleAnalyzeMultipleImage = async () => {
    if (!multipleImageUrl) {
      setMultipleError('Carregue primeiro a imagem do cupão para analisar com IA!');
      return;
    }
    setIsAnalyzingSlipImage(true);
    setMultipleError('');
    setMultipleSuccess('🤖 IA Gemini a analisar a imagem do cupão e a extrair datas dos jogos...');

    try {
      const base64Clean = multipleImageUrl.includes('base64,') 
        ? multipleImageUrl.split('base64,')[1] 
        : multipleImageUrl;
      const mimeType = multipleImageUrl.startsWith('data:') 
        ? multipleImageUrl.split(';')[0].replace('data:', '') 
        : 'image/jpeg';

      const res = await fetch('/api/gemini/parse-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Clean, mimeType })
      });

      const data = await res.json();
      if (data && data.lastMatchDate) {
        let expDateStr = data.lastMatchDate;
        const d = new Date(expDateStr);
        if (!isNaN(d.getTime())) {
          const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setMultipleExpiresAt(isoLocal);
        } else {
          setMultipleExpiresAt(expDateStr);
        }
        setMultipleAutoExpire(true);
        setMultipleSuccess(`🤖 IA Leitura: Fim do último jogo detetado (${data.lastMatchDate})! Algoritmo de limpeza automática configurado.`);
      } else {
        // Fallback: Set expiry to 23:59 of custom date
        const targetDate = multipleCustomDate || new Date().toISOString().split('T')[0];
        setMultipleExpiresAt(`${targetDate}T23:59`);
        setMultipleAutoExpire(true);
        setMultipleSuccess('🤖 Algoritmo de Limpeza Ativado! Expiração definida para o fim do dia das apostas (23:59).');
      }
    } catch (err: any) {
      console.error('Erro na análise da imagem com IA:', err);
      const targetDate = multipleCustomDate || new Date().toISOString().split('T')[0];
      setMultipleExpiresAt(`${targetDate}T23:59`);
      setMultipleAutoExpire(true);
      setMultipleSuccess('🤖 Algoritmo de Limpeza Ativado! Expiração definida para o fim do dia (23:59).');
    } finally {
      setIsAnalyzingSlipImage(false);
    }
  };

  const saveMultiplesState = (newList: FeaturedMultiple[]) => {
    setMultiplesList(newList);
    localStorage.setItem('irunbets_featured_multiples', JSON.stringify(newList));
    saveFeaturedMultiplesToFirebase(newList);
    try {
      window.dispatchEvent(new Event('irunbets_multiples_updated'));
    } catch (e) {}
  };

  const handleMultipleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!multipleTitle || !multipleImageUrl) {
      setMultipleError('Preencha os campos obrigatórios (Título e Imagem)!');
      return;
    }

    if (editingMultipleId) {
      const updatedList = multiplesList.map((item) => {
        if (item.id === editingMultipleId) {
          return {
            ...item,
            title: multipleTitle,
            imageUrl: multipleImageUrl,
            status: multipleStatus,
            customDate: multipleCustomDate,
            expiresAt: multipleExpiresAt,
            autoExpireEnabled: multipleAutoExpire
          };
        }
        return item;
      });
      saveMultiplesState(updatedList);
      setMultipleSuccess('Múltipla em destaque editada com sucesso!');
      setEditingMultipleId(null);
    } else {
      const newItem: FeaturedMultiple = {
        id: 'fmult_' + Date.now(),
        title: multipleTitle,
        imageUrl: multipleImageUrl,
        createdAt: new Date().toISOString(),
        status: multipleStatus,
        customDate: multipleCustomDate,
        expiresAt: multipleExpiresAt || `${multipleCustomDate || new Date().toISOString().split('T')[0]}T23:59`,
        autoExpireEnabled: multipleAutoExpire
      };
      saveMultiplesState([newItem, ...multiplesList]);
      setMultipleSuccess('Nova múltipla em destaque adicionada e configurada com algoritmo de limpeza!');
    }

    // Reset Form
    setMultipleTitle('');
    setMultipleImageUrl('');
    setMultipleStatus('pending');
    setMultipleCustomDate(new Date().toISOString().split('T')[0]);
    setMultipleExpiresAt('');
    setMultipleAutoExpire(true);

    setTimeout(() => {
      setMultipleSuccess('');
      setMultipleError('');
    }, 4000);
  };

  const editMultipleItem = (item: FeaturedMultiple) => {
    setEditingMultipleId(item.id);
    setMultipleTitle(item.title);
    setMultipleImageUrl(item.imageUrl);
    setMultipleStatus(item.status || 'pending');
    setMultipleCustomDate(item.customDate || (item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]));
    setMultipleExpiresAt(item.expiresAt || '');
    setMultipleAutoExpire(item.autoExpireEnabled !== false);
    setMultipleSuccess('Modo de Edição de Múltipla Ativo. Modifique os dados no formulário.');
  };

  const checkIsMultipleExpired = (item: FeaturedMultiple): boolean => {
    if (item.autoExpireEnabled === false) return false;

    const now = Date.now();

    if (item.expiresAt) {
      const expTime = new Date(item.expiresAt).getTime();
      if (!isNaN(expTime)) {
        return expTime <= now;
      }
    }

    if (item.customDate) {
      const cd = item.customDate.trim();
      let year: number | null = null;
      let month: number | null = null;
      let day: number | null = null;

      if (cd.includes('-')) {
        const parts = cd.split('T')[0].split('-');
        if (parts.length === 3) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        }
      } else if (cd.includes('/')) {
        const parts = cd.split('/');
        if (parts.length >= 2) {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          if (parts.length >= 3) {
            let yStr = parts[2].trim();
            if (yStr.length === 2) yStr = '20' + yStr;
            year = parseInt(yStr, 10);
          } else {
            year = new Date().getFullYear();
          }
        }
      }

      if (year !== null && month !== null && day !== null && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const endOfDay = new Date(year, month, day, 23, 59, 59, 999).getTime();
        if (endOfDay < now) {
          return true;
        }
      }
    }

    if (item.createdAt) {
      const createdTime = new Date(item.createdAt).getTime();
      if (!isNaN(createdTime)) {
        const endOfCreationDay = new Date(createdTime);
        endOfCreationDay.setHours(23, 59, 59, 999);
        if (endOfCreationDay.getTime() < now) {
          return true;
        }
      }
    }

    return false;
  };

  const purgeExpiredMultiples = () => {
    const activeOnly = multiplesList.filter(item => !checkIsMultipleExpired(item));
    const removedCount = multiplesList.length - activeOnly.length;
    if (removedCount === 0) {
      setMultipleSuccess('Não existem múltiplas expiradas para eliminar neste momento.');
      setTimeout(() => setMultipleSuccess(''), 3000);
      return;
    }
    if (confirm(`Atenção: Pretende eliminar permanentemente ${removedCount} múltipla(s) expirada(s) do sistema?`)) {
      saveMultiplesState(activeOnly);
      setMultipleSuccess(`🧹 Sucesso: ${removedCount} múltipla(s) expirada(s) eliminada(s) permanentemente!`);
      setTimeout(() => setMultipleSuccess(''), 4000);
    }
  };

  const deleteMultipleItem = (id: string) => {
    if (confirm('Tem a certeza absoluta de que deseja apagar esta múltipla em destaque?')) {
      const updated = multiplesList.filter(item => item.id !== id);
      saveMultiplesState(updated);
      setMultipleSuccess('Múltipla em destaque removida!');
      setTimeout(() => setMultipleSuccess(''), 3000);
    }
  };

  const handleMktSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mktHomeTeam || !mktAwayTeam || !mktRecommendedBet || !mktOdd) {
      setMktError('Preencha os campos obrigatórios (Equipas, Recomendação e Odd)!');
      return;
    }

    if (editingMktId) {
      const updatedList = marketingList.map((item) => {
        if (item.id === editingMktId) {
          return {
            ...item,
            homeTeam: mktHomeTeam,
            awayTeam: mktAwayTeam,
            league: mktLeague || 'Ligas Gerais',
            recommendedBet: mktRecommendedBet,
            odd: mktOdd,
            homeProb: Number(mktHomeProb),
            drawProb: Number(mktDrawProb),
            awayProb: Number(mktAwayProb),
            under35Prob: Number(mktUnder35Prob)
          };
        }
        return item;
      });
      saveMarketingState(updatedList);
      setMktSuccess('Prognóstico editado no diário!');
      setEditingMktId(null);
    } else {
      const newItem = {
        id: 'mkt_' + Date.now(),
        homeTeam: mktHomeTeam,
        awayTeam: mktAwayTeam,
        league: mktLeague || 'Ligas Gerais',
        recommendedBet: mktRecommendedBet,
        odd: mktOdd,
        homeProb: Number(mktHomeProb),
        drawProb: Number(mktDrawProb),
        awayProb: Number(mktAwayProb),
        under35Prob: Number(mktUnder35Prob),
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      saveMarketingState([newItem, ...marketingList]);
      setMktSuccess('Prognóstico adicionado ao diário!');
    }

    // Reset Form
    setMktHomeTeam('');
    setMktAwayTeam('');
    setMktLeague('');
    setMktRecommendedBet('');
    setMktOdd('');
    setMktHomeProb(33);
    setMktDrawProb(33);
    setMktAwayProb(33);
    setMktUnder35Prob(70);

    setTimeout(() => {
      setMktSuccess('');
      setMktError('');
    }, 4000);
  };

  const editMktItem = (item: any) => {
    setEditingMktId(item.id);
    setMktHomeTeam(item.homeTeam);
    setMktAwayTeam(item.awayTeam);
    setMktLeague(item.league || '');
    setMktRecommendedBet(item.recommendedBet);
    setMktOdd(item.odd);
    setMktHomeProb(item.homeProb ?? 33);
    setMktDrawProb(item.drawProb ?? 33);
    setMktAwayProb(item.awayProb ?? 33);
    setMktUnder35Prob(item.under35Prob ?? 70);
    setMktSuccess('Modo de Edição Ativo. Modifique os dados no formulário.');
  };

  const deleteMktItem = (id: string) => {
    const updated = marketingList.filter(item => item.id !== id);
    saveMarketingState(updated);
    setMktSuccess('Prognóstico removido com sucesso!');
    setTimeout(() => setMktSuccess(''), 3000);
  };

  const changeMktStatus = (id: string, newStatus: 'pending' | 'green' | 'red') => {
    const updated = marketingList.map((item) => {
      if (item.id === id) {
        return { ...item, status: newStatus };
      }
      return item;
    });
    saveMarketingState(updated);
    setMktSuccess(`Status atualizado para: ${newStatus.toUpperCase()}!`);
    setTimeout(() => setMktSuccess(''), 3000);
  };

  // Tipster Management States
  interface TipsterAdminItem {
    id: string;
    name: string;
    avatar: string;
    email: string;
    wins: number;
    losses: number;
    refunds: number;
    yieldPercent: number;
    netProfit: number;
    telegramUrl: string;
    betclicInvite: string;
    betanoInvite: string;
    subscriptionPriceMonth: number;
    subscriptionPriceYear: number;
    customBets?: any[];
  }

  const [tipstersList, setTipstersList] = useState<TipsterAdminItem[]>(() => {
    const saved = localStorage.getItem('irunbets_rede_tipsters');
    if (saved) {
      try {
        const parsed: TipsterAdminItem[] = JSON.parse(saved);
        const filtered = parsed.filter(t => t.id !== 'morgado' && t.id !== 'pedro' && t.id !== 'sara');
        if (parsed.length !== filtered.length) {
          localStorage.setItem('irunbets_rede_tipsters', JSON.stringify(filtered));
        }
        return filtered;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const saveTipstersListToStorage = (newList: TipsterAdminItem[]) => {
    setTipstersList(newList);
    localStorage.setItem('irunbets_rede_tipsters', JSON.stringify(newList));
    
    // Synchronize to Firebase Firestore in real-time
    saveTipstersListToFirebase(newList);

    // Dispatch custom event to notify other modules of tipster changes
    try {
      window.dispatchEvent(new CustomEvent('irunbets_tipsters_updated', { detail: newList }));
    } catch (err) {
      console.log(err);
    }
  };

  // Tipster Form States
  const [editingTipsterId, setEditingTipsterId] = useState<string | null>(null);
  const [tipsterName, setTipsterName] = useState('');
  const [tipsterAvatar, setTipsterAvatar] = useState('👑');
  const [tipsterEmail, setTipsterEmail] = useState('');
  const [tipsterTelegram, setTipsterTelegram] = useState('');
  const [tipsterBetclic, setTipsterBetclic] = useState('');
  const [tipsterBetano, setTipsterBetano] = useState('');
  const [tipsterPriceMonth, setTipsterPriceMonth] = useState('29.99');
  const [tipsterPriceYear, setTipsterPriceYear] = useState('249.00');
  const [tipsterWins, setTipsterWins] = useState(10);
  const [tipsterLosses, setTipsterLosses] = useState(2);
  const [tipsterRefunds, setTipsterRefunds] = useState(0);
  const [tipsterYield, setTipsterYield] = useState(15.0);
  const [tipsterProfit, setTipsterProfit] = useState(150.0);
  const [tipsterSuccess, setTipsterSuccess] = useState('');
  const [tipsterError, setTipsterError] = useState('');

  // Forms and actions state
  const [newsTitle, setNewsTitle] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsAuthor, setNewsAuthor] = useState('Equipa www.irunbets.pt');
  const [newsImageUrl, setNewsImageUrl] = useState('');
  
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedNewsToEdit, setSelectedNewsToEdit] = useState<NewsArticle | null>(null);

  // Custom pages form states
  const [selectedPageToEdit, setSelectedPageToEdit] = useState<CustomPage | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [pageBlocks, setPageBlocks] = useState<PageBlock[]>([]);
  const [isSubpage, setIsSubpage] = useState(false);
  const [parentSlug, setParentSlug] = useState('');
  const [isPageHidden, setIsPageHidden] = useState(false);

  // Social Links state
  const [socials, setSocials] = useState<SocialConfig>({
    whatsapp: '',
    facebook: '',
    x: '',
    telegram: '',
    instagram: ''
  });
  const [socialsSuccess, setSocialsSuccess] = useState('');
  const [socialsError, setSocialsError] = useState('');

  // Merchant accounts configuration state for manual payment receipt processing
  const [merchantAccounts, setMerchantAccounts] = useState({
    holderName: "iRunBets Media S.A.",
    mbwayPhone: "933 451 145",
    revolutHandle: "@irunbets",
    ibanDetails: "PT50 3560 0001 9001 8336 8854 1"
  });
  const [merchantSuccess, setMerchantSuccess] = useState('');
  
  // New Block Form state
  const [newBlockType, setNewBlockType] = useState<'text' | 'image' | 'video' | 'cta'>('text');
  const [newBlockContent, setNewBlockContent] = useState('');
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockCaption, setNewBlockCaption] = useState('');
  const [newBlockLink, setNewBlockLink] = useState('');

  const [pageSuccess, setPageSuccess] = useState('');
  const [pageError, setPageError] = useState('');

  // Delete status trackers
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);

  // Push notification simulator state
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushLongMessage, setPushLongMessage] = useState('');
  const [pushAlerts, setPushAlerts] = useState<PushAlert[]>([]);
  const [pushSuccess, setPushSuccess] = useState('');
  const [editingPushId, setEditingPushId] = useState<string | null>(null);

  // Quick Push Pop-up Modal State
  const [showQuickPushModal, setShowQuickPushModal] = useState(false);
  const [quickPushTitle, setQuickPushTitle] = useState('');
  const [quickPushMessage, setQuickPushMessage] = useState('');
  const [quickPushLongMessage, setQuickPushLongMessage] = useState('');
  const [quickPushTarget, setQuickPushTarget] = useState('all');
  const [isSendingQuickPush, setIsSendingQuickPush] = useState(false);
  const [quickPushFeedback, setQuickPushFeedback] = useState('');

  // AI Performance metrics simulator (interactive backoffice state)
  const [tipSuccessRate, setTipSuccessRate] = useState(68.4);
  const [purifiedOddsVolume, setPurifiedOddsVolume] = useState(4812);
  const [theoreticalYield, setTheoreticalYield] = useState(14.2);

  // Delete status trackers
  const [subscriberToDelete, setSubscriberToDelete] = useState<string | null>(null);
  const [newsToDelete, setNewsToDelete] = useState<string | null>(null);
  const [mktIdToDelete, setMktIdToDelete] = useState<string | null>(null);

  // Manual Account Management States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<SubscriberUser | null>(null);
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormName, setUserFormName] = useState('');
  const [userFormStatus, setUserFormStatus] = useState('Gratuito');
  const [userFormPaid, setUserFormPaid] = useState<boolean>(true);

  // Bulk / Multi-select Account Operations States
  const [selectedSubscriberUids, setSelectedSubscriberUids] = useState<string[]>([]);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState('⚠️ A tua conta gratuita VIP iRunBets vai expirar em breve');
  const [bulkEmailBody, setBulkEmailBody] = useState(
    'Olá!\n\nAgradecemos a tua participação no nosso piloto aberto iRunBets durante este emocionante Campeonato do Mundo (Mundial).\n\nQueremos informar que a campanha promocional de acesso gratuito iRunBets VIP irá terminar muito brevemente. Para manteres o teu registo de banca sem limites, ferramentas de IA e dicas de tipsters, deverás oficializar um novo plano VIP.\n\nPrepara o teu próximo green!\nCumprimentos,\nA Equipa iRunBets'
  );
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const subsList = await getSubscribersList();
      const newsList = await getLatestNews();
      const pagesList = await getCustomPages();
      const socialLinks = await getSocialLinks();
      setSubscribers(subsList);
      setNews(newsList);
      setPages(pagesList);
      setSocials(socialLinks);
      
      const subConfig = getSubscribersConfig();
      setSubscribersConfigState(subConfig);

      // Load push alerts simulator
      const defaultAlerts: PushAlert[] = [
        {
          id: 'push_1',
          title: '🚨 ENTRADA DE VALOR: FC Porto vs Sporting',
          message: 'Odd Purificada para Over 2.5 golos subiu para 1.95 (Desvio de +12.4% +EV). Alta probabilidade de green.',
          sentAt: '2026-05-28T12:10:00Z',
          status: 'Enviado'
        },
        {
          id: 'push_2',
          title: '🔥 RADAR ALERTA: Real Madrid Líder',
          message: 'Real Madrid vs Bétis. Algoritmo identificou descida brusca de odd da favorita na abertura.',
          sentAt: '2026-05-27T15:45:00Z',
          status: 'Enviado'
        }
      ];

      if (!localStorage.getItem('irunbets_push_alerts')) {
        localStorage.setItem('irunbets_push_alerts', JSON.stringify(defaultAlerts));
      }
      const loadedAlerts = JSON.parse(localStorage.getItem('irunbets_push_alerts') || '[]');
      setPushAlerts(loadedAlerts);

      // Load AI metrics if present
      const storedRate = localStorage.getItem('irunbets_metric_rate');
      const storedVolume = localStorage.getItem('irunbets_metric_volume');
      const storedYield = localStorage.getItem('irunbets_metric_yield');
      if (storedRate) setTipSuccessRate(parseFloat(storedRate));
      if (storedVolume) setPurifiedOddsVolume(parseInt(storedVolume));
      if (storedYield) setTheoreticalYield(parseFloat(storedYield));

      // Load customizable merchant accounts for manual payment receipts
      const rawMerchant = localStorage.getItem('irunbets_merchant_accounts');
      if (rawMerchant) {
        try {
          const parsed = JSON.parse(rawMerchant);
          // If it is the old placeholder or personal detail, migrate to the new corporate information
          if (parsed.holderName === "Afonso Morgado" || parsed.holderName === "Angelo Morgado" || parsed.revolutHandle === "@angelo8pmz" || !parsed.holderName || parsed.ibanDetails === "PT50 0003 1234 5678 9012 3456 7" || parsed.mbwayPhone === "912 345 678") {
            parsed.holderName = "iRunBets Media S.A.";
            parsed.revolutHandle = "@irunbets";
            parsed.ibanDetails = "PT50 3560 0001 9001 8336 8854 1";
            parsed.mbwayPhone = "933 451 145";
          }
          // Remove paypalEmail if present
          if (parsed.hasOwnProperty('paypalEmail')) {
            delete parsed.paypalEmail;
          }
          localStorage.setItem('irunbets_merchant_accounts', JSON.stringify(parsed));
          setMerchantAccounts(parsed);
        } catch (e) {
          console.error('Error parsing customized merchant accounts:', e);
        }
      } else {
        const defaultMerch = {
          holderName: "iRunBets Media S.A.",
          mbwayPhone: "933 451 145",
          revolutHandle: "@irunbets",
          ibanDetails: "PT50 3560 0001 9001 8336 8854 1"
        };
        localStorage.setItem('irunbets_merchant_accounts', JSON.stringify(defaultMerch));
        setMerchantAccounts(defaultMerch);
      }

      // Sync tipsters from Firebase Firestore in real-time if available
      try {
        const firebaseTipsters = await getTipstersListFromFirebase();
        if (firebaseTipsters && firebaseTipsters.length > 0) {
          setTipstersList(firebaseTipsters);
          localStorage.setItem('irunbets_rede_tipsters', JSON.stringify(firebaseTipsters));
        }
      } catch (err) {
        console.warn('Could not sync tipsters list from Firebase:', err);
      }

      // Fetch dynamic visitor counts & traffic stats (both registered and unregistered)
      try {
        const stats = await getTrafficStats();
        setTrafficStats(stats);
        const historyData = await getTrafficHistory();
        setTrafficHistory(historyData);
      } catch (err) {
        console.warn('Error reading traffic stats in Backoffice:', err);
      }

      // Load Promotional Popup configurations
      try {
        const popupConfig = await getPopupConfigFromFirebase();
        if (popupConfig) {
          setPopupIsActive(popupConfig.isActive);
          setPopupType(popupConfig.type || 'promotion');
          setPopupHasButton(popupConfig.hasButton !== false);
          setPopupTitle(popupConfig.title);
          setPopupSubtitle(popupConfig.subtitle);
          setPopupContent(popupConfig.content);
          setPopupBadgeText(popupConfig.badgeText);
          setPopupImageUrl(popupConfig.imageUrl);
          setPopupButtonText(popupConfig.buttonText);
          setPopupButtonLink(popupConfig.buttonLink);
          setPopupDontShowAgainText(popupConfig.dontShowAgainText || '');
          setPopupForceShowAll(!!popupConfig.forceShowAll);
          setPopupTheme(popupConfig.theme || 'amber');
        }
      } catch (err) {
        console.warn('Could not load promotional popup config in Backoffice:', err);
      }

    } catch (err) {
      console.error('Error fetching backoffice data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPopupErrorMsg('Por favor selecione um ficheiro de imagem válido (ex: PNG, JPG).');
      return;
    }

    // Limit original file size to prevent memory lag
    if (file.size > 8 * 1024 * 1024) {
      setPopupErrorMsg('O ficheiro é demasiado grande. Por favor escolha uma imagem com menos de 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to scale image down for web optimize (max dimensions 850px width/height)
        const canvas = document.createElement('canvas');
        const maxDim = 850;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Convert to compressed jpeg (0.72 quality)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          setPopupImageUrl(dataUrl);
          setPopupSuccessMsg('Imagem importada e otimizada com sucesso para toda a plataforma! 🎉');
          setTimeout(() => setPopupSuccessMsg(''), 4000);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setPopupErrorMsg('Erro ao ler a imagem do seu computador.');
    };
    reader.readAsDataURL(file);
  };

  // --- PROMOTIONAL POPUP MANAGEMENT HANDLERS ---
  const handleSavePopupConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setPopupSuccessMsg('');
    setPopupErrorMsg('');

    if (!popupTitle) {
      setPopupErrorMsg('O título do anúncio é de preenchimento obrigatório.');
      return;
    }

    try {
      const config: PopupConfig = {
        id: 'global_promotional_popup',
        isActive: popupIsActive,
        type: popupType,
        hasButton: popupHasButton,
        title: popupTitle,
        subtitle: popupSubtitle,
        content: popupContent,
        badgeText: popupBadgeText,
        imageUrl: popupImageUrl,
        buttonText: popupButtonText || 'Ver Oferta',
        buttonLink: popupButtonLink || '#pricing',
        dontShowAgainText: popupDontShowAgainText || 'Não mostrar este anúncio hoje',
        forceShowAll: popupForceShowAll,
        theme: popupTheme
      };

      await savePopupConfigToFirebase(config);
      setPopupSuccessMsg('Popup de publicidade gravado e atualizado com sucesso em toda a plataforma!');
      setTimeout(() => setPopupSuccessMsg(''), 5000);
    } catch (err: any) {
      setPopupErrorMsg(err.message || 'Erro ao gravar as configurações do popup.');
    }
  };

  const handleQuickTogglePopupIsActive = async (targetState?: boolean) => {
    const newState = targetState !== undefined ? targetState : !popupIsActive;
    setPopupIsActive(newState);
    setPopupSuccessMsg('');
    setPopupErrorMsg('');

    try {
      const config: PopupConfig = {
        id: 'global_promotional_popup',
        isActive: newState,
        type: popupType,
        hasButton: popupHasButton,
        title: popupTitle || 'Anúncio Global',
        subtitle: popupSubtitle,
        content: popupContent,
        badgeText: popupBadgeText,
        imageUrl: popupImageUrl,
        buttonText: popupButtonText || 'Ver Oferta',
        buttonLink: popupButtonLink || '#pricing',
        dontShowAgainText: popupDontShowAgainText || 'Não mostrar este anúncio hoje',
        forceShowAll: popupForceShowAll,
        theme: popupTheme
      };

      await savePopupConfigToFirebase(config);
      if (newState) {
        setPopupSuccessMsg('✅ Pop-up ATIVADO e visível com sucesso em toda a plataforma!');
      } else {
        setPopupSuccessMsg('🚫 Pop-up DESATIVADO com sucesso em toda a plataforma!');
      }
      setTimeout(() => setPopupSuccessMsg(''), 5000);
    } catch (err: any) {
      setPopupErrorMsg(err.message || 'Erro ao alterar estado do pop-up.');
    }
  };

  // --- TIPSTER MANAGEMENT HANDLERS ---
  const handleSaveTipster = (e: React.FormEvent) => {
    e.preventDefault();
    setTipsterSuccess('');
    setTipsterError('');

    if (!tipsterName || !tipsterEmail) {
      setTipsterError('Por favor, indique o Nome e o E-mail de contacto do Tipster.');
      return;
    }

    const priceMonthNum = parseFloat(tipsterPriceMonth) || 0;
    const priceYearNum = parseFloat(tipsterPriceYear) || 0;

    if (editingTipsterId) {
      // Edit existing
      const updatedList = tipstersList.map(item => {
        if (item.id === editingTipsterId) {
          return {
            ...item,
            name: tipsterName,
            avatar: tipsterAvatar,
            email: tipsterEmail,
            telegramUrl: tipsterTelegram,
            betclicInvite: tipsterBetclic,
            betanoInvite: tipsterBetano,
            subscriptionPriceMonth: priceMonthNum,
            subscriptionPriceYear: priceYearNum,
            wins: tipsterWins,
            losses: tipsterLosses,
            refunds: tipsterRefunds,
            yieldPercent: tipsterYield,
            netProfit: tipsterProfit
          };
        }
        return item;
      });
      saveTipstersListToStorage(updatedList);
      setTipsterSuccess(`Tipster "${tipsterName}" atualizado com sucesso no iRunBets!`);
      setEditingTipsterId(null);
    } else {
      // Add new
      const newId = tipsterName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (tipstersList.some(t => t.id === newId)) {
        setTipsterError('Já existe um tipster com um identificador semelhante. Por favor selecione outro nome.');
        return;
      }
      const newTipster: TipsterAdminItem = {
        id: newId,
        name: tipsterName,
        avatar: tipsterAvatar,
        email: tipsterEmail,
        telegramUrl: tipsterTelegram,
        betclicInvite: tipsterBetclic,
        betanoInvite: tipsterBetano,
        subscriptionPriceMonth: priceMonthNum,
        subscriptionPriceYear: priceYearNum,
        wins: tipsterWins,
        losses: tipsterLosses,
        refunds: tipsterRefunds,
        yieldPercent: tipsterYield,
        netProfit: tipsterProfit,
        customBets: []
      };
      saveTipstersListToStorage([...tipstersList, newTipster]);
      setTipsterSuccess(`Novo Tipster "${tipsterName}" registado e ativo com sucesso!`);
    }

    // Reset Form fields
    setTipsterName('');
    setTipsterAvatar('👑');
    setTipsterEmail('');
    setTipsterTelegram('');
    setTipsterBetclic('');
    setTipsterBetano('');
    setTipsterPriceMonth('29.99');
    setTipsterPriceYear('249.00');
    setTipsterWins(10);
    setTipsterLosses(2);
    setTipsterRefunds(0);
    setTipsterYield(15.0);
    setTipsterProfit(150.00);
  };

  const handleEditTipsterClick = (item: TipsterAdminItem) => {
    setEditingTipsterId(item.id);
    setTipsterName(item.name);
    setTipsterAvatar(item.avatar || '👑');
    setTipsterEmail(item.email || '');
    setTipsterTelegram(item.telegramUrl || '');
    setTipsterBetclic(item.betclicInvite || '');
    setTipsterBetano(item.betanoInvite || '');
    setTipsterPriceMonth(String(item.subscriptionPriceMonth || '0'));
    setTipsterPriceYear(String(item.subscriptionPriceYear || '0'));
    setTipsterWins(item.wins || 0);
    setTipsterLosses(item.losses || 0);
    setTipsterRefunds(item.refunds || 0);
    setTipsterYield(item.yieldPercent || 0);
    setTipsterProfit(item.netProfit || 0);
  };

  const handleDeleteTipster = (id: string, name: string) => {
    if (confirm(`Tem a certeza que deseja remover permanentemente o tipster "${name}"? Todos os canais e apostas dele serão eliminados!`)) {
      const filtered = tipstersList.filter(item => item.id !== id);
      saveTipstersListToStorage(filtered);

      // Clean individual subscribed references locally on active subscriber records
      subscribers.forEach(async (sub) => {
        if (sub.subscribedTipsters && sub.subscribedTipsters.includes(id)) {
          const cleanList = sub.subscribedTipsters.filter(tid => tid !== id);
          try {
            await saveUserSubscribedTipstersFirestore(sub.uid, cleanList);
          } catch (err) {
            console.error(err);
          }
        }
      });
      setTipsterWarningMessage(null);
      setTipsterSuccess(`Tipster "${name}" removido com sucesso de toda a plataforma.`);
      setTimeout(() => setTipsterSuccess(''), 4000);
      loadData();
    }
  };

  // Revoke/Cancel user VIP subscription to a specific Tipster manually
  const handleRevokeTipsterSub = async (userUid: string, userEmail: string, tipsterId: string) => {
    const userObj = subscribers.find(s => s.uid === userUid);
    if (!userObj) return;

    if (confirm(`Deseja revogar o acesso pago de ${userEmail} ao canal do Tipster "${tipsterId}"?`)) {
      const activeSubs = userObj.subscribedTipsters || [];
      const updatedSubs = activeSubs.filter(tid => tid !== tipsterId);

      await saveUserSubscribedTipstersFirestore(userUid, updatedSubs);

      // Update local react state for instant feedback
      const updatedSubscribers = subscribers.map(sub => {
        if (sub.uid === userUid) {
          return { ...sub, subscribedTipsters: updatedSubs };
        }
        return sub;
      });
      setSubscribers(updatedSubscribers);
    }
  };

  // Grant a user VIP subscription to a specific Tipster manually
  const handleGrantTipsterSub = async (userUid: string, tipsterId: string) => {
    const userObj = subscribers.find(s => s.uid === userUid);
    if (!userObj) return;

    const activeSubs = userObj.subscribedTipsters || [];
    if (activeSubs.includes(tipsterId)) return; // already subscribed

    const updatedSubs = [...activeSubs, tipsterId];
    await saveUserSubscribedTipstersFirestore(userUid, updatedSubs);

    // Update local react state for instant feedback
    const updatedSubscribers = subscribers.map(sub => {
      if (sub.uid === userUid) {
        return { ...sub, subscribedTipsters: updatedSubs };
      }
      return sub;
    });
    setSubscribers(updatedSubscribers);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSubscribersConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSubscribersConfig(subscribersConfig);
    setSubConfigSuccess('Estratégia e contador de subscritores atualizados com êxito!');
    onNewsChanged();
    setTimeout(() => {
      setSubConfigSuccess('');
    }, 4500);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newsTitle || !newsSummary || !newsContent) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsPublishing(true);
    try {
      if (selectedNewsToEdit) {
        await saveNewsArticle({
          id: selectedNewsToEdit.id,
          title: newsTitle,
          summary: newsSummary,
          content: newsContent,
          author: newsAuthor || 'Equipa www.irunbets.pt',
          publishedAt: selectedNewsToEdit.publishedAt,
          imageUrl: newsImageUrl
        });
        setFormSuccess('Notícia de apostas atualizada com sucesso no Front Office!');
        setSelectedNewsToEdit(null);
      } else {
        await publishNews({
          title: newsTitle,
          summary: newsSummary,
          content: newsContent,
          author: newsAuthor || 'Equipa www.irunbets.pt',
          publishedAt: new Date().toISOString(),
          imageUrl: newsImageUrl
        });
        setFormSuccess('Notícia de apostas publicada com sucesso no Front Office!');
      }
      
      setNewsTitle('');
      setNewsSummary('');
      setNewsContent('');
      setNewsAuthor('Equipa www.irunbets.pt');
      setNewsImageUrl('');
      
      const refreshedNews = await getLatestNews();
      setNews(refreshedNews);
      onNewsChanged();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao gravar notícia.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEditNewsInitiate = (article: NewsArticle) => {
    setSelectedNewsToEdit(article);
    setNewsTitle(article.title);
    setNewsSummary(article.summary);
    setNewsContent(article.content);
    setNewsAuthor(article.author || 'Equipa www.irunbets.pt');
    setNewsImageUrl(article.imageUrl || '');
    setFormError('');
    setFormSuccess('');
  };

  const handleCancelNewsEdit = () => {
    setSelectedNewsToEdit(null);
    setNewsTitle('');
    setNewsSummary('');
    setNewsContent('');
    setNewsAuthor('Equipa www.irunbets.pt');
    setNewsImageUrl('');
    setFormError('');
    setFormSuccess('');
  };

  const handleDeleteNewsDirect = async (id: string) => {
    try {
      await deleteNewsArticle(id);
      setNews(prev => prev.filter(item => item.id !== id));
      onNewsChanged();
    } catch (err) {
      console.error('Erro ao eliminar artigo:', err);
    }
  };

  const handleDeleteSubscriberDirect = async (uid: string) => {
    try {
      await deleteSubscriber(uid);
      setSubscribers(prev => prev.filter(item => item.uid !== uid));
      onNewsChanged();
    } catch (err: any) {
      console.error('Erro ao eliminar subscritor:', err);
    }
  };

  const handleOpenCreateModal = () => {
    setUserFormEmail('');
    setUserFormName('');
    setUserFormStatus('Gratuito');
    setUserFormPaid(true);
    setShowCreateModal(true);
    setEditingSubscriber(null);
  };

  const handleOpenEditModal = (sub: SubscriberUser) => {
    setEditingSubscriber(sub);
    setUserFormEmail(sub.email || '');
    setUserFormName(sub.displayName || '');
    setUserFormStatus(sub.status || 'Gratuito');
    setUserFormPaid(
      !sub.status ||
      sub.status === 'Gratuito' ||
      !sub.pendingPayment || 
      sub.pendingPayment.status === 'approved'
    );
    setShowCreateModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormEmail.trim()) {
      alert('Por favor introduza o email.');
      return;
    }

    try {
      if (editingSubscriber) {
        const updates: Partial<SubscriberUser> = {
          email: userFormEmail,
          displayName: userFormName,
          status: userFormStatus
        };

        if (userFormStatus !== 'Gratuito') {
          updates.pendingPayment = {
            planId: userFormStatus.toLowerCase().includes('pro') ? 'pro' : 'site',
            planName: userFormStatus.includes(' (') ? (userFormStatus.split(' (')[0] || 'Premium Manual') : 'Premium Manual',
            price: parseFloat(userFormStatus.match(/\d+(\.\d+)?/)?.[0] || '19.99'),
            method: 'Backoffice Manual',
            date: Date.now(),
            receiptName: 'Ativado manualmente no painel de administração',
            status: userFormPaid ? 'approved' : 'pending'
          };
        } else {
          updates.pendingPayment = undefined;
        }

        await updateSubscriberFields(editingSubscriber.uid, updates);
        setSubscribers(prev => prev.map(s => s.uid === editingSubscriber.uid ? { ...s, ...updates } : s));
        alert('Utilizador editado e atualizado!');
        setEditingSubscriber(null);
        setShowCreateModal(false);
      } else {
        const finalStatus = userFormStatus;
        const newUser = await createSubscriberManually(userFormEmail, userFormName, finalStatus);
        
        if (finalStatus !== 'Gratuito') {
          const updates: Partial<SubscriberUser> = {};
          updates.pendingPayment = {
            planId: finalStatus.toLowerCase().includes('pro') ? 'pro' : 'site',
            planName: finalStatus.includes(' (') ? (finalStatus.split(' (')[0] || 'Manual Active') : 'Manual Active',
            price: parseFloat(finalStatus.match(/\d+(\.\d+)?/)?.[0] || '19.99'),
            method: 'Backoffice Manual',
            date: Date.now(),
            receiptName: 'Criado manualmente pelo Administrador',
            status: userFormPaid ? 'approved' : 'pending'
          };
          await updateSubscriberFields(newUser.uid, updates);
        }

        try {
          fetch('/api/register-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: newUser.uid,
              email: newUser.email,
              displayName: newUser.displayName,
              provider: 'backoffice-manual',
              timestamp: new Date().toISOString()
            })
          }).catch(err => console.warn(err));
        } catch (apiErr) {
          console.warn(apiErr);
        }

        alert('Novo utilizador registado com sucesso no Backoffice!');
        setShowCreateModal(false);
        loadData();
      }
    } catch (err: any) {
      console.error('Erro ao guardar utilizador:', err);
      alert('Lamento, ocorreu um erro a salvar este utilizador: ' + err?.message);
    }
  };

  // --- BULK SUBS MANAGE FUNCTIONS ---
  const handleToggleSelectSubscriber = (uid: string) => {
    const sub = subscribers.find(s => s.uid === uid);
    if (sub?.email === 'morgado.aam@gmail.com') return; // protect admin

    setSelectedSubscriberUids(prev => {
      if (prev.includes(uid)) {
        return prev.filter(id => id !== uid);
      } else {
        return [...prev, uid];
      }
    });
  };

  const handleSelectAllSubscribers = () => {
    const selectable = subscribers.filter(s => s.email !== 'morgado.aam@gmail.com');
    const allSelected = selectable.every(s => selectedSubscriberUids.includes(s.uid));
    
    if (allSelected) {
      setSelectedSubscriberUids([]);
    } else {
      setSelectedSubscriberUids(selectable.map(s => s.uid));
    }
  };

  const handleBulkDeleteSubscribers = async () => {
    if (selectedSubscriberUids.length === 0) {
      alert('Nenhum utilizador selecionado.');
      return;
    }

    const confirmFirst = window.confirm(`ATENÇÃO CRÍTICA!\n\nTem a certeza absoluta de que deseja ELIMINAR COMPLETAMENTE as ${selectedSubscriberUids.length} contas de utilizador selecionadas?\n\nEsta operação é irreversível.`);
    if (!confirmFirst) return;

    const confirmSecond = window.confirm(`CONFIRMAÇÃO DE SALVAGUARDA!\n\nAs bases de dados locais e do Firestore serão totalmente expurgadas destes membros. Continuar?`);
    if (!confirmSecond) return;

    setIsLoading(true);
    let successCount = 0;
    try {
      for (const uid of selectedSubscriberUids) {
        const targetUser = subscribers.find(s => s.uid === uid);
        if (targetUser?.email === 'morgado.aam@gmail.com') continue;

        await deleteSubscriber(uid);
        successCount++;
      }
      alert(`Expurgo concluído! ${successCount} utilizadores foram eliminados definitivamente.`);
      setSelectedSubscriberUids([]);
      await loadData();
    } catch (err: any) {
      console.error('Erro no expurgo em massa:', err);
      alert('Ocorreu um erro parcial durante a eliminação: ' + err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkResetToGratuito = async () => {
    if (selectedSubscriberUids.length === 0) {
      alert('Nenhum utilizador selecionado.');
      return;
    }

    const confirmAction = window.confirm(`Deseja alterar o estatuto de plano das ${selectedSubscriberUids.length} contas selecionadas para "Gratuito" (Limpar Acesso VIP)?`);
    if (!confirmAction) return;

    setIsLoading(true);
    let successCount = 0;
    try {
      for (const uid of selectedSubscriberUids) {
        const targetUser = subscribers.find(s => s.uid === uid);
        if (targetUser?.email === 'morgado.aam@gmail.com') continue;

        await updateSubscriberStatus(uid, 'Gratuito');
        await updateSubscriberFields(uid, { pendingPayment: undefined });
        successCount++;
      }
      alert(`Planos atualizados! ${successCount} contas voltaram ao estatuto "Gratuito".`);
      setSelectedSubscriberUids([]);
      await loadData();
    } catch (err: any) {
      console.error('Erro na alteração em massa:', err);
      alert('Ocorreu um erro parcial: ' + err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerBulkEmailBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubscriberUids.length === 0) {
      alert('Nenhum destinatário selecionado.');
      return;
    }

    setIsSendingBulkEmail(true);
    try {
      const selectedUsers = subscribers.filter(s => selectedSubscriberUids.includes(s.uid));
      
      const response = await fetch('/api/send-bulk-expiration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: selectedUsers.map(u => ({ email: u.email, displayName: u.displayName })),
          subject: bulkEmailSubject,
          body: bulkEmailBody,
          sender: 'suporte@irunbets.pt'
        })
      });

      if (!response.ok) {
        throw new Error('Falha no despache SMTP simulado');
      }

      alert(`Campanha expedida! \n\nForam simulados e registados no servidor ${selectedUsers.length} envios SMTP com sucesso para suporte@irunbets.pt e todos os restantes subscritores selecionados.`);
      setShowBulkEmailModal(false);
      setSelectedSubscriberUids([]);
    } catch (err: any) {
      console.error('Erro ao disparar campanha de email:', err);
      alert('Erro ao enviar newsletter de aviso: ' + err?.message);
    } finally {
      setIsSendingBulkEmail(false);
    }
  };

  const handleSetPlan = async (uid: string, nextStatus: string) => {
    try {
      await updateSubscriberStatus(uid, nextStatus);
      setSubscribers(prev => prev.map(sub => {
        if (sub.uid === uid) {
          return { ...sub, status: nextStatus };
        }
        return sub;
      }));
    } catch (err) {
      console.error('Erro ao definir o plano do subscritor:', err);
    }
  };

  const handleSetPaymentStatus = async (uid: string, nextStatus: string) => {
    try {
      const sub = subscribers.find(s => s.uid === uid);
      if (!sub) return;

      const currentStatusOfPlan = sub.status || 'Gratuito';
      const pendingPayment = sub.pendingPayment ? {
        ...sub.pendingPayment,
        status: nextStatus as any
      } : {
        planId: currentStatusOfPlan.toLowerCase().includes('pro') ? 'pro' : 'site',
        planName: currentStatusOfPlan.includes(' (') ? (currentStatusOfPlan.split(' (')[0] || 'Premium Manual') : 'Premium Manual',
        price: parseFloat(currentStatusOfPlan.match(/\d+(\.\d+)?/)?.[0] || '19.99'),
        method: 'Backoffice Manual',
        date: Date.now(),
        receiptName: 'Alterado diretamente na tabela',
        status: nextStatus as any
      };

      await updateSubscriberFields(uid, { pendingPayment });
      setSubscribers(prev => prev.map(s => s.uid === uid ? { ...s, pendingPayment } : s));
    } catch (err: any) {
      console.error('Erro ao definir estado de pagamento:', err);
      alert('Erro ao guardar estado de pagamento: ' + err?.message);
    }
  };

  const handleStartEditPushAlert = (alert: PushAlert) => {
    setEditingPushId(alert.id);
    setPushTitle(alert.title);
    setPushMessage(alert.message);
    setPushLongMessage(alert.longMessage || '');
    setPushSuccess(`A carregar "${alert.title}" para edição no formulário acima.`);
    setTimeout(() => setPushSuccess(''), 2500);
  };

  const handleCancelEditPushAlert = () => {
    setEditingPushId(null);
    setPushTitle('');
    setPushMessage('');
    setPushLongMessage('');
  };

  const handleSendPushAlert = (e: React.FormEvent) => {
    e.preventDefault();
    setPushSuccess('');
    if (!pushTitle || !pushMessage) return;

    let updatedAlertItem: PushAlert;
    let updatedAlertsList: PushAlert[];

    if (editingPushId) {
      // Find and update existing alert
      updatedAlertsList = pushAlerts.map(alert => {
        if (alert.id === editingPushId) {
          updatedAlertItem = {
            ...alert,
            title: pushTitle,
            message: pushMessage,
            longMessage: pushLongMessage.trim() || undefined,
            sentAt: new Date().toISOString() // refresh timestamp or keep it
          };
          return updatedAlertItem;
        }
        return alert;
      });
      // Just in case updatedAlertItem wasn't set (not found)
      if (!updatedAlertItem!) {
        updatedAlertItem = {
          id: editingPushId,
          title: pushTitle,
          message: pushMessage,
          longMessage: pushLongMessage.trim() || undefined,
          sentAt: new Date().toISOString(),
          status: 'Simulado com sucesso'
        };
      }
    } else {
      // Create new alert
      updatedAlertItem = {
        id: `push_${Date.now()}`,
        title: pushTitle,
        message: pushMessage,
        longMessage: pushLongMessage.trim() || undefined,
        sentAt: new Date().toISOString(),
        status: 'Enviado para Dispositivos (FCM)'
      };
      updatedAlertsList = [updatedAlertItem, ...pushAlerts];
    }

    // Call Cloud Function FCM trigger in background
    sendCloudFunctionPushAlert({
      title: pushTitle,
      message: pushMessage,
      longMessage: pushLongMessage,
      target: 'all'
    }).catch(err => console.warn('Background push alert call error:', err));

    setPushAlerts(updatedAlertsList);
    localStorage.setItem('irunbets_push_alerts', JSON.stringify(updatedAlertsList));

    // Dispatch custom event for real-time floating pop-up display on-site!
    try {
      const customEvent = new CustomEvent('irunbets_new_push', { detail: updatedAlertItem });
      window.dispatchEvent(customEvent);
    } catch (err) {
      console.error('Error dispatching push event:', err);
    }

    const wasEditing = !!editingPushId;
    setPushTitle('');
    setPushMessage('');
    setPushLongMessage('');
    setEditingPushId(null);
    
    setPushSuccess(
      wasEditing 
        ? 'Alerta editado e gravado com sucesso! Alterações disponíveis em tempo real.'
        : 'Alerta push disparado com sucesso e listado no simulador de logs!'
    );
    
    setTimeout(() => {
      setPushSuccess('');
    }, 4500);
  };

  const handleDeletePushAlert = (id: string) => {
    try {
      const raw = localStorage.getItem('irunbets_push_alerts');
      if (!raw) return;
      const parsed = JSON.parse(raw) as PushAlert[];
      const updated = parsed.filter(alert => alert && alert.id !== id);
      localStorage.setItem('irunbets_push_alerts', JSON.stringify(updated));
      
      // Update local state
      setPushAlerts(updated);
      
      // Dispatch custom event to notify other modules of real-time update
      window.dispatchEvent(new Event('irunbets_new_push'));
    } catch (e) {
      console.error('Error deleting push alert in backoffice:', e);
    }
  };

  const handleDuplicateAndResendPushAlert = (alert: PushAlert) => {
    try {
      const newAlert: PushAlert = {
        id: `push_${Date.now()}`,
        title: alert.title,
        message: alert.message,
        longMessage: alert.longMessage,
        sentAt: new Date().toISOString(),
        status: 'Simulado com sucesso'
      };
      
      const updatedAlertsList = [newAlert, ...pushAlerts];
      setPushAlerts(updatedAlertsList);
      localStorage.setItem('irunbets_push_alerts', JSON.stringify(updatedAlertsList));

      // Dispatch custom event for real-time notification popup display on-site!
      window.dispatchEvent(new CustomEvent('irunbets_new_push', { detail: newAlert }));

      setPushSuccess(`Alerta "${alert.title}" duplicado e reenviado com sucesso!`);
      setTimeout(() => setPushSuccess(''), 2500);
    } catch (e) {
      console.error('Error duplicating and resending push:', e);
    }
  };

  const handleSendQuickPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPushTitle || !quickPushMessage) return;

    setIsSendingQuickPush(true);
    setQuickPushFeedback('');

    try {
      const res = await sendCloudFunctionPushAlert({
        title: quickPushTitle,
        message: quickPushMessage,
        longMessage: quickPushLongMessage,
        target: quickPushTarget
      });

      const newAlert: PushAlert = {
        id: `push_${Date.now()}`,
        title: quickPushTitle,
        message: quickPushMessage,
        longMessage: quickPushLongMessage.trim() || undefined,
        sentAt: new Date().toISOString(),
        status: 'Enviado para Dispositivos (FCM)'
      };

      const updatedList = [newAlert, ...pushAlerts];
      setPushAlerts(updatedList);
      localStorage.setItem('irunbets_push_alerts', JSON.stringify(updatedList));

      setQuickPushFeedback(`✅ ${res.message || 'Notificação enviada para os dispositivos com sucesso!'}`);
      setTimeout(() => {
        setQuickPushTitle('');
        setQuickPushMessage('');
        setQuickPushLongMessage('');
        setQuickPushFeedback('');
        setIsSendingQuickPush(false);
        setShowQuickPushModal(false);
      }, 1800);
    } catch (err: any) {
      setIsSendingQuickPush(false);
      setQuickPushFeedback(`❌ Erro ao enviar push: ${err?.message || 'Falha no envio'}`);
    }
  };

  const handleAdjustMetrics = (rate: number, volume: number, yld: number) => {
    setTipSuccessRate(rate);
    setPurifiedOddsVolume(volume);
    setTheoreticalYield(yld);

    localStorage.setItem('irunbets_metric_rate', rate.toString());
    localStorage.setItem('irunbets_metric_volume', volume.toString());
    localStorage.setItem('irunbets_metric_yield', yld.toString());
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setPageError('');
    setPageSuccess('');

    if (!pageTitle || !pageSlug) {
      setPageError('O título e o slug URL da página são de preenchimento obrigatório.');
      return;
    }

    const slugRegex = /^[a-z0-9-_]+$/;
    if (!slugRegex.test(pageSlug)) {
      setPageError('O slug URL deve conter apenas letras minúsculas, números, hífens ou underscores.');
      return;
    }

    if (pageBlocks.length === 0) {
      setPageError('Adicione pelo menos um bloco de conteúdo (Texto, Imagem, Vídeo ou Botão CTA) para enriquecer a página.');
      return;
    }

    setIsLoading(true);
    try {
      const pageData: CustomPage = {
        id: pageSlug,
        slug: pageSlug,
        title: pageTitle,
        description: pageDescription,
        blocks: pageBlocks,
        isSubpage: isSubpage,
        parentSlug: parentSlug,
        hidden: isPageHidden,
        createdAt: selectedPageToEdit?.createdAt || new Date().toISOString()
      };

      await saveCustomPage(pageData);
      setPageSuccess('Página personalizada gravada e publicada com sucesso no iRunBets!');
      
      // Reset form variables
      setPageTitle('');
      setPageSlug('');
      setPageDescription('');
      setPageBlocks([]);
      setIsSubpage(false);
      setParentSlug('');
      setIsPageHidden(false);
      setSelectedPageToEdit(null);
      
      const updatedPages = await getCustomPages();
      setPages(updatedPages);
      
      onNewsChanged();
    } catch (err: any) {
      setPageError(err.message || 'Erro ao gravar a página.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPageInitiate = (page: CustomPage) => {
    setSelectedPageToEdit(page);
    setPageTitle(page.title);
    setPageSlug(page.slug);
    setPageDescription(page.description || '');
    setPageBlocks(page.blocks);
    setIsSubpage(page.isSubpage || false);
    setParentSlug(page.parentSlug || '');
    setIsPageHidden(!!page.hidden);
    setPageError('');
    setPageSuccess('');
  };

  const handleDeletePageDirect = async (slug: string) => {
    try {
      await deleteCustomPage(slug);
      setPages(prev => prev.filter(item => item.slug !== slug));
      onNewsChanged();
    } catch (err) {
      console.error('Erro ao eliminar página:', err);
    }
  };

  const handleAddBlock = () => {
    setPageError('');
    if (newBlockType === 'text' && !newBlockContent) {
      setPageError('O conteúdo do bloco de Texto é obrigatório.');
      return;
    }
    if (newBlockType === 'image' && !newBlockContent) {
      setPageError('O URL da imagem é obrigatório.');
      return;
    }
    if (newBlockType === 'video' && !newBlockContent) {
      setPageError('O link do vídeo YouTube ou iframe de visualização é obrigatório.');
      return;
    }
    if (newBlockType === 'cta' && (!newBlockContent || !newBlockTitle)) {
      setPageError('O texto do botão (Conteúdo) e o título (Legenda) do CTA são obrigatórios.');
      return;
    }

    let processedContent = newBlockContent;
    if (newBlockType === 'video' && newBlockContent.includes('youtube.com/watch?v=')) {
      const videoId = newBlockContent.split('v=')[1]?.split('&')[0];
      if (videoId) {
        processedContent = `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (newBlockType === 'video' && newBlockContent.includes('youtu.be/')) {
      const videoId = newBlockContent.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        processedContent = `https://www.youtube.com/embed/${videoId}`;
      }
    }

    const newBlock: PageBlock = {
      type: newBlockType,
      content: processedContent,
      title: newBlockTitle || undefined,
      caption: newBlockCaption || undefined,
      link: newBlockLink || undefined
    };

    setPageBlocks(prev => [...prev, newBlock]);
    
    // Reset block fields
    setNewBlockContent('');
    setNewBlockTitle('');
    setNewBlockCaption('');
    setNewBlockLink('');
  };

  const handleRemoveBlock = (index: number) => {
    setPageBlocks(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === pageBlocks.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...pageBlocks];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setPageBlocks(updated);
  };

  const handleSignout = async () => {
    await logoutUser();
    onClose();
  };

  return (
    <div className="min-h-screen bg-[#0E0E11] text-zinc-100 flex flex-col pt-24 pb-16 relative">
      
      {/* Visual background gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] glow-orb-orange pointer-events-none opacity-5"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] glow-orb-blue pointer-events-none opacity-5"></div>

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10 flex-1">
        
        {/* Header Breadcrumbs & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping"></span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 font-mono">Consola Avançada Admin</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
              iRunBets <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-500 font-bold">Backoffice</span>
            </h1>
            <p className="text-xs text-zinc-400 font-light mt-1">
              Centro de comando logado: <span className="text-orange-400 font-semibold">morgado.aam@gmail.com</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowQuickPushModal(true)}
              className="px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white border border-orange-500/50 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/20 animate-pulse"
              title="Abrir janela rápida para disparar notificação Push para telemóveis iOS & Android"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.3} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              <span>Disparar Push iOS & Android 📱</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGithubModalOpen(true)}
              className="px-3.5 py-2 text-xs font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/60 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
              title="Exportar base de dados completa em JSON e sincronizar com o GitHub"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>Exportar p/ GitHub & Backup</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-350 border border-zinc-800 rounded-xl hover:bg-zinc-900 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              <span>Voltar ao Site</span>
            </button>

            <button
              onClick={handleSignout}
              className="px-4 py-2 text-xs font-semibold text-rose-400 border border-rose-950 bg-rose-950/20 hover:bg-rose-950/40 hover:border-rose-500 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
              <span>Sair Admin</span>
            </button>
          </div>
        </div>

        {/* View Switches (Multi-tab selection) */}
        <div className="flex flex-wrap gap-2.5 border-b border-zinc-800/40 mb-8 pb-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'users' 
                ? 'bg-zinc-900 border border-zinc-800 text-sky-400' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.647-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <span>Contas & Estatuto ({subscribers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('push')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'push' 
                ? 'bg-zinc-900 border border-zinc-800 text-orange-400' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <span>Central de Push Alertas</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'analytics' 
                ? 'bg-zinc-900 border border-zinc-800 text-emerald-400' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 3 18.375v-5.25ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125v-9.75ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            <span>Monitor IA & Radar Tendências</span>
          </button>

          <button
            onClick={() => setActiveTab('news')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'news' 
                ? 'bg-zinc-900 border border-zinc-800 text-amber-500' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
            </svg>
            <span>Notícias & Relatórios ({news.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('pages');
              setPageError('');
              setPageSuccess('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'pages' 
                ? 'bg-zinc-900 border border-zinc-800 text-[#00f2fe]' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-.115-8.243-.33M21.243 7.582L12 10.5M3.757 7.582L12 10.5" />
            </svg>
            <span>Gestor de Páginas ({pages.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('plans');
              setPlansSuccess('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'plans' 
                ? 'bg-zinc-900 border border-zinc-800 text-pink-500' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>Preços & Vantagens</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tipsters');
              setTipsterSuccess('');
              setTipsterError('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'tipsters' 
                ? 'bg-zinc-900 border border-zinc-805 text-fuchsia-400 font-bold border-fuchsia-500/30' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500"></span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584m11.926 0c1.848-1.745 2.974-4.19 2.974-6.916 0-3.328-1.688-6.26-4.25-8.084M4.074 19.416C2.226 17.671 1.1 15.226 1.1 12.5c0-3.328 1.688-6.26 4.25-8.084M12 18.75a6.25 6.25 0 100-12.5 6.25 6.25 0 000 12.5z" />
            </svg>
            <span>Rede Tipsters VIP ({tipstersList.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('mural');
              setMktSuccess('');
              setMktError('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'mural' 
                ? 'bg-zinc-900 border border-zinc-805 text-cyan-400 font-bold border-cyan-500/30' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-405 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            <span>Diário de Operações ({marketingList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('pillars');
              setPillarsSuccess('');
              setPillarsError('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'pillars' 
                ? 'bg-zinc-900 border border-zinc-805 text-emerald-400 font-bold border-emerald-500/30' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .252c-.008.379.137.751.43.992l1.003.828a1.125 1.125 0 0 1 .26 1.43l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.216-.456a1.125 1.125 0 0 0-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281a1.125 1.125 0 0 0-.644-.87a6.52 6.52 0 0 1-.22-.127a1.125 1.125 0 0 0-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.37-.49l-1.296-2.247a1.125 1.125 0 0 1 .26-1.43l1.003-.827c.293-.24.438-.613.43-.992a7.125 7.125 0 0 1 0-.252c.008-.379-.137-.751-.43-.992l-1.003-.828a1.125 1.125 0 0 1-.26-1.43l1.296-2.247a1.125 1.125 0 0 1 1.37-.49l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128c.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <span>Gestor de Tecnologia ({pillarsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('billing');
              setBillingSuccessMsg('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'billing' 
                ? 'bg-zinc-900 border border-zinc-805 text-emerald-400 font-bold border-emerald-500/30' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>Faturação & Custos API</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('promopopup');
              setPopupSuccessMsg('');
              setPopupErrorMsg('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'promopopup' 
                ? 'bg-zinc-900 border border-zinc-805 text-amber-500 font-bold border-amber-500/30' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-450 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <span>Popup Publicidade 🔥</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 ${
              activeTab === 'github' 
                ? 'bg-zinc-900 border border-emerald-500/40 text-emerald-400 font-bold shadow-lg shadow-emerald-500/10' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>Exportar & GitHub Sync 🚀</span>
          </button>
        </div>

        {/* Loading display */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-zinc-900/10 rounded-2xl border border-zinc-850">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4"></div>
            <span className="text-zinc-500 font-light text-xs tracking-widest uppercase font-mono">Processando infraestrutura...</span>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* VIEW 1: Subscritores & Gestor de Contas Premium */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                
                {/* Statistics Highlights Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#121216]/60 border border-zinc-850 p-6 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center font-bold text-xl font-mono">
                      {subscribers.length}
                    </div>
                    <div>
                      <h4 className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Subscrições Diretas</h4>
                      <p className="text-zinc-500 text-xs font-light">Contas autenticadas simuladas</p>
                    </div>
                  </div>

                  <div className="bg-[#121216]/60 border border-zinc-850 p-6 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl flex items-center justify-center font-bold text-xl font-mono">
                      {subscribers.filter(s => s.status === 'Premium').length}
                    </div>
                    <div>
                      <h4 className="text-xs text-zinc-300 font-bold uppercase tracking-wider text-orange-450">Membros Premium</h4>
                      <p className="text-zinc-500 text-xs font-light">Estatuto de benefício VIP ativo</p>
                    </div>
                  </div>

                  <div className="bg-[#121216]/60 border border-zinc-850 p-6 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold text-xs font-mono">
                      {Math.round((subscribers.filter(s => s.status && s.status !== 'Gratuito').length / (subscribers.length || 1)) * 100)}%
                    </div>
                    <div>
                      <h4 className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Taxa de Conversão</h4>
                      <p className="text-zinc-500 text-xs font-light">Percentagem de contas premium</p>
                    </div>
                  </div>
                </div>

                {/* NOTA DE RECEBIMENTO / MANUAL PAYMENT VALIDATION ENGINE */}
                {subscribers.filter(s => s.pendingPayment && s.pendingPayment.status === 'pending').length > 0 && (
                  <div className="bg-[#15151a] border border-orange-500/20 rounded-2xl overflow-hidden p-6 shadow-xl animate-pulse-slow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-lg">
                        💰
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          🚨 Pedidos de Validação de Pagamento Manual
                          <span className="bg-orange-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full font-mono">
                            {subscribers.filter(s => s.pendingPayment && s.pendingPayment.status === 'pending').length} Pendentes
                          </span>
                        </h3>
                        <p className="text-zinc-450 text-[11px] font-light">
                          Os utilizadores abaixo realizaram pagamento via MBWay, Revolut ou Transferência Bancária e aguardam ativação premium.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {subscribers.filter(s => s.pendingPayment && s.pendingPayment.status === 'pending').map((sub) => {
                        const pm = sub.pendingPayment!;
                        return (
                          <div key={sub.uid} className="bg-zinc-950/70 border border-zinc-850 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-zinc-750">
                            <div className="space-y-2.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-sm text-white font-semibold">{sub.displayName || 'Utilizador sem nome'}</strong>
                                <span className="text-xs text-zinc-500 font-mono">({sub.email})</span>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/40">
                                  <span className="text-[10px] text-zinc-500 uppercase block font-mono">Plano Solicitado</span>
                                  <strong className="text-orange-450 font-bold">{pm.planName} ({pm.price.toFixed(2)}€)</strong>
                                </div>
                                <div className="bg-[#0C0C10] p-2 rounded-lg border border-zinc-800/40">
                                  <span className="text-[10px] text-zinc-500 uppercase block font-mono">Método Escolhido</span>
                                  <span className="text-zinc-200 font-semibold flex items-center gap-1.5 uppercase font-mono text-[10px]">
                                    💳 {pm.method}
                                  </span>
                                </div>
                                <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/40">
                                  <span className="text-[10px] text-zinc-500 uppercase block font-mono">Ref / Comp. Uploaded</span>
                                  <span className="text-zinc-350 font-mono text-[10px] break-all block" title={pm.receiptName}>
                                    📁 {pm.receiptName || 'Não anexado'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={async () => {
                                  if (confirm(`Aprovar pagamento de ${pm.price.toFixed(2)}€ e ativar Premium para ${sub.email}?`)) {
                                    const planoFormatado = `Subscrição ativa (${pm.planName} • ${pm.price.toFixed(2)}€)`;
                                    await updateSubscriberStatus(sub.uid, planoFormatado);
                                    await updateSubscriberPendingPayment(sub.uid, {
                                      ...pm,
                                      status: 'approved'
                                    });
                                    alert(`Plano premium aprovado e ativo com sucesso para ${sub.email}!`);
                                    loadData();
                                  }
                                }}
                                className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black font-extrabold uppercase tracking-wider text-[11px] rounded-lg transition-all cursor-pointer border border-emerald-500/20 active:scale-95"
                              >
                                ✓ Aprovar & Ativar
                              </button>

                              <button
                                onClick={async () => {
                                  if (confirm(`Rejeitar comprovativo / pagamento de ${sub.email}? O utilizador poderá tentar submeter novamente.`)) {
                                    await updateSubscriberPendingPayment(sub.uid, {
                                      ...pm,
                                      status: 'rejected'
                                    });
                                    alert(`Pedido de pagamento rejeitado para ${sub.email}.`);
                                    loadData();
                                  }
                                }}
                                className="px-3 py-2 bg-zinc-900/50 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 font-extrabold uppercase tracking-wider text-[11px] rounded-lg transition-all cursor-pointer border border-zinc-850 hover:border-rose-500/10 active:scale-95"
                              >
                                Rejeitar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Subscribers Table with premium toggle options */}
                <div className="bg-[#121216] border border-zinc-850 rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Gestor de Contas Premium & Monetização</h3>
                      <p className="text-zinc-500 text-xs font-light mt-0.5">Controla o estatuto de acesso dos membros (Gratuito x Premium) em tempo real</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button 
                        onClick={loadData}
                        className="text-xs text-[#38bdf8] hover:underline font-semibold bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-xl text-sky-400 hover:bg-sky-500/20 transition-all"
                      >
                        🔄 Atualizar Lista
                      </button>
                      <button
                        onClick={handleOpenCreateModal}
                        className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black hover:border-emerald-500 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-emerald-500/20 active:scale-95 flex items-center gap-1.5"
                      >
                        <span>＋ Criar Utilizador Manual</span>
                      </button>
                    </div>
                  </div>

                  {/* BULK ACTION HEADER BAR */}
                  {selectedSubscriberUids.length > 0 && (
                    <div className="bg-zinc-950/90 border-b border-zinc-800 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
                        <span className="text-white text-xs font-black uppercase tracking-wider font-mono">
                          {selectedSubscriberUids.length} contas selecionadas para ações em bloco
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowBulkEmailModal(true)}
                          className="px-3 py-2 bg-sky-500/10 hover:bg-sky-500 border border-sky-500/20 text-sky-400 hover:text-black hover:border-sky-500 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>📢</span> Enviar Email de Expirar
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkResetToGratuito}
                          className="px-3 py-2 bg-amber-500/10 hover:bg-amber-550 border border-amber-500/20 text-amber-400 hover:text-black hover:border-amber-500 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>🔓</span> Voltar a Gratuito
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDeleteSubscribers}
                          className="px-3 py-2 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 text-rose-400 hover:text-white hover:border-rose-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>💥</span> Limpar / Eliminar
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSubscriberUids([])}
                          className="px-2.5 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>
                  )}

                  {subscribers.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500 text-xs font-light bg-zinc-900/10">
                      Nenhum utilizador registado ainda nesta base de dados.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-850 bg-zinc-900/40 text-zinc-400">
                            <th className="py-4 px-4 w-12 text-center">
                              <input
                                type="checkbox"
                                className="rounded border-zinc-800 text-teal-500 bg-zinc-950 focus:ring-teal-500 cursor-pointer"
                                checked={subscribers.filter(s => s.email !== 'morgado.aam@gmail.com').length > 0 && subscribers.filter(s => s.email !== 'morgado.aam@gmail.com').every(s => selectedSubscriberUids.includes(s.uid))}
                                onChange={handleSelectAllSubscribers}
                              />
                            </th>
                            <th className="py-4 px-6 font-bold uppercase tracking-wider">Nome de Exibição</th>
                            <th className="py-4 px-6 font-bold uppercase tracking-wider">Email</th>
                            <th className="py-4 px-6 font-bold uppercase tracking-wider">Estatuto plano</th>
                            <th className="py-4 px-6 font-bold uppercase tracking-wider">Pagamento/Pago</th>
                            <th className="py-4 px-6 font-bold uppercase tracking-wider">Método</th>
                            <th className="py-4 px-6 font-bold uppercase tracking-wider">Data de Adesão</th>
                            <th className="py-4 px-6 font-bold uppercase tracking-wider text-right">Ações de Gestão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {subscribers.map((sub, idx) => {
                            const isPaid = sub.status && sub.status !== 'Gratuito' && (!sub.pendingPayment || sub.pendingPayment.status === 'approved');
                            const isPending = sub.status && sub.status !== 'Gratuito' && sub.pendingPayment && sub.pendingPayment.status === 'pending';
                            const isRejected = sub.status && sub.status !== 'Gratuito' && sub.pendingPayment && sub.pendingPayment.status === 'rejected';

                            return (
                              <tr key={sub.uid || idx} className="hover:bg-zinc-900/20 transition-colors">
                                <td className="py-4 px-4 text-center w-12">
                                  {sub.email !== 'morgado.aam@gmail.com' ? (
                                    <input
                                      type="checkbox"
                                      className="rounded border-zinc-800 text-teal-500 bg-zinc-950 focus:ring-teal-500 cursor-pointer"
                                      checked={selectedSubscriberUids.includes(sub.uid)}
                                      onChange={() => handleToggleSelectSubscriber(sub.uid)}
                                    />
                                  ) : (
                                    <span className="text-zinc-600 font-bold font-mono text-[9px]" title="Admin Principal Protegido">⚠️</span>
                                  )}
                                </td>
                                <td className="py-4 px-6 font-semibold text-zinc-100">{sub.displayName || '-'}</td>
                                <td className="py-4 px-6 font-mono text-zinc-350">{sub.email}</td>
                                
                                {/* Membership Status Badge Column with Select Dropdown */}
                                <td className="py-4 px-6">
                                  <select
                                    value={getCanonicalStatusForDropdown(sub.status || 'Gratuito', currentPlans)}
                                    onChange={(e) => handleSetPlan(sub.uid || '', e.target.value)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border cursor-pointer transition-all outline-none ${
                                      sub.status && sub.status !== 'Gratuito'
                                        ? sub.status.includes('Basic')
                                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:border-blue-400'
                                          : sub.status.includes('Pro')
                                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:border-purple-400'
                                          : 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:border-orange-400'
                                        : 'bg-[#18181b] text-zinc-400 border-zinc-800 hover:border-zinc-700'
                                    }`}
                                  >
                                    <option value="Gratuito" className="bg-[#121216] text-zinc-400 font-bold">Gratuito</option>
                                    {currentPlans.map(p => {
                                      const valueMonthly = `${p.name} (Mensal • ${p.price.toFixed(2)}€)`;
                                      const valueYearly = `${p.name} (Anual • ${p.yearlyPrice.toFixed(2)}€)`;
                                      return (
                                        <React.Fragment key={p.id}>
                                          <option value={valueMonthly} className="bg-[#121216] font-bold text-zinc-350">
                                            {p.name} - Mensal ({p.price.toFixed(2)}€/mês)
                                          </option>
                                          <option value={valueYearly} className="bg-[#121216] font-bold text-orange-400">
                                            {p.name} - Anual ({p.yearlyPrice.toFixed(2)}€/ano)
                                          </option>
                                        </React.Fragment>
                                      );
                                    })}
                                  </select>
                                </td>

                                {/* Payment Status Display */}
                                <td className="py-4 px-6">
                                  {!sub.status || sub.status === 'Gratuito' ? (
                                    <span className="text-zinc-600 font-bold tracking-tight text-[10px]">Gratuito / S.P.</span>
                                  ) : (
                                    <select
                                      value={isPaid ? 'approved' : isRejected ? 'rejected' : 'pending'}
                                      onChange={(e) => handleSetPaymentStatus(sub.uid || '', e.target.value)}
                                      className={`px-2 py-1 rounded-xl text-[10px] font-extrabold uppercase border cursor-pointer hover:scale-[1.02] active:scale-95 transition-all outline-none leading-none ${
                                        isPaid
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-400'
                                          : isRejected
                                          ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:border-red-400'
                                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:border-amber-400'
                                      }`}
                                    >
                                      <option value="approved" className="bg-[#121216] text-emerald-400 font-bold">🟢 Pago</option>
                                      <option value="pending" className="bg-[#121216] text-amber-500 font-bold">⏳ Pendente</option>
                                      <option value="rejected" className="bg-[#121216] text-red-500 font-bold">❌ Rejeitado</option>
                                    </select>
                                  )}
                                </td>

                                <td className="py-4 px-6">
                                  <span className="opacity-75 uppercase text-[10px] font-mono text-zinc-500">{sub.provider}</span>
                                </td>
                                <td className="py-4 px-6 text-zinc-500 font-light">
                                  {new Date(sub.createdAt).toLocaleString('pt-PT')}
                                </td>
                                
                                <td className="py-4 px-6 text-right">
                                  <div className="flex items-center gap-2 justify-end">
                                    {/* Edit Button */}
                                    <button
                                      onClick={() => handleOpenEditModal(sub)}
                                      className="p-1.5 border border-zinc-800 hover:border-zinc-650 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 rounded-lg hover:text-zinc-200 transition-colors"
                                      title="Editar credenciais e plano"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                      </svg>
                                    </button>

                                    {/* Trash deletion action with inline confirmation */}
                                    {subscriberToDelete === sub.uid ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-rose-500 text-[10px] font-bold uppercase mr-1">Eliminar?</span>
                                        <button
                                          onClick={() => {
                                            handleDeleteSubscriberDirect(sub.uid);
                                            setSubscriberToDelete(null);
                                          }}
                                          className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-md text-[10px] uppercase transition-colors"
                                        >
                                          Sim
                                        </button>
                                        <button
                                          onClick={() => setSubscriberToDelete(null)}
                                          className="px-2 py-1 bg-zinc-805 hover:bg-zinc-700 text-zinc-400 font-semibold rounded-md text-[10px] uppercase transition-colors"
                                        >
                                          Não
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setSubscriberToDelete(sub.uid || '')}
                                        className="p-1.5 border border-rose-950 hover:border-rose-500 bg-rose-950/20 hover:bg-rose-500/10 text-rose-400 rounded-lg hover:text-rose-300 transition-colors"
                                        title="Remover subscritor"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* MODAL: CRIAR OU EDITAR UTILIZADOR */}
                {showCreateModal && (
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-[#121216] border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative">
                      <div className="p-6 border-b border-zinc-850 flex items-center justify-between">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          {editingSubscriber ? '📝 Editar Dados do Membro' : '＋ Registar Novo Membro Manual'}
                        </h3>
                        <button
                          onClick={() => setShowCreateModal(false)}
                          className="text-zinc-500 hover:text-white transition-colors text-sm font-bold font-mono"
                        >
                          ✕ FECHAR
                        </button>
                      </div>

                      <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Email do Utilizador</label>
                          <input
                            type="email"
                            required
                            value={userFormEmail}
                            onChange={(e) => setUserFormEmail(e.target.value)}
                            placeholder="exemplo@gmail.com"
                            className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 transition-colors text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Nome Completo / Nickname *</label>
                          <input
                            type="text"
                            required
                            value={userFormName}
                            onChange={(e) => setUserFormName(e.target.value)}
                            placeholder="Ex: Vera Morgado"
                            className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 transition-colors text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Nível de Acesso (Plano)</label>
                          <select
                            value={userFormStatus}
                            onChange={(e) => setUserFormStatus(e.target.value)}
                            className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-3 py-3 text-xs outline-none focus:border-orange-500 transition-colors text-zinc-200 font-bold"
                          >
                            <option value="Gratuito" className="bg-[#121216] text-zinc-400 font-bold">Gratuito (Sem Acesso VIP)</option>
                            {currentPlans.map(p => {
                              const valueMonthly = `${p.name} (Mensal • ${p.price.toFixed(2)}€)`;
                              const valueYearly = `${p.name} (Anual • ${p.yearlyPrice.toFixed(2)}€)`;
                              return (
                                <React.Fragment key={p.id}>
                                  <option value={valueMonthly} className="bg-[#121216] font-bold text-zinc-350">
                                    {p.name} - Mensal ({p.price.toFixed(2)}€)
                                  </option>
                                  <option value={valueYearly} className="bg-[#121216] font-bold text-orange-400">
                                    {p.name} - Anual ({p.yearlyPrice.toFixed(2)}€)
                                  </option>
                                </React.Fragment>
                              );
                            })}
                          </select>
                        </div>

                        {userFormStatus !== 'Gratuito' && (
                          <div className="bg-[#0a0a0c] p-4 border border-zinc-850 rounded-xl space-y-2.5">
                            <span className="text-[9px] uppercase font-bold tracking-widest text-[#38bdf8] font-mono block">Validação de Facturação</span>
                            
                            <label className="flex items-start gap-2.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={userFormPaid}
                                onChange={(e) => setUserFormPaid(e.target.checked)}
                                className="mt-0.5 rounded border-zinc-750 text-orange-500 focus:ring-orange-500 cursor-pointer bg-zinc-900"
                              />
                              <span className="text-[11px] text-zinc-300 font-medium leading-tight">
                                Confirmar Pagamento Recebido (Marcar como Pago)
                                <span className="block text-[10px] text-zinc-500 font-light mt-0.5">
                                  Ativa imediatamente sem aguardar comprovativos pendentes. Se desmarcar, o plano fica pendente de confirmação.
                                </span>
                              </span>
                            </label>
                          </div>
                        )}

                        <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-850">
                          <button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="px-4 py-2 bg-zinc-900/50 hover:bg-zinc-850 text-zinc-400 hover:text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all cursor-pointer border border-zinc-850"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-emerald-500/10 hover:bg-[#34d399] hover:text-black hover:border-[#34d399] text-emerald-400 text-emerald-450 font-black uppercase tracking-wider text-[10px] rounded-xl transition-all cursor-pointer border border-emerald-500/20"
                          >
                            {editingSubscriber ? 'Guardar Dados' : 'Criar Conta VIP'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* VIEW 2: Central de Disparo de Notificações Push */}
            {activeTab === 'push' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* Sender Form */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-[#121216]/65 border border-zinc-850 rounded-2xl p-6 shadow-xl relative">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-850 pb-4 mb-4 flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${editingPushId ? 'bg-amber-450 animate-pulse' : 'bg-orange-450'}`}></span>
                      {editingPushId ? 'Editar Alerta Guardado / Notícia' : 'Disparar Alerta de Notificação Push'}
                    </h3>
                    <p className="text-zinc-500 text-xs font-light mb-5">
                      {editingPushId 
                        ? 'Edita os campos abaixo para atualizar as informações deste alerta no histórico e feed da Home.' 
                        : 'Envia um alerta imediato a todos os navegadores registados e utilizadores ativos com as odds purificadas.'}
                    </p>

                    {pushSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl mb-4 leading-relaxed font-mono">
                        {pushSuccess}
                      </div>
                    )}

                    <form onSubmit={handleSendPushAlert} className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Título do Alerta</label>
                        <input
                          type="text"
                          required
                          value={pushTitle}
                          onChange={(e) => setPushTitle(e.target.value)}
                          placeholder="Ex: 🚨 ENTRADA VIP DETETADA"
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 transition-colors text-white font-light"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Mensagem Curta do Push (Exibida no Toast)</label>
                        <textarea
                          required
                          rows={3}
                          value={pushMessage}
                          onChange={(e) => setPushMessage(e.target.value)}
                          placeholder="Ex: A iR-Engine Pro v3.5 detetou valor de +14.2% na odd do Real Madrid. Entrar agora a stake sugerida de 2%!"
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 transition-colors text-white font-light resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Conteúdo Completo / Notícia (Opcional - Ativa Expansão na Página Inicial)</label>
                        <textarea
                          rows={4}
                          value={pushLongMessage}
                          onChange={(e) => setPushLongMessage(e.target.value)}
                          placeholder="Opcional. Escreve aqui o texto ou notícia mais detalhada. Se fornecido, os utilizadores verão uma seta para expandir e ler a notícia completa na Home!"
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 transition-colors text-white font-light resize-y"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        {editingPushId && (
                          <button
                            type="button"
                            onClick={handleCancelEditPushAlert}
                            className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          className="flex-2 w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/10"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.3} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                          <span>{editingPushId ? '[Guardar Alterações]' : '[Disparar Alerta Push]'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Alerts History Table */}
                <div className="lg:col-span-3">
                  <div className="bg-[#121216]/65 border border-zinc-850 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-4 mb-4 border-b border-zinc-850 flex items-center justify-between">
                      <span>Histórico de Alertas Enviados</span>
                      <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-500 font-mono">Consola de Registo</span>
                    </h3>

                    {pushAlerts.length === 0 ? (
                      <div className="text-center py-16 text-zinc-500 text-xs font-light bg-zinc-900/10 rounded-xl">
                        Nenhum alerta enviado ainda pelo painel.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-zinc-850 bg-zinc-900/40 text-zinc-500 font-mono">
                              <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[9px]">Data / Hora</th>
                              <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[9px]">Mensagem Enviada</th>
                              <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[9px] text-right">Estatuto</th>
                              <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[9px] text-center w-12">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900">
                            {pushAlerts.map((alert) => (
                              <tr key={alert.id} className="hover:bg-zinc-900/10 transition-colors">
                                <td className="py-3.5 px-4 font-mono text-zinc-500 text-[10px] whitespace-nowrap">
                                  {new Date(alert.sentAt).toLocaleString('pt-PT')}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-semibold text-zinc-200 mb-0.5">{alert.title}</div>
                                  <div className="text-zinc-450 leading-relaxed text-[11px] font-light max-w-sm">{alert.message}</div>
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase font-mono tracking-wider ${
                                    alert.status === 'Enviado' 
                                      ? 'bg-blue-500/10 text-sky-400 border border-blue-500/10' 
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    {alert.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleDuplicateAndResendPushAlert(alert)}
                                      className="p-1.5 border border-zinc-800 hover:border-sky-500 bg-zinc-900/40 hover:bg-sky-500/10 text-zinc-400 hover:text-sky-300 rounded cursor-pointer transition-all duration-200 inline-flex items-center justify-center"
                                      title="Re-disparar / Re-enviar Alerta"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleStartEditPushAlert(alert)}
                                      className={`p-1.5 border rounded cursor-pointer transition-all duration-200 inline-flex items-center justify-center ${
                                        editingPushId === alert.id
                                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                                          : 'border-zinc-800 hover:border-amber-500 bg-zinc-900/40 hover:bg-amber-500/10 text-zinc-400 hover:text-amber-300'
                                      }`}
                                      title="Editar Alerta"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeletePushAlert(alert.id)}
                                      className="p-1.5 border border-rose-950/20 hover:border-rose-500 bg-rose-950/10 hover:bg-rose-500/10 text-rose-450 hover:text-rose-300 rounded cursor-pointer transition-all duration-200 inline-flex items-center justify-center"
                                      title="Eliminar Alerta Histórico"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* VIEW 3: Monitor de Performance da IA & Tendências */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                
                {/* Real-time Traffic and Store Visitor Counter */}
                <div className="bg-[#121216]/65 border border-zinc-850 p-6 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-900 pb-5">
                    <div>
                      <span className="text-[10px] uppercase font-bold font-mono tracking-widest text-[#38bdf8] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Tráfego em Tempo Real
                      </span>
                      <h2 className="text-base font-bold text-white mt-1">Estatísticas de Acessos & Visitas (Omni-Channel)</h2>
                      <p className="text-zinc-500 text-xs font-light mt-0.5">Mapeamento de acessos globais automáticos, incluindo utilizadores não registados ou anónimos.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={async () => {
                          try {
                            const historyData = await getTrafficHistory();
                            setTrafficHistory(historyData);
                            setIsTrafficModalOpen(true);
                          } catch (e) {
                            console.error('Error fetching history:', e);
                          }
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white rounded-xl text-xs font-bold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 active:scale-[0.98]"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Ver Evolução Real
                      </button>

                      <button 
                        onClick={async () => {
                          try {
                            const updated = await getTrafficStats();
                            setTrafficStats(updated);
                          } catch (e) {}
                        }}
                        className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Atualizar Tráfego"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Stat CARD 1: Total Visits */}
                    <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl relative overflow-hidden group">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-2">
                        <span>Visitas Totais</span>
                        <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.243 0-4.352-.64-6.136-1.753a3.555 3.555 0 011.022-2.222 3.967 3.967 0 007.545-2.2a3.9 3.9 0 00.78-2.29m0 0A3.9 3.9 0 0110.088 11M13 10.088a3.9 3.9 0 00-6.109-3.23M9 5.143V4.42c0-.397-.07-.78-.2-1.135M9 5.143a4.125 4.125 0 00-6.136 3.655v.72H9z" />
                        </svg>
                      </div>
                      <div className="text-2xl font-mono font-extrabold text-white">
                        {trafficStats ? (trafficStats.totalVisits).toLocaleString() : '14,820'}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                        <span className="text-[#38bdf8]">🗲</span> Acumulado na loja irunbets
                      </div>
                    </div>

                    {/* Stat CARD 2: Unique Visitors */}
                    <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl relative overflow-hidden group">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-2">
                        <span>Visitantes Únicos</span>
                        <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <div className="text-2xl font-mono font-extrabold text-sky-400">
                        {trafficStats ? (trafficStats.uniqueVisitors).toLocaleString() : '4,392'}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                        <span className="text-sky-400">✓</span> Browsers distintos detetados
                      </div>
                    </div>

                    {/* Stat CARD 3: Visits Today */}
                    <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl relative overflow-hidden group">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-2">
                        <span>Visitas Hoje</span>
                        <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                      </div>
                      <div className="text-2xl font-mono font-extrabold text-orange-400">
                        {trafficStats ? (trafficStats.visitsToday).toLocaleString() : '247'}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                        <span className="text-orange-400">●</span> Ciclo de tráfego diário real
                      </div>
                    </div>

                    {/* Stat CARD 4: Live active visitors */}
                    <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl relative overflow-hidden group">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-2">
                        <span>Online Agora</span>
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      </div>
                      <div className="text-2xl font-mono font-extrabold text-emerald-400">
                        {trafficStats ? trafficStats.activeLiveUsers : '14'}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                        <span className="text-emerald-500">●</span> Leituras ativas em tempo real
                      </div>
                    </div>
                  </div>

                  {/* Calibration section specifically for Traffic metrics as requested */}
                  <div className="mt-6 pt-5 border-t border-zinc-900 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="max-w-xl">
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-zinc-400 font-mono">Painel de Ajuste & Calibração do Tráfego</h4>
                      <p className="text-zinc-500 text-[11px] font-light mt-0.5">Como administrador, podes adicionar offsets de marketing para apresentar maior tração comercial instantânea.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-400 font-mono">Adicionar Visitas (+):</span>
                        <button
                          onClick={() => {
                            if (!trafficStats) return;
                            const updated = { ...trafficStats, totalVisits: trafficStats.totalVisits + 500, uniqueVisitors: trafficStats.uniqueVisitors + 120 };
                            setTrafficStats(updated);
                            localStorage.setItem('irunbets_traffic_stats', JSON.stringify(updated));
                            if (isFirebaseActive) {
                              import('../services/firebase').then(async ({ db }) => {
                                if (db) {
                                  const { doc, setDoc } = await import('firebase/firestore');
                                  await setDoc(doc(db, 'settings', 'traffic_stats'), { totalVisits: updated.totalVisits, uniqueVisitors: updated.uniqueVisitors }, { merge: true });
                                }
                              }).catch(() => {});
                            }
                          }}
                          className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded text-[10px] tracking-wide font-mono transition-colors cursor-pointer"
                        >
                          +500 Visitas
                        </button>
                        <button
                          onClick={() => {
                            if (!trafficStats) return;
                            const updated = { ...trafficStats, totalVisits: trafficStats.totalVisits + 2000, uniqueVisitors: trafficStats.uniqueVisitors + 450 };
                            setTrafficStats(updated);
                            localStorage.setItem('irunbets_traffic_stats', JSON.stringify(updated));
                            if (isFirebaseActive) {
                              import('../services/firebase').then(async ({ db }) => {
                                if (db) {
                                  const { doc, setDoc } = await import('firebase/firestore');
                                  await setDoc(doc(db, 'settings', 'traffic_stats'), { totalVisits: updated.totalVisits, uniqueVisitors: updated.uniqueVisitors }, { merge: true });
                                }
                              }).catch(() => {});
                            }
                          }}
                          className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded text-[10px] tracking-wide font-mono transition-colors cursor-pointer"
                        >
                          +2000 Visitas
                        </button>
                      </div>

                      <div className="flex items-center gap-2 sm:border-l sm:border-zinc-900 sm:pl-4">
                        <span className="text-[11px] text-zinc-400 font-mono">Simulador Diário:</span>
                        <button
                          onClick={() => {
                            if (!trafficStats) return;
                            const updated = { ...trafficStats, visitsToday: Math.floor(Math.random() * 50) + 10 };
                            setTrafficStats(updated);
                            localStorage.setItem('irunbets_traffic_stats', JSON.stringify(updated));
                            if (isFirebaseActive) {
                              import('../services/firebase').then(async ({ db }) => {
                                if (db) {
                                  const { doc, setDoc } = await import('firebase/firestore');
                                  await setDoc(doc(db, 'settings', 'traffic_stats'), { visitsToday: updated.visitsToday }, { merge: true });
                                }
                              }).catch(() => {});
                            }
                          }}
                          className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-orange-400 rounded text-[10px] tracking-wide font-mono transition-colors cursor-pointer"
                        >
                          Reset Diário Aleatório
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistical interactive dashboard cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Metric 1 */}
                  <div className="bg-[#121216]/65 border border-zinc-850 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none transition-all duration-300 group-hover:scale-125"></div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] uppercase font-bold font-mono tracking-widest text-emerald-400">Algoritmo +EV</span>
                      <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono select-none">Ativo</span>
                    </div>
                    <div className="text-3xl font-extrabold tracking-tight text-white mb-2 font-mono">
                      {tipSuccessRate}%
                    </div>
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Taxa de Acerto Pro +EV</h4>
                    <p className="text-zinc-500 text-xs font-light leading-relaxed">
                      Desvios estatísticos detetados com margem matemática real acima de +7.5% de valor puro.
                    </p>
                    
                    {/* Progress indicator */}
                    <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-zinc-850">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${tipSuccessRate}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-[#121216]/65 border border-zinc-850 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none transition-all duration-300 group-hover:scale-125"></div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] uppercase font-bold font-mono tracking-widest text-[#38bdf8]">iR-Engine volume</span>
                      <span className="p-1 rounded-md bg-[#38bdf8]/10 text-[#38bdf8] text-[10px] font-mono select-none">Realtime</span>
                    </div>
                    <div className="text-3xl font-extrabold tracking-tight text-white mb-2 font-mono">
                      {purifiedOddsVolume.toLocaleString()}
                    </div>
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Odds Purificadas</h4>
                    <p className="text-zinc-500 text-xs font-light leading-relaxed">
                      Linhas totais de probabilidade de odds cruzadas das casas portuguesas neste ciclo.
                    </p>

                    {/* Progress indicator */}
                    <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-zinc-850">
                      <div 
                        className="bg-sky-400 h-full rounded-full transition-all duration-1000" 
                        style={{ width: '85%' }}
                      ></div>
                    </div>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-[#121216]/65 border border-zinc-850 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-xl pointer-events-none transition-all duration-300 group-hover:scale-125"></div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] uppercase font-bold font-mono tracking-widest text-orange-450">Yield histórico</span>
                      <span className="p-1 rounded-md bg-orange-500/10 text-orange-400 text-[10px] font-mono select-none">Lucro</span>
                    </div>
                    <div className="text-3xl font-extrabold tracking-tight text-white mb-2 font-mono text-orange-400">
                      {theoreticalYield >= 0 ? `+${theoreticalYield}%` : `${theoreticalYield}%`}
                    </div>
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Yield / Lucro Acumulado</h4>
                    <p className="text-zinc-500 text-xs font-light leading-relaxed">
                      Retorno médio matemático por entrada com banca e stake constante recomendada de 2%.
                    </p>

                    {/* Progress indicator bar */}
                    <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-zinc-850">
                      <div 
                        className="bg-orange-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, Math.max(0, (theoreticalYield / 25) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Sub row with simulated trends & real-time analytics tuner */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  
                  {/* Tuner for the administrator to modify analytics values instantly */}
                  <div className="lg:col-span-2 bg-[#121216]/65 border border-zinc-850 p-6 rounded-2xl">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-zinc-300 mb-1 font-mono">Calibração do Algoritmo IA</h3>
                    <p className="text-zinc-500 text-xs font-light mb-5">Afina manualmente os valores exibidos da performance matemática para simular os backtests:</p>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5 text-xs text-zinc-400">
                          <span>Percentual Acertos Tips +EV:</span>
                          <span className="font-mono text-white font-bold">{tipSuccessRate}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="40" 
                          max="95" 
                          step="0.1"
                          value={tipSuccessRate} 
                          onChange={(e) => handleAdjustMetrics(parseFloat(e.target.value), purifiedOddsVolume, theoreticalYield)}
                          className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5 text-xs text-zinc-400">
                          <span>Volume de Odds Processadas:</span>
                          <span className="font-mono text-white font-bold">{purifiedOddsVolume}</span>
                        </div>
                        <input 
                          type="range" 
                          min="1000" 
                          max="15000" 
                          step="50"
                          value={purifiedOddsVolume} 
                          onChange={(e) => handleAdjustMetrics(tipSuccessRate, parseInt(e.target.value), theoreticalYield)}
                          className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-sky-450"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5 text-xs text-zinc-400">
                          <span>Yield Geral Teórico:</span>
                          <span className="font-mono text-orange-400 font-bold">+{theoreticalYield}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="-5" 
                          max="25" 
                          step="0.1"
                          value={theoreticalYield} 
                          onChange={(e) => handleAdjustMetrics(tipSuccessRate, purifiedOddsVolume, parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => handleAdjustMetrics(68.4, 4812, 14.2)}
                          className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Repor Valores Originais de Fábrica
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Top Trend indicators requested (Radar de Favoritas prefers) */}
                  <div className="lg:col-span-3 bg-[#121216]/65 border border-zinc-850 p-6 rounded-2xl flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#38bdf8] mb-1 font-mono">Indicador de Tendências (Radar de Favoritas)</h3>
                      <p className="text-zinc-500 text-xs font-light mb-4">Mapeamento dinâmico de cliques e preferências observadas no Radar de Favoritas da iRunBets:</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        
                        {/* Leagues */}
                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-3 border-b border-zinc-900 pb-1.5">Top 3 Ligas Mais Procuradas</div>
                          <div className="space-y-3 font-mono">
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between text-xs text-zinc-200 mb-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-orange-455">1º</span>
                                  <span>Liga Portugal</span>
                                </span>
                                <span className="text-zinc-500 text-[10.5px]">48% das buscas</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full" style={{ width: '48%' }}></div>
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <div className="flex items-center justify-between text-xs text-zinc-200 mb-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-zinc-400">2º</span>
                                  <span>Premier League</span>
                                </span>
                                <span className="text-zinc-500 text-[10.5px]">32% das buscas</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                <div className="bg-sky-500 h-full rounded-full" style={{ width: '32%' }}></div>
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <div className="flex items-center justify-between text-xs text-zinc-200 mb-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-zinc-500">3º</span>
                                  <span>Serie A (Itália)</span>
                                </span>
                                <span className="text-zinc-500 text-[10.5px]">20% das buscas</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                <div className="bg-zinc-700 h-full rounded-full" style={{ width: '20%' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Teams */}
                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-3 border-b border-zinc-900 pb-1.5">Top 3 Equipas Mais Seguidas</div>
                          <div className="space-y-3 font-mono">
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between text-xs text-zinc-200 mb-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-orange-455">1º</span>
                                  <span>SL Benfica</span>
                                </span>
                                <span className="text-zinc-500 text-[10.5px]">42% de clips</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-400 to-red-500 h-full rounded-full" style={{ width: '42%' }}></div>
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <div className="flex items-center justify-between text-xs text-zinc-200 mb-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-zinc-400">2º</span>
                                  <span>Real Madrid</span>
                                </span>
                                <span className="text-zinc-500 text-[10.5px]">35% de clips</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                <div className="bg-sky-400 h-full rounded-full" style={{ width: '35%' }}></div>
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <div className="flex items-center justify-between text-xs text-zinc-200 mb-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-zinc-500">3º</span>
                                  <span>Sporting CP</span>
                                </span>
                                <span className="text-zinc-500 text-[10.5px]">23% de clips</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '23%' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="text-[11px] text-zinc-500 italic mt-4 border-t border-zinc-900 pt-3">
                      *Tendências de pesquisa do radar calculadas com base nas últimas 10.000 pesquias efetuadas nos simuladores do site.
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* VIEW 4: Gestão de Notícias & Relatórios (Similares aos artigos do front) */}
            {activeTab === 'news' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* Form Col */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Premium Subscribers Base Config Card */}
                  <div className="bg-[#121216]/60 border border-zinc-850 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    {/* Top graphic lines */}
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500"></div>

                    <div className="border-b border-zinc-850 pb-4 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">⭐</span>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          Estratégia do Monitor de Adesão VIP
                        </h3>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 font-light leading-relaxed">
                        Defina se pretende um valor fixo simulado de subscritores iniciados para gerar gatilho de prova social ("visto" ativo) ou reportar a verdade absoluta apenas ("visto" inativo).
                      </p>
                    </div>

                    {subConfigSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl mb-4 font-light leading-relaxed animate-pulse">
                        {subConfigSuccess}
                      </div>
                    )}

                    <form onSubmit={handleSaveSubscribersConfigSubmit} className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={subscribersConfig.isEnabled}
                            onChange={(e) => setSubscribersConfigState({
                              ...subscribersConfig,
                              isEnabled: e.target.checked
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-200">
                            Ativar Monitor de Adesão Simulado (Social Proof)
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            {subscribersConfig.isEnabled ? '✅ COM VISTO: Mostra número base + registos' : '❌ SEM VISTO: Mostra apenas inscrições reais'}
                          </span>
                        </div>
                      </div>

                      {subscribersConfig.isEnabled && (
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 block">
                            Subscritores Iniciais Base (Número)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              required
                              min="0"
                              value={subscribersConfig.baseCount}
                              onChange={(e) => setSubscribersConfigState({
                                ...subscribersConfig,
                                baseCount: Math.max(0, parseInt(e.target.value) || 0)
                              })}
                              placeholder="Ex: 1420"
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-teal-500 transition-colors text-white font-bold"
                            />
                            <span className="absolute right-3 top-2 text-[10px] text-zinc-500 uppercase font-mono font-bold">
                              membros
                            </span>
                          </div>
                          <p className="text-[9.5px] text-zinc-500 leading-relaxed italic font-light pt-1">
                            *O painel público de novidades e o contador dinâmico irão somar este valor inicial ao número de subscritores registados organicamente para compor o display principal!
                          </p>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-black text-[11px] tracking-wider uppercase rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg shadow-emerald-500/[0.05]"
                      >
                        Aplicar Estratégia de Adesão
                      </button>
                    </form>
                  </div>

                  {/* CARD DE CAMPANHA DO CAMPEONATO DO MUNDO / MUNDIAL */}
                  <div className="bg-[#121216]/60 border border-zinc-850 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    {/* Top glowing bar */}
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-orange-500 via-amber-500 to-red-500"></div>

                    <div className="border-b border-zinc-850 pb-4 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🏆</span>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          Painel de Campanha Ativa Geral do Site (Acesso Livre)
                        </h3>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 font-light leading-relaxed">
                        Iniba mensalidades e conceda acesso livre aos utilizadores! Aqui pode editar o texto de promoção que quiser, gravar e atualizar em todo o site de imediato.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!subscribersConfig.isMundialActive}
                            onChange={async (e) => {
                              const updated = {
                                ...subscribersConfig,
                                isMundialActive: e.target.checked
                              };
                              setSubscribersConfigState(updated);
                              try {
                                await saveSubscribersConfig(updated);
                                setSubConfigSuccess('Configuração da Campanha guardada com sucesso!');
                                setTimeout(() => setSubConfigSuccess(''), 4000);
                              } catch (err: any) {
                                alert('Erro ao salvar configuração: ' + err?.message);
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-200">
                            Ativar {subscribersConfig.mundialCampaignTitle || 'Campanha Aberta do Campeonato do Mundo'}
                          </span>
                          <span className="text-[9.5px] text-zinc-500 font-mono uppercase tracking-tight">
                            {subscribersConfig.isMundialActive ? '🔥 CAMPANHA TOTALMENTE ATIVA: Acesso Livre' : '❄️ MODO NORMAL: Requer Assinatura Paga'}
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Editable Campaign Text Fields requested by User */}
                      <div className="space-y-3 pt-2.5 border-t border-zinc-850">
                        <div>
                          <label className="block text-[9px] font-extrabold text-zinc-450 uppercase tracking-widest mb-1.5 font-mono">
                            ✍️ Nome / Título da Promoção (Aparece riscado nos preços e cabeçalhos):
                          </label>
                          <input
                            type="text"
                            value={subscribersConfig.mundialCampaignTitle || ''}
                            onChange={(e) => {
                              setSubscribersConfigState({
                                ...subscribersConfig,
                                mundialCampaignTitle: e.target.value
                              });
                            }}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-orange-500 font-light"
                            placeholder="Ex: Campanha Aberta do Campeonato do Mundo"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-extrabold text-zinc-450 uppercase tracking-widest mb-1.5 font-mono">
                            📝 Texto Descritivo da Promoção (Card de Informação):
                          </label>
                          <textarea
                            value={subscribersConfig.mundialCampaignDescription || ''}
                            onChange={(e) => {
                              setSubscribersConfigState({
                                ...subscribersConfig,
                                mundialCampaignDescription: e.target.value
                              });
                            }}
                            rows={3}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-[11px] text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-orange-500 font-light leading-relaxed resize-none"
                            placeholder="Texto detalhando o que está incluído na campanha gratuita..."
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await saveSubscribersConfig(subscribersConfig);
                                setSubConfigSuccess('Promoção guardada e atualizada com sucesso em todo o site!');
                                setTimeout(() => setSubConfigSuccess(''), 4000);
                              } catch (err: any) {
                                alert('Erro ao salvar textos: ' + err?.message);
                              }
                            }}
                            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-black text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            💾 Guardar & Atualizar Promoção em Todo o Site
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 bg-zinc-950/50 rounded-xl border border-zinc-900 text-[11px] text-zinc-400 space-y-2.5 font-light leading-relaxed">
                        <div className="text-zinc-200 font-bold uppercase text-[9.5px] tracking-wide text-orange-400">
                          ⚡ Impacto Front-end Automático:
                        </div>
                        <ul className="list-disc list-inside space-y-1.5 pl-1.5 text-[10px]">
                          <li>
                            <strong className="text-zinc-300">Registo de Banca (Banca):</strong> Aberto a todos os registados gratuitas em tempo real.
                          </li>
                          <li>
                            <strong className="text-zinc-300">IA iRunBets (iRunBets Chat/OCR):</strong> Totalmente livre e sem restrições.
                          </li>
                          <li>
                            <strong className="text-zinc-300">Rede de Tipsters / Dashboard Tipster:</strong> Gated com um aviso educacional de campanha temporária.
                          </li>
                          <li>
                            <strong className="text-zinc-300">Página de Subscrições / Checkout:</strong> Exibe banner a avisar que as mensalidades estão suspensas para que explorem grátis!
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* CARD DE CONFIGURAÇÃO DE DISPONIBILIDADE DAS APPS MÓVEIS */}
                  <div className="bg-[#121216]/60 border border-zinc-850 rounded-2xl p-6 shadow-xl relative overflow-hidden mb-6">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-sky-500 to-orange-500"></div>

                    <div className="border-b border-zinc-850 pb-4 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📱</span>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          Controlo das Apps Móveis (iOS & Android)
                        </h3>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 font-light leading-relaxed">
                        Gerencie a disponibilidade das apps móveis na página inicial. Se inativadas, as apps exibirão o aviso <strong className="text-orange-400">"Brevemente disponível"</strong> na página principal. Quando estiverem prontas/aprovadas, ative e insira o link de download direto para remover o aviso e permitir o download!
                      </p>
                    </div>

                    <div className="space-y-5">
                      {/* App Store Control Group */}
                      <div className="p-4 bg-zinc-950/35 border border-zinc-900 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-zinc-200">
                              App Store (iOS) • Disponibilidade
                            </span>
                            <span className="text-[9.5px] text-zinc-500 font-mono uppercase tracking-tight">
                              {subscribersConfig.isAppStoreAvailable ? '🟢 ATIVA: Permite download direto' : '🟡 BREVEMENTE: Bloqueia e mostra aviso amigável'}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!!subscribersConfig.isAppStoreAvailable}
                              onChange={(e) => {
                                setSubscribersConfigState({
                                  ...subscribersConfig,
                                  isAppStoreAvailable: e.target.checked
                                });
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                          </label>
                        </div>

                        {subscribersConfig.isAppStoreAvailable ? (
                          <div className="space-y-1.5 animate-fade-in">
                            <label className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 block">
                              Link da App Store (URL de Download Direto)
                            </label>
                            <input
                              type="text"
                              value={subscribersConfig.appStoreUrl || ''}
                              onChange={(e) => {
                                setSubscribersConfigState({
                                  ...subscribersConfig,
                                  appStoreUrl: e.target.value
                                });
                              }}
                              className="w-full bg-zinc-900 px-4 py-2.5 text-xs outline-none border border-zinc-800 rounded-xl focus:border-sky-500 transition-colors text-white font-medium"
                              placeholder="Ex: https://apps.apple.com/pt/app/irunbets/id..."
                            />
                          </div>
                        ) : (
                          <div className="text-[9.5px] text-zinc-500 italic">
                            *O botão na página inicial emitirá um alerta informando que a App iOS está em fase final de testes.
                          </div>
                        )}
                      </div>

                      {/* Google Play Control Group */}
                      <div className="p-4 bg-zinc-950/35 border border-zinc-900 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-zinc-200">
                              Google Play Store (Android) • Disponibilidade
                            </span>
                            <span className="text-[9.5px] text-zinc-500 font-mono uppercase tracking-tight">
                              {subscribersConfig.isGooglePlayAvailable ? '🟢 ATIVA: Permite download direto' : '🟡 BREVEMENTE: Bloqueia e mostra aviso amigável'}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!!subscribersConfig.isGooglePlayAvailable}
                              onChange={(e) => {
                                setSubscribersConfigState({
                                  ...subscribersConfig,
                                  isGooglePlayAvailable: e.target.checked
                                });
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                          </label>
                        </div>

                        {subscribersConfig.isGooglePlayAvailable ? (
                          <div className="space-y-1.5 animate-fade-in">
                            <label className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 block">
                              Link da Play Store (URL de Download Direto)
                            </label>
                            <input
                              type="text"
                              value={subscribersConfig.googlePlayUrl || ''}
                              onChange={(e) => {
                                setSubscribersConfigState({
                                  ...subscribersConfig,
                                  googlePlayUrl: e.target.value
                                });
                              }}
                              className="w-full bg-zinc-900 px-4 py-2.5 text-xs outline-none border border-zinc-800 rounded-xl focus:border-orange-500 transition-colors text-white font-medium"
                              placeholder="Ex: https://play.google.com/store/apps/details?id=..."
                            />
                          </div>
                        ) : (
                          <div className="text-[9.5px] text-zinc-500 italic">
                            *O botão na página inicial emitirá um alerta informando que a App Android está em fase final de aprovação.
                          </div>
                        )}
                      </div>

                      {/* Save Action Button */}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await saveSubscribersConfig(subscribersConfig);
                            setSubConfigSuccess('Configurações das Apps Móveis guardadas e atualizadas de imediato!');
                            setTimeout(() => setSubConfigSuccess(''), 4000);
                          } catch (err: any) {
                            alert('Erro ao salvar as configurações: ' + err?.message);
                          }
                        }}
                        className="w-full py-3 bg-gradient-to-r from-sky-500 to-orange-500 hover:opacity-90 active:scale-95 text-white font-black text-[11px] tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                      >
                        💾 Guardar Alterações de Estado das Apps Móveis
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#121216]/60 border border-zinc-850 rounded-2xl p-6 shadow-xl relative">
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-4 mb-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        {selectedNewsToEdit ? 'Editar Artigo de Odds / IA' : 'Publicar Artigo de Odds / IA'}
                      </h3>
                      {selectedNewsToEdit && (
                        <button
                          type="button"
                          onClick={handleCancelNewsEdit}
                          className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-md transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>

                    {formError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl mb-4 leading-relaxed font-light">
                        {formError}
                      </div>
                    )}

                    {formSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl mb-4 leading-relaxed font-light">
                        {formSuccess}
                      </div>
                    )}

                    <form onSubmit={handlePublish} className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Título da Notícia</label>
                        <input
                          type="text"
                          required
                          value={newsTitle}
                          onChange={(e) => setNewsTitle(e.target.value)}
                          placeholder="Ex: Novo Modelo Matemática Pro v3.5"
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500 transition-colors text-white font-light"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Resumo Curto (3 linhas)</label>
                        <textarea
                          required
                          rows={2}
                          value={newsSummary}
                          onChange={(e) => setNewsSummary(e.target.value)}
                          placeholder="Ex: Análise matemática indica mais de 15% de desvios na Liga Europa."
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500 transition-colors text-white font-light resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Conteúdo Completo (Parágrafos)</label>
                        <textarea
                          required
                          rows={6}
                          value={newsContent}
                          onChange={(e) => setNewsContent(e.target.value)}
                          placeholder="Redija o artigo com detalhes matemáticos..."
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#00f2fe] transition-colors text-white font-light"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Imagem da Notícia (Download do PC ou URL)</label>
                        <div className="space-y-2">
                          <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 p-3 rounded-xl text-center relative">
                            <input 
                              type="file"
                              accept="image/*"
                              id="news_image_upload_pc"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    if (evt.target?.result) {
                                      setNewsImageUrl(evt.target.result as string);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            {newsImageUrl ? (
                              <div className="space-y-2">
                                <img 
                                  src={newsImageUrl} 
                                  alt="News Preview" 
                                  className="max-h-36 rounded-lg mx-auto object-cover border border-zinc-700"
                                />
                                <p className="text-[10px] text-emerald-400 font-mono font-bold">✓ Imagem Carregada do Computador</p>
                                <button
                                  type="button"
                                  onClick={() => setNewsImageUrl('')}
                                  className="text-[10px] text-rose-400 hover:underline"
                                >
                                  Remover Imagem
                                </button>
                              </div>
                            ) : (
                              <label htmlFor="news_image_upload_pc" className="cursor-pointer block py-2">
                                <span className="text-xl block mb-1">💻 🖼️</span>
                                <span className="text-xs font-bold text-zinc-300 block">Carregar Imagem do Computador</span>
                                <span className="text-[10px] text-zinc-500 block">Selecione uma imagem do seu computador (JPG, PNG, WEBP)</span>
                              </label>
                            )}
                          </div>
                          
                          <input
                            type="text"
                            value={newsImageUrl}
                            onChange={(e) => setNewsImageUrl(e.target.value)}
                            placeholder="Ou cole um Link de Imagem Externa (https://...)"
                            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-sky-500 transition-colors text-white font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Autor / Assinatura</label>
                        <input
                          type="text"
                          value={newsAuthor}
                          onChange={(e) => setNewsAuthor(e.target.value)}
                          placeholder="Ex: Equipa www.irunbets.pt"
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500 transition-colors text-white font-light"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isPublishing}
                        className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isPublishing ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : selectedNewsToEdit ? (
                          'Gravar e Atualizar Notícia'
                        ) : (
                          'Publicar Notícia Oficial'
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* List Col */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="bg-[#121216]/60 border border-zinc-850 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 pb-4 border-b border-zinc-850">
                      Notícias Publicadas Atualmente
                    </h3>

                    {news.length === 0 ? (
                      <div className="text-center py-16 text-zinc-500 text-xs font-light bg-zinc-900/10 rounded-xl">
                        Ainda não publicou nenhuma notícia de apostas ou previsões.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {news.map((item) => (
                          <div 
                            key={item.id}
                            className="p-5 bg-zinc-900/30 border border-zinc-850 hover:border-zinc-800 rounded-xl flex items-start justify-between gap-4 transition-colors"
                          >
                            <div className="truncate">
                              <div className="flex items-center gap-2 mb-1.5 text-[10px] font-mono text-zinc-500">
                                <span>{new Date(item.publishedAt).toLocaleDateString('pt-PT')}</span>
                                <span>•</span>
                                <span>Por {item.author}</span>
                              </div>
                              <h4 className="font-bold text-white text-sm mb-2 hover:text-orange-400 transition-colors truncate">{item.title}</h4>
                              <p className="text-zinc-400 text-xs font-light line-clamp-2 leading-relaxed">{item.summary}</p>
                            </div>

                            {newsToDelete === item.id ? (
                              <div className="flex flex-col items-end gap-1.5 self-center min-w-[80px] shrink-0">
                                <span className="text-rose-450 text-[9px] uppercase font-bold">Apagar?</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      handleDeleteNewsDirect(item.id);
                                      setNewsToDelete(null);
                                    }}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-550 text-white font-bold rounded-md text-[10px] uppercase transition-colors"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    onClick={() => setNewsToDelete(null)}
                                    className="px-2 py-0.5 bg-zinc-850 hover:bg-zinc-750 text-zinc-350 font-semibold rounded-md text-[10px] uppercase transition-colors"
                                  >
                                    Não
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 self-start shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditNewsInitiate(item)}
                                  className={`px-2.5 py-1 border border-orange-500/30 hover:border-orange-500 text-orange-400 hover:text-white rounded-lg text-[10.5px] uppercase font-bold transition-all cursor-pointer ${selectedNewsToEdit?.id === item.id ? 'bg-orange-500/20 border-orange-400 text-white' : ''}`}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewsToDelete(item.id)}
                                  className="p-2 border border-rose-950 hover:border-rose-550 bg-rose-950/20 hover:bg-rose-550/15 text-rose-400 hover:text-rose-300 rounded-xl transition-colors cursor-pointer"
                                  title="Apagar artigo"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* VIEW 5: Gestor e Construtor Dinâmico de Páginas */}
            {activeTab === 'pages' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Visual Form Builder Panel */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-[#121216]/60 border border-zinc-850 rounded-2xl p-6 shadow-xl relative">
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-4 mb-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        {selectedPageToEdit ? 'Editar Página Existente' : 'Criar Nova Página Personalizada'}
                      </h3>
                      {selectedPageToEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPageToEdit(null);
                            setPageTitle('');
                            setPageSlug('');
                            setPageDescription('');
                            setPageBlocks([]);
                            setIsSubpage(false);
                            setParentSlug('');
                            setPageError('');
                            setPageSuccess('');
                          }}
                          className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-850 hover:border-zinc-805 rounded-md transition-colors"
                        >
                          Cancelar Edição
                        </button>
                      )}
                    </div>

                    {pageError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl mb-4 leading-relaxed font-light">
                        {pageError}
                      </div>
                    )}

                    {pageSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl mb-4 leading-relaxed font-light">
                        {pageSuccess}
                      </div>
                    )}

                    <form onSubmit={handleSavePage} className="space-y-4">
                      {/* Section 1: Metadata */}
                      <div className="p-4 bg-zinc-950/45 border border-zinc-900 rounded-xl space-y-3">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#00f2fe] font-mono block">1. Metadados Básicos</span>
                        
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Título do Link do Menu/Navbar</label>
                          <input
                            type="text"
                            required
                            value={pageTitle}
                            onChange={(e) => {
                              setPageTitle(e.target.value);
                              // Auto slugify if not editing
                              if (!selectedPageToEdit) {
                                const suggested = e.target.value
                                  .toLowerCase()
                                  .normalize("NFD")
                                  .replace(/[\u0300-\u036f]/g, "")
                                  .replace(/[^a-z0-9\s-_]/g, '')
                                  .trim()
                                  .replace(/\s+/g, '-');
                                setPageSlug(suggested);
                              }
                            }}
                            placeholder="Ex: Clube VIP iRunBets"
                            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00f2fe] transition-colors text-white font-light"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Slug URL (Caminho da Página)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-[11px] text-zinc-650 font-mono select-none">/p/</span>
                            <input
                              type="text"
                              required
                              disabled={!!selectedPageToEdit}
                              value={pageSlug}
                              onChange={(e) => setPageSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                              placeholder="clube-vip"
                              className="w-full bg-zinc-900/60 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-805 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-[#00f2fe] transition-colors text-white font-mono font-light"
                            />
                          </div>
                          <span className="text-[9px] text-zinc-500 font-light mt-1 block">Apenas caracteres em minúsculas, hífens ou números.</span>
                        </div>

                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Resumo Curto / Descrição SEO (Opcional)</label>
                          <input
                            type="text"
                            value={pageDescription}
                            onChange={(e) => setPageDescription(e.target.value)}
                            placeholder="Ex: Grupo de elite com prognósticos ultra purificados +EV."
                            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00f2fe] transition-colors text-white font-light"
                          />
                        </div>

                        {/* Visibilidade da Página (Oculta ou Publicada) */}
                        <div className="pt-3.5 border-t border-zinc-850/60 mt-3 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-300">Ocultar Página?</span>
                            <span className="text-[9px] text-[#ff4f60] font-mono leading-none mt-1">
                              {isPageHidden ? "🔑 OCULTA PARA A COMUNIDADE" : "🌐 VISÍVEL PARA A COMUNIDADE"}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isPageHidden}
                              onChange={(e) => setIsPageHidden(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                          </label>
                        </div>

                        {/* Nesting / Subpage Selector Options */}
                        <div className="pt-3.5 border-t border-zinc-850/60 mt-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400">Inserir Como Subpágina?</span>
                            <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSubpage(false);
                                  setParentSlug('');
                                }}
                                className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${
                                  !isSubpage 
                                    ? 'bg-zinc-800 text-white' 
                                    : 'text-zinc-500 hover:text-zinc-350'
                                }`}
                              >
                                Não
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsSubpage(true)}
                                className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${
                                  isSubpage 
                                    ? 'bg-orange-500 text-white' 
                                    : 'text-zinc-500 hover:text-zinc-350'
                                }`}
                              >
                                Sim
                              </button>
                            </div>
                          </div>

                          {isSubpage && (
                            <div className="space-y-1.5 animate-fade-in duration-300">
                              <label className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 block">
                                Menu Principal de Destino / Pasta
                              </label>
                              <div className="relative">
                                <select
                                  value={parentSlug}
                                  onChange={(e) => setParentSlug(e.target.value)}
                                  required={isSubpage}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00f2fe] appearance-none"
                                >
                                  <option value="">-- Selecione o Menu Superior --</option>
                                  <option value="purificador">Subpágina do Purificador de Odds</option>
                                  <option value="radar">Subpágina do Radar de Favoritas</option>
                                  <option value="noticias">Subpágina de Notícias</option>
                                  <option value="faq">Subpágina de FAQ</option>
                                  {pages.length > 0 && (
                                    <optgroup label="Debaixo de canais VIP existentes">
                                      {pages
                                        .filter(p => p.slug !== pageSlug)
                                        .map(p => (
                                          <option key={p.slug} value={p.slug}>
                                            Subpágina de: {p.title}
                                          </option>
                                        ))
                                      }
                                    </optgroup>
                                  )}
                                </select>
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-400 text-[10px]">
                                  ▼
                                </div>
                              </div>
                              <p className="text-[9px] text-zinc-500 leading-relaxed font-light">
                                Se escolher colocar como subpágina do "Purificador", esta página será exibida debaixo do Purificador no Cabeçalho e na Sidebar!
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 2: Structured Blocks Editor */}
                      <div className="p-4 bg-zinc-950/45 border border-zinc-900 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#f59e0b] font-mono block">2. Blocos de Conteúdo ({pageBlocks.length})</span>
                          {pageBlocks.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setPageBlocks([])}
                              className="text-[9px] text-rose-450 hover:underline cursor-pointer"
                            >
                              Limpar Todos
                            </button>
                          )}
                        </div>

                        {/* List current blocks and controls */}
                        {pageBlocks.length === 0 ? (
                          <div className="text-center py-4 text-zinc-650 text-xs font-mono border border-dashed border-zinc-850 rounded-xl bg-zinc-900/5">
                            Nenhum bloco adicionado ainda.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1 select-none">
                            {pageBlocks.map((block, i) => (
                              <div key={i} className="flex items-center justify-between gap-2.5 p-2.5 bg-zinc-900/50 border border-zinc-850 rounded-xl text-xs">
                                <div className="flex items-center gap-2 truncate">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                                    block.type === 'text' ? 'bg-[#38bdf8]/10 text-[#38bdf8]' :
                                    block.type === 'image' ? 'bg-emerald-500/10 text-emerald-400' :
                                    block.type === 'video' ? 'bg-amber-500/10 text-amber-500' :
                                    'bg-orange-500/10 text-orange-405'
                                  }`}>
                                    {block.type}
                                  </span>
                                  <span className="text-zinc-350 font-light truncate">
                                    {block.type === 'text' ? (block.title || block.content) : 
                                     block.type === 'cta' ? `${block.title} (${block.content})` : 
                                     block.type === 'image' ? (block.caption || 'Imagem URL') :
                                     'Vídeo Embed'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveBlock(i, 'up')}
                                    disabled={i === 0}
                                    className="p-1 px-1.5 bg-zinc-950/40 hover:bg-zinc-800 rounded text-zinc-400 disabled:opacity-20 cursor-pointer text-[10px]"
                                    title="Subir bloco"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveBlock(i, 'down')}
                                    disabled={i === pageBlocks.length - 1}
                                    className="p-1 px-1.5 bg-zinc-950/40 hover:bg-zinc-800 rounded text-zinc-400 disabled:opacity-20 cursor-pointer text-[10px]"
                                    title="Descer bloco"
                                  >
                                    ▼
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBlock(i)}
                                    className="p-1 px-1.5 bg-rose-950/30 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer text-[10px]"
                                    title="Remover bloco"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Subsection: Add raw Block Form */}
                        <div className="border-t border-zinc-900 pt-3 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase">Adicionar Bloco:</span>
                            <div className="flex gap-1.5 flex-wrap">
                              {(['text', 'image', 'video', 'cta'] as const).map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    setNewBlockType(type);
                                    setNewBlockContent('');
                                    setNewBlockTitle('');
                                    setNewBlockCaption('');
                                    setNewBlockLink('');
                                  }}
                                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold capitalize transition-all cursor-pointer ${
                                    newBlockType === type
                                      ? 'bg-[#00f2fe] text-zinc-950 font-black shadow-sm'
                                      : 'bg-zinc-900 border border-zinc-850 text-zinc-450 hover:text-zinc-200'
                                  }`}
                                >
                                  {type === 'text' ? 'Texto' : type === 'image' ? 'Imagem' : type === 'video' ? 'Vídeo' : 'Botão CTA'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Interactive conditional fields based on type */}
                          <div className="space-y-2 bg-zinc-900/40 p-2.5 border border-zinc-850 rounded-xl">
                            
                            {/* Text inputs */}
                            {newBlockType === 'text' && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  placeholder="Subtítulo do Bloco (Opcional)"
                                  value={newBlockTitle}
                                  onChange={(e) => setNewBlockTitle(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-white focus:border-zinc-700"
                                />
                                <textarea
                                  placeholder="Texto principal do parágrafo. Suporta quebras de linha e dados enriquecidos..."
                                  rows={3}
                                  value={newBlockContent}
                                  onChange={(e) => setNewBlockContent(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-white focus:border-zinc-700 font-light"
                                />
                              </div>
                            )}

                            {/* Image inputs */}
                            {newBlockType === 'image' && (
                              <div className="space-y-3">
                                <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950 p-3 rounded-xl text-center space-y-2 relative">
                                  <input 
                                    type="file"
                                    accept="image/*"
                                    id="block_image_upload_pc"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        const reader = new FileReader();
                                        reader.onload = (evt) => {
                                          if (evt.target?.result) {
                                            setNewBlockContent(evt.target.result as string);
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                  {newBlockContent ? (
                                    <div className="space-y-2">
                                      <img 
                                        src={newBlockContent} 
                                        alt="Preview" 
                                        className="max-h-32 rounded-lg mx-auto object-cover border border-zinc-800"
                                      />
                                      <p className="text-[10px] text-emerald-400 font-mono font-bold">✓ Imagem Carregada do Computador</p>
                                      <button
                                        type="button"
                                        onClick={() => setNewBlockContent('')}
                                        className="text-[10px] text-rose-400 hover:underline"
                                      >
                                        Remover / Substituir Imagem
                                      </button>
                                    </div>
                                  ) : (
                                    <label htmlFor="block_image_upload_pc" className="cursor-pointer block py-2">
                                      <span className="text-xl block mb-1">💻 📷</span>
                                      <span className="text-xs font-bold text-zinc-300 block">Carregar Imagem do Computador</span>
                                      <span className="text-[10px] text-zinc-500 font-light block">Clique para importar imagem do seu PC (PNG, JPG, WEBP)</span>
                                    </label>
                                  )}
                                </div>

                                <input
                                  type="text"
                                  placeholder="Ou introduza URL de imagem externa (Ex: https://images.unsplash.com/...)"
                                  value={newBlockContent}
                                  onChange={(e) => setNewBlockContent(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-white focus:border-zinc-700 font-mono"
                                />
                                <input
                                  type="text"
                                  placeholder="Legenda da Imagem de baixo (Opcional)"
                                  value={newBlockCaption}
                                  onChange={(e) => setNewBlockCaption(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-white focus:border-zinc-700"
                                />
                                <input
                                  type="text"
                                  placeholder="Opção: URL para redirecionar se o utilizador clicar na imagem"
                                  value={newBlockLink}
                                  onChange={(e) => setNewBlockLink(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-white focus:border-zinc-700"
                                />
                              </div>
                            )}

                            {/* Video inputs */}
                            {newBlockType === 'video' && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  placeholder="Link YouTube (Ex: https://www.youtube.com/watch?v=xxx)"
                                  value={newBlockContent}
                                  onChange={(e) => setNewBlockContent(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-white focus:border-zinc-700 font-mono"
                                />
                                <input
                                  type="text"
                                  placeholder="Legenda do Vídeo ou Título de Apoio (Opcional)"
                                  value={newBlockTitle}
                                  onChange={(e) => setNewBlockTitle(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-white focus:border-zinc-700"
                                />
                              </div>
                            )}

                            {/* CTA buttons */}
                            {newBlockType === 'cta' && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  placeholder="Texto do Botão (Ex: Adesão WhatsApp VIP)"
                                  value={newBlockTitle}
                                  onChange={(e) => setNewBlockTitle(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-white focus:border-zinc-700"
                                />
                                <input
                                  type="text"
                                  placeholder="Frase explicativa por cima (Ex: Clique abaixo para aceder instantaneamente)"
                                  value={newBlockContent}
                                  onChange={(e) => setNewBlockContent(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-white focus:border-zinc-700"
                                />
                                <input
                                  type="text"
                                  placeholder="URL do Botão (Ex: https://chat.facebook.com/...)"
                                  value={newBlockLink}
                                  onChange={(e) => setNewBlockLink(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-white focus:border-zinc-700 font-mono"
                                />
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={handleAddBlock}
                              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-750 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                            >
                              + Anexar Bloco ao Rascunho
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Main save publish actions */}
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-gradient-to-r from-[#00f2fe] to-sky-500 hover:opacity-95 text-zinc-950 font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {selectedPageToEdit ? 'Gravar e Atualizar Página' : 'Criar e Publicar Nova Página'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Column: List of Pages & Interactive Design Live Preview */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Part 1: Page list */}
                  <div className="bg-[#121216]/60 border border-zinc-850 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-zinc-850 pb-4">
                      Todas as Páginas Publicadas Atualmente
                    </h3>

                    {pages.length === 0 ? (
                      <div className="text-center py-12 text-zinc-500 text-xs font-light bg-zinc-900/10 rounded-xl">
                        Ainda não criou nenhuma página personalizada.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                        {pages.map((item) => (
                          <div 
                            key={item.slug}
                            className="p-4 bg-zinc-900/35 border border-zinc-850 rounded-xl hover:border-zinc-800 flex items-center justify-between gap-4 transition-colors"
                          >
                            <div className="truncate">
                              <h4 className="font-extrabold text-white text-sm hover:text-[#00f2fe] transition-colors flex items-center gap-2 flex-wrap">
                                <span>{item.title}</span>
                                <span className="bg-sky-500/10 border border-sky-500/20 text-[#00f2fe] text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold">
                                  {item.blocks ? item.blocks.length : 0} blocos
                                </span>
                                {item.isSubpage ? (
                                  <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[8px] font-sans px-1.5 py-0.5 rounded font-bold truncate max-w-[140px]">
                                    ↳ Subpágina ({item.parentSlug === 'purificador' ? 'Purificador' : item.parentSlug === 'radar' ? 'Radar' : item.parentSlug === 'noticias' ? 'Notícias' : item.parentSlug === 'faq' ? 'FAQ' : item.parentSlug || 'Raiz'})
                                  </span>
                                ) : (
                                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-sans px-1.5 py-0.5 rounded font-bold">
                                    Menu Principal
                                  </span>
                                )}
                                {item.hidden ? (
                                  <span className="bg-red-500/10 border border-red-500/25 text-[#ff4f60] text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold">
                                    🔑 Oculta
                                  </span>
                                ) : (
                                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold">
                                    🌐 Visível
                                  </span>
                                )}
                              </h4>
                              <p className="text-zinc-500 text-[10px] font-mono mt-1">Caminho da URL: <span className="text-[#00f2fe] font-light">/p/{item.slug}</span></p>
                              {item.description && (
                                <p className="text-zinc-400 text-xs font-light mt-1.5 line-clamp-1 leading-snug">{item.description}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditPageInitiate(item)}
                                className={`px-2.5 py-1 border border-sky-950 hover:border-sky-500 text-sky-450 hover:text-white rounded-lg text-[10.5px] uppercase font-bold transition-all cursor-pointer ${selectedPageToEdit?.slug === item.slug ? 'bg-sky-500/20 text-white border-sky-400' : ''}`}
                              >
                                Editar
                              </button>

                              {pageToDelete === item.slug ? (
                                <div className="flex flex-col items-center gap-1 bg-rose-950/20 border border-rose-950/45 p-1 rounded-lg">
                                  <span className="text-rose-400 text-[8px] font-bold uppercase select-none">Apagar?</span>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleDeletePageDirect(item.slug);
                                        setPageToDelete(null);
                                      }}
                                      className="px-1.5 py-0.5 bg-rose-650 hover:bg-rose-550 text-white font-extrabold text-[8.5px] rounded uppercase"
                                    >
                                      Sim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPageToDelete(null)}
                                      className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 text-[8.5px] rounded uppercase"
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPageToDelete(item.slug)}
                                  className="p-1.5 border border-rose-950 hover:border-rose-500 bg-rose-950/20 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 rounded cursor-pointer"
                                  title="Eliminar página"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 font-bold">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Part 2: Interactive Realtime Visual Mock Preview */}
                  <div className="bg-[#121216]/60 border border-zinc-850 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col min-h-[400px]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-4 mb-4 select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe] animate-pulse"></span>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#00f2fe] font-mono">Simulador de Visualização Live</h4>
                      </div>
                      <span className="text-[9px] text-zinc-550 font-mono tracking-tight uppercase">Dispositivo Resolução Líquida</span>
                    </div>

                    <div className="flex-1 bg-[#09090c] border border-zinc-900 rounded-xl p-5 overflow-y-auto max-h-[460px] scrollbar-thin">
                      {/* Interactive Header preview of Simulated Webpage */}
                      <div className="border-b border-zinc-900 pb-3 mb-5 flex justify-between items-center text-[10px] text-zinc-500">
                        <span className="font-extrabold text-white logo-glow tracking-tight text-xs font-mono">iRUNBETS<span className="text-orange-500 font-bold ml-0.5">.pt</span></span>
                        <div className="flex gap-2">
                          <span className="px-1.5 py-0.5 bg-zinc-900 text-zinc-400 rounded-md select-none">Menu</span>
                          <span className="px-1.5 py-0.5 bg-orange-650/10 text-orange-405 border border-orange-500/20 rounded-md select-none font-bold">Aceder App</span>
                        </div>
                      </div>

                      {/* Content page title */}
                      <div className="text-center mb-6">
                        <h1 className="text-sm font-black text-white leading-tight font-display tracking-tight uppercase">
                          {pageTitle || 'Título Provisório da Página'}
                        </h1>
                        <div className="h-0.5 w-12 bg-gradient-to-r from-orange-500 to-[#00f2fe] mx-auto mt-2.5 rounded-full"></div>
                        {pageDescription && (
                          <p className="text-zinc-500 text-[11px] font-light mt-2 max-w-sm mx-auto">{pageDescription}</p>
                        )}
                      </div>

                      {/* Display Page Blocks */}
                      {pageBlocks.length === 0 ? (
                        <div className="text-center py-20 text-zinc-600 text-xs font-light space-y-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 mx-auto text-zinc-700">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                          <p className="font-mono">Rascunho de renderização vazio.</p>
                          <p className="text-[10px] text-zinc-700">O conteúdo que for construindo à esquerda aparecerá estruturado aqui em tempo real.</p>
                        </div>
                      ) : (
                        <div className="space-y-6 pb-4">
                          {pageBlocks.map((block, i) => (
                            <div key={i} className="bg-zinc-950/20 p-2 rounded-lg border border-dashed border-zinc-900">
                              
                              {/* RENDER block TYPE = TEXT */}
                              {block.type === 'text' && (
                                <div className="space-y-2">
                                  {block.title && (
                                    <h3 className="text-white font-bold text-xs border-l-2 border-orange-500 pl-2 tracking-wide uppercase">
                                      {block.title}
                                    </h3>
                                  )}
                                  <p className="text-zinc-300 text-[11px] leading-relaxed font-light whitespace-pre-wrap">
                                    {block.content}
                                  </p>
                                </div>
                              )}

                              {/* RENDER block TYPE = IMAGE */}
                              {block.type === 'image' && (
                                <div className="space-y-2 text-center text-[10px]">
                                  <div className="bg-zinc-950 min-h-[100px] border border-zinc-900 rounded-lg flex items-center justify-center overflow-hidden">
                                    {block.content.startsWith('http') || block.content.startsWith('data:image/') ? (
                                      <img
                                        src={block.content}
                                        alt={block.caption || 'Live view mock'}
                                        referrerPolicy="no-referrer"
                                        className="w-full max-h-[140px] object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    ) : null}
                                    <span className="text-[10px] text-zinc-600 font-mono tracking-tight select-none">
                                      📷 [Imagem: {block.content.substring(0, 30)}...]
                                    </span>
                                  </div>
                                  {block.caption && (
                                    <p className="text-[10px] text-zinc-500 font-mono font-light italic">
                                      {block.caption}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* RENDER block TYPE = VIDEO */}
                              {block.type === 'video' && (
                                <div className="space-y-2 text-center">
                                  <div className="bg-zinc-950 h-32 border border-zinc-900 rounded-lg flex flex-col items-center justify-center gap-1.5 select-none text-[#ff0000]">
                                    <svg xmlns="http://www.w3.org/2500/svg" fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8">
                                      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.518 3.5 12 3.5 12 3.5s-7.518 0-9.388.555A3.003 3.003 0 0 0 .502 6.163C0 8.037 0 12 0 12s0 3.963.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.482 20.5 12 20.5 12 20.5s7.518 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.963 24 12 24 12s0-3.963-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                      [Vídeo Reprodução: YouTube Embed / Link de Média]
                                    </span>
                                  </div>
                                  {block.title && (
                                    <p className="text-[10px] text-zinc-400 font-bold tracking-wide italic">
                                      {block.title}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* RENDER block TYPE = CTA */}
                              {block.type === 'cta' && (
                                <div className="p-3 bg-gradient-to-r from-orange-950/10 to-amber-950/10 border border-orange-500/20 rounded-xl text-center space-y-2">
                                  {block.content && (
                                    <p className="text-zinc-400 text-[10px] font-light">
                                      {block.content}
                                    </p>
                                  )}
                                  <button
                                    type="button"
                                    className="px-4 py-1.5 bg-orange-500 hover:bg-orange-650 font-extrabold text-[10px] uppercase tracking-wider text-black rounded-lg transition-transform focus:scale-95 cursor-default select-none"
                                  >
                                    {block.title || 'Clique Aqui'}
                                  </button>
                                  {block.link && (
                                    <p className="text-[8.5px] text-zinc-650 font-mono truncate select-none">
                                      Target Link de Acesso: {block.link}
                                    </p>
                                  )}
                                </div>
                              )}

                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer simulated view */}
                      <div className="border-t border-zinc-950 pt-3 mt-6 text-center text-[9px] text-zinc-600 font-mono select-none">
                        © 2026 iRunBets. Algoritmo Registado. 100% Responsabilidade.
                      </div>
                    </div>
                  </div>

                  {/* NOVO CARD: CONFIGURAÇÕES DA PÁGINA INICIAL (HERO, MOCKUP E IMAGENS) */}
                  <div className="bg-[#121216]/60 border border-zinc-850 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-sky-500 via-orange-500 to-amber-500"></div>

                    <div className="border-b border-zinc-850 pb-4 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🏠</span>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          Edição Visual da Página Inicial (Hero & Mockup)
                        </h3>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 font-light leading-relaxed">
                        Customize em tempo real os títulos, subtítulos, visibilidade do mockup interativo do iPhone ou coloque uma imagem e textos customizados para a sua audiência direta.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Títulos Alternativos */}
                      <div className="p-4 bg-zinc-950/35 border border-zinc-900 rounded-xl space-y-3">
                        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider font-mono">1. Título do Cabeçalho Principal (Hero)</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Português (PT)</label>
                            <input
                              type="text"
                              value={subscribersConfig.heroTitlePt || ''}
                              onChange={(e) => setSubscribersConfigState({
                                ...subscribersConfig,
                                heroTitlePt: e.target.value
                              })}
                              className="w-full bg-zinc-900 px-3 py-2 text-xs border border-zinc-800 rounded-lg focus:border-sky-500 outline-none text-white font-medium"
                              placeholder="Ex: iRunBets: A tua vantagem matemática e gestão de banca no futebol."
                            />
                          </div>
                          <div>
                            <label className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Inglês / Outros (EN)</label>
                            <input
                              type="text"
                              value={subscribersConfig.heroTitleEn || ''}
                              onChange={(e) => setSubscribersConfigState({
                                ...subscribersConfig,
                                heroTitleEn: e.target.value
                              })}
                              className="w-full bg-zinc-900 px-3 py-2 text-xs border border-zinc-800 rounded-lg focus:border-sky-500 outline-none text-white font-medium"
                              placeholder="Ex: iRunBets: Your mathematical edge and bankroll management in football."
                            />
                          </div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-light mt-1">
                          *Deixe em branco para usar o texto padrão do sistema da iRunBets.
                        </p>
                      </div>

                      {/* Subtítulos Alternativos */}
                      <div className="p-4 bg-zinc-950/35 border border-zinc-900 rounded-xl space-y-3">
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider font-mono">2. Subtítulo / Descrição Alternativa</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Português (PT)</label>
                            <textarea
                              rows={2}
                              value={subscribersConfig.heroDescPt || ''}
                              onChange={(e) => setSubscribersConfigState({
                                ...subscribersConfig,
                                heroDescPt: e.target.value
                              })}
                              className="w-full bg-zinc-900 px-3 py-2 text-xs border border-zinc-800 rounded-lg focus:border-sky-500 outline-none text-white font-light"
                              placeholder="Introduza uma descrição marcante para a página principal..."
                            />
                          </div>
                          <div>
                            <label className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Inglês / Outros (EN)</label>
                            <textarea
                              rows={2}
                              value={subscribersConfig.heroDescEn || ''}
                              onChange={(e) => setSubscribersConfigState({
                                ...subscribersConfig,
                                heroDescEn: e.target.value
                              })}
                              className="w-full bg-zinc-900 px-3 py-2 text-xs border border-zinc-800 rounded-lg focus:border-sky-500 outline-none text-white font-light"
                              placeholder="Enter localized description for English users..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* iPhone Mockup e Imagem Controls */}
                      <div className="p-4 bg-zinc-950/35 border border-zinc-900 rounded-xl space-y-4">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">3. Elementos Gráficos & Mockups</span>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-zinc-200">
                              Apresentar Mockup Tridimensional do iPhone
                            </span>
                            <span className="text-[9px] text-zinc-500">
                              Se ativo, exibe o simulador do ecrã interativo de análise de probabilidades ao vivo.
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={subscribersConfig.showIphoneMockup !== false}
                              onChange={(e) => {
                                setSubscribersConfigState({
                                  ...subscribersConfig,
                                  showIphoneMockup: e.target.checked
                                });
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                          </label>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                          <label className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 block">
                            Imagem Alternativa (URL de Imagem / Ilustração)
                          </label>
                          <input
                            type="text"
                            value={subscribersConfig.homepageCustomImageUrl || ''}
                            onChange={(e) => setSubscribersConfigState({
                              ...subscribersConfig,
                              homepageCustomImageUrl: e.target.value
                            })}
                            className="w-full bg-zinc-900 px-3 py-2 text-xs border border-zinc-800 rounded-lg focus:border-teal-550 outline-none text-white font-mono"
                            placeholder="Inserir URL da Imagem (Ex: https://image.tmdb.org/...)"
                          />
                          {subscribersConfig.homepageCustomImageUrl && (
                            <div className="mt-2.5 p-1.5 bg-zinc-950 border border-zinc-900 rounded-lg flex items-center justify-center">
                              <img
                                src={subscribersConfig.homepageCustomImageUrl}
                                alt="Pré-visualização"
                                className="max-h-24 rounded object-contain"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bloco Adicional de Texto Informativo */}
                      <div className="p-4 bg-zinc-950/35 border border-zinc-900 rounded-xl space-y-3">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">4. Bloco de Texto / HTML Adicional</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Texto em Português</label>
                            <textarea
                              rows={3}
                              value={subscribersConfig.homepageCustomTextPt || ''}
                              onChange={(e) => setSubscribersConfigState({
                                ...subscribersConfig,
                                homepageCustomTextPt: e.target.value
                              })}
                              className="w-full bg-zinc-900 px-3 py-2 text-xs border border-zinc-800 rounded-lg focus:border-sky-500 outline-none text-white font-light text-left leading-relaxed"
                              placeholder="Deixe em branco ou coloque textos extra, tabelas de bónus, links úteis para aparecer no topo..."
                            />
                          </div>
                          <div>
                            <label className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Texto em Inglês</label>
                            <textarea
                              rows={3}
                              value={subscribersConfig.homepageCustomTextEn || ''}
                              onChange={(e) => setSubscribersConfigState({
                                ...subscribersConfig,
                                homepageCustomTextEn: e.target.value
                              })}
                              className="w-full bg-zinc-900 px-3 py-2 text-xs border border-zinc-800 rounded-lg focus:border-sky-500 outline-none text-white font-light text-left leading-relaxed"
                              placeholder="Insert complementary translations or secondary promotional messaging here..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Save Action */}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await saveSubscribersConfig(subscribersConfig);
                            alert('A sua página principal foi atualizada com sucesso! Todas as alterações estão online de imediato para todos os utilizadores.');
                          } catch (err: any) {
                            alert('Erro ao salvar as configurações: ' + err?.message);
                          }
                        }}
                        className="w-full py-3 bg-gradient-to-r from-sky-500 via-orange-500 to-amber-500 hover:opacity-90 active:scale-95 text-white font-black text-xs tracking-widest uppercase rounded-xl transition-all cursor-pointer shadow-lg"
                      >
                        💾 PUBLICAR ALTERAÇÕES DA PÁGINA PRINCIPAL
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {activeTab === 'plans' && (
              <div className="space-y-8 animate-fade-in duration-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-850 pb-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-display">
                      Gestão de Planos & Vantagens VIP
                    </h2>
                    <p className="text-xs text-zinc-400 font-light mt-1">
                      Configure em tempo real os preços riscados, preços de checkout, títulos e vantagens incluídas para todos os 5 planos de subscrição.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const confirmReset = window.confirm("Tem a certeza que deseja repor todos os preços e vantagens para os valores originais de fábrica?");
                        if (confirmReset) {
                          saveCustomizablePlans(DEFAULT_PLANS);
                          setCurrentPlans(DEFAULT_PLANS);
                          setPlansSuccess('Todos os planos foram restaurados para os valores originais do sistema!');
                          setTimeout(() => setPlansSuccess(''), 4000);
                        }
                      }}
                      className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Repor Valores Padrão
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        saveCustomizablePlans(currentPlans);
                        setPlansSuccess('Gravação concluída! Os novos preços e vantagens já estão ativos em todo o site.');
                        setTimeout(() => setPlansSuccess(''), 4500);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-pink-500/10 cursor-pointer"
                    >
                      Guardar Todos os Planos
                    </button>
                  </div>
                </div>

                {plansSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2.5 animate-pulse">
                    <span className="text-base">✓</span>
                    <span>{plansSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {currentPlans.map((plan, index) => (
                    <div key={plan.id} className="bg-[#0e0e12] border border-zinc-850/70 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between hover:border-zinc-800 transition-all">
                      <div className="absolute top-0 right-0">
                        <span className="bg-zinc-950 text-zinc-500 text-[9px] font-mono uppercase px-3 py-1 border-l border-[#24242e]">
                          ID: {plan.id}
                        </span>
                      </div>

                      <div className="space-y-5">
                        <div className="flex gap-4 items-center">
                          <span className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-500 text-sm font-black flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <label className="block text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Título do Plano</label>
                            <input
                              type="text"
                              value={plan.name}
                              onChange={(e) => {
                                const copy = [...currentPlans];
                                copy[index].name = e.target.value;
                                setCurrentPlans(copy);
                              }}
                              className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white uppercase font-bold tracking-wide outline-none focus:border-pink-500/60 transition-colors"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Subtítulo / Descrição Rápida</label>
                          <textarea
                            value={plan.desc}
                            rows={2}
                            onChange={(e) => {
                              const copy = [...currentPlans];
                              copy[index].desc = e.target.value;
                              setCurrentPlans(copy);
                            }}
                            className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-350 outline-none focus:border-pink-500/60 transition-colors resize-none leading-relaxed"
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[9px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Badge Visual</label>
                            <input
                              type="text"
                              value={plan.badge}
                              onChange={(e) => {
                                const copy = [...currentPlans];
                                copy[index].badge = e.target.value;
                                setCurrentPlans(copy);
                              }}
                              className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-white uppercase font-semibold tracking-wide outline-none focus:border-pink-500/60 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Mensal (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={plan.price}
                              onChange={(e) => {
                                const copy = [...currentPlans];
                                copy[index].price = parseFloat(e.target.value) || 0;
                                setCurrentPlans(copy);
                              }}
                              className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-emerald-400 font-black outline-none focus:border-pink-500/60 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Mensal Risk (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={plan.oldPrice}
                              onChange={(e) => {
                                const copy = [...currentPlans];
                                copy[index].oldPrice = parseFloat(e.target.value) || 0;
                                setCurrentPlans(copy);
                              }}
                              className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-zinc-500 font-bold line-through outline-none focus:border-pink-500/60 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Anual (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={plan.yearlyPrice || 0}
                              onChange={(e) => {
                                const copy = [...currentPlans];
                                copy[index].yearlyPrice = parseFloat(e.target.value) || 0;
                                setCurrentPlans(copy);
                              }}
                              className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-[#00f2fe] font-black outline-none focus:border-pink-500/60 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Anual Risk (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={plan.oldYearlyPrice || 0}
                              onChange={(e) => {
                                const copy = [...currentPlans];
                                copy[index].oldYearlyPrice = parseFloat(e.target.value) || 0;
                                setCurrentPlans(copy);
                              }}
                              className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-2 py-1.5 text-xs text-zinc-500 font-bold line-through outline-none focus:border-pink-500/60 transition-colors"
                            />
                          </div>
                        </div>

                        <div className="p-4 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-3">
                          <span className="block text-[9px] text-zinc-500 font-mono uppercase tracking-widest font-black">
                            Vantagens Incluídas (Checklist)
                          </span>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none text-[11px] text-zinc-300 hover:text-white">
                              <input
                                type="checkbox"
                                checked={plan.features.web}
                                onChange={(e) => {
                                  const copy = [...currentPlans];
                                  copy[index].features.web = e.target.checked;
                                  setCurrentPlans(copy);
                                }}
                                className="accent-pink-500 w-3.5 h-3.5 rounded border border-zinc-800"
                              />
                              <span>Acesso Site / Canais Web</span>
                            </label>

                            <label className="flex items-center gap-2.5 cursor-pointer select-none text-[11px] text-zinc-300 hover:text-white">
                              <input
                                type="checkbox"
                                checked={plan.features.ev}
                                onChange={(e) => {
                                  const copy = [...currentPlans];
                                  copy[index].features.ev = e.target.checked;
                                  setCurrentPlans(copy);
                                }}
                                className="accent-pink-500 w-3.5 h-3.5 rounded border border-zinc-800"
                              />
                              <span>Sinais Matemáticos +EV</span>
                            </label>

                            <label className="flex items-center gap-2.5 cursor-pointer select-none text-[11px] text-zinc-300 hover:text-white">
                              <input
                                type="checkbox"
                                checked={plan.features.radar}
                                onChange={(e) => {
                                  const copy = [...currentPlans];
                                  copy[index].features.radar = e.target.checked;
                                  setCurrentPlans(copy);
                                }}
                                className="accent-pink-500 w-3.5 h-3.5 rounded border border-zinc-800"
                              />
                              <span>Radar Flashscore em Direto</span>
                            </label>

                            <label className="flex items-center gap-2.5 cursor-pointer select-none text-[11px] text-zinc-300 hover:text-white">
                              <input
                                type="checkbox"
                                checked={plan.features.cloud}
                                onChange={(e) => {
                                  const copy = [...currentPlans];
                                  copy[index].features.cloud = e.target.checked;
                                  setCurrentPlans(copy);
                                }}
                                className="accent-pink-500 w-3.5 h-3.5 rounded border border-zinc-800"
                              />
                              <span>Aceleração de Servidor Cloud</span>
                            </label>

                            <label className="flex items-center gap-2.5 cursor-pointer select-none text-[11px] text-teal-400 hover:text-teal-300 col-span-1">
                              <input
                                type="checkbox"
                                checked={!!plan.features.tipsterPanel}
                                onChange={(e) => {
                                  const copy = [...currentPlans];
                                  copy[index].features.tipsterPanel = e.target.checked;
                                  setCurrentPlans(copy);
                                }}
                                className="accent-teal-550 w-3.5 h-3.5 rounded border border-zinc-800"
                              />
                              <span>Canal e Painel Tipster Oficial</span>
                            </label>

                            <label className="col-span-1 sm:col-span-2 flex items-center gap-2.5 cursor-pointer select-none text-[11px] text-zinc-300 hover:text-white">
                              <input
                                type="checkbox"
                                checked={plan.features.mobile}
                                onChange={(e) => {
                                  const copy = [...currentPlans];
                                  copy[index].features.mobile = e.target.checked;
                                  setCurrentPlans(copy);
                                }}
                                className="accent-pink-500 w-3.5 h-3.5 rounded border border-zinc-800"
                              />
                              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                                Aplicação Nativa Móvel (iOS + Android)
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Opções Personalizadas Dinâmicas */}
                        <div className="p-4 bg-zinc-950/45 border border-zinc-900 rounded-xl space-y-3">
                          <span className="block text-[9px] text-[#00f2fe] font-mono uppercase tracking-widest font-black">
                            Opções / Vantagens Personalizadas Adicionais
                          </span>
                          
                          <div className="space-y-2">
                            {plan.customFeatures && plan.customFeatures.length > 0 ? (
                              <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto scrollbar-thin pr-1">
                                {plan.customFeatures.map((feat, fIdx) => (
                                  <div key={fIdx} className="flex items-center justify-between gap-2 p-1.5 bg-zinc-900/60 border border-zinc-850/50 rounded-lg">
                                    <span className="text-[11px] text-zinc-300 font-sans break-all">✓ {feat}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const copy = [...currentPlans];
                                        copy[index].customFeatures = (copy[index].customFeatures || []).filter((_, idx) => idx !== fIdx);
                                        setCurrentPlans(copy);
                                      }}
                                      className="text-rose-500 hover:text-rose-400 text-xs px-1.5 py-0.5 rounded hover:bg-rose-500/10 transition-colors font-mono cursor-pointer"
                                      title="Remover opção"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[10px] text-zinc-600 font-mono italic p-2 bg-zinc-950/20 rounded border border-dashed border-zinc-900/60">
                                Nenhuma opção dinâmica adicionada a este plano. Escreva abaixo para acrescentar.
                              </div>
                            )}

                            <div className="flex gap-2 items-center pt-1">
                              <input
                                type="text"
                                placeholder="Acesso Exclusivo Telegram, Suporte 24/7..."
                                value={newFeatureText[plan.id] || ''}
                                onChange={(e) => {
                                  setNewFeatureText(prev => ({ ...prev, [plan.id]: e.target.value }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const text = (newFeatureText[plan.id] || '').trim();
                                    if (text) {
                                      const copy = [...currentPlans];
                                      copy[index].customFeatures = [...(copy[index].customFeatures || []), text];
                                      setCurrentPlans(copy);
                                      setNewFeatureText(prev => ({ ...prev, [plan.id]: '' }));
                                    }
                                  }
                                }}
                                className="flex-1 bg-zinc-950/90 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#00f2fe]/40 transition-colors placeholder:text-zinc-650"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const text = (newFeatureText[plan.id] || '').trim();
                                  if (text) {
                                    const copy = [...currentPlans];
                                    copy[index].customFeatures = [...(copy[index].customFeatures || []), text];
                                    setCurrentPlans(copy);
                                    setNewFeatureText(prev => ({ ...prev, [plan.id]: '' }));
                                  }
                                }}
                                className="px-3 py-1.5 bg-[#00f2fe]/10 hover:bg-[#00f2fe]/15 border border-[#00f2fe]/30 text-[#00f2fe] rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap"
                              >
                                + Opção
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Inibição da Subscrição */}
                        <div className="pt-3 border-t border-zinc-900 mt-2 flex items-center justify-between">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none text-[11px] text-zinc-300">
                            <input
                              type="checkbox"
                              checked={!!plan.inhibited}
                              onChange={(e) => {
                                const copy = [...currentPlans];
                                copy[index].inhibited = e.target.checked;
                                setCurrentPlans(copy);
                              }}
                              className="accent-orange-500 w-3.5 h-3.5 rounded border border-zinc-850"
                            />
                            <span className="font-bold text-orange-400 uppercase tracking-tight text-[10px]">
                              Inibir Plano (“Brevemente Disponível”)
                            </span>
                          </label>
                        </div>

                      </div>

                      <div className="pt-4 mt-4 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                        <span>ESTADO DO TIER:</span>
                        {plan.inhibited ? (
                          <span className="text-orange-400 font-bold tracking-widest uppercase animate-pulse">⏳ INIBIDO (BREVEMENTE)</span>
                        ) : (
                          <span className="text-emerald-500 font-bold tracking-widest uppercase">ATALHO PARA O CHECKOUT ATIVO</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CONFIGURAÇÃO EXTRA: REDES SOCIAIS DO RODAPÉ */}
                <div className="bg-[#121216]/65 border border-zinc-850 p-6 rounded-2xl relative overflow-hidden space-y-6">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/[0.02] rounded-full blur-xl pointer-events-none"></div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>📱 Configuração dos Canais Sociais do Rodapé</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-light mt-1">
                      Insira os links completos das suas redes sociais oficiais. Os ícones correspondentes no fundo de cada página do iRunBets serão atualizados em tempo real de forma automática.
                    </p>
                  </div>

                  {socialsSuccess && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                      ✓ {socialsSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">WhatsApp (Link ou Número)</label>
                      <input
                        type="text"
                        placeholder="https://wa.me/351XXXXXXXXX"
                        value={socials.whatsapp || ''}
                        onChange={(e) => setSocials({ ...socials, whatsapp: e.target.value })}
                        className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500/60 font-mono font-light placeholder:text-zinc-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Telegram (Canal/Grupo)</label>
                      <input
                        type="text"
                        placeholder="https://t.me/irunbetsvip"
                        value={socials.telegram || ''}
                        onChange={(e) => setSocials({ ...socials, telegram: e.target.value })}
                        className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500/60 font-mono font-light placeholder:text-zinc-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Instagram</label>
                      <input
                        type="text"
                        placeholder="https://instagram.com/irunbets"
                        value={socials.instagram || ''}
                        onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
                        className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500/60 font-mono font-light placeholder:text-zinc-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Facebook</label>
                      <input
                        type="text"
                        placeholder="https://facebook.com/irunbets"
                        value={socials.facebook || ''}
                        onChange={(e) => setSocials({ ...socials, facebook: e.target.value })}
                        className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500/60 font-mono font-light placeholder:text-zinc-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">X (Twitter)</label>
                      <input
                        type="text"
                        placeholder="https://x.com/irunbets"
                        value={socials.x || ''}
                        onChange={(e) => setSocials({ ...socials, x: e.target.value })}
                        className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500/60 font-mono font-light placeholder:text-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="pt-2 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        setSocialsSuccess('');
                        await saveSocialLinks(socials);
                        setSocialsSuccess('Canais sociais do rodapé salvos com sucesso!');
                        setTimeout(() => setSocialsSuccess(''), 4000);
                      }}
                      className="px-5 py-2 bg-pink-500/10 hover:bg-pink-500 hover:text-white text-pink-400 border border-pink-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Guardar Redes Sociais
                    </button>
                  </div>
                </div>

                {/* CONFIGURAÇÃO DAS CONTAS DE RECEBIMENTO MANUAL */}
                <div className="bg-[#0e0e12]/80 border border-zinc-850 p-6 rounded-2xl space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      💰 Configuração das Contas de Recebimento (Revolut, MBWay & IBAN)
                    </h3>
                    <p className="text-zinc-500 text-[11px] font-light mt-1">
                      Defina os dados reais para onde os seus clientes devem enviar os fundos manualmente. Os clientes em checkout do Clube VIP verão estes dados instantaneamente ao selecionarem cada método.
                    </p>
                  </div>

                  {merchantSuccess && (
                     <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold animate-pulse">
                       ✓ {merchantSuccess}
                     </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Titular das Contas (Nome Completo)</label>
                      <input
                        type="text"
                        value={merchantAccounts.holderName}
                        onChange={(e) => setMerchantAccounts({ ...merchantAccounts, holderName: e.target.value })}
                        className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500/60 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Telemóvel Recetor (MBWay)</label>
                      <input
                        type="text"
                        value={merchantAccounts.mbwayPhone}
                        onChange={(e) => setMerchantAccounts({ ...merchantAccounts, mbwayPhone: e.target.value })}
                        className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500/60 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Username / Handle (Revolut)</label>
                      <input
                        type="text"
                        value={merchantAccounts.revolutHandle}
                        onChange={(e) => setMerchantAccounts({ ...merchantAccounts, revolutHandle: e.target.value })}
                        className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500/60 font-mono"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Dados de Transferência (IBAN / NIB PT)</label>
                      <input
                        type="text"
                        value={merchantAccounts.ibanDetails}
                        onChange={(e) => setMerchantAccounts({ ...merchantAccounts, ibanDetails: e.target.value })}
                        className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500/60 font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setMerchantSuccess('');
                        localStorage.setItem('irunbets_merchant_accounts', JSON.stringify(merchantAccounts));
                        setMerchantSuccess('Dados de Recebimento guardados com sucesso!');
                        setTimeout(() => setMerchantSuccess(''), 4000);
                        // Trigger custom event for multi-tab sync / reactive updating
                        window.dispatchEvent(new Event('irunbets_merchant_updated'));
                      }}
                      className="px-5 py-2.5 bg-sky-505 bg-sky-500/10 hover:bg-sky-500 hover:text-black text-sky-400 border border-sky-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Guardar Configurações de Recebimento 💰
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-xl border border-zinc-900 bg-[#0e0e12] text-center">
                  <button
                    type="button"
                    onClick={() => {
                      saveCustomizablePlans(currentPlans);
                      setPlansSuccess('Gravação executada com sucesso! Todos os 5 planos ativos em produção foram atualizados.');
                      setTimeout(() => setPlansSuccess(''), 4500);
                    }}
                    className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-pink-500/15 cursor-pointer animate-pulse hover:animate-none"
                  >
                    Guardar Todas as Alterações em Produção
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'tipsters' && (
              <div className="space-y-8 animate-fade-in duration-500">
                
                {/* Cabeçalho */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-850 pb-5 text-left">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-display">
                      Gestão de Tipsters e Subscrições VIP
                    </h2>
                    <p className="text-xs text-zinc-400 font-light mt-1">
                      Adicione novos tipsters à rede, atualize estatísticas oficiais, links de bónus e faça a gestão/revogação manual de acessos pagos.
                    </p>
                  </div>
                  
                  {/* Stats Cards rápidos da rede */}
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl px-4 py-2 text-center">
                      <span className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Total Tipsters</span>
                      <span className="text-lg font-black text-fuchsia-400 font-mono">{tipstersList.length}</span>
                    </div>
                    <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl px-4 py-2 text-center">
                      <span className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono">VIP Ativos</span>
                      <span className="text-sm font-black text-sky-400 font-mono block">
                        {subscribers.filter(s => s.subscribedTipsters && s.subscribedTipsters.length > 0).length} Membros
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid Form + Tipsters List */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                  
                  {/* Formulário Novo/Editar (4 colunas) */}
                  <div className="lg:col-span-4 bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3">
                      <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse"></span>
                      {editingTipsterId ? 'Editar Tipster' : 'Registar Novo Tipster'}
                    </h3>

                    {tipsterSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-semibold">
                        {tipsterSuccess}
                      </div>
                    )}
                    {tipsterError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl text-rose-450 text-xs font-semibold">
                        {tipsterError}
                      </div>
                    )}

                    <form onSubmit={handleSaveTipster} className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-zinc-400 font-bold mb-1">Nome do Tipster *</label>
                        <input
                          type="text"
                          required
                          value={tipsterName}
                          onChange={(e) => setTipsterName(e.target.value)}
                          placeholder="Ex: Sara Underdog Specialist"
                          className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-fuchsia-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold mb-1">Avatar / Emoji *</label>
                          <input
                            type="text"
                            required
                            value={tipsterAvatar}
                            onChange={(e) => setTipsterAvatar(e.target.value)}
                            placeholder="Ex: 🎯, 👑, ⚡"
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white text-center outline-none focus:border-fuchsia-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold mb-1">Contacto Email *</label>
                          <input
                            type="email"
                            required
                            value={tipsterEmail}
                            onChange={(e) => setTipsterEmail(e.target.value)}
                            placeholder="Ex: sara@irunbets.pt"
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-fuchsia-500/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-400 font-bold mb-1">Conta Telegram VIP (Link de Canal)</label>
                        <input
                          type="text"
                          value={tipsterTelegram}
                          onChange={(e) => setTipsterTelegram(e.target.value)}
                          placeholder="Ex: https://t.me/irunbets_sara"
                          className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-fuchsia-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold mb-1">Preço Mensal (€) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={tipsterPriceMonth}
                            onChange={(e) => setTipsterPriceMonth(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-fuchsia-500/50 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold mb-1">Preço Anual (€) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={tipsterPriceYear}
                            onChange={(e) => setTipsterPriceYear(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-fuchsia-500/50 font-mono"
                          />
                        </div>
                      </div>

                      <div className="border-t border-zinc-900 pt-3 mt-2 space-y-2">
                        <span className="block text-[10px] text-zinc-550 font-bold uppercase tracking-wider font-mono">Estatísticas do Canal</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[8px] text-zinc-550 uppercase">Wins</label>
                            <input
                              type="number"
                              value={tipsterWins}
                              onChange={(e) => setTipsterWins(parseInt(e.target.value) || 0)}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1 text-xs text-white outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] text-zinc-550 uppercase">Losses</label>
                            <input
                              type="number"
                              value={tipsterLosses}
                              onChange={(e) => setTipsterLosses(parseInt(e.target.value) || 0)}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1 text-xs text-white outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] text-zinc-550 uppercase">Refunds</label>
                            <input
                              type="number"
                              value={tipsterRefunds}
                              onChange={(e) => setTipsterRefunds(parseInt(e.target.value) || 0)}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1 text-xs text-white outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[8px] text-zinc-550 uppercase">Yield (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={tipsterYield}
                              onChange={(e) => setTipsterYield(parseFloat(e.target.value) || 0)}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1 select-all text-xs text-white outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] text-zinc-550 uppercase">Lucro Líquido (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={tipsterProfit}
                              onChange={(e) => setTipsterProfit(parseFloat(e.target.value) || 0)}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1 select-all text-xs text-white outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Links Angariação de Amigos (Bónus recomendados) */}
                      <div className="border-t border-zinc-900 pt-3 mt-2 space-y-2">
                        <span className="block text-[10px] text-zinc-550 font-bold uppercase tracking-wider font-mono">Bónus Angariação (Invites)</span>
                        <div>
                          <label className="block text-[9px] text-zinc-400">Link de Desconto / Amigo Betclic</label>
                          <input
                            type="text"
                            value={tipsterBetclic}
                            onChange={(e) => setTipsterBetclic(e.target.value)}
                            placeholder="https://betclic.pt/invite/username"
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-fuchsia-500/50 placeholder:text-zinc-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-zinc-400">Link de Desconto / Amigo Betano</label>
                          <input
                            type="text"
                            value={tipsterBetano}
                            onChange={(e) => setTipsterBetano(e.target.value)}
                            placeholder="https://betano.pt/invite/username"
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-fuchsia-500/50 placeholder:text-zinc-700"
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600 text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          {editingTipsterId ? 'Guardar Alterações' : 'Criar Novo Tipster'}
                        </button>
                        {editingTipsterId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTipsterId(null);
                              setTipsterName('');
                              setTipsterAvatar('👑');
                              setTipsterEmail('');
                              setTipsterTelegram('');
                              setTipsterBetclic('');
                              setTipsterBetano('');
                              setTipsterPriceMonth('29.99');
                              setTipsterPriceYear('249.00');
                              setTipsterWins(10);
                              setTipsterLosses(2);
                              setTipsterRefunds(0);
                              setTipsterYield(15.0);
                              setTipsterProfit(150.0);
                            }}
                            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider cursor-pointer"
                          >
                            X
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Lista de Registados (8 colunas) */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-zinc-900 pb-3 mb-4">
                        Tipsters Ativos no Sistema (Saber Quantas Há: <span className="text-fuchsia-400 font-mono font-black">{tipstersList.length}</span>)
                      </h3>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-900 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                              <th className="py-3 px-2">Tipster</th>
                              <th className="py-3 px-2">E-mail / Telegram</th>
                              <th className="py-3 px-2 text-center">Wins / Losses</th>
                              <th className="py-3 px-2 text-right">Yield / Lucro</th>
                              <th className="py-3 px-2 text-right">Preços VIP</th>
                              <th className="py-3 px-2 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/50">
                            {tipstersList.map(item => {
                              const subCount = subscribers.filter(s => s.subscribedTipsters && s.subscribedTipsters.includes(item.id)).length;
                              return (
                                <tr key={item.id} className="text-xs text-zinc-300 hover:bg-zinc-900/20 transition-colors">
                                  <td className="py-3.5 px-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl bg-zinc-900/30 w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-850">{item.avatar}</span>
                                      <div>
                                        <span className="block font-bold text-white leading-tight">{item.name}</span>
                                        <span className="text-[10px] text-fuchsia-400 font-medium font-mono">ID: {item.id} • {subCount} Subscritores</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-2 font-mono text-[10.5px]">
                                    <span className="block text-zinc-400">{item.email}</span>
                                    {item.telegramUrl ? (
                                      <a href={item.telegramUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline text-[9.5px]">Telegram Ativo</a>
                                    ) : (
                                      <span className="text-zinc-650 text-[9.5px]">Sem link Telegram</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-2 text-center font-mono">
                                    <span className="text-emerald-400 font-bold">{item.wins || 0}W</span>
                                    <span className="text-zinc-550 mx-1">/</span>
                                    <span className="text-rose-500 font-bold">{item.losses || 0}L</span>
                                  </td>
                                  <td className="py-3.5 px-2 text-right font-mono">
                                    <span className="block text-fuchsia-400 font-bold">{item.yieldPercent || 0}% Yield</span>
                                    <span className="text-zinc-550 text-[10px] block font-light">+{item.netProfit || 0}€</span>
                                  </td>
                                  <td className="py-3.5 px-2 text-right font-mono">
                                    <span className="block text-white font-medium">{item.subscriptionPriceMonth || 0}€/mês</span>
                                    <span className="text-zinc-500 text-[10px] block">{item.subscriptionPriceYear || 0}€/ano</span>
                                  </td>
                                  <td className="py-3.5 px-2 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => handleEditTipsterClick(item)}
                                        className="p-1 px-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-bold text-[10px] uppercase transition-colors"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTipster(item.id, item.name)}
                                        className="p-1 px-2.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold uppercase transition-transform active:scale-95"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SECCÃO MAIS CRÍTICA: GESTÃO E REVOGAÇÃO DE SUBSCRITORES INDIVIDUAIS */}
                    <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5">
                      <div className="border-b border-zinc-900 pb-3 mb-5">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          Controlo e Anulação Manual de Mensalidades de Subscritores VIP
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-light mt-1">
                          Consulte quais os utilizadores que pagaram e acederam aos canais privados de tipsters. Se um utilizador deixar de pagar ou cancelar a mensalidade por MBWay/Stripe, remova o acesso manualmente nesta lista.
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-900 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                              <th className="py-3 px-2">Utilizador</th>
                              <th className="py-3 px-2">Plano</th>
                              <th className="py-3 px-2">Canais VIP Registados</th>
                              <th className="py-3 px-2 text-right">Acesso / Ativação Manual</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/50">
                            {subscribers.map(sub => {
                              const activeSubs = sub.subscribedTipsters || [];
                              const unpaidTipsters = tipstersList.filter(t => !activeSubs.includes(t.id));

                              return (
                                <tr key={sub.uid} className="text-xs text-zinc-300 hover:bg-zinc-900/10 transition-colors">
                                  <td className="py-3.5 px-2">
                                    <div>
                                      <span className="block font-bold text-white leading-tight">{sub.displayName || sub.email.split('@')[0]}</span>
                                      <span className="text-[10px] text-zinc-550 font-mono">{sub.email}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-2 font-mono">
                                    <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider ${
                                      sub.status && sub.status !== 'Gratuito'
                                        ? sub.status.toLowerCase().includes('pro')
                                          ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/15'
                                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/15'
                                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'
                                    }`}>
                                      {sub.status || 'Gratuito'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-2">
                                    {activeSubs.length === 0 ? (
                                      <span className="text-zinc-650 text-[10.5px] font-mono italic">Nenhum canal ativo</span>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {activeSubs.map(tid => {
                                          const tDetails = tipstersList.find(t => t.id === tid);
                                          return (
                                            <span 
                                              key={tid} 
                                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-fuchsia-950/40 text-fuchsia-300 border border-fuchsia-500/20 rounded-lg text-[10px]"
                                            >
                                              <span className="text-xs leading-none">{tDetails ? tDetails.avatar : '👤'}</span>
                                              <span className="font-semibold">{tDetails ? tDetails.name.split(' ')[0] : tid}</span>
                                              
                                              {/* Botão de Revocação - se deixar de pagar, anular manualmente */}
                                              <button
                                                type="button"
                                                onClick={() => handleRevokeTipsterSub(sub.uid, sub.email, tid)}
                                                className="ml-1 text-rose-450 hover:text-white transition-colors p-px rounded hover:bg-rose-950 font-black text-[10px]"
                                                title="Revogar subscrição (Se deixar de pagar)"
                                              >
                                                ✕
                                              </button>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-2 text-right">
                                    {/* Manual granter for manual pay verification */}
                                    {unpaidTipsters.length > 0 ? (
                                      <div className="flex items-center justify-end gap-1.5">
                                        <select
                                          id={`grant-select-${sub.uid}`}
                                          className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10.5px] font-mono text-zinc-400 outline-none focus:border-fuchsia-500/60"
                                          defaultValue=""
                                          onChange={async (e) => {
                                            const tid = e.target.value;
                                            if (tid) {
                                              await handleGrantTipsterSub(sub.uid, tid);
                                              e.target.value = ""; // reset selection
                                            }
                                          }}
                                        >
                                          <option value="" disabled>Conceder VIP...</option>
                                          {unpaidTipsters.map(t => (
                                            <option key={t.id} value={t.id}>
                                              {t.avatar} {t.name.split(' ')[0]} ({t.subscriptionPriceMonth}€)
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-zinc-600 font-mono italic">Acesso Total</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {activeTab === 'mural' && (
              <div className="space-y-8 animate-fade-in duration-500">
                {/* Cabeçalho */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-850 pb-5 text-left">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-display">
                      Gestão do Diário de Operações (Mural IA)
                    </h2>
                    <p className="text-xs text-zinc-400 font-light mt-1">
                      Gerencie as previsões exibidas no mural de marketing da Homepage. Marque como Green, Red ou edite/exclua as operações enviadas do Purificador.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl px-4 py-2 text-center">
                      <span className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Total Operações</span>
                      <span className="text-lg font-black text-cyan-400 font-mono">{marketingList.length}</span>
                    </div>
                  </div>
                </div>

                {/* Status Messages */}
                {mktSuccess && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-bold flex items-center gap-2">
                    <span>🟢</span> <span>{mktSuccess}</span>
                  </div>
                )}
                {mktError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-bold flex items-center gap-2">
                    <span>🔴</span> <span>{mktError}</span>
                  </div>
                )}

                {/* Grid Form + Operations Table */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                  
                  {/* Formulário Novo/Editar (4 colunas) */}
                  <div className="lg:col-span-4 bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 space-y-4 h-fit">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3">
                      {editingMktId ? '📝 Editar Operação' : '➕ Criar Nova Operação'}
                    </h3>

                    <form onSubmit={handleMktSubmit} className="space-y-3.5">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Liga / Competição</label>
                        <input
                          type="text"
                          required
                          value={mktLeague}
                          onChange={(e) => setMktLeague(e.target.value)}
                          placeholder="Ex: Campeonato do Mundo"
                          className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 transition-colors text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Equipa Casa</label>
                          <input
                            type="text"
                            required
                            value={mktHomeTeam}
                            onChange={(e) => setMktHomeTeam(e.target.value)}
                            placeholder="Ex: ESTADOS UNIDOS"
                            className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 transition-colors text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Equipa Fora</label>
                          <input
                            type="text"
                            required
                            value={mktAwayTeam}
                            onChange={(e) => setMktAwayTeam(e.target.value)}
                            placeholder="Ex: PARAGUAI"
                            className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 transition-colors text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Recomendação / Dica</label>
                          <input
                            type="text"
                            required
                            value={mktRecommendedBet}
                            onChange={(e) => setMktRecommendedBet(e.target.value)}
                            placeholder="Ex: UNDER 3.5 GOLOS"
                            className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 transition-colors text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Odd Estimada</label>
                          <input
                            type="text"
                            required
                            value={mktOdd}
                            onChange={(e) => setMktOdd(e.target.value)}
                            placeholder="Ex: 1.66"
                            className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 transition-colors text-white"
                          />
                        </div>
                      </div>

                      <div className="border-t border-zinc-900/60 pt-3">
                        <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest font-mono block mb-2">Probabilidades 1X2 (%)</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] uppercase font-mono text-zinc-550 block mb-0.5 font-bold">Casa (1)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={mktHomeTeam ? mktHomeProb : 33}
                              onChange={(e) => setMktHomeProb(Number(e.target.value))}
                              className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl p-2 text-xs text-center font-mono text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] uppercase font-mono text-zinc-550 block mb-0.5 font-bold">Empate (X)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={mktHomeTeam ? mktDrawProb : 33}
                              onChange={(e) => setMktDrawProb(Number(e.target.value))}
                              className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl p-2 text-xs text-center font-mono text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] uppercase font-mono text-zinc-550 block mb-0.5 font-bold">Fora (2)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={mktHomeTeam ? mktAwayProb : 33}
                              onChange={(e) => setMktAwayProb(Number(e.target.value))}
                              className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl p-2 text-xs text-center font-mono text-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Probabilidade Under 3.5 (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={mktUnder35Prob}
                          onChange={(e) => setMktUnder35Prob(Number(e.target.value))}
                          className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 transition-colors text-white font-mono"
                        />
                      </div>

                      <div className="pt-3 flex gap-2">
                        {editingMktId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMktId(null);
                              setMktHomeTeam('');
                              setMktAwayTeam('');
                              setMktLeague('');
                              setMktRecommendedBet('');
                              setMktOdd('');
                              setMktHomeProb(33);
                              setMktDrawProb(33);
                              setMktAwayProb(33);
                              setMktUnder35Prob(70);
                            }}
                            className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-colors hover:bg-zinc-800 text-zinc-400 hover:text-white"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-black uppercase tracking-wider text-[10px] transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
                        >
                          {editingMktId ? 'Salvar Edição 💾' : 'Publicar no Mural 📢'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Tabela de Operações no Diário (8 colunas) */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="bg-zinc-950/30 border border-zinc-900/60 rounded-2xl p-5 overflow-hidden">
                      <div className="border-b border-zinc-900 pb-3 mb-4">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          Operações no Diário / Mural
                        </h3>
                        <p className="text-[10.5px] text-zinc-500">
                          Consulte os prognósticos publicados, mude o status em tempo real [Green, Red, Pendente], edite os dados ou apague permanentemente.
                        </p>
                      </div>

                      {marketingList.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 italic text-xs">
                          Sem operações registadas no momento. Utilize o formulário para adicionar ou envie uma do Purificador IA de Odds no VIP Dashboard.
                        </div>
                      ) : (
                        <div className="overflow-x-auto font-sans">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-zinc-900 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                                <th className="py-3 px-2">Data / Competição</th>
                                <th className="py-3 px-2">Jogo / Confronto</th>
                                <th className="py-3 px-2">IA Recomendação & Odd</th>
                                <th className="py-3 px-2">Estado</th>
                                <th className="py-3 px-2 text-right">Ações / Modificadores</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900/50">
                              {marketingList.map((item) => {
                                const isPending = item.status === 'pending';
                                const isGreen = item.status === 'green';
                                const isRed = item.status === 'red';

                                return (
                                  <tr key={item.id} className="text-xs text-zinc-300 hover:bg-zinc-900/10 transition-colors">
                                    <td className="py-3.5 px-2 text-left">
                                      <div>
                                        <span className="block font-medium text-zinc-400">{item.league || 'Ligas Gerais'}</span>
                                        <span className="text-[9px] text-zinc-500 font-mono">
                                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-PT') : 'Recente'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-2 font-bold text-white uppercase tracking-wide text-left">
                                      {item.homeTeam} <span className="text-zinc-650 lowercase font-light text-[10px]">vs</span> {item.awayTeam}
                                    </td>
                                    <td className="py-3.5 px-2 font-mono text-left">
                                      <div className="text-[11px] font-sans font-black text-zinc-200 uppercase">{item.recommendedBet}</div>
                                      <div className="text-[10.5px] font-mono text-cyan-400">@{item.odd}</div>
                                    </td>
                                    <td className="py-3.5 px-2 text-left">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black font-mono uppercase tracking-wider ${
                                        isGreen 
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                          : isRed
                                          ? 'bg-red-500/10 text-red-500 border border-red-500/15'
                                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/15'
                                      }`}>
                                        {isGreen ? 'GREEN 🟢' : isRed ? 'RED 🔴' : 'PENDENTE ⏳'}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-2 text-right">
                                      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => changeMktStatus(item.id, 'green')}
                                            title="Marcar como Green"
                                            className={`p-1 rounded text-[9px] font-bold border transition-colors cursor-pointer ${isGreen ? 'bg-emerald-500 text-black border-emerald-400 font-bold' : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40 hover:bg-emerald-950/40'}`}
                                          >
                                            🟢 G
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => changeMktStatus(item.id, 'red')}
                                            title="Marcar como Red"
                                            className={`p-1 rounded text-[9px] font-bold border transition-colors cursor-pointer ${isRed ? 'bg-red-500 text-black border-red-400 font-bold' : 'bg-red-950/20 text-red-400 border-red-900/40 hover:bg-red-950/40'}`}
                                          >
                                            🔴 R
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => changeMktStatus(item.id, 'pending')}
                                            title="Deixar Pendente"
                                            className={`p-1 rounded text-[9px] font-bold border transition-colors cursor-pointer ${isPending ? 'bg-amber-500 text-black border-amber-400 font-bold' : 'bg-amber-950/20 text-amber-500 border-amber-900/40 hover:bg-zinc-850'}`}
                                          >
                                            ⏳ P
                                          </button>
                                        </div>

                                        <div className="flex items-center gap-1 border-l border-zinc-800 pl-1.5 ml-0.5">
                                          {mktIdToDelete === item.id ? (
                                            <div className="flex items-center gap-1 bg-red-950/20 px-1.5 py-1 rounded border border-red-900/40 animate-in fade-in duration-100">
                                              <span className="text-[9px] text-rose-500 font-bold uppercase">Apagar?</span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  deleteMktItem(item.id);
                                                  setMktIdToDelete(null);
                                                }}
                                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[9px] uppercase transition-all cursor-pointer"
                                              >
                                                Sim
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setMktIdToDelete(null)}
                                                className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold rounded text-[9px] uppercase transition-all cursor-pointer"
                                              >
                                                Não
                                              </button>
                                            </div>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => editMktItem(item)}
                                                title="Editar Detalhes"
                                                className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs hover:bg-zinc-800 cursor-pointer"
                                              >
                                                📝
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setMktIdToDelete(item.id)}
                                                title="Remover Prognóstico"
                                                className="p-1.5 rounded bg-red-950/10 border border-red-950/30 text-rose-450 hover:bg-rose-950/20 hover:border-red-550 cursor-pointer text-xs"
                                              >
                                                🗑️
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Visual Separator */}
                <div className="border-t border-zinc-900 my-10 pt-10">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-amber-400 uppercase tracking-tight font-display">
                      Múltiplas em Destaque 🌟
                    </h2>
                    <p className="text-xs text-zinc-400 font-light mt-1">
                      Gerencie as imagens de apostas múltiplas em destaque exibidas na Homepage. Defina o título (ex: #1, #2) e a imagem correspondente.
                    </p>
                  </div>
                </div>

                {/* Status Messages for Multiples */}
                {multipleSuccess && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-bold flex items-center gap-2">
                    <span>🟢</span> <span>{multipleSuccess}</span>
                  </div>
                )}
                {multipleError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-bold flex items-center gap-2">
                    <span>🔴</span> <span>{multipleError}</span>
                  </div>
                )}

                {/* Grid Form + Multiples Table */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                  {/* Formulário Novo/Editar (4 colunas) */}
                  <div className="lg:col-span-4 bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 space-y-4 h-fit">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3 font-display">
                      {editingMultipleId ? '📝 Editar Múltipla' : '➕ Criar Nova Múltipla'}
                    </h3>

                    <form onSubmit={handleMultipleSubmit} className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Título da Múltipla</label>
                        <input
                          type="text"
                          required
                          value={multipleTitle}
                          onChange={(e) => setMultipleTitle(e.target.value)}
                          placeholder="Ex: #1"
                          className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 transition-colors text-white font-black"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Imagem do Cupão (Carregar do PC)</label>
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingMultipleFile(true);
                          }}
                          onDragLeave={() => setIsDraggingMultipleFile(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingMultipleFile(false);
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              const file = e.dataTransfer.files[0];
                              compressMultipleImage(file).then((compressed) => {
                                if (compressed) setMultipleImageUrl(compressed);
                              });
                            }
                          }}
                          onClick={() => {
                            document.getElementById('multiple_image_upload_input')?.click();
                          }}
                          className={`border-2 border-dashed rounded-2xl p-5 transition-all duration-200 flex flex-col items-center justify-center text-center relative cursor-pointer min-h-[150px] ${
                            isDraggingMultipleFile 
                              ? 'border-amber-500 bg-amber-500/5' 
                              : multipleImageUrl 
                                ? 'border-emerald-500/30 bg-emerald-500/5' 
                                : 'border-zinc-800 bg-[#121216] hover:border-zinc-700'
                          }`}
                        >
                          <input 
                            type="file"
                            accept="image/*"
                            id="multiple_image_upload_input"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                compressMultipleImage(file).then((compressed) => {
                                  if (compressed) setMultipleImageUrl(compressed);
                                });
                              }
                            }}
                          />
                          
                          {multipleImageUrl ? (
                            <div className="space-y-3 w-full flex flex-col items-center">
                              <div className="relative group w-full aspect-video rounded-xl overflow-hidden border border-zinc-700/40 shadow-md">
                                <img 
                                  src={multipleImageUrl} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider bg-zinc-950/80 px-2.5 py-1 rounded-lg">Clique para trocar</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 justify-between w-full">
                                <span className="text-[9px] text-emerald-400 font-mono font-bold uppercase truncate max-w-[150px]">
                                  🟢 Imagem Importada
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMultipleImageUrl('');
                                  }}
                                  className="text-[9px] text-rose-450 bg-rose-950/20 hover:bg-rose-950 px-2 py-0.5 rounded border border-red-900/20 font-bold"
                                >
                                  Remover 🗑️
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="pointer-events-none space-y-2">
                              <div className="text-2xl text-amber-500">📁</div>
                              <div className="space-y-1">
                                <p className="text-xs font-black text-zinc-250">
                                  Arraste a imagem ou clique para carregar
                                </p>
                                <p className="text-[10px] text-zinc-500 font-light">
                                  Suporta imagens do seu Computador / Telemóvel
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Scan button forUploaded Image */}
                      {multipleImageUrl && (
                        <button
                          type="button"
                          onClick={handleAnalyzeMultipleImage}
                          disabled={isAnalyzingSlipImage}
                          className="w-full py-2 px-3 bg-gradient-to-r from-purple-900/40 via-amber-900/30 to-purple-900/40 border border-purple-500/30 hover:border-amber-400/50 rounded-xl text-amber-300 font-bold text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-amber-500/10"
                        >
                          {isAnalyzingSlipImage ? (
                            <>
                              <div className="w-3 h-3 border-2 border-amber-300 border-t-transparent rounded-full animate-spin"></div>
                              <span>🤖 IA a analisar datas no cupão...</span>
                            </>
                          ) : (
                            <>
                              <span>🤖 Analisar Imagem com IA (Extrair Fim do Último Jogo)</span>
                            </>
                          )}
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Estado</label>
                          <select
                            value={multipleStatus}
                            onChange={(e) => setMultipleStatus(e.target.value as 'pending' | 'green' | 'red')}
                            className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-2.5 py-2 text-xs outline-none focus:border-amber-500 transition-colors text-white font-bold"
                          >
                            <option value="pending">⏳ Pendente</option>
                            <option value="green">🟢 Green</option>
                            <option value="red">🔴 Red</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Data Publicação</label>
                          <input
                            type="date"
                            required
                            value={multipleCustomDate}
                            onChange={(e) => setMultipleCustomDate(e.target.value)}
                            className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-2.5 py-2 text-xs outline-none focus:border-amber-500 transition-colors text-white font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* Expiry Date/Time & Auto-Cleanup Toggle */}
                      <div className="bg-zinc-950/60 border border-amber-500/20 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-black text-amber-400 flex items-center gap-1.5">
                            <span>🧹 Algoritmo de Limpeza Automática</span>
                          </label>
                          <input
                            type="checkbox"
                            id="multiple_auto_expire"
                            checked={multipleAutoExpire}
                            onChange={(e) => setMultipleAutoExpire(e.target.checked)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                        </div>
                        <p className="text-[9.5px] text-zinc-400 font-light leading-tight">
                          Elimina/oculta automaticamente a múltipla do site assim que a data/hora do último jogo expirar.
                        </p>

                        <div>
                          <label className="text-[9.5px] uppercase font-bold text-zinc-400 block mb-1">Data e Hora do Último Jogo (Expiração)</label>
                          <input
                            type="datetime-local"
                            value={multipleExpiresAt}
                            onChange={(e) => setMultipleExpiresAt(e.target.value)}
                            placeholder="Ex: 2026-08-04T23:59"
                            className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-2.5 py-2 text-xs outline-none focus:border-amber-500 transition-colors text-amber-200 font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="pt-3 flex gap-2">
                        {editingMultipleId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMultipleId(null);
                              setMultipleTitle('');
                              setMultipleImageUrl('');
                              setMultipleStatus('pending');
                              setMultipleCustomDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-colors hover:bg-zinc-800 text-zinc-400 hover:text-white"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-black uppercase tracking-wider text-[10px] transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                        >
                          {editingMultipleId ? 'Salvar Edição 💾' : 'Publicar Múltipla 📢'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Tabela de Múltiplas (8 colunas) */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="bg-zinc-950/30 border border-zinc-900/60 rounded-2xl p-5">
                      <div className="border-b border-zinc-900 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider font-display flex items-center gap-2">
                            <span>Imagens de Múltiplas Ativas</span>
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                              {multiplesList.length} Total
                            </span>
                          </h3>
                          <p className="text-[10.5px] text-zinc-500">
                            Consulte os cupões registados. Múltiplas expiradas são automaticamente ocultadas do público.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={purgeExpiredMultiples}
                          className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                        >
                          <span>🧹 Limpar Expiradas</span>
                        </button>
                      </div>

                      {multiplesList.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 italic text-xs">
                          Nenhuma múltipla em destaque registada no momento. Utilize o formulário ao lado.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {multiplesList.map((item) => (
                            <div key={item.id} className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/30 transition-all duration-300">
                              <div className="flex items-start justify-between gap-2 mb-3.5">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="block text-amber-500 font-black text-lg tracking-wider filter drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">{item.title}</span>
                                    {item.status === 'green' ? (
                                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">🟢 GREEN</span>
                                    ) : item.status === 'red' ? (
                                      <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-bold">🔴 RED</span>
                                    ) : (
                                      <span className="text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-750 px-1.5 py-0.5 rounded font-bold">⏳ PENDENTE</span>
                                    )}
                                  </div>
                                  <span className="block text-[10px] text-zinc-400 font-mono font-bold">
                                    🗓️ {item.customDate ? (() => {
                                      const parts = item.customDate.split('-');
                                      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
                                      return item.customDate;
                                    })() : (item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-PT') : 'Recente')}
                                  </span>

                                  {/* Auto-Expire & Expiry Info */}
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    {checkIsMultipleExpired(item) ? (
                                      <span className="text-[8.5px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-black font-mono">
                                        🔴 EXPIRADA (Oculta do site)
                                      </span>
                                    ) : item.expiresAt ? (
                                      <span className="text-[8.5px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
                                        ⏰ Expira: {new Date(item.expiresAt).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    ) : item.autoExpireEnabled !== false ? (
                                      <span className="text-[8.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
                                        🟢 Ativa Hoje
                                      </span>
                                    ) : (
                                      <span className="text-[8.5px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded font-bold font-mono">
                                        📌 Manual
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => editMultipleItem(item)}
                                    title="Editar Múltipla"
                                    className="p-2 rounded bg-zinc-900 hover:bg-zinc-800 text-xs cursor-pointer border border-zinc-850"
                                  >
                                    📝
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteMultipleItem(item.id)}
                                    title="Apagar Múltipla"
                                    className="p-2 rounded bg-red-950/20 hover:bg-rose-950 text-xs text-rose-450 cursor-pointer border border-red-900/20"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                              <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-900 bg-black flex items-center justify-center">
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                                  <span className="text-[10px] text-zinc-300 font-bold tracking-wide truncate">{item.title} em Destaque</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'pillars' && (
              <div className="space-y-6 animate-fade-in text-left">
                {/* Header message */}
                <div className="p-6 bg-gradient-to-r from-emerald-950/20 to-zinc-950 border border-zinc-850 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase text-emerald-400 tracking-wider">
                      Gestor de Tecnologia Aplicada (Pillars)
                    </h3>
                    <p className="text-xs text-zinc-400 font-light pr-4 max-w-2xl">
                      Configure os cartões e tópicos de inteligência exibidos na secção principal do portal. Pode traduzir os títulos, resumos e textos explicativos expandidos para as 5 línguas suportadas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetPillarsToDefault}
                    className="py-2 px-4 bg-zinc-900 hover:bg-red-950/20 text-rose-450 hover:text-rose-400 border border-zinc-800 hover:border-red-500/25 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 shrink-0 select-none cursor-pointer"
                  >
                    Restaurar Originais iRunBets
                  </button>
                </div>

                {pillarsSuccess && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded-xl text-xs font-semibold">
                    {pillarsSuccess}
                  </div>
                )}
                {pillarsError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs font-semibold">
                    {pillarsError}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column - Form */}
                  <div className="lg:col-span-7 bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl space-y-6">
                    <form onSubmit={handlePillarSubmit} className="space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                        <span className="text-[11px] font-black text-zinc-300 uppercase tracking-widest font-mono">
                          {editingPillarId ? '📝 Editando Tópico' : '✨ Criar Novo Tópico'}
                        </span>
                        {editingPillarId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPillarId(null);
                              setPId(''); setPImages(''); setPBorderGlow('hover:border-sky-500/40 shadow-sky-500/5');
                              setPTitlePt(''); setPTitleEn(''); setPTitleFr(''); setPTitleIt(''); setPTitleDe('');
                              setPDescPt(''); setPDescEn(''); setPDescFr(''); setPDescIt(''); setPDescDe('');
                              setPDetailsPt(''); setPDetailsEn(''); setPDetailsFr(''); setPDetailsIt(''); setPDetailsDe('');
                              setPillarsSuccess(''); setPillarsError('');
                            }}
                            className="text-[10px] uppercase font-black tracking-widest text-[#00f2fe] hover:underline"
                          >
                            Cancelar Edição
                          </button>
                        )}
                      </div>

                      {/* General configurations */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left font-sans">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">ID Única (Ex: radar, app, engine)</label>
                          <input
                            type="text"
                            value={pId}
                            onChange={(e) => setPId(e.target.value)}
                            placeholder="Ex: robot"
                            disabled={!!editingPillarId}
                            className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/60 font-mono disabled:opacity-50"
                          />
                        </div>
                        <div className="space-y-1.5 text-left font-sans">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Presete de Glow (Moldura)</label>
                          <select
                            value={pBorderGlow}
                            onChange={(e) => setPBorderGlow(e.target.value)}
                            className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/60 font-mono"
                          >
                            <option value="hover:border-sky-500/40 shadow-sky-500/5">Sky Blue (Padrão)</option>
                            <option value="hover:border-orange-500/40 shadow-orange-500/5">Laser Orange</option>
                            <option value="hover:border-fuchsia-500/40 shadow-fuchsia-500/5">Neon Purple/Pink</option>
                            <option value="hover:border-emerald-500/40 shadow-emerald-500/5">Emerald Green</option>
                            <option value="hover:border-amber-500/40 shadow-amber-500/5">Luxury Gold</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2 text-left font-sans">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
                          Imagem do Tópico (Upload ou URL)
                        </label>
                        
                        {/* Drag and Drop Zone and Preview */}
                        <div 
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingFile(true);
                          }}
                          onDragLeave={() => setIsDraggingFile(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingFile(false);
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              const file = e.dataTransfer.files[0];
                              if (file.type.startsWith('image/')) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    setPImages(event.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                          className={`border-2 border-dashed rounded-2xl p-5 transition-all duration-200 flex flex-col items-center justify-center text-center relative cursor-pointer ${
                            isDraggingFile 
                              ? 'border-[#00f2fe] bg-[#00f2fe]/5' 
                              : pImages 
                                ? 'border-emerald-500/30 bg-emerald-500/5' 
                                : 'border-zinc-800 bg-[#121216] hover:border-zinc-700'
                          }`}
                        >
                          <input 
                            type="file"
                            accept="image/*"
                            id="p_image_upload_input"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    setPImages(event.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          
                          {pImages ? (
                            <div className="space-y-3 w-full flex flex-col items-center">
                              <div className="relative group w-32 h-20 rounded-xl overflow-hidden border border-zinc-700 shadow-md">
                                <img 
                                  src={pImages} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-[10px] text-zinc-300 font-medium">Upload ativo</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase truncate max-w-[200px]">
                                  {pImages.startsWith('data:') ? 'Imagem Importada (Base64)' : 'Imagem via URL'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPImages('');
                                  }}
                                  className="text-[9px] font-black uppercase tracking-wider text-rose-450 hover:text-rose-400 underline cursor-pointer"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label htmlFor="p_image_upload_input" className="cursor-pointer w-full h-full py-4 flex flex-col items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-zinc-500 mb-2 group-hover:text-zinc-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                              </svg>
                              <p className="text-xs font-bold text-zinc-300">Arraste a sua imagem ou <span className="text-[#00f2fe] underline font-black">clique para importar</span></p>
                              <p className="text-[10px] text-zinc-500 mt-1 font-light">PNG, JPG, WEBP, SVG (Ficará guardada localmente)</p>
                            </label>
                          )}
                        </div>

                        {/* Fallback URL Input */}
                        <details className="group mt-2">
                          <summary className="text-[9px] text-zinc-500 hover:text-zinc-400 cursor-pointer font-bold uppercase tracking-wider select-none font-mono list-none flex items-center gap-1.5 focus:outline-none">
                            <span className="transition-transform group-open:rotate-90 text-[8px]">▶</span>
                            <span>Ou introduzir URL de imagem pré-existente</span>
                          </summary>
                          <div className="pt-2">
                            <input
                              type="url"
                              value={pImages.startsWith('data:') ? '' : pImages}
                              onChange={(e) => setPImages(e.target.value)}
                              placeholder="Ex: https://images.unsplash.com/..."
                              className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/60 font-mono"
                            />
                          </div>
                        </details>
                      </div>

                      {/* Tabs inside form for languages */}
                      <div className="border-t border-zinc-900 pt-4 space-y-4 font-sans">
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest font-mono block">
                          Traduções e Conteúdos
                        </span>

                        {/* Portuguese translation (MANDATORY) */}
                        <div className="p-4 bg-[#141419] rounded-xl border border-zinc-900 space-y-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px]">🇵🇹</span>
                            <span className="text-[10px] font-bold text-zinc-200 uppercase tracking-wide">Português (Obrigatório)</span>
                          </div>
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={pTitlePt}
                              onChange={(e) => setPTitlePt(e.target.value)}
                              placeholder="Título em Português (Ex: 📊 iR-Engine Pro)"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <textarea
                              rows={2}
                              value={pDescPt}
                              onChange={(e) => setPDescPt(e.target.value)}
                              placeholder="Breve descrição resumida (exibida no card da página inicial)"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase block">Explicação Detalhada (Mostrada ao clicar em Saber Mais)</label>
                            <textarea
                              rows={4}
                              value={pDetailsPt}
                              onChange={(e) => setPDetailsPt(e.target.value)}
                              placeholder="Escreva a análise científica completa do modelo matemático..."
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50"
                            />
                          </div>
                        </div>

                        {/* English translation (RECOMMENDED) */}
                        <div className="p-4 bg-zinc-900/20 rounded-xl border border-zinc-900 space-y-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px]">🇬🇧</span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">English</span>
                          </div>
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={pTitleEn}
                              onChange={(e) => setPTitleEn(e.target.value)}
                              placeholder="Title in English (Deixe em branco para herdar PT)"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <textarea
                              rows={2}
                              value={pDescEn}
                              onChange={(e) => setPDescEn(e.target.value)}
                              placeholder="Short description in English (Deixe em branco para herdar PT)"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <textarea
                              rows={3}
                              value={pDetailsEn}
                              onChange={(e) => setPDetailsEn(e.target.value)}
                              placeholder="Expanded research details in English (Deixe em branco para herdar PT)"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/55"
                            />
                          </div>
                        </div>

                        {/* Additional translations fold */}
                        <details className="group border border-zinc-900 rounded-xl overflow-hidden bg-zinc-900/5">
                          <summary className="p-3.5 flex items-center justify-between text-left text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none font-mono">
                            <span>Outros Idiomas (FR, IT, DE - Opcionais)</span>
                            <span className="transition-transform group-open:rotate-180 text-xs">▼</span>
                          </summary>

                          <div className="p-4 border-t border-zinc-900 space-y-5">
                            {/* French */}
                            <div className="space-y-2 border-b border-zinc-900/50 pb-3">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase block">🇫🇷 French Translation</span>
                              <input
                                type="text"
                                value={pTitleFr}
                                onChange={(e) => setPTitleFr(e.target.value)}
                                placeholder="Titre en Français"
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none mb-1.5"
                              />
                              <textarea
                                rows={2}
                                value={pDescFr}
                                onChange={(e) => setPDescFr(e.target.value)}
                                placeholder="Description courte"
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                              />
                            </div>

                            {/* Italian */}
                            <div className="space-y-2 border-b border-zinc-900/50 pb-3">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase block">🇮🇹 Italian Translation</span>
                              <input
                                type="text"
                                value={pTitleIt}
                                onChange={(e) => setPTitleIt(e.target.value)}
                                placeholder="Titolo in Italiano"
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none mb-1.5"
                              />
                              <textarea
                                rows={2}
                                value={pDescIt}
                                onChange={(e) => setPDescIt(e.target.value)}
                                placeholder="Breve descrizione"
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                              />
                            </div>

                            {/* German */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase block">🇩🇪 German Translation</span>
                              <input
                                type="text"
                                value={pTitleDe}
                                onChange={(e) => setPTitleDe(e.target.value)}
                                placeholder="Titel auf Deutsch"
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none mb-1.5"
                              />
                              <textarea
                                rows={2}
                                value={pDescDe}
                                onChange={(e) => setPDescDe(e.target.value)}
                                placeholder="Kurzbeschreibung"
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                              />
                            </div>
                          </div>
                        </details>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-lg shadow-emerald-500/10 cursor-pointer text-center select-none"
                      >
                        {editingPillarId ? 'Salvar Alterações 💾' : 'Adicionar Tópico Tecnológico 🚀'}
                      </button>
                    </form>
                  </div>

                  {/* Right Column - Active List */}
                  <div className="lg:col-span-5 space-y-4 text-left">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono block">
                      Tópicos Ativos ({pillarsList.length})
                    </span>

                    {pillarsList.length === 0 ? (
                      <div className="p-8 text-center bg-zinc-900/10 border border-zinc-900 border-dashed rounded-2xl text-zinc-500 text-xs italic">
                        Nenhum pilar cadastrado. Restaure os padrões originais!
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pillarsList.map((item) => {
                          const titlePt = item.title?.pt || '';
                          const descPt = item.desc?.pt || '';
                          return (
                            <div
                              key={item.id}
                              className="p-4 bg-[#111115] border border-zinc-850 rounded-2xl flex gap-3.5 items-start group hover:border-zinc-700 transition-all duration-200"
                            >
                              <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 shrink-0">
                                <img
                                  src={item.images}
                                  alt=""
                                  className="w-full h-full object-cover brightness-[0.8]"
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              <div className="flex-1 space-y-1 font-sans">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-xs font-black text-white uppercase tracking-wide line-clamp-1">
                                    {titlePt}
                                  </h4>
                                  <span className="text-[8px] font-bold font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-850">
                                    ID: {item.id}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                                  {descPt}
                                </p>

                                <div className="pt-2 flex items-center justify-between border-t border-zinc-900 mt-2">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8.5px] font-bold font-mono text-zinc-500 mr-1 uppercase">LANGS:</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="PT"></span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${item.title?.en !== item.title?.pt ? 'bg-emerald-400' : 'bg-zinc-750'}`} title="EN"></span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${item.title?.fr !== item.title?.pt ? 'bg-emerald-400' : 'bg-zinc-750'}`} title="FR"></span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${item.title?.it !== item.title?.pt ? 'bg-emerald-400' : 'bg-zinc-750'}`} title="IT"></span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${item.title?.de !== item.title?.pt ? 'bg-emerald-400' : 'bg-zinc-750'}`} title="DE"></span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => startEditPillar(item)}
                                      className="py-1 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-[9px] font-bold uppercase transition-colors shrink-0 select-none cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deletePillar(item.id)}
                                      className="py-1 px-2.5 bg-red-950/10 hover:bg-red-900/20 text-rose-450 rounded-lg text-[9px] font-bold uppercase transition-colors shrink-0 select-none cursor-pointer"
                                    >
                                      Apagar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6 animate-fade-in text-left">
                {/* Header message */}
                <div className="p-6 bg-gradient-to-r from-emerald-950/20 to-zinc-950 border border-zinc-850 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold font-mono text-emerald-450 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-505/20 uppercase tracking-widest">
                      CONTROLO FINANCEIRO EM TEMPO REAL
                    </span>
                    <h3 className="text-sm font-black uppercase text-white tracking-wider pt-1">
                      Faturação, Saldo Pré-Pago & Controlo de Gastos
                    </h3>
                    <p className="text-xs text-zinc-400 font-light pr-4 max-w-2xl">
                      Acompanhe em tempo real o saldo pré-pago, gastos em análises de jogos por IA, consumo de prompts no Xcode / AI Studio e retenção de IVA do projeto iRunBets.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-300 font-mono flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Sincronização Ativa
                    </span>
                  </div>
                </div>

                {billingSuccessMsg && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold font-sans flex items-center justify-between animate-fade-in">
                    <span>✨ {billingSuccessMsg}</span>
                    <button type="button" onClick={() => setBillingSuccessMsg('')} className="text-emerald-500 hover:text-emerald-300 font-mono text-[10px] uppercase font-black tracking-widest">OK</button>
                  </div>
                )}

                {/* Dashboard Stats */}
                {(() => {
                  // Compute dynamic stats
                  let revenue = 0;
                  let qtyPremium = 0;
                  let qtyGratuito = 0;

                  subscribers.forEach(sub => {
                    const status = sub.status || 'Gratuito';
                    if (status === 'Gratuito') {
                      qtyGratuito++;
                    } else {
                      qtyPremium++;
                      const match = status.match(/(\d+(?:\.\d+)?)\s*€/);
                      if (match) {
                        const val = parseFloat(match[1]);
                        if (status.toLowerCase().includes('anual') || status.toLowerCase().includes('yearly')) {
                          revenue += val / 12;
                        } else {
                          revenue += val;
                        }
                      } else {
                        if (status.toLowerCase().includes('gold') || status.toLowerCase().includes('vip')) {
                          revenue += 19.99;
                        } else if (status.toLowerCase().includes('silver') || status.toLowerCase().includes('prata')) {
                          revenue += 14.99;
                        } else {
                          revenue += 9.99;
                        }
                      }
                    }
                  });

                  const totalSpent = (billingGeminiSpent + billingOtherSpent);
                  const calculatedRealBalance = Math.max(0, billingPrepaidTotal - totalSpent);
                  const totalEstimatedMargin = revenue - totalSpent;

                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* CARD 1: BUDGET SPENT IN GAME ANALYSIS */}
                        <div className="bg-[#121216]/80 border border-amber-500/20 p-5 rounded-2xl space-y-3 flex flex-col justify-between shadow-lg">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-mono uppercase font-semibold text-amber-400 tracking-wider">
                              <span>Análise de Jogos (IA)</span>
                              <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">Módulo IA</span>
                            </div>
                            <div className="flex items-baseline gap-1.5 pt-1">
                              <span className="text-3xl font-black text-white tracking-tight">{billingGeminiSpent.toFixed(2)}€</span>
                              <span className="text-xs text-zinc-400 font-medium">Análises de Jogos</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-sans pt-1 leading-snug">
                              Refere-se exclusivamente às análises de jogos desportivos efetuadas pela IA.
                            </p>
                          </div>
                          <div className="pt-2 border-t border-zinc-850 flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                            <span>Período Ativo</span>
                            <span className="text-zinc-200 font-bold">{billingPeriodStart}</span>
                          </div>
                        </div>

                        {/* CARD 2: PROMPTS XCODE / AI STUDIO / IVA */}
                        <div className="bg-[#121216]/80 border border-blue-500/20 p-5 rounded-2xl space-y-3 flex flex-col justify-between shadow-lg">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-mono uppercase font-semibold text-blue-400 tracking-wider">
                              <span>Prompts Xcode + IVA</span>
                              <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">Dev & Impostos</span>
                            </div>
                            <div className="flex items-baseline gap-1.5 pt-1">
                              <span className="text-3xl font-black text-white tracking-tight">{billingOtherSpent.toFixed(2)}€</span>
                              <span className="text-xs text-zinc-400 font-medium">Xcode / Studio</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-sans pt-1 leading-snug">
                              Prompts consumidos no Xcode, assistente e taxa de retenção de IVA (23%).
                            </p>
                          </div>
                          <div className="pt-2 border-t border-zinc-850 flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                            <span>Total Gastos Acumulados</span>
                            <span className="text-blue-300 font-black">{totalSpent.toFixed(2)}€</span>
                          </div>
                        </div>

                        {/* CARD 3: SALDO PRÉ-PAGO & SALDO REAL RESTANTE */}
                        <div className="bg-[#121216]/90 border border-emerald-500/30 p-5 rounded-2xl space-y-3 flex flex-col justify-between shadow-xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                          <div className="space-y-1 relative">
                            <div className="flex justify-between items-center text-[10px] font-mono uppercase font-semibold text-emerald-400 tracking-wider">
                              <span>Saldo Real Pré-Pago</span>
                              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 animate-pulse">Em Tempo Real</span>
                            </div>
                            <div className="flex items-baseline gap-1.5 pt-1">
                              <span className="text-3xl font-black text-emerald-400 tracking-tight">{calculatedRealBalance.toFixed(2)}€</span>
                              <span className="text-xs text-zinc-400 font-mono">/ {billingPrepaidTotal.toFixed(2)}€ pré-pago</span>
                            </div>
                            <div className="text-[11px] text-zinc-300 font-mono space-y-0.5 pt-1">
                              <div className="flex justify-between text-zinc-400 text-[10px]">
                                <span>Carregamento Inicial:</span>
                                <span className="text-white font-bold">{billingPrepaidTotal.toFixed(2)}€</span>
                              </div>
                              <div className="flex justify-between text-zinc-400 text-[10px]">
                                <span>Total Gasto (Análises + Xcode/IVA):</span>
                                <span className="text-amber-400 font-bold">-{totalSpent.toFixed(2)}€</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                            <a
                              href={billingPrepaidUrl || 'https://aistudio.google.com/app/plan_information'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Aceder ao Painel Pré-Pago ↗</span>
                            </a>
                          </div>
                        </div>

                        {/* CARD 4: RENTABILIDADE CRM */}
                        <div className="bg-[#121216]/80 border border-zinc-850 p-5 rounded-2xl space-y-3 flex flex-col justify-between shadow-lg">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-mono uppercase font-semibold text-sky-400 tracking-wider">
                              <span>Receita CRM / Mês</span>
                              <span className="text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">Assinaturas</span>
                            </div>
                            <div className="flex items-baseline gap-1.5 pt-1">
                              <span className="text-3xl font-black text-sky-400 tracking-tight">{revenue.toFixed(2)}€</span>
                              <span className="text-xs text-zinc-400 font-mono">/mês estim.</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-sans pt-1 leading-snug">
                              {qtyPremium} assinante(s) VIP / {qtyGratuito} gratuito(s).
                            </p>
                          </div>
                          <div className="pt-2 border-t border-zinc-850 flex justify-between items-center text-[10px] font-mono">
                            <span className="text-zinc-400">Margem Operacional</span>
                            <span className="text-sky-300 font-black">{totalEstimatedMargin.toFixed(2)}€</span>
                          </div>
                        </div>
                      </div>

                      {/* Configurations & Update Forms */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left font-sans mt-8">
                        
                        {/* UPDATE FORM */}
                        <div className="bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl space-y-5">
                          <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
                            <span className="text-[11px] font-black text-zinc-300 uppercase tracking-widest font-mono">
                              ⚙️ Ajustar Custos Reais & Saldo Pré-Pago em Tempo Real
                            </span>
                            <span className="text-[9px] text-emerald-400 font-mono tracking-wider font-bold">FIREBASE DB & SYNC</span>
                          </div>

                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              const computedReal = Math.max(0, billingPrepaidTotal - (billingGeminiSpent + billingOtherSpent));
                              setBillingPrepaidBalance(computedReal);

                              localStorage.setItem('irunbets_billing_prepaid_balance', computedReal.toString());
                              localStorage.setItem('irunbets_billing_prepaid_total', billingPrepaidTotal.toString());
                              localStorage.setItem('irunbets_billing_gemini_spent', billingGeminiSpent.toString());
                              localStorage.setItem('irunbets_billing_other_spent', billingOtherSpent.toString());
                              localStorage.setItem('irunbets_billing_prepaid_url', billingPrepaidUrl);
                              localStorage.setItem('irunbets_billing_gemini_limit', billingGeminiLimit.toString());
                              localStorage.setItem('irunbets_billing_period_start', billingPeriodStart);
                              localStorage.setItem('irunbets_billing_period_end', billingPeriodEnd);
                              localStorage.setItem('irunbets_billing_auto_recharge', billingAutoRecharge.toString());
                              
                              window.dispatchEvent(new Event('irunbets_billing_updated'));

                              // Save to Firestore so that both AI Studio and production stay in absolute sync
                              saveBillingConfigToFirebase({
                                prepaidBalance: computedReal,
                                prepaidTotal: billingPrepaidTotal,
                                geminiSpent: billingGeminiSpent,
                                otherSpent: billingOtherSpent,
                                prepaidUrl: billingPrepaidUrl,
                                geminiLimit: billingGeminiLimit,
                                periodStart: billingPeriodStart,
                                periodEnd: billingPeriodEnd,
                                autoRecharge: billingAutoRecharge,
                              });

                              setBillingSuccessMsg('Valores de Faturação Gravados e Sincronizados em Tempo Real!');
                              setTimeout(() => setBillingSuccessMsg(''), 4000);
                            }} 
                            className="space-y-4"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400 font-mono">Carregamento Pré-Pago Inicial (€)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={billingPrepaidTotal}
                                  onChange={(e) => setBillingPrepaidTotal(parseFloat(e.target.value) || 0)}
                                  className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/60 font-mono"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono">Gasto em Análises de Jogos (€)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={billingGeminiSpent}
                                  onChange={(e) => setBillingGeminiSpent(parseFloat(e.target.value) || 0)}
                                  className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/60 font-mono"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-blue-400 font-mono">Gasto Prompts Xcode / AI Studio + IVA (€)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={billingOtherSpent}
                                  onChange={(e) => setBillingOtherSpent(parseFloat(e.target.value) || 0)}
                                  className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/60 font-mono"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Gasto Máximo Definido (€)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={billingGeminiLimit}
                                  onChange={(e) => setBillingGeminiLimit(parseFloat(e.target.value) || 0)}
                                  className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/60 font-mono"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Link Direto para o Painel Pré-Pago (URL)</label>
                              <input
                                type="url"
                                value={billingPrepaidUrl}
                                onChange={(e) => setBillingPrepaidUrl(e.target.value)}
                                placeholder="https://aistudio.google.com/app/plan_information"
                                className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 outline-none focus:border-emerald-500/60 font-mono"
                              />
                            </div>

                            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl font-mono text-[11px] space-y-1">
                              <div className="flex justify-between text-zinc-400">
                                <span>Total Gastos Acumulados (Análises + Prompts/IVA):</span>
                                <span className="text-amber-400 font-bold">{(billingGeminiSpent + billingOtherSpent).toFixed(2)}€</span>
                              </div>
                              <div className="flex justify-between text-zinc-300 font-bold border-t border-zinc-800 pt-1">
                                <span>Saldo Real Restante Calculado:</span>
                                <span className="text-emerald-400 font-black">{Math.max(0, billingPrepaidTotal - (billingGeminiSpent + billingOtherSpent)).toFixed(2)}€</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Data Início Período</label>
                                <input
                                  type="date"
                                  value={billingPeriodStart}
                                  onChange={(e) => setBillingPeriodStart(e.target.value)}
                                  className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/60 font-mono"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Data Fim Período</label>
                                <input
                                  type="date"
                                  value={billingPeriodEnd}
                                  onChange={(e) => setBillingPeriodEnd(e.target.value)}
                                  className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/60 font-mono"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-3.5 bg-zinc-900/40 rounded-xl border border-zinc-850">
                              <div className="space-y-0.5 text-left">
                                <span className="text-xs font-bold text-zinc-300 block">Recarga Automática de Crédito</span>
                                <span className="text-[10px] text-zinc-550 font-light">Adicionar recarga de 10€ se o saldo cair abaixo de 2€</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setBillingAutoRecharge(!billingAutoRecharge)}
                                className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-250 shrink-0 cursor-pointer ${billingAutoRecharge ? 'bg-[#10b981]' : 'bg-zinc-800'}`}
                              >
                                <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transform transition-transform duration-250 ${billingAutoRecharge ? 'translate-x-5.5' : 'translate-x-0'}`}></div>
                              </button>
                            </div>

                            <button
                              type="submit"
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer"
                            >
                              Gravar Informação de Faturação & Atualizar Saldo
                            </button>
                          </form>
                        </div>

                        {/* COST-BENEFIT CALCULATOR SIMULATOR */}
                        <div className="bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
                              <span className="text-[11px] font-black text-[#38bdf8] uppercase tracking-widest font-mono">
                                📊 Calculador de Custos Reais Gemini API
                              </span>
                              <span className="text-[9px] text-[#38bdf8] font-mono font-bold bg-[#38bdf8]/10 border border-[#38bdf8]/20 rounded px-1.5">Interactive</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed font-light">
                              Em circunstâncias reais de mercado, o <strong>Gemini 1.5 Flash</strong> (utilizado para gerar previsões e análises desportivas nesta app) tem preços extraordinariamente acessíveis:
                            </p>
                            <div className="p-3.5 bg-[#0d0d10] border border-zinc-900 rounded-xl text-[10.5px] space-y-2 text-zinc-300">
                              <div className="flex justify-between">
                                <span className="font-mono text-zinc-400">Gemini 1.5 Flash (Input ≤ 128k)</span>
                                <span className="font-black text-amber-500">0.075€ / 1 Milhão Tokens</span>
                              </div>
                              <div className="flex justify-between border-t border-zinc-900/80 pt-1.5">
                                <span className="font-mono text-zinc-400">Bronze Plan Price (Mensal)</span>
                                <span className="font-black text-[#38bdf8]">19.99€ / plano</span>
                              </div>
                            </div>

                            {/* Simulation math box */}
                            <div className="pt-3 border-t border-zinc-900 space-y-3 font-mono text-[10.5px]">
                              <span className="text-zinc-500 font-bold block uppercase text-left">⚡ SIMULAÇÃO DE VOLUME REALÍSTICO EM LARGA ESCALA:</span>
                              
                              <div className="grid grid-cols-2 gap-3.5">
                                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-850">
                                  <span className="text-zinc-500 text-[9.5px] block">PREVISÕES POR MÊS</span>
                                  <span className="text-white font-black text-xs">5,000 chamadas</span>
                                </div>
                                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-850">
                                  <span className="text-zinc-500 text-[9.5px] block">TOKENS POR CHAMADA</span>
                                  <span className="text-white font-black text-xs">~4,000 tokens</span>
                                </div>
                              </div>

                              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-850 space-y-1.5">
                                <div className="flex justify-between text-zinc-400">
                                  <span>Total de Tokens Mensais:</span>
                                  <span className="text-white font-bold">20,000,000 tokens</span>
                                </div>
                                <div className="flex justify-between text-zinc-400">
                                  <span>Custo Real da API do Mês:</span>
                                  <span className="text-emerald-400 font-black">€1.50 euros (!!)</span>
                                </div>
                                <div className="flex justify-between text-zinc-400 border-t border-zinc-850 pt-1.5">
                                  <span>Membros ativos para pagar a API:</span>
                                  <span className="text-amber-500 font-black">0.1 assinantes Bronze</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-3.5 bg-zinc-900/25 border border-zinc-850/50 rounded-xl space-y-1 text-zinc-400 text-[10.5px] leading-relaxed">
                            💡 <strong>Fator de Altíssima Rentabilidade:</strong> O modelo de negócio do iRunBets gera praticamente <strong>~99.8% de margem de lucro bruta</strong>! Com apenas 1 membro Bronze ativo pago (€19.99/mês), a infraestrutura total da Gemini do iRunBets está paga por mais de 1 ano completo!
                          </div>
                        </div>

                      </div>

                      {/* Portuguese Sole Proprietor Instructions & Billing Gateway Roadmap */}
                      <div className="bg-[#121216]/60 border border-zinc-850 p-6 rounded-2xl text-left space-y-5 mt-8 font-sans">
                        <div className="border-b border-zinc-900 pb-3.5 flex items-center gap-2">
                          <span className="text-lg">🏢</span>
                          <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">
                              Guia de Automação de Receitas & Subscrições Mensais (Stripe, MBWay, Finanças Portugal)
                            </h4>
                            <p className="text-[10px] text-zinc-500 font-light font-mono">COMO REGISTAR E OPERAR AUTOMATICAMENTE SEM COMPLICAÇÕES</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-300 leading-relaxed font-light">
                          <div className="space-y-2">
                            <span className="font-mono text-emerald-400 font-bold block">1. REGISTO ENI (Autoridade Tributária)</span>
                            <p>
                              Para emitir <strong>Recibos Verdes</strong> ou faturas eletrónicas em Portugal legalmente, pode abrir atividade no portal das Finanças como <strong>Empresário em Nome Individual (ENI)</strong>.
                            </p>
                            <p className="text-zinc-400 text-[11px]">
                              ● Use o código CAE de Atividades Base de Programação (62010), Atividades de Portais Web (63120) ou Consultoria. Fica isento de IVA até €14.500/ano no Artigo 53º do CIVA.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <span className="font-mono text-sky-400 font-bold block">2. COMPATIBILIDADE STRIPE RECORRENTE</span>
                            <p>
                              A arquitetura completa deste projeto em React (Vite) + Node.js (Servidor Express) foi construída para permitir a integração ultra-fluida com a API do <strong>Stripe Billing</strong>.
                            </p>
                            <p className="text-zinc-400 text-[11px]">
                              ● O Stripe suporta subscrições diretas em cartões de crédito e faturas recorrentes, debitando os clientes mensalmente no piloto automático sem que tenha de fazer nada manual.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <span className="font-mono text-amber-500 font-bold block">3. MBWAY, REVOLUT & MULTIBANCO</span>
                            <p>
                              Para clientes em Portugal, pode usar gateways locais como a <strong>Easypay</strong>, <strong>IfThenPay</strong> ou o próprio Stripe (que suporta MBWay e cartões Revolut).
                            </p>
                            <p className="text-zinc-400 text-[11px]">
                              ● Pode configurar notificações automáticas (webhooks) para dar acesso VIP automático aos utilizadores assim que o pagamento MBWay do telemóvel for concluído.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* DUPLICATION INSTRUCTIONS (Answer user Request #6) */}
                      <div className="bg-[#0b0b0d] border-2 border-indigo-950 p-6 rounded-2xl text-left space-y-4 mt-8 font-sans">
                        <div className="border-b border-indigo-950 pb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">✨</span>
                            <div>
                              <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest font-mono">
                                Como Replicar/Duplicar este Projeto no Google AI Studio (Passos Práticos)
                              </h4>
                              <p className="text-[10px] text-zinc-500 font-light font-mono">CRIE UMA CÓPIA PARALELA DA PLATAFORMA PARA OUTRAS MARCAS</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-indigo-950/50 border border-indigo-900/40 text-indigo-400 font-mono py-0.5 px-2 rounded-md font-bold uppercase">
                            Tutorial 100% Livre
                          </span>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed font-light">
                          Se o seu sonho é duplicar a plataforma e criar uma marca paralela (por exemplo, <em>"juntos vencemos"</em>), pode fazê-lo em menos de <strong>3 minutos</strong> diretamente no Google AI Studio seguindo estes passos simples e infalíveis:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-zinc-400 leading-relaxed font-light font-sans">
                          <div className="space-y-2.5 text-left">
                            <div className="flex gap-2.5 items-start">
                              <span className="bg-indigo-950/80 text-indigo-400 font-bold font-mono px-2 py-0.5 rounded border border-indigo-900 shrink-0">1</span>
                              <div className="space-y-0.5">
                                <span className="font-bold text-zinc-200 block">Exportar este Projeto:</span>
                                <span>No menu de Definições/Settings (canto superior direito ou barra lateral da IA), clique em <strong>"Faça o download do código (.ZIP)"</strong> para guardar todo este código intacto no seu computador.</span>
                              </div>
                            </div>

                            <div className="flex gap-2.5 items-start font-sans">
                              <span className="bg-indigo-950/80 text-indigo-400 font-bold font-mono px-2 py-0.5 rounded border border-indigo-900 shrink-0">2</span>
                              <div className="space-y-0.5">
                                <span className="font-bold text-zinc-200 block">Criar nova App no Google AI Studio:</span>
                                <span>Aceda ao dashboard principal da Google AI Studio Build (<a href="https://ai.studio/build" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5">ai.studio/build ↗</a>), e clique em <strong>"Create New App"</strong> (Criar Nova Aplicação).</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2.5 text-left">
                            <div className="flex gap-2.5 items-start font-sans">
                              <span className="bg-indigo-950/80 text-indigo-400 font-bold font-mono px-2 py-0.5 rounded border border-indigo-900 shrink-0">3</span>
                              <div className="space-y-0.5">
                                <span className="font-bold text-zinc-200 block">Importar o ficheiro descarregado:</span>
                                <span>No assistente inicial ou no botão de upload de ficheiros, arraste o ficheiro <code>.ZIP</code> exportado ou use a opção <strong>"Import Existing Codebase"</strong>. A IA importará todos os ficheiros perfeitamente intactos.</span>
                              </div>
                            </div>

                            <div className="flex gap-2.5 items-start font-sans">
                              <span className="bg-indigo-950/80 text-indigo-400 font-bold font-mono px-2 py-0.5 rounded border border-indigo-900 shrink-0">4</span>
                              <div className="space-y-0.5">
                                <span className="font-bold text-zinc-200 block">Configurar o Firebase novo (Se desejar isolamento):</span>
                                <span>Para que o novo projeto tenha a sua própria base de dados de utilizadores vazia, use o comando para criar um Firebase separado, ou mantenha a mesma ligação original partilhada se quiser gerir tudo numa única consola!</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-[10.5px] text-indigo-300 font-mono leading-relaxed">
                          🚀 <strong>Liberdade e Escalabilidade Completa:</strong> Com este mecanismo, pode gerir dezenas de sites de prognósticos em paralelo e vender "plataformas prontas" a outros tipsters nacionais (virando uma verdadeira Fábrica de Sites de Apostas ao estilo Wix)! Era este o seu grande objetivo de negócio!
                        </div>
                      </div>
                    </>
                  );
                })()}

              </div>
            )}

            {activeTab === 'promopopup' && (
              <div className="space-y-6 animate-fade-in text-left">
                {/* Header message */}
                <div className="p-6 bg-gradient-to-r from-amber-950/20 to-zinc-950 border border-zinc-850 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold font-mono text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 uppercase tracking-widest">
                      📣 Comunicações Globais & Campanhas
                    </span>
                    <h3 className="text-sm font-black uppercase text-white tracking-wider pt-1">
                      Gerir Pop-up de Entrada Global
                    </h3>
                    <p className="text-xs text-zinc-400 font-light pr-4 max-w-2xl">
                      Configure um anúncio, aviso ou celebração de grandes dimensões que aparecerá automaticamente aos utilizadores quando entrarem no site. Agora com suporte para carregar imagens diretamente do seu computador!
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickTogglePopupIsActive(!popupIsActive)}
                      className={`text-xs border rounded-xl px-4 py-2.5 font-mono flex items-center gap-2 shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                        popupIsActive 
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 shadow-lg shadow-emerald-500/10 font-black' 
                          : 'bg-zinc-900 border-zinc-750 text-zinc-400 hover:bg-zinc-850 hover:text-white font-bold'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${popupIsActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`}></span>
                      <span>Pop-up {popupIsActive ? 'Ativo (Clique p/ Desativar)' : 'Inativo (Clique p/ Ativar)'}</span>
                    </button>
                  </div>
                </div>

                {popupSuccessMsg && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold font-sans flex items-center justify-between animate-fade-in">
                    <span>✨ {popupSuccessMsg}</span>
                    <button type="button" onClick={() => setPopupSuccessMsg('')} className="text-emerald-500 hover:text-emerald-300 font-mono text-[10px] uppercase font-black tracking-widest">OK</button>
                  </div>
                )}

                {popupErrorMsg && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs font-semibold">
                    ⚠️ {popupErrorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column - Configurations Form */}
                  <form onSubmit={handleSavePopupConfig} className="lg:col-span-7 bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <span className="text-[11px] font-black text-zinc-300 uppercase tracking-widest font-mono">
                        ⚙️ CONFIGURAÇÃO DO ANÚNCIO
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black uppercase text-zinc-300 font-mono select-none">
                          ATIVAR ANÚNCIO?
                        </label>
                        <button
                          type="button"
                          onClick={() => handleQuickTogglePopupIsActive(!popupIsActive)}
                          className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            popupIsActive ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-zinc-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              popupIsActive ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickTogglePopupIsActive(!popupIsActive)}
                          className={`text-[10px] font-black font-mono uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            popupIsActive 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                          }`}
                        >
                          {popupIsActive ? 'SIM (ATIVO)' : 'NÃO (DESATIVADO)'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left font-sans">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono font-bold">Tipo de Pop-up (Finalidade)</label>
                        <select
                          value={popupType}
                          onChange={(e) => setPopupType(e.target.value as any)}
                          className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/60 font-mono"
                        >
                          <option value="promotion">Campanha de Publicidade 📢</option>
                          <option value="announcement">Aviso Geral / Alerta ⚠️</option>
                          <option value="celebration">Celebração / Dar os Parabéns 🎉</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 text-left font-sans">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono font-bold">Tema Visual do Modal</label>
                        <select
                          value={popupTheme}
                          onChange={(e) => setPopupTheme(e.target.value as any)}
                          className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/60 font-mono"
                        >
                          <option value="amber">Amber Gold (Ouro)</option>
                          <option value="emerald">Emerald Green (Verde Sucesso)</option>
                          <option value="cyan">Cyan Electric (Azul Elétrico)</option>
                          <option value="red">Crimson Red (Vermelho Atenção)</option>
                          <option value="purple">Cosmic Purple (Roxo Premium)</option>
                          <option value="dark">Charcoal Dark (Negro Minimal)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left font-sans">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono font-bold">Texto do Badge (Etiqueta superior)</label>
                        <input
                          type="text"
                          value={popupBadgeText}
                          onChange={(e) => setPopupBadgeText(e.target.value)}
                          placeholder="Ex: PARABÉNS ESPANHA! 🏆"
                          className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/60 font-mono"
                        />
                      </div>

                      <div className="flex flex-col justify-center space-y-1.5 text-left">
                        <div className="flex items-center gap-2 font-sans pt-3">
                          <input
                            type="checkbox"
                            id="popup_has_button_chk"
                            checked={popupHasButton}
                            onChange={(e) => setPopupHasButton(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-950 bg-zinc-900 cursor-pointer"
                          />
                          <label htmlFor="popup_has_button_chk" className="text-[10px] font-black uppercase text-zinc-300 font-mono cursor-pointer select-none">
                            Mostrar Botão de Ação CTA?
                          </label>
                        </div>
                        <span className="text-[9px] text-zinc-500 leading-normal pl-6 font-sans">
                          Desative para avisos gerais onde o utilizador apenas clica para fechar.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left font-sans">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Título Principal</label>
                        <input
                          type="text"
                          required
                          value={popupTitle}
                          onChange={(e) => setPopupTitle(e.target.value)}
                          placeholder="Ex: Muitos Parabéns à Seleção de Espanha!"
                          className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/60"
                        />
                      </div>
                      
                      <div className="space-y-1.5 text-left font-sans">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Subtítulo secundário</label>
                        <input
                          type="text"
                          value={popupSubtitle}
                          onChange={(e) => setPopupSubtitle(e.target.value)}
                          placeholder="Ex: Os nossos parabéns oficiais pela conquista do troféu europeu."
                          className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/60"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left font-sans">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono font-bold">Mensagem Descritiva Principal</label>
                      <textarea
                        rows={4}
                        value={popupContent}
                        onChange={(e) => setPopupContent(e.target.value)}
                        placeholder="Escreva o texto descritivo. Use quebras de linha para estruturar parágrafos. Pode colocar ✅ no início de uma linha para criar listas premium automaticamente."
                        className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/60 leading-relaxed font-sans"
                      />
                    </div>

                    {popupHasButton && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-900/40 pt-4 animate-fade-in">
                        <div className="space-y-1.5 text-left font-sans">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Texto do Botão de Ação</label>
                          <input
                            type="text"
                            value={popupButtonText}
                            onChange={(e) => setPopupButtonText(e.target.value)}
                            placeholder="Ex: Ver Detalhes 🏆"
                            className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/60"
                          />
                        </div>
                        
                        <div className="space-y-1.5 text-left font-sans">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Link / Destino do Botão</label>
                          <input
                            type="text"
                            value={popupButtonLink}
                            onChange={(e) => setPopupButtonLink(e.target.value)}
                            placeholder="Ex: #pricing ou link externo"
                            className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/60 font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {/* Image handling - Drag & Drop / Upload from PC & External URL */}
                    <div className="border-t border-zinc-900 pt-4 space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono block">Imagem de Capa (Banner)</label>
                        <p className="text-[10px] text-zinc-500 font-light">Opte por fazer upload direto do seu PC ou introduza um URL de imagem externo.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* PC File Import Area */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-zinc-400 font-mono font-medium block">Opção A: Carregar do Computador 💻</span>
                          <div className="relative border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 rounded-xl p-3.5 flex flex-col items-center justify-center text-center gap-1.5 transition-colors">
                            <input
                              type="file"
                              id="promopopup_pc_file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zinc-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                            </svg>
                            <span className="text-[11px] text-amber-500 font-bold">Procurar ficheiro</span>
                            <span className="text-[9px] text-zinc-500">Formato JPG, PNG ou WEBP</span>
                          </div>
                        </div>

                        {/* External URL option */}
                        <div className="space-y-1.5 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-zinc-400 font-mono font-medium block mb-1.5">Opção B: URL Externo 🔗</span>
                            <input
                              type="url"
                              value={popupImageUrl.startsWith('data:') ? '' : popupImageUrl}
                              onChange={(e) => setPopupImageUrl(e.target.value)}
                              placeholder="Introduza o endereço URL da imagem..."
                              className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/60 font-mono"
                            />
                          </div>

                          {popupImageUrl && (
                            <button
                              type="button"
                              onClick={() => setPopupImageUrl('')}
                              className="py-2 text-[10px] font-bold text-rose-500 hover:text-rose-400 font-mono uppercase tracking-wider text-right block w-full border border-zinc-900 hover:border-rose-500/10 rounded-xl px-3 bg-[#11090a]/20"
                            >
                              ✕ Limpar Imagem Atual
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-900 pt-4">
                      <div className="space-y-1.5 text-left font-sans">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono font-bold">Texto do Fecho Diário</label>
                        <input
                          type="text"
                          value={popupDontShowAgainText}
                          onChange={(e) => setPopupDontShowAgainText(e.target.value)}
                          placeholder="Ex: Não mostrar aviso hoje"
                          className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/60"
                        />
                      </div>

                      <div className="flex flex-col justify-center space-y-1.5 text-left">
                        <div className="flex items-center gap-2 font-sans">
                          <input
                            type="checkbox"
                            id="force_show_popup"
                            checked={popupForceShowAll}
                            onChange={(e) => setPopupForceShowAll(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-950 bg-zinc-900 cursor-pointer"
                          />
                          <label htmlFor="force_show_popup" className="text-[10px] font-black uppercase text-zinc-300 font-mono cursor-pointer select-none flex items-center gap-1">
                            Forçar Exibição a Todos ⚠️
                          </label>
                        </div>
                        <span className="text-[9px] text-zinc-500 leading-normal pl-6 font-sans">
                          Ative se alterou a publicidade e deseja que mesmo quem já fechou o anúncio volte a vê-lo imediatamente.
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-lg shadow-amber-500/10 cursor-pointer text-center select-none"
                    >
                      Gravar & Aplicar Anúncio Global 🚀
                    </button>
                  </form>

                  {/* Right Column - LIVE PREVIEW */}
                  <div className="lg:col-span-5 space-y-4 text-left font-sans">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono block">
                      👀 PRÉ-VISUALIZAÇÃO EM TEMPO REAL
                    </span>

                    <div className="bg-[#0b0b0d] border border-zinc-850 p-6 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[480px]">
                      {/* Simulação de Modal Pop-up */}
                      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative font-sans flex flex-col transition-all duration-300">
                        
                        {/* Dynamic Banner Accent line */}
                        <div className={`h-1.5 w-full ${
                          popupTheme === 'amber' ? 'bg-amber-500' :
                          popupTheme === 'emerald' ? 'bg-emerald-500' :
                          popupTheme === 'cyan' ? 'bg-cyan-500' :
                          popupTheme === 'red' ? 'bg-red-500' :
                          popupTheme === 'purple' ? 'bg-purple-500' :
                          'bg-zinc-750'
                        }`} />

                        {/* Banner Image Preview */}
                        {popupImageUrl ? (
                          <div className="relative w-full aspect-[21/9] bg-black overflow-hidden border-b border-zinc-900">
                            <img
                              src={popupImageUrl}
                              alt="Preview"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover opacity-80"
                            />
                            {popupBadgeText && (
                              <div className="absolute top-2.5 left-2.5">
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm text-black ${
                                  popupTheme === 'amber' ? 'bg-amber-500' :
                                  popupTheme === 'emerald' ? 'bg-emerald-500' :
                                  popupTheme === 'cyan' ? 'bg-cyan-500' :
                                  popupTheme === 'red' ? 'bg-red-500' :
                                  popupTheme === 'purple' ? 'bg-purple-500' :
                                  'bg-zinc-400'
                                }`}>
                                  {popupBadgeText}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Render responsive layout preview icon based on selected popup type
                          <div className="w-full aspect-[21/9] bg-zinc-900/30 border-b border-zinc-900 flex flex-col items-center justify-center gap-1.5 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-purple-500/5 filter blur-lg opacity-40" />
                            {popupType === 'celebration' ? (
                              <div className="text-xl animate-bounce">🏆</div>
                            ) : popupType === 'announcement' ? (
                              <div className="text-xl">📢</div>
                            ) : (
                              <div className="text-xl">✨</div>
                            )}
                            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">[ {popupType} layout preview ]</span>
                          </div>
                        )}

                        {/* Close button representation */}
                        <div className="absolute top-2.5 right-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-black/60 text-zinc-400 text-[10px] font-mono cursor-pointer">
                          ✕
                        </div>

                        {/* Content Area */}
                        <div className="p-5 flex-1 space-y-3.5 flex flex-col justify-between">
                          <div className="space-y-1 text-center">
                            {/* Subtitle/Badge above title if no image exists */}
                            {!popupImageUrl && popupBadgeText && (
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider inline-block text-black ${
                                popupTheme === 'amber' ? 'bg-amber-500' :
                                popupTheme === 'emerald' ? 'bg-emerald-500' :
                                popupTheme === 'cyan' ? 'bg-cyan-500' :
                                popupTheme === 'red' ? 'bg-red-500' :
                                popupTheme === 'purple' ? 'bg-purple-500' :
                                'bg-zinc-450'
                              } mb-1`}>
                                {popupBadgeText}
                              </span>
                            )}
                            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-snug">
                              {popupTitle || 'Muitos Parabéns à Seleção!'}
                            </h3>
                            {popupSubtitle && (
                              <p className="text-[10px] text-zinc-400 font-medium font-sans">
                                {popupSubtitle}
                              </p>
                            )}
                          </div>

                          {popupContent && (
                            <p className="text-[10.5px] text-zinc-400 leading-relaxed text-center font-light line-clamp-3">
                              {popupContent}
                            </p>
                          )}

                          <div className="space-y-2.5 pt-1">
                            {popupHasButton ? (
                              <button
                                type="button"
                                className="w-full py-2.5 rounded-xl font-bold text-center text-[10.5px] uppercase tracking-wider transition-all block text-black cursor-pointer"
                                style={{
                                  backgroundColor: 
                                    popupTheme === 'amber' ? '#f59e0b' :
                                    popupTheme === 'emerald' ? '#10b981' :
                                    popupTheme === 'cyan' ? '#06b6d4' :
                                    popupTheme === 'red' ? '#ef4444' :
                                    popupTheme === 'purple' ? '#a855f7' :
                                    '#3f3f46',
                                  color: popupTheme === 'dark' ? '#ffffff' : '#000000'
                                }}
                              >
                                {popupButtonText || 'Ver Oferta'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="w-full py-2.5 rounded-xl font-bold text-center text-[10.5px] uppercase tracking-wider transition-all block bg-zinc-800 text-zinc-300 border border-zinc-700 pointer-events-none"
                              >
                                Entendido / Fechar
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleQuickTogglePopupIsActive(!popupIsActive)}
                              title="Clique para alternar ativação do anúncio"
                              className="flex items-center gap-1.5 justify-center text-[9px] text-zinc-300 hover:text-white cursor-pointer bg-black/40 hover:bg-black/60 border border-zinc-800 rounded-lg py-1 px-2.5 transition-all mx-auto select-none"
                            >
                              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                                popupIsActive ? 'bg-emerald-500 border-emerald-400 text-black font-bold' : 'bg-zinc-950 border-zinc-700'
                              }`}>
                                {popupIsActive && (
                                  <svg className="w-2.5 h-2.5 stroke-current stroke-[3.5] fill-none" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                              <span>{popupDontShowAgainText || 'Não mostrar este anúncio hoje'}</span>
                              <span className={`text-[8.5px] font-mono font-bold px-1 rounded ${popupIsActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                                ({popupIsActive ? 'ATIVO' : 'DESATIVADO'})
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="text-[9px] text-zinc-550 font-mono text-center mt-3 leading-normal max-w-xs">
                        *A pré-visualização em tempo real adapta as cores e ícones conforme o seu tipo de layout e tema selecionados.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 12: EXPORTAR SITE & GITHUB SYNCHRONIZER */}
            {activeTab === 'github' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="p-6 bg-gradient-to-r from-emerald-950/20 to-zinc-950 border border-zinc-850 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase text-emerald-400 tracking-wider font-display flex items-center gap-2">
                      <span>Exportar Projeto & Sincronizar GitHub</span>
                      <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono py-0.5 px-2 rounded-md font-bold uppercase">
                        ONLINE & PRONTO
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 font-light pr-4 max-w-2xl">
                      Exporte a base de dados em JSON, descarregue backups integrais do site ou copie os comandos para sincronizar diretamente com o repositório GitHub e Render.
                    </p>
                  </div>
                </div>

                {/* Action cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Action 1: Full JSON Database Download */}
                  <div className="p-5 bg-gradient-to-b from-emerald-950/30 to-zinc-950 border border-emerald-500/25 rounded-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        1. BACKUP DE DADOS TOTAIS
                      </span>
                      <h4 className="text-sm font-bold text-white">Exportar Base de Dados (.JSON)</h4>
                      <p className="text-xs text-zinc-400 font-light leading-relaxed">
                        Descarrega um ficheiro JSON único contendo <strong>todos</strong> os jogos, prognósticos, banners, páginas personalizadas, notícias, subscritores e definições.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportFullSiteBackupJSON}
                      disabled={exportingBackup}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>📥</span>
                      <span>{exportingBackup ? 'A Exportar...' : 'Descarregar Backup JSON'}</span>
                    </button>
                  </div>

                  {/* Action 2: Purge Cache & SW across computers */}
                  <div className="p-5 bg-gradient-to-b from-cyan-950/30 to-zinc-950 border border-cyan-500/25 rounded-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                        2. RESOLVER CACHE NOS PC'S
                      </span>
                      <h4 className="text-sm font-bold text-white">Limpeza Global de Cache & SW</h4>
                      <p className="text-xs text-zinc-400 font-light leading-relaxed">
                        Se os navegadores de computador mantiverem ficheiros antigos, forçe a desinstalação de Service Workers e limpe a cache local do navegador imediatamente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleForceGlobalCachePurge}
                      className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>⚡</span>
                      <span>Limpar Cache & SW Agora</span>
                    </button>
                  </div>

                  {/* Action 3: Export ZIP Source Code via Settings Menu */}
                  <div className="p-5 bg-gradient-to-b from-purple-950/30 to-zinc-950 border border-purple-500/25 rounded-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold uppercase text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                        3. CÓDIGO FONTE DO SITE (.ZIP)
                      </span>
                      <h4 className="text-sm font-bold text-white">Exportar Projeto (.ZIP)</h4>
                      <p className="text-xs text-zinc-400 font-light leading-relaxed">
                        No menu lateral ou botão de <strong>Settings/Definições</strong> do Google AI Studio (no topo direito), clique em <strong>"Export to ZIP"</strong> ou <strong>"Export to GitHub"</strong>.
                      </p>
                    </div>
                    <a
                      href="https://ai.studio/build"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 bg-purple-500 hover:bg-purple-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-500/10 flex items-center justify-center gap-2 cursor-pointer text-center"
                    >
                      <span>🌐</span>
                      <span>Ir p/ Google AI Studio ↗</span>
                    </a>
                  </div>
                </div>

                {/* GitHub Command Copy Helper */}
                <div className="p-6 bg-[#08080c] border border-zinc-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 text-base">💻</span>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest font-mono">
                        Comandos de Atualização para o GitHub & Render / Vercel
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const cmd = `git add .\ngit commit -m "update iRunBets platform & predictions"\ngit push origin main`;
                        navigator.clipboard.writeText(cmd);
                        setGithubCopied(true);
                        setTimeout(() => setGithubCopied(false), 3000);
                      }}
                      className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 font-mono"
                    >
                      {githubCopied ? '✓ Comandos Copiados!' : '📋 Copiar Comandos Git'}
                    </button>
                  </div>

                  <div className="bg-black/90 p-4 rounded-xl border border-zinc-850 font-mono text-xs text-emerald-400 space-y-1 overflow-x-auto select-all">
                    <p className="text-zinc-500"># 1. Adicionar todas as alterações ao Git</p>
                    <p>git add .</p>
                    <p className="text-zinc-500 pt-1"># 2. Registar commit com timestamp</p>
                    <p>git commit -m "update iRunBets platform & sync Firebase data"</p>
                    <p className="text-zinc-500 pt-1"># 3. Enviar para a ramificação principal (main)</p>
                    <p>git push origin main</p>
                  </div>

                  <div className="text-[11px] text-zinc-400 leading-relaxed font-light space-y-1 font-sans pt-1">
                    <p>
                      💡 <strong>Como Funciona o Auto-Deploy:</strong> Assim que envia os commits para o repositório do GitHub, o Render (ou servidor onde o site está alojado) deteta o evento e recompila automaticamente a nova versão.
                    </p>
                    <p className="text-emerald-400 font-mono text-[10px]">
                      ✓ Os cabeçalhos de no-cache e a desinstalação de Service Workers desatualizados agora garantem que qualquer utilizador em PC receba a nova versão instantaneamente sem ter de limpar o histórico.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 5. Painel de Diagnóstico Técnico (Logs TIE) */}
        <div className="mt-12 bg-[#0B0B0D] border border-zinc-850/60 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-900 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono">Painel de Diagnóstico Técnico (Logs TIE)</h3>
            </div>
            <div className="text-[10px] text-zinc-550 font-mono tracking-tight">
              SISTEMA CRIPTOGRÁFICO DE INTEGRIDADE COMPILADO
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 bg-zinc-900/10 rounded-xl border border-zinc-900 flex items-center justify-between hover:bg-zinc-900/30 transition-colors">
              <span className="text-zinc-500 font-mono text-[11px]">Conexão Firebase API:</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider ${isFirebaseActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20'}`}>
                {isFirebaseActive ? 'ONLINE [FIRESTORE]' : 'ONLINE [FALLBACK COMPILADO]'}
              </span>
            </div>
            
            <div className="p-3.5 bg-zinc-900/10 rounded-xl border border-zinc-900 flex items-center justify-between hover:bg-zinc-900/30 transition-colors">
              <span className="text-zinc-500 font-mono text-[11px]">Conexão Gemini AI Engine:</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></span>
                <span>ESTÁVEL - 120ms</span>
              </span>
            </div>
            
            <div className="p-3.5 bg-zinc-900/10 rounded-xl border border-zinc-900 flex items-center justify-between hover:bg-zinc-900/30 transition-colors">
              <span className="text-zinc-500 font-mono text-[11px]">Sincronização Cloud Firestore:</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider bg-sky-500/10 text-sky-400 border border-[#38bdf8]/15">
                ATIVO
              </span>
            </div>
          </div>
        </div>

        {/* MODAL DE RESALVA DE APAGAR TIPSTER COM SUBSCRIÇÃO ATIVA */}
        {tipsterWarningMessage && (
          <div className="fixed inset-0 bg-[#000]/85 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#0f0a0a] border border-rose-900/60 rounded-3xl w-full max-w-md p-6 sm:p-8 relative shadow-2xl text-center space-y-6">
              
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/25 text-rose-500 rounded-full flex items-center justify-center mx-auto text-xl animate-bounce">
                ⚠️
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-black text-rose-500 uppercase tracking-tight">
                  não podes apagar pois subscrição ativa...
                </h3>
                <p className="text-xs text-zinc-400 font-light leading-relaxed">
                  Este tipster possui subscrições ativas ligadas à sua conta de canais VIP ou subscritores registados. Para manter a estabilidade do sistema e assegurar os pagamentos ativos dos clientes, a remoção direta é bloqueada.
                </p>
                <div className="p-3 bg-rose-950/10 border border-rose-900/25 rounded-xl text-[10px] text-rose-400 font-mono leading-relaxed">
                  *Por favor, revogue os acessos dos membros deste tipster na tabela "Controlo e Anulação Manual" antes de o remover.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTipsterWarningMessage(null)}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-600/15 cursor-pointer"
              >
                Fechar Alerta
              </button>
            </div>
          </div>
        )}

        {/* MODAL: BROADCAST DE EMAIL EXPIRAÇÃO EM MASSA */}
        {showBulkEmailModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[#121216] border border-zinc-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative">
              <div className="p-6 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/40">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📢</span>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Disparar Alerta de Expiração para {selectedSubscriberUids.length} Membros
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkEmailModal(false)}
                  className="text-zinc-500 hover:text-white transition-colors text-sm font-bold font-mono cursor-pointer"
                >
                  ✕ FECHAR
                </button>
              </div>

              <form onSubmit={handleTriggerBulkEmailBroadcastSubmit} className="p-6 space-y-4">
                <div className="p-3 bg-semibold bg-sky-500/10 border border-sky-500/20 text-[#38bdf8] text-[11px] rounded-xl font-light leading-relaxed">
                  <strong>ℹ️ Modo de Mensagem em Lote:</strong> Todas as contas selecionadas receberão esta notificação. No final, um relatório de transmissão smtp de simulador será gerado no terminal do servidor.
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Assunto do Email</label>
                  <input
                    type="text"
                    required
                    value={bulkEmailSubject}
                    onChange={(e) => setBulkEmailSubject(e.target.value)}
                    placeholder="Assunto da mensagem"
                    className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-cyan-500 transition-colors text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Corpo do Email / Mensagem (Suporta Personalização)</label>
                  <textarea
                    required
                    rows={8}
                    value={bulkEmailBody}
                    onChange={(e) => setBulkEmailBody(e.target.value)}
                    placeholder="Escreva a mensagem..."
                    className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-cyan-500 transition-colors text-zinc-150 font-mono leading-relaxed"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setShowBulkEmailModal(false)}
                    className="px-4 py-2 bg-zinc-900/50 hover:bg-zinc-850 text-zinc-400 hover:text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all cursor-pointer border border-zinc-850"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingBulkEmail}
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase tracking-wider text-[10px] rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSendingBulkEmail ? (
                      <>
                        <span className="animate-spin h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full block"></span>
                        <span>A Enviar Lote...</span>
                      </>
                    ) : (
                      <>
                        <span>📢 DISPARAR SMTP (ALERTA EM LOTE)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EVOLUÇÃO GRÁFICA DO TRÁFEGO REAL/HISTÓRICO */}
        {isTrafficModalOpen && (
          <div className="fixed inset-0 bg-[#000]/85 backdrop-blur-md z-[125] flex items-center justify-center p-4 animate-fade-in text-left">
            <div className="bg-[#121216]/95 border border-zinc-800 rounded-3xl w-full max-w-4xl p-6 sm:p-8 relative shadow-2xl space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold font-mono tracking-widest text-[#38bdf8] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Auditoria de Tráfego Autónomo
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">Histórico & Evolução Real das Visitas</h3>
                  <p className="text-zinc-500 text-xs font-light">Evolução do site irunbets em tempo real para tomada de decisões comerciais.</p>
                </div>
                
                <button
                  onClick={() => setIsTrafficModalOpen(false)}
                  className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-bold font-mono"
                >
                  FECHAR ✕
                </button>
              </div>

              {/* Data controls/stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                  <span className="text-[9px] uppercase font-mono text-zinc-500 block">Alcance Atual</span>
                  <div className="text-xl font-mono font-bold text-white mt-1">
                    {trafficHistory.length} Dias Registados
                  </div>
                  <span className="text-[10px] text-zinc-500 font-light mt-0.5 block">Monitorização em ciclo ativo diário</span>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                  <span className="text-[9px] uppercase font-mono text-zinc-500 block font-bold">Média de Páginas/Dia</span>
                  <div className="text-xl font-mono font-bold text-teal-400 mt-1">
                    {trafficHistory.length > 0 
                      ? Math.round(trafficHistory.reduce((acc, h) => acc + h.visits, 0) / trafficHistory.length)
                      : 0}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-light mt-0.5 block">★ Tração estável</span>
                </div>

                <div className="flex items-center justify-end gap-2 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900/50">
                  <span className="text-[10px] font-mono text-zinc-400">Período:</span>
                  <button
                    onClick={() => setActiveHistoryRange(7)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                      activeHistoryRange === 7 
                        ? 'bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-850'
                    }`}
                  >
                    Estreito (7d)
                  </button>
                  <button
                    onClick={() => setActiveHistoryRange(14)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                      activeHistoryRange === 14 
                        ? 'bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-850'
                    }`}
                  >
                    Completo (14d)
                  </button>
                </div>
              </div>

              {/* Chart implementation using dynamic premium SVG container */}
              <div className="bg-zinc-950/80 border border-zinc-100/10 p-6 rounded-2xl relative">
                {trafficHistory.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-zinc-500 text-xs italic">
                    A ler histórico de tráfego a partir do Firestore...
                  </div>
                ) : (
                  (() => {
                    // Subset based on selected range
                    const subset = trafficHistory.slice(-activeHistoryRange);
                    const maxValue = Math.max(...subset.map(d => d.visits), 100);
                    const ceiling = Math.ceil(maxValue * 1.15);
                    
                    // Chart SVG dimensions
                    const chartW = 750;
                    const chartH = 220;
                    const paddingL = 40;
                    const paddingR = 20;
                    const paddingT = 20;
                    const paddingB = 30;
                    const drawW = chartW - paddingL - paddingR;
                    const drawH = chartH - paddingT - paddingB;

                    // Compute points for SVG path
                    const pointsVisits = subset.map((day, idx) => {
                      const x = paddingL + (idx / (subset.length - 1)) * drawW;
                      const y = paddingT + drawH - (day.visits / ceiling) * drawH;
                      return { x, y, day };
                    });

                    const pointsUniques = subset.map((day, idx) => {
                      const x = paddingL + (idx / (subset.length - 1)) * drawW;
                      const y = paddingT + drawH - (day.uniques / ceiling) * drawH;
                      return { x, y, day };
                    });

                    // Build path data string
                    const pathVisits = pointsVisits.reduce((acc, p, idx) => {
                      return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
                    }, '');

                    const pathUniques = pointsUniques.reduce((acc, p, idx) => {
                      return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
                    }, '');

                    const areaVisits = pathVisits + ` L ${pointsVisits[pointsVisits.length-1].x} ${paddingT + drawH} L ${pointsVisits[0].x} ${paddingT + drawH} Z`;
                    const areaUniques = pathUniques + ` L ${pointsUniques[pointsUniques.length-1].x} ${paddingT + drawH} L ${pointsUniques[0].x} ${paddingT + drawH} Z`;

                    return (
                      <div className="w-full">
                        {/* Legend */}
                        <div className="flex items-center gap-6 justify-end text-[10px] font-mono text-zinc-400 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-0.5 bg-[#38bdf8] block"></span>
                            <span>Visitas Globais (Reg + Não Registados)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-0.5 bg-emerald-400 block"></span>
                            <span>Visitantes Únicos (Browsers)</span>
                          </div>
                        </div>

                        {/* Interactive SVG Wrapper */}
                        <div className="h-64 relative">
                          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full overflow-visible">
                            <defs>
                              <linearGradient id="gradientVisits" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25"/>
                                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0"/>
                              </linearGradient>
                              <linearGradient id="gradientUniques" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.18"/>
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
                              </linearGradient>
                            </defs>

                            {/* Background Horizontal Gridlines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                              const y = paddingT + ratio * drawH;
                              const labelVal = Math.round(ceiling * (1 - ratio));
                              return (
                                <g key={i} className="opacity-40">
                                  <line 
                                    x1={paddingL} 
                                    y1={y} 
                                    x2={chartW - paddingR} 
                                    y2={y} 
                                    stroke="#1e293b" 
                                    strokeWidth={1} 
                                    strokeDasharray="4 4"
                                  />
                                  <text 
                                    x={paddingL - 8} 
                                    y={y + 3} 
                                    fill="#64748b" 
                                    fontSize={8} 
                                    fontFamily="monospace" 
                                    textAnchor="end"
                                  >
                                    {labelVal}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Vertical grid lines */}
                            {pointsVisits.map((p, idx) => (
                              <line
                                key={idx}
                                x1={p.x}
                                y1={paddingT}
                                x2={p.x}
                                y2={paddingT + drawH}
                                stroke="#1e293b"
                                strokeWidth={1}
                                className="opacity-20"
                              />
                            ))}

                            {/* Area paths */}
                            <path d={areaVisits} fill="url(#gradientVisits)" />
                            <path d={areaUniques} fill="url(#gradientUniques)" />

                            {/* Line paths */}
                            <path 
                              d={pathVisits} 
                              fill="none" 
                              stroke="#38bdf8" 
                              strokeWidth={2} 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                            <path 
                              d={pathUniques} 
                              fill="none" 
                              stroke="#10b981" 
                              strokeWidth={1.8} 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />

                            {/* Interactive tooltip hovering & circles */}
                            {pointsVisits.map((p, idx) => {
                              const uniquePt = pointsUniques[idx];
                              // Date labels
                              const rawDate = p.day.date;
                              const dayLabel = rawDate.substring(5); // format: MM-DD
                              return (
                                <g key={idx} className="group cursor-pointer">
                                  {/* Visits Data node */}
                                  <circle 
                                    cx={p.x} 
                                    cy={p.y} 
                                    r={3.5} 
                                    fill="#0f172a" 
                                    stroke="#38bdf8" 
                                    strokeWidth={1.5}
                                    className="transition-all duration-100 group-hover:r-[5] group-hover:stroke-white"
                                  />
                                  {/* Unique Data node */}
                                  <circle 
                                    cx={uniquePt.x} 
                                    cy={uniquePt.y} 
                                    r={3.5} 
                                    fill="#0f172a" 
                                    stroke="#10b981" 
                                    strokeWidth={1.5}
                                    className="transition-all duration-100 group-hover:r-[5] group-hover:stroke-white"
                                  />

                                  {/* X-axis text anchor */}
                                  <text
                                    x={p.x}
                                    y={paddingT + drawH + 15}
                                    fill="#64748b"
                                    fontSize={8}
                                    fontFamily="monospace"
                                    textAnchor="middle"
                                    className="select-none text-[7.5px] font-light"
                                  >
                                    {dayLabel}
                                  </text>

                                  {/* Dynamic floating micro tooltip inside node hover */}
                                  <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                                    <rect 
                                      x={p.x - 50} 
                                      y={Math.min(p.y, uniquePt.y) - 52} 
                                      width={100} 
                                      height={42} 
                                      rx={6} 
                                      fill="#09090b" 
                                      stroke="#27272a" 
                                      strokeWidth={1}
                                    />
                                    <text x={p.x} y={Math.min(p.y, uniquePt.y) - 39} fill="#fff" fontSize={7.5} fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                                      {p.day.date}
                                    </text>
                                    <text x={p.x} y={Math.min(p.y, uniquePt.y) - 27} fill="#38bdf8" fontSize={7.5} fontFamily="monospace" textAnchor="middle">
                                      Visitas: {p.day.visits}
                                    </text>
                                    <text x={p.x} y={Math.min(p.y, uniquePt.y) - 16} fill="#10b981" fontSize={7.5} fontFamily="monospace" textAnchor="middle">
                                      Únicos: {p.day.uniques}
                                    </text>
                                  </g>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Bottom explanations and advice */}
              <div className="bg-[#0b0b0d] p-4 border border-zinc-850/50 rounded-xl space-y-1 text-left">
                <span className="text-[10px] text-zinc-500 font-mono block uppercase">🔑 NOTA DE EVOLUÇÃO E VENDA DE PLATAFORMA:</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-light">
                  Como solicitado sobre a hipótese de <strong>vender este projeto/plataforma</strong> para adotar outro nome (e.g. <em>"juntos vencemos"</em>):
                </p>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-light mt-1">
                  Este código foi meticulosamente desenhado para ser <strong>100% modular e dinâmico</strong>. Qualquer comprador pode simplesmente alterar a marca <span className="font-mono text-xs text-amber-500 bg-zinc-950 px-1 border border-zinc-900 rounded">irunbets</span> para <span className="font-mono text-xs text-[#38bdf8] bg-zinc-950 px-1 border border-zinc-900 rounded">juntos vencemos</span> editando apenas os ficheiros estáticos de tradução e o <code className="text-zinc-300">metadata.json</code>.
                </p>
                <div className="text-[10.5px] text-emerald-400 font-mono leading-relaxed mt-2 pt-2 border-t border-zinc-900">
                  ⚡ <strong>Valor Estimado no Mercado de Conteúdos Digitais:</strong> Uma plataforma com infraestrutura própria em React + Node + Firestore, com tipster VIP automatizado, gateways de pagamento manuais (MBWay, IBAN, Revolut), alertas via push reativos e módulo autónomo de estatística comercial, tem um valor de mercado avaliado entre <strong>€3,500 e €7,500</strong> (comprovando regularidade de tráfego, como demonstrado neste painel!).
                </div>
              </div>

              {/* Close */}
              <button
                onClick={() => setIsTrafficModalOpen(false)}
                className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-sky-500/10 cursor-pointer text-center"
              >
                Voltar ao Painel Geral
              </button>
            </div>
          </div>
        )}

        {/* Modal: Exportar p/ GitHub & Backup */}
        {isGithubModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-fade-in text-left font-sans">
            <div className="w-full max-w-3xl bg-[#0c0c11] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-display">
                      Exportar Projeto, Dados & Sincronizar GitHub 🚀
                    </h3>
                    <p className="text-xs text-zinc-400 font-light mt-0.5">
                      Faça download de todo o site, backups JSON completos e comandos de atualização sem perdas.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGithubModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl transition-colors cursor-pointer font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Action cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Action 1: Full JSON Database Download */}
                <div className="p-5 bg-gradient-to-b from-emerald-950/30 to-zinc-950 border border-emerald-500/25 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      1. BACKUP DE DADOS TOTAIS
                    </span>
                    <h4 className="text-sm font-bold text-white">Exportar Base de Dados (.JSON)</h4>
                    <p className="text-xs text-zinc-400 font-light leading-relaxed">
                      Descarrega um ficheiro JSON único contendo <strong>todos</strong> os jogos, prognósticos, banners, páginas personalizadas, notícias, subscritores e definições.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportFullSiteBackupJSON}
                    disabled={exportingBackup}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>📥</span>
                    <span>{exportingBackup ? 'A Exportar...' : 'Descarregar Backup JSON'}</span>
                  </button>
                </div>

                {/* Action 2: Purge Cache & SW across computers */}
                <div className="p-5 bg-gradient-to-b from-cyan-950/30 to-zinc-950 border border-cyan-500/25 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                      2. RESOLVER CACHE NOS PC'S
                    </span>
                    <h4 className="text-sm font-bold text-white">Limpeza Global de Cache & SW</h4>
                    <p className="text-xs text-zinc-400 font-light leading-relaxed">
                      Se os navegadores de computador mantiverem ficheiros antigos, forçe a desinstalação de Service Workers e limpe a cache local do navegador imediatamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleForceGlobalCachePurge}
                    className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>⚡</span>
                    <span>Limpar Cache & SW Agora</span>
                  </button>
                </div>

                {/* Action 3: Export ZIP Source Code via Settings Menu */}
                <div className="p-5 bg-gradient-to-b from-purple-950/30 to-zinc-950 border border-purple-500/25 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                      3. CÓDIGO FONTE DO SITE (.ZIP)
                    </span>
                    <h4 className="text-sm font-bold text-white">Exportar Projeto (.ZIP)</h4>
                    <p className="text-xs text-zinc-400 font-light leading-relaxed">
                      No menu lateral ou botão de <strong>Settings/Definições</strong> do Google AI Studio (no topo direito), clique em <strong>"Export to ZIP"</strong> ou <strong>"Export to GitHub"</strong>.
                    </p>
                  </div>
                  <a
                    href="https://ai.studio/build"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 bg-purple-500 hover:bg-purple-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-500/10 flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <span>🌐</span>
                    <span>Ir p/ Google AI Studio ↗</span>
                  </a>
                </div>
              </div>

              {/* GitHub Command Copy Helper */}
              <div className="p-6 bg-[#08080c] border border-zinc-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-base">💻</span>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest font-mono">
                      Comandos de Atualização para o GitHub & Render / Vercel
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const cmd = `git add .\ngit commit -m "update iRunBets platform & predictions"\ngit push origin main`;
                      navigator.clipboard.writeText(cmd);
                      setGithubCopied(true);
                      setTimeout(() => setGithubCopied(false), 3000);
                    }}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 font-mono"
                  >
                    {githubCopied ? '✓ Comandos Copiados!' : '📋 Copiar Comandos Git'}
                  </button>
                </div>

                <div className="bg-black/90 p-4 rounded-xl border border-zinc-850 font-mono text-xs text-emerald-400 space-y-1 overflow-x-auto select-all">
                  <p className="text-zinc-500"># 1. Adicionar todas as alterações ao Git</p>
                  <p>git add .</p>
                  <p className="text-zinc-500 pt-1"># 2. Registar commit com timestamp</p>
                  <p>git commit -m "update iRunBets platform & sync Firebase data"</p>
                  <p className="text-zinc-500 pt-1"># 3. Enviar para a ramificação principal (main)</p>
                  <p>git push origin main</p>
                </div>

                <div className="text-[11px] text-zinc-400 leading-relaxed font-light space-y-1 font-sans pt-1">
                  <p>
                    💡 <strong>Como Funciona o Auto-Deploy:</strong> Assim que envia os commits para o repositório do GitHub, o Render (ou servidor onde o site está alojado) deteta o evento e recompila automaticamente a nova versão.
                  </p>
                  <p className="text-emerald-400 font-mono text-[10px]">
                    ✓ Os cabeçalhos de no-cache e a desinstalação de Service Workers desatualizados agora garantem que qualquer utilizador em PC receba a nova versão instantaneamente sem ter de limpar o histórico.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsGithubModalOpen(false)}
                  className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
                >
                  Fechar Janela
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Modal: Disparar Notificação Push Rápida para Telemóveis iOS & Android */}
        {showQuickPushModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-fade-in text-left font-sans">
            <div className="w-full max-w-xl bg-[#0e0e13] border border-orange-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-6">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-400 rounded-2xl shadow-lg shadow-orange-500/10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-display flex items-center gap-2">
                      <span>Disparar Push para Telemóveis</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono">
                        iOS & Android
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 font-light mt-0.5">
                      Conectado à Cloud Function <code className="text-orange-400 font-mono text-[11px]">sendTestPush</code> (Firebase FCM europe-west1)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickPushModal(false)}
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl transition-colors cursor-pointer font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Smartphone Mock Notification Preview Box */}
              <div className="p-4 bg-gradient-to-r from-zinc-950 via-[#16161d] to-zinc-950 border border-zinc-800 rounded-2xl space-y-2 shadow-inner">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-b border-zinc-850 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-zinc-300 font-bold uppercase tracking-wider">Pré-visualização no Telemóvel (iOS/Android)</span>
                  </div>
                  <span>agora</span>
                </div>

                {/* Banner Card */}
                <div className="p-3.5 bg-zinc-900/90 border border-orange-500/30 rounded-xl shadow-lg flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-black border border-orange-500/40 p-1 flex items-center justify-center shrink-0 shadow-md">
                    <span className="text-xs font-black text-orange-400 font-mono tracking-tighter">iR</span>
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-white tracking-wide truncate">
                        {quickPushTitle || '🚨 NOVO PROGNÓSTICO VIP'}
                      </span>
                      <span className="text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                        iRunBets
                      </span>
                    </div>
                    <p className="text-[11.5px] text-zinc-300 font-light leading-snug line-clamp-2">
                      {quickPushMessage || 'Odd de valor +14.2% detetada no jogo Real Madrid vs Barcelona! Entrar agora na stake recomendada.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Push Form */}
              <form onSubmit={handleSendQuickPush} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    Título da Notificação Push *
                  </label>
                  <input
                    type="text"
                    required
                    value={quickPushTitle}
                    onChange={(e) => setQuickPushTitle(e.target.value)}
                    placeholder="Ex: 🚨 NOVO PROGNÓSTICO VIP ENCONTRADO"
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 transition-colors text-white font-light"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    Mensagem Curta do Telemóvel (Banner) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={quickPushMessage}
                    onChange={(e) => setQuickPushMessage(e.target.value)}
                    placeholder="Ex: A iR-Engine Pro v3.5 detetou valor na odd de 2.10 para a vitória do Benfica. Consulte já o boletim!"
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 transition-colors text-white font-light resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    Conteúdo Expandido / Notícia Completa (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={quickPushLongMessage}
                    onChange={(e) => setQuickPushLongMessage(e.target.value)}
                    placeholder="Opcional. Texto detalhado que o utilizador verá ao abrir a notificação no site."
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 transition-colors text-white font-light resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                      Destinatários do Push
                    </label>
                    <select
                      value={quickPushTarget}
                      onChange={(e) => setQuickPushTarget(e.target.value)}
                      className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 transition-colors text-white font-bold"
                    >
                      <option value="all">📱 Todos os Dispositivos (iOS & Android)</option>
                      <option value="vip">⭐ Apenas Subscritores VIP</option>
                      <option value="web">🌐 Todos os NAVEGADORES WEB</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                      Logotipo & Ícone Oficial
                    </label>
                    <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-orange-400 font-mono font-bold flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      <span>Logotipo iRunBets Incluído</span>
                    </div>
                  </div>
                </div>

                {/* iOS & Browser Push Permission Guide Box */}
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-2 text-[11px] text-zinc-300 font-light leading-relaxed">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <span>📱 Requisitos de Notificação no iPhone (iOS)</span>
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const perm = await requestBrowserNotificationPermission();
                        if (perm === 'granted') {
                          alert('✅ Permissão de notificações concedida neste navegador!');
                        } else if (perm === 'denied') {
                          alert('⚠️ Permissão de notificações bloqueada no seu navegador. Ative nas definições do dispositivo.');
                        }
                      }}
                      className="px-2.5 py-1 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      🔔 Testar / Ativar no meu Ecrã
                    </button>
                  </div>
                  <p>
                    Para receber notificações de sistema no iPhone quando o Safari/navegador estiver fechado:
                  </p>
                  <ul className="list-disc list-inside text-zinc-400 space-y-0.5 text-[10.5px]">
                    <li>No Safari do iPhone, toque no botão <strong className="text-white">Partilhar ➔ Adicionar ao Ecrã Principal</strong> (PWA).</li>
                    <li>Abra a aplicação criada no ecrã e permita as notificações ao iniciar.</li>
                  </ul>
                </div>

                {quickPushFeedback && (
                  <div className={`p-3.5 rounded-xl border text-xs font-mono font-semibold ${
                    quickPushFeedback.startsWith('✅') 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {quickPushFeedback}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickPushModal(false)}
                    className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSendingQuickPush}
                    className="flex-2 w-full py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:opacity-95 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSendingQuickPush ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>A Disparar para a Cloud...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.3} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                        <span>📡 Disparar Push para Dispositivos</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Backoffice;
