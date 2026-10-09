const fs = require('fs');

async function seed() {
  const url = process.env.SUPABASE_URL || "https://ksqevxtnuyzrfohkgvfw.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_RI9xwxEToy5XSbFuKshgWg_9jDS6cFZ";
  const headers = { 
    apikey: key, 
    Authorization: "Bearer " + key, 
    "Content-Type": "application/json",
    Prefer: "return=minimal" 
  };

  const squads = {
    "RB Bragantino": [
      { nome: "Cleiton", posicao: "GR", num: 1, rating: 7.2, yellows: 1, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Luan Cândido", posicao: "LE", num: 36, rating: 7.1, yellows: 4, reds: 0, goals: 3, status: "Disponível", emRisco: true },
      { nome: "Pedro Henrique", posicao: "DC", num: 34, rating: 7.0, yellows: 3, reds: 1, goals: 1, status: "Disponível" },
      { nome: "Eduardo Santos", posicao: "DC", num: 3, rating: 6.9, yellows: 2, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Nathan Mendes", posicao: "LD", num: 45, rating: 7.0, yellows: 4, reds: 0, goals: 0, status: "Disponível", emRisco: true },
      { nome: "Jadsom Silva", posicao: "MDC", num: 5, rating: 7.3, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Lucas Evangelista", posicao: "MC", num: 8, rating: 7.5, yellows: 2, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Juninho Capixaba", posicao: "ME", num: 29, rating: 7.3, yellows: 3, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Lincoln", posicao: "MO", num: 10, rating: 7.2, yellows: 1, reds: 0, goals: 3, status: "Disponível" },
      { nome: "Helinho", posicao: "ED", num: 11, rating: 7.6, yellows: 2, reds: 0, goals: 7, status: "Disponível" },
      { nome: "Eduardo Sasha", posicao: "AV", num: 19, rating: 7.4, yellows: 4, reds: 0, goals: 9, status: "Disponível", emRisco: true },
      { nome: "Thiago Borbas", posicao: "AV", num: 18, rating: 7.1, yellows: 1, reds: 0, goals: 5, status: "Disponível" },
      { nome: "Henry Mosquera", posicao: "EE", num: 30, rating: 6.9, yellows: 1, reds: 0, goals: 2, status: "Lesionado (Coxa)" }
    ],
    "Mirassol FC": [
      { nome: "Alex Muralha", posicao: "GR", num: 23, rating: 7.3, yellows: 2, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Lucas Ramon", posicao: "LD", num: 2, rating: 6.9, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "João Victor", posicao: "DC", num: 4, rating: 7.1, yellows: 3, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Luiz Otávio", posicao: "DC", num: 3, rating: 7.0, yellows: 2, reds: 1, goals: 1, status: "Disponível" },
      { nome: "Zeca", posicao: "LE", num: 6, rating: 7.1, yellows: 4, reds: 0, goals: 0, status: "Disponível", emRisco: true },
      { nome: "Neto Moura", posicao: "MDC", num: 8, rating: 7.2, yellows: 3, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Danielzinho", posicao: "MC", num: 10, rating: 7.5, yellows: 2, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Gabriel", posicao: "MO", num: 7, rating: 7.4, yellows: 1, reds: 0, goals: 6, status: "Disponível" },
      { nome: "Negueba", posicao: "ED", num: 11, rating: 7.2, yellows: 4, reds: 0, goals: 3, status: "Disponível", emRisco: true },
      { nome: "Fernandinho", posicao: "EE", num: 17, rating: 7.1, yellows: 2, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Dellatorre", posicao: "AV", num: 9, rating: 7.6, yellows: 3, reds: 0, goals: 10, status: "Disponível" }
    ],
    "SC Internacional": [
      { nome: "Sergio Rochet", posicao: "GR", num: 1, rating: 7.4, yellows: 1, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Fabricio Bustos", posicao: "LD", num: 16, rating: 7.2, yellows: 3, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Vitão", posicao: "DC", num: 44, rating: 7.3, yellows: 2, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Gabriel Mercado", posicao: "DC", num: 25, rating: 7.0, yellows: 4, reds: 1, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Renê", posicao: "LE", num: 6, rating: 7.0, yellows: 2, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Fernando", posicao: "MDC", num: 5, rating: 7.3, yellows: 4, reds: 0, goals: 2, status: "Disponível", emRisco: true },
      { nome: "Bruno Henrique", posicao: "MC", num: 8, rating: 7.2, yellows: 3, reds: 0, goals: 3, status: "Disponível" },
      { nome: "Alan Patrick", posicao: "MO", num: 10, rating: 7.8, yellows: 2, reds: 0, goals: 7, status: "Disponível" },
      { nome: "Wesley", posicao: "EE", num: 21, rating: 7.5, yellows: 4, reds: 0, goals: 6, status: "Disponível", emRisco: true },
      { nome: "Wanderson", posicao: "ED", num: 11, rating: 7.2, yellows: 1, reds: 0, goals: 3, status: "Disponível" },
      { nome: "Rafael Borré", posicao: "AV", num: 19, rating: 7.6, yellows: 2, reds: 0, goals: 8, status: "Disponível" },
      { nome: "Enner Valencia", posicao: "AV", num: 13, rating: 7.3, yellows: 1, reds: 0, goals: 5, status: "Disponível" }
    ],
    "SC Corinthians Paulista": [
      { nome: "Hugo Souza", posicao: "GR", num: 1, rating: 7.5, yellows: 2, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Fágner", posicao: "LD", num: 23, rating: 7.1, yellows: 4, reds: 1, goals: 0, status: "Disponível", emRisco: true },
      { nome: "Félix Torres", posicao: "DC", num: 3, rating: 7.1, yellows: 3, reds: 0, goals: 1, status: "Disponível" },
      { nome: "André Ramalho", posicao: "DC", num: 5, rating: 7.2, yellows: 2, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Matheus Bidu", posicao: "LE", num: 21, rating: 7.0, yellows: 3, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Raniele", posicao: "MDC", num: 14, rating: 7.3, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "José Martínez", posicao: "MC", num: 70, rating: 7.1, yellows: 2, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Rodrigo Garro", posicao: "MO", num: 10, rating: 7.9, yellows: 3, reds: 0, goals: 8, status: "Disponível" },
      { nome: "Ángel Romero", posicao: "ED", num: 11, rating: 7.3, yellows: 2, reds: 0, goals: 7, status: "Disponível" },
      { nome: "Memphis Depay", posicao: "AV", num: 94, rating: 7.8, yellows: 1, reds: 0, goals: 5, status: "Disponível" },
      { nome: "Yuri Alberto", posicao: "AV", num: 9, rating: 7.6, yellows: 4, reds: 0, goals: 12, status: "Disponível", emRisco: true }
    ],
    "Botafogo FR": [
      { nome: "John Victor", posicao: "GR", num: 12, rating: 7.5, yellows: 1, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Vitinho", posicao: "LD", num: 2, rating: 7.2, yellows: 3, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Alexander Barboza", posicao: "DC", num: 20, rating: 7.4, yellows: 4, reds: 1, goals: 2, status: "Disponível", emRisco: true },
      { nome: "Bastos", posicao: "DC", num: 15, rating: 7.3, yellows: 2, reds: 0, goals: 3, status: "Disponível" },
      { nome: "Alex Telles", posicao: "LE", num: 13, rating: 7.3, yellows: 2, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Gregore", posicao: "MDC", num: 5, rating: 7.4, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Marlon Freitas", posicao: "MC", num: 17, rating: 7.5, yellows: 3, reds: 0, goals: 3, status: "Disponível" },
      { nome: "Thiago Almada", posicao: "MO", num: 23, rating: 7.9, yellows: 1, reds: 0, goals: 6, status: "Disponível" },
      { nome: "Luiz Henrique", posicao: "ED", num: 7, rating: 7.8, yellows: 3, reds: 0, goals: 9, status: "Disponível" },
      { nome: "Jefferson Savarino", posicao: "EE", num: 10, rating: 7.6, yellows: 1, reds: 0, goals: 7, status: "Disponível" },
      { nome: "Igor Jesus", posicao: "AV", num: 99, rating: 7.7, yellows: 2, reds: 0, goals: 11, status: "Disponível" }
    ],
    "CR Vasco da Gama": [
      { nome: "Léo Jardim", posicao: "GR", num: 1, rating: 7.6, yellows: 2, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Paulo Henrique", posicao: "LD", num: 96, rating: 7.1, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "João Victor", posicao: "DC", num: 38, rating: 7.2, yellows: 4, reds: 1, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Léo Pelé", posicao: "DC", num: 3, rating: 6.9, yellows: 3, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Lucas Piton", posicao: "LE", num: 6, rating: 7.3, yellows: 2, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Hugo Moura", posicao: "MDC", num: 25, rating: 7.2, yellows: 4, reds: 1, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Mateus Carvalho", posicao: "MC", num: 85, rating: 7.1, yellows: 4, reds: 0, goals: 2, status: "Disponível", emRisco: true },
      { nome: "Dimitri Payet", posicao: "MO", num: 10, rating: 7.5, yellows: 1, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Philippe Coutinho", posicao: "MO", num: 11, rating: 7.6, yellows: 1, reds: 0, goals: 3, status: "Disponível" },
      { nome: "Emerson Rodríguez", posicao: "EE", num: 17, rating: 7.0, yellows: 2, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Pablo Vegetti", posicao: "AV", num: 99, rating: 7.8, yellows: 4, reds: 0, goals: 14, status: "Disponível", emRisco: true }
    ],
    "Grêmio FBPA": [
      { nome: "Agustín Marchesín", posicao: "GR", num: 1, rating: 7.3, yellows: 2, reds: 0, goals: 0, status: "Disponível" },
      { nome: "João Pedro", posicao: "LD", num: 18, rating: 7.1, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Pedro Geromel", posicao: "DC", num: 3, rating: 7.0, yellows: 2, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Walter Kannemann", posicao: "DC", num: 4, rating: 7.2, yellows: 4, reds: 1, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Reinaldo", posicao: "LE", num: 6, rating: 7.1, yellows: 4, reds: 0, goals: 3, status: "Disponível", emRisco: true },
      { nome: "Mathías Villasanti", posicao: "MDC", num: 20, rating: 7.4, yellows: 3, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Dodi", posicao: "MC", num: 17, rating: 7.1, yellows: 3, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Franco Cristaldo", posicao: "MO", num: 10, rating: 7.6, yellows: 2, reds: 0, goals: 7, status: "Disponível" },
      { nome: "Yeferson Soteldo", posicao: "EE", num: 7, rating: 7.5, yellows: 3, reds: 0, goals: 5, status: "Disponível" },
      { nome: "Cristian Pavón", posicao: "ED", num: 21, rating: 7.2, yellows: 2, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Martin Braithwaite", posicao: "AV", num: 22, rating: 7.7, yellows: 2, reds: 0, goals: 8, status: "Disponível" },
      { nome: "Diego Costa", posicao: "AV", num: 19, rating: 7.2, yellows: 4, reds: 1, goals: 4, status: "Lesionado (Músculo)" }
    ],
    "EC Vitória": [
      { nome: "Lucas Arcanjo", posicao: "GR", num: 1, rating: 7.4, yellows: 2, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Raúl Cáceres", posicao: "LD", num: 2, rating: 6.9, yellows: 4, reds: 0, goals: 0, status: "Disponível", emRisco: true },
      { nome: "Wagner Leonardo", posicao: "DC", num: 4, rating: 7.3, yellows: 4, reds: 0, goals: 4, status: "Disponível", emRisco: true },
      { nome: "Neris", posicao: "DC", num: 34, rating: 7.0, yellows: 3, reds: 1, goals: 1, status: "Disponível" },
      { nome: "Lucas Esteves", posicao: "LE", num: 16, rating: 7.2, yellows: 3, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Luan Santos", posicao: "MDC", num: 5, rating: 7.1, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Willian Oliveira", posicao: "MC", num: 29, rating: 7.3, yellows: 4, reds: 0, goals: 5, status: "Disponível", emRisco: true },
      { nome: "Matheuzinho", posicao: "MO", num: 30, rating: 7.6, yellows: 2, reds: 0, goals: 6, status: "Disponível" },
      { nome: "Gustavo Mosquito", posicao: "ED", num: 7, rating: 7.1, yellows: 1, reds: 0, goals: 3, status: "Disponível" },
      { nome: "Carlos Eduardo", posicao: "EE", num: 11, rating: 7.0, yellows: 2, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Alerrandro", posicao: "AV", num: 9, rating: 7.5, yellows: 3, reds: 0, goals: 9, status: "Disponível" }
    ],
    "Chapecoense AF": [
      { nome: "Léo Vieira", posicao: "GR", num: 1, rating: 7.3, yellows: 1, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Marcelinho", posicao: "LD", num: 2, rating: 6.9, yellows: 3, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Bruno Leonardo", posicao: "DC", num: 3, rating: 7.1, yellows: 4, reds: 0, goals: 2, status: "Disponível", emRisco: true },
      { nome: "Rodrigo Moledo", posicao: "DC", num: 4, rating: 7.0, yellows: 2, reds: 1, goals: 0, status: "Disponível" },
      { nome: "Mancha", posicao: "LE", num: 6, rating: 7.0, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Tárik", posicao: "MDC", num: 5, rating: 7.1, yellows: 4, reds: 0, goals: 0, status: "Disponível", emRisco: true },
      { nome: "Frizzo", posicao: "MC", num: 10, rating: 7.4, yellows: 2, reds: 0, goals: 5, status: "Disponível" },
      { nome: "Rafael Carvalheira", posicao: "MO", num: 99, rating: 7.3, yellows: 3, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Marcinho", posicao: "ED", num: 7, rating: 7.1, yellows: 2, reds: 0, goals: 3, status: "Disponível" },
      { nome: "Giovanni Augusto", posicao: "EE", num: 8, rating: 7.2, yellows: 1, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Mário Sérgio", posicao: "AV", num: 9, rating: 7.5, yellows: 3, reds: 0, goals: 8, status: "Disponível" }
    ],
    "Clube do Remo": [
      { nome: "Marcelo Rangel", posicao: "GR", num: 1, rating: 7.4, yellows: 1, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Diogo Batista", posicao: "LD", num: 2, rating: 6.9, yellows: 3, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Rafael Castro", posicao: "DC", num: 3, rating: 7.1, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Reynaldo", posicao: "DC", num: 4, rating: 7.0, yellows: 2, reds: 1, goals: 0, status: "Disponível" },
      { nome: "Raimar", posicao: "LE", num: 6, rating: 7.2, yellows: 3, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Jaderson", posicao: "MDC", num: 5, rating: 7.3, yellows: 4, reds: 0, goals: 3, status: "Disponível", emRisco: true },
      { nome: "Giovanni Pavani", posicao: "MC", num: 8, rating: 7.4, yellows: 4, reds: 0, goals: 4, status: "Disponível", emRisco: true },
      { nome: "Matheus Anjos", posicao: "MO", num: 10, rating: 7.2, yellows: 2, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Pedro Vitor", posicao: "ED", num: 11, rating: 7.3, yellows: 3, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Kelvin", posicao: "EE", num: 7, rating: 7.1, yellows: 1, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Rodrigo Alves", posicao: "AV", num: 9, rating: 7.5, yellows: 3, reds: 0, goals: 7, status: "Disponível" }
    ],
    "SL Benfica": [
      { nome: "Anatoliy Trubin", posicao: "GR", num: 1, rating: 7.6, yellows: 1, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Alexander Bah", posicao: "LD", num: 6, rating: 7.3, yellows: 3, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Nicolás Otamendi", posicao: "DC", num: 30, rating: 7.5, yellows: 4, reds: 1, goals: 2, status: "Disponível", emRisco: true },
      { nome: "Tomás Araújo", posicao: "DC", num: 44, rating: 7.4, yellows: 2, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Álvaro Carreras", posicao: "LE", num: 3, rating: 7.5, yellows: 3, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Florentino Luís", posicao: "MDC", num: 61, rating: 7.4, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Fredrik Aursnes", posicao: "MC", num: 8, rating: 7.6, yellows: 2, reds: 0, goals: 3, status: "Disponível" },
      { nome: "Orkun Kökçü", posicao: "MO", num: 10, rating: 7.8, yellows: 3, reds: 0, goals: 6, status: "Disponível" },
      { nome: "Ángel Di María", posicao: "ED", num: 11, rating: 7.9, yellows: 2, reds: 0, goals: 8, status: "Disponível" },
      { nome: "Kerem Aktürkoğlu", posicao: "EE", num: 17, rating: 7.9, yellows: 2, reds: 0, goals: 9, status: "Disponível" },
      { nome: "Vangelis Pavlidis", posicao: "AV", num: 14, rating: 7.8, yellows: 2, reds: 0, goals: 11, status: "Disponível" }
    ],
    "Sporting CP": [
      { nome: "Franco Israel", posicao: "GR", num: 1, rating: 7.5, yellows: 1, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Eduardo Quaresma", posicao: "DC", num: 72, rating: 7.3, yellows: 3, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Ousmane Diomande", posicao: "DC", num: 26, rating: 7.5, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Gonçalo Inácio", posicao: "DC", num: 25, rating: 7.6, yellows: 2, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Geovany Quenda", posicao: "AD", num: 57, rating: 7.5, yellows: 1, reds: 0, goals: 3, status: "Disponível" },
      { nome: "Morten Hjulmand", posicao: "MDC", num: 42, rating: 7.8, yellows: 4, reds: 0, goals: 3, status: "Disponível", emRisco: true },
      { nome: "Hidemasa Morita", posicao: "MC", num: 5, rating: 7.5, yellows: 2, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Maxi Araújo", posicao: "AE", num: 20, rating: 7.3, yellows: 2, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Francisco Trincão", posicao: "ED", num: 17, rating: 7.8, yellows: 1, reds: 0, goals: 7, status: "Disponível" },
      { nome: "Pedro Gonçalves", posicao: "EE", num: 8, rating: 8.0, yellows: 3, reds: 0, goals: 9, status: "Disponível" },
      { nome: "Viktor Gyökeres", posicao: "AV", num: 9, rating: 8.4, yellows: 3, reds: 0, goals: 18, status: "Disponível" }
    ],
    "FC Porto": [
      { nome: "Diogo Costa", posicao: "GR", num: 99, rating: 7.7, yellows: 1, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Martim Fernandes", posicao: "LD", num: 52, rating: 7.3, yellows: 2, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Zé Pedro", posicao: "DC", num: 97, rating: 7.2, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Nehuén Pérez", posicao: "DC", num: 24, rating: 7.4, yellows: 3, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Francisco Moura", posicao: "LE", num: 74, rating: 7.3, yellows: 3, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Alan Varela", posicao: "MDC", num: 22, rating: 7.6, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Nico González", posicao: "MC", num: 16, rating: 7.7, yellows: 3, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Pepê", posicao: "ED", num: 11, rating: 7.5, yellows: 2, reds: 0, goals: 5, status: "Disponível" },
      { nome: "Galeno", posicao: "EE", num: 13, rating: 7.8, yellows: 2, reds: 0, goals: 9, status: "Disponível" },
      { nome: "Iván Jaime", posicao: "MO", num: 17, rating: 7.4, yellows: 1, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Samu Omorodion", posicao: "AV", num: 9, rating: 8.0, yellows: 3, reds: 0, goals: 12, status: "Disponível" }
    ],
    "SC Braga": [
      { nome: "Matheus", posicao: "GR", num: 1, rating: 7.4, yellows: 2, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Víctor Gómez", posicao: "LD", num: 2, rating: 7.2, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Sikou Niakaté", posicao: "DC", num: 4, rating: 7.3, yellows: 4, reds: 1, goals: 1, status: "Disponível", emRisco: true },
      { nome: "João Ferreira", posicao: "DC", num: 13, rating: 7.1, yellows: 2, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Adrián Marín", posicao: "LE", num: 19, rating: 7.1, yellows: 3, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Vitor Carvalho", posicao: "MDC", num: 8, rating: 7.3, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "João Moutinho", posicao: "MC", num: 28, rating: 7.5, yellows: 2, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Rodrigo Zalazar", posicao: "MO", num: 10, rating: 7.7, yellows: 3, reds: 0, goals: 5, status: "Disponível" },
      { nome: "Bruma", posicao: "EE", num: 7, rating: 7.6, yellows: 2, reds: 0, goals: 6, status: "Disponível" },
      { nome: "Ricardo Horta", posicao: "ED", num: 21, rating: 7.7, yellows: 1, reds: 0, goals: 8, status: "Disponível" },
      { nome: "Amine El Ouazzani", posicao: "AV", num: 9, rating: 7.4, yellows: 2, reds: 0, goals: 6, status: "Disponível" }
    ],
    "FC Famalicão": [
      { nome: "Luiz Júnior", posicao: "GR", num: 1, rating: 7.4, yellows: 1, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Lucas Calegari", posicao: "LD", num: 2, rating: 7.1, yellows: 3, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Enea Mihaj", posicao: "DC", num: 15, rating: 7.2, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Justin de Haas", posicao: "DC", num: 4, rating: 7.1, yellows: 3, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Rafa Soares", posicao: "LE", num: 16, rating: 7.1, yellows: 2, reds: 0, goals: 1, status: "Disponível" },
      { nome: "Mirko Topic", posicao: "MDC", num: 6, rating: 7.3, yellows: 4, reds: 0, goals: 0, status: "Disponível", emRisco: true },
      { nome: "Zaydou Youssouf", posicao: "MC", num: 28, rating: 7.4, yellows: 4, reds: 1, goals: 2, status: "Disponível", emRisco: true },
      { nome: "Gustavo Sá", posicao: "MO", num: 20, rating: 7.5, yellows: 2, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Sorriso", posicao: "ED", num: 7, rating: 7.4, yellows: 2, reds: 0, goals: 5, status: "Disponível" },
      { nome: "Rochinha", posicao: "EE", num: 11, rating: 7.2, yellows: 1, reds: 0, goals: 3, status: "Disponível" },
      { nome: "Mario González", posicao: "AV", num: 9, rating: 7.4, yellows: 2, reds: 0, goals: 6, status: "Disponível" }
    ],
    "SE Palmeiras": [
      { nome: "Weverton", posicao: "GR", num: 21, rating: 7.5, yellows: 1, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Marcos Rocha", posicao: "LD", num: 2, rating: 7.2, yellows: 4, reds: 0, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Gustavo Gómez", posicao: "DC", num: 15, rating: 7.6, yellows: 4, reds: 0, goals: 3, status: "Disponível", emRisco: true },
      { nome: "Murilo", posicao: "DC", num: 26, rating: 7.4, yellows: 3, reds: 1, goals: 2, status: "Disponível" },
      { nome: "Joaquín Piquerez", posicao: "LE", num: 22, rating: 7.5, yellows: 2, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Aníbal Moreno", posicao: "MDC", num: 5, rating: 7.5, yellows: 4, reds: 0, goals: 2, status: "Disponível", emRisco: true },
      { nome: "Zé Rafael", posicao: "MC", num: 8, rating: 7.3, yellows: 4, reds: 0, goals: 2, status: "Disponível", emRisco: true },
      { nome: "Raphael Veiga", posicao: "MO", num: 23, rating: 7.9, yellows: 2, reds: 0, goals: 11, status: "Disponível" },
      { nome: "Estêvão", posicao: "ED", num: 41, rating: 8.1, yellows: 2, reds: 0, goals: 12, status: "Disponível" },
      { nome: "Felipe Anderson", posicao: "EE", num: 9, rating: 7.4, yellows: 1, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Flaco López", posicao: "AV", num: 42, rating: 7.7, yellows: 3, reds: 0, goals: 13, status: "Disponível" }
    ],
    "CR Flamengo": [
      { nome: "Agustín Rossi", posicao: "GR", num: 1, rating: 7.5, yellows: 1, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Guillermo Varela", posicao: "LD", num: 2, rating: 7.1, yellows: 3, reds: 0, goals: 0, status: "Disponível" },
      { nome: "Léo Ortiz", posicao: "DC", num: 3, rating: 7.4, yellows: 3, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Léo Pereira", posicao: "DC", num: 4, rating: 7.3, yellows: 4, reds: 0, goals: 2, status: "Disponível", emRisco: true },
      { nome: "Ayrton Lucas", posicao: "LE", num: 6, rating: 7.3, yellows: 3, reds: 0, goals: 2, status: "Disponível" },
      { nome: "Erick Pulgar", posicao: "MDC", num: 5, rating: 7.4, yellows: 4, reds: 1, goals: 1, status: "Disponível", emRisco: true },
      { nome: "Nicolás de la Cruz", posicao: "MC", num: 18, rating: 7.7, yellows: 3, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Giorgian de Arrascaeta", posicao: "MO", num: 14, rating: 7.9, yellows: 2, reds: 0, goals: 8, status: "Disponível" },
      { nome: "Gerson", posicao: "MC", num: 8, rating: 7.8, yellows: 3, reds: 0, goals: 5, status: "Disponível" },
      { nome: "Michael", posicao: "EE", num: 30, rating: 7.3, yellows: 1, reds: 0, goals: 4, status: "Disponível" },
      { nome: "Pedro", posicao: "AV", num: 9, rating: 8.2, yellows: 2, reds: 0, goals: 16, status: "Disponível" },
      { nome: "Gabriel Barbosa", posicao: "AV", num: 99, rating: 7.3, yellows: 4, reds: 0, goals: 5, status: "Disponível", emRisco: true }
    ]
  };

  // Convert to database rows
  const allRows = [];
  for (const [clube, players] of Object.entries(squads)) {
    const pais = clube.includes("Benfica") || clube.includes("Sporting") || clube.includes("Porto") || clube.includes("Braga") || clube.includes("Famalicão") ? "Portugal" : "Brazil";
    for (const p of players) {
      allRows.push({
        nome: p.nome,
        clube: clube,
        pais: pais,
        posicao: p.posicao,
        titular_habitual: true,
        media_rating: p.rating,
        forma_ultimos_5_jogos: p.rating,
        numero_camisola: p.num,
        golos_marcados: p.goals || 0,
        assistencias: Math.floor((p.goals || 0) * 0.5),
        cartoes_amarelos: p.yellows,
        cartoes_vermelhos: p.reds,
        em_risco_5_amarelo: Boolean(p.emRisco),
        lesionado: p.status.includes("Lesionado"),
        castigado: p.reds > 0
      });
    }
  }

  console.log(`Seeding ${allRows.length} squad players into Supabase 'jogadores'...`);

  // Insert in batches of 30
  for (let i = 0; i < allRows.length; i += 30) {
    const chunk = allRows.slice(i, i + 30);
    const resp = await fetch(url + "/rest/v1/jogadores", {
      method: "POST",
      headers,
      body: JSON.stringify(chunk)
    });
    console.log(`Batch ${Math.floor(i / 30) + 1} status:`, resp.status);
    if (!resp.ok) {
      console.error(await resp.text());
    }
  }

  console.log("Seeding completed successfully!");
}

seed();
