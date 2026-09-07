import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Users, Mail, Briefcase, Building2, CreditCard, Clock } from 'lucide-react';

export function TeacherProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const data = await api<any>('/api/teacher/profile');
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-48 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const fields = [
    { label: 'Full Name', value: profile?.name, icon: Users },
    { label: 'Department', value: profile?.department, icon: Building2 },
    { label: 'Subject Specialization', value: profile?.subject, icon: Briefcase },
    { label: 'Email Address', value: profile?.email, icon: Mail },
    { label: 'Employee / Faculty ID', value: profile?.employeeId, icon: CreditCard },
    { label: 'Last Login', value: profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : '—', icon: Clock },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Instructor Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Authenticated Faculty Account & Institutional Record</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Avatar + Name Header */}
          <div className="flex items-center gap-4 pb-5 mb-5 border-b border-border">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{profile?.name || 'Instructor'}</h2>
              <Badge variant="outline" className="mt-1 bg-primary/5 text-primary border-primary/20">
                Faculty / Examiner
              </Badge>
            </div>
          </div>

          {/* Profile Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.label} className="bg-slate-50 rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <field.icon className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{field.label}</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {field.value || '—'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
