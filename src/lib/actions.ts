'use server';

import { generateTheme, type GenerateThemeOutput } from '@/ai/flows/generate-theming';

export async function handleTheming(
  prevState: any,
  formData: FormData
): Promise<{ message: string; theme?: GenerateThemeOutput; error?: string }> {
  const themePreferences = formData.get('themePreferences') as string;

  if (!themePreferences || themePreferences.trim().length < 10) {
    return { message: '', error: 'Please provide a more detailed description for the theme.' };
  }

  try {
    const theme = await generateTheme({ themePreferences });
    if (!theme.backgroundImage) {
        return { message: '', error: 'AI could not generate an image. Please try a different prompt.' };
    }
    return { message: 'Theme generated successfully!', theme };
  } catch (error) {
    console.error(error);
    return { message: '', error: 'Failed to generate theme. Please try again later.' };
  }
}
