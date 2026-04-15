import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
import { Plus, Trash2, Download, X } from 'lucide-react';

const statusColors = { draft: 'badge-draft', sent: 'badge-sent', accepted: 'badge-accepted', rejected: 'badge-rejected', expired: 'badge-expired' };

const emptyItem = { name: '', description: '', quantity: 1, unit_price: 0, gst_rate: 18 };

export default function QuotationsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'sales_team';
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [gstRates, setGstRates] = useState([]);
  const [form, setForm] = useState({ customer_id: '', customer_name: '', customer_email: '', customer_gst: '', billing_address: '', items: [{ ...emptyItem }], valid_until: '', notes: '', status: 'draft' });

  const fetchData = async () => {
    try {
      const { data } = await api.get('/quotations');
      setQuotations(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (isStaff) {
      api.get('/customers').then(r => setCustomers(r.data)).catch(() => {});
    }
    api.get('/gst/rates').then(r => setGstRates(r.data)).catch(() => {});
  }, [isStaff]);

  const calcTotals = (items) => {
    let subtotal = 0, totalGst = 0;
    items.forEach(i => {
      const amt = i.quantity * i.unit_price;
      subtotal += amt;
      totalGst += amt * (i.gst_rate / 100);
    });
    return { subtotal, totalGst, total: subtotal + totalGst };
  };

  const onCustomerSelect = (cid) => {
    const c = customers.find(x => x._id === cid);
    setForm({ ...form, customer_id: cid, customer_name: c?.name || '', customer_email: c?.email || '', customer_gst: c?.gst_number || '' });
  };

  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: field === 'name' || field === 'description' ? val : Number(val) };
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleCreate = async () => {
    try {
      await api.post('/quotations', form);
      toast.success('Quotation created');
      setDialogOpen(false);
      fetchData();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/quotations/${id}`, { status });
      toast.success('Status updated');
      fetchData();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const downloadPdf = async (id, number) => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/quotations/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `quotation_${number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download PDF'); }
  };

  const totals = calcTotals(form.items);

  return (
    <div data-testid="quotations-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[#5E5E62]">{quotations.length} quotation(s)</p>
        {isStaff && (
          <Button data-testid="add-quotation-btn" onClick={() => {
            setForm({ customer_id: '', customer_name: '', customer_email: '', customer_gst: '', billing_address: '', items: [{ ...emptyItem }], valid_until: '', notes: '', status: 'draft' });
            setDialogOpen(true);
          }} className="bg-[#002FA7] hover:bg-[#00227A] text-white">
            <Plus size={16} className="mr-2" /> New Quotation
          </Button>
        )}
      </div>

      <Card className="border-[#E4E4E7] shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F7F7F9] border-[#E4E4E7]">
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Number</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Customer</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Subtotal</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">GST</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Total</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#5E5E62]">Loading...</TableCell></TableRow>
              ) : quotations.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#5E5E62]">No quotations found</TableCell></TableRow>
              ) : quotations.map(q => (
                <TableRow key={q.id} className="table-row-hover border-[#E4E4E7]" data-testid={`quotation-row-${q.id}`}>
                  <TableCell className="font-medium text-sm">{q.quotation_number}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{q.customer_name}</TableCell>
                  <TableCell className="text-sm">Rs.{q.subtotal?.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">Rs.{q.total_gst?.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-sm font-medium">Rs.{q.total?.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    {isStaff ? (
                      <Select value={q.status} onValueChange={(v) => handleStatusChange(q.id, v)}>
                        <SelectTrigger className="h-7 text-xs border-0 p-0 w-auto" data-testid={`quotation-status-${q.id}`}>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[q.status] || ''}`}>{q.status}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {['draft','sent','accepted','rejected','expired'].map(s => (
                            <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[q.status] || ''}`}>{q.status}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => downloadPdf(q.id, q.quotation_number)}
                      className="h-8 w-8 text-[#002FA7]" data-testid={`download-pdf-${q.id}`}>
                      <Download size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-outfit">New Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={onCustomerSelect}>
                  <SelectTrigger className="border-[#E4E4E7]" data-testid="quotation-customer-select">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Customer GST</Label>
                <Input data-testid="quotation-gst-input" value={form.customer_gst} onChange={e => setForm({...form, customer_gst: e.target.value})} placeholder="GSTIN" className="border-[#E4E4E7]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Billing Address</Label>
              <Input data-testid="quotation-address-input" value={form.billing_address} onChange={e => setForm({...form, billing_address: e.target.value})} placeholder="Billing address" className="border-[#E4E4E7]" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="add-line-item-btn"
                  className="border-[#E4E4E7] text-xs">
                  <Plus size={14} className="mr-1" /> Add Item
                </Button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-[#F7F7F9] rounded-lg" data-testid={`line-item-${idx}`}>
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Item Name</Label>
                    <Input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder="Item" className="border-[#E4E4E7] text-sm h-8" data-testid={`item-name-${idx}`} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="border-[#E4E4E7] text-sm h-8" data-testid={`item-qty-${idx}`} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Price</Label>
                    <Input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} className="border-[#E4E4E7] text-sm h-8" data-testid={`item-price-${idx}`} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">GST %</Label>
                    <Select value={String(item.gst_rate)} onValueChange={v => updateItem(idx, 'gst_rate', v)}>
                      <SelectTrigger className="border-[#E4E4E7] text-sm h-8" data-testid={`item-gst-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {gstRates.map(r => <SelectItem key={r.id} value={String(r.rate)}>{r.rate}%</SelectItem>)}
                        {gstRates.length === 0 && <>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                          <SelectItem value="18">18%</SelectItem>
                          <SelectItem value="28">28%</SelectItem>
                        </>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-xs">Amt</Label>
                    <p className="text-sm font-medium h-8 flex items-center">Rs.{(item.quantity * item.unit_price).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="col-span-1 flex items-end">
                    {form.items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}
                        className="h-8 w-8 text-[#FF2A2A]" data-testid={`remove-item-${idx}`}>
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#F7F7F9] rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#5E5E62]">Subtotal</span>
                <span className="font-medium">Rs.{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5E5E62]">Total GST</span>
                <span className="font-medium">Rs.{totals.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-[#E4E4E7] pt-2">
                <span>Total</span>
                <span className="text-[#002FA7]">Rs.{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea data-testid="quotation-notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Additional notes..." className="border-[#E4E4E7]" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#E4E4E7]">Cancel</Button>
            <Button data-testid="save-quotation-btn" onClick={handleCreate} className="bg-[#002FA7] hover:bg-[#00227A] text-white">Create Quotation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
