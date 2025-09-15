'use server';

/**
 * @fileOverview AI-powered theming flow for the Texas Hold'em Timer app.
 *
 * - generateTheme - A function that generates the theme and background of the app based on user's preferences.
 * - GenerateThemeInput - The input type for the generateTheme function.
 * - GenerateThemeOutput - The return type for the generateTheme function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateThemeInputSchema = z.object({
  themePreferences: z
    .string()
    .describe("The user preferences for theming of Poker Texas Hold'em themes."),
});
export type GenerateThemeInput = z.infer<typeof GenerateThemeInputSchema>;

const GenerateThemeOutputSchema = z.object({
  backgroundDescription: z
    .string()
    .describe('A description of the generated background for the app.'),
  backgroundImage: z
    .string()
    .describe(
      "A background image for the app, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type GenerateThemeOutput = z.infer<typeof GenerateThemeOutputSchema>;

export async function generateTheme(input: GenerateThemeInput): Promise<GenerateThemeOutput> {
  return generateThemeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateThemePrompt',
  input: {schema: GenerateThemeInputSchema},
  output: {schema: GenerateThemeOutputSchema},
  prompt: `You are a UI/UX design expert specializing in theming poker apps.

Based on the user's theme preferences, generate a description of a suitable background for the app and generate a background image.

Theme Preferences: {{{themePreferences}}}

Description of the background: {{backgroundDescription}}
Background Image: {{media url=backgroundImage}}`,
});

const generateThemeFlow = ai.defineFlow(
  {
    name: 'generateThemeFlow',
    inputSchema: GenerateThemeInputSchema,
    outputSchema: GenerateThemeOutputSchema,
  },
  async input => {
    const backgroundDescription = await ai.generate({
      prompt: `Describe a suitable background for a poker app based on the following theme preferences: ${input.themePreferences}`,
    });

    const { media: backgroundImage } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Generate a background image for a poker app based on the following description: ${backgroundDescription.text}`,
    });
    
    if (!backgroundImage) {
      throw new Error('Failed to generate background image.');
    }

    return {
      backgroundDescription: backgroundDescription.text,
      backgroundImage: backgroundImage.url,
    };
  }
);
