import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '@/api/documentsApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, XCircle, Search, Award, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export function PublicDocumentVerification() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [searchCode, setSearchCode] = useState(code || '');
  const [queryCode, setQueryCode] = useState(code || '');

  useEffect(() => {
    if (code) {
      setSearchCode(code);
      setQueryCode(code);
    }
  }, [code]);

  const { data: verifyRes, isLoading, isError, refetch } = useQuery({
    queryKey: ['document-verify', queryCode],
    queryFn: () => documentsApi.verify(queryCode),
    enabled: Boolean(queryCode.trim()),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      setQueryCode(searchCode.trim().toUpperCase());
    }
  };

  const verifyData = verifyRes?.data;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Button>

        <Card className="shadow-lg border-border">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <Award className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold">Official Document Verification Portal</CardTitle>
            <CardDescription>Verify the authenticity of university issued certificates and transcripts.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Enter 10+ char Verification Code (e.g. BONAFIDE-2026-X1Y2Z3)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                className="h-11 font-mono uppercase font-bold text-sm bg-background"
                required
              />
              <Button type="submit" disabled={isLoading} className="h-11 px-6 gap-2 shrink-0">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Verify Code
              </Button>
            </form>

            {queryCode && (
              <div className="pt-2">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Checking document authenticity in database...</p>
                  </div>
                ) : isError || !verifyData?.valid ? (
                  <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 text-center space-y-3">
                    <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
                    <div>
                      <h4 className="font-bold text-rose-600 dark:text-rose-400 text-base">Invalid Verification Code</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {verifyData?.message || 'The specified verification code was not found or is invalid.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                      <div>
                        <h4 className="font-bold text-foreground text-base">Authentic Document Verified</h4>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Official University Issued Certificate
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-4 bg-card rounded-xl border border-border text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Document Type</span>
                        <span className="font-bold text-foreground">{verifyData.document_type_code}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Verify Code</span>
                        <span className="font-mono font-bold text-primary">{verifyData.verify_code}</span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-border">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Issued Date</span>
                        <span className="font-semibold text-foreground">
                          {verifyData.issued_at ? new Date(verifyData.issued_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
