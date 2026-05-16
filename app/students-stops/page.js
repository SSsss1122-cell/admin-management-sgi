'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false })
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false })

export default function StudentsStopsPage() {
  const [L, setL] = useState(null)
  const [supabase, setSupabase] = useState(null)
  const [buses, setBuses] = useState([])
  const [selectedBus, setSelectedBus] = useState(null)
  const [direction, setDirection] = useState('morning')
  const [busStops, setBusStops] = useState([])
  const [routePositions, setRoutePositions] = useState([])
  const [selectedStop, setSelectedStop] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [stopStudents, setStopStudents] = useState([])
  const [studentDetails, setStudentDetails] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(13)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mapCenter, setMapCenter] = useState([17.289382, 76.869064])
  const [mapReady, setMapReady] = useState(false)
  const [busColors, setBusColors] = useState({})
  const mapRef = useRef(null)

  const routeColors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2']

  useEffect(() => { initApp() }, [])

  const initApp = async () => {
    try {
      const leaflet = (await import('leaflet')).default
      delete leaflet.Icon.Default.prototype._getIconUrl
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })
      setL(leaflet)

      const { createClient } = await import('@supabase/supabase-js')
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (url && key) {
        const client = createClient(url, key)
        setSupabase(client)
        await loadBuses(client)
      } else {
        loadDemoData()
      }
    } catch (err) {
      console.error('Init error:', err)
      loadDemoData()
    } finally {
      setLoading(false)
    }
  }

  const loadBuses = async (client) => {
    try {
      const { data, error } = await client
        .from('buses')
        .select('*')
        .eq('is_active', true)
        .order('bus_number')

      if (error) throw error
      
      if (data?.length) {
        const colors = {}
        data.forEach((bus, i) => { colors[bus.id] = routeColors[i % routeColors.length] })
        setBusColors(colors)
        setBuses(data)
        await selectBus(data[0], 'morning', client)
      } else {
        loadDemoData()
      }
    } catch (err) {
      console.error('Load buses error:', err)
      loadDemoData()
    }
  }

  const selectBus = async (bus, dir = 'morning', client = supabase) => {
    setSelectedBus(bus)
    setDirection(dir)
    setSelectedStop(null)
    setStopStudents([])
    setSidebarOpen(false)
    setRoutePositions([])

    if (!client) return

    try {
      const { data: stops, error: stopsErr } = await client
        .from('bus_stops')
        .select('*')
        .eq('bus_id', bus.id)
        .eq('direction', dir)
        .order('sequence')

      if (stopsErr) throw stopsErr
      if (!stops?.length) { setBusStops([]); setRoutePositions([]); return }

      const stopIds = stops.map(s => s.id)
      const { data: studentStopsData } = await client
        .from('students_stops')
        .select('stop_id, student_id')
        .in('stop_id', stopIds)

      const stopCountMap = {}
      const allStudentIds = new Set()
      
      if (studentStopsData) {
        studentStopsData.forEach(ss => {
          stopCountMap[ss.stop_id] = (stopCountMap[ss.stop_id] || 0) + 1
          if (ss.student_id) allStudentIds.add(ss.student_id)
        })
      }

      const studentsMap = {}
      if (allStudentIds.size > 0) {
        const ids = Array.from(allStudentIds)
        for (let i = 0; i < ids.length; i += 100) {
          const chunk = ids.slice(i, i + 100)
          const { data: studentsData } = await client
            .from('students')
            .select('*')
            .in('id', chunk)
          if (studentsData) studentsData.forEach(s => { studentsMap[s.id] = s })
        }
      }

      const stopStudentsMap = {}
      if (studentStopsData) {
        studentStopsData.forEach(ss => {
          if (!stopStudentsMap[ss.stop_id]) stopStudentsMap[ss.stop_id] = []
          if (studentsMap[ss.student_id]) stopStudentsMap[ss.stop_id].push(studentsMap[ss.student_id])
        })
      }

      const enrichedStops = stops.map(stop => ({
        ...stop,
        student_count: stopCountMap[stop.id] || 0,
        students_list: stopStudentsMap[stop.id] || []
      }))

      setBusStops(enrichedStops)

      const positions = enrichedStops
        .filter(s => s.latitude && s.longitude)
        .map(s => [parseFloat(s.latitude), parseFloat(s.longitude)])

      if (positions.length >= 2) setRoutePositions(positions)
      if (enrichedStops.length > 0) setMapCenter([parseFloat(enrichedStops[0].latitude), parseFloat(enrichedStops[0].longitude)])

    } catch (err) {
      console.error('Select bus error:', err)
    }
  }

  const handleDirectionChange = (dir) => {
    if (selectedBus) selectBus(selectedBus, dir)
  }

  const showStudentsForStop = async (stop) => {
    if (!stop) return
    setSelectedStop(stop)
    setSelectedStudent(null)
    setSidebarOpen(false)
    
    if (stop.students_list && stop.students_list.length > 0) {
      setStopStudents(stop.students_list)
      return
    }
    
    if (supabase && stop.id) {
      try {
        const { data: ssData } = await supabase
          .from('students_stops')
          .select('student_id')
          .eq('stop_id', stop.id)

        if (ssData && ssData.length > 0) {
          const studentIds = ssData.map(s => s.student_id).filter(Boolean)
          const { data: students } = await supabase
            .from('students')
            .select('*')
            .in('id', studentIds)
          setStopStudents(students || [])
        } else {
          setStopStudents([])
        }
      } catch (err) {
        console.error('Error fetching students:', err)
        setStopStudents([])
      }
    }
  }

  const handleStudentClick = (student) => {
    setSelectedStudent(student)
    setStudentDetails(student)
    setSidebarOpen(true)

    // Fetch more details from Supabase in background
    if (supabase && student.id && !String(student.id).startsWith('s')) {
      supabase.from('students').select('*').eq('id', student.id).single()
        .then(({ data: fullStudent, error }) => {
          if (!error && fullStudent) {
            supabase.from('students_stops').select('stop_id, assigned_at').eq('student_id', student.id).single()
              .then(({ data: ssData }) => {
                if (ssData?.stop_id) {
                  supabase.from('bus_stops').select('id, stop_name').eq('id', ssData.stop_id).single()
                    .then(({ data: bs }) => {
                      setStudentDetails({ ...fullStudent, assigned_stop: bs, assigned_at: ssData?.assigned_at })
                    })
                } else {
                  setStudentDetails(fullStudent)
                }
              })
          }
        })
        .catch(err => console.error('Error:', err))
    }
  }

  const loadDemoData = () => {
    setBuses([
      { id: 1, bus_number: 'BUS-001', route_name: 'North Campus Route' },
      { id: 2, bus_number: 'BUS-002', route_name: 'South City Route' }
    ])
    setBusColors({ 1: routeColors[0], 2: routeColors[1] })
    setDirection('morning')
    setSelectedBus({ id: 1, bus_number: 'BUS-001', route_name: 'North Campus Route' })
    
    setBusStops([
      { id: 1, stop_name: "Ramtirth Temple", latitude: 17.289382, longitude: 76.869064, sequence: 1, bus_id: 1, student_count: 3, direction: 'morning',
        students_list: [
          { id: 's1', full_name: 'Rahul Sharma', phone: '9876543210', class: '10', division: 'A', branch: 'Science', semester: '4', usn: 'USN001', total_fees: 50000, paid_amount: 50000, due_amount: 0, fees_due: false },
          { id: 's2', full_name: 'Priya Patel', phone: '9876543211', class: '9', division: 'B', branch: 'Commerce', semester: '3', usn: 'USN002', total_fees: 45000, paid_amount: 25000, due_amount: 20000, fees_due: true },
          { id: 's3', full_name: 'Amit Kumar', phone: '9876543212', class: '11', division: 'A', branch: 'Arts', semester: '5', usn: 'USN003', total_fees: 55000, paid_amount: 55000, due_amount: 0, fees_due: false },
        ]
      },
      { id: 2, stop_name: "Market Square", latitude: 17.295382, longitude: 76.875064, sequence: 2, bus_id: 1, student_count: 2, direction: 'morning',
        students_list: [
          { id: 's4', full_name: 'Sneha Reddy', phone: '9876543213', class: '8', division: 'C', branch: 'Science', semester: '2', usn: 'USN004', total_fees: 40000, paid_amount: 40000, due_amount: 0, fees_due: false },
          { id: 's5', full_name: 'Vikram Singh', phone: '9876543214', class: '12', division: 'A', branch: 'Commerce', semester: '6', usn: 'USN005', total_fees: 60000, paid_amount: 30000, due_amount: 30000, fees_due: true },
        ]
      },
      { id: 3, stop_name: "School Junction", latitude: 17.301382, longitude: 76.881064, sequence: 3, bus_id: 1, student_count: 5, direction: 'morning',
        students_list: [
          { id: 's6', full_name: 'Deepak Verma', phone: '9876543215', class: '10', division: 'B', branch: 'Science', semester: '4', usn: 'USN006', total_fees: 50000, paid_amount: 50000, due_amount: 0, fees_due: false },
          { id: 's7', full_name: 'Ananya Gupta', phone: '9876543216', class: '9', division: 'A', branch: 'Arts', semester: '3', usn: 'USN007', total_fees: 45000, paid_amount: 45000, due_amount: 0, fees_due: false },
          { id: 's8', full_name: 'Rajesh Joshi', phone: '9876543217', class: '11', division: 'C', branch: 'Commerce', semester: '5', usn: 'USN008', total_fees: 55000, paid_amount: 20000, due_amount: 35000, fees_due: true },
          { id: 's9', full_name: 'Meera Nair', phone: '9876543218', class: '8', division: 'A', branch: 'Science', semester: '2', usn: 'USN009', total_fees: 40000, paid_amount: 40000, due_amount: 0, fees_due: false },
          { id: 's10', full_name: 'Karan Malhotra', phone: '9876543219', class: '12', division: 'B', branch: 'Arts', semester: '6', usn: 'USN010', total_fees: 60000, paid_amount: 60000, due_amount: 0, fees_due: false },
        ]
      },
      { id: 4, stop_name: "Shetty College", latitude: 17.307382, longitude: 76.887064, sequence: 4, bus_id: 1, student_count: 4, direction: 'morning',
        students_list: [
          { id: 's11', full_name: 'Pooja Desai', phone: '9876543220', class: '10', division: 'C', branch: 'Commerce', semester: '4', usn: 'USN011', total_fees: 50000, paid_amount: 35000, due_amount: 15000, fees_due: true },
          { id: 's12', full_name: 'Arun Thomas', phone: '9876543221', class: '9', division: 'B', branch: 'Science', semester: '3', usn: 'USN012', total_fees: 45000, paid_amount: 45000, due_amount: 0, fees_due: false },
          { id: 's13', full_name: 'Divya Sharma', phone: '9876543222', class: '11', division: 'A', branch: 'Arts', semester: '5', usn: 'USN013', total_fees: 55000, paid_amount: 55000, due_amount: 0, fees_due: false },
          { id: 's14', full_name: 'Nitin Patel', phone: '9876543223', class: '8', division: 'C', branch: 'Commerce', semester: '2', usn: 'USN014', total_fees: 40000, paid_amount: 15000, due_amount: 25000, fees_due: true },
        ]
      },
    ])
    
    setRoutePositions([[17.289382, 76.869064],[17.295382, 76.875064],[17.301382, 76.881064],[17.307382, 76.887064]])
    setMapCenter([17.289382, 76.869064])
  }

  const getBusColor = (busId) => busColors[busId] || '#6b7280'

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="h-screen w-full flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full z-10 shadow-md">
        <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white text-xl">🚌</span>
            </div>
            <div>
              <h1 className="text-gray-800 font-bold text-lg">Bus Transport</h1>
              <p className="text-gray-500 text-xs">Click stop to see students</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => handleDirectionChange('morning')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${direction === 'morning' ? 'bg-amber-400 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              ☀️ Morning
            </button>
            <button onClick={() => handleDirectionChange('evening')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${direction === 'evening' ? 'bg-indigo-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              🌙 Evening
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Buses ({buses.length})</h3>
          {buses.map(bus => {
            const color = getBusColor(bus.id)
            const isSelected = selectedBus?.id === bus.id
            return (
              <button key={bus.id} onClick={() => selectBus(bus, direction)}
                className={`w-full text-left p-4 rounded-xl mb-2 transition-all border-2 ${isSelected ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: isSelected ? color : '#f3f4f6', color: isSelected ? 'white' : '#6b7280' }}>🚌</div>
                  <div>
                    <p className="font-bold text-gray-800">{bus.bus_number}</p>
                    <p className="text-xs text-gray-500">{bus.route_name || 'Unnamed Route'}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {busStops.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 max-h-72 overflow-y-auto">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Stops • {direction}</h4>
            {busStops.map((stop, i) => (
              <div key={stop.id} onClick={() => showStudentsForStop(stop)}
                className={`flex items-center justify-between py-2.5 px-3 rounded-lg cursor-pointer transition-all mb-1 ${
                  selectedStop?.id === stop.id ? 'bg-blue-100 border border-blue-300 shadow-sm' : 'hover:bg-gray-100 border border-transparent'
                }`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                    style={{ background: i === 0 ? '#10b981' : i === busStops.length - 1 ? '#ef4444' : getBusColor(selectedBus?.id) }}>
                    {i + 1}
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{stop.stop_name}</span>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{stop.student_count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {L && (
          <MapContainer
            key={`${selectedBus?.id || 'default'}-${direction}`}
            center={mapCenter}
            zoom={15}
            className="h-full w-full z-0"
            zoomControl={true}
            ref={mapRef}
            whenReady={() => setMapReady(true)}
            whenCreated={(mapInstance) => {
              mapInstance.on('zoomend', () => setZoomLevel(mapInstance.getZoom()))
            }}
          >
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {mapReady && routePositions.length >= 2 && (
              <Polyline positions={routePositions} pathOptions={{
                color: selectedBus ? getBusColor(selectedBus.id) : '#2563eb', weight: 5, opacity: 0.7,
              }} />
            )}

            {mapReady && busStops.map((stop, index) => {
              const count = stop.student_count || 0
              const totalStops = busStops.length
              const markerColor = index === 0 ? '#10b981' : index === totalStops - 1 ? '#ef4444' : getBusColor(selectedBus?.id)
              const isSelected = selectedStop?.id === stop.id

              return (
                <Marker
                  key={stop.id}
                  position={[parseFloat(stop.latitude), parseFloat(stop.longitude)]}
                  icon={L.divIcon({
                    className: 'stop-marker',
                    html: `<div style="position:relative;width:${isSelected?'50px':'40px'};height:${isSelected?'50px':'40px'};background:${markerColor};border-radius:${isSelected?'14px':'50%'};display:flex;align-items:center;justify-content:center;border:3px solid white;font-weight:bold;font-size:${isSelected?'16px':'14px'};color:white;box-shadow:0 4px 15px rgba(0,0,0,0.4);cursor:pointer;">${index+1}${count>0?`<span style="position:absolute;top:-10px;right:-10px;background:#ef4444;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;">${count}</span>`:''}</div>`,
                    iconSize: [isSelected?50:40, isSelected?50:40],
                    iconAnchor: [isSelected?25:20, isSelected?25:20],
                  })}
                  eventHandlers={{ click: () => showStudentsForStop(stop) }}
                >
                  <Tooltip permanent direction="top" offset={[0, -24]}>
                    <div className="bg-white px-3 py-1.5 rounded-xl shadow-lg border border-gray-200 text-center">
                      <p className="text-xs font-bold text-gray-800">{stop.stop_name}</p>
                      <p className="text-xs text-gray-500 font-medium">{count} students</p>
                    </div>
                  </Tooltip>
                </Marker>
              )
            })}

            {/* Student Avatars around selected stop */}
            {mapReady && selectedStop && stopStudents.length > 0 && stopStudents.map((student, i) => {
              const angle = (2 * Math.PI * i) / stopStudents.length
              const r = 0.0008
              const initials = (student.full_name || student.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
              
              return (
                <Marker
                  key={student.id}
                  position={[parseFloat(selectedStop.latitude)+r*Math.cos(angle), parseFloat(selectedStop.longitude)+r*Math.sin(angle)]}
                  icon={L.divIcon({
                    className: 'student-marker',
                    html: `<div style="width:44px;height:44px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 15px rgba(99,102,241,0.5);cursor:pointer;font-size:15px;font-weight:bold;color:white;flex-direction:column;">${initials}</div>`,
                    iconSize: [44, 44],
                    iconAnchor: [22, 22],
                  })}
                  eventHandlers={{ click: () => handleStudentClick(student) }}
                >
                  <Tooltip direction="top">
                    <div className="bg-white px-3 py-2 rounded-xl shadow-lg border border-gray-200 text-center">
                      <p className="text-sm font-bold text-gray-800">{student.full_name || student.name}</p>
                      <p className="text-xs text-gray-500">{student.class || ''} {student.division || ''} • {student.branch || ''}</p>
                    </div>
                  </Tooltip>
                </Marker>
              )
            })}
          </MapContainer>
        )}

        {selectedStop && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="bg-white rounded-2xl px-6 py-3 shadow-xl border border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-lg">📍</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{selectedStop.stop_name}</p>
                <p className="text-xs text-gray-500">{stopStudents.length} students • Click a student card for full details</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Student Details Sidebar */}
      {sidebarOpen && studentDetails && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[1999] backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-[2000] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Student Profile</h2>
                <button onClick={() => setSidebarOpen(false)} 
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Profile Card */}
              <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <span className="text-3xl font-bold">{(studentDetails.full_name || '?').charAt(0)}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">{studentDetails.full_name || studentDetails.name || 'Unknown'}</h3>
                  <p className="text-white/80 text-sm mt-1 font-medium">{studentDetails.usn || 'No USN'}</p>
                  {studentDetails.email && <p className="text-white/60 text-xs mt-1">{studentDetails.email}</p>}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📞</span>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Phone</p>
                  </div>
                  <p className="text-base font-bold text-gray-900">{studentDetails.phone || 'Not provided'}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📚</span>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Class</p>
                  </div>
                  <p className="text-base font-bold text-gray-900">{studentDetails.class || '-'} {studentDetails.division || ''}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🏛️</span>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Branch</p>
                  </div>
                  <p className="text-base font-bold text-gray-900">{studentDetails.branch || 'Not specified'}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📅</span>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Semester</p>
                  </div>
                  <p className="text-base font-bold text-gray-900">{studentDetails.semester || '-'}</p>
                </div>
              </div>

              {/* Fee Details */}
              <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">💰</span>
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Fee Details</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600 font-medium">Total Fees</span>
                    <span className="text-lg font-bold text-gray-900">₹{Number(studentDetails.total_fees || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600 font-medium">Paid Amount</span>
                    <span className="text-lg font-bold text-green-600">₹{Number(studentDetails.paid_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600 font-medium">Due Amount</span>
                    <span className={`text-lg font-bold ${(studentDetails.due_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{Number(studentDetails.due_amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <span className={`inline-block px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                      studentDetails.fees_due 
                        ? 'bg-red-100 text-red-700 border border-red-200' 
                        : 'bg-green-100 text-green-700 border border-green-200'
                    }`}>
                      {studentDetails.fees_due ? '⚠️ Fees Pending' : '✅ All Fees Paid'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Stop */}
              {studentDetails.assigned_stop && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
                      <span className="text-2xl">📍</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Assigned Stop</p>
                      <p className="text-lg font-bold text-gray-900">{studentDetails.assigned_stop.stop_name}</p>
                      {studentDetails.assigned_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          Since {new Date(studentDetails.assigned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        .leaflet-container { background: #f8fafc !important; font-family: system-ui, sans-serif; }
        .stop-marker, .student-marker { background: transparent !important; border: none !important; }
        .leaflet-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .leaflet-tooltip-top:before, .leaflet-tooltip-bottom:before { display: none !important; }
      `}</style>
    </div>
  )
}