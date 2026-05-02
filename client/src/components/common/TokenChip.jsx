import { RiCopperCoinLine } from 'react-icons/ri'

export default function TokenChip({ amount, className = '' }) {
  return (
    <span className={`token-chip ${className}`}>
      <RiCopperCoinLine size={14} />
      {amount}
    </span>
  )
}
