import { useEffect, useState, type FormEvent } from 'react';
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
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Your profile</h1>

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Avatar name={profile.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-900">{profile.name}</p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
          <p className="mt-1 text-xs text-slate-400">Member since {formatDate(profile.created_at)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold text-slate-900">Edit details</h2>
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
