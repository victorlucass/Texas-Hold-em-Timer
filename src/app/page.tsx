import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Zap, Users } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 className="font-headline text-5xl font-bold text-accent">
          Poker Timer & Manager
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Sua ferramenta completa para noites de poker.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Link href="/tournament" passHref>
          <Card className="hover:border-primary hover:shadow-primary/20 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-2xl text-primary">
                <Zap /> Modo Torneio
              </CardTitle>
              <CardDescription>
                Gerencie o tempo, os blinds e a premiação do seu torneio de poker. Ideal para competições com estrutura de blinds crescente.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button variant="outline" className="w-full">
                Iniciar Torneio
              </Button>
            </CardContent>
          </Card>
        </Link>
        <Link href="/cash-game" passHref>
          <Card className="hover:border-accent hover:shadow-accent/20 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-2xl text-accent">
                <Users /> Modo Cash Game
              </CardTitle>
              <CardDescription>
                Controle as entradas e saídas de jogadores, gerencie as fichas e facilite o acerto de contas no final da sessão de cash game.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Iniciar Cash Game
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}
