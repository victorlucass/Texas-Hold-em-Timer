'use client';

import type { BlindLevel, Player, RoundWinner } from '@/lib/types';
import { handlePokerCoach } from '@/lib/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Coins,
  Copy,
  MessageCircleQuestion,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Trash2,
  Users,
  Wand2,
  PlusCircle,
  XCircle,
  History,
  DollarSign,
  Trophy,
  Calculator,
  Maximize,
  Minimize,
  Sparkles
} from 'lucide-react';
import React, { useCallback, useEffect, useState, useTransition, useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

const initialBlindSchedule: BlindLevel[] = [
  { id: 1, smallBlind: 25, bigBlind: 50, ante: 0 },
  { id: 2, smallBlind: 50, bigBlind: 100, ante: 0 },
  { id: 3, smallBlind: 75, bigBlind: 150, ante: 0 },
  { id: 4, smallBlind: 100, bigBlind: 200, ante: 25 },
  { id: 5, smallBlind: 150, bigBlind: 300, ante: 50 },
  { id: 6, smallBlind: 200, bigBlind: 400, ante: 50 },
  { id: 7, smallBlind: 300, bigBlind: 600, ante: 75 },
  { id: 8, smallBlind: 500, bigBlind: 1000, ante: 100 },
];

const initialPlayers: Player[] = [
    {id: 1, name: 'Jogador 1', balance: 0, rebuys: 0, addons: 0},
    {id: 2, name: 'Jogador 2', balance: 0, rebuys: 0, addons: 0}
];


const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const TournamentDetailsSchema = z.object({
  buyIn: z.coerce.number().min(0, 'O Buy-in deve ser de pelo menos 0'),
  rebuyValue: z.coerce.number().min(0, 'O Rebuy deve ser de pelo menos 0'),
  addonValue: z.coerce.number().min(0, 'O Add-on deve ser de pelo menos 0'),
});

const SettingsSchema = z.object({
  roundLength: z.coerce.number().min(1, 'A duração da rodada deve ser de pelo menos 1 minuto'),
});

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
      {pending ? 'Pensando...' : 'Perguntar à IA'}
      <Wand2 className="ml-2 h-4 w-4" />
    </Button>
  );
}

export default function PokerTimer() {
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [roundLength, setRoundLength] = useState(15); // in minutes
  const [blindSchedule, setBlindSchedule] = useState<BlindLevel[]>(initialBlindSchedule);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(roundLength * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [prizePool, setPrizePool] = useState(0);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [buyIn, setBuyIn] = useState(20);
  const [rebuyValue, setRebuyValue] = useState(20);
  const [addonValue, setAddonValue] = useState(20);
  const [winner1, setWinner1] = useState<Player | null>(null);
  const [winner2, setWinner2] = useState<Player | null>(null);
  const [roundHistory, setRoundHistory] = useState<RoundWinner[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [coachAnswer, setCoachAnswer] = useState('');
  const [isPending, startTransition] = useTransition();

  const [formState, formAction] = useActionState(handlePokerCoach, { message: '', error: '' });

  // Prize split state
  const [splitPrize, setSplitPrize] = useState(true);
  const [firstPlacePercent, setFirstPlacePercent] = useState(60);
  const [secondPlacePercent, setSecondPlacePercent] = useState(40);

  const settingsForm = useForm<z.infer<typeof SettingsSchema>>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: { roundLength },
  });
  
  const tournamentDetailsForm = useForm<z.infer<typeof TournamentDetailsSchema>>({
    resolver: zodResolver(TournamentDetailsSchema),
    defaultValues: { buyIn: 20, rebuyValue: 20, addonValue: 20 },
  });

  useEffect(() => {
    setIsMounted(true);
    setTotalSeconds(roundLength * 60);
  }, [roundLength]);
  
  const calculatePrizePool = useCallback(() => {
    const totalRebuysValue = players.reduce((acc, player) => acc + player.rebuys, 0);
    const totalAddonsValue = players.reduce((acc, player) => acc + player.addons, 0);
    const pool = (players.length * buyIn) + totalRebuysValue + totalAddonsValue;
    setPrizePool(pool);
  }, [players, buyIn]);


  useEffect(() => {
    calculatePrizePool();
  }, [players, buyIn, calculatePrizePool]);


  useEffect(() => {
    if (!formState.error && !formState.message) return;
    if (formState.error) {
      toast({ variant: 'destructive', title: 'Erro', description: formState.error });
    } else if (formState.answer) {
        setCoachAnswer(formState.answer);
    }
  }, [formState, toast]);

  const playLevelUpSound = () => {
    if (audioPlayerRef.current) {
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current.play().catch(error => {
            console.error("Erro ao tocar o áudio:", error);
        });
    }
  };

  const levelUp = useCallback(() => {
    playLevelUpSound();
    if (currentLevelIndex < blindSchedule.length - 1) {
      setCurrentLevelIndex((prev) => prev + 1);
      setTotalSeconds(roundLength * 60);
    } else {
      setIsTimerRunning(false);
      toast({ title: 'Fim do Torneio', description: 'Último nível de blind alcançado.' });
    }
  }, [currentLevelIndex, blindSchedule.length, roundLength, toast]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && totalSeconds > 0) {
      interval = setInterval(() => {
        setTotalSeconds((prev) => prev - 1);
      }, 1000);
    } else if (isTimerRunning && totalSeconds === 0) {
      levelUp();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, totalSeconds, levelUp]);

  const toggleTimer = () => setIsTimerRunning((prev) => !prev);
  const resetTimer = () => {
    setTotalSeconds(roundLength * 60);
    setCurrentLevelIndex(0);
    setIsTimerRunning(false);
  }

  const currentBlind = blindSchedule[currentLevelIndex];
  const nextBlind = currentLevelIndex < blindSchedule.length - 1 ? blindSchedule[currentLevelIndex + 1] : null;

  const handleSettingsSave = (values: z.infer<typeof SettingsSchema>) => {
    setRoundLength(values.roundLength);
    setTotalSeconds(values.roundLength * 60);
    toast({ description: 'Configurações salvas!' });
  };
  
  const addBlindLevel = () => {
    const lastLevel = blindSchedule[blindSchedule.length - 1] || { id: 0, smallBlind: 0, bigBlind: 0, ante: 0 };
    setBlindSchedule([
      ...blindSchedule,
      {
        id: lastLevel.id + 1,
        smallBlind: lastLevel.bigBlind,
        bigBlind: lastLevel.bigBlind * 2,
        ante: lastLevel.ante > 0 ? Math.floor(lastLevel.ante * 1.5) : 0,
      },
    ]);
  };

  const updateBlindLevel = (id: number, field: keyof Omit<BlindLevel, 'id'>, value: number) => {
    setBlindSchedule(
      blindSchedule.map((level) => (level.id === id ? { ...level, [field]: value } : level))
    );
  };

  const removeBlindLevel = (id: number) => {
    if (blindSchedule.length <= 1) {
        toast({variant: 'destructive', description: "Você deve ter pelo menos um nível de blind."});
        return;
    }
    setBlindSchedule(blindSchedule.filter((level) => level.id !== id));
  };

  const addPlayer = () => {
    const newPlayer: Player = {
        id: (players.length > 0 ? Math.max(...players.map(p => p.id)) : 0) + 1,
        name: `Jogador ${players.length + 1}`,
        balance: 0,
        rebuys: 0,
        addons: 0,
    };
    setPlayers([...players, newPlayer]);
  };

  const updatePlayerName = (id: number, name: string) => {
    setPlayers(players.map(p => p.id === id ? {...p, name} : p));
  };

  const removePlayer = (id: number) => {
    if (players.length <= 2) {
        toast({variant: 'destructive', description: "O torneio precisa de pelo menos 2 jogadores."});
        return;
    }
    setPlayers(players.filter(p => p.id !== id));
  }

  const handleRebuy = (playerId: number, count: number) => {
    setPlayers(
      players.map((p) => {
        if (p.id === playerId) {
          const rebuyAmount = rebuyValue * count;
          return { ...p, rebuys: p.rebuys + rebuyAmount };
        }
        return p;
      })
    );
    const playerName = players.find((p) => p.id === playerId)?.name;
    const rebuyText = count === 1 ? 'Rebuy' : 'Rebuy Duplo';
    toast({ description: `${rebuyText} adicionado para ${playerName}.` });
  };

  const handleAddon = (playerId: number) => {
    setPlayers(
      players.map((p) => {
        if (p.id === playerId) {
          return { ...p, addons: p.addons + addonValue };
        }
        return p;
      })
    );
    const playerName = players.find((p) => p.id === playerId)?.name;
    toast({ description: `Add-on adicionado para ${playerName}.` });
  };
  
  const handleDeclareWinner = () => {
    const roundNumber = roundHistory.length + 1;
    let newRoundHistory = [...roundHistory];
    let toastDescription = '';

    const newPlayers = players.map(p => {
        let newBalance = p.balance;
        // Subtract buy-in for this round
        newBalance -= buyIn;
        // Subtract rebuys and addons made in this round
        newBalance -= p.rebuys;
        newBalance -= p.addons;

        if (splitPrize && winner1 && winner2) {
            const prize1 = prizePool * (firstPlacePercent / 100);
            const prize2 = prizePool * (secondPlacePercent / 100);
            if (p.id === winner1.id) newBalance += prize1;
            if (p.id === winner2.id) newBalance += prize2;
        } else if (!splitPrize && winner1) {
            if (p.id === winner1.id) newBalance += prizePool;
        }

        // Reset rebuys and addons for the next round and update balance
        return { ...p, balance: newBalance, rebuys: 0, addons: 0 };
    });

    if (splitPrize && winner1 && winner2) {
        const prize1 = prizePool * (firstPlacePercent / 100);
        const prize2 = prizePool * (secondPlacePercent / 100);
        newRoundHistory.push({ round: roundNumber, winnerName: `1º: ${winner1.name}, 2º: ${winner2.name}` });
        toastDescription = `${winner1.name} (1º) ganhou R$${prize1.toLocaleString('pt-BR')} e ${winner2.name} (2º) ganhou R$${prize2.toLocaleString('pt-BR')}.`;
    } else if (!splitPrize && winner1) {
        newRoundHistory.push({ round: roundNumber, winnerName: winner1.name });
        toastDescription = `${winner1.name} venceu R$${prizePool.toLocaleString('pt-BR')}!`;
    } else {
        toast({variant: 'destructive', description: "Selecione o(s) vencedor(es) para continuar."});
        return;
    }

    setPlayers(newPlayers);
    setRoundHistory(newRoundHistory);
    toast({ title: `Rodada ${roundNumber} Finalizada`, description: toastDescription });
    
    // Reset winners
    setWinner1(null);
    setWinner2(null);
  };

  const finishTournament = () => {
    resetTimer();
    setBlindSchedule(initialBlindSchedule);
    setPlayers(initialPlayers);
    setBuyIn(20);
    setRebuyValue(20);
    setAddonValue(20);
    tournamentDetailsForm.reset({ buyIn: 20, rebuyValue: 20, addonValue: 20 });
    setRoundHistory([]);
    setWinner1(null);
    setWinner2(null);
    toast({ title: 'Torneio Finalizado!', description: 'Todos os dados foram reiniciados.' });
  }

  const getSettlement = () => {
    const playersWithFinalBalance = players.map(p => ({
        ...p,
        finalBalance: p.balance,
    }))

    const debtors = playersWithFinalBalance.filter(p => p.finalBalance < 0).map(p => ({...p})).sort((a, b) => a.finalBalance - b.finalBalance);
    const creditors = playersWithFinalBalance.filter(p => p.finalBalance > 0).map(p => ({...p})).sort((a, b) => b.finalBalance - a.finalBalance);
    const transactions = [];

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(-debtor.finalBalance, creditor.finalBalance);
      
      transactions.push(`${debtor.name} deve pagar R$${amount.toFixed(2).replace('.',',')} para ${creditor.name}.`);
      
      debtor.finalBalance += amount;
      creditor.finalBalance -= amount;
      
      if (Math.abs(debtor.finalBalance) < 0.01) i++;
      if (Math.abs(creditor.finalBalance) < 0.01) j++;
    }
    return transactions;
  }
  
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  if (!isMounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4 md:p-8">
        <div className="grid w-full max-w-7xl gap-4 md:grid-cols-3">
          <Skeleton className="h-96 md:col-span-2 md:row-span-2" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <main
      className={cn(
        'min-h-screen w-full bg-background p-4 md:p-8',
        isFullscreen && 'p-0'
      )}
    >
      <audio ref={audioPlayerRef} preload="auto">
        <source src="/level-up.mp3" type="audio/mpeg" />
        Seu navegador não suporta o elemento de áudio.
      </audio>
      <div
        className={cn(
          'mx-auto w-full max-w-7xl backdrop-blur-sm bg-black/30 p-4 rounded-lg',
          isFullscreen && 'max-w-full h-screen p-0 rounded-none backdrop-blur-none bg-background flex flex-col items-center justify-center'
        )}
      >
        {isFullscreen ? (
          <div className="w-full h-full flex items-center justify-center">
            <Card className="flex flex-col justify-between border-accent w-full max-w-5xl border-0 rounded-none shadow-none bg-transparent">
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="font-headline text-3xl text-accent">
                    Nível {currentLevelIndex + 1}
                  </CardTitle>
                  <CardDescription>A rodada termina em:</CardDescription>
                </div>
                <Button onClick={toggleFullscreen} variant="ghost" size="icon">
                  <Minimize />
                  <span className="sr-only">Sair da Tela Cheia</span>
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center flex-grow">
                <div
                  className={cn(
                    'font-headline text-8xl md:text-9xl font-bold text-gray-100 transition-colors duration-500',
                    totalSeconds <= 10 && totalSeconds > 0 && 'text-primary'
                  )}
                >
                  {formatTime(totalSeconds)}
                </div>
                <div className="mt-8 flex w-full flex-col md:flex-row items-center justify-around text-center gap-8 md:gap-0">
                  <div>
                    <h3 className="text-lg text-gray-400">Blinds Atuais</h3>
                    <p className="font-headline text-2xl md:text-4xl text-gray-200">
                      {currentBlind.smallBlind}/{currentBlind.bigBlind}
                    </p>
                    {currentBlind.ante > 0 && (
                      <p className="text-md text-gray-400">Ante: {currentBlind.ante}</p>
                    )}
                  </div>
                  {nextBlind && (
                    <div>
                      <h3 className="text-lg text-gray-400">Próximos Blinds</h3>
                      <p className="font-headline text-2xl md:text-4xl text-gray-200">
                        {nextBlind.smallBlind}/{nextBlind.bigBlind}
                      </p>
                      {nextBlind.ante > 0 && (
                        <p className="text-md text-gray-400">Ante: {nextBlind.ante}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-center gap-4">
                <Button
                  onClick={toggleTimer}
                  variant="default"
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 w-32"
                >
                  {isTimerRunning ? <Pause className="mr-2" /> : <Play className="mr-2" />}
                  {isTimerRunning ? 'Pausar' : 'Iniciar'}
                </Button>
                <Button onClick={resetTimer} variant="outline" size="lg" className="w-32">
                  <RefreshCw className="mr-2" />
                  Reiniciar
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
              {/* Timer e Blinds */}
              <div className="md:col-span-2 md:row-span-2">
                <Card className="flex flex-col justify-between border-accent shadow-lg shadow-accent/10 w-full h-full">
                  <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                      <CardTitle className="font-headline text-3xl text-accent">
                        Nível {currentLevelIndex + 1}
                      </CardTitle>
                      <CardDescription>A rodada termina em:</CardDescription>
                    </div>
                    <Button onClick={toggleFullscreen} variant="ghost" size="icon">
                      <Maximize />
                      <span className="sr-only">Tela Cheia</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center flex-grow">
                    <div
                      className={cn(
                        'font-headline text-8xl md:text-9xl font-bold text-gray-100 transition-colors duration-500',
                        totalSeconds <= 10 && totalSeconds > 0 && 'text-primary'
                      )}
                    >
                      {formatTime(totalSeconds)}
                    </div>
                    <div className="mt-8 flex w-full flex-col md:flex-row items-center justify-around text-center gap-8 md:gap-0">
                      <div>
                        <h3 className="text-lg text-gray-400">Blinds Atuais</h3>
                        <p className="font-headline text-2xl md:text-4xl text-gray-200">
                          {currentBlind.smallBlind}/{currentBlind.bigBlind}
                        </p>
                        {currentBlind.ante > 0 && (
                          <p className="text-md text-gray-400">Ante: {currentBlind.ante}</p>
                        )}
                      </div>
                      {nextBlind && (
                        <div>
                          <h3 className="text-lg text-gray-400">Próximos Blinds</h3>
                          <p className="font-headline text-2xl md:text-4xl text-gray-200">
                            {nextBlind.smallBlind}/{nextBlind.bigBlind}
                          </p>
                          {nextBlind.ante > 0 && (
                            <p className="text-md text-gray-400">Ante: {nextBlind.ante}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-center gap-4">
                    <Button
                      onClick={toggleTimer}
                      variant="default"
                      size="lg"
                      className="bg-accent text-accent-foreground hover:bg-accent/90 w-32"
                    >
                      {isTimerRunning ? <Pause className="mr-2" /> : <Play className="mr-2" />}
                      {isTimerRunning ? 'Pausar' : 'Iniciar'}
                    </Button>
                    <Button onClick={resetTimer} variant="outline" size="lg" className="w-32">
                      <RefreshCw className="mr-2" />
                      Reiniciar
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Prize Pool e Jogadores */}
              <Card className="border-primary shadow-lg shadow-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline text-primary">
                    <Coins /> Gerenciamento do Jogo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...tournamentDetailsForm}>
                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={tournamentDetailsForm.control}
                            name="buyIn"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Buy-in</FormLabel>
                                <FormControl>
                                  <div className="relative mt-1">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                                      <Input 
                                          type="number" 
                                          {...field}
                                          onChange={e => {
                                              const value = parseInt(e.target.value) || 0;
                                              field.onChange(value);
                                              setBuyIn(value);
                                          }}
                                          placeholder="ex: 20" 
                                          className="pl-10" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                              control={tournamentDetailsForm.control}
                              name="rebuyValue"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Rebuy</FormLabel>
                                  <FormControl>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                                        <Input 
                                            type="number" 
                                            {...field}
                                            onChange={e => {
                                                const value = parseInt(e.target.value) || 0;
                                                field.onChange(value);
                                                setRebuyValue(value);
                                            }}
                                            placeholder="ex: 20" 
                                            className="pl-10" />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={tournamentDetailsForm.control}
                              name="addonValue"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Add-on</FormLabel>
                                  <FormControl>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                                        <Input 
                                            type="number" 
                                            {...field}
                                            onChange={e => {
                                                const value = parseInt(e.target.value) || 0;
                                                field.onChange(value);
                                                setAddonValue(value);
                                            }}
                                            placeholder="ex: 20" 
                                            className="pl-10" />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </div>
                        <div className="space-y-4 mt-4">
                            <FormItem>
                                <div className="flex justify-between items-center mb-2">
                                    <FormLabel>Jogadores ({players.length})</FormLabel>
                                    <Button size="sm" variant="ghost" onClick={addPlayer}><PlusCircle className="mr-2"/> Adicionar</Button>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {players.map(player => (
                                        <div key={player.id} className="flex flex-col gap-2 p-2 border rounded-md">
                                            <div className="flex items-center gap-2">
                                              <FormControl>
                                                  <Input value={player.name} onChange={(e) => updatePlayerName(player.id, e.target.value)} className="flex-grow"/>
                                              </FormControl>
                                              <Button variant="ghost" size="icon" className="text-muted-foreground shrink-0" onClick={() => removePlayer(player.id)}>
                                                  <XCircle className="h-4 w-4"/>
                                              </Button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleRebuy(player.id, 1)}>Rebuy (R${rebuyValue})</Button>
                                                <Button variant="outline" size="sm" onClick={() => handleRebuy(player.id, 2)}>Rebuy Duplo</Button>
                                                <Button variant="outline" size="sm" onClick={() => handleAddon(player.id)}>Add-on (R${addonValue})</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </FormItem>
                       </div>
                    </form>
                  </Form>
                  <Separator className="my-6"/>
                  <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="split-prize-switch">Dividir Prêmio?</Label>
                                <Switch id="split-prize-switch" checked={splitPrize} onCheckedChange={setSplitPrize} />
                            </div>
                            {splitPrize && (
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-2">
                                        <Label>1º Lugar (%)</Label>
                                        <Input type="number" value={firstPlacePercent} onChange={e => setFirstPlacePercent(Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>2º Lugar (%)</Label>
                                        <Input type="number" value={secondPlacePercent} onChange={e => setSecondPlacePercent(Number(e.target.value))} />
                                    </div>
                                </div>
                            )}
                        </div>
                  </div>
                  <div className="mt-6 text-center">
                    <p className="text-lg text-gray-400">Prêmio da Rodada</p>
                    <p className="font-headline text-5xl font-bold text-accent">
                      R$ {prizePool.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full mt-4" disabled={players.length < 2}>
                        <Trophy className="mr-2"/> Declarar Vencedor da Rodada
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Vencedor(es) da Rodada</DialogTitle>
                        <DialogDescription>
                            {splitPrize ? 'Selecione o primeiro e o segundo lugar.' : 'Selecione o vencedor desta rodada.'}
                        </DialogDescription>
                      </DialogHeader>
                        {splitPrize ? (
                            <div className="space-y-4 my-4">
                                <div>
                                    <Label>1º Lugar</Label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {players.filter(p => p.id !== winner2?.id).map(p => (
                                            <Button key={p.id} variant={winner1?.id === p.id ? 'default' : 'outline'} onClick={() => setWinner1(p)}>
                                                {p.name}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label>2º Lugar</Label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {players.filter(p => p.id !== winner1?.id).map(p => (
                                            <Button key={p.id} variant={winner2?.id === p.id ? 'default' : 'outline'} onClick={() => setWinner2(p)}>
                                                {p.name}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 my-4">
                                {players.map(p => (
                                <Button key={p.id} variant={winner1?.id === p.id ? 'default' : 'outline'} onClick={() => setWinner1(p)}>
                                    {p.name}
                                </Button>
                                ))}
                            </div>
                        )}
                      {winner1 && (
                        <div className="text-center p-2 bg-muted rounded-md">
                            {splitPrize && winner2 ? (
                                <p><strong>{winner1.name}</strong> (1º) e <strong>{winner2.name}</strong> (2º) selecionados.</p>
                            ) : (
                                <p><strong>{winner1.name}</strong> receberá R${prizePool.toLocaleString('pt-BR')}.</p>
                            )}
                        </div>
                      )}
                      <DialogFooter>
                        <Button onClick={handleDeclareWinner} disabled={!winner1 || (splitPrize && !winner2)}>Confirmar Vencedor(es)</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* AI Poker Coach */}
              <Card className="border-secondary shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline text-gray-300">
                    <MessageCircleQuestion /> AI Poker Coach
                  </CardTitle>
                  <CardDescription>
                    Tem alguma dúvida sobre poker? Pergunte ao nosso especialista de IA.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={(formData) => {
                    setCoachAnswer('');
                    formAction(formData);
                  }}>
                    <Textarea
                      name="question"
                      placeholder="Ex: 'O que é um 'straddle'?' ou 'Qual a ordem de força das mãos no poker?'"
                      className="mb-4"
                      rows={4}
                    />
                    <SubmitButton />
                  </form>
                  {isPending && <p className="mt-4 text-sm text-muted-foreground">Aguardando resposta da IA...</p>}
                  {coachAnswer && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm">{coachAnswer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-4 md:mt-8 flex justify-between items-center flex-wrap gap-2">
                <div className="flex gap-2">
                    {roundHistory.length > 0 && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline"><History className="mr-2"/> Histórico</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Histórico de Vencedores</DialogTitle>
                                </DialogHeader>
                                <ul className="space-y-2 my-4">
                                  {roundHistory.map((r, i) => (
                                    <li key={i} className="flex justify-between p-2 bg-muted rounded-md">
                                      <span>Rodada {r.round}</span>
                                      <span className="font-bold">{r.winnerName}</span>
                                    </li>
                                  ))}
                                </ul>
                            </DialogContent>
                        </Dialog>
                    )}
                    {players.some(p => p.balance !== 0) && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="destructive"><Calculator className="mr-2"/> Encerrar e Acertar Contas</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Resumo Financeiro do Torneio</DialogTitle>
                                    <DialogDescription>
                                        Abaixo está o balanço final e as transferências necessárias para acertar as contas.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 my-4">
                                    <div>
                                        <h3 className="font-bold mb-2">Balanço Final:</h3>
                                        <ul className="space-y-1">
                                            {players.map(p => (
                                                <li key={p.id} className={cn("flex justify-between p-2 rounded", p.balance >= 0 ? 'bg-green-900/50' : 'bg-red-900/50')}>
                                                    <span>{p.name}</span>
                                                    <span className="font-mono">R$ {p.balance.toLocaleString('pt-BR')}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <h3 className="font-bold mb-2">Transferências Sugeridas:</h3>
                                        <ul className="space-y-2">
                                            {getSettlement().map((t, i) => (
                                                <li key={i} className="text-sm p-2 bg-muted rounded-md">{t}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={finishTournament} variant="destructive">Finalizar e Reiniciar Torneio</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                <Sheet>
                  <SheetTrigger asChild>
                      <Button variant="secondary"><Settings className="mr-2" /> Configurações do Torneio</Button>
                  </SheetTrigger>
                  <SheetContent className="w-full md:max-w-md">
                    <SheetHeader>
                      <SheetTitle>Configurações do Torneio</SheetTitle>
                      <SheetDescription>
                        Configure o timer e a estrutura de blinds para o seu torneio.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-4 space-y-8">
                      <Form {...settingsForm}>
                        <form onSubmit={settingsForm.handleSubmit(handleSettingsSave)} className="space-y-4">
                          <FormField
                              control={settingsForm.control}
                              name="roundLength"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Duração da Rodada (minutos)</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          <Button type="submit">Salvar Configurações</Button>
                        </form>
                      </Form>
                      <Separator/>
                      <div>
                        <h3 className="text-lg font-medium mb-2">Estrutura de Blinds Manual</h3>
                        <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2">
                            {blindSchedule.map((level, index) => (
                              <div key={level.id} className="grid grid-cols-12 gap-2 items-center">
                                  <span className="col-span-1">{index + 1}.</span>
                                  <Input className="col-span-3" type="number" value={level.smallBlind} onChange={(e) => updateBlindLevel(level.id, 'smallBlind', parseInt(e.target.value) || 0)} placeholder="SB" />
                                  <Input className="col-span-3" type="number" value={level.bigBlind} onChange={(e) => updateBlindLevel(level.id, 'bigBlind', parseInt(e.target.value) || 0)} placeholder="BB" />
                                  <Input className="col-span-3" type="number" value={level.ante} onChange={(e) => updateBlindLevel(level.id, 'ante', parseInt(e.target.value) || 0)} placeholder="Ante" />
                                  <Button variant="ghost" size="icon" className="col-span-1 text-muted-foreground" onClick={() => removeBlindLevel(level.id)}>
                                      <Trash2 className="h-4 w-4"/>
                                  </Button>
                              </div>
                            ))}
                        </div>
                         <Button variant="outline" className="mt-4 w-full" onClick={addBlindLevel}>Adicionar Nível</Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
