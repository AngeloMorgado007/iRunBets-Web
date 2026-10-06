# -*- coding: utf-8 -*-
"""
Motor Principal de Inteligência Artificial: ai_engine.py
Projeto: iRunBets Sports Intelligence

Integra o motor matemático preditivo (Poisson, xG, meteorologia, dimensões de campo)
com o módulo de parecer técnico multidisciplinar UEFA (IAiRB.py).
"""

import math
import os
import json
from typing import Dict, Any, List, Optional
from IAiRB import IAiRBAnalyst


def calcular_poisson(lambda_golo: float, k: int) -> float:
    """Calcula a probabilidade de ocorrência de k golos com média lambda."""
    if lambda_golo <= 0:
        return 1.0 if k == 0 else 0.0
    return (math.exp(-lambda_golo) * (lambda_golo ** k)) / math.factorial(k)


def matriz_poisson_1x2(lambda_casa: float, lambda_fora: float, max_golos: int = 6) -> Dict[str, float]:
    """Calcula a matriz de probabilidades 1, X e 2 até max_golos."""
    prob_1 = 0.0
    prob_x = 0.0
    prob_2 = 0.0

    for gc in range(max_golos + 1):
        p_gc = calcular_poisson(lambda_casa, gc)
        for gf in range(max_golos + 1):
            p_gf = calcular_poisson(lambda_fora, gf)
            p_score = p_gc * p_gf

            if gc > gf:
                prob_1 += p_score
            elif gc == gf:
                prob_x += p_score
            else:
                prob_2 += p_score

    total = prob_1 + prob_x + prob_2
    if total > 0:
        prob_1 = (prob_1 / total) * 100
        prob_x = (prob_x / total) * 100
        prob_2 = (prob_2 / total) * 100

    return {
        "prob_casa": round(prob_1, 1),
        "prob_empate": round(prob_x, 1),
        "prob_fora": round(prob_2, 1)
    }


def executar_motor_ia(jogos_agendados: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Função principal de orquestração do motor de IA iRunBets.
    Inicializa o IAiRBAnalyst e gera as métricas quantitativas e pareceres UEFA.
    """
    # 1. Inicializa o Analista Técnico/Desportivo UEFA
    ia_irb = IAiRBAnalyst()

    if jogos_agendados is None:
        jogos_agendados = []

    resultados_processados = []

    for jogo in jogos_agendados:
        clube_casa = jogo.get("clube_casa", "Equipa Casa")
        clube_fora = jogo.get("clube_fora", "Equipa Fora")
        
        # 2. Cálculos matemáticos base: xG e Poisson
        xg_casa = float(jogo.get("xg_casa") or 1.45)
        xg_fora = float(jogo.get("xg_fora") or 1.15)
        
        probs = matriz_poisson_1x2(xg_casa, xg_fora)
        prob_casa = probs["prob_casa"]
        prob_empate = probs["prob_empate"]
        prob_fora = probs["prob_fora"]

        desvio_padrao = float(jogo.get("desvio_padrao") or 1.12)
        volatilidade = float(jogo.get("volatilidade") or 0.48)
        rating_gr_casa = float(jogo.get("rating_gr_casa") or 78.0)
        rating_gr_fora = float(jogo.get("rating_gr_fora") or 76.0)
        treinador_casa = jogo.get("treinador_casa")
        treinador_fora = jogo.get("treinador_fora")

        # 3. Geração do Parecer Técnico Multidisciplinar UEFA via IAiRB
        parecer_multidisciplinar = ia_irb.gerar_parecer_completo(
            clube_casa=clube_casa,
            clube_fora=clube_fora,
            prob_casa=prob_casa,
            prob_empate=prob_empate,
            prob_fora=prob_fora,
            xg_casa=xg_casa,
            xg_fora=xg_fora,
            desvio_padrao=desvio_padrao,
            volatilidade=volatilidade,
            rating_gr_casa=rating_gr_casa,
            rating_gr_fora=rating_gr_fora,
            treinador_casa=treinador_casa,
            treinador_fora=treinador_fora
        )

        # 4. Construção do dicionário pronto a persistir no Supabase
        payload_supabase = {
            **jogo,
            "prob_1": prob_casa,
            "prob_x": prob_empate,
            "prob_2": prob_fora,
            "xg_projetado_casa": xg_casa,
            "xg_projetado_fora": xg_fora,
            "justificacao_matematica": parecer_multidisciplinar,  # Parecer multidisciplinar IAiRB
            "analisado_por_ia": True,
            "versao_ia": "IAiRB-UEFA-v2.5"
        }

        resultados_processados.append(payload_supabase)

    return resultados_processados


if __name__ == "__main__":
    exemplo_jogo = [{
        "jogo_id": "test_001",
        "clube_casa": "FC Porto",
        "clube_fora": "Sporting CP",
        "xg_casa": 1.62,
        "xg_fora": 1.48,
        "desvio_padrao": 1.15,
        "volatilidade": 0.52,
        "rating_gr_casa": 84.0,
        "rating_gr_fora": 82.0,
        "treinador_casa": "Vítor Bruno",
        "treinador_fora": "Rúben Amorim"
    }]
    
    saida = executar_motor_ia(exemplo_jogo)
    print("--- TESTE MOTOR DE IA iRunBets ---")
    print(saida[0]["justificacao_matematica"])
