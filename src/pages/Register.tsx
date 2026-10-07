import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { signUp } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { toUserMessage } from '../utils/errorMessages';
import { isEmail, validateCampus, validateName } from '../utils/validation';
import { LIMITS } from '../utils/constants';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AuthCard from './AuthLayout';

type Field = 'name' | 'campus' | 'email' | 'password' | 'confirm';

export default function Register() {
  useDocumentTitle('Create account');
  const { showToast } = useToast();
  const [params] = useSearchParams();
  const [form, setForm] = useState<Record<Field, string>>({ name: '', campus: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<Field, string>> = {
      name: validateName(form.name),
      campus: validateCampus(form.campus),
      email: isEmail(form.email) ? undefined : 'Enter a valid email address.',
      password: form.password.length >= LIMITS.passwordMin ? undefined : `Password must be at least ${LIMITS.passwordMin} characters.`,
      confirm: form.confirm === form.password ? undefined : 'Passwords do not match.',
    };
    setErrors(next);
    setFormError(null);
    if (Object.values(next).some(Boolean)) return;

    setSubmitting(true);
    try {
      await signUp(form.name, form.campus, form.email, form.password);
      showToast('Account created. Welcome to Campus Marketplace!');
      // GuestRoute redirects once the session arrives.
    } catch (err) {
      setFormError(toUserMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join your campus marketplace in under a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to={`/login${params.toString() ? `?${params}` : ''}`} className="font-bold text-brand-700 underline decoration-2 underline-offset-4 hover:bg-sun">
            Log in
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
        <Input label="Full name" autoComplete="name" maxLength={LIMITS.nameMax} value={form.name} onChange={set('name')} error={errors.name} disabled={submitting} />
        <Input
          label="Campus / college"
          placeholder="e.g. NMIT Bangalore"
          autoComplete="organization"
          maxLength={LIMITS.campusMax}
          value={form.campus}
          onChange={set('campus')}
          error={errors.campus}
          hint="Optional, but helps buyers nearby find you."
          disabled={submitting}
        />
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} disabled={submitting} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="8+ characters" disabled={submitting} />
          <Input label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} disabled={submitting} />
        </div>
        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Creating account...">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
