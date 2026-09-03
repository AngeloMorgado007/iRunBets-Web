import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'pt' | 'en' | 'fr' | 'it' | 'de';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Navbar
    'nav.home': 'Início',
    'nav.purificador': 'Purificador',
    'nav.radar': 'Radar de Favoritas',
    'nav.channels_vip': 'Canais VIP 📡',
    'nav.news': 'Notícias',
    'nav.faq': 'Perguntas Frequentes',
    'nav.admin_panel': 'Painel Admin',
    'nav.hello': 'Olá,',
    'nav.logout': 'Sair',
    'nav.support': 'Suporte',
    'nav.sign_in': 'Entrar / Registar',
    
    // Hero & Generic
    'hero.badge': 'Inteligência Artificial & Estatística',
    'hero.title': 'Maximiza a tua vantagem matemática no futebol.',
    'hero.desc': 'A primeira plataforma integrada que purifica centenas de odds diárias do mercado, revelando apenas aquelas com Valor Esperado Positivo (+EV) real.',
    'hero.btn_purifier': 'Abrir Purificador',
    'hero.btn_radar': 'Radar de Equipas',
    'hero.btn_vip': 'Aceder Canais VIP',

    // VIP Dashboard & Slip Form
    'vip.title_sync': 'Sincronização Firebase Real-time Engine ativa com sucesso. Os dados da sua banca inicial (€{0}), casa de apostas ({1}) e boletins ({2} boletins correspondidos) estão seguros e integrados em tempo real.',
    'vip.modal_title': 'REGISTAR NOVO BOLETIN DE APOSTAS (WEB)',
    'vip.modal_desc': 'Estes dados serão salvos de forma independente na coleção webBetSlips.',
    'vip.slip_name': 'Nome do Boletim / Template',
    'vip.slip_name_placeholder': 'Ex: Múltipla Premier League',
    'vip.slip_type': 'Tipo Boletim',
    'vip.slip_type_multiple': 'Boletim Múltiplo',
    'vip.slip_type_simple': 'Boletim Simples',
    'vip.overall_status': 'Estado Geral',
    'vip.stake': 'Investimento / Stake (€)',
    'vip.stake_placeholder': 'Ex: 10',
    'vip.combined_odd': 'Odd Total Combinada',
    'vip.combined_odd_placeholder': 'Ex: 2.10',
    'vip.emitter_channel': 'Canal do Emissor',
    'vip.emitter_channel_name': '🌍 Painel de Gestor VIP',
    'vip.selection': 'Seleção #',
    'vip.remove_selection': 'Remover Seleção',
    'vip.home_team': 'Equipa da Casa',
    'vip.home_team_placeholder': 'Ex: Rio Ave',
    'vip.away_team': 'Equipa de Fora',
    'vip.away_team_placeholder': 'Ex: Benfica',
    'vip.sport': 'Desporto',
    'vip.sport_football': '⚽ Futebol',
    'vip.sport_basketball': '🏀 Basquetebol',
    'vip.sport_tennis': '🎾 Ténis',
    'vip.sport_other': '🎲 Outros',
    'vip.competition_league': 'Competição / Liga',
    'vip.competition_placeholder': 'Ex: Primeira Liga',
    'vip.prediction': 'Prognóstico',
    'vip.prediction_placeholder': 'Ex: V2 (Benfica)',
    'vip.selection_odd': 'Odd Seleção',
    'vip.selection_odd_placeholder': 'Ex: 1.45',
    'vip.prediction_status': 'Estado Prognóstico',
    'vip.status_pending': '🟡 Pendente',
    'vip.status_won': '🟢 Ganho',
    'vip.status_lost': '🔴 Perdido',
    'vip.status_voided': '⚫ Reembolsado/Anulado',
    'vip.status_green': '🟢 Ganho (Green)',
    'vip.status_red': '🔴 Perdido (Red)',
    'vip.observations': 'Observações / Anotação do Evento (Opcional)',
    'vip.observations_placeholder': 'Ex: Grande favoritismo do Benfica fora de portas, equipe completa.',
    'vip.btn_cancel': 'Cancelar',
    'vip.btn_confirm': 'Confirmar Registo 🚀',
    'vip.add_event': '+ ADICIONAR EVENTO',
    'vip.sync_title': 'Comparador Simples vs Múltiplas',
    'vip.sync_desc': 'Taxa de eficácia de Greens/Reds integrados (iPhone iOS & Web)',
    'vip.simple_slips': 'Boletins Simples',
    'vip.multiple_slips': 'Boletins Múltiplos',
    'vip.total': 'Total',
    'vip.efficacy': 'Eficácia (Greens):',
    'vip.iphone_bets': 'Apostas do iPhone',
    'vip.web_bets': 'Apostas da Web',
    'vip.no_slips': 'Nenhum boletim sincronizado (iPhone ou Web) para processar métricas.',

    // FAQ Section
    'faq.transparency': 'TRANSPARÊNCIA E RIGOR',
    'faq.title': 'Perguntas Frequentes',
    'faq.desc': 'Esclarece as tuas dúvidas sobre como os nossos modelos matemáticos de inteligência artificial desmistificam as probabilidades do futebol tradicional.',
    'faq.q1': 'Como é que a Inteligência Artificial calcula o "valor matemático" (+EV)?',
    'faq.a1': 'O nosso algoritmo calcula as probabilidades reais de um evento de futebol a partir de um modelo estatístico profundo de Poisson e Monte Carlo, cruzando mais de 100 métricas históricas das equipas (golos marcados/sofridos, desgaste de plantel, remates efetuados, probabilidade xG e confronto direto). Se a nossa IA calcula que o Real Madrid tem 60% de probabilidade de vitória (odd estatisticamente justa de 1.66), mas a casa de apostas oferece uma odd de 1.95, é detetado um Valor Esperado Positivo (+EV) de +17.4%. Operas com vantagem matemática do teu lado, batendo os bookmakers a longo prazo.',
    'faq.q2': 'A aplicação iRunBets garante lucros diários ou ganhos certos no futebol?',
    'faq.a2': 'Não, e qualquer garantia de lucros certos ou 100% de vitórias no desporto é uma ilusão enganosa. O futebol envolve fatores aleatórios impossíveis de prever com exatidão — como expulsões físicas, decisões arbitrais ou lesões em campo. O objetivo do iRunBets não é prometer certezas a curto prazo, mas sim dotar-te de análises matemáticas rigorosas para apostar apenas em opções subvalorizadas. Estatisticamente, jogar persistentemente com +EV é o único modelo matemático que protege a banca e gera saldos sustentáveis.',
    'faq.q3': 'É necessário carregar os dados estatísticos ou as tabelas de forma manual?',
    'faq.a3': 'Absolutamente não. A infraestrutura da iRunBets está ligada diretamente a bases de dados desportivas globais que atualizam dados em tempo real. O "Radar de Equipas Favoritas" e o "Purificador de Odds" acedem e consolidam as classificações, resultados recentes, cartões e estatísticas de cantos das maiores ligas europeias e americanas (Liga Portugal, Premier League, La Liga, Champions, Brasileirão) de forma 100% automática e transparente.'
  },
  en: {
    // Navbar
    'nav.home': 'Home',
    'nav.purificador': 'Purifier',
    'nav.radar': 'Favorites Radar',
    'nav.channels_vip': 'VIP Channels 📡',
    'nav.news': 'News',
    'nav.faq': 'FAQ',
    'nav.admin_panel': 'Admin Panel',
    'nav.hello': 'Hello,',
    'nav.logout': 'Logout',
    'nav.support': 'Support',
    'nav.sign_in': 'Login / Register',

    // Hero & Generic
    'hero.badge': 'Artificial Intelligence & Statistics',
    'hero.title': 'Maximize your mathematical edge in football.',
    'hero.desc': 'The first integrated platform that purifies hundreds of daily market odds, revealing only those with real Positive Expected Value (+EV).',
    'hero.btn_purifier': 'Open Purifier',
    'hero.btn_radar': 'Teams Radar',
    'hero.btn_vip': 'Access VIP Channels',

    // VIP Dashboard & Slip Form
    'vip.title_sync': 'Firebase Real-time Engine sync successfully active. Your starting bankroll (€{0}), betting house ({1}) and betslips ({2} matched betslips) are secure and integrated in real-time.',
    'vip.modal_title': 'REGISTER NEW BETSLIP (WEB)',
    'vip.modal_desc': 'This data will be saved independently in the webBetSlips collection.',
    'vip.slip_name': 'Betslip Name / Template',
    'vip.slip_name_placeholder': 'Ex: Multiple Premier League',
    'vip.slip_type': 'Betslip Type',
    'vip.slip_type_multiple': 'Multiple Betslip',
    'vip.slip_type_simple': 'Simple Betslip',
    'vip.overall_status': 'Overall State',
    'vip.stake': 'Investment / Stake (€)',
    'vip.stake_placeholder': 'Ex: 10',
    'vip.combined_odd': 'Combined Total Odd',
    'vip.combined_odd_placeholder': 'Ex: 2.10',
    'vip.emitter_channel': 'Issuer Channel',
    'vip.emitter_channel_name': '🌍 VIP Manager Dashboard',
    'vip.selection': 'Selection #',
    'vip.remove_selection': 'Remove Selection',
    'vip.home_team': 'Home Team',
    'vip.home_team_placeholder': 'Ex: Rio Ave',
    'vip.away_team': 'Away Team',
    'vip.away_team_placeholder': 'Ex: Benfica',
    'vip.sport': 'Sport',
    'vip.sport_football': '⚽ Football',
    'vip.sport_basketball': '🏀 Basketball',
    'vip.sport_tennis': '🎾 Tennis',
    'vip.sport_other': '🎲 Other',
    'vip.competition_league': 'Competition / League',
    'vip.competition_placeholder': 'Ex: Premier League',
    'vip.prediction': 'Prediction',
    'vip.prediction_placeholder': 'Ex: V2 (Benfica)',
    'vip.selection_odd': 'Selection Odd',
    'vip.selection_odd_placeholder': 'Ex: 1.45',
    'vip.prediction_status': 'Prediction Status',
    'vip.status_pending': '🟡 Pending',
    'vip.status_won': '🟢 Won',
    'vip.status_lost': '🔴 Lost',
    'vip.status_voided': '⚫ Refunded/Voided',
    'vip.status_green': '🟢 Won (Green)',
    'vip.status_red': '🔴 Lost (Red)',
    'vip.observations': 'Observations / Event Note (Optional)',
    'vip.observations_placeholder': 'Ex: Benfica strong favorites playing away, full squad available.',
    'vip.btn_cancel': 'Cancel',
    'vip.btn_confirm': 'Confirm Registration 🚀',
    'vip.add_event': '+ ADD EVENT',
    'vip.sync_title': 'Simple vs Multiples Comparator',
    'vip.sync_desc': 'Accuracy rate of integrated Greens/Reds (iPhone iOS & Web)',
    'vip.simple_slips': 'Simple Slips',
    'vip.multiple_slips': 'Multiple Slips',
    'vip.total': 'Total',
    'vip.efficacy': 'Efficacy (Greens):',
    'vip.iphone_bets': 'iPhone Bets',
    'vip.web_bets': 'Web Bets',
    'vip.no_slips': 'No synchronized betslips (iPhone or Web) to process metrics.',

    // FAQ Section
    'faq.transparency': 'TRANSPARENCY AND RIGOUR',
    'faq.title': 'Frequently Asked Questions',
    'faq.desc': 'Clear your doubts about how our mathematical artificial intelligence models demystify traditional football betting.',
    'faq.q1': 'How does Artificial Intelligence calculate "mathematical value" (+EV)?',
    'faq.a1': 'Our algorithm calculates the real probabilities of a football event from a deep statistical model of Poisson and Monte Carlo, crossing over 100 historical metrics of teams (goals scored/conceded, squad fatigue, shots taken, xG probability and head-to-head). If our AI calculates that Real Madrid has a 60% probability of victory (statistically fair odd of 1.66), but the bookmaker offers an odd of 1.95, a Positive Expected Value (+EV) of +17.4% is detected. You operate with a mathematical advantage on your side, beating the bookmakers in the long term.',
    'faq.q2': 'Does the iRunBets app guarantee daily profits or certain football winnings?',
    'faq.a2': 'No, and any guarantee of guaranteed profits or 100% wins in sports is an misleading illusion. Football involves variables impossible to predict with exact safety — such as red cards, referee decisions, or key injuries during play. The goal of iRunBets is not to promise short-term certainties, but to provide you with rigorous mathematical analyses to only bet on undervalued options. Statistically, playing persistently with +EV is the only mathematical model that protects your bankroll and generates long-term growth.',
    'faq.q3': 'Do I need to load statistical data or tables manually?',
    'faq.a3': 'Absolutely not. The iRunBets infrastructure is connected directly to global sports databases that update files in real time. The "Favorites Teams Radar" and the "Odds Purifier" retrieve and bundle the standings, recent forms, cards and corner stats of major European and American leagues (Liga Portugal, Premier League, La Liga, Champions, Brasileirão) in a 100% automatic and seamless way.'
  },
  fr: {
    // Navbar
    'nav.home': 'Accueil',
    'nav.purificador': 'Purificateur',
    'nav.radar': 'Radar de Favorites',
    'nav.channels_vip': 'Canaux VIP 📡',
    'nav.news': 'Actualités',
    'nav.faq': 'FAQ',
    'nav.admin_panel': 'Admin Panel',
    'nav.hello': 'Bonjour,',
    'nav.logout': 'Déconnexion',
    'nav.support': 'Support',
    'nav.sign_in': 'Connexion / S\'inscrire',

    // Hero & Generic
    'hero.badge': 'Intelligence Artificielle & Statistiques',
    'hero.title': 'Maximisez votre avantage mathématique dans le football.',
    'hero.desc': 'La première plateforme intégrée qui purifie des centaines de cotes journalières, révélant uniquement celles qui possèdent un valeur attendue positive (+EV) réelle.',
    'hero.btn_purifier': 'Ouvrir le Purificateur',
    'hero.btn_radar': 'Radar d\'Équipes',
    'hero.btn_vip': 'Accéder aux Canaux VIP',

    // VIP Dashboard & Slip Form
    'vip.title_sync': 'Synchronisation Firebase Real-time Engine active. Votre capital de départ (€{0}), bookmaker ({1}) et tickets ({2} tickets correspondants) sont synchronisés en temps réel.',
    'vip.modal_title': 'ENREGISTRER UN NOUVEAU TICKET (WEB)',
    'vip.modal_desc': 'Ces données seront sauvegardées de manière indépendante dans la collection webBetSlips.',
    'vip.slip_name': 'Nom de Ticket / Modèle',
    'vip.slip_name_placeholder': 'Ex: Multiple Premier League',
    'vip.slip_type': 'Type de Ticket',
    'vip.slip_type_multiple': 'Ticket Multiple',
    'vip.slip_type_simple': 'Ticket Simple',
    'vip.overall_status': 'État Général',
    'vip.skin': 'Investissement / Stake (€)',
    'vip.stake': 'Mise / Stake (€)',
    'vip.stake_placeholder': 'Ex: 10',
    'vip.combined_odd': 'Cote Totale Combinée',
    'vip.combined_odd_placeholder': 'Ex: 2.10',
    'vip.emitter_channel': 'Canal d\'Émetteur',
    'vip.emitter_channel_name': '🌍 Console Manager VIP',
    'vip.selection': 'Sélection #',
    'vip.remove_selection': 'Retirer Sélection',
    'vip.home_team': 'Équipe à Domicile',
    'vip.home_team_placeholder': 'Ex: Rio Ave',
    'vip.away_team': 'Équipe à l\'Extérieur',
    'vip.away_team_placeholder': 'Ex: Benfica',
    'vip.sport': 'Sport',
    'vip.sport_football': '⚽ Football',
    'vip.sport_basketball': '🏀 Basket',
    'vip.sport_tennis': '🎾 Tennis',
    'vip.sport_other': '🎲 Autres',
    'vip.competition_league': 'Compétition / Ligue',
    'vip.competition_placeholder': 'Ex: Première Ligue',
    'vip.prediction': 'Pronostic',
    'vip.prediction_placeholder': 'Ex: V2 (Benfica)',
    'vip.selection_odd': 'Cote du choix',
    'vip.selection_odd_placeholder': 'Ex: 1.45',
    'vip.prediction_status': 'État du Pronostic',
    'vip.status_pending': '🟡 En attente',
    'vip.status_won': '🟢 Gagné',
    'vip.status_lost': '🔴 Perdu',
    'vip.status_voided': '⚫ Remboursé/Annulé',
    'vip.status_green': '🟢 Gagné (Green)',
    'vip.status_red': '🔴 Perdu (Red)',
    'vip.observations': 'Observations / Remarques de l\'Événement (Optionnel)',
    'vip.observations_placeholder': 'Ex: Benfica grand favori à l\'extérieur, effectif complet.',
    'vip.btn_cancel': 'Annuler',
    'vip.btn_confirm': 'Confirmer l\'Enregistrement 🚀',
    'vip.add_event': '+ AJOUTER ÉVÉNEMENT',
    'vip.sync_title': 'Comparateur Simple vs Multiple',
    'vip.sync_desc': 'Taux de succès des Greens/Reds intégrés (iPhone iOS & Web)',
    'vip.simple_slips': 'Tickets Simples',
    'vip.multiple_slips': 'Tickets Multiples',
    'vip.total': 'Total',
    'vip.efficacy': 'Efficacité (Greens):',
    'vip.iphone_bets': 'Paris iPhone',
    'vip.web_bets': 'Paris Web',
    'vip.no_slips': 'Aucun ticket synchronisé (iPhone ou Web) pour traiter les métriques.',

    // FAQ Section
    'faq.transparency': 'TRANSPARENCE ET RIGUEUR',
    'faq.title': 'Questions Fréquentes',
    'faq.desc': 'Clarifiez vos doutes sur la manière dont nos modèles mathématiques d\'intelligence artificielle analysent les probabilités du football.',
    'faq.q1': 'Comment l\'Intelligence Artificielle calcule-t-elle la "valeur mathématique" (+EV)?',
    'faq.a1': 'Notre algorithme calcule les cotes réelles d\'un événement à partir de modèles probabilistes comme Poisson et Monte Carlo, analysant plus de 100 données d\'historique (buts pour/contre, fatigue de l\'effectif, statistiques de tirs, probabilité xG et face à face). Si notre IA calcule que le Real Madrid a 60% de chances de l\'emporter (cote juste statistique à 1.66), mais le bookmaker propose 1.95, une valeur positive (+EV) de +17.4% est localisée. Vous jouez avec un avantage mathématique à long terme.',
    'faq.q2': 'L\'application iRunBets garantit-elle des gains quotidiens ou certains?',
    'faq.a2': 'Non, toute promesse de gains garantis à 100% dans le sport est mensongère. Le football s\'accompagne de facteurs imprévus — comme un carton rouge, des erreurs d\'arbitrage ou des blessures. Le but d\'iRunBets n\'est pas de prédire le futur, mais de vous équiper d\'analyses solides pour ne miser que là où la cote est surévaluée. C\'est la seule méthode mathématique pérenne.',
    'faq.q3': 'Faut-il charger les données ou classements manuellement?',
    'faq.a3': 'Pas du tout. Notre structure se relie directement aux flux sportifs mondiaux en temps réel. Le "Radar Équipes" et le "Purificateur de Cotes" intègrent les classements, formes des 5 derniers matchs et corners des championnats européens de manière automatisée.'
  },
  it: {
    // Navbar
    'nav.home': 'Inizio',
    'nav.purificador': 'Purificatore',
    'nav.radar': 'Radar dei Preferiti',
    'nav.channels_vip': 'Canali VIP 📡',
    'nav.news': 'Notizie',
    'nav.faq': 'FAQ',
    'nav.admin_panel': 'Admin Panel',
    'nav.hello': 'Ciao,',
    'nav.logout': 'Esci',
    'nav.support': 'Supporto',
    'nav.sign_in': 'Accedi / Registrati',

    // Hero & Generic
    'hero.badge': 'Intelligenza Artificiale & Statistica',
    'hero.title': 'Massimizza il tuo vantaggio matematico nel calcio.',
    'hero.desc': 'La prima piattaforma integrata che purifica centinaia di quote di mercato quotidiane, rivelando solo quelle con un reale Valore Atteso Positivo (+EV).',
    'hero.btn_purifier': 'Apri Purificatore',
    'hero.btn_radar': 'Radar Squadre',
    'hero.btn_vip': 'Accedi ai Canali VIP',

    // VIP Dashboard & Slip Form
    'vip.title_sync': 'Sincronizzazione Firebase Real-time Engine attiva. Banca iniziale (€{0}), bookmaker ({1}) e schedine ({2} schedine collegate) monitorate in tempo reale.',
    'vip.modal_title': 'REGISTRA NUOVO BOLLINO (WEB)',
    'vip.modal_desc': 'Questi dati verranno salvati indipendentemente nella collezione webBetSlips.',
    'vip.slip_name': 'Nome Schedina / Modello',
    'vip.slip_name_placeholder': 'Es: Multipla Premier League',
    'vip.slip_type': 'Tipo Schedina',
    'vip.slip_type_multiple': 'Schedina Multipla',
    'vip.slip_type_simple': 'Schedina Singola',
    'vip.overall_status': 'Stato Generale',
    'vip.stake': 'Investimento / Stake (€)',
    'vip.stake_placeholder': 'Es: 10',
    'vip.combined_odd': 'Quota Totale Combinata',
    'vip.combined_odd_placeholder': 'Es: 2.10',
    'vip.emitter_channel': 'Canale di Emissione',
    'vip.emitter_channel_name': '🌍 Pannello Gestore VIP',
    'vip.selection': 'Selezione #',
    'vip.remove_selection': 'Rimuovi Selezione',
    'vip.home_team': 'Squadra di Casa',
    'vip.home_team_placeholder': 'Es: Rio Ave',
    'vip.away_team': 'Squadra Ospite',
    'vip.away_team_placeholder': 'Es: Benfica',
    'vip.sport': 'Sport',
    'vip.sport_football': '⚽ Calcio',
    'vip.sport_basketball': '🏀 Basket',
    'vip.sport_tennis': '🎾 Tennis',
    'vip.sport_other': '🎲 Altro',
    'vip.competition_league': 'Competizione / Lega',
    'vip.competition_placeholder': 'Es: Serie A',
    'vip.prediction': 'Pronostico',
    'vip.prediction_placeholder': 'Es: V2 (Benfica)',
    'vip.selection_odd': 'Quota Selezione',
    'vip.selection_odd_placeholder': 'Es: 1.45',
    'vip.prediction_status': 'Stato Pronostico',
    'vip.status_pending': '🟡 In Sospeso',
    'vip.status_won': '🟢 Vinta',
    'vip.status_lost': '🔴 Persa',
    'vip.status_voided': '⚫ Rimborsata/Annullata',
    'vip.status_green': '🟢 Vinta (Green)',
    'vip.status_red': '🔴 Persa (Red)',
    'vip.observations': 'Osservazioni o Note Evento (Opzionale)',
    'vip.observations_placeholder': 'Es: Benfica molto forte in trasferta, rosa al completo.',
    'vip.btn_cancel': 'Annulla',
    'vip.btn_confirm': 'Conferma Registrazione 🚀',
    'vip.add_event': '+ AGGIUNGI EVENTO',
    'vip.sync_title': 'Comparatore Singola vs Multipla',
    'vip.sync_desc': 'Tasso di precisione di Green/Red integrati (iPhone iOS & Web)',
    'vip.simple_slips': 'Schedine Singole',
    'vip.multiple_slips': 'Schedine Multiple',
    'vip.total': 'Totale',
    'vip.efficacy': 'Efficacia (Green):',
    'vip.iphone_bets': 'Scommesse iPhone',
    'vip.web_bets': 'Scommesse Web',
    'vip.no_slips': 'Nessuna schedina sincronizzata (iPhone o Web) per elaborare le metriche.',

    // FAQ Section
    'faq.transparency': 'TRASPARENZA E RIGORE',
    'faq.title': 'Domande Frequenti',
    'faq.desc': 'Risolvi i tuoi dubbi su come i nostri modelli matematici basati sull\'intelligenza artificiale decifrano le quote del calcio.',
    'faq.q1': 'Come fa l\'IA a calcolare il "valore matematico" (+EV)?',
    'faq.a1': 'Il nostro algoritmo calcola le probabilità statistiche reali usando i modelli di Poisson e Monte Carlo, incrociando più di 100 variabili delle due squadre (gol, tiri in porta, stanchezza, xG e precedenti storici). Se l\'IA stima il Real Madrid al 60% (quota equa 1.66) ma il bookmaker offre 1.95, abbiamo un grande valore statistico di +17.4%. Sfrutti un vantaggio matematico per vincere a lungo termine.',
    'faq.q2': 'L\'app iRunBets garantisce guadagni statistici sicuri o profitti giornalieri?',
    'faq.a2': 'No, chiunque garantisca guadagni certi al 100% mente. Il calcio possiede variabili casuali — cartellini rossi fortuiti, infortuni improvvisi o sviste arbitrali. iRunBets ti offre un modello analitico rigoroso per individuare le quote migliori. Nel lungo termine, operare con +EV è l\'unico approccio matematico valido.',
    'faq.q3': 'Devo inserire i dati o i risultati a mano?',
    'faq.a3': 'Certamente no. La nostra infrastruttura è connessa a database globali in tempo reale. Il "Radar Squadre" e il "Purificatore di Quote" aggiornano in autonomia le statistiche del calcio europeo e americano.'
  },
  de: {
    // Navbar
    'nav.home': 'Startseite',
    'nav.purificador': 'Analyser',
    'nav.radar': 'Favoriten Radar',
    'nav.channels_vip': 'VIP-Kanäle 📡',
    'nav.news': 'Nachrichten',
    'nav.faq': 'FAQ',
    'nav.admin_panel': 'Admin-Bereich',
    'nav.hello': 'Hallo,',
    'nav.logout': 'Abmelden',
    'nav.support': 'Support',
    'nav.sign_in': 'Anmelden / Registrieren',

    // Hero & Generic
    'hero.badge': 'Künstliche Intelligenz & Statistik',
    'hero.title': 'Maximiere deinen mathematischen Vorteil beim Fußball.',
    'hero.desc': 'Die erste integrierte Plattform, die täglich Hunderte von Wettquoten filtert und nur diejenigen mit echtem positiven Erwartungswert (+EV) anzeigt.',
    'hero.btn_purifier': 'Analyser öffnen',
    'hero.btn_radar': 'Team-Radar',
    'hero.btn_vip': 'VIP-Kanäle öffnen',

    // VIP Dashboard & Slip Form
    'vip.title_sync': 'Firebase Real-time Engine erfolgreich aktiv. Startkapital (€{0}), Buchmacher ({1}) und Wettscheine ({2} verknüpfte Wettscheine) werden in Echtzeit synchronisiert.',
    'vip.modal_title': 'NEUEN WETTSCHEIN REGISTRIEREN (WEB)',
    'vip.modal_desc': 'Diese Daten werden separat in der Firebase-Sammlung webBetSlips gespeichert.',
    'vip.slip_name': 'Zettel-Name / Vorlage',
    'vip.slip_name_placeholder': 'Z.B. Multiple Premier League',
    'vip.slip_type': 'Wettschein-Typ',
    'vip.slip_type_multiple': 'Kombiwette / Mehrfach',
    'vip.slip_type_simple': 'Einzelwette / Einfach',
    'vip.overall_status': 'Gesamtstatus',
    'vip.stake': 'Einsatz / Stake (€)',
    'vip.stake_placeholder': 'Z.B. 10',
    'vip.combined_odd': 'Kombinierte Gesamtquote',
    'vip.combined_odd_placeholder': 'Z.B. 2.10',
    'vip.emitter_channel': 'Kanal des Senders',
    'vip.emitter_channel_name': '🌍 VIP-Manager Dashboard',
    'vip.selection': 'Auswahl #',
    'vip.remove_selection': 'Auswahl entfernen',
    'vip.home_team': 'Heimmannschaft',
    'vip.home_team_placeholder': 'Z.B. Rio Ave',
    'vip.away_team': 'Auswärtsmannschaft',
    'vip.away_team_placeholder': 'Z.B. Benfica',
    'vip.sport': 'Sportart',
    'vip.sport_football': '⚽ Fußball',
    'vip.sport_basketball': '🏀 Basketball',
    'vip.sport_tennis': '🎾 Tennis',
    'vip.sport_other': '🎲 Sonstiges',
    'vip.competition_league': 'Wettbewerb / Liga',
    'vip.competition_placeholder': 'Z.B. Bundesliga',
    'vip.prediction': 'Vorhersage / Tipp',
    'vip.prediction_placeholder': 'Z.B. V2 (Benfica)',
    'vip.selection_odd': 'Quote der Auswahl',
    'vip.selection_odd_placeholder': 'Z.B. 1.45',
    'vip.prediction_status': 'Status der Auswahl',
    'vip.status_pending': '🟡 Ausstehend',
    'vip.status_won': '🟢 Gewonnen',
    'vip.status_lost': '🔴 Verloren',
    'vip.status_voided': '⚫ Erstattet/Ungültig',
    'vip.status_green': '🟢 Gewonnen (Green)',
    'vip.status_red': '🔴 Verloren (Red)',
    'vip.observations': 'Anmerkungen / Event-Notizen (Optional)',
    'vip.observations_placeholder': 'Z.B. Benfica ist auswärts sehr stark, Kader ist komplett.',
    'vip.btn_cancel': 'Abbrechen',
    'vip.btn_confirm': 'Registrierung bestätigen 🚀',
    'vip.add_event': '+ EREIGNIS HINZUFÜGEN',
    'vip.sync_title': 'Vergleich Einzel- und Kombiwetten',
    'vip.sync_desc': 'Erfolgsquote von Greens/Reds (integrierte iPhone- und Webdaten)',
    'vip.simple_slips': 'Einzelwetten',
    'vip.multiple_slips': 'Kombiwetten',
    'vip.total': 'Gesamt',
    'vip.efficacy': 'Erfolgsquote (Greens):',
    'vip.iphone_bets': 'iPhone Wetten',
    'vip.web_bets': 'Web-Wetten',
    'vip.no_slips': 'Keine synchronisierten Wettscheine (iPhone oder Web) vorhanden.',

    // FAQ Section
    'faq.transparency': 'TRANSPARENZ UND MATHEMATISCHE PRÄZISION',
    'faq.title': 'Häufig gestellte Fragen (FAQ)',
    'faq.desc': 'Finde Antworten darauf, wie unsere mathematischen KI-Modelle das traditionelle Fußballwetten demystifizieren.',
    'faq.q1': 'Wie berechnet die Künstliche Intelligenz den "mathematischen Wert" (+EV)?',
    'faq.a1': 'Unser Algorithmus ermittelt die echten Wahrscheinlichkeiten eines Fußballspiels mithilfe von Modellen wie Poisson-Verteilung und Monte-Carlo-Simulationen. Dabei werden über 100 historische Messwerte beider Teams ausgewertet (Tore, Schüsse, Belastung, xG und direkter Vergleich). Errechnet die KI eine Siegwahrscheinlichkeit von 60% für Real Madrid (faire mathematische Quote von 1.66), aber ein Buchmacher bietet 1.95, wird ein positiver Erwartungswert (+EV) von +17.4% erkannt. Du wettest dauerhaft mit einem Vorteil im langfristigen Verlauf.',
    'faq.q2': 'Garantiert iRunBets Gewinne oder sichere Erträge beim Fußball?',
    'faq.a2': 'Nein. Wer Gewinne im Sportwettenbereich garantiert, handelt unseriös. Fußball wird von unvorhersehbaren Ereignissen wie roten Karten, Verletzungen oder Schiedsrichterentscheidungen beeinflusst. Das Ziel von iRunBets ist es nicht, Gewinne zu garantieren, sondern dich mit fundierten mathematischen Analysen auszustatten. Langfristig ist das Wetten mit positivem Erwartungswert die einzige Methode, die deine Bankroll nachhaltig schützt.',
    'faq.q3': 'Müssen Tabellen und Daten händisch geladen werden?',
    'faq.a3': 'Absolut nicht. Die gesamte Plattform ist direkt mit weltweiten Sportdatenbanken verknüpft, die sich vollautomatisch in Echtzeit aktualisieren.'
  }
};

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('pt');

  useEffect(() => {
    // Detect system / local storage language on load
    const saved = localStorage.getItem('irunbets_lang') as Language;
    if (saved && translations[saved]) {
      setLanguageState(saved);
    } else {
      const browserLang = navigator.language.slice(0, 2).toLowerCase() as any;
      if (translations[browserLang]) {
        setLanguageState(browserLang);
      } else {
        setLanguageState('pt'); // Default fallback is Portuguese
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    if (translations[lang]) {
      setLanguageState(lang);
      localStorage.setItem('irunbets_lang', lang);
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['pt']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export function translateCampaignTitle(title: string, lang: string): string {
  if (!title) return '';
  if (lang === 'pt') return title;

  const titleLower = title.toLowerCase();
  
  // Default title
  if (titleLower.includes('mundial') || titleLower.includes('campeonato do mundo') || titleLower.includes('world cup')) {
    if (lang === 'en') return 'World Cup Campaign';
    if (lang === 'fr') return 'Campagne de la Coupe du Monde';
    if (lang === 'it') return 'Campagna della Coppa del Mondo';
    if (lang === 'de') return 'Weltmeisterschafts-Kampagne';
  }
  
  // Standard fallback translation if it matches other typical Portuguese formats
  if (titleLower.includes('campanha') || titleLower.includes('promoção') || titleLower.includes('promo')) {
    if (lang === 'en') return 'Special Campaign';
    if (lang === 'fr') return 'Campagne Spéciale';
    if (lang === 'it') return 'Campagna Speciale';
    if (lang === 'de') return 'Sonderaktion';
  }

  // Fallback
  return title;
}

export function translateCampaignDescription(desc: string, lang: string): string {
  if (!desc) return '';
  if (lang === 'pt') return desc;

  const descLower = desc.toLowerCase();

  // Handle the long default description
  if (descLower.includes('celebrar o campeonato do mundo') || descLower.includes('ia gemini mentor') || descLower.includes('livro de registo de banca pro') || descLower.includes('unrestricted access') || descLower.includes('full and unrestricted')) {
    if (lang === 'en') return 'To celebrate the World Cup with our community, we have unlocked full and unrestricted access to the Chat with Gemini AI Mentor, Smart OCR Slips, and PRO Bankroll ledger entirely free! Explore freely without any checkout steps.';
    if (lang === 'fr') return "Pour célébrer la Coupe du Monde avec notre communauté, nous avons débloqué l'accès complet et illimité au Chat avec Gemini AI Mentor, Smart OCR Slips et PRO Bankroll ledger gratuitement ! Explorez librement sans étapes de paiement.";
    if (lang === 'it') return "Per celebrare la Coppa del Mondo con la nostra comunità, abbiamo sbloccato l'accesso completo e illimitato alla Chat con Gemini AI Mentor, Smart OCR Slips e PRO Bankroll ledger gratuitamente! Esplora liberamente senza passaggi di pagamento.";
    if (lang === 'de') return "Um die Weltmeisterschaft mit unserer Community zu feiern, haben wir den vollständigen und uneingeschränkten Zugriff auf den Chat mit Gemini AI Mentor, Smart OCR Slips und PRO Bankroll Ledger völlig kostenlos freigeschaltet! Entdecken Sie frei ohne Checkout-Schritte.";
  }

  // If there are other descriptions like "A sua banca e o registo estendido estão 100% livres e isentos de restrições durante esta campanha promocional. Desfrute de todas as ferramentas de graça!"
  if (descLower.includes('banca e o registo estendido') || descLower.includes('isentos de restrições') || descLower.includes('100% livres')) {
    if (lang === 'en') return 'Your bankroll and extended ledger are 100% free and exempt from restrictions during this promotional campaign. Enjoy all tools for free!';
    if (lang === 'fr') return 'Votre bankroll et votre registre étendu sont 100% gratuits et exempts de restrictions pendant cette campagne promotionnelle. Profitez de tous les outils gratuitement !';
    if (lang === 'it') return 'La tua banca e il tuo registro esteso sono gratuiti al 100% ed esenti da restrizioni durante questa campagna promozionale. Goditi tutti gli strumenti gratuitamente!';
    if (lang === 'de') return 'Ihre Bankroll und Ihr erweitertes Hauptbuch sind während dieser Werbeaktion zu 100 % kostenlos und von Einschränkungen befreit. Genießen Sie alle Funktionen kostenlos!';
  }

  // General fallback or prompt-based text translation (though keeping it returned is fine)
  return desc;
}
