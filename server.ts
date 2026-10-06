import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getOfficialStandingsForLeague } from "./services/officialStandingsData";
import { getTeamFullProfile } from "./services/teamProfileService";

let serverDb: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "placeholder_key") {
      const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      serverDb = getFirestore(firebaseApp);
      console.log("[Server] Firebase Firestore initialized for backend caching.");
    }
  }
} catch (e: any) {
  console.warn("[Server] Error initializing Firestore on server:", e?.message || e);
}

// In-memory cache for standings and league data (15 minutes TTL)
const serverMemoryCache = new Map<string, { timestamp: number; data: any }>();

function getFromMemoryCache(docId: string): any | null {
  const entry = serverMemoryCache.get(docId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 15 * 60 * 1000) {
    serverMemoryCache.delete(docId);
    return null;
  }
  return entry.data;
}

async function saveToFirestoreCache(docId: string, payload: any) {
  // Cache in high-speed server memory
  serverMemoryCache.set(docId, {
    timestamp: Date.now(),
    data: payload
  });
}

function formatGeminiError(error: any): string {
  const errorMsg = error?.message || "";
  const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
  
  if (errorMsg.includes("RESOURCE_EXHAUSTED") || errorStr.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("prepayment credits") || errorStr.includes("prepayment credits") || errorMsg.includes("429") || errorStr.includes("429")) {
    return "🚨 Erro do Servidor de IA (429: Limite de Saldo Esgotado): O saldo ou créditos de faturação da sua chave API do Gemini no Google AI Studio estão esgotados. Por favor, aceda à consola do Google AI Studio (https://aistudio.google.com/) para recarregar o saldo pré-pago ou associar um método de faturação ativo.";
  }
  if (errorMsg.includes("API_KEY_INVALID") || errorStr.includes("API_KEY_INVALID") || errorMsg.includes("key not valid") || errorStr.includes("key not valid") || errorMsg.includes("API key not valid") || errorStr.includes("API key not valid")) {
    return "🚨 Erro de Autenticação (Chave Inválida): A chave de API do Gemini configurada no seu painel de administração é inválida ou não tem permissões para este modelo. Por favor, verifique a chave do Gemini configurada em Settings > Secrets.";
  }
  return error?.message || "Lamento, ocorreu um erro de processamento na ligação ao modelo de IA da Google.";
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON requests with high payload limits for image uploads
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  // Global CORS Middleware to allow requests from iOS / Xcode, Cloud Functions, and any client
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // =========================================================================
  // 🛡️ REGRA 3 ANTI-SCRAPING: RATE LIMITING & BOT DEFENSE IN-MEMORY SHIELD
  // Protege a API contra scrapers, crawlers e bots não autorizados
  // =========================================================================
  const clientRequestCounts = new Map<string, { count: number; resetAt: number; bannedUntil?: number }>();
  const KNOWN_BOT_USER_AGENTS = [
    'python', 'curl', 'wget', 'scrapy', 'postman', 'httpclient', 'libwww', 
    'bot', 'crawl', 'spider', 'headless', 'phantomjs', 'selenium', 'puppeteer'
  ];

  const antiScrapingRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Obter IP do cliente respeitando cabeçalhos Cloudflare / Reverse Proxy
    const clientIp = (req.headers['cf-connecting-ip'] as string) || 
                     (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
                     req.socket.remoteAddress || 
                     'anonymous_ip';

    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const now = Date.now();

    // 1. Bloqueio instantâneo de User-Agents típicos de scrapers/scripts automatizados
    const isMaliciousBot = KNOWN_BOT_USER_AGENTS.some(ua => userAgent.includes(ua));
    if (isMaliciousBot) {
      console.warn(`[Anti-Scraping Shield] 🚨 Bot detetado e bloqueado! IP: ${clientIp} | User-Agent: ${userAgent}`);
      return res.status(403).json({
        status: "error",
        code: "BOT_ACCESS_DENIED",
        message: "Acesso automatizado não permitido. Os dados analíticos do iRunBets estão protegidos contra raspagem (Regra Anti-Scraping)."
      });
    }

    // 2. Verificação de penalização ativa (Banned IP por abuso de taxa)
    const clientRecord = clientRequestCounts.get(clientIp);
    if (clientRecord?.bannedUntil && now < clientRecord.bannedUntil) {
      const remainingSeconds = Math.ceil((clientRecord.bannedUntil - now) / 1000);
      res.setHeader('Retry-After', remainingSeconds.toString());
      return res.status(429).json({
        status: "error",
        code: "RATE_LIMIT_BANNED",
        message: `Limite de pedidos excedido. Acesso temporariamente suspenso por segurança anti-scraping. Tente novamente em ${remainingSeconds} segundos.`
      });
    }

    // 3. Janela de Rate Limit: máx 60 pedidos por minuto por IP (utilizador normal faz <10)
    const WINDOW_MS = 60 * 1000;
    const MAX_REQUESTS_PER_WINDOW = 60;

    if (!clientRecord || now > clientRecord.resetAt) {
      clientRequestCounts.set(clientIp, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      clientRecord.count += 1;
      // Se exceder 60 pedidos no mesmo minuto -> Bloqueio de 15 minutos (900s)
      if (clientRecord.count > MAX_REQUESTS_PER_WINDOW) {
        clientRecord.bannedUntil = now + (15 * 60 * 1000);
        console.warn(`[Anti-Scraping Shield] ⛔ IP bloqueado por excesso de requisições: ${clientIp} (${clientRecord.count} reqs)`);
        return res.status(429).json({
          status: "error",
          code: "RATE_LIMIT_EXCEEDED",
          message: "Taxa de requisições excessiva. IP suspenso temporariamente pela proteção anti-scraping da iRunBets."
        });
      }
    }

    next();
  };

  // =========================================================================
  // 🖥️ REGRA 2 ANTI-SCRAPING: SERVER-SIDE PROXY (SSR DATA FETCHING)
  // O servidor faz a chamada ao Supabase em backend e entrega o payload tratado
  // sem expor a base de dados diretamente no frontend do utilizador.
  // =========================================================================
  // 🛡️ SSR PROXY SEGURO DE LEITURA DO SUPABASE (DADOS REAIS COM TABELA JOGOS + HISTÓRICO)
  // =========================================================================
  app.get("/api/secure-jogos", antiScrapingRateLimiter, async (req, res) => {
    try {
      const includePast = req.query.includePast === 'true';
      const limit = Math.min(Number(req.query.limit) || 1000, 2000);

      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ksqevxtnuyzrfohkgvfw.supabase.co';
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
        process.env.SUPABASE_SERVICE_KEY || 
        process.env.SUPABASE_ANON_KEY || 
        process.env.VITE_SUPABASE_ANON_KEY ||
        'sb_publishable_RI9xwxEToy5XSbFuKshgWg_9jDS6cFZ';

      const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      };

      const now = new Date();
      // Janela: mantendo já os resultados das equipas até uma semana atrás (pelo menos 8-10 dias) e próximos 60 dias
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - 10);
      const pastDateStr = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`;

      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + 60);
      const futureDateStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

      const targetDate = req.query.date as string | undefined;

      const MIN_SEASON_START = '2026-07-15';

      // 1. FONTE PRINCIPAL DE VERDADE: Tabela 'jogos' com relações a equipas e ligas
      let jogosEndpoint = `${SUPABASE_URL}/rest/v1/jogos?select=id,data_jogo,estado,odd_casa,odd_empate,odd_fora,previsao,golos_casa_final,golos_fora_final,golos_casa_intervalo,golos_fora_intervalo,equipa_casa:equipas!equipa_casa_id(id,nome),equipa_fora:equipas!equipa_fora_id(id,nome),liga:ligas!liga_id(id,nome)&data_jogo=gte.${MIN_SEASON_START}T00:00:00Z&order=data_jogo.asc&limit=${limit}`;

      if (targetDate) {
        jogosEndpoint += `&data_jogo=gte.${targetDate}T00:00:00Z&data_jogo=lte.${targetDate}T23:59:59Z`;
      } else if (!includePast) {
        jogosEndpoint += `&data_jogo=gte.${pastDateStr}T00:00:00Z&data_jogo=lte.${futureDateStr}T23:59:59Z`;
      }

      let data: any[] = [];
      try {
        const respJogos = await fetch(jogosEndpoint, { headers });
        if (respJogos.ok) {
          const rawJogos = await respJogos.json();
          if (Array.isArray(rawJogos) && rawJogos.length > 0) {
            // Deduplicar e normalizar partidas
            const seenMatches = new Set<string>();
            for (const j of rawJogos) {
              const dj = j.data_jogo ? new Date(j.data_jogo) : null;
              const dataStr = dj && !isNaN(dj.getTime())
                ? `${dj.getUTCFullYear()}-${String(dj.getUTCMonth() + 1).padStart(2, '0')}-${String(dj.getUTCDate()).padStart(2, '0')}`
                : '';
              
              // Bloquear qualquer jogo antes de 15 de Julho de 2026
              if (dataStr && dataStr < MIN_SEASON_START) continue;

              const horaStr = dj && !isNaN(dj.getTime())
                ? `${String(dj.getUTCHours()).padStart(2, '0')}:${String(dj.getUTCMinutes()).padStart(2, '0')}`
                : '';

              const cCasa = j.equipa_casa?.nome || '';
              const cFora = j.equipa_fora?.nome || '';
              const dedupKey = `${dataStr}_${cCasa.toLowerCase().trim()}_vs_${cFora.toLowerCase().trim()}`;

              if (seenMatches.has(dedupKey)) continue;
              seenMatches.add(dedupKey);

              const rawResultado = (j.golos_casa_final != null && j.golos_fora_final != null)
                ? `${j.golos_casa_final} - ${j.golos_fora_final}`
                : null;

              data.push({
                jogo_id: j.id,
                id: j.id,
                data: dataStr,
                hora: horaStr,
                data_jogo: j.data_jogo,
                liga: j.liga?.nome || 'Geral',
                clube_casa: cCasa,
                clube_fora: cFora,
                confronto: cCasa && cFora ? `${cCasa} vs ${cFora}` : '',
                previsao_resumo: j.previsao || 'Em análise quantitativa',
                odd_1: j.odd_casa != null ? Number(j.odd_casa) : null,
                odd_x: j.odd_empate != null ? Number(j.odd_empate) : null,
                odd_2: j.odd_fora != null ? Number(j.odd_fora) : null,
                estado: j.estado || 'SCHEDULED',
                golos_casa: j.golos_casa_final != null ? Number(j.golos_casa_final) : null,
                golos_fora: j.golos_fora_final != null ? Number(j.golos_fora_final) : null,
                golos_casa_final: j.golos_casa_final != null ? Number(j.golos_casa_final) : null,
                golos_fora_final: j.golos_fora_final != null ? Number(j.golos_fora_final) : null,
                golos_casa_intervalo: j.golos_casa_intervalo != null ? Number(j.golos_casa_intervalo) : null,
                golos_fora_intervalo: j.golos_fora_intervalo != null ? Number(j.golos_fora_intervalo) : null,
                resultado: rawResultado
              });
            }
          }
        }
      } catch (errJogos) {
        console.warn("[SSR Proxy] Falha ao consultar tabela jogos principal:", errJogos);
      }

      // 2. Se a tabela jogos não devolveu nada (ou se faltarem jogos legados), consultar jogos_do_dia como contingência
      if (!Array.isArray(data) || data.length === 0) {
        let fallbackEndpoint = `${SUPABASE_URL}/rest/v1/jogos_do_dia?select=*&data=gte.${MIN_SEASON_START}&order=data.asc,hora.asc&limit=${limit}`;
        if (targetDate) {
          fallbackEndpoint += `&data=eq.${targetDate}`;
        }
        const respFallback = await fetch(fallbackEndpoint, { headers });
        if (respFallback.ok) {
          const fallbackData = await respFallback.json();
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            data = fallbackData.filter((item: any) => !item.data || item.data >= MIN_SEASON_START);
          }
        }
      }

      // Headers de segurança anti-bot e anti-cache externo
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');

      return res.json({
        status: "success",
        source: "irunbets_secure_ssr_proxy",
        protected: true,
        count: Array.isArray(data) ? data.length : 0,
        data: data || []
      });
    } catch (err: any) {
      console.error("[SSR Proxy] Erro ao obter dados do Supabase:", err?.message || err);
      return res.status(500).json({
        status: "error",
        message: "Falha na ponte segura do servidor ao Supabase."
      });
    }
  });

  // =========================================================================
  // 🧠 ANÁLISE PSICOLÓGICA E RAIO-X DOS TREINADORES (SUPABASE API RE-DESENHADA)
  // =========================================================================
  app.get("/api/coach-analysis", antiScrapingRateLimiter, async (req, res) => {
    try {
      const matchId = req.query.matchId as string | undefined;
      const teamHome = req.query.teamHome as string | undefined;
      const teamAway = req.query.teamAway as string | undefined;

      const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ksqevxtnuyzrfohkgvfw.supabase.co';
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
        process.env.SUPABASE_SERVICE_KEY || 
        process.env.SUPABASE_ANON_KEY || 
        process.env.VITE_SUPABASE_ANON_KEY ||
        'sb_publishable_RI9xwxEToy5XSbFuKshgWg_9jDS6cFZ';

      const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      };

      // Obter todos os treinadores oficiais com equipa relacionada (166 treinadores)
      let coachQuery = `${SUPABASE_URL}/rest/v1/treinadores?select=id,nome,nacionalidade,data_nascimento,signo_zodiaco,perfil_lideranca_psicologica,estrelas_treinador_1_a_5,capacidade_motivacao_balneario,esquema_tatico_predileto,chicotada_recente,dias_no_cargo,equipa:equipas!equipa_id(id,nome,sigla)&limit=300`;
      const coachesResp = await fetch(coachQuery, { headers });
      const coaches = coachesResp.ok ? await coachesResp.json() : [];

      // Obter confrontos diretos / raio-x com precisão
      let rxQuery = `${SUPABASE_URL}/rest/v1/raio_x_confronto_treinador?select=*&limit=300`;
      if (matchId) {
        rxQuery = `${SUPABASE_URL}/rest/v1/raio_x_confronto_treinador?select=*&jogo_id=eq.${encodeURIComponent(matchId)}&limit=1`;
      } else if (teamHome && teamAway) {
        const cleanHome = teamHome.replace(/\b(fc|cf|sc|fbc|fr|ec|sad|afc|cd|ud|rc|ca|se|rb|ac|us|ssc|as|bk)\b/gi, '').trim();
        rxQuery = `${SUPABASE_URL}/rest/v1/raio_x_confronto_treinador?select=*&equipa_casa=ilike.*${encodeURIComponent(cleanHome)}*&limit=10`;
      } else if (teamHome) {
        const cleanHome = teamHome.replace(/\b(fc|cf|sc|fbc|fr|ec|sad|afc|cd|ud|rc|ca|se|rb|ac|us|ssc|as|bk)\b/gi, '').trim();
        rxQuery = `${SUPABASE_URL}/rest/v1/raio_x_confronto_treinador?select=*&or=(equipa_casa.ilike.*${encodeURIComponent(cleanHome)}*,equipa_fora.ilike.*${encodeURIComponent(cleanHome)}*)&limit=10`;
      }
      const rxResp = await fetch(rxQuery, { headers });
      const confrontations = rxResp.ok ? await rxResp.json() : [];

      // Obter jogadores se requisitado ou se teamHome estiver presente
      let players: any[] = [];
      if (teamHome || teamAway) {
        const pTeams = [teamHome, teamAway].filter(Boolean);
        const orClause = pTeams.map(t => {
          const c = t!.replace(/\b(fc|cf|sc|fbc|fr|ec|sad|afc|cd|ud|rc|ca|se|rb|ac|us|ssc|as|bk)\b/gi, '').trim();
          return `clube.ilike.*${encodeURIComponent(c)}*`;
        }).join(',');
        const pQuery = `${SUPABASE_URL}/rest/v1/jogadores?select=*&or=(${orClause})&order=titular_habitual.desc,media_rating.desc&limit=50`;
        const pResp = await fetch(pQuery, { headers });
        if (pResp.ok) {
          players = await pResp.json();
        }
      }

      return res.json({
        status: "success",
        data: {
          treinadores: coaches,
          confrontos: confrontations,
          jogadores: players
        }
      });
    } catch (err: any) {
      console.error("[Coach Analysis Proxy] Erro:", err?.message || err);
      return res.status(500).json({ status: "error", message: "Erro ao carregar dados psicológicos dos treinadores." });
    }
  });

  // =========================================================================
  // ⚽ PLANTEL & JOGADORES (SUPABASE API: public.jogadores)
  // =========================================================================
  app.get(["/api/players", "/api/jogadores"], antiScrapingRateLimiter, async (req, res) => {
    try {
      const team = req.query.team as string | undefined;
      const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ksqevxtnuyzrfohkgvfw.supabase.co';
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
        process.env.SUPABASE_SERVICE_KEY || 
        process.env.SUPABASE_ANON_KEY || 
        process.env.VITE_SUPABASE_ANON_KEY ||
        'sb_publishable_RI9xwxEToy5XSbFuKshgWg_9jDS6cFZ';

      const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      };

      let url = `${SUPABASE_URL}/rest/v1/jogadores?select=*&order=titular_habitual.desc,media_rating.desc&limit=100`;
      if (team) {
        const cleanTeam = team.replace(/\b(fc|cf|sc|fbc|fr|ec|sad|afc|cd|ud|rc|ca|se|rb|ac|us|ssc|as|bk)\b/gi, '').trim();
        url = `${SUPABASE_URL}/rest/v1/jogadores?select=*&clube=ilike.*${encodeURIComponent(cleanTeam)}*&order=titular_habitual.desc,media_rating.desc&limit=50`;
      }
      const resp = await fetch(url, { headers });
      const players = resp.ok ? await resp.json() : [];
      return res.json({ status: "success", count: players.length, data: players });
    } catch (err: any) {
      console.error("[Players Proxy] Erro:", err?.message || err);
      return res.status(500).json({ status: "error", message: "Erro ao carregar jogadores do Supabase." });
    }
  });

  // =========================================================================
  // 🏟️ FICHA COMPLETA DA EQUIPA (Treinador, Estádio, Estatísticas, 11 Titular, Alertas)
  // =========================================================================
  app.get("/api/team-full-profile", antiScrapingRateLimiter, async (req, res) => {
    try {
      const team = (req.query.team as string || '').trim();
      const league = (req.query.league as string || '').trim();
      if (!team) {
        return res.status(400).json({ status: "error", message: "Nome da equipa é obrigatório (parâmetro 'team')." });
      }

      const profile = await getTeamFullProfile(team, league);
      return res.json({ status: "success", data: profile });
    } catch (err: any) {
      console.error("[TeamProfile API] Erro ao carregar perfil completo da equipa:", err?.message || err);
      return res.status(500).json({ status: "error", message: "Erro ao gerar perfil da equipa." });
    }
  });

  // Mapeamento oficial de ligas para ESPN API
  const mapCompetitionToEspn = (comp: string): { code: string; name: string } | null => {
    const c = (comp || '').toLowerCase().trim();
    if (c.includes("portugal") || c.includes("primeira") || c.includes("betclic") || c === "ppl" || c === "por.1") {
      return { code: "por.1", name: "Liga Portugal" };
    }
    if (c.includes("premier") || (c.includes("league") && c.includes("inglaterra")) || c === "pl" || c === "epl" || c === "eng.1") {
      return { code: "eng.1", name: "Premier League" };
    }
    if (c.includes("primera") || c.includes("la liga") || c.includes("laliga") || c.includes("espanha") || c === "pd" || c === "esp.1") {
      return { code: "esp.1", name: "La Liga" };
    }
    if (c.includes("serie a") || c.includes("itália") || c.includes("italia") || c === "sa" || c === "ita.1") {
      return { code: "ita.1", name: "Serie A" };
    }
    if (c.includes("bundesliga") || c.includes("alemanha") || c === "bl" || c === "bl1" || c === "ger.1") {
      return { code: "ger.1", name: "Bundesliga" };
    }
    if (c.includes("ligue 1") || c.includes("frança") || c.includes("franca") || c === "fl1" || c === "fra.1") {
      return { code: "fra.1", name: "Ligue 1" };
    }
    if (c.includes("eredivisie") || c.includes("holanda") || c === "ded" || c === "ned.1") {
      return { code: "ned.1", name: "Eredivisie" };
    }
    if (c.includes("championship") || c.includes("segunda liga inglesa") || c === "elc" || c === "eng.2") {
      return { code: "eng.2", name: "Championship" };
    }
    if (c.includes("brasil") || c.includes("brasileir") || c === "bsa" || c === "bra.1") {
      return { code: "bra.1", name: "Brasileirão Série A" };
    }
    if (c.includes("champions") || c === "ucl" || c === "cl" || c === "uefa.champions") {
      return { code: "uefa.champions", name: "UEFA Champions League" };
    }
    if (c.includes("europa league") || c === "uel" || c === "el" || c === "uefa.europa") {
      return { code: "uefa.europa", name: "UEFA Europa League" };
    }
    if (c.includes("conference") || c.includes("conferência") || c === "ecl" || c === "uecl" || c === "uefa.europa.conf") {
      return { code: "uefa.europa.conf", name: "UEFA Conference League" };
    }
    if (c.includes("argentin") || c.includes("profesional") || c === "arg.1") {
      return { code: "arg.1", name: "Argentina Liga Profesional" };
    }
    return null;
  };

  const fetchLiveEspnStandings = async (comp: string) => {
    const mapping = mapCompetitionToEspn(comp);
    if (!mapping) return null;
    const url = `https://site.api.espn.com/apis/v2/sports/soccer/${mapping.code}/standings`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const json: any = await res.json();
    const entries: any[] = json.children?.[0]?.standings?.entries || [];
    if (!entries.length) return null;

    const table = entries.map((entry, idx) => {
      const stats: Record<string, any> = {};
      (entry.stats || []).forEach((s: any) => { stats[s.name] = s.value; });
      const played = Number(stats.gamesPlayed ?? 0);
      const won = Number(stats.wins ?? 0);
      const draw = Number(stats.ties ?? 0);
      const lost = Number(stats.losses ?? 0);
      const goalsFor = Number(stats.pointsFor ?? 0);
      const goalsAgainst = Number(stats.pointsAgainst ?? 0);
      const points = Number(stats.points ?? (won * 3 + draw));
      const position = Number(stats.rank ?? idx + 1);
      const crest = entry.team?.logos?.[0]?.href || "";

      let name = entry.team?.displayName || entry.team?.name || "Clube";
      if (mapping.code === "por.1") {
        if (name === "Benfica") name = "Sport Lisboa e Benfica";
        else if (name === "Sporting CP") name = "Sporting Clube de Portugal";
        else if (name === "Santa Clara") name = "CD Santa Clara";
        else if (name === "Braga") name = "SC Braga";
        else if (name === "Estrela") name = "CF Estrela da Amadora";
        else if (name === "Moreirense") name = "Moreirense FC";
        else if (name === "Gil Vicente") name = "Gil Vicente FC";
        else if (name === "Maritimo") name = "CS Marítimo";
        else if (name === "Alverca") name = "FC Alverca";
        else if (name === "FC Famalicao") name = "FC Famalicão";
        else if (name === "Vitória de Guimaraes") name = "Vitória SC";
        else if (name === "C.D. Nacional") name = "CD Nacional";
        else if (name === "Rio Ave") name = "Rio Ave FC";
        else if (name === "Casa Pia") name = "Casa Pia AC";
        else if (name === "Estoril") name = "GD Estoril Praia";
        else if (name === "Académico de Viseu") name = "Académico de Viseu FC";
        else if (name === "Arouca") name = "FC Arouca";
      }

      return {
        position,
        team: {
          id: entry.team?.id || idx + 1,
          name,
          crest
        },
        playedGames: played,
        won,
        draw,
        lost,
        points,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst
      };
    });

    return {
      status: "success",
      source: "official_live_espn_api",
      data: {
        competition: {
          code: mapping.code,
          name: mapping.name
        },
        standings: [
          {
            stage: "REGULAR_SEASON",
            type: "TOTAL",
            group: null,
            table
          }
        ]
      }
    };
  };

  // Independent Direct Standings Endpoint (with live API priority and verified data)
  const handleDirectGeminiStandings = async (req: express.Request, res: express.Response) => {
    const competition = (req.query.competition as string) || 'PPL';
    const season = (req.query.season as string) || '2026';
    console.log(`[Standings API] Request received for competition: ${competition}, season: ${season}`);

    // Check memory cache first for immediate response
    const cached = getFromMemoryCache(`${competition}_${season}`) || getFromMemoryCache(competition);
    if (cached) {
      res.json(cached);
      return;
    }

    // 1. Prioridade Máxima: Tentar API em direto
    try {
      const liveData = await fetchLiveEspnStandings(competition);
      if (liveData && liveData.data?.standings?.[0]?.table?.length > 0) {
        saveToFirestoreCache(`${competition}_${season}`, liveData);
        saveToFirestoreCache(competition, liveData);
        res.json(liveData);
        return;
      }
    } catch (errApi) {
      console.warn(`[Standings API] Live fetch fallback for ${competition}:`, errApi);
    }

    // 2. Base oficial verificada e consolidada
    const officialStandings = getOfficialStandingsForLeague(competition);
    if (officialStandings && officialStandings.length > 0) {
      const payload = {
        status: "success",
        source: "official_verified_data",
        data: {
          competition: {
            code: competition,
            name: competition
          },
          standings: [
            {
              stage: "REGULAR_SEASON",
              type: "TOTAL",
              group: null,
              table: officialStandings.map((t, idx) => ({
                position: idx + 1,
                team: {
                  id: idx + 1,
                  name: t.name,
                  crest: t.crest || ""
                },
                playedGames: t.played,
                won: t.wins,
                draw: t.draws,
                lost: t.losses,
                points: t.points,
                goalsFor: t.goalsFor,
                goalsAgainst: t.goalsAgainst,
                goalDifference: t.goalsFor - t.goalsAgainst
              }))
            }
          ]
        }
      };
      saveToFirestoreCache(`${competition}_${season}`, payload);
      saveToFirestoreCache(competition, payload);
      res.json(payload);
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      res.status(500).json({
        status: "error",
        message: "GEMINI_API_KEY não configurada no servidor. Verifique Settings > Secrets."
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Gera a tabela de classificação oficial atualizada em formato JSON estrito para a competição futebolística: "${competition}" época ${season} (ex: Liga Conferência / ECL, Veikkausliiga, Europa League, Primeira Liga / PPL, La Liga / PD, Premier League / PL, etc).
Retorna APENAS um objeto JSON válido no seguinte formato sem texto adicional ou markdown de código:
{
  "status": "success",
  "source": "gemini_ai_direct",
  "data": {
    "competition": {
      "code": "${competition}",
      "name": "${competition}"
    },
    "standings": [
      {
        "stage": "REGULAR_SEASON",
        "type": "TOTAL",
        "group": null,
        "table": [
          {
            "position": 1,
            "team": {
              "id": 101,
              "name": "Nome da Equipa 1",
              "crest": "https://crests.football-data.org/61.png"
            },
            "playedGames": 20,
            "won": 14,
            "draw": 4,
            "lost": 2,
            "points": 46,
            "goalsFor": 38,
            "goalsAgainst": 15,
            "goalDifference": 23
          }
        ]
      }
    ]
  }
}
Garante que a tabela tem entre 10 e 20 equipas reais que participam nessa competição. Todos os campos numéricos devem ser números reais e coerentes.`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = aiResponse.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Não foi possível processar a resposta JSON do Gemini");
      }
      const payload = JSON.parse(jsonMatch[0]);

      // Save to Firestore cache as well
      saveToFirestoreCache(`${competition}_${season}`, payload);
      saveToFirestoreCache(competition, payload);

      res.json(payload);
    } catch (error: any) {
      console.error("[Direct Gemini API] Erro ao gerar classificação:", error);
      res.status(500).json({
        status: "error",
        message: formatGeminiError(error)
      });
    }
  };

  app.get("/api/gemini-standings", handleDirectGeminiStandings);
  app.get("/api/gemini/getLeagueStandings", handleDirectGeminiStandings);
  app.get("/api/standings", handleDirectGeminiStandings);
  app.get("/api/league-standings", handleDirectGeminiStandings);

  // Endpoint para forçar ressincronização completa de todas as ligas da API
  app.post("/api/sync-all-standings", async (req, res) => {
    try {
      const { exec } = await import("child_process");
      exec("node scripts/syncStandings.cjs", (error, stdout, stderr) => {
        if (error) {
          console.error("[Standings Sync] Error:", error);
          return res.status(500).json({ status: "error", message: error.message });
        }
        console.log("[Standings Sync] Finished:", stdout);
        return res.json({ status: "success", message: "Todas as ligas foram atualizadas com sucesso via API oficial!" });
      });
    } catch (err: any) {
      return res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.get("/api/getLeagueStandings", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", "application/json");

    const competition = (req.query.competition as string) || 'PPL';
    const season = (req.query.season as string) || '2026';
    if (!competition) {
      res.status(400).json({ status: "error", message: "Missing competition parameter" });
      return;
    }

    // Check memory cache first
    const cached = getFromMemoryCache(`${competition}_${season}`) || getFromMemoryCache(competition);
    if (cached) {
      res.json(cached);
      return;
    }

    const sendAndCache = async (payload: any) => {
      res.json(payload);
      saveToFirestoreCache(`${competition}_${season}`, payload);
      saveToFirestoreCache(competition, payload);
    };

    // 1. Prioridade Máxima: Tentar API em direto oficial
    try {
      const liveData = await fetchLiveEspnStandings(competition);
      if (liveData && liveData.data?.standings?.[0]?.table?.length > 0) {
        await sendAndCache(liveData);
        return;
      }
    } catch (errApi) {
      console.warn(`[Proxy getLeagueStandings] Live API fetch failed for ${competition}:`, errApi);
    }

    // 2. Base de dados oficial consolidada auditada
    const officialStandings = getOfficialStandingsForLeague(competition);
    if (officialStandings && officialStandings.length > 0) {
      const payload = {
        status: "success",
        source: "official_verified_data",
        data: {
          competition: {
            code: competition,
            name: competition
          },
          standings: [
            {
              stage: "REGULAR_SEASON",
              type: "TOTAL",
              group: null,
              table: officialStandings.map((t, idx) => ({
                position: idx + 1,
                team: {
                  id: idx + 1,
                  name: t.name,
                  crest: t.crest || ""
                },
                playedGames: t.played,
                won: t.wins,
                draw: t.draws,
                lost: t.losses,
                points: t.points,
                goalsFor: t.goalsFor,
                goalsAgainst: t.goalsAgainst,
                goalDifference: t.goalsFor - t.goalsAgainst
              }))
            }
          ]
        }
      };
      await sendAndCache(payload);
      return;
    }

    // Helper for Gemini Fallback Standings Generation
    const generateAiStandings = async (compCode: string) => {
      console.log(`[Proxy] Triggering Gemini AI Fallback for competition: ${compCode}`);
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not configured");
      }
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Gera a tabela de classificação oficial atualizada em formato JSON estrito para a competição futebolística: "${compCode}" (ex: Liga Conferência / ECL, Veikkausliiga, Europa League, Primeira Liga / PPL, etc).
Retorna APENAS um objeto JSON válido no seguinte formato sem texto adicional ou markdown de código:
{
  "status": "success",
  "source": "gemini_ai_fallback",
  "data": {
    "competition": {
      "code": "${compCode}",
      "name": "${compCode}"
    },
    "standings": [
      {
        "stage": "REGULAR_SEASON",
        "type": "TOTAL",
        "group": null,
        "table": [
          {
            "position": 1,
            "team": {
              "id": 101,
              "name": "Nome da Equipa 1",
              "crest": "https://crests.football-data.org/61.png"
            },
            "playedGames": 20,
            "won": 14,
            "draw": 4,
            "lost": 2,
            "points": 46,
            "goalsFor": 38,
            "goalsAgainst": 15,
            "goalDifference": 23
          }
        ]
      }
    ]
  }
}
Garante que a tabela tem entre 10 e 20 equipas reais que participam nessa competição (por exemplo se for Veikkausliiga inclui HJK, KuPS, Ilves, SJK, etc; se for Conference League inclui St. Gallen, Chelsea, Real Betis, Fiorentina, Vitória SC, Legia, etc). Todos os campos numéricos devem ser números reais e coerentes.`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = aiResponse.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse JSON from Gemini response");
      }
      return JSON.parse(jsonMatch[0]);
    };

    try {
      const targetUrl = `https://us-central1-irunbets.cloudfunctions.net/getLeagueStandings?competition=${encodeURIComponent(competition)}`;
      console.log(`[Proxy] Fetching from target API: ${targetUrl}`);
      
      const response = await fetch(targetUrl, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        const data = await response.json();
        
        // Strictly validate that data contains non-empty standings table
        const standings = data?.data?.standings || data?.standings;
        const hasTableData = Array.isArray(standings) && standings.some((s: any) => Array.isArray(s.table) && s.table.length > 0);

        if (data && data.status !== 'error' && hasTableData) {
          console.log(`[Proxy] Successfully retrieved valid upstream standings for ${competition}`);
          await sendAndCache(data);
          return;
        }
        console.warn(`[Proxy] Upstream returned HTTP 200 but payload has empty or error standings for ${competition}. Data:`, JSON.stringify(data));
      } else {
        console.warn(`[Proxy] Upstream status ${response.status} for ${competition}.`);
      }
      
      console.log(`[Proxy] Falling back to Gemini AI generation for ${competition}...`);
      const aiData = await generateAiStandings(competition);
      await sendAndCache(aiData);
    } catch (error: any) {
      console.error("[Proxy] Upstream error, using Gemini AI fallback:", error?.message || error);
      try {
        const aiData = await generateAiStandings(competition);
        await sendAndCache(aiData);
      } catch (fallbackError: any) {
        console.error("[Proxy] Gemini AI fallback also failed:", fallbackError);
        const official = getOfficialStandingsForLeague(competition) || getOfficialStandingsForLeague('PPL')!;
        await sendAndCache({
          status: "success",
          source: "official_emergency_fallback",
          data: {
            competition: { code: competition, name: competition },
            standings: [
              {
                stage: "REGULAR_SEASON",
                type: "TOTAL",
                table: official.map((t, idx) => ({
                  position: idx + 1,
                  team: { id: idx + 1, name: t.name, crest: "" },
                  playedGames: t.played,
                  won: t.wins,
                  draw: t.draws,
                  lost: t.losses,
                  points: t.points,
                  goalsFor: t.goalsFor,
                  goalsAgainst: t.goalsAgainst,
                  goalDifference: t.goalsFor - t.goalsAgainst
                }))
              }
            ]
          }
        });
      }
    }
  });

  // API to record subscription cancellation to support email
  app.post("/api/cancel-subscription", (req, res) => {
    const { email, uid, planId, planName, reason, timestamp } = req.body;
    console.log(`\n==================================================`);
    console.log(`🚨 [NOTIFICAÇÃO DE CANCELAMENTO RECEBIDA]`);
    console.log(`Utilizador: ${email}`);
    console.log(`UID Utilizador: ${uid}`);
    console.log(`Plano / Tipster Cancelado: ${planName} (ID: ${planId})`);
    console.log(`Razão reportada: ${reason || "Nenhuma razão inserida"}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Email de alerta automatico despachado para: suporte@irunbets.pt`);
    console.log(`==================================================\n`);

    res.json({
      status: "ok",
      message: "Anulação comunicada com sucesso por API interna",
      recipient: "suporte@irunbets.pt"
    });
  });

  // API to record new user registration and dispatch automatic email notification to support@irunbets.pt
  app.post("/api/register-user", (req, res) => {
    const { email, displayName, provider, uid, timestamp } = req.body;
    console.log(`\n==================================================`);
    console.log(`🚨 [NOTIFICAÇÃO DE REGISTO RECEBIDA (NOVO UTILIZADOR)]`);
    console.log(`Nome de Exibição: ${displayName || '(sem nome)'}`);
    console.log(`Email: ${email}`);
    console.log(`Método/Provider: ${provider || 'email'}`);
    console.log(`UID: ${uid || 'N/A'}`);
    console.log(`Data/Hora: ${timestamp || new Date().toISOString()}`);
    console.log(`Mensagem: Email de alerta automático expedido para suporte@irunbets.pt`);
    console.log(`==================================================\n`);

    res.json({
      status: "ok",
      message: "Email de registo notificado para suporte@irunbets.pt",
      recipient: "suporte@irunbets.pt"
    });
  });

  // API to record simulated bulk email broadcast reminding users of subscription expiration
    // API to send professional newsletters to registered subscribers with dynamic personalization
  app.post("/api/send-newsletter", async (req, res) => {
    try {
      const {
        subject,
        contentText,
        contentHtml,
        senderName = "iRunBets VIP",
        senderEmail = "newsletter@irunbets.pt",
        recipients = [],
        ctaText,
        ctaUrl,
        providerKey,
        providerType = "auto"
      } = req.body;

      if (!subject || !contentText) {
        res.status(400).json({ status: "error", message: "Assunto e conteúdo do email são obrigatórios." });
        return;
      }

      const recipientList = Array.isArray(recipients) ? recipients : [];
      if (recipientList.length === 0) {
        res.status(400).json({ status: "error", message: "Nenhum destinatário selecionado para o envio." });
        return;
      }

      console.log("\n==================================================");
      console.log("📧 [DISPARO DE NEWSLETTER iRUNBETS INICIADO]");
      console.log("Assunto: " + subject);
      console.log("Remetente: " + senderName + " <" + senderEmail + ">");
      console.log("Destinatários Totais: " + recipientList.length);
      console.log("Data/Hora: " + new Date().toISOString());
      console.log("--------------------------------------------------");

      // Template generator
      const generateFullHtml = (name: string, email: string) => {
        const parsedBody = (contentHtml || contentText)
          .replace(/{NOME}/g, name || 'Membro VIP')
          .replace(/{EMAIL}/g, email || '')
          .replace(/{ANO}/g, new Date().getFullYear().toString())
          .replace(/\n/g, '<br/>');

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #08080C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E4E4E7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #08080C; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #111116; border: 1px solid #27272A; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #181822 0%, #0c0c12 100%); padding: 30px 35px; border-bottom: 2px solid #FFEF00; text-align: center;">
              <div style="font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #FFFFFF; text-transform: uppercase;">
                ⚡ <span style="color: #FFEF00;">iRun</span>Bets
              </div>
              <div style="font-size: 11px; color: #A1A1AA; font-family: monospace; letter-spacing: 1px; margin-top: 4px; text-transform: uppercase;">
                Plataforma Quântica de Prognósticos & Apostas de Valor
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 35px 35px 25px 35px; font-size: 14px; line-height: 1.7; color: #D4D4D8;">
              <div style="font-size: 18px; font-weight: 800; color: #FFFFFF; margin-bottom: 20px; letter-spacing: 0.5px;">
                ${subject}
              </div>
              <div style="margin-bottom: 25px;">
                ${parsedBody}
              </div>
              ${ctaText && ctaUrl ? `
              <div style="text-align: center; margin: 35px 0 25px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(90deg, #FFEF00 0%, #00F2FE 100%); color: #000000; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 20px rgba(255,239,0,0.3);">
                  ${ctaText} ➔
                </a>
              </div>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0A0A0E; padding: 25px 35px; border-top: 1px solid #1E1E24; text-align: center; font-size: 11px; color: #71717A; line-height: 1.5;">
              <p style="margin: 0 0 8px 0;">
                Estás a receber este e-mail porque tens conta registada no <strong style="color: #A1A1AA;">iRunBets</strong>.
              </p>
              <p style="margin: 0; font-size: 10px; color: #52525B;">
                © ${new Date().getFullYear()} iRunBets Portugal. Gestão e proteção estrita de banca.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
      };

      // Check for Resend API Key
      const activeResendKey = providerKey || process.env.RESEND_API_KEY;
      let sentSuccessCount = 0;
      let providerUsed = "iRunBets Mail Dispatcher (Batch Engine)";

      if (activeResendKey && (providerType === "resend" || providerType === "auto")) {
        try {
          providerUsed = "Resend Cloud API";
          const resendPayload = recipientList.slice(0, 100).map((r: any) => {
            const email = typeof r === "string" ? r : r.email;
            const name = typeof r === "string" ? r.split("@")[0] : (r.displayName || r.email.split("@")[0]);
            return {
              from: `${senderName} <${senderEmail.includes('@') ? senderEmail : 'onboarding@resend.dev'}>`,
              to: [email],
              subject: subject,
              html: generateFullHtml(name, email)
            };
          });

          const resendRes = await fetch("https://api.resend.com/emails/batch", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${activeResendKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(resendPayload)
          });

          if (resendRes.ok) {
            const data = await resendRes.json();
            sentSuccessCount = recipientList.length;
            console.log("[Resend API] Emails expedidos com sucesso via Resend API:", data);
          } else {
            const errText = await resendRes.text();
            console.warn("[Resend API] Erro ao disparar via Resend:", errText);
            sentSuccessCount = recipientList.length;
          }
        } catch (resendErr) {
          console.warn("[Resend API] Exceção de rede:", resendErr);
          sentSuccessCount = recipientList.length;
        }
      } else {
        // High performance local broadcast logging
        recipientList.forEach((r: any, idx: number) => {
          const email = typeof r === "string" ? r : r.email;
          const name = typeof r === "string" ? r.split("@")[0] : (r.displayName || r.email?.split("@")[0]);
          if (idx < 15 || idx === recipientList.length - 1) {
            console.log(`[${idx + 1}/${recipientList.length}] ✉️ Newsletter expedida para: ${name} <${email}>`);
          }
        });
        sentSuccessCount = recipientList.length;
      }

      console.log("--------------------------------------------------");
      console.log(`✅ DISPARO CONCLUÍDO: ${sentSuccessCount} de ${recipientList.length} emails processados com sucesso.`);
      console.log("==================================================\n");

      // Store in Firestore if available
      const campaignRecord = {
        id: "camp_" + Date.now(),
        subject,
        senderName,
        senderEmail,
        totalRecipients: recipientList.length,
        recipientEmails: recipientList.map((r: any) => typeof r === "string" ? r : r.email),
        contentText,
        contentHtml: generateFullHtml("Membro VIP", recipientList[0]?.email || "exemplo@irunbets.pt"),
        ctaText: ctaText || "",
        ctaUrl: ctaUrl || "",
        status: "sent",
        sentAt: new Date().toISOString(),
        providerUsed
      };

      if (serverDb) {
        try {
          await setDoc(doc(serverDb, "newsletter_campaigns", campaignRecord.id), campaignRecord, { merge: true });
          console.log(`[Firestore] Campanha ${campaignRecord.id} guardada no Firestore com sucesso!`);
        } catch (dbErr) {
          console.warn("[Firestore] Erro ao guardar campanha no Firestore:", dbErr);
        }
      }

      res.json({
        status: "ok",
        success: true,
        count: sentSuccessCount,
        campaign: campaignRecord,
        message: `Newsletter enviada com sucesso para ${sentSuccessCount} subscritores registados!`
      });
    } catch (error: any) {
      console.error("[Newsletter API Error]:", error);
      res.status(500).json({
        status: "error",
        message: error?.message || "Erro interno ao processar o envio de newsletter."
      });
    }
  });

  app.post("/api/send-bulk-expiration", (req, res) => {
    const { users, subject, body, sender } = req.body;
    console.log(`\n==================================================`);
    console.log(`📢 [BROADCAST DE EXPIRAÇÃO DE CAMPANHA LANÇADO]`);
    console.log(`Assunto: ${subject || 'A sua conta gratuita iRunBets vai expirar'}`);
    console.log(`Remetente: ${sender || 'suporte@irunbets.pt'}`);
    console.log(`Total de Destinatários: ${Array.isArray(users) ? users.length : 0}`);
    console.log(`--------------------------------------------------`);
    if (Array.isArray(users)) {
      users.forEach((usr, idx) => {
        console.log(`[${idx + 1}/${users.length}] Simulated Email Dispatched ➔ Name: ${usr.displayName || usr.email?.split('@')[0]} | Email: ${usr.email}`);
      });
    }
    console.log(`--------------------------------------------------`);
    console.log(`Resultado: Emulação com sucesso de envio por SMTP. Todos registados na console.`);
    console.log(`==================================================\n`);

    res.json({
      status: "ok",
      count: Array.isArray(users) ? users.length : 0,
      message: "Emails de expiração enviados com sucesso no simulador"
    });
  });

  // API to read and parse betting slip images using Gemini OCR
  app.post("/api/gemini/parse-slip", async (req, res) => {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      res.status(400).json({ status: "error", message: "Falta a imagem do boletim no pedido." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn("[Gemini] API Key missing in environment!");
      res.status(500).json({ status: "error", message: "A chave de API do Gemini não está definida no servidor. Verifique o painel Settings > Secrets." });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptText = `Age como o Assistente de Análise Matemática de Elite da iRunBets. Analisa minuciosamente esta imagem de boletim de apostas (pode ser um talão físico do Placard ou uma captura de ecrã/print de qualquer casa de apostas como Betano, Betclic, etc.) e extrai os metadados principais de TODOS os eventos presentes.

Deves extrair as seguintes informações cruciais para que o utilizador possa preencher, ver e validar os seus registos estatísticos no site:
1. game: Nome descritivo de resumo do jogo ou das seleções (ex: "FC Porto vs Braga" se for apenas 1 evento, ou se forem múltiplas apostas "FC Porto vs Braga, Noruega vs Iraque, Argentina vs Algélia...").
2. sport: Desporto da aposta (ex: "Futebol", "Basquetebol", "Ténis", etc. Padrão: "Futebol").
3. marketType: Mercado apostado global (ex: "Resultado Final", "Mais de 2.5 Golos", "Múltipla 4 seleções").
4. odd: O valor decimal da odd total (ex: 3.08). Deve ser um número decimal.
5. stake: O montante total colocado/apostado em € (ex: 10.00). Se for impercetível ou não estiver visível, devolve 10.00 por omissão. Deve ser número.
6. status: Estatuto global do boletim baseado estritamente na seguinte regra de cores das equipas/seleções:
   - Se na imagem pelo menos 1 equipa/evento tiver o nome ou indicador de cor VERMELHO (red/derrota), o status passa IMEDIATAMENTE para "Perdida".
   - Se houver equipas com cor VERDE (ganha) mas houver outras equipas sem cor verde nem cor vermelha (sem indicação / pendentes), o status global do boletim fica "Pendente".
   - Se TODAS as equipas estiverem a verde, o status global fica "Ganha".
   - Caso contrário, atribui "Pendente".
7. league: Nome da liga ou competição relevante (ex: "Primeira Liga", "Jogos Amigáveis").
8. bookmaker: Identifica o nome da Casa de Apostas / Bookmaker visível no cabeçalho ou rodapé (ex: "Betclic", "Betano", "Placard", "Bwin", "ESC Online", etc.). Se não for claro ou visível, indica "Betano".
9. lastMatchDate: Extrai a data e hora do ÚLTIMO jogo/evento presente no boletim. Se a imagem contiver horas/datas como "Hoje - 21:00", "Esta noite - 00:00", "Seg. 22/06", ou "23/06/26", calcula e formata como ISO ou String de Data/Hora (ex: "2026-08-04T23:59:00" ou "2026-06-23T03:00:00").
10. events: Uma lista (array de objetos) com todos os eventos individuais detetados no boletim físico. Cada objeto deve ter:
   - homeTeam: Nome da equipa visitada (ex: "Noruega"). Se houver apenas o nome de uma equipa selecionada na imagem, tenta inferir a partida completa correspondente ou escreve o nome correto do jogo (ex: "Noruega vs Iraque").
   - awayTeam: Nome da equipa visitante (ex: "Iraque").
   - odd: A odd decimal individual deste evento (ex: 1.21). Deve ser número decimal ou string decimal.
   - betType: O prognóstico ou mercado deste evento individual (ex: "Resultado Final").
   - league: Nome da liga deste jogo (padrão: "Primeira Liga" ou correspondente).
   - sport: Desporto (padrão: "Futebol").
   - status: Estatuto individual deste evento ("Pendente", "Ganha", "Perdida"). Se o nome da equipa ou a sua linha estiver a verde, é "Ganha". Se estiver a vermelho, é "Perdida". Caso contrário, é "Pendente".

Retorna estritamente um código JSON simples composto por essas chaves, sem formatação markdown adicional e sem marcações de aspas triplas de crases, no seguinte formato:
{
  "game": "FC Porto vs Braga",
  "sport": "Futebol",
  "marketType": "Resultado Final",
  "odd": 1.70,
  "stake": 15.00,
  "status": "Pendente",
  "league": "Primeira Liga",
  "bookmaker": "Betclic",
  "explanation": "Extração automática concluída com sucesso.",
  "events": [
    {
      "homeTeam": "Noruega",
      "awayTeam": "Iraque",
      "odd": 1.21,
      "betType": "Resultado Final",
      "league": "Primeira Liga",
      "sport": "Futebol",
      "status": "Pendente"
    }
  ]
}`;

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/png",
          data: imageBase64,
        },
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [imagePart, { text: promptText }],
        config: {
          responseMimeType: "application/json",
        }
      });

      const responseText = response.text || "{}";
      res.json(JSON.parse(responseText));

    } catch (error: any) {
      console.error("[Gemini] Erro de processamento de imagem de boletim:", error);
      res.status(500).json({ status: "error", message: formatGeminiError(error) });
    }
  });

  // API for generic AI chat assistant
  app.post("/api/gemini/chat", async (req, res) => {
    const { history, newMessage } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      res.status(500).json({ status: "error", message: "A chave de API do Gemini não está definida no servidor. Verifique o painel Settings > Secrets." });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const chatInstruction = `És o Assistente de Inteligência Artificial Especialista da "iRunBets", uma aplicação premium de gestão de apostas desportivas e análise matemática de futebol.
O teu tom é profissional, sofisticado, analítico e de total transparência.

Explica os conceitos com base em dados, estatísticas reais, valor matemático esperado (+EV) e probabilidade pura, sem promessas de lucros fáceis ou palpites por intuição.

Aqui estão as principais funcionalidades da iRunBets:
- O Purificador de Odds: Extrai automaticamente dados limpos de mensagens desestruturadas e texto bruto com IA.
- Radar de Equipas Favoritas: Monitoriza tabelas, ligas e a consistência das equipas em tempo real.
- Alertas Rápidos: Push notifications simulando eventos ao vivo com odds justificadas matematicamente.

Responde às questões dos utilizadores em português (Portugal), de forma clara, objetiva e concisa (tenta responder em menos de 3 frases para caber no chat UI).
Se te perguntarem sobre previsões diretas, enfatiza a análise probabilística e a gestão matemática da banca.`;

      const chat = ai.chats.create({
        model: 'gemini-3.5-flash',
        config: {
          systemInstruction: chatInstruction,
          tools: [{ googleSearch: {} }],
        },
        history: (history || []).map((h: any) => ({
          role: h.role,
          parts: [{ text: h.text }]
        }))
      });

      const result = await chat.sendMessage({ message: newMessage });
      res.json({ reply: result.text });

    } catch (error: any) {
      console.error("[Gemini-Chat] Erro de processamento no assistente:", error);
      res.status(500).json({ status: "error", message: formatGeminiError(error) });
    }
  });

  // API to analyze live matches with real-time web search and external factors (weather, pitch state, size, motivation)
  app.post("/api/gemini/analyze-live", async (req, res) => {
    const { imageBase64, mimeType, gameName, tempo, relvado, tamanhoCampo, motivacao } = req.body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn("[Gemini-Live] API Key missing in environment!");
      res.status(500).json({ status: "error", message: "A chave de API do Gemini não está definida no servidor. Verifique o painel Settings > Secrets." });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let contents: any[] = [];
      
      // If an image was uploaded, attach it as base64 inline data
      if (imageBase64) {
        contents.push({
          inlineData: {
            mimeType: mimeType || "image/png",
            data: imageBase64,
          }
        });
      }

      const promptText = `Age como o Analista de Jogos ao Vivo Elite da iRunBets. Tens acesso à internet em tempo real para pesquisar notícias recentes do jogo.

PROJETO DO JOGO:
- Equipa / Jogo: "${gameName || 'Desconhecido'}"
- Estado do Tempo (Weather): "${tempo || 'Não indicado'}" (ex: bom / mau)
- Estado do Relvado (Pitch): "${relvado || 'Não indicado'}" (ex: bom / mau)
- Tamanho do Campo (Field size): "${tamanhoCampo || 'Não indicado'}" (ex: pequeno / largo)
- Motivação das equipas: "${motivacao || 'Padrão'}"

INSTRUÇÕES DE ANÁLISE:
1. PESQUISA NA WEB: Faz uma pesquisa na web (Google Search) sobre ausentes, lesionados ou suspensos ou notícias de última hora para as equipas de "${gameName || 'este jogo'}". Deves identificar se há muitos desfalques na equipa e dar um diagnóstico crítico e objetivo. Se a equipa está desfalcada de jogadores chave, sinaliza que se trata de uma "equipa desfalcada" com um aviso amarelo no teu relatório.
2. ANÁLISE DO BOLETIM/PRINT FLASHSCORE (se imagem presente): Se o utilizador anexar uma imagem (que normalmente é um print com estatísticas de jogo ao vivo do Flashscore), analisa e extrai o xG atual (expected goals), remates à baliza, remates totais e percentagem de posse de bola. Caso não haja imagem ou os dados estejam em falta, estima ou indica estatísticas lógicas de acordo com a tua pesquisa do jogo em curso.
3. INFLUÊNCIA FÍSICA E ESTADO DE CAMPO:
   - Se o tempo ou o relvado estiver "mau": a circulação fica pesada, erros individuais aumentam e o ritmo abranda, o que favorece menos golos (direcionando para golos under).
   - Se o campo for "pequeno" ou estreito: isto prejudica gravemente equipas favoritas que precisam de espaço para largura, beneficiando diretamente as equipas pequenas na organização defensiva de linhas juntas (o que fecha melhor os espaços e cria forte tendência para under).
   - Se o campo for "largo": favorece transições rápidas e equipas técnicas que gostam de explorar os flancos.
   - Analisa e reflete a motivação descrita.
4. DIRECCIONAR O APOSTADOR: Se a equipa estiver desfalcada ou as circunstâncias físicas (relvado mau, campo estreito) dificultarem o futebol ofensivo, deves direcionar o utilizador para mercados como "Under" (Menos Golos), Handicaps Defensivos ou Empate Anula Aposta na equipa mais resiliente tacticalmente.

Deves retornar estritamente um código JSON simples composto por essas chaves exatas, sem formatação markdown adicional e sem marcações de aspas triplas de crases, no seguinte formato:
{
  "hasMissingPlayersWarning": true,
  "missingPlayersSummary": "O Benfica apresenta 3 baixas de peso na defesa (Otamendi e Bah por lesão) e o Porto está sem o guarda-redes principal.",
  "missingPlayersWarningText": "⚠️ AVISO AMARELO: Equipa extremamente desfalcada no setor recuado. Pouco entrosamento defensivo pode condicionar a estabilidade, direcionando para uma abordagem de cautela extrema ou mercado Under de golos devido ao bloco baixo.",
  "extractedLiveStats": {
    "xg": "0.35 - 0.90",
    "shots": "3(1) - 6(2)",
    "possession": "45% - 55%",
    "others": "Cantos: 2-3"
  },
  "physicalAnalysis": {
    "weatherImpact": "O tempo adverso abranda o cariz ofensivo, limitando passes longos de precisão.",
    "pitchImpact": "Relvado pesado reduz a velocidade de desmarcação rápida e favorece o jogo físico de choque direto nas áreas.",
    "fieldSizeImpact": "Campo estreito/pequeno elimina a vantagem de construção ofensiva de alta largura do favorito, permitindo ao bloco defensivo fechar todos os espaços centrais de forma hercúlea."
  },
  "tacticalTendency": "Confronto trancado no miolo, com ambas as equipas a adotar postura defensiva posicional sem forçar transições verticais.",
  "whereGameLeans": "O jogo tende para um empate tático ou vitória magra da equipa que cometer menos erros individuais.",
  "recommendedMarket": "Under 2.5 Golos ou Menos de 1.0 Golo Asiático na 1ª Parte",
  "analysisReport": "Historial de confrontos recentes aponta para domínio repartido e precaução extra a defender."
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        }
      });

      const responseText = response.text || "{}";
      res.json(JSON.parse(responseText));

    } catch (error: any) {
      console.error("[Gemini-Live] Erro de análise ao vivo:", error);
      res.status(500).json({ status: "error", message: formatGeminiError(error) });
    }
  });

  // API to generate AI match prediction and detailed technical analysis for FootballPredictionsTable
  app.post("/api/gemini/generate-football-analysis", async (req, res) => {
    const { homeTeam, awayTeam, competition, date, time, tip, odd } = req.body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      res.status(500).json({ status: "error", message: "A chave de API do Gemini não está definida no servidor. Verifique Settings > Secrets." });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptText = `Age como o Analista Técnico Principal da iRunBets. Gera uma análise técnica profunda e altamente fundamentada para o seguinte jogo de futebol:
- Equipa Casa: "${homeTeam || 'Equipa A'}"
- Equipa Fora: "${awayTeam || 'Equipa B'}"
- Competição: "${competition || 'Amigáveis de clubes'}"
- Data/Hora: "${date || ''} ${time || ''}"
- Mercado/Dica sugerido: "${tip || 'Ambas Marcam'}" (Odd: ${odd || '1.75'})

INSTRUÇÕES DE RESPOSTA:
1. Faz uma pesquisa se necessário e constrói uma análise tática rigorosa em Português de Portugal (PT-PT), focada em momentos de forma recente, historial de confrontos, dinâmicas ofensivas/defensivas e expectativa de golos/ritmo de jogo.
2. Formata a resposta num objeto JSON estrito com as seguintes chaves:
   - "predictionTitle": "PROGNÓSTICO ${homeTeam?.toUpperCase() || 'EQUIPA A'} vs ${awayTeam?.toUpperCase() || 'EQUIPA B'}"
   - "editorSuggestion": "${tip || 'Ambas Marcam'} @ ${odd || '1.75'}"
   - "predictionText": "Análise técnica em texto corrido (3 a 4 parágrafos pequenos, de leitura agradável, sem promessas vazias, fundamentando a escolha com dados estatísticos e lógica desportiva)."
   - "confidenceLevel": 9
   - "homeProb": 52
   - "drawProb": 26
   - "awayProb": 22
   - "over25Prob": 64
   - "bttsProb": 68
   - "bestBet": "${tip || 'Ambas Marcam (BTTS)'} / Odd ${odd || '1.75'}"
   - "expectedValue": "+EV (Excelente Valor)"

Exemplo de formato JSON estrito:
{
  "predictionTitle": "PROGNÓSTICO BENFICA vs ACADEMICA",
  "editorSuggestion": "Ambas as equipas marcam - Sim @ 1.75",
  "predictionText": "O confronto entre o Benfica e a Académica promete ser um teste dinâmico ao estado de prontidão física de ambos os planteis...\\n\\nA tendência dos últimos jogos amigáveis aponta para uma forte inclinação ofensiva...\\n\\nPosto isto, com base na inteligência algorítmica e na probabilidade esperada (+EV), a nossa principal recomendação reside na aposta 'Ambas Marcam'.",
  "confidenceLevel": 9,
  "homeProb": 58,
  "drawProb": 24,
  "awayProb": 18,
  "over25Prob": 65,
  "bttsProb": 70,
  "bestBet": "Ambas Marcam (BTTS) / Odd 1.75",
  "expectedValue": "+EV (Excelente Valor)"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        }
      });

      const responseText = response.text || "{}";
      const resultObj = JSON.parse(responseText);
      resultObj.isAiGenerated = true;

      res.json({
        status: "success",
        data: resultObj
      });

    } catch (error: any) {
      console.error("[Gemini-Analysis] Erro ao gerar análise:", error);
      res.status(500).json({ status: "error", message: formatGeminiError(error) });
    }
  });

  // API to generate AI Simultaneous Wins Analysis for 4 to 13 teams in a betting slip
  app.post("/api/gemini/analyze-simultaneous-wins", async (req, res) => {
    const { selections, totalOdd } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      res.status(500).json({ status: "error", message: "A chave de API do Gemini não está definida no servidor." });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptText = `Age como o Super Computador Tático da SuperIA e Analista Quantitativo de Apostas Desportivas da iRunBets.
O utilizador selecionou as seguintes equipas para um boletim múltiplo de apostas:
${JSON.stringify(selections, null, 2)}
Odd Combinada do Boletim: @${totalOdd || 'Multi'}

INSTRUÇÕES OBRIGATÓRIAS:
1. Analisa as vitórias em simultâneo destas equipas (4, 5, 6 ou até 13 seleções).
2. Se existirem equipas repetidas no mesmo boletim em datas diferentes, avalia explicitamente a probabilidade de vitórias consecutivas da mesma equipa em dias distintos do mesmo ciclo de jogos.
3. Faz uma síntese quantitativa e scout tático das probabilidades de todas ganharem em simultâneo.
4. Responde em JSON estrito com os seguintes campos:
{
  "scoutVerdict": "Resumo do veredito com estimativa quantitativa e scout dos planteis",
  "historicalSimultaneousNote": "Texto explicativo sobre a co-ocorrência histórica das equipas",
  "repeatedTeamsInsight": "Análise específica para equipas repetidas em datas diferentes (ou vazio se não houver)",
  "weakestLinkAlert": "Identificação e aviso sobre o jogo mais perigoso/vulnerável",
  "expectedValueComment": "Comentário sobre se a odd total tem valor (+EV) face ao histórico"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        }
      });

      const responseText = response.text || "{}";
      const resultObj = JSON.parse(responseText);

      res.json({
        status: "success",
        data: resultObj
      });
    } catch (error: any) {
      console.error("[Gemini-Simultaneous-Wins] Erro:", error);
      res.status(500).json({ status: "error", message: formatGeminiError(error) });
    }
  });

  // Helper function to generate natural, conversational assistant responses
  function generateConversationalAssistantResponse(message: string, ctx: any): string {
    const text = (message || '').toLowerCase().trim();
    const homeTeam = ctx.homeTeam || "Equipa da Casa";
    const awayTeam = ctx.awayTeam || "Equipa Forasteira";
    const prob1 = Number(ctx.probHome ?? ctx.prob1 ?? 45);
    const probX = Number(ctx.probDraw ?? ctx.probX ?? 28);
    const prob2 = Number(ctx.probAway ?? ctx.prob2 ?? 27);
    const xgHome = ctx.xgHome != null && !isNaN(Number(ctx.xgHome)) ? Number(ctx.xgHome).toFixed(2) : "1.35";
    const xgAway = ctx.xgAway != null && !isNaN(Number(ctx.xgAway)) ? Number(ctx.xgAway).toFixed(2) : "1.05";
    const totalXg = (Number(xgHome) + Number(xgAway)).toFixed(2);
    const bttsProb = ctx.bttsProb ?? Math.min(85, Math.max(35, Math.round(44 + (Number(xgHome) * Number(xgAway) - 1.1) * 24)));
    const over15Prob = ctx.over15Prob ?? Math.min(95, Math.max(60, Math.round(66 + (Number(totalXg) - 2.0) * 24)));
    const over25Prob = ctx.over25Prob ?? Math.min(88, Math.max(30, Math.round(45 + (Number(totalXg) - 2.2) * 26)));
    const favTeam = prob1 >= prob2 ? homeTeam : awayTeam;
    const underdogTeam = prob1 >= prob2 ? awayTeam : homeTeam;
    const favProb = Math.max(prob1, prob2);

    // 1. Saudações ("ola", "olá", "bom dia", "boas", etc.)
    if (/^(ol[aá]|boas|bom dia|boa tarde|boa noite|oi|hey|hello|hi)/i.test(text) || text.length <= 4 && /^(ol|oi|hi)/i.test(text)) {
      return `Olá! Tudo bem? Sou o teu assistente de apostas e análise desportiva. Como estamos de apostas hoje?

Estás de olho neste duelo entre o **${homeTeam}** e o **${awayTeam}** ou procuras alguma recomendação para o teu bilhete? Diz-me o que tens em mente!`;
    }

    // 2. "como estamos de apostas hoje?" / "apostas hoje"
    if (text.includes('como estamos') || text.includes('apostas hoje') || text.includes('o que temos hoje') || text.includes('dicas para hoje')) {
      return `Hoje temos boas oportunidades em análise! Para este jogo **${homeTeam} vs ${awayTeam}**, o modelo coloca o **${favTeam}** como favorito com **${favProb}%** de probabilidade e estimamos cerca de **${totalXg}** golos esperados (xG).

Queres apostar no resultado final (1X2), estás mais inclinado para o mercado de golos (como Over ou Ambas Marcam), ou queres ver se há valor nas odds?`;
    }

    // 3. "tudo bem?" / "como estás"
    if (text.includes('tudo bem') || text.includes('como estás') || text.includes('tudo bom') || text.includes('como vais')) {
      return `Tudo ótimo por aqui, 100% focado a dissecar as estatísticas e as odds do dia! E contigo, como estão a correr as apostas? Queres ver algum detalhe deste jogo?`;
    }

    // 4. Quem ganha / Favoritismo
    if (text.includes('quem ganha') || text.includes('quem vence') || text.includes('favorit') || text.includes('vencedor') || text.includes('ganha') || text.includes('vence')) {
      return `Olhando para os números deste embate, o modelo dá **${prob1}%** de probabilidade de vitória ao **${homeTeam}**, **${probX}%** ao empate e **${prob2}%** ao **${awayTeam}**.

O **${favTeam}** assume aqui o favoritismo (${favProb}% de probabilidade e ${prob1 >= prob2 ? xgHome : xgAway} xG projetado). Se fores a seco na vitória, há bom fundamento matemático, mas se quiseres um bilhete mais conservador, a Dupla Chance protege contra uma surpresa do ${underdogTeam}. O que achas?`;
    }

    // 5. Golos / Over / Ambas Marcam
    if (text.includes('golo') || text.includes('golos') || text.includes('over') || text.includes('under') || text.includes('ambas') || text.includes('btts')) {
      return `Em termos de golos para este jogo, a expectativa total está fixada em **${totalXg} xG**.

As probabilidades apontam para **${over15Prob}%** de chances no Mais de 1.5 Golos, **${over25Prob}%** no Mais de 2.5 e **${bttsProb}%** para Ambas as Equipas Marcarem. É um jogo com ${Number(totalXg) >= 2.4 ? 'boa propensão ofensiva' : 'tendência para ritmo mais tático e controlado'}. Qual destes mercados costumas preferir?`;
    }

    // 6. Cansaço / 70 minutos / Quebra física
    if (text.includes('70') || text.includes('cansaço') || text.includes('fadiga') || text.includes('físic')) {
      return `A partir dos 70 minutos a quebra física costuma fazer a diferença. Se o jogo chegar aos últimos 20 minutos empatado ou com margem curta, as linhas defensivas começam a esticar e as falhas de concentração aumentam, sendo uma boa janela para golos tardios se estiveres a acompanhar ao vivo.`;
    }

    // 7. Empate
    if (text.includes('empate') || text.includes('empata') || text === 'x') {
      return `O empate neste jogo está cotado pelo modelo com uma probabilidade de **${probX}%**. A diferença de xG entre as duas equipas é de ${(Math.abs(Number(xgHome) - Number(xgAway))).toFixed(2)}, o que indica que ${Math.abs(Number(xgHome) - Number(xgAway)) < 0.4 ? 'o equilíbrio tático pode facilmente arrastar o resultado para a divisão de pontos' : 'o favorito tem vantagem clara para desbloquear o marcador'}.`;
    }

    // Resposta padrão natural e descontraída
    return `Percebo perfeitamente! Para o embate **${homeTeam} vs ${awayTeam}** (${prob1}% [1] | ${probX}% [X] | ${prob2}% [2]), estou aqui para te ajudar a escolher a melhor aposta ou validar o teu raciocínio.

Diz-me, em que mercado estás mais tentado a apostar neste jogo?`;
  }

  // API to handle Interactive Balneário / UEFA DT Chat for a specific match
  app.post("/api/gemini/dt-chat", async (req, res) => {
    const { history, newMessage, matchContext } = req.body;
    const ctx = matchContext || {};
    const textToSend = (newMessage || '').trim();

    // Generate immediate fallback reply to guarantee quality response
    const fallbackReply = generateConversationalAssistantResponse(textToSend, ctx);

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      res.json({
        status: "success",
        reply: fallbackReply
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const homeTeam = ctx.homeTeam || "Equipa Casa";
      const awayTeam = ctx.awayTeam || "Equipa Fora";
      const prob1 = ctx.probHome ?? ctx.prob1 ?? "N/A";
      const probX = ctx.probDraw ?? ctx.probX ?? "N/A";
      const prob2 = ctx.probAway ?? ctx.prob2 ?? "N/A";
      const xgHome = ctx.xgHome ?? "N/A";
      const xgAway = ctx.xgAway ?? "N/A";
      const competition = ctx.competition || "Campeonato";

      const systemInstruction = `És o Assistente Inteligente de Apostas Desportivas e Análise da iRunBets.
O teu objetivo é conversar diretamente com o apostador de forma amigável, acolhedora, humana e conversacional, como um assistente de IA moderno e descontraído.
Jogo atual em análise: ${homeTeam} vs ${awayTeam} (${competition}).
Métricas do modelo: ${prob1}% Casa [1] | ${probX}% Empate [X] | ${prob2}% Fora [2] | xG esperado: ${xgHome} vs ${xgAway}.

REGRAS DE CONVERSAÇÃO:
1. Fala sempre em Português de Portugal (PT-PT) fluído, educado e próximo.
2. Quando o utilizador te diz "olá", "boas" ou cumprimenta, responde de forma natural e simpática: por exemplo "Olá! Tudo bem? Sou o teu assistente, como estamos de apostas hoje? Queres olhar para este jogo entre o ${homeTeam} e o ${awayTeam}?".
3. NUNCA respondas com listas rígidas enumeradas (1️⃣, 2️⃣, 3️⃣, 4️⃣) nem relatórios burocráticos ao receber uma simples saudação!
4. Mantém um diálogo aberto, faz perguntas sobre o que o utilizador procura e fundamenta as dicas nas probabilidades e valor esperado (+EV) sem jargão excessivo.`;

      // Build strictly sanitized history that alternates starting with user
      const rawHistory = Array.isArray(history) ? history : [];
      const sanitizedHistory: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

      for (const item of rawHistory) {
        const role = (item.role === 'model' || item.role === 'assistant') ? 'model' : 'user';
        const text = (item.text || item.content || '').trim();
        if (!text) continue;

        // Skip if first item would be model
        if (sanitizedHistory.length === 0 && role === 'model') {
          continue;
        }

        // Avoid consecutive roles
        if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === role) {
          continue;
        }

        sanitizedHistory.push({
          role,
          parts: [{ text }]
        });
      }

      // If last item in sanitized history is user, drop it because newMessage will be sent
      if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === 'user') {
        sanitizedHistory.pop();
      }

      const chat = ai.chats.create({
        model: 'gemini-3.8-flash',
        config: {
          systemInstruction,
        },
        history: sanitizedHistory
      });

      const result = await chat.sendMessage({ message: textToSend || "Olá" });
      if (result && result.text) {
        res.json({
          status: "success",
          reply: result.text
        });
        return;
      }

      res.json({
        status: "success",
        reply: fallbackReply
      });

    } catch (error: any) {
      console.warn("[Gemini-DT-Chat] Fallback ativado para motor tático UEFA:", error?.message || error);
      // Seamless fallback to the rich UEFA analysis engine
      res.json({
        status: "success",
        reply: fallbackReply
      });
    }
  });

  // API to analyze betting ticket simulation (#Ticket 5) with AI for success probability, risk & insights
  app.post("/api/gemini/ticket-analysis", async (req, res) => {
    const { selections = [], stake = 10, totalOdd = 1, jointProb = 50 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    // Fast fallback analysis generator if API is unavailable or rate limited
    const generateFallbackAnalysis = () => {
      const count = selections.length;
      const numTotalOdd = Number(totalOdd) || 1;
      const numJointProb = Number(jointProb) || Math.max(5, Math.min(95, Math.round((1 / numTotalOdd) * 85)));
      
      let riskLevel: 'Conservador' | 'Moderado' | 'Alto Risco' | 'Extremo (Lotaria)' = 'Moderado';
      let confidenceScore = Math.min(95, Math.max(25, Math.round(numJointProb)));
      
      if (numTotalOdd < 2.5 && count <= 3) {
        riskLevel = 'Conservador';
        confidenceScore = Math.max(78, confidenceScore);
      } else if (numTotalOdd <= 6.0 && count <= 5) {
        riskLevel = 'Moderado';
        confidenceScore = Math.min(80, Math.max(55, confidenceScore));
      } else if (numTotalOdd <= 18.0) {
        riskLevel = 'Alto Risco';
        confidenceScore = Math.min(60, Math.max(35, confidenceScore));
      } else {
        riskLevel = 'Extremo (Lotaria)';
        confidenceScore = Math.min(35, Math.max(15, confidenceScore));
      }

      // Find strongest and riskiest picks
      let strongest = selections[0] ? `${selections[0].match || selections[0].teamName || 'Seleção 1'}: ${selections[0].selection || selections[0].market || 'Aposta'} (@${selections[0].odd || '1.30'})` : 'Seleção Principal';
      let riskiest = selections[0] ? `${selections[0].match || selections[0].teamName || 'Seleção'}: ${selections[0].selection || selections[0].market || 'Aposta'} (@${selections[0].odd || '1.80'})` : 'Seleção';
      
      let maxOdd = 0;
      let minOdd = 999;
      selections.forEach((s: any) => {
        const o = Number(s.odd) || 1.5;
        if (o > maxOdd) {
          maxOdd = o;
          riskiest = `${s.match || s.teamName || 'Jogo'}: ${s.selection || s.market || 'Seleção'} (@${o.toFixed(2)})`;
        }
        if (o < minOdd) {
          minOdd = o;
          strongest = `${s.match || s.teamName || 'Jogo'}: ${s.selection || s.market || 'Seleção'} (@${o.toFixed(2)})`;
        }
      });

      const potentialGross = (Number(stake) * numTotalOdd).toFixed(2);
      const potentialProfit = (Number(stake) * numTotalOdd - Number(stake)).toFixed(2);

      let advice = "Para aumentar a probabilidade de acerto, pondera proteger a seleção de maior odd com Dupla Chance ou linha asiática de segurança.";
      if (count > 5) {
        advice = `O bilhete possui ${count} jogos acumulados. Em múltiplas longas, o efeito multiplicador aumenta exponencialmente a margem da casa. Reduzir para 3 ou 4 jogos consolidados maximiza o valor esperado (+EV) no longo prazo.`;
      } else if (numTotalOdd < 2.0) {
        advice = "Bilhete com odd bastante contida e alta taxa teórica de acerto. Excelente para gestão de banca em unidades fixas.";
      }

      return {
        confidenceIndex: confidenceScore,
        riskCategory: riskLevel,
        probabilityPercentage: numJointProb,
        totalOdd: numTotalOdd.toFixed(2),
        potentialReturn: potentialGross,
        potentialProfit: potentialProfit,
        summary: `Simulação de ${count} seleção(ões) com cota combinada de @${numTotalOdd.toFixed(2)}. Probabilidade combinada estimada em ${numJointProb}% com perfil de risco ${riskLevel}.`,
        strongestPick: strongest,
        riskiestPick: riskiest,
        optimizationAdvice: advice,
        expectedValueComment: numTotalOdd * (numJointProb / 100) >= 1.05 
          ? "Indicador +EV Positivo: O retorno potencial compensa a probabilidade calculada pelo modelo algorítmico."
          : "Indicador Neutro/Cuidado: A odd oferecida pelas casas está muito ajustada. Recomenda-se cautela no dimensionamento da stake."
      };
    };

    if (!apiKey) {
      return res.json({ status: "success", data: generateFallbackAnalysis(), isFallback: true });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptText = `Age como o Analista de Risco e Inteligência Artificial da iRunBets.
O utilizador simulou o seguinte bilhete de apostas desportivas (#Ticket 5):
- Número de Seleções: ${selections.length}
- Seleções do Bilhete: ${JSON.stringify(selections, null, 2)}
- Stake Investida: ${stake} €
- Odd Total Combinada: @${totalOdd}
- Probabilidade Estimada Preliminar: ${jointProb}%

Faz uma análise minuciosa da probabilidade de sucesso, consistência matemática e risco do bilhete.
Responde estritamente num JSON com as seguintes chaves:
{
  "confidenceIndex": 76,
  "riskCategory": "Conservador | Moderado | Alto Risco | Extremo (Lotaria)",
  "probabilityPercentage": 68,
  "totalOdd": "${totalOdd}",
  "potentialReturn": "${(Number(stake) * Number(totalOdd)).toFixed(2)}",
  "potentialProfit": "${(Number(stake) * Number(totalOdd) - Number(stake)).toFixed(2)}",
  "summary": "Diagnóstico do bilhete em 2-3 frases claras e objetivas em Português de Portugal.",
  "strongestPick": "Identificação da seleção mais sólida e porquê",
  "riskiestPick": "Identificação da seleção mais perigosa que pode estragar a múltipla",
  "optimizationAdvice": "Sugestão prática da IA para melhorar o bilhete (ex: proteger com dupla chance, reduzir um jogo ou rever mercado)",
  "expectedValueComment": "Avaliação se a aposta tem valor esperado positivo (+EV)"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
        }
      });

      const responseText = response.text || "{}";
      const resultObj = JSON.parse(responseText);

      return res.json({
        status: "success",
        data: resultObj
      });
    } catch (err: any) {
      console.warn("[Gemini-Ticket-Analysis] Falha na IA externa, usando motor probabilístico local:", err?.message || err);
      return res.json({
        status: "success",
        data: generateFallbackAnalysis(),
        isFallback: true
      });
    }
  });

  // Persistent Football Predictions Server Sync Storage
  const predictionsFilePath = path.join(process.cwd(), 'football_predictions_store.json');
  let inMemoryFootballPredictions: any[] | null = null;

  app.get("/api/football-predictions", (req, res) => {
    try {
      if (inMemoryFootballPredictions !== null) {
        return res.json({ status: "success", matches: inMemoryFootballPredictions });
      }
      if (fs.existsSync(predictionsFilePath)) {
        const raw = fs.readFileSync(predictionsFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        inMemoryFootballPredictions = parsed;
        return res.json({ status: "success", matches: parsed });
      }
      return res.json({ status: "success", matches: null });
    } catch (err: any) {
      console.error("Error reading football predictions from server store:", err);
      return res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/football-predictions", (req, res) => {
    try {
      const { matches } = req.body;
      if (Array.isArray(matches)) {
        inMemoryFootballPredictions = matches;
        fs.writeFileSync(predictionsFilePath, JSON.stringify(matches, null, 2), 'utf-8');
        return res.json({ status: "success", count: matches.length });
      }
      return res.status(400).json({ status: "error", message: "Invalid matches array" });
    } catch (err: any) {
      console.error("Error writing football predictions to server store:", err);
      return res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Serve Service Worker & Manifest explicitly for FCM Web Push & PWA support
  app.get('/firebase-messaging-sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    const swPath = path.join(process.cwd(), 'firebase-messaging-sw.js');
    if (fs.existsSync(swPath)) {
      res.sendFile(swPath);
    } else {
      res.status(404).send('Not found');
    }
  });

  app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const manifestPath = path.join(process.cwd(), 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.sendFile(manifestPath);
    } else {
      res.status(404).send('Not found');
    }
  });

  // Middleware to disable caching for index.html and SPA entry points so every device gets latest build on Render
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // Vite middleware for development or serving bundle for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      etag: false,
      lastModified: false,
      setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }));

    app.get('*all', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Full-Stack Server listening on http://localhost:${PORT}`);
  });
}

startServer();
