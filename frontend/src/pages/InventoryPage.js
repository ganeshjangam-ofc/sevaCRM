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
import { Badge } from '../components/ui/badge';
import { Search, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', sku: '', category: '', description: '', quantity: 0, unit_price: 0, gst_rate: 18, hsn_code: '', reorder_level: 10, supplier: '' });

  const fetchItems = async (q = '') => {
    try {
      const { data } = await api.get('/inventory', { params: { search: q } });
      setItems(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSearch = (val) => { setSearch(val); fetchItems(val); };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', sku: '', category: '', description: '', quantity: 0, unit_price: 0, gst_rate: 18, hsn_code: '', reorder_level: 10, supplier: '' });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, sku: item.sku, category: item.category, description: item.description, quantity: item.quantity, unit_price: item.unit_price, gst_rate: item.gst_rate, hsn_code: item.hsn_code, reorder_level: item.reorder_level, supplier: item.supplier });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await api.put(`/inventory/${editItem.id}`, form);
        toast.success('Product updated');
      } else {
        await api.post('/inventory', form);
        toast.success('Product added');
      }
      setDialogOpen(false);
      fetchItems(search);
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/inventory/${id}`); toast.success('Deleted'); fetchItems(search); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  return (
    <div data-testid="inventory-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#A1A1AA]" />
          <Input data-testid="inventory-search" placeholder="Search products..." value={search}
            onChange={(e) => handleSearch(e.target.value)} className="pl-9 border-[#E4E4E7]" />
        </div>
        <Button data-testid="add-inventory-btn" onClick={openCreate} className="bg-[#002FA7] hover:bg-[#00227A] text-white">
          <Plus size={16} className="mr-2" /> Add Product
        </Button>
      </div>

      <Card className="border-[#E4E4E7] shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F7F7F9] border-[#E4E4E7]">
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Product</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">SKU</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Category</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Stock</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Price</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">GST</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#5E5E62]">Loading...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#5E5E62]">No products found</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="table-row-hover border-[#E4E4E7]" data-testid={`inventory-row-${item.id}`}>
                  <TableCell className="font-medium text-sm">{item.name}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{item.sku || '-'}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{item.category || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${item.quantity <= item.reorder_level ? 'text-[#FF2A2A]' : 'text-[#121212]'}`}>
                        {item.quantity}
                      </span>
                      {item.quantity <= item.reorder_level && (
                        <AlertTriangle size={14} className="text-[#FF2A2A]" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">Rs.{item.unit_price?.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{item.gst_rate}%</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}
                        className="h-8 w-8 text-[#5E5E62] hover:text-[#002FA7]" data-testid={`edit-inventory-${item.id}`}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}
                        className="h-8 w-8 text-[#A1A1AA] hover:text-[#FF2A2A]" data-testid={`delete-inventory-${item.id}`}>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-outfit">{editItem ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input data-testid="inventory-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Product name" className="border-[#E4E4E7]" />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input data-testid="inventory-sku" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="SKU code" className="border-[#E4E4E7]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input data-testid="inventory-category" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Category" className="border-[#E4E4E7]" />
              </div>
              <div className="space-y-2">
                <Label>HSN Code</Label>
                <Input data-testid="inventory-hsn" value={form.hsn_code} onChange={e => setForm({...form, hsn_code: e.target.value})} placeholder="HSN code" className="border-[#E4E4E7]" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input data-testid="inventory-qty" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} className="border-[#E4E4E7]" />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input data-testid="inventory-price" type="number" value={form.unit_price} onChange={e => setForm({...form, unit_price: Number(e.target.value)})} className="border-[#E4E4E7]" />
              </div>
              <div className="space-y-2">
                <Label>GST Rate %</Label>
                <Input data-testid="inventory-gst" type="number" value={form.gst_rate} onChange={e => setForm({...form, gst_rate: Number(e.target.value)})} className="border-[#E4E4E7]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input data-testid="inventory-reorder" type="number" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: Number(e.target.value)})} className="border-[#E4E4E7]" />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input data-testid="inventory-supplier" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} placeholder="Supplier name" className="border-[#E4E4E7]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea data-testid="inventory-desc" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Product description..." className="border-[#E4E4E7]" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#E4E4E7]">Cancel</Button>
            <Button data-testid="save-inventory-btn" onClick={handleSave} className="bg-[#002FA7] hover:bg-[#00227A] text-white">
              {editItem ? 'Update' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
