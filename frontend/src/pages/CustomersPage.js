import { useState, useEffect } from 'react';
import api, { formatError } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Search, Plus, Mail, Phone, Building, User } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', company: '' });

  const fetchCustomers = async (q = '') => {
    try {
      const { data } = await api.get('/customers', { params: { search: q } });
      setCustomers(data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    fetchCustomers(val);
  };

  const handleCreate = async () => {
    try {
      await api.post('/users', { ...form, role: 'customer' });
      toast.success('Customer created');
      setDialogOpen(false);
      setForm({ name: '', email: '', password: '', phone: '', company: '' });
      fetchCustomers(search);
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  return (
    <div data-testid="customers-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#A1A1AA]" />
          <Input
            data-testid="customer-search"
            placeholder="Search customers..."
            value={search} onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 border-[#E4E4E7]"
          />
        </div>
        <Button
          data-testid="add-customer-btn"
          onClick={() => setDialogOpen(true)}
          className="bg-[#002FA7] hover:bg-[#00227A] text-white"
        >
          <Plus size={16} className="mr-2" /> Add Customer
        </Button>
      </div>

      <Card className="border-[#E4E4E7] shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F7F7F9] border-[#E4E4E7]">
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Email</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Phone</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Company</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">GST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#5E5E62]">Loading...</TableCell></TableRow>
              ) : customers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#5E5E62]">No customers found</TableCell></TableRow>
              ) : customers.map(c => (
                <TableRow key={c._id} className="table-row-hover border-[#E4E4E7]" data-testid={`customer-row-${c._id}`}>
                  <TableCell className="font-medium text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#002FA7] flex items-center justify-center text-white text-xs font-bold">
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      {c.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{c.email}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{c.phone || '-'}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{c.company || '-'}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{c.gst_number || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit">Add Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input data-testid="new-customer-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Customer name" className="border-[#E4E4E7]" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input data-testid="new-customer-email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="customer@example.com" className="border-[#E4E4E7]" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input data-testid="new-customer-password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Set password" className="border-[#E4E4E7]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input data-testid="new-customer-phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91..." className="border-[#E4E4E7]" />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input data-testid="new-customer-company" value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Company" className="border-[#E4E4E7]" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#E4E4E7]">Cancel</Button>
            <Button data-testid="save-customer-btn" onClick={handleCreate} className="bg-[#002FA7] hover:bg-[#00227A] text-white">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
