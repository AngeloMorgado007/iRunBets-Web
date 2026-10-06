# -*- coding: utf-8 -*-
"""
Módulo de Inteligência Desportiva: IAiRB.py
Projeto: iRunBets Sports Intelligence

Atua como Diretor Técnico e Diretor Desportivo multidisciplinar,
fundamentado nas diretrizes e matrizes curriculares dos cursos de treinadores UEFA (UEFA Pro / UEFA A).

Avalia três pilares fundamentais:
1. Dinâmica de Balneário / Psicologia (RH): Peso do favoritismo e pressão anímica.
2. Preparação Física e Cargas: Desvio padrão e volatilidade de rendimento (cansaço tardio nos 70'+).
3. Setor Defensivo e Guarda-Redes: Exposição do último reduto com base no volume ofensivo e xG adversário.
"""

from typing import Dict, Any, Optional


class IAiRBAnalyst:
    """
    Analista de Inteligência Desportiva iRunBets.
    Simula a perspetiva de Diretor Técnico e Diretor Desportivo UEFA.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

    def avaliar_psicologia_balneario(
        self,
        clube_casa: str,
        clube_fora: str,
        prob_casa: float,
        prob_empate: float,
        prob_fora: float,
        rating_favoritismo_casa: float = 50.0
    ) -> str:
        """
        Pilar 1: Dinâmica de Balneário / Psicologia (RH).
        Avalia a gestão de expectativas, pressão do resultado e o efeito anímico (favorito vs underdog).
        """
        diff = prob_casa - prob_fora
        if diff >= 30.0 or rating_favoritismo_casa >= 70.0:
            favorito, underdog = clube_casa, clube_fora
            return (
                f"[Psicologia & Balneário]: {favorito} entra com elevada exigência psicológica de comando e assunção obrigatória do jogo ({prob_casa:.1f}% probabilidade estimada). "
                f"O balneário de {underdog} opera em postura de baixa pressão anímica e resiliência tática, capitalizando eventuais frustrações ou ansiedade do favorito na ausência de golo madrugador."
            )
        elif diff <= -25.0 or rating_favoritismo_casa <= 30.0:
            favorito, underdog = clube_fora, clube_casa
            return (
                f"[Psicologia & Balneário]: {favorito} assume o peso do favoritismo forasteiro ({prob_fora:.1f}% probabilidade), exigindo rigor anímico e controlo de transições. "
                f"O grupo de {underdog}, empurrado pelo fator casa, beneficia da libertação de pressão para disputar duelos em bloco reativo com alta agressividade defensiva."
            )
        else:
            return (
                f"[Psicologia & Balneário]: Confronto de equilíbrio anímico agudo ({prob_casa:.1f}% vs {prob_fora:.1f}%). "
                f"Ambos os balneários dividem a responsabilidade táctica. A gestão da frustração perante a perda de bola e a coesão de liderança dos capitães no meio-campo serão determinantes para evitar quebras emocionais."
            )

    def avaliar_cargas_e_fadiga(
        self,
        desvio_padrao_golos: float,
        volatilidade: float = 0.5,
        jogos_acumulados_14d: int = 4
    ) -> str:
        """
        Pilar 2: Preparação Física e Cargas.
        Avalia o desvio padrão e volatilidade física projetando quebra de rendimento e cansaço tardio.
        """
        if desvio_padrao_golos >= 1.35 or volatilidade >= 0.70:
            return (
                f"[Preparação Física & Cargas]: Elevada dispersão estatística de rendimento (Desvio Padrão: {desvio_padrao_golos:.2f}, Índice de Volatilidade: {volatilidade:.2f}). "
                f"Indica desgaste neuromuscular acentuado e espaçamento entre linhas a partir dos 70 minutos. Projeta-se quebra na capacidade de pressão e risco acrescido de golos na reta final da partida."
            )
        elif desvio_padrao_golos <= 0.85 and volatilidade <= 0.35:
            return (
                f"[Preparação Física & Cargas]: Curva de rendimento motor altamente regular (Desvio Padrão contido em {desvio_padrao_golos:.2f}). "
                f"Ambas as equipas evidenciam estabilidade cardiovascular e capacidade sustentada de transição ataque-defesa ao longo dos 90 minutos, sem quebras drásticas de intensidade nos quartos finais."
            )
        else:
            return (
                f"[Preparação Física & Cargas]: Carga física com modulação equilibrada (Desvio Padrão: {desvio_padrao_golos:.2f}). "
                f"A gestão de substituições pelos treinadores entre o 60' e 75' ditará a frescura de pressing ofensivo e o fecho dos corredores laterais."
            )

    def avaliar_defesa_e_guarda_redes(
        self,
        xg_casa: float,
        xg_fora: float,
        rating_gr_casa: float = 75.0,
        rating_gr_fora: float = 75.0
    ) -> str:
        """
        Pilar 3: Setor Defensivo e Guarda-Redes.
        Analisa a exposição do último reduto, xG concedido e segurança sob os postes (xGOT).
        """
        total_xg = xg_casa + xg_fora
        if total_xg >= 2.80:
            return (
                f"[Setor Defensivo & Baliza]: Matriz de elevada exposição das linhas defensivas (xG combinado projetado: {total_xg:.2f}). "
                f"O último reduto concede frequentes entradas no terço final. A eficácia sob os postes (GR Casa: {rating_gr_casa:.0f} pts | GR Fora: {rating_gr_fora:.0f} pts) "
                f"será severamente testada em remates interiores e bolas paradas frontais."
            )
        elif total_xg <= 1.80:
            return (
                f"[Setor Defensivo & Baliza]: Estrutura defensiva de alta densidade e controlo de profundidade (xG contido em {total_xg:.2f}). "
                f"Centrais com boa leitura de coberturas e guarda-redes com elevados índices de segurança e golo evitado, limitando oportunidades claras e forçando finalizações de meia-distância."
            )
        else:
            return (
                f"[Setor Defensivo & Baliza]: Balanço defensivo padrão (xG projetado: {total_xg:.2f} com Casa {xg_casa:.2f} vs Fora {xg_fora:.2f}). "
                f"A proteção da zona 14 e as dobragens aos laterais evitarão descompensações no último reduto."
            )

    def gerar_parecer_completo(
        self,
        clube_casa: str,
        clube_fora: str,
        prob_casa: float,
        prob_empate: float,
        prob_fora: float,
        xg_casa: float,
        xg_fora: float,
        desvio_padrao: float = 1.0,
        volatilidade: float = 0.5,
        rating_gr_casa: float = 75.0,
        rating_gr_fora: float = 75.0,
        treinador_casa: Optional[str] = None,
        treinador_fora: Optional[str] = None
    ) -> str:
        """
        Gera parecer técnico multidisciplinar UEFA para ser persistido na coluna 'justificacao_matematica'.
        """
        pilar1 = self.avaliar_psicologia_balneario(clube_casa, clube_fora, prob_casa, prob_empate, prob_fora)
        pilar2 = self.avaliar_cargas_e_fadiga(desvio_padrao, volatilidade)
        pilar3 = self.avaliar_defesa_e_guarda_redes(xg_casa, xg_fora, rating_gr_casa, rating_gr_fora)

        header = f"PARECER TÉCNICO MULTIDISCIPLINAR iRunBets (UEFA PRO / DT)"
        if treinador_casa and treinador_fora:
            duelo_bancos = f"Duelo Tático: {treinador_casa} vs {treinador_fora}"
        else:
            duelo_bancos = f"Confronto: {clube_casa} vs {clube_fora}"

        parecer_formatado = (
            f"📋 {header}\n"
            f"⚽ {duelo_bancos}\n\n"
            f"1️⃣ {pilar1}\n\n"
            f"2️⃣ {pilar2}\n\n"
            f"3️⃣ {pilar3}\n\n"
            f"💡 Conclusão do Diretor Desportivo: Estrutura tática com projeção de {prob_casa:.1f}% [1] / {prob_empate:.1f}% [X] / {prob_fora:.1f}% [2]. "
            f"Alinhamento estratégico recomenda gestão disciplinada das transições e aproveitamento dos índices de desgaste físico no último terço."
        )

        return parecer_formatado
