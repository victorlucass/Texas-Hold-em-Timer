'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  PlusCircle,
  Trash2,
  Coins,
  Palette,
  Calculator,
  UserPlus,
  ArrowLeft,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

interface Chip {
  id: number;
  value: number;
  color: string;
  name: string;
}

interface Player {
  id: number;
  name: string;
  buyIn: number;
  chips: { chipId: number; count: number }[];
}

const ChipIcon = ({ color }: { color: string }) => (
  <div
    className="h-6 w-6 rounded-full border-2 border-white/20 inline-block mr-2"
    style={{ backgroundColor: color }}
  ></div>
);

const initialChips: Chip[] = [
  { id: 1, value: 0.25, color: '#22c55e', name: 'Verde' },
  { id: 2, value: 0.5, color: '#ef4444', name: 'Vermelha' },
  { id: 3, value: 1, color: '#f5f5f5', name: 'Branca' },
  { id: 4, value: 10, color: '#171717', name: 'Preta' },
];

const CashGameManager: React.FC = () => {
  const { toast } = useToast();
  const [chips, setChips] = useState<Chip[]>(initialChips);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerBuyIn, setNewPlayerBuyIn] = useState('');

  const handleAddPlayer = () => {
    if (!newPlayerName || !newPlayerBuyIn) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, preencha o nome e o valor de buy-in do jogador.',
      });
      return;
    }
    const buyInValue = parseFloat(newPlayerBuyIn);
    if (isNaN(buyInValue) || buyInValue <= 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O valor do buy-in deve ser um número positivo.',
      });
      return;
    }

    const newPlayer: Player = {
      id: players.length > 0 ? Math.max(...players.map(p => p.id)) + 1 : 1,
      name: newPlayerName,
      buyIn: buyInValue,
      chips: [],
    };
    
    // Placeholder for chip distribution logic
    toast({
        title: 'Jogador Adicionado!',
        description: `${newPlayer.name} entrou na mesa com R$${buyInValue.toFixed(2)}. A distribuição de fichas será implementada em breve.`
    })

    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
    setNewPlayerBuyIn('');
  };

  const removePlayer = (id: number) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const totalBuyIn = useMemo(() => {
    return players.reduce((acc, player) => acc + player.buyIn, 0);
  }, [players]);

  return (
    <div className="min-h-screen w-full bg-background p-4 md:p-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
            <Button asChild variant="outline" size="icon">
                <Link href="/"><ArrowLeft/></Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl md:text-4xl font-bold text-accent">
                Gerenciador de Cash Game
                </h1>
                <p className="text-muted-foreground">Controle as finanças e fichas da sua mesa.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna da Esquerda: Jogadores e Total */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus /> Adicionar Jogador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <Input
                    placeholder="Nome do Jogador"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Valor do Buy-in (R$)"
                    value={newPlayerBuyIn}
                    onChange={(e) => setNewPlayerBuyIn(e.target.value)}
                  />
                  <Button onClick={handleAddPlayer} className="w-full md:w-auto">
                    <PlusCircle className="mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Jogadores na Mesa</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Buy-in</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum jogador na mesa ainda.</TableCell>
                        </TableRow>
                    ) : players.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell>R$ {player.buyIn.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePlayer(player.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Coluna da Direita: Fichas e Acerto de Contas */}
          <div className="space-y-8">
            <Card className="bg-secondary">
              <CardHeader>
                <CardTitle className="text-secondary-foreground">Banca Total</CardTitle>
                <CardDescription className="text-secondary-foreground/80">Valor total que entrou na mesa.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-accent">R$ {totalBuyIn.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette/> Fichas do Jogo</CardTitle>
                <CardDescription>Configure os valores e cores das fichas.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                    {chips.map(chip => (
                        <div key={chip.id} className="flex items-center gap-4">
                            <ChipIcon color={chip.color}/>
                            <Input 
                                type="text" 
                                value={chip.name}
                                onChange={(e) => setChips(chips.map(c => c.id === chip.id ? {...c, name: e.target.value} : c))}
                                className="w-24"
                            />
                            <div className="flex items-center">
                               <span className="mr-2">R$</span>
                               <Input 
                                   type="number" 
                                   value={chip.value}
                                   onChange={(e) => setChips(chips.map(c => c.id === chip.id ? {...c, value: parseFloat(e.target.value) || 0} : c))}
                                   className="w-20"
                                />
                            </div>
                        </div>
                    ))}
                 </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                 <Button variant="outline" className="w-full">Adicionar Ficha</Button>
                 <Button variant="ghost" className="w-full">Resetar Fichas</Button>
              </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calculator/> Acerto de Contas</CardTitle>
                    <CardDescription>Ao final do jogo, insira a contagem de fichas de cada jogador para calcular os resultados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center">Funcionalidade em desenvolvimento...</p>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" disabled>Iniciar Acerto de Contas</Button>
                </CardFooter>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CashGameManager;
