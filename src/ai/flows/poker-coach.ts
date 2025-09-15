'use server';

/**
 * @fileOverview Um agente de IA especialista em poker.
 *
 * - askPokerCoach - Uma função que responde a perguntas sobre regras e estratégias de poker.
 * - PokerCoachInput - O tipo de entrada para a função askPokerCoach.
 * - PokerCoachOutput - O tipo de retorno para a função askPokerCoach.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PokerCoachInputSchema = z.object({
  question: z
    .string()
    .describe('A pergunta do usuário sobre poker.'),
});
export type PokerCoachInput = z.infer<typeof PokerCoachInputSchema>;

const PokerCoachOutputSchema = z.object({
    answer: z.string().describe('A resposta do especialista em poker para a pergunta do usuário.'),
});
export type PokerCoachOutput = z.infer<typeof PokerCoachOutputSchema>;

export async function askPokerCoach(input: PokerCoachInput): Promise<PokerCoachOutput> {
  return pokerCoachFlow(input);
}

const prompt = ai.definePrompt({
  name: 'pokerCoachPrompt',
  input: {schema: PokerCoachInputSchema},
  output: {schema: PokerCoachOutputSchema},
  prompt: `Você é um especialista em poker Texas Hold'em. Sua tarefa é responder a perguntas sobre regras, estratégias e etiqueta do jogo de forma clara e concisa em Português do Brasil.

Pergunta do usuário: {{{question}}}

Responda à pergunta da melhor maneira possível.`,
});

const pokerCoachFlow = ai.defineFlow(
  {
    name: 'pokerCoachFlow',
    inputSchema: PokerCoachInputSchema,
    outputSchema: PokerCoachOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
