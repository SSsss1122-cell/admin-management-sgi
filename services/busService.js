'use client';

import { supabase } from '@/lib/supabase';

const busService = {
  // ============ BUS FUNCTIONS ============
  
  async getBusData(busId) {
    try {
      const { data: bus, error: busError } = await supabase
        .from('buses')
        .select('*')
        .eq('id', busId)
        .single();
      if (busError) throw busError;

      const { data: location, error: locationError } = await supabase
        .from('bus_locations')
        .select('*')
        .eq('bus_id', busId)
        .order('timestamp', { ascending: false })
        .limit(1);
      if (locationError) throw locationError;

      return {
        bus: bus,
        location: location?.[0] || null
      };
    } catch (error) {
      console.error('Error fetching bus data:', error);
      return null;
    }
  },

  async getBusLocation(busId) {
    try {
      const { data, error } = await supabase
        .from('bus_locations')
        .select('*')
        .eq('bus_id', busId)
        .order('timestamp', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching location:', error);
      return null;
    }
  },

  // ============ ROUTE FUNCTIONS ============
  
  async getAllRoutes() {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('is_active', true)
      .order('id');
    if (error) return [];
    return data || [];
  },

  async getRouteById(routeId) {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('id', routeId)
      .single();
    if (error) return null;
    return data;
  },

  async createRoute(routeData) {
    const { data, error } = await supabase
      .from('routes')
      .insert([{
        route_name: routeData.route_name,
        start_point: routeData.start_point,
        end_point: routeData.end_point,
        distance_km: routeData.distance_km || null,
        estimated_duration: routeData.estimated_duration || null,
        is_active: true
      }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async updateRoute(routeId, routeData) {
    const { data, error } = await supabase
      .from('routes')
      .update({
        route_name: routeData.route_name,
        start_point: routeData.start_point,
        end_point: routeData.end_point,
        distance_km: routeData.distance_km || null,
        estimated_duration: routeData.estimated_duration || null
      })
      .eq('id', routeId)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async deleteRoute(routeId) {
    const { error } = await supabase
      .from('routes')
      .update({ is_active: false })
      .eq('id', routeId);
    if (error) throw error;
    return true;
  },

  // ============ ROUTE STOPS FUNCTIONS ============
  
  async getRouteStops(routeId) {
    const { data, error } = await supabase
      .from('route_stops')
      .select('*')
      .eq('route_id', routeId)
      .order('sequence', { ascending: true });
    if (error) return [];
    return data || [];
  },

  async addRouteStop(stopData) {
    const { data, error } = await supabase
      .from('route_stops')
      .insert([{
        route_id: stopData.route_id,
        stop_name: stopData.stop_name,
        sequence: stopData.sequence,
        latitude: stopData.latitude,
        longitude: stopData.longitude,
        estimated_time: stopData.estimated_time || null,
        is_major: stopData.is_major || false,
        landmark: stopData.landmark || null
      }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async updateRouteStop(stopId, stopData) {
    const { data, error } = await supabase
      .from('route_stops')
      .update({
        stop_name: stopData.stop_name,
        sequence: stopData.sequence,
        latitude: stopData.latitude,
        longitude: stopData.longitude,
        estimated_time: stopData.estimated_time || null,
        is_major: stopData.is_major || false,
        landmark: stopData.landmark || null
      })
      .eq('id', stopId)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async deleteRouteStop(stopId) {
    const { error } = await supabase
      .from('route_stops')
      .delete()
      .eq('id', stopId);
    if (error) throw error;
    return true;
  },

  // ============ BUS ROUTE ASSIGNMENT FUNCTIONS ============
  
  async getCurrentRouteForBus(busId) {
    const { data, error } = await supabase
      .from('bus_route_assignments')
      .select('*, routes(*)')
      .eq('bus_id', busId)
      .eq('assigned_date', new Date().toISOString().split('T')[0])
      .eq('is_active', true)
      .single();
    if (error) return null;
    return data;
  },

  async getCurrentRouteStops(busId) {
    const assignment = await this.getCurrentRouteForBus(busId);
    if (!assignment) return [];
    return await this.getRouteStops(assignment.route_id);
  },

  async getAllAssignments(date) {
    const queryDate = date || new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('bus_route_assignments')
      .select(`
        *,
        buses(bus_number),
        routes(route_name, start_point, end_point)
      `)
      .eq('assigned_date', queryDate)
      .eq('is_active', true)
      .order('bus_id');
    if (error) return [];
    return data || [];
  },

  async assignRouteToBus(busId, routeId, date, shift = 'full_day') {
    // First deactivate old assignment
    await supabase
      .from('bus_route_assignments')
      .update({ is_active: false })
      .eq('bus_id', busId)
      .eq('assigned_date', date);

    // Insert new assignment
    const { data, error } = await supabase
      .from('bus_route_assignments')
      .insert([{
        bus_id: busId,
        route_id: routeId,
        assigned_date: date,
        shift: shift,
        is_active: true
      }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  // ============ HELPER FUNCTIONS ============
  
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  getCurrentDirection() {
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour < 12) return 'morning';
    if (currentHour >= 12 && currentHour < 20) return 'evening';
    return 'evening';
  }
};

export default busService;