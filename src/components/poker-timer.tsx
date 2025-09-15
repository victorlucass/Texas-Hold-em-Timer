'use client';

import type { BlindLevel } from '@/lib/types';
import { handleTheming } from '@/lib/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Coins,
  Copy,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Trash2,
  Users,
  Wand2,
} from 'lucide-react';
import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
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

const PrizePoolSchema = z.object({
  players: z.coerce.number().min(2, 'At least 2 players required'),
  buyIn: z.coerce.number().min(1, 'Buy-in must be at least 1'),
});

const SettingsSchema = z.object({
  roundLength: z.coerce.number().min(1, 'Round length must be at least 1 minute'),
});

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
      {pending ? 'Generating...' : 'Generate Background'}
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

  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const [formState, formAction] = useFormState(handleTheming, { message: '', error: '' });

  const prizePoolForm = useForm<z.infer<typeof PrizePoolSchema>>({
    resolver: zodResolver(PrizePoolSchema),
    defaultValues: { players: 10, buyIn: 20 },
  });

  const settingsForm = useForm<z.infer<typeof SettingsSchema>>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: { roundLength },
  });

  useEffect(() => {
    setIsMounted(true);
    setTotalSeconds(roundLength * 60);
    calculatePrizePool(prizePoolForm.getValues());
  }, []);

  const calculatePrizePool = (values: z.infer<typeof PrizePoolSchema>) => {
    const { players, buyIn } = values;
    if (players >= 2 && buyIn >= 1) {
      setPrizePool(players * buyIn);
    }
  };

  prizePoolForm.watch(calculatePrizePool);

  useEffect(() => {
    if (!formState.error && !formState.message) return;
    if (formState.error) {
      toast({ variant: 'destructive', title: 'Error', description: formState.error });
    } else {
      toast({ title: 'Success', description: formState.message });
      if (formState.theme?.backgroundImage) {
        setBackgroundImage(formState.theme.backgroundImage);
      }
    }
  }, [formState, toast]);

  const levelUp = useCallback(() => {
    if (currentLevelIndex < blindSchedule.length - 1) {
      setCurrentLevelIndex((prev) => prev + 1);
      setTotalSeconds(roundLength * 60);
    } else {
      setIsTimerRunning(false); // Stop timer at the end of the schedule
      toast({ title: 'Tournament End', description: 'Final blind level reached.' });
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
  const resetTimer = () => setTotalSeconds(roundLength * 60);

  const currentBlind = blindSchedule[currentLevelIndex];
  const nextBlind = currentLevelIndex < blindSchedule.length - 1 ? blindSchedule[currentLevelIndex + 1] : null;

  const handleSettingsSave = (values: z.infer<typeof SettingsSchema>) => {
    setRoundLength(values.roundLength);
    setTotalSeconds(values.roundLength * 60);
    toast({ description: 'Settings saved!' });
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
        toast({variant: 'destructive', description: "You must have at least one blind level."});
        return;
    }
    setBlindSchedule(blindSchedule.filter((level) => level.id !== id));
  };

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
      style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none' }}
    >
      <div className="mx-auto w-full max-w-7xl backdrop-blur-sm bg-black/30 p-4 rounded-lg">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
          {/* Timer and Blinds */}
          <Card className="md:col-span-2 md:row-span-2 flex flex-col justify-between border-accent shadow-lg shadow-accent/10">
            <CardHeader>
              <CardTitle className="font-headline text-3xl text-accent">
                Level {currentLevelIndex + 1}
              </CardTitle>
              <CardDescription>
                Round ends in:
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
                  <h3 className="text-lg text-gray-400">Current Blinds</h3>
                  <p className="font-headline text-2xl md:text-4xl text-gray-200">
                    {currentBlind.smallBlind}/{currentBlind.bigBlind}
                  </p>
                  {currentBlind.ante > 0 && (
                    <p className="text-md text-gray-400">Ante: {currentBlind.ante}</p>
                  )}
                </div>
                {nextBlind && (
                  <div>
                    <h3 className="text-lg text-gray-400">Next Blinds</h3>
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
                {isTimerRunning ? 'Pause' : 'Start'}
              </Button>
              <Button onClick={resetTimer} variant="outline" size="lg" className="w-32">
                <RefreshCw className="mr-2" />
                Reset
              </Button>
            </CardFooter>
          </Card>

          {/* Prize Pool */}
          <Card className="border-primary shadow-lg shadow-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-primary">
                <Coins /> Prize Pool
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...prizePoolForm}>
                <form className="space-y-4">
                  <FormField
                    control={prizePoolForm.control}
                    name="players"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Players</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" placeholder="e.g., 10" {...field} className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={prizePoolForm.control}
                    name="buyIn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buy-in Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input type="number" placeholder="e.g., 20" {...field} className="pl-8" />
                          </div>
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
              <div className="mt-6 text-center">
                <p className="text-lg text-gray-400">Winner Takes All</p>
                <p className="font-headline text-5xl font-bold text-accent">
                  ${prizePool.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Theming Tool */}
          <Card className="border-secondary shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-gray-300">
                <Wand2 /> AI Theming
              </CardTitle>
              <CardDescription>
                Describe a theme to generate a custom background.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={formAction}>
                <Textarea
                  name="themePreferences"
                  placeholder="e.g., 'A classic, dimly lit poker room with green felt tables and whiskey glasses' or 'A futuristic, neon-lit casino on Mars'."
                  className="mb-4"
                  rows={4}
                />
                <SubmitButton />
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-4 md:mt-8 flex justify-end">
            <Sheet>
              <SheetTrigger asChild>
                  <Button variant="secondary"><Settings className="mr-2" /> Tournament Settings</Button>
              </SheetTrigger>
              <SheetContent className="w-full md:max-w-md">
                <SheetHeader>
                  <SheetTitle>Tournament Settings</SheetTitle>
                  <SheetDescription>
                    Configure the timer and blind structure for your tournament.
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
                              <FormLabel>Round Length (minutes)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      <Button type="submit">Save Settings</Button>
                    </form>
                  </Form>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Blind Schedule</h3>
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
                     <Button variant="outline" className="mt-4 w-full" onClick={addBlindLevel}>Add Level</Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
        </div>
      </div>
    </main>
  );
}
