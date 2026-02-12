'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  MapPin, 
  Calendar, 
  BookOpen, 
  CreditCard, 
  BarChart3, 
  AlertTriangle, 
  Megaphone, 
  Bell, 
  MessageCircle, 
  Shield,
  School,
  Bus,
  BookCheck,
  Wallet,
  ChartBar,
  Map,
  CalendarDays,
  GraduationCap,
  MessageSquare,
  Eye,
  LogOut,
  User,
  Truck,
  BusFront, // Added for Bus Management
  Gauge, // Added for service metrics
  FileText // Added for documents/expiry
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function MainDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeBuses: 0,
    dailyComplaints: 0,
    totalComplaints: 0,
    totalCommunityMessages: 0,
    totalDrivers: 0,
    totalBuses: 0, // Added for bus count
    busesWithDriver: 0, // Added for assigned buses
    expiringDocuments: 0 // Added for expiring bus documents
  });
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
    // Get admin name from localStorage
    const storedAdminName = localStorage.getItem('adminName');
    if (storedAdminName) {
      setAdminName(storedAdminName);
    } else {
      // If not in localStorage, set default
      setAdminName('Admin');
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [
        studentsData,
        busesData,
        complaintsData,
        communityData,
        driversData
      ] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('buses').select('*'),
        supabase.from('complaints').select('*'),
        supabase.from('community_messages').select('*'),
        supabase.from('drivers').select('*')
      ]);

      const totalStudents = studentsData.data?.length || 0;
      const totalBuses = busesData.data?.length || 0;
      const totalComplaints = complaintsData.data?.length || 0;
      const totalCommunityMessages = communityData.data?.length || 0;
      const totalDrivers = driversData.data?.length || 0;
      
      // Calculate buses with assigned drivers
      const busesWithDriver = busesData.data?.filter(bus => bus.driver_id).length || 0;
      
      // Calculate expiring documents (next 30 days)
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const expiringDocuments = busesData.data?.filter(bus => {
        const pucExpiry = bus.puc_expiry ? new Date(bus.puc_expiry) : null;
        const insuranceExpiry = bus.insurance_expiry ? new Date(bus.insurance_expiry) : null;
        const fitnessExpiry = bus.fitness_expiry ? new Date(bus.fitness_expiry) : null;
        const permitExpiry = bus.permit_expiry ? new Date(bus.permit_expiry) : null;
        
        return [pucExpiry, insuranceExpiry, fitnessExpiry, permitExpiry].some(
          date => date && date <= thirtyDaysFromNow && date >= today
        );
      }).length || 0;

      // Calculate today's complaints
      const today_str = new Date().toDateString();
      const dailyComplaints = complaintsData.data?.filter(complaint => 
        new Date(complaint.created_at).toDateString() === today_str
      ).length || 0;

      setStats({
        totalStudents,
        activeBuses: totalBuses, // Using total buses as active buses for now
        dailyComplaints,
        totalComplaints,
        totalCommunityMessages,
        totalDrivers,
        totalBuses,
        busesWithDriver,
        expiringDocuments
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('adminMobile');
    localStorage.removeItem('adminName');
    router.push('/login');
  };

  // ============================================
  // HOW TO ADD A NEW SECTION:
  // ============================================
  // 1. Add a new icon from lucide-react at the top
  // 2. Add your new category object in the categories array below
  // 3. Add stats in the quickStats array if needed
  // 4. Add a quick action button in the Quick Actions section
  // 5. Create the actual page in the app folder (e.g., /app/buses/page.js)
  // ============================================

  const categories = [
    {
      id: 'student-dashboard',
      name: 'Student Dashboard',
      description: 'Overview of all student activities and statistics',
      icon: Users,
      href: '/dashboard',
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      id: 'drivers',
      name: 'Drivers ',
      description: 'Manage driver details, licenses, and assignments',
      icon: Truck,
      href: '/drivers',
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    // ============================================
    // NEW SECTION: BUS MANAGEMENT
    // Added this section for managing buses
    // ============================================
    {
      id: 'buses',
      name: 'Bus assign',
      description: 'Manage bus fleet, documents, services, and driver assignments',
      icon: BusFront, // Using BusFront icon for buses
      href: '/buses',
      color: 'bg-green-600', // Green color for buses
      textColor: 'text-green-600'
    },
    {
      id: 'fees',
      name: 'Fees Management',
      description: 'Handle fee payments and financial records',
      icon: CreditCard,
      href: '/fees',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      id: 'bus-locations',
      name: 'Bus Tracking',
      description: 'Real-time bus locations and routes',
      icon: MapPin,
      href: '/bus-locations',
      color: 'bg-red-500',
      textColor: 'text-red-600'
    },
    {
      id: 'bus-details',
      name: 'Bus Details',
      description: 'Complete bus information and schedules',
      icon: Bus,
      href: '/bus-details',
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      id: 'complaints',
      name: 'Complaints',
      description: 'Student complaints and issue resolution',
      icon: AlertTriangle,
      href: '/complaints',
      color: 'bg-orange-500',
      textColor: 'text-orange-600'
    },
    {
      id: 'announcements',
      name: 'Announcements',
      description: 'College announcements and notifications',
      icon: Megaphone,
      href: '/announcements',
      color: 'bg-pink-500',
      textColor: 'text-pink-600'
    },
    {
      id: 'notices',
      name: 'Notices',
      description: 'Important notices and circulars',
      icon: Bell,
      href: '/notices',
      color: 'bg-teal-500',
      textColor: 'text-teal-600'
    },
    {
      id: 'community',
      name: 'Community',
      description: 'Student community and discussions',
      icon: MessageCircle,
      href: '/community',
      color: 'bg-lime-500',
      textColor: 'text-lime-600'
    }
    // ============================================
    // TO ADD ANOTHER SECTION:
    // 1. Copy the object above
    // 2. Change id, name, description, icon, href, color, textColor
    // 3. Add comma after previous object
    // Example:
    // {
    //   id: 'your-new-section',
    //   name: 'Your Section Name',
    //   description: 'Description of what this section does',
    //   icon: YourIcon, // Import from lucide-react
    //   href: '/your-page',
    //   color: 'bg-indigo-500', // Choose any color
    //   textColor: 'text-indigo-600'
    // }
    // ============================================
  ];

  // ============================================
  // STATS CARDS - Added Bus related stats
  // ============================================
  const quickStats = [
    { 
      label: 'Total Students', 
      value: stats.totalStudents.toString(), 
      icon: Users, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100' 
    },
    { 
      label: 'Total Buses', 
      value: stats.totalBuses.toString(), 
      icon: BusFront, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100' 
    },
    { 
      label: 'Total Drivers', 
      value: stats.totalDrivers.toString(), 
      icon: Truck, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-100' 
    },
    { 
      label: 'Assigned Buses', 
      value: stats.busesWithDriver.toString(), 
      icon: Bus, 
      color: 'text-emerald-600', 
      bgColor: 'bg-emerald-100' 
    },
    { 
      label: 'Expiring Docs', 
      value: stats.expiringDocuments.toString(), 
      icon: FileText, 
      color: 'text-red-600', 
      bgColor: 'bg-red-100' 
    },
    { 
      label: "Today's Complaints", 
      value: stats.dailyComplaints.toString(), 
      icon: AlertTriangle, 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-100' 
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
                <School className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SIT Admin Portal</h1>
                <p className="text-gray-600">Admin Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-600">Welcome back,</p>
                <p className="font-semibold text-gray-900">
                  {adminName || 'Admin User'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center text-sm bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  <LogOut size={16} className="mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="text-blue-600" size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section with Admin Name */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome back, {adminName || 'Admin'}!
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Manage all student activities, track bus locations, handle fees, 
            manage drivers, monitor bus fleet, and oversee campus operations 
            from one centralized dashboard.
          </p>
        </div>

        {/* Quick Stats - Now includes Bus stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-200">
                <div className={`mx-auto w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${stat.bgColor}`}>
                  <Icon className={stat.color} size={24} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Categories Grid */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Management Categories
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.id}
                  href={category.href}
                  className="group"
                >
                  <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 border border-gray-200 group-hover:border-blue-300">
                    <div className="flex items-start space-x-4">
                      <div className={`${category.color} w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className="text-white" size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-semibold text-lg mb-2 ${category.textColor} group-hover:underline transition-colors`}>
                          {category.name}
                        </h4>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-blue-600 text-sm font-medium group-hover:underline">
                        Access Panel →
                      </span>
                      <div className="w-2 h-2 bg-blue-600 rounded-full group-hover:scale-150 transition-transform"></div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions - Added Bus Management Quick Action */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
          <h3 className="text-2xl font-bold mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/announcements" className="bg-white text-blue-600 hover:bg-blue-50 transition-all rounded-lg p-4 text-left border border-white border-opacity-30 font-medium flex items-center">
              <Megaphone className="w-5 h-5 mr-2" />
              Send Announcement
            </Link>
            <Link href="/notices" className="bg-white text-blue-600 hover:bg-blue-50 transition-all rounded-lg p-4 text-left border border-white border-opacity-30 font-medium flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Create Notice
            </Link>
            {/* ============================================
               NEW QUICK ACTION: Bus Management
               Added this button for quick access to buses
            ============================================ */}
            <Link href="/buses" className="bg-white text-green-600 hover:bg-green-50 transition-all rounded-lg p-4 text-left border border-white border-opacity-30 font-medium flex items-center">
              <BusFront className="w-5 h-5 mr-2" />
              Manage Buses
            </Link>
            <Link href="/drivers" className="bg-white text-purple-600 hover:bg-purple-50 transition-all rounded-lg p-4 text-left border border-white border-opacity-30 font-medium flex items-center">
              <Truck className="w-5 h-5 mr-2" />
              Manage Drivers
            </Link>
            <Link href="/bus-locations" className="bg-white text-blue-600 hover:bg-blue-50 transition-all rounded-lg p-4 text-left border border-white border-opacity-30 font-medium flex items-center">
              <Map className="w-5 h-5 mr-2" />
              Track Buses
            </Link>
            <Link href="/complaints" className="bg-white text-blue-600 hover:bg-blue-50 transition-all rounded-lg p-4 text-left border border-white border-opacity-30 font-medium flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              View Complaints
            </Link>
          </div>
          
          {/* ============================================
             HOW TO ADD MORE QUICK ACTIONS:
             
             Copy this template and add above:
             
             <Link href="/your-page" className="bg-white text-[color]-600 hover:bg-[color]-50 transition-all rounded-lg p-4 text-left border border-white border-opacity-30 font-medium flex items-center">
               <YourIcon className="w-5 h-5 mr-2" />
               Your Button Text
             </Link>
             
             Replace:
             - /your-page with the actual route
             - [color] with your chosen color (blue, green, purple, red, etc.)
             - YourIcon with imported icon
             - Your Button Text with what users should see
            ============================================ */}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center">
                <School className="text-white" size={16} />
              </div>
              <span className="font-semibold text-gray-900">SIT Admin Portal</span>
            </div>
            <div className="text-gray-600 text-sm">
              © 2024 Shetty Institute of Technology. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}