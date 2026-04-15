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
import { Plus, Trash2 } from 'lucide-react';

const statusColors = {
  new: 'badge-new', in_progress: 'badge-in-progress', qualified: 'badge-qualified',
  converted: 'badge-converted', closed: 'badge-closed',
};
const priorityColors = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high' };

const defaultForm = { title: '', description: '', customer_id: '', customer_name: '', customer_email: '', assigned_to: '', priority: 'medium', source: 'website' };

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [customers, setCustomers] = useState([]);
  const [salesTeam, setSalesTeam] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetch = async () => {
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/inquiries', { params });
      setInquiries(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [statusFilter]);
  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data)).catch(() => {});
    api.get('/sales-team').then(r => setSalesTeam(r.data)).catch(() => {});
  }, []);

  const openCreate = () => { setEditItem(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ title: item.title, description: item.description, customer_id: item.customer_id, customer_name: item.customer_name, customer_email: item.customer_email, assigned_to: item.assigned_to, priority: item.priority, source: item.source });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await api.put(`/inquiries/${editItem.id}`, form);
        toast.success('Inquiry updated');
      } else {
        await api.post('/inquiries', form);
        toast.success('Inquiry created');
      }
      setDialogOpen(false);
      fetch();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/inquiries/${id}`); toast.success('Deleted'); fetch(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const handleStatusChange = async (id, status) => {
    try { await api.put(`/inquiries/${id}`, { status }); toast.success('Status updated'); fetch(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const onCustomerSelect = (cid) => {
    const c = customers.find(x => x._id === cid);
    setForm({ ...form, customer_id: cid, customer_name: c?.name || '', customer_email: c?.email || '' });
  };

  return (
    <div data-testid="inquiries-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 border-[#E4E4E7]" data-testid="inquiry-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button data-testid="add-inquiry-btn" onClick={openCreate} className="bg-[#002FA7] hover:bg-[#00227A] text-white">
          <Plus size={16} className="mr-2" /> New Inquiry
        </Button>
      </div>

      <Card className="border-[#E4E4E7] shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F7F7F9] border-[#E4E4E7]">
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Title</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Customer</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Assigned To</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Priority</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Source</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#5E5E62]">Loading...</TableCell></TableRow>
              ) : inquiries.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#5E5E62]">No inquiries found</TableCell></TableRow>
              ) : inquiries.map(inq => (
                <TableRow key={inq.id} className="table-row-hover border-[#E4E4E7]" data-testid={`inquiry-row-${inq.id}`}>
                  <TableCell className="font-medium text-sm cursor-pointer" onClick={() => openEdit(inq)}>{inq.title}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{inq.customer_name || '-'}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{inq.assigned_to_name || '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${priorityColors[inq.priority] || ''}`}>{inq.priority}</span>
                  </TableCell>
                  <TableCell>
                    <Select value={inq.status} onValueChange={(v) => handleStatusChange(inq.id, v)}>
                      <SelectTrigger className="h-7 text-xs border-0 p-0 w-auto" data-testid={`inquiry-status-${inq.id}`}>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[inq.status] || ''}`}>{inq.status}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {['new','in_progress','qualified','converted','closed'].map(s => (
                          <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace('_',' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-[#5E5E62] capitalize">{inq.source?.replace('_',' ')}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(inq.id)} data-testid={`delete-inquiry-${inq.id}`}
                      className="h-8 w-8 text-[#A1A1AA] hover:text-[#FF2A2A]">
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-outfit">{editItem ? 'Edit Inquiry' : 'New Inquiry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input data-testid="inquiry-title-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Inquiry title" className="border-[#E4E4E7]" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea data-testid="inquiry-desc-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the inquiry..." className="border-[#E4E4E7]" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={onCustomerSelect}>
                  <SelectTrigger className="border-[#E4E4E7]" data-testid="inquiry-customer-select">
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
                  <SelectTrigger className="border-[#E4E4E7]" data-testid="inquiry-assign-select">
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
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger className="border-[#E4E4E7]" data-testid="inquiry-priority-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm({...form, source: v})}>
                  <SelectTrigger className="border-[#E4E4E7]" data-testid="inquiry-source-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#E4E4E7]">Cancel</Button>
            <Button data-testid="save-inquiry-btn" onClick={handleSave} className="bg-[#002FA7] hover:bg-[#00227A] text-white">
              {editItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
