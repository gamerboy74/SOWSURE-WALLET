import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { Download, Upload, Filter, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Buyer {
  id: string;
  company_name: string;
  contact_name: string;
  location: string;
  business_type: string;
  orders: number;
  status: string;
  joined: string;
  email: string;
  phone_number: string;
}

function BuyersManagement() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadBuyers();
  }, []);

  const loadBuyers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('buyers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedBuyers = data.map(buyer => ({
        id: buyer.id,
        company_name: buyer.company_name,
        contact_name: buyer.contact_name,
        location: buyer.business_address,
        business_type: buyer.business_type,
        orders: 0, // You can add an orders count query later
        status: 'Active', // You can add a status field to the buyers table
        joined: new Date(buyer.created_at).toLocaleDateString(),
        email: buyer.email,
        phone_number: buyer.phone_number
      }));

      setBuyers(formattedBuyers);
    } catch (err) {
      console.error('Error loading buyers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load buyers');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Company Name', 'Contact Name', 'Location', 'Business Type', 'Orders', 'Status', 'Joined', 'Email', 'Phone'],
      ...buyers.map(buyer => [
        buyer.company_name,
        buyer.contact_name,
        buyer.location,
        buyer.business_type,
        buyer.orders,
        buyer.status,
        buyer.joined,
        buyer.email,
        buyer.phone_number
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buyers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    // Implement CSV import functionality
    console.log('Importing buyers data...');
  };

  const handleEdit = async (buyer: Buyer) => {
    // Implement edit functionality
    console.log('Edit buyer:', buyer);
  };

  const handleDelete = async (buyer: Buyer) => {
    if (!window.confirm('Are you sure you want to delete this buyer?')) return;

    try {
      const { error } = await supabase
        .from('buyers')
        .delete()
        .eq('id', buyer.id);

      if (error) throw error;
      
      setBuyers(buyers.filter(b => b.id !== buyer.id));
    } catch (err) {
      console.error('Error deleting buyer:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete buyer');
    }
  };

  const filteredBuyers = buyers.filter(buyer => {
    const matchesStatus = selectedStatus === 'all' || buyer.status.toLowerCase() === selectedStatus;
    const matchesSearch = buyer.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         buyer.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         buyer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         buyer.phone_number.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Buyers Management</h1>
        <div className="flex space-x-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Search buyers..."
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            onClick={handleImport}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <DataTable
        columns={[
          { key: 'company_name', label: 'Company Name' },
          { key: 'contact_name', label: 'Contact Name' },
          { key: 'location', label: 'Location' },
          { key: 'business_type', label: 'Business Type' },
          { key: 'orders', label: 'Total Orders' },
          { key: 'status', label: 'Status' },
          { key: 'joined', label: 'Joined Date' },
          { key: 'email', label: 'Email' },
          { key: 'phone_number', label: 'Phone' },
        ]}
        data={filteredBuyers}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default BuyersManagement;