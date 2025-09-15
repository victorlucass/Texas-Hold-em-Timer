'use client';

import type { BlindLevel, Player } from '@/lib/types';
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
  DollarSign
} from 'lucide-react';
import React, { useCallback, useEffect, useState, useTransition, useActionState } from 'react';
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

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const TournamentDetailsSchema = z.object({
  buyIn: z.coerce.number().min(1, 'O Buy-in deve ser de pelo menos 1'),
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
  const [players, setPlayers] = useState<Player[]>([
    {id: 1, name: 'Jogador 1'},
    {id: 2, name: 'Jogador 2'}
  ]);
  const [buyIn, setBuyIn] = useState(20);
  const [winner, setWinner] = useState<Player | null>(null);
  const [transactionHistory, setTransactionHistory] = useState<string[]>([]);

  const [coachAnswer, setCoachAnswer] = useState('');
  const [isPending, startTransition] = useTransition();

  const [formState, formAction] = useActionState(handlePokerCoach, { message: '', error: '' });

  const settingsForm = useForm<z.infer<typeof SettingsSchema>>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: { roundLength },
  });
  
  const tournamentDetailsForm = useForm<z.infer<typeof TournamentDetailsSchema>>({
    resolver: zodResolver(TournamentDetailsSchema),
    defaultValues: { buyIn: 20 },
  });

  useEffect(() => {
    setIsMounted(true);
    setTotalSeconds(roundLength * 60);
    calculatePrizePool(players.length, buyIn);
  }, []);
  
  const calculatePrizePool = (numPlayers: number, buyInAmount: number) => {
    if (numPlayers >= 2 && buyInAmount >= 1) {
      setPrizePool(numPlayers * buyInAmount);
    } else {
      setPrizePool(0);
    }
  };

  useEffect(() => {
    calculatePrizePool(players.length, buyIn);
  }, [players, buyIn]);


  useEffect(() => {
    if (!formState.error && !formState.message) return;
    if (formState.error) {
      toast({ variant: 'destructive', title: 'Erro', description: formState.error });
    } else if (formState.answer) {
        setCoachAnswer(formState.answer);
    }
  }, [formState, toast]);

  const levelUp = useCallback(() => {
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
        name: `Jogador ${players.length + 1}`
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
  
  const handleDeclareWinner = () => {
    if (winner) {
      const losers = players.filter(p => p.id !== winner.id);
      const transaction = `${losers.map(p => p.name).join(', ')} transferem R$${buyIn.toLocaleString()} cada para ${winner.name}.`;
      setTransactionHistory([transaction, ...transactionHistory]);
      toast({ title: 'Transação registrada!', description: transaction });
    }
  }

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
      className="min-h-screen w-full bg-background bg-cover bg-center bg-no-repeat p-4 md:p-8 transition-all duration-500"
    >
      <div className="mx-auto w-full max-w-7xl backdrop-blur-sm bg-black/30 p-4 rounded-lg">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
          {/* Timer e Blinds */}
          <Card className="md:col-span-2 md:row-span-2 flex flex-col justify-between border-accent shadow-lg shadow-accent/10">
            <CardHeader>
              <CardTitle className="font-headline text-3xl text-accent">
                Nível {currentLevelIndex + 1}
              </CardTitle>
              <CardDescription>
                A rodada termina em:
              </CardDescription>
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
              <div className="mt-8 flex w-full justify-around text-center">
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
              <Button onClick={toggleTimer} variant="default" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 w-32">
                {isTimerRunning ? <Pause className="mr-2" /> : <Play className="mr-2" />}
                {isTimerRunning ? 'Pausar' : 'Iniciar'}
              </Button>
              <Button onClick={resetTimer} variant="outline" size="lg" className="w-32">
                <RefreshCw className="mr-2" />
                Reiniciar
              </Button>
            </CardFooter>
          </Card>

          {/* Prize Pool e Jogadores */}
          <Card className="border-primary shadow-lg shadow-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-primary">
                <Coins /> Premiação Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...tournamentDetailsForm}>
                <form className="space-y-4">
                   <FormField
                      control={tournamentDetailsForm.control}
                      name="buyIn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor do Buy-in</FormLabel>
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
                </form>
              </Form>
               <div className="space-y-4 mt-4">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium">Jogadores ({players.length})</label>
                            <Button size="sm" variant="ghost" onClick={addPlayer}><PlusCircle className="mr-2"/> Adicionar</Button>
                        </div>
                         <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                            {players.map(player => (
                                <div key={player.id} className="flex items-center gap-2">
                                    <Input value={player.name} onChange={(e) => updatePlayerName(player.id, e.target.value)} className="flex-grow"/>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => removePlayer(player.id)}>
                                        <XCircle className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
               </div>
              <div className="mt-6 text-center">
                <p className="text-lg text-gray-400">O Vencedor Leva</p>
                <p className="font-headline text-5xl font-bold text-accent">
                  R$ {prizePool.toLocaleString('pt-BR')}
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full mt-4" disabled={players.length < 2}>
                    <DollarSign className="mr-2"/> Declarar Vencedor e Pagamentos
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Declarar Vencedor</DialogTitle>
                    <DialogDescription>
                      Selecione o vencedor para registrar a transação de pagamento.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-2 my-4">
                    {players.map(p => (
                      <Button key={p.id} variant={winner?.id === p.id ? 'default' : 'outline'} onClick={() => setWinner(p)}>
                        {p.name}
                      </Button>
                    ))}
                  </div>
                  {winner && (
                    <div className="text-center p-2 bg-muted rounded-md">
                        <p>Os outros jogadores devem pagar R${buyIn.toLocaleString('pt-BR')} para <strong>{winner.name}</strong>.</p>
                    </div>
                  )}
                  <DialogFooter>
                    <Button onClick={handleDeclareWinner} disabled={!winner}>Confirmar e Registrar</Button>
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
        
        <div className="mt-4 md:mt-8 flex justify-between items-center">
            {transactionHistory.length > 0 && (
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline"><History className="mr-2"/> Histórico de Pagamentos</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Histórico de Pagamentos</DialogTitle>
                        </DialogHeader>
                        <ul className="space-y-2 max-h-64 overflow-y-auto">
                           {transactionHistory.map((t, i) => <li key={i} className="text-sm p-2 bg-muted rounded-md">{t}</li>)}
                        </ul>
                    </DialogContent>
                </Dialog>
            )}
            <div className="flex-grow"></div>
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
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Estrutura de Blinds</h3>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
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
      </div>
    </main>
  );
}
