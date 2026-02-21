import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  BookOpen, 
  Ghost, 
  AlertTriangle, 
  FileText, 
  Users, 
  Menu, 
  X, 
  ChevronRight, 
  Play, 
  Pause, 
  Square, 
  Check, 
  AlertCircle,
  Download,
  QrCode,
  RefreshCw,
  Shield,
  Activity,
  Tag,
  Clock,
  MoreVertical,
  Plus,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertOctagon
} from 'lucide-react';

interface DashboardData {
  stats: {
    totalMemos: number;
    runbooksCompleted: number;
    ghostModeTests: number;
    busFactorScore: number;
    pendingDelegations: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    timestamp: string;
    status: 'completed' | 'pending' | 'warning';
  }>;
}

interface VoiceMemo {
  id: string;
  title: string;
  duration: number;
  transcript: string;
  tags: string[];
  createdAt: string;
  status: 'processing' | 'completed' | 'error';
}

interface Runbook {
  id: string;
  title: string;
  category: string;
  steps: number;
  lastUpdated: string;
  status: 'draft' | 'published';
}

interface GhostScenario {
  id: string;
  title: string;
  assignedTo: string;
  difficulty: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'pending';
  completionRate: number;
}

interface BusFactorData {
  category: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  backupTrained: boolean;
  documentationComplete: boolean;
}

interface DelegationTask {
  id: string;
  title: string;
  assignee: string;
  runbookId: string;
  checkpoint: number;
  totalCheckpoints: number;
  status: 'pending' | 'in_progress' | 'completed' | 'verified';
  dueDate: string;
}

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<'recorder' | 'runbooks' | 'ghost' | 'busfactor' | 'pdf' | 'delegate'>('recorder');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('Failed to load dashboard data');
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: 'recorder', label: 'Voice Memos', icon: Mic, description: 'Record & transcribe daily updates' },
    { id: 'runbooks', label: 'Runbook Assembler', icon: BookOpen, description: 'Build emergency procedures' },
    { id: 'ghost', label: 'Ghost Mode', icon: Ghost, description: 'Test knowledge gaps' },
    { id: 'busfactor', label: 'Bus Factor', icon: AlertTriangle, description: 'Dependency analysis' },
    { id: 'pdf', label: 'Emergency PDFs', icon: FileText, description: 'Offline documentation' },
    { id: 'delegate', label: 'Delegations', icon: Users, description: 'Task assignments' },
  ] as const;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2C3E50]"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-gray-600">
          <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
          <p className="text-lg font-medium">Failed to load data</p>
          <p className="text-sm mb-4">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="px-4 py-2 bg-[#2C3E50] text-white rounded-lg hover:bg-[#34495E] transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    switch (activeSection) {
      case 'recorder':
        return <VoiceMemoRecorder />;
      case 'runbooks':
        return <RunbookAssembler />;
      case 'ghost':
        return <GhostModeSimulator />;
      case 'busfactor':
        return <BusFactorAnalyzer />;
      case 'pdf':
        return <PDFGenerator />;
      case 'delegate':
        return <DelegateSystem />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#2C3E50] text-white transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="font-bold text-lg tracking-tight">Backup Boss</h1>
              <p className="text-xs text-gray-400">Business Continuity</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-start gap-3 px-4 py-3 rounded-lg transition-all text-left
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{item.description}</div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">John's Metalworks</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {navItems.find(i => i.id === activeSection)?.label}
              </h2>
              <p className="text-sm text-gray-500 hidden sm:block">
                {navItems.find(i => i.id === activeSection)?.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-gray-600 relative">
              <AlertOctagon className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button 
              onClick={loadDashboardData}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Refresh data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// Voice Memo Recorder Component
function VoiceMemoRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [transcript, setTranscript] = useState('');
  
  const tags = ['Operations', 'Finance', 'Client Management', 'Vendor Relations', 'Safety', 'HR'];

  useEffect(() => {
    fetchMemos();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const fetchMemos = async () => {
    try {
      const res = await fetch('/api/voice-memos');
      const data = await res.json();
      setMemos(data);
    } catch (error) {
      console.error('Failed to fetch memos');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording - simulate upload
      setIsRecording(false);
      setRecordingTime(0);
      // Simulate API call
      setTimeout(() => {
        fetchMemos();
      }, 1000);
    } else {
      setIsRecording(true);
      setRecordingTime(0);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-6">
      {/* Recording Interface */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6">
            <div className={`
              w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 transition-all
              ${isRecording ? 'bg-red-100 animate-pulse' : 'bg-gray-100 hover:bg-gray-200'}
            `}>
              <button 
                onClick={toggleRecording}
                className={`
                  w-20 h-20 rounded-full flex items-center justify-center transition-all
                  ${isRecording ? 'bg-red-500 text-white' : 'bg-[#2C3E50] text-white hover:bg-[#34495E]'}
                `}
              >
                {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {isRecording ? 'Recording...' : 'Start Daily Memo'}
            </h3>
            <p className="text-gray-500 mb-4">
              {isRecording ? 'Speak clearly about today\'s operations' : 'Record 2-minute updates about critical business knowledge'}
            </p>
            {isRecording && (
              <div className="text-3xl font-mono font-bold text-[#2C3E50]">
                {formatTime(recordingTime)}
              </div>
            )}
          </div>

          {/* Auto-tagging */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${selectedTags.includes(tag)
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }
                `}
              >
                <Tag className="w-3 h-3 inline mr-1" />
                {tag}
              </button>
            ))}
          </div>

          {/* Live Transcript Preview */}
          {isRecording && (
            <div className="bg-gray-50 rounded-lg p-4 text-left border border-gray-200">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                <Activity className="w-4 h-4 animate-pulse" />
                <span>Live transcription (Whisper API)</span>
              </div>
              <p className="text-gray-700 min-h-[60px]">
                {transcript || "Listening..."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Memos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Recent Recordings</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading memos...</div>
        ) : memos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Mic className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No recordings yet. Start your first daily memo above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {memos.map((memo) => (
              <div key={memo.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{memo.title}</h4>
                      <span className={`
                        px-2 py-1 rounded text-xs font-medium
                        ${memo.status === 'completed' ? 'bg-green-100 text-green-700' : 
                          memo.status === 'processing' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}
                      `}>
                        {memo.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{memo.transcript}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {memo.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(memo.duration)}
                    </span>
                    <span>{new Date(memo.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Runbook Assembler Component
function RunbookAssembler() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [selectedRunbook, setSelectedRunbook] = useState<Runbook | null>(null);
  const [isAssembling, setIsAssembling] = useState(false);

  useEffect(() => {
    fetchRunbooks();
  }, []);

  const fetchRunbooks = async () => {
    try {
      const res = await fetch('/api/runbooks');
      const data = await res.json();
      setRunbooks(data);
    } catch (error) {
      console.error('Failed to fetch runbooks');
    }
  };

  const assembleRunbook = async () => {
    setIsAssembling(true);
    // Simulate AI assembly
    setTimeout(() => {
      setIsAssembling(false);
      fetchRunbooks();
    }, 2000);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Runbook List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <button 
            onClick={assembleRunbook}
            disabled={isAssembling}
            className="w-full py-3 px-4 bg-[#2C3E50] text-white rounded-lg font-medium hover:bg-[#34495E] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAssembling ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Assembling with AI...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Assemble New Runbook
              </>
            )}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-900">Emergency Procedures</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-auto">
            {runbooks.map((runbook) => (
              <button
                key={runbook.id}
                onClick={() => setSelectedRunbook(runbook)}
                className={`
                  w-full p-4 text-left transition-colors
                  ${selectedRunbook?.id === runbook.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}
                `}
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-medium text-gray-900">{runbook.title}</h4>
                  <span className={`
                    text-xs px-2 py-1 rounded-full
                    ${runbook.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
                  `}>
                    {runbook.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-2">{runbook.category}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{runbook.steps} steps</span>
                  <span>Updated {new Date(runbook.lastUpdated).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Runbook Editor */}
      <div className="lg:col-span-2">
        {selectedRunbook ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <input 
                  type="text" 
                  defaultValue={selectedRunbook.title}
                  className="text-xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 -ml-2 w-full"
                />
                <div className="flex gap-2">
                  <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                    Save Draft
                  </button>
                  <button className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Publish
                  </button>
                </div>
              </div>
              
              <div className="flex gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {selectedRunbook.category}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                  {selectedRunbook.steps} steps
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* AI Generated Steps */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <BookOpen className="w-4 h-4" />
                  Procedure Steps
                </div>
                
                {[1, 2, 3].map((step) => (
                  <div key={step} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-[#2C3E50] text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {step}
                      </div>
                      <div className="flex-1">
                        <textarea 
                          className="w-full text-gray-700 resize-none border-none focus:ring-0 p-0"
                          rows={2}
                          defaultValue={`Step ${step}: Critical procedure detail extracted from voice memo ${step}...`}
                        />
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            Safety Warning
                          </span>
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3 text-green-500" />
                            Required: Safety gloves
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>
              </div>

              {/* Decision Tree */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Decision Tree</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-700">If equipment fails → Contact vendor immediately</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                    <span className="text-sm text-gray-700">If client cancels → Follow refund protocol</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a runbook to edit</h3>
            <p className="text-gray-500">Or create a new one from your voice memos</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Ghost Mode Simulator Component
function GhostModeSimulator() {
  const [isActive, setIsActive] = useState(false);
  const [scenarios, setScenarios] = useState<GhostScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<GhostScenario | null>(null);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const res = await fetch('/api/ghost-scenarios');
      const data = await res.json();
      setScenarios(data);
    } catch (error) {
      console.error('Failed to fetch scenarios');
    }
  };

  const activateGhostMode = async () => {
    setIsActive(true);
    // Simulate API call
    await fetch('/api/ghost-mode/activate', { method: 'POST' });
  };

  const deactivateGhostMode = async () => {
    setIsActive(false);
    await fetch('/api/ghost-mode/deactivate', { method: 'POST' });
  };

  return (
    <div className="space-y-6">
      {/* Ghost Mode Control */}
      <div className={`
        rounded-xl p-8 border-2 transition-all
        ${isActive 
          ? 'bg-purple-50 border-purple-500 shadow-lg shadow-purple-100' 
          : 'bg-white border-gray-200'
        }
      `}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0
              ${isActive ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}
            `}>
              <Ghost className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ghost Mode {isActive ? 'Active' : 'Standby'}</h2>
              <p className="text-gray-600 max-w-xl">
                {isActive 
                  ? 'Owner knowledge is currently hidden. Employees must solve crisis scenarios without your input to identify documentation gaps.'
                  : 'Simulate your absence to test if your team can operate without you. Hides owner-contributed knowledge and assigns crisis scenarios.'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <button
              onClick={isActive ? deactivateGhostMode : activateGhostMode}
              className={`
                px-8 py-4 rounded-lg font-bold text-lg transition-all flex items-center gap-3
                ${isActive 
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg' 
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200'
                }
              `}
            >
              {isActive ? (
                <>
                  <XCircle className="w-5 h-5" />
                  Deactivate Ghost Mode
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Activate Ghost Mode
                </>
              )}
            </button>
            {isActive && (
              <span className="text-sm text-purple-700 font-medium animate-pulse">
                ● Simulation in progress
              </span>
            )}
          </div>
        </div>

        {isActive && (
          <div className="mt-6 pt-6 border-t border-purple-200">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="text-2xl font-bold text-purple-900">3</div>
                <div className="text-sm text-purple-700">Active Scenarios</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="text-2xl font-bold text-purple-900">12</div>
                <div className="text-sm text-purple-700">Knowledge Gaps Found</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="text-2xl font-bold text-purple-900">45%</div>
                <div className="text-sm text-purple-700">Avg Completion Rate</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scenarios List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map((scenario) => (
          <div 
            key={scenario.id} 
            onClick={() => setSelectedScenario(scenario)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <span className={`
                px-3 py-1 rounded-full text-xs font-bold
                ${scenario.difficulty === 'high' ? 'bg-red-100 text-red-700' :
                  scenario.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}
              `}>
                {scenario.difficulty.toUpperCase()}
              </span>
              <span className={`
                px-3 py-1 rounded-full text-xs font-medium
                ${scenario.status === 'active' ? 'bg-blue-100 text-blue-700' :
                  scenario.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
              `}>
                {scenario.status}
              </span>
            </div>
            
            <h3 className="font-bold text-gray-900 mb-2">{scenario.title}</h3>
            <p className="text-sm text-gray-600 mb-4">Assigned to: {scenario.assignedTo}</p>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Completion</span>
                <span className="font-medium text-gray-900">{scenario.completionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#2C3E50] h-2 rounded-full transition-all"
                  style={{ width: `${scenario.completionRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}

        {/* Add Scenario Card */}
        <button className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors min-h-[200px]">
          <Plus className="w-8 h-8 mb-2" />
          <span className="font-medium">Create Scenario</span>
        </button>
      </div>

      {/* Scenario Detail Modal (simplified inline) */}
      {selectedScenario && (
        <div className="