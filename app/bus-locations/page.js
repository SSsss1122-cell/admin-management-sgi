'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bus, Play, Square, LogOut, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DriverLocationPage() {
  const router = useRouter();
  const [driver, setDriver] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Use refs for values that persist across renders
  const locationIntervalRef = useRef(null);
  const watchIdRef = useRef(null);
  const isSharingRef = useRef(false);

  useEffect(() => {
    checkAuth();
    
    // Restore sharing state from localStorage on component mount
    const savedSharingState = localStorage.getItem('isLocationSharing');
    if (savedSharingState === 'true') {
      // Check if we have driver data before starting
      const checkAndRestore = async () => {
        const stored = localStorage.getItem('driverSession');
        if (stored) {
          const parsed = JSON.parse(stored);
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
          setDriver(parsed);
          startPersistentLocationSharing(parsed.bus_id);
        }
      };
      checkAndRestore();
    }

    return () => {
      // Cleanup on unmount (but keep background tracking if sharing)
      if (!isSharingRef.current) {
        stopLocationSharing();
      }
    };
  }, []);

  const checkAuth = async () => {
    const stored = localStorage.getItem('driverSession');
    if (!stored) {
      router.push('/driver/login');
      return;
    }

    const parsed = JSON.parse(stored);
    if (!parsed.driver_id) {
      router.push('/driver/login');
      return;
    }

    if (!parsed.bus_id) {
      try {
        const { data: busData } = await supabase
          .from('buses')
          .select('id, bus_number, route_name')
          .eq('driver_id', parsed.driver_id)
          .single();

        if (busData) {
          parsed.bus_id = busData.id;
          parsed.bus_number = busData.bus_number;
          parsed.route_name = busData.route_name;
          localStorage.setItem('driverSession', JSON.stringify(parsed));
        }
      } catch (err) {
        console.error(err);
      }
    }

    setDriver(parsed);
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('driverSession');
    localStorage.removeItem('isLocationSharing');
    stopLocationSharing();
    router.push('/driver/login');
  };

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });

  const calculateSpeed = (mps) => Math.max(0, mps * 3.6);

  const saveLocation = async (busId, loc) => {
    if (!busId) throw new Error('No bus_id assigned');

    const speed = calculateSpeed(loc.coords.speed || 0);
    const now = new Date().toISOString();

    const { error } = await supabase.from('bus_locations').upsert([
      {
        bus_id: busId,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        speed,
        updated_at: now,
        last_updated: now
      }
    ], {
      onConflict: 'bus_id'
    });

    if (error) {
      console.error('Error saving location:', error);
      throw error;
    }
    
    return loc.coords;
  };

  const updateLocation = async () => {
    if (!driver || !isSharingRef.current) return;
    
    try {
      const loc = await getCurrentLocation();
      const coords = await saveLocation(driver.bus_id, loc);
      setCurrentLocation(coords);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to update location:', err);
      // Don't alert on every error to avoid annoyance
    }
  };

  // Persistent location watcher for background tracking
  const startPersistentLocationSharing = async (busId) => {
    if (!busId || !navigator.geolocation) {
      alert('Location sharing not available');
      return;
    }

    // Clear any existing watcher
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // Store sharing state
    isSharingRef.current = true;
    setIsSharing(true);
    localStorage.setItem('isLocationSharing', 'true');

    // Get initial location
    try {
      const initialLoc = await getCurrentLocation();
      const coords = await saveLocation(busId, initialLoc);
      setCurrentLocation(coords);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Initial location error:', err);
    }

    // Start background location watching
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const coords = await saveLocation(busId, position);
          setCurrentLocation(coords);
          setLastUpdate(new Date());
        } catch (err) {
          console.error('Background location save error:', err);
        }
      },
      (error) => {
        console.error('Location watcher error:', error);
        // Try to restart on error
        if (isSharingRef.current) {
          setTimeout(() => startPersistentLocationSharing(busId), 10000);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );

    // Also set up periodic updates as backup
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }
    
    locationIntervalRef.current = setInterval(updateLocation, 15000);
  };

  const startLocationSharing = async () => {
    if (!driver?.bus_id) {
      alert('No bus assigned to your account');
      return;
    }
    
    await startPersistentLocationSharing(driver.bus_id);
  };

  const stopLocationSharing = () => {
    // Clear the background watcher
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    // Clear the interval
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    
    // Update state
    isSharingRef.current = false;
    setIsSharing(false);
    localStorage.removeItem('isLocationSharing');
    
    console.log('Location sharing stopped');
  };

  const manualUpdateLocation = async () => {
    if (!driver) return;
    setIsUpdating(true);

    try {
      const loc = await getCurrentLocation();
      const coords = await saveLocation(driver.bus_id, loc);
      setCurrentLocation(coords);
      setLastUpdate(new Date());
    } catch (err) {
      alert('Failed to update location: ' + err.message);
    }

    setIsUpdating(false);
  };

  const formatCoord = (coord) => (coord ? coord.toFixed(6) : '0.000000');
  const formatSpeed = (speed) => (speed ? speed.toFixed(1) + ' km/h' : '0 km/h');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700 text-lg font-medium">Loading driver info...</p>
      </div>
    );
  }

  if (!driver) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-50 p-4">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-md">
        <div className="flex items-center space-x-3">
          <Bus size={38} className="text-blue-600" />
          <div>
            <h1 className="font-bold text-2xl text-gray-800">Driver: {driver.driver_name}</h1>
            <p className="text-sm text-gray-600">Bus: {driver.bus_number || 'Not assigned'}</p>
            <p className="text-xs text-gray-500">Route: {driver.route_name || 'Not specified'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isSharing && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">Sharing Live Location</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-600 font-semibold rounded-lg hover:bg-red-200 transition"
          >
            <LogOut size={18} /> <span>Logout</span>
          </button>
        </div>
      </header>

      {/* LOCATION CARD */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h2 className="font-bold text-xl text-gray-800 mb-4">Current Location</h2>

        {currentLocation ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
              <p className="text-gray-600">Latitude</p>
              <p className="font-mono text-lg font-semibold text-gray-900">
                {formatCoord(currentLocation.latitude)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
              <p className="text-gray-600">Longitude</p>
              <p className="font-mono text-lg font-semibold text-gray-900">
                {formatCoord(currentLocation.longitude)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
              <p className="text-gray-600">Speed</p>
              <p className="text-xl font-bold text-gray-900">
                {formatSpeed(calculateSpeed(currentLocation.speed))}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">Location not yet available</p>
        )}

        <div className="mt-4 text-sm text-gray-500">
          <p>Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}</p>
          <p className="mt-1">Location sharing will continue in background until you stop it.</p>
        </div>
      </div>

      {/* BUTTONS */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
        {!isSharing ? (
          <button
            onClick={startLocationSharing}
            className="flex-1 py-4 bg-green-600 text-white rounded-lg font-semibold flex justify-center items-center space-x-2 hover:bg-green-700 transition shadow-lg"
          >
            <Play size={20} /> 
            <span className="text-lg">Start Sharing Live Location</span>
          </button>
        ) : (
          <button
            onClick={stopLocationSharing}
            className="flex-1 py-4 bg-red-600 text-white rounded-lg font-semibold flex justify-center items-center space-x-2 hover:bg-red-700 transition shadow-lg"
          >
            <Square size={20} /> 
            <span className="text-lg">Stop Sharing Location</span>
          </button>
        )}

        <button
          onClick={manualUpdateLocation}
          disabled={isUpdating}
          className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-semibold flex justify-center items-center space-x-2 hover:bg-blue-700 transition shadow-lg"
        >
          <RefreshCw size={20} className={isUpdating ? 'animate-spin' : ''} />
          <span className="text-lg">{isUpdating ? 'Updating...' : 'Update Now'}</span>
        </button>
      </div>

      {/* INFO PANEL */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-bold text-yellow-800 mb-2">Important Information:</h3>
        <ul className="text-yellow-700 text-sm space-y-1">
          <li>• Location sharing will continue even when app is minimized or in background</li>
          <li>• Only stops when you click "Stop Sharing Location"</li>
          <li>• Keep GPS enabled for accurate tracking</li>
          <li>• Battery optimization may affect accuracy on some devices</li>
        </ul>
      </div>
    </div>
  );
}