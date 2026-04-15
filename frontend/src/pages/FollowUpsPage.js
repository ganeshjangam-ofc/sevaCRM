import { useState, useEffect } from 'react';
import api, { formatError } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Plus, CalendarIcon, Check, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const statusColors = { pending: 'badge-pending', completed: 'badge-completed', overdue: 'badge-overdue' };
const defaultForm = { inquiry_id: '', customer_id: '', customer_name: '', assigned_to: '', type: 'call', notes: '', due_date: '' };

export default function FollowUpsPage() {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [customers, setCustomers] = useState([]);
  const [salesTeam, setSalesTeam] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dueDate, setDueDate] = useState(null);

  const fetchData = async () => {
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/followups', { params });
      setFollowups(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);
  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data)).catch(() => {});
    api.get('/sales-team').then(r => setSalesTeam(r.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(defaultForm);
    setDueDate(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : '' };
      await api.post('/followups', payload);
      toast.success('Follow-up created');
      setDialogOpen(false);
      fetchData();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const markComplete = async (id) => {
    try {
      await api.put(`/followups/${id}`, { status: 'completed' });
      toast.success('Marked as completed');
      fetchData();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/followups/${id}`); toast.success('Deleted'); fetchData(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const onCustomerSelect = (cid) => {
    const c = customers.find(x => x._id === cid);
    setForm({ ...form, customer_id: cid, customer_name: c?.name || '' });
  };

  const getRowStatus = (fu) => {
    if (fu.status === 'completed') return 'completed';
    if (fu.due_date && new Date(fu.due_date) < new Date()) return 'overdue';
    return 'pending';
  };

  return (
    <div data-testid="followups-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 border-[#E4E4E7]" data-testid="followup-status-filter">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button data-testid="add-followup-btn" onClick={openCreate} className="bg-[#002FA7] hover:bg-[#00227A] text-white">
          <Plus size={16} className="mr-2" /> New Follow-up
        </Button>
      </div>

      <Card className="border-[#E4E4E7] shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F7F7F9] border-[#E4E4E7]">
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Customer</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Assigned To</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Notes</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Due Date</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#5E5E62]">Loading...</TableCell></TableRow>
              ) : followups.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#5E5E62]">No follow-ups found</TableCell></TableRow>
              ) : followups.map(fu => {
                const displayStatus = getRowStatus(fu);
                return (
                  <TableRow key={fu.id} className="table-row-hover border-[#E4E4E7]" data-testid={`followup-row-${fu.id}`}>
                    <TableCell className="font-medium text-sm">{fu.customer_name || '-'}</TableCell>
                    <TableCell className="text-sm text-[#5E5E62]">{fu.assigned_to_name || '-'}</TableCell>
                    <TableCell className="text-sm capitalize">{fu.type}</TableCell>
                    <TableCell className="text-sm text-[#5E5E62] max-w-[200px] truncate">{fu.notes || '-'}</TableCell>
                    <TableCell className="text-sm text-[#5E5E62]">{fu.due_date || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[displayStatus] || ''}`}>{displayStatus}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {fu.status !== 'completed' && (
                          <Button variant="ghost" size="icon" onClick={() => markComplete(fu.id)}
                            className="h-8 w-8 text-[#00C96D] hover:bg-[#E5F9F0]" data-testid={`complete-followup-${fu.id}`}>
                            <Check size={14} />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(fu.id)}
                          className="h-8 w-8 text-[#A1A1AA] hover:text-[#FF2A2A]" data-testid={`delete-followup-${fu.id}`}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-outfit">New Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={onCustomerSelect}>
                  <SelectTrigger className="border-[#E4E4E7]" data-testid="followup-customer-select">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={form.assigned_to} onValueChange={v => setForm({...form, assigned_to: v})}>
                  <SelectTrigger className="border-[#E4E4E7]" data-testid="followup-assign-select">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {salesTeam.map(m => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger className="border-[#E4E4E7]" data-testid="followup-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="visit">Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal border-[#E4E4E7]" data-testid="followup-due-date-btn">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea data-testid="followup-notes-input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Follow-up notes..." className="border-[#E4E4E7]" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#E4E4E7]">Cancel</Button>
            <Button data-testid="save-followup-btn" onClick={handleSave} className="bg-[#002FA7] hover:bg-[#00227A] text-white">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
