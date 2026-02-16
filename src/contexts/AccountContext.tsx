import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type AccountType = 'demo' | 'real' | 'binance';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'bot_trade';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  date: Date;
  description: string;
  account_type: AccountType;
}

interface AccountContextType {
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  demoBalance: number;
  realBalance: number;
  binanceBalance: number;
  currentBalance: number;
  deposit: (amount: number) => Promise<void>;
  withdraw: (amount: number) => Promise<boolean>;
  resetDemo: () => Promise<void>;
  transactions: Transaction[];
  loadTransactions: () => Promise<void>;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  userEmail: string | null;
  userName: string | null;
  user: User | null;
  isLoading: boolean;
  updateBalance: (type: AccountType, amount: number, operation: 'add' | 'subtract') => Promise<boolean>;
  isBinanceConnected: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const MINIMUM_DEPOSIT = 3;

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accountType, setAccountType] = useState<AccountType>('demo');
  const [demoBalance, setDemoBalance] = useState(10000.00);
  const [realBalance, setRealBalance] = useState(0);
  const [binanceBalance, setBinanceBalance] = useState(0);
  const [isBinanceConnected, setIsBinanceConnected] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentBalance = accountType === 'demo' ? demoBalance : accountType === 'real' ? realBalance : binanceBalance;
  const isLoggedIn = !!user;
  const userEmail = user?.email || null;
  const userName = user?.user_metadata?.name || (userEmail ? userEmail.split('@')[0] : null);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
      if (error) throw error;
      if (data) {
        setDemoBalance(Number(data.demo_balance) || 10000);
        setRealBalance(Number(data.real_balance) || 0);
      }
    } catch (err) { console.error('Error loading profile:', err); }
  };

  const loadBinanceConnection = async (userId: string) => {
    try {
      const { data } = await supabase.from('binance_connections').select('*').eq('user_id', userId).maybeSingle();
      if (data?.is_connected) {
        setIsBinanceConnected(true);
        // Simulate fetching Binance balance (in production this would call the Binance API via edge function)
        setBinanceBalance(0); // Will show 0 until real API integration
      }
    } catch (err) { console.error('Error loading binance:', err); }
  };

  const loadTransactions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      if (data) {
        setTransactions(data.map(t => ({
          id: t.id, type: t.type as Transaction['type'], amount: Number(t.amount),
          currency: t.currency, status: t.status as Transaction['status'],
          date: new Date(t.created_at), description: t.description || '',
          account_type: t.account_type as AccountType,
        })));
      }
    } catch (err) { console.error('Error loading transactions:', err); }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          loadProfile(session.user.id);
          loadBinanceConnection(session.user.id);
          loadTransactions();
        }, 0);
      } else {
        setDemoBalance(10000); setRealBalance(0); setBinanceBalance(0);
        setIsBinanceConnected(false); setTransactions([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        loadBinanceConnection(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateBalance = async (type: AccountType, amount: number, operation: 'add' | 'subtract'): Promise<boolean> => {
    if (!user) return false;
    if (type === 'binance') return false; // Can't modify Binance balance

    const delta = operation === 'add' ? amount : -amount;
    try {
      const { data, error } = await supabase.rpc('adjust_profile_balance', { p_account_type: type, p_delta: delta });
      if (error) throw error;
      const newBalance = Number(data);
      if (type === 'demo') setDemoBalance(newBalance);
      else setRealBalance(newBalance);
      return true;
    } catch (err: any) {
      console.error('Error updating balance:', err?.message || err);
      return false;
    }
  };

  const deposit = async (amount: number) => {
    if (!user || amount < MINIMUM_DEPOSIT) return;
    const success = await updateBalance(accountType, amount, 'add');
    if (!success) return;
    try {
      await supabase.from('transactions').insert({ user_id: user.id, type: 'deposit', amount, currency: 'USD', status: 'completed', description: `Deposit to ${accountType} account`, account_type: accountType });
      await loadTransactions();
    } catch (err) { console.error(err); }
  };

  const withdraw = async (amount: number): Promise<boolean> => {
    if (!user || amount > currentBalance) return false;
    const success = await updateBalance(accountType, amount, 'subtract');
    if (!success) return false;
    try {
      await supabase.from('transactions').insert({ user_id: user.id, type: 'withdrawal', amount, currency: 'USD', status: 'completed', description: `Withdrawal from ${accountType} account`, account_type: accountType });
      await loadTransactions();
      return true;
    } catch (err) { console.error(err); return false; }
  };

  const resetDemo = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from('profiles').update({ demo_balance: 10000 }).eq('user_id', user.id);
      if (error) throw error;
      setDemoBalance(10000);
    } catch (err) { console.error(err); }
  };

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch { return { success: false, error: 'An unexpected error occurred' }; }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name }, emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) {
        if (error.message.includes('already registered')) return { success: false, error: 'This email is already registered.' };
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch { return { success: false, error: 'An unexpected error occurred' }; }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null); setDemoBalance(10000); setRealBalance(0);
    setBinanceBalance(0); setIsBinanceConnected(false); setTransactions([]);
  };

  return (
    <AccountContext.Provider value={{
      accountType, setAccountType, demoBalance, realBalance, binanceBalance,
      currentBalance, deposit, withdraw, resetDemo, transactions, loadTransactions,
      isLoggedIn, login, signup, logout, userEmail, userName, user, isLoading,
      updateBalance, isBinanceConnected,
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) throw new Error('useAccount must be used within an AccountProvider');
  return context;
}

export const MINIMUM_DEPOSIT_AMOUNT = MINIMUM_DEPOSIT;
