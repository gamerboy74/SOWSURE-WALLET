import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminHeader from '../components/AdminHeader';

function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="ml-64">
        <AdminHeader />
        <main className="pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;