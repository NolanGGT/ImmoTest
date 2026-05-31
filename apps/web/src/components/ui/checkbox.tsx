import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-gray-300 text-indigo-600 accent-indigo-600 cursor-pointer',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
