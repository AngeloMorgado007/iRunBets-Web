/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const sendMessageToGemini = async (history: {role: string, text: string}[], newMessage: string): Promise<string> => {
  try {
    const res = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history, newMessage }),
    });

    if (!res.ok) {
      const errData = await res.json();
      return errData?.message || "Desculpa, ocorreu um erro ao contactar o servidor do assistente virtual.";
    }

    const data = await res.json();
    return data.reply || "Lamento, não obtive resposta do assistador.";

  } catch (error) {
    console.error("Gemini API Client Proxy Error:", error);
    return "Lamento, mas ocorreu um erro a processar os dados matemáticos da partida neste momento.";
  }
};
