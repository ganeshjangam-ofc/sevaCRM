import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, MessageSquare, CalendarCheck, FileText,
  Package, LifeBuoy, Receipt, UserCog, HelpCircle, LogOut,
  ChevronLeft, ChevronRight, Menu
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '../components/ui/tooltip';

const navConfig = {
  admin: [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/inquiries', label: 'Inquiries', icon: MessageSquare },
    { path: '/followups', label: 'Follow-ups', icon: CalendarCheck },
    { path: '/quotations', label: 'Quotations', icon: FileText },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/tickets', label: 'Tickets', icon: LifeBuoy },
    { path: '/gst', label: 'GST Settings', icon: Receipt },
    { path: '/users', label: 'Users', icon: UserCog },
  ],
  sales_team: [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/inquiries', label: 'Inquiries', icon: MessageSquare },
    { path: '/followups', label: 'Follow-ups', icon: CalendarCheck },
    { path: '/quotations', label: 'Quotations', icon: FileText },
    { path: '/inventory', label: 'Inventory', icon: Package },
  ],
  customer: [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/help', label: 'Help Center', icon: HelpCircle },
    { path: '/quotations', label: 'My Quotations', icon: FileText },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navConfig[user?.role] || navConfig.customer;

  return (
    <div className="flex h-screen bg-[#F7F7F9]">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}
      <aside className={`
        fixed lg:relative z-50 h-full bg-white border-r border-[#E4E4E7]
        transition-all duration-300 flex flex-col
        ${collapsed ? 'w-16' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center px-4 border-b border-[#E4E4E7]">
          {!collapsed && (
            <span className="font-outfit text-xl font-bold text-[#002FA7] tracking-tight">
              CRM Suite
            </span>
          )}
          {collapsed && (
            <span className="font-outfit text-xl font-bold text-[#002FA7]">CS</span>
          )}
        </div>
        <ScrollArea className="flex-1 py-4">
          <TooltipProvider delayDuration={0}>
            <nav className="space-y-1 px-2">
              {items.map((item) => {
                const active = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.path}
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => setMobileOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                          transition-colors duration-150
                          ${active
                            ? 'bg-[#E5EAF6] text-[#002FA7] font-semibold'
                            : 'text-[#5E5E62] hover:bg-[#F0F0F4] hover:text-[#121212]'
                          }
                        `}
                      >
                        <Icon size={20} />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </nav>
          </TooltipProvider>
        </ScrollArea>
        <div className="border-t border-[#E4E4E7] p-3">
          {!collapsed && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#002FA7] flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#121212] truncate">{user?.name}</p>
                <p className="text-xs text-[#5E5E62] truncate capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost" size="sm" onClick={logout}
              data-testid="logout-btn"
              className="flex-1 text-[#5E5E62] hover:text-[#FF2A2A] hover:bg-[#FFEAEA]"
            >
              <LogOut size={16} />
              {!collapsed && <span className="ml-2">Logout</span>}
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => setCollapsed(!collapsed)}
              data-testid="sidebar-collapse-btn"
              className="hidden lg:flex text-[#5E5E62]"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-[#E4E4E7] flex items-center px-6 shrink-0">
          <Button
            variant="ghost" size="icon"
            className="lg:hidden mr-3"
            onClick={() => setMobileOpen(true)}
            data-testid="mobile-menu-btn"
          >
            <Menu size={20} />
          </Button>
          <h1 className="font-outfit text-lg font-semibold text-[#121212]">
            {items.find(i => i.path === location.pathname)?.label || 'CRM Suite'}
          </h1>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
