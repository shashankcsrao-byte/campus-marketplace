import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { updateProfile } from '../services/authService';
import { toUserMessage } from '../utils/errorMessages';
import { validateCampus, validateName } from '../utils/validation';
import { formatDate } from '../utils/format';
import { LIMITS } from '../utils/constants';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { FullPageSpinner } from '../components/ui/Spinner';

export default function Profile() {
  useDocumentTitle('Profile');
  const { user, profile, setProfile } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [campus, setCampus] = useState('');
  const [errors, setErrors] = useState<{ name?: string; campus?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setCampus(profile.campus ?? '');
    }
  }, [profile]);

  if (!user || !profile) return <FullPageSpinner label="Loading profile..." />;

  const dirty = name.trim() !== profile.name || campus.trim() !== (profile.campus ?? '');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = { name: validateName(name), campus: validateCampus(campus) };
    setErrors(next);
    if (next.name || next.campus) return;
    setSaving(true);
    try {
      setProfile(await updateProfile(user.id, { name, campus }));
      showToast('Profile updated.');
    } catch (err) {
      showToast(toUserMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold text-ink sm:text-4xl">Your profile</h1>

      <div className="card-pop relative mb-8 flex items-center gap-4 overflow-hidden !bg-brand-600 p-5 text-white sm:p-6">
        <span aria-hidden="true" className="absolute -top-8 -right-8 size-32 rounded-full border-2 border-ink bg-brand-500" />
        <span className="relative -rotate-6"><Avatar name={profile.name} size="lg" /></span>
        <div className="relative min-w-0">
          <p className="truncate font-display text-2xl font-bold">{profile.name}</p>
          <p className="truncate text-sm font-semibold text-brand-100">{user.email}</p>
          <p className="mt-2 inline-block rounded-full border-2 border-ink bg-sun px-2.5 text-xs font-bold text-ink">
            Member since {formatDate(profile.created_at)}
          </p>
          <Link to={`/u/${user.id}`} className="mt-2 ml-2 inline-block text-sm font-bold text-white underline decoration-2 underline-offset-4 hover:text-sun">
            View public profile
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="card-pop space-y-5 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-ink">Edit details</h2>
        <Input label="Full name" value={name} maxLength={LIMITS.nameMax} onChange={(e) => setName(e.target.value)} error={errors.name} disabled={saving} />
        <Input label="Campus / college" value={campus} maxLength={LIMITS.campusMax} onChange={(e) => setCampus(e.target.value)} error={errors.campus} disabled={saving} />
        <Input label="Email" value={user.email ?? ''} disabled hint="Email can't be changed here." />
        <div className="flex justify-end">
          <Button type="submit" loading={saving} loadingText="Saving..." disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
