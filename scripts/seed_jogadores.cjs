const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ksqevxtnuyzrfohkgvfw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  'sb_publishable_RI9xwxEToy5XSbFuKshgWg_9jDS6cFZ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SQUAD_DATA = [
  // RB Bragantino
  { nome: 'Cleiton', clube: 'RB Bragantino', pais: 'Brazil', posicao: 'GR', numero_camisola: 1, media_rating: 7.3, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Pedro Henrique', clube: 'RB Bragantino', pais: 'Brazil', posicao: 'DC', numero_camisola: 3, media_rating: 7.1, titular_habitual: true, golos_marcados: 1, assistencias: 0, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Lucas Cunha', clube: 'RB Bragantino', pais: 'Brazil', posicao: 'DC', numero_camisola: 4, media_rating: 7.0, titular_habitual: true, golos_marcados: 0, assistencias: 1, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Nathan Mendes', clube: 'RB Bragantino', pais: 'Brazil', posicao: 'LD', numero_camisola: 45, media_rating: 7.0, titular_habitual: true, golos_marcados: 1, assistencias: 3, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Jadsom', clube: 'RB Bragantino', pais: 'Brazil', posicao: 'MC', numero_camisola: 5, media_rating: 7.1, titular_habitual: true, golos_marcados: 1, assistencias: 2, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Lucas Evangelista', clube: 'RB Bragantino', pais: 'Brazil', posicao: 'MC', numero_camisola: 8, media_rating: 7.4, titular_habitual: true, golos_marcados: 4, assistencias: 6, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Lincoln', clube: 'RB Bragantino', pais: 'Brazil', posicao: 'MO', numero_camisola: 10, media_rating: 7.2, titular_habitual: true, golos_marcados: 3, assistencias: 4, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Henry Mosquera', clube: 'RB Bragantino', pais: 'Colombia', posicao: 'EE', numero_camisola: 30, media_rating: 7.2, titular_habitual: true, golos_marcados: 4, assistencias: 3, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Thiago Borbas', clube: 'RB Bragantino', pais: 'Uruguay', posicao: 'AV', numero_camisola: 18, media_rating: 7.2, titular_habitual: false, golos_marcados: 6, assistencias: 2, cartoes_amarelos: 2, em_risco_5_amarelo: false },

  // Mirassol FC
  { nome: 'Alex Muralha', clube: 'Mirassol FC', pais: 'Brazil', posicao: 'GR', numero_camisola: 1, media_rating: 7.2, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Lucas Ramon', clube: 'Mirassol FC', pais: 'Brazil', posicao: 'LD', numero_camisola: 2, media_rating: 7.0, titular_habitual: true, golos_marcados: 1, assistencias: 2, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'João Victor', clube: 'Mirassol FC', pais: 'Brazil', posicao: 'DC', numero_camisola: 4, media_rating: 7.1, titular_habitual: true, golos_marcados: 2, assistencias: 0, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Luiz Otávio', clube: 'Mirassol FC', pais: 'Brazil', posicao: 'DC', numero_camisola: 3, media_rating: 7.0, titular_habitual: true, golos_marcados: 1, assistencias: 0, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Zeca', clube: 'Mirassol FC', pais: 'Brazil', posicao: 'LE', numero_camisola: 6, media_rating: 7.0, titular_habitual: true, golos_marcados: 0, assistencias: 3, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Danielzinho', clube: 'Mirassol FC', pais: 'Brazil', posicao: 'MC', numero_camisola: 8, media_rating: 7.3, titular_habitual: true, golos_marcados: 3, assistencias: 5, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Gabriel', clube: 'Mirassol FC', pais: 'Brazil', posicao: 'MC', numero_camisola: 5, media_rating: 7.1, titular_habitual: true, golos_marcados: 2, assistencias: 2, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Fernandinho', clube: 'Mirassol FC', pais: 'Brazil', posicao: 'EE', numero_camisola: 11, media_rating: 7.3, titular_habitual: true, golos_marcados: 5, assistencias: 4, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Dellatorre', clube: 'Mirassol FC', pais: 'Brazil', posicao: 'AV', numero_camisola: 9, media_rating: 7.5, titular_habitual: true, golos_marcados: 10, assistencias: 3, cartoes_amarelos: 3, em_risco_5_amarelo: false },

  // SC Internacional
  { nome: 'Sergio Rochet', clube: 'SC Internacional', pais: 'Uruguay', posicao: 'GR', numero_camisola: 1, media_rating: 7.4, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Vitão', clube: 'SC Internacional', pais: 'Brazil', posicao: 'DC', numero_camisola: 4, media_rating: 7.3, titular_habitual: true, golos_marcados: 1, assistencias: 1, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Gabriel Mercado', clube: 'SC Internacional', pais: 'Argentina', posicao: 'DC', numero_camisola: 25, media_rating: 7.1, titular_habitual: true, golos_marcados: 1, assistencias: 0, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Alexandro Bernabei', clube: 'SC Internacional', pais: 'Argentina', posicao: 'LE', numero_camisola: 26, media_rating: 7.4, titular_habitual: true, golos_marcados: 3, assistencias: 5, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Bruno Gomes', clube: 'SC Internacional', pais: 'Brazil', posicao: 'LD', numero_camisola: 2, media_rating: 7.2, titular_habitual: true, golos_marcados: 1, assistencias: 2, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Fernando', clube: 'SC Internacional', pais: 'Brazil', posicao: 'MC', numero_camisola: 5, media_rating: 7.3, titular_habitual: true, golos_marcados: 1, assistencias: 1, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Alan Patrick', clube: 'SC Internacional', pais: 'Brazil', posicao: 'MO', numero_camisola: 10, media_rating: 7.7, titular_habitual: true, golos_marcados: 8, assistencias: 8, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Wesley', clube: 'SC Internacional', pais: 'Brazil', posicao: 'EE', numero_camisola: 21, media_rating: 7.4, titular_habitual: true, golos_marcados: 7, assistencias: 4, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Rafael Santos Borré', clube: 'SC Internacional', pais: 'Colombia', posicao: 'AV', numero_camisola: 19, media_rating: 7.6, titular_habitual: true, golos_marcados: 10, assistencias: 3, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Enner Valencia', clube: 'SC Internacional', pais: 'Ecuador', posicao: 'AV', numero_camisola: 13, media_rating: 7.3, titular_habitual: false, golos_marcados: 6, assistencias: 2, cartoes_amarelos: 1, em_risco_5_amarelo: false },

  // SC Corinthians Paulista
  { nome: 'Hugo Souza', clube: 'SC Corinthians Paulista', pais: 'Brazil', posicao: 'GR', numero_camisola: 1, media_rating: 7.5, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'André Ramalho', clube: 'SC Corinthians Paulista', pais: 'Brazil', posicao: 'DC', numero_camisola: 5, media_rating: 7.3, titular_habitual: true, golos_marcados: 1, assistencias: 1, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Félix Torres', clube: 'SC Corinthians Paulista', pais: 'Ecuador', posicao: 'DC', numero_camisola: 3, media_rating: 7.1, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Matheus Bidu', clube: 'SC Corinthians Paulista', pais: 'Brazil', posicao: 'LE', numero_camisola: 21, media_rating: 7.2, titular_habitual: true, golos_marcados: 2, assistencias: 3, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Matheuzinho', clube: 'SC Corinthians Paulista', pais: 'Brazil', posicao: 'LD', numero_camisola: 2, media_rating: 7.1, titular_habitual: true, golos_marcados: 1, assistencias: 2, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Raniele', clube: 'SC Corinthians Paulista', pais: 'Brazil', posicao: 'MC', numero_camisola: 14, media_rating: 7.2, titular_habitual: true, golos_marcados: 0, assistencias: 1, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Rodrigo Garro', clube: 'SC Corinthians Paulista', pais: 'Argentina', posicao: 'MO', numero_camisola: 10, media_rating: 7.8, titular_habitual: true, golos_marcados: 9, assistencias: 9, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Memphis Depay', clube: 'SC Corinthians Paulista', pais: 'Netherlands', posicao: 'AV', numero_camisola: 94, media_rating: 7.7, titular_habitual: true, golos_marcados: 7, assistencias: 4, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Yuri Alberto', clube: 'SC Corinthians Paulista', pais: 'Brazil', posicao: 'AV', numero_camisola: 9, media_rating: 7.6, titular_habitual: true, golos_marcados: 13, assistencias: 4, cartoes_amarelos: 4, em_risco_5_amarelo: true },

  // Clube do Remo
  { nome: 'Marcelo Rangel', clube: 'Clube do Remo', pais: 'Brazil', posicao: 'GR', numero_camisola: 1, media_rating: 7.2, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Rafael Castro', clube: 'Clube do Remo', pais: 'Brazil', posicao: 'DC', numero_camisola: 3, media_rating: 7.0, titular_habitual: true, golos_marcados: 1, assistencias: 0, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Raimar', clube: 'Clube do Remo', pais: 'Brazil', posicao: 'LE', numero_camisola: 6, media_rating: 7.1, titular_habitual: true, golos_marcados: 2, assistencias: 3, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Jaderson', clube: 'Clube do Remo', pais: 'Brazil', posicao: 'MC', numero_camisola: 8, media_rating: 7.3, titular_habitual: true, golos_marcados: 4, assistencias: 4, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Ytalo', clube: 'Clube do Remo', pais: 'Brazil', posicao: 'AV', numero_camisola: 9, media_rating: 7.4, titular_habitual: true, golos_marcados: 8, assistencias: 2, cartoes_amarelos: 2, em_risco_5_amarelo: false },

  // Grêmio FBPA
  { nome: 'Agustín Marchesín', clube: 'Grêmio FBPA', pais: 'Argentina', posicao: 'GR', numero_camisola: 1, media_rating: 7.3, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Walter Kannemann', clube: 'Grêmio FBPA', pais: 'Argentina', posicao: 'DC', numero_camisola: 4, media_rating: 7.2, titular_habitual: true, golos_marcados: 1, assistencias: 0, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Mathías Villasanti', clube: 'Grêmio FBPA', pais: 'Paraguay', posicao: 'MC', numero_camisola: 20, media_rating: 7.4, titular_habitual: true, golos_marcados: 3, assistencias: 3, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Franco Cristaldo', clube: 'Grêmio FBPA', pais: 'Argentina', posicao: 'MO', numero_camisola: 10, media_rating: 7.6, titular_habitual: true, golos_marcados: 8, assistencias: 5, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Yeferson Soteldo', clube: 'Grêmio FBPA', pais: 'Venezuela', posicao: 'EE', numero_camisola: 7, media_rating: 7.5, titular_habitual: true, golos_marcados: 5, assistencias: 6, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Martin Braithwaite', clube: 'Grêmio FBPA', pais: 'Denmark', posicao: 'AV', numero_camisola: 22, media_rating: 7.6, titular_habitual: true, golos_marcados: 9, assistencias: 3, cartoes_amarelos: 2, em_risco_5_amarelo: false },

  // EC Vitória
  { nome: 'Lucas Arcanjo', clube: 'EC Vitória', pais: 'Brazil', posicao: 'GR', numero_camisola: 1, media_rating: 7.3, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Wagner Leonardo', clube: 'EC Vitória', pais: 'Brazil', posicao: 'DC', numero_camisola: 4, media_rating: 7.2, titular_habitual: true, golos_marcados: 3, assistencias: 0, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Willian Oliveira', clube: 'EC Vitória', pais: 'Brazil', posicao: 'MC', numero_camisola: 8, media_rating: 7.3, titular_habitual: true, golos_marcados: 5, assistencias: 2, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Matheuzinho', clube: 'EC Vitória', pais: 'Brazil', posicao: 'MO', numero_camisola: 10, media_rating: 7.5, titular_habitual: true, golos_marcados: 5, assistencias: 6, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Alerrandro', clube: 'EC Vitória', pais: 'Brazil', posicao: 'AV', numero_camisola: 9, media_rating: 7.5, titular_habitual: true, golos_marcados: 11, assistencias: 3, cartoes_amarelos: 3, em_risco_5_amarelo: false },

  // Chapecoense AF
  { nome: 'Léo Vieira', clube: 'Chapecoense AF', pais: 'Brazil', posicao: 'GR', numero_camisola: 1, media_rating: 7.2, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Bruno Leonardo', clube: 'Chapecoense AF', pais: 'Brazil', posicao: 'DC', numero_camisola: 3, media_rating: 7.1, titular_habitual: true, golos_marcados: 2, assistencias: 0, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Rafael Carvalheira', clube: 'Chapecoense AF', pais: 'Brazil', posicao: 'MC', numero_camisola: 8, media_rating: 7.2, titular_habitual: true, golos_marcados: 4, assistencias: 3, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Mário Sérgio', clube: 'Chapecoense AF', pais: 'Brazil', posicao: 'AV', numero_camisola: 9, media_rating: 7.4, titular_habitual: true, golos_marcados: 9, assistencias: 2, cartoes_amarelos: 3, em_risco_5_amarelo: false },

  // Botafogo FR
  { nome: 'John Victor', clube: 'Botafogo FR', pais: 'Brazil', posicao: 'GR', numero_camisola: 1, media_rating: 7.4, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Bastos', clube: 'Botafogo FR', pais: 'Angola', posicao: 'DC', numero_camisola: 15, media_rating: 7.4, titular_habitual: true, golos_marcados: 4, assistencias: 0, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Alexander Barboza', clube: 'Botafogo FR', pais: 'Argentina', posicao: 'DC', numero_camisola: 20, media_rating: 7.3, titular_habitual: true, golos_marcados: 1, assistencias: 1, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Alex Telles', clube: 'Botafogo FR', pais: 'Brazil', posicao: 'LE', numero_camisola: 13, media_rating: 7.3, titular_habitual: true, golos_marcados: 1, assistencias: 3, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Marlon Freitas', clube: 'Botafogo FR', pais: 'Brazil', posicao: 'MC', numero_camisola: 17, media_rating: 7.5, titular_habitual: true, golos_marcados: 2, assistencias: 6, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Gregore', clube: 'Botafogo FR', pais: 'Brazil', posicao: 'MC', numero_camisola: 5, media_rating: 7.3, titular_habitual: true, golos_marcados: 1, assistencias: 2, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Thiago Almada', clube: 'Botafogo FR', pais: 'Argentina', posicao: 'MO', numero_camisola: 23, media_rating: 7.7, titular_habitual: true, golos_marcados: 5, assistencias: 5, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Luiz Henrique', clube: 'Botafogo FR', pais: 'Brazil', posicao: 'ED', numero_camisola: 7, media_rating: 7.8, titular_habitual: true, golos_marcados: 8, assistencias: 6, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Jefferson Savarino', clube: 'Botafogo FR', pais: 'Venezuela', posicao: 'EE', numero_camisola: 10, media_rating: 7.6, titular_habitual: true, golos_marcados: 7, assistencias: 7, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Igor Jesus', clube: 'Botafogo FR', pais: 'Brazil', posicao: 'AV', numero_camisola: 99, media_rating: 7.6, titular_habitual: true, golos_marcados: 9, assistencias: 3, cartoes_amarelos: 3, em_risco_5_amarelo: false },

  // CR Vasco da Gama
  { nome: 'Léo Jardim', clube: 'CR Vasco da Gama', pais: 'Brazil', posicao: 'GR', numero_camisola: 1, media_rating: 7.5, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Lucas Piton', clube: 'CR Vasco da Gama', pais: 'Brazil', posicao: 'LE', numero_camisola: 6, media_rating: 7.3, titular_habitual: true, golos_marcados: 3, assistencias: 6, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Hugo Moura', clube: 'CR Vasco da Gama', pais: 'Brazil', posicao: 'MC', numero_camisola: 25, media_rating: 7.2, titular_habitual: true, golos_marcados: 1, assistencias: 2, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Philippe Coutinho', clube: 'CR Vasco da Gama', pais: 'Brazil', posicao: 'MO', numero_camisola: 11, media_rating: 7.6, titular_habitual: true, golos_marcados: 5, assistencias: 3, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Pablo Vegetti', clube: 'CR Vasco da Gama', pais: 'Argentina', posicao: 'AV', numero_camisola: 99, media_rating: 7.7, titular_habitual: true, golos_marcados: 14, assistencias: 2, cartoes_amarelos: 4, em_risco_5_amarelo: true },

  // CR Flamengo
  { nome: 'Agustín Rossi', clube: 'CR Flamengo', pais: 'Argentina', posicao: 'GR', numero_camisola: 1, media_rating: 7.4, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Léo Ortiz', clube: 'CR Flamengo', pais: 'Brazil', posicao: 'DC', numero_camisola: 3, media_rating: 7.4, titular_habitual: true, golos_marcados: 2, assistencias: 1, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Erick Pulgar', clube: 'CR Flamengo', pais: 'Chile', posicao: 'MC', numero_camisola: 5, media_rating: 7.3, titular_habitual: true, golos_marcados: 1, assistencias: 3, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Nicolás de la Cruz', clube: 'CR Flamengo', pais: 'Uruguay', posicao: 'MC', numero_camisola: 18, media_rating: 7.6, titular_habitual: true, golos_marcados: 4, assistencias: 5, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Giorgian de Arrascaeta', clube: 'CR Flamengo', pais: 'Uruguay', posicao: 'MO', numero_camisola: 14, media_rating: 7.8, titular_habitual: true, golos_marcados: 8, assistencias: 9, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Gerson', clube: 'CR Flamengo', pais: 'Brazil', posicao: 'MC', numero_camisola: 8, media_rating: 7.7, titular_habitual: true, golos_marcados: 4, assistencias: 6, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Pedro', clube: 'CR Flamengo', pais: 'Brazil', posicao: 'AV', numero_camisola: 9, media_rating: 7.9, titular_habitual: true, golos_marcados: 16, assistencias: 3, cartoes_amarelos: 2, em_risco_5_amarelo: false },

  // SE Palmeiras
  { nome: 'Weverton', clube: 'SE Palmeiras', pais: 'Brazil', posicao: 'GR', numero_camisola: 21, media_rating: 7.4, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Gustavo Gómez', clube: 'SE Palmeiras', pais: 'Paraguay', posicao: 'DC', numero_camisola: 15, media_rating: 7.5, titular_habitual: true, golos_marcados: 3, assistencias: 1, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Aníbal Moreno', clube: 'SE Palmeiras', pais: 'Argentina', posicao: 'MC', numero_camisola: 5, media_rating: 7.4, titular_habitual: true, golos_marcados: 2, assistencias: 2, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Richard Ríos', clube: 'SE Palmeiras', pais: 'Colombia', posicao: 'MC', numero_camisola: 27, media_rating: 7.4, titular_habitual: true, golos_marcados: 3, assistencias: 3, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Raphael Veiga', clube: 'SE Palmeiras', pais: 'Brazil', posicao: 'MO', numero_camisola: 23, media_rating: 7.7, titular_habitual: true, golos_marcados: 9, assistencias: 7, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Estêvão', clube: 'SE Palmeiras', pais: 'Brazil', posicao: 'ED', numero_camisola: 41, media_rating: 7.9, titular_habitual: true, golos_marcados: 12, assistencias: 8, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Flaco López', clube: 'SE Palmeiras', pais: 'Argentina', posicao: 'AV', numero_camisola: 42, media_rating: 7.6, titular_habitual: true, golos_marcados: 11, assistencias: 3, cartoes_amarelos: 2, em_risco_5_amarelo: false },

  // Sporting CP
  { nome: 'Franco Israel', clube: 'Sporting CP', pais: 'Uruguay', posicao: 'GR', numero_camisola: 1, media_rating: 7.3, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Gonçalo Inácio', clube: 'Sporting CP', pais: 'Portugal', posicao: 'DC', numero_camisola: 25, media_rating: 7.4, titular_habitual: true, golos_marcados: 3, assistencias: 2, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Ousmane Diomande', clube: 'Sporting CP', pais: 'Ivory Coast', posicao: 'DC', numero_camisola: 26, media_rating: 7.4, titular_habitual: true, golos_marcados: 2, assistencias: 0, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Morten Hjulmand', clube: 'Sporting CP', pais: 'Denmark', posicao: 'MC', numero_camisola: 42, media_rating: 7.6, titular_habitual: true, golos_marcados: 3, assistencias: 3, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Hidemasa Morita', clube: 'Sporting CP', pais: 'Japan', posicao: 'MC', numero_camisola: 5, media_rating: 7.4, titular_habitual: true, golos_marcados: 2, assistencias: 4, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Francisco Trincão', clube: 'Sporting CP', pais: 'Portugal', posicao: 'ED', numero_camisola: 17, media_rating: 7.7, titular_habitual: true, golos_marcados: 8, assistencias: 8, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Pedro Gonçalves', clube: 'Sporting CP', pais: 'Portugal', posicao: 'MO', numero_camisola: 8, media_rating: 7.8, titular_habitual: true, golos_marcados: 10, assistencias: 7, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Viktor Gyökeres', clube: 'Sporting CP', pais: 'Sweden', posicao: 'PL', numero_camisola: 9, media_rating: 8.4, titular_habitual: true, golos_marcados: 22, assistencias: 6, cartoes_amarelos: 2, em_risco_5_amarelo: false },

  // SL Benfica
  { nome: 'Anatoliy Trubin', clube: 'SL Benfica', pais: 'Ukraine', posicao: 'GR', numero_camisola: 1, media_rating: 7.4, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Nicolás Otamendi', clube: 'SL Benfica', pais: 'Argentina', posicao: 'DC', numero_camisola: 30, media_rating: 7.3, titular_habitual: true, golos_marcados: 2, assistencias: 1, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Álvaro Carreras', clube: 'SL Benfica', pais: 'Spain', posicao: 'LE', numero_camisola: 3, media_rating: 7.4, titular_habitual: true, golos_marcados: 2, assistencias: 4, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Florentino Luís', clube: 'SL Benfica', pais: 'Portugal', posicao: 'MC', numero_camisola: 61, media_rating: 7.3, titular_habitual: true, golos_marcados: 1, assistencias: 1, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Orkun Kökçü', clube: 'SL Benfica', pais: 'Turkey', posicao: 'MO', numero_camisola: 10, media_rating: 7.6, titular_habitual: true, golos_marcados: 6, assistencias: 5, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Ángel Di María', clube: 'SL Benfica', pais: 'Argentina', posicao: 'ED', numero_camisola: 11, media_rating: 7.8, titular_habitual: true, golos_marcados: 8, assistencias: 7, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Kerem Aktürkoğlu', clube: 'SL Benfica', pais: 'Turkey', posicao: 'EE', numero_camisola: 17, media_rating: 7.7, titular_habitual: true, golos_marcados: 9, assistencias: 5, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Vangelis Pavlidis', clube: 'SL Benfica', pais: 'Greece', posicao: 'PL', numero_camisola: 14, media_rating: 7.6, titular_habitual: true, golos_marcados: 12, assistencias: 3, cartoes_amarelos: 2, em_risco_5_amarelo: false },

  // FC Porto
  { nome: 'Diogo Costa', clube: 'FC Porto', pais: 'Portugal', posicao: 'GR', numero_camisola: 99, media_rating: 7.6, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Nehuén Pérez', clube: 'FC Porto', pais: 'Argentina', posicao: 'DC', numero_camisola: 24, media_rating: 7.3, titular_habitual: true, golos_marcados: 1, assistencias: 0, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Alan Varela', clube: 'FC Porto', pais: 'Argentina', posicao: 'MC', numero_camisola: 22, media_rating: 7.5, titular_habitual: true, golos_marcados: 2, assistencias: 3, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Nico González', clube: 'FC Porto', pais: 'Spain', posicao: 'MC', numero_camisola: 16, media_rating: 7.6, titular_habitual: true, golos_marcados: 6, assistencias: 4, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Galeno', clube: 'FC Porto', pais: 'Brazil', posicao: 'EE', numero_camisola: 13, media_rating: 7.6, titular_habitual: true, golos_marcados: 9, assistencias: 4, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Pepê', clube: 'FC Porto', pais: 'Brazil', posicao: 'ED', numero_camisola: 11, media_rating: 7.5, titular_habitual: true, golos_marcados: 5, assistencias: 5, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Samu Omorodion', clube: 'FC Porto', pais: 'Spain', posicao: 'PL', numero_camisola: 9, media_rating: 7.8, titular_habitual: true, golos_marcados: 14, assistencias: 2, cartoes_amarelos: 2, em_risco_5_amarelo: false },

  // SC Braga (PORTUGAL)
  { nome: 'Matheus', clube: 'SC Braga', pais: 'Brazil', posicao: 'GR', numero_camisola: 1, media_rating: 7.3, titular_habitual: true, golos_marcados: 0, assistencias: 0, cartoes_amarelos: 1, em_risco_5_amarelo: false },
  { nome: 'Sikou Niakaté', clube: 'SC Braga', pais: 'Mali', posicao: 'DC', numero_camisola: 4, media_rating: 7.2, titular_habitual: true, golos_marcados: 1, assistencias: 0, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Vítor Carvalho', clube: 'SC Braga', pais: 'Brazil', posicao: 'MC', numero_camisola: 6, media_rating: 7.2, titular_habitual: true, golos_marcados: 2, assistencias: 1, cartoes_amarelos: 4, em_risco_5_amarelo: true },
  { nome: 'Rodrigo Zalazar', clube: 'SC Braga', pais: 'Uruguay', posicao: 'MO', numero_camisola: 10, media_rating: 7.7, titular_habitual: true, golos_marcados: 6, assistencias: 6, cartoes_amarelos: 3, em_risco_5_amarelo: false },
  { nome: 'Bruma', clube: 'SC Braga', pais: 'Portugal', posicao: 'EE', numero_camisola: 7, media_rating: 7.6, titular_habitual: true, golos_marcados: 8, assistencias: 5, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Ricardo Horta', clube: 'SC Braga', pais: 'Portugal', posicao: 'ED', numero_camisola: 21, media_rating: 7.6, titular_habitual: true, golos_marcados: 8, assistencias: 6, cartoes_amarelos: 2, em_risco_5_amarelo: false },
  { nome: 'Amine El Ouazzani', clube: 'SC Braga', pais: 'Morocco', posicao: 'PL', numero_camisola: 9, media_rating: 7.3, titular_habitual: true, golos_marcados: 7, assistencias: 2, cartoes_amarelos: 2, em_risco_5_amarelo: false }
];

async function seed() {
  console.log(`Starting to seed ${SQUAD_DATA.length} players to Supabase jogadores table...`);
  
  // Check which players already exist by nome + clube
  const { data: existing, error: readErr } = await supabase.from('jogadores').select('nome, clube');
  if (readErr) {
    console.error('Error reading existing players:', readErr);
    return;
  }
  
  const existingSet = new Set((existing || []).map(p => `${p.nome.toLowerCase()}_${p.clube.toLowerCase()}`));
  
  const toInsert = SQUAD_DATA.filter(p => !existingSet.has(`${p.nome.toLowerCase()}_${p.clube.toLowerCase()}`));
  console.log(`Found ${toInsert.length} new players to insert (${existing.length} already exist).`);
  
  if (toInsert.length === 0) {
    console.log('All players already seeded!');
    return;
  }

  // Insert in chunks of 20
  for (let i = 0; i < toInsert.length; i += 20) {
    const chunk = toInsert.slice(i, i + 20);
    const { error: insErr } = await supabase.from('jogadores').insert(chunk);
    if (insErr) {
      console.error(`Error inserting chunk ${i}:`, insErr);
    } else {
      console.log(`Inserted chunk ${i} - ${i + chunk.length}`);
    }
  }

  const { count } = await supabase.from('jogadores').select('*', { count: 'exact', head: true });
  console.log(`Finished! Total jogadores in Supabase now: ${count}`);
}

seed();
