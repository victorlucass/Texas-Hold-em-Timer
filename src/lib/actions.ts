'use server';

import { askPokerCoach, type PokerCoachOutput } from '@/ai/flows/poker-coach';

export async function handlePokerCoach(
  prevState: any,
  formData: FormData
): Promise<{ message: string; answer?: string; error?: string }> {
  const question = formData.get('question') as string;

  if (!question || question.trim().length < 5) {
    return { message: '', error: 'Por favor, faça uma pergunta mais detalhada.' };
  }

  try {
    const response = await askPokerCoach({ question });
    if (!response.answer) {
        return { message: '', error: 'A IA não conseguiu gerar uma resposta. Por favor, tente uma pergunta diferente.' };
    }
    return { message: 'Resposta gerada com sucesso!', answer: response.answer };
  } catch (error) {
    console.error(error);
    return { message: '', error: 'Falha ao gerar a resposta. Por favor, tente novamente mais tarde.' };
  }
}
