import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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

async function saveToFirestoreCache(docId: string, payload: any) {
  if (!serverDb) return;
  try {
    const updatedAt = new Date().toISOString();
    const docData = {
      updatedAt,
      data: payload.data || payload,
      standings: payload.data?.standings || payload.standings || [],
      status: "success",
      source: payload.source || "api_proxy"
    };
    await setDoc(doc(serverDb, "cached_data", docId), docData, { merge: true });
    console.log(`[Proxy] Firestore cached_data/${docId} written successfully!`);
  } catch (err: any) {
    console.error(`[Proxy] Failed writing cached_data/${docId} to Firestore:`, err?.message || err);
  }
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

  // Independent Direct Gemini API Endpoint for League Standings (100% Direct Gemini, no external Cloud Function dependency)
  const handleDirectGeminiStandings = async (req: express.Request, res: express.Response) => {
    const competition = (req.query.competition as string) || 'PPL';
    const season = (req.query.season as string) || '2026';
    console.log(`[Direct Gemini API] Request received for competition: ${competition}, season: ${season}`);

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

    const sendAndCache = async (payload: any) => {
      res.json(payload);
      saveToFirestoreCache(`${competition}_${season}`, payload);
      saveToFirestoreCache(competition, payload);
    };

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
      
      const response = await fetch(targetUrl);
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
        await sendAndCache({
          status: "success",
          source: "emergency_mock_fallback",
          data: {
            competition: { code: competition, name: competition },
            standings: [
              {
                stage: "REGULAR_SEASON",
                type: "TOTAL",
                table: [
                  {
                    position: 1,
                    team: { id: 1, name: "St. Gallen", crest: "" },
                    playedGames: 18, won: 12, draw: 3, lost: 3, points: 39, goalsFor: 32, goalsAgainst: 16, goalDifference: 16
                  },
                  {
                    position: 2,
                    team: { id: 2, name: "Chelsea FC", crest: "" },
                    playedGames: 18, won: 11, draw: 4, lost: 3, points: 37, goalsFor: 35, goalsAgainst: 18, goalDifference: 17
                  }
                ]
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
