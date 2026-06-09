import { useEffect, useState } from 'react'
import { RiArrowUpLine, RiArrowDownLine, RiGiftLine, RiUploadCloud2Line, RiLockUnlockLine, RiWallet3Line, RiBankLine } from 'react-icons/ri'
import { Button, Modal } from '../components/common'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const iconMap = {
  earn:  { icon: RiArrowUpLine,   color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-950' },
  spend: { icon: RiArrowDownLine, color: 'text-red-500',   bg: 'bg-red-100 dark:bg-red-950'    },
}

const CONVERSION_RATE = 10 // ₹1 = 10 tokens
const WITHDRAWAL_FEE = 0.20 // 20% platform fee
const MIN_WITHDRAWAL_TOKENS = 625 // ₹50 min withdrawal

export default function Wallet() {
  const { profile, setProfile } = useAuthStore()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [buyModal, setBuyModal] = useState(false)
  const [withdrawModal, setWithdrawModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('upi')
  const [bankDetails, setBankDetails] = useState({ name: '', account: '', ifsc: '', holder: '' })
  const [upiId, setUpiId] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('token_transactions')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTransactions(data || [])
        setLoading(false)
      })
  }, [profile])

  const totalEarned = transactions.filter(t => t.type === 'earn').reduce((a, t) => a + t.amount, 0)
  const totalSpent  = transactions.filter(t => t.type === 'spend').reduce((a, t) => a + t.amount, 0)

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date)
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const handleBuyTokens = async () => {
    const inrAmount = parseInt(amount)
    if (!inrAmount || inrAmount < 10) return toast.error('Minimum purchase: ₹10')
    
    const tokens = inrAmount * CONVERSION_RATE
    setProcessing(true)

    try {
      // Load Razorpay script
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      document.body.appendChild(script)

      script.onload = () => {
        const options = {
          key: 'rzp_test_YOUR_KEY_HERE', // Replace with your Razorpay test key
          amount: inrAmount * 100, // Razorpay takes paise
          currency: 'INR',
          name: 'BrainBarter',
          description: `Buy ${tokens} tokens`,
          handler: async (response) => {
            // Payment successful - credit tokens
            const { error } = await supabase
              .from('token_transactions')
              .insert({
                user_id: profile.id,
                type: 'earn',
                amount: tokens,
                reason: `Purchased ${tokens} tokens for ₹${inrAmount}`,
              })

            if (!error) {
              const { data } = await supabase
                .from('profiles')
                .update({ token_balance: profile.token_balance + tokens })
                .eq('id', profile.id)
                .select()
                .single()
              
              setProfile(data)
              toast.success(`${tokens} tokens added!`)
              setBuyModal(false)
              setAmount('')
              // Refresh transactions
              const { data: txns } = await supabase
                .from('token_transactions')
                .select('*')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
              setTransactions(txns || [])
            }
          },
          prefill: {
            email: profile.email,
          },
          theme: {
            color: '#5B21B6',
          },
        }
        const rzp = new window.Razorpay(options)
        rzp.open()
        setProcessing(false)
      }
    } catch (err) {
      toast.error('Payment failed')
      setProcessing(false)
    }
  }

  const handleWithdraw = async () => {
    const tokens = parseInt(amount)
    if (!tokens || tokens < MIN_WITHDRAWAL_TOKENS) {
      return toast.error(`Minimum withdrawal: ${MIN_WITHDRAWAL_TOKENS} tokens (₹50)`)
    }
    if (tokens > profile.token_balance) {
      return toast.error('Insufficient token balance')
    }

    if (method === 'bank' && (!bankDetails.name || !bankDetails.account || !bankDetails.ifsc || !bankDetails.holder)) {
      return toast.error('Please fill all bank details')
    }
    if (method === 'upi' && !upiId) {
      return toast.error('Please enter UPI ID')
    }

    const inrAmount = (tokens / CONVERSION_RATE) * (1 - WITHDRAWAL_FEE)
    setProcessing(true)

    try {
      const { error } = await supabase.from('withdrawal_requests').insert({
        user_id: profile.id,
        tokens_amount: tokens,
        inr_amount: inrAmount.toFixed(2),
        method,
        ...(method === 'bank' ? {
          bank_name: bankDetails.name,
          account_number: bankDetails.account,
          ifsc_code: bankDetails.ifsc,
          account_holder: bankDetails.holder,
        } : { upi_id: upiId }),
      })

      if (error) throw error

      // Deduct tokens immediately (will be refunded if rejected)
      const { data } = await supabase
        .from('profiles')
        .update({ token_balance: profile.token_balance - tokens })
        .eq('id', profile.id)
        .select()
        .single()

      await supabase.from('token_transactions').insert({
        user_id: profile.id,
        type: 'spend',
        amount: tokens,
        reason: `Withdrawal request: ₹${inrAmount.toFixed(2)}`,
      })

      setProfile(data)
      toast.success('Withdrawal request submitted! Will be processed in 2-3 days.')
      setWithdrawModal(false)
      setAmount('')
      setBankDetails({ name: '', account: '', ifsc: '', holder: '' })
      setUpiId('')
    } catch (err) {
      toast.error('Withdrawal request failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="page">
      <div className="container-app py-8 max-w-2xl">

        {/* Balance Card */}
        <div className="relative rounded-3xl bg-gradient-brand p-8 mb-6 overflow-hidden shadow-glow-lg">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <p className="text-brand-200 text-sm font-medium mb-1 relative">Token Balance</p>
          <div className="flex items-end gap-2 relative">
            <span className="text-5xl font-display font-bold text-white">{profile?.token_balance ?? 0}</span>
            <span className="text-brand-200 mb-1">tokens</span>
          </div>
          <div className="flex gap-4 mt-6 relative">
            <Button onClick={() => setBuyModal(true)} className="flex-1 bg-white text-brand-600 hover:bg-brand-50">
              <RiWallet3Line size={18} /> Buy Tokens
            </Button>
            <Button 
              onClick={() => setWithdrawModal(true)} 
              variant="outline" 
              className="flex-1 border-white/30 text-white hover:bg-white/10"
              disabled={profile?.token_balance < MIN_WITHDRAWAL_TOKENS}
            >
              <RiBankLine size={18} /> Withdraw
            </Button>
          </div>
          <div className="flex gap-4 mt-4 relative">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{totalEarned}</p>
              <p className="text-xs text-brand-200">Total Earned</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{totalSpent}</p>
              <p className="text-xs text-brand-200">Total Spent</p>
            </div>
          </div>
        </div>

        {/* Token Economy Info */}
        <div className="card mb-6 bg-brand-50/50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-800">
          <h4 className="text-sm font-semibold text-brand-900 dark:text-brand-200 mb-3">Token Economy</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Buy Rate</p>
              <p className="font-semibold text-gray-900 dark:text-white">₹1 = 10 tokens</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Sell Rate (after 20% fee)</p>
              <p className="font-semibold text-gray-900 dark:text-white">10 tokens = ₹0.80</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Min Purchase</p>
              <p className="font-semibold text-gray-900 dark:text-white">₹10 (100 tokens)</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Min Withdrawal</p>
              <p className="font-semibold text-gray-900 dark:text-white">₹50 (625 tokens)</p>
            </div>
          </div>
        </div>

        {/* How to earn */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: RiUploadCloud2Line, label: 'Upload content', desc: 'Earn when unlocked' },
            { icon: RiGiftLine,         label: 'Rate content',   desc: '+2 tokens each'     },
            { icon: RiLockUnlockLine,   label: 'Get unlocked',   desc: 'Earn per unlock'    },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="card-inset text-center py-4">
              <Icon size={20} className="text-brand-500 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Transaction History</h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No transactions yet. Unlock content to get started!</p>
          ) : (
            <div className="space-y-1">
              {transactions.map(t => {
                const { icon: Icon, color, bg } = iconMap[t.type]
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                      <Icon size={16} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{t.reason}</p>
                      <p className="text-xs text-gray-400">{timeAgo(t.created_at)}</p>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === 'earn' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {t.type === 'earn' ? '+' : '-'}{t.amount}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* Buy Tokens Modal */}
      <Modal open={buyModal} onClose={() => setBuyModal(false)} title="Buy Tokens">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount (INR)
            </label>
            <input
              type="number"
              min="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount in ₹"
              className="input w-full"
            />
            {amount && parseInt(amount) >= 10 && (
              <p className="text-sm text-brand-600 dark:text-brand-400 mt-2">
                You'll get <strong>{parseInt(amount) * CONVERSION_RATE} tokens</strong>
              </p>
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl text-xs space-y-1">
            <p className="text-gray-600 dark:text-gray-400">• Minimum purchase: ₹10 (100 tokens)</p>
            <p className="text-gray-600 dark:text-gray-400">• Instant credit after payment</p>
            <p className="text-gray-600 dark:text-gray-400">• Powered by Razorpay (UPI, Cards, Net Banking)</p>
          </div>
          <Button onClick={handleBuyTokens} loading={processing} className="w-full">
            Proceed to Payment
          </Button>
        </div>
      </Modal>

      {/* Withdraw Modal */}
      <Modal open={withdrawModal} onClose={() => setWithdrawModal(false)} title="Withdraw Money">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tokens to Withdraw
            </label>
            <input
              type="number"
              min={MIN_WITHDRAWAL_TOKENS}
              max={profile?.token_balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ${MIN_WITHDRAWAL_TOKENS} tokens`}
              className="input w-full"
            />
            {amount && parseInt(amount) >= MIN_WITHDRAWAL_TOKENS && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                You'll receive <strong>₹{((parseInt(amount) / CONVERSION_RATE) * (1 - WITHDRAWAL_FEE)).toFixed(2)}</strong> (after 20% fee)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Withdrawal Method
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMethod('upi')}
                className={`flex-1 p-3 rounded-xl border-2 transition-colors ${
                  method === 'upi'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">UPI</p>
              </button>
              <button
                onClick={() => setMethod('bank')}
                className={`flex-1 p-3 rounded-xl border-2 transition-colors ${
                  method === 'bank'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">Bank Transfer</p>
              </button>
            </div>
          </div>

          {method === 'upi' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@paytm"
                className="input w-full"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankDetails.name}
                  onChange={(e) => setBankDetails({ ...bankDetails, name: e.target.value })}
                  placeholder="State Bank of India"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankDetails.account}
                  onChange={(e) => setBankDetails({ ...bankDetails, account: e.target.value })}
                  placeholder="1234567890"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={bankDetails.ifsc}
                  onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })}
                  placeholder="SBIN0001234"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={bankDetails.holder}
                  onChange={(e) => setBankDetails({ ...bankDetails, holder: e.target.value })}
                  placeholder="John Doe"
                  className="input w-full"
                />
              </div>
            </>
          )}

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl text-xs space-y-1">
            <p className="text-yellow-800 dark:text-yellow-200">• 20% platform fee on withdrawals</p>
            <p className="text-yellow-800 dark:text-yellow-200">• Processing time: 2-3 business days</p>
            <p className="text-yellow-800 dark:text-yellow-200">• Tokens will be deducted immediately</p>
          </div>
          <Button onClick={handleWithdraw} loading={processing} className="w-full">
            Submit Withdrawal Request
          </Button>
        </div>
      </Modal>
    </div>
  )
}
