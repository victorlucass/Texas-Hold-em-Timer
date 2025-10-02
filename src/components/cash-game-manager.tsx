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
  DialogClose
} from '@/components/ui/dialog';
import {
  PlusCircle,
  Trash2,
  Palette,
  Calculator,
  UserPlus,
  ArrowLeft,
  FileText,
  AlertCircle,
  CheckCircle2,
  LogOut,
  History,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';
import { Separator } from './ui/separator';

interface Chip {
  id: number;
  value: number;
  color: string;
  name: string;
}

interface PlayerTransaction {
    id: number;
    type: 'buy-in' | 'rebuy' | 'add-on';
    amount: number;
    chips: { chipId: number; count: number }[];
}

interface Player {
  id: number;
  name: string;
  transactions: PlayerTransaction[];
  finalChipCounts?: Map<number, number>;
}

interface CashedOutPlayer {
  id: number;
  name: string;
  transactions: PlayerTransaction[];
  cashedOutAt: Date;
  amountReceived: number;
  chipCounts: Map<number, number>;
  totalInvested: number;
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
    
    // Regra: Se buyIn <= 30, usar fichas < 10. Se > 30, usar todas.
    const chipsToUse = buyIn <= 30 
      ? availableChips.filter(c => c.value < 10) 
      : availableChips;

    const sortedChips = [...chipsToUse].sort((a, b) => b.value - a.value);
    
    // Se não houver fichas para o valor, retorna erro.
    if(sortedChips.length === 0){
        return [];
    }

    const distribution: Map<number, number> = new Map(sortedChips.map(c => [c.id, 0]));

    // 1. Tenta alocar pelo menos uma de cada ficha para garantir variedade, se possível
    const smallChipsFirst = [...sortedChips].sort((a, b) => a.value - b.value);
    for (const chip of smallChipsFirst) {
        if (remainingAmount >= chip.value * Math.max(2, (1 / (chip.value / buyIn))/2) && chip.value < (buyIn/4)) {
            const count = 1;
            distribution.set(chip.id, (distribution.get(chip.id) || 0) + count);
            remainingAmount = parseFloat((remainingAmount - chip.value * count).toFixed(2));
        }
    }

    // 2. Distribui o restante de forma mais equilibrada
    for (const chip of sortedChips) {
        if (remainingAmount <= 0) break;
        if(chip.value > remainingAmount) continue;

        let allocationPercentage = 0;
        if (chip.value >= 10) allocationPercentage = 0.5;
        else if (chip.value >= 1) allocationPercentage = 0.3;
        else allocationPercentage = 0.1;

        let targetValueForChip = remainingAmount * allocationPercentage;

        let count = Math.floor(targetValueForChip / chip.value);

        // Tenta arredondar para o múltiplo de 5 mais próximo se for ficha de centavos
        if(chip.value < 1 && count > 5) {
            count = Math.round(count / 5) * 5;
        }

        if (count > 0) {
          const amountToDistribute = count * chip.value;
          if(remainingAmount >= amountToDistribute){
            distribution.set(chip.id, (distribution.get(chip.id) || 0) + count);
            remainingAmount = parseFloat((remainingAmount - amountToDistribute).toFixed(2));
          }
        }
    }

    // 3. Preenche o restante com a lógica "greedy" para garantir que o valor bata
    for (const chip of sortedChips) {
      if (remainingAmount < chip.value) continue;

      const count = Math.floor(remainingAmount / chip.value);
      if (count > 0) {
        distribution.set(chip.id, (distribution.get(chip.id) || 0) + count);
        remainingAmount = parseFloat((remainingAmount - count * chip.value).toFixed(2));
      }
    }

    // 4. Se ainda sobrar, tenta adicionar nas menores fichas
    if (remainingAmount > 0.01) {
        for (const chip of smallChipsFirst) {
             if (remainingAmount < chip.value) continue;
             const count = Math.floor(remainingAmount / chip.value);
             if (count > 0) {
                distribution.set(chip.id, (distribution.get(chip.id) || 0) + count);
                remainingAmount = parseFloat((remainingAmount - count * chip.value).toFixed(2));
             }
        }
    }

    // 5. Validação final
    const finalDistribution = Array.from(distribution.entries()).map(([chipId, count]) => ({ chipId, count }));
    const totalDistributedValue = finalDistribution.reduce((acc, dist) => {
        const chip = availableChips.find(c => c.id === dist.chipId);
        return acc + (chip ? chip.value * dist.count : 0);
    }, 0);

    if (Math.abs(totalDistributedValue - buyIn) > 0.01) {
        console.warn("Complex distribution failed. Value mismatch.", {totalDistributedValue, buyIn});
        // Fallback para a distribuição simples
        const greedyDistribution: { chipId: number; count: number }[] = [];
        let greedyAmount = buyIn;
        for (const chip of sortedChips) {
            if (greedyAmount >= chip.value) {
                const count = Math.floor(greedyAmount / chip.value);
                greedyDistribution.push({ chipId: chip.id, count });
                greedyAmount = parseFloat((greedyAmount - count * chip.value).toFixed(2));
            }
        }
        if (Math.abs(greedyAmount) > 0.01) return []; // Falha na distribuição
        return greedyDistribution;
    }

    return availableChips.map(chip => ({
        chipId: chip.id,
        count: distribution.get(chip.id) || 0,
    })).sort((a,b) => a.chipId - b.chipId);
};

const CashGameManager: React.FC = () => {
  const { toast } = useToast();
  const [chips, setChips] = useState<Chip[]>(initialChips);
  const [players, setPlayers] = useState<Player[]>([]);
  const [cashedOutPlayers, setCashedOutPlayers] = useState<CashedOutPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerBuyIn, setNewPlayerBuyIn] = useState('');
  const [isAddChipOpen, setIsAddChipOpen] = useState(false);
  const [newChip, setNewChip] = useState({ name: '', value: '', color: '#ffffff' });
  const [rebuyAmount, setRebuyAmount] = useState('');
  const [playerForDetails, setPlayerForDetails] = useState<Player | null>(null);

  // Cash Out State
  const [isCashOutOpen, setIsCashOutOpen] = useState(false);
  const [playerToCashOut, setPlayerToCashOut] = useState<Player | null>(null);
  const [cashOutChipCounts, setCashOutChipCounts] = useState<Map<number, number>>(new Map());

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
    if (isNaN(buyInValue) || buyInValue <= 0) {
      toast({
        variant: 'destructive',
        title: 'Erro de Buy-in',
        description: 'O valor do buy-in deve ser um número positivo.',
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
      id: players.length > 0 ? Math.max(...players.map(p => p.id), ...cashedOutPlayers.map(p => p.id)) + 1 : 1,
      name: newPlayerName,
      transactions: [{
          id: 1,
          type: 'buy-in',
          amount: buyInValue,
          chips: chipDistribution,
      }],
    };
    
    toast({
        title: 'Jogador Adicionado!',
        description: `${newPlayer.name} entrou na mesa com R$${buyInValue.toFixed(2)}.`,
    });

    setPlayers(prevPlayers => [...prevPlayers, newPlayer]);
    setNewPlayerName('');
    setNewPlayerBuyIn('');
  }, [newPlayerName, newPlayerBuyIn, chips, players, cashedOutPlayers, toast]);

  const handleRebuyOrAddon = useCallback(() => {
    if (!playerForDetails || !rebuyAmount) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Selecione um jogador e insira um valor.' });
        return;
    }
    const amount = parseFloat(rebuyAmount);
    if(isNaN(amount) || amount <= 0) {
        toast({ variant: 'destructive', title: 'Valor Inválido', description: 'O valor deve ser um número positivo.' });
        return;
    }
    
    const newChipsDistribution = distributeChips(amount, chips);
    if(newChipsDistribution.length === 0) {
        toast({ variant: 'destructive', title: 'Erro na Distribuição', description: `Não foi possível distribuir R$${amount.toFixed(2)}.` });
        return;
    }
    
    const newTransaction: PlayerTransaction = {
        id: (playerForDetails.transactions.length > 0 ? Math.max(...playerForDetails.transactions.map(t => t.id)) : 0) + 1,
        type: 'rebuy',
        amount,
        chips: newChipsDistribution,
    }

    setPlayers(prevPlayers => prevPlayers.map(p => {
        if(p.id === playerForDetails.id) {
            return {
                ...p,
                transactions: [...p.transactions, newTransaction],
            };
        }
        return p;
    }));
    
    setPlayerForDetails(prev => prev ? { ...prev, transactions: [...prev.transactions, newTransaction] } : null);

    toast({ title: 'Transação Concluída!', description: `R$${amount.toFixed(2)} adicionado para ${playerForDetails.name}.` });
    setRebuyAmount('');
  }, [playerForDetails, rebuyAmount, chips, toast]);

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
    if(players.length > 0 || cashedOutPlayers.length > 0) {
      toast({ variant: 'destructive', title: 'Ação Bloqueada', description: 'Não é possível remover fichas com um jogo em andamento.' });
      return;
    }
    setChips(chips.filter(c => c.id !== id));
  };

  const handleResetChips = () => {
    if(players.length > 0 || cashedOutPlayers.length > 0) {
      toast({ variant: 'destructive', title: 'Ação Bloqueada', description: 'Não é possível resetar as fichas com um jogo em andamento.' });
      return;
    }
    setChips(initialChips);
    toast({ title: 'Fichas Resetadas!', description: 'As fichas foram restauradas para o padrão.' });
  }

  const totalActivePlayerBuyIn = useMemo(() => {
    return players.reduce((total, player) => 
        total + player.transactions.reduce((subTotal, trans) => subTotal + trans.amount, 0)
    , 0);
  }, [players]);

  const getPlayerTotalChips = useCallback((player: Player) => {
    const playerTotalChips = new Map<number, number>();
    player.transactions.forEach(trans => {
        trans.chips.forEach(chip => {
            playerTotalChips.set(chip.chipId, (playerTotalChips.get(chip.chipId) || 0) + chip.count);
        });
    });
    return sortedChips.map(chip => ({ chipId: chip.id, count: playerTotalChips.get(chip.id) || 0 }));
  }, [sortedChips]);

  const totalChipsOnTable = useMemo(() => {
    const totals = new Map<number, number>();
    players.forEach(player => {
        const playerChips = getPlayerTotalChips(player);
        playerChips.forEach(chip => {
            totals.set(chip.chipId, (totals.get(chip.chipId) || 0) + chip.count);
        });
    });
    return sortedChips.map(chip => ({ chip, count: totals.get(chip.id) || 0}));
  }, [players, sortedChips, getPlayerTotalChips]);
  
  const totalValueOnTableByChip = useMemo(() => {
    return totalChipsOnTable.map(({chip, count}) => chip.value * count);
  }, [totalChipsOnTable]);

  const grandTotalValueOnTable = useMemo(() => {
      return totalValueOnTableByChip.reduce((acc, value) => acc + value, 0);
  },[totalValueOnTableByChip]);

  const totalSessionBuyIn = useMemo(() => {
    const activePlayersBuyIn = players.reduce((total, player) => 
        total + player.transactions.reduce((subTotal, trans) => subTotal + trans.amount, 0)
    , 0);
    const cashedOutPlayersBuyIn = cashedOutPlayers.reduce((total, player) => total + player.totalInvested, 0);
    return activePlayersBuyIn + cashedOutPlayersBuyIn;
  }, [players, cashedOutPlayers]);
  
  // Settlement Logic
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const handlePlayerChipCountChange = (playerId: number, chipId: number, count: number) => {
    setPlayers(players.map(p => {
        if (p.id === playerId) {
            const newCounts = new Map(p.finalChipCounts);
            newCounts.set(chipId, count);
            return { ...p, finalChipCounts: newCounts };
        }
        return p;
    }));
  };

  const getPlayerSettlementData = useCallback((player: Player) => {
    const totalInvested = player.transactions.reduce((acc, t) => acc + t.amount, 0);
    const finalValue = Array.from(player.finalChipCounts || []).reduce((acc, [chipId, count]) => {
        const chip = sortedChips.find(c => c.id === chipId);
        return acc + (chip ? chip.value * count : 0);
    }, 0);
    const balance = finalValue - totalInvested;
    return { totalInvested, finalValue, balance };
  }, [sortedChips]);

  const totalSettlementValue = useMemo(() => {
    const activePlayersValue = players.reduce((total, player) => {
        return total + getPlayerSettlementData(player).finalValue;
    }, 0);
    const cashedOutPlayersValue = cashedOutPlayers.reduce((total, player) => total + player.amountReceived, 0);
    return activePlayersValue + cashedOutPlayersValue;
  }, [players, cashedOutPlayers, getPlayerSettlementData]);

  const settlementDifference = useMemo(() => {
      return totalSettlementValue - totalSessionBuyIn;
  }, [totalSettlementValue, totalSessionBuyIn]);

  const settlementChipsInPlay = useMemo(() => {
    // Total de fichas distribuídas em toda a sessão
    const totalDistributed = new Map<number, number>();
    [...players, ...cashedOutPlayers].forEach(p => {
        p.transactions.forEach(t => {
            t.chips.forEach(c => {
                totalDistributed.set(c.chipId, (totalDistributed.get(c.chipId) || 0) + c.count);
            });
        });
    });

    // Total de fichas devolvidas por jogadores que fizeram cash out
    const totalCashedOutChips = new Map<number, number>();
    cashedOutPlayers.forEach(p => {
        p.chipCounts.forEach((count, chipId) => {
            totalCashedOutChips.set(chipId, (totalCashedOutChips.get(chipId) || 0) + count);
        });
    });
    
    // Fichas restantes na mesa = Distribuídas - Devolvidas
    const remainingChips = new Map<number, number>();
    sortedChips.forEach(chip => {
        const distributed = totalDistributed.get(chip.id) || 0;
        const cashedOut = totalCashedOutChips.get(chip.id) || 0;
        remainingChips.set(chip.id, distributed - cashedOut);
    });
    
    return sortedChips.map(chip => ({ chip, count: remainingChips.get(chip.id) || 0 }));
  }, [players, cashedOutPlayers, sortedChips]);

  const handleOpenCashOut = (player: Player) => {
    setPlayerToCashOut(player);
    setCashOutChipCounts(new Map());
    setIsCashOutOpen(true);
  };

  const handleCashOutChipCountChange = (chipId: number, count: number) => {
    setCashOutChipCounts(prev => new Map(prev).set(chipId, count));
  };
  
  const cashOutValue = useMemo(() => {
    return Array.from(cashOutChipCounts.entries()).reduce((acc, [chipId, count]) => {
        const chip = sortedChips.find(c => c.id === chipId);
        return acc + (chip ? chip.value * count : 0);
    }, 0);
  }, [cashOutChipCounts, sortedChips]);

  const confirmCashOut = () => {
    if (!playerToCashOut) return;

    const totalInvested = playerToCashOut.transactions.reduce((acc, t) => acc + t.amount, 0);

    const newCashedOutPlayer: CashedOutPlayer = {
      id: playerToCashOut.id,
      name: playerToCashOut.name,
      transactions: playerToCashOut.transactions,
      cashedOutAt: new Date(),
      amountReceived: cashOutValue,
      chipCounts: cashOutChipCounts,
      totalInvested: totalInvested,
    };
    
    setCashedOutPlayers(prev => [...prev, newCashedOutPlayer]);
    setPlayers(prev => prev.filter(p => p.id !== playerToCashOut.id));

    toast({
        title: "Cash Out Realizado!",
        description: `${playerToCashOut.name} saiu da mesa com ${cashOutValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
    })

    setIsCashOutOpen(false);
    setPlayerToCashOut(null);
  };
  
  const resetGame = () => {
      setPlayers([]);
      setCashedOutPlayers([]);
      setNewPlayerName('');
      setNewPlayerBuyIn('');
      setIsSettlementOpen(false);
      toast({ title: "Jogo Reiniciado!", description: "Tudo pronto para uma nova sessão."})
  }

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

            <Dialog onOpenChange={(isOpen) => { if(!isOpen) {setPlayerForDetails(null); setRebuyAmount('')} }}>
              <Card>
                <CardHeader>
                  <CardTitle>Jogadores na Mesa</CardTitle>
                  <CardDescription>Distribuição de fichas e ações para cada jogador ativo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jogador</TableHead>
                          <TableHead className="text-right">Buy-in Total</TableHead>
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
                              colSpan={4 + sortedChips.length}
                              className="text-center text-muted-foreground h-24"
                            >
                              Nenhum jogador na mesa ainda.
                            </TableCell>
                          </TableRow>
                        ) : (
                          players.map((player) => {
                             const playerTotalBuyIn = player.transactions.reduce((acc, t) => acc + t.amount, 0);
                             const playerTotalChips = getPlayerTotalChips(player);
                             return (
                                <TableRow key={player.id}>
                                  <TableCell className="font-medium">{player.name}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {playerTotalBuyIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </TableCell>
                                  {playerTotalChips.map((chip) => (
                                      <TableCell key={chip.chipId} className="text-center font-mono">
                                      {chip.count}
                                      </TableCell>
                                  ))}
                                  <TableCell className="text-right flex items-center justify-end gap-1">
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={() => setPlayerForDetails(player)}>
                                          <FileText className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <Button variant="outline" size="sm" onClick={() => handleOpenCashOut(player)}>
                                      <LogOut className="h-4 w-4" />
                                    </Button>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-md">
                                        <DialogHeader>
                                          <DialogTitle>Remover {player.name}?</DialogTitle>
                                          <DialogDescription>
                                              Tem certeza que deseja remover este jogador? Todas as suas transações serão perdidas. Esta ação não é um cash out.
                                          </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                          <DialogClose asChild>
                                            <Button variant="outline">Cancelar</Button>
                                          </DialogClose>
                                          <Button variant="destructive" onClick={() => removePlayer(player.id)}>Sim, Remover</Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  </TableCell>
                                </TableRow>
                             )
                          })
                        )}
                      </TableBody>
                      {players.length > 0 && (
                        <UiTableFooter>
                           <TableRow className="bg-muted/50 hover:bg-muted font-bold">
                            <TableCell colSpan={2} className="text-right">
                              Total de Fichas na Mesa
                            </TableCell>
                            {totalChipsOnTable.map(({chip, count}) => (
                              <TableCell key={chip.id} className="text-center font-mono">
                                {count}
                              </TableCell>
                            ))}
                            <TableCell></TableCell>
                          </TableRow>
                          <TableRow className="bg-muted/80 hover:bg-muted font-bold">
                            <TableCell colSpan={2} className="text-right">
                              Valor Total na Mesa
                            </TableCell>
                            {totalValueOnTableByChip.map((value, index) => (
                              <TableCell key={sortedChips[index].id} className="text-center font-mono">
                                {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </TableCell>
                            ))}
                             <TableCell className="text-right font-mono">
                                {grandTotalValueOnTable.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                          </TableRow>
                        </UiTableFooter>
                      )}
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Detalhes de {playerForDetails?.name}</DialogTitle>
                  <DialogDescription>
                    Histórico de transações e contagem de fichas do jogador.
                  </DialogDescription>
                </DialogHeader>
                
                {playerForDetails && (
                  <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transação</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                {sortedChips.map((chip) => (
                                  <TableHead key={chip.id} className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <ChipIcon color={chip.color} />
                                      <span className="whitespace-nowrap">{chip.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                  </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {playerForDetails.transactions.map(trans => (
                                <TableRow key={trans.id}>
                                    <TableCell className="font-medium capitalize">{trans.type} #{trans.id}</TableCell>
                                    <TableCell className="text-right font-mono">{trans.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    {sortedChips.map(chip => {
                                        const tChip = trans.chips.find(c => c.chipId === chip.id);
                                        return <TableCell key={chip.id} className="text-center font-mono">{tChip?.count || 0}</TableCell>
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                        <UiTableFooter>
                             <TableRow className="bg-muted/50 hover:bg-muted font-bold">
                                <TableCell colSpan={2} className="text-right">Total de Fichas</TableCell>
                                {getPlayerTotalChips(playerForDetails).map((chip) => (
                                    <TableCell key={chip.chipId} className="text-center font-mono">
                                        {chip.count}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow className="bg-muted/80 hover:bg-muted font-bold">
                                <TableCell colSpan={2} className="text-right">Valor Total Investido</TableCell>
                                <TableCell colSpan={sortedChips.length + 1} className="text-left font-mono">
                                    {playerForDetails.transactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </TableCell>
                            </TableRow>
                        </UiTableFooter>
                    </Table>

                    <Separator className='my-4'/>

                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="rebuy-amount" className="text-right">Adicionar Valor (R$)</Label>
                        <Input id="rebuy-amount" type="number" placeholder="Ex: 50" value={rebuyAmount} onChange={e => setRebuyAmount(e.target.value)} className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleRebuyOrAddon}>Confirmar Adição</Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>

             {cashedOutPlayers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><History /> Histórico de Cash Outs</CardTitle>
                        <CardDescription>Jogadores que já saíram da mesa.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {cashedOutPlayers.map(p => {
                            const balance = p.amountReceived - p.totalInvested;
                            return (
                            <div key={p.id} className="p-4 rounded-md border bg-muted/30">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold">{p.name}</h4>
                                        <p className="text-sm text-muted-foreground">Saiu às {p.cashedOutAt.toLocaleTimeString('pt-BR')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg text-primary">{p.amountReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        <p className={cn("text-sm font-bold", balance >= 0 ? "text-green-400" : "text-red-400")}>
                                            Balanço: {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </p>
                                    </div>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                    {sortedChips.map(chip => {
                                        const count = p.chipCounts.get(chip.id) || 0;
                                        if (count === 0) return null;
                                        return (
                                        <div key={chip.id} className="flex items-center gap-1.5">
                                            <ChipIcon color={chip.color} className="h-4 w-4" />
                                            <span className="font-mono">{count}x</span>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        )})}
                    </CardContent>
                </Card>
            )}

          </div>

          <div className="space-y-8">
            <Card className="bg-secondary">
              <CardHeader>
                <CardTitle className="text-secondary-foreground">Banca Ativa</CardTitle>
                <CardDescription className="text-secondary-foreground/80">
                  Valor total que entrou na mesa (jogadores ativos).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-accent">
                  {totalActivePlayerBuyIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                  {sortedChips.map((chip) => (
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
                        disabled={players.length > 0 || cashedOutPlayers.length > 0}
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
                          disabled={players.length > 0 || cashedOutPlayers.length > 0}
                        />
                      </div>
                       <Button variant="ghost" size="icon" disabled={players.length > 0 || cashedOutPlayers.length > 0} onClick={() => handleRemoveChip(chip.id)}>
                          <Trash2 className="h-4 w-4 text-red-500/80" />
                        </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Dialog open={isAddChipOpen} onOpenChange={setIsAddChipOpen}>
                  <DialogTrigger asChild>
                     <Button variant="outline" className="w-full" disabled={players.length > 0 || cashedOutPlayers.length > 0}>
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
                <Button variant="ghost" className="w-full" onClick={handleResetChips} disabled={players.length > 0 || cashedOutPlayers.length > 0}>
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
                  Clique no botão abaixo para iniciar o acerto de contas.
                </p>
              </CardContent>
              <CardFooter>
                <Dialog open={isSettlementOpen} onOpenChange={setIsSettlementOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" disabled={players.length === 0}>
                      Iniciar Acerto de Contas
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] md:max-w-4xl lg:max-w-6xl h-[90vh]">
                     <DialogHeader>
                        <DialogTitle>Acerto de Contas Final</DialogTitle>
                        <DialogDescription>
                            Insira a contagem final de fichas para cada jogador. O sistema calculará automaticamente os valores a serem pagos.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="overflow-y-auto pr-4 -mr-4 h-full">

                       <div className="p-4 rounded-md bg-muted/50 border border-border mb-6">
                            <h3 className="text-lg font-bold text-foreground mb-2">Total de Fichas em Jogo (Restantes)</h3>
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                                {settlementChipsInPlay.map(({chip, count}) => (
                                    <div key={chip.id} className="flex items-center gap-2">
                                        <ChipIcon color={chip.color} />
                                        <span className="font-bold">{chip.name}:</span>
                                        <span className="font-mono text-muted-foreground">{count} fichas</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                       <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Jogador</TableHead>
                                    {sortedChips.map(chip => (
                                        <TableHead key={chip.id} className="text-center w-[100px]">
                                             <div className="flex items-center justify-center gap-2">
                                                <ChipIcon color={chip.color} />
                                                <span>{chip.value.toFixed(2)}</span>
                                             </div>
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-right">Investido (R$)</TableHead>
                                    <TableHead className="text-right font-bold text-foreground">Valor Contado (R$)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {players.map(player => {
                                    const { totalInvested, finalValue } = getPlayerSettlementData(player);
                                    return (
                                        <TableRow key={player.id}>
                                            <TableCell className="font-medium">{player.name}</TableCell>
                                            {sortedChips.map(chip => (
                                                <TableCell key={chip.id}>
                                                    <Input
                                                        type="number"
                                                        className="w-16 text-center font-mono mx-auto"
                                                        min="0"
                                                        value={player.finalChipCounts?.get(chip.id) || ''}
                                                        onChange={e => handlePlayerChipCountChange(player.id, chip.id, parseInt(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right font-mono">{totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-foreground">{finalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                        
                        <Separator className="my-6" />

                        {Math.abs(settlementDifference) < 0.01 ? (
                            <div className="p-4 rounded-md bg-green-900/50 border border-green-500">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="text-green-400" />
                                    <h3 className="text-lg font-bold text-green-300">Contas Batem!</h3>
                                </div>
                                <p className="text-green-400/80 mt-1">O valor total contado corresponde ao valor total que entrou na mesa.</p>
                                <div className="mt-4">
                                    <h4 className="font-bold mb-2 text-green-300">Pagamentos Finais:</h4>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                      <div>
                                          <p className="font-bold border-b pb-1 mb-2">Valor a Receber</p>
                                          <ul className="space-y-1 list-disc list-inside">
                                              {players.map(player => {
                                                  const { finalValue } = getPlayerSettlementData(player);
                                                  return <li key={player.id}>{player.name} recebe <span className="font-bold text-green-400">{finalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>.</li>
                                              })}
                                          </ul>
                                      </div>
                                      <div>
                                          <p className="font-bold border-b pb-1 mb-2">Lucro / Prejuízo</p>
                                           <ul className="space-y-1 list-disc list-inside">
                                              {players.map(player => {
                                                  const { balance } = getPlayerSettlementData(player);
                                                  return (
                                                    <li key={player.id}>
                                                      {player.name}: <span className={cn("font-bold", balance >= 0 ? "text-green-400" : "text-red-400")}>
                                                        {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                      </span>
                                                    </li>
                                                  )
                                              })}
                                          </ul>
                                      </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-md bg-red-900/50 border border-red-500">
                               <div className="flex items-center gap-2">
                                    <AlertCircle className="text-red-400" />
                                    <h3 className="text-lg font-bold text-red-300">Erro na Contagem!</h3>
                                </div>
                                <p className="text-red-400/80 mt-1">
                                    A soma das fichas contadas não corresponde ao total de buy-ins. Verifique a contagem de fichas de cada jogador.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <div className="flex-1 text-center md:text-right font-mono bg-muted p-2 rounded-md">
                           TOTAL ENTRADO: <span className="font-bold">{totalSessionBuyIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                           <br/>
                           TOTAL CONTADO: <span className="font-bold">{totalSettlementValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                           <br/>
                           Diferença: <span className={cn("font-bold", Math.abs(settlementDifference) >= 0.01 ? "text-destructive" : "text-green-400")}>{settlementDifference.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="destructive">Resetar e Finalizar Sessão</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Confirmar Finalização</DialogTitle>
                                    <DialogDescription>
                                        Tem certeza que deseja finalizar a sessão? Todos os jogadores e transações serão apagados permanentemente. Esta ação não pode ser desfeita.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancelar</Button>
                                    </DialogClose>
                                    <Button variant="destructive" onClick={resetGame}>Sim, Finalizar</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

       <Dialog open={isCashOutOpen} onOpenChange={setIsCashOutOpen}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Cash Out de {playerToCashOut?.name}</DialogTitle>
                    <DialogDescription>
                        Insira a contagem final de fichas do jogador para calcular o valor a receber.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     {sortedChips.map(chip => (
                        <div key={chip.id} className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor={`cashout-chip-${chip.id}`} className="text-right flex items-center justify-end gap-2">
                                <ChipIcon color={chip.color}/>
                                Fichas de {chip.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </Label>
                            <Input
                                id={`cashout-chip-${chip.id}`}
                                type="number"
                                className="col-span-2"
                                min="0"
                                placeholder="Quantidade"
                                value={cashOutChipCounts.get(chip.id) || ''}
                                onChange={e => handleCashOutChipCountChange(chip.id, parseInt(e.target.value) || 0)}
                            />
                        </div>
                     ))}
                     <Separator />
                     <div className="flex justify-between items-center text-lg font-bold">
                        <Label>Valor a Receber:</Label>
                        <span className="text-primary">{cashOutValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                     </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCashOutOpen(false)}>Cancelar</Button>
                    <Button onClick={confirmCashOut}>Confirmar Cash Out</Button>
                </DialogFooter>
            </DialogContent>
       </Dialog>
    </div>
  );
};

export default CashGameManager;

    