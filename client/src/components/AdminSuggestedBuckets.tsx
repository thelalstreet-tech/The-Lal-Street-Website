import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react';
import { FundSearch } from './FundSearch';
import { FundBucket } from './FundBucket';
import type { SuggestedBucket } from '../types/suggestedBucket';
import type { Fund, SelectedFund } from '../App';
import { 
  loadSuggestedBuckets, 
  saveSuggestedBuckets, 
  addSuggestedBucket, 
  updateSuggestedBucket, 
  deleteSuggestedBucket 
} from '../data/suggestedBuckets';
import { calculateBucketPerformance } from '../utils/bucketPerformanceCalculator';

interface AdminSuggestedBucketsProps {
  isAdmin?: boolean;
}

export function AdminSuggestedBuckets({ isAdmin = true }: AdminSuggestedBucketsProps) {
  const [buckets, setBuckets] = useState<SuggestedBucket[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Form state
  const [bucketName, setBucketName] = useState('');
  const [bucketDescription, setBucketDescription] = useState('');
  const [bucketCategory, setBucketCategory] = useState<'investment' | 'retirement' | 'both'>('both');
  const [bucketRiskLevel, setBucketRiskLevel] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [selectedFunds, setSelectedFunds] = useState<SelectedFund[]>([]);

  useEffect(() => {
    loadBuckets();
  }, []);

  const loadBuckets = async () => {
    try {
      const loaded = await loadSuggestedBuckets(false); // Load all, not just active
      setBuckets(loaded);
    } catch (error) {
      console.error('Error loading suggested buckets:', error);
      setBuckets([]);
    }
  };

  const handleAddFund = (fund: Fund) => {
    if (selectedFunds.find(f => f.id === fund.id)) return;
    if (selectedFunds.length >= 5) {
      alert('Maximum 5 funds allowed in a bucket.');
      return;
    }
    
    const newCount = selectedFunds.length + 1;
    const baseWeight = Math.floor(100 / newCount);
    const remainder = 100 - (baseWeight * newCount);
    
    const weights = new Array(newCount).fill(baseWeight);
    for (let i = 0; i < remainder; i++) {
      weights[i] += 1;
    }
    
    const updatedFunds = selectedFunds.map((f, index) => ({
      ...f,
      weightage: weights[index]
    }));
    
    setSelectedFunds([...updatedFunds, { ...fund, weightage: weights[newCount - 1] }]);
  };

  const handleRemoveFund = (fundId: string) => {
    const filtered = selectedFunds.filter(f => f.id !== fundId);
    
    if (filtered.length > 0) {
      const newCount = filtered.length;
      const baseWeight = Math.floor(100 / newCount);
      const remainder = 100 - (baseWeight * newCount);
      
      const weights = new Array(newCount).fill(baseWeight);
      for (let i = 0; i < remainder; i++) {
        weights[i] += 1;
      }
      
      const redistributed = filtered.map((f, index) => ({
        ...f,
        weightage: weights[index]
      }));
      setSelectedFunds(redistributed);
    } else {
      setSelectedFunds([]);
    }
  };

  const handleWeightageChange = (fundId: string, weightage: number) => {
    setSelectedFunds(selectedFunds.map(f => 
      f.id === fundId ? { ...f, weightage } : f
    ));
  };

  const resetForm = () => {
    setBucketName('');
    setBucketDescription('');
    setBucketCategory('both');
    setBucketRiskLevel('moderate');
    setSelectedFunds([]);
    setIsEditing(false);
    setEditingBucketId(null);
  };

  const handleCreateOrUpdate = async () => {
    if (!bucketName.trim() || selectedFunds.length === 0) {
      alert('Please provide a bucket name and at least one fund.');
      return;
    }

    // Validate weightage totals 100%
    const totalWeightage = selectedFunds.reduce((sum, fund) => sum + fund.weightage, 0);
    if (Math.abs(totalWeightage - 100) > 0.01) {
      alert('Total weightage must equal 100%.');
      return;
    }

    setIsCalculating(true);

    try {
      // Calculate performance metrics
      const performance = await calculateBucketPerformance(selectedFunds);

      const bucketData: Omit<SuggestedBucket, 'id' | 'createdAt' | 'updatedAt'> = {
        name: bucketName.trim(),
        description: bucketDescription.trim(),
        category: bucketCategory,
        funds: selectedFunds,
        isActive: true,
        performance: {
          rollingReturns: performance.rollingReturns,
          riskLevel: bucketRiskLevel,
          analysisStartDate: performance.analysisStartDate,
          analysisEndDate: performance.analysisEndDate,
          totalPeriods: performance.totalPeriods,
        },
        riskLevel: bucketRiskLevel,
      };

      if (isEditing && editingBucketId) {
        // Update existing bucket
        await updateSuggestedBucket(editingBucketId, {
          ...bucketData,
          lastCalculationDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new bucket
        const newBucket: SuggestedBucket = {
          ...bucketData,
          id: `bucket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastCalculationDate: new Date().toISOString(),
        };
        await addSuggestedBucket(newBucket);
      }

      await loadBuckets();
      resetForm();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error calculating performance:', error);
      alert(`Error calculating performance: ${error.message}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleEdit = (bucket: SuggestedBucket) => {
    setBucketName(bucket.name);
    setBucketDescription(bucket.description);
    setBucketCategory(bucket.category);
    setBucketRiskLevel(bucket.riskLevel);
    setSelectedFunds(bucket.funds);
    setIsEditing(true);
    setEditingBucketId(bucket.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (bucketId: string) => {
    if (confirm('Are you sure you want to delete this suggested bucket?')) {
      try {
        await deleteSuggestedBucket(bucketId);
        await loadBuckets();
      } catch (error: any) {
        console.error('Error deleting bucket:', error);
        alert(`Error deleting bucket: ${error.message}`);
      }
    }
  };

  const handleToggleActive = async (bucket: SuggestedBucket) => {
    try {
      await updateSuggestedBucket(bucket.id, {
        isActive: !bucket.isActive,
        updatedAt: new Date().toISOString(),
      });
      await loadBuckets();
    } catch (error: any) {
      console.error('Error updating bucket:', error);
      alert(`Error updating bucket: ${error.message}`);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Manage Suggested Buckets</h2>
          <p className="text-gray-600 mt-2">Create and manage recommended portfolios for users</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Bucket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Suggested Bucket' : 'Create Suggested Bucket'}</DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? 'Update the bucket details and recalculate performance metrics.'
                  : 'Create a new suggested bucket with funds and calculate performance metrics.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 mt-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bucket-name">Bucket Name *</Label>
                  <Input
                    id="bucket-name"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    placeholder="e.g., Conservative Growth Portfolio"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bucket-description">Description</Label>
                  <Textarea
                    id="bucket-description"
                    value={bucketDescription}
                    onChange={(e) => setBucketDescription(e.target.value)}
                    placeholder="Describe this bucket..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={bucketCategory} onValueChange={(value: any) => setBucketCategory(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="investment">Investment</SelectItem>
                        <SelectItem value="retirement">Retirement</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="risk">Risk Level *</Label>
                    <Select value={bucketRiskLevel} onValueChange={(value: any) => setBucketRiskLevel(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Fund Selection */}
              <div className="space-y-4">
                <Label>Select Funds *</Label>
                <FundSearch onSelectFund={handleAddFund} />
                
                {selectedFunds.length > 0 && (
                  <Card className="p-4">
                    <FundBucket
                      funds={selectedFunds}
                      onRemoveFund={handleRemoveFund}
                      onWeightageChange={handleWeightageChange}
                    />
                  </Card>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleCreateOrUpdate} disabled={isCalculating}>
                  {isCalculating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditing ? 'Update' : 'Create & Calculate Performance'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Buckets List */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Funds</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Avg Return</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buckets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No suggested buckets yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              buckets.map((bucket) => (
                <TableRow key={bucket.id}>
                  <TableCell className="font-medium">{bucket.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{bucket.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={bucket.riskLevel === 'low' ? 'default' : bucket.riskLevel === 'moderate' ? 'secondary' : 'destructive'}>
                      {bucket.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>{bucket.funds.length}</TableCell>
                  <TableCell>
                    <Badge variant={bucket.isActive ? 'default' : 'secondary'}>
                      {bucket.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {bucket.performance.rollingReturns.bucket.mean.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(bucket)}
                      >
                        {bucket.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(bucket)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(bucket.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

