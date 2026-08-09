import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, PackageSearch, RefreshCw, Send } from 'lucide-react';

interface ReviewItem {
  stock_item_id: string;
  approval_item_id: string;
  item_master_id: string | null;
  nomenclature: string;
  requested_quantity: number;
  approved_quantity: number;
  unit: string;
  available_quantity: number;
}

interface BranchReviewRequest {
  approval_id: string;
  request_id: string;
  request_number: string;
  purpose: string;
  justification: string;
  urgency_level: string;
  approval_status: string;
  submitted_at: string;
  requester_name: string;
  items: ReviewItem[];
}

interface DraftReview {
  available_quantity: number;
  comments: string;
}

export default function BranchStorekeeperReviewPage() {
  const [requests, setRequests] = useState<BranchReviewRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftReview>>({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3001/api/stock-issuance/branch-storekeeper/requests', {
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load branch storekeeper requests');
      }

      const nextRequests = data.data || [];
      setRequests(nextRequests);

      const nextDrafts: Record<string, DraftReview> = {};
      nextRequests.forEach((request: BranchReviewRequest) => {
        request.items.forEach((item) => {
          nextDrafts[item.approval_item_id] = {
            available_quantity: Math.min(item.available_quantity, item.requested_quantity),
            comments: '',
          };
        });
      });
      setDrafts(nextDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const updateDraft = (itemId: string, changes: Partial<DraftReview>) => {
    setDrafts((prev) => ({
      ...prev,
      [itemId]: {
        available_quantity: prev[itemId]?.available_quantity || 0,
        comments: prev[itemId]?.comments || '',
        ...changes,
      },
    }));
  };

  const submitReview = async (request: BranchReviewRequest) => {
    try {
      setSubmittingId(request.request_id);
      setError(null);
      setSuccessMessage(null);

      const itemReviews = request.items.map((item) => {
        const draft = drafts[item.approval_item_id] || { available_quantity: 0, comments: '' };
        return {
          stock_item_id: item.stock_item_id,
          approval_item_id: item.approval_item_id,
          available_quantity: Math.max(0, Number(draft.available_quantity || 0)),
          comments: draft.comments,
        };
      });

      const response = await fetch(`http://localhost:3001/api/stock-issuance/branch-storekeeper/review/${request.request_id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_reviews: itemReviews,
          comments: 'Branch stock checked and forwarded to branch supervisor',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to forward request');
      }

      setSuccessMessage(`${request.request_number} forwarded to Branch Supervisor`);
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmittingId(null);
    }
  };

  const getShortage = (item: ReviewItem) => {
    const available = drafts[item.approval_item_id]?.available_quantity || 0;
    return Math.max(0, item.requested_quantity - Number(available));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branch Storekeeper Review</h1>
          <p className="text-sm text-slate-600">Check branch availability before forwarding requests to the Branch Supervisor.</p>
        </div>
        <Button variant="outline" onClick={loadRequests} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <ClipboardCheck className="mb-4 h-10 w-10 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">No pending branch reviews</h2>
            <p className="mt-1 text-sm text-slate-600">New branch employee requests will appear here first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {requests.map((request) => (
            <Card key={request.request_id} className="overflow-hidden">
              <CardHeader className="border-b bg-slate-50">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <PackageSearch className="h-5 w-5 text-teal-700" />
                      {request.request_number}
                    </CardTitle>
                    <p className="mt-1 text-sm text-slate-600">{request.purpose || request.justification || 'Branch stock request'}</p>
                    <p className="mt-1 text-xs text-slate-500">Requested by {request.requester_name}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{request.urgency_level || 'Medium'}</Badge>
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{request.approval_status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-28 text-right">Requested</TableHead>
                      <TableHead className="w-32 text-right">In Stock</TableHead>
                      <TableHead className="w-36">Available Now</TableHead>
                      <TableHead className="w-28 text-right">Shortage</TableHead>
                      <TableHead>Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {request.items.map((item) => (
                      <TableRow key={item.approval_item_id}>
                        <TableCell className="font-medium">{item.nomenclature}</TableCell>
                        <TableCell className="text-right">{item.requested_quantity} {item.unit}</TableCell>
                        <TableCell className="text-right">{item.available_quantity} {item.unit}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={item.requested_quantity}
                            value={drafts[item.approval_item_id]?.available_quantity ?? 0}
                            onChange={(event) => updateDraft(item.approval_item_id, { available_quantity: Number(event.target.value) })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getShortage(item) > 0 ? 'destructive' : 'secondary'}>
                            {getShortage(item)} {item.unit}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={drafts[item.approval_item_id]?.comments || ''}
                            onChange={(event) => updateDraft(item.approval_item_id, { comments: event.target.value })}
                            placeholder="Optional note"
                            className="min-h-[42px]"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end">
                  <Button
                    onClick={() => submitReview(request)}
                    disabled={submittingId === request.request_id}
                    className="gap-2 bg-teal-700 hover:bg-teal-800"
                  >
                    {submittingId === request.request_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Forward to Branch Supervisor
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}