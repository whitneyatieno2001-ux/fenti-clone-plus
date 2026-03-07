import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Shield, DollarSign, Users, RefreshCw, Search, Lock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  account_type: string;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
  user_phone: string | null;
}

interface UserProfile {
  user_id: string;
  email: string | null;
  name: string | null;
  phone_number: string | null;
  real_balance: number;
  demo_balance: number;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'deposits' | 'users'>('deposits');
  const [creditUserId, setCreditUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [crediting, setCrediting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Admin login state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleAdminLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Login failed');
      const { data: roleData } = await supabase.rpc('has_role', { _user_id: authData.user.id, _role: 'admin' });
      if (!roleData) {
        await supabase.auth.signOut();
        throw new Error('Access denied. Admin privileges required.');
      }
      setIsAdmin(true);
      loadData();
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally { setLoginLoading(false); }
  };

  const loadData = async () => {
    try {
      const [depositsRes, usersRes] = await Promise.all([
        supabase.rpc('admin_get_deposits'),
        supabase.rpc('admin_get_users'),
      ]);
      if (depositsRes.data) setDeposits(depositsRes.data as unknown as Deposit[]);
      if (usersRes.data) setUsers(usersRes.data as unknown as UserProfile[]);
    } catch (err) { console.error(err); }
  };

  const handleCredit = async (userId: string, amount: string) => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast({ title: 'Invalid amount', variant: 'destructive' }); return; }
    setCrediting(true);
    try {
      const { data, error } = await supabase.rpc('admin_credit_account', {
        p_target_user_id: userId,
        p_amount: amt,
        p_account_type: 'real',
      });
      if (error) throw error;
      toast({ title: 'Account Credited', description: `$${amt.toFixed(2)} credited. New balance: $${Number(data).toFixed(2)}` });
      setCreditAmount('');
      setCreditUserId('');
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setCrediting(false); }
  };

  const filteredDeposits = deposits.filter(d =>
    !searchTerm || 
    d.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.user_phone?.includes(searchTerm) ||
    d.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    !searchTerm ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone_number?.includes(searchTerm) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loginError && (
              <div className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded-lg">{loginError}</div>
            )}
            <Input
              type="email"
              placeholder="Admin email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
            />
            <Button className="w-full" disabled={loginLoading || !adminEmail || !adminPassword} onClick={handleAdminLogin}>
              {loginLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">Admin Panel</h1>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{users.length}</div>
              <div className="text-xs text-muted-foreground">Total Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold">{deposits.length}</div>
              <div className="text-xs text-muted-foreground">Total Deposits</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
              <div className="text-2xl font-bold">${deposits.reduce((s, d) => s + d.amount, 0).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Total Deposited</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-1 text-blue-500" />
              <div className="text-2xl font-bold">${users.reduce((s, u) => s + u.real_balance, 0).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Total Real Balances</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button variant={activeTab === 'deposits' ? 'default' : 'outline'} onClick={() => setActiveTab('deposits')}>
            <DollarSign className="h-4 w-4 mr-1" /> Deposits
          </Button>
          <Button variant={activeTab === 'users' ? 'default' : 'outline'} onClick={() => setActiveTab('users')}>
            <Users className="h-4 w-4 mr-1" /> Users
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Deposits Tab */}
        {activeTab === 'deposits' && (
          <Card>
            <CardHeader><CardTitle className="text-base">Client Deposits</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeposits.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No deposits found</TableCell></TableRow>
                    ) : filteredDeposits.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs">{format(new Date(d.created_at), 'MMM dd, HH:mm')}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{d.user_name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{d.user_email}</div>
                        </TableCell>
                        <TableCell className="text-sm">{d.user_phone || '-'}</TableCell>
                        <TableCell className="font-bold text-green-500">${d.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {creditUserId === d.user_id ? (
                            <div className="flex gap-1 items-center">
                              <Input
                                type="number"
                                placeholder="$"
                                value={creditAmount}
                                onChange={e => setCreditAmount(e.target.value)}
                                className="w-20 h-8 text-xs"
                              />
                              <Button size="sm" className="h-8 text-xs" disabled={crediting} onClick={() => handleCredit(d.user_id, creditAmount)}>
                                {crediting ? '...' : 'Send'}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setCreditUserId('')}>✕</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setCreditUserId(d.user_id); setCreditAmount(d.amount.toString()); }}>
                              Credit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader><CardTitle className="text-base">All Users</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Real Balance</TableHead>
                      <TableHead>Demo Balance</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                    ) : filteredUsers.map(u => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.name || 'Unknown'}</TableCell>
                        <TableCell className="text-xs">{u.email}</TableCell>
                        <TableCell className="text-sm">{u.phone_number || '-'}</TableCell>
                        <TableCell className="font-bold text-green-500">${u.real_balance.toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">${u.demo_balance.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{format(new Date(u.created_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          {creditUserId === u.user_id ? (
                            <div className="flex gap-1 items-center">
                              <Input
                                type="number"
                                placeholder="$"
                                value={creditAmount}
                                onChange={e => setCreditAmount(e.target.value)}
                                className="w-20 h-8 text-xs"
                              />
                              <Button size="sm" className="h-8 text-xs" disabled={crediting} onClick={() => handleCredit(u.user_id, creditAmount)}>
                                {crediting ? '...' : 'Credit'}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setCreditUserId('')}>✕</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCreditUserId(u.user_id)}>
                              Credit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
