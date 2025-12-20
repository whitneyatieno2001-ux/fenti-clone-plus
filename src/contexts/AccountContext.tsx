import React, { createContext, useContext, useState, ReactNode } from 'react';

type AccountType = 'demo' | 'real';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  date: Date;
  description: string;
}

interface AccountContextType {
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  demoBalance: number;
  realBalance: number;
  currentBalance: number;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => boolean;
  transactions: Transaction[];
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  userEmail: string | null;
  userName: string | null;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accountType, setAccountType] = useState<AccountType>('demo');
  const [demoBalance, setDemoBalance] = useState(10350.00);
  const [realBalance, setRealBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const currentBalance = accountType === 'demo' ? demoBalance : realBalance;

  const deposit = (amount: number) => {
    if (accountType === 'demo') {
      setDemoBalance(prev => prev + amount);
    } else {
      setRealBalance(prev => prev + amount);
    }
    
    const transaction: Transaction = {
      id: Date.now().toString(),
      type: 'deposit',
      amount,
      currency: 'USD',
      status: 'completed',
      date: new Date(),
      description: `Deposit to ${accountType} account`,
    };
    setTransactions(prev => [transaction, ...prev]);
  };

  const withdraw = (amount: number): boolean => {
    if (amount > currentBalance) return false;
    
    if (accountType === 'demo') {
      setDemoBalance(prev => prev - amount);
    } else {
      setRealBalance(prev => prev - amount);
    }
    
    const transaction: Transaction = {
      id: Date.now().toString(),
      type: 'withdrawal',
      amount,
      currency: 'USD',
      status: 'completed',
      date: new Date(),
      description: `Withdrawal from ${accountType} account`,
    };
    setTransactions(prev => [transaction, ...prev]);
    return true;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (email && password.length >= 6) {
      setIsLoggedIn(true);
      setUserEmail(email);
      setUserName(email.split('@')[0]);
      return true;
    }
    return false;
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (email && password.length >= 6 && name) {
      setIsLoggedIn(true);
      setUserEmail(email);
      setUserName(name);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUserEmail(null);
    setUserName(null);
  };

  return (
    <AccountContext.Provider value={{
      accountType,
      setAccountType,
      demoBalance,
      realBalance,
      currentBalance,
      deposit,
      withdraw,
      transactions,
      isLoggedIn,
      login,
      signup,
      logout,
      userEmail,
      userName,
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
