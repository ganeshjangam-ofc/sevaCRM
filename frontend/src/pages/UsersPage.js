import { useState, useEffect } from 'react';
import api, { formatError } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, Pencil, Trash2, UserCog } from 'lucide-react';

const roleColors = { admin: 'bg-[#FFEAEA] text-[#FF2A2A]', sales_team: 'bg-[#E5EAF6] text-[#002FA7]', customer: 'bg-[#E5F9F0] text-[#00C96D]' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'sales_team', phone: '', company: '' });

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    try {
      await api.post('/users', form);
      toast.success('User created');
      setDialogOpen(false);
      setForm({ name: '', email: '', password: '', role: 'sales_team', phone: '', company: '' });
      fetchUsers();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/users/${id}`); toast.success('User deleted'); fetchUsers(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  return (
    <div data-testid="users-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#002FA7]/10 flex items-center justify-center">
            <UserCog size={20} className="text-[#002FA7]" />
          </div>
          <div>
            <h2 className="font-outfit text-lg font-semibold text-[#121212]">User Management</h2>
            <p className="text-sm text-[#5E5E62]">Manage team members and their roles</p>
          </div>
        </div>
        <Button data-testid="add-user-btn" onClick={() => setDialogOpen(true)} className="bg-[#002FA7] hover:bg-[#00227A] text-white">
          <Plus size={16} className="mr-2" /> Add User
        </Button>
      </div>

      <Card className="border-[#E4E4E7] shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F7F7F9] border-[#E4E4E7]">
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Email</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Role</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Phone</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Company</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#5E5E62]">Loading...</TableCell></TableRow>
              ) : users.map(u => (
                <TableRow key={u._id} className="table-row-hover border-[#E4E4E7]" data-testid={`user-row-${u._id}`}>
                  <TableCell className="font-medium text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#002FA7] flex items-center justify-center text-white text-xs font-bold">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      {u.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{u.email}</TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${roleColors[u.role] || ''}`}>
                      {u.role?.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{u.phone || '-'}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{u.company || '-'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u._id)}
                      className="h-8 w-8 text-[#A1A1AA] hover:text-[#FF2A2A]" data-testid={`delete-user-${u._id}`}>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit">Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input data-testid="new-user-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="User name" className="border-[#E4E4E7]" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input data-testid="new-user-email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="user@example.com" className="border-[#E4E4E7]" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input data-testid="new-user-password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Set password" className="border-[#E4E4E7]" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
                <SelectTrigger className="border-[#E4E4E7]" data-testid="new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="sales_team">Sales Team</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input data-testid="new-user-phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="border-[#E4E4E7]" />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input data-testid="new-user-company" value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="border-[#E4E4E7]" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#E4E4E7]">Cancel</Button>
            <Button data-testid="save-user-btn" onClick={handleCreate} className="bg-[#002FA7] hover:bg-[#00227A] text-white">Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
