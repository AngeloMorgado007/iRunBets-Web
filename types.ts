/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  longDescription?: string;
  price: number;
  category: 'Audio' | 'Wearable' | 'Mobile' | 'Home';
  imageUrl: string;
  gallery?: string[];
  features: string[];
}

export interface JournalArticle {
  id: number;
  title: string;
  date: string;
  excerpt: string;
  image: string;
  content: React.ReactNode; // Allowing JSX for rich formatting/poems
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

export type ViewState = 
  | { type: 'home' }
  | { type: 'product', product: Product }
  | { type: 'journal', article: JournalArticle }
  | { type: 'checkout' };

export interface JogoDoDia {
  id?: string;
  jogo_id: string;
  data: string;
  hora: string;
  liga: string;
  campeonato?: string;
  clube_casa: string;
  clube_fora: string;
  confronto: string;
  previsao_resumo: string;
  confianca_percentagem?: number | null;
  odd_1?: number | null;
  odd_x?: number | null;
  odd_2?: number | null;
  prob_casa?: number | null;
  prob_empate?: number | null;
  prob_fora?: number | null;
  estimativa_cantos?: number | string | null;
  estimativa_cartoes?: number | string | null;
  cantos_esperados?: number | string | null;
  cartoes_esperados?: number | string | null;
  valor_ev?: number | string | null;
  analise_texto?: string | null;
  estado?: string | null;
  golos_casa?: number | null;
  golos_fora?: number | null;
  golos_casa_final?: number | null;
  golos_fora_final?: number | null;
  golos_casa_intervalo?: number | null;
  golos_fora_intervalo?: number | null;
  data_jogo?: string | null;
  minuto?: number | string | null;
  resultado?: string | null;
}

export type JogoCalculado = JogoDoDia;
