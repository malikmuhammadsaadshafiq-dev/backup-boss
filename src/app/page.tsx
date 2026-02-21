'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Mic, FileText, Ghost, Shield, Check, Menu, X, ArrowRight, PlayCircle, Loader2, AlertCircle, Upload } from 'lucide-react'

// API Response Types based on backend route schemas
interface Memo {
  id: string
  s3Url: string
  duration: number
  transcriptionStatus: 'pending' | 'completed' | 'failed'
  fragments: Array<{
    id: string
    category: 'operations' | 'finance' | 'client_management' | 'vendor_relations'
    tags: string[]
    confidence: number
  }>
  createdAt: string
}

interface BusFactorAnalysis {
  analysisId: string
  scores: {
    operations: { coverage: number; riskLevel: 'low' | 'medium' | 'high' }
    finance: { coverage: number; riskLevel: 'low' | 'medium' | 'high' }
    client_management: { coverage: number; riskLevel: 'low' | 'medium' | 'high' }
    vendor_relations: { coverage: number; riskLevel: 'low' | 'medium' | 'high' }
  }
  criticalGaps: Array<{
    function: string
    singlePointOfFailure: string
    recommendedAction: string
  }>
  busFactor: number
}

interface Simulation {
  simulationId: string
  scenario: {
    description: string
    injects: unknown[]
  }
  accessToken: string
  status: 'active'
  startedAt: string
}

interface Runbook {
  runbookId: string
  title: string
  steps: Array<{
    stepNumber: number
    instruction: string
    estimatedDuration: number
    critical: boolean
  }>
  requiredMaterials: string[]
  safetyWarnings: string[]
  sourceFragments: string[]
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Data states
  const [memos, setMemos] = useState<Memo[]>([])
  const [busFactor, setBusFactor] = useState<BusFactorAnalysis | null>(null)
  const [activeSimulation, setActiveSimulation] = useState<Simulation | null>(null)
  const [assembledRunbook, setAssembledRunbook] = useState<Runbook | null>(null)
  
  // Loading states
  const [memosLoading, setMemosLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(true)
  const [simulationLoading, setSimulationLoading] = useState(false)
  const [runbookLoading, setRunbookLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  
  // Error states
  const [memosError, setMemosError] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  
  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [runbookTitle, setRunbookTitle] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'operations' | 'finance' | 'client_management' | 'vendor_relations'>('operations')

  // Fetch real data from backend
  useEffect(() => {
    const fetchData = async () => {
      const orgId = localStorage.getItem('orgId') || '00000000-0000-0000-0000-000000000000'
      
      // Fetch memos: GET /api/v1/memos
      try {
        setMemosLoading(true)
        const memosRes = await fetch(`/api/v1/memos?orgId=${orgId}&page=1&limit=6&hasTranscription=true`)
        if (memosRes.ok) {
          const data = await memosRes.json()
          setMemos(data.memos || [])
        } else {
          setMemosError('Failed to load voice memos')
        }
      } catch (err) {
        setMemosError('Network error loading memos')
      } finally {
        setMemosLoading(false)
      }
      
      // Fetch bus factor analysis: POST /api/v1/analysis/bus-factor
      try {
        setAnalysisLoading(true)
        const analysisRes = await fetch('/api/v1/analysis/bus-factor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, recalculate: false })
        })
        if (analysisRes.ok) {
          const data = await analysisRes.json()
          setBusFactor(data)
        } else {
          setAnalysisError('Failed to load resilience analysis')
        }
      } catch (err) {
        setAnalysisError('Network error loading analysis')
      } finally {
        setAnalysisLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Upload voice memo: POST /api/v1/memos
  const handleUploadMemo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    
    setUploadLoading(true)
    setActionError(null)
    
    try {
      const formData = new FormData()
      formData.append('audioFile', selectedFile)
      formData.append('metadata', JSON.stringify({
        duration: Math.floor(selectedFile.size / 1000) || 120,
        recordedAt: new Date().toISOString(),
        location: 'main-office'
      }))
      
      const res = await fetch('/api/v1/memos', {
        method: 'POST',
        body: formData
      })
      
      if (res.ok) {
        const data = await res.json()
        // Refresh memos list
        const orgId = localStorage.getItem('orgId') || '00000000-0000-0000-0000-000000000000'
        const memosRes = await fetch(`/api/v1/memos?orgId=${orgId}&page=1&limit=6`)
        if (memosRes.ok) {
          const memosData = await memosRes.json()
          setMemos(memosData.memos || [])
        }
        setSelectedFile(null)
      } else {
        setActionError('Failed to upload voice memo')
      }
    } catch (err) {
      setActionError('Network error during upload')
    } finally {
      setUploadLoading(false)
    }
  }

  // Assemble runbook: POST /api/v1/runbooks/assemble
  const handleAssembleRunbook = async () => {
    if (!runbookTitle) return
    
    setRunbookLoading(true)
    setActionError(null)
    
    try {
      const orgId = localStorage.getItem('orgId') || '00000000-0000-0000-0000-000000000000'
      // Use memo fragments if available, otherwise empty array
      const fragmentIds = memos.length > 0 ? memos.slice(0, 3).map(m => m.id) : []
      
      const res = await fetch('/api/v1/runbooks/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          category: selectedCategory,
          fragmentIds,
          title: runbookTitle,
          context: {
            equipmentList: [],
            safetyPriority: 'high'
          }
        })
      })
      
      if (res.ok) {
        const data: Runbook = await res.json()
        setAssembledRunbook(data)
      } else {
        setActionError('Failed to assemble runbook')
      }
    } catch (err) {
      setActionError('Network error assembling runbook')
    } finally {
      setRunbookLoading(false)
    }
  }

  // Start simulation: POST /api/v1/simulations
  const handleStartSimulation = async () => {
    setSimulationLoading(true)
    setActionError(null)
    
    try {
      const orgId = localStorage.getItem('orgId') || '00000000-0000-0000-0000-000000000000'
      const res = await fetch('/api/v1/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          scenarioType: 'equipment_failure',
          duration: 60,
          participantIds: [],
          hiddenUserIds: []
        })
      })
      
      if (res.ok) {
        const data: Simulation = await res.json()
        setActiveSimulation(data)
      } else {
        setActionError('Failed to start simulation')
      }
    } catch (err) {
      setActionError('Network error starting simulation')
    } finally {
      setSimulationLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#2C3E50] selection:text-white">
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop