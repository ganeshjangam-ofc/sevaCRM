import { useState, useEffect } from 'react';
import api, { formatError } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { HelpCircle, Plus, MessageSquare, Send, ArrowLeft } from 'lucide-react';

const statusColors = { open: 'badge-open', in_progress: 'badge-in-progress', resolved: 'badge-resolved', closed: 'badge-closed' };

export default function HelpCenterPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' });

  const fetchTickets = async () => {
    try {
      const { data } = await api.get('/tickets');
      setTickets(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleCreate = async () => {
    try {
      await api.post('/tickets', form);
      toast.success('Ticket created! Our team will get back to you soon.');
      setShowCreate(false);
      setForm({ subject: '', description: '', priority: 'medium' });
      fetchTickets();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

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
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  if (selectedTicket && ticketDetail) {
    return (
      <div data-testid="help-ticket-detail" className="space-y-4">
        <Button variant="ghost" onClick={() => { setSelectedTicket(null); setTicketDetail(null); }}
          className="text-[#5E5E62]" data-testid="back-to-help-btn">
          <ArrowLeft size={16} className="mr-2" /> Back
        </Button>
        <Card className="border-[#E4E4E7] shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="font-outfit">{ticketDetail.subject}</CardTitle>
                <p className="text-sm text-[#5E5E62] mt-1">{ticketDetail.created_at?.slice(0, 10)}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[ticketDetail.status] || ''}`}>
                {ticketDetail.status?.replace('_', ' ')}
              </span>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                {ticketDetail.messages?.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_role === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender_role === 'customer' ? 'bg-[#E5EAF6]' : 'bg-[#F7F7F9]'
                    }`} data-testid={`help-message-${msg.id}`}>
                      <p className="text-xs font-bold text-[#121212] mb-1">
                        {msg.sender_role === 'customer' ? 'You' : `${msg.sender_name} (Support)`}
                      </p>
                      <p className="text-sm text-[#121212]">{msg.message}</p>
                      <p className="text-xs text-[#A1A1AA] mt-1">{msg.created_at?.slice(0, 16).replace('T', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="mt-4 flex gap-2">
              <Input
                data-testid="help-reply-input"
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Type your message..." className="border-[#E4E4E7]"
                onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              />
              <Button onClick={sendMessage} className="bg-[#002FA7] hover:bg-[#00227A] text-white" data-testid="help-send-btn">
                <Send size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="help-center-page" className="space-y-6">
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-2xl bg-[#002FA7]/10 flex items-center justify-center mx-auto mb-4">
          <HelpCircle size={32} className="text-[#002FA7]" />
        </div>
        <h2 className="font-outfit text-2xl font-bold text-[#121212] tracking-tight">Help Center</h2>
        <p className="text-[#5E5E62] font-figtree mt-1">How can we help you today?</p>
      </div>

      <div className="flex justify-center">
        <Button data-testid="create-ticket-btn" onClick={() => setShowCreate(true)} className="bg-[#002FA7] hover:bg-[#00227A] text-white">
          <Plus size={16} className="mr-2" /> Create Support Ticket
        </Button>
      </div>

      {showCreate && (
        <Card className="border-[#E4E4E7] shadow-none max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="font-outfit text-lg">New Support Ticket</CardTitle>
            <CardDescription>Describe your issue and we'll get back to you soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input data-testid="help-subject" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Brief description of your issue" className="border-[#E4E4E7]" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea data-testid="help-description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Provide more details..." className="border-[#E4E4E7]" rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                <SelectTrigger className="border-[#E4E4E7]" data-testid="help-priority-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-[#E4E4E7]">Cancel</Button>
              <Button data-testid="submit-ticket-btn" onClick={handleCreate} className="bg-[#002FA7] hover:bg-[#00227A] text-white">Submit Ticket</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="font-outfit text-lg font-semibold text-[#121212]">My Tickets</h3>
        {loading ? (
          <p className="text-sm text-[#5E5E62] text-center py-8">Loading...</p>
        ) : tickets.length === 0 ? (
          <Card className="border-[#E4E4E7] shadow-none">
            <CardContent className="py-12 text-center">
              <img
                src="https://static.prod-images.emergentagent.com/jobs/36f464f9-c2ca-4207-8029-63878f1c59ee/images/9c8f4a18bb85b331ae13af86da6299ed3f18ab6ae681df91d0b36d4bc294b96d.png"
                alt="No tickets" className="w-24 h-24 mx-auto mb-3 opacity-70"
              />
              <p className="text-[#5E5E62]">No tickets yet. Create one if you need help!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => (
              <Card key={t.id} className="border-[#E4E4E7] shadow-none cursor-pointer stat-card"
                onClick={() => openTicket(t.id)} data-testid={`help-ticket-${t.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={18} className="text-[#002FA7]" />
                    <div>
                      <p className="font-medium text-sm text-[#121212]">{t.subject}</p>
                      <p className="text-xs text-[#5E5E62]">{t.created_at?.slice(0, 10)}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[t.status] || ''}`}>
                    {t.status?.replace('_', ' ')}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
