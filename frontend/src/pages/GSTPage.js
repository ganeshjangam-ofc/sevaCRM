import { useState, useEffect } from 'react';
import api, { formatError } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react';

export default function GSTPage() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', rate: 0, hsn_code: '', description: '' });

  const fetchRates = async () => {
    try {
      const { data } = await api.get('/gst/rates');
      setRates(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchRates(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', rate: 0, hsn_code: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, rate: item.rate, hsn_code: item.hsn_code, description: item.description });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await api.put(`/gst/rates/${editItem.id}`, form);
        toast.success('GST rate updated');
      } else {
        await api.post('/gst/rates', form);
        toast.success('GST rate created');
      }
      setDialogOpen(false);
      fetchRates();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/gst/rates/${id}`); toast.success('Deleted'); fetchRates(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const toggleActive = async (item) => {
    try {
      await api.put(`/gst/rates/${item.id}`, { is_active: !item.is_active });
      toast.success(`GST rate ${!item.is_active ? 'activated' : 'deactivated'}`);
      fetchRates();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  return (
    <div data-testid="gst-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#002FA7]/10 flex items-center justify-center">
            <Receipt size={20} className="text-[#002FA7]" />
          </div>
          <div>
            <h2 className="font-outfit text-lg font-semibold text-[#121212]">GST Rate Management</h2>
            <p className="text-sm text-[#5E5E62]">Configure tax rates and HSN codes</p>
          </div>
        </div>
        <Button data-testid="add-gst-rate-btn" onClick={openCreate} className="bg-[#002FA7] hover:bg-[#00227A] text-white">
          <Plus size={16} className="mr-2" /> Add GST Rate
        </Button>
      </div>

      <Card className="border-[#E4E4E7] shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F7F7F9] border-[#E4E4E7]">
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Rate</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">HSN Code</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Description</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Active</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#5E5E62]">Loading...</TableCell></TableRow>
              ) : rates.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#5E5E62]">No GST rates configured</TableCell></TableRow>
              ) : rates.map(r => (
                <TableRow key={r.id} className="table-row-hover border-[#E4E4E7]" data-testid={`gst-row-${r.id}`}>
                  <TableCell className="font-medium text-sm">{r.name}</TableCell>
                  <TableCell className="text-sm font-medium text-[#002FA7]">{r.rate}%</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{r.hsn_code || '-'}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{r.description || '-'}</TableCell>
                  <TableCell>
                    <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} data-testid={`gst-toggle-${r.id}`} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}
                        className="h-8 w-8 text-[#5E5E62] hover:text-[#002FA7]" data-testid={`edit-gst-${r.id}`}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}
                        className="h-8 w-8 text-[#A1A1AA] hover:text-[#FF2A2A]" data-testid={`delete-gst-${r.id}`}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit">{editItem ? 'Edit GST Rate' : 'Add GST Rate'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input data-testid="gst-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. GST 18%" className="border-[#E4E4E7]" />
              </div>
              <div className="space-y-2">
                <Label>Rate (%)</Label>
                <Input data-testid="gst-rate" type="number" value={form.rate} onChange={e => setForm({...form, rate: Number(e.target.value)})} className="border-[#E4E4E7]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>HSN Code</Label>
              <Input data-testid="gst-hsn" value={form.hsn_code} onChange={e => setForm({...form, hsn_code: e.target.value})} placeholder="HSN/SAC code" className="border-[#E4E4E7]" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input data-testid="gst-desc" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" className="border-[#E4E4E7]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#E4E4E7]">Cancel</Button>
            <Button data-testid="save-gst-btn" onClick={handleSave} className="bg-[#002FA7] hover:bg-[#00227A] text-white">
              {editItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
