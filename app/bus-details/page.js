'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bus, 
  Plus, 
  Search,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Gauge,
  Wrench,
  Clock,
  ArrowLeft,
  User,
  ChevronDown,
  ChevronUp,
  Phone
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function BusDetails() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBus, setExpandedBus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const router = useRouter();

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching buses with drivers...');
      
      const { data, error } = await supabase
        .from('buses')
        .select(`
          *,
          drivers (
            id,
            name,
            contact,
            license_no
          )
        `)
        .order('bus_number');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched buses with drivers:', data);
      setBuses(data || []);
      
    } catch (error) {
      console.error('Error fetching buses:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const toggleBusExpansion = (busId) => {
    setExpandedBus(expandedBus === busId ? null : busId);
  };

  // Function to calculate remaining days
  const getRemainingDays = (expiryDate) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - today.getTime();
    const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry;
  };

  // Function to check expiry status and get display info
  const getExpiryInfo = (expiryDate) => {
    if (!expiryDate) {
      return {
        status: 'not-set',
        text: 'Not set',
        badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300',
        daysText: '',
        days: null
      };
    }
    
    const days = getRemainingDays(expiryDate);
    
    if (days < 0) {
      return {
        status: 'expired',
        text: 'Expired',
        badgeClass: 'bg-red-100 text-red-800 border border-red-300',
        daysText: `${Math.abs(days)} days ago`,
        days: days
      };
    } else if (days <= 7) {
      return {
        status: 'critical',
        text: 'Critical',
        badgeClass: 'bg-red-100 text-red-800 border border-red-300',
        daysText: `${days} days left`,
        days: days
      };
    } else if (days <= 30) {
      return {
        status: 'warning',
        text: 'Expiring Soon',
        badgeClass: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
        daysText: `${days} days left`,
        days: days
      };
    } else {
      return {
        status: 'valid',
        text: 'Valid',
        badgeClass: 'bg-green-100 text-green-800 border border-green-300',
        daysText: `${days} days left`,
        days: days
      };
    }
  };

  // Function to format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Function to get service status
  const getServiceInfo = (nextServiceDate, currentKm, nextServiceKm) => {
    if (!nextServiceDate && !nextServiceKm) {
      return {
        status: 'not-set',
        text: 'Not set',
        badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300',
        daysText: '',
        kmText: ''
      };
    }

    let status = 'valid';
    let daysText = '';
    let kmText = '';

    // Check date-based service
    if (nextServiceDate) {
      const days = getRemainingDays(nextServiceDate);
      if (days <= 0) {
        status = 'critical';
        daysText = `Overdue by ${Math.abs(days)} days`;
      } else if (days <= 7) {
        status = 'warning';
        daysText = `${days} days left`;
      } else {
        daysText = `${days} days left`;
      }
    }

    // Check KM-based service
    if (nextServiceKm && currentKm) {
      const current = parseInt(currentKm);
      const next = parseInt(nextServiceKm);
      const remainingKm = next - current;
      
      if (remainingKm <= 0) {
        status = 'critical';
        kmText = `Overdue by ${Math.abs(remainingKm)} km`;
      } else if (remainingKm <= 500) {
        status = status === 'valid' ? 'warning' : status;
        kmText = `${remainingKm} km left`;
      } else {
        kmText = `${remainingKm} km left`;
      }
    }

    const badgeClass = 
      status === 'critical' ? 'bg-red-100 text-red-800 border border-red-300' :
      status === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
      'bg-green-100 text-green-800 border border-green-300';

    return {
      status,
      text: status === 'critical' ? 'Due Now' : status === 'warning' ? 'Due Soon' : 'Scheduled',
      badgeClass,
      daysText,
      kmText
    };
  };

  // Filter buses based on search term
  const filteredBuses = buses.filter(bus =>
    bus.bus_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bus.route_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bus.drivers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const expiredDocumentsCount = buses.filter(bus => 
    getExpiryInfo(bus.puc_expiry).status === 'expired' ||
    getExpiryInfo(bus.insurance_expiry).status === 'expired' ||
    getExpiryInfo(bus.fitness_expiry).status === 'expired' ||
    getExpiryInfo(bus.permit_expiry).status === 'expired'
  ).length;

  const criticalAlertsCount = buses.filter(bus => 
    getExpiryInfo(bus.puc_expiry).status === 'critical' ||
    getExpiryInfo(bus.insurance_expiry).status === 'critical' ||
    getExpiryInfo(bus.fitness_expiry).status === 'critical' ||
    getExpiryInfo(bus.permit_expiry).status === 'critical' ||
    getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).status === 'critical'
  ).length;

  const dueForServiceCount = buses.filter(bus => 
    getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).status !== 'valid'
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading buses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Buses</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchBuses}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto"
          >
            <RefreshCw size={16} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
              title="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Bus Details</h1>
              <p className="text-xs text-gray-600">Manage bus information</p>
            </div>
          </div>
          <Link
            href="/bus-details/add"
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-8">
        {/* Desktop Header */}
        <div className="hidden lg:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
              title="Go back"
            >
              <ArrowLeft size={20} />
              <span className="ml-2 text-sm font-medium">Back</span>
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bus Details</h1>
              <p className="text-gray-600 mt-1">Manage bus information and documents</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/bus-details/add"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus size={20} />
              <span>Add Bus</span>
            </Link>
          </div>
        </div>

        {/* Search Bar - Mobile Optimized */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 border border-gray-200 mb-4 lg:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by bus number, route, or driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
            />
          </div>
        </div>

        {/* Summary Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-6 mb-4 lg:mb-8">
          {/* Expired Documents Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Expired Docs</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 mt-1">
                  {expiredDocumentsCount}
                </p>
              </div>
              <div className="bg-red-100 p-2 sm:p-3 rounded-lg">
                <AlertTriangle className="text-red-600" size={18} />
              </div>
            </div>
          </div>

          {/* Critical Alerts Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Critical</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 mt-1">
                  {criticalAlertsCount}
                </p>
              </div>
              <div className="bg-yellow-100 p-2 sm:p-3 rounded-lg">
                <Clock className="text-yellow-600" size={18} />
              </div>
            </div>
          </div>

          {/* Due for Service Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Service Due</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 mt-1">
                  {dueForServiceCount}
                </p>
              </div>
              <div className="bg-blue-100 p-2 sm:p-3 rounded-lg">
                <Wrench className="text-blue-600" size={18} />
              </div>
            </div>
          </div>

          {/* Total Buses Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Buses</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-1">{buses.length}</p>
              </div>
              <div className="bg-green-100 p-2 sm:p-3 rounded-lg">
                <Bus className="text-green-600" size={18} />
              </div>
            </div>
          </div>
        </div>

        {filteredBuses.length === 0 ? (
          <div className="text-center py-12">
            <Bus className="mx-auto text-gray-400" size={64} />
            <h3 className="mt-4 text-xl font-medium text-gray-900">No buses found</h3>
            <p className="text-gray-600 mt-2 mb-6">
              {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first bus to the system.'}
            </p>
            <Link
              href="/bus-details/add"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2 transition-colors"
            >
              <Plus size={20} />
              <span>Add Your First Bus</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {filteredBuses.map((bus) => (
                <div key={bus.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Bus Header */}
                  <div 
                    className="p-4 border-b border-gray-200 cursor-pointer"
                    onClick={() => toggleBusExpansion(bus.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">Bus {bus.bus_number}</h3>
                        <p className="text-gray-600 text-sm">{bus.route_name || 'No route set'}</p>
                        {bus.drivers && (
                          <div className="flex items-center mt-1">
                            <User size={14} className="mr-2 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">{bus.drivers.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          getExpiryInfo(bus.puc_expiry).status === 'expired' || 
                          getExpiryInfo(bus.insurance_expiry).status === 'expired' ||
                          getExpiryInfo(bus.fitness_expiry).status === 'expired' ||
                          getExpiryInfo(bus.permit_expiry).status === 'expired' ? 
                          'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300'
                        }`}>
                          {getExpiryInfo(bus.puc_expiry).status === 'expired' || 
                           getExpiryInfo(bus.insurance_expiry).status === 'expired' ||
                           getExpiryInfo(bus.fitness_expiry).status === 'expired' ||
                           getExpiryInfo(bus.permit_expiry).status === 'expired' ? 
                           'Issues' : 'OK'}
                        </span>
                        {expandedBus === bus.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  {expandedBus === bus.id && (
                    <div className="p-4 space-y-4">
                      {/* Driver Information */}
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <h4 className="font-medium text-gray-900 text-sm mb-2">Driver Information</h4>
                        {bus.drivers ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center">
                              <User size={14} className="mr-2 text-blue-600" />
                              <span className="font-semibold text-gray-900">{bus.drivers.name}</span>
                            </div>
                            {bus.drivers.contact && (
                              <div className="flex items-center">
                                <Phone size={14} className="mr-2 text-green-600" />
                                <span className="text-gray-700">{bus.drivers.contact}</span>
                              </div>
                            )}
                            {bus.drivers.license_no && (
                              <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-300">
                                License: {bus.drivers.license_no}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-300">No driver assigned</p>
                        )}
                      </div>

                      {/* Document Expiry */}
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm mb-3">Document Expiry</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'PUC', expiry: bus.puc_expiry },
                            { label: 'Insurance', expiry: bus.insurance_expiry },
                            { label: 'Fitness', expiry: bus.fitness_expiry },
                            { label: 'Permit', expiry: bus.permit_expiry }
                          ].map((doc) => {
                            const info = getExpiryInfo(doc.expiry);
                            return (
                              <div key={doc.label} className="text-center">
                                <div className={`text-xs px-2 py-1 rounded-full mb-1 ${info.badgeClass}`}>
                                  {info.text}
                                </div>
                                <div className="text-xs font-medium text-gray-700">{doc.label}</div>
                                <div className="text-xs text-gray-600">{formatDate(doc.expiry)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Service Information */}
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm mb-3">Service Information</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Next Service</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).badgeClass
                            }`}>
                              {getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).text}
                            </span>
                          </div>
                          {bus.current_km && (
                            <div className="flex items-center text-sm text-gray-700">
                              <Gauge size={14} className="mr-2 text-blue-600" />
                              <span className="font-medium">Current KM:</span>
                              <span className="ml-1 text-gray-900">{bus.current_km}</span>
                            </div>
                          )}
                          {bus.last_service_date && (
                            <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                              Last service: {formatDate(bus.last_service_date)}
                              {bus.last_service_km && ` at ${bus.last_service_km} KM`}
                            </div>
                          )}
                        </div>
                      </div>

                      {bus.remarks && (
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm mb-2">Remarks</h4>
                          <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded border border-gray-200">{bus.remarks}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Buses List</h2>
                <p className="text-gray-600">Total {filteredBuses.length} bus{filteredBuses.length !== 1 ? 'es' : ''}</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bus Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document Expiry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service Information
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBuses.map((bus) => (
                      <tr key={bus.id} className="hover:bg-gray-50">
                        {/* Bus Details */}
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="text-lg font-bold text-gray-900">
                              {bus.bus_number}
                            </div>
                            <div className="text-sm text-gray-600">
                              Route: {bus.route_name || 'Not set'}
                            </div>
                            {bus.remarks && (
                              <div className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                {bus.remarks}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Driver Information */}
                        <td className="px-6 py-4">
                          {bus.drivers ? (
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <User size={16} className="mr-2 text-blue-600" />
                                <span className="text-sm font-semibold text-gray-900">{bus.drivers.name}</span>
                              </div>
                              {bus.drivers.contact && (
                                <div className="flex items-center text-sm text-gray-700">
                                  <Phone size={14} className="mr-2 text-green-600" />
                                  {bus.drivers.contact}
                                </div>
                              )}
                              {bus.drivers.license_no && (
                                <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-300">
                                  License: {bus.drivers.license_no}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-300">Not assigned</span>
                          )}
                        </td>

                        {/* Document Expiry */}
                        <td className="px-6 py-4">
                          <div className="space-y-3">
                            {[
                              { label: 'PUC', expiry: bus.puc_expiry },
                              { label: 'Insurance', expiry: bus.insurance_expiry },
                              { label: 'Fitness', expiry: bus.fitness_expiry },
                              { label: 'Permit', expiry: bus.permit_expiry }
                            ].map((doc) => {
                              const info = getExpiryInfo(doc.expiry);
                              return (
                                <div key={doc.label}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-700">{doc.label}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${info.badgeClass}`}>
                                      {info.text}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>{formatDate(doc.expiry)}</span>
                                    <span>{info.daysText}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Service Information */}
                        <td className="px-6 py-4">
                          <div className="space-y-3">
                            {/* Next Service */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">Next Service</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).badgeClass}`}>
                                  {getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).text}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {bus.next_service_due && (
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>Date: {formatDate(bus.next_service_due)}</span>
                                    <span>{getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).daysText}</span>
                                  </div>
                                )}
                                {bus.next_service_km && bus.current_km && (
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>KM: {bus.next_service_km}</span>
                                    <span>{getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).kmText}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Current Status */}
                            <div className="space-y-2">
                              {bus.current_km && (
                                <div className="flex items-center space-x-2 text-sm text-gray-700">
                                  <Gauge size={14} className="text-blue-600" />
                                  <span className="font-medium">Current KM:</span>
                                  <span className="text-gray-900">{bus.current_km}</span>
                                </div>
                              )}
                              {bus.last_service_date && (
                                <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                  Last service: {formatDate(bus.last_service_date)}
                                  {bus.last_service_km && ` at ${bus.last_service_km} KM`}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}