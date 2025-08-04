import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Hash, 
  Save, 
  X,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { RouteInfo } from '../types';
import { getRouteInfos, saveRouteInfo, updateRouteInfo, deleteRouteInfo } from '../utils/supabase-storage';

export const RouteManagement: React.FC = () => {
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    areas: '',
    pincodes: '',
    isActive: true
  });

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const routeInfos = await getRouteInfos();
      setRoutes(routeInfos);
    } catch (error) {
      console.error('Error loading routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      areas: '',
      pincodes: '',
      isActive: true
    });
    setShowAddForm(false);
    setEditingRoute(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a route name');
      return;
    }

    try {
      const routeData: RouteInfo = {
        id: editingRoute ? editingRoute.id : formData.id || `R${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        areas: formData.areas.split(',').map(area => area.trim()).filter(area => area),
        pincodes: formData.pincodes.split(',').map(code => code.trim()).filter(code => code),
        isActive: formData.isActive,
        createdAt: editingRoute ? editingRoute.createdAt : new Date(),
        updatedAt: new Date()
      };

      if (editingRoute) {
        await updateRouteInfo(editingRoute.id, {
          name: routeData.name,
          description: routeData.description,
          areas: routeData.areas,
          pincodes: routeData.pincodes,
          isActive: routeData.isActive
        });
      } else {
        await saveRouteInfo({
          name: routeData.name,
          description: routeData.description,
          areas: routeData.areas,
          pincodes: routeData.pincodes,
          isActive: routeData.isActive
        });
      }

      resetForm();
      await loadRoutes();
      alert(editingRoute ? 'Route updated successfully!' : 'Route created successfully!');
    } catch (error) {
      console.error('Error saving route:', error);
      alert('Error saving route. Please try again.');
    }
  };

  const handleEdit = (route: RouteInfo) => {
    setEditingRoute(route);
    setFormData({
      id: route.id,
      name: route.name,
      description: route.description,
      areas: route.areas.join(', '),
      pincodes: route.pincodes.join(', '),
      isActive: route.isActive
    });
    setShowAddForm(true);
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      await deleteRouteInfo(routeId);
      await loadRoutes();
      alert('Route deleted successfully!');
    } catch (error) {
      console.error('Error deleting route:', error);
      alert('Error deleting route. Please try again.');
    }
  };

  const toggleRouteStatus = async (routeId: string) => {
    try {
      const route = routes.find(r => r.id === routeId);
      if (!route) return;

      await updateRouteInfo(routeId, {
        name: route.name,
        description: route.description,
        areas: route.areas,
        pincodes: route.pincodes,
        isActive: !route.isActive
      });
      
      await loadRoutes();
    } catch (error) {
      console.error('Error updating route status:', error);
      alert('Error updating route status. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading routes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Route Management</h1>
          <p className="text-gray-600">Manage delivery routes, areas, and pincodes</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Route
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingRoute ? 'Edit Route' : 'Add New Route'}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Route ID *
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., R001"
                  disabled={!!editingRoute}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Route Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., City Center Route"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the route coverage"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Areas (comma-separated)
              </label>
              <input
                type="text"
                value={formData.areas}
                onChange={(e) => setFormData({ ...formData, areas: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Downtown, Business District, Mall Area"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Hash className="w-4 h-4 inline mr-1" />
                Pincodes (comma-separated)
              </label>
              <input
                type="text"
                value={formData.pincodes}
                onChange={(e) => setFormData({ ...formData, pincodes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 500001, 500002, 500003"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active Route
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingRoute ? 'Update Route' : 'Create Route'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Routes List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Routes ({routes.length})
          </h2>
        </div>
        
        {routes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No routes found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first delivery route</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Route
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Areas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pincodes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {routes.map((route) => (
                  <tr key={route.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{route.id} - {route.name}</div>
                        <div className="text-sm text-gray-500">{route.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Updated: {route.updatedAt.toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {route.areas.map((area, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {area}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {route.pincodes.map((pincode, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {pincode}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleRouteStatus(route.id)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          route.isActive 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        } transition-colors`}
                      >
                        {route.isActive ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {route.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(route)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(route.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
