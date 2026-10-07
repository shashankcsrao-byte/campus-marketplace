import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { signIn } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { toUserMessage } from '../utils/errorMessages';
import { isEmail } from '../utils/validation';
import { safeRedirect } from '../routes/GuestRoute';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AuthCard from './AuthLayout';

export default function Login() {
  useDocumentTitle('Log in');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!isEmail(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await signIn(email, password);
      showToast('Welcome back!');
      navigate(redirect, { replace: true });
    } catch (err) {
      setFormError(toUserMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to buy, sell and chat with students."
      footer={
        <>
          New here?{' '}
          <Link to={`/register${params.get('redirect') ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-bold text-brand-700 underline decoration-2 underline-offset-4 hover:bg-sun">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && (
          <p role="alert" className="animate-pop-in rounded-xl border-2 border-ink bg-red-300 px-4 py-3 text-sm font-bold text-ink shadow-pop-sm">
            {formError}
          </p>
        )}
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} disabled={submitting} />
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} disabled={submitting} />
        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Signing in...">
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
