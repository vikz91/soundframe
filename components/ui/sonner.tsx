'use client'

import { CheckCircleIcon, InfoIcon, SpinnerGapIcon, WarningCircleIcon, WarningIcon, XIcon } from '@phosphor-icons/react'
import { Toaster as Sonner, toast } from 'sonner'

function Toaster() {
  return (
    <Sonner
      className="audioframe-toaster"
      position="bottom-right"
      richColors
      closeButton
      duration={5000}
      offset={24}
      mobileOffset={16}
      containerAriaLabel="Notifications"
      toastOptions={{ closeButtonAriaLabel: 'Dismiss notification' }}
      icons={{
        success: <CheckCircleIcon aria-hidden="true" size={20} weight="fill" />,
        info: <InfoIcon aria-hidden="true" size={20} weight="fill" />,
        warning: <WarningIcon aria-hidden="true" size={20} weight="fill" />,
        error: <WarningCircleIcon aria-hidden="true" size={20} weight="fill" />,
        loading: <SpinnerGapIcon aria-hidden="true" size={20} className="animate-spin motion-reduce:animate-none" />,
        close: <XIcon aria-hidden="true" size={16} />
      }}
    />
  )
}

export { Toaster, toast }
