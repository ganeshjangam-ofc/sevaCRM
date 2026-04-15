import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  Users, MessageSquare, CalendarCheck, FileText,
  TrendingUp, LifeBuoy, AlertTriangle, Package
} from 'lucide-react';

const statusColors = {
  new: 'badge-new', in_progress: 'badge-in-progress', qualified: 'badge-qualified',
  converted: 'badge-converted', closed: 'badge-closed', open: 'badge-open',
  resolved: 'badge-resolved', pending: 'badge-pending', completed: 'badge-completed',
  overdue: 'badge-overdue', draft: 'badge-draft', sent: 'badge-sent',
  accepted: 'badge-accepted', rejected: 'badge-rejected',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [recent, setRecent] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/recent'),
    ]).then(([s, r]) => {
      setStats(s.data);
      setRecent(r.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002FA7]" />
      </div>
    );
  }

  const isStaff = user?.role === 'admin' || user?.role === 'sales_team';

  const staffCards = [
    { key: 'total_customers', label: 'Total Customers', icon: Users, color: '#002FA7' },
    { key: 'active_inquiries', label: 'Active Inquiries', icon: MessageSquare, color: '#00C96D' },
    { key: 'pending_followups', label: 'Pending Follow-ups', icon: CalendarCheck, color: '#FFC000' },
    { key: 'total_revenue', label: 'Revenue', icon: TrendingUp, color: '#002FA7', prefix: 'Rs.' },
    { key: 'open_tickets', label: 'Open Tickets', icon: LifeBuoy, color: '#FF2A2A' },
    { key: 'low_stock_items', label: 'Low Stock', icon: AlertTriangle, color: '#FFC000' },
    { key: 'total_quotations', label: 'Total Quotations', icon: FileText, color: '#002FA7' },
    { key: 'accepted_quotations', label: 'Accepted Quotes', icon: FileText, color: '#00C96D' },
  ];

  const customerCards = [
    { key: 'total_tickets', label: 'My Tickets', icon: LifeBuoy, color: '#002FA7' },
    { key: 'open_tickets', label: 'Open Tickets', icon: LifeBuoy, color: '#FFC000' },
    { key: 'total_quotations', label: 'My Quotations', icon: FileText, color: '#00C96D' },
  ];

  const cards = isStaff ? staffCards : customerCards;

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          const val = stats[card.key] ?? 0;
          return (
            <Card
              key={card.key}
              className="stat-card border-[#E4E4E7] shadow-none animate-fadeInUp"
              style={{ animationDelay: `${i * 50}ms` }}
              data-testid={`stat-${card.key}`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs tracking-[0.15em] uppercase font-bold text-[#5E5E62] font-figtree">
                      {card.label}
                    </p>
                    <p className="font-outfit text-2xl font-bold text-[#121212] mt-1">
                      {card.prefix || ''}{typeof val === 'number' && card.prefix ? val.toLocaleString('en-IN') : val}
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.color + '14' }}
                  >
                    <Icon size={20} style={{ color: card.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-[#E4E4E7] shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="font-outfit text-lg">Recent Inquiries</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.recent_inquiries?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#E4E4E7]">
                      <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Title</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Customer</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.recent_inquiries.map(inq => (
                      <TableRow
                        key={inq.id}
                        className="table-row-hover cursor-pointer border-[#E4E4E7]"
                        onClick={() => navigate('/inquiries')}
                        data-testid={`recent-inquiry-${inq.id}`}
                      >
                        <TableCell className="font-medium text-sm">{inq.title}</TableCell>
                        <TableCell className="text-sm text-[#5E5E62]">{inq.customer_name || '-'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[inq.status] || ''}`}>
                            {inq.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="empty-state py-8">
                  <img
                    src="https://static.prod-images.emergentagent.com/jobs/36f464f9-c2ca-4207-8029-63878f1c59ee/images/9c8f4a18bb85b331ae13af86da6299ed3f18ab6ae681df91d0b36d4bc294b96d.png"
                    alt="No inquiries" className="w-24 h-24 mb-3 opacity-70"
                  />
                  <p className="text-sm text-[#5E5E62]">No recent inquiries</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#E4E4E7] shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="font-outfit text-lg">Upcoming Follow-ups</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.upcoming_followups?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#E4E4E7]">
                      <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Customer</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Type</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.upcoming_followups.map(fu => (
                      <TableRow
                        key={fu.id}
                        className="table-row-hover cursor-pointer border-[#E4E4E7]"
                        onClick={() => navigate('/followups')}
                        data-testid={`upcoming-followup-${fu.id}`}
                      >
                        <TableCell className="font-medium text-sm">{fu.customer_name || '-'}</TableCell>
                        <TableCell className="text-sm capitalize">{fu.type}</TableCell>
                        <TableCell className="text-sm text-[#5E5E62]">{fu.due_date || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="empty-state py-8">
                  <img
                    src="https://static.prod-images.emergentagent.com/jobs/36f464f9-c2ca-4207-8029-63878f1c59ee/images/9c8f4a18bb85b331ae13af86da6299ed3f18ab6ae681df91d0b36d4bc294b96d.png"
                    alt="No follow-ups" className="w-24 h-24 mb-3 opacity-70"
                  />
                  <p className="text-sm text-[#5E5E62]">No pending follow-ups</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-[#E4E4E7] shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="font-outfit text-lg">Recent Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.recent_tickets?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#E4E4E7]">
                      <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Subject</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.recent_tickets.map(t => (
                      <TableRow key={t.id} className="table-row-hover border-[#E4E4E7]">
                        <TableCell className="font-medium text-sm">{t.subject}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[t.status] || ''}`}>
                            {t.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-[#5E5E62] text-center py-8">No recent tickets</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-[#E4E4E7] shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="font-outfit text-lg">Recent Quotations</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.recent_quotations?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#E4E4E7]">
                      <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Number</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Total</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-[#5E5E62] font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.recent_quotations.map(q => (
                      <TableRow key={q.id} className="table-row-hover border-[#E4E4E7]">
                        <TableCell className="font-medium text-sm">{q.quotation_number}</TableCell>
                        <TableCell className="text-sm">Rs.{q.total?.toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[q.status] || ''}`}>
                            {q.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-[#5E5E62] text-center py-8">No quotations yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
