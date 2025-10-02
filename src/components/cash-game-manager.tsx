'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  TableFooter as UiTableFooter,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  PlusCircle,
  Trash2,
  Palette,
  Calculator,
  UserPlus,
  ArrowLeft,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';

// Tipos, Constantes e Funções de Utilidade movidos para fora do componente

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

const initialChips: Chip[] = [
  { id: 1, value: 0.25, color: '#22c55e', name: 'Verde' },
  { id: 2, value: 0.5, color: '#ef4444', name: 'Vermelha' },
  { id: 3, value: 1, color: '#f5f5f5', name: 'Branca' },
  { id: 4, value: 10, color: '#171717', name: 'Preta' },
];

const ChipIcon = ({ color, className }: { color: string; className?: string }) => (
  <div
    className={cn('h-5 w-5 rounded-full border-2 border-white/20 inline-block', className)}
    style={{ backgroundColor: color }}
  />
);

const distributeChips = (buyIn: number, availableChips: Chip[]): { chipId: number; count: number }[] => {
  let remainingAmount = buyIn;
  const sortedChips = [...availableChips].sort((a, b) => b.value - a.value);
  const distribution: Map<number, number> = new Map(sortedChips.map(c => [c.id, 0]));

  // 1. Tenta alocar pelo menos uma de cada ficha para garantir variedade, se possível
  for (const chip of sortedChips.slice().reverse()) { // itera do menor para o maior
    if (remainingAmount >= chip.value * 2) { // Garante que há valor suficiente para não comprometer a distribuição
      distribution.set(chip.id, (distribution.get(chip.id) || 0) + 1);
      remainingAmount = parseFloat((remainingAmount - chip.value).toFixed(2));
    }
  }

  // 2. Distribui o restante de forma mais equilibrada
  const distributionPercentages: { [key: number]: number } = {};
  if(sortedChips.find(c => c.value === 10)) distributionPercentages[sortedChips.find(c => c.value === 10)!.id] = 0.5;
  if(sortedChips.find(c => c.value === 1)) distributionPercentages[sortedChips.find(c => c.value === 1)!.id] = 0.3;
  if(sortedChips.find(c => c.value === 0.5)) distributionPercentages[sortedChips.find(c => c.value === 0.5)!.id] = 0.15;
  if(sortedChips.find(c => c.value === 0.25)) distributionPercentages[sortedChips.find(c => c.value === 0.25)!.id] = 0.05;

  for (const chip of sortedChips) {
      if (remainingAmount <= 0) break;
      const targetAmount = remainingAmount * (distributionPercentages[chip.id] || 0);
      let count = Math.floor(targetAmount / chip.value);
      
      // Tenta arredondar para o múltiplo de 5 mais próximo se for ficha de centavos
      if(chip.value < 1 && count > 5) {
          count = Math.round(count / 5) * 5;
      }

      if (count > 0) {
        distribution.set(chip.id, (distribution.get(chip.id) || 0) + count);
        remainingAmount = parseFloat((remainingAmount - count * chip.value).toFixed(2));
      }
  }
  
  // 3. Preenche o restante com a lógica "greedy" para garantir que o valor bata
  for (const chip of sortedChips) {
    if (remainingAmount >= chip.value) {
      const count = Math.floor(remainingAmount / chip.value);
      if (count > 0) {
        distribution.set(chip.id, (distribution.get(chip.id) || 0) + count);
        remainingAmount = parseFloat((remainingAmount - count * chip.value).toFixed(2));
      }
    }
  }

  // 4. Validação final
  const finalDistribution = Array.from(distribution.entries()).map(([chipId, count]) => ({ chipId, count }));
  const totalDistributedValue = finalDistribution.reduce((acc, dist) => {
    const chip = availableChips.find(c => c.id === dist.chipId);
    return acc + (chip ? chip.value * dist.count : 0);
  }, 0);
  
  if (Math.abs(totalDistributedValue - buyIn) > 0.01) {
    console.warn("Complex distribution failed. Value mismatch.", {totalDistributedValue, buyIn});
    return []; // Falha na distribuição
  }

  return sortedChips.map(chip => ({
    chipId: chip.id,
    count: distribution.get(chip.id) || 0,
  }));
};


// O Componente Principal
const CashGameManager: React.FC = () => {
  const { toast } = useToast();
  const [chips, setChips] = useState<Chip[]>(initialChips);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerBuyIn, setNewPlayerBuyIn] = useState('');
  const [isAddChipOpen, setIsAddChipOpen] = useState(false);
  const [newChip, setNewChip] = useState({ name: '', value: '', color: '#ffffff' });

  const sortedChips = useMemo(() => [...chips].sort((a, b) => a.value - b.value), [chips]);

  const handleAddPlayer = useCallback(() => {
    if (!newPlayerName || !newPlayerBuyIn) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, preencha o nome e o valor de buy-in do jogador.',
      });
      return;
    }
    const buyInValue = parseFloat(newPlayerBuyIn);
    if (isNaN(buyInValue) || buyInValue <= 0 || buyInValue % 5 !== 0) {
      toast({
        variant: 'destructive',
        title: 'Erro de Buy-in',
        description: 'O valor do buy-in deve ser um número positivo e múltiplo de 5.',
      });
      return;
    }

    const chipDistribution = distributeChips(buyInValue, chips);

    if (chipDistribution.length === 0) {
        toast({
            variant: "destructive",
            title: "Erro na distribuição",
            description: `Não foi possível distribuir R$${buyInValue.toFixed(2)} com as fichas atuais. Tente um valor diferente ou ajuste as fichas.`
        })
        return;
    }

    const newPlayer: Player = {
      id: players.length > 0 ? Math.max(...players.map(p => p.id)) + 1 : 1,
      name: newPlayerName,
      buyIn: buyInValue,
      chips: chipDistribution,
    };
    
    toast({
        title: 'Jogador Adicionado!',
        description: `${newPlayer.name} entrou na mesa com R$${buyInValue.toFixed(2)}.`,
    });

    setPlayers(prevPlayers => [...prevPlayers, newPlayer]);
    setNewPlayerName('');
    setNewPlayerBuyIn('');
  }, [newPlayerName, newPlayerBuyIn, chips, players, toast]);

  const removePlayer = (id: number) => {
    setPlayers(players.filter(p => p.id !== id));
  };
  
  const handleAddChip = () => {
    const value = parseFloat(newChip.value);
    if (!newChip.name || isNaN(value) || value <= 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, preencha nome e valor (positivo) da ficha.',
      });
      return;
    }
    const newChipData: Chip = {
      id: chips.length > 0 ? Math.max(...chips.map(c => c.id)) + 1 : 1,
      name: newChip.name,
      value,
      color: newChip.color,
    };
    setChips([...chips, newChipData]);
    toast({ title: 'Ficha Adicionada!', description: `A ficha "${newChip.name}" foi adicionada.` });
    setNewChip({ name: '', value: '', color: '#ffffff' });
    setIsAddChipOpen(false);
  };
  
  const handleRemoveChip = (id: number) => {
    if(players.length > 0) {
      toast({ variant: 'destructive', title: 'Ação Bloqueada', description: 'Não é possível remover fichas com jogadores na mesa.' });
      return;
    }
    setChips(chips.filter(c => c.id !== id));
  };

  const handleResetChips = () => {
    if(players.length > 0) {
      toast({ variant: 'destructive', title: 'Ação Bloqueada', description: 'Não é possível resetar as fichas com jogadores na mesa.' });
      return;
    }
    setChips(initialChips);
    toast({ title: 'Fichas Resetadas!', description: 'As fichas foram restauradas para o padrão.' });
  }

  const totalBuyIn = useMemo(() => {
    return players.reduce((acc, player) => acc + player.buyIn, 0);
  }, [players]);

  const totalChipsByType = useMemo(() => {
    const totals: { [key: number]: number } = {};
    for (const chip of sortedChips) {
      totals[chip.id] = 0;
    }
    for (const player of players) {
      for (const playerChip of player.chips) {
        if (totals[playerChip.chipId] !== undefined) {
          totals[playerChip.chipId] += playerChip.count;
        }
      }
    }
    return totals;
  }, [players, sortedChips]);

  const totalValueByType = useMemo(() => {
    const totals: { [key: number]: number } = {};
     for (const chip of sortedChips) {
      const chipValue = chip.value;
      const totalCount = totalChipsByType[chip.id] || 0;
      totals[chip.id] = totalCount * chipValue;
    }
    return totals;
  }, [sortedChips, totalChipsByType]);

  const grandTotalValue = useMemo(() => {
      return Object.values(totalValueByType).reduce((acc, value) => acc + value, 0);
  },[totalValueByType]);

  return (
    <div className="min-h-screen w-full bg-background p-4 md:p-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="outline" size="icon">
            <Link href="/">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="font-headline text-3xl md:text-4xl font-bold text-accent">
              Gerenciador de Cash Game
            </h1>
            <p className="text-muted-foreground">Controle as finanças e fichas da sua mesa.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                <CardTitle>Jogadores e Fichas na Mesa</CardTitle>
                <CardDescription>Distribuição de fichas para cada jogador e totais.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jogador</TableHead>
                        <TableHead className="text-right">Buy-in</TableHead>
                        {sortedChips.map((chip) => (
                          <TableHead key={chip.id} className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <ChipIcon color={chip.color} />
                              <span className="whitespace-nowrap">{chip.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3 + sortedChips.length}
                            className="text-center text-muted-foreground h-24"
                          >
                            Nenhum jogador na mesa ainda.
                          </TableCell>
                        </TableRow>
                      ) : (
                        players.map((player) => (
                          <TableRow key={player.id}>
                            <TableCell className="font-medium">{player.name}</TableCell>
                            <TableCell className="text-right font-mono">
                              {player.buyIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            {sortedChips.map((chip) => {
                              const pChip = player.chips.find(
                                (c) => c.chipId === chip.id
                              );
                              return (
                                <TableCell key={chip.id} className="text-center font-mono">
                                  {pChip?.count || 0}
                                </TableCell>
                              );
                            })}
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
                        ))
                      )}
                    </TableBody>
                    {players.length > 0 && (
                      <UiTableFooter>
                         <TableRow className="bg-muted/50 hover:bg-muted font-bold">
                          <TableCell colSpan={2} className="text-right">
                            Total de Fichas
                          </TableCell>
                          {sortedChips.map((chip) => (
                            <TableCell key={chip.id} className="text-center font-mono">
                              {totalChipsByType[chip.id] || 0}
                            </TableCell>
                          ))}
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/80 hover:bg-muted font-bold">
                          <TableCell colSpan={2} className="text-right">
                            Valor Total
                          </TableCell>
                          {sortedChips.map((chip) => (
                            <TableCell key={chip.id} className="text-center font-mono">
                              {totalValueByType[chip.id].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                          ))}
                           <TableCell className="text-right font-mono">
                              {grandTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                        </TableRow>
                      </UiTableFooter>
                    )}
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-secondary">
              <CardHeader>
                <CardTitle className="text-secondary-foreground">Banca Total</CardTitle>
                <CardDescription className="text-secondary-foreground/80">
                  Valor total que entrou na mesa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-accent">
                  {totalBuyIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette /> Fichas do Jogo
                </CardTitle>
                <CardDescription>
                  Configure os valores e cores das fichas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chips.map((chip) => (
                    <div key={chip.id} className="flex items-center gap-2">
                      <ChipIcon color={chip.color} />
                      <Input
                        type="text"
                        value={chip.name}
                        onChange={(e) =>
                          setChips(
                            chips.map((c) =>
                              c.id === chip.id ? { ...c, name: e.target.value } : c
                            )
                          )
                        }
                        className="w-24 flex-1"
                        disabled={players.length > 0}
                      />
                      <div className="flex items-center">
                        <span className="mr-2 text-sm">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={chip.value}
                          onChange={(e) =>
                            setChips(
                              chips.map((c) =>
                                c.id === chip.id
                                  ? { ...c, value: parseFloat(e.target.value) || 0 }
                                  : c
                              )
                            )
                          }
                          className="w-20"
                          disabled={players.length > 0}
                        />
                      </div>
                       <Button variant="ghost" size="icon" disabled={players.length > 0} onClick={() => handleRemoveChip(chip.id)}>
                          <Trash2 className="h-4 w-4 text-red-500/80" />
                        </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Dialog open={isAddChipOpen} onOpenChange={setIsAddChipOpen}>
                  <DialogTrigger asChild>
                     <Button variant="outline" className="w-full" disabled={players.length > 0}>
                        Adicionar Ficha
                      </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Nova Ficha</DialogTitle>
                      <DialogDescription>
                        Defina as propriedades da nova ficha para o jogo.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="chip-name" className="text-right">Nome</Label>
                        <Input id="chip-name" value={newChip.name} onChange={e => setNewChip({...newChip, name: e.target.value})} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="chip-value" className="text-right">Valor (R$)</Label>
                        <Input id="chip-value" type="number" value={newChip.value} onChange={e => setNewChip({...newChip, value: e.target.value})} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="chip-color" className="text-right">Cor</Label>
                        <Input id="chip-color" type="color" value={newChip.color} onChange={e => setNewChip({...newChip, color: e.target.value})} className="col-span-3 h-10 p-1" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddChip}>Salvar Ficha</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" className="w-full" onClick={handleResetChips} disabled={players.length > 0}>
                  Resetar Fichas
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator /> Acerto de Contas
                </CardTitle>
                <CardDescription>
                  Ao final do jogo, insira a contagem de fichas de cada jogador
                  para calcular os resultados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Funcionalidade em desenvolvimento...
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled>
                  Iniciar Acerto de Contas
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashGameManager;
