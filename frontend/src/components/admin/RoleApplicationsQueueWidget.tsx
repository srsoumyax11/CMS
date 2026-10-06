import React, { useState, useEffect } from 'react';
import { applicationsApi, type RoleApplicationData } from '@/api/applicationsApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, User, FileText, RefreshCw, AlertCircle } from 'lucide-react';

export const RoleApplicationsQueueWidget: React.FC = () => {
  const [applications, setApplications] = useState<RoleApplicationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await applicationsApi.listApplications('pending');
      setApplications(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    setFeedback(null);
    try {
      await applicationsApi.approveApplication(id, notes[id] || undefined);
      setFeedback({ type: 'success', message: 'Role application approved successfully!' });
      fetchQueue();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to approve application.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    setFeedback(null);
    try {
      await applicationsApi.rejectApplication(id, notes[id] || undefined);
      setFeedback({ type: 'success', message: 'Role application rejected.' });
      fetchQueue();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to reject application.' });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card bg-card text-card-foreground border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          Loading role applications queue...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card bg-card text-card-foreground border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Pending Role Applications
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Review and approve pending student, parent, faculty, and staff role requests.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQueue} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback && (
          <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${feedback.type === 'success' ? 'bg-success/10 text-success-foreground border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {applications.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-secondary/20">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
            <h4 className="font-semibold text-foreground">No Pending Applications</h4>
            <p className="text-xs text-muted-foreground mt-1">All role applications have been reviewed!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="p-5 rounded-2xl border border-border bg-secondary/30 space-y-3 shadow-card">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="font-bold text-foreground">{app.applicant_name || 'Applicant'}</span>
                      <Badge variant="outline" className="uppercase text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                        {app.target_role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{app.applicant_email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(app.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Submitted Form Details Grid */}
                <div className="p-3 bg-background rounded-xl border border-border text-xs space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" /> Submitted Form Details:
                  </div>
                  {Object.entries(app.application_data)
                    .filter(([key]) => {
                      if (key === 'course_id' && app.application_data.course_name) return false;
                      if (key === 'department_id' && app.application_data.department_name) return false;
                      return true;
                    })
                    .map(([key, val]) => {
                      const label = {
                        user_id_str: 'Roll Number / Student ID',
                        student_id_str: 'Child Student ID / Email',
                        course_id: 'Course ID',
                        course_name: 'Course',
                        department_id: 'Department ID',
                        department_name: 'Department',
                        year: 'Current Year',
                        hostel: 'Hostel Name',
                        relationship_type: 'Relationship',
                        emergency_contact: 'Emergency Contact',
                        employee_id: 'Employee ID',
                        designation: 'Designation',
                      }[key] || key.replace(/_/g, ' ');

                      return (
                        <div key={key} className="flex items-center justify-between text-muted-foreground gap-4">
                          <span className="font-medium text-foreground/80">{label}:</span>
                          <span className="font-mono text-foreground font-semibold truncate max-w-[280px]">{String(val || 'N/A')}</span>
                        </div>
                      );
                    })}

                </div>

                {/* Admin Note Input & Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <Input
                    placeholder="Admin review notes (optional)..."
                    value={notes[app.id] || ''}
                    onChange={(e) => setNotes({ ...notes, [app.id]: e.target.value })}
                    className="text-xs h-9 bg-background border-input text-foreground"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(app.id)}
                      disabled={processingId === app.id}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(app.id)}
                      disabled={processingId === app.id}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 flex-1 sm:flex-initial"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
