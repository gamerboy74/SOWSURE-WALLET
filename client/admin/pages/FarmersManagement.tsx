import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { Download, Upload, Filter, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Farmer {
  id: string;
  name: string;
  location: string;
  landSize: string;
  products: number;
  status: string;
  joined: string;
  email: string;
  phone_number: string;
}

function FarmersManagement() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFarmers();
  }, []);

  const loadFarmers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('farmers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedFarmers = data.map(farmer => ({
        id: farmer.id,
        name: farmer.name,
        location: farmer.complete_address,
        landSize: `${farmer.land_size} acres`,
        products: 0, // You can add a products count query later
        status: 'Active', // You can add a status field to the farmers table
        joined: new Date(farmer.created_at).toLocaleDateString(),
        email: farmer.email,
        phone_number: farmer.phone_number
      }));

      setFarmers(formattedFarmers);
    } catch (err) {
      console.error('Error loading farmers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load farmers');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Location', 'Land Size', 'Products', 'Status', 'Joined', 'Email', 'Phone'],
      ...farmers.map(farmer => [
        farmer.name,
        farmer.location,
        farmer.landSize,
        farmer.products,
        farmer.status,
        farmer.joined,
        farmer.email,
        farmer.phone_number
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    // Implement CSV import functionality
    console.log('Importing farmers data...');
  };

  const handleEdit = async (farmer: Farmer) => {
    // Implement edit functionality
    console.log('Edit farmer:', farmer);
  };

  const handleDelete = async (farmer: Farmer) => {
    if (!window.confirm('Are you sure you want to delete this farmer?')) return;

    try {
      const { error } = await supabase
        .from('farmers')
        .delete()
        .eq('id', farmer.id);

      if (error) throw error;
      
      setFarmers(farmers.filter(f => f.id !== farmer.id));
    } catch (err) {
      console.error('Error deleting farmer:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete farmer');
    }
  };

  const filteredFarmers = farmers.filter(farmer => {
    const matchesStatus = selectedStatus === 'all' || farmer.status.toLowerCase() === selectedStatus;
    const matchesSearch = farmer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         farmer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         farmer.phone_number.includes(searchQuery);
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
        <h1 className="text-2xl font-bold text-gray-900">Farmers Management</h1>
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
            placeholder="Search farmers..."
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
          { key: 'name', label: 'Name' },
          { key: 'location', label: 'Location' },
          { key: 'landSize', label: 'Land Size' },
          { key: 'products', label: 'Products' },
          { key: 'status', label: 'Status' },
          { key: 'joined', label: 'Joined Date' },
          { key: 'email', label: 'Email' },
          { key: 'phone_number', label: 'Phone' },
        ]}
        data={filteredFarmers}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default FarmersManagement;