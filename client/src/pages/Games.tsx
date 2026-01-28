import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchGames } from '@/lib/firebase'
import { getDb, ref, push, set, update, remove } from '@/lib/firebase'
import {
  Gamepad2,
  Plus,
  Edit,
  Trash2,
  Key,
  BarChart3,
  Image
} from 'lucide-react'
import {
  GlassCard,
  GlassButton,
  GlassInput,
  GlassTextarea,
  Modal,
  StatCard,
  ProgressBar
} from '@/components/ui'
import { formatNumber } from '@/lib/utils'
import { Game } from '@/lib/types'

export function Games() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadGames = async () => {
      try {
        const fetchedGames = await fetchGames()
        setGames(fetchedGames)
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGames()
  }, [])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showKeysModal, setShowKeysModal] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [editMode, setEditMode] = useState(false)

  const [gameName, setGameName] = useState('')
  const [gameDescription, setGameDescription] = useState('')
  const [bulkKeys, setBulkKeys] = useState('')
  const [keyDuration, setKeyDuration] = useState(7)

  const stats = {
    totalGames: games.length,
    totalKeys: games.reduce((sum, g) => sum + g.totalKeys, 0),
    totalClaimed: games.reduce((sum, g) => sum + g.claimedKeys, 0),
    totalAvailable: games.reduce((sum, g) => sum + g.availableKeys, 0),
  }

  const handleAddGame = () => {
    setEditMode(false)
    setSelectedGame(null)
    setGameName('')
    setGameDescription('')
    setShowAddModal(true)
  }

  const handleSaveGame = async () => {
    if (!gameName.trim()) {
      alert('Please enter a product name')
      return
    }

    try {
      const database = await getDb()
      if (editMode && selectedGame) {
        // Update existing game
        const gameRef = ref(database, `games/${selectedGame.id}`)
        await update(gameRef, {
          name: gameName,
          description: gameDescription
        })

        // Update local state
        setGames(games.map(g => 
          g.id === selectedGame.id 
            ? { ...g, name: gameName, description: gameDescription }
            : g
        ))
      } else {
        // Add new game
        const gamesRef = ref(database, 'games')
        const newGameRef = push(gamesRef)

        const newGame = {
          name: gameName,
          description: gameDescription,
          isActive: true,
          addedAt: Date.now(),
          totalKeys: 0,
          claimedKeys: 0,
          unclaimedKeys: 0
        }

        await set(newGameRef, newGame)

        // Update local state
        setGames([...games, { 
          id: newGameRef.key!, 
          ...newGame,
          availableKeys: 0,
          createdAt: newGame.addedAt
        }])
      }

      setShowAddModal(false)
      setGameName('')
      setGameDescription('')
      setSelectedGame(null)
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Failed to save product. Please try again.')
    }
  }

  const handleEditGame = (game: Game) => {
    setEditMode(true)
    setSelectedGame(game)
    setGameName(game.name)
    setGameDescription(game.description || '')
    setShowAddModal(true)
  }

  const handleViewStats = (game: Game) => {
    setSelectedGame(game)
    setShowStatsModal(true)
  }

  const handleDeleteGame = async (game: Game) => {
    if (!confirm(`Are you sure you want to delete "${game.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const database = await getDb()
      const gameRef = ref(database, `games/${game.id}`)
      await remove(gameRef)

      // Update local state
      setGames(games.filter(g => g.id !== game.id))
    } catch (error) {
      console.error('Error deleting game:', error)
      alert('Failed to delete game. Please try again.')
    }
  }

  const handleOpenAddKeys = (game: Game) => {
    setSelectedGame(game)
    setBulkKeys('')
    setKeyDuration(7)
    setShowStatsModal(false)
    setShowKeysModal(true)
  }

  const handleSaveKeys = async () => {
    if (!selectedGame || !bulkKeys.trim()) {
      alert('Please enter at least one key')
      return
    }

    try {
      const database = await getDb()
      const keys = bulkKeys.split('\n').filter(k => k.trim())
      const keysRef = ref(database, 'keys')
      const gameRef = ref(database, `games/${selectedGame.id}`)

      // Add each key to Firebase
      const promises = keys.map(async (keyCode) => {
        const newKeyRef = push(keysRef)
        await set(newKeyRef, {
          key: keyCode.trim(),
          gameId: selectedGame.id,
          gameName: selectedGame.name,
          duration: keyDuration,
          userId: null,
          claimedAt: null,
          expiresAt: null,
          status: 'unclaimed',
          addedAt: Date.now()
        })
      })

      await Promise.all(promises)

      // Update game stats
      await update(gameRef, {
        totalKeys: (selectedGame.totalKeys || 0) + keys.length,
        unclaimedKeys: (selectedGame.availableKeys || 0) + keys.length
      })

      // Update local state
      setGames(games.map(g => 
        g.id === selectedGame.id 
          ? { 
              ...g, 
              totalKeys: g.totalKeys + keys.length,
              availableKeys: g.availableKeys + keys.length
            }
          : g
      ))

      setShowKeysModal(false)
      setBulkKeys('')
    } catch (error) {
      console.error('Error adding keys:', error)
      alert('Failed to add keys. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Product Management</h1>
          <p className="text-gray-400 mt-1">Manage products and their key inventory</p>
        </div>
        <GlassButton onClick={handleAddGame}>
          <Plus size={18} />
          <span className="ml-2">Add Product</span>
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats.totalGames}
          icon={<Gamepad2 size={22} />}
          color="purple"
          delay={0}
        />
        <StatCard
          title="Total Keys"
          value={stats.totalKeys}
          icon={<Key size={22} />}
          color="cyan"
          delay={0.1}
        />
        <StatCard
          title="Keys Claimed"
          value={stats.totalClaimed}
          icon={<Key size={22} />}
          color="green"
          delay={0.2}
        />
        <StatCard
          title="Keys Available"
          value={stats.totalAvailable}
          icon={<Key size={22} />}
          color="orange"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            <GlassCard className="p-6 h-full" hover animate={false}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-purple/30 to-accent-blue/30 flex items-center justify-center">
                  <Gamepad2 size={28} className="text-accent-purple" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewStats(game)}
                    className="p-2 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                  >
                    <BarChart3 size={18} />
                  </button>
                  <button
                    onClick={() => handleEditGame(game)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteGame(game)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mb-1">{game.name}</h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{game.description}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Keys Usage</span>
                  <span className="text-white font-medium">
                    {game.claimedKeys}/{game.totalKeys}
                  </span>
                </div>
                <ProgressBar
                  value={game.claimedKeys}
                  max={game.totalKeys}
                  size="sm"
                  color="cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{game.claimedKeys}</p>
                  <p className="text-xs text-gray-400">Claimed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-400">{game.availableKeys}</p>
                  <p className="text-xs text-gray-400">Available</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editMode ? 'Edit Product' : 'Add New Product'}
        size="md"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 border-2 border-dashed border-[rgba(255,255,255,0.2)] flex flex-col items-center justify-center cursor-pointer hover:border-accent-cyan transition-colors">
              <Image size={32} className="text-gray-400" />
              <span className="text-xs text-gray-500 mt-1">Add Image</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
            <GlassInput
              placeholder="Enter product name"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <GlassTextarea
              placeholder="Enter product description"
              value={gameDescription}
              onChange={(e) => setGameDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <GlassButton variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton onClick={handleSaveGame}>
              {editMode ? 'Save Changes' : 'Add Product'}
            </GlassButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        title={`${selectedGame?.name} Statistics`}
        size="lg"
      >
        {selectedGame && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center">
                <p className="text-3xl font-bold text-white">{selectedGame.totalKeys}</p>
                <p className="text-sm text-gray-400">Total Keys</p>
              </div>
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center">
                <p className="text-3xl font-bold text-green-400">{selectedGame.claimedKeys}</p>
                <p className="text-sm text-gray-400">Claimed</p>
              </div>
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center">
                <p className="text-3xl font-bold text-orange-400">{selectedGame.availableKeys}</p>
                <p className="text-sm text-gray-400">Available</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Claim Rate</span>
                <span className="text-white font-medium">
                  {Math.round((selectedGame.claimedKeys / selectedGame.totalKeys) * 100)}%
                </span>
              </div>
              <ProgressBar
                value={selectedGame.claimedKeys}
                max={selectedGame.totalKeys}
                size="lg"
                color="cyan"
              />
            </div>

            <div className="flex gap-3">
              <GlassButton variant="secondary" className="flex-1" onClick={() => handleOpenAddKeys(selectedGame)}>
                <Key size={18} />
                <span className="ml-2">Add Keys</span>
              </GlassButton>
              <GlassButton className="flex-1">
                <BarChart3 size={18} />
                <span className="ml-2">Full Analytics</span>
              </GlassButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showKeysModal}
        onClose={() => setShowKeysModal(false)}
        title={`Add Keys to ${selectedGame?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Keys (one per line)
            </label>
            <GlassTextarea
              placeholder="Enter keys, one per line&#10;XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY&#10;ZZZZ-ZZZZ-ZZZZ"
              value={bulkKeys}
              onChange={(e) => setBulkKeys(e.target.value)}
              rows={10}
            />
            <p className="text-sm text-gray-400 mt-2">
              {bulkKeys.split('\n').filter(k => k.trim()).length} keys entered
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration (days)
            </label>
            <GlassInput
              type="number"
              value={keyDuration.toString()}
              onChange={(e) => setKeyDuration(Number(e.target.value))}
              min="1"
            />
          </div>

          <div className="flex justify-end gap-3">
            <GlassButton variant="secondary" onClick={() => setShowKeysModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton onClick={handleSaveKeys}>
              Add Keys
            </GlassButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}