import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

type Step = 'FIND_ACCOUNT' | 'VERIFY_OTP' | 'RESET_PASSWORD';

export const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<Step>('FIND_ACCOUNT');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await api.post('/admin/recover/find', { email });
      setStep('VERIFY_OTP');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to find account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await api.post('/admin/recover/verify', { otp });
      setStep('RESET_PASSWORD');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await api.post('/admin/recover/password', { password });
      navigate('/login', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Recover Account</CardTitle>
          <CardDescription>
            {step === 'FIND_ACCOUNT' && "Enter your email to receive a recovery code."}
            {step === 'VERIFY_OTP' && "Enter the 6-digit code sent to your email."}
            {step === 'RESET_PASSWORD' && "Enter your new secure password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {step === 'FIND_ACCOUNT' && (
            <form id="recover-form" onSubmit={handleFindAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="developer@example.com"
                />
              </div>
            </form>
          )}

          {step === 'VERIFY_OTP' && (
            <form id="recover-form" onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Recovery Code</Label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="123456"
                />
              </div>
            </form>
          )}

          {step === 'RESET_PASSWORD' && (
            <form id="recover-form" onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                />
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" form="recover-form" className="w-full" disabled={isLoading}>
            {isLoading ? 'Processing...' : step === 'FIND_ACCOUNT' ? 'Send Code' : step === 'VERIFY_OTP' ? 'Verify Code' : 'Reset Password'}
          </Button>
          <div className="text-center text-sm">
            <Link to="/login" className="text-zinc-500 hover:text-zinc-900 transition-colors">
              Back to Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
