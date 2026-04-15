import { useState, useEffect } from 'react';
import api, { formatError } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { MessageSquare, Send, ArrowLeft } from 'lucide-react';

const statusColors = { open: 'badge-open', in_progress: 'badge-in-progress', resolved: 'badge-resolved', closed: 'badge-closed' };
const priorityColors = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high' };

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [message, setMessage] = useState('');
  const [salesTeam, setSalesTeam] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchTickets = async () => {
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/tickets', { params });
      setTickets(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, [statusFilter]);
  useEffect(() => {
    api.get('/sales-team').then(r => setSalesTeam(r.data)).catch(() => {});
  }, []);

  const openTicket = async (id) => {
    try {
      const { data } = await api.get(`/tickets/${id}`);
      setTicketDetail(data);
      setSelectedTicket(id);
    } catch { toast.error('Failed to load ticket'); }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      const { data } = await api.post(`/tickets/${selectedTicket}/messages`, { message });
      setTicketDetail(data);
      setMessage('');
      toast.success('Reply sent');
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/tickets/${id}`, { status });
      toast.success('Status updated');
      fetchTickets();
      if (ticketDetail && ticketDetail.id === id) {
        setTicketDetail({ ...ticketDetail, status });
      }
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const assignTicket = async (id, assignTo) => {
    try {
      await api.put(`/tickets/${id}`, { assigned_to: assignTo });
      toast.success('Ticket assigned');
      fetchTickets();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  if (selectedTicket && ticketDetail) {
    return (
      <div data-testid="ticket-detail-page" className="space-y-4">
        <Button variant="ghost" onClick={() => { setSelectedTicket(null); setTicketDetail(null); fetchTickets(); }}
          className="text-[#5E5E62]" data-testid="back-to-tickets-btn">
          <ArrowLeft size={16} className="mr-2" /> Back to Tickets
        </Button>
        <Card className="border-[#E4E4E7] shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="font-outfit text-xl">{ticketDetail.subject}</CardTitle>
                <p className="text-sm text-[#5E5E62] mt-1">
                  By {ticketDetail.customer_name} &middot; {ticketDetail.created_at?.slice(0, 10)}
                </p>
              </div>
              <div className="flex gap-2">
                <Select value={ticketDetail.status} onValueChange={(v) => updateStatus(ticketDetail.id, v)}>
                  <SelectTrigger className="w-32" data-testid="ticket-detail-status">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[ticketDetail.status] || ''}`}>
                      {ticketDetail.status}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {['open','in_progress','resolved','closed'].map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s.replace('_',' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {ticketDetail.messages?.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_role === 'customer' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender_role === 'customer' ? 'bg-[#F7F7F9]' : 'bg-[#E5EAF6]'
                    }`} data-testid={`ticket-message-${msg.id}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#121212]">{msg.sender_name}</span>
                        <span className="text-xs text-[#A1A1AA] capitalize">{msg.sender_role?.replace('_',' ')}</span>
                      </div>
                      <p className="text-sm text-[#121212]">{msg.message}</p>
                      <p className="text-xs text-[#A1A1AA] mt-1">{msg.created_at?.slice(0, 16).replace('T', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="mt-4 flex gap-2">
              <Input
                data-testid="ticket-reply-input"
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Type your reply..." className="border-[#E4E4E7]"
                onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              />
              <Button onClick={sendMessage} className="bg-[#002FA7] hover:bg-[#00227A] text-white" data-testid="send-reply-btn">
                <Send size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="tickets-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 border-[#E4E4E7]" data-testid="ticket-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-[#5E5E62]">{tickets.length} ticket(s)</p>
      </div>

      <Card className="border-[#E4E4E7] shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F7F7F9] border-[#E4E4E7]">
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Subject</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Customer</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Priority</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Assigned</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#5E5E62]">Loading...</TableCell></TableRow>
              ) : tickets.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#5E5E62]">No tickets found</TableCell></TableRow>
              ) : tickets.map(t => (
                <TableRow key={t.id} className="table-row-hover border-[#E4E4E7] cursor-pointer"
                  onClick={() => openTicket(t.id)} data-testid={`ticket-row-${t.id}`}>
                  <TableCell className="font-medium text-sm">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={14} className="text-[#002FA7]" />
                      {t.subject}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{t.customer_name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${priorityColors[t.priority] || ''}`}>{t.priority}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[t.status] || ''}`}>{t.status}</span>
                  </TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{t.assigned_to_name || 'Unassigned'}</TableCell>
                  <TableCell className="text-sm text-[#5E5E62]">{t.created_at?.slice(0, 10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
