import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { formatError } from '../lib/api';
import { Mail, Lock, User, Phone, Building } from 'lucide-react';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register({ email, password, name, phone, company });
        toast.success('Account created successfully!');
      } else {
        await login(email, password);
        toast.success('Welcome back!');
      }
      navigate('/');
    } catch (err) {
      toast.error(formatError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://static.prod-images.emergentagent.com/jobs/36f464f9-c2ca-4207-8029-63878f1c59ee/images/3b5f9582dccf8a0269e5f026c6261d142fdfddacb5696c9244f85db73b211728.png"
          alt="CRM Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <h2 className="font-outfit text-4xl font-bold mb-4 text-[#002FA7]">CRM Suite</h2>
          <p className="font-figtree text-lg text-[#121212]">
            Manage customers, inquiries, and sales pipeline all in one place.
          </p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <Card className="w-full max-w-md border-[#E4E4E7] shadow-none">
          <CardHeader className="text-center">
            <div className="lg:hidden mb-4">
              <span className="font-outfit text-2xl font-bold text-[#002FA7]">CRM Suite</span>
            </div>
            <CardTitle className="font-outfit text-2xl tracking-tight">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="font-figtree text-[#5E5E62]">
              {isRegister ? 'Register as a customer to get started' : 'Sign in to your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-[#A1A1AA]" />
                      <Input
                        id="name" data-testid="register-name-input"
                        placeholder="John Doe" value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9 border-[#E4E4E7] focus:ring-[#002FA7]/20 focus:border-[#002FA7]"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-[#A1A1AA]" />
                        <Input
                          id="phone" data-testid="register-phone-input"
                          placeholder="+91..." value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-9 border-[#E4E4E7]"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-2.5 h-4 w-4 text-[#A1A1AA]" />
                        <Input
                          id="company" data-testid="register-company-input"
                          placeholder="Company" value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          className="pl-9 border-[#E4E4E7]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#A1A1AA]" />
                  <Input
                    id="email" type="email" data-testid="login-email-input"
                    placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 border-[#E4E4E7] focus:ring-[#002FA7]/20 focus:border-[#002FA7]"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#A1A1AA]" />
                  <Input
                    id="password" type="password" data-testid="login-password-input"
                    placeholder="Enter password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 border-[#E4E4E7] focus:ring-[#002FA7]/20 focus:border-[#002FA7]"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit" data-testid="login-submit-btn"
                className="w-full bg-[#002FA7] hover:bg-[#00227A] text-white font-medium"
                disabled={loading}
              >
                {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button
                type="button" onClick={() => setIsRegister(!isRegister)}
                data-testid="toggle-auth-mode"
                className="text-sm text-[#002FA7] hover:underline font-medium"
              >
                {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
