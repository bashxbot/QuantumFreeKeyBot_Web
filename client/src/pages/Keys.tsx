import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchKeys, fetchGames, addKeys, deleteKey } from '@/lib/firebase'
import {
  Key,
  Plus,
  Upload,
  CheckCircle,
  XCircle,
  Copy,
  Trash2,
  Filter,
  Download
} from 'lucide-react'
import {
  GlassCard,
  GlassButton,
  GlassInput,
  GlassTextarea,
  DataTable,
  Modal,
  StatCard,
  Dropdown
} from '@/components/ui'
import { formatDate } from '@/lib/utils'

interface KeyData {
  id: string
  code: string
  gameId: string
  gameName: string
  duration: number
  claimed: boolean
  claimedBy?: string
  claimedAt?: number
  addedAt: number
}

export function Keys() {
  const [keys, setKeys] = useState<KeyData[]>([])
  const [games, setGames] = useState<Array<{ value: string; label: string }>>([{ value: 'all', label: 'All Products' }])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedKeys, fetchedGames] = await Promise.all([
          fetchKeys(),
          fetchGames()
        ])
        
        setKeys(fetchedKeys)
        setGames([
          { value: 'all', label: 'All Products' },
          ...fetchedGames.map(g => ({ value: g.id, label: g.name }))
        ])
      } catch (error) {
        console.error('Error loading keys:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedGame, setSelectedGame] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'claimed' | 'unclaimed'>('all')
  const [bulkKeys, setBulkKeys] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(7)

  const filteredKeys = keys.filter(key => {
    if (selectedGame !== 'all' && key.gameId !== selectedGame) return false
    if (filterStatus === 'claimed' && !key.claimed) return false
    if (filterStatus === 'unclaimed' && key.claimed) return false
    return true
  })

  const stats = {
    total: keys.length,
    claimed: keys.filter(k => k.claimed).length,
    unclaimed: keys.filter(k => !k.claimed).length,
  }

  const columns = [
    {
      key: 'code',
      header: 'Key Code',
      sortable: true,
      render: (item: KeyData) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-accent-cyan">{item.code}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(item.code)
            }}
            className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            <Copy size={14} className="text-gray-400" />
          </button>
        </div>
      )
    },
    {
      key: 'gameName',
      header: 'Product',
      sortable: true,
    },
    {
      key: 'duration',
      header: 'Duration',
      sortable: true,
      render: (item: KeyData) => <span>{item.duration} days</span>
    },
    {
      key: 'claimed',
      header: 'Status',
      sortable: true,
      render: (item: KeyData) => (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
          item.claimed 
            ? 'bg-green-400/10 text-green-400' 
            : 'bg-orange-400/10 text-orange-400'
        }`}>
          {item.claimed ? <CheckCircle size={12} /> : <XCircle size={12} />}
          {item.claimed ? 'Claimed' : 'Unclaimed'}
        </span>
      )
    },
    {
      key: 'claimedBy',
      header: 'Claimed By',
      render: (item: KeyData) => (
        <span className="text-gray-400">
          {item.claimedBy || '-'}
        </span>
      )
    },
    {
      key: 'addedAt',
      header: 'Added',
      sortable: true,
      render: (item: KeyData) => <span className="text-gray-400">{formatDate(item.addedAt)}</span>
    },
    {
      key: 'actions',
      header: '',
      render: (item: KeyData) => (
        <button
          onClick={async (e) => {
            e.stopPropagation()
            if (confirm('Are you sure you want to delete this key?')) {
              try {
                await deleteKey(item.id);
                const updatedKeys = await fetchKeys();
                setKeys(updatedKeys);
              } catch (error) {
                console.error('Error deleting key:', error);
                alert('Failed to delete key');
              }
            }
          }}
          className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Key Management</h1>
          <p className="text-gray-400 mt-1">Manage game keys and track claims</p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton variant="secondary" onClick={() => {
            const csv = [
              'Key Code,Game,Duration,Status,Claimed By,Added Date,Claimed Date',
              ...filteredKeys.map(k => 
                `"${k.code}","${k.gameName}",${k.duration} days,${k.claimed ? 'Claimed' : 'Unclaimed'},"${k.claimedBy || 'N/A'}","${formatDate(k.addedAt)}","${k.claimedAt ? formatDate(k.claimedAt) : 'N/A'}"`
              )
            ].join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `keys-export-${Date.now()}.csv`;
            a.click();
          }}>
            <Download size={18} />
            <span className="ml-2">Export</span>
          </GlassButton>
          <GlassButton onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            <span className="ml-2">Add Keys</span>
          </GlassButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Keys"
          value={stats.total}
          icon={<Key size={22} />}
          color="cyan"
          delay={0}
        />
        <StatCard
          title="Claimed"
          value={stats.claimed}
          icon={<CheckCircle size={22} />}
          color="green"
          delay={0.1}
        />
        <StatCard
          title="Unclaimed"
          value={stats.unclaimed}
          icon={<XCircle size={22} />}
          color="orange"
          delay={0.2}
        />
      </div>

      <GlassCard className="p-6" delay={0.3}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-gray-400" />
            <span className="text-white font-medium">Filters:</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Dropdown
              value={selectedGame}
              options={games}
              onChange={(val) => setSelectedGame(String(val))}
            />
            
            <div className="flex rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)]">
              {(['all', 'claimed', 'unclaimed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-gradient-to-r from-accent-cyan to-accent-blue text-white'
                      : 'bg-[rgba(20,20,20,0.6)] text-gray-400 hover:text-white'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DataTable
          data={filteredKeys}
          columns={columns}
          pageSize={10}
          searchPlaceholder="Search keys..."
          emptyMessage="No keys found"
        />
      </GlassCard>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Keys"
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(0,212,255,0.05)] border border-accent-cyan/20">
            <Upload size={24} className="text-accent-cyan" />
            <div>
              <p className="font-medium text-white">Bulk Upload</p>
              <p className="text-sm text-gray-400">Add multiple keys at once, one per line</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Game</label>
            <Dropdown
              value={selectedGame === 'all' ? (games.length > 1 ? games[1].value : '') : selectedGame}
              options={games.filter(g => g.value !== 'all')}
              onChange={(val) => setSelectedGame(String(val))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Duration (Days)</label>
            <div className="flex gap-2">
              {[1, 3, 7, 15, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => setSelectedDuration(days)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedDuration === days
                      ? 'bg-gradient-to-r from-accent-cyan to-accent-blue text-white'
                      : 'bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white border border-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Keys (one per line)
            </label>
            <GlassTextarea
              placeholder="GAME-XXXX-1234&#10;GAME-YYYY-5678&#10;GAME-ZZZZ-9012"
              value={bulkKeys}
              onChange={(e) => setBulkKeys(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-2">
              {bulkKeys.split('\n').filter(k => k.trim()).length} keys entered
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <GlassButton variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton onClick={async () => {
              if (!selectedGame || selectedGame === 'all') {
                alert('Please select a game');
                return;
              }
              
              const keyLines = bulkKeys.split('\n').filter(k => k.trim());
              if (keyLines.length === 0) {
                alert('Please enter at least one key');
                return;
              }
              
              try {
                const game = games.find(g => g.value === selectedGame);
                if (!game) return;
                
                await addKeys(keyLines, selectedGame, game.label, selectedDuration);
                
                // Refresh keys
                const updatedKeys = await fetchKeys();
                setKeys(updatedKeys);
                
                setBulkKeys('');
                setShowAddModal(false);
                alert(`Successfully added ${keyLines.length} keys!`);
              } catch (error) {
                console.error('Error adding keys:', error);
                alert('Failed to add keys');
              }
            }}>
              <Plus size={18} />
              <span className="ml-2">Add Keys</span>
            </GlassButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
